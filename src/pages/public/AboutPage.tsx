import React from 'react';
import { ShieldCheck, Cpu, Building, Target } from 'lucide-react';

interface AboutPageProps {
  onNavigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 sm:space-y-16">
      {/* হেডার */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          প্রাতিষ্ঠানিক পরিচয়
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          MukiSoft Assist সম্পর্কে জানুন
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          MukiSoft Assist হলো <strong>মুকিসফট টেকনোলজি (MukiSoft Technology)</strong> উদ্ভাবিত ও পরিচালিত একটি বিশেষায়িত ডিজিটাল সেবা প্ল্যাটফর্ম। আমরা পেশাদার নির্ভুলতা ও আধুনিক এআই প্রযুক্তির সমন্বয়ে যেকোনো ধরনের প্রাতিষ্ঠানিক ডিজিটাল আউটপুট প্রদান করি।
        </p>
      </div>

      {/* লক্ষ্য ও রূপকল্প */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">আমাদের লক্ষ্য</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            ব্যবসায়ী, উদ্যোক্তা এবং পেশাজীবীদের জন্য নির্ভরযোগ্য, মানসম্মত ও দ্রুততম সময়ে রেডিমেড ডিজিটাল কাজের সমাধান নিশ্চিত করা।
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">এআই প্রযুক্তির নির্ভুলতা</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            আধুনিক এআই টুলস ও ডেটা কাঠামোর সাহায্যে কাজের সময় নাটকীয়ভাবে হ্রাস করে প্রতিটি ডেলিভারিতে নিখুঁত মান বজায় রাখা।
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">আর্থিক নিরাপত্তা ও ট্রাস্ট</h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            গ্রাহকের প্রতিটি ডিপোজিট ও সেবা ক্রয়ের অর্থ ডেডিকেটেড এসক্রো লেজারে সুরক্ষিত থাকে। যাচাইকৃত কাজের পর গ্রাহক সন্তুষ্টি নিশ্চিত করা হয়।
          </p>
        </div>
      </div>

      {/* মূল প্রতিষ্ঠান পরিচিতি */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs uppercase tracking-wider">
          <Building className="w-4 h-4" />
          <span>প্যারেন্ট প্রতিষ্ঠান</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">মুকিসফট টেকনোলজি (MukiSoft Technology)</h2>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
          মুকিসফট টেকনোলজি হলো একটি অত্যাধুনিক সফটওয়্যার আর্কিটেকচার, ক্লাউড কম্পিউটিং এবং ডিজিটাল ট্রান্সফরমেশন প্রতিষ্ঠান। MukiSoft Assist-এর মাধ্যমে ব্যবসা ও সাধারণ মানুষের জন্য এন্টারপ্রাইজ লেভেলের ডিজিটাল কাজসমূহ সহজলভ্য করা হয়েছে।
        </p>
      </div>
    </div>
  );
};
