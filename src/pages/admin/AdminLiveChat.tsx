import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  User,
  Phone,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bot,
  Headphones,
  Send,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { liveChatService } from '../../services/liveChatService';
import { LiveChatSession, LiveChatMessage } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { toBengaliDigits } from '../../lib/i18n';

export const AdminLiveChat: React.FC = () => {
  const { user, profile } = useAuth();
  const { showToast } = useNotification();

  const [sessions, setSessions] = useState<LiveChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<LiveChatSession | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'connected' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // সেশন লোড (অ্যাডমিন শুধুমাত্র লাইভ রিকোয়েস্ট ও সক্রিয় চ্যাট দেখবেন, AI মোড গোপন থাকবে)
  const loadSessions = async () => {
    try {
      setLoading(true);
      const all = await liveChatService.getAllSessions();
      const visible = all.filter((s) => s.status !== 'ai_mode');
      setSessions(visible);
      if (visible.length > 0 && !selectedSession) {
        setSelectedSession(visible[0]);
      }
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'লাইভ চ্যাট সেশন লোড করা যায়নি' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // নির্বাচিত সেশনের মেসেজ লোড
  useEffect(() => {
    if (!selectedSession) {
      setMessages([]);
      return;
    }

    liveChatService.getMessages(selectedSession.id).then((msgs) => {
      setMessages(msgs);
    });
  }, [selectedSession]);

  // রিয়েল-টাইম আপডেট লিসেনার
  useEffect(() => {
    const unsubscribe = liveChatService.subscribeToUpdates((event) => {
      if (event.type === 'delete_session') {
        const deleted = event.data as { id: string };
        setSessions((prev) => prev.filter((s) => s.id !== deleted.id));
        setSelectedSession((curr) => (curr?.id === deleted.id ? null : curr));
        setMessages([]);
      } else if (event.type === 'session') {
        const updated = event.data as LiveChatSession;
        if (updated.status === 'ai_mode') {
          // AI মোডের কথোপকথন অ্যাডমিন প্যানেলে দেখানো হবে না
          setSessions((prev) => prev.filter((s) => s.id !== updated.id));
          setSelectedSession((curr) => (curr?.id === updated.id ? null : curr));
        } else {
          setSessions((prev) => {
            const idx = prev.findIndex((s) => s.id === updated.id);
            if (idx >= 0) {
              const clone = [...prev];
              clone[idx] = updated;
              return clone;
            }
            return [updated, ...prev];
          });

          if (selectedSession && selectedSession.id === updated.id) {
            setSelectedSession(updated);
          }
        }
      } else if (event.type === 'message') {
        const msg = event.data as LiveChatMessage;
        if (selectedSession && msg.session_id === selectedSession.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      }
    });

    return () => unsubscribe();
  }, [selectedSession]);

  // অ্যাডমিন চ্যাট গ্রহণ (Claim / Accept)
  const handleAcceptChat = async (s: LiveChatSession) => {
    const adminName = profile?.full_name || 'MukiSoft সাপোর্ট অ্যাডমিন';
    const adminId = user?.id || 'admin_operator';

    try {
      const updated = await liveChatService.acceptSession(s.id, adminId, adminName);
      setSelectedSession(updated);
      showToast({
        type: 'success',
        title: 'চ্যাট সংযুক্ত হয়েছে',
        message: `আপনি ${s.customer_name}-এর চ্যাটে সফলভাবে যুক্ত হয়েছেন।`,
      });
      loadSessions();
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'চ্যাট গ্রহণ করা সম্ভব হয়নি' });
    }
  };

  // মেসেজ সেন্ড
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedSession || sending) return;

    const adminName = profile?.full_name || 'সাপোর্ট অ্যাডমিন';
    const content = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      await liveChatService.sendMessage(selectedSession.id, 'admin', adminName, content);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'মেসেজ পাঠানো যায়নি' });
    } finally {
      setSending(false);
    }
  };

  // চ্যাট সমাপ্তকরণ ও সম্পূর্ণ মুছে ফেলা
  const handleCloseChat = async () => {
    if (!selectedSession) return;

    try {
      const targetId = selectedSession.id;
      await liveChatService.deleteSession(targetId);
      showToast({
        type: 'info',
        title: 'চ্যাট সম্পূর্ণ মুছে ফেলা হয়েছে',
        message: 'চ্যাট সেশন এবং সকল মেসেজ উভয় প্রান্ত (অ্যাডমিন ও ইউজার) থেকেই স্থায়ীভাবে ডিলিট করা হয়েছে।',
      });
      setSessions((prev) => prev.filter((s) => s.id !== targetId));
      setSelectedSession(null);
      setMessages([]);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'চ্যাট ডিলিট করা যায়নি' });
    }
  };

  // ফিল্টার করা সেশন (AI মোড সম্পূর্ণভাবে বাদ)
  const visibleSessions = sessions.filter((s) => s.status !== 'ai_mode');
  const filteredSessions = visibleSessions.filter((s) => {
    if (statusFilter === 'waiting' && s.status !== 'waiting_for_agent') return false;
    if (statusFilter === 'connected' && s.status !== 'agent_connected') return false;
    if (statusFilter === 'closed' && s.status !== 'closed') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.customer_name.toLowerCase().includes(q);
      const matchPhone = s.customer_phone.includes(q);
      return matchName || matchPhone;
    }
    return true;
  });

  const waitingCount = visibleSessions.filter((s) => s.status === 'waiting_for_agent').length;
  const connectedCount = visibleSessions.filter((s) => s.status === 'agent_connected').length;
  const closedCount = visibleSessions.filter((s) => s.status === 'closed').length;

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            গ্রাহক যোগাযোগ ও সহায়তা
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">লাইভ সাপোর্ট চ্যাট ড্যাশবোর্ড</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            গ্রাহকদের লাইভ এজেন্টের জন্য আসা অনুরোধ ও রিয়েল-টাইম সহায়তা পরিচালনা করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          {waitingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold animate-pulse">
              <Headphones className="w-4 h-4 text-amber-600" />
              <span>{toBengaliDigits(waitingCount)} জন গ্রাহক এজেন্টের অপেক্ষায়!</span>
            </span>
          )}

          <button
            onClick={loadSessions}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* মূল চ্যাট কনসোল (ফিক্সড ভিউপোর্ট হাইট + মসৃণ ইন্টারনাল স্ক্রলিং) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-220px)] min-h-[580px] max-h-[780px]">
        {/* বাঁদিকের প্যানেল: সেশন তালিকা (৪ কলাম) */}
        <div className="md:col-span-5 lg:col-span-4 border-r border-slate-200 flex flex-col h-full overflow-hidden bg-slate-50/50">
          {/* সার্চ ও ফিল্টার */}
          <div className="p-3.5 border-b border-slate-200 space-y-2 bg-white shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="নাম বা ফোন নম্বর দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:bg-white"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 text-[11px]">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                সকল ({toBengaliDigits(visibleSessions.length)})
              </button>
              <button
                onClick={() => setStatusFilter('waiting')}
                className={`px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
                  statusFilter === 'waiting'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                অপেক্ষমান ({toBengaliDigits(waitingCount)})
              </button>
              <button
                onClick={() => setStatusFilter('connected')}
                className={`px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
                  statusFilter === 'connected'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                লাইভ ({toBengaliDigits(connectedCount)})
              </button>
              <button
                onClick={() => setStatusFilter('closed')}
                className={`px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
                  statusFilter === 'closed'
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                সমাপ্ত ({toBengaliDigits(closedCount)})
              </button>
            </div>
          </div>

          {/* সেশন স্ক্রোলেবল তালিকা */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">লোড হচ্ছে...</div>
            ) : filteredSessions.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-2">
                <MessageCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p>কোনো চ্যাট সেশন পাওয়া যায়নি।</p>
              </div>
            ) : (
              filteredSessions.map((s) => {
                const isSelected = selectedSession?.id === s.id;
                const isWaiting = s.status === 'waiting_for_agent';
                const isConnected = s.status === 'agent_connected';

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSession(s)}
                    className={`p-3.5 cursor-pointer transition-colors text-xs ${
                      isSelected
                        ? 'bg-white border-l-4 border-indigo-600 shadow-2xs'
                        : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {s.customer_name ? s.customer_name.slice(0, 1).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 leading-tight">{s.customer_name}</h4>
                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            {s.customer_phone}
                          </span>
                        </div>
                      </div>

                      {/* স্ট্যাটাস ব্যাজ */}
                      {isWaiting ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                          এজেন্ট প্রয়োজন
                        </span>
                      ) : isConnected ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          লাইভ
                        </span>
                      ) : s.status === 'closed' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                          সমাপ্ত
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                          AI মোড
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 truncate mt-2 pl-10">
                      {s.last_message || 'কথোপকথন চলছে...'}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pl-10">
                      <span>{new Date(s.updated_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</span>
                      {s.assigned_admin_name && (
                        <span className="font-semibold text-slate-600">এজেন্ট: {s.assigned_admin_name}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ডানদিকের প্যানেল: মেসেজিং উইন্ডো (৮ কলাম) */}
        <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full overflow-hidden bg-white">
          {selectedSession ? (
            <>
              {/* চ্যাট হেডার */}
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {selectedSession.customer_name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{selectedSession.customer_name}</h3>
                      <span className="text-xs font-mono text-slate-500">({selectedSession.customer_phone})</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      অবস্থা:{' '}
                      <strong className="text-slate-800">
                        {selectedSession.status === 'agent_connected'
                          ? `লাইভ এজেন্ট যুক্ত (${selectedSession.assigned_admin_name || 'অ্যাডমিন'})`
                          : selectedSession.status === 'waiting_for_agent'
                          ? 'হিউম্যান এজেন্টের অপেক্ষায়...'
                          : selectedSession.status === 'closed'
                          ? 'চ্যাট সমাপ্ত'
                          : 'গ্রাহক বর্তমানে AI সহকারীর সাথে কথা বলছেন'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* যদি এজেন্টের অপেক্ষায় থাকে বা AI মোডে থাকে, অ্যাডমিন ক্লেইম করতে পারবে */}
                  {selectedSession.status !== 'agent_connected' && selectedSession.status !== 'closed' && (
                    <button
                      onClick={() => handleAcceptChat(selectedSession)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Headphones className="w-4 h-4" />
                      <span>চ্যাট গ্রহণ করুন (Accept)</span>
                    </button>
                  )}

                  <button
                    onClick={handleCloseChat}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
                    title="চ্যাটটি সম্পূর্ণ মুছে ফেলুন (উভয় প্রান্ত থেকে ডিলিট হবে)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>চ্যাট মুছুন ও শেষ করুন</span>
                  </button>
                </div>
              </div>

              {/* কনভারসেশন মেসেজ স্ক্রিন (মসৃণ ইন্টারনাল স্ক্রলিং) */}
              <div ref={messagesContainerRef} className="flex-1 p-5 overflow-y-auto space-y-3.5 text-xs bg-slate-50/30 min-h-0">
                {messages.map((m) => {
                  const isCustomer = m.sender_type === 'customer';
                  const isSystem = m.sender_type === 'system';
                  const isAi = m.sender_type === 'ai';
                  const isAdmin = m.sender_type === 'admin';

                  if (isSystem) {
                    return (
                      <div key={m.id} className="text-center my-2">
                        <span className="inline-block bg-slate-200 text-slate-700 text-[11px] px-3 py-1 rounded-full font-medium">
                          {m.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isAdmin && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                          {isAi ? <Bot className="w-4 h-4 text-indigo-600" /> : <User className="w-4 h-4 text-slate-600" />}
                        </div>
                      )}

                      <div className="max-w-[75%] space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-600">{m.sender_name}</span>
                          <span>•</span>
                          <span>
                            {new Date(m.created_at).toLocaleTimeString('bn-BD', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <div
                          className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                            isAdmin
                              ? 'bg-slate-900 text-white rounded-br-xs'
                              : isAi
                              ? 'bg-indigo-50/80 text-indigo-950 border border-indigo-100 rounded-bl-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {m.message}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* অ্যাডমিন ইনপুট বার */}
              <div className="p-4 border-t border-slate-200 bg-white shrink-0">
                {selectedSession.status === 'closed' ? (
                  <div className="text-center p-2 text-xs text-slate-400 bg-slate-50 rounded-xl">
                    এই সেশনটি সমাপ্ত হয়েছে। নতুন কোনো বার্তা পাঠানো যাবে না।
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={
                        selectedSession.status === 'agent_connected'
                          ? 'গ্রাহককে রিপ্লাই লিখুন...'
                          : 'মেসেজ পাঠিয়ে সরাসরি চ্যাটে যুক্ত হোন...'
                      }
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="flex-1 py-2.5 px-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-400 rounded-xl text-xs focus:outline-hidden transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!inputText.trim() || sending}
                      className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40 shadow-xs flex items-center gap-1.5"
                    >
                      <span>পাঠান</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <MessageCircle className="w-12 h-12 text-slate-200" />
              <p className="text-sm">বাঁদিকের তালিকা থেকে যেকোনো চ্যাট নির্বাচন করুন।</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
