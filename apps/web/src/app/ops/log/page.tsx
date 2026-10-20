import type { OpsAction } from '@bnw/shared';
import { formatDateTime } from '@/lib/format';
import { api } from '@/lib/server-api';

export const metadata = { title: 'Activity log' };

const LABEL: Record<string, string> = {
  login: 'Signed in',
  'user.deactivate': 'Deactivated user',
  'user.reactivate': 'Reactivated user',
  'club.shutdown': 'Shut down club',
  'club.restore': 'Restored club',
  'blog.approve': 'Approved blog post',
  'blog.remove': 'Removed blog post',
};

export default async function OpsLog() {
  const actions = await api<OpsAction[]>('/ops/actions');
  return (
    <div>
      <h1 className="mb-2 font-serif text-3xl font-medium">Activity log</h1>
      <p className="mb-6 text-sm text-muted">Every action taken in the admin portal, newest first.</p>
      <div className="card p-0">
        <ul className="divide-y divide-line/70">
          {actions.map((a) => (
            <li key={a.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-3 text-sm">
              <span className="w-40 shrink-0 text-xs text-muted">{formatDateTime(a.createdAt)}</span>
              <span className="font-medium">{LABEL[a.action] ?? a.action}</span>
              {a.targetName && <span>{a.targetName}</span>}
              {a.note && a.action !== 'login' && <span className="text-muted">— {a.note}</span>}
              <span className="ml-auto text-xs text-muted">{a.admin}</span>
            </li>
          ))}
        </ul>
        {!actions.length && <p className="px-5 py-8 text-center text-muted">No actions yet.</p>}
      </div>
    </div>
  );
}
