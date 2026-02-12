"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  itemLabel?: string;
  onPageChange: (page: number) => void;
}

const NAV_BUTTON_WIDTH = 32;
const PAGE_BUTTON_WIDTH = 36;
const NAV_BUTTONS_COUNT = 4;
const MIN_VISIBLE_PAGES = 3;

export function AdminPagination({
  currentPage,
  totalPages,
  totalCount,
  itemLabel = "items",
  onPageChange,
}: AdminPaginationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxVisiblePages, setMaxVisiblePages] = useState(5);

  const calculateMaxVisible = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    // Reserve space for: nav buttons (4 × 32px) + gaps + info text (~200px estimate)
    const navButtonsWidth = NAV_BUTTONS_COUNT * NAV_BUTTON_WIDTH + 16; // 16px for gaps
    const infoTextWidth = 200;
    const availableWidth = containerWidth - navButtonsWidth - infoTextWidth;

    const calculated = Math.floor(availableWidth / PAGE_BUTTON_WIDTH);
    setMaxVisiblePages(Math.max(MIN_VISIBLE_PAGES, Math.min(calculated, totalPages)));
  }, [totalPages]);

  useEffect(() => {
    calculateMaxVisible();

    const resizeObserver = new ResizeObserver(() => {
      calculateMaxVisible();
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [calculateMaxVisible]);

  if (totalPages <= 1) return null;

  // Calculate which page numbers to show
  const getVisiblePages = (): number[] => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = currentPage - half;
    let end = currentPage + half;

    if (start < 1) {
      start = 1;
      end = maxVisiblePages;
    } else if (end > totalPages) {
      end = totalPages;
      start = totalPages - maxVisiblePages + 1;
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  };

  const visiblePages = getVisiblePages();

  const buttonClass =
    "flex items-center justify-center rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
  const pageButtonClass = (isActive: boolean) =>
    `min-w-[32px] rounded px-2 py-1 text-sm transition-colors ${
      isActive
        ? "bg-primary text-white"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div ref={containerRef} className="flex items-center justify-between">
      <p className="text-sm text-gray-500 whitespace-nowrap">
        Page {currentPage} of {totalPages} ({totalCount} {itemLabel})
      </p>
      <div className="flex items-center gap-1">
        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={buttonClass}
          title="First page"
          aria-label="First page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={buttonClass}
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Page numbers */}
        {visiblePages.map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={pageButtonClass(currentPage === pageNum)}
            aria-label={`Page ${pageNum}`}
            aria-current={currentPage === pageNum ? "page" : undefined}
          >
            {pageNum}
          </button>
        ))}

        {/* Next */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={buttonClass}
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={buttonClass}
          title="Last page"
          aria-label="Last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
