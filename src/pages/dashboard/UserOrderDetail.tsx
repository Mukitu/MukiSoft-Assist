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
  const [activeTab, setActiveTab] = useState<'deliverables' | 'chat' | 'reviews'>('deliverables');

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

  // অর্ডার চ্যাট স্টেট
  const [messages, setMessages] = useState<OrderWorkMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ক্লায়েন্ট রিভিউ স্টেট
  const [customerRating, setCustomerRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [customerComment, setCustomerComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      const data = await api.getOrderById(orderId, user.id, false);
      setOrder(data);
      const msgs = await api.getOrderMessages(orderId);
      setMessages(msgs);
    } catch (err) {
      console.warn('Failed to load order details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // লাইভ চ্যাট মেসেজ লিসেনার
    const handleChatEvt = (e: Event) => {
      const customEvt = e as CustomEvent<{ orderId: string; message: OrderWorkMessage }>;
      if (customEvt.detail && customEvt.detail.orderId === orderId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === customEvt.detail.message.id)) return prev;
          return [...prev, customEvt.detail.message];
        });
      }
    };

    const handleClaimEvt = (e: Event) => {
      const customEvt = e as CustomEvent<{ orderId: string; order: Order }>;
      if (customEvt.detail && customEvt.detail.orderId === orderId) {
        setOrder(customEvt.detail.order);
      }
    };

    window.addEventListener('order_message_sent', handleChatEvt);
    window.addEventListener('order_claimed', handleClaimEvt);

    // লাইভ পোলিং
    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => {
      window.removeEventListener('order_message_sent', handleChatEvt);
      window.removeEventListener('order_claimed', handleClaimEvt);
      clearInterval(interval);
    };
  }, [orderId, user]);

  useEffect(() => {
    if (activeTab === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
    const confirmed = window.confirm(
      'আপনি কি ডেলিভারিকৃত কাজ যাচাই করেছেন এবং সম্পন্ন ঘোষণা করতে চান? নিশ্চিত করলে কাজের অর্থ অ্যাডমিনকে রিলিজ করা হবে এবং আপনি রিভিউ প্রদান করতে পারবেন।'
    );
    if (!confirmed) return;

    setIsConfirmingCompletion(true);
    try {
      await api.confirmOrderCompletion(order.id, user.id);
      showToast({
        type: 'success',
        title: 'অর্ডার সফলভাবে সম্পন্ন হয়েছে! 🎉',
        message: 'কাজটি সফলভাবে সম্পন্ন হিসেবে চিহ্নিত করা হয়েছে। আপনার অভিজ্ঞতা শেয়ার করতে একটি রিভিউ দিন।',
      });
      setActiveTab('reviews');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অর্ডার সম্পন্নকরণ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsConfirmingCompletion(false);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatInput.trim() || sendingChat) return;

    setSendingChat(true);
    try {
      const senderName = profile?.full_name || user.email?.split('@')[0] || 'গ্রাহক';
      await api.sendOrderMessage(order.id, user.id, senderName, 'customer', chatInput.trim());
      setChatInput('');
      const updatedMsgs = await api.getOrderMessages(order.id);
      setMessages(updatedMsgs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'মেসেজ পাঠানো ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSendingChat(false);
    }
  };

  const handleSubmitCustomerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !order) return;
    if (!customerComment.trim()) {
      showToast({ type: 'error', title: 'মন্তব্য আবশ্যক', message: 'দয়া করে আপনার কাজের অভিজ্ঞতা বা মন্তব্য লিখুন।' });
      return;
    }

    setSubmittingReview(true);
    try {
      const reviewerName = profile?.full_name || user.email?.split('@')[0] || 'গ্রাহক';
      await api.submitOrderReview(
        order.id,
        user.id,
        reviewerName,
        'customer',
        customerRating,
        customerComment.trim()
      );
      showToast({
        type: 'success',
        title: 'রিভিউ সফলভাবে জমা হয়েছে! ⭐',
        message: 'আপনার মূল্যবান মূল্যায়নের জন্য ধন্যবাদ।',
      });
      setCustomerComment('');
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রিভিউ সাবমিট ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSubmittingReview(false);
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
          <span className="text-xs text-slate-400 block">এসক্রো রক্ষিত মূল্য</span>
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

      {/* স্পেশালিস্ট অ্যাডমিন অ্যাসাইনমেন্ট স্ট্যাটাস ব্যানার */}
      {(() => {
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
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> কাজ ডেলিভারি সম্পন্ন হয়েছে
              </div>
              <h3 className="text-lg font-bold">কাজটি যাচাই করুন এবং ডেলিভারি গ্রহণ নিশ্চিত করুন</h3>
              <p className="text-xs text-emerald-100 leading-relaxed max-w-2xl">
                আপনার দায়িত্বপ্রাপ্ত অ্যাডমিন প্রজেক্টের ফাইল ডেলিভারি করেছেন। ফাইলগুলো ডাউনলোড করে দেখে নিন। সবকিছু ঠিক থাকলে &quot;ডেলিভারি গ্রহণ ও সম্পন্ন করুন&quot; বাটনে ক্লিক করে অর্ডারটি সফলভাবে সম্পন্ন করুন। কোনো পরিবর্তন দরকার হলে রিভিশন চাইতে পারেন।
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
        </div>
      )}

      {/* সম্পন্ন অর্ডার ও রিভিউ আমন্ত্রণ ব্যানার */}
      {order.status === 'completed' && !order.customer_review && (
        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 fill-white" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-indigo-950">কাজটি সফলভাবে সম্পন্ন হয়েছে!</h4>
              <p className="text-xs text-indigo-700 mt-0.5">
                দায়িত্বপ্রাপ্ত অ্যাডমিনের কাজের মান ও অভিজ্ঞতা সম্পর্কে একটি রেটিং ও রিভিউ প্রদান করুন।
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('reviews')}
            className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors shrink-0"
          >
            রিভিউ লিখুন
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

        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'reviews'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          <span>মিউচুয়াল রিভিউ ও রেটিং</span>
          {(order.customer_review || order.admin_review) && (
            <span className="w-2 h-2 rounded-full bg-amber-500" />
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
          <div className="p-4 space-y-3 min-h-[300px] max-h-[460px] overflow-y-auto bg-slate-50/40">
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
                const isMe = msg.sender_role === 'customer';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700">{isMe ? 'আপনি (গ্রাহক)' : `${msg.sender_name} (অ্যাডমিন)`}</span>
                      <span>•</span>
                      <span>{toBengaliDate(msg.created_at)}</span>
                    </div>
                    <div
                      className={`max-w-[85%] sm:max-w-lg p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.message}</p>
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
            <div ref={messagesEndRef} />
          </div>

          {/* চ্যাট সেন্ড ইনপুট */}
          <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="অ্যাডমিনের জন্য বার্তা লিখুন..."
              className="flex-1 px-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
            />
            <button
              type="submit"
              disabled={sendingChat || !chatInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingChat ? 'পাঠানো হচ্ছে...' : 'পাঠান'}</span>
            </button>
          </form>
        </div>
      )}

      {/* ট্যাব ৩: মিউচুয়াল রিভিউ ও রেটিং */}
      {activeTab === 'reviews' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ক্লায়েন্ট কর্তৃক রিভিউ বক্স */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <h3 className="font-bold text-sm text-slate-900">আপনার রিভিউ ও কাজের রেটিং</h3>
            </div>

            {order.customer_review ? (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (order.customer_review?.rating || 5)
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-amber-900 ml-1.5">
                      {toBengaliDigits(order.customer_review.rating)} / ৫
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {toBengaliDate(order.customer_review.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed italic">
                  &quot;{order.customer_review.comment}&quot;
                </p>
                <div className="text-[10px] text-slate-500 pt-1">
                  মূল্যায়নকারী: {order.customer_review.reviewer_name}
                </div>
              </div>
            ) : order.status === 'completed' ? (
              <form onSubmit={handleSubmitCustomerReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    কাজের মান রেটিং দিন:
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCustomerRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= (hoverRating || customerRating)
                              ? 'text-amber-500 fill-amber-500'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">
                      {toBengaliDigits(hoverRating || customerRating)} স্টার
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    আপনার মন্তব্য লিখুন <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={customerComment}
                    onChange={(e) => setCustomerComment(e.target.value)}
                    placeholder="কাজের মান, নিয়মানুবর্তিতা এবং স্পেশালিস্টের আচরণ সম্পর্কে লিখুন..."
                    className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Star className="w-3.5 h-3.5 fill-white" />
                  <span>{submittingReview ? 'জমা হচ্ছে...' : 'রিভিউ জমা দিন'}</span>
                </button>
              </form>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <Lock className="w-5 h-5 mx-auto text-slate-400" />
                <p className="font-semibold text-slate-700">কাজটি এখনও সম্পন্ন হয়নি</p>
                <p>কাজ ডেলিভারি হওয়ার পর আপনি ডেলিভারি নিশ্চিত করলেই এখানে রিভিউ দিতে পারবেন।</p>
              </div>
            )}
          </div>

          {/* দায়িত্বপ্রাপ্ত অ্যাডমিনের রিভিউ বক্স (গ্রাহকের ওপর মূল্যায়ন) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">স্পেশালিস্ট অ্যাডমিনের মূল্যায়ন</h3>
            </div>

            {order.admin_review ? (
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (order.admin_review?.rating || 5)
                            ? 'text-emerald-600 fill-emerald-600'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                    <span className="text-xs font-bold text-emerald-900 ml-1.5">
                      {toBengaliDigits(order.admin_review.rating)} / ৫
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {toBengaliDate(order.admin_review.created_at)}
                  </span>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed italic">
                  &quot;{order.admin_review.comment}&quot;
                </p>
                <div className="text-[10px] text-emerald-800 font-semibold pt-1">
                  মূল্যায়নকারী: {order.admin_review.reviewer_name} (দায়িত্বপ্রাপ্ত স্পেশালিস্ট)
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <Clock className="w-5 h-5 mx-auto text-slate-400" />
                <p className="font-semibold text-slate-700">অ্যাডমিনের রিভিউয়ের অপেক্ষায়</p>
                <p>কাজ সম্পন্ন হওয়ার পর অ্যাডমিন আপনার সাথে যোগাযোগের ভিত্তিতে মূল্যায়ন প্রদান করবেন।</p>
              </div>
            )}
          </div>
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
