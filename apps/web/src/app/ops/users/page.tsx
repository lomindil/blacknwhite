import type { OpsUser, Page } from '@bnw/shared';
import Link from 'next/link';
import { Avatar } from '@/components/ui';
import { cityName, formatDate, timeAgo } from '@/lib/format';
import { api } from '@/lib/server-api';
import { ReasonAction, SimpleAction } from '../shell';

export const metadata = { title: 'Users' };

type SP = { q?: string; status?: string; cursor?: string };

export default async function OpsUsers({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = ['active', 'suspended'].includes(sp.status ?? '') ? sp.status! : 'all';
  const params = new URLSearchParams({ status, limit: '30' });
  if (sp.q) params.set('q', sp.q);
  if (sp.cursor) params.set('cursor', sp.cursor);
  const page = await api<Page<OpsUser>>(`/ops/users?${params}`);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl font-medium">Users</h1>
      <form className="mb-5 flex flex-wrap gap-2" action="/ops/users">
        <input name="q" defaultValue={sp.q} placeholder="Search by name or email" className="input max-w-sm" />
        <select name="status" defaultValue={status} className="input w-44" aria-label="Status">
          <option value="all">Everyone</option>
          <option value="active">Active</option>
          <option value="suspended">Deactivated</option>
        </select>
        <button className="btn">Search</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Reader</th>
              <th className="px-4 py-3 font-medium">City</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 font-medium">Last active</th>
              <th className="px-4 py-3 text-right font-medium">Clubs</th>
              <th className="px-4 py-3 text-right font-medium">Posts</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {page.items.map((u) => (
              <tr key={u.id} className="border-t border-line/70 align-top">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar user={u} size={32} />
                    <div className="min-w-0">
                      <Link href={`/readers/${u.id}`} target="_blank" className="font-medium hover:underline">{u.displayName}</Link>
                      <div className="truncate text-xs text-muted">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted">{u.city ? cityName(u.city) : '—'}</td>
                <td className="px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3 text-muted">{u.lastActiveAt ? timeAgo(u.lastActiveAt) : '—'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.clubs}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.posts}</td>
                <td className="px-4 py-3">
                  {u.deleted ? <span className="chip">Deleted</span> : u.suspendedAt ? (
                    <div>
                      <span className="chip border-danger/30 bg-danger/5 text-danger">Deactivated</span>
                      {u.suspendedReason && <div className="mt-1 max-w-[12rem] text-xs text-muted">{u.suspendedReason}</div>}
                    </div>
                  ) : <span className="chip border-sage-200 bg-sage-50 text-sage-700">Active</span>}
                  {u.isAdmin && <span className="chip ml-1">Site admin</span>}
                </td>
                <td className="px-4 py-3">
                  {!u.deleted && (u.suspendedAt ? (
                    <SimpleAction label="Reactivate" path={`/users/${u.id}/reactivate`} />
                  ) : (
                    <ReasonAction label="Deactivate" path={`/users/${u.id}/deactivate`} placeholder="Reason (kept in the activity log)" />
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!page.items.length && <p className="px-4 py-8 text-center text-muted">No users match.</p>}
      </div>
      {page.nextCursor && (
        <div className="mt-4 text-center">
          <Link className="btn-ghost" href={`/ops/users?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), status, cursor: page.nextCursor })}`}>Next page</Link>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Deactivating signs the person out everywhere and blocks sign-in. Their posts stay up; remove content through reports if needed.</p>
    </div>
  );
}
