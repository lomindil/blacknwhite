import type { OpsStats } from '@bnw/shared';
import Link from 'next/link';
import { cityName, formatDateTime } from '@/lib/format';
import { api } from '@/lib/server-api';
import { DailyBars } from './charts';

const fmt = (n: number) => n.toLocaleString('en-IN');

function Tile({ label, value, note, href }: { label: string; value: string | number; note?: string; href?: string }) {
  const inner = (
    <>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{typeof value === 'number' ? fmt(value) : value}</div>
      {note && <div className="mt-0.5 text-xs text-muted">{note}</div>}
    </>
  );
  return href ? (
    <Link href={href} className="rounded-2xl border border-line/70 bg-surface p-4 transition hover:border-sage-300">{inner}</Link>
  ) : (
    <div className="rounded-2xl border border-line/70 bg-surface p-4">{inner}</div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{children}</div>
    </section>
  );
}

export default async function OpsOverview() {
  const s = await api<OpsStats>('/ops/stats');
  const sum = (xs: { value: number }[]) => xs.reduce((n, x) => n + x.value, 0);

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-medium">Overview</h1>
          <p className="text-sm text-muted">Updated {formatDateTime(s.generatedAt)} IST · days are counted in India time</p>
        </div>
      </header>

      {/* Headline: who's using it */}
      <section className="mb-8 grid gap-3 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div className="rounded-2xl bg-[#22302A] p-6 text-white">
          <div className="text-sm text-white/70">Daily active users</div>
          <div className="mt-1 text-5xl font-semibold tabular-nums">{fmt(s.users.dau)}</div>
          <div className="mt-2 text-sm text-white/70">{s.users.total ? Math.round((s.users.dau / s.users.total) * 100) : 0}% of {fmt(s.users.total)} accounts</div>
        </div>
        <Tile label="Weekly active users" value={s.users.wau} note="last 7 days" />
        <Tile label="Monthly active users" value={s.users.mau} note="last 30 days" />
        <Tile label="Weekly active clubs" value={s.clubs.weeklyActive} note={`of ${fmt(s.clubs.total)} · north-star metric`} />
      </section>

      <Group title="Accounts">
        <Tile label="Total users" value={s.users.total} note={`${s.users.onboardedPct}% finished onboarding`} href="/ops/users" />
        <Tile label="New today" value={s.users.newToday} />
        <Tile label="New this week" value={s.users.new7d} note={`${fmt(s.users.new30d)} in 30 days`} />
        <Tile label="Deactivated" value={s.users.suspended} href="/ops/users?status=suspended" />
      </Group>

      <Group title="Clubs">
        <Tile label="Active clubs" value={s.clubs.total} note={`${fmt(s.clubs.public)} public · ${fmt(s.clubs.private)} private`} href="/ops/clubs" />
        <Tile label="New this week" value={s.clubs.new7d} />
        <Tile label="Average members" value={s.clubs.avgMembers} />
        <Tile label="Shut down" value={s.clubs.shutdown} href="/ops/clubs?status=shutdown" />
      </Group>

      <Group title="Activity · last 7 days">
        <Tile label="Book discussion posts" value={s.activity.posts7d} />
        <Tile label="Board posts" value={s.activity.boardPosts7d} note={`${fmt(s.activity.comments7d)} comments · ${fmt(s.activity.reactions7d)} reactions`} />
        <Tile label="Direct messages" value={s.activity.dms7d} />
        <Tile label="Event RSVPs" value={s.activity.rsvps7d} note={`${fmt(s.activity.upcomingEvents)} events upcoming`} />
      </Group>

      <Group title="Content and safety">
        <Tile label="Open reports" value={s.content.openReports} note="handled in /admin by site admins" />
        <Tile label="Blog posts awaiting review" value={s.content.blogPending} note={`${fmt(s.content.blogPublished)} published`} href="/ops/blog" />
        <Tile label="Books awaiting review" value={s.content.pendingBooks} note={`${fmt(s.content.books)} in the catalog`} />
        <Tile label="Goodreads imports" value={s.activity.imports7d} note="last 7 days" />
      </Group>

      <section className="mb-8 grid gap-4 lg:grid-cols-3">
        <DailyBars title="Daily active users" subtitle="Unique signed-in readers per day" data={s.series.dau} />
        <DailyBars title="Signups" subtitle="New accounts per day" data={s.series.signups} total={fmt(sum(s.series.signups))} />
        <DailyBars title="Posts" subtitle="Discussion posts, board posts and comments per day" data={s.series.posts} total={fmt(sum(s.series.posts))} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="card p-0">
          <h2 className="border-b border-line/70 px-5 py-3 font-medium">Most active clubs · last 7 days</h2>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="px-5 py-2 font-medium">Club</th><th className="px-5 py-2 text-right font-medium">Posts</th><th className="px-5 py-2 text-right font-medium">Members</th></tr></thead>
            <tbody>
              {s.topClubs.map((c) => (
                <tr key={c.id} className="border-t border-line/70">
                  <td className="px-5 py-2.5"><Link href={`/clubs/${c.slug}`} className="hover:underline" target="_blank">{c.name}</Link><span className="ml-2 text-xs text-muted">{c.city ? cityName(c.city) : 'Online'}</span></td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{c.posts7d}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{c.members}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-0">
          <h2 className="border-b border-line/70 px-5 py-3 font-medium">Readers by city</h2>
          <ul className="space-y-2.5 px-5 py-4">
            {s.topCities.map((c) => {
              const pct = s.topCities[0]?.users ? (c.users / s.topCities[0].users) * 100 : 0;
              return (
                <li key={c.city} className="text-sm">
                  <div className="mb-1 flex justify-between"><span>{cityName(c.city)}</span><span className="tabular-nums text-muted">{c.users}</span></div>
                  <div className="h-1.5 rounded-full bg-sage-50"><div className="h-full rounded-full bg-sage-600" style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
