// Response shapes returned by the API. Dates are ISO strings on the wire.

export type ReadingStatusValue = 'want' | 'reading' | 'read';
export type ClubRole = 'owner' | 'admin' | 'member';
export type RsvpStatus = 'going' | 'maybe' | 'no' | 'waitlist';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Me extends UserSummary {
  email: string;
  bio: string | null;
  city: string | null;
  languages: string[];
  genres: string[];
  isAdmin: boolean;
  onboarded: boolean;
  createdAt: string;
  settings: {
    notifyEmail: boolean;
    emailDigest: boolean;
    notifyWhatsapp: boolean;
    whatsappNumber: string | null;
    dmPolicy: 'club_members' | 'nobody';
  };
  unreadNotifications: number;
  unreadMessages: number;
}

export interface PublicProfile extends UserSummary {
  bio: string | null;
  city: string | null;
  joinedAt: string;
  clubs: ClubSummary[];
  sharedClubs: ClubSummary[];
  canMessage: boolean;
  blockedByMe: boolean;
}

export interface BookSummary {
  id: string;
  title: string;
  subtitle: string | null;
  authors: string[];
  coverUrl: string | null;
  language: string;
  publishedYear: number | null;
}

export interface BookDetail extends BookSummary {
  description: string | null;
  pageCount: number | null;
  chapterCount: number | null;
  authorsNative: string[];
  editions: { isbn13: string | null; isbn10: string | null; format: string | null; publisher: string | null }[];
  status: 'approved' | 'pending' | 'rejected';
  myStatus: MyReadingStatus | null;
}

export interface MyReadingStatus {
  status: ReadingStatusValue;
  progressPct: number;
  currentChapter: number;
  rating: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ShelfItem extends MyReadingStatus {
  book: BookSummary;
  updatedAt: string;
}

export interface BookStats {
  city: string | null;
  /** null when the real count is below the public threshold. */
  readingCount: number | null;
  fewReaders: boolean;
  clubsReadingCount: number;
  clubs: ClubSummary[];
}

export interface BuyLink {
  retailer: 'amazon' | 'flipkart' | string;
  label: string;
  url: string;
  priceInr: number | null;
  affiliate: boolean;
}

export interface ClubSummary {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  language: string;
  visibility: 'public' | 'private';
  memberCount: number;
  currentBook: BookSummary | null;
}

export interface ClubDetail extends ClubSummary {
  description: string | null;
  owner: UserSummary;
  createdAt: string;
  myRole: ClubRole | null;
  currentClubBook: ClubBookInfo | null;
  history: ClubBookInfo[];
}

export interface ClubBookInfo {
  id: string;
  book: BookSummary;
  startsOn: string;
  endsOn: string | null;
  isCurrent: boolean;
  totalChapters: number | null;
  chaptersPerWeek: number | null;
  weeks: { week: number; fromChapter: number; toChapter: number; startsOn: string }[];
}

export interface ClubMemberInfo {
  user: UserSummary;
  role: ClubRole;
  joinedAt: string;
}

export interface InviteInfo {
  code: string;
  url: string;
  expiresAt: string | null;
  maxUses: number | null;
  uses: number;
  createdAt: string;
}

export interface PollInfo {
  id: string;
  question: string;
  kind: 'book' | 'time' | 'general';
  closesAt: string | null;
  closed: boolean;
  createdBy: UserSummary;
  createdAt: string;
  totalVotes: number;
  myVote: string | null;
  options: { id: string; label: string; votes: number; book: BookSummary | null }[];
}

export type ThreadListItem =
  | {
      id: string;
      locked: false;
      title: string;
      chapterGate: number;
      bookId: string | null;
      isSystem: boolean;
      author: UserSummary | null;
      postCount: number;
      lastPostAt: string;
      createdAt: string;
    }
  | { id: string; locked: true; chapterGate: number; bookId: string | null };

export interface ThreadDetail {
  id: string;
  clubId: string;
  title: string;
  chapterGate: number;
  book: BookSummary | null;
  isSystem: boolean;
  author: UserSummary | null;
  createdAt: string;
  myChapter: number | null;
}

export type PostItem =
  | {
      id: string;
      locked: false;
      hidden: false;
      body: string;
      chapterRef: number | null;
      author: UserSummary;
      createdAt: string;
      editedAt: string | null;
      mine: boolean;
    }
  | { id: string; locked: true; chapterRef: number; createdAt: string }
  | { id: string; locked: false; hidden: true; reason: 'blocked' | 'deleted'; createdAt: string };

export interface DmConversationItem {
  id: string;
  other: UserSummary;
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unread: boolean;
  readOnly: boolean;
}

export interface DmMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface EventSummary {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  mode: 'online' | 'in_person';
  venueName: string | null;
  area: string | null;
  city: string | null;
  club: { id: string; name: string; slug: string } | null;
  bookstore: { id: string; name: string; slug: string } | null;
  goingCount: number;
  capacity: number | null;
  cancelled: boolean;
}

export interface EventDetail extends EventSummary {
  description: string | null;
  /** Shown only to people who RSVP'd going/maybe, or to hosts. */
  meetingUrl: string | null;
  /** Shown publicly unless the host limited it to RSVPs. */
  address: string | null;
  addressHidden: boolean;
  myRsvp: RsvpStatus | null;
  canManage: boolean;
  createdBy: UserSummary;
  waitlistCount: number;
}

export interface BookstoreSummary {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  city: string;
  secondhand: boolean;
  languages: string[];
}

export interface BookstoreDetail extends BookstoreSummary {
  description: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  upcomingEvents: EventSummary[];
  canManage: boolean;
}

export interface NotificationItem {
  id: string;
  type: string;
  payload: Record<string, unknown> & { title: string; body?: string; url?: string };
  readAt: string | null;
  createdAt: string;
}

export interface ImportJobInfo {
  id: string;
  source: 'goodreads' | 'storygraph';
  status: 'queued' | 'processing' | 'done' | 'failed';
  total: number;
  matched: number;
  created: number;
  unmatched: { row: number; title: string; reason: string }[];
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface HomeFeed {
  clubs: ClubSummary[];
  reading: ShelfItem[];
  upcomingEvents: EventSummary[];
  popularInCity: { book: BookSummary; readingCount: number | null; fewReaders: boolean; clubsReadingCount: number }[];
  suggestedClubs: ClubSummary[];
}

export interface CityPage {
  city: string;
  name: string;
  clubs: ClubSummary[];
  events: EventSummary[];
  bookstores: BookstoreSummary[];
  popularBooks: { book: BookSummary; readingCount: number | null; fewReaders: boolean; clubsReadingCount: number }[];
}

export interface ReportItem {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: 'open' | 'actioned' | 'dismissed';
  reporter: UserSummary;
  createdAt: string;
  context: { excerpt: string | null; author: UserSummary | null; url: string | null };
}
