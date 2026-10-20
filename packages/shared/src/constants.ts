// Reference data shared by the API and the web app.
// Cities are stored as slugs; any city not in this list is stored as its slugified name.

export interface City {
  slug: string;
  name: string;
  state: string;
}

export const CITIES: City[] = [
  { slug: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat' },
  { slug: 'bengaluru', name: 'Bengaluru', state: 'Karnataka' },
  { slug: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh' },
  { slug: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha' },
  { slug: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh' },
  { slug: 'chennai', name: 'Chennai', state: 'Tamil Nadu' },
  { slug: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu' },
  { slug: 'dehradun', name: 'Dehradun', state: 'Uttarakhand' },
  { slug: 'delhi', name: 'Delhi', state: 'Delhi' },
  { slug: 'goa', name: 'Goa', state: 'Goa' },
  { slug: 'gurugram', name: 'Gurugram', state: 'Haryana' },
  { slug: 'guwahati', name: 'Guwahati', state: 'Assam' },
  { slug: 'hyderabad', name: 'Hyderabad', state: 'Telangana' },
  { slug: 'indore', name: 'Indore', state: 'Madhya Pradesh' },
  { slug: 'jaipur', name: 'Jaipur', state: 'Rajasthan' },
  { slug: 'kochi', name: 'Kochi', state: 'Kerala' },
  { slug: 'kolkata', name: 'Kolkata', state: 'West Bengal' },
  { slug: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh' },
  { slug: 'mumbai', name: 'Mumbai', state: 'Maharashtra' },
  { slug: 'mysuru', name: 'Mysuru', state: 'Karnataka' },
  { slug: 'nagpur', name: 'Nagpur', state: 'Maharashtra' },
  { slug: 'noida', name: 'Noida', state: 'Uttar Pradesh' },
  { slug: 'patna', name: 'Patna', state: 'Bihar' },
  { slug: 'puducherry', name: 'Puducherry', state: 'Puducherry' },
  { slug: 'pune', name: 'Pune', state: 'Maharashtra' },
  { slug: 'shillong', name: 'Shillong', state: 'Meghalaya' },
  { slug: 'surat', name: 'Surat', state: 'Gujarat' },
  { slug: 'thiruvananthapuram', name: 'Thiruvananthapuram', state: 'Kerala' },
  { slug: 'vadodara', name: 'Vadodara', state: 'Gujarat' },
  { slug: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh' },
  { slug: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh' },
];

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', native: 'اردو' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া' },
  { code: 'kok', name: 'Konkani', native: 'कोंकणी' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्' },
] as const;

export const GENRES = [
  'Literary fiction',
  'Contemporary fiction',
  'Historical fiction',
  'Mystery & thriller',
  'Science fiction',
  'Fantasy',
  'Romance',
  'Horror',
  'Poetry',
  'Classics',
  'Mythology',
  'Translated fiction',
  'Short stories',
  'Graphic novels',
  'Non-fiction',
  'History',
  'Biography & memoir',
  'Politics & society',
  'Science',
  'Philosophy',
  'Business',
  'Self-help',
  'Young adult',
  "Children's",
] as const;

/** Aggregate reader counts below this are shown as "a few readers" so no one can be singled out. */
export const MIN_PUBLIC_COUNT = 5;

/** DM limits from the architecture doc. */
export const DM_LIMITS = {
  newConversationsPerDay: 20,
  newConversationsPerDayYoungAccount: 5,
  youngAccountDays: 7,
} as const;

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export function cityName(slug: string | null | undefined): string {
  if (!slug) return '';
  const known = CITIES.find((c) => c.slug === slug);
  if (known) return known.name;
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function languageName(code: string | null | undefined): string {
  if (!code) return '';
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
