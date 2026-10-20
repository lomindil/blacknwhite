/* eslint-disable no-console */
/**
 * Sample data for local development. Runs through the real services so schedules, threads,
 * notifications and gates are created exactly as in the app.
 *   pnpm db:seed          (after migrations; safe to re-run — it wipes and reseeds)
 * Bookstores and people here are fictional samples.
 */
import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BooksModule } from '../books/books.controller';
import { BooksService } from '../books/books.service';
import { createBook } from '../books/book-factory';
import { ClubsModule } from '../clubs/clubs.module';
import { ClubsService } from '../clubs/clubs.service';
import { PollsService } from '../clubs/polls.service';
import { AuthUser } from '../common/http';
import { CoreModule } from '../core/core.module';
import { PrismaService } from '../core/prisma.service';
import { RedisService } from '../core/redis.service';
import { SearchService } from '../core/search.service';
import { DiscussionModule } from '../discussion/discussion.module';
import { DiscussionService } from '../discussion/discussion.service';
import { EventsModule } from '../events/events.module';
import { EventsService } from '../events/events.service';
import { BlogModule, BlogService } from '../blog/blog.module';
import { StorageService } from '../core/storage.service';
import { readFileSync } from 'node:fs';
import path from 'node:path';

@Module({ imports: [CoreModule, AuthModule, BooksModule, ClubsModule, DiscussionModule, EventsModule, BlogModule] })
class SeedModule {}

const DAY = 86400000;
const daysFromNow = (d: number, hour = 18) => {
  const t = new Date(Date.now() + d * DAY);
  t.setUTCHours(hour - 5, 30, 0, 0); // hour in IST
  return t;
};

const BOOKS = [
  { key: 'gost', title: 'The God of Small Things', authors: ['Arundhati Roy'], year: 1997, chapters: 21, genre: 'Literary fiction' },
  { key: 'suitable', title: 'A Suitable Boy', authors: ['Vikram Seth'], year: 1993, chapters: 19 },
  { key: 'midnight', title: "Midnight's Children", authors: ['Salman Rushdie'], year: 1981, chapters: 30 },
  { key: 'tomb', title: 'Tomb of Sand', subtitle: 'Ret Samadhi', authors: ['Geetanjali Shree'], native: ['गीतांजलि श्री'], year: 2018, chapters: 3 },
  { key: 'heart', title: 'Heart Lamp', subtitle: 'Selected Stories', authors: ['Banu Mushtaq'], native: ['ಬಾನು ಮುಷ್ತಾಕ್'], year: 2025, chapters: 12, language: 'kn' },
  { key: 'gitanjali', title: 'Gitanjali', authors: ['Rabindranath Tagore'], native: ['রবীন্দ্রনাথ ঠাকুর'], year: 1910, chapters: 103, language: 'bn' },
  { key: 'pather', title: 'Pather Panchali', authors: ['Bibhutibhushan Bandyopadhyay'], native: ['বিভূতিভূষণ বন্দ্যোপাধ্যায়'], year: 1929, chapters: 35, language: 'bn' },
  { key: 'ponniyin', title: 'Ponniyin Selvan', subtitle: 'Fresh Floods', authors: ['Kalki Krishnamurthy'], native: ['கல்கி கிருஷ்ணமூர்த்தி'], year: 1955, chapters: 57, language: 'ta' },
  { key: 'samskara', title: 'Samskara', authors: ['U. R. Ananthamurthy'], native: ['ಯು. ಆರ್. ಅನಂತಮೂರ್ತಿ'], year: 1965, chapters: 13, language: 'kn' },
  { key: 'chemmeen', title: 'Chemmeen', authors: ['Thakazhi Sivasankara Pillai'], native: ['തകഴി ശിവശങ്കരപ്പിള്ള'], year: 1956, chapters: 28, language: 'ml' },
  { key: 'godaan', title: 'Godaan', authors: ['Munshi Premchand'], native: ['मुंशी प्रेमचंद'], year: 1936, chapters: 36, language: 'hi' },
  { key: 'tiger', title: 'The White Tiger', authors: ['Aravind Adiga'], year: 2008, chapters: 7 },
  { key: 'train', title: 'Train to Pakistan', authors: ['Khushwant Singh'], year: 1956, chapters: 4 },
  { key: 'palace', title: 'The Palace of Illusions', authors: ['Chitra Banerjee Divakaruni'], year: 2008, chapters: 44 },
  { key: 'poppies', title: 'Sea of Poppies', authors: ['Amitav Ghosh'], year: 2008, chapters: 20 },
  { key: 'inheritance', title: 'The Inheritance of Loss', authors: ['Kiran Desai'], year: 2006, chapters: 53 },
  { key: 'maladies', title: 'Interpreter of Maladies', authors: ['Jhumpa Lahiri'], year: 1999, chapters: 9 },
  { key: 'malgudi', title: 'Malgudi Days', authors: ['R. K. Narayan'], year: 1943, chapters: 32 },
  { key: 'pride', title: 'Pride and Prejudice', authors: ['Jane Austen'], year: 1813, chapters: 61 },
  { key: 'solitude', title: 'One Hundred Years of Solitude', authors: ['Gabriel García Márquez'], year: 1967, chapters: 20 },
  { key: 'remains', title: 'The Remains of the Day', authors: ['Kazuo Ishiguro'], year: 1989, chapters: 8 },
  { key: 'klara', title: 'Klara and the Sun', authors: ['Kazuo Ishiguro'], year: 2021, chapters: 6 },
  { key: 'kafka', title: 'Kafka on the Shore', authors: ['Haruki Murakami'], year: 2002, chapters: 49 },
  { key: 'sapiens', title: 'Sapiens', subtitle: 'A Brief History of Humankind', authors: ['Yuval Noah Harari'], year: 2011, chapters: 20 },
] as const;

