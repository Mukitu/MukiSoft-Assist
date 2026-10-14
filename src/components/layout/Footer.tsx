import React from 'react';
import { toBengaliDigits } from '../../lib/i18n';

interface FooterProps {
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const currentYear = toBengaliDigits(new Date().getFullYear());

  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* ব্র্যান্ড ও পরিচিতি */}
          <div className="space-y-3 sm:col-span-2 md:col-span-1">
            <span className="text-base font-bold text-white tracking-tight">MukiSoft Assist</span>
            <p className="text-slate-400 leading-relaxed text-xs">
              এআই-চালিত প্রিমিয়াম ডিজিটাল সেবা প্ল্যাটফর্ম। প্রাতিষ্ঠানিক কাজের নির্ভুল মান এবং দ্রুততম ডেলিভারির নিশ্চয়তা।
            </p>
            <div className="text-slate-500 text-xs pt-1">
              পরিচালনায়: <strong className="text-slate-300 font-medium">মুকিসফট টেকনোলজি</strong>
            </div>
          </div>

          {/* সেবার বিভাগসমূহ */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">সেবার বিভাগসমূহ</h4>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('/category/document-presentation')}
                  className="hover:text-white transition-colors text-left"
                >
                  ডকুমেন্ট ও প্রেজেন্টেশন সেবা
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/category/career-job-application')}
                  className="hover:text-white transition-colors text-left"
                >
                  এটিএস রেজুমে ও চাকরির আবেদন
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/category/website-technical-helpdesk')}
                  className="hover:text-white transition-colors text-left"
                >
                  ওয়েবসাইট ও টেকনিক্যাল হেল্প ডেস্ক
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('/category/government-citizen-assistance')}
                  className="hover:text-white transition-colors text-left"
                >
                  সরকারি ডকুমেন্ট ও নাগরিক সহায়তা
                </button>
              </li>
            </ul>
          </div>

          {/* প্ল্যাটফর্ম নেভিগেশন */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">প্ল্যাটফর্ম</h4>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li>
                <button onClick={() => onNavigate('/how-it-works')} className="hover:text-white transition-colors">
                  কাজের পদ্ধতি
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/about')} className="hover:text-white transition-colors">
                  আমাদের সম্পর্কে
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/contact')} className="hover:text-white transition-colors">
                  যোগাযোগ ও সহায়তা
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/dashboard/wallet')} className="hover:text-white transition-colors">
                  ওয়ালেট নিরাপত্তা ও লেজার
                </button>
              </li>
            </ul>
          </div>

          {/* আইনি শর্তাবলি ও ডিসক্লেইমার */}
          <div className="space-y-2">
            <h4 className="font-semibold text-slate-200 text-xs tracking-wider uppercase">আইনি ও কমপ্লায়েন্স</h4>
            <ul className="space-y-2 text-slate-400 text-xs">
              <li>
                <button onClick={() => onNavigate('/privacy')} className="hover:text-white transition-colors">
                  গোপনীয়তা নীতি
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('/terms')} className="hover:text-white transition-colors">
                  ব্যবহারের শর্তাবলি
                </button>
              </li>
              <li className="pt-2 text-[11px] text-slate-500 leading-normal">
                নাগরিক সহায়তা সেবা কোনো সরকারি মন্ত্রণালয় বা সরকারি ফি প্রতিস্থাপন করে না। প্ল্যাটফর্ম ফি শুধুমাত্র ফাইল তৈরি ও আবেদন সহায়তা নির্দেশিকার জন্য প্রযোজ্য।
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
          <div>
            © {currentYear} মুকিসফট টেকনোলজি (MukiSoft Technology). সর্বস্বত্ব সংরক্ষিত।
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('/privacy')} className="hover:text-slate-300">
              গোপনীয়তা নীতি
            </button>
            <span>·</span>
            <button onClick={() => onNavigate('/terms')} className="hover:text-slate-300">
              ব্যবহারের শর্তাবলি
            </button>
            <span>·</span>
            <button onClick={() => onNavigate('/contact')} className="hover:text-slate-300">
              যোগাযোগ
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
