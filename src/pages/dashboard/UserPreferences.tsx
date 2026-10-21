import React, { useState, useEffect } from 'react';
import { Bell, ShieldCheck, Mail, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { communicationService } from '../../services/communicationService';
import { UserNotificationPreferences } from '../../types/database';

export const UserPreferences: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const data = await communicationService.getUserPreferences(user.id);
        setPrefs(data);
      } catch {
        // Fallback default
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleToggle = (key: keyof Omit<UserNotificationPreferences, 'user_id' | 'created_at' | 'updated_at'>) => {
    if (key === 'security_email') {
      showToast({
        type: 'warning',
        title: 'অপরিবর্তনীয় নিরাপত্তা নোটিফিকেশন',
        message: 'অ্যাকাউন্টের সুরক্ষার স্বার্থে নিরাপত্তা ইমেইল নোটিফিকেশন বন্ধ করা সম্ভব নয়।',
      });
      return;
    }
    if (!prefs) return;
    setPrefs({
      ...prefs,
      [key]: !prefs[key],
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !prefs) return;
    setSaving(true);
    try {
      const updated = await communicationService.updateUserPreferences(user.id, prefs);
      setPrefs(updated);
      showToast({
        type: 'success',
        title: 'পছন্দ সংরক্ষিত হয়েছে',
        message: 'আপনার ইমেইল বিজ্ঞপ্তি সংক্রান্ত পছন্দসমূহ সফলভাবে আপডেট করা হয়েছে।',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
        <span>বিজ্ঞপ্তি সেটিংস লোড হচ্ছে...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
          যোগাযোগ ও সেটিংস
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">বিজ্ঞপ্তি ও ইমেইল পছন্দসমূহ</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          আপনার অ্যাকাউন্টে কোন কোন বিষয়ের জন্য স্বয়ংক্রিয় ইমেইল নোটিফিকেশন পাবেন তা নিয়ন্ত্রণ করুন।
        </p>
      </div>

      {/* তথ্য ব্যানার */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3 text-indigo-950 text-xs">
        <Bell className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-indigo-900 block">ইন-অ্যাপ নোটিফিকেশন সেন্টার স্বতন্ত্রভাবে সচল</span>
          <p className="text-indigo-800 leading-relaxed">
            এখানে ইমেইল নোটিফিকেশন বন্ধ করলেও আপনার ড্যাশবোর্ডের অভ্যন্তরীণ বেল আইকন নোটিফিকেশন সেন্টারে সমস্ত অর্ডার, টাকা জমা ও সাপোর্টের তাৎক্ষণিক আপডেট যথারীতি সংরক্ষিত ও দৃশ্যমান থাকবে।
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 sm:p-6 space-y-5">
          {/* অর্ডার আপডেট */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-900 flex items-center gap-2 cursor-pointer" onClick={() => handleToggle('orders_email')}>
                <span>অর্ডার অগ্রগতি ও ফাইল ডেলিভারি ইমেইল</span>
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                অর্ডার নিশ্চিতকরণ, কাজ শুরু, কাজের রিভিশন আপডেট এবং সম্পূর্ণ ফাইল ডাউনলোডের নোটিফিকেশন ইমেইলে পাঠান।
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs?.orders_email ?? true}
              onClick={() => handleToggle('orders_email')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                prefs?.orders_email ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  prefs?.orders_email ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* ওয়ালেট ও টাকা জমা */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-900 flex items-center gap-2 cursor-pointer" onClick={() => handleToggle('deposits_email')}>
                <span>টাকা জমা ও ওয়ালেট লেনদেন ইমেইল</span>
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                বিকাশ, নগদ বা ব্যাংকের মাধ্যমে জমার অনুরোধ গ্রহণ, অ্যাডমিন অনুমোদন, বাতিলকরণ ও রিফান্ডের নিশ্চিতকরণ ইমেইল।
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs?.deposits_email ?? true}
              onClick={() => handleToggle('deposits_email')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                prefs?.deposits_email ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  prefs?.deposits_email ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* সহায়তা টিকিট */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-900 flex items-center gap-2 cursor-pointer" onClick={() => handleToggle('support_email')}>
                <span>সহায়তা ডেস্ক ও টিকিট বার্তা ইমেইল</span>
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                সাপোর্ট টিকিটে বিশেষজ্ঞ প্রতিনিধির উত্তর আসলে বা অতিরিক্ত তথ্য চাওয়া হলে তাৎক্ষণিক ইমেইল বার্তা।
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs?.support_email ?? true}
              onClick={() => handleToggle('support_email')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                prefs?.support_email ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  prefs?.support_email ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* সাধারণ অফার ও অ্যানাউন্সমেন্ট */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-100">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-slate-900 flex items-center gap-2 cursor-pointer" onClick={() => handleToggle('marketing_email')}>
                <span>সার্ভিস আপডেট ও সাধারণ ঘোষণা</span>
              </label>
              <p className="text-xs text-slate-500 leading-relaxed">
                নতুন সার্ভিস ক্যাটাগরি সংযোজন, বিশেষ ডিসকাউন্ট এবং প্ল্যাটফর্মের সাধারণ ঘোষণা সম্পর্কিত বার্তা।
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs?.marketing_email ?? false}
              onClick={() => handleToggle('marketing_email')}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                prefs?.marketing_email ? 'bg-indigo-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  prefs?.marketing_email ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* বাধ্যতামূলক নিরাপত্তা নোটিফিকেশন */}
          <div className="flex items-start justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-semibold text-slate-900">অ্যাকাউন্ট নিরাপত্তা ও সুরক্ষা সংক্রান্ত ইমেইল</span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                  বাধ্যতামূলক
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                পাসওয়ার্ড পরিবর্তন, একাউন্ট পুনরুদ্ধার লিংক, অননুমোদিত অ্যাক্সেস সতর্কতা ও গুরুত্বপূর্ণ নীতি পরিবর্তন সংক্রান্ত বার্তা। প্ল্যাটফর্ম নিরাপত্তার স্বার্থে এটি বন্ধ করা যায় না।
              </p>
            </div>
            <div className="flex items-center shrink-0">
              <div className="h-6 w-11 rounded-full bg-emerald-600 flex items-center justify-end px-1 opacity-70 cursor-not-allowed" title="বাধ্যতামূলক নিরাপত্তা যোগাযোগ">
                <div className="h-4 w-4 rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>প্রেরিত হবে: <strong className="font-mono text-slate-700">{user?.email}</strong></span>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>সংরক্ষণ হচ্ছে...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>পছন্দ সংরক্ষণ করুন</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
