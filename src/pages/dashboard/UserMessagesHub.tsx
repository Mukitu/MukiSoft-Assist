import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Paperclip,
  Download,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Search,
  Sparkles,
  ArrowLeft,
  FileText,
  RotateCcw,
  Check,
  ShieldAlert,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Order, OrderWorkMessage, OrderDeliverable } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FilePreviewModal } from '../../components/common/FilePreviewModal';
import { downloadFile } from '../../utils/fileViewer';
import { useMessages } from '../../hooks/useMessages';

interface UserMessagesHubProps {
  onNavigate: (path: string) => void;
}

export const UserMessagesHub: React.FC<UserMessagesHubProps> = ({ onNavigate }) => {
  const { user, profile } = useAuth();
  const { showToast } = useNotification();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order Object
  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || null;

  // Real-time Messages Hook for Selected Order
  const { messages, sending, sendMessage } = useMessages(selectedOrderId);
  const [inputText, setInputText] = useState('');
  const [chatAttachment, setChatAttachment] = useState<{ name: string; url: string } | null>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ফাইল প্রিভিউ মোডাল
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; notes?: string }>({ url: '', name: '' });

  // Load User Orders
  const loadOrders = async () => {
    if (!user) return;
    try {
      const data = await api.getUserOrders(user.id);
      setOrders(data);
      // Auto-select first active or assigned order if none selected
      if (!selectedOrderId && data.length > 0) {
        const firstActive = data.find((o) => o.assigned_admin || !['completed', 'cancelled', 'refunded'].includes(o.status)) || data[0];
        setSelectedOrderId(firstActive.id);
      }
    } catch (err) {
      console.warn('UserMessagesHub loadOrders error:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle Attachment Upload
  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      showToast({ type: 'error', title: 'ফাইলটি অনেক বড়', message: 'সর্বোচ্চ ২০ মেগাবাইট পর্যন্ত ফাইল আপলোড করতে পারেন।' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setChatAttachment({
        name: file.name,
        url: reader.result as string,
      });
      showToast({ type: 'info', title: 'ফাইল যুক্ত হয়েছে', message: file.name });
    };
    reader.readAsDataURL(file);
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedOrder) return;
    const textToSend = inputText.trim();
    if (!textToSend && !chatAttachment) return;

    try {
      const senderName = profile?.full_name || user.email?.split('@')[0] || 'গ্রাহক';
      const msgContent = textToSend || `সংযুক্ত ফাইল: ${chatAttachment?.name}`;
      await sendMessage(
        user.id,
        senderName,
        'customer',
        msgContent,
        chatAttachment?.name,
        chatAttachment?.url
      );
      setInputText('');
      setChatAttachment(null);
      if (chatFileRef.current) chatFileRef.current.value = '';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'বার্তা পাঠানো যায়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const orderNum = (o.order_number || '').toLowerCase();
    const title = (o.service?.title_bn || o.service?.title || '').toLowerCase();
    const admin = (o.assigned_admin_name || '').toLowerCase();
    return orderNum.includes(q) || title.includes(q) || admin.includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
              <MessageSquare className="w-3 h-3 text-indigo-600" /> বার্তা ও লাইভ চ্যাট হাব
            </span>
            <span className="text-xs text-slate-400 font-mono">1-on-1 Specialist Chat</span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            দায়িত্বপ্রাপ্ত কর্মকর্তাদের সাথে সরাসরি চ্যাট ও কাজের অগ্রগতি
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            আপনার অর্ডারের দায়িত্বে থাকা স্পেশালিস্টের সাথে সরাসরি বার্তা আদান-প্রদান করুন, কাজের আপডেট নিন এবং ডেলিভারি ফাইল ডাউনলোড করুন।
          </p>
        </div>

        <button
          onClick={() => onNavigate('/dashboard/orders')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors self-start sm:self-auto shrink-0"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>সকল অর্ডার দেখুন</span>
        </button>
      </div>

      {/* Main Hub Split Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Column: Orders Thread List */}
        <div
          className={`lg:col-span-4 border-r border-slate-200 flex flex-col ${
            selectedOrderId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="অর্ডার নম্বর বা সার্ভিস খুঁজুন..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingOrders ? (
              <div className="p-8 text-center text-xs text-slate-400">অর্ডার তালিকা লোড হচ্ছে...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500">কোনো অর্ডার বার্তা পাওয়া যায়নি।</p>
                <button
                  onClick={() => onNavigate('/services')}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                >
                  সার্ভিস ব্রাউজ করুন
                </button>
              </div>
            ) : (
              filteredOrders.map((ord) => {
                const isSelected = ord.id === selectedOrderId;
                const hasAssigned = Boolean(ord.assigned_admin || ord.assigned_admin_name);
                const assignedName = ord.assigned_admin_name || (ord.assigned_admin ? 'দায়িত্বপ্রাপ্ত স্পেশালিস্ট' : 'পেন্ডিং কিউ');
                const hasDeliverable = Boolean(ord.deliverables && ord.deliverables.length > 0) || ord.status === 'delivered';

                return (
                  <button
                    key={ord.id}
                    onClick={() => setSelectedOrderId(ord.id)}
                    className={`w-full text-left p-3.5 transition-colors relative flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/80 border-l-4 border-indigo-600'
                        : 'hover:bg-slate-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        hasAssigned ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {hasAssigned ? <UserCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-mono font-bold text-slate-900 truncate">
                          #{ord.order_number}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {toBengaliDate(ord.created_at)}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                        {ord.service?.title_bn || ord.service?.title || 'কাস্টম সার্ভিস'}
                      </p>

                      <div className="flex items-center justify-between gap-1.5 mt-1.5">
                        <span className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                          {hasAssigned ? (
                            <span className="text-indigo-700 font-medium">👤 {assignedName}</span>
                          ) : (
                            <span className="text-amber-600 font-medium">⏳ স্পেশালিস্ট অপেক্ষারত</span>
                          )}
                        </span>

                        <div className="flex items-center gap-1 shrink-0">
                          {hasDeliverable && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-100 text-emerald-800">
                              ফাইল
                            </span>
                          )}
                          <StatusBadge status={ord.status} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Screen & Deliverables */}
        <div
          className={`lg:col-span-8 flex flex-col bg-slate-50/50 ${
            !selectedOrderId ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {selectedOrder ? (
            <>
              {/* Chat Header */}
              <div className="p-3.5 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    onClick={() => setSelectedOrderId(null)}
                    className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                    title="তালিকায় ফিরুন"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        #{selectedOrder.order_number} • {selectedOrder.service?.title_bn || selectedOrder.service?.title}
                      </h2>
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 truncate">
                      {selectedOrder.assigned_admin_name || selectedOrder.assigned_admin ? (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" /> স্পেশালিস্ট:{' '}
                          <span className="font-bold">
                            {selectedOrder.assigned_admin_name || 'দায়িত্বপ্রাপ্ত কর্মকর্তা'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">
                          পেন্ডিং কিউ (স্পেশালিস্ট দ্রুত গ্রহণ করবেন)
                        </span>
                      )}
                      <span>• মূল্য: {toBengaliCurrency(selectedOrder.amount)}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate(`/dashboard/orders/${selectedOrder.id}`)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  <span>অর্ডার বিস্তারিত</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Deliverable Download Notification Banner if Available */}
              {selectedOrder.deliverables && selectedOrder.deliverables.length > 0 && (
                <div className="p-3 bg-emerald-50 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-emerald-950 block truncate">
                        ডেলিভারি ফাইল পাওয়া গেছে: {selectedOrder.deliverables[0].title}
                      </span>
                      {selectedOrder.deliverables[0].deliverable_notes && (
                        <span className="text-[11px] text-emerald-800 block truncate">
                          নোট: {selectedOrder.deliverables[0].deliverable_notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewFile({
                          url: selectedOrder.deliverables![0].file_url,
                          name: selectedOrder.deliverables![0].title,
                          notes: selectedOrder.deliverables![0].deliverable_notes || undefined,
                        });
                        setPreviewModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-white text-emerald-900 border border-emerald-300 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-700" />
                      <span>প্রিভিউ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadFile(
                          selectedOrder.deliverables![0].file_url,
                          selectedOrder.deliverables![0].title,
                          selectedOrder.deliverables![0].deliverable_notes || ''
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>ডাউনলোড</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 max-h-[500px]">
                {messages.length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">এখনো কোনো বার্তা পাঠানো হয়নি।</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      প্রজেক্টের প্রয়োজনীয় ফাইল, নির্দেশনা বা কাজের অগ্রগতি সম্পর্কে নিচে আপনার বার্তা লিখুন।
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_role === 'customer' || msg.sender_id === user?.id;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1">
                          <span className="text-[10px] font-bold text-slate-600">
                            {isMe ? 'আপনি (গ্রাহক)' : msg.sender_name || 'দায়িত্বপ্রাপ্ত কর্মকর্তা'}
                          </span>
                          {!isMe && (
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-800">
                              স্পেশালিস্ট
                            </span>
                          )}
                          <span className="text-[9px] text-slate-400">
                            {toBengaliDate(msg.created_at)}
                          </span>
                        </div>

                        <div
                          className={`max-w-[85%] sm:max-w-md rounded-2xl p-3 text-xs shadow-2xs leading-relaxed ${
                            isMe
                              ? 'bg-indigo-600 text-white rounded-tr-xs'
                              : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.message || msg.message_content}</p>

                          {/* File Attachment if attached */}
                          {msg.attachment_url && (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreviewFile({
                                    url: msg.attachment_url!,
                                    name: msg.attachment_name || 'attachment.pdf',
                                  });
                                  setPreviewModalOpen(true);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                  isMe
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">
                                  {msg.attachment_name || 'সংযুক্ত ফাইল দেখুন / ডাউনলোড'}
                                </span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Box */}
              <div className="p-3 bg-white border-t border-slate-200">
                {chatAttachment && (
                  <div className="mb-2 p-2 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-indigo-900 font-semibold truncate">
                      📎 {chatAttachment.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setChatAttachment(null)}
                      className="text-rose-600 hover:text-rose-800 font-bold px-2"
                    >
                      মুছুন
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={chatFileRef}
                    onChange={handleAttachmentUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => chatFileRef.current?.click()}
                    className="p-2 text-slate-500 hover:text-indigo-600 rounded-xl hover:bg-slate-100 transition-colors"
                    title="ফাইল বা স্ক্রিনশট সংযুক্ত করুন"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="আপনার বার্তা বা নির্দেশনা লিখুন..."
                    className="flex-1 p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={sending || (!inputText.trim() && !chatAttachment)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{sending ? 'পাঠানো হচ্ছে...' : 'পাঠান'}</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">যেকোনো একটি অর্ডার নির্বাচন করুন</p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                বাম পাশের তালিকা থেকে অর্ডারে ক্লিক করে দায়িত্বপ্রাপ্ত কর্মকর্তার সাথে সরাসরি চ্যাট করুন।
              </p>
            </div>
          )}
        </div>
      </div>
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
