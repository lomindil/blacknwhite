import { GENRES } from '@bnw/shared';

type Genre = (typeof GENRES)[number];

/** Keywords in Open Library / Google Books subjects that map onto our genre list. */
const KEYWORDS: Record<Genre, string[]> = {
  'Literary fiction': ['literary fiction', 'fiction, literary', 'domestic fiction', 'psychological fiction', 'booker prize'],
  'Contemporary fiction': ['contemporary', 'family life', 'coming of age', 'city and town life'],
  'Historical fiction': ['historical fiction', 'fiction, historical', 'partition', 'colonial'],
  'Mystery & thriller': ['mystery', 'detective', 'thriller', 'suspense', 'crime', 'murder'],
  'Science fiction': ['science fiction', 'dystopia', 'space', 'robots', 'artificial intelligence', 'time travel'],
  Fantasy: ['fantasy', 'magic', 'dragons', 'wizards', 'fairy tales'],
  Romance: ['romance', 'love stories', 'love story'],
  Horror: ['horror', 'ghost stories', 'supernatural'],
  Poetry: ['poetry', 'poems', 'verse'],
  Classics: ['classic', 'classics'],
  Mythology: ['mythology', 'mahabharata', 'ramayana', 'epic', 'legends', 'hindu', 'gods'],
  'Translated fiction': ['translations into english', 'translated', 'translation'],
  'Short stories': ['short stories', 'short story'],
  'Graphic novels': ['comic', 'graphic novel', 'manga'],
  'Non-fiction': ['nonfiction', 'non-fiction'],
  History: ['history'],
  'Biography & memoir': ['biography', 'autobiography', 'memoir'],
  'Politics & society': ['politics', 'political', 'social conditions', 'caste', 'society', 'feminism'],
  Science: ['science', 'physics', 'biology', 'evolution', 'astronomy'],
  Philosophy: ['philosophy', 'ethics'],
  Business: ['business', 'economics', 'management', 'entrepreneurship'],
  'Self-help': ['self-help', 'self-improvement', 'personal development', 'success', 'happiness'],
  'Young adult': ['young adult', 'teen', 'juvenile fiction'],
  "Children's": ["children's", 'juvenile literature', 'picture books'],
};

/** Up to four of our genres for a list of free-text subjects, strongest matches first. */
export function subjectsToGenres(subjects: string[] | undefined | null): string[] {
  if (!subjects?.length) return [];
  // "History and criticism" and study guides describe books *about* a book, not its genre.
  const text = subjects.map((s) => s.toLowerCase().replace(/history and criticism|criticism and interpretation|study guides?/g, ''));
  const scored = (Object.entries(KEYWORDS) as [Genre, string[]][])
    .map(([genre, words]) => [genre, text.filter((s) => words.some((w) => s.includes(w))).length] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  return scored.slice(0, 4).map(([g]) => g);
}

/** Genres for the sample catalog (seed data and the backfill script). */
export const SEED_GENRES: Record<string, string[]> = {
  'The God of Small Things': ['Literary fiction', 'Contemporary fiction'],
  'A Suitable Boy': ['Literary fiction', 'Historical fiction', 'Romance'],
  "Midnight's Children": ['Literary fiction', 'Historical fiction', 'Classics'],
  'Tomb of Sand': ['Literary fiction', 'Translated fiction'],
  'Heart Lamp': ['Short stories', 'Translated fiction', 'Literary fiction'],
  Gitanjali: ['Poetry', 'Classics'],
  'Pather Panchali': ['Classics', 'Translated fiction', 'Literary fiction'],
  'Ponniyin Selvan': ['Historical fiction', 'Classics', 'Translated fiction'],
  Samskara: ['Classics', 'Translated fiction', 'Literary fiction'],
  Chemmeen: ['Classics', 'Romance', 'Translated fiction'],
  Godaan: ['Classics', 'Translated fiction', 'Politics & society'],
  'The White Tiger': ['Contemporary fiction', 'Literary fiction', 'Politics & society'],
  'Train to Pakistan': ['Historical fiction', 'Classics'],
  'The Palace of Illusions': ['Mythology', 'Historical fiction', 'Fantasy'],
  'Sea of Poppies': ['Historical fiction', 'Literary fiction'],
  'The Inheritance of Loss': ['Literary fiction', 'Contemporary fiction'],
  'Interpreter of Maladies': ['Short stories', 'Literary fiction'],
  'Malgudi Days': ['Short stories', 'Classics'],
  'Pride and Prejudice': ['Classics', 'Romance'],
  'One Hundred Years of Solitude': ['Classics', 'Literary fiction', 'Translated fiction'],
  'The Remains of the Day': ['Literary fiction', 'Classics'],
  'Klara and the Sun': ['Science fiction', 'Literary fiction'],
  'Kafka on the Shore': ['Fantasy', 'Translated fiction', 'Literary fiction'],
  Sapiens: ['Non-fiction', 'History', 'Science'],
};

/** Descriptions for sample books that Open Library and Google Books don't describe well. */
export const SEED_DESCRIPTIONS: Record<string, string> = {
  Chemmeen:
    "Thakazhi Sivasankara Pillai's 1956 Malayalam novel about Karuthamma, a fisherman's daughter, and her love for Pareekutty, a Muslim fish trader, set against the beliefs of a fishing community on the Kerala coast.",
  Godaan:
    "Premchand's last completed novel (1936). Hori, a poor farmer in a north Indian village, longs to own a cow, and that wish draws him into debt, caste pressure and exploitation.",
  'Pather Panchali':
    "Bibhutibhushan Bandyopadhyay's 1929 Bengali novel of Apu's childhood in a poor Brahmin family in rural Bengal: his sister Durga, their village, and the family's struggle to get by. Satyajit Ray based his first film on it.",
  'Ponniyin Selvan':
    "Kalki Krishnamurthy's epic historical novel, serialised from 1950 to 1954. It follows court intrigue in the 10th-century Chola kingdom, before the young prince Arulmozhivarman became Rajaraja Chola I.",
  Samskara:
    "U. R. Ananthamurthy's 1965 Kannada novel. When a dissolute Brahmin dies in an orthodox village, no one can agree who should perform his last rites, and the respected scholar Praneshacharya is thrown into a crisis of faith.",
  'Heart Lamp':
    'Twelve stories by Banu Mushtaq, translated from Kannada by Deepa Bhasthi, about the everyday lives of women in Muslim communities in southern India. Winner of the 2025 International Booker Prize.',
  'Tomb of Sand':
    "Geetanjali Shree's Hindi novel Ret Samadhi, translated by Daisy Rockwell. After her husband dies, an eighty-year-old woman in northern India leaves her bed and her old life behind, and travels to Pakistan to face what happened at Partition. The first book translated from Hindi to win the International Booker Prize (2022).",
  Gitanjali:
    'Song offerings: devotional poems by Rabindranath Tagore, translated into English by the poet himself. The collection won him the Nobel Prize in Literature in 1913.',
  'Interpreter of Maladies':
    'Nine stories by Jhumpa Lahiri about Indians and Indian Americans caught between cultures, from a tour guide in Odisha to a young couple in Boston. Winner of the 2000 Pulitzer Prize for Fiction.',
  'Kafka on the Shore':
    "Haruki Murakami's novel of two intertwined journeys: fifteen-year-old Kafka Tamura, who runs away from home, and Nakata, an old man who can talk to cats.",
};
