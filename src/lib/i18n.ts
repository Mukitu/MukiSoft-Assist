import { createContext, useContext, ReactNode, createElement } from 'react';

// সংখ্যাকে বাংলা ডিজিটে রূপান্তর
export function toBengaliDigits(input: number | string | null | undefined): string {
  if (input === null || input === undefined) return '';
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(input).replace(/[0-9]/g, (digit) => bengaliDigits[Number(digit)]);
}

// টাকার ফরম্যাট
export function toBengaliCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '৳ ০.০০';
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `৳ ${toBengaliDigits(formatted)}`;
}

// তারিখ রূপান্তর
export function toBengaliDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = toBengaliDigits(d.getDate());
    const year = toBengaliDigits(d.getFullYear());
    const months = [
      'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
      'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const month = months[d.getMonth()];
    return `${day} ${month}, ${year}`;
  } catch {
    return dateString;
  }
}

// স্ট্যাটাস ম্যাপিং
export const statusLabels: Record<string, string> = {
  // অর্ডার স্ট্যাটাস
  pending: 'অপেক্ষমাণ',
  pending_requirements: 'প্রয়োজনীয় তথ্যের অপেক্ষা',
  accepted: 'গ্রহণ করা হয়েছে',
  in_progress: 'কাজ চলছে',
  needs_information: 'অতিরিক্ত তথ্য প্রয়োজন',
  review: 'পর্যালোচনাধীন',
  in_review: 'পর্যালোচনায় আছে',
  revision_requested: 'সংশোধনের অনুরোধ',
  delivered: 'ডেলিভারি সম্পন্ন',
  completed: 'সম্পূর্ণ সমাপ্ত',
  cancelled: 'বাতিলকৃত',
  refunded: 'অর্থ ফেরত দেওয়া হয়েছে',

  // ডিপোজিট স্ট্যাটাস
  approved: 'অনুমোদিত',
  rejected: 'প্রত্যাখ্যাত',

  // লেনদেন স্ট্যাটাস
  deposit: 'টাকা জমা',
  service_purchase: 'সেবা ক্রয়',
  refund: 'টাকা ফেরত',
  admin_adjustment: 'প্রশাসনিক সমন্বয়',

  // ভূমিকা
  super_admin: 'সুপার অ্যাডমিন',
  admin: 'অ্যাডমিন',
  user: 'সাধারণ ব্যবহারকারী',

  // টিকিট
  open: 'উন্মুক্ত',
  resolved: 'সমাধানকৃত',
  closed: 'বন্ধ',
  low: 'সাধারণ',
  medium: 'মাঝারি',
  high: 'জরুরি',
  urgent: 'অতি জরুরি',
};

