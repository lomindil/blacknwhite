import { cityName, languageName } from '@bnw/shared';

export { cityName, languageName };

const IST = 'Asia/Kolkata';

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: IST,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });
}

export function dayParts(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric' }),
    month: d.toLocaleDateString('en-IN', { timeZone: IST, month: 'short' }).toUpperCase(),
    time: d.toLocaleTimeString('en-IN', { timeZone: IST, hour: 'numeric', minute: '2-digit' }),
  };
}

export function timeAgo(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return formatDate(iso);
}

export function readersLabel(count: number | null, few: boolean, city?: string | null) {
  const where = city ? ` in ${cityName(city)}` : '';
  if (count) return `${count} readers${where} reading now`;
  if (few) return `A few readers${where} reading now`;
  return null;
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
