"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PostsTab } from "./_components/PostsTab";
import { CategoriesTab } from "./_components/CategoriesTab";
import { AuthorsTab } from "./_components/AuthorsTab";
import type {
  AdminBlogPostRow,
  AdminAuthorRow,
  AdminCategoryRow,
} from "@/lib/queries/admin/blog";

type TabKey = "posts" | "categories" | "authors";

interface BlogClientProps {
  posts: AdminBlogPostRow[];
  authors: AdminAuthorRow[];
  categories: AdminCategoryRow[];
}

const TABS: { key: TabKey; label: string; description: string }[] = [
  {
    key: "posts",
    label: "Posts",
    description: "Write, edit, publish, and feature blog articles.",
  },
  {
    key: "categories",
    label: "Categories",
    description: "Organise posts into categories shown in the blog filter.",
  },
  {
    key: "authors",
    label: "Authors",
    description: "Manage author profiles, roles, bios, and avatars.",
  },
];

export function BlogClient({ posts, authors, categories }: BlogClientProps) {
  const [active, setActive] = useState<TabKey>("posts");
  const activeTab = TABS.find((t) => t.key === active) ?? TABS[0];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
        <p className="mt-1 text-sm text-gray-500">{activeTab.description}</p>
      </div>

      {/* Tab nav */}
      <div className="mb-6 flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={cn(
                "relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-gray-500 hover:text-gray-900"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {active === "posts" && <PostsTab posts={posts} />}
      {active === "categories" && <CategoriesTab categories={categories} />}
      {active === "authors" && <AuthorsTab authors={authors} />}
    </div>
  );
}
