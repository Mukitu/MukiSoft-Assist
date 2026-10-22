export type UserRole = 'super_admin' | 'admin' | 'worker' | 'user';

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
export type TicketStatus = 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed';

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

export interface OrderReview {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_role: 'customer' | 'admin';
  rating: number; // 1 to 5
  comment: string;
  created_at: string;
}

export interface OrderWorkMessage {
  id: string;
  order_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: 'customer' | 'admin' | 'system';
  message: string;
  attachment_name?: string | null;
  attachment_url?: string | null;
  created_at: string;
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
  assigned_admin_name?: string | null;
  assigned_admin_email?: string | null;
  claimed_at?: string | null;
  completed_at?: string | null;
  customer_review?: OrderReview | null;
  admin_review?: OrderReview | null;
  idempotency_key?: string | null;
  cancellation_reason?: string | null;
  refund_amount?: number | null;
  created_at: string;
  updated_at: string;
  service_title?: string;
  customer_name?: string;
  customer_email?: string;
  service?: ServiceItem;
  customer?: Profile;
  deliverables?: OrderDeliverable[];
  events?: OrderEvent[];
  messages?: OrderWorkMessage[];
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

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'customer' | 'admin' | 'staff' | 'system';
  message: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  is_internal?: boolean;
  created_at: string;
  sender?: Profile;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  order_id?: string | null;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  description?: string;
  attachment_url?: string | null;
  attachment_name?: string | null;
  assigned_to?: string | null;
  reopened_at?: string | null;
  reopen_reason?: string | null;
  created_at: string;
  updated_at: string;
  customer?: Profile;
  assigned_staff?: Profile;
  order?: Order;
  messages?: TicketMessage[];
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string | null;
  category?: 'orders' | 'wallet' | 'support' | 'security' | 'system';
  is_read: boolean;
  created_at: string;
}

export interface UserNotificationPreferences {
  user_id: string;
  orders_email: boolean;
  deposits_email: boolean;
  support_email: boolean;
  marketing_email: boolean;
  security_email: boolean;
  created_at: string;
  updated_at: string;
}

export type EmailTemplateType =
  | 'welcome'
  | 'password_reset'
  | 'order_created'
  | 'order_status'
  | 'deliverable_ready'
  | 'deposit_status'
  | 'refund_processed'
  | 'support_reply'
  | 'system';

export interface EmailOutboxItem {
  id: string;
  event_key?: string | null;
  user_id?: string | null;
  recipient_email: string;
  recipient_name?: string | null;
  subject: string;
  template_type: EmailTemplateType | string;
  category: 'orders' | 'wallet' | 'support' | 'security' | 'system';
  body_html: string;
  body_text?: string | null;
  status: 'queued' | 'sent' | 'failed';
  delivery_channel: 'email' | 'in_app';
  retry_count: number;
  max_retries: number;
  error_message?: string | null;
  sent_at?: string | null;
  created_at: string;
  updated_at: string;
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

export interface CommunicationSettings {
  sender_name: string;
  sender_email: string;
  support_email: string;
  enabled_categories: {
    orders: boolean;
    deposits: boolean;
    support: boolean;
    security: boolean;
    marketing: boolean;
  };
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
  communication?: CommunicationSettings;
}

export type LiveChatStatus = 'ai_mode' | 'waiting_for_agent' | 'agent_connected' | 'closed';
export type LiveChatSender = 'customer' | 'ai' | 'admin' | 'system';

export interface LiveChatRecommendedService {
  id: string;
  title: string;
  title_bn: string;
  slug: string;
  price: number;
  promotional_price?: number | null;
  delivery_days: number;
}

export interface LiveChatMessage {
  id: string;
  session_id: string;
  sender_type: LiveChatSender;
  sender_name: string;
  message: string;
  metadata?: {
    services?: LiveChatRecommendedService[];
    action_url?: string;
    action_label?: string;
  };
  created_at: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'mobile_banking' | 'bank_transfer' | 'other';
  number_or_account: string;
  account_type_label: string;
  instructions: string;
  is_active: boolean;
}

export interface LiveChatSession {
  id: string;
  session_token: string;
  customer_name: string;
  customer_phone: string;
  user_id?: string | null;
  status: LiveChatStatus;
  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  last_message?: string;
  unread_admin_count?: number;
  unread_customer_count?: number;
}

export interface WorkerApplication {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  whatsapp?: string;
  skills: string;
  experience?: string;
  portfolio_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface CommissionSettings {
  id: string;
  worker_commission_percentage: number; // e.g. 80 (%)
  admin_commission_percentage: number;  // e.g. 70 (%)
  updated_at: string;
  updated_by?: string;
}

export interface PayoutAccount {
  user_id: string;
  method: 'bkash' | 'nagad' | 'rocket' | 'bank';
  account_number: string;
  account_name?: string;
  bank_name?: string;
  branch_name?: string;
  updated_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: 'worker' | 'admin';
  amount: number;
  payout_account: PayoutAccount;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface CompanyProfitRecord {
  id: string;
  order_id: string;
  service_title: string;
  total_order_amount: number;
  assigned_id: string;
  assigned_name: string;
  assigned_role: 'worker' | 'admin';
  worker_or_admin_payout: number;
  company_profit_amount: number;
  created_at: string;
}

