"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/utils/adminGuard";
import { slugify } from "@/lib/utils/slugify";
import {
  createBlogPostSchema,
  updateBlogPostSchema,
  createBlogAuthorSchema,
  updateBlogAuthorSchema,
  createBlogCategorySchema,
  updateBlogCategorySchema,
  type CreateBlogPostInput,
  type UpdateBlogPostInput,
  type CreateBlogAuthorInput,
  type UpdateBlogAuthorInput,
  type CreateBlogCategoryInput,
  type UpdateBlogCategoryInput,
} from "@/lib/validations/admin";
import { revalidatePath } from "next/cache";

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface MutationResult {
  success: boolean;
  error: string | null;
}

export interface CreateResult extends MutationResult {
  id: string | null;
}

// Revalidate the admin board plus every public surface that reads blog data.
function revalidateBlog(slug?: string | null) {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
}

// ============================================================================
// POSTS
// ============================================================================

export async function createBlogPost(
  input: CreateBlogPostInput
): Promise<CreateResult> {
  try {
    await requireAdmin();
    const validated = createBlogPostSchema.parse(input);

    const slug = validated.slug?.trim() || slugify(validated.title);
    if (!slug) {
      return { success: false, id: null, error: "Could not derive a slug from the title." };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("blog_posts")
      .insert({
        title: validated.title,
        slug,
        excerpt: validated.excerpt ?? null,
        body: validated.body ?? null,
        cover_image_url: validated.cover_image_url ?? null,
        author_id: validated.author_id,
        category_id: validated.category_id ?? null,
        language_id: validated.language_id ?? null,
        is_published: validated.is_published ?? false,
        is_featured: validated.is_featured ?? false,
        published_at: validated.published_at ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating blog post:", error);
      return { success: false, id: null, error: error.message };
    }

    revalidateBlog(slug);
    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

export async function updateBlogPost(
  id: string,
  input: UpdateBlogPostInput
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const validated = updateBlogPostSchema.parse(input);

    // Re-derive the slug from the title when the slug field is sent blank.
    const patch: Record<string, unknown> = { ...validated };
    if (validated.slug !== undefined) {
      const trimmed = validated.slug?.trim();
      patch.slug = trimmed || (validated.title ? slugify(validated.title) : undefined);
      if (patch.slug === undefined) delete patch.slug;
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("blog_posts")
      .update(patch)
      .eq("id", id)
      .select("slug")
      .single();

    if (error) {
      console.error("Error updating blog post:", error);
      return { success: false, error: error.message };
    }

    revalidateBlog(data?.slug);
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function deleteBlogPost(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", id)
      .select("slug")
      .single();

    if (error) {
      console.error("Error deleting blog post:", error);
      return { success: false, error: error.message };
    }

    revalidateBlog(data?.slug);
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function setBlogPostPublished(
  id: string,
  published: boolean
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // On first publish (no published_at yet) stamp the date.
    const patch: Record<string, unknown> = { is_published: published };
    if (published) {
      const { data: current } = await supabase
        .from("blog_posts")
        .select("published_at")
        .eq("id", id)
        .single();
      if (current && !current.published_at) {
        patch.published_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update(patch)
      .eq("id", id)
      .select("slug")
      .single();

    if (error) {
      console.error("Error toggling publish:", error);
      return { success: false, error: error.message };
    }

    revalidateBlog(data?.slug);
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function setBlogPostFeatured(
  id: string,
  featured: boolean
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // The index shows a single featured post, so unset every other one first.
    if (featured) {
      const { error: clearError } = await supabase
        .from("blog_posts")
        .update({ is_featured: false })
        .neq("id", id)
        .eq("is_featured", true);
      if (clearError) {
        console.error("Error clearing other featured posts:", clearError);
        return { success: false, error: clearError.message };
      }
    }

    const { data, error } = await supabase
      .from("blog_posts")
      .update({ is_featured: featured })
      .eq("id", id)
      .select("slug")
      .single();

    if (error) {
      console.error("Error toggling featured:", error);
      return { success: false, error: error.message };
    }

    revalidateBlog(data?.slug);
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// AUTHORS
// ============================================================================

export async function createBlogAuthor(
  input: CreateBlogAuthorInput
): Promise<CreateResult> {
  try {
    await requireAdmin();
    const validated = createBlogAuthorSchema.parse(input);

    const slug = validated.slug?.trim() || slugify(validated.name);
    if (!slug) {
      return { success: false, id: null, error: "Could not derive a slug from the name." };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("blog_authors")
      .insert({
        name: validated.name,
        slug,
        role: validated.role ?? null,
        bio: validated.bio ?? null,
        avatar_url: validated.avatar_url ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating author:", error);
      return { success: false, id: null, error: error.message };
    }

    revalidateBlog();
    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

export async function updateBlogAuthor(
  id: string,
  input: UpdateBlogAuthorInput
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const validated = updateBlogAuthorSchema.parse(input);

    const patch: Record<string, unknown> = { ...validated };
    if (validated.slug !== undefined && !validated.slug && validated.name) {
      patch.slug = slugify(validated.name);
    }

    const supabase = await createClient();

    const { error } = await supabase.from("blog_authors").update(patch).eq("id", id);

    if (error) {
      console.error("Error updating author:", error);
      return { success: false, error: error.message };
    }

    revalidateBlog();
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function deleteBlogAuthor(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    const { error } = await supabase.from("blog_authors").delete().eq("id", id);

    if (error) {
      console.error("Error deleting author:", error);
      // author_id is NOT NULL with ON DELETE RESTRICT, so posts block deletion.
      if (error.code === "23503") {
        return {
          success: false,
          error: "This author still has posts. Reassign or delete their posts first.",
        };
      }
      return { success: false, error: error.message };
    }

    revalidateBlog();
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

// ============================================================================
// CATEGORIES
// ============================================================================

export async function createBlogCategory(
  input: CreateBlogCategoryInput
): Promise<CreateResult> {
  try {
    await requireAdmin();
    const validated = createBlogCategorySchema.parse(input);

    const slug = validated.slug?.trim() || slugify(validated.name);
    if (!slug) {
      return { success: false, id: null, error: "Could not derive a slug from the name." };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("blog_categories")
      .insert({
        name: validated.name,
        slug,
        sort_order: validated.sort_order ?? 0,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating category:", error);
      return { success: false, id: null, error: error.message };
    }

    revalidateBlog();
    return { success: true, id: data.id, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, id: null, error: message };
  }
}

export async function updateBlogCategory(
  id: string,
  input: UpdateBlogCategoryInput
): Promise<MutationResult> {
  try {
    await requireAdmin();
    const validated = updateBlogCategorySchema.parse(input);

    const patch: Record<string, unknown> = { ...validated };
    if (validated.slug !== undefined && !validated.slug && validated.name) {
      patch.slug = slugify(validated.name);
    }

    const supabase = await createClient();

    const { error } = await supabase.from("blog_categories").update(patch).eq("id", id);

    if (error) {
      console.error("Error updating category:", error);
      return { success: false, error: error.message };
    }

    revalidateBlog();
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

export async function deleteBlogCategory(id: string): Promise<MutationResult> {
  try {
    await requireAdmin();
    const supabase = await createClient();

    // category_id is ON DELETE SET NULL, so posts simply lose their category.
    const { error } = await supabase.from("blog_categories").delete().eq("id", id);

    if (error) {
      console.error("Error deleting category:", error);
      return { success: false, error: error.message };
    }

    revalidateBlog();
    return { success: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
