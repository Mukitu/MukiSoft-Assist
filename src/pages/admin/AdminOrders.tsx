import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
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
  UserCheck,
  Lock,
  Unlock,
  Star,
  MessageSquare,
  Send,
  Sparkles,
  ShieldAlert,
  Clock,
  User,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Order, OrderStatus, OrderWorkMessage } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useMessages } from '../../hooks/useMessages';
import { Pagination } from '../../components/common/Pagination';
import { FilePreviewModal } from '../../components/common/FilePreviewModal';
import { downloadFile } from '../../utils/fileViewer';

export const AdminOrders: React.FC = () => {
  const { user, profile, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const raw = localStorage.getItem('mukisoft_demo_orders');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unassigned' | 'my_orders' | 'other_orders' | 'delivered' | 'completed' | 'refunded'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // বিস্তারিত দেখার জন্য সিলেক্টেড অর্ডার
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'brief' | 'chat' | 'deliverables' | 'reviews'>('brief');

  // অর্ডার চ্যাট হুক
  const { messages: orderMessages, sending: sendingOrderMessage, sendMessage: sendOrderMsgViaHook } = useMessages(selectedOrder?.id);
  const [orderMessageInput, setOrderMessageInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // অ্যাডমিন রিভিউ স্টেট
  const [adminRating, setAdminRating] = useState<number>(5);
  const [adminReviewComment, setAdminReviewComment] = useState('');
  const [submittingAdminReview, setSubmittingAdminReview] = useState(false);

  // ফাইল প্রিভিউ মোডাল স্টেট
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; notes?: string }>({ url: '', name: '' });

  // ফাইল ডেলিভারি ফর্ম স্টেট
  const [activeOrderForDeliverable, setActiveOrderForDeliverable] = useState<Order | null>(null);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; type: string; dataUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      showToast({ type: 'error', title: 'ফাইলটি বড়', message: 'সর্বোচ্চ ২৫ মেগাবাইট পর্যন্ত ফাইল সরাসরি আপলোড করা যাবে।' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl,
      });
      if (!deliverableTitle.trim()) {
        setDeliverableTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      if (!deliverableUrl.trim()) {
        setDeliverableUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // রিফান্ড মডাল স্টেট
  const [refundOrderTarget, setRefundOrderTarget] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);

  // গ্রাহকের কাছে অতিরিক্ত তথ্য চাওয়ার স্টেট
  const [needsInfoOrderTarget, setNeedsInfoOrderTarget] = useState<Order | null>(null);
  const [needsInfoMessage, setNeedsInfoMessage] = useState('');

  // অর্ডার লোড
  const loadOrders = async () => {
    try {
      const data = await api.getAllOrders();
      setOrders(data);
      if (selectedOrder) {
        const refreshed = data.find((o) => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);
      }
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অর্ডার তালিকা লোড করা যায়নি' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const handleUpdate = () => loadOrders();
    window.addEventListener('orders_updated', handleUpdate);
    window.addEventListener('order_claimed', handleUpdate);
    window.addEventListener('order_released', handleUpdate);

    const interval = setInterval(loadOrders, 4000);

    return () => {
      window.removeEventListener('orders_updated', handleUpdate);
      window.removeEventListener('order_claimed', handleUpdate);
      window.removeEventListener('order_released', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const prevOrderMsgCountRef = useRef(0);
  useEffect(() => {
    if (modalTab === 'chat' && chatContainerRef.current) {
      if (orderMessages.length > prevOrderMsgCountRef.current || prevOrderMsgCountRef.current === 0) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
    prevOrderMsgCountRef.current = orderMessages.length;
  }, [orderMessages, modalTab]);

  const handleClaimOrder = async (targetOrder: Order) => {
    if (!user || claimingOrderId === targetOrder.id) return;
    setClaimingOrderId(targetOrder.id);
    const adminName = profile?.full_name || user.email?.split('@')[0] || 'স্পেশালিস্ট অ্যাডমিন';
    const now = new Date().toISOString();

    const optimisticUpdated: Order = {
      ...targetOrder,
      assigned_admin: user.id,
      assigned_admin_name: adminName,
      assigned_admin_email: user.email || null,
      claimed_at: now,
      status: 'in_progress',
      updated_at: now,
    };

    setOrders((prev) => prev.map((o) => (o.id === targetOrder.id ? optimisticUpdated : o)));
    if (selectedOrder && selectedOrder.id === targetOrder.id) {
      setSelectedOrder(optimisticUpdated);
    }

    showToast({
      type: 'success',
      title: 'কাজটি সফলভাবে গ্রহণ করা হয়েছে! 🎯',
      message: `অর্ডার #${targetOrder.order_number} এখন আপনার দায়িত্বে অ্যাসাইন করা হয়েছে। আপনি এখন ক্লায়েন্টের একমাত্র দায়িত্বপ্রাপ্ত অ্যাডমিন।`,
    });

    try {
      const updated = await api.claimOrder(targetOrder.id, user.id, adminName, user.email || '');
      setOrders((prev) => prev.map((o) => (o.id === targetOrder.id ? updated : o)));
      if (selectedOrder && selectedOrder.id === targetOrder.id) {
        setSelectedOrder(updated);
      }
    } catch (err: unknown) {
      setOrders((prev) => prev.map((o) => (o.id === targetOrder.id ? targetOrder : o)));
      const msg = err instanceof Error ? err.message : 'কাজটি গ্রহণ করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ক্লেইম ব্যর্থ', message: msg });
    } finally {
      setClaimingOrderId(null);
    }
  };

  // ২. কাজ রিলিজ / আন-অ্যাসাইন করা (Release Order)
  const handleReleaseOrder = async (targetOrder: Order) => {
    if (!user) return;
    try {
      const updated = await api.releaseOrder(targetOrder.id, user.id, isSuperAdmin);
      setOrders((prev) => prev.map((o) => (o.id === targetOrder.id ? updated : o)));
      if (selectedOrder && selectedOrder.id === targetOrder.id) {
        setSelectedOrder(updated);
      }
      showToast({
        type: 'info',
        title: 'কাজটি উন্মুক্ত করা হয়েছে',
        message: `অর্ডার #${targetOrder.order_number} এখন অন্যান্য অ্যাডমিনদের ক্লেইম করার জন্য উন্মুক্ত।`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রিলিজ করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    }
  };

  // ৩. সরাসরি চ্যাটে বার্তা প্রেরণ
  const handleSendOrderMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOrder || !orderMessageInput.trim() || sendingOrderMessage) return;

    const adminName = profile?.full_name || 'দায়িত্বপ্রাপ্ত অ্যাডমিন';
    const text = orderMessageInput.trim();
    setOrderMessageInput('');

    try {
      await sendOrderMsgViaHook(user.id, adminName, 'admin', text);
      showToast({
        type: 'success',
        title: 'বার্তা প্রেরিত হয়েছে',
        message: 'গ্রাহকের নিকট অর্ডার আপডেট ও মেসেজ পৌঁছেছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'বার্তা পাঠানো যায়নি' });
    }
  };

  // ৪. গ্রাহককে অ্যাডমিন কর্তৃক রিভিউ প্রদান
  const handleSubmitAdminReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOrder || !adminReviewComment.trim() || submittingAdminReview) return;

    const adminName = profile?.full_name || 'দায়িত্বপ্রাপ্ত অ্যাডমিন';
    setSubmittingAdminReview(true);

    try {
      const rev = await api.submitOrderReview(
        selectedOrder.id,
        user.id,
        adminName,
        'admin',
        adminRating,
        adminReviewComment.trim()
      );
      setSelectedOrder((prev) => (prev ? { ...prev, admin_review: rev } : null));
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, admin_review: rev } : o))
      );
      showToast({
        type: 'success',
        title: 'মূল্যায়ন সফল হয়েছে ⭐',
        message: 'গ্রাহকের ওপর আপনার রিভিউ সফলভাবে সংরক্ষিত হয়েছে।',
      });
      setAdminReviewComment('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রিভিউ সংরক্ষণ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSubmittingAdminReview(false);
    }
  };

  // কাজের অবস্থা পরিবর্তন
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

  // ফাইল ডেলিভারি
  const handleUploadDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeOrderForDeliverable || !deliverableTitle.trim()) return;

    // চেক: অন্য অ্যাডমিনের কাজ হলে নন-সুপার অ্যাডমিন ফাইল আপলোড করতে পারবে না
    if (activeOrderForDeliverable.assigned_admin && activeOrderForDeliverable.assigned_admin !== user.id && !isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'অনুমতি নেই',
        message: 'এই কাজটি অন্য একজন অ্যাডমিন সম্পাদন করছেন। শুধুমাত্র দায়িত্বপ্রাপ্ত অ্যাডমিন ডেলিভারি দিতে পারবেন।',
      });
      return;
    }

    try {
      const fileUrl = deliverableUrl.trim() || selectedFile?.dataUrl || 'https://mukisoft.com/deliverables/sample_output.pdf';
      await api.addOrderDeliverable(activeOrderForDeliverable.id, user.id, {
        title: deliverableTitle,
        fileUrl,
        fileSize: selectedFile?.size,
        fileType: selectedFile?.type,
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
      setSelectedFile(null);
      setDeliverableNotes('');
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'ফাইল ডেলিভারি ব্যর্থ হয়েছে' });
    }
  };

  // রিফান্ড প্রসেস
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

  // অতিরিক্ত তথ্য চাওয়া
  const handleRequestNeedsInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !needsInfoOrderTarget || !needsInfoMessage.trim()) return;

    try {
      const adminName = profile?.full_name || user.email?.split('@')[0] || 'স্পেশালিস্ট অ্যাডমিন';

      await api.updateOrderStatus(
        needsInfoOrderTarget.id,
        'needs_information',
        user.id,
        `অ্যাডমিন তথ্যের অনুরোধ করেছেন: ${needsInfoMessage.trim()}`
      );

      // চ্যাটেও লাইভ বার্তা যুক্ত করা
      await api.sendOrderMessage(
        needsInfoOrderTarget.id,
        user.id,
        adminName,
        'admin',
        `⚠️ অতিরিক্ত তথ্য প্রয়োজন:\n${needsInfoMessage.trim()}`
      ).catch((err) => console.warn('Info request chat message warning:', err));

      showToast({
        type: 'info',
        title: 'তথ্যের অনুরোধ পাঠানো হয়েছে',
        message: 'গ্রাহকের অর্ডারের অবস্থা "অতিরিক্ত তথ্য প্রয়োজন" হিসেবে সফলভাবে আপডেট করা হয়েছে।',
      });

      setOrders((prev) =>
        prev.map((o) => (o.id === needsInfoOrderTarget.id ? { ...o, status: 'needs_information' } : o))
      );

      if (selectedOrder && selectedOrder.id === needsInfoOrderTarget.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'needs_information' } : null));
      }

      setNeedsInfoOrderTarget(null);
      setNeedsInfoMessage('');
    } catch (err) {
      console.warn('Info request error:', err);
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অনুরোধ পাঠাতে ব্যর্থ হয়েছে' });
    }
  };

  // পরিসংখ্যান কাউন্ট
  const unassignedCount = orders.filter((o) => !o.assigned_admin && !['cancelled', 'refunded', 'completed'].includes(o.status)).length;
  const myOrdersCount = orders.filter((o) => o.assigned_admin === user?.id).length;
  const otherOrdersCount = orders.filter((o) => o.assigned_admin && o.assigned_admin !== user?.id).length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  const filteredOrders = orders.filter((o) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      !search ||
      o.order_number.toLowerCase().includes(searchLower) ||
      (o.customer?.email && o.customer.email.toLowerCase().includes(searchLower)) ||
      (o.assigned_admin_name && o.assigned_admin_name.toLowerCase().includes(searchLower)) ||
      (o.service?.title_bn && o.service.title_bn.includes(search)) ||
      (o.service?.title && o.service.title.toLowerCase().includes(searchLower));

    if (!matchesSearch) return false;

    // গোপনীয়তা ও দৃষ্টিসীমা নীতি: দায়িত্ব নেওয়ার পর কাজটি অন্যদের দৃষ্টিসীমার বাইরে চলে যাবে
    if (statusFilter === 'all') {
      if (isSuperAdmin) return true;
      // সাধারণ অ্যাডমিনদের জন্য শুধুমাত্র উন্মুক্ত কাজ এবং নিজের কাজ দৃশ্যমান থাকবে
      return !o.assigned_admin || o.assigned_admin === user?.id;
    }
    if (statusFilter === 'unassigned') return !o.assigned_admin && !['cancelled', 'refunded', 'completed'].includes(o.status);
    if (statusFilter === 'my_orders') return o.assigned_admin === user?.id;
    if (statusFilter === 'other_orders') {
      if (!isSuperAdmin) return false;
      return Boolean(o.assigned_admin && o.assigned_admin !== user?.id);
    }
    if (statusFilter === 'delivered') return o.status === 'delivered';
    if (statusFilter === 'completed') return o.status === 'completed';
    if (statusFilter === 'refunded') return ['cancelled', 'refunded'].includes(o.status);
    return o.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            মাল্টি-অ্যাডমিন ডেলিভারি পাইপলাইন
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">অর্ডার ও ডেলিভারি কনসোল</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ১৫-৩০ জন অ্যাডমিনের মধ্যে কাজ অ্যাসাইন করুন, সরাসরি ক্লায়েন্টের সাথে যোগাযোগ করুন এবং রিভিউ আদান-প্রদান করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unassignedCount > 0 && (
            <button
              onClick={() => setStatusFilter('unassigned')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold animate-pulse"
            >
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>{toBengaliDigits(unassignedCount)}টি কাজ উন্মুক্ত রয়েছে!</span>
            </button>
          )}

          <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold">
            মোট {toBengaliDigits(orders.length)}টি অর্ডার
          </div>
        </div>
      </div>

      {/* সার্চ ও মাল্টি-অ্যাডমিন ফিল্টার বার */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="অর্ডার নম্বর, অ্যাডমিনের নাম বা সেবার নাম..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        {/* মাল্টি-অ্যাডমিন অ্যাসাইনমেন্ট ফিল্টার */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg overflow-x-auto scrollbar-none">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            সবগুলো ({toBengaliDigits(orders.length)})
          </button>

          <button
            onClick={() => setStatusFilter('unassigned')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'unassigned'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>উন্মুক্ত / ক্লেইমযোগ্য ({toBengaliDigits(unassignedCount)})</span>
          </button>

          <button
            onClick={() => setStatusFilter('my_orders')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              statusFilter === 'my_orders'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>আমার কাজ ({toBengaliDigits(myOrdersCount)})</span>
          </button>

          <button
            onClick={() => setStatusFilter('other_orders')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors flex items-center gap-1 ${
              statusFilter === 'other_orders'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>অন্যান্য অ্যাডমিন ({toBengaliDigits(otherOrdersCount)})</span>
          </button>

          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'delivered' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ডেলিভারি প্রস্তুত ({toBengaliDigits(deliveredCount)})
          </button>

          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              statusFilter === 'completed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            সম্পূর্ণ সমাপ্ত ({toBengaliDigits(completedCount)})
          </button>
        </div>
      </div>

      {/* অর্ডার তালিকা টেবিল */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
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
                  <th className="py-3 px-4 font-medium">দায়িত্বপ্রাপ্ত অ্যাডমিন</th>
                  <th className="py-3 px-4 font-medium">কাজের অবস্থা</th>
                  <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((ord) => {
                  const isClaimedByMe = ord.assigned_admin === user?.id;
                  const isUnassigned = !ord.assigned_admin;

                  return (
                    <tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{ord.order_number}</td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-700 max-w-[130px] truncate">
                        {ord.customer?.email || ord.user_id}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 max-w-[180px] truncate">
                        {ord.service?.title_bn || ord.service?.title}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        {toBengaliCurrency(ord.amount)}
                      </td>

                      {/* দায়িত্বপ্রাপ্ত অ্যাডমিন কলাম */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const isDoneOrRefunded = ['cancelled', 'refunded'].includes(ord.status) || Boolean(ord.refund_amount && ord.refund_amount > 0);
                          if (isDoneOrRefunded) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 font-semibold rounded-lg text-[11px] border border-rose-200">
                                বাতিল ও রিফান্ডকৃত
                              </span>
                            );
                          }
                          if (isUnassigned) {
                            return (
                              <button
                                onClick={() => handleClaimOrder(ord)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-lg text-xs shadow-2xs transition-all animate-pulse"
                                title="এই কাজটি নিজের দায়িত্বে নিয়ে নিন"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>আমি কাজটি নিচ্ছি (Claim)</span>
                              </button>
                            );
                          }
                          if (isClaimedByMe) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>আমার দায়িত্ব ({ord.assigned_admin_name || 'আমি'})</span>
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded-lg text-[11px] border border-slate-200">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>{ord.assigned_admin_name || 'অন্য অ্যাডমিন'}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* কাজের অবস্থা সিলেক্ট */}
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

                      {/* পদক্ষেপ বোতামসমূহ */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setModalTab('brief');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                            title="বিস্তারিত ও চ্যাট দেখুন"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>বিস্তারিত</span>
                          </button>

                          <button
                            onClick={() => {
                              setActiveOrderForDeliverable(ord);
                              setDeliverableTitle(`ডেলিভারি ফাইল — ${ord.service?.title_bn || ord.service?.title}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg text-xs transition-colors"
                            title="ফাইল ডেলিভারি করুন"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>ডেলিভারি</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* গ্লোবাল পেজিনেশন বার */}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredOrders.length / pageSize)}
              totalItems={filteredOrders.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* পূর্ণাঙ্গ অর্ডার ওয়ার্করুম ও বিস্তারিত মডাল */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* মডাল হেডার */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-slate-900">{selectedOrder.order_number}</span>
                  <StatusBadge status={selectedOrder.status} variant="admin" />
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
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* অ্যাডমিন ক্লেইম ও অ্যাসাইনমেন্ট স্ট্যাটাস বক্স */}
            {(() => {
              const isRefundedOrCancelled = ['cancelled', 'refunded'].includes(selectedOrder.status) || Boolean(selectedOrder.refund_amount && selectedOrder.refund_amount > 0);
              if (isRefundedOrCancelled) {
                return (
                  <div className="p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs bg-cyan-50/70 border-cyan-200 text-cyan-900">
                    <div>
                      <span className="font-bold block text-cyan-950">এই অর্ডারটি বাতিল ও অর্থ ফেরত (Refunded) সম্পন্ন হয়েছে</span>
                      <p className="text-[11px] text-cyan-800 mt-0.5">
                        অর্ডারের সম্পূর্ণ অর্থ {toBengaliCurrency(selectedOrder.refund_amount || selectedOrder.amount)} গ্রাহকের ওয়ালেটে ফেরত দেওয়া হয়েছে। এই অর্ডারে আর কোনো কাজের প্রয়োজন নেই।
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 border-slate-200">
                  <div className="space-y-1">
                    <span className="font-bold block text-slate-900">
                      {selectedOrder.assigned_admin
                        ? `দায়িত্বপ্রাপ্ত স্পেশালিস্ট অ্যাডমিন: ${selectedOrder.assigned_admin_name || 'নির্ধারিত অ্যাডমিন'}`
                        : '⚠️ কোনো অ্যাডমিন এখনও দায়িত্ব নেননি (উন্মুক্ত অর্ডার)'}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {selectedOrder.assigned_admin
                        ? `ক্লেইম সময়: ${toBengaliDate(selectedOrder.claimed_at || selectedOrder.created_at)}। ডুপ্লিকেট কাজ রোধে এটি লক করা আছে।`
                        : '২০-৩০ জন অ্যাডমিনের মধ্যে যিনি এই কাজে পারদর্শী, তিনি অবিলম্বে কাজটি ক্লেইম করে ক্লায়েন্টের সাথে যোগাযোগ শুরু করুন।'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!selectedOrder.assigned_admin ? (
                      <button
                        onClick={() => handleClaimOrder(selectedOrder)}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-all animate-pulse"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>এই কাজটি আমি নিচ্ছি (Claim)</span>
                      </button>
                    ) : selectedOrder.assigned_admin === user?.id ? (
                      <button
                        onClick={() => handleReleaseOrder(selectedOrder)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1"
                        title="অন্য অ্যাডমিনদের জন্য উন্মুক্ত করুন"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>রিলিজ করুন</span>
                      </button>
                    ) : isSuperAdmin ? (
                      <button
                        onClick={() => handleReleaseOrder(selectedOrder)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs border border-rose-200 transition-colors"
                      >
                        পুনরায় উন্মুক্ত করুন (Super Admin)
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-200 text-slate-600 rounded-md font-medium text-[11px]">
                        লকড (অন্যের কাজ)
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* মডাল ট্যাব বার */}
            <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setModalTab('brief')}
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  modalTab === 'brief'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                প্রজেক্ট ব্রিফ ও তথ্য
              </button>
              <button
                onClick={() => setModalTab('chat')}
                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === 'chat'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>সরাসরি অর্ডার চ্যাট ({toBengaliDigits(orderMessages.length)})</span>
              </button>
              <button
                onClick={() => setModalTab('deliverables')}
                className={`pb-2.5 px-3 border-b-2 transition-colors ${
                  modalTab === 'deliverables'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                ডেলিভারি ফাইলসমূহ ({toBengaliDigits(selectedOrder.deliverables?.length || 0)})
              </button>
              <button
                onClick={() => setModalTab('reviews')}
                className={`pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-1 ${
                  modalTab === 'reviews'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>মিউচুয়াল রিভিউ ও রেটিং</span>
              </button>
            </div>

            {/* ট্যাব ১: প্রজেক্ট ব্রিফ */}
            {modalTab === 'brief' && (
              <div className="space-y-4 text-xs">
                {/* আর্থিক ও টাইমলাইন সামারি */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">এসক্রো পরিশোধিত মূল্য:</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      {toBengaliCurrency(selectedOrder.amount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">অর্ডারের তারিখ:</span>
                    <span className="text-slate-800 font-medium">{toBengaliDate(selectedOrder.created_at)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">দায়িত্বপ্রাপ্ত:</span>
                    <span className="text-slate-800 font-semibold">{selectedOrder.assigned_admin_name || 'এখনও নির্ধারিত নয়'}</span>
                  </div>
                </div>

                {/* গ্রাহকের ব্রিফ */}
                <div className="space-y-1.5">
                  <span className="font-semibold text-slate-800 block">গ্রাহকের প্রদত্ত ব্রিফ ও নির্দেশনা:</span>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 whitespace-pre-line leading-relaxed">
                    {selectedOrder.requirements_submitted || 'কোনো লিখিত বিবরণ নেই।'}
                  </div>
                </div>

                {selectedOrder.reference_link && (
                  <div>
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
                  <div className="space-y-1">
                    <span className="font-semibold text-slate-700 block mb-0.5">সংযুক্ত প্রজেক্ট ফাইল / পিডিএফ:</span>
                    {selectedOrder.attachment_url ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewFile({
                              url: selectedOrder.attachment_url!,
                              name: selectedOrder.attachment_name || 'attachment.pdf',
                            });
                            setPreviewModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 transition-colors text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{selectedOrder.attachment_name} (প্রিভিউ দেখুন)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadFile(selectedOrder.attachment_url, selectedOrder.attachment_name || 'attachment.pdf')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors text-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>ডাউনলোড</span>
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-800">
                        {selectedOrder.attachment_name}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ট্যাব ২: সরাসরি অর্ডার চ্যাট (Direct Workroom Chat) */}
            {modalTab === 'chat' && (
              <div className="space-y-3 flex flex-col h-[380px]">
                {/* মেসেজ তালিকা */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3.5 bg-slate-50/60 rounded-xl border border-slate-200 space-y-3 text-xs">
                  {orderMessages.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-1.5">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p>এই অর্ডারের জন্য কোনো বার্তা নেই।</p>
                      <p className="text-[11px]">গ্রাহকের সাথে সরাসরি কোনো প্রশ্ন বা ফাইল আদান-প্রদান করতে নিচে লিখুন।</p>
                    </div>
                  ) : (
                    orderMessages.map((m) => {
                      const isMe = Boolean(user?.id && (m.sender_id === user.id || m.sender_id === user.email)) || m.sender_role === 'admin' || m.sender_role === 'worker';
                      return (
                        <div
                          key={m.id}
                          className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className="max-w-[75%] space-y-1">
                            <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="font-semibold text-slate-700">
                                {isMe ? 'আপনি (স্পেশালিস্ট)' : `${m.sender_name || selectedOrder.customer_name || 'গ্রাহক'} (গ্রাহক)`}
                              </span>
                              <span>•</span>
                              <span>{new Date(m.created_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div
                              className={`p-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                                isMe
                                  ? 'bg-slate-900 text-white rounded-br-xs'
                                  : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                              }`}
                            >
                              {m.message || m.message_content || ''}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* ইনপুট বার */}
                <form onSubmit={handleSendOrderMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={orderMessageInput}
                    onChange={(e) => setOrderMessageInput(e.target.value)}
                    placeholder="ক্লায়েন্টের জন্য বার্তা লিখুন..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!orderMessageInput.trim() || sendingOrderMessage}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>পাঠান</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* ট্যাব ৩: ডেলিভারি ফাইলসমূহ */}
            {modalTab === 'deliverables' && (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-1">
                  <span className="font-bold text-slate-800">প্রস্তুতকৃত ফাইলসমূহ:</span>
                  <button
                    onClick={() => {
                      setActiveOrderForDeliverable(selectedOrder);
                      setDeliverableTitle(`ডেলিভারি ফাইল — ${selectedOrder.service?.title_bn || selectedOrder.service?.title}`);
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white font-semibold rounded-lg text-xs hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>নতুন ফাইল যুক্ত করুন</span>
                  </button>
                </div>

                {!selectedOrder.deliverables || selectedOrder.deliverables.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    এখনও কোনো ডেলিভারি ফাইল আপলোড করা হয়নি।
                  </div>
                ) : (
                  selectedOrder.deliverables.map((f) => (
                    <div key={f.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-indigo-600" />
                        <div>
                          <div className="font-bold text-slate-900">{f.title}</div>
                          {f.deliverable_notes && <div className="text-[11px] text-slate-500">{f.deliverable_notes}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewFile({
                              url: f.file_url,
                              name: f.title,
                              notes: f.deliverable_notes || undefined,
                            });
                            setPreviewModalOpen(true);
                          }}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg text-xs inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>প্রিভিউ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadFile(f.file_url, f.title, f.deliverable_notes || '')}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>ডাউনলোড</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ট্যাব ৪: মিউচুয়াল রিভিউ ও রেটিং */}
            {modalTab === 'reviews' && (
              <div className="space-y-4 text-xs">
                {/* গ্রাহকের রিভিউ প্রদর্শন */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      গ্রাহকের মূল্যায়ন (Customer Review)
                    </span>
                    {selectedOrder.customer_review && (
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(selectedOrder.customer_review.rating)].map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedOrder.customer_review ? (
                    <p className="text-slate-700 italic bg-white p-3 rounded-lg border border-slate-100">
                      "{selectedOrder.customer_review.comment}"
                    </p>
                  ) : (
                    <p className="text-slate-400 italic">গ্রাহক এখনও এই অর্ডারের জন্য রিভিউ দেননি।</p>
                  )}
                </div>

                {/* অ্যাডমিনের রিভিউ বক্স */}
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                  <span className="font-bold text-indigo-950 block">গ্রাহকের সহযোগিতার ওপর আপনার মূল্যায়ন (Admin Review):</span>

                  {selectedOrder.admin_review ? (
                    <div className="space-y-1.5 bg-white p-3.5 rounded-lg border border-indigo-100">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">প্রদত্ত রেটিং:</span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[...Array(selectedOrder.admin_review.rating)].map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                          ))}
                        </div>
                      </div>
                      <p className="text-slate-700 italic">"{selectedOrder.admin_review.comment}"</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmitAdminReview} className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">রেটিং প্রদান করুন:</label>
                        <div className="flex items-center gap-1 text-amber-500">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setAdminRating(star)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= adminRating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <textarea
                          rows={2}
                          required
                          value={adminReviewComment}
                          onChange={(e) => setAdminReviewComment(e.target.value)}
                          placeholder="গ্রাহকের সাথে কাজের অভিজ্ঞতা, প্রয়োজনীয় ব্রিফ সঠিক সময়ে দেওয়ার ব্যাপারে মন্তব্য লিখুন..."
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-hidden"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingAdminReview || !adminReviewComment.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{submittingAdminReview ? 'সংরক্ষণ হচ্ছে...' : 'গ্রাহককে রিভিউ দিন'}</span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* অ্যাকশন বোতামসমূহ */}
            {(() => {
              const isOrderDone = ['cancelled', 'refunded'].includes(selectedOrder.status) || Boolean(selectedOrder.refund_amount && selectedOrder.refund_amount > 0);
              return (
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {!isOrderDone && (
                      <button
                        type="button"
                        onClick={() => setNeedsInfoOrderTarget(selectedOrder)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg font-semibold"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>তথ্য চান</span>
                      </button>
                    )}

                    {!isOrderDone && (
                      <button
                        type="button"
                        onClick={() => setRefundOrderTarget(selectedOrder)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>রিফান্ড করুন</span>
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="px-4 py-2 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    বন্ধ করুন
                  </button>
                </div>
              );
            })()}
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
                  placeholder="যেমন: ফাইনাল ওয়েবসাইট ডেলিভারি প্যাকেজ (ZIP/PDF)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              {/* সরাসরি ফাইল আপলোড সেকশন */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  সরাসরি ফাইল বা স্ক্রিনশট আপলোড করুন
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-indigo-50/40 transition-colors"
                  >
                    <Upload className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-slate-700 block">
                      ডিভাইস থেকে ফাইল বা স্ক্রিনশট সিলেক্ট করতে এখানে ক্লিক করুন
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      ZIP, RAR, PDF, PNG, JPG, DOCX ইত্যাদি (সর্বোচ্চ ২৫MB)
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-emerald-950 truncate block">
                          {selectedFile.name}
                        </span>
                        <span className="text-[10px] text-emerald-700">
                          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • আপলোডের জন্য প্রস্তুত
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                      >
                        পরিবর্তন
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 px-2 py-1"
                      >
                        মুছুন
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অথবা ফাইল ডাউনলোড লিংক / Storage URL (Google Drive / Dropbox)
                </label>
                <input
                  type="text"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://drive.google.com/... অথবা স্টোরেজ লিংক"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  সরাসরি ফাইল আপলোড করলে ইউআরএল দিতে হবে না, অথবা গুগল ড্রাইভ/ড্রপবক্স লিংকও প্রদান করতে পারেন।
                </span>
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

      {/* ফাইল প্রিভিউ মোডাল */}
      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        fileUrl={previewFile.url}
        fileName={previewFile.name}
        notes={previewFile.notes}
      />
    </div>
  );
};
