// Request validation schemas. The API validates every request body/query with these;
// the web app uses the inferred types for its client calls.
import { z } from 'zod';

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);
const citySlug = z
  .string()
  .trim()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'City must be a slug');
const langCode = z.string().min(2).max(5);
const isoDate = z.coerce.date();

export const cursorQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CursorQuery = z.infer<typeof cursorQuery>;

// ---------- Users ----------

export const updateMeSchema = z.object({
  displayName: trimmed(1, 60).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  city: citySlug.nullable().optional(),
  languages: z.array(langCode).max(10).optional(),
  genres: z.array(z.string().max(40)).max(20).optional(),
  /** Sent from onboarding; records consent to terms and privacy policy. */
  acceptTerms: z.literal(true).optional(),
});
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const updateSettingsSchema = z
  .object({
    notifyEmail: z.boolean().optional(),
    emailDigest: z.boolean().optional(),
    notifyWhatsapp: z.boolean().optional(),
    whatsappNumber: z
      .string()
      .trim()
      .regex(/^\+?[1-9]\d{9,14}$/, 'Enter a phone number with country code, e.g. +919876543210')
      .nullable()
      .optional(),
    dmPolicy: z.enum(['club_members', 'nobody']).optional(),
  })
  .refine((v) => !(v.notifyWhatsapp === true && v.whatsappNumber === null), {
    message: 'A WhatsApp number is required to turn on WhatsApp reminders',
    path: ['whatsappNumber'],
  });
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

export const devLoginSchema = z.object({
  email: z.string().email(),
  displayName: trimmed(1, 60).optional(),
});

// ---------- Books ----------

