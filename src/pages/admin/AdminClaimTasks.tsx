import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Send,
  Eye,
  Lock,
  ExternalLink,
  Paperclip,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  User,
  Search,
  Filter,
  Check,
  DollarSign,
  Info,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Order, OrderStatus, OrderWorkMessage } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useMessages } from '../../hooks/useMessages';

interface AdminClaimTasksProps {
  onNavigate?: (path: string) => void;
}

export const AdminClaimTasks: React.FC<AdminClaimTasksProps> = ({ onNavigate }) => {
  const { user, profile, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending_queue' | 'my_claimed' | 'my_delivered' | 'super_audit'>('pending_queue');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // লাইভ চ্যাট হুক
  const { messages: chatMessages, sending: sendingChat, sendMessage: sendClaimMessageViaHook } = useMessages(selectedOrderId);
  const [chatInput, setChatInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // ফাইল ডেলিভারি মডাল
  const [deliverableModalOpen, setDeliverableModalOpen] = useState(false);
  const [deliverableTitle, setDeliverableTitle] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number; type: string; dataUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [submittingDeliverable, setSubmittingDeliverable] = useState(false);

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
    };
    reader.readAsDataURL(file);
  };

  // অর্ডার বাতিল ও রিফান্ড মডাল
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundReason, setRefundReason] = useState('গ্রাহকের অনুরোধে অর্ডার বাতিল ও সম্পূর্ণ রিফান্ড করা হয়েছে');
  const [isRefunding, setIsRefunding] = useState(false);

  // সার্চ
  const [search, setSearch] = useState('');

  // সকল অর্ডার লোড
  const loadOrders = async () => {
    try {
      const data = await api.getAllOrders();
      setOrders(data);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অর্ডার কিউ লোড করা যায়নি' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    // লাইভ ইভেন্ট লিসেনার
    const handleOrdersUpdated = () => {
      loadOrders();
    };

    window.addEventListener('orders_updated', handleOrdersUpdated);
    window.addEventListener('order_claimed', handleOrdersUpdated);
    window.addEventListener('order_released', handleOrdersUpdated);

    // অটো পোলিং
    const interval = setInterval(loadOrders, 4000);

    return () => {
      window.removeEventListener('orders_updated', handleOrdersUpdated);
      window.removeEventListener('order_claimed', handleOrdersUpdated);
      window.removeEventListener('order_released', handleOrdersUpdated);
      clearInterval(interval);
    };
  }, []);

  const prevClaimMsgCountRef = useRef(0);
  useEffect(() => {
    if (chatContainerRef.current) {
      if (chatMessages.length > prevClaimMsgCountRef.current || prevClaimMsgCountRef.current === 0) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
    prevClaimMsgCountRef.current = chatMessages.length;
  }, [chatMessages]);

  // ফিল্টারিং ও দৃষ্টিসীমা নির্ধারণ (Privacy & Sight Rule)
  // ১. পেন্ডিং কিউ: যে অর্ডারগুলোর কোনো assigned_admin নেই এবং যেগুলো সক্রিয় (বাতিল বা সম্পন্ন নয়)
  const pendingOrders = orders.filter((o) => {
    const isUnassigned = !o.assigned_admin && !['cancelled', 'refunded', 'completed'].includes(o.status);
    if (!isUnassigned) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.service?.title_bn && o.service.title_bn.includes(search)) ||
      (o.service?.title && o.service.title.toLowerCase().includes(q)) ||
      (o.customer?.email && o.customer.email.toLowerCase().includes(q))
    );
  });

  // ২. আমার দায়িত্বপ্রাপ্ত সক্রিয় কাজ (শুধুমাত্র চলমান কাজ: accepted, in_progress, revision_requested ইত্যাদি)
  const myClaimedOrders = orders.filter((o) => {
    const isMine = o.assigned_admin === user?.id;
    if (!isMine) return false;
    // ডেলিভারি ও সম্পন্ন কাজগুলো আলাদা সেকশনে থাকবে
    if (['delivered', 'completed', 'cancelled', 'refunded'].includes(o.status)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.service?.title_bn && o.service.title_bn.includes(search)) ||
      (o.service?.title && o.service.title.toLowerCase().includes(q)) ||
      (o.customer?.email && o.customer.email.toLowerCase().includes(q))
    );
  });

  // ৩. আমার ডেলিভারিকৃত কাজ (My Delivered & Completed Tasks)
  const myDeliveredOrders = orders.filter((o) => {
    const isMine = o.assigned_admin === user?.id;
    if (!isMine) return false;
    if (!['delivered', 'completed'].includes(o.status)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      o.order_number.toLowerCase().includes(q) ||
      (o.service?.title_bn && o.service.title_bn.includes(search)) ||
      (o.service?.title && o.service.title.toLowerCase().includes(q)) ||
      (o.customer?.email && o.customer.email.toLowerCase().includes(q))
    );
  });

  // ৪. অন্যান্য অ্যাডমিনদের কাজ (শুধুমাত্র সুপার অ্যাডমিনের অডিটের জন্য)
  const otherClaimedOrders = orders.filter((o) => {
    return Boolean(o.assigned_admin && o.assigned_admin !== user?.id);
  });

  // সক্রিয় নির্বাচিত অর্ডার
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  // ১. কাজ ক্লেইম করা (Claim Task)
  // কাজ নেওয়ার পর এটি পেন্ডিং কিউ এবং অন্যান্য অ্যাডমিনদের দৃষ্টিসীমার বাইরে চলে যাবে!
  const handleClaim = async (targetOrder: Order) => {
    if (!user) return;
    const adminName = profile?.full_name || user.email?.split('@')[0] || 'স্পেশালিস্ট অ্যাডমিন';

    try {
      const updated = await api.claimOrder(targetOrder.id, user.id, adminName, user.email || '');
      setOrders((prev) => prev.map((o) => (o.id === targetOrder.id ? updated : o)));
      setSelectedOrderId(updated.id);
      setActiveTab('my_claimed');

      showToast({
        type: 'success',
        title: 'কাজটি সফলভাবে ক্লেইম করা হয়েছে! 🎯',
        message: `অর্ডার #${targetOrder.order_number} এখন আপনার দায়িত্বে অ্যাসাইন হয়েছে। এটি অন্য অ্যাডমিনদের দৃষ্টিসীমার বাইরে চলে গেছে এবং গ্রাহকের সাথে সরাসরি লাইভ চ্যাট সক্রিয় হয়েছে।`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'কাজটি গ্রহণ করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ক্লেইম ব্যর্থ', message: msg });
    }
  };

  // ২. কাজ অবমুক্ত করা (Release Task back to Pending Queue)
  const handleRelease = async (targetOrder: Order) => {
    if (!user) return;
    const confirmed = window.confirm(
      'আপনি কি নিশ্চিতভাবে এই কাজটি পুনরায় উন্মুক্ত পেন্ডিং কিউ-তে পাঠাতে চান? অন্য যেকোনো যোগ্য অ্যাডমিন তখন কাজটি গ্রহণ করতে পারবেন।'
    );
    if (!confirmed) return;

    try {
      const updated = await api.releaseOrder(targetOrder.id, user.id, isSuperAdmin);
      setOrders((prev) => prev.map((o) => (o.id === targetOrder.id ? updated : o)));
      if (selectedOrderId === targetOrder.id) {
        setSelectedOrderId(null);
      }
      showToast({
        type: 'info',
        title: 'কাজটি অবমুক্ত করা হয়েছে',
        message: `অর্ডার #${targetOrder.order_number} পুনরায় পেন্ডিং কিউ-তে যুক্ত হয়েছে।`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অবমুক্ত করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    }
  };

  // ৩. সরাসরি লাইভ চ্যাটে বার্তা পাঠানো
  const handleSendChat = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const textToSend = (customText || chatInput).trim();
    if (!user || !selectedOrder || !textToSend || sendingChat) return;

    const adminName = profile?.full_name || user.email?.split('@')[0] || 'দায়িত্বপ্রাপ্ত অ্যাডমিন';

    try {
      await sendClaimMessageViaHook(user.id, adminName, 'admin', textToSend);
      setChatInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'বার্তা পাঠানো যায়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    }
  };

  // ৪. ফাইল ডেলিভারি সাবমিট (দ্রুত ও স্মুথ সম্পন্ন)
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOrder || !deliverableTitle.trim()) return;

    setSubmittingDeliverable(true);
    const orderIdToDeliver = selectedOrder.id;
    const titleToDeliver = deliverableTitle.trim();
    const fileUrl = deliverableUrl.trim() || selectedFile?.dataUrl || 'https://mukisoft.com/deliverables/final_work.pdf';
    const notesToDeliver = deliverableNotes.trim();

    try {
      await api.addOrderDeliverable(orderIdToDeliver, user.id, {
        title: titleToDeliver,
        fileUrl,
        fileSize: selectedFile?.size,
        fileType: selectedFile?.type,
        notes: notesToDeliver,
      });

      // চ্যাটে অটোমেটেড ডেলিভারি নোটিস ব্যাকগ্রাউন্ডে পাঠানো (যাতে UI দীর্ঘক্ষণ আটকে না থাকে)
      const attachmentParam = fileUrl && !fileUrl.startsWith('data:')
        ? { name: titleToDeliver, url: fileUrl }
        : undefined;

      api.sendOrderMessage(
        orderIdToDeliver,
        user.id,
        profile?.full_name || 'দায়িত্বপ্রাপ্ত স্পেশালিস্ট',
        'admin',
        `📦 আপনার কাজের ডেলিভারি ফাইল যুক্ত করা হয়েছে: "${titleToDeliver}"। অনুগ্রহ করে ডাউনলোড করে দেখে নিন।`,
        attachmentParam
      ).catch((chatErr) => console.warn('Delivery chat notice warning:', chatErr));

      showToast({
        type: 'success',
        title: 'আপনি কাজটি সফলভাবে ডেলিভারি করেছেন! 🚀',
        message: 'ডেলিভারি ফাইল ও বিবরণ দ্রুত পাঠানো হয়েছে। কাজটি আপনার "আমার ডেলিভারিকৃত কাজ" ট্যাবে যুক্ত হয়েছে।',
      });

      // সাথে সাথে মডাল বন্ধ ও ট্যাবে রূপান্তর
      setDeliverableModalOpen(false);
      setDeliverableTitle('');
      setDeliverableUrl('');
      setSelectedFile(null);
      setDeliverableNotes('');
      setSelectedOrderId(null);
      setActiveTab('my_delivered');

      // ব্যাকগ্রাউন্ডে অর্ডার রিফ্রেশ
      loadOrders().catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ডেলিভারি ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSubmittingDeliverable(false);
    }
  };

  const handleRefundOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (selectedOrder.status === 'refunded' || selectedOrder.status === 'cancelled') {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'এই অর্ডারটি ইতিমধ্যে বাতিল ও রিফান্ড করা হয়েছে।' });
      setRefundModalOpen(false);
      setSelectedOrderId(null);
      return;
    }
    if (!refundReason.trim()) {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'রিফান্ডের একটি কারণ লিখুন' });
      return;
    }
    setIsRefunding(true);
    const orderIdToRefund = selectedOrder.id;
    const orderNum = selectedOrder.order_number;
    const reasonText = refundReason.trim();
    try {
      await api.refundOrder(orderIdToRefund, reasonText);
      showToast({
        type: 'success',
        title: 'অর্ডার বাতিল ও রিফান্ড সফল',
        message: `অর্ডার #${orderNum} বাতিল করে গ্রাহকের ওয়ালেটে সম্পূর্ণ টাকা ফেরত দেওয়া হয়েছে।`
      });
      setRefundModalOpen(false);
      setSelectedOrderId(null);
      setRefundReason('');
      setOrders((prev) => prev.filter((o) => o.id !== orderIdToRefund));
      await loadOrders();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'রিফান্ড সম্পন্ন করা যায়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              <Sparkles className="w-3 h-3 text-amber-600" /> ক্লেইম টাস্ক কনসোল
            </span>
            <span className="text-xs text-slate-400 font-mono">Live Queue Engine</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            পেন্ডিং অর্ডার কিউ ও সেলফ-অ্যাসাইনমেন্ট
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            উন্মুক্ত কাজ নিজের দায়িত্বে নিন। ক্লেইম করার সাথে সাথে কাজটি অন্য অ্যাডমিনদের দৃষ্টিসীমার বাইরে চলে যাবে এবং আপনার ও ব্যবহারকারীর মধ্যে সরাসরি ১-অন-১ লাইভ চ্যাট সক্রিয় হবে।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>পেন্ডিং কিউ: {toBengaliDigits(pendingOrders.length)}টি কাজ</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>চলমান দায়িত্ব: {toBengaliDigits(myClaimedOrders.length)}টি</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <span>ডেলিভারিকৃত: {toBengaliDigits(myDeliveredOrders.length)}টি</span>
          </div>
        </div>
      </div>

      {/* ট্যাব নেভিগেশন ও সার্চ */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('pending_queue')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pending_queue'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>পেন্ডিং কিউ (Pending Queue)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'pending_queue' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800'
            }`}>
              {toBengaliDigits(pendingOrders.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my_claimed')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my_claimed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>আমার দায়িত্বপ্রাপ্ত কাজ ও লাইভ চ্যাট</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'my_claimed' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {toBengaliDigits(myClaimedOrders.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my_delivered')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'my_delivered'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>আমার ডেলিভারিকৃত কাজ</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'my_delivered' ? 'bg-indigo-700 text-white' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {toBengaliDigits(myDeliveredOrders.length)}
            </span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('super_audit')}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'super_audit'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>অন্যান্যদের কাজ (সুপার অডিট)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-300 text-slate-800">
                {toBengaliDigits(otherClaimedOrders.length)}
              </span>
            </button>
          )}
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="অর্ডার নম্বর বা সেবা দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* ১. পেন্ডিং কিউ (Pending Queue View) */}
      {activeTab === 'pending_queue' && (
        <div className="space-y-4">
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">দৃষ্টিসীমা ও অ্যাসাইনমেন্ট নিয়ম:</span> এই কিউ-তে থাকা যেকোনো কাজ আপনি নিজের দায়িত্বে নিতে পারবেন। কাজটির &quot;ক্লেইম করুন&quot; বাটনে চাপার সাথে সাথে এটি কিউ এবং অন্যান্য সকল অ্যাডমিনের দৃষ্টিসীমা থেকে পুরোপুরি অদৃশ্য হয়ে আপনার ব্যক্তিগত ওয়ার্কস্পেসে স্থানান্তরিত হবে।
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">পেন্ডিং কিউ লোড হচ্ছে...</div>
          ) : pendingOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">পেন্ডিং কিউ সম্পূর্ণ ফাঁকা!</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                এই মুহূর্তে কোনো অপেক্ষমাণ অর্ডার নেই। সকল অর্ডার অ্যাডমিনদের দ্বারা ক্লেইম করা হয়েছে অথবা সম্পন্ন হয়ে গেছে। নতুন কোনো অর্ডার আসলে এখানে সাথে সাথে প্রদর্শিত হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />

                  <div className="space-y-3">
                    {/* টপ মেটা */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        {ord.order_number}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                        <Clock className="w-3 h-3" /> ক্লেইম করুন
                      </span>
                    </div>

                    {/* সার্ভিস নাম */}
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {ord.service?.title_bn || ord.service?.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px] truncate max-w-[180px]">
                          {ord.customer?.email || ord.customer?.full_name || ord.user_id}
                        </span>
                      </div>
                    </div>

                    {/* রিকোয়ারমেন্টস প্রিভিউ */}
                    {ord.requirements_submitted && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                        {ord.requirements_submitted}
                      </div>
                    )}

                    {/* রেফারেন্স লিংক বা ফাইল */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px]">
                      {ord.reference_link && (
                        <a
                          href={ord.reference_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>রেফারেন্স লিংক</span>
                        </a>
                      )}
                      {ord.attachment_name && (
                        ord.attachment_url ? (
                          <a
                            href={ord.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            download={ord.attachment_name}
                            className="inline-flex items-center gap-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 font-semibold px-2 py-0.5 rounded border border-indigo-200 transition-colors"
                          >
                            <Paperclip className="w-3 h-3 text-indigo-600" />
                            <span className="truncate max-w-[140px]">{ord.attachment_name} (পিডিএফ/ডাউনলোড)</span>
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{ord.attachment_name}</span>
                          </span>
                        )
                      )}
                    </div>
                  </div>

                  {/* নিচের বার ও ক্লেইম বাটন */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-slate-400 block">এসক্রো বাজেট</span>
                      <span className="text-base font-bold font-mono text-slate-900">
                        {toBengaliCurrency(ord.amount)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleClaim(ord)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-bold rounded-xl text-xs shadow-md transition-transform"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>আমি দায়িত্ব নিচ্ছি (Claim)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ২. আমার দায়িত্বপ্রাপ্ত কাজ ও লাইভ চ্যাট (My Claimed Tasks & Direct Live Chat) */}
      {activeTab === 'my_claimed' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {myClaimedOrders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">আপনার দায়িত্বে বর্তমানে কোনো সক্রিয় কাজ নেই</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                পেন্ডিং কিউ থেকে যেকোনো কাজ নিজের দায়িত্বে নিন। ক্লেইম করার সাথে সাথে এখানে গ্রাহকের সাথে সরাসরি লাইভ চ্যাট চালু হবে।
              </p>
              <button
                onClick={() => setActiveTab('pending_queue')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors"
              >
                <Clock className="w-4 h-4" />
                <span>পেন্ডিং কিউ দেখুন ({toBengaliDigits(pendingOrders.length)})</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
              {/* বাম কলাম: আমার ক্লেইমকৃত কাজের তালিকা (৪ কলাম) */}
              <div className="lg:col-span-4 border-r border-slate-200 bg-slate-50/50 flex flex-col">
                <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-xs text-slate-800">
                      আমার চলমান কাজ ({toBengaliDigits(myClaimedOrders.length)})
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">অন্যান্যদের কাছে লুকায়িত</span>
                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[560px]">
                  {myClaimedOrders.map((ord) => {
                    const isSelected = selectedOrderId === ord.id;
                    return (
                      <div
                        key={ord.id}
                        onClick={() => setSelectedOrderId(ord.id)}
                        className={`p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white border-l-4 border-emerald-600 shadow-2xs'
                            : 'hover:bg-white/80'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-[11px] text-slate-700">
                            {ord.order_number}
                          </span>
                          <StatusBadge status={ord.status} />
                        </div>

                        <h4 className="font-semibold text-xs text-slate-900 mt-1 line-clamp-1">
                          {ord.service?.title_bn || ord.service?.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                          <span className="font-mono text-slate-700">
                            {toBengaliCurrency(ord.amount)}
                          </span>
                          <span className="truncate max-w-[120px]">
                            {ord.customer?.email?.split('@')[0] || 'ক্লায়েন্ট'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ডান কলাম: লাইভ চ্যাট রুম ও ওয়ার্কস্পেস (৮ কলাম) */}
              <div className="lg:col-span-8 flex flex-col justify-between bg-white">
                {selectedOrder ? (
                  <>
                    {/* চ্যাট হেডার */}
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                            সরাসরি লাইভ চ্যাট সংযুক্ত
                          </span>
                          <span className="font-mono font-bold text-xs text-slate-600">
                            #{selectedOrder.order_number}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 mt-0.5">
                          {selectedOrder.service?.title_bn || selectedOrder.service?.title}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          গ্রাহক: <code className="font-mono">{selectedOrder.customer?.email || selectedOrder.user_id}</code> | মূল্য: {toBengaliCurrency(selectedOrder.amount)}
                        </p>
                      </div>

                      {/* অ্যাকশন বাটনসমূহ */}
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => {
                            setDeliverableTitle(`ডেলিভারি ফাইল — ${selectedOrder.service?.title_bn || selectedOrder.service?.title}`);
                            setDeliverableModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>ফাইল ডেলিভারি</span>
                        </button>

                        {!['cancelled', 'refunded', 'completed'].includes(selectedOrder.status) && (
                          <button
                            onClick={() => {
                              setRefundReason('গ্রাহকের অনুরোধে অর্ডার বাতিল ও সম্পূর্ণ রিফান্ড করা হয়েছে');
                              setRefundModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition-colors"
                            title="গ্রাহকের অনুরোধে অর্ডার বাতিল ও ওয়ালেটে রিফান্ড দিন"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                            <span>বাতিল ও রিফান্ড</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleRelease(selectedOrder)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                          title="কাজটি করতে না পারলে কিউ-তে ফিরিয়ে দিন"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>অবমুক্ত</span>
                        </button>
                      </div>
                    </div>

                    {/* রিভিশন অ্যালার্ট নোটিস (যদি গ্রাহক রিভিশন অনুরোধ জানিয়ে থাকেন) */}
                    {selectedOrder.status === 'revision_requested' && (
                      <div className="px-4 py-3 bg-amber-500 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-100 mt-0.5 animate-bounce" />
                          <div>
                            <span className="font-bold text-xs block">
                              গ্রাহক এই অর্ডারের কাজে রিভিশন (সংশোধন) চেয়েছেন!
                            </span>
                            <span className="text-[11px] text-amber-100">
                              চ্যাটে গ্রাহকের ফিডব্যাক পড়ুন এবং সংশোধন সম্পন্ন করে ফাইল ডেলিভারি করুন।
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setDeliverableTitle(`সংশোধিত ডেলিভারি ফাইল (Rev) — ${selectedOrder.service?.title_bn || selectedOrder.service?.title}`);
                            setDeliverableModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-white text-amber-900 rounded-lg font-bold text-xs hover:bg-amber-50 shrink-0 shadow-xs"
                        >
                          সংশোধিত ফাইল ডেলিভারি করুন
                        </button>
                      </div>
                    )}

                    {/* প্রজেক্ট রিকোয়ারমেন্টস ড্রপডাউন/স্ট্রিপ */}
                    {selectedOrder.requirements_submitted && (
                      <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-100 text-[11px] text-slate-700 flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="line-clamp-2 leading-relaxed">
                          <span className="font-bold text-amber-900">রিকোয়ারমেন্টস:</span> {selectedOrder.requirements_submitted}
                        </div>
                      </div>
                    )}

                    {/* লাইভ চ্যাট মেসেজ ফিড */}
                    <div ref={chatContainerRef} className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[380px] min-h-[300px] bg-slate-50/30">
                      {chatMessages.length === 0 ? (
                        <div className="text-center py-12 text-xs text-slate-400 space-y-2">
                          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-600">১-অন-১ লাইভ চ্যাট রুম প্রস্তুত</p>
                          <p className="text-[11px]">
                            গ্রাহকের সাথে সরাসরি কথা বলুন, কাজের আপডেট দিন বা প্রশ্ন থাকলে জানুন।
                          </p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMe = Boolean(user?.id && (msg.sender_id === user.id || msg.sender_id === user.email)) || msg.sender_role === 'admin' || msg.sender_role === 'worker';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                                <span className="font-bold text-slate-700">
                                   {isMe ? 'আপনি (দায়িত্বপ্রাপ্ত কর্মকর্তা)' : `${msg.sender_name || 'গ্রাহক'} (গ্রাহক)`}
                                </span>
                                <span>•</span>
                                <span>{toBengaliDate(msg.created_at)}</span>
                              </div>
                              <div
                                className={`max-w-[85%] sm:max-w-md p-3 rounded-2xl text-xs leading-relaxed ${
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
                                    className={`mt-2 inline-flex items-center gap-1 text-[11px] underline font-mono ${
                                      isMe ? 'text-indigo-100 hover:text-white' : 'text-indigo-600 hover:text-indigo-800'
                                    }`}
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>{msg.attachment_name || 'সংযুক্ত ফাইল'}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* কুইক রেসপন্স চিপস */}
                    <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
                      <span className="text-[10px] font-bold text-slate-400 shrink-0">দ্রুত বার্তা:</span>
                      <button
                        onClick={() => handleSendChat(undefined, '👋 সালাম, আমি আপনার অর্ডারের দায়িত্ব নিয়েছি এবং কাজ শুরু করেছি।')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                      >
                        কাজ শুরু করেছি
                      </button>
                      <button
                        onClick={() => handleSendChat(undefined, '🔍 আপনার কাজটি সম্পন্ন করতে কিছু অতিরিক্ত তথ্য বা রেফারেন্স ফাইল প্রয়োজন। অনুগ্রহ করে এখানে জানান।')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                      >
                        তথ্য প্রয়োজন
                      </button>
                      <button
                        onClick={() => handleSendChat(undefined, '🎉 আপনার কাজের ফাইনাল ফাইল প্রস্তুত হচ্ছে, অল্প কিছুক্ষণের মধ্যে ডেলিভারি দিচ্ছি।')}
                        className="px-2.5 py-1 bg-white hover:bg-slate-200 border border-slate-200 rounded-full text-slate-700 whitespace-nowrap transition-colors cursor-pointer"
                      >
                        ফাইল প্রস্তুত হচ্ছে
                      </button>
                    </div>

                    {/* চ্যাট ইনপুট বার */}
                    <form
                      onSubmit={(e) => handleSendChat(e)}
                      className="p-3.5 bg-white border-t border-slate-200 flex items-center gap-2 relative z-10"
                    >
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="গ্রাহকের নিকট সরাসরি লাইভ বার্তা লিখুন (Enter চাপুন)..."
                        className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                      />
                      <button
                        type="submit"
                        disabled={sendingChat || !chatInput.trim()}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-md cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{sendingChat ? 'পাঠানো...' : 'পাঠান'}</span>
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-2 m-auto">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">বাম পাশের তালিকা থেকে একটি কাজ নির্বাচন করুন</p>
                    <p>নির্বাচিত অর্ডারের লাইভ চ্যাট রুম ও প্রজেক্ট কনসোল এখানে খুলবে।</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ৩. আমার ডেলিভারিকৃত কাজ (My Delivered & Completed Tasks) */}
      {activeTab === 'my_delivered' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-indigo-950">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">ডেলিভারি স্থিতি ও রিভিউ ট্র্যাকিং:</span> আপনার ডেলিভারি করা সকল প্রজেক্ট এখানে তালিকাভুক্ত থাকে। গ্রাহক ফাইল যাচাই করে গ্রহণ ও সম্পন্ন ঘোষণা করলে আপনার কমিশন সরাসরি উত্তোলনযোগ্য অ্যাকাউন্টে জমা হয়।
            </div>
          </div>

          {myDeliveredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">এখনও কোনো কাজ ডেলিভারি করা হয়নি</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                আপনার চলমান কাজগুলো সফলভাবে সম্পন্ন করে ফাইল ডেলিভারি করুন। ডেলিভারি করার সাথে সাথে কাজটি এখানে স্থানান্তরিত হবে।
              </p>
              <button
                onClick={() => setActiveTab('my_claimed')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
              >
                <Clock className="w-4 h-4" />
                <span>আমার চলমান কাজ দেখুন ({toBengaliDigits(myClaimedOrders.length)})</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myDeliveredOrders.map((ord) => {
                const commission = Math.round(ord.amount * 0.75); // আনুমানিক ৭৫% ওয়ার্কার কমিশন
                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
                  >
                    <div className={`absolute top-0 right-0 left-0 h-1.5 ${
                      ord.status === 'completed'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`} />

                    <div className="space-y-3">
                      {/* টপ মেটা ও স্ট্যাটাস */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                          #{ord.order_number}
                        </span>
                        <StatusBadge status={ord.status} />
                      </div>

                      {/* সার্ভিস শিরোনাম */}
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                          {ord.service?.title_bn || ord.service?.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-[11px] truncate max-w-[200px]">
                            {ord.customer?.email || ord.customer?.full_name || ord.user_id}
                          </span>
                        </div>
                      </div>

                      {/* মূল্য ও কমিশন কার্ড */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">অর্ডার বাজেট</span>
                          <span className="font-bold font-mono text-slate-900">{toBengaliCurrency(ord.amount)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-indigo-600 block uppercase font-bold">আপনার কমিশন</span>
                          <span className="font-bold font-mono text-indigo-700 text-sm">~{toBengaliCurrency(commission)}</span>
                        </div>
                      </div>

                      {/* ডেলিভারিকৃত ফাইলসমূহ */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          <span>ডেলিভারি ফাইলসমূহ ({toBengaliDigits(ord.deliverables?.length || 0)}টি):</span>
                        </span>
                        {ord.deliverables && ord.deliverables.length > 0 ? (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {ord.deliverables.map((deliv) => (
                              <div
                                key={deliv.id}
                                className="p-2 bg-indigo-50/50 rounded-lg border border-indigo-100 text-[11px] flex items-center justify-between gap-2"
                              >
                                <span className="font-medium text-slate-800 truncate" title={deliv.title}>
                                  {deliv.title}
                                </span>
                                <a
                                  href={deliv.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-indigo-600 hover:text-indigo-800 shrink-0 font-bold text-[10px] underline flex items-center gap-0.5"
                                >
                                  <span>ডাউনলোড</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">ফাইল রেকর্ড সংরক্ষিত</span>
                        )}
                      </div>

                      {/* ক্লায়েন্ট রিভিউ (যদি থাকে) */}
                      {ord.customer_review && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900 text-[11px]">গ্রাহকের মূল্যায়ন</span>
                            <span className="text-amber-600 font-bold text-[11px]">
                              {'★'.repeat(ord.customer_review.rating)} ({toBengaliDigits(ord.customer_review.rating)}/৫)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-700 italic">
                            &quot;{ord.customer_review.comment}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* নিচের অ্যাকশন বাটনসমূহ */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                        ord.status === 'completed' ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {ord.status === 'completed' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>অনুমোদিত ও সম্পন্ন 🎉</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>গ্রাহকের পর্যালোচনায় আছে</span>
                          </>
                        )}
                      </span>

                      <button
                        onClick={() => {
                          setSelectedOrderId(ord.id);
                          setActiveTab('my_claimed');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                        <span>চ্যাট দেখুন</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ৩. সুপার অ্যাডমিন অডিট ভিউ (শুধুমাত্র সুপার অ্যাডমিনের জন্য) */}
      {activeTab === 'super_audit' && isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">অন্যান্য অ্যাডমিনদের দায়িত্বপ্রাপ্ত কাজের তালিকা</h3>
          </div>
          <p className="text-xs text-slate-500">
            সাধারণ অ্যাডমিনদের ক্ষেত্রে এই কাজগুলো পুরোপুরি লুকায়িত থাকে যাতে কোনো বিভ্রান্তি বা ডুপ্লিকেট কাজের সুযোগ না থাকে। সুপার অ্যাডমিন হিসেবে আপনি সম্পূর্ণ প্ল্যাটফর্মের অগ্রগতি নিরীক্ষণ করতে পারেন।
          </p>

          {otherClaimedOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              অন্য কোনো অ্যাডমিনের চলমান কাজ নেই।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-medium">অর্ডার নম্বর</th>
                    <th className="py-2.5 px-3 font-medium">দায়িত্বপ্রাপ্ত অ্যাডমিন</th>
                    <th className="py-2.5 px-3 font-medium">সেবা</th>
                    <th className="py-2.5 px-3 font-medium">গ্রাহক</th>
                    <th className="py-2.5 px-3 font-medium text-right">মূল্য</th>
                    <th className="py-2.5 px-3 font-medium">স্ট্যাটাস</th>
                    <th className="py-2.5 px-3 font-medium text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {otherClaimedOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{ord.order_number}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {ord.assigned_admin_name || 'অন্য কর্মকর্তা'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {ord.service?.title_bn || ord.service?.title}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {ord.customer?.email || ord.user_id}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        {toBengaliCurrency(ord.amount)}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={ord.status} />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleRelease(ord)}
                          className="px-2 py-1 text-[11px] bg-rose-50 text-rose-700 hover:bg-rose-100 rounded border border-rose-200"
                        >
                          ফোর্স রিলিজ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ফাইল ডেলিভারি মডাল */}
      {deliverableModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                কাজের ডেলিভারি হ্যান্ডওভার
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                ফাইল আপলোড ও ডেলিভারি সম্পন্ন করুন
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                অর্ডার: <code className="font-mono text-slate-800">#{selectedOrder.order_number}</code> ({selectedOrder.service?.title_bn || selectedOrder.service?.title})
              </p>
            </div>

            <form onSubmit={handleSubmitDeliverable} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ডেলিভারি ফাইলের শিরোনাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deliverableTitle}
                  onChange={(e) => setDeliverableTitle(e.target.value)}
                  placeholder="যেমন: ফাইনাল লোগো ভেক্টর প্যাকেজ (ZIP/PDF/PNG)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
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
                  অথবা ফাইল ডাউনলোড বা ড্রাইভের ইউআরএল (Google Drive / Storage URL)
                </label>
                <input
                  type="text"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  placeholder="https://drive.google.com/... অথবা ড্রপবক্স / ওয়েবসাইটের লিংক"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-mono text-xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  সরাসরি ফাইল আপলোড করলে ইউআরএল দিতে হবে না, অথবা গুগল ড্রাইভ/ড্রপবক্স লিংকও প্রদান করতে পারেন।
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  গ্রাহকের উদ্দেশ্যে বিশেষ নোট বা নির্দেশনা
                </label>
                <textarea
                  rows={2}
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  placeholder="যেমন: ফাইলটি আনজিপ করুন, পাসওয়ার্ড দেওয়া থাকলে লিখুন, কোনো সংশোধন প্রয়োজন হলে রিভিশন চান..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setDeliverableModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                  disabled={submittingDeliverable}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submittingDeliverable}
                  className="px-5 py-2 font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{submittingDeliverable ? 'ডেলিভারি হচ্ছে...' : 'ডেলিভারি কনফার্ম করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* অর্ডার বাতিল ও রিফান্ড মডাল */}
      {refundModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="mb-4">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                গ্রাহক অনুরোধে রিফান্ড
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                অর্ডার বাতিল ও গ্রাহকের ওয়ালেটে ১০০% রিফান্ড
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                অর্ডার: <code className="font-mono text-slate-800">#{selectedOrder.order_number}</code> | রিফান্ডযোগ্য মূল্য: {toBengaliCurrency(selectedOrder.amount)}
              </p>
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-2">
                সতর্কতা: নিশ্চিত করার সাথে সাথে গ্রাহকের ওয়ালেটে সরাসরি {toBengaliCurrency(selectedOrder.amount)} ব্যালেন্স যোগ হয়ে যাবে এবং অর্ডারটি বাতিল ও রিফান্ডেড হিসেবে সংরক্ষিত হবে।
              </p>
            </div>

            <form onSubmit={handleRefundOrder} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  বাতিল ও রিফান্ডের কারণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="যেমন: গ্রাহক চ্যাটে অর্ডার বাতিলের অনুরোধ করেছেন / প্রজেক্ট রিকোয়ারমেন্ট অমিল"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                  disabled={isRefunding}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isRefunding}
                  className="px-5 py-2 font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isRefunding ? 'রিফান্ড হচ্ছে...' : 'বাতিল ও রিফান্ড নিশ্চিত করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
