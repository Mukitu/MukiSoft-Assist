import React, { useState } from 'react';
import { Copy, Check, X, Terminal, ExternalLink } from 'lucide-react';

interface SqlViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlViewerModal: React.FC<SqlViewerModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const sqlCode = `-- আপনার Supabase প্রজেক্টের SQL Editor-এ রান করুন
-- ফাইল লোকেশন: supabase/schema.sql
-- এতে অন্তর্ভুক্ত:
-- ১. ১৩টি সম্পূর্ণ টেবিল (profiles, wallets, orders, deposit_requests ইত্যাদি)
-- ২. কঠোর Row Level Security (RLS) পলিসি
-- ৩. অটমিক প্রসিডিউর: approve_deposit_request ও purchase_service_with_wallet
-- ৪. ৯টি সেবার ক্যাটাগরি ও প্রাথমিক সেবাসমূহের সীড ডেটা

-- সম্পূর্ণ কোড দেখতে প্রজেক্টের supabase/schema.sql ফাইলটি ওপেন করুন।`;

    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* হেডার */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600 shrink-0" />
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
              Supabase SQL স্কিমা ও ডাটাবেজ সেটআপ নির্দেশিকা
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md"
            aria-label="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কনটেন্ট */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-950">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-amber-900 mb-1">
              এককালীন ডাটাবেজ কনফিগারেশন
            </h4>
            <p className="text-xs leading-relaxed">
              MukiSoft Assist-এর পূর্ণাঙ্গ PostgreSQL ডেটাবেজ স্কিমা প্রজেক্টের{' '}
              <code className="font-mono font-medium text-amber-950 bg-amber-100 px-1 py-0.5 rounded">
                supabase/schema.sql
              </code>{' '}
              ফাইলে প্রস্তুত রয়েছে। এতে ১৩টি টেবিল, ইনডেক্স, RLS সিকিউরিটি পলিসি এবং অটমিক ট্রানজ্যাকশন ফাংশন রয়েছে।
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">ধাপ ১: Supabase-এ স্কিমা রান করুন</h4>
            <ol className="list-decimal list-inside space-y-2 text-xs text-slate-600 ml-1">
              <li>
                আপনার Supabase ড্যাশবোর্ডে লগইন করুন (
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 underline inline-flex items-center gap-0.5 font-medium"
                >
                  supabase.com/dashboard <ExternalLink className="w-3 h-3" />
                </a>
                )।
              </li>
              <li>বাম পাশের মেনু থেকে <strong>SQL Editor</strong> ট্যাবে যান।</li>
              <li>
                প্রজেক্টের <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">supabase/schema.sql</code> ফাইলের সমস্ত কোড কপি করে পেস্ট করুন এবং <strong>Run</strong> বাটনে চাপ দিন।
              </li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">ধাপ ২: এনভায়রনমেন্টে পাবলিক কী যুক্ত করুন</h4>
            <p className="text-xs text-slate-600 mb-2">
              Supabase ড্যাশবোর্ডের <strong>Project Settings → API</strong> থেকে নিচের দুটি মান আপনার <code className="font-mono bg-slate-100 px-1 rounded">.env</code> ফাইলে যোগ করুন:
            </p>
            <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs overflow-x-auto space-y-1">
              <div>VITE_SUPABASE_URL="https://xxxxxxxx.supabase.co"</div>
              <div>VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."</div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 mb-2">ধাপ ৩: প্রথম সুপার অ্যাডমিন নিয়োগ পদ্ধতি</h4>
            <p className="text-xs text-slate-600 mb-2">
              রেজিস্ট্রেশন ফর্ম দিয়ে সাধারণ অ্যাকাউন্ট খোলার পর Supabase SQL Editor-এ এই কুয়েরিটি রান করলেই সুপার অ্যাডমিন অনুমতি সক্রিয় হবে:
            </p>
            <div className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-xs overflow-x-auto">
              UPDATE public.profiles SET role = 'super_admin' WHERE email = 'আপনার-ইমেইল@example.com';
            </div>
          </div>
        </div>

        {/* ফুটার */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 font-mono">ফাইল লোকেশন: /supabase/schema.sql</span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'কপি সম্পন্ন হয়েছে' : 'রেফারেন্স কপি করুন'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
