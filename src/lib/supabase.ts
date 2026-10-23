import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseUrl.startsWith('https://')
);

export const supabaseConfigDetails = {
  url: supabaseUrl || null,
  hasKey: Boolean(supabaseAnonKey && supabaseAnonKey !== 'your-anon-key-here'),
  isConfigured: isSupabaseConfigured,
};

// Safe client instantiation
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Initialize Supabase Realtime subscriptions if configured
if (isSupabaseConfigured && supabase) {
  try {
    supabase
      .channel('schema-db-realtime-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('orders_updated', { detail: payload }));
            if (payload.eventType === 'UPDATE' && payload.new && payload.new.id) {
              window.dispatchEvent(
                new CustomEvent('order_claimed', {
                  detail: { orderId: payload.new.id, order: payload.new },
                })
              );
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const raw = (payload.new || payload.old) as any;
          if (typeof window !== 'undefined' && raw && raw.order_id) {
            const formatted = {
              id: String(raw.id),
              order_id: String(raw.order_id),
              sender_id: String(raw.sender_id),
              receiver_id: raw.receiver_id ? String(raw.receiver_id) : null,
              sender_name: raw.sender_name || (raw.sender_role === 'customer' ? 'গ্রাহক' : 'অ্যাডমিন'),
              sender_role: raw.sender_role || 'customer',
              message: raw.message || raw.message_content || '',
              message_content: raw.message || raw.message_content || '',
              attachment_name: raw.attachment_name || null,
              attachment_url: raw.attachment_url || null,
              created_at: raw.created_at || new Date().toISOString(),
            };
            window.dispatchEvent(
              new CustomEvent('order_message_sent', {
                detail: { orderId: raw.order_id, message: formatted },
              })
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_messages' },
        (payload) => {
          const raw = (payload.new || payload.old) as any;
          if (typeof window !== 'undefined' && raw && raw.order_id) {
            const formatted = {
              id: String(raw.id),
              order_id: String(raw.order_id),
              sender_id: String(raw.sender_id),
              receiver_id: raw.receiver_id ? String(raw.receiver_id) : null,
              sender_name: raw.sender_name || (raw.sender_role === 'customer' ? 'গ্রাহক' : 'অ্যাডমিন'),
              sender_role: raw.sender_role || 'customer',
              message: raw.message_content || raw.message || '',
              message_content: raw.message_content || raw.message || '',
              attachment_name: raw.attachment_name || null,
              attachment_url: raw.attachment_url || null,
              created_at: raw.created_at || new Date().toISOString(),
            };
            window.dispatchEvent(
              new CustomEvent('order_message_sent', {
                detail: { orderId: raw.order_id, message: formatted },
              })
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_events' },
        (payload) => {
          const raw = (payload.new || payload.old) as any;
          if (typeof window !== 'undefined' && raw && raw.order_id && raw.event_type === 'ORDER_CHAT_MESSAGE') {
            const meta = raw.metadata || {};
            const formatted = {
              id: String(meta.id || raw.id),
              order_id: String(raw.order_id),
              sender_id: String(raw.actor_id || meta.sender_id),
              receiver_id: meta.receiver_id ? String(meta.receiver_id) : null,
              sender_name: meta.sender_name || 'বার্তাপ্রেরক',
              sender_role: meta.sender_role || 'customer',
              message: raw.message || meta.message || '',
              message_content: raw.message || meta.message || '',
              attachment_name: meta.attachment_name || null,
              attachment_url: meta.attachment_url || null,
              created_at: raw.created_at || new Date().toISOString(),
            };
            window.dispatchEvent(
              new CustomEvent('order_message_sent', {
                detail: { orderId: raw.order_id, message: formatted },
              })
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deposit_requests' },
        (payload) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('deposit_requests_updated', { detail: payload }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallets' },
        (payload) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('wallet_updated', { detail: payload }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'company_profit_records' },
        (payload) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('company_profit_updated', { detail: payload }));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'withdrawal_requests' },
        (payload) => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('wallet_updated', { detail: payload }));
            window.dispatchEvent(new CustomEvent('withdrawal_requests_updated', { detail: payload }));
          }
        }
      )
      .subscribe();
  } catch (err) {
    console.warn('Supabase Realtime subscription error:', err);
  }
}

/**
 * Checks live connection with Supabase database.
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      message: 'Supabase environment variables (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY) are not set.',
    };
  }

  try {
    const { error } = await supabase.from('service_categories').select('id').limit(1);
    if (error) {
      return {
        ok: false,
        message: `Connected to Supabase, but query failed: ${error.message}. Ensure you have run supabase/schema.sql in the SQL Editor.`,
      };
    }
    return {
      ok: true,
      message: 'Successfully connected to Supabase PostgreSQL database.',
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      message: `Failed to connect to Supabase: ${errorMsg}`,
    };
  }
}
