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
      const channelId = `order-chat-${orderId}`;
      channel = sb
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages',
          },
          (payload) => {
            const raw = (payload.new || payload.old) as any;
            if (raw && isMounted && String(raw.order_id) === String(orderId)) {
              fetchMessages();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_messages',
          },
          (payload) => {
            const raw = (payload.new || payload.old) as any;
            if (raw && isMounted && String(raw.order_id) === String(orderId)) {
              fetchMessages();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_events',
          },
          (payload) => {
            const raw = (payload.new || payload.old) as any;
            if (raw && isMounted && String(raw.order_id) === String(orderId)) {
              fetchMessages();
            }
          }
        )
        .on(
          'broadcast',
          { event: 'new_message' },
          (payload) => {
            if (isMounted) {
              fetchMessages();
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED' && isMounted) {
            fetchMessages();
          }
        });
    }

    // Local custom event listener for immediate same-window or cross-tab updates
    const handleLocalMsg = (e: Event) => {
      const customEvt = e as CustomEvent<{ orderId: string; message: OrderWorkMessage }>;
      if (customEvt.detail && String(customEvt.detail.orderId) === String(orderId) && isMounted) {
        fetchMessages();
      }
    };

    window.addEventListener('order_message_sent', handleLocalMsg);

    // Fast background sync so messages arrive without delay
    const interval = setInterval(() => {
      if (isMounted) {
        fetchMessages();
      }
    }, 2500);

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
