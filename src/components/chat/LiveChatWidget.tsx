import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  X,
  Send,
  User,
  Bot,
  ShieldCheck,
  Headphones,
  Sparkles,
  Phone,
  ArrowRight,
  ExternalLink,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { liveChatService } from '../../services/liveChatService';
import { LiveChatSession, LiveChatMessage } from '../../types/database';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits } from '../../lib/i18n';

interface LiveChatWidgetProps {
  onNavigate: (path: string) => void;
}

const SESSION_STORAGE_KEY = 'mukisoft_active_chat_session_id';

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({ onNavigate }) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  if (currentPath.startsWith('/admin') || currentPath.startsWith('/dashboard/orders/')) {
    return null;
  }

  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<LiveChatSession | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);

  // অনবোর্ডিং ফর্ম স্টেট
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [startingSession, setStartingSession] = useState(false);

  // অপঠিত মেসেজ কাউন্ট
  const [hasUnread, setHasUnread] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // অটো-স্ক্রোল টু বটম (শুধুমাত্র ইনটেনাল চ্যাট স্ক্রল)
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const prevLiveMsgCountRef = useRef(0);
  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      if (messages.length > prevLiveMsgCountRef.current || prevLiveMsgCountRef.current === 0) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
    prevLiveMsgCountRef.current = messages.length;
  }, [messages, isOpen]);

  // প্রাক-পূরণ যদি ইউজার ইতিমধ্যে লগইন করা থাকে
  useEffect(() => {
    if (profile?.full_name && !name) {
      setName(profile.full_name);
    }
    if (profile?.phone && !phone) {
      setPhone(profile.phone);
    }
  }, [profile, name, phone]);

  // সেশন রিস্টোর ও পোলিং সিঙ্ক
  useEffect(() => {
    const savedSessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSessionId) {
      liveChatService.getSession(savedSessionId).then((s) => {
        if (s && s.status !== 'closed') {
          setSession(s);
          liveChatService.getMessages(s.id).then(setMessages);
        } else {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      });
    }

    const interval = setInterval(() => {
      const activeId = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (activeId) {
        liveChatService.getSession(activeId).then((s) => {
          if (s && s.status !== 'closed') {
            setSession(s);
            liveChatService.getMessages(s.id).then(setMessages);
          }
        });
      }
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  // রিয়েল-টাইম ইভেন্ট সাবস্ক্রিপশন
  useEffect(() => {
    const unsubscribe = liveChatService.subscribeToUpdates((event) => {
      if (event.type === 'delete_session') {
        const deleted = event.data as { id: string };
        if (session && deleted.id === session.id) {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
          setSession(null);
          setMessages([]);
        }
      } else if (event.type === 'message') {
        const msg = event.data as LiveChatMessage;
        if (session && msg.session_id === session.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (!isOpen && msg.sender_type !== 'customer') {
            setHasUnread(true);
          }
        }
      } else if (event.type === 'session') {
        const updated = event.data as LiveChatSession;
        if (session && updated.id === session.id) {
          setSession(updated);
        }
      }
    });

    return () => unsubscribe();
  }, [session, isOpen]);

  // অনবোর্ডিং সাবমিট
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // বিডি ফোন নাম্বার ভ্যালিডেশন
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      setPhoneError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: 017xxxxxxxx)');
      return;
    }
    setPhoneError('');
    setStartingSession(true);

    try {
      const newSession = await liveChatService.createSession(name.trim(), cleanPhone, user?.id || null);
      setSession(newSession);
      sessionStorage.setItem(SESSION_STORAGE_KEY, newSession.id);
      const msgs = await liveChatService.getMessages(newSession.id);
      setMessages(msgs);
    } catch {
      // error handling
    } finally {
      setStartingSession(false);
    }
  };

  // মেসেজ সেন্ড
  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || inputText;
    if (!content.trim() || !session || sending) return;

    setInputText('');
    setSending(true);

    try {
      const senderName = session.customer_name || 'গ্রাহক';
      await liveChatService.sendMessage(session.id, 'customer', senderName, content.trim());
    } catch {
      // handle error
    } finally {
      setSending(false);
    }
  };

  // কুইক চিপ ক্লিক
  const handleQuickChip = (chipText: string) => {
    handleSendMessage(chipText);
  };

  // চ্যাট সমাপ্তি ও সম্পূর্ণ মুছে ফেলা
  const handleCloseChat = async () => {
    if (!session) return;
    const targetId = session.id;
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
    setMessages([]);
    await liveChatService.deleteSession(targetId);
  };

  return (
    <>
      {/* ফ্লোটিং চ্যাট লঞ্চার বোতাম */}
      <div
        className={`fixed transition-all duration-300 right-4 sm:right-6 z-30 ${
          typeof window !== 'undefined' && window.location.pathname.includes('/orders')
            ? 'bottom-28 sm:bottom-24'
            : 'bottom-20 sm:bottom-6'
        }`}
      >
        {!isOpen && (
          <button
            onClick={() => {
              setIsOpen(true);
              setHasUnread(false);
            }}
            className="group relative flex items-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white pl-3.5 pr-4 sm:pl-4 sm:pr-5 py-2.5 sm:py-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 border border-slate-700/60"
            aria-label="লাইভ চ্যাট ওপেন করুন"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5 text-indigo-400 group-hover:rotate-6 transition-transform" />
              {hasUnread && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              )}
            </div>
            <div className="text-left">
              <span className="text-[11px] sm:text-xs font-bold block leading-none">লাইভ সাপোর্ট ও AI চ্যাট</span>
              <span className="text-[9px] sm:text-[10px] text-slate-300 font-medium block mt-0.5">সহযোগিতার জন্য ক্লিক করুন</span>
            </div>
          </button>
        )}
      </div>

      {/* চ্যাট উইন্ডো ডায়ালগ */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[94vw] sm:w-[410px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* হেডার */}
          <div className="bg-slate-900 text-white px-4 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  {session?.status === 'agent_connected' ? (
                    <Headphones className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Bot className="w-5 h-5 text-indigo-300" />
                  )}
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                    session?.status === 'agent_connected'
                      ? 'bg-emerald-500'
                      : session?.status === 'waiting_for_agent'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-indigo-400'
                  }`}
                />
              </div>

              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  {session?.status === 'agent_connected'
                    ? session.assigned_admin_name || 'লাইভ এজেন্ট'
                    : 'MukiSoft AI সহকারী'}
                  {session?.status === 'agent_connected' && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                      লাইভ
                    </span>
                  )}
                </h3>
                <span className="text-[11px] text-slate-300 block">
                  {session?.status === 'agent_connected'
                    ? 'কর্মকর্তার সাথে সরাসরি যুক্ত আছেন'
                    : session?.status === 'waiting_for_agent'
                    ? 'এজেন্ট কল করা হচ্ছে...'
                    : 'স্মার্ট সার্ভিস কনসালট্যান্ট'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {session && (
                <button
                  onClick={handleCloseChat}
                  title="চ্যাট সেশন শেষ ও সম্পূর্ণ ডিলিট করুন"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg text-[11px] flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">রিসেট</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="চ্যাট বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* বডি অংশ: অনবোর্ডিং বনাম মেসেজ ফিড */}
          {!session ? (
            /* অনবোর্ডিং ফর্ম */
            <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto bg-slate-50">
              <div className="space-y-4">
                <div className="text-center space-y-1.5 pt-2">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-base text-slate-900">স্বাগতম MukiSoft Assist-এ!</h4>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-xs mx-auto">
                    আপনার যেকোনো প্রশ্ন বা সার্ভিসের চাহিদায় আমাদের AI কনসালট্যান্ট ও লাইভ সাপোর্ট টিম পাশে রয়েছে।
                  </p>
                </div>

                <form onSubmit={handleStartChat} className="space-y-3.5 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      আপনার নাম <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="আপনার পূর্ণ নাম লিখুন"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-indigo-600 shadow-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      মোবাইল নম্বর <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder="017xxxxxxxx"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (phoneError) setPhoneError('');
                        }}
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:border-indigo-600 shadow-xs"
                      />
                    </div>
                    {phoneError && <span className="text-[11px] text-rose-500 mt-1 block">{phoneError}</span>}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={startingSession}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {startingSession ? 'চ্যাট প্রস্তুত হচ্ছে...' : 'চ্যাট শুরু করুন'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>

              <div className="pt-4 border-t border-slate-200 text-center">
                <span className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  ১০০% গোপনীয় ও নিরাপদ কথোপকথন
                </span>
              </div>
            </div>
          ) : (
            /* সক্রিয় মেসেজ স্ক্রিন */
            <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50/50">
              {/* মেসেজ তালিকা */}
              <div ref={messagesContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
                {messages.map((msg) => {
                  const isCustomer = msg.sender_type === 'customer';
                  const isSystem = msg.sender_type === 'system';
                  const isAi = msg.sender_type === 'ai';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="text-center my-2">
                        <span className="inline-block bg-slate-200/80 text-slate-700 text-[11px] px-3 py-1 rounded-full font-medium shadow-2xs max-w-xs">
                          {msg.message}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isCustomer ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isCustomer && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-[11px] font-bold mt-0.5">
                          {isAi ? <Bot className="w-4 h-4 text-indigo-600" /> : <Headphones className="w-4 h-4 text-emerald-600" />}
                        </div>
                      )}

                      <div className={`max-w-[82%] space-y-1.5`}>
                        <div
                          className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                            isCustomer
                              ? 'bg-slate-900 text-white rounded-br-xs'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-xs shadow-xs'
                          }`}
                        >
                          {msg.message}
                        </div>

                        {/* রিকমেন্ডেড সার্ভিস কার্ডসমূহ (AI ম্যাচিং কার্ড) */}
                        {msg.metadata?.services && msg.metadata.services.length > 0 && (
                          <div className="space-y-2 pt-1">
                            {msg.metadata.services.map((srv) => (
                              <div
                                key={srv.id}
                                className="bg-white border border-indigo-100 hover:border-indigo-300 rounded-xl p-3 shadow-xs space-y-1.5 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <h5 className="font-bold text-slate-900 text-[11px] leading-tight">
                                    {srv.title_bn || srv.title}
                                  </h5>
                                  <span className="text-indigo-600 font-mono font-bold shrink-0 text-xs">
                                    {toBengaliCurrency(srv.promotional_price || srv.price)}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    ডেলিভারি: {toBengaliDigits(srv.delivery_days)} দিন
                                  </span>
                                  <button
                                    onClick={() => {
                                      setIsOpen(false);
                                      onNavigate(`/service/${srv.slug}`);
                                    }}
                                    className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                  >
                                    <span>সার্ভিসটি দেখুন</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* অ্যাকশন বাটন */}
                        {msg.metadata?.action_url && (
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              onNavigate(msg.metadata!.action_url!);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            <span>{msg.metadata.action_label || 'বিস্তারিত দেখুন'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        <span className="text-[10px] text-slate-400 block px-1">
                          {new Date(msg.created_at).toLocaleTimeString('bn-BD', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* অপশন বাটন: লাইভ এজেন্ট হ্যান্ডঅফ (যখন এআই মোডে থাকে) */}
              {session.status === 'ai_mode' && (
                <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>MukiSoft AI সহকারী সক্রিয়</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (session) {
                        await liveChatService.requestHumanAgent(session.id);
                      }
                    }}
                    className="px-3 py-1 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                  >
                    <Headphones className="w-3.5 h-3.5 text-amber-600" />
                    <span>লাইভ এজেন্ট ডাকুন</span>
                  </button>
                </div>
              )}

              {/* ইনপুট বার */}
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={
                      session.status === 'agent_connected'
                        ? 'অ্যাডমিনের সাথে সরাসরি কথা বলুন...'
                        : session.status === 'waiting_for_agent'
                        ? 'এজেন্ট কল করা হয়েছে... অনুগ্রহ করে অপেক্ষা করুন'
                        : 'MukiSoft AI সহকারীকে আপনার প্রয়োজন জানান...'
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 py-2 px-3.5 bg-slate-100 border border-transparent focus:border-slate-300 focus:bg-white rounded-xl text-xs focus:outline-hidden transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors disabled:opacity-40 shadow-xs"
                    aria-label="বার্তা পাঠান"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
