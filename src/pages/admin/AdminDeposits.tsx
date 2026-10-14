import React, { useState, useEffect } from 'react';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { DepositRequest } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminDeposits: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const data = await api.getAllDepositRequests();
      setRequests(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleApprove = async (depositId: string, amount: number) => {
    if (!user) return;
    setProcessingId(depositId);
    try {
      const result = await api.approveDeposit(depositId, user.id, 'ব্যাংকিং স্টেটমেন্ট অনুযায়ী যাচাইকৃত');
      showToast({
        type: 'success',
        title: 'জমা অনুমোদন সম্পন্ন',
        message: `${toBengaliCurrency(amount)} সফলভাবে গ্রাহকের ওয়ালেটে যোগ হয়েছে। বর্তমান ব্যালেন্স: ${toBengaliCurrency(result.newBalance)}।`,
      });

      // লোকাল স্টেট আপডেট
      setRequests((prev) =>
        prev.map((r) => (r.id === depositId ? { ...r, status: 'approved', reviewed_by: user.id } : r))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুমোদন ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (depositId: string) => {
    if (!user) return;
    const reason = window.prompt('প্রত্যাখ্যানের সুনির্দিষ্ট কারণ লিখুন (যেমন: ব্যাংক স্টেটমেন্টে ট্রানজ্যাকশন আইডি মেলেনি):');
    if (!reason) return;

    setProcessingId(depositId);
    try {
      await api.rejectDeposit(depositId, user.id, reason);
      showToast({
        type: 'info',
        title: 'জমা প্রত্যাখ্যাত হয়েছে',
        message: 'অনুরোধটি প্রত্যাখ্যাত হিসেবে চিহ্নিত করা হয়েছে।',
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === depositId ? { ...r, status: 'rejected', admin_notes: reason } : r))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'প্রত্যাখ্যান ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            ট্রেজারি ও আর্থিক যাচাইকরণ
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">টাকা জমার অনুরোধ যাচাই</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            গ্রাহকের ব্যাংক ও মোবাইল পেমেন্ট স্টেটমেন্ট মেলান। অনুমোদনের সাথে সাথে অটমিকভাবে ওয়ালেটে টাকা যুক্ত হবে।
          </p>
        </div>

        <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold self-start sm:self-auto">
          {toBengaliDigits(pendingCount)}টি অনুরোধ যাচাইয়ের অপেক্ষায়
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">জমার অনুরোধ লোড হচ্ছে...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="font-semibold text-slate-800 text-sm">অনুরোধের তালিকা খালি</p>
            <p>সকল গ্রাহকের রিচার্জ প্রক্রিয়া সম্পন্ন হয়েছে।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium">গ্রাহক</th>
                  <th className="py-3 px-4 font-medium">পদ্ধতি</th>
                  <th className="py-3 px-4 font-medium">প্রেরকের নম্বর</th>
                  <th className="py-3 px-4 font-medium">TrxID / রেফারেন্স</th>
                  <th className="py-3 px-4 font-medium text-right">পরিমাণ</th>
                  <th className="py-3 px-4 font-medium">অবস্থা</th>
                  <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(req.created_at)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 font-mono text-[11px]">
                      {req.profile?.email || req.user_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{req.payment_method}</td>
                    <td className="py-3 px-4 font-mono">{req.sender_account}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{req.transaction_reference}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {toBengaliCurrency(req.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(req.id, req.amount)}
                            disabled={processingId === req.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors"
                            title="অনুমোদন করুন ও ওয়ালেটে টাকা যোগ করুন"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>অনুমোদন</span>
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={processingId === req.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded text-xs transition-colors border border-rose-200"
                            title="অনুরোধ বাতিল করুন"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>বাতিল</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">
                          {req.admin_notes || 'যাচাইকৃত'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
