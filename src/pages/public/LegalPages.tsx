import React from 'react';

interface LegalPagesProps {
  type: 'privacy' | 'terms';
  onNavigate: (path: string) => void;
}

export const LegalPages: React.FC<LegalPagesProps> = ({ type }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6 sm:space-y-8">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
          প্রাতিষ্ঠানিক শর্তাবলি ও নীতিমালা
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
          {type === 'privacy' ? 'গোপনীয়তা নীতি (Privacy Policy)' : 'ব্যবহারের শর্তাবলি (Terms of Service)'}
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-mono">
          কার্যকর তারিখ: অক্টোবর ২০২৬ · মুকিসফট টেকনোলজি (MukiSoft Technology)
        </p>
      </div>

      <div className="text-xs sm:text-sm leading-relaxed space-y-6 text-slate-700 bg-white p-6 sm:p-8 rounded-xl border border-slate-200">
        {type === 'privacy' ? (
          <>
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">১. তথ্য সংগ্রহ ও গোপনীয়তা সংরক্ষণ</h3>
              <p>
                মুকিসফট টেকনোলজি পরিচালিত MukiSoft Assist আপনার ব্যক্তিগত ও প্রাতিষ্ঠানিক তথ্যের পূর্ণ গোপনীয়তা বজায় রাখে। শুধুমাত্র ডিজিটাল সেবা সম্পাদন, অর্ডার ট্র্যাকিং এবং অর্থ লেনদেন যাচাইয়ের স্বার্থে প্রয়োজনীয় তথ্য (নাম, ইমেইল, মোবাইল নম্বর এবং প্রজেক্টের কাজের নির্দেশনা) সংগ্রহ করা হয়।
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">২. আপলোডকৃত ডকুমেন্ট ও ফাইলের নিরাপত্তা</h3>
              <p>
                গ্রাহক কর্তৃক আপলোডকৃত যেকোনো প্রেজেন্টেশন স্লাইড, রেজুমে, ব্যবসায়িক ডেটাশিট বা খসড়া চুক্তিপত্র Row Level Security (RLS) সুরক্ষিত প্রাইভেট ক্লাউড স্টোরেজে সংরক্ষিত থাকে। সংশ্লিষ্ট গ্রাহক এবং দায়িত্বপ্রাপ্ত অ্যাডমিনিস্ট্রেটর ব্যতীত অন্য কোনো তৃতীয় পক্ষের কাছে এসব ফাইল হস্তান্তর করা হয় না।
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">৩. আর্থিক লেজার ও ট্রানজ্যাকশন ডাটা</h3>
              <p>
                বিকাশ, নগদ বা ব্যাংক ট্রান্সফারের মাধ্যমে জমার অনুরোধ ও রেফারেন্স কোডগুলো হিসাবরক্ষণ ও অডিট ট্র্যাকিংয়ের উদ্দেশ্যে অপরিবর্তনীয় ডিজিটাল লেজারে সংরক্ষিত থাকে।
              </p>
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">১. ওয়ালেট ব্যালেন্স ও পেমেন্ট শর্তাবলি</h3>
              <p>
                MukiSoft Assist প্ল্যাটফর্মে যেকোনো সেবা গ্রহণের পূর্বে গ্রাহককে তার অ্যাকাউন্টের ওয়ালেটে টাকা জমা দিতে হবে। বিকাশ, নগদ বা ব্যাংকের মাধ্যমে জমাকৃত অর্থ অ্যাডমিন কর্তৃক অনুমোদিত হওয়ার পর ব্যালেন্সে যুক্ত হয়। কোনো সেবা অর্ডার করার সাথে সাথে সমপরিমাণ অর্থ ওয়ালেট থেকে কেটে এসক্রোতে সংরক্ষিত রাখা হয়।
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">২. কাজের ডেলিভারি ও রিভিশন পলিসি</h3>
              <p>
                প্রতিটি সেবার জন্য নির্ধারিত কর্মদিবসের মধ্যে মানসম্মত আউটপুট ডেলিভারি করা হয়। প্রাথমিক অর্ডারে দেওয়া নির্দেশনার সাথে সামঞ্জস্য রেখে নির্দিষ্ট মেয়াদের মধ্যে বিনামূল্যে রিভিশন সুবিধা প্রদান করা হয়।
              </p>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 mb-2">৩. নাগরিক ও সরকারি সহায়তা সেবা সংক্রান্ত বিশেষ শর্ত</h3>
              <p>
                MukiSoft Assist একটি সম্পূর্ণ বেসরকারি স্বাধীন প্রযুক্তি প্ল্যাটফর্ম। আমাদের এই সেবার ফি শুধুমাত্র ফরম্যাটিং, ড্রাফটিং ও অনলাইন আবেদন সহায়তা নির্দেশনার জন্য প্রযোজ্য। সরকারি ট্রেজারি ফি বা সরকারি স্ট্যাম্প শুল্ক পৃথকভাবে সংশ্লিষ্ট সরকারি পোর্টালেই পরিশোধ করতে হবে।
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
