import { redirect } from 'next/navigation';
import { getMe } from '@/lib/server-api';
import { OnboardingForm } from './form';

export const metadata = { title: 'Welcome' };

export default async function OnboardingPage() {
  const me = await getMe();
  if (!me) redirect('/login');
  if (me.onboarded) redirect('/home');
  return (
    <div className="mx-auto max-w-2xl">
      <div className="eyebrow mb-2">Welcome</div>
      <h1 className="h1 mb-2">Tell us a little about your reading</h1>
      <p className="mb-10 text-muted">Your city helps us show clubs, meetups and bookstores near you. Next, a few quick questions about what you like to read.</p>
      <OnboardingForm displayName={me.displayName} city={me.city} />
    </div>
  );
}
