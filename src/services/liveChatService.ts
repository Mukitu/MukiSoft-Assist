import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  LiveChatSession,
  LiveChatMessage,
  LiveChatStatus,
  LiveChatSender,
  LiveChatRecommendedService,
  ServiceItem,
} from '../types/database';
import { api } from './api';

const STORAGE_KEY_SESSIONS = 'mukisoft_livechat_sessions';
const STORAGE_KEY_MESSAGES = 'mukisoft_livechat_messages_';
const BROADCAST_CHANNEL_NAME = 'mukisoft_livechat_realtime';

// ----------------------------------------------------------------------
// ৫০+ কিউয়ার্ড তালিকা (হিউম্যান এজেন্টের সাথে কথা বলার জন্য)
// ----------------------------------------------------------------------
export const HUMAN_HANDOFF_KEYWORDS: string[] = [
  // বাংলা কিউয়ার্ড
  'হিউম্যান', 'মানুষ', 'মানুষের সাথে', 'মানুষের সাথে কথা', 'মানুষের সাথে কথা বলতে চাই',
  'এজেন্ট', 'এজেন্টের সাথে', 'এজেন্ট দরকার', 'এজেন্টের সাথে কথা', 'প্রতিনিধি', 'গ্রাহক সেবা প্রতিনিধি',
  'অফিসার', 'কর্মকর্তা', 'অ্যাডমিন', 'এডমিন', 'এডমিনের সাথে কথা', 'অ্যাডমিনের সাথে কথা',
  'লাইভ চ্যাট', 'লাইভ সাপোর্ট', 'সরাসরি কথা', 'সরাসরি কথা বলতে চাই', 'সরাসরি চ্যাট',
  'কাস্টমার কেয়ার', 'কাস্টমার সাপোর্ট', 'হেল্প লাইন', 'অপারেটর', 'রিয়েল পার্সন', 'প্রকৃত মানুষ',
  'ম্যানুয়াল সাপোর্ট', 'কথা বলতে চাই', 'মানুষ লাগবে', 'টিমের সাথে কথা', 'ম্যানেজার',
  'সাপোর্ট এজেন্ট', 'লাইভ অ্যাসিস্ট্যান্স', 'হেল্প ডেস্ক এজেন্ট', 'সরাসরি এজেন্ট',
  'কাস্টমার অফিসার', 'মানুষের সাথে যোগাযোগ', 'ব্যক্তির সাথে কথা', 'প্রতিনিধির সাথে কথা',
  'ফোন নাম্বার দেন', 'কথা বলুন', 'কল দিন', 'সাপোর্ট দরকার', 'মানুষের সাপোর্ট',
  // ইংরেজি কিউয়ার্ড
  'human', 'human agent', 'talk to human', 'speak to human', 'real person',
  'agent', 'talk to agent', 'need agent', 'connect agent', 'live agent',
  'representative', 'customer representative', 'customer care', 'customer support',
  'admin', 'talk to admin', 'connect admin', 'live support', 'live chat',
  'operator', 'manager', 'specialist', 'helpdesk agent', 'real agent',
  'human support', 'manual support', 'speak to someone', 'talk to someone',
  'real staff', 'support guy', 'real human', 'need help from person',
  // বাংলিশ কিউয়ার্ড
  'manush', 'manush er sathe', 'agent er sathe', 'kotha bolte chai', 'admin er sathe',
  'live kotha', 'real manush', 'manush lagbe', 'agent lagbe', 'sorasori kotha',
  'karon sathe kotha', 'manush dorkar', 'admin dorkar', 'live support dorkar'
];

// ব্রডকাস্ট চ্যানেল ইনিশিয়ালাইজেশন
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch {
    // fallback
  }
}

function notifyUpdate(type: 'session' | 'message' | 'delete_session', data: unknown) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, data, timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mukisoft_chat_event', { detail: { type, data } }));
  }
}

