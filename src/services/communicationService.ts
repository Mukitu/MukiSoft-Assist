import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  UserNotificationPreferences,
  EmailOutboxItem,
  EmailTemplateType,
} from '../types/database';
import { renderEmailTemplate, TemplateData } from '../lib/emailTemplates';

const LS_PREFS_KEY = 'mukisoft_notification_prefs_';
const LS_OUTBOX_KEY = 'mukisoft_email_outbox';

const DEFAULT_PREFERENCES: Omit<UserNotificationPreferences, 'user_id' | 'created_at' | 'updated_at'> = {
  orders_email: true,
  deposits_email: true,
  support_email: true,
  marketing_email: false,
  security_email: true,
};

export const communicationService = {
  // -------------------------------------------------------------
  // USER NOTIFICATION PREFERENCES
  // -------------------------------------------------------------
  async getUserPreferences(userId: string): Promise<UserNotificationPreferences> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        return data as UserNotificationPreferences;
      }
    }

    // Local storage fallback
    try {
      const saved = localStorage.getItem(LS_PREFS_KEY + userId);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }

    return {
      user_id: userId,
      ...DEFAULT_PREFERENCES,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  async updateUserPreferences(
    userId: string,
    prefs: Partial<UserNotificationPreferences>
  ): Promise<UserNotificationPreferences> {
    // Security communications cannot be turned off
    const sanitized = {
      ...prefs,
      user_id: userId,
      security_email: true,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert(sanitized)
        .select()
        .single();

      if (!error && data) return data as UserNotificationPreferences;
    }

    // Local storage fallback
    const current = await this.getUserPreferences(userId);
    const updated: UserNotificationPreferences = {
      ...current,
      ...sanitized,
      security_email: true,
    };
    try {
      localStorage.setItem(LS_PREFS_KEY + userId, JSON.stringify(updated));
    } catch {
      // ignore
    }
    return updated;
  },

  // -------------------------------------------------------------
  // NOTIFY + OUTBOX DISPATCH
  // -------------------------------------------------------------
  async notifyAndEmail(params: {
    userId: string;
    recipientEmail?: string;
    recipientName?: string;
    title: string;
    message: string;
    link?: string | null;
    category: 'orders' | 'wallet' | 'support' | 'security' | 'system';
    templateType?: EmailTemplateType;
    templateData?: TemplateData;
    eventKey?: string;
  }): Promise<void> {
    // 1. Always create in-app notification first
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('notifications').insert({
          user_id: params.userId,
          title: params.title,
          message: params.message,
          link: params.link || null,
          category: params.category,
          is_read: false,
        });
      } else {
        const notifs = JSON.parse(localStorage.getItem('mukisoft_demo_notifications') || '[]');
        notifs.unshift({
          id: `notif_${Date.now()}`,
          user_id: params.userId,
          title: params.title,
          message: params.message,
          link: params.link || null,
          category: params.category,
          is_read: false,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('mukisoft_demo_notifications', JSON.stringify(notifs));
      }
    } catch (err) {
      console.warn('In-app notification save error:', err);
    }

    // If no email template or recipient specified, we are done
    if (!params.templateType || !params.recipientEmail) return;

    // 2. Check user email preferences
    try {
      const prefs = await this.getUserPreferences(params.userId);
      if (params.category === 'orders' && !prefs.orders_email) return;
      if (params.category === 'wallet' && !prefs.deposits_email) return;
      if (params.category === 'support' && !prefs.support_email) return;
      if (params.category === 'system' && !prefs.marketing_email && params.templateType === 'welcome') {
        // Welcome is fine, marketing can be skipped
      }
      // Security email is always permitted
    } catch {
      // Continue if preference check fails
    }

    // 3. Render Bengali Email Template
    const templateData: TemplateData = {
      recipientName: params.recipientName,
      recipientEmail: params.recipientEmail,
      actionUrl: params.link ? `${window.location.origin}${params.link}` : window.location.origin,
      ...params.templateData,
    };
    const rendered = renderEmailTemplate(params.templateType, templateData);

    // 4. Duplicate prevention (Idempotency Key Check)
    if (params.eventKey) {
      if (isSupabaseConfigured && supabase) {
        const { data: existing } = await supabase
          .from('email_outbox')
          .select('id, status')
          .eq('event_key', params.eventKey)
          .maybeSingle();

        if (existing) {
          // Already created/processed
          return;
        }
      } else {
        const localOutbox = JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
        if (localOutbox.some((item: EmailOutboxItem) => item.event_key === params.eventKey)) {
          return;
        }
      }
    }

    // 5. Create outbox record
    const outboxRecord: Partial<EmailOutboxItem> = {
      event_key: params.eventKey || null,
      user_id: params.userId,
      recipient_email: params.recipientEmail,
      recipient_name: params.recipientName || null,
      subject: rendered.subject,
      template_type: params.templateType,
      category: params.category,
      body_html: rendered.html,
      body_text: rendered.text,
      status: 'queued',
      delivery_channel: 'email',
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let recordId = `outbox_${Date.now()}`;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: inserted } = await supabase
          .from('email_outbox')
          .insert(outboxRecord)
          .select()
          .single();
        if (inserted) recordId = inserted.id;
      } catch (err) {
        console.warn('Email outbox insert error in DB:', err);
      }
    } else {
      const localOutbox = JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
      const full = { ...outboxRecord, id: recordId } as EmailOutboxItem;
      localOutbox.unshift(full);
      localStorage.setItem(LS_OUTBOX_KEY, JSON.stringify(localOutbox));
    }

    // 6. Attempt immediate server-side dispatch
    try {
      const res = await fetch('/api/email/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: params.recipientEmail,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });

      let dispatchResult: { success?: boolean; error?: string; unconfigured?: boolean } = { success: false, error: 'ডেলিভারি ব্যর্থ' };
      try {
        const text = await res.text();
        if (text) {
          dispatchResult = JSON.parse(text);
        }
      } catch {
        console.warn('Non-JSON response from /api/email/dispatch');
      }

      const isSent = dispatchResult.success === true;

      if (isSupabaseConfigured && supabase && recordId) {
        await supabase
          .from('email_outbox')
          .update({
            status: isSent ? 'sent' : 'failed',
            sent_at: isSent ? new Date().toISOString() : null,
            error_message: isSent ? null : dispatchResult.error || 'ডেলিভারি ব্যর্থ',
            retry_count: isSent ? 0 : 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordId);
      } else {
        const localOutbox = JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
        const idx = localOutbox.findIndex((i: EmailOutboxItem) => i.id === recordId);
        if (idx >= 0) {
          localOutbox[idx].status = isSent ? 'sent' : 'failed';
          localOutbox[idx].sent_at = isSent ? new Date().toISOString() : null;
          localOutbox[idx].error_message = isSent ? null : dispatchResult.error;
          localStorage.setItem(LS_OUTBOX_KEY, JSON.stringify(localOutbox));
        }
      }
    } catch {
      // Network failure sending to dispatch route: leave status as 'queued' for next worker run
    }
  },

  // -------------------------------------------------------------
  // OUTBOX MANAGEMENT FOR ADMINS
  // -------------------------------------------------------------
  async getEmailOutbox(filter?: { status?: string; limit?: number }): Promise<EmailOutboxItem[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase.from('email_outbox').select('*').order('created_at', { ascending: false });
      if (filter?.status && filter.status !== 'all') {
        q = q.eq('status', filter.status);
      }
      if (filter?.limit) {
        q = q.limit(filter.limit);
      }
      const { data, error } = await q;
      if (!error && data) return data as EmailOutboxItem[];
    }

    const local = JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
    if (filter?.status && filter.status !== 'all') {
      return local.filter((item: EmailOutboxItem) => item.status === filter.status);
    }
    return local.slice(0, filter?.limit || 50);
  },

  async retryOutboxItem(id: string): Promise<{ success: boolean; error?: string }> {
    let item: EmailOutboxItem | null = null;

    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('email_outbox').select('*').eq('id', id).single();
      if (data) item = data as EmailOutboxItem;
    } else {
      const local = JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
      item = local.find((i: EmailOutboxItem) => i.id === id) || null;
    }

    if (!item) return { success: false, error: 'আউটবক্স রেকর্ড পাওয়া যায়নি।' };
    if (item.retry_count >= item.max_retries) {
      return { success: false, error: 'সর্বোচ্চ পুনঃচেষ্টার সীমা (৩ বার) অতিক্রম করেছে।' };
    }

    try {
      const res = await fetch('/api/email/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: item.recipient_email,
          subject: item.subject,
          html: item.body_html,
          text: item.body_text,
        }),
      });
      let data: any = { success: false, error: 'ডেলিভারি ব্যর্থ' };
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text);
      } catch {
        // non-JSON
      }
      const isSent = data.success === true;

      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('email_outbox')
          .update({
            status: isSent ? 'sent' : 'failed',
            sent_at: isSent ? new Date().toISOString() : null,
            error_message: isSent ? null : data.error || 'ডেলিভারি ব্যর্থ',
            retry_count: item.retry_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } else {
        const local = JSON.parse(localStorage.getItem(LS_OUTBOX_KEY) || '[]');
        const idx = local.findIndex((i: EmailOutboxItem) => i.id === id);
        if (idx >= 0) {
          local[idx].status = isSent ? 'sent' : 'failed';
          local[idx].sent_at = isSent ? new Date().toISOString() : null;
          local[idx].error_message = isSent ? null : data.error;
          local[idx].retry_count = item.retry_count + 1;
          localStorage.setItem(LS_OUTBOX_KEY, JSON.stringify(local));
        }
      }

      return { success: isSent, error: data.error };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'নেটওয়ার্ক সংযোগ ত্রুটি';
      return { success: false, error: errMsg };
    }
  },

  async getEmailServerStatus(): Promise<{
    configured: boolean;
    provider: string;
    senderName: string;
    senderEmail: string;
    supportEmail: string;
  }> {
    try {
      const res = await fetch('/api/email/status');
      if (res.ok) {
        const text = await res.text();
        if (text) return JSON.parse(text);
      }
    } catch {
      // offline or mock
    }
    return {
      configured: false,
      provider: 'sandbox',
      senderName: 'MukiSoft Assist',
      senderEmail: 'no-reply@mukisoft.com',
      supportEmail: 'support@mukisoft.com',
    };
  },

  async sendTestEmail(
    to: string,
    templateType: EmailTemplateType = 'welcome'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const rendered = renderEmailTemplate(templateType, {
      recipientName: 'পরীক্ষামূলক ব্যবহারকারী',
      recipientEmail: to,
      orderNumber: 'MS-20261016-TEST',
      serviceTitle: 'টেকনিক্যাল ডকুমেন্ট লোকালাইজেশন',
      amount: 2500,
      deliveryDays: 3,
      statusBengali: 'চলমান কাজ',
      statusNote: 'এটি একটি টেস্ট স্ট্যাটাস নোটিফিকেশন।',
      paymentMethod: 'bKash',
      transactionRef: 'TRX-TEST-9921',
      depositStatus: 'approved',
      walletBalance: 7500,
      ticketNumber: 'TKT-9901',
      ticketSubject: 'পেমেন্ট ভেরিফিকেশন টেস্ট',
      replyMessage: 'আমাদের সিস্টেম সফলভাবে টেস্ট মেসেজ হ্যান্ডেল করেছে।',
      responderName: 'MukiSoft সাপোর্ট টিম',
      actionUrl: window.location.origin,
    });

    try {
      const res = await fetch('/api/email/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        }),
      });

      const text = await res.text();
      if (!text) {
        return { success: false, error: 'সার্ভার থেকে কোনো উত্তর পাওয়া যায়নি।' };
      }
      try {
        return JSON.parse(text);
      } catch {
        return { success: false, error: `সার্ভার অপ্রত্যাশিত উত্তর দিয়েছে (স্ট্যাটাস: ${res.status})। Vercel Functions সক্রিয় আছে কি না নিশ্চিত করুন।` };
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'টেস্ট ইমেইল পাঠানো সম্ভব হয়নি';
      return { success: false, error: errMsg };
    }
  },
};
