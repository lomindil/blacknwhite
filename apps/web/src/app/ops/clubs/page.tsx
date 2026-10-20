import type { OpsClub, Page } from '@bnw/shared';
import Link from 'next/link';
import { cityName, formatDate } from '@/lib/format';
import { api } from '@/lib/server-api';
import { ReasonAction, SimpleAction } from '../shell';

export const metadata = { title: 'Clubs' };

type SP = { q?: string; status?: string; cursor?: string };

export default async function OpsClubs({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const status = ['active', 'shutdown'].includes(sp.status ?? '') ? sp.status! : 'all';
  const params = new URLSearchParams({ status, limit: '30' });
  if (sp.q) params.set('q', sp.q);
  if (sp.cursor) params.set('cursor', sp.cursor);
  const page = await api<Page<OpsClub>>(`/ops/clubs?${params}`);

  return (
    <div>
      <h1 className="mb-6 font-serif text-3xl font-medium">Clubs</h1>
      <form className="mb-5 flex flex-wrap gap-2" action="/ops/clubs">
        <input name="q" defaultValue={sp.q} placeholder="Search by club name" className="input max-w-sm" />
        <select name="status" defaultValue={status} className="input w-44" aria-label="Status">
          <option value="all">All clubs</option>
          <option value="active">Active</option>
          <option value="shutdown">Closed</option>
        </select>
        <button className="btn">Search</button>
      </form>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Club</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 text-right font-medium">Members</th>
              <th className="px-4 py-3 text-right font-medium">Posts 7d</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {page.items.map((c) => (
              <tr key={c.id} className="border-t border-line/70 align-top">
                <td className="px-4 py-3">
                  {c.deletedAt ? <span className="font-medium">{c.name}</span> : <Link href={`/clubs/${c.slug}`} target="_blank" className="font-medium hover:underline">{c.name}</Link>}
                  <div className="text-xs text-muted">{[c.city ? cityName(c.city) : 'Online', c.visibility].join(' · ')}</div>
                </td>
                <td className="px-4 py-3"><div>{c.owner.displayName}</div><div className="text-xs text-muted">{c.owner.email}</div></td>
                <td className="px-4 py-3 text-right tabular-nums">{c.members}</td>
                <td className="px-4 py-3 text-right tabular-nums">{c.posts7d}</td>
                <td className="px-4 py-3 text-muted">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-3">
                  {c.deletedAt ? (
                    <div>
                      <span className="chip border-danger/30 bg-danger/5 text-danger">{c.shutdownReason ? 'Shut down' : 'Deleted by owner'}</span>
                      {c.shutdownReason && <div className="mt-1 max-w-[14rem] text-xs text-muted">{c.shutdownReason}</div>}
                    </div>
                  ) : <span className="chip border-sage-200 bg-sage-50 text-sage-700">Active</span>}
                </td>
                <td className="px-4 py-3">
                  {c.deletedAt ? (
                    c.shutdownReason && <SimpleAction label="Restore" path={`/clubs/${c.id}/restore`} />
                  ) : (
                    <ReasonAction label="Shut down" path={`/clubs/${c.id}/shutdown`} placeholder="Reason (members are notified)" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!page.items.length && <p className="px-4 py-8 text-center text-muted">No clubs match.</p>}
      </div>
      {page.nextCursor && (
        <div className="mt-4 text-center">
          <Link className="btn-ghost" href={`/ops/clubs?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), status, cursor: page.nextCursor })}`}>Next page</Link>
        </div>
      )}
      <p className="mt-4 text-xs text-muted">Shutting a club down hides it everywhere and notifies its members. Nothing is deleted, so it can be restored.</p>
    </div>
  );
}
