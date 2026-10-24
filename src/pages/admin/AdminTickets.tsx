import React, { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  Filter,
  Send,
  Paperclip,
  CheckCircle2,
  Clock,
  User,
  Shield,
  ShoppingBag,
  ExternalLink,
  Lock,
  MessageSquare,
  AlertCircle,
  X,
  ChevronRight,
  Eye,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliDate, toBengaliDigits } from '../../lib/i18n';
import { api } from '../../services/api';
import { SupportTicket, TicketMessage, TicketStatus, TicketPriority, Profile } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { useNotification } from '../../context/NotificationContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const AdminTickets: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [staffUsers, setStaffUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // ফিল্টার ও সার্চ স্টেট
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, searchQuery]);

  // নির্বাচিত টিকিট ও কথোপকথন
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // অ্যাডমিন রিপ্লাই ফর্ম
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [targetStatus, setTargetStatus] = useState<TicketStatus>('waiting_for_user');
  const [submittingReply, setSubmittingReply] = useState(false);

  const loadTickets = async () => {
    try {
      const [allTickets, allUsers] = await Promise.all([
        api.getTickets(),
        api.getUsers(),
      ]);
      setTickets(allTickets);
      setStaffUsers(allUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin'));
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'টিকিট তালিকা লোড করা যায়নি' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTargetStatus(ticket.status === 'open' ? 'in_progress' : ticket.status);
    setLoadingMessages(true);
    try {
      const msgs = await api.getTicketMessages(ticket.id, true);
      setMessages(msgs);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'বার্তাসমূহ লোড করা যায়নি' });
    } finally {
      setLoadingMessages(false);
    }
  };

  // রিয়েলটাইম মেসেজ সাবস্ক্রিপশন (অ্যাডমিন কনসোল)
  useEffect(() => {
    if (!selectedTicket || !isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel(`admin-ticket-chat-${selectedTicket.id}`)
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
          if (newMsg) {
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

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicket || !replyText.trim()) return;

    setSubmittingReply(true);
    try {
      const newMsg = await api.sendTicketMessage({
        ticketId: selectedTicket.id,
        senderId: user.id,
        senderRole: 'admin',
        message: replyText.trim(),
        attachmentUrl: replyAttachment.trim() || null,
        attachmentName: replyAttachment ? 'প্রশাসনিক সংযুক্তি' : null,
        isInternal: isInternalNote,
        updateStatus: isInternalNote ? undefined : targetStatus,
      });

      setMessages((prev) => [...prev, newMsg]);
      setReplyText('');
      setReplyAttachment('');
      setIsInternalNote(false);

      // টিকিট তালিকা রিফ্রেশ
      const updatedTickets = await api.getTickets();
      setTickets(updatedTickets);
      const cur = updatedTickets.find((t) => t.id === selectedTicket.id);
      if (cur) setSelectedTicket(cur);

      showToast({
        type: 'success',
        title: isInternalNote ? 'অভ্যন্তরীণ নোট সংরক্ষিত' : 'গ্রাহককে উত্তর পাঠানো হয়েছে',
        message: isInternalNote
          ? 'এই নোটটি শুধুমাত্র অ্যাডমিনরা দেখতে পাবে।'
          : 'গ্রাহকের অ্যাকাউন্টে ইন-অ্যাপ নোটিফিকেশন পাঠানো হয়েছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'বার্তা পাঠানো যায়নি' });
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleChangeStatus = async (newStatus: TicketStatus) => {
    if (!selectedTicket || !user) return;
    try {
      await api.updateTicketStatus(selectedTicket.id, newStatus, user.id);
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, status: newStatus } : t))
      );
      setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus } : null));
      showToast({
        type: 'info',
        title: 'অবস্থা পরিবর্তিত হয়েছে',
        message: `টিকিট অবস্থা এখন ${newStatus} করা হয়েছে।`,
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অবস্থা পরিবর্তন করা যায়নি' });
    }
  };

  const handleChangePriority = async (newPriority: TicketPriority) => {
    if (!selectedTicket || !user) return;
    try {
      await api.updateTicketPriority(selectedTicket.id, newPriority, user.id);
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, priority: newPriority } : t))
      );
      setSelectedTicket((prev) => (prev ? { ...prev, priority: newPriority } : null));
      showToast({
        type: 'info',
        title: 'অগ্রাধিকার পরিবর্তিত হয়েছে',
        message: 'টিকিট অগ্রাধিকার আপডেট করা হয়েছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অগ্রাধিকার পরিবর্তন করা যায়নি' });
    }
  };

  const handleAssignTicket = async (assignedStaffId: string) => {
    if (!selectedTicket || !user) return;
    const staffId = assignedStaffId || null;
    try {
      await api.assignTicket(selectedTicket.id, staffId, user.id);
      const assignedProfile = staffUsers.find((s) => s.id === staffId);
      setTickets((prev) =>
        prev.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, assigned_to: staffId, assigned_staff: assignedProfile }
            : t
        )
      );
      setSelectedTicket((prev) =>
        prev ? { ...prev, assigned_to: staffId, assigned_staff: assignedProfile } : null
      );
      showToast({
        type: 'success',
        title: 'অ্যাসাইনমেন্ট সম্পন্ন',
        message: staffId ? 'সাপোর্ট এজেন্ট নিযুক্ত করা হয়েছে।' : 'অ্যাসাইনমেন্ট তুলে নেওয়া হয়েছে।',
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অ্যাসাইন করা সম্ভব হয়নি' });
    }
  };

  // ফিল্টার করা তালিকা
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = t.ticket_number.toLowerCase().includes(q);
      const matchSub = t.subject.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchUser =
        t.customer?.full_name?.toLowerCase().includes(q) ||
        t.customer?.email?.toLowerCase().includes(q);
      return matchNum || matchSub || matchCat || matchUser;
    }
    return true;
  });

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const waitingCount = tickets.filter((t) => t.status === 'waiting_for_user').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            গ্রাহক সেবা ও টিকিট কন্ট্রোল ডেস্ক
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">সহায়তা টিকিট ও মেসেজিং কন্ট্রোল</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            সকল গ্রাহকের টিকিট পর্যালোচনা করুন, সরাসরি মেসেজের উত্তর দিন, এবং অভ্যন্তরীণ নোট সংরক্ষণ করুন।
          </p>
        </div>
      </div>

      {/* KPI সারসংক্ষেপ কার্ডস */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            মোট টিকিট
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            {toBengaliDigits(tickets.length)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            খোলা টিকিট
          </span>
          <div className="text-2xl font-bold text-amber-800 mt-1 font-mono">
            {toBengaliDigits(openCount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
            কাজ চলছে
          </span>
          <div className="text-2xl font-bold text-indigo-800 mt-1 font-mono">
            {toBengaliDigits(inProgressCount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            সমাধান হয়েছে
          </span>
          <div className="text-2xl font-bold text-emerald-800 mt-1 font-mono">
            {toBengaliDigits(resolvedCount)}
          </div>
        </div>
      </div>

      {/* সার্চ এবং ফিল্টার বার */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="টিকিট আইডি, বিষয়, গ্রাহকের নাম বা ইমেইল দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
            >
              <option value="all">সকল অগ্রাধিকার</option>
              <option value="urgent">অতি জরুরি</option>
              <option value="high">জরুরি</option>
              <option value="medium">মাঝারি</option>
              <option value="low">সাধারণ</option>
            </select>
          </div>
        </div>

        {/* স্ট্যাটাস ট্যাব */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          {[
            { id: 'all', label: 'সকল' },
            { id: 'open', label: 'খোলা' },
            { id: 'in_progress', label: 'কাজ চলছে' },
            { id: 'waiting_for_user', label: 'উত্তরের অপেক্ষায়' },
            { id: 'resolved', label: 'সমাধান হয়েছে' },
            { id: 'closed', label: 'বন্ধ' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* টিকিট তালিকা ও ড্রয়ার/কথোপকথন */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* টিকিট টেবিল */}
        <div className={`${selectedTicket ? 'hidden lg:block lg:col-span-5' : 'col-span-12'} space-y-3`}>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span>সহায়তা টিকিট তালিকা ({toBengaliDigits(filteredTickets.length)})</span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">লোড হচ্ছে...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p>কোনো টিকিট পাওয়া যায়নি।</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
                  {filteredTickets.slice((currentPage - 1) * 8, currentPage * 8).map((t) => {
                    const isSelected = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      className={`p-4 transition-colors cursor-pointer hover:bg-slate-50 ${
                        isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-slate-900">{t.ticket_number}</span>
                        <StatusBadge status={t.status} />
                      </div>

                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 mt-1 line-clamp-1">
                        {t.subject}
                      </h4>

                      <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-slate-500">
                        <div className="flex items-center gap-1.5 truncate">
                          <User className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t.customer?.full_name || t.customer?.email || 'গ্রাহক'}</span>
                        </div>
                        <span className="shrink-0">{toBengaliDate(t.updated_at || t.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {t.category}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            t.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-800'
                              : t.priority === 'high'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {t.priority === 'urgent'
                            ? 'অতি জরুরি'
                            : t.priority === 'high'
                            ? 'জরুরি'
                            : t.priority === 'medium'
                            ? 'মাঝারি'
                            : 'সাধারণ'}
                        </span>
                        {t.order && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
                            #{t.order.order_number}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredTickets.length / 8)}
                totalItems={filteredTickets.length}
                pageSize={8}
                onPageChange={setCurrentPage}
              />
            </>
            )}
          </div>
        </div>

        {/* নির্বাচিত টিকিটের বিস্তারিত অ্যাডমিন কনসোল */}
        {selectedTicket ? (
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col min-h-[640px]">
              {/* হেডার ও অ্যাকশন কন্ট্রোলস */}
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {selectedTicket.ticket_number}
                      </span>
                      <StatusBadge status={selectedTicket.status} />
                      <span className="text-xs font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {selectedTicket.category}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-2">
                      {selectedTicket.subject}
                    </h3>
                  </div>

                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* কাস্টমার ও অর্ডার তথ্য কার্ড */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      গ্রাহকের তথ্য
                    </span>
                    <div className="font-semibold text-slate-900">
                      {selectedTicket.customer?.full_name || 'নাম নেই'}
                    </div>
                    <div className="text-slate-500 font-mono text-[11px]">
                      {selectedTicket.customer?.email}
                    </div>
                    {selectedTicket.customer?.phone && (
                      <div className="text-slate-500 text-[11px]">
                        ফোন: {selectedTicket.customer.phone}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      স্ট্যাটাস ও দায়িত্বপ্রাপ্ত প্রতিনিধি
                    </span>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-500 shrink-0">অবস্থা:</label>
                      <select
                        value={selectedTicket.status}
                        onChange={(e) => handleChangeStatus(e.target.value as TicketStatus)}
                        className="py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs font-semibold focus:outline-hidden w-full"
                      >
                        <option value="open">খোলা (Open)</option>
                        <option value="in_progress">কাজ চলছে (In Progress)</option>
                        <option value="waiting_for_user">উত্তরের অপেক্ষায় (Waiting)</option>
                        <option value="resolved">সমাধান হয়েছে (Resolved)</option>
                        <option value="closed">বন্ধ (Closed)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-slate-500 shrink-0">এজেন্ট:</label>
                      <select
                        value={selectedTicket.assigned_to || ''}
                        onChange={(e) => handleAssignTicket(e.target.value)}
                        className="py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-hidden w-full"
                      >
                        <option value="">নিযুক্ত করা হয়নি</option>
                        {staffUsers.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.full_name || staff.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* সংশ্লিষ্ট অর্ডার ব্যানার */}
                {selectedTicket.order && (
                  <div className="bg-indigo-50/60 border border-indigo-200 p-2.5 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-indigo-700" />
                      <span className="text-slate-600">সংযুক্ত অর্ডার:</span>
                      <span className="font-mono font-bold text-slate-900">
                        #{selectedTicket.order.order_number}
                      </span>
                      <StatusBadge status={selectedTicket.order.status} />
                    </div>
                    <a
                      href={`/admin/orders`}
                      className="text-xs font-semibold text-indigo-700 hover:underline flex items-center gap-1"
                    >
                      <span>অর্ডারে যান</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* চ্যাট ও বার্তা থ্রেড */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[380px] bg-slate-50/50">
                {loadingMessages ? (
                  <div className="p-8 text-center text-xs text-slate-500">মেসেজ লোড হচ্ছে...</div>
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">এখনো কোনো বার্তা বিনিময় হয়নি।</div>
                ) : (
                  messages.map((m) => {
                    const isCustomer = m.sender_role === 'customer';
                    const isInternal = m.is_internal;

                    return (
                      <div
                        key={m.id}
                        className={`flex gap-3 ${
                          isInternal
                            ? 'justify-center'
                            : isCustomer
                            ? 'justify-start'
                            : 'justify-end'
                        }`}
                      >
                        {isInternal ? (
                          <div className="max-w-[90%] bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1 w-full shadow-xs">
                            <div className="flex items-center justify-between text-[10px] font-bold text-amber-700">
                              <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>অভ্যন্তরীণ প্রশাসনিক নোট (গ্রাহক দেখতে পাবে না)</span>
                              </span>
                              <span>{toBengaliDate(m.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-line leading-relaxed">{m.message}</p>
                          </div>
                        ) : (
                          <>
                            {isCustomer && (
                              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-xs font-bold">
                                <User className="w-4 h-4" />
                              </div>
                            )}

                            <div
                              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-1.5 text-xs shadow-xs ${
                                isCustomer
                                  ? 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                                  : 'bg-indigo-900 text-white rounded-tr-none'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 text-[10px] opacity-75">
                                <span className="font-semibold">
                                  {isCustomer
                                    ? selectedTicket.customer?.full_name || 'গ্রাহক'
                                    : 'অ্যাডমিন সাপোর্ট'}
                                </span>
                                <span>{toBengaliDate(m.created_at)}</span>
                              </div>

                              <p className="whitespace-pre-line leading-relaxed">{m.message}</p>

                              {m.attachment_url && (
                                <div className="pt-2">
                                  <a
                                    href={m.attachment_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium ${
                                      isCustomer
                                        ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                                        : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    <span>{m.attachment_name || 'সংযুক্ত ফাইল'}</span>
                                  </a>
                                </div>
                              )}
                            </div>

                            {!isCustomer && (
                              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                                <Shield className="w-4 h-4" />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* অ্যাডমিন রিপ্লাই ফর্ম */}
              <form
                onSubmit={handleSendAdminReply}
                className="p-3 sm:p-4 bg-white border-t border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isInternalNote}
                      onChange={(e) => setIsInternalNote(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0"
                    />
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>গোপন অভ্যন্তরীণ নোট হিসেবে লিখুন</span>
                    </span>
                  </label>

                  {!isInternalNote && (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">পরবর্তী অবস্থা:</span>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value as TicketStatus)}
                        className="py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-hidden"
                      >
                        <option value="waiting_for_user">উত্তরের অপেক্ষায় (Waiting)</option>
                        <option value="in_progress">কাজ চলছে (In Progress)</option>
                        <option value="resolved">সমাধান হয়েছে (Resolved)</option>
                      </select>
                    </div>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'অভ্যন্তরীণ নোট লিখুন (গ্রাহক দেখতে পাবে না)...'
                      : 'গ্রাহককে স্পষ্ট সমাধান বা নির্দেশনা লিখে উত্তর পাঠান...'
                  }
                  className={`w-full p-2.5 rounded-lg text-xs border focus:outline-hidden transition-colors ${
                    isInternalNote
                      ? 'bg-amber-50/50 border-amber-300 focus:bg-white'
                      : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500'
                  }`}
                  required
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="ডকুমেন্ট বা স্ক্রিনশট ইউআরএল (ঐচ্ছিক)"
                      value={replyAttachment}
                      onChange={(e) => setReplyAttachment(e.target.value)}
                      className="w-full sm:w-72 p-1.5 pl-7 bg-slate-50 border border-slate-200 rounded text-[11px] focus:outline-hidden"
                    />
                    <Paperclip className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReply || !replyText.trim()}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 ${
                      isInternalNote
                        ? 'bg-amber-700 hover:bg-amber-800'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {submittingReply
                        ? 'পাঠানো হচ্ছে...'
                        : isInternalNote
                        ? 'নোট সংরক্ষণ করুন'
                        : 'উত্তর পাঠান ও নোটিফাই করুন'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex lg:col-span-7 bg-white rounded-xl border border-slate-200 p-12 flex-col items-center justify-center text-center text-slate-400 space-y-3">
            <HelpCircle className="w-12 h-12 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-700">কোনো টিকিট খোলা হয়নি</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              বাম পাশের তালিকা থেকে যেকোনো টিকিট নির্বাচন করে সম্পূর্ণ বার্তা ইতিহাস দেখুন এবং উত্তর দিন।
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
