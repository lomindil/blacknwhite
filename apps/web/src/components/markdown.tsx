'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function Spoiler({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className={shown ? 'bg-soft px-1' : 'cursor-pointer select-none bg-ink px-1 text-transparent'}
      title={shown ? undefined : 'Spoiler — tap to reveal'}
      aria-label={shown ? undefined : 'Hidden spoiler, tap to reveal'}
    >
      {children}
    </button>
  );
}

/**
 * User content is rendered as Markdown with raw HTML disabled.
 * ||text|| hides a sentence behind a tap-to-reveal spoiler tag.
 */
export function Markdown({ text }: { text: string }) {
  const withSpoilers = text.replace(/\|\|([^|\n]+?)\|\|/g, (_, s: string) => `[${s.replace(/[[\]]/g, '')}](#spoiler)`);
  return (
    <div className="prose-post">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children }) =>
            href === '#spoiler' ? (
              <Spoiler>{children}</Spoiler>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
                {children}
              </a>
            ),
          img: () => null,
        }}
      >
        {withSpoilers}
      </ReactMarkdown>
    </div>
  );
}
