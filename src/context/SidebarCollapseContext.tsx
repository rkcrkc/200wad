"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Exposes the desktop main-sidebar collapsed state to descendants so that
 * fixed-position elements offset by the sidebar width (help index, action
 * bars, sticky cart) can track the 240px ↔ 72px change.
 *
 * Defaults to `false` when no provider is mounted (e.g. study/test mode, which
 * use their own non-collapsible 240px sidebar), keeping their offsets intact.
 */
const SidebarCollapseContext = createContext<boolean>(false);

export function SidebarCollapseProvider({
  collapsed,
  children,
}: {
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <SidebarCollapseContext.Provider value={collapsed}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}

/** Returns whether the desktop main sidebar is collapsed (default: false). */
export function useSidebarCollapsed(): boolean {
  return useContext(SidebarCollapseContext);
}