const PEOPLE = [
  { key: 'admin', name: 'Site Admin', city: 'bengaluru', admin: true },
  { key: 'meera', name: 'Meera Iyer', city: 'bengaluru', languages: ['en', 'kn'] },
  { key: 'arjun', name: 'Arjun Mehta', city: 'mumbai', languages: ['en', 'hi', 'mr'] },
  { key: 'fatima', name: 'Fatima Qureshi', city: 'delhi', languages: ['hi', 'ur', 'en'] },
  { key: 'karthik', name: 'Karthik Raman', city: 'chennai', languages: ['ta', 'en'] },
  { key: 'ananya', name: 'Ananya Sen', city: 'kolkata', languages: ['bn', 'en'] },
  { key: 'rohan', name: 'Rohan Kulkarni', city: 'pune', languages: ['en', 'mr'] },
  { key: 'divya', name: 'Divya Nair', city: 'kochi', languages: ['ml', 'en'] },
  { key: 'sahil', name: 'Sahil Grewal', city: 'chandigarh', languages: ['pa', 'hi', 'en'] },
] as const;

async function main() {
  const app = await NestFactory.createApplicationContext(SeedModule, { logger: ['warn', 'error'] });
  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);
  const clubs = app.get(ClubsService);
  const polls = app.get(PollsService);
  const discussion = app.get(DiscussionService);
  const events = app.get(EventsService);
  const books = app.get(BooksService);
  const resetLimits = async () => {
    const keys = await redis.client.keys('rl:*');
    if (keys.length) await redis.client.del(...keys);
  };

  console.log('Wiping existing data…');
  await prisma.$executeRawUnsafe(`
    TRUNCATE notifications, reports, blocks, import_jobs, event_rsvps, events, bookstores,
      dm_messages, dm_participants, dm_conversations, posts, threads, poll_votes, poll_options, polls,
      club_books, club_invites, club_members, clubs, book_stats, reading_status, book_links,
      book_authors, authors, book_editions, books, user_settings, user_identities, users CASCADE`);
  await resetLimits();

  // ---------- People ----------
  const users: Record<string, AuthUser> = {};
  for (const p of PEOPLE) {
    const email = `${p.key}@example.com`;
    const u = await prisma.user.create({
      data: {
        email,
        displayName: p.name,
        city: p.city,
        languages: 'languages' in p ? [...p.languages] : ['en'],
        genres: ['Literary fiction', 'Translated fiction'],
        isAdmin: 'admin' in p && p.admin,
        onboardedAt: new Date(),
        termsAcceptedAt: new Date(),
        createdAt: new Date(Date.now() - 60 * DAY),
        identities: { create: { provider: 'dev', providerUserId: email } },
        settings: { create: {} },
      },
    });
    users[p.key] = { id: u.id, email, displayName: u.displayName, isAdmin: u.isAdmin, city: u.city, createdAt: u.createdAt, sessionId: 'seed' };
  }
  // Extra readers so aggregate counts cross the public threshold of 5.
  const readers: AuthUser[] = [];
  const readerCities = ['bengaluru', 'bengaluru', 'bengaluru', 'bengaluru', 'bengaluru', 'bengaluru', 'bengaluru', 'mumbai', 'mumbai', 'delhi', 'chennai', 'kolkata'];
  for (let i = 0; i < readerCities.length; i++) {
    const email = `reader${i + 1}@example.com`;
    const u = await prisma.user.create({
      data: {
        email,
        displayName: `Reader ${i + 1}`,
        city: readerCities[i],
        onboardedAt: new Date(),
        termsAcceptedAt: new Date(),
        createdAt: new Date(Date.now() - 30 * DAY),
        identities: { create: { provider: 'dev', providerUserId: email } },
        settings: { create: {} },
      },
    });
    readers.push({ id: u.id, email, displayName: u.displayName, isAdmin: false, city: u.city, createdAt: u.createdAt, sessionId: 'seed' });
  }

  // ---------- Books ----------
  const bookIds: Record<string, string> = {};
  for (const b of BOOKS) {
    bookIds[b.key] = await createBook(prisma, {
      title: b.title,
      subtitle: 'subtitle' in b ? b.subtitle : null,
      authors: [...b.authors],
      authorsNative: 'native' in b ? [...b.native] : undefined,
      language: 'language' in b ? b.language : 'en',
      publishedYear: b.year,
      chapterCount: b.chapters,
      source: 'seed',
    });
  }
  console.log(`Created ${PEOPLE.length + readers.length} people and ${BOOKS.length} books`);

  // ---------- Bookstores (fictional samples) ----------
  const stores = [
    { name: 'Jacaranda Books', area: 'Church Street', city: 'bengaluru', secondhand: true, languages: ['en', 'kn'], owner: 'meera' },
    { name: 'Sampige Pustaka Mane', area: 'Basavanagudi', city: 'bengaluru', secondhand: false, languages: ['kn', 'en'] },
    { name: 'Monsoon Paperbacks', area: 'Fort', city: 'mumbai', secondhand: true, languages: ['en', 'mr', 'hi'], owner: 'arjun' },
    { name: 'Neem Tree Books', area: 'Khan Market', city: 'delhi', secondhand: false, languages: ['en', 'hi', 'ur'] },
    { name: 'Marina Book House', area: 'Mylapore', city: 'chennai', secondhand: false, languages: ['ta', 'en'] },
    { name: 'College Street Corner', area: 'College Street', city: 'kolkata', secondhand: true, languages: ['bn', 'en'] },
    { name: 'Deccan Pages', area: 'FC Road', city: 'pune', secondhand: true, languages: ['en', 'mr'] },
    { name: 'Backwater Books', area: 'Fort Kochi', city: 'kochi', secondhand: false, languages: ['ml', 'en'] },
  ];
  const storeIds: Record<string, string> = {};
  for (const s of stores) {
    const row = await prisma.bookstore.create({
      data: {
        name: s.name,
        slug: `${s.name}-${s.city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: `${s.secondhand ? 'Secondhand and new books' : 'New books'} in ${s.languages.length > 1 ? 'several languages' : 'one language'}. Sample listing for development.`,
        address: `${s.area}, ${s.city.charAt(0).toUpperCase() + s.city.slice(1)}`,
        area: s.area,
        city: s.city,
        hours: 'Open daily, 10:30 am – 8:30 pm',
        languages: s.languages,
        secondhand: s.secondhand,
        claimedById: s.owner ? users[s.owner].id : null,
      },
    });
    storeIds[s.name] = row.id;
  }

  // ---------- Clubs ----------
  const clubDefs = [
    { key: 'koramangala', owner: 'meera', name: 'Koramangala Fiction Circle', city: 'bengaluru', language: 'en', book: 'gost', chaptersPerWeek: 4, startedDaysAgo: 10,
      description: 'Literary fiction, one book a month, Sunday mornings in Koramangala or online. Newcomers welcome.' },
    { key: 'kannada', owner: 'meera', name: 'Kannada Odu Balaga', city: 'bengaluru', language: 'kn', book: 'samskara', chaptersPerWeek: 3, startedDaysAgo: 3,
      description: 'ಕನ್ನಡ ಪುಸ್ತಕ ಓದುಗರ ಬಳಗ — we read Kannada classics and new writing, in Kannada and translation.' },
    { key: 'monsoon', owner: 'arjun', name: 'Mumbai Monsoon Readers', city: 'mumbai', language: 'en', book: 'poppies', chaptersPerWeek: 5, startedDaysAgo: 6,
      description: 'Historical fiction and big sweeping novels. We meet at a café in Fort every other Saturday.' },
    { key: 'dilli', owner: 'fatima', name: 'Dilli Hindi Pathak Manch', city: 'delhi', language: 'hi', book: 'godaan', chaptersPerWeek: 6, startedDaysAgo: 14,
      description: 'हिंदी साहित्य पढ़ने और चर्चा करने वालों का मंच। Premchand se lekar aaj tak.' },
    { key: 'chennai', owner: 'karthik', name: 'Chennai Classics Club', city: 'chennai', language: 'ta', book: 'ponniyin', chaptersPerWeek: 8, startedDaysAgo: 20,
      description: 'Tamil classics and the epics, read slowly and argued about loudly.' },
    { key: 'adda', owner: 'ananya', name: 'Kolkata Adda Book Club', city: 'kolkata', language: 'bn', book: 'pather', chaptersPerWeek: 5, startedDaysAgo: 2,
      description: 'বই, চা আর আড্ডা। Bengali literature and translations.' },
    { key: 'scifi', owner: 'rohan', name: 'Pune Sci-Fi & Fantasy Readers', city: 'pune', language: 'en', book: 'klara', chaptersPerWeek: 2, startedDaysAgo: 0,
      description: 'Speculative fiction of all kinds. Online every second Thursday, in person once a month.' },
    { key: 'kochi', owner: 'divya', name: 'Kochi Malayalam Vayanakoottam', city: 'kochi', language: 'ml', book: 'chemmeen', chaptersPerWeek: 4, startedDaysAgo: 7,
      description: 'മലയാളം വായനക്കൂട്ടം — Malayalam classics by the backwaters.' },
    { key: 'office', owner: 'sahil', name: 'Office Book Nook', city: 'chandigarh', language: 'en', book: 'remains', chaptersPerWeek: 2, startedDaysAgo: 4, private: true,
      description: 'A private club for our team. Invite only.' },
  ] as const;

  const clubIds: Record<string, string> = {};
  for (const c of clubDefs) {
    const detail = await clubs.create(users[c.owner], {
      name: c.name,
      description: c.description,
      city: c.city,
      language: c.language,
      visibility: 'private' in c && c.private ? 'private' : 'public',
    });
    clubIds[c.key] = detail.id;
    if (c.key === 'koramangala') {
      // An earlier read, so the club has an archive.
      await clubs.setBook(detail.id, users[c.owner], {
        bookId: bookIds.pride,
        startsOn: new Date(Date.now() - 80 * DAY),
        totalChapters: 61,
        chaptersPerWeek: 10,
      });
    }
    const book = BOOKS.find((b) => b.key === c.book)!;
    await clubs.setBook(detail.id, users[c.owner], {
      bookId: bookIds[c.book],
      startsOn: new Date(Date.now() - c.startedDaysAgo * DAY),
      totalChapters: book.chapters,
      chaptersPerWeek: c.chaptersPerWeek,
    });
  }

  // Memberships: everyone joins a few clubs; readers join the club in their city.
  const join = async (clubKey: string, u: AuthUser) => {
    await prisma.clubMember.upsert({
      where: { clubId_userId: { clubId: clubIds[clubKey], userId: u.id } },
      create: { clubId: clubIds[clubKey], userId: u.id },
      update: {},
    });
  };
  for (const k of ['arjun', 'karthik', 'divya']) await join('koramangala', users[k]);
  for (const k of ['meera', 'rohan']) await join('monsoon', users[k]);
  await join('dilli', users.sahil);
  await join('adda', users.meera);
  await join('scifi', users.arjun);
  await join('office', users.fatima);
  const byCity: Record<string, string> = { bengaluru: 'koramangala', mumbai: 'monsoon', delhi: 'dilli', chennai: 'chennai', kolkata: 'adda' };
  for (const r of readers) await join(byCity[r.city!], r);
  await prisma.clubMember.update({ where: { clubId_userId: { clubId: clubIds.koramangala, userId: users.arjun.id } }, data: { role: 'admin' } });

  // ---------- Reading progress ----------
  // Bengaluru readers are spread across The God of Small Things so gates differ per reader.
  const progress: [AuthUser, string, 'reading' | 'read' | 'want', number][] = [
    [users.meera, 'gost', 'reading', 9],
    [users.arjun, 'gost', 'reading', 5],
    [users.karthik, 'gost', 'reading', 2],
    [users.divya, 'gost', 'read', 21],
    [users.meera, 'samskara', 'reading', 3],
    [users.arjun, 'poppies', 'reading', 10],
    [users.rohan, 'poppies', 'reading', 6],
    [users.fatima, 'godaan', 'reading', 12],
    [users.karthik, 'ponniyin', 'reading', 20],
    [users.ananya, 'pather', 'reading', 6],
    [users.rohan, 'klara', 'want', 0],
    [users.divya, 'chemmeen', 'reading', 8],
    [users.sahil, 'remains', 'reading', 2],
    [users.meera, 'pride', 'read', 61],
    [users.arjun, 'pride', 'read', 61],
    [users.meera, 'heart', 'want', 0],
    [users.fatima, 'tomb', 'read', 3],
  ];
  readers.forEach((r, i) => progress.push([r, r.city === 'bengaluru' ? 'gost' : 'tiger', 'reading', (i % 7) + 1]));
  readers.slice(0, 6).forEach((r) => progress.push([r, 'maladies', 'read', 9]));
  for (const [u, key, status, chapter] of progress) {
    await books.setStatus(u.id, bookIds[key], { status, currentChapter: chapter });
  }

  // ---------- Discussion ----------
  await resetLimits();
  const threadsFor = async (clubKey: string, bookKey?: string) =>
    prisma.thread.findMany({
      where: { clubId: clubIds[clubKey], isBoard: false, ...(bookKey ? { bookId: bookIds[bookKey] } : {}) },
      orderBy: { scheduleWeek: 'asc' },
    });
  const kThreads = await threadsFor('koramangala', 'gost');
  const intro = kThreads.find((t) => t.scheduleWeek === 0)!;
  const week1 = kThreads.find((t) => t.scheduleWeek === 1)!;
  const week2 = kThreads.find((t) => t.scheduleWeek === 2)!;
  await discussion.createPost(intro.id, users.meera, { body: "Welcome, everyone! First time reading Roy? Tell us what you're expecting. No plot spoilers in this thread, please." });
  await discussion.createPost(intro.id, users.karthik, { body: 'First time! The opening pages about the monsoon in Ayemenem are gorgeous.' });
  await discussion.createPost(intro.id, users.arjun, { body: 'Re-reading after 15 years. Will try very hard not to give anything away 🙂' });
  await discussion.createPost(week1.id, users.meera, { body: 'The way time jumps between 1969 and the present threw me at first. Did anyone else draw a family tree?' });
  await discussion.createPost(week1.id, users.arjun, { body: 'Yes! Also the capitalised phrases — Big Man the Laltain, Small Man the Mombatti. ||Watch how often "Things can change in a day" comes back.||' });
  await discussion.createPost(week2.id, users.meera, { body: "Baby Kochamma is one of the most quietly terrifying characters I've read." });
  await discussion.createPost(week2.id, users.divya, { body: 'Just wait until the later chapters…', chapterRef: 18 });
  // Archive: the club's previous book.
  const pThreads = await threadsFor('koramangala', 'pride');
  await discussion.createPost(pThreads.find((t) => t.scheduleWeek === -1)!.id, users.meera, { body: 'Re-reading Austen as an adult — Mr Bennet is so much funnier, and so much less forgivable.' });
  await discussion.createPost(pThreads.find((t) => t.scheduleWeek === -1)!.id, users.arjun, { body: 'Charlotte Lucas deserves her own novel.' });
  // Message board: the club's general feed.
  const where = await discussion.postToBoard(clubIds.koramangala, users.arjun, {
    title: 'Where should we meet this month?',
    body: 'Options so far: the usual café on 5th Block, or the reading room at Jacaranda Books. Vote with a comment!',
    mediaIds: [],
  });
  await discussion.reply(where.id, users.meera, 'Jacaranda! They said we can use the back room on Sundays.');
  const plusOne = await discussion.reply(where.id, users.karthik, '+1 for Jacaranda, it’s closer to the metro.');
  await discussion.reply(plusOne.id, users.arjun, 'Jacaranda it is, then. I’ll book the back room.');
  for (const u of [users.meera, users.karthik, users.divya]) await discussion.react(where.id, u, 'like');
  await discussion.react(where.id, users.meera, 'love');
  await discussion.react(plusOne.id, users.meera, 'like');
  await discussion.postToBoard(clubIds.koramangala, users.meera, {
    title: 'Welcome, new members 👋',
    body: 'Introduce yourselves here — what are you reading on the side?',
    mediaIds: [],
  });
  await resetLimits();
  await resetLimits();
  const mThreads = await threadsFor('monsoon');
  await discussion.createPost(mThreads.find((t) => t.scheduleWeek === 0)!.id, users.arjun, { body: "Ghosh's research is staggering. Keep a glossary handy — or don't, and let the language wash over you." });
  await discussion.createPost(mThreads.find((t) => t.scheduleWeek === 1)!.id, users.rohan, { body: 'Deeti is such a vivid character from page one.' });
  const dThreads = await threadsFor('dilli');
  await discussion.createPost(dThreads.find((t) => t.scheduleWeek === 1)!.id, users.fatima, { body: 'होरी की सादगी और उसका संघर्ष — पहले ही अध्याय से दिल छू जाता है।' });

  // ---------- Polls ----------
  await polls.create(clubIds.koramangala, users.meera, {
    question: "What should we read after The God of Small Things?",
    kind: 'book',
    closesAt: daysFromNow(10),
    options: [
      { label: 'Tomb of Sand', bookId: bookIds.tomb },
      { label: 'Heart Lamp', bookId: bookIds.heart },
      { label: 'The Inheritance of Loss', bookId: bookIds.inheritance },
    ],
  });
  await polls.create(clubIds.monsoon, users.arjun, {
    question: 'Which Saturday works for the next meetup?',
    kind: 'time',
    options: [{ label: 'This Saturday, 5 pm' }, { label: 'Next Saturday, 11 am' }, { label: 'Next Saturday, 5 pm' }],
  });

  // ---------- Events ----------
  const ev = (clubOrStore: { clubId?: string; bookstoreId?: string }, by: AuthUser, e: Record<string, unknown>) =>
    events.create(by, { addressRsvpOnly: true, ...clubOrStore, ...(e as any) });
  await ev({ clubId: clubIds.koramangala }, users.meera, {
    title: 'The God of Small Things — week 3 meetup',
    description: 'Discussing chapters 9–12. Chai is on us.',
    startsAt: daysFromNow(4, 11),
    mode: 'in_person',
    venueName: 'Third Wave café, 5th Block',
    area: 'Koramangala',
    address: '80 Feet Road, 5th Block, Koramangala',
    capacity: 15,
  });
  await ev({ clubId: clubIds.koramangala }, users.arjun, {
    title: 'Online catch-up for those who missed Sunday',
    startsAt: daysFromNow(7, 20),
    mode: 'online',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
  });
  await ev({ clubId: clubIds.monsoon }, users.arjun, {
    title: 'Sea of Poppies: Part One discussion',
    startsAt: daysFromNow(5, 17),
    mode: 'in_person',
    venueName: 'Monsoon Paperbacks reading room',
    area: 'Fort',
    capacity: 20,
  });
  await ev({ clubId: clubIds.dilli }, users.fatima, {
    title: 'गोदान पर चर्चा — भाग 2',
    startsAt: daysFromNow(6, 16),
    mode: 'in_person',
    venueName: 'Neem Tree Books',
    area: 'Khan Market',
  });
  await ev({ clubId: clubIds.scifi }, users.rohan, {
    title: 'Klara and the Sun — kickoff call',
    startsAt: daysFromNow(3, 21),
    mode: 'online',
    meetingUrl: 'https://zoom.us/j/0000000000',
  });
  await ev({ bookstoreId: storeIds['Jacaranda Books'] }, users.meera, {
    title: 'Silent reading hour',
    description: 'Bring a book, phones away, read together for an hour. Coffee afterwards.',
    startsAt: daysFromNow(2, 10),
    mode: 'in_person',
    venueName: 'Jacaranda Books',
    area: 'Church Street',
    addressRsvpOnly: false,
    address: 'Church Street, Bengaluru',
  });
  await ev({ bookstoreId: storeIds['Monsoon Paperbacks'] }, users.arjun, {
    title: 'Secondhand book swap',
    description: 'Bring up to five books, leave with five new-to-you ones.',
    startsAt: daysFromNow(9, 15),
    mode: 'in_person',
    venueName: 'Monsoon Paperbacks',
    area: 'Fort',
    addressRsvpOnly: false,
    address: 'Fort, Mumbai',
  });
  // A few RSVPs.
  const firstEvent = await prisma.event.findFirst({ where: { clubId: clubIds.koramangala }, orderBy: { startsAt: 'asc' } });
  for (const r of readers.slice(0, 5)) {
    await prisma.eventRsvp.create({ data: { eventId: firstEvent!.id, userId: r.id, status: 'going' } });
  }

  // ---------- Community blog ----------
  await resetLimits();
  const blog = app.get(BlogService);
  const storage = app.get(StorageService);
  const coverFrom = async (owner: AuthUser, file: string) => {
    const buf = readFileSync(path.resolve(__dirname, '../../../web/public/images/landing', file));
    const stored = await storage.saveImage(buf);
    return prisma.media.create({ data: { ownerId: owner.id, ...stored } });
  };
  const list = await blog.create(users.meera, {
    title: 'Ten Indian novels for your book club’s next pick',
    excerpt: 'Big books, small books, translations and a few modern classics that always get a club talking.',
    tags: ['reading list', 'indian fiction'],
    coverMediaId: (await coverFrom(users.meera, 'place-bookstore.jpg')).id,
    publish: true,
    body: `Every few months our club argues about what to read next. Here are the ten books that have sparked the best conversations — chosen for discussion, not just for being good.

## For clubs that like a big, sweeping read

1. **A Suitable Boy** by Vikram Seth — long, yes, but a club can live in it for a season.
2. **Sea of Poppies** by Amitav Ghosh — the language alone is worth a meetup.
3. **Ponniyin Selvan** by Kalki Krishnamurthy — read it in Tamil or in translation; split by volume.

## For a single month

4. **The God of Small Things** by Arundhati Roy
5. **Interpreter of Maladies** by Jhumpa Lahiri — stories, so late joiners can still catch up.
6. **The White Tiger** by Aravind Adiga

## Translations worth the hype

7. **Tomb of Sand** by Geetanjali Shree, translated by Daisy Rockwell
8. **Heart Lamp** by Banu Mushtaq, translated by Deepa Bhasthi
9. **Samskara** by U. R. Ananthamurthy
10. **Chemmeen** by Thakazhi Sivasankara Pillai

> Pick something nobody has read yet. The best discussions happen when everyone arrives with the same questions.

What would you add? Tell us on your club’s board.`,
  });
  const howto = await blog.create(users.arjun, {
    title: 'How we run a monsoon book club in Mumbai',
    tags: ['club stories', 'mumbai', 'organizers'],
    coverMediaId: (await coverFrom(users.arjun, 'hero-cafe.jpg')).id,
    publish: true,
    body: `We started with six friends and a WhatsApp group. Two years later we’re forty-odd readers who meet every other Saturday in Fort. A few things that made it work:

## Read on a schedule, not a deadline

We split every book into weekly chunks. Nobody has to finish the night before, and the weekly threads mean people who are behind don’t get spoiled.

## Rotate the host

Every meetup has a different host who brings three questions. It keeps the conversation fresh — and nobody burns out.

## Make it easy to come back

> The members who drift away rarely leave because of the book. They leave because they missed two meetups and felt lost.

So we keep an archive of every discussion, and a reminder goes out the day before each meetup. Simple, but it doubled our turnout.

If you run a club too, I’d love to hear what works for you.`,
  });
  const translation = await blog.create(users.divya, {
    title: 'Reading Chemmeen in Malayalam and English, side by side',
    tags: ['malayalam', 'translation'],
    publish: true,
    body: `This month our Kochi club tried something new: half of us read *Chemmeen* in the original Malayalam, half in English translation, and we compared notes chapter by chapter.

## What changed in translation

The dialogue lost some of its coastal rhythm, but the story’s heartbreak came through intact. The English readers noticed things the rest of us took for granted — and the reverse was even more true.

## Try it with your club

Pick a book with a good translation, split the club in two, and meet in the middle. It’s the liveliest discussion we’ve had all year.`,
  });
  for (const u of [users.arjun, users.karthik, users.divya, users.rohan, ...readers.slice(0, 6)]) await blog.toggleLike(list.id, u);
  for (const u of [users.meera, users.fatima, users.sahil, ...readers.slice(6, 9)]) await blog.toggleLike(howto.id, u);
  for (const u of [users.meera, users.ananya, users.karthik]) await blog.toggleLike(translation.id, u);

  // ---------- Stats and search ----------
  await books.recomputeStats();
  await app.get(SearchService).reindexAll();
  await prisma.notification.deleteMany({});
  await resetLimits();

  console.log('\nSeed complete. Sign in on the login page with any of these emails (dev login):');
  for (const p of PEOPLE) console.log(`  ${p.key}@example.com  — ${p.name}, ${p.city}${'admin' in p ? ' (admin)' : ''}`);
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
