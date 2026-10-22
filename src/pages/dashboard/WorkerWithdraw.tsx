import React, { useState, useEffect } from 'react';
import { Wallet, Send, CreditCard, Clock, CheckCircle2, AlertCircle, Building, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { PayoutAccount, WithdrawalRequest } from '../../types/database';
import { toBengaliCurrency, toBengaliDate, toBengaliDigits } from '../../lib/i18n';
import { StatusBadge } from '../../components/common/StatusBadge';

export const WorkerWithdraw: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useNotification();

  const [balance, setBalance] = useState<number>(0);
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount>({
    user_id: user?.id || '',
    method: 'bkash',
    account_number: '',
    updated_at: new Date().toISOString(),
  });
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawalRequest[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');

  const [savingAccount, setSavingAccount] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [bal, acc, reqs] = await Promise.all([
        api.getUserWithdrawableBalance(user.id),
        api.getPayoutAccount(user.id),
        api.getWithdrawalRequests(),
      ]);

      setBalance(bal);
      if (acc) setPayoutAccount(acc);
      setWithdrawHistory(reqs.filter((r) => r.user_id === user.id));
    } catch (err) {
      console.warn('Load withdraw page error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!payoutAccount.account_number.trim()) {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'পেমেন্ট গ্রহণের মোবাইল নম্বর বা একাউন্ট নম্বর দিন।' });
      return;
    }

    setSavingAccount(true);
    try {
      await api.savePayoutAccount({
        ...payoutAccount,
        user_id: user.id,
      });
      showToast({ type: 'success', title: 'পেমেন্ট তথ্য সেভ হয়েছে', message: 'উইথড্র অ্যাকাউন্ট সফলভাবে সংরক্ষণ করা হয়েছে।' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অ্যাকাউন্ট সেভ করতে ব্যর্থ';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSavingAccount(false);
    }
  };

  const handleSubmitWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'সঠিক উত্তোলনের পরিমাণ উল্লেখ করুন।' });
      return;
    }

    if (!payoutAccount.account_number.trim()) {
      showToast({ type: 'error', title: 'অ্যাকাউন্ট যোগ করুন', message: 'উইথড্র রিকোয়েস্ট দেওয়ার আগে নিচে আপনার পেমেন্ট নম্বরটি সেভ করুন।' });
      return;
    }

    if (amt > balance) {
      showToast({ type: 'error', title: 'পর্যাপ্ত ব্যালেন্স নেই', message: 'আপনার বর্তমান উপার্জিত ব্যালেন্সের চেয়ে বেশি উইথড্র দেওয়া সম্ভব নয়।' });
      return;
    }

    setSubmittingWithdraw(true);
    try {
      const role = profile?.role === 'worker' ? 'worker' : 'admin';
      await api.submitWithdrawalRequest(
        user.id,
        profile?.full_name || user.email.split('@')[0],
        user.email,
        role,
        amt,
        payoutAccount
      );

      showToast({ type: 'success', title: 'উইথড্র রিকোয়েস্ট প্রেরিত! 💸', message: 'আপনার উত্তোলনের আবেদনটি সুপার অ্যাডমিন প্যানেলে জমা হয়েছে।' });
      setWithdrawAmount('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'উইথড্র রিকোয়েস্ট সাবমিট করতে সমস্যা হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* পেজ হেডার */}
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
          পারফরম্যান্স ইনকাম ও ক্যাশআউট
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          উপার্জিত অর্থ উত্তোলন (Payout)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          আপনার অর্ডারের কমিশন থেকে অর্জিত ব্যালেন্স সরাসরি বিকাশ, নগদ, রকেট বা ব্যাংকে উত্তোলন করুন।
        </p>
      </div>

      {/* ব্যালেন্স কার্ড */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-300">
              উপার্জিত উইথড্রএবল ব্যালেন্স
            </span>
            <Wallet className="w-5 h-5 text-indigo-400" />
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">
              {toBengaliCurrency(balance)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1">
              সম্পূর্ণকৃত অর্ডারের আপনার ৭০%-৮০% নিট কাজের কমিশন।
            </p>
          </div>
        </div>

        {/* উইথড্র সাবমিশন ফর্ম */}
        <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>টাকা উত্তোলনের অনুরোধ জমা দিন</span>
          </h3>

          <form onSubmit={handleSubmitWithdraw} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                উত্তোলনের পরিমাণ (টাকা)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={100}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="যেমন: 500"
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setWithdrawAmount(String(balance))}
                  className="absolute right-2 top-2 px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                >
                  সর্বোচ্চ (All)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingWithdraw || balance <= 0}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm active:scale-98 disabled:opacity-50"
            >
              {submittingWithdraw ? 'রিকোয়েস্ট পাঠানো হচ্ছে...' : 'উইথড্র রিকোয়েস্ট পাঠাতুন'}
            </button>
          </form>
        </div>
      </div>

      {/* অ্যাকাউন্ট কনফিগারেশন প্যানেল */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 max-w-2xl">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-600" />
          <span>আমার পেমেন্ট একাউন্ট সেটিংস</span>
        </h3>

        <form onSubmit={handleSaveAccount} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                পেমেন্ট মেথড
              </label>
              <select
                value={payoutAccount.method}
                onChange={(e) => setPayoutAccount({ ...payoutAccount, method: e.target.value as any })}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
              >
                <option value="bkash">bKash (বিকাশ পার্সোনাল)</option>
                <option value="nagad">Nagad (নগদ পার্সোনাল)</option>
                <option value="rocket">Rocket (রকেট পার্সোনাল)</option>
                <option value="bank">Bank Transfer (ব্যাংক অ্যাকাউন্ট)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                মোবাইল বা অ্যাকাউন্ট নম্বর
              </label>
              <input
                type="text"
                value={payoutAccount.account_number}
                onChange={(e) => setPayoutAccount({ ...payoutAccount, account_number: e.target.value })}
                placeholder="017xxxxxxxx বা ব্যাংক একাউন্ট নং"
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                required
              />
            </div>
          </div>

          {payoutAccount.method === 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ব্যাংকের নাম
                </label>
                <input
                  type="text"
                  value={payoutAccount.bank_name || ''}
                  onChange={(e) => setPayoutAccount({ ...payoutAccount, bank_name: e.target.value })}
                  placeholder="যেমন: DBBL / Islami Bank"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ব্রাঞ্চ নাম
                </label>
                <input
                  type="text"
                  value={payoutAccount.branch_name || ''}
                  onChange={(e) => setPayoutAccount({ ...payoutAccount, branch_name: e.target.value })}
                  placeholder="যেমন: Dhanmondi Branch"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={savingAccount}
            className="py-2 px-4 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            {savingAccount ? 'সেভ হচ্ছে...' : 'পেমেন্ট নম্বর আপডেট করুন'}
          </button>
        </form>
      </div>

      {/* পূর্ববর্তী উইথড্র হিস্ট্রি */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-4">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">আমার উইথড্র রিকোয়েস্ট হিস্ট্রি</h3>
        </div>

        {withdrawHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            এখন পর্যন্ত আপনার কোনো উইথড্র রিকোয়েস্ট নেই।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">উত্তোলনের পরিমাণ</th>
                  <th className="py-3 px-4 font-medium">পেমেন্ট মেথড & একাউন্ট</th>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium">স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-medium">নোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {withdrawHistory.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                      {toBengaliCurrency(w.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold uppercase text-indigo-600">{w.payout_account?.method}</span>
                      <span className="ml-1 font-mono text-slate-800">({w.payout_account?.account_number})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(w.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {w.admin_notes || 'প্রসেসিং অপেক্ষমাণ'}
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
