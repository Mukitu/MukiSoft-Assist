import React, { useState, useEffect } from 'react';
import { ShoppingBag, ArrowRight, Search, Clock, FileText, CheckCircle2, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { api } from '../../services/api';
import { Order } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';

interface UserOrdersProps {
  onNavigate: (path: string) => void;
}

export const UserOrders: React.FC<UserOrdersProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => {
    if (!user) return [];
    try {
      const raw = localStorage.getItem('mukisoft_demo_orders');
      if (raw) {
        const parsed: Order[] = JSON.parse(raw);
        return parsed.filter((o) => o.user_id === user.id);
      }
    } catch {}
    return [];
  });
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 6;

  useEffect(() => {
    async function load() {
      if (!user) return;
      const data = await api.getUserOrders(user.id);
      setOrders(data);
      setLoading(false);
    }
    load();
  }, [user]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const filtered = orders.filter((o) => {
    // Search
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      o.order_number.toLowerCase().includes(searchLower) ||
      (o.service?.title_bn && o.service.title_bn.includes(search)) ||
      (o.service?.title && o.service.title.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    // Filter
    if (filter === 'all') return true;
    if (filter === 'active') {
      return ['pending', 'accepted', 'in_progress', 'review', 'in_review'].includes(o.status);
    }
    if (filter === 'needs_action') {
      return ['needs_information', 'revision_requested'].includes(o.status);
    }
    if (filter === 'delivered') return o.status === 'delivered';
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'cancelled') return ['cancelled', 'refunded'].includes(o.status);
    return o.status === filter;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedOrders = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            অর্ডার পোর্টফোলিও
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">আমার অর্ডারসমূহ</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            কাজের অগ্রগতি পর্যবেক্ষণ করুন, ডেলিভারি ফাইল ডাউনলোড করুন এবং প্রয়োজনীয় রিভিশন গ্রহণ করুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => onNavigate('/dashboard/messages')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
          >
            <span>বার্তা ও লাইভ চ্যাট</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </button>
          <button
            onClick={() => onNavigate('/services')}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            নতুন সেবা অর্ডার করুন
          </button>
        </div>
      </div>

      {/* সার্চ এবং ফিল্টার বার */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="অর্ডার নম্বর বা সেবার নাম দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* ফিল্টার ট্যাবসমূহ */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none">
          {(
            [
              { key: 'all', label: `সবগুলো (${toBengaliDigits(orders.length)})` },
              { key: 'active', label: 'চলমান কাজ' },
              { key: 'needs_action', label: 'অ্যাকশন প্রয়োজন' },
              { key: 'delivered', label: 'ডেলিভারি প্রস্তুত' },
              { key: 'completed', label: 'সমাপ্ত' },
              { key: 'cancelled', label: 'বাতিল / রিফান্ড' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                filter === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* অর্ডার তালিকা */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">অর্ডার লোড হচ্ছে...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">এই ফিল্টারে কোনো অর্ডার পাওয়া যায়নি।</p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-indigo-600 hover:underline text-xs"
              >
                অনুসন্ধান রিসেট করুন
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* মোবাইল কার্ড ভিউ */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedOrders.map((order) => (
                <div key={order.id} className="p-4 space-y-3 hover:bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-slate-900">{order.order_number}</span>
                    <StatusBadge status={order.status} assignedAdmin={order.assigned_admin} />
                  </div>

                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">
                      {order.service?.title_bn || order.service?.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                      <span>{toBengaliDate(order.created_at)}</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {toBengaliCurrency(order.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      {order.deliverables?.length
                        ? `${toBengaliDigits(order.deliverables.length)}টি ফাইল`
                        : 'ফাইল অপেক্ষমাণ'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onNavigate('/dashboard/messages')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="বার্তা ও লাইভ চ্যাট"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>চ্যাট</span>
                      </button>
                      <button
                        onClick={() => onNavigate(`/dashboard/orders/${order.id}`)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <span>বিস্তারিত</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ডেস্কটপ টেবিল ভিউ */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">অর্ডার নম্বর</th>
                    <th className="py-3 px-4 font-medium">সেবার নাম</th>
                    <th className="py-3 px-4 font-medium text-right">মূল্য</th>
                    <th className="py-3 px-4 font-medium">অবস্থা</th>
                    <th className="py-3 px-4 font-medium">অর্ডারের তারিখ</th>
                    <th className="py-3 px-4 font-medium">ডেলিভারি ফাইল</th>
                    <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{order.order_number}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[220px] truncate">
                        {order.service?.title_bn || order.service?.title || 'সেবা'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {toBengaliCurrency(order.amount)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={order.status} assignedAdmin={order.assigned_admin} />
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {toBengaliDate(order.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {order.deliverables?.length ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{toBengaliDigits(order.deliverables.length)}টি ফাইল প্রস্তুত</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">প্রক্রিয়াধীন</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigate('/dashboard/messages')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="সরাসরি বার্তা ও লাইভ চ্যাট"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>চ্যাট</span>
                          </button>
                          <button
                            onClick={() => onNavigate(`/dashboard/orders/${order.id}`)}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            বিস্তারিত দেখুন
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* গ্লোবাল পেজিনেশন বার */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
