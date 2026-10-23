import React, { useState, useEffect, useRef } from 'react';
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
  UserCheck,
  Star,
  Check,
  Lock,
  Paperclip,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Order, OrderWorkMessage, OrderReview } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useMessages } from '../../hooks/useMessages';

interface UserOrderDetailProps {
  orderId: string;
  onNavigate: (path: string) => void;
}

export const UserOrderDetail: React.FC<UserOrderDetailProps> = ({ orderId, onNavigate }) => {
  const { user, profile } = useAuth();
  const { showToast } = useNotification();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // ট্যাব স্টেট
  const [activeTab, setActiveTab] = useState<'deliverables' | 'chat'>('deliverables');

  // ইন্টারঅ্যাকশন স্টেট
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // বাতিল ও রিফান্ড স্টেট
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // ডেলিভারি গ্রহণ ও সম্পন্ন
  const [isConfirmingCompletion, setIsConfirmingCompletion] = useState(false);

  // অর্ডার চ্যাট স্টেট ও হুক
  const { messages, sending: sendingChat, sendMessage: sendOrderMessageViaHook } = useMessages(orderId);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await api.getOrderById(orderId, user.id, false);
      setOrder(data);
    } catch (err) {
      console.warn('Failed to load order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleClaimEvt = (e: Event) => {
      const customEvt = e as CustomEvent<{ orderId: string; order: Order }>;
      if (customEvt.detail && customEvt.detail.orderId === orderId) {
        setOrder(customEvt.detail.order);
      }
    };

    window.addEventListener('order_claimed', handleClaimEvt);

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      window.removeEventListener('order_claimed', handleClaimEvt);
      clearInterval(interval);
    };
  }, [orderId, user]);

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (activeTab === 'chat' && chatContainerRef.current) {
      if (messages.length > prevMsgCountRef.current || prevMsgCountRef.current === 0) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, activeTab]);

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
      setOrder((prev) => prev ? { ...prev, status: 'revision_requested' } : null);
      showToast({
        type: 'success',
        title: 'সংশোধনের অনুরোধ জমা হয়েছে',
        message: 'আপনার ফিডব্যাক দলের কাছে পৌঁছেছে। দ্রুত রিভিশন সম্পন্ন করা হবে।',
      });
      setRevisionModalOpen(false);
      setRevisionNotes('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুরোধ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCompletion = async () => {
    if (!user || !order) return;

    setIsConfirmingCompletion(true);
    const nowIso = new Date().toISOString();
    // Optimistic UI update so order immediately reflects completed
    setOrder((prev) => (prev ? { ...prev, status: 'completed', completed_at: nowIso } : null));

    try {
      const updated = await api.confirmOrderCompletion(order.id, user.id);
      if (updated) {
        setOrder(updated);
      }
      showToast({
        type: 'success',
        title: 'অর্ডার সফলভাবে সম্পন্ন হয়েছে! 🎉',
        message: 'কাজটি সফলভাবে সম্পন্ন হয়েছে এবং কাজের নির্ধারিত অর্থ ছাড় করা হয়েছে।',
      });
      setActiveTab('deliverables');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অর্ডার সম্পন্নকরণ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
      await loadData();
    } finally {
      setIsConfirmingCompletion(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatInput.trim() || sendingChat) return;

    try {
      const senderName = profile?.full_name || user.email?.split('@')[0] || 'গ্রাহক';
      await sendOrderMessageViaHook(user.id, senderName, 'customer', chatInput.trim());
      setChatInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'মেসেজ পাঠানো ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
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
      await loadData();
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

    if (order.status === 'refunded' || order.status === 'cancelled') {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'এই অর্ডারটি ইতিমধ্যে বাতিল ও রিফান্ড করা হয়েছে।' });
      setCancelModalOpen(false);
      return;
    }

    setIsCancelling(true);
    const orderIdToCancel = order.id;
    const orderAmountToRefund = order.amount;
    const reasonText = cancelReason.trim();
    try {
      await api.cancelUserOrder(orderIdToCancel, user.id, reasonText);
      showToast({
        type: 'success',
        title: 'অর্ডার বাতিল ও রিফান্ড সম্পন্ন',
        message: `অর্ডারটি বাতিল করা হয়েছে এবং সম্পূর্ণ ৳ ${toBengaliDigits(orderAmountToRefund)} আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।`,
      });
      setCancelModalOpen(false);
      setCancelReason('');
      setOrder((prev) => (prev ? { ...prev, status: 'refunded', cancellation_reason: reasonText, refund_amount: orderAmountToRefund } : null));
      await loadData();
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
            <StatusBadge status={order.status} assignedAdmin={order.assigned_admin} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            {order.service?.title_bn || order.service?.title}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            অর্ডারের সময়কাল: {toBengaliDate(order.created_at)}
          </p>
        </div>

        <div className="sm:text-right flex flex-col sm:items-end gap-1.5">
          <span className="text-xs text-slate-400 block">এসক্রো রক্ষিত মূল্য</span>
          <span className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(order.amount)}
          </span>
          {(order.status === 'refunded' || order.status === 'cancelled' || (order.refund_amount && order.refund_amount > 0)) && (
            <span className="block text-xs text-cyan-700 font-semibold mt-0.5">
              (৳ {toBengaliDigits(order.refund_amount || order.amount)} ওয়ালেটে ফেরত দেওয়া হয়েছে)
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2 mt-1 self-start sm:self-auto">
            {!order.assigned_admin && !['cancelled', 'refunded', 'completed', 'delivered'].includes(order.status) && (
              <button
                onClick={() => setCancelModalOpen(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>অর্ডার বাতিল ও রিফান্ড</span>
              </button>
            )}
            {Boolean(order.assigned_admin) && !['cancelled', 'refunded', 'completed', 'delivered'].includes(order.status) && (
              <span className="text-[11px] text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
                কাজ চলমান: বাতিলের প্রয়োজন হলে সরাসরি চ্যাটে জানান
              </span>
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

      {/* স্পেশালিস্ট অ্যাডমিন অ্যাসাইনমেন্ট স্ট্যাটাস ব্যানার */}
      {(() => {
        const isRefundedOrCancelled = ['refunded', 'cancelled'].includes(order.status) || Boolean(order.refund_amount && order.refund_amount > 0);
        // রিফান্ড বা বাতিল হলে স্পেশালিস্ট অ্যাসাইনমেন্ট / ক্লেইম ব্যানার আর দেখাবে না
        if (isRefundedOrCancelled) return null;

        const hasAssigned = Boolean(order.assigned_admin || order.assigned_admin_name);
        const assignedName = order.assigned_admin_name || (order.assigned_admin ? 'দায়িত্বপ্রাপ্ত স্পেশালিস্ট কর্মকর্তা' : null);

        return (
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            hasAssigned
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200'
              : 'bg-amber-50/70 border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                hasAssigned ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
              }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    দায়িত্বপ্রাপ্ত স্পেশালিস্ট অ্যাডমিন/ওয়ার্কার
                  </span>
                  {hasAssigned ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      <Check className="w-3 h-3" /> কাজ এক্সেপ্ট করা হয়েছে
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                      ক্লেইমের অপেক্ষায়
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-900 mt-0.5">
                  {hasAssigned ? (
                    <>
                      <span className="font-bold text-emerald-900">{assignedName}</span> আপনার এই কাজটি গ্রহণ করেছেন এবং পরিচালনা করছেন।
                    </>
                  ) : (
                    'অর্ডারটি অ্যাডমিন পুলে উন্মুক্ত আছে। উপযুক্ত স্পেশালিস্ট কর্মকর্তা দ্রুত কাজটি গ্রহণ করবেন।'
                  )}
                </p>
              </div>
            </div>

            {hasAssigned && (
              <button
                onClick={() => setActiveTab('chat')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-lg shadow-2xs transition-colors shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>স্পেশালিস্টের সাথে সরাসরি চ্যাট করুন</span>
              </button>
            )}
          </div>
        );
      })()}

      {/* ডেলিভারি অনুমোদন ও সম্পন্ন করার বড় হাইলাইট ব্যানার (যদি status === 'delivered' হয়) */}
      {order.status === 'delivered' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> কাজ ডেলিভারি সম্পন্ন হয়েছে
              </div>
              <h3 className="text-lg font-bold">কাজটি যাচাই করুন এবং ডেলিভারি গ্রহণ নিশ্চিত করুন</h3>
              <p className="text-xs text-emerald-100 leading-relaxed max-w-2xl">
                আপনার দায়িত্বপ্রাপ্ত কর্মকর্তা প্রজেক্টের ফাইল ডেলিভারি করেছেন। ফাইলগুলো ডাউনলোড করে দেখে নিন। সবকিছু ঠিক থাকলে &quot;ডেলিভারি গ্রহণ ও সম্পন্ন করুন&quot; বাটনে ক্লিক করে অর্ডারটি সফলভাবে সম্পন্ন করুন। কোনো পরিবর্তন দরকার হলে রিভিশন চাইতে পারেন।
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={() => setRevisionModalOpen(true)}
                className="px-4 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/30 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>রিভিশনের অনুরোধ</span>
              </button>
              <button
                onClick={handleConfirmCompletion}
                disabled={isConfirmingCompletion}
                className="px-5 py-2.5 text-xs font-bold bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{isConfirmingCompletion ? 'সম্পন্ন হচ্ছে...' : 'ডেলিভারি গ্রহণ ও সম্পন্ন করুন'}</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-100 bg-emerald-800/40 px-3.5 py-2.5 rounded-xl">
            <Clock className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong className="text-white font-medium">⏰ ৪৮ ঘণ্টার স্বয়ংক্রিয় সমাপ্তি নীতি:</strong> ডেলিভারি পাওয়ার ৪৮ ঘণ্টার মধ্যে আপনি ডেলিভারি গ্রহণ বা কোনো রিভিশনের আবেদন না জানালে, সিস্টেম অর্ডারটি স্বয়ংক্রিয়ভাবে সফল ঘোষণা করবে এবং কর্মকর্তা/অ্যাডমিনকে কাজের অর্থ ছাড় করবে।
            </span>
          </div>
        </div>
      )}

      {/* সম্পন্ন অর্ডার নিশ্চিতকরণ ব্যানার (কোনো রিভিউ ছাড়া) */}
      {order.status === 'completed' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-emerald-950">কাজটি সফলভাবে সম্পন্ন হয়েছে! 🎉</h4>
              <p className="text-xs text-emerald-700 mt-0.5">
                আপনার অর্ডারের ডেলিভারিকৃত সকল ফাইল ড্যাশবোর্ডে নিরাপদে সংরক্ষিত রয়েছে। যেকোনো সময় ফাইল ডাউনলোড করতে পারবেন।
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('deliverables')}
            className="px-4 py-2 text-xs font-bold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-2xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>ফাইলসমূহ দেখুন</span>
          </button>
        </div>
      )}

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
      {(order.status === 'refunded' || order.status === 'cancelled' || Boolean(order.refund_amount && order.refund_amount > 0)) && (
        <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 space-y-1">
          <div className="font-bold text-sm">অর্থ ফেরত (Refund) সম্পন্ন হয়েছে</div>
          <p className="leading-relaxed">
            এই অর্ডারের সম্পূর্ণ <strong>{toBengaliCurrency(order.refund_amount || order.amount)}</strong> আপনার ওয়ালেট ব্যালেন্সে ফেরত পাঠানো হয়েছে।
            {order.cancellation_reason && (
              <span className="block mt-1 text-cyan-800">
                বাতিল/রিফান্ডের কারণ: {order.cancellation_reason}
              </span>
            )}
          </p>
        </div>
      )}

      {/* ট্যাব নেভিগেশন */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('deliverables')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'deliverables'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>ফাইল ও কাজের বিবরণ</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
            {toBengaliDigits(order.deliverables?.length || 0)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'chat'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>অর্ডার চ্যাট ও যোগাযোগ</span>
          {messages.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-mono">
              {toBengaliDigits(messages.length)}
            </span>
          )}
        </button>


      </div>

      {/* ট্যাব ১: ফাইল ও কাজের বিবরণ */}
      {activeTab === 'deliverables' && (
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
                <div className="text-xs space-y-2 border-t border-slate-100 pt-3">
                  <span className="font-semibold text-slate-700 block">সংযুক্ত প্রজেক্ট ফাইল / পিডিএফ:</span>
                  {order.attachment_url ? (
                    <div className="space-y-2">
                      <a
                        href={order.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        download={order.attachment_name}
                        className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition-colors"
                      >
                        <Download className="w-4 h-4 text-indigo-600" />
                        <span>{order.attachment_name} (ডাউনলোড / দেখুন)</span>
                      </a>
                      {order.attachment_url.toLowerCase().includes('.pdf') || order.attachment_url.startsWith('data:application/pdf') ? (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 max-h-80">
                          <iframe src={order.attachment_url} title={order.attachment_name} className="w-full h-72 border-none" />
                        </div>
                      ) : order.attachment_url.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(order.attachment_name) ? (
                        <div className="rounded-xl overflow-hidden border border-slate-200 max-h-80 bg-slate-100 p-2 text-center">
                          <img src={order.attachment_url} alt={order.attachment_name} className="max-h-64 mx-auto rounded object-contain" />
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <span className="font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-800">
                      {order.attachment_name}
                    </span>
                  )}
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
                        : evt.event_type === 'ORDER_CLAIMED'
                        ? 'স্পেশালিস্ট দায়িত্ব গ্রহণ'
                        : evt.event_type === 'ORDER_RELEASED'
                        ? 'অ্যাডমিন পুলে অবমুক্ত'
                        : evt.event_type === 'DELIVERABLE_UPLOADED'
                        ? 'ফাইল ডেলিভারি সম্পন্ন'
                        : evt.event_type === 'ORDER_COMPLETED'
                        ? 'কাজ গ্রহণ ও অনুমোদন'
                        : evt.event_type === 'REVIEW_SUBMITTED'
                        ? 'রিভিউ জমা'
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
      )}

      {/* ট্যাব ২: সরাসরি অর্ডার চ্যাট */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-xs text-slate-800">
                অর্ডার ওয়ার্করুম চ্যাট {order.assigned_admin_name ? `(${order.assigned_admin_name}-এর সাথে)` : ''}
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              {order.assigned_admin_name
                ? 'আপনার নিয়োজিত স্পেশালিস্টের সাথে সরাসরি বার্তা বিনিময়'
                : 'সকল অ্যাডমিনের কাছে দৃশ্যমান মেসেজ রুম'}
            </span>
          </div>

          {/* চ্যাট ফিড */}
          <div ref={chatContainerRef} className="p-4 space-y-3 min-h-[300px] max-h-[460px] overflow-y-auto bg-slate-50/40">
            {messages.length === 0 ? (
              <div className="text-center py-12 text-xs text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p>এখনও কোনো বার্তা আদান-প্রদান করা হয়নি।</p>
                <p className="text-[11px] text-slate-500">
                  কাজের রিকোয়ারমেন্ট, প্রশ্ন বা ফাইল সংক্রান্ত যেকোনো কিছু এখানে লিখতে পারেন।
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = (msg.sender_role as string) === 'customer' || Boolean(user?.id && (msg.sender_id === user.id || msg.sender_id === user.email));
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700">
                        {isMe ? 'আপনি (গ্রাহক)' : `${msg.sender_name || order.assigned_admin_name || 'দায়িত্বপ্রাপ্ত স্পেশালিস্ট'} (স্পেশালিস্ট)`}
                      </span>
                      <span>•</span>
                      <span>{toBengaliDate(msg.created_at)}</span>
                    </div>
                    <div
                      className={`max-w-[85%] sm:max-w-lg p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-none shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.message || msg.message_content || ''}</p>
                      {msg.attachment_url && (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-2 inline-flex items-center gap-1 text-[11px] font-mono underline ${
                            isMe ? 'text-indigo-100 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'
                          }`}
                        >
                          <Paperclip className="w-3 h-3" />
                          <span>{msg.attachment_name || 'সংযুক্ত ফাইল ডাউনলোড'}</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* চ্যাট সেন্ড ইনপুট */}
          <form onSubmit={handleSendChatMessage} className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2 relative z-10">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="দায়িত্বপ্রাপ্ত স্পেশালিস্টের জন্য বার্তা লিখুন..."
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all min-w-0 shadow-inner"
            />
            <button
              type="submit"
              disabled={sendingChat || !chatInput.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0 shadow-md cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{sendingChat ? 'পাঠানো...' : 'পাঠান'}</span>
            </button>
          </form>
        </div>
      )}



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
