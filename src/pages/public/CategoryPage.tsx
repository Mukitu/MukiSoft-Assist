import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, ArrowRight, AlertTriangle, ExternalLink } from 'lucide-react';
import { toBengaliDigits, toBengaliCurrency } from '../../lib/i18n';
import { api } from '../../services/api';
import { ServiceCategory, ServiceItem } from '../../types/database';
import { getCategoryIcon } from './HomePage';

interface CategoryPageProps {
  categorySlug: string;
  onNavigate: (path: string) => void;
}

export const CategoryPage: React.FC<CategoryPageProps> = ({ categorySlug, onNavigate }) => {
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const cat = await api.getCategoryBySlug(categorySlug);
        if (cat) {
          setCategory(cat);
          const srvs = await api.getServices(cat.id);
          setServices(srvs);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [categorySlug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-48 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">সেবার বিভাগ পাওয়া যায়নি</h2>
        <p className="text-xs text-slate-500">অনুরোধকৃত সেবার বিভাগটি বিদ্যমান নেই অথবা স্থগিত রয়েছে।</p>
        <button
          onClick={() => onNavigate('/services')}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
        >
          ক্যাটালগে ফিরে যান
        </button>
      </div>
    );
  }

  const Icon = getCategoryIcon(category.icon);
  const isGovCategory = category.slug === 'government-citizen-assistance';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* ব্যাক বাটন */}
      <button
        onClick={() => onNavigate('/services')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>সকল সেবার তালিকায় ফিরে যান</span>
      </button>

      {/* ক্যাটাগরি পরিচিতি হেডার */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-16 h-16 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Icon className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
            সেবা বিভাগ ০{toBengaliDigits(category.display_order)}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {category.name_bn || category.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
            {category.description_bn || category.description}
          </p>
        </div>
      </div>

      {/* সরকারি ও নাগরিক সহায়তা সেবার আইনি ডিসক্লেইমার */}
      {isGovCategory && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-amber-950 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-amber-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>জরুরি নাগরিক সহায়তা বিষয়ক আইনি বিজ্ঞপ্তি ও শর্তাবলি</span>
          </div>
          <p className="leading-relaxed">
            MukiSoft Assist হলো <strong>মুকিসফট টেকনোলজি</strong> পরিচালিত একটি স্বাধীন ডিজিটাল সেবা প্ল্যাটফর্ম। আমরা কোনো সরকারি সংস্থা নই এবং কোনো ধরনের সরকারি অনুমোদন বা দ্রুত পাওয়ার নিশ্চয়তা প্রদান করি না।
          </p>
          <p className="leading-relaxed">
            এই ক্যাটাগরির আওতায় প্রদর্শিত প্রতিটি ফি শুধুমাত্র আমাদের <strong>কাগজপত্র প্রস্তুতকরণ, ফরম্যাটিং, অনলাইন পোর্টাল আবেদন নির্দেশিকা ও পরামর্শমূলক সহায়তার ফি</strong>। যেকোনো প্রাতিষ্ঠানিক বা সরকারি রাজস্ব ফি, ট্রেজারি চালান বা স্ট্যাম্প ডিউটি সরাসরি সংশ্লিষ্ট সরকারি পোর্টালের মাধ্যমেই প্রদান করতে হবে।
          </p>
          <div className="pt-2 flex flex-wrap gap-4 text-xs font-medium">
            <a
              href="https://services.nidw.gov.bd"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 underline"
            >
              <span>জাতীয় পরিচয়পত্র (NID) সেবা পোর্টাল</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://bdris.gov.bd"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 underline"
            >
              <span>জন্ম ও মৃত্যু নিবন্ধন পোর্টাল</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://epassport.gov.bd"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 underline"
            >
              <span>ই-পাসপোর্ট অনলাইন পোর্টাল</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* ক্যাটাগরির অধীনে থাকা সেবাসমূহ */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-6">
          এই বিভাগের অন্তর্ভুক্ত সেবাসমূহ ({toBengaliDigits(services.length)})
        </h2>

        {services.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
            বর্তমানে এই ক্যাটাগরিতে কোনো সেবা প্রদর্শিত নেই।
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      {toBengaliDigits(service.delivery_days)} দিনের মধ্যে ডেলিভারি
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
                    <span className="text-[11px] text-slate-500 block">নির্ধারিত ফি</span>
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
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <span>বিস্তারিত দেখুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
