// Welcome email, sent once when someone first signs in. Email-client-safe HTML: tables, inline
// styles, web-safe fonts, and a hosted PNG of Red (many clients, including Gmail, block SVG).

export interface WelcomeEmail {
  subject: string;
  /** Shown after the subject in most inbox lists. */
  preheader: string;
  html: string;
  text: string;
}

const C = {
  paper: '#FAF8F3',
  surface: '#FFFFFF',
  ink: '#212529',
  muted: '#6C7076',
  line: '#E6E2D9',
  sage: '#3D5A4C',
  sageSoft: '#EEF3EE',
  russet: '#B9532F',
  russetSoft: '#FCF1EC',
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function welcomeEmail({ firstName, origin }: { firstName: string; origin: string }): WelcomeEmail {
  const name = esc(firstName.trim() || 'there');
  const link = (path: string) => `${origin}${path}`;
  const subject = `Welcome to RedReader, ${firstName.trim() || 'reader'}!`;
  const preheader = "I'm Red — let's find your first book club. It takes about two minutes.";

  const steps = [
    { n: '1', title: 'Tell me what you like to read', body: 'Seven quick questions, and I’ll match you with clubs and books.', href: '/discover/quiz' },
    { n: '2', title: 'Join a club near you — or online', body: 'Read on a weekly schedule, and talk about every chapter without spoilers.', href: '/clubs' },
    { n: '3', title: 'Bring your shelves along', body: 'Already on Goodreads? Import what you’ve read in one go.', href: '/me/import' },
  ];

  const stepRows = steps
    .map(
      (s) => `
            <tr>
              <td valign="top" width="40" style="padding:0 0 18px 0;">
                <div style="width:28px;height:28px;border-radius:14px;background:${C.russetSoft};color:${C.russet};font:600 14px/28px Arial,Helvetica,sans-serif;text-align:center;">${s.n}</div>
              </td>
              <td valign="top" style="padding:0 0 18px 0;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
                <a href="${link(s.href)}" style="color:${C.ink};font-size:16px;font-weight:600;text-decoration:none;">${s.title}</a>
                <div style="color:${C.muted};font-size:14px;line-height:21px;margin-top:2px;">${s.body}</div>
              </td>
            </tr>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(subject)}</title>
<style>
  @media only screen and (max-width: 480px) {
    .card { padding: 28px 20px 22px 20px !important; }
    .outer { padding: 20px 10px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.paper}" style="background:${C.paper};">
    <tr>
      <td class="outer" align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
          <!-- wordmark -->
          <tr>
            <td align="center" style="padding:0 0 20px 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:${C.ink};">
              <a href="${origin}" style="color:${C.ink};text-decoration:none;"><span style="color:${C.russet};">Red</span>Reader</a>
            </td>
          </tr>
          <!-- card -->
          <tr>
            <td class="card" bgcolor="${C.surface}" style="background:${C.surface};border:1px solid ${C.line};border-radius:20px;padding:36px 36px 28px 36px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 8px 0;">
                    <img src="${link('/email/red-face.png')}" width="132" height="120" alt="Red, the RedReader red panda" style="display:block;border:0;width:132px;height:120px;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:34px;color:${C.ink};padding:8px 0 6px 0;">
                    Hi ${name}, I&rsquo;m Red!
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;line-height:25px;color:${C.muted};padding:0 8px 26px 8px;">
                    Welcome to RedReader &mdash; a home for reading together, in your city and your language.
                    I&rsquo;m a red panda, and like the real ones I&rsquo;m happiest curled up with a good book.
                    Let&rsquo;s find yours.
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 0 30px 0;">
                    <a href="${link('/discover/quiz')}" style="display:inline-block;background:${C.sage};color:#ffffff;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:16px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:999px;">Find my first book club &rarr;</a>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid ${C.line};padding:26px 0 4px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${stepRows}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background:${C.sageSoft};border-radius:14px;padding:16px 18px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;line-height:21px;color:${C.sage};">
                    <strong>Run a book club already?</strong> Bring it over &mdash; schedules, polls, RSVPs and spoiler-safe chats in one place.
                    <a href="${link('/clubs/new')}" style="color:${C.sage};font-weight:600;">Start your club</a>
                  </td>
                </tr>
                <tr>
                  <td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:24px;color:${C.ink};padding:26px 0 0 0;">
                    Happy reading,<br>
                    <span style="color:${C.russet};">Red</span> &amp; the RedReader team
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- footer -->
          <tr>
            <td align="center" style="font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;line-height:18px;color:${C.muted};padding:20px 24px 0 24px;">
              You&rsquo;re getting this one-time email because you just joined RedReader.<br>
              <a href="${link('/settings')}" style="color:${C.muted};">Email settings</a> &middot;
              <a href="${link('/privacy')}" style="color:${C.muted};">Privacy</a> &middot;
              <a href="${origin}" style="color:${C.muted};">redreader.in</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${firstName.trim() || 'there'}, I'm Red!`,
    '',
    'Welcome to RedReader — a home for reading together, in your city and your language.',
    "I'm a red panda, and like the real ones I'm happiest curled up with a good book. Let's find yours.",
    '',
    `Find my first book club: ${link('/discover/quiz')}`,
    '',
    ...steps.flatMap((s) => [`${s.n}. ${s.title} — ${s.body.replace(/’/g, "'")}`, `   ${link(s.href)}`]),
    '',
    `Run a book club already? Bring it over: ${link('/clubs/new')}`,
    '',
    'Happy reading,',
    'Red & the RedReader team',
    '',
    `You're getting this one-time email because you just joined RedReader. Email settings: ${link('/settings')}`,
  ].join('\n');

  return { subject, preheader, html, text };
}
