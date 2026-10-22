import React, { useState, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  CreditCard,
  CheckCircle2,
  Copy,
  Check,
  Info,
  Smartphone,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Wallet, WalletTransaction, DepositRequest, PaymentMethodConfig } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';

export const UserWallet: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentMethodConfig[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');

  // ফর্ম স্টেট
  const [amount, setAmount] = useState<number | ''>('');
  const [senderAccount, setSenderAccount] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const [w, txs, deps, configs] = await Promise.all([
        api.getWallet(user.id),
        api.getWalletTransactions(user.id),
        api.getAllDepositRequests(),
        api.getPaymentMethodConfigs(),
      ]);
      setWallet(w);
      setTransactions(txs);
      setDepositRequests(deps.filter((d) => d.user_id === user.id));
      setPaymentConfigs(configs);

      const activeList = configs.filter((c) => c.is_active);
      if (activeList.length > 0) {
        setSelectedMethodId(activeList[0].id);
      }
    }
    load();

    // 🔄 রিয়েল-টাইম সিঙ্ক: সুপার অ্যাডমিন মেথড বা নম্বর চেঞ্জ করলে ইউজার প্যানেলে সাথে সাথে সিঙ্ক হবে
    const refreshConfigs = async () => {
      try {
        const configs = await api.getPaymentMethodConfigs();
        setPaymentConfigs(configs);
        const activeList = configs.filter((c) => c.is_active);
        setSelectedMethodId((prev) => {
          if (prev && activeList.some((c) => c.id === prev)) return prev;
          return activeList.length > 0 ? activeList[0].id : '';
        });
      } catch (err) {
        console.warn('Failed to refresh payment configs:', err);
      }
    };

    window.addEventListener('payment_configs_updated', refreshConfigs);
    const interval = setInterval(refreshConfigs, 3000);

    return () => {
      window.removeEventListener('payment_configs_updated', refreshConfigs);
      clearInterval(interval);
    };
  }, [user]);

  const activeConfigs = paymentConfigs.filter((c) => c.is_active);
  const selectedConfig = activeConfigs.find((c) => c.id === selectedMethodId) || activeConfigs[0] || null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSlipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast({ type: 'error', title: 'ফাইলটি অনেক বড়', message: 'সর্বোচ্চ ১০ মেগাবাইটের ছবি আপলোড করুন।' });
      return;
    }
    setSlipFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSlipPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedConfig) {
      showToast({ type: 'error', title: 'পেমেন্ট মাধ্যম অনুপলব্ধ', message: 'বর্তমানে কোনো পেমেন্ট মেথড সক্রিয় নেই।' });
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount < 100) {
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
        amount: numAmount,
        paymentMethod: selectedConfig.name,
        senderAccount: senderAccount.trim(),
        transactionReference: transactionRef.trim(),
        slipUrl: slipPreview || undefined,
      });

      showToast({
        type: 'success',
        title: 'জমার অনুরোধ জমা হয়েছে',
        message: 'আপনার টাকা জমার অনুরোধটি পয়েন্ট ভেরিফিকেশন ও ট্রানজ্যাকশন চেকের জন্য জমা হয়েছে।',
      });

      setDepositRequests((prev) => [newReq, ...prev]);
      setTransactionRef('');
      setSenderAccount('');
      setAmount('');
      setSlipFile(null);
      setSlipPreview('');
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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">ওয়ালেটে টাকা জমা দিন</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            নিচের যেকোনো একটি পেমেন্ট মাধ্যমে টাকা ট্রান্সফার করুন। এরপর প্রেরকের অ্যাকাউন্ট ও ট্রানজ্যাকশন আইডি দিয়ে ফর্মটি সাবমিট করুন। অ্যাডমিন যাচাইয়ের পর আপনার ওয়ালেটে ব্যালেন্স যুক্ত হবে।
          </p>
        </div>

        {/* পেমেন্ট মেথড নির্বাচন (সুপার অ্যাডমিন কর্তৃক কনফিগারকৃত) */}
        {activeConfigs.length === 0 ? (
          <div className="p-6 text-center text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl">
            <Info className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="font-bold">বর্তমানে কোনো পেমেন্ট মেথড সক্রিয় নেই।</p>
            <p className="text-[11px] mt-0.5 text-amber-700">অনুগ্ৰহ করে পেমেন্ট মেথড চালুর জন্য কিছু সময় অপেক্ষা করুন।</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {activeConfigs.map((method) => {
                const isSelected = selectedConfig?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                      {method.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {method.account_type_label}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* নির্বাচিত পেমেন্ট মাধ্যমের নির্দেশিকা বক্স */}
            {selectedConfig && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      অফিসিয়াল পেমেন্ট নম্বর / অ্যাকাউন্ট
                    </span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {selectedConfig.number_or_account}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      ({selectedConfig.account_type_label})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(selectedConfig.number_or_account, selectedConfig.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors shrink-0"
                  >
                    {copiedKey === selectedConfig.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === selectedConfig.id ? 'কপি হয়েছে' : 'নম্বর কপি করুন'}</span>
                  </button>
                </div>

                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  <span className="font-bold text-slate-800 block mb-1">পেমেন্ট ধাপসমূহ:</span>
                  {selectedConfig.instructions || 'পেমেন্ট সম্পন্ন করে নিচের ইনপুট ফরম ফিলাপ করুন।'}
                </div>
              </div>
            )}

            {/* জমা তথ্য ইনপুট ফর্ম */}
            <form onSubmit={handleDepositSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    জমার পরিমাণ (৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={100}
                    required
                    placeholder="যেমন: ৫০০"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    ন্যূনতম জমার পরিমাণ ৳১০০।
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    প্রেরকের নম্বর / অ্যাকাউন্ট <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={senderAccount}
                    onChange={(e) => setSenderAccount(e.target.value)}
                    placeholder="যে নম্বর বা অ্যাকাউন্ট থেকে টাকা পাঠিয়েছেন..."
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ট্রানজ্যাকশন আইডি (TrxID) / রেফারেন্স নম্বর <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="যেমন: 9J3K8L2M1P"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  পেমেন্ট স্লিপ / স্ক্রিনশট ছবি আপলোড (ঐচ্ছিক)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleSlipFileChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-200 rounded-xl bg-slate-50 p-1"
                  />
                  {slipPreview && (
                    <button
                      type="button"
                      onClick={() => { setSlipFile(null); setSlipPreview(''); }}
                      className="text-xs text-rose-600 hover:underline shrink-0"
                    >
                      ছবি মুছে ফেলুন
                    </button>
                  )}
                </div>
                {slipPreview && (
                  <div className="mt-2.5 relative rounded-xl overflow-hidden border border-slate-200 max-w-[200px] h-28 bg-slate-100 shadow-2xs">
                    <img src={slipPreview} alt="Slip preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !selectedConfig}
                className="w-full sm:w-auto px-6 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'প্রক্রিয়াধীন...' : 'জমার অনুরোধ জমা দিন'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* পূর্বে পাঠানো জমার অনুরোধ তালিকা */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">আপনার জমার অনুরোধসমূহ</h2>

        {depositRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
            এখনও কোনো টাকা জমার অনুরোধ করা হয়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-medium">তারিখ</th>
                  <th className="py-2.5 px-3 font-medium">মেথড</th>
                  <th className="py-2.5 px-3 font-medium">TrxID</th>
                  <th className="py-2.5 px-3 font-medium text-right">পরিমাণ</th>
                  <th className="py-2.5 px-3 font-medium">অবস্থা</th>
                  <th className="py-2.5 px-3 font-medium">অ্যাডমিন নোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {depositRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(req.created_at)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{req.payment_method}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{req.transaction_reference}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {toBengaliCurrency(req.amount)}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate text-[11px]">
                      {req.admin_notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ট্রানজ্যাকশন লেজার */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">অপরিবর্তনীয় ওয়ালেট লেজার</h2>
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
            কোনো ট্রানজ্যাকশন রেকর্ড নেই।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-medium">তারিখ</th>
                  <th className="py-2.5 px-3 font-medium">বিবরণ</th>
                  <th className="py-2.5 px-3 font-medium text-right">পরিমাণ</th>
                  <th className="py-2.5 px-3 font-medium text-right">ব্যালেন্স পর</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(tx.created_at)}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{tx.description}</td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${
                      tx.amount > 0 ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{toBengaliCurrency(tx.amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
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
