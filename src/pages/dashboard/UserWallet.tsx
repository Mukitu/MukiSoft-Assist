import React, { useState, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Wallet, WalletTransaction, DepositRequest, PlatformSettings } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';

export const UserWallet: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);

  // ফর্ম স্টেট
  const [amount, setAmount] = useState<number>(1000);
  const [paymentMethod, setPaymentMethod] = useState<'bKash' | 'Nagad' | 'Bank_Transfer'>('bKash');
  const [senderAccount, setSenderAccount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [w, txs, deps, s] = await Promise.all([
        api.getWallet(user.id),
        api.getWalletTransactions(user.id),
        api.getAllDepositRequests(),
        api.getSettings(),
      ]);
      setWallet(w);
      setTransactions(txs);
      setDepositRequests(deps.filter((d) => d.user_id === user.id));
      setSettings(s);
    }
    load();
  }, [user]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (amount < 100) {
      showToast({ type: 'error', title: 'ন্যূনতম জমার পরিমাণ', message: 'ন্যূনতম জমার পরিমাণ ১০০ টাকা।' });
      return;
    }
    if (!senderAccount.trim() || !transactionRef.trim()) {
      showToast({ type: 'error', title: 'আবশ্যক ঘর পূরণ করুন', message: 'প্রেরকের অ্যাকাউন্ট এবং ট্রানজ্যাকশন আইডি দেওয়া আবশ্যক।' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newReq = await api.submitDepositRequest({
        userId: user.id,
        amount,
        paymentMethod,
        senderAccount,
        transactionReference: transactionRef,
        slipUrl,
      });

      showToast({
        type: 'success',
        title: 'জমার অনুরোধ জমা হয়েছে',
        message: 'আপনার টাকা জমার অনুরোধটি অ্যাডমিন যাচাইকরণের তালিকায় যোগ করা হয়েছে।',
      });

      setDepositRequests((prev) => [newReq, ...prev]);
      setTransactionRef('');
      setSenderAccount('');
      setSlipUrl('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'জমার অনুরোধ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* শিরোনাম */}
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
          অ্যাকাউন্ট ফাইন্যান্সিয়াল
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">ওয়ালেট ও লেজার ব্যবস্থাপনা</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          আপনার অ্যাকাউন্টে টাকা জমা দিন, পূর্ববর্তী ট্রানজ্যাকশন যাচাই করুন এবং অপরিবর্তনীয় আর্থিক হিসাব দেখুন।
        </p>
      </div>

      {/* ৪টি আর্থিক মেট্রিক কার্ড */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">বর্তমান ব্যালেন্স</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(wallet?.balance ?? 0)}
          </div>
          <div className="text-[11px] text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>অর্ডারের জন্য প্রস্তুত</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">অপেক্ষমাণ জমার অনুরোধ</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(wallet?.pending_balance ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500">অনুমোদনের অপেক্ষায়</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">সর্বমোট জমা</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(wallet?.total_deposited ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500">লাইফটাইম ওয়ালেট রিচার্জ</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">সর্বমোট খরচ</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(wallet?.total_spent ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500">সেবা ক্রয়ে ব্যয়িত</div>
        </div>
      </div>

      {/* টাকা জমার ফর্ম */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">ওয়ালেটে টাকা জমা দিন</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            নিচের যেকোনো একটি পেমেন্ট মাধ্যমে টাকা ট্রান্সফার করুন। এরপর প্রেরকের অ্যাকাউন্ট ও ট্রানজ্যাকশন আইডি দিয়ে ফর্মটি সাবমিট করুন। অ্যাডমিন যাচাইয়ের পর আপনার ওয়ালেটে ব্যালেন্স যুক্ত হবে।
          </p>
        </div>

        {/* পেমেন্ট মেথড নির্বাচন */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['bKash', 'Nagad', 'Bank_Transfer'] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`p-4 rounded-xl border text-left transition-all ${
                paymentMethod === method
                  ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                {method === 'Bank_Transfer' ? 'সিটি ব্যাংক (Bank Transfer)' : method === 'bKash' ? 'বিকাশ (bKash)' : 'নগদ (Nagad)'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {method === 'Bank_Transfer' ? 'NPSB / BEFTN ট্রান্সফার' : 'মার্চেন্ট / পেমেন্ট নম্বর'}
              </div>
            </button>
          ))}
        </div>

        {/* নির্দেশিকা বক্স */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
          <div className="font-semibold text-slate-800 uppercase tracking-wider text-[11px]">
            {paymentMethod === 'Bank_Transfer' ? 'ব্যাংক ট্রান্সফার' : paymentMethod === 'bKash' ? 'বিকাশ' : 'নগদ'} পেমেন্ট নির্দেশিকা
          </div>

          {paymentMethod === 'Bank_Transfer' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">ব্যাংকের নাম:</span>
                <span className="font-semibold text-slate-900">The City Bank PLC</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">অ্যাকাউন্টের নাম:</span>
                <span className="font-semibold text-slate-900">MukiSoft Technology Ltd.</span>
              </div>
              <div className="flex items-center justify-between pr-4">
                <div>
                  <span className="text-slate-400 block text-[11px]">অ্যাকাউন্ট নম্বর:</span>
                  <span className="font-mono font-bold text-slate-900">11002233445566</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('11002233445566', 'bank_acc')}
                  className="text-indigo-600 hover:text-indigo-800 p-1"
                  aria-label="অ্যাকাউন্ট নম্বর কপি করুন"
                >
                  {copiedKey === 'bank_acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">রাউটিং নম্বর:</span>
                <span className="font-mono font-medium text-slate-900">085272183</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">অফিসিয়াল {paymentMethod === 'bKash' ? 'বিকাশ' : 'নগদ'} মার্চেন্ট নম্বর:</span>
                <span className="text-sm font-bold font-mono text-slate-900">01700-000000</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">মার্চেন্ট অপশন সিলেক্ট করে পেমেন্ট করুন</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('01700000000', 'mobile_no')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50"
              >
                {copiedKey === 'mobile_no' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'mobile_no' ? 'কপি হয়েছে' : 'নম্বর কপি করুন'}</span>
              </button>
            </div>
          )}
        </div>

        {/* ফর্ম ফিল্ডস */}
        <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                জমার পরিমাণ (টাকা) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={100}
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-2.5 font-mono font-bold text-sm bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                আপনার প্রেরক মোবাইল / ব্যাংক অ্যাকাউন্ট <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={senderAccount}
                onChange={(e) => setSenderAccount(e.target.value)}
                placeholder="যেমন: 017xxxxxxxx"
                className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ট্রানজ্যাকশন আইডি / রেফারেন্স (TrxID) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="যেমন: BL9A7K21X"
                className="w-full p-2.5 font-mono uppercase bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-slate-500">
              অনুমোদনের সাথে সাথে স্বয়ংক্রিয়ভাবে ব্যালেন্স যোগ হবে এবং নোটিফিকেশন প্রদান করা হবে।
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'জমার অনুরোধ জমা দিন'}
            </button>
          </div>
        </form>
      </div>

      {/* প্রেরিত জমার অনুরোধসমূহের তালিকা */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm">আপনার টাকা জমার অনুরোধসমূহ</h3>
          <p className="text-xs text-slate-500 mt-0.5">পাঠানো সকল জমার অনুরোধের স্ট্যাটাস</p>
        </div>

        {depositRequests.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">এখনও কোনো জমার অনুরোধ পাঠানো হয়নি।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium">পদ্ধতি</th>
                  <th className="py-3 px-4 font-medium">প্রেরকের নম্বর</th>
                  <th className="py-3 px-4 font-medium">TrxID / রেফারেন্স</th>
                  <th className="py-3 px-4 font-medium text-right">পরিমাণ</th>
                  <th className="py-3 px-4 font-medium">অবস্থা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {depositRequests.map((dep) => (
                  <tr key={dep.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(dep.created_at)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{dep.payment_method}</td>
                    <td className="py-3 px-4 font-mono">{dep.sender_account}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{dep.transaction_reference}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {toBengaliCurrency(dep.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={dep.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* সম্পূর্ণ লেনদেন লেজার */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm">অপরিবর্তনীয় লেনদেন লেজার</h3>
          <p className="text-xs text-slate-500 mt-0.5">ডেটাবেজে সংরক্ষিত প্রতিটি ডেবিট ও ক্রেডিটের তালিকা</p>
        </div>

        {transactions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">কোনো লেজার রেকর্ড নেই।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">আইডি</th>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium">বিবরণ</th>
                  <th className="py-3 px-4 font-medium">ধরন</th>
                  <th className="py-3 px-4 font-medium text-right">পরিমাণ</th>
                  <th className="py-3 px-4 font-medium text-right">ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{tx.id.substring(0, 8)}...</td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(tx.created_at)}
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{tx.description}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize text-slate-600">
                        {tx.type === 'deposit'
                          ? 'টাকা জমা'
                          : tx.type === 'service_purchase'
                          ? 'সেবা ক্রয়'
                          : 'সমন্বয়'}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-semibold ${
                        tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-800'
                      }`}
                    >
                      {tx.amount >= 0 ? `+${toBengaliCurrency(tx.amount)}` : `-${toBengaliCurrency(Math.abs(tx.amount))}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {toBengaliCurrency(tx.balance_after)}
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