export const t = {
  brandName: 'MukiSoft Assist',
  parentCompany: 'MukiSoft Technology',
  tagline: 'এক প্ল্যাটফর্ম। প্রতিটি সেবা। এআই দিয়ে আরও স্মার্ট।',
  taglineSub: 'কর্পোরেট গ্রেড ডিজিটাল সেবা, পেশাদার ডকুমেন্ট ইঞ্জিনিয়ারিং এবং নির্ভরযোগ্য মানব তত্ত্বাবধানে নিশ্চিত সেবা।',

  // নেভিগেশন
  navHome: 'প্রধান পৃষ্ঠা',
  navServices: 'সকল সেবা',
  navHowItWorks: 'যেভাবে কাজ করে',
  navAbout: 'আমাদের সম্পর্কে',
  navContact: 'যোগাযোগ ও সহায়তা',
  navLogin: 'লগইন',
  navRegister: 'নিবন্ধন',
  navDashboard: 'গ্রাহক ড্যাশবোর্ড',
  navAdminPanel: 'প্রশাসনিক কনসোল',
  navLogout: 'লগআউট',

  // হিরো সেকশন
  heroTitle: 'আপনার প্রাতিষ্ঠানিক কাজের গতি বাড়ান',
  heroHighlight: 'নির্ভরযোগ্য ডিজিটাল সেবায়',
  heroSubtitle: 'আপনার নিরাপদ অ্যাকাউন্টের ওয়ালেটে টাকা জমা করুন, তাৎক্ষণিক প্রয়োজনীয় পেশাদার ডিজিটাল সেবা অর্ডার করুন এবং যাচাইকৃত মানের আউটপুট বুঝে নিন।',
  searchServicesPlaceholder: '৪০টিরও বেশি পেশাদার সেবা খুঁজুন (যেমন: পিচ ডেক, এটিএস রেজুমে, ডোমেইন ডিএনএস সেটআপ)...',
  btnBrowseServices: 'সকল সেবা দেখুন',
  btnDepositNow: 'ওয়ালেটে টাকা জমা দিন',
  btnExploreCategories: 'সেবার বিভাগসমূহ দেখুন',

  // ক্যাটাগরি ও সার্ভিস
  categoriesTitle: 'বিশেষায়িত সেবার বিভাগসমূহ',
  categoriesSubtitle: 'উদ্যোক্তা, চাকরিজীবী ও করপোরেট প্রতিষ্ঠানের জন্য ৯টি কাঠামোগত ডিজিটাল সেবা বিভাগ।',
  featuredTitle: 'জনপ্রিয় পেশাদার ডিজিটাল সেবা',
  featuredSubtitle: 'স্বচ্ছ মূল্যতালিকা, নির্দিষ্ট সময়ে ডেলিভারি প্রতিশ্রুতি এবং রিভিশন গ্যারান্টিযুক্ত সেবা।',
  deliveryEstimate: 'ডেলিভারির সময়সীমা',
  startingFrom: 'মূল্য শুরু',
  orderNow: 'সেবা অর্ডার করুন',
  viewDetails: 'বিস্তারিত দেখুন',
  govNoticePrefix: 'সতর্কতা: শুধুমাত্র প্ল্যাটফর্ম সার্ভিস ফি। সরকারি অফিসিয়াল ফি অন্তর্ভুক্ত নয়।',

  // যেভাবে কাজ করে
  howItWorksTitle: 'সহজ তিনটি ধাপে সেবা গ্রহণের পদ্ধতি',
  howItWorksSubtitle: 'ওয়ালেট এসক্রো নিরাপত্তা, অপরিবর্তনীয় লেনদেন লেজার এবং প্রতিটি অর্ডারের স্বচ্ছ ট্র্যাকিং।',
  step1Title: '১. ওয়ালেটে ফান্ড জমা করুন',
  step1Desc: 'বিকাশ, নগদ বা ব্যাংক ট্রান্সফারের মাধ্যমে সহজেই আপনার অ্যাকাউন্টের ওয়ালেটে টাকা জমা দিন।',
  step2Title: '২. সেবা নির্বাচন ও তথ্য প্রদান',
  step2Desc: 'প্রয়োজনীয় সেবাটি নির্বাচন করুন, আপনার ব্রিফ বা ফাইল আপলোড করে নিশ্চিত করুন।',
  step3Title: '৩. কাজ বুঝে নিন ও ফাইল ডাউনলোড',
  step3Desc: 'রিয়েল-টাইম টাইমলাইনে কাজের অগ্রগতি দেখুন, ডেলিভারি ফাইল ডাউনলোড করুন এবং প্রয়োজনে রিভিশন নিন।',

  // ওয়ালেট ও আর্থিক তথ্য
  walletBalance: 'অ্যাকাউন্টের বর্তমান ব্যালেন্স',
  pendingDeposits: 'অপেক্ষমাণ জমার অনুরোধ',
  totalDeposited: 'মোট জমা',
  totalSpent: 'মোট খরচ',
  depositFunds: 'টাকা জমা দিন',
  transactionHistory: 'লেনদেনের ইতিহাস',

  // সাধারণ বোতাম ও লেবেল
  loading: 'লোড হচ্ছে...',
  emptyData: 'কোনো তথ্য পাওয়া যায়নি।',
  viewAll: 'সবগুলো দেখুন',
  back: 'ফিরে যান',
  confirm: 'নিশ্চিত করুন',
  cancel: 'বাতিল',
  submit: 'জমা দিন',
  status: 'অবস্থা',
};

interface LanguageContextType {
  language: 'bn';
  t: typeof t;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'bn',
  t,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  return createElement(
    LanguageContext.Provider,
    {
      value: {
        language: 'bn',
        t,
      },
    },
    children
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
