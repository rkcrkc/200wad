import {
  getAdminBlogPosts,
  getAdminAuthors,
  getAdminCategories,
} from "@/lib/queries/admin/blog";
import { BlogClient } from "./BlogClient";

export default async function AdminBlogPage() {
  const [posts, authors, categories] = await Promise.all([
    getAdminBlogPosts(),
    getAdminAuthors(),
    getAdminCategories(),
  ]);

  return <BlogClient posts={posts} authors={authors} categories={categories} />;
}
