export type UserRole = 'super_admin' | 'admin' | 'user';

export type TransactionType = 'deposit' | 'service_purchase' | 'refund' | 'admin_adjustment';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type DepositStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type OrderStatus =
  | 'pending_requirements'
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'needs_information'
  | 'review'
  | 'in_review'
  | 'revision_requested'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'refunded';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: UserRole;
  preferred_language: 'en' | 'bn';
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  name_bn: string;
  slug: string;
  description: string;
  description_bn: string;
  icon: string;
  display_order: number;
  is_active: boolean;
  cover_image?: string | null;
  created_at?: string;
}

export interface ServiceItem {
  id: string;
  category_id: string;
  title: string;
  title_bn: string;
  slug: string;
  description: string;
  description_bn: string;
  price: number;
  promotional_price?: number | null;
  delivery_days: number;
  requirements?: string | null;
  revision_policy?: string | null;
  is_active: boolean;
  is_featured: boolean;
  thumbnail?: string | null;
  is_gov_service: boolean;
  gov_fee_notice?: string | null;
  gov_official_link?: string | null;
  created_at?: string;
  updated_at?: string;
  category?: ServiceCategory;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  pending_balance: number;
  total_deposited: number;
  total_spent: number;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  status: TransactionStatus;
  reference_id?: string | null;
  reference_type?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DepositRequest {
  id: string;
  deposit_reference?: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  sender_account: string;
  transaction_reference: string;
  slip_url?: string | null;
  status: DepositStatus;
  admin_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  profile?: Profile;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  service_id: string;
  amount: number;
  status: OrderStatus;
  requirements_submitted?: string | null;
  reference_link?: string | null;
  attachment_name?: string | null;
  attachment_url?: string | null;
  notes?: string | null;
  assigned_admin?: string | null;
  idempotency_key?: string | null;
  cancellation_reason?: string | null;
  refund_amount?: number | null;
  created_at: string;
  updated_at: string;
  service?: ServiceItem;
  customer?: Profile;
  deliverables?: OrderDeliverable[];
  events?: OrderEvent[];
}

export interface OrderEvent {
  id: string;
  order_id: string;
  actor_id: string;
  event_type: string;
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface OrderDeliverable {
  id: string;
  order_id: string;
  title: string;
  file_url: string;
  file_size?: number | null;
  file_type?: string | null;
  deliverable_notes?: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Profile;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
  actor?: Profile;
}

export interface PaymentMethodItem {
  id: string;
  name: string;
  name_bn: string;
  account_number: string;
  account_name?: string;
  bank_name?: string;
  branch_name?: string;
  routing?: string;
  type: 'merchant' | 'personal' | 'bank';
  instructions_bn: string;
  min_deposit: number;
  max_deposit: number;
  is_active: boolean;
  verification_time_note_bn?: string;
}

export interface PlatformSettings {
  general: {
    platform_name: string;
    parent_company: string;
    support_email: string;
    support_phone: string;
    currency: string;
    currency_symbol: string;
  };
  payment_methods: Record<string, PaymentMethodItem>;
}
