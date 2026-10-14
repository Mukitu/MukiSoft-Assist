import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Profile,
  ServiceCategory,
  ServiceItem,
  Wallet,
  WalletTransaction,
  DepositRequest,
  Order,
  OrderDeliverable,
  SupportTicket,
  AuditLog,
  PlatformSettings,
  UserRole,
  OrderStatus,
} from '../types/database';
import { INITIAL_CATEGORIES, INITIAL_SERVICES, INITIAL_PLATFORM_SETTINGS } from '../data/initialCatalog';

// Local storage keys for fallback demo mode
const LS_PREFIX = 'mukisoft_demo_';
const getLS = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
};
const setLS = <T>(key: string, val: T): void => {
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify(val));
  } catch {
    // quota exceeded or SSR
  }
};

export const api = {
  // -------------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------------
  async getCategories(): Promise<ServiceCategory[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data && data.length > 0) return data as ServiceCategory[];
    }
    return getLS<ServiceCategory[]>('categories', INITIAL_CATEGORIES);
  },

  async getCategoryBySlug(slug: string): Promise<ServiceCategory | null> {
    const categories = await this.getCategories();
    return categories.find((c) => c.slug === slug) || null;
  },

  // -------------------------------------------------------------
  // SERVICES
  // -------------------------------------------------------------
  async getServices(categoryId?: string): Promise<ServiceItem[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('services').select('*, category:service_categories(*)');
      if (categoryId) query = query.eq('category_id', categoryId);
      const { data, error } = await query;
      if (!error && data && data.length > 0) return data as ServiceItem[];
    }
    const local = getLS<ServiceItem[]>('services', INITIAL_SERVICES);
    const categories = await this.getCategories();
    const enriched = local.map((s) => ({
      ...s,
      category: categories.find((c) => c.id === s.category_id),
    }));
    if (categoryId) {
      return enriched.filter((s) => s.category_id === categoryId);
    }
    return enriched;
  },

  async getFeaturedServices(): Promise<ServiceItem[]> {
    const all = await this.getServices();
    return all.filter((s) => s.is_featured && s.is_active);
  },

  async getServiceBySlug(slug: string): Promise<ServiceItem | null> {
    const all = await this.getServices();
    return all.find((s) => s.slug === slug) || null;
  },

  async getServiceById(id: string): Promise<ServiceItem | null> {
    const all = await this.getServices();
    return all.find((s) => s.id === id) || null;
  },

  async createOrUpdateService(service: Partial<ServiceItem>): Promise<ServiceItem> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('services').upsert(service).select().single();
      if (!error && data) return data as ServiceItem;
    }
    const current = getLS<ServiceItem[]>('services', INITIAL_SERVICES);
    const index = current.findIndex((s) => s.id === service.id);
    let updated: ServiceItem;
    if (index >= 0) {
      updated = { ...current[index], ...service, updated_at: new Date().toISOString() } as ServiceItem;
      current[index] = updated;
    } else {
      updated = {
        id: service.id || `service_${Date.now()}`,
        category_id: service.category_id || INITIAL_CATEGORIES[0].id,
        title: service.title || 'Untitled Service',
        title_bn: service.title_bn || 'সেবা',
        slug: service.slug || `service-${Date.now()}`,
        description: service.description || '',
        description_bn: service.description_bn || '',
        price: service.price || 1000,
        promotional_price: service.promotional_price || null,
        delivery_days: service.delivery_days || 3,
        is_active: service.is_active ?? true,
        is_featured: service.is_featured ?? false,
        is_gov_service: service.is_gov_service ?? false,
        requirements: service.requirements || '',
        revision_policy: service.revision_policy || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      current.push(updated);
    }
    setLS('services', current);
    return updated;
  },

  // -------------------------------------------------------------
  // WALLET & TRANSACTIONS
  // -------------------------------------------------------------
  async getWallet(userId: string): Promise<Wallet> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
      if (!error && data) return data as Wallet;
    }
    const wallets = getLS<Record<string, Wallet>>('wallets', {});
    if (!wallets[userId]) {
      wallets[userId] = {
        id: `wallet_${userId}`,
        user_id: userId,
        balance: 5000.0, // Initial demo starting credit for seamless evaluation
        pending_balance: 0.0,
        total_deposited: 5000.0,
        total_spent: 0.0,
        updated_at: new Date().toISOString(),
      };
      setLS('wallets', wallets);
    }
    return wallets[userId];
  },

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as WalletTransaction[];
    }
    const all = getLS<WalletTransaction[]>('transactions', [
      {
        id: 'tx_seed_1',
        wallet_id: `wallet_${userId}`,
        user_id: userId,
        type: 'deposit',
        amount: 5000,
        balance_after: 5000,
        status: 'completed',
        reference_id: 'DEP-INIT-001',
        reference_type: 'deposit_request',
        description: 'Welcome promotional deposit credited to wallet',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ]);
    return all.filter((t) => t.user_id === userId);
  },

  // -------------------------------------------------------------
  // DEPOSITS
  // -------------------------------------------------------------
  async submitDepositRequest(request: {
    userId: string;
    amount: number;
    paymentMethod: string;
    senderAccount: string;
    transactionReference: string;
    slipUrl?: string;
  }): Promise<DepositRequest> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('deposit_requests')
        .insert({
          user_id: request.userId,
          amount: request.amount,
          payment_method: request.paymentMethod,
          sender_account: request.senderAccount,
          transaction_reference: request.transactionReference,
          slip_url: request.slipUrl,
          status: 'pending',
        })
        .select()
        .single();
      if (!error && data) return data as DepositRequest;
      throw new Error(error?.message || 'Deposit submission failed');
    }

    const current = getLS<DepositRequest[]>('deposit_requests', []);
    const newReq: DepositRequest = {
      id: `dep_${Date.now()}`,
      user_id: request.userId,
      amount: request.amount,
      currency: 'BDT',
      payment_method: request.paymentMethod,
      sender_account: request.senderAccount,
      transaction_reference: request.transactionReference,
      slip_url: request.slipUrl || null,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    current.unshift(newReq);
    setLS('deposit_requests', current);
    return newReq;
  },

  async getAllDepositRequests(): Promise<DepositRequest[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('deposit_requests')
        .select('*, profile:profiles(*)')
        .order('created_at', { ascending: false });
      if (!error && data) return data as DepositRequest[];
    }
    return getLS<DepositRequest[]>('deposit_requests', []);
  },

  async approveDeposit(depositId: string, adminId: string, adminNotes?: string): Promise<{ success: boolean; newBalance: number }> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('approve_deposit_request', {
        p_deposit_id: depositId,
        p_admin_notes: adminNotes || null,
      });
      if (error) throw new Error(error.message);
      return { success: true, newBalance: data.new_balance };
    }

    // Local state fallback implementation
    const requests = getLS<DepositRequest[]>('deposit_requests', []);
    const target = requests.find((r) => r.id === depositId);
    if (!target) throw new Error('Deposit request not found');
    if (target.status !== 'pending') throw new Error(`Deposit already ${target.status}`);

    target.status = 'approved';
    target.reviewed_by = adminId;
    target.reviewed_at = new Date().toISOString();
    target.admin_notes = adminNotes || 'Approved by administrator';
    setLS('deposit_requests', requests);

    // Credit wallet
    const wallets = getLS<Record<string, Wallet>>('wallets', {});
    const wallet = wallets[target.user_id] || {
      id: `wallet_${target.user_id}`,
      user_id: target.user_id,
      balance: 0,
      pending_balance: 0,
      total_deposited: 0,
      total_spent: 0,
      updated_at: new Date().toISOString(),
    };

    wallet.balance += target.amount;
    wallet.total_deposited += target.amount;
    wallet.updated_at = new Date().toISOString();
    wallets[target.user_id] = wallet;
    setLS('wallets', wallets);

    // Add immutable ledger entry
    const txs = getLS<WalletTransaction[]>('transactions', []);
    txs.unshift({
      id: `tx_${Date.now()}`,
      wallet_id: wallet.id,
      user_id: target.user_id,
      type: 'deposit',
      amount: target.amount,
      balance_after: wallet.balance,
      status: 'completed',
      reference_id: target.id,
      reference_type: 'deposit_request',
      description: `Approved deposit via ${target.payment_method} (${target.transaction_reference})`,
      created_at: new Date().toISOString(),
    });
    setLS('transactions', txs);

    // Add audit log
    const auditLogs = getLS<AuditLog[]>('audit_logs', []);
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: adminId,
      action: 'APPROVE_DEPOSIT',
      target_type: 'deposit_requests',
      target_id: depositId,
      details: { amount: target.amount, user_id: target.user_id, new_balance: wallet.balance },
      created_at: new Date().toISOString(),
    });
    setLS('audit_logs', auditLogs);

    return { success: true, newBalance: wallet.balance };
  },

  async rejectDeposit(depositId: string, adminId: string, adminNotes: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('deposit_requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', depositId);
      if (error) throw new Error(error.message);
      return true;
    }

    const requests = getLS<DepositRequest[]>('deposit_requests', []);
    const target = requests.find((r) => r.id === depositId);
    if (!target) throw new Error('Deposit request not found');
    target.status = 'rejected';
    target.reviewed_by = adminId;
    target.reviewed_at = new Date().toISOString();
    target.admin_notes = adminNotes;
    setLS('deposit_requests', requests);
    return true;
  },

  // -------------------------------------------------------------
  // ORDERS
  // -------------------------------------------------------------
  async purchaseService(
    serviceId: string,
    userId: string,
    requirementsText: string,
    referenceLink?: string,
    attachmentName?: string,
    attachmentUrl?: string
  ): Promise<{ success: boolean; orderId: string; orderNumber: string; remainingBalance: number }> {
    const idempotencyKey = `order_${userId}_${serviceId}_${Date.now()}`;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('purchase_service_with_wallet', {
        p_service_id: serviceId,
        p_requirements_text: requirementsText,
        p_reference_link: referenceLink || null,
        p_attachment_name: attachmentName || null,
        p_attachment_url: attachmentUrl || null,
        p_idempotency_key: idempotencyKey,
      });
      if (error) throw new Error(error.message);
      return {
        success: true,
        orderId: data.order_id,
        orderNumber: data.order_number,
        remainingBalance: data.remaining_balance,
      };
    }

    // Local fallback
    const service = await this.getServiceById(serviceId);
    if (!service) throw new Error('অনুরোধকৃত সেবাটি ক্যাটালগে পাওয়া যায়নি।');
    if (!service.is_active) throw new Error('এই সেবাটি বর্তমানে সাময়িকভাবে বন্ধ রয়েছে।');

    const finalPrice = service.promotional_price ?? service.price;
    const wallet = await this.getWallet(userId);
    if (wallet.balance < finalPrice) {
      throw new Error(`পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই। আপনার বর্তমান ব্যালেন্স ৳ ${wallet.balance}, কিন্তু প্রয়োজনীয় মূল্য ৳ ${finalPrice}। দয়া করে আগে ওয়ালেটে টাকা জমা দিন।`);
    }

    const orderNumber = `MS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const orderId = `order_${Date.now()}`;

    // Debit wallet atomically
    const wallets = getLS<Record<string, Wallet>>('wallets', {});
    wallet.balance -= finalPrice;
    wallet.total_spent += finalPrice;
    wallet.updated_at = new Date().toISOString();
    wallets[userId] = wallet;
    setLS('wallets', wallets);

    // Add immutable ledger entry
    const txs = getLS<WalletTransaction[]>('transactions', []);
    txs.unshift({
      id: `tx_${Date.now()}`,
      wallet_id: wallet.id,
      user_id: userId,
      type: 'service_purchase',
      amount: -finalPrice,
      balance_after: wallet.balance,
      status: 'completed',
      reference_id: orderId,
      reference_type: 'order',
      description: `সেবা ক্রয়: ${service.title_bn || service.title} (অর্ডার #${orderNumber})`,
      metadata: { order_number: orderNumber, service_title: service.title_bn || service.title },
      created_at: new Date().toISOString(),
    });
    setLS('transactions', txs);

    // Create order with requirements and attachments
    const orders = getLS<Order[]>('orders', []);
    const newOrder: Order = {
      id: orderId,
      order_number: orderNumber,
      user_id: userId,
      service_id: serviceId,
      amount: finalPrice,
      status: 'accepted',
      requirements_submitted: requirementsText,
      reference_link: referenceLink || null,
      attachment_name: attachmentName || null,
      attachment_url: attachmentUrl || null,
      idempotency_key: idempotencyKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      service,
      deliverables: [],
      events: [
        {
          id: `event_${Date.now()}`,
          order_id: orderId,
          actor_id: userId,
          event_type: 'ORDER_CREATED',
          message: 'অর্ডার গ্রহণ সম্পন্ন হয়েছে এবং ওয়ালেট এসক্রো থেকে ৳ ' + finalPrice + ' পরিশোধ করা হয়েছে।',
          created_at: new Date().toISOString(),
        },
      ],
    };
    orders.unshift(newOrder);
    setLS('orders', orders);

    return {
      success: true,
      orderId,
      orderNumber,
      remainingBalance: wallet.balance,
    };
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, service:services(*), deliverables:order_deliverables(*), events:order_events(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as Order[];
    }
    const orders = getLS<Order[]>('orders', []);
    return orders.filter((o) => o.user_id === userId);
  },

  async getAllOrders(): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, service:services(*), customer:profiles(*), deliverables:order_deliverables(*), events:order_events(*)')
        .order('created_at', { ascending: false });
      if (!error && data) return data as Order[];
    }
    return getLS<Order[]>('orders', []);
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, service:services(*), customer:profiles(*), deliverables:order_deliverables(*), events:order_events(*)')
        .eq('id', orderId)
        .single();
      if (!error && data) return data as Order;
    }
    const orders = getLS<Order[]>('orders', []);
    return orders.find((o) => o.id === orderId) || null;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, adminId: string, eventMessage?: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
      if (error) throw new Error(error.message);
      if (eventMessage) {
        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: adminId,
          event_type: 'STATUS_UPDATED',
          message: eventMessage,
        });
      }
      return true;
    }

    const orders = getLS<Order[]>('orders', []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    order.status = status;
    order.updated_at = new Date().toISOString();
    if (!order.events) order.events = [];
    order.events.push({
      id: `event_${Date.now()}`,
      order_id: orderId,
      actor_id: adminId,
      event_type: 'STATUS_UPDATED',
      message: eventMessage || `অর্ডারের অবস্থা পরিবর্তন করা হয়েছে: ${status}`,
      created_at: new Date().toISOString(),
    });
    setLS('orders', orders);
    return true;
  },

  async refundOrder(orderId: string, adminId: string, refundReason: string): Promise<{ success: boolean; newBalance: number }> {
    if (!refundReason.trim()) {
      throw new Error('রিফান্ড করার জন্য সুনির্দিষ্ট কারণ উল্লেখ করা আবশ্যক।');
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('refund_order', {
        p_order_id: orderId,
        p_refund_reason: refundReason.trim(),
      });
      if (error) throw new Error(error.message);
      return { success: true, newBalance: data.new_balance };
    }

    // Local fallback
    const orders = getLS<Order[]>('orders', []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('অর্ডার পাওয়া যায়নি');
    if (order.status === 'refunded') throw new Error('এই অর্ডারটি ইতিমধ্যে রিফান্ড করা হয়েছে।');

    // Refund wallet
    const wallets = getLS<Record<string, Wallet>>('wallets', {});
    const wallet = wallets[order.user_id] || {
      id: `wallet_${order.user_id}`,
      user_id: order.user_id,
      balance: 0,
      pending_balance: 0,
      total_deposited: 0,
      total_spent: 0,
      updated_at: new Date().toISOString(),
    };

    wallet.balance += order.amount;
    wallet.total_spent = Math.max(0, wallet.total_spent - order.amount);
    wallet.updated_at = new Date().toISOString();
    wallets[order.user_id] = wallet;
    setLS('wallets', wallets);

    // Ledger record
    const txs = getLS<WalletTransaction[]>('transactions', []);
    txs.unshift({
      id: `tx_${Date.now()}`,
      wallet_id: wallet.id,
      user_id: order.user_id,
      type: 'refund',
      amount: order.amount,
      balance_after: wallet.balance,
      status: 'completed',
      reference_id: order.id,
      reference_type: 'order',
      description: `অর্ডার রিফান্ড: #${order.order_number} (কারণ: ${refundReason.trim()})`,
      created_at: new Date().toISOString(),
    });
    setLS('transactions', txs);

    // Update order
    order.status = 'refunded';
    order.cancellation_reason = refundReason.trim();
    order.refund_amount = order.amount;
    order.updated_at = new Date().toISOString();
    if (!order.events) order.events = [];
    order.events.push({
      id: `event_${Date.now()}`,
      order_id: orderId,
      actor_id: adminId,
      event_type: 'ORDER_REFUNDED',
      message: `অ্যাডমিন কর্তৃক ৳ ${order.amount} সম্পূর্ণ রিফান্ড অনুমোদিত হয়েছে। কারণ: ${refundReason.trim()}`,
      created_at: new Date().toISOString(),
    });
    setLS('orders', orders);

    return { success: true, newBalance: wallet.balance };
  },

  async requestOrderRevision(orderId: string, userId: string, revisionNotes: string): Promise<boolean> {
    if (!revisionNotes.trim()) throw new Error('সংশোধনের বিবরণ দেওয়া আবশ্যক।');

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('request_order_revision', {
        p_order_id: orderId,
        p_revision_notes: revisionNotes.trim(),
      });
      if (error) throw new Error(error.message);
      return true;
    }

    const orders = getLS<Order[]>('orders', []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('অর্ডার পাওয়া যায়নি');
    order.status = 'revision_requested';
    order.updated_at = new Date().toISOString();
    if (!order.events) order.events = [];
    order.events.push({
      id: `event_${Date.now()}`,
      order_id: orderId,
      actor_id: userId,
      event_type: 'REVISION_REQUESTED',
      message: `গ্রাহক সংশোধনের অনুরোধ জানিয়েছেন: ${revisionNotes.trim()}`,
      created_at: new Date().toISOString(),
    });
    setLS('orders', orders);
    return true;
  },

  async replyOrderInformation(orderId: string, userId: string, message: string): Promise<boolean> {
    if (!message.trim()) throw new Error('বার্তা লেখা আবশ্যক।');

    if (isSupabaseConfigured && supabase) {
      await supabase.from('orders').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', orderId);
      await supabase.from('order_events').insert({
        order_id: orderId,
        actor_id: userId,
        event_type: 'CUSTOMER_REPLY',
        message: `গ্রাহকের উত্তর: ${message.trim()}`,
      });
      return true;
    }

    const orders = getLS<Order[]>('orders', []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('অর্ডার পাওয়া যায়নি');
    order.status = 'in_progress';
    order.updated_at = new Date().toISOString();
    if (!order.events) order.events = [];
    order.events.push({
      id: `event_${Date.now()}`,
      order_id: orderId,
      actor_id: userId,
      event_type: 'CUSTOMER_REPLY',
      message: `গ্রাহকের উত্তর: ${message.trim()}`,
      created_at: new Date().toISOString(),
    });
    setLS('orders', orders);
    return true;
  },

  async addOrderDeliverable(
    orderId: string,
    adminId: string,
    deliverable: { title: string; fileUrl: string; fileSize?: number; fileType?: string; notes?: string }
  ): Promise<OrderDeliverable> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('order_deliverables')
        .insert({
          order_id: orderId,
          title: deliverable.title,
          file_url: deliverable.fileUrl,
          file_size: deliverable.fileSize,
          file_type: deliverable.fileType,
          deliverable_notes: deliverable.notes,
          uploaded_by: adminId,
        })
        .select()
        .single();
      if (!error && data) {
        await supabase.from('orders').update({ status: 'delivered', updated_at: new Date().toISOString() }).eq('id', orderId);
        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: adminId,
          event_type: 'DELIVERABLE_UPLOADED',
          message: `ডেলিভারি ফাইল যুক্ত করা হয়েছে: "${deliverable.title}"`,
        });
        return data as OrderDeliverable;
      }
      throw new Error(error?.message || 'Deliverable upload failed');
    }

    const orders = getLS<Order[]>('orders', []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');
    const newDeliverable: OrderDeliverable = {
      id: `deliv_${Date.now()}`,
      order_id: orderId,
      title: deliverable.title,
      file_url: deliverable.fileUrl,
      file_size: deliverable.fileSize || 1024 * 1024 * 2.5,
      file_type: deliverable.fileType || 'application/pdf',
      deliverable_notes: deliverable.notes || null,
      uploaded_by: adminId,
      created_at: new Date().toISOString(),
    };
    if (!order.deliverables) order.deliverables = [];
    order.deliverables.unshift(newDeliverable);
    order.status = 'delivered';
    if (!order.events) order.events = [];
    order.events.push({
      id: `event_${Date.now()}`,
      order_id: orderId,
      actor_id: adminId,
      event_type: 'DELIVERABLE_UPLOADED',
      message: `ডেলিভারি ফাইল আপলোড সম্পন্ন: "${deliverable.title}"। কাজের অবস্থা "ডেলিভারি সম্পন্ন" হিসেবে চিহ্নিত।`,
      created_at: new Date().toISOString(),
    });
    setLS('orders', orders);
    return newDeliverable;
  },

  // -------------------------------------------------------------
  // USERS & ROLES
  // -------------------------------------------------------------
  async getUsers(): Promise<Profile[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as Profile[];
    }
    return getLS<Profile[]>('profiles', [
      {
        id: 'user_super_admin',
        email: 'superadmin@mukisoft.com',
        full_name: 'Lead Director (MukiSoft)',
        role: 'super_admin',
        preferred_language: 'en',
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user_admin_demo',
        email: 'admin@mukisoft.com',
        full_name: 'Operations Manager',
        role: 'admin',
        preferred_language: 'en',
        created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'user_customer_demo',
        email: 'client@example.com',
        full_name: 'Enterprise Client',
        role: 'user',
        preferred_language: 'en',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
  },

  async updateUserRole(targetUserId: string, newRole: UserRole, currentAdminRole: UserRole): Promise<boolean> {
    if (currentAdminRole !== 'super_admin') {
      throw new Error('Unauthorized: Only a Super Admin can modify user roles.');
    }

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);
      if (error) throw new Error(error.message);
      return true;
    }

    const profiles = await this.getUsers();
    const user = profiles.find((p) => p.id === targetUserId);
    if (!user) throw new Error('User not found');
    user.role = newRole;
    user.updated_at = new Date().toISOString();
    setLS('profiles', profiles);
    return true;
  },

  // -------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------
  async getAuditLogs(): Promise<AuditLog[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*, actor:profiles(*)')
        .order('created_at', { ascending: false });
      if (!error && data) return data as AuditLog[];
    }
    return getLS<AuditLog[]>('audit_logs', [
      {
        id: 'log_seed_1',
        actor_id: 'user_super_admin',
        action: 'BOOTSTRAP_SYSTEM',
        target_type: 'platform_settings',
        target_id: 'general',
        details: { initialized: true, version: '1.0.0' },
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ]);
  },

  // -------------------------------------------------------------
  // SUPPORT TICKETS
  // -------------------------------------------------------------
  async getTickets(userId?: string): Promise<SupportTicket[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase.from('support_tickets').select('*, customer:profiles(*)').order('created_at', { ascending: false });
      if (userId) q = q.eq('user_id', userId);
      const { data, error } = await q;
      if (!error && data) return data as SupportTicket[];
    }
    const all = getLS<SupportTicket[]>('tickets', []);
    if (userId) return all.filter((t) => t.user_id === userId);
    return all;
  },

  async createTicket(ticket: { userId: string; subject: string; category: string; priority: SupportTicket['priority'] }): Promise<SupportTicket> {
    const ticketNumber = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: ticket.userId,
          ticket_number: ticketNumber,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: 'open',
        })
        .select()
        .single();
      if (!error && data) return data as SupportTicket;
      throw new Error(error?.message || 'Failed to create support ticket');
    }

    const all = getLS<SupportTicket[]>('tickets', []);
    const newT: SupportTicket = {
      id: `tick_${Date.now()}`,
      ticket_number: ticketNumber,
      user_id: ticket.userId,
      subject: ticket.subject,
      category: ticket.category,
      priority: ticket.priority,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    all.unshift(newT);
    setLS('tickets', all);
    return newT;
  },

  // -------------------------------------------------------------
  // SETTINGS
  // -------------------------------------------------------------
  async getSettings(): Promise<PlatformSettings> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('platform_settings').select('*');
      if (!error && data && data.length > 0) {
        const result: Record<string, unknown> = {};
        data.forEach((row) => {
          result[row.key] = row.value;
        });
        return result as unknown as PlatformSettings;
      }
    }
    return INITIAL_PLATFORM_SETTINGS;
  },
};
