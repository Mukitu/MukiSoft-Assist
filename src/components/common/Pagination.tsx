import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toBengaliDigits } from '../../lib/i18n';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div
      className={`px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 rounded-b-xl ${className}`}
    >
      {/* বামদিকে আইটেম কাউন্টার */}
      <div className="font-medium text-slate-500">
        মোট <strong className="text-slate-800 font-mono">{toBengaliDigits(totalItems)}</strong> টির মধ্যে{' '}
        <span className="font-mono text-slate-800 font-semibold">
          {toBengaliDigits(startItem)} - {toBengaliDigits(endItem)}
        </span>{' '}
        নম্বর দেখানো হচ্ছে
      </div>

      {/* ডানদিকে নেভিগেশন বাটনসমূহ */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium shrink-0"
          title="পূর্ববর্তী পৃষ্ঠা"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>আগেরটি</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (typeof page === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-mono">
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg font-mono text-xs font-semibold transition-colors shrink-0 ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {toBengaliDigits(page)}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 font-medium shrink-0"
          title="পরবর্তী পৃষ্ঠা"
        >
          <span>পরেরটি</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
