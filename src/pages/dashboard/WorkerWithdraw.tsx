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

  const [balance, setBalance] = useState<number>(() => {
    if (!user) return 0;
    try {
      const raw = localStorage.getItem('mukisoft_demo_worker_withdrawable_balances');
      if (raw) {
        const parsed = JSON.parse(raw);
        const b = parsed[user.id] || (user.email ? parsed[user.email] : 0) || 0;
        return Number(b) || 0;
      }
    } catch {}
    return 0;
  });
  const [payoutAccount, setPayoutAccount] = useState<PayoutAccount>(() => {
    if (user) {
      try {
        const raw = localStorage.getItem('mukisoft_demo_payout_accounts');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed[user.id]) return parsed[user.id];
        }
      } catch {}
    }
    return {
      user_id: user?.id || '',
      method: 'bkash',
      account_number: '',
      updated_at: new Date().toISOString(),
    };
  });
  const [withdrawHistory, setWithdrawHistory] = useState<WithdrawalRequest[]>(() => {
    if (!user) return [];
    try {
      const raw = localStorage.getItem('mukisoft_demo_withdrawal_requests');
      if (raw) {
        const parsed: WithdrawalRequest[] = JSON.parse(raw);
        return parsed.filter((r) => r.user_id === user.id);
      }
    } catch {}
    return [];
  });
  const [completedOrders, setCompletedOrders] = useState<
    { order: any; commission: number; rate: number; companyShare?: number; companyRate?: number }[]
  >([]);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');

  const [savingAccount, setSavingAccount] = useState(false);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const [bal, acc, reqs, doneOrders] = await Promise.all([
        api.getUserWithdrawableBalance(user.id, user.email),
        api.getPayoutAccount(user.id),
        api.getWithdrawalRequests(),
        api.getWorkerCompletedOrders(user.id, user.email),
      ]);

      setBalance(bal);
      if (acc) setPayoutAccount(acc);
      setWithdrawHistory(reqs.filter((r) => r.user_id === user.id));
      setCompletedOrders(doneOrders);
    } catch (err) {
      console.warn('Load withdraw page error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('orders_updated', handleUpdate);
    window.addEventListener('wallet_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('orders_updated', handleUpdate);
      window.removeEventListener('wallet_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
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

  const [cancellingRequest, setCancellingRequest] = useState(false);

  const handleCancelPendingRequest = async (reqId: string) => {
    if (!user) return;
    setCancellingRequest(true);
    try {
      await api.cancelWithdrawalRequest(reqId, user.id);
      showToast({
        type: 'success',
        title: 'আবেদন বাতিল করা হয়েছে',
        message: 'উইথড্র রিকোয়েস্টটি সফলভাবে বাতিল করা হয়েছে এবং টাকা আপনার ব্যালেন্সে ফিরিয়ে দেওয়া হয়েছে।',
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'আবেদন বাতিল করতে ব্যর্থ';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setCancellingRequest(false);
    }
  };

  const totalEarnedCommission = completedOrders.reduce((sum, item) => sum + item.commission, 0);
  const totalWithdrawnAmount = withdrawHistory.filter((w) => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0);
  const pendingRequest = withdrawHistory.find((w) => w.status === 'pending');
  const hasPendingRequest = !!pendingRequest;

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

      {/* ব্যালেন্স ও সামারি কার্ডস */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-indigo-300">
              উত্তোলনযোগ্য ব্যালেন্স
            </span>
            <Wallet className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight">
            {toBengaliCurrency(balance)}
          </div>
          <p className="text-[11px] text-slate-300">
            বর্তমানে আপনি এই অর্থ ক্যাশআউট করতে পারবেন।
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-700">
              সর্বমোট অর্জিত কমিশন
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
            {toBengaliCurrency(totalEarnedCommission || balance)}
          </div>
          <p className="text-[11px] text-slate-500">
            মোট {toBengaliDigits(completedOrders.length)}টি গৃহীত ও সম্পন্ন কাজের কমিশন।
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-purple-700">
              মোট উত্তোলিত টাকা
            </span>
            <Building className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-slate-900">
            {toBengaliCurrency(totalWithdrawnAmount)}
          </div>
          <p className="text-[11px] text-slate-500">
            সুপার অ্যাডমিন কর্তৃক সফলভাবে অনুমোদিত উইথড্র।
          </p>
        </div>
      </div>

      {/* উইথড্র সাবমিশন ফর্ম */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>টাকা উত্তোলনের অনুরোধ জমা দিন</span>
          </h3>

          {hasPendingRequest && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  আপনার <strong>{toBengaliCurrency(pendingRequest.amount)}</strong> উত্তোলনের একটি আবেদন ইতিমধ্যেই প্রসেসিং অপেক্ষমাণ রয়েছে।
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCancelPendingRequest(pendingRequest.id)}
                disabled={cancellingRequest}
                className="px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-lg transition-colors shrink-0"
              >
                {cancellingRequest ? 'বাতিল হচ্ছে...' : 'আবেদন বাতিল করুন ও টাকা ফেরত নিন'}
              </button>
            </div>
          )}

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
                  disabled={hasPendingRequest}
                  className="w-full px-3.5 py-2.5 text-sm font-mono bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                  required
                />
                <button
                  type="button"
                  disabled={hasPendingRequest}
                  onClick={() => setWithdrawAmount(String(balance))}
                  className="absolute right-2 top-2 px-2.5 py-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                >
                  সর্বোচ্চ (All)
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingWithdraw || balance <= 0 || hasPendingRequest}
              className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm active:scale-98 disabled:opacity-50"
            >
              {submittingWithdraw
                ? 'রিকোয়েস্ট পাঠানো হচ্ছে...'
                : hasPendingRequest
                ? 'আগের উইথড্র আবেদন প্রসেসিংাধীন রয়েছে'
                : 'উইথড্র রিকোয়েস্ট পাঠান'}
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

      {/* আমার গৃহীত ও সম্পন্নকৃত কাজ এবং উপার্জিত কমিশন বিবরণ */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden space-y-4">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">আমার গৃহীত ও সম্পন্নকৃত কাজ এবং উপার্জিত কমিশন বিবরণ</h3>
            <p className="text-[11px] text-slate-500">কোম্পানির কমিশন অংশ বাদ দিয়ে প্রতিটি অর্ডারের আপনার নিট কমিশন সরাসরি ব্যালেন্সে যুক্ত হয়</p>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 self-start sm:self-auto">
            মোট কাজ: {toBengaliDigits(completedOrders.length)}টি
          </span>
        </div>

        {completedOrders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">এখন পর্যন্ত কোনো কাজের রেকর্ড নেই</p>
            <p>পেন্ডিং কিউ থেকে যেকোনো কাজ গ্রহণ (এক্সেপ্ট) করলেই তার নির্ধারিত নিট কমিশন আপনার ব্যালেন্সে যোগ হবে এবং এখানে বিস্তারিত দেখা যাবে।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">অর্ডার নম্বর</th>
                  <th className="py-3 px-4 font-medium">সার্ভিস নাম</th>
                  <th className="py-3 px-4 font-medium">মোট বাজেট</th>
                  <th className="py-3 px-4 font-medium">কোম্পানির অংশ (বাদ)</th>
                  <th className="py-3 px-4 font-medium">আপনার নিট উপার্জন</th>
                  <th className="py-3 px-4 font-medium">কাজের অবস্থা</th>
                  <th className="py-3 px-4 font-medium">ব্যালেন্স অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {completedOrders.map((item) => {
                  const ord = item.order;
                  const cShare = item.companyShare ?? (ord.amount - item.commission);
                  const cRate = item.companyRate ?? (100 - item.rate);
                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        #{ord.order_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800">
                        {ord.service?.title_bn || ord.service?.title || 'সার্ভিস অর্ডার'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {toBengaliCurrency(ord.amount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-600 font-medium">
                        -{toBengaliCurrency(cShare)} ({toBengaliDigits(cRate)}%)
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-emerald-600 text-sm">
                        +{toBengaliCurrency(item.commission)} ({toBengaliDigits(item.rate)}%)
                      </td>
                      <td className="py-3 px-4">
                        {ord.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> সম্পন্ন
                          </span>
                        ) : ord.status === 'delivered' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800">
                            <Clock className="w-3 h-3 text-cyan-600" /> ডেলিভারিকৃত
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" /> গৃহীত ও চলমান
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ব্যালেন্সে যুক্ত
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
                  <th className="py-3 px-4 font-medium text-right">অ্যাকশন</th>
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
                    <td className="py-3 px-4 text-right">
                      {w.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => handleCancelPendingRequest(w.id)}
                          disabled={cancellingRequest}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
                        >
                          বাতিল করুন
                        </button>
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
