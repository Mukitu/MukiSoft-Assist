import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, CheckCircle2, AlertTriangle, MessageSquare, Trash2, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { SuspiciousChatFlag } from '../../types/database';

export const AdminFlaggedChats: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { showToast } = useNotification();
  const [flags, setFlags] = useState<SuspiciousChatFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [reviewNoteInput, setReviewNoteInput] = useState('');
  const [activeFlagModal, setActiveFlagModal] = useState<SuspiciousChatFlag | null>(null);

  const loadFlags = async () => {
    try {
      const data = await api.getSuspiciousChatFlags();
      setFlags(data);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'ফ্ল্যাগড রিপো রিপোর্ট লোড করা সম্ভব হয়নি' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const handleResolveFlag = async (status: 'reviewed' | 'action_taken') => {
    if (!activeFlagModal) return;
    try {
      await api.resolveSuspiciousChatFlag(activeFlagModal.id, status, reviewNoteInput.trim() || 'সুপার অ্যাডমিন কর্তৃক পর্যালোচিত');
      showToast({
        type: 'success',
        title: 'রিপোর্ট আপডেট সম্পন্ন',
        message: status === 'action_taken' ? 'ওয়ার্কার/অ্যাডমিনের বিরুদ্ধে সতর্কতা পদক্ষেপ নথিভুক্ত করা হয়েছে।' : 'রিপোর্টটি পর্যালোচিত হিসেবে চিহ্নিত করা হয়েছে।',
      });
      setActiveFlagModal(null);
      setReviewNoteInput('');
      loadFlags();
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'আপডেট করা সম্ভব হয়নি' });
    }
  };

  const filtered = flags.filter(
    (f) =>
      !search ||
      f.order_number.toLowerCase().includes(search.toLowerCase()) ||
      f.sender_name.toLowerCase().includes(search.toLowerCase()) ||
      f.message_content.toLowerCase().includes(search.toLowerCase()) ||
      f.matched_keyword.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 block">
            নিরাপত্তা ও পলিসি ভায়োলেশন মনিটরিং
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            সন্দেহজনক অফ-মার্কেট চ্যাট ফ্ল্যাগ রিপোর্ট
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            যে সকল ওয়ার্কার, অ্যাডমিন বা ক্লায়েন্ট সরাসরি ফোন নম্বর, হোয়াটসঅ্যাপ বা প্ল্যাটফর্মের বাইরে লেনদেনের চেষ্টা করেছেন তাদের অটো-ফ্ল্যাগড বার্তা।
          </p>
        </div>

        <div className="text-xs bg-rose-50 text-rose-800 px-3 py-1.5 rounded-lg border border-rose-200 font-bold self-start sm:self-auto">
          মোট {flags.filter((f) => f.status === 'pending').length}টি অমীমাংসিত রিপোর্ট
        </div>
      </div>

      {/* সার্চ */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="অর্ডার নম্বর, প্রেরকের নাম বা কিওয়ার্ড খুঁজুন..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500"
        />
      </div>

      {/* টেবিল */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">রিপোর্ট লোড হচ্ছে...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-800 text-sm">কোনো সন্দেহজনক বার্তা পাওয়া যায়নি</p>
            <p>আমাদের AI সিস্টেম প্রতিনিয়ত সকল চ্যাট মনিটর করছে।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium">অর্ডার নম্বর</th>
                  <th className="py-3 px-4 font-medium">প্রেরক ও ভূমিকা</th>
                  <th className="py-3 px-4 font-medium">শনাক্তকৃত কিওয়ার্ড</th>
                  <th className="py-3 px-4 font-medium">সন্দেহজনক বার্তা</th>
                  <th className="py-3 px-4 font-medium">অবস্থা</th>
                  <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((flag) => (
                  <tr key={flag.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">{toBengaliDate(flag.created_at)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{flag.order_number}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 block">{flag.sender_name}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-slate-100 rounded text-slate-600 border border-slate-200">
                        {flag.sender_role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-rose-800 bg-rose-100 border border-rose-200 text-[11px]">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>"{flag.matched_keyword}"</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[260px] truncate text-slate-800 font-mono text-[11px]">
                      "{flag.message_content}"
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          flag.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : flag.status === 'action_taken'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {flag.status === 'pending' ? 'অপেক্ষা' : flag.status === 'action_taken' ? 'অ্যাকশন গৃহীত' : 'পর্যালোচিত'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveFlagModal(flag);
                          setReviewNoteInput(flag.admin_notes || '');
                        }}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded text-xs transition-colors"
                      >
                        পরীক্ষা করুন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* মডাল */}
      {activeFlagModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                সন্দেহজনক বার্তা তদন্ত
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                অর্ডার #{activeFlagModal.order_number}
              </h3>
            </div>

            <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-xl text-xs space-y-2 text-rose-900">
              <div className="flex justify-between">
                <span className="text-rose-700 font-medium">প্রেরক:</span>
                <span className="font-bold">{activeFlagModal.sender_name} ({activeFlagModal.sender_role})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-700 font-medium">শনাক্তকৃত পলিসি কিওয়ার্ড:</span>
                <span className="font-mono font-bold bg-rose-200 px-1.5 py-0.5 rounded">"{activeFlagModal.matched_keyword}"</span>
              </div>
              <div className="pt-2 border-t border-rose-200">
                <span className="font-semibold block mb-1">প্রেরিত সম্পূর্ণ মেসেজ:</span>
                <p className="p-2.5 bg-white rounded border border-rose-200 font-mono text-slate-800 text-[11px] whitespace-pre-wrap">
                  {activeFlagModal.message_content}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-slate-700">সুপার অ্যাডমিন তদন্ত মন্তব্য / অ্যাকশন নোট</label>
              <textarea
                rows={2}
                value={reviewNoteInput}
                onChange={(e) => setReviewNoteInput(e.target.value)}
                placeholder="যেমন: ওয়ার্কারকে সরাসরি ফোন নম্বর না দিয়ে প্ল্যাটফর্মে কথা বলার জন্য ফার্স্ট ওয়ার্নিং নোটিশ দেওয়া হলো।"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveFlagModal(null)}
                className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800 text-xs"
              >
                বন্ধ করুন
              </button>
              <button
                type="button"
                onClick={() => handleResolveFlag('reviewed')}
                className="px-4 py-2 font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs transition-colors"
              >
                সাধারণ রিভিউ
              </button>
              <button
                type="button"
                onClick={() => handleResolveFlag('action_taken')}
                className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl text-xs transition-colors shadow-xs"
              >
                অ্যাকশন নথিভুক্ত করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
