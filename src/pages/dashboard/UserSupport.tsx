import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShoppingBag,
  User,
  Shield,
  FileText,
  AlertCircle,
  X,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliDate, toBengaliDigits } from '../../lib/i18n';
import { api } from '../../services/api';
import { SupportTicket, TicketMessage, Order } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotification } from '../../context/NotificationContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

const TICKET_CATEGORIES = [
  'অর্ডার সংক্রান্ত সমস্যা',
  'ওয়ালেট ও লেনদেন',
  'সার্ভিস সংক্রান্ত প্রশ্ন',
  'ফাইল আপলোড বা ডাউনলোড',
  'অ্যাকাউন্ট সংক্রান্ত সমস্যা',
  'প্রযুক্তিগত সমস্যা',
  'অন্যান্য',
];

export const UserSupport: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // নতুন টিকিট খোলার ফর্ম স্টেট
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState(TICKET_CATEGORIES[0]);
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // টিকিট বিস্তারিত ও বার্তা থ্রেড স্টেট
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // টিকিট পুনরায় খোলার স্টেট
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  // টিকিট ফিল্টার
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed'>('all');

  const loadData = async () => {
    if (!user) return;
    try {
      const [ticketList, orderList] = await Promise.all([
        api.getTickets(user.id),
        api.getUserOrders(user.id),
      ]);
      setTickets(ticketList);
      setUserOrders(orderList);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'টিকিট লোড করা সম্ভব হয়নি' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // টিকিট নির্বাচন করলে মেসেজগুলো লোড করা
  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    try {
      const msgs = await api.getTicketMessages(ticket.id, false);
      setMessages(msgs);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'বার্তাসমূহ লোড করা যায়নি' });
    } finally {
      setLoadingMessages(false);
    }
  };

  // রিয়েলটাইম মেসেজ ও স্ট্যাটাস সাবস্ক্রিপশন
  useEffect(() => {
    if (!selectedTicket || !isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel(`user-ticket-chat-${selectedTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          const newMsg = payload.new as TicketMessage;
          if (newMsg && !newMsg.is_internal) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${selectedTicket.id}`,
        },
        (payload) => {
          const updated = payload.new as SupportTicket;
          if (updated) {
            setSelectedTicket(updated);
            setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [selectedTicket?.id]);

  // নতুন টিকিট খোলার হ্যান্ডলার
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.createTicket({
        userId: user.id,
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        orderId: selectedOrderId || null,
        attachmentUrl: attachmentUrl.trim() || null,
        attachmentName: attachmentUrl ? 'সংযুক্ত ফাইল / স্ক্রিনশট' : null,
      });

      setTickets((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setSubject('');
      setDescription('');
      setSelectedOrderId('');
      setAttachmentUrl('');
      setPriority('medium');
      setCategory(TICKET_CATEGORIES[0]);

      showToast({
        type: 'success',
        title: 'টিকিট সফলভাবে খোলা হয়েছে',
        message: `টিকিট #${created.ticket_number} রেকর্ড হয়েছে। আমাদের প্রতিনিধি দ্রুত যোগাযোগ করবেন।`,
      });

      // স্বয়ংক্রিয়ভাবে বিস্তারিত ভিউ ওপেন করা
      handleSelectTicket(created);
    } catch (err: unknown) {
      showToast({
        type: 'error',
        title: 'ত্রুটি',
        message: err instanceof Error ? err.message : 'টিকিট তৈরি করা যায়নি',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // টিকিটে উত্তর পাঠানো
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const newMsg = await api.sendTicketMessage({
        ticketId: selectedTicket.id,
        senderId: user.id,
        senderRole: 'customer',
        message: replyText.trim(),
        attachmentUrl: replyAttachment.trim() || null,
        attachmentName: replyAttachment ? 'গ্রাহকের সংযুক্তি' : null,
        isInternal: false,
      });

      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      setReplyAttachment('');

      // আপডেট হওয়া টিকিট তালিকা রিফ্রেশ
      const updatedTickets = await api.getTickets(user.id);
      setTickets(updatedTickets);
      const cur = updatedTickets.find((t) => t.id === selectedTicket.id);
      if (cur) setSelectedTicket(cur);

      showToast({
        type: 'success',
        title: 'উত্তর পাঠানো হয়েছে',
        message: 'আপনার বার্তা সহায়তা প্রতিনিধিদের কাছে পৌঁছে গেছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'বার্তা পাঠানো সম্ভব হয়নি' });
    } finally {
      setSendingReply(false);
    }
  };

  // সমাধানকৃত টিকিট পুনরায় খোলা
  const handleReopenTicket = async () => {
    if (!user || !selectedTicket || !reopenReason.trim()) return;

    setReopening(true);
    try {
      await api.reopenTicket(selectedTicket.id, user.id, reopenReason.trim());
      setIsReopenModalOpen(false);
      setReopenReason('');

      // রিফ্রেশ
      const updatedTickets = await api.getTickets(user.id);
      setTickets(updatedTickets);
      const cur = updatedTickets.find((t) => t.id === selectedTicket.id);
      if (cur) setSelectedTicket(cur);

      const updatedMsgs = await api.getTicketMessages(selectedTicket.id, false);
      setMessages(updatedMsgs);

      showToast({
        type: 'success',
        title: 'টিকিট পুনরায় খোলা হয়েছে',
        message: 'আপনার কারণ সহ টিকিটটি আবার পর্যালোচনা টেবিলে পাঠানো হয়েছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'টিকিট পুনরায় খোলা যায়নি' });
    } finally {
      setReopening(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'all') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* হেডার ও অ্যাকশন বোতাম */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            গ্রাহক সহায়তা ডেস্ক ও সার্ভিস সাপোর্ট
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">সহায়তা টিকিট ও কথোপকথন</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            অর্ডার, ডেলিভারি রিভিশন, ওয়ালেট বা প্রযুক্তিগত বিষয়ে আমাদের ডেডিকেটেড সাপোর্ট টিমের সাথে সরাসরি যোগাযোগ করুন।
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন টিকিট খুলুন</span>
        </button>
      </div>

      {/* ফিল্টার ট্যাব */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          সকল টিকিট ({toBengaliDigits(tickets.length)})
        </button>
        <button
          onClick={() => setStatusFilter('open')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'open' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          খোলা ({toBengaliDigits(tickets.filter((t) => t.status === 'open').length)})
        </button>
        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'in_progress' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          কাজ চলছে ({toBengaliDigits(tickets.filter((t) => t.status === 'in_progress').length)})
        </button>
        <button
          onClick={() => setStatusFilter('waiting_for_user')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'waiting_for_user' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          উত্তরের অপেক্ষায় ({toBengaliDigits(tickets.filter((t) => t.status === 'waiting_for_user').length)})
        </button>
        <button
          onClick={() => setStatusFilter('resolved')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'resolved' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          সমাধান হয়েছে ({toBengaliDigits(tickets.filter((t) => t.status === 'resolved').length)})
        </button>
        <button
          onClick={() => setStatusFilter('closed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            statusFilter === 'closed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          বন্ধ ({toBengaliDigits(tickets.filter((t) => t.status === 'closed').length)})
        </button>
      </div>

      {/* প্রধান লেআউট: টিকিট তালিকা এবং বিস্তারিত কথোপকথন */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* টিকিট তালিকা */}
        <div className={`${selectedTicket ? 'hidden lg:block lg:col-span-5' : 'col-span-12'} space-y-3`}>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">আপনার টিকিটসমূহ</span>
              <span className="text-[11px] text-slate-500 font-mono">
                মোট {toBengaliDigits(filteredTickets.length)} টি
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">টিকিট লোড হচ্ছে...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-3">
                <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                <p>কোনো সহায়তা টিকিট খুঁজে পাওয়া যায়নি।</p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  প্রথম টিকিট খুলুন
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                {filteredTickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                        isSelected ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-slate-800">{t.ticket_number}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">{t.subject}</h4>
                      <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-slate-500">
                        <span className="truncate">{t.category}</span>
                        <span className="shrink-0">{toBengaliDate(t.created_at)}</span>
                      </div>
                      {t.order && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600">
                          <ShoppingBag className="w-3 h-3" />
                          <span>অর্ডার #{t.order.order_number}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* টিকিট বিস্তারিত ও কথোপকথন থ্রেড */}
        {selectedTicket ? (
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col min-h-[550px]">
              {/* টিকিট বিবরণ হেডার */}
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {selectedTicket.ticket_number}
                      </span>
                      <StatusBadge status={selectedTicket.status} />
                      <span className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        বিভাগ: {selectedTicket.category}
                      </span>
                      <span className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        অগ্রাধিকার:{' '}
                        {selectedTicket.priority === 'urgent'
                          ? 'অতি জরুরি'
                          : selectedTicket.priority === 'high'
                          ? 'জরুরি'
                          : selectedTicket.priority === 'medium'
                          ? 'মাঝারি'
                          : 'সাধারণ'}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                      {selectedTicket.subject}
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                    title="তালিকায় ফিরুন"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* সংযুক্ত অর্ডার তথ্য */}
                {selectedTicket.order && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                      <span className="text-slate-500">সংযুক্ত অর্ডার:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        #{selectedTicket.order.order_number}
                      </span>
                      <StatusBadge status={selectedTicket.order.status} />
                    </div>
                    <a
                      href={`/dashboard/orders/${selectedTicket.order.id}`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>অর্ডার দেখুন</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* সমাধানকৃত টিকিটের ক্ষেত্রে পুনরায় খোলার অপশন */}
                {selectedTicket.status === 'resolved' && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>এই টিকিটটি সমাধান হিসেবে চিহ্নিত করা হয়েছে। আপনার সমস্যা কি সমাধান হয়নি?</span>
                    </div>
                    <button
                      onClick={() => setIsReopenModalOpen(true)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>পুনরায় খুলুন</span>
                    </button>
                  </div>
                )}
              </div>

              {/* মেসেজ তালিকা (কথোপকথন হিস্ট্রি) */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[420px] bg-slate-50/40">
                {loadingMessages ? (
                  <div className="p-8 text-center text-xs text-slate-500">কথোপকথন লোড হচ্ছে...</div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    এখনো কোনো উত্তর আসেনি। আমাদের টিম শীঘ্রই উত্তর দেবে।
                  </div>
                ) : (
                  messages.map((m) => {
                    const isUserMsg = m.sender_role === 'customer';
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 ${isUserMsg ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUserMsg && (
                          <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                            <Shield className="w-4 h-4" />
                          </div>
                        )}

                        <div
                          className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-1.5 text-xs shadow-xs ${
                            isUserMsg
                              ? 'bg-slate-900 text-white rounded-tr-none'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                            <span className="font-semibold">
                              {isUserMsg ? 'আপনি' : 'MukiSoft সাপোর্ট টিম'}
                            </span>
                            <span>{toBengaliDate(m.created_at)}</span>
                          </div>

                          <p className="whitespace-pre-line leading-relaxed text-xs">{m.message}</p>

                          {m.attachment_url && (
                            <div className="pt-2">
                              <a
                                href={m.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                                  isUserMsg
                                    ? 'bg-white/20 text-white hover:bg-white/30'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                                }`}
                              >
                                <Paperclip className="w-3 h-3" />
                                <span>{m.attachment_name || 'সংযুক্ত নথি দেখুন'}</span>
                              </a>
                            </div>
                          )}
                        </div>

                        {isUserMsg && (
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                            <User className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* উত্তর পাঠানোর কম্পোজার (যদি টিকিট সম্পূর্ণ বন্ধ না থাকে) */}
              {selectedTicket.status !== 'closed' ? (
                <form
                  onSubmit={handleSendReply}
                  className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-2.5"
                >
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="আপনার বার্তা বা বিস্তারিত তথ্য লিখুন..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-colors"
                    required
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="url"
                          placeholder="সংযুক্ত ফাইলের লিংক বা গুগল ড্রাইভ ইউআরএল (ঐচ্ছিক)"
                          value={replyAttachment}
                          onChange={(e) => setReplyAttachment(e.target.value)}
                          className="w-full sm:w-72 p-1.5 pl-7 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-hidden"
                        />
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingReply || !replyText.trim()}
                      className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingReply ? 'পাঠানো হচ্ছে...' : 'উত্তর পাঠান'}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-500">
                  এই টিকিটটি বন্ধ করা হয়েছে। নতুন কোনো প্রশ্নের জন্য নতুন টিকিট খুলুন।
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex lg:col-span-7 bg-white rounded-xl border border-slate-200 p-12 flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-700">কোনো টিকিট নির্বাচিত নেই</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              বাম পাশের তালিকা থেকে যেকোনো টিকিটের ওপর ক্লিক করে সম্পূর্ণ কথোপকথন এবং সাপোর্ট টিমের উত্তর দেখুন।
            </p>
          </div>
        )}
      </div>

      {/* নতুন টিকিট তৈরির মডাল */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">নতুন সহায়তা টিকিট তৈরি করুন</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  বিষয় / সমস্যা সংক্ষেপ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: অর্ডার ডেলিভারিতে সংশোধন প্রয়োজন"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    টিকিটের বিভাগ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    {TICKET_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">জরুরিত্ব / অগ্রাধিকার</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="low">সাধারণ (Low)</option>
                    <option value="medium">মাঝারি (Medium)</option>
                    <option value="high">জরুরি (High)</option>
                    <option value="urgent">অতি জরুরি (Urgent)</option>
                  </select>
                </div>
              </div>

              {/* সংশ্লিষ্ট অর্ডার নির্বাচন */}
              {userOrders.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    সংশ্লিষ্ট অর্ডার নির্বাচন করুন (ঐচ্ছিক)
                  </label>
                  <select
                    value={selectedOrderId}
                    onChange={(e) => setSelectedOrderId(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="">কোনো নির্দিষ্ট অর্ডার নয়</option>
                    {userOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        অর্ডার #{ord.order_number} — {ord.service?.title_bn || ord.service?.title || 'সেবা'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  বিস্তারিত বিবরণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="আপনার সমস্যা, প্রয়োজনীয় পরিবর্তন বা প্রশ্নের স্পষ্ট বিবরণ দিন..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  স্ক্রিনশট বা সংযুক্ত ফাইলের লিংক (ঐচ্ছিক)
                </label>
                <input
                  type="url"
                  placeholder="গুগল ড্রাইভ বা ইমেজ লিংক (যেমন: https://...)"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  ছবি বা প্রাসঙ্গিক ডকুমেন্টের লিংক দিলে দ্রুত সমাধানে সহায়তা হবে।
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'তৈরি করা হচ্ছে...' : 'টিকিট জমা দিন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* টিকিট পুনরায় খোলার মডাল */}
      {isReopenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">টিকিট পুনরায় খোলার কারণ</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              আপনার সমস্যার সমাধান কেন অসম্পূর্ণ রয়েছে তা উল্লেখ করুন। এটি আমাদের সাপোর্ট এজেন্টদের দ্রুত পদক্ষেপ নিতে সাহায্য করবে।
            </p>

            <textarea
              rows={3}
              required
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="পুনরায় খোলার স্পষ্ট কারণ লিখুন..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReopenModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleReopenTicket}
                disabled={reopening || !reopenReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50"
              >
                {reopening ? 'প্রক্রিয়াধীন...' : 'নিশ্চিত করুন ও টিকিট খুলুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
