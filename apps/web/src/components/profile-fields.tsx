'use client';

import { CITIES, GENRES, LANGUAGES, slugify } from '@bnw/shared';
import { useState } from 'react';

export function CityPicker({ value, onChange, id = 'city' }: { value: string | null; onChange: (v: string | null) => void; id?: string }) {
  const known = !value || CITIES.some((c) => c.slug === value);
  const [other, setOther] = useState(!known);
  return (
    <div>
      <select
        id={id}
        className="input"
        value={other ? '__other' : (value ?? '')}
        onChange={(e) => {
          if (e.target.value === '__other') {
            setOther(true);
            onChange(null);
          } else {
            setOther(false);
            onChange(e.target.value || null);
          }
        }}
      >
        <option value="">Select your city</option>
        {CITIES.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
        <option value="__other">Somewhere else…</option>
      </select>
      {other && (
        <input
          className="input mt-2"
          placeholder="Type your city or town"
          defaultValue={known ? '' : (value ?? '').replace(/-/g, ' ')}
          onChange={(e) => onChange(e.target.value.trim() ? slugify(e.target.value) : null)}
        />
      )}
      <p className="mt-1 text-xs text-muted">Only your city is stored — never your exact location.</p>
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`border px-3 py-1.5 text-sm transition ${on ? 'border-ink bg-ink text-paper' : 'border-line hover:border-ink'}`}
    >
      {label}
    </button>
  );
}

export function LanguagePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {LANGUAGES.map((l) => (
        <Toggle
          key={l.code}
          on={value.includes(l.code)}
          label={l.code === 'en' ? l.name : `${l.native} · ${l.name}`}
          onClick={() => onChange(value.includes(l.code) ? value.filter((c) => c !== l.code) : [...value, l.code])}
        />
      ))}
    </div>
  );
}

export function GenrePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {GENRES.map((g) => (
        <Toggle key={g} on={value.includes(g)} label={g} onClick={() => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g])} />
      ))}
    </div>
  );
}
