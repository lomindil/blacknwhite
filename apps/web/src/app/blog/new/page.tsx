import { requireMe } from '@/lib/server-api';
import { BlogEditor } from '../editor';

export const metadata = { title: 'Write a post', robots: { index: false } };

export default async function NewBlogPostPage() {
  const me = await requireMe('/blog/new');
  return <BlogEditor accountCreatedAt={me.createdAt} />;
}
