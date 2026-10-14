import React, { useState, useEffect } from 'react';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  FileText,
  Briefcase,
  Megaphone,
  ShoppingCart,
  Cpu,
  Database,
  Globe,
  Calendar,
  Building2,
  Clock,
} from 'lucide-react';
import { t, toBengaliDigits, toBengaliCurrency } from '../../lib/i18n';
import { api } from '../../services/api';
import { ServiceCategory, ServiceItem } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface HomePageProps {
  onNavigate: (path: string) => void;
}

export const getCategoryIcon = (iconName: string) => {
  switch (iconName) {
    case 'FileText':
      return FileText;
    case 'Briefcase':
      return Briefcase;
    case 'Megaphone':
      return Megaphone;
    case 'ShoppingCart':
      return ShoppingCart;
    case 'Cpu':
      return Cpu;
    case 'Database':
      return Database;
    case 'Globe':
      return Globe;
    case 'Calendar':
      return Calendar;
    case 'Building2':
      return Building2;
    default:
      return FileText;
  }
};

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useNotification();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [featuredServices, setFeaturedServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, feats] = await Promise.all([
          api.getCategories(),
          api.getFeaturedServices(),
        ]);
        setCategories(cats);
        setFeaturedServices(feats);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/services?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      onNavigate('/services');
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24 py-6 md:py-12">
      {/* হিরো সেকশন */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-indigo-600">
            {t.parentCompany} · {t.tagline}
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
            {t.heroTitle}{' '}
            <span className="text-indigo-600 underline decoration-indigo-200 underline-offset-8">
              {t.heroHighlight}
            </span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {t.heroSubtitle}
          </p>

          {/* সেবা খোঁজার সার্চ ফর্ম */}
          <form onSubmit={handleSearchSubmit} className="max-w-2xl mx-auto pt-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-xl border border-slate-200 shadow-sm p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all gap-2 sm:gap-0">
              <div className="flex items-center flex-1 px-2">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchServicesPlaceholder}
                  className="w-full px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                খুঁজুন
              </button>
            </div>
          </form>

          {/* প্ল্যাটফর্মের বিশ্বস্ত বৈশিষ্ট্যসমূহ */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ওয়ালেট এসক্রো সুরক্ষিত</span>
            </span>
            <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>অভিজ্ঞদের মান যাচাই</span>
            </span>
            <span aria-hidden="true" className="text-slate-300 hidden sm:inline">·</span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 shrink-0" />
              <span>এআই গতিতে দ্রুত ডেলিভারি</span>
            </span>
          </div>
        </div>
      </section>

      {/* ৯টি সেবার ক্যাটাগরি */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              কাঠামোগত বিভাগ
            </span>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 mt-1">
              {t.categoriesTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">{t.categoriesSubtitle}</p>
          </div>
          <button
            onClick={() => onNavigate('/services')}
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 whitespace-nowrap"
          >
            <span>সকল সেবা দেখুন (৪০+)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {categories.map((cat, idx) => {
            const Icon = getCategoryIcon(cat.icon);
            const isGov = cat.slug === 'government-citizen-assistance';

            return (
              <div
                key={cat.id}
                onClick={() => onNavigate(`/category/${cat.slug}`)}
                className="cursor-pointer group p-5 sm:p-6 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-400">
                      ০{toBengaliDigits(idx + 1)}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {cat.name_bn || cat.name}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {cat.description_bn || cat.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  {isGov ? (
                    <span className="text-amber-800 font-medium text-[11px]">শুধুমাত্র প্ল্যাটফর্ম সেবা ফি</span>
                  ) : (
                    <span>বিভাগের সেবাসমূহ দেখুন</span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* জনপ্রিয় ফিচার্ড সার্ভিসেস */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 pb-4 border-b border-slate-200">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              যাচাইকৃত কাজ
            </span>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 mt-1">
              {t.featuredTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">{t.featuredSubtitle}</p>
          </div>
          <button
            onClick={() => onNavigate('/services')}
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 whitespace-nowrap"
          >
            <span>সবগুলো সেবা ব্রাউজ করুন</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-64 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredServices.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      {toBengaliDigits(service.delivery_days)} কর্মদিবসের মধ্যে ডেলিভারি
                    </span>
                    {service.is_gov_service && (
                      <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        নাগরিক গাইডেন্স
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 leading-snug">
                    {service.title_bn || service.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {service.description_bn || service.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 block">মূল্য শুরু</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold font-mono text-slate-900">
                        {toBengaliCurrency(service.promotional_price ?? service.price)}
                      </span>
                      {service.promotional_price && (
                        <span className="text-xs text-slate-400 line-through font-mono">
                          {toBengaliCurrency(service.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate(`/service/${service.slug}`)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    {t.viewDetails}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ৩টি ধাপে কাজের পদ্ধতি */}
      <section className="bg-white border-y border-slate-200 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              স্বচ্ছ কর্মপদ্ধতি
            </span>
            <h2 className="text-xl sm:text-3xl font-bold text-slate-900 mt-1">
              {t.howItWorksTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">{t.howItWorksSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                ১
              </span>
              <h3 className="text-base font-semibold text-slate-900">{t.step1Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t.step1Desc}</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                ২
              </span>
              <h3 className="text-base font-semibold text-slate-900">{t.step2Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t.step2Desc}</p>
            </div>

            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center">
                ৩
              </span>
              <h3 className="text-base font-semibold text-slate-900">{t.step3Title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{t.step3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* প্রাতিষ্ঠানিক কল টু অ্যাকশন */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              এন্টারপ্রাইজ গ্রেড সেবা
            </span>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight">
              আপনার পরবর্তী প্রজেক্ট সম্পন্ন করতে প্রস্তুত?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              আজই আপনার অ্যাকাউন্ট তৈরি করুন, ওয়ালেটে ব্যালেন্স রিচার্জ করুন এবং মাত্র কয়েক মিনিটে যেকোনো ডিজিটাল সেবা অর্ডার করুন।
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              onClick={() => onNavigate('/services')}
              className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap text-center"
            >
              সেবা ক্যাটালগ দেখুন
            </button>
            <button
              onClick={() => {
                if (isAuthenticated) {
                  onNavigate('/dashboard/wallet');
                } else {
                  showToast({
                    type: 'info',
                    title: 'লগইন প্রয়োজন',
                    message: 'টাকা জমা করতে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন। অ্যাকাউন্ট না থাকলে নতুন অ্যাকাউন্ট তৈরি করুন।',
                  });
                  onNavigate('/login?redirect=%2Fdashboard%2Fwallet&reason=deposit');
                }
              }}
              className="w-full sm:w-auto px-6 py-3 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap text-center shadow-xs"
            >
              ওয়ালেটে টাকা জমা দিন
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
