export const metadata = { title: 'Privacy policy' };

// Template only — have a lawyer review before launch (DPDP Act 2023).
export default function PrivacyPage() {
  return (
    <article className="prose-post mx-auto max-w-2xl">
      <h1 className="h1 mb-6">Privacy policy</h1>
      <p className="border border-line bg-soft p-3 text-sm">Draft template for development. To be reviewed by a lawyer before launch.</p>
      <h2 className="h3 mt-8">What we collect and why</h2>
      <ul>
        <li><strong>From Google sign-in:</strong> your name, email address, profile photo and Google account ID — to create and secure your account. We don't store Google access tokens.</li>
        <li><strong>Profile:</strong> city, languages and genres you choose — to show clubs, events and books near you.</li>
        <li><strong>Reading activity:</strong> shelves, progress and ratings — to unlock spoiler-safe discussions and show aggregate counts.</li>
        <li><strong>Posts and messages:</strong> what you write in clubs and direct messages.</li>
        <li><strong>WhatsApp number:</strong> only if you turn on WhatsApp reminders.</li>
      </ul>
      <h2 className="h3 mt-8">What we never do</h2>
      <ul>
        <li>We never store your precise location — only the city you pick.</li>
        <li>We never list individual readers publicly. Counts below 5 show as "a few readers".</li>
        <li>We don't sell your personal data.</li>
      </ul>
      <h2 className="h3 mt-8">Where your data lives</h2>
      <p>Your data is stored on servers in India (AWS Mumbai).</p>
      <h2 className="h3 mt-8">Your rights</h2>
      <p>Under the Digital Personal Data Protection Act, 2023 you can access, correct, export and erase your data. Export your data or delete your account any time from Settings. Deleted accounts are removed within 30 days; posts remain in club discussions anonymised as "Deleted user".</p>
      <h2 className="h3 mt-8">Contact</h2>
      <p>Questions or complaints: grievance@[domain]</p>
    </article>
  );
}
