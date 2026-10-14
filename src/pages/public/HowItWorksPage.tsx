import React from 'react';
import { ArrowRight, Clock, FileText, RefreshCw, Lock, ShieldCheck } from 'lucide-react';
import { toBengaliDigits } from '../../lib/i18n';

interface HowItWorksPageProps {
  onNavigate: (path: string) => void;
}

export const HowItWorksPage: React.FC<HowItWorksPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 sm:space-y-16">
      {/* শিরোনাম */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          স্বচ্ছতা ও প্রশাসনিক জবাবদিহিতা
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          MukiSoft Assist যেভাবে পরিচালিত হয়
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          আমাদের প্ল্যাটফর্মে কৃত্রিম বুদ্ধিমত্তা (AI)-এর দ্রুত গতির সাথে অভিজ্ঞ মানব তত্ত্বাবধানের মেলবন্ধন ঘটানো হয়েছে। ওয়ালেট এসক্রো সুরক্ষার মাধ্যমে আপনি পাচ্ছেন শতভাগ নিশ্চিত ডেলিভারি।
        </p>
      </div>

      {/* ৪টি স্তম্ভ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">১. ওয়ালেটে টাকা জমা</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            বিকাশ, নগদ বা ব্যাংক ট্রান্সফারের মাধ্যমে সহজেই আপনার অ্যাকাউন্টের ওয়ালেটে টাকা জমা দিন। লেনদেন যাচাই হওয়ার সাথে সাথে আপনার ব্যালেন্স যুক্ত হবে।
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">২. ব্রিফ প্রদান ও অর্ডার</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            ৯টি কাঠামোগত সেবার বিভাগ থেকে আপনার কাঙ্ক্ষিত সেবা নির্বাচন করুন। আপনার চাহিদা লিখে এক ক্লিকে ওয়ালেট ব্যালেন্স থেকে অর্ডার নিশ্চিত করুন।
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">৩. দক্ষ টিমের মাধ্যমে কাজ</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            আমাদের ডেডিকেটেড অপারেশনস টিম প্রতিশ্রুত নির্দিষ্ট কর্মদিবসের মধ্যে আপনার কাজটি সুচারুভাবে সম্পন্ন করে।
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">৪. ফাইল ডাউনলোড ও রিভিশন</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            সম্পন্ন ফাইল ও এডিটেবল সোর্স ফাইল সরাসরি ডাউনলোড করুন। কোনো সংশোধনের প্রয়োজন হলে নির্দিষ্ট মেয়াদের মধ্যে রিভিশন গ্রহণ করুন।
          </p>
        </div>
      </div>

      {/* এসক্রো ও আর্থিক নিরাপত্তা কার্ড */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">এসক্রো সুরক্ষা ও আর্থিক স্বচ্ছতা</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-800">অপরিবর্তনীয় ডিজিটাল লেজার</h4>
            <p>
              সাধারণ ফ্রিল্যান্সিং সাইটের মতো কোনো গোপন ফি নেই। প্রতিটি জমার অনুরোধ, সেবা ক্রয় ও ব্যালেন্স সমন্বয় সরাসরি PostgreSQL ডাটাবেজে অপরিবর্তনীয় লেজার আকারে সংরক্ষিত হয়।
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-800">নাগরিক সেবায় সম্পূর্ণ নিরপেক্ষতা</h4>
            <p>
              সরকারি নথিপত্র সংক্রান্ত সেবাগুলোতে সরকারি ট্রেজারি ফি ও আমাদের প্ল্যাটফর্ম ফি সম্পূর্ণ পৃথক রাখা হয়েছে, যাতে গ্রাহকদের মধ্যে কোনো ভুল বোঝাবুঝি তৈরি না হয়।
            </p>
          </div>
        </div>
      </div>

      {/* নিচের বোতাম */}
      <div className="text-center pt-2">
        <button
          onClick={() => onNavigate('/services')}
          className="px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 inline-flex items-center gap-2 transition-colors"
        >
          <span>সকল সেবা ব্রাউজ করুন</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