export const bookSearchQuery = z.object({
  q: z.string().trim().min(1).max(200),
  language: langCode.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createBookSchema = z.object({
  title: trimmed(1, 300),
  subtitle: z.string().trim().max(300).optional(),
  authors: z.array(trimmed(1, 200)).min(1).max(10),
  authorsNative: z.array(z.string().trim().max(200)).max(10).optional(),
  language: langCode.default('en'),
  description: z.string().trim().max(5000).optional(),
  isbn13: z
    .string()
    .regex(/^97[89]\d{10}$/, 'ISBN-13 must be 13 digits')
    .optional(),
  isbn10: z
    .string()
    .regex(/^\d{9}[\dX]$/, 'ISBN-10 must be 10 characters')
    .optional(),
  pageCount: z.number().int().min(1).max(20000).optional(),
  chapterCount: z.number().int().min(1).max(1000).optional(),
  publishedYear: z.number().int().min(0).max(2100).optional(),
  publisher: z.string().trim().max(200).optional(),
  coverUrl: z.string().url().optional(),
});
export type CreateBookInput = z.infer<typeof createBookSchema>;

export const readingStatusSchema = z.object({
  status: z.enum(['want', 'reading', 'read']),
  progressPct: z.number().int().min(0).max(100).optional(),
  currentChapter: z.number().int().min(0).max(1000).optional(),
  rating: z.number().int().min(1).max(5).nullable().optional(),
});
export type ReadingStatusInput = z.infer<typeof readingStatusSchema>;

export const myBooksQuery = z.object({
  status: z.enum(['want', 'reading', 'read']).optional(),
});

// ---------- Clubs ----------

export const createClubSchema = z.object({
  name: trimmed(3, 80),
  description: z.string().trim().max(2000).optional(),
  city: citySlug.nullable().optional(),
  language: langCode.default('en'),
  visibility: z.enum(['public', 'private']).default('public'),
});
export type CreateClubInput = z.infer<typeof createClubSchema>;

export const updateClubSchema = createClubSchema.partial();
export type UpdateClubInput = z.infer<typeof updateClubSchema>;

export const clubListQuery = z.object({
  city: citySlug.optional(),
  language: langCode.optional(),
  q: z.string().trim().max(100).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createInviteSchema = z.object({
  expiresInDays: z.number().int().min(1).max(90).optional(),
  maxUses: z.number().int().min(1).max(1000).optional(),
});

export const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
});

export const scheduleWeekSchema = z.object({
  week: z.number().int().min(1),
  fromChapter: z.number().int().min(1),
  toChapter: z.number().int().min(1),
  startsOn: isoDate,
});
export type ScheduleWeek = z.infer<typeof scheduleWeekSchema>;

export const setClubBookSchema = z.object({
  bookId: z.string().uuid(),
  startsOn: isoDate,
  /** Total chapters in the book; used to build the schedule and the "finished" thread. */
  totalChapters: z.number().int().min(1).max(1000),
  chaptersPerWeek: z.number().int().min(1).max(100),
});
export type SetClubBookInput = z.infer<typeof setClubBookSchema>;

export const updateScheduleSchema = z.object({
  totalChapters: z.number().int().min(1).max(1000),
  chaptersPerWeek: z.number().int().min(1).max(100),
  startsOn: isoDate,
});
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

// ---------- Polls ----------

export const createPollSchema = z
  .object({
    question: trimmed(3, 200),
    kind: z.enum(['book', 'time', 'general']).default('general'),
    closesAt: isoDate.optional(),
    options: z
      .array(
        z.object({
          label: trimmed(1, 200),
          bookId: z.string().uuid().optional(),
        }),
      )
      .min(2)
      .max(10),
  })
  .refine((p) => p.kind !== 'book' || p.options.every((o) => o.bookId), {
    message: 'Every option in a book poll must link a book',
    path: ['options'],
  });
export type CreatePollInput = z.infer<typeof createPollSchema>;

export const voteSchema = z.object({ optionId: z.string().uuid() });

// ---------- Discussion ----------

export const createThreadSchema = z.object({
  title: trimmed(3, 200),
  body: trimmed(1, 10000),
  /** Chapter a reader must have finished to see this thread. 0 = no spoilers. */
  chapterGate: z.number().int().min(0).max(1000).default(0),
  bookId: z.string().uuid().nullable().optional(),
});
export type CreateThreadInput = z.infer<typeof createThreadSchema>;

export const createPostSchema = z.object({
  body: trimmed(1, 10000),
  /** Optional chapter this reply discusses; hides it from readers below that chapter. */
  chapterRef: z.number().int().min(0).max(1000).nullable().optional(),
});
export type CreatePostInput = z.infer<typeof createPostSchema>;

export const editPostSchema = z.object({ body: trimmed(1, 10000) });

// ---------- DMs ----------

export const startDmSchema = z.object({
  recipientId: z.string().uuid(),
  body: trimmed(1, 4000),
});
export const sendDmSchema = z.object({ body: trimmed(1, 4000) });

// ---------- Events ----------

const eventBase = z.object({
  title: trimmed(3, 200),
  description: z.string().trim().max(5000).optional(),
  startsAt: isoDate,
  endsAt: isoDate.optional(),
  mode: z.enum(['online', 'in_person']),
  venueName: z.string().trim().max(200).optional(),
  area: z.string().trim().max(100).optional(),
  address: z.string().trim().max(500).optional(),
  addressRsvpOnly: z.boolean().default(true),
  city: citySlug.optional(),
  meetingUrl: z.string().url().optional(),
  capacity: z.number().int().min(1).max(100000).optional(),
});

export const createEventSchema = eventBase
  .extend({
    clubId: z.string().uuid().optional(),
    bookstoreId: z.string().uuid().optional(),
  })
  .refine((e) => Boolean(e.clubId) !== Boolean(e.bookstoreId), {
    message: 'An event belongs to exactly one club or one bookstore',
    path: ['clubId'],
  })
  .refine((e) => e.mode !== 'online' || e.meetingUrl, {
    message: 'Online events need a meeting link',
    path: ['meetingUrl'],
  })
  .refine((e) => e.mode !== 'in_person' || (e.venueName && e.city), {
    message: 'In-person events need a venue and a city',
    path: ['venueName'],
  })
  .refine((e) => !e.endsAt || e.endsAt > e.startsAt, {
    message: 'End time must be after start time',
    path: ['endsAt'],
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = eventBase.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const eventListQuery = z.object({
  city: citySlug.optional(),
  clubId: z.string().uuid().optional(),
  bookstoreId: z.string().uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const rsvpSchema = z.object({ status: z.enum(['going', 'maybe', 'no']) });

// ---------- Bookstores ----------

export const bookstoreListQuery = z.object({
  city: citySlug.optional(),
  area: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
});

export const createBookstoreSchema = z.object({
  name: trimmed(2, 120),
  description: z.string().trim().max(2000).optional(),
  address: trimmed(5, 500),
  area: z.string().trim().max(100).optional(),
  city: citySlug,
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  phone: z.string().trim().max(30).optional(),
  website: z.string().url().optional(),
  hours: z.string().trim().max(200).optional(),
  languages: z.array(langCode).max(10).optional(),
  secondhand: z.boolean().optional(),
});
export type CreateBookstoreInput = z.infer<typeof createBookstoreSchema>;

// ---------- Safety ----------

export const reportTargetTypes = ['post', 'thread', 'dm_message', 'user', 'club', 'event', 'book'] as const;

export const createReportSchema = z.object({
  targetType: z.enum(reportTargetTypes),
  targetId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'hate', 'sexual', 'spoiler', 'impersonation', 'other']),
  details: z.string().trim().max(1000).optional(),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const createBlockSchema = z.object({ userId: z.string().uuid() });

export const resolveReportSchema = z.object({
  action: z.enum(['dismiss', 'remove_content']),
  note: z.string().trim().max(1000).optional(),
});

export const reviewBookSchema = z.object({ decision: z.enum(['approve', 'reject']) });

// ---------- Notifications ----------

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).max(200).optional(),
});

// ---------- Message board ----------

export const MAX_POST_PHOTOS = 4;

export const boardPostSchema = z.object({
  title: trimmed(3, 150),
  body: z.string().trim().max(5000).default(''),
  mediaIds: z.array(z.string().uuid()).max(MAX_POST_PHOTOS).default([]),
});
export type BoardPostInput = z.infer<typeof boardPostSchema>;
export const replySchema = z.object({ body: trimmed(1, 3000) });

export const reactionSchema = z.object({ kind: z.enum(['like', 'love']) });
