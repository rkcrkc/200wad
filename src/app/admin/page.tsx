import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Globe, BookOpen, GraduationCap, Type, ArrowRight } from "lucide-react";

interface StatCard {
  label: string;
  count: number;
  icon: React.ReactNode;
  href: string;
  description: string;
}

async function getStats() {
  const supabase = await createClient();

  const [
    { count: languageCount },
    { count: courseCount },
    { count: lessonCount },
    { count: wordCount },
    { count: publishedCourses },
    { count: publishedLessons },
  ] = await Promise.all([
    supabase.from("languages").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }),
    supabase.from("lessons").select("*", { count: "exact", head: true }),
    supabase.from("words").select("*", { count: "exact", head: true }),
    supabase.from("courses").select("*", { count: "exact", head: true }).eq("is_published", true),
    supabase.from("lessons").select("*", { count: "exact", head: true }).eq("is_published", true),
  ]);

  return {
    languages: languageCount || 0,
    courses: courseCount || 0,
    lessons: lessonCount || 0,
    words: wordCount || 0,
    publishedCourses: publishedCourses || 0,
    publishedLessons: publishedLessons || 0,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards: StatCard[] = [
    {
      label: "Languages",
      count: stats.languages,
      icon: <Globe className="h-6 w-6" />,
      href: "/admin/languages",
      description: "Manage available languages",
    },
    {
      label: "Courses",
      count: stats.courses,
      icon: <BookOpen className="h-6 w-6" />,
      href: "/admin/courses",
      description: `${stats.publishedCourses} published`,
    },
    {
      label: "Lessons",
      count: stats.lessons,
      icon: <GraduationCap className="h-6 w-6" />,
      href: "/admin/lessons",
      description: `${stats.publishedLessons} published`,
    },
    {
      label: "Words",
      count: stats.words,
      icon: <Type className="h-6 w-6" />,
      href: "/admin/words",
      description: "Vocabulary entries",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage languages, courses, lessons, and vocabulary content.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {card.icon}
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{card.count}</p>
              <p className="text-sm font-medium text-gray-900">{card.label}</p>
              <p className="mt-1 text-xs text-gray-500">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/languages"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/50"
          >
            <Globe className="h-5 w-5 text-primary" />
            <span className="font-medium">Add a new language</span>
          </Link>
          <Link
            href="/admin/courses"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/50"
          >
            <BookOpen className="h-5 w-5 text-primary" />
            <span className="font-medium">Create a new course</span>
          </Link>
          <Link
            href="/admin/lessons"
            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-primary/50"
          >
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-medium">Add a new lesson</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
