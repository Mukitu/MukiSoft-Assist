import React, { useState, useEffect } from 'react';
import {
  Upload,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileText,
  RotateCcw,
  ExternalLink,
  Eye,
  DollarSign,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Order, OrderStatus } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminOrders: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // বিস্তারিত দেখার জন্য সিলেক্টেড অর্ডার
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // ফাইল ডেলিভারি ফর্ম স্টেট
  const [activeOrderForDeliverable, setActiveOrderForDeliverable] = useState<Order | null>(null);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');

  // রিফান্ড মডাল স্টেট
  const [refundOrderTarget, setRefundOrderTarget] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // গ্রাহকের কাছে অতিরিক্ত তথ্য চাওয়ার স্টেট
  const [needsInfoOrderTarget, setNeedsInfoOrderTarget] = useState<Order | null>(null);
  const [needsInfoMessage, setNeedsInfoMessage] = useState('');

  useEffect(() => {
    async function load() {
      const data = await api.getAllOrders();
      setOrders(data);
      setLoading(false);
    }
    load();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!user) return;
    try {
      await api.updateOrderStatus(orderId, newStatus, user.id, `অর্ডারের অবস্থা পরিবর্তন করা হয়েছে: ${newStatus}`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      showToast({
        type: 'success',
        title: 'অবস্থা আপডেট সম্পন্ন',
        message: 'অর্ডারের নতুন অগ্রগতি সফলভাবে সংরক্ষিত হয়েছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অবস্থা পরিবর্তন করা সম্ভব হয়নি' });
    }
  };

  const handleUploadDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeOrderForDeliverable || !deliverableTitle.trim()) return;

    try {
      const fileUrl = deliverableUrl.trim() || 'https://mukisoft.com/deliverables/sample_output.pdf';
      await api.addOrderDeliverable(activeOrderForDeliverable.id, user.id, {
        title: deliverableTitle,
        fileUrl,
        notes: deliverableNotes,
      });

      showToast({
        type: 'success',
        title: 'ফাইল ডেলিভারি সম্পন্ন',
        message: 'ফাইলটি যুক্ত করা হয়েছে এবং অর্ডারটি ডেলিভারিকৃত হিসেবে চিহ্নিত হয়েছে।',
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === activeOrderForDeliverable.id ? { ...o, status: 'delivered' } : o))
      );

      if (selectedOrder && selectedOrder.id === activeOrderForDeliverable.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'delivered' } : null));
      }

      setActiveOrderForDeliverable(null);
      setDeliverableTitle('');
      setDeliverableUrl('');
      setDeliverableNotes('');
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'ফাইল ডেলিভারি ব্যর্থ হয়েছে' });
    }
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !refundOrderTarget || !refundReason.trim()) return;

    setIsRefunding(true);
    try {
      const result = await api.refundOrder(refundOrderTarget.id, user.id, refundReason.trim());
      showToast({
        type: 'success',
        title: 'রিফান্ড সম্পন্ন হয়েছে',
        message: `${toBengaliCurrency(refundOrderTarget.amount)} গ্রাহকের ওয়ালেটে ফেরত দেওয়া হয়েছে। নতুন ব্যালেন্স: ${toBengaliCurrency(result.newBalance)}।`,
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === refundOrderTarget.id
            ? { ...o, status: 'refunded', cancellation_reason: refundReason.trim(), refund_amount: o.amount }
            : o
        )
      );

      if (selectedOrder && selectedOrder.id === refundOrderTarget.id) {
        setSelectedOrder((prev) =>
          prev
            ? { ...prev, status: 'refunded', cancellation_reason: refundReason.trim(), refund_amount: prev.amount }
            : null
        );
      }

      setRefundOrderTarget(null);
      setRefundReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রিফান্ড প্রক্রিয়া ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsRefunding(false);
    }
  };

  const handleRequestNeedsInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !needsInfoOrderTarget || !needsInfoMessage.trim()) return;

    try {
      await api.updateOrderStatus(
        needsInfoOrderTarget.id,
        'needs_information',
        user.id,
        `অ্যাডমিন তথ্যের অনুরোধ করেছেন: ${needsInfoMessage.trim()}`
      );

      showToast({
        type: 'info',
        title: 'তথ্যের অনুরোধ পাঠানো হয়েছে',
        message: 'গ্রাহকের অর্ডারের অবস্থা "অতিরিক্ত তথ্য প্রয়োজন" হিসেবে আপডেট করা হয়েছে।',
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === needsInfoOrderTarget.id ? { ...o, status: 'needs_information' } : o))
      );

      setNeedsInfoOrderTarget(null);
      setNeedsInfoMessage('');
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অনুরোধ পাঠাতে ব্যর্থ হয়েছে' });
    }
  };

  const filteredOrders = orders.filter((o) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      o.order_number.toLowerCase().includes(searchLower) ||
      (o.customer?.email && o.customer.email.toLowerCase().includes(searchLower)) ||
      (o.service?.title_bn && o.service.title_bn.includes(search)) ||
      (o.service?.title && o.service.title.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return ['pending', 'accepted', 'in_progress', 'needs_information', 'in_review'].includes(o.status);
    if (statusFilter === 'delivered') return o.status === 'delivered';
    if (statusFilter === 'completed') return o.status === 'completed';
    if (statusFilter === 'refunded') return ['cancelled', 'refunded'].includes(o.status);
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            ডেলিভারি পাইপলাইন ও সার্ভিসেস
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">অর্ডার ও ডেলিভারি ব্যবস্থাপনা</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            গ্রাহকদের প্রজেক্ট ব্রিফ পর্যালোচনা করুন, কাজের স্ট্যাটাস আপডেট করুন এবং সম্পন্ন আউটপুট ডিসপ্যাচ করুন।
          </p>
        </div>

        <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold self-start sm:self-auto">
          মোট {toBengaliDigits(orders.length)}টি অর্ডার
        </div>
      </div>

      {/* সার্চ ও ফিল্টার বার */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="অর্ডার নম্বর, গ্রাহকের ইমেইল বা সেবার নাম..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* স্ট্যাটাস ফিল্টার */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none">
          {[
            { key: 'all', label: `সবগুলো (${toBengaliDigits(orders.length)})` },
            { key: 'active', label: 'চলমান প্রজেক্ট' },
            { key: 'delivered', label: 'ডেলিভারি সম্পন্ন' },
            { key: 'completed', label: 'সম্পূর্ণ সমাপ্ত' },
            { key: 'refunded', label: 'বাতিল / রিফান্ড' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                statusFilter === key ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* অর্ডার তালিকা */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">অর্ডার লোড হচ্ছে...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-800">কোনো অর্ডার পাওয়া যায়নি।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">অর্ডার নম্বর</th>
                  <th className="py-3 px-4 font-medium">গ্রাহক</th>
                  <th className="py-3 px-4 font-medium">সেবা</th>
                  <th className="py-3 px-4 font-medium text-right">মূল্য</th>
                  <th className="py-3 px-4 font-medium">কাজের অবস্থা</th>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{ord.order_number}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 max-w-[140px] truncate">
                      {ord.customer?.email || ord.user_id}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[200px] truncate">
                      {ord.service?.title_bn || ord.service?.title}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {toBengaliCurrency(ord.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <select
                        value={ord.status}
                        onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                        className="p-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md font-medium focus:outline-hidden"
                      >
                        <option value="pending">অপেক্ষমাণ (Pending)</option>
                        <option value="accepted">গ্রহণ করা হয়েছে (Accepted)</option>
                        <option value="in_progress">কাজ চলছে (In Progress)</option>
                        <option value="needs_information">অতিরিক্ত তথ্য প্রয়োজন (Needs Info)</option>
                        <option value="in_review">পর্যালোচনায় আছে (Review)</option>
                        <option value="revision_requested">সংশোধনের অনুরোধ (Revision)</option>
                        <option value="delivered">ডেলিভারি সম্পন্ন (Delivered)</option>
                        <option value="completed">সম্পূর্ণ সমাপ্ত (Completed)</option>
                        <option value="cancelled">বাতিলকৃত (Cancelled)</option>
                        <option value="refunded">অর্থ ফেরত (Refunded)</option>
                      </select>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(ord.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded text-xs transition-colors"
                          title="বিস্তারিত তথ্য দেখুন"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>বিস্তারিত</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveOrderForDeliverable(ord);
                            setDeliverableTitle(`ডেলিভারি ফাইল — ${ord.service?.title_bn || ord.service?.title}`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded text-xs transition-colors"
                          title="ফাইল ডেলিভারি করুন"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>ডেলিভারি</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* অর্ডার বিস্তারিত মডাল */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900">{selectedOrder.order_number}</span>
                  <StatusBadge status={selectedOrder.status} />
                </div>
                <h3 className="font-bold text-base text-slate-900 mt-1">
                  {selectedOrder.service?.title_bn || selectedOrder.service?.title}
                </h3>
                <span className="text-xs text-slate-500">
                  গ্রাহক: {selectedOrder.customer?.email || selectedOrder.user_id}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* আর্থিক হিসাব */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">এসক্রো ফি:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {toBengaliCurrency(selectedOrder.amount)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">অর্ডারের তারিখ:</span>
                <span className="text-slate-800 font-medium">{toBengaliDate(selectedOrder.created_at)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">ডেলিভারি ফাইল:</span>
                <span className="text-slate-800 font-medium">
                  {toBengaliDigits(selectedOrder.deliverables?.length || 0)}টি প্রস্তুত
                </span>
              </div>
            </div>

            {/* গ্রাহকের ব্রিফ ও তথ্য */}
            <div className="space-y-2 text-xs">
              <span className="font-semibold text-slate-800 block">গ্রাহকের প্রদত্ত ব্রিফ ও নির্দেশনা:</span>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 whitespace-pre-line leading-relaxed">
                {selectedOrder.requirements_submitted || 'কোনো বিবরণ দেওয়া হয়নি।'}
              </div>

              {selectedOrder.reference_link && (
                <div className="pt-1">
                  <span className="font-semibold text-slate-700 block mb-0.5">রেফারেন্স লিংক:</span>
                  <a
                    href={selectedOrder.reference_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-mono"
                  >
                    <span>{selectedOrder.reference_link}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {selectedOrder.attachment_name && (
                <div className="pt-1">
                  <span className="font-semibold text-slate-700 block mb-0.5">সংযুক্ত ফাইল:</span>
                  <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">
                    {selectedOrder.attachment_name}
                  </span>
                </div>
              )}
            </div>

            {/* অ্যাকশন বোতামসমূহ */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNeedsInfoOrderTarget(selectedOrder)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded text-xs font-semibold"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>তথ্য চান</span>
                </button>

                {selectedOrder.status !== 'refunded' && (
                  <button
                    type="button"
                    onClick={() => setRefundOrderTarget(selectedOrder)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>রিফান্ড করুন</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ফাইল ডেলিভারি মডাল */}
      {activeOrderForDeliverable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 block">
                আউটপুট ডিসপ্যাচ ও ডেলিভারি
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                অর্ডার #{activeOrderForDeliverable.order_number}-এ ফাইল যুক্ত করুন
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                গ্রাহক: {activeOrderForDeliverable.customer?.email || activeOrderForDeliverable.user_id}
              </p>
            </div>

            <form onSubmit={handleUploadDeliverable} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">ফাইলের নাম বা শিরোনাম</label>
                <input
                  type="text"
                  required
                  value={deliverableTitle}
                  onChange={(e) => setDeliverableTitle(e.target.value)}
                  placeholder="যেমন: ফাইনাল ইনভেস্টর পিচ ডেক (PDF)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ফাইল ডাউনলোড লিংক / Supabase Storage URL
                </label>
                <input
                  type="text"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://mukisoft.supabase.co/storage/v1/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">গ্রাহকের জন্য বার্তা বা নির্দেশনা</label>
                <textarea
                  rows={2}
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  placeholder="ফাইল সংক্রান্ত কোনো নোট বা রিভিশন নির্দেশিকা..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveOrderForDeliverable(null)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  গ্রাহকের কাছে পাঠান
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* রিফান্ড প্রসেসিং মডাল */}
      {refundOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">অর্ডার রিফান্ড নিশ্চিতকরণ</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  অর্ডার #{refundOrderTarget.order_number}-এর <strong>{toBengaliCurrency(refundOrderTarget.amount)}</strong> গ্রাহকের ওয়ালেটে সরাসরি ক্রেডিট করা হবে।
                </p>
              </div>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  রিফান্ডের সুনির্দিষ্ট কারণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="যেমন: গ্রাহকের অনুরোধ অনুযায়ী কাজ শুরুর পূর্বে অর্ডার বাতিল করা হলো..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRefundOrderTarget(null)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                  disabled={isRefunding}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="px-5 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
                >
                  {isRefunding ? 'রিফান্ড হচ্ছে...' : 'রিফান্ড অনুমোদন করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* অতিরিক্ত তথ্য চাওয়ার মডাল */}
      {needsInfoOrderTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-orange-600 block">
                গ্রাহকের সাথে যোগাযোগ
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                অতিরিক্ত তথ্যের অনুরোধ পাঠান
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                গ্রাহক তার ড্যাশবোর্ডে এই মেসেজ দেখতে পাবেন এবং সরাসরি উত্তর দিতে পারবেন।
              </p>
            </div>

            <form onSubmit={handleRequestNeedsInfo} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  যে তথ্যটি জানা প্রয়োজন <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={needsInfoMessage}
                  onChange={(e) => setNeedsInfoMessage(e.target.value)}
                  placeholder="যেমন: আপনার প্রেজেন্টেশনের জন্য নির্দিষ্ট কোনো ব্র্যান্ড লোগো বা ফন্ট ফাইল প্রয়োজন..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setNeedsInfoOrderTarget(null)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg"
                >
                  অনুরোধ পাঠান
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
