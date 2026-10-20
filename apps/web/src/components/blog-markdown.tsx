'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Long-form Markdown for blog posts. Raw HTML stays disabled; images are allowed only when
 * they're photos uploaded to our own /media (re-encoded, EXIF-free), never external URLs.
 */
export function BlogMarkdown({ text }: { text: string }) {
  return (
    <div className="blog-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          // A photo on its own line renders as a <figure>, which can't sit inside a <p>.
          p: ({ node, children }) => {
            const kids = node?.children ?? [];
            const onlyImage = kids.length === 1 && kids[0].type === 'element' && kids[0].tagName === 'img';
            return onlyImage ? <>{children}</> : <p>{children}</p>;
          },
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc">
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            typeof src === 'string' && src.startsWith('/media/') ? (
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt ?? ''} loading="lazy" />
                {alt && <figcaption>{alt}</figcaption>}
              </figure>
            ) : null,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
