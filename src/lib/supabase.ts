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
        { event: 'INSERT', schema: 'public', table: 'order_messages' },
        (payload) => {
          if (typeof window !== 'undefined' && payload.new && payload.new.order_id) {
            window.dispatchEvent(
              new CustomEvent('order_message_sent', {
                detail: { orderId: payload.new.order_id, message: payload.new },
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
