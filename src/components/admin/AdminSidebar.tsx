"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  BookOpen,
  GraduationCap,
  Type,
  Music,
  Settings,
  CreditCard,
  ChevronLeft,
  Trophy,
  HelpCircle,
  FileText,
  Lightbulb,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navSections: NavItem[][] = [
  // Section 1: Content structure
  [
    { label: "Languages", href: "/admin/languages", icon: <Globe className="h-5 w-5" /> },
    { label: "Courses", href: "/admin/courses", icon: <BookOpen className="h-5 w-5" /> },
    { label: "Lessons", href: "/admin/lessons", icon: <GraduationCap className="h-5 w-5" /> },
    { label: "Words", href: "/admin/words", icon: <Type className="h-5 w-5" /> },
  ],
  // Section 2: Content & media
  [
    { label: "Text & Labels", href: "/admin/text-labels", icon: <FileText className="h-5 w-5" /> },
    { label: "Tips", href: "/admin/tips", icon: <Lightbulb className="h-5 w-5" /> },
    { label: "Help", href: "/admin/help", icon: <HelpCircle className="h-5 w-5" /> },
    { label: "Notifications", href: "/admin/notifications", icon: <Bell className="h-5 w-5" /> },
    { label: "Music", href: "/admin/music", icon: <Music className="h-5 w-5" /> },
  ],
  // Section 3: Billing
  [
    { label: "Billing", href: "/admin/settings", icon: <CreditCard className="h-5 w-5" /> },
  ],
  // Section 4: Leaderboard
  [
    { label: "Leaderboard", href: "/admin/leaderboard", icon: <Trophy className="h-5 w-5" /> },
  ],
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const isDashboardActive = pathname === "/admin";

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col border-r border-gray-200 bg-white">
      {/* Header — links to dashboard */}
      <Link
        href="/admin"
        className={cn(
          "flex h-16 shrink-0 items-center gap-2 border-b border-gray-200 px-4 transition-colors",
          isDashboardActive ? "bg-primary/5" : "hover:bg-gray-50"
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
          A
        </div>
        <span className="font-semibold text-gray-900">Admin Panel</span>
      </Link>

      {/* Navigation — scrollable */}
      <nav className="min-h-0 flex-1 overflow-y-auto p-4">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {sectionIndex > 0 && (
              <div className="my-2 h-px bg-gray-200" />
            )}
            <ul className="space-y-1">
              {section.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-gray-200 p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to App
        </Link>
        <Link
          href="/admin/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
