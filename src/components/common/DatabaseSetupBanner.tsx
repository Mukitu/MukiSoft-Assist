import React, { useState } from 'react';
import { Database, Code } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SqlViewerModal } from './SqlViewerModal';
import { UserRole } from '../../types/database';

export const DatabaseSetupBanner: React.FC = () => {
  const { isSupabaseConfigured, role, switchDemoRole } = useAuth();
  const [showSqlModal, setShowSqlModal] = useState(false);

  return (
    <>
      <div className="bg-slate-900 text-slate-300 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
          {/* স্ট্যাটাস ও স্কিমা বাটন */}
          <div className="flex items-center flex-wrap gap-2">
            {isSupabaseConfigured ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>Supabase সংযুক্ত আছে</span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <span className="text-slate-400 hidden sm:inline">PostgreSQL ও RLS সক্রিয়</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>স্থানীয় টেস্ট মোড</span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <span className="text-slate-400 hidden sm:inline">.env ফাইলে আসল Supabase যুক্ত করুন</span>
              </span>
            )}

            <button
              onClick={() => setShowSqlModal(true)}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2 ml-1"
            >
              <Code className="w-3.5 h-3.5" />
              <span>এসকিউএল স্কিমা ও নির্দেশিকা</span>
            </button>
          </div>

          {/* রোল টেস্ট সুইচার (সম্পূর্ণ বাংলায়) */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 hidden sm:inline text-[11px]">ভূমিকা পরিবর্তন:</span>
            <div className="flex items-center bg-slate-800 rounded p-0.5 border border-slate-700">
              {(
                [
                  { key: 'user', label: 'গ্রাহক' },
                  { key: 'admin', label: 'অ্যাডমিন' },
                  { key: 'super_admin', label: 'সুপার অ্যাডমিন' },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => switchDemoRole(key as UserRole)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    role === key
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`${label} হিসেবে প্ল্যাটফর্ম দেখুন`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SqlViewerModal isOpen={showSqlModal} onClose={() => setShowSqlModal(false)} />
    </>
  );
};
