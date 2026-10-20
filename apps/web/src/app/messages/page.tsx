import { IconChat } from '@/components/icons';

export const metadata = { title: 'Messages' };

/** Right pane when no conversation is open (desktop). */
export default function MessagesIndex() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center bg-soft p-10 text-center">
      <div className="dots absolute inset-0 opacity-60" aria-hidden />
      <div className="relative">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sage-100 text-sage-700">
          <IconChat size={30} />
        </span>
        <div className="mt-5 font-serif text-2xl">Your conversations</div>
        <p className="mx-auto mt-2 max-w-sm text-muted">Pick a conversation on the left, or message someone from one of your clubs.</p>
      </div>
    </div>
  );
}
