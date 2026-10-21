import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { StatusBadge } from '../../components/common/StatusBadge';

import { api } from '../../services/api';

export const UserProfile: React.FC = () => {
  const { user, profile, role, refreshProfile } = useAuth();
  const { showToast } = useNotification();

  const [fullName, setFullName] = useState(profile?.full_name || user?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api.updateProfile(user.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      await refreshProfile();
      showToast({
        type: 'success',
        title: 'সেটিংস সংরক্ষিত হয়েছে',
        message: 'আপনার প্রোফাইলের তথ্য সফলভাবে আপডেট করা হয়েছে।',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সংরক্ষণ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
          অ্যাকাউন্ট সেটিংস
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">প্রোফাইল ও নিরাপত্তা</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          আপনার ব্যক্তিগত নাম, মোবাইল নম্বর এবং অ্যাকাউন্ট বিবরণী পরিচালনা করুন।
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ইমেইল ঠিকানা</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono cursor-not-allowed"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              প্রাথমিক ইমেইল Supabase Auth দ্বারা সুরক্ষিত ও অপরিবর্তনীয়।
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">অ্যাকাউন্টের বর্তমান ভূমিকা</label>
            <div className="flex items-center gap-3">
              <StatusBadge status={role} />
              <span className="text-xs text-slate-600">
                {role === 'super_admin'
                  ? 'সুপার অ্যাডমিনিস্ট্রেটর (পূর্ণ নিয়ন্ত্রণ)'
                  : role === 'admin'
                  ? 'অপারেশনাল অ্যাডমিন'
                  : 'সাধারণ গ্রাহক অ্যাকাউন্ট'}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">পূর্ণ নাম / প্রাতিষ্ঠানিক নাম</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+880 17xxxxxxxx"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">ইন্টারফেস ভাষা</label>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium">
              বাংলা (Bengali - প্রাথমিক ভাষা)
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'পরিবর্তন সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
