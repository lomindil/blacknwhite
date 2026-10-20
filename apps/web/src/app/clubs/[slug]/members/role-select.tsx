'use client';

import type { ClubRole } from '@bnw/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { call, errorMessage } from '@/lib/client-api';

export function RoleSelect({ clubId, userId, role }: { clubId: string; userId: string; role: ClubRole }) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="flex flex-col">
      <select
        className="input w-36 py-1"
        value={value}
        aria-label="Role"
        onChange={async (e) => {
          const next = e.target.value as ClubRole;
          if (next === 'owner' && !confirm('Hand over ownership? You will become an admin.')) return;
          setError(null);
          try {
            await call(`/v1/clubs/${clubId}/members/${userId}`, { method: 'PATCH', body: { role: next } });
            setValue(next);
            router.refresh();
          } catch (err) {
            setError(errorMessage(err));
          }
        }}
      >
        <option value="member">Member</option>
        <option value="admin">Admin</option>
        <option value="owner">Owner</option>
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
