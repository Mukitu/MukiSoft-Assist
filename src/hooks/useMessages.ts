import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api } from '../services/api';
import { OrderWorkMessage } from '../types/database';

export function useMessages(orderId: string | null | undefined) {
  const [messages, setMessages] = useState<OrderWorkMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const fetchMessages = useCallback(async () => {
    if (!orderId) {
      setMessages([]);
      return;
    }
    try {
      const data = await api.getOrderMessages(orderId);
      setMessages(data);
    } catch (err) {
      console.warn('useMessages fetch error:', err);
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchMessages().finally(() => {
      if (isMounted) setLoading(false);
    });

    // Supabase Realtime Channel Subscription
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    const sb = supabase;

    if (isSupabaseConfigured && sb) {
      channel = sb
        .channel(`order-messages-channel-${orderId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_messages',
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            const raw = payload.new as any;
            if (raw && isMounted) {
              const formatted: OrderWorkMessage = {
                id: raw.id,
                order_id: raw.order_id,
                sender_id: raw.sender_id,
                receiver_id: raw.receiver_id || null,
                sender_name:
                  raw.sender_name ||
                  (raw.sender_role === 'customer'
                    ? 'গ্রাহক'
                    : raw.sender_role === 'worker'
                    ? 'ওয়ার্কার'
                    : 'অ্যাডমিন'),
                sender_role: raw.sender_role || 'customer',
                message: raw.message_content || raw.message || '',
                message_content: raw.message_content || raw.message || '',
                is_read: raw.is_read ?? false,
                attachment_name: raw.attachment_name || null,
                attachment_url: raw.attachment_url || null,
                created_at: raw.created_at || new Date().toISOString(),
              };
              setMessages((prev) =>
                prev.some((m) => m.id === formatted.id) ? prev : [...prev, formatted]
              );
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_work_messages',
            filter: `order_id=eq.${orderId}`,
          },
          (payload) => {
            const raw = payload.new as OrderWorkMessage;
            if (raw && isMounted) {
              setMessages((prev) => (prev.some((m) => m.id === raw.id) ? prev : [...prev, raw]));
            }
          }
        )
        .subscribe();
    }

    // Local custom event listener for immediate updates
    const handleLocalMsg = (e: Event) => {
      const customEvt = e as CustomEvent<{ orderId: string; message: OrderWorkMessage }>;
      if (customEvt.detail && customEvt.detail.orderId === orderId && isMounted) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === customEvt.detail.message.id)) return prev;
          return [...prev, customEvt.detail.message];
        });
      }
    };

    window.addEventListener('order_message_sent', handleLocalMsg);

    // Periodic refetch
    const interval = setInterval(() => {
      if (isMounted) {
        fetchMessages();
      }
    }, 3500);

    return () => {
      isMounted = false;
      if (sb && channel) sb.removeChannel(channel);
      window.removeEventListener('order_message_sent', handleLocalMsg);
      clearInterval(interval);
    };
  }, [orderId, fetchMessages]);

  const sendMessage = async (
    senderId: string,
    senderName: string,
    senderRole: 'customer' | 'admin' | 'worker',
    message: string,
    attachmentName?: string,
    attachmentUrl?: string
  ) => {
    if (!orderId || !message.trim() || sending) return null;
    setSending(true);
    try {
      const attachmentObj =
        attachmentName || attachmentUrl
          ? { name: attachmentName || 'file', url: attachmentUrl || '' }
          : undefined;
      const newMsg = await api.sendOrderMessage(
        orderId,
        senderId,
        senderName,
        senderRole,
        message,
        attachmentObj
      );
      await fetchMessages();
      return newMsg;
    } catch (err) {
      console.error('Failed to send message via useMessages hook:', err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    refetch: fetchMessages,
  };
}
