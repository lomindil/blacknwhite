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

/** A row on the Books page: enough to judge a book without opening it. */
export interface BookListItem extends BookSummary {
  description: string | null;
  genres: string[];
  pageCount: number | null;
  /** null below the public threshold. */
  readingCount: number | null;
  clubsReading: number;
}

export interface BookListPage {
  items: BookListItem[];
  page: number;
  hasMore: boolean;
}

export interface BookDetail extends BookSummary {
  description: string | null;
  pageCount: number | null;
  chapterCount: number | null;
  genres: string[];
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

/** An uploaded photo (EXIF stripped, resized). `url` is relative to the site, e.g. /media/2026/10/….webp */
export interface MediaInfo {
  id: string;
  url: string;
  width: number;
  height: number;
}

export type ReactionKind = 'like' | 'love';

export interface Reactions {
  like: number;
  love: number;
  mine: ReactionKind[];
}

/**
 * A message-board post or comment. `body` is null when removed or from a blocked reader.
 * In the feed `replies` is empty and `commentCount` says how many comments the post has;
 * the post page returns the full comment tree in `replies`.
 */
export interface BoardEntry {
  id: string;
  parentId: string | null;
  commentCount: number;
  reactions: Reactions;
  /** Posts have a title; comments don't. */
  title: string | null;
  body: string | null;
  images: MediaInfo[];
  hiddenReason: 'deleted' | 'blocked' | null;
  author: UserSummary;
  createdAt: string;
  editedAt: string | null;
  mine: boolean;
  replies: BoardEntry[];
}

// ---------- Blog ----------

export type BlogStatus = 'draft' | 'pending' | 'published' | 'removed';

export interface BlogSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  cover: MediaInfo | null;
  author: UserSummary;
  status: BlogStatus;
  publishedAt: string | null;
  updatedAt: string;
  likeCount: number;
  readMinutes: number;
}

export interface BlogDetail extends BlogSummary {
  body: string;
  likedByMe: boolean;
  mine: boolean;
}

// ---------- Admin portal ----------

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface OpsStats {
  generatedAt: string;
  users: { total: number; newToday: number; new7d: number; new30d: number; suspended: number; dau: number; wau: number; mau: number; onboardedPct: number };
  clubs: { total: number; public: number; private: number; shutdown: number; new7d: number; weeklyActive: number; avgMembers: number };
  activity: { posts7d: number; boardPosts7d: number; comments7d: number; reactions7d: number; dms7d: number; rsvps7d: number; upcomingEvents: number; imports7d: number };
  content: { books: number; pendingBooks: number; blogPublished: number; blogPending: number; openReports: number };
  series: { dau: SeriesPoint[]; signups: SeriesPoint[]; posts: SeriesPoint[] };
  topClubs: { id: string; name: string; slug: string; city: string | null; posts7d: number; members: number }[];
  topCities: { city: string; users: number }[];
}

export interface OpsUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  city: string | null;
  createdAt: string;
  lastActiveAt: string | null;
  clubs: number;
  posts: number;
  isAdmin: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  deleted: boolean;
}

export interface OpsClub {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  visibility: 'public' | 'private';
  owner: UserSummary & { email: string };
  members: number;
  posts7d: number;
  createdAt: string;
  deletedAt: string | null;
  shutdownReason: string | null;
}

export interface OpsAction {
  id: string;
  admin: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string | null;
  note: string | null;
  createdAt: string;
}

// ---------- Recommendations ----------

export interface ReadingProfile {
  readingLevel: 'new' | 'occasional' | 'regular' | 'avid';
  genres: string[];
  languages: string[];
  lovedBooks: BookSummary[];
  goals: ('club' | 'books' | 'meet_people' | 'online_discussion')[];
  format: 'in_person' | 'online' | 'either';
  pace: 'relaxed' | 'steady' | 'fast';
  length: 'short' | 'medium' | 'long' | 'any';
  updatedAt: string;
}

/** What we already know about a reader, used to explain and seed recommendations. */
export interface ReaderSignals {
  booksRead: number;
  booksReading: number;
  booksWanted: number;
  rated: number;
  clubs: number;
  clubBooks: number;
  topGenres: string[];
}

export interface BookRecommendation {
  book: BookSummary & { genres: string[]; pageCount: number | null; description: string | null };
  reasons: string[];
  score: number;
}

export interface ClubRecommendation {
  club: ClubSummary & { description: string | null; chaptersPerWeek: number | null; postsLast14d: number };
  reasons: string[];
  score: number;
}

export interface Recommendations {
  profile: ReadingProfile | null;
  signals: ReaderSignals;
  clubs: ClubRecommendation[];
  books: BookRecommendation[];
  /** Short, well-liked books for people who haven't read much lately. */
  starters: BookRecommendation[];
}