export const liveChatService = {
  /**
   * ৫০+ কিউয়ার্ড দিয়ে পরীক্ষা করে কাস্টমার কোনো মানুষের সাথে কথা বলতে চাচ্ছে কি না
   */
  checkIfNeedsHuman(text: string): boolean {
    if (!text || !text.trim()) return false;
    const lower = text.toLowerCase();
    return HUMAN_HANDOFF_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
  },

  /**
   * নতুন লাইভ চ্যাট সেশন শুরু
   */
  async createSession(customerName: string, customerPhone: string, userId?: string | null): Promise<LiveChatSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sessionToken = `token_${Math.random().toString(36).substring(2, 12)}`;
    const now = new Date().toISOString();

    const newSession: LiveChatSession = {
      id: sessionId,
      session_token: sessionToken,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      user_id: userId || null,
      status: 'ai_mode',
      created_at: now,
      updated_at: now,
      last_message: 'সেশন শুরু হয়েছে',
      unread_admin_count: 0,
      unread_customer_count: 0,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('live_chat_sessions').insert(newSession);
      } catch {
        // Fallback to local
      }
    }

    // Save to local storage
    const allSessions = this.getLocalSessions();
    allSessions.unshift(newSession);
    this.saveLocalSessions(allSessions);

    // Initial AI Welcome Greeting with live context
    const initialAiMessage: LiveChatMessage = {
      id: `msg_${Date.now()}`,
      session_id: sessionId,
      sender_type: 'ai',
      sender_name: 'MukiSoft AI সহকারী',
      message: `আসসালামু আলাইকুম ${customerName}! MukiSoft Assist-এর স্মার্ট AI কনসালট্যান্ট সার্ভিসে আপনাকে স্বাগতম। 🤝\n\nআমাদের প্ল্যাটফর্মে আপনি সকল ধরণের ডিজিটাল সেবা (ওয়েব ডেভেলপমেন্ট, গ্রাফিক ডিজাইন, লিগ্যাল ও ট্রেড লাইসেন্স, চাকরির সিভি তৈরি, ডিজিটাল মার্কেটিং ইত্যাদি) নিশ্চিন্তে নিতে পারবেন।\n\nআপনার কী ধরণের সেবা বা প্রজেক্ট প্রয়োজন? সংক্ষেপে লিখুন। (যেকোনো সময় কোনো কর্মকর্তার সাথে সরাসরি কথা বলতে চাইলে 'এজেন্ট' বা 'মানুষের সাথে কথা' লিখলেই আমি অ্যাডমিনের সাথে কানেক্ট করে দেবো)।`,
      created_at: new Date().toISOString(),
    };

    await this.saveMessage(initialAiMessage);
    notifyUpdate('session', newSession);

    return newSession;
  },

  /**
   * সেশন আইডি দিয়ে সেশন তথ্য সংগ্রহ
   */
  async getSession(sessionId: string): Promise<LiveChatSession | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('live_chat_sessions').select('*').eq('id', sessionId).single();
        if (!error && data) return data as LiveChatSession;
      } catch {
        // fallback
      }
    }

    const all = this.getLocalSessions();
    return all.find((s) => s.id === sessionId) || null;
  },

  /**
   * সেশনের মেসেজসমূহ সংগ্রহ (Supabase + LocalStorage মার্জ)
   */
  async getMessages(sessionId: string): Promise<LiveChatMessage[]> {
    let remoteMsgs: LiveChatMessage[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('live_chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        if (!error && data && data.length > 0) {
          remoteMsgs = data as LiveChatMessage[];
        }
      } catch {
        // fallback
      }
    }

    let localMsgs: LiveChatMessage[] = [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MESSAGES + sessionId);
      localMsgs = raw ? JSON.parse(raw) : [];
    } catch {
      // ignore
    }

    // Map deduplication by ID
    const map = new Map<string, LiveChatMessage>();
    localMsgs.forEach((m) => map.set(m.id, m));
    remoteMsgs.forEach((m) => map.set(m.id, m));

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  },

  /**
   * মেসেজ প্রেরণ ও প্রসেসিং (AI বা হিউম্যান রাউটিং)
   */
  async sendMessage(
    sessionId: string,
    senderType: LiveChatSender,
    senderName: string,
    text: string
  ): Promise<LiveChatMessage> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('চ্যাট সেশন পাওয়া যায়নি।');

    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newMsg: LiveChatMessage = {
      id: msgId,
      session_id: sessionId,
      sender_type: senderType,
      sender_name: senderName,
      message: text,
      created_at: now,
    };

    await this.saveMessage(newMsg);

    // আপডেট সেশন লাস্ট মেসেজ
    session.last_message = text.length > 50 ? text.slice(0, 50) + '...' : text;
    session.updated_at = now;
    // Admins only receive unread counts when user is not in AI mode
    if (senderType === 'customer' && session.status !== 'ai_mode') {
      session.unread_admin_count = (session.unread_admin_count || 0) + 1;
    } else if (senderType === 'admin') {
      session.unread_customer_count = (session.unread_customer_count || 0) + 1;
    }
    await this.updateSession(session);

    // -------------------------------------------------------------
    // যদি কাস্টমার মেসেজ পাঠায় এবং সেশনটি AI মোডে থাকে
    // -------------------------------------------------------------
    if (senderType === 'customer' && session.status === 'ai_mode') {
      // ১. ৫০+ হিউম্যান এজেন্টের কিউয়ার্ড চেক
      if (this.checkIfNeedsHuman(text)) {
        await this.requestHumanAgent(sessionId);
        return newMsg;
      }

      // ২. AI ইন্টেলিজেন্ট কনসালট্যান্ট রেসপন্স তৈরি
      setTimeout(async () => {
        try {
          const aiResponse = await this.generateAiConsultantResponse(text, sessionId);
          const aiMsg: LiveChatMessage = {
            id: `msg_${Date.now()}`,
            session_id: sessionId,
            sender_type: 'ai',
            sender_name: 'MukiSoft AI সহকারী',
            message: aiResponse.reply,
            metadata: {
              services: aiResponse.recommendedServices,
              action_url: aiResponse.actionUrl,
              action_label: aiResponse.actionLabel,
            },
            created_at: new Date().toISOString(),
          };
          await this.saveMessage(aiMsg);
        } catch (err) {
          console.warn('AI Generation fallback:', err);
        }
      }, 500);
    }

    return newMsg;
  },

  /**
   * গ্রাহকের পক্ষ থেকে লাইভ এজেন্টের অনুরোধ (Handoff to Admin)
   */
  async requestHumanAgent(sessionId: string): Promise<LiveChatSession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('চ্যাট সেশন পাওয়া যায়নি।');

    session.status = 'waiting_for_agent';
    session.unread_admin_count = (session.unread_admin_count || 0) + 1;
    session.updated_at = new Date().toISOString();
    session.last_message = 'গ্রাহক লাইভ এজেন্টের জন্য অপেক্ষা করছেন';

    await this.updateSession(session);

    const handoffMsg: LiveChatMessage = {
      id: `msg_${Date.now() + 1}`,
      session_id: sessionId,
      sender_type: 'system',
      sender_name: 'সিস্টেম নোটিফিকেশন',
      message: `🔔 আপনার অনুরোধটি আমাদের লাইভ অ্যাডমিন টিমের কাছে পৌঁছে দেওয়া হয়েছে। আমাদের একজন কাস্টমার সাপোর্ট স্পেশালিস্ট এখনই আপনার সাথে চ্যাটে যুক্ত হচ্ছেন। দয়া করে কিছুক্ষণ অপেক্ষা করুন...`,
      created_at: new Date().toISOString(),
    };
    await this.saveMessage(handoffMsg);
    notifyUpdate('session', session);
    return session;
  },

  /**
   * অ্যাডমিন কর্তৃক চ্যাট গ্রহণ (Multi-Admin Claim System)
   */
  async acceptSession(sessionId: string, adminId: string, adminName: string): Promise<LiveChatSession> {
    const session = await this.getSession(sessionId);
    if (!session) throw new Error('সেশন পাওয়া যায়নি।');

    session.status = 'agent_connected';
    session.assigned_admin_id = adminId;
    session.assigned_admin_name = adminName;
    session.unread_admin_count = 0;
    session.updated_at = new Date().toISOString();

    await this.updateSession(session);

    // কাস্টমারকে জানানোর জন্য সিস্টেম বার্তা
    const systemNotice: LiveChatMessage = {
      id: `msg_${Date.now()}`,
      session_id: sessionId,
      sender_type: 'system',
      sender_name: 'সিস্টেম নোটিফিকেশন',
      message: `✅ অ্যাডমিন "${adminName}" আপনার চ্যাটে যুক্ত হয়েছেন। আপনি এখন ওনার সাথে সরাসরি বাংলায় কথা বলতে পারেন।`,
      created_at: new Date().toISOString(),
    };
    await this.saveMessage(systemNotice);

    notifyUpdate('session', session);
    return session;
  },

  /**
   * চ্যাট সেশন ও সকল মেসেজ সম্পূর্ণ মুছে ফেলা (Supabase + LocalStorage)
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!sessionId) return;

    // ১. সুপাবেস (Supabase) থেকে সম্পূর্ণ ডিলিট
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('live_chat_messages').delete().eq('session_id', sessionId);
        await supabase.from('live_chat_sessions').delete().eq('id', sessionId);
      } catch (err) {
        console.warn('Supabase chat delete error:', err);
      }
    }

    // ২. লোকাল স্টোরেজ থেকে সেশন ও মেসেজ সম্পূর্ণ ডিলিট
    const sessions = this.getLocalSessions().filter((s) => s.id !== sessionId);
    this.saveLocalSessions(sessions);

    try {
      localStorage.removeItem(STORAGE_KEY_MESSAGES + sessionId);
    } catch {
      // ignore
    }

    // ৩. রিয়েল-টাইম ইভেন্ট ব্রডকাস্ট যাতে অ্যাডমিন ও গ্রাহক দুই প্রান্ত থেকেই তাৎক্ষণিক মুছে যায়
    notifyUpdate('delete_session', { id: sessionId });
  },

  /**
   * চ্যাট সমাপ্তকরণ ও হিস্ট্রি সম্পূর্ণ মুছে ফেলা (ইউজার বা অ্যাডমিন)
   */
  async closeSession(sessionId: string, _closedByName?: string): Promise<void> {
    await this.deleteSession(sessionId);
  },

  /**
   * সকল সক্রিয় ও অপেক্ষমান সেশন তালিকা (অ্যাডমিন প্যানেলের জন্য - Supabase + LocalStorage মার্জ)
   */
  async getAllSessions(): Promise<LiveChatSession[]> {
    let remoteSessions: LiveChatSession[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('live_chat_sessions')
          .select('*')
          .order('updated_at', { ascending: false });
        if (!error && data) {
          remoteSessions = data as LiveChatSession[];
        }
      } catch {
        // fallback
      }
    }

    const localSessions = this.getLocalSessions();
    const map = new Map<string, LiveChatSession>();

    localSessions.forEach((s) => map.set(s.id, s));
    remoteSessions.forEach((r) => {
      const existing = map.get(r.id);
      if (!existing) {
        map.set(r.id, r);
      } else {
        const remoteTime = new Date(r.updated_at).getTime();
        const localTime = new Date(existing.updated_at).getTime();
        if (remoteTime >= localTime) {
          map.set(r.id, r);
        } else {
          map.set(r.id, { ...r, ...existing });
        }
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  },

  // -------------------------------------------------------------
  // AI ইন্টেলিজেন্ট কনসালট্যান্ট ও সার্ভিস ম্যাচমেকার ইঞ্জিন
  // -------------------------------------------------------------
  // AI ইন্টেলিজেন্ট কনসালট্যান্ট (GroqCloud / Grok AI ইঞ্জিন)
  // -------------------------------------------------------------
  async generateAiConsultantResponse(
    userQuery: string,
    sessionId?: string
  ): Promise<{ reply: string; recommendedServices?: LiveChatRecommendedService[]; actionUrl?: string; actionLabel?: string }> {
    try {
      const [services, categories] = await Promise.all([api.getServices(), api.getCategories()]);

      let history: LiveChatMessage[] = [];
      if (sessionId) {
        history = await this.getMessages(sessionId);
      }

      const res = await fetch('/api/chat/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuery,
          history,
          services,
          categories,
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        return {
          reply: data.reply,
          recommendedServices: data.recommendedServices || [],
          actionUrl: '/services',
          actionLabel: 'সকল সেবা ক্যাটালগ দেখুন',
        };
      }

      if (data.unconfigured) {
        return {
          reply: 'MukiSoft AI সহকারী সক্রিয় করতে অ্যাডমিন প্ল্যাটফর্ম সেটিংস থেকে API Key কনফিগার করতে হবে। কোনো কর্মকর্তার সাথে সরাসরি কথা বলতে নিচের "লাইভ এজেন্ট ডাকুন" বোতামে চাপ দিন।',
          actionUrl: '/contact',
          actionLabel: 'যোগাযোগ ও সহায়তা',
        };
      }

      return {
        reply: data.reply || 'MukiSoft AI সহকারী থেকে এই মুহূর্তে সাড়া পাওয়া যায়নি। অনুগ্রহ করে আপনার প্রশ্নটি আবার লিখুন অথবা মানুষের সাথে সরাসরি কথা বলতে "লাইভ এজেন্ট ডাকুন" চাপুন।',
      };
    } catch (err: unknown) {
      console.warn('AI call error:', err);
      return {
        reply: 'MukiSoft AI সহকারী থেকে এই মুহূর্তে সাড়া পাওয়া যায়নি। অনুগ্রহ করে আপনার প্রশ্নটি আবার লিখুন অথবা মানুষের সাথে সরাসরি কথা বলতে "লাইভ এজেন্ট ডাকুন" চাপুন।',
      };
    }
  },

  // -------------------------------------------------------------
  // লোকাল স্টোরেজ হেল্পার
  // -------------------------------------------------------------
  getLocalSessions(): LiveChatSession[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveLocalSessions(sessions: LiveChatSession[]) {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessions));
    } catch {
      // ignore
    }
  },

  async updateSession(session: LiveChatSession) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('live_chat_sessions').upsert(session);
      } catch {
        // fallback
      }
    }
    const all = this.getLocalSessions();
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      all[idx] = session;
    } else {
      all.unshift(session);
    }
    this.saveLocalSessions(all);
    notifyUpdate('session', session);
  },

  async saveMessage(msg: LiveChatMessage) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('live_chat_messages').insert(msg);
      } catch {
        // fallback
      }
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_MESSAGES + msg.session_id);
      const list: LiveChatMessage[] = raw ? JSON.parse(raw) : [];
      list.push(msg);
      localStorage.setItem(STORAGE_KEY_MESSAGES + msg.session_id, JSON.stringify(list));
    } catch {
      // ignore
    }
    notifyUpdate('message', msg);
  },

  /**
   * লাইভ আপডেট ইভেন্ট লিসেনার সাবস্ক্রিপশন
   */
  subscribeToUpdates(callback: (event: { type: 'session' | 'message' | 'delete_session'; data: unknown }) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        callback(customEvent.detail);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mukisoft_chat_event', handler);
    }

    const broadcastHandler = (e: MessageEvent) => {
      if (e.data && e.data.type) {
        callback(e.data);
      }
    };

    if (broadcastChannel) {
      broadcastChannel.addEventListener('message', broadcastHandler);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mukisoft_chat_event', handler);
      }
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', broadcastHandler);
      }
    };
  },
};
