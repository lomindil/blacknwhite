export const metadata = { title: 'Terms of use' };

// Template only — have a lawyer review before launch (see docs/business-plan.md §10, Compliance).
export default function TermsPage() {
  return (
    <article className="prose-post mx-auto max-w-2xl">
      <h1 className="h1 mb-6">Terms of use</h1>
      <p className="border border-line bg-soft p-3 text-sm">Draft template for development. To be reviewed by a lawyer before launch.</p>
      <h2 className="h3 mt-8">Using the service</h2>
      <p>You must be at least 18, or have a parent or guardian's consent, to use this service. You're responsible for what you post. Be kind, mark spoilers, and respect other readers.</p>
      <h2 className="h3 mt-8">Content you post</h2>
      <p>You keep ownership of what you write. You give us permission to display it to the people your club and privacy settings allow. Don't post content that is unlawful, harassing, hateful, sexually explicit, infringing, or that impersonates someone.</p>
      <h2 className="h3 mt-8">Reporting and takedown</h2>
      <p>Anyone can report content using the Report link next to it. We review reports and remove content that breaks these terms or the law within the timelines required by the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021.</p>
      <h2 className="h3 mt-8" id="grievance">Grievance officer</h2>
      <p>Name: [to be appointed]<br />Email: grievance@[domain]<br />We acknowledge complaints within 24 hours and resolve them within 15 days.</p>
      <h2 className="h3 mt-8">Affiliate links</h2>
      <p>Some "Buy" links on book pages are affiliate links. We may earn a small commission at no extra cost to you.</p>
      <h2 className="h3 mt-8">Ending your account</h2>
      <p>You can delete your account at any time from Settings. We may suspend accounts that seriously or repeatedly break these terms.</p>
    </article>
  );
}
