"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  BookOpen,
  GraduationCap,
  Type,
  LayoutDashboard,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Languages",
    href: "/admin/languages",
    icon: <Globe className="h-5 w-5" />,
  },
  {
    label: "Courses",
    href: "/admin/courses",
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    label: "Lessons",
    href: "/admin/lessons",
    icon: <GraduationCap className="h-5 w-5" />,
  },
  {
    label: "Words",
    href: "/admin/words",
    icon: <Type className="h-5 w-5" />,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-[240px] flex-col border-r border-gray-200 bg-white">
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold">
            A
          </div>
          <span className="font-semibold text-gray-900">Admin Panel</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
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
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
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
