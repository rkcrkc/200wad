import { notFound } from "next/navigation";
import { getAdminBlogPost, getBlogEditorRefs } from "@/lib/queries/admin/blog";
import { PostEditor } from "../_components/PostEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: PageProps) {
  const { id } = await params;
  const [post, refs] = await Promise.all([
    getAdminBlogPost(id),
    getBlogEditorRefs(),
  ]);

  if (!post) notFound();

  return <PostEditor post={post} refs={refs} />;
}
