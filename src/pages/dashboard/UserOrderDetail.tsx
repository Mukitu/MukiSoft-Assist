import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Download,
  FileText,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  RotateCcw,
  Send,
  HelpCircle,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Order } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';

interface UserOrderDetailProps {
  orderId: string;
  onNavigate: (path: string) => void;
}

export const UserOrderDetail: React.FC<UserOrderDetailProps> = ({ orderId, onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // ইন্টারঅ্যাকশন স্টেট
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // বাতিল ও রিফান্ড স্টেট
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const data = await api.getOrderById(orderId, user.id, false);
      setOrder(data);
      setLoading(false);
    }
    load();
  }, [orderId, user]);

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">অর্ডারের বিবরণ লোড হচ্ছে...</div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12 space-y-3">
        <h2 className="text-lg font-bold text-slate-800">অর্ডারটি পাওয়া যায়নি</h2>
        <p className="text-xs text-slate-500">অনুরোধকৃত অর্ডার আইডি: {orderId}</p>
        <button
          onClick={() => onNavigate('/dashboard/orders')}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
        >
          অর্ডার তালিকায় ফিরে যান
        </button>
      </div>
    );
  }

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !revisionNotes.trim()) return;

    setIsSubmitting(true);
    try {
      await api.requestOrderRevision(order.id, user.id, revisionNotes.trim());
      showToast({
        type: 'success',
        title: 'সংশোধনের অনুরোধ জমা হয়েছে',
        message: 'আপনার ফিডব্যাক দলের কাছে পৌঁছেছে। দ্রুত রিভিশন সম্পন্ন করা হবে।',
      });
      setRevisionModalOpen(false);
      setRevisionNotes('');
      // Reload order
      const refreshed = await api.getOrderById(order.id, user.id, false);
      setOrder(refreshed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুরোধ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendClarification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !replyMessage.trim()) return;

    setIsSubmitting(true);
    try {
      await api.replyOrderInformation(order.id, user.id, replyMessage.trim());
      showToast({
        type: 'success',
        title: 'উত্তর পাঠানো হয়েছে',
        message: 'আপনার দেওয়া তথ্য অ্যাডমিন টিমের কাছে পৌঁছেছে।',
      });
      setReplyMessage('');
      const refreshed = await api.getOrderById(order.id);
      setOrder(refreshed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'বার্তা পাঠানো ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !order || !cancelReason.trim()) return;

    setIsCancelling(true);
    try {
      await api.cancelUserOrder(order.id, user.id, cancelReason.trim());
      showToast({
        type: 'success',
        title: 'অর্ডার বাতিল ও রিফান্ড সম্পন্ন',
        message: `অর্ডারটি বাতিল করা হয়েছে এবং সম্পূর্ণ ৳ ${toBengaliDigits(order.amount)} আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।`,
      });
      setCancelModalOpen(false);
      setCancelReason('');
      const refreshed = await api.getOrderById(order.id, user.id, false);
      setOrder(refreshed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অর্ডার বাতিল ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* ব্যাক বাটন */}
      <button
        onClick={() => onNavigate('/dashboard/orders')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>সকল অর্ডারের তালিকায় ফিরে যান</span>
      </button>

      {/* হেডার */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-slate-500">{order.order_number}</span>
            <StatusBadge status={order.status} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {order.service?.title_bn || order.service?.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            অর্ডারের সময়কাল: {toBengaliDate(order.created_at)}
          </p>
        </div>

        <div className="sm:text-right flex flex-col sm:items-end gap-1.5">
          <span className="text-xs text-slate-400 block">এসক্রো পরিশোধিত মূল্য</span>
          <span className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(order.amount)}
          </span>
          {order.status === 'refunded' && (
            <span className="block text-xs text-cyan-700 font-semibold mt-0.5">
              (৳ {toBengaliDigits(order.amount)} ওয়ালেটে ফেরত দেওয়া হয়েছে)
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1 self-start sm:self-auto">
            {['accepted', 'in_review', 'needs_information'].includes(order.status) && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>অর্ডার বাতিল ও রিফান্ড</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('/dashboard/support')}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>সহায়তা টিকিট খুলুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* অতিরিক্ত তথ্য চাওয়ার নোটিশ (needs_information অবস্থা) */}
      {order.status === 'needs_information' && (
        <div className="p-5 rounded-xl bg-orange-50 border border-orange-200 space-y-3">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-orange-900">অ্যাডমিন টিমের পক্ষ থেকে অতিরিক্ত তথ্যের অনুরোধ</h3>
              <p className="text-xs text-orange-800 mt-0.5">
                কাজটি শুরু বা সম্পন্ন করার জন্য টিম আপনার কাছ থেকে বাড়তি স্পষ্টীকরণ বা তথ্য চেয়েছেন। অনুগ্রহ করে নিচে উত্তর দিন।
              </p>
            </div>
          </div>

          <form onSubmit={handleSendClarification} className="space-y-3 pt-2">
            <textarea
              rows={3}
              required
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="আপনার স্পষ্টীকরণ বা উত্তর এখানে লিখুন..."
              className="w-full p-3 text-xs bg-white border border-orange-300 rounded-lg focus:outline-hidden focus:border-orange-500"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'পাঠানো হচ্ছে...' : 'উত্তর জমা দিন'}</span>
            </button>
          </form>
        </div>
      )}

      {/* রিফান্ড নোটিশ */}
      {order.status === 'refunded' && (
        <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 space-y-1">
          <div className="font-bold text-sm">অর্থ ফেরত (Refund) সম্পন্ন হয়েছে</div>
          <p className="leading-relaxed">
            এই অর্ডারের সম্পূর্ণ <strong>{toBengaliCurrency(order.amount)}</strong> আপনার ওয়ালেট ব্যালেন্সে ফেরত পাঠানো হয়েছে।
            {order.cancellation_reason && (
              <span className="block mt-1 text-cyan-800">
                রিফান্ডের কারণ: {order.cancellation_reason}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* বাম কলাম: ফাইল ও রিকোয়ারমেন্টস (২ কলাম) */}
        <div className="lg:col-span-2 space-y-6">
          {/* ডেলিভারি ফাইল বক্স */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">ডেলিভারিকৃত ফাইলসমূহ</h2>
                <p className="text-xs text-slate-500">আপনার সম্পন্ন কাজের মূল কপি</p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {toBengaliDigits(order.deliverables?.length || 0)}টি ফাইল
              </span>
            </div>

            {!order.deliverables || order.deliverables.length === 0 ? (
              <div className="p-8 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 space-y-1.5">
                <Clock className="w-6 h-6 text-indigo-600 mx-auto" />
                <p className="font-semibold text-slate-800">কাজের প্রস্তুতি চলছে</p>
                <p>কাজটি সম্পন্ন ও কোয়ালিটি যাচাই হওয়ার পর এখানে ফাইল ডাউনলোড লিংক প্রদর্শিত হবে।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {order.deliverables.map((file) => (
                  <div
                    key={file.id}
                    className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <FileText className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-xs text-slate-900">{file.title}</div>
                        {file.deliverable_notes && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{file.deliverable_notes}</div>
                        )}
                        <span className="text-[10px] text-slate-400 block mt-1">
                          ডেলিভারি তারিখ: {toBengaliDate(file.created_at)}
                        </span>
                      </div>
                    </div>
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ডাউনলোড করুন</span>
                    </a>
                  </div>
                ))}

                {/* রিভিশন বাটন */}
                {['delivered', 'completed'].includes(order.status) && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500">
                      কাজে কোনো সংশোধন বা পরিবর্তনের প্রয়োজন আছে?
                    </span>
                    <button
                      onClick={() => setRevisionModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>রিভিশনের অনুরোধ করুন</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* প্রেরিত রিকোয়ারমেন্টস ও রেফারেন্স তথ্য */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900">আপনার প্রদত্ত প্রজেক্ট ব্রিফ ও তথ্য</h2>
            
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
              {order.requirements_submitted || 'কোনো লিখিত বিবরণ নেই।'}
            </div>

            {/* রেফারেন্স লিংক যদি থাকে */}
            {order.reference_link && (
              <div className="text-xs">
                <span className="font-semibold text-slate-700 block mb-1">প্রদত্ত রেফারেন্স লিংক:</span>
                <a
                  href={order.reference_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-indigo-600 hover:underline font-mono"
                >
                  <span>{order.reference_link}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}

            {/* সংযুক্ত ফাইল যদি থাকে */}
            {order.attachment_name && (
              <div className="text-xs">
                <span className="font-semibold text-slate-700 block mb-1">সংযুক্ত প্রজেক্ট ফাইল:</span>
                <span className="font-mono bg-slate-100 px-2 py-1 rounded text-slate-800">
                  {order.attachment_name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ডান কলাম: মাইলস্টোন টাইমলাইন (১ কলাম) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">কাজের টাইমলাইন ও অগ্রগতি</h2>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>

          {!order.events || order.events.length === 0 ? (
            <p className="text-xs text-slate-400">এখনও কোনো মাইলস্টোন তৈরি হয়নি।</p>
          ) : (
            <div className="space-y-4 pt-2">
              {order.events.map((evt) => (
                <div key={evt.id} className="relative pl-6 pb-2 border-l border-slate-200 last:border-none">
                  <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <div className="text-[11px] text-slate-400">
                    {toBengaliDate(evt.created_at)}
                  </div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {evt.event_type === 'ORDER_CREATED'
                      ? 'অর্ডার গ্রহণ সম্পন্ন'
                      : evt.event_type === 'DELIVERABLE_UPLOADED'
                      ? 'ফাইল ডেলিভারি সম্পন্ন'
                      : evt.event_type === 'REVISION_REQUESTED'
                      ? 'রিভিশনের আবেদন'
                      : evt.event_type === 'ORDER_REFUNDED'
                      ? 'টাকা ফেরত (Refund)'
                      : evt.event_type === 'CUSTOMER_REPLY'
                      ? 'গ্রাহকের উত্তর'
                      : 'অগ্রগতি আপডেট'}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">{evt.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* রিভিশন রিকোয়েস্ট মডাল */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 block">
                কোয়ালিটি রিভিশন
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                সংশোধনের বিবরণ লিখুন
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ডেলিভারিকৃত ফাইলে যে পরিবর্তনগুলো প্রয়োজন তা পয়েন্ট আকারে উল্লেখ করুন।
              </p>
            </div>

            <form onSubmit={handleRequestRevision} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  সংশোধন ও পরিবর্তনের বিবরণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="যেমন: স্লাইড ৩-এর কালার স্কিম এবং ফন্টের সাইজ একটু বড় করতে হবে..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRevisionModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                  disabled={isSubmitting}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  {isSubmitting ? 'জমা হচ্ছে...' : 'রিভিশন জমা দিন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* অর্ডার বাতিল ও রিফান্ড মডাল */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-600 block">
                অর্ডার প্রত্যাহার
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                অর্ডার বাতিল ও তাৎক্ষণিক রিফান্ড
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                অর্ডারটি বাতিল করলে এসক্রোতে রক্ষিত সম্পূর্ণ ৳ {toBengaliDigits(order.amount)} তাৎক্ষণিকভাবে আপনার ওয়ালেট ব্যালেন্সে ফেরত জমা হবে।
              </p>
            </div>

            <form onSubmit={handleCancelOrder} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  বাতিল করার কারণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="যেমন: ভুলবশত অর্ডার করা হয়েছে / প্রয়োজনীয় ফাইল প্রস্তুত নেই..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                  disabled={isCancelling}
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={isCancelling}
                  className="px-5 py-2 font-semibold text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors"
                >
                  {isCancelling ? 'বাতিল করা হচ্ছে...' : 'অর্ডার বাতিল ও রিফান্ড নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
