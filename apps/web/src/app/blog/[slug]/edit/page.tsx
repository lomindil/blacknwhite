import type { BlogDetail } from '@bnw/shared';
import { notFound } from 'next/navigation';
import { apiOrNotFound, requireMe } from '@/lib/server-api';
import { BlogEditor } from '../../editor';

export const metadata = { title: 'Edit post', robots: { index: false } };

export default async function EditBlogPostPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { slug } = await params;
  const { saved } = await searchParams;
  const me = await requireMe(`/blog/${slug}/edit`);
  const post = await apiOrNotFound<BlogDetail>(`/v1/blog/${slug}`);
  if (!post.mine) notFound();
  return (
    <>
      {saved && <p className="mx-auto mb-6 max-w-3xl animate-pop-in rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-800">Draft saved. Only you can see it until you publish.</p>}
      <BlogEditor post={post} accountCreatedAt={me.createdAt} />
    </>
  );
}
