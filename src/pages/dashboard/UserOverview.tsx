import React, { useState, useEffect } from 'react';
import {
  Wallet as WalletIcon,
  ShoppingBag,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { api } from '../../services/api';
import { Wallet, Order, WalletTransaction } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';

interface UserOverviewProps {
  onNavigate: (path: string) => void;
}

export const UserOverview: React.FC<UserOverviewProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [w, ords, txs] = await Promise.all([
          api.getWallet(user.id),
          api.getUserOrders(user.id),
          api.getWalletTransactions(user.id),
        ]);
        setWallet(w);
        setOrders(ords);
        setTransactions(txs.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const activeOrdersCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ওয়েলকাম বার */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-slate-200">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            অ্যাকাউন্ট ড্যাশবোর্ড
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            স্বাগতম, {profile?.full_name || user?.name || 'সম্মানিত গ্রাহক'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            আপনার অ্যাকাউন্টের ব্যালেন্স, চলমান প্রজেক্টের ডেলিভারি এবং আর্থিক লেনদেন পর্যবেক্ষণ করুন।
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={() => onNavigate('/dashboard/wallet')}
            className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <WalletIcon className="w-3.5 h-3.5" />
            <span>টাকা জমা দিন</span>
          </button>
          <button
            onClick={() => onNavigate('/services')}
            className="flex-1 sm:flex-initial px-4 py-2.5 text-xs font-semibold text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors text-center"
          >
            নতুন সেবা অর্ডার
          </button>
        </div>
      </div>

      {/* ৪টি আর্থিক ও পরিচালনা মেট্রিক কার্ড */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* বর্তমান ব্যালেন্স */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">অ্যাকাউন্টের বর্তমান ব্যালেন্স</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(wallet?.balance ?? 0)}
          </div>
          <div className="text-[11px] text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>যেকোনো সেবার অর্ডারে ব্যবহারযোগ্য</span>
          </div>
        </div>

        {/* অপেক্ষমাণ জমার অনুরোধ */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">অপেক্ষমাণ জমার অনুরোধ</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(wallet?.pending_balance ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500">প্রশাসনিক অনুমোদনের প্রক্রিয়ায় আছে</div>
        </div>

        {/* মোট জমা */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">সর্বমোট জমা</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(wallet?.total_deposited ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500">লাইফটাইম অ্যাকাউন্টে রিচার্জ</div>
        </div>

        {/* মোট খরচ */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">সর্বমোট খরচ</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(wallet?.total_spent ?? 0)}
          </div>
          <div className="text-[11px] text-slate-500">
            {toBengaliDigits(orders.length)}টি ডিজিটাল সেবায় ব্যয়কৃত
          </div>
        </div>
      </div>

      {/* সাম্প্রতিক অর্ডারসমূহ */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">চলমান ও সাম্প্রতিক অর্ডারসমূহ</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {toBengaliDigits(activeOrdersCount)}টি প্রজেক্ট চলমান · সর্বমোট {toBengaliDigits(orders.length)}টি অর্ডার
            </p>
          </div>
          <button
            onClick={() => onNavigate('/dashboard/orders')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>সকল অর্ডার দেখুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-3">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
            <p>আপনার অ্যাকাউন্টে এখনও কোনো ডিজিটাল সেবার অর্ডার নেই।</p>
            <button
              onClick={() => onNavigate('/services')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              ৪০+ সেবার ক্যাটালগ দেখুন
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">অর্ডার নম্বর</th>
                  <th className="py-3 px-4 font-medium">সেবার নাম</th>
                  <th className="py-3 px-4 font-medium text-right">মূল্য</th>
                  <th className="py-3 px-4 font-medium">অবস্থা</th>
                  <th className="py-3 px-4 font-medium">অর্ডারের তারিখ</th>
                  <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{order.order_number}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {order.service?.title_bn || order.service?.title || 'ডিজিটাল সেবা'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {toBengaliCurrency(order.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={order.status} assignedAdmin={order.assigned_admin} />
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {toBengaliDate(order.created_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate(`/dashboard/orders/${order.id}`)}
                        className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        বিস্তারিত
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* সাম্প্রতিক লেজার কার্যক্রম */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">সাম্প্রতিক আর্থিক লেজার</h3>
            <p className="text-xs text-slate-500 mt-0.5">অপরিবর্তনীয় ডিজিটাল ট্রানজ্যাকশন রেকর্ড</p>
          </div>
          <button
            onClick={() => onNavigate('/dashboard/wallet')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>সম্পূর্ণ লেজার</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {transactions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">কোনো লেনদেন রেকর্ড পাওয়া যায়নি।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">তারিখ ও সময়</th>
                  <th className="py-3 px-4 font-medium">বিবরণ</th>
                  <th className="py-3 px-4 font-medium">ধরন</th>
                  <th className="py-3 px-4 font-medium text-right">পরিমাণ</th>
                  <th className="py-3 px-4 font-medium text-right">পরবর্তী ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50">
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
