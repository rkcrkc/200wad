import { getBlogEditorRefs } from "@/lib/queries/admin/blog";
import { PostEditor } from "../_components/PostEditor";

export default async function NewBlogPostPage() {
  const refs = await getBlogEditorRefs();
  return <PostEditor post={null} refs={refs} />;
}
