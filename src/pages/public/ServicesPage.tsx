import React, { useState, useEffect } from 'react';
import { Search, Clock, ArrowRight, Filter, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { toBengaliDigits, toBengaliCurrency } from '../../lib/i18n';
import { api } from '../../services/api';
import { ServiceCategory, ServiceItem } from '../../types/database';

interface ServicesPageProps {
  onNavigate: (path: string) => void;
  initialQuery?: string;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigate, initialQuery = '' }) => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>(initialQuery);
  const [sortBy, setSortBy] = useState<'default' | 'price_low' | 'price_high' | 'fastest'>('default');
  const [showActiveOnly, setShowActiveOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cats, srvs] = await Promise.all([api.getCategories(), api.getServices()]);
        setCategories(cats);
        setServices(srvs);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = services
    .filter((srv) => {
      const matchesCategory = selectedCategory === 'all' || srv.category_id === selectedCategory;
      const matchesActive = !showActiveOnly || srv.is_active;
      const matchesSearch =
        !search.trim() ||
        srv.title.toLowerCase().includes(search.toLowerCase()) ||
        srv.title_bn.includes(search) ||
        srv.description.toLowerCase().includes(search.toLowerCase()) ||
        srv.description_bn.includes(search);
      return matchesCategory && matchesSearch && matchesActive;
    })
    .sort((a, b) => {
      const priceA = a.promotional_price ?? a.price;
      const priceB = b.promotional_price ?? b.price;
      if (sortBy === 'price_low') return priceA - priceB;
      if (sortBy === 'price_high') return priceB - priceA;
      if (sortBy === 'fastest') return a.delivery_days - b.delivery_days;
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 sm:space-y-8">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-6">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          এন্টারপ্রাইজ ডিজিটাল মার্কেটপ্লেস
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">সকল সেবার ক্যাটালগ</h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed">
          আপনার ব্যবসার জন্য প্রয়োজনীয় ডকুমেন্ট তৈরি, ক্যারিয়ার প্রোফাইল অপ্টিমাইজেশন, ক্লাউড ডিএনএস সেটআপ এবং আইনি আবেদন সহায়তা সেবা স্বচ্ছ মূল্যে গ্রহণ করুন।
        </p>
      </div>

      {/* ফিল্টার, সার্চ ও সর্ট কন্ট্রোল */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        {/* সার্চ বক্স */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="সেবার নাম বা কি-ওয়ার্ড দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* সর্ট ও স্ট্যাটাস ফিল্টার */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">সাজান:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-transparent font-medium text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="default">ডিফল্ট ক্রম</option>
              <option value="price_low">মূল্য: কম থেকে বেশি</option>
              <option value="price_high">মূল্য: বেশি থেকে কম</option>
              <option value="fastest">দ্রুততম ডেলিভারি</option>
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-0"
            />
            <span>শুধু সক্রিয় সেবা</span>
          </label>
        </div>
      </div>

      {/* ক্যাটাগরি ফিল্টার বাটনসমূহ (মোবাইলে অনুভূমিক স্ক্রোলযোগ্য) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          সকল সেবা ({toBengaliDigits(services.length)})
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedCategory === c.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            {c.name_bn || c.name}
          </button>
        ))}
      </div>

      {/* সেবার তালিকা */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 space-y-3">
          <Filter className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">কোনো সেবা পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            আপনার সার্চ কি-ওয়ার্ড পরিবর্তন করুন অথবা ফিল্টার রিসেট করে পুনরায় চেষ্টা করুন।
          </p>
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('all');
              setShowActiveOnly(false);
              setSortBy('default');
            }}
            className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            ফিল্টার রিসেট করুন
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filtered.map((service) => {
            const isAvailable = service.is_active;
            return (
              <div
                key={service.id}
                className={`bg-white rounded-xl border p-5 sm:p-6 flex flex-col justify-between hover:shadow-md transition-shadow ${
                  isAvailable ? 'border-slate-200' : 'border-slate-200 bg-slate-50/70 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      {toBengaliDigits(service.delivery_days)} দিনের মধ্যে ডেলিভারি
                    </span>
                    {service.is_gov_service ? (
                      <span className="text-amber-800 font-medium text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        নাগরিক গাইডেন্স
                      </span>
                    ) : !isAvailable ? (
                      <span className="text-slate-500 text-[11px] bg-slate-200 px-2 py-0.5 rounded font-medium">
                        সাময়িক বন্ধ
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-base font-semibold text-slate-900 leading-snug">
                    {service.title_bn || service.title}
                  </h3>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {service.description_bn || service.description}
                  </p>

                  {service.is_gov_service && (
                    <div className="mt-3 p-2 rounded bg-amber-50/80 border border-amber-200 text-[11px] text-amber-900 leading-tight">
                      শুধুমাত্র প্ল্যাটফর্ম সেবা ফি। সরকারি রেজিস্ট্রেশন ফি আলাদা।
                    </div>
                  )}
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
            );
          })}
        </div>
      )}
    </div>
  );
};
