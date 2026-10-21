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
  TicketMessage,
  TicketPriority,
  TicketStatus,
  AuditLog,
  AppNotification,
  PlatformSettings,
  UserRole,
  OrderStatus,
} from '../types/database';
import { INITIAL_CATEGORIES, INITIAL_SERVICES, INITIAL_PLATFORM_SETTINGS } from '../data/initialCatalog';
import { communicationService } from './communicationService';

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
      if (!error && data) {
        setLS('categories', data);
        return data as ServiceCategory[];
      }
    }
    return getLS<ServiceCategory[]>('categories', INITIAL_CATEGORIES);
  },

  async getCategoryBySlug(slug: string): Promise<ServiceCategory | null> {
    const categories = await this.getCategories();
    return categories.find((c) => c.slug === slug) || null;
  },

  async createOrUpdateCategory(cat: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const baseTitle = cat.name || cat.name_bn || 'category';
    const autoSlug = cat.slug || baseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `category-${Date.now()}`;

    const payload: Partial<ServiceCategory> = {
      ...cat,
      name: cat.name || cat.name_bn || 'New Category',
      name_bn: cat.name_bn || cat.name || 'নতুন ক্যাটাগরি',
      slug: autoSlug,
      description: cat.description || '',
      description_bn: cat.description_bn || '',
      icon: cat.icon || 'Layers',
      display_order: Number(cat.display_order ?? 0),
      is_active: cat.is_active ?? true,
      cover_image: cat.cover_image || null,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('service_categories')
        .upsert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      if (data) {
        await this.getCategories(); // Refresh local cache
        return data as ServiceCategory;
      }
    }

    const current = getLS<ServiceCategory[]>('categories', INITIAL_CATEGORIES);
    const idx = current.findIndex((c) => c.id === cat.id);
    let updated: ServiceCategory;
    if (idx >= 0) {
      updated = { ...current[idx], ...payload } as ServiceCategory;
      current[idx] = updated;
    } else {
      updated = {
        id: cat.id || `cat_${Date.now()}`,
        created_at: new Date().toISOString(),
        ...payload,
      } as ServiceCategory;
      current.push(updated);
    }
    setLS('categories', current);
    return updated;
  },

  async deleteCategory(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      // Check if services are tied to this category
      const { count } = await supabase
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id);

      if (count && count > 0) {
        throw new Error(`এই ক্যাটাগরিতে ${count}টি সেবা সক্রিয় রয়েছে। ক্যাটাগরি মুছে ফেলার আগে সেবাগুলো মুছে ফেলুন বা অন্য ক্যাটাগরিতে স্থানান্তর করুন।`);
      }

      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await this.getCategories();
      return true;
    }

    const current = getLS<ServiceCategory[]>('categories', INITIAL_CATEGORIES);
    const services = getLS<ServiceItem[]>('services', INITIAL_SERVICES);
    const hasServices = services.some((s) => s.category_id === id);
    if (hasServices) {
      throw new Error('এই ক্যাটাগরিতে সেবা বিদ্যমান রয়েছে। অনুগ্রহ করে প্রথমে সেবাগুলো মুছে ফেলুন।');
    }
    const filtered = current.filter((c) => c.id !== id);
    setLS('categories', filtered);
    return true;
  },

  // -------------------------------------------------------------
  // SERVICES
  // -------------------------------------------------------------
  async getServices(categoryId?: string): Promise<ServiceItem[]> {
    if (isSupabaseConfigured && supabase) {
      let query = supabase.from('services').select('*, category:service_categories(*)').order('created_at', { ascending: false });
      if (categoryId) query = query.eq('category_id', categoryId);
      const { data, error } = await query;
      if (!error && data) {
        setLS('services', data);
        return data as ServiceItem[];
      }
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
    // Strip joined relation 'category' before upserting to Postgres table
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { category, ...cleanService } = service as Record<string, unknown>;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('services')
        .upsert(cleanService)
        .select('*, category:service_categories(*)')
        .single();
      if (error) throw new Error(error.message);
      if (data) {
        await this.getServices();
        return data as ServiceItem;
      }
    }
    const current = getLS<ServiceItem[]>('services', INITIAL_SERVICES);
    const index = current.findIndex((s) => s.id === service.id);
    let updated: ServiceItem;
    if (index >= 0) {
      updated = { ...current[index], ...cleanService, updated_at: new Date().toISOString() } as ServiceItem;
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

  async deleteService(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await this.getServices();
      return true;
    }
    const current = getLS<ServiceItem[]>('services', INITIAL_SERVICES);
    const filtered = current.filter((s) => s.id !== id);
    setLS('services', filtered);
    return true;
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
      const isDemoClient = userId === 'user_customer_demo';
      wallets[userId] = {
        id: `wallet_${userId}`,
        user_id: userId,
        balance: isDemoClient ? 5000.0 : 0.0,
        pending_balance: 0.0,
        total_deposited: isDemoClient ? 5000.0 : 0.0,
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
    const isDemoClient = userId === 'user_customer_demo';
    const seedTx: WalletTransaction[] = isDemoClient
      ? [
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
        ]
      : [];
    const all = getLS<WalletTransaction[]>('transactions', seedTx);
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
    let newReq: DepositRequest;

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
      if (!error && data) {
        newReq = data as DepositRequest;
      } else {
        throw new Error(error?.message || 'Deposit submission failed');
      }
    } else {
      const current = getLS<DepositRequest[]>('deposit_requests', []);
      newReq = {
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
    }

    // Notify customer about successful submission of deposit request (Pending status only)
    try {
      const userProf = await this.getUserProfile(request.userId);
      await communicationService.notifyAndEmail({
        userId: request.userId,
        recipientEmail: userProf?.email,
        recipientName: userProf?.full_name,
        title: 'টাকা জমার অনুরোধ জমা হয়েছে',
        message: `${request.paymentMethod} মারফত ৳${request.amount.toLocaleString('bn-BD')} জমার অনুরোধ গৃহীত হয়েছে (TrxID: ${request.transactionReference})। অ্যাডমিন টিম যাচাই করার পর ওয়ালেটে ব্যালেন্স যুক্ত হবে।`,
        link: '/dashboard/wallet',
        category: 'wallet',
        templateType: 'system',
        templateData: {
          customMessage: `আপনার ${request.paymentMethod} মারফত ৳${request.amount.toLocaleString('bn-BD')} জমার অনুরোধ সফলভাবে সাবমিট হয়েছে (রেফারেন্স: ${request.transactionReference})। অ্যাডমিন টিম পেমেন্ট ভেরিফিকেশনের পর তা অনুমোদিত হলে সাথে সাথে আপনার ওয়ালেটে ব্যালেন্স যুক্ত হবে।`,
          actionUrl: `${window.location.origin}/dashboard/wallet`,
        },
        eventKey: `deposit_submit_${newReq.id}`,
      });
    } catch (err) {
      console.warn('Deposit submit notification failed:', err);
    }

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
    let resultBalance = 0;
    let targetDeposit: DepositRequest | null = null;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('approve_deposit_request', {
        p_deposit_id: depositId,
        p_admin_notes: adminNotes || null,
      });
      if (error) throw new Error(error.message);
      resultBalance = data.new_balance;

      const { data: depData } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', depositId)
        .single();
      targetDeposit = depData as DepositRequest;
    } else {
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

      resultBalance = wallet.balance;
      targetDeposit = target;
    }

    // Notify customer about approved deposit AFTER successful transaction
    if (targetDeposit) {
      try {
        const userProf = await this.getUserProfile(targetDeposit.user_id);
        await communicationService.notifyAndEmail({
          userId: targetDeposit.user_id,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: 'টাকা জমা অনুমোদিত হয়েছে',
          message: `${targetDeposit.payment_method} মাধ্যমে পাঠানো ৳${targetDeposit.amount.toLocaleString('bn-BD')} সফলভাবে আপনার ওয়ালেটে যুক্ত হয়েছে। বর্তমান ব্যালেন্স: ৳${resultBalance.toLocaleString('bn-BD')}।`,
          link: '/dashboard/wallet',
          category: 'wallet',
          templateType: 'deposit_status',
          templateData: {
            paymentMethod: targetDeposit.payment_method,
            transactionRef: targetDeposit.transaction_reference,
            amount: targetDeposit.amount,
            depositStatus: 'approved',
            walletBalance: resultBalance,
            actionUrl: `${window.location.origin}/dashboard/wallet`,
          },
          eventKey: `deposit_approved_${depositId}`,
        });
      } catch (err) {
        console.warn('Approve deposit notification error:', err);
      }
    }

    return { success: true, newBalance: resultBalance };
  },

  async rejectDeposit(depositId: string, adminId: string, adminNotes: string): Promise<boolean> {
    let targetDeposit: DepositRequest | null = null;

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

      const { data: depData } = await supabase
        .from('deposit_requests')
        .select('*')
        .eq('id', depositId)
        .single();
      targetDeposit = depData as DepositRequest;
    } else {
      const requests = getLS<DepositRequest[]>('deposit_requests', []);
      const target = requests.find((r) => r.id === depositId);
      if (!target) throw new Error('Deposit request not found');
      target.status = 'rejected';
      target.reviewed_by = adminId;
      target.reviewed_at = new Date().toISOString();
      target.admin_notes = adminNotes;
      setLS('deposit_requests', requests);
      targetDeposit = target;
    }

    // Notify customer about rejection with explanation
    if (targetDeposit) {
      try {
        const userProf = await this.getUserProfile(targetDeposit.user_id);
        await communicationService.notifyAndEmail({
          userId: targetDeposit.user_id,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: 'টাকা জমার অনুরোধ বাতিল হয়েছে',
          message: `আপনার ৳${targetDeposit.amount.toLocaleString('bn-BD')} জমার অনুরোধটি গৃহীত হয়নি। কারণ: ${adminNotes}`,
          link: '/dashboard/wallet',
          category: 'wallet',
          templateType: 'deposit_status',
          templateData: {
            paymentMethod: targetDeposit.payment_method,
            transactionRef: targetDeposit.transaction_reference,
            amount: targetDeposit.amount,
            depositStatus: 'rejected',
            adminNotes: adminNotes,
            actionUrl: `${window.location.origin}/dashboard/wallet`,
          },
          eventKey: `deposit_rejected_${depositId}`,
        });
      } catch (err) {
        console.warn('Reject deposit notification error:', err);
      }
    }

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

    let orderId: string;
    let orderNumber: string;
    let remainingBalance: number;

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
      orderId = data.order_id;
      orderNumber = data.order_number;
      remainingBalance = data.remaining_balance;
    } else {
      // Local fallback
      const service = await this.getServiceById(serviceId);
      if (!service) throw new Error('অনুরোধকৃত সেবাটি ক্যাটালগে পাওয়া যায়নি।');
      if (!service.is_active) throw new Error('এই সেবাটি বর্তমানে সাময়িকভাবে বন্ধ রয়েছে।');

      const finalPrice = service.promotional_price ?? service.price;
      const wallet = await this.getWallet(userId);
      if (wallet.balance < finalPrice) {
        throw new Error(`পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই। আপনার বর্তমান ব্যালেন্স ৳ ${wallet.balance}, কিন্তু প্রয়োজনীয় মূল্য ৳ ${finalPrice}। দয়া করে আগে ওয়ালেটে টাকা জমা দিন।`);
      }

      orderNumber = `MS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      orderId = `order_${Date.now()}`;

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

      remainingBalance = wallet.balance;
    }

    // Notify customer about created order
    try {
      const userProf = await this.getUserProfile(userId);
      const srv = await this.getServiceById(serviceId);
      const price = srv ? (srv.promotional_price ?? srv.price) : 0;
      await communicationService.notifyAndEmail({
        userId: userId,
        recipientEmail: userProf?.email,
        recipientName: userProf?.full_name,
        title: 'অর্ডার নিশ্চিত হয়েছে',
        message: `আপনার অর্ডার #${orderNumber} (${srv?.title_bn || srv?.title || 'ডিজিটাল সার্ভিস'}) নিশ্চিত হয়েছে। কাজ প্রক্রিয়াধীন রয়েছে।`,
        link: `/dashboard/orders/${orderId}`,
        category: 'orders',
        templateType: 'order_created',
        templateData: {
          orderNumber: orderNumber,
          serviceTitle: srv?.title_bn || srv?.title || 'ডিজিটাল সার্ভিস',
          amount: price,
          deliveryDays: srv?.delivery_days || 3,
          actionUrl: `${window.location.origin}/dashboard/orders/${orderId}`,
        },
        eventKey: `order_created_${orderId}`,
      });
    } catch (err) {
      console.warn('Order created notification failed:', err);
    }

    return {
      success: true,
      orderId,
      orderNumber,
      remainingBalance,
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

  async getOrderById(orderId: string, currentUserId?: string, isAdmin?: boolean): Promise<Order | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, service:services(*), customer:profiles(*), deliverables:order_deliverables(*), events:order_events(*)')
        .eq('id', orderId)
        .single();
      if (!error && data) {
        if (currentUserId && !isAdmin && data.user_id !== currentUserId) {
          return null; // unauthorized access
        }
        return data as Order;
      }
      return null;
    }
    const orders = getLS<Order[]>('orders', []);
    const found = orders.find((o) => o.id === orderId);
    if (!found) return null;
    if (currentUserId && !isAdmin && found.user_id !== currentUserId) {
      return null; // unauthorized access
    }
    return found;
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
    } else {
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
    }

    // Notify relevant customer of order status change
    try {
      const order = await this.getOrderById(orderId);
      if (order) {
        const userProf = await this.getUserProfile(order.user_id);
        const statusMap: Record<string, { title: string; bn: string; note: string }> = {
          pending: { title: 'অর্ডার অপেক্ষমান', bn: 'অপেক্ষমান', note: 'অর্ডারটি পর্যালোচনার অপেক্ষায় রয়েছে।' },
          accepted: { title: 'অর্ডার গৃহীত হয়েছে', bn: 'গৃহীত হয়েছে', note: 'আপনার অর্ডারটি টিম গ্রহণ করেছেন।' },
          in_progress: { title: 'কাজের অগ্রগতি শুরু হয়েছে', bn: 'চলমান কাজ', note: 'টিম আপনার কাজের মূল পর্যায় শুরু করেছেন।' },
          needs_information: { title: 'অতিরিক্ত তথ্য প্রয়োজন', bn: 'তথ্য প্রয়োজন', note: 'কাজের সুবিধার্থে কিছু অতিরিক্ত তথ্যের প্রয়োজন। ড্যাশবোর্ডে গিয়ে উত্তর দিন।' },
          in_review: { title: 'অর্ডার পর্যালোচনার জন্য প্রস্তুত', bn: 'রিভিউ প্রস্তুত', note: 'অর্ডারের কাজ সম্পন্ন হয়েছে এবং পর্যালোচনার জন্য প্রস্তুত।' },
          revision_requested: { title: 'রিভিশন আবেদন বিবেচনাধীন', bn: 'সংশোধন প্রক্রিয়া', note: 'আপনার প্রদত্ত ফিডব্যাক অনুযায়ী পরিবর্তন সম্পন্ন করা হচ্ছে।' },
          delivered: { title: 'কাজের ফাইল ডেলিভারি সম্পন্ন', bn: 'ডেলিভারি প্রস্তুত', note: 'চূড়ান্ত ফাইল ড্যাশবোর্ডে আপলোড করা হয়েছে।' },
          completed: { title: 'অর্ডার সফলভাবে সম্পূর্ণ হয়েছে', bn: 'সম্পূর্ণ', note: 'অর্ডারটি সফলভাবে সম্পন্ন হয়েছে। MukiSoft Assist ব্যবহারের জন্য ধন্যবাদ!' },
          cancelled: { title: 'অর্ডার বাতিল করা হয়েছে', bn: 'বাতিল', note: 'আপনার অর্ডারটি বাতিল করা হয়েছে।' },
          refunded: { title: 'অর্ডার রিফান্ড সফল হয়েছে', bn: 'অর্থ ফেরত', note: 'অর্ডারের সম্পূর্ণ অর্থ আপনার ওয়ালেটে ফেরত দেওয়া হয়েছে।' },
        };
        const sInfo = statusMap[status] || { title: 'অর্ডার স্ট্যাটাস আপডেট', bn: status, note: eventMessage || '' };
        await communicationService.notifyAndEmail({
          userId: order.user_id,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: sInfo.title,
          message: `আপনার অর্ডার #${order.order_number}-এর বর্তমান অবস্থা: ${sInfo.bn}। ${eventMessage || sInfo.note}`,
          link: `/dashboard/orders/${orderId}`,
          category: 'orders',
          templateType: 'order_status',
          templateData: {
            orderNumber: order.order_number,
            statusBengali: sInfo.bn,
            statusNote: eventMessage || sInfo.note,
            actionUrl: `${window.location.origin}/dashboard/orders/${orderId}`,
          },
          eventKey: `order_status_${orderId}_${status}`,
        });
      }
    } catch (err) {
      console.warn('Update order status notification failed:', err);
    }

    return true;
  },

  async refundOrder(orderId: string, adminId: string, refundReason: string): Promise<{ success: boolean; newBalance: number }> {
    if (!refundReason.trim()) {
      throw new Error('রিফান্ড করার জন্য সুনির্দিষ্ট কারণ উল্লেখ করা আবশ্যক।');
    }

    let refundBalance = 0;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.rpc('refund_order', {
        p_order_id: orderId,
        p_refund_reason: refundReason.trim(),
      });
      if (error) throw new Error(error.message);
      refundBalance = data.new_balance;
    } else {
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

      refundBalance = wallet.balance;
    }

    // Notify customer about authorized refund
    try {
      const refundOrderObj = await this.getOrderById(orderId);
      if (refundOrderObj) {
        const userProf = await this.getUserProfile(refundOrderObj.user_id);
        await communicationService.notifyAndEmail({
          userId: refundOrderObj.user_id,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: 'অর্ডার রিফান্ড সম্পন্ন হয়েছে',
          message: `আপনার অর্ডার #${refundOrderObj.order_number}-এর ৳${refundOrderObj.amount.toLocaleString('bn-BD')} নিরাপদে ওয়ালেট ব্যালেন্সে ফেরত দেওয়া হয়েছে। কারণ: ${refundReason.trim()}`,
          link: `/dashboard/orders/${orderId}`,
          category: 'wallet',
          templateType: 'refund_processed',
          templateData: {
            orderNumber: refundOrderObj.order_number,
            amount: refundOrderObj.amount,
            statusNote: refundReason.trim(),
            actionUrl: `${window.location.origin}/dashboard/wallet`,
          },
          eventKey: `order_refund_${orderId}`,
        });
      }
    } catch (err) {
      console.warn('Refund notification error:', err);
    }

    return { success: true, newBalance: refundBalance };
  },

  async cancelUserOrder(
    orderId: string,
    userId: string,
    cancellationReason: string
  ): Promise<{ success: boolean; newBalance: number }> {
    if (!cancellationReason.trim()) {
      throw new Error('বাতিল করার কারণ উল্লেখ করা আবশ্যক।');
    }

    let finalBalance = 0;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('cancel_order_by_customer', {
          p_order_id: orderId,
          p_reason: cancellationReason.trim(),
        });
        if (!error && data) {
          finalBalance = data.new_balance;
        }
      } catch {
        // Continue to direct queries fallback
      }

      if (finalBalance === 0) {
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .eq('user_id', userId)
          .single();

        if (orderErr || !orderData) {
          throw new Error('অর্ডার পাওয়া যায়নি অথবা আপনার এই অর্ডারে অনুমতি নেই।');
        }

        if (['delivered', 'completed', 'refunded'].includes(orderData.status)) {
          throw new Error('ডেলিভারি সম্পন্ন বা রিফান্ড হওয়া অর্ডার সরাসরি বাতিলযোগ্য নয়।');
        }

        await supabase
          .from('orders')
          .update({
            status: 'refunded',
            cancellation_reason: cancellationReason.trim(),
            refund_amount: orderData.amount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: userId,
          event_type: 'ORDER_REFUNDED',
          message: `গ্রাহক কর্তৃক অর্ডার বাতিল করা হয়েছে এবং ৳ ${orderData.amount} ওয়ালেটে ফেরত দেওয়া হয়েছে। কারণ: ${cancellationReason.trim()}`,
        });

        const { data: walletData } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', userId)
          .single();

        const newBal = (walletData?.balance || 0) + orderData.amount;
        if (walletData) {
          await supabase
            .from('wallets')
            .update({
              balance: newBal,
              total_spent: Math.max(0, (walletData.total_spent || 0) - orderData.amount),
              updated_at: new Date().toISOString(),
            })
            .eq('id', walletData.id);

          await supabase.from('wallet_transactions').insert({
            wallet_id: walletData.id,
            user_id: userId,
            type: 'refund',
            amount: orderData.amount,
            balance_after: newBal,
            status: 'completed',
            reference_id: orderId,
            reference_type: 'order',
            description: `অর্ডার বাতিল ও রিফান্ড: #${orderData.order_number} (কারণ: ${cancellationReason.trim()})`,
          });
        }
        finalBalance = newBal;
      }
    } else {
      // Local state fallback
      const orders = getLS<Order[]>('orders', []);
      const order = orders.find((o) => o.id === orderId && o.user_id === userId);
      if (!order) throw new Error('অর্ডার পাওয়া যায়নি');
      if (['delivered', 'completed', 'refunded'].includes(order.status)) {
        throw new Error('ডেলিভারি সম্পন্ন বা রিফান্ড হওয়া অর্ডার সরাসরি বাতিলযোগ্য নয়।');
      }

      const wallets = getLS<Record<string, Wallet>>('wallets', {});
      const wallet = wallets[userId] || {
        id: `wallet_${userId}`,
        user_id: userId,
        balance: 0,
        pending_balance: 0,
        total_deposited: 0,
        total_spent: 0,
        updated_at: new Date().toISOString(),
      };

      wallet.balance += order.amount;
      wallet.total_spent = Math.max(0, wallet.total_spent - order.amount);
      wallet.updated_at = new Date().toISOString();
      wallets[userId] = wallet;
      setLS('wallets', wallets);

      const txs = getLS<WalletTransaction[]>('transactions', []);
      txs.unshift({
        id: `tx_${Date.now()}`,
        wallet_id: wallet.id,
        user_id: userId,
        type: 'refund',
        amount: order.amount,
        balance_after: wallet.balance,
        status: 'completed',
        reference_id: order.id,
        reference_type: 'order',
        description: `অর্ডার বাতিল ও রিফান্ড: #${order.order_number} (কারণ: ${cancellationReason.trim()})`,
        created_at: new Date().toISOString(),
      });
      setLS('transactions', txs);

      order.status = 'refunded';
      order.cancellation_reason = cancellationReason.trim();
      order.refund_amount = order.amount;
      order.updated_at = new Date().toISOString();
      if (!order.events) order.events = [];
      order.events.push({
        id: `event_${Date.now()}`,
        order_id: orderId,
        actor_id: userId,
        event_type: 'ORDER_REFUNDED',
        message: `গ্রাহক কর্তৃক অর্ডার বাতিল করা হয়েছে এবং ৳ ${order.amount} ওয়ালেটে ফেরত দেওয়া হয়েছে। কারণ: ${cancellationReason.trim()}`,
        created_at: new Date().toISOString(),
      });
      setLS('orders', orders);

      finalBalance = wallet.balance;
    }

    // Notify customer about successful cancellation and refund
    try {
      const cancelOrderObj = await this.getOrderById(orderId);
      if (cancelOrderObj) {
        const userProf = await this.getUserProfile(userId);
        await communicationService.notifyAndEmail({
          userId: userId,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: 'অর্ডার বাতিল ও রিফান্ড সম্পন্ন',
          message: `আপনার অর্ডার #${cancelOrderObj.order_number} বাতিল করা হয়েছে এবং ৳${cancelOrderObj.amount.toLocaleString('bn-BD')} আপনার ওয়ালেট ব্যালেন্সে ফেরত দেওয়া হয়েছে।`,
          link: `/dashboard/orders/${orderId}`,
          category: 'wallet',
          templateType: 'refund_processed',
          templateData: {
            orderNumber: cancelOrderObj.order_number,
            amount: cancelOrderObj.amount,
            statusNote: `গ্রাহক কর্তৃক বাতিল: ${cancellationReason.trim()}`,
            actionUrl: `${window.location.origin}/dashboard/wallet`,
          },
          eventKey: `customer_cancel_${orderId}`,
        });
      }
    } catch (err) {
      console.warn('Cancel order notification error:', err);
    }

    return { success: true, newBalance: finalBalance };
  },

  async requestOrderRevision(orderId: string, userId: string, revisionNotes: string): Promise<boolean> {
    if (!revisionNotes.trim()) throw new Error('সংশোধনের বিবরণ দেওয়া আবশ্যক।');

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.rpc('request_order_revision', {
        p_order_id: orderId,
        p_revision_notes: revisionNotes.trim(),
      });
      if (error) throw new Error(error.message);
    } else {
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
    }

    // Notify customer about revision request recorded
    try {
      const revOrder = await this.getOrderById(orderId);
      if (revOrder) {
        const userProf = await this.getUserProfile(revOrder.user_id);
        await communicationService.notifyAndEmail({
          userId: revOrder.user_id,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: 'রিভিশন আবেদন গৃহীত হয়েছে',
          message: `আপনার অর্ডার #${revOrder.order_number}-এ সংশোধনের আবেদন গ্রহণ করা হয়েছে। টিম দ্রুত আপনার ফিডব্যাক পর্যালোচনা করবেন।`,
          link: `/dashboard/orders/${orderId}`,
          category: 'orders',
          templateType: 'order_status',
          templateData: {
            orderNumber: revOrder.order_number,
            statusBengali: 'রিভিশন আবেদন',
            statusNote: `সংশোধনের বিবরণ: ${revisionNotes.trim()}`,
            actionUrl: `${window.location.origin}/dashboard/orders/${orderId}`,
          },
          eventKey: `revision_req_${orderId}_${Date.now()}`,
        });
      }
    } catch (err) {
      console.warn('Revision notification error:', err);
    }

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
    let newDeliverable: OrderDeliverable;

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
        newDeliverable = data as OrderDeliverable;
      } else {
        throw new Error(error?.message || 'Deliverable upload failed');
      }
    } else {
      const orders = getLS<Order[]>('orders', []);
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new Error('Order not found');
      newDeliverable = {
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
    }

    // Notify customer that deliverable is available (without leaking private URLs)
    try {
      const delivOrder = await this.getOrderById(orderId);
      if (delivOrder) {
        const userProf = await this.getUserProfile(delivOrder.user_id);
        await communicationService.notifyAndEmail({
          userId: delivOrder.user_id,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: 'কাজের ডেলিভারি ফাইল প্রস্তুত',
          message: `আপনার অর্ডার #${delivOrder.order_number}-এর চূড়ান্ত ডেলিভারি ফাইল ("${deliverable.title}") আপলোড করা হয়েছে। নিরাপদ ড্যাশবোর্ড থেকে ফাইলটি ডাউনলোড করুন।`,
          link: `/dashboard/orders/${orderId}`,
          category: 'orders',
          templateType: 'deliverable_ready',
          templateData: {
            orderNumber: delivOrder.order_number,
            deliverableTitle: deliverable.title,
            actionUrl: `${window.location.origin}/dashboard/orders/${orderId}`,
          },
          eventKey: `deliverable_ready_${orderId}_${Date.now()}`,
        });
      }
    } catch (err) {
      console.warn('Deliverable ready notification error:', err);
    }

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

  async getUserProfile(userId: string): Promise<Profile | null> {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) return data as Profile;
    }
    const profiles = await this.getUsers();
    return profiles.find((p) => p.id === userId) || null;
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

  async updateProfile(userId: string, data: { full_name?: string; phone?: string }): Promise<Profile> {
    if (isSupabaseConfigured && supabase) {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          phone: data.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated as Profile;
    }
    const profiles = await this.getUsers();
    let target = profiles.find((p) => p.id === userId);
    if (!target) {
      target = {
        id: userId,
        email: 'user@mukisoft.com',
        full_name: data.full_name || 'গ্রাহক',
        phone: data.phone || null,
        role: 'user',
        preferred_language: 'bn',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      profiles.push(target);
    } else {
      if (data.full_name !== undefined) target.full_name = data.full_name;
      if (data.phone !== undefined) target.phone = data.phone;
      target.updated_at = new Date().toISOString();
    }
    setLS('profiles', profiles);

    // Also sync demo session if active
    const currentDemo = localStorage.getItem('mukisoft_demo_current_user');
    if (currentDemo) {
      try {
        const parsed = JSON.parse(currentDemo);
        if (parsed.id === userId) {
          localStorage.setItem('mukisoft_demo_current_user', JSON.stringify(target));
        }
      } catch {
        // ignore
      }
    }
    return target;
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

  async logAudit(params: {
    actorId?: string | null;
    action: string;
    targetType: string;
    targetId: string;
    details?: Record<string, unknown>;
  }): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('audit_logs').insert({
        actor_id: params.actorId || null,
        action: params.action,
        target_type: params.targetType,
        target_id: params.targetId,
        details: params.details || {},
      });
      return;
    }
    const current = getLS<AuditLog[]>('audit_logs', []);
    current.unshift({
      id: `audit_${Date.now()}`,
      actor_id: params.actorId || null,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId,
      details: params.details || {},
      created_at: new Date().toISOString(),
    });
    setLS('audit_logs', current);
  },

  // -------------------------------------------------------------
  // NOTIFICATIONS
  // -------------------------------------------------------------
  async getNotifications(userId: string): Promise<AppNotification[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (!error && data) return data as AppNotification[];
    }
    const current = getLS<AppNotification[]>('notifications', []);
    return current.filter((n) => n.user_id === userId);
  },

  async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    link?: string | null;
  }): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('notifications').insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        link: params.link || null,
        is_read: false,
      });
      return;
    }
    const current = getLS<AppNotification[]>('notifications', []);
    current.unshift({
      id: `notif_${Date.now()}`,
      user_id: params.userId,
      title: params.title,
      message: params.message,
      link: params.link || null,
      is_read: false,
      created_at: new Date().toISOString(),
    });
    setLS('notifications', current);
  },

  // -------------------------------------------------------------
  // SUPPORT TICKETS & CONVERSATION THREADS (Prompt 5)
  // -------------------------------------------------------------
  async getTickets(userId?: string): Promise<SupportTicket[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase
        .from('support_tickets')
        .select('*, customer:profiles!user_id(*), assigned_staff:profiles!assigned_to(*), order:orders(*)')
        .order('updated_at', { ascending: false });
      if (userId) q = q.eq('user_id', userId);
      const { data, error } = await q;
      if (!error && data) return data as SupportTicket[];
    }
    const all = getLS<SupportTicket[]>('tickets', []);
    if (userId) return all.filter((t) => t.user_id === userId);
    return all;
  },

  async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, customer:profiles!user_id(*), assigned_staff:profiles!assigned_to(*), order:orders(*)')
        .eq('id', ticketId)
        .single();
      if (!error && data) return data as SupportTicket;
    }
    const all = getLS<SupportTicket[]>('tickets', []);
    return all.find((t) => t.id === ticketId) || null;
  },

  async createTicket(payload: {
    userId: string;
    subject: string;
    category: string;
    priority: TicketPriority;
    description?: string;
    orderId?: string | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
  }): Promise<SupportTicket> {
    const ticketNumber = `TICK-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const { data: ticketData, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: payload.userId,
          ticket_number: ticketNumber,
          subject: payload.subject,
          category: payload.category,
          priority: payload.priority,
          status: 'open',
          order_id: payload.orderId || null,
          description: payload.description || '',
          attachment_url: payload.attachmentUrl || null,
          attachment_name: payload.attachmentName || null,
        })
        .select('*, customer:profiles!user_id(*), order:orders(*)')
        .single();

      if (ticketError || !ticketData) {
        throw new Error(ticketError?.message || 'সহায়তা টিকিট তৈরি করা সম্ভব হয়নি');
      }

      // প্রাথমিক বিবরণকে প্রথম বার্তা হিসেবে সংরক্ষণ
      if (payload.description) {
        await supabase.from('ticket_messages').insert({
          ticket_id: ticketData.id,
          sender_id: payload.userId,
          sender_role: 'customer',
          message: payload.description,
          attachment_url: payload.attachmentUrl || null,
          attachment_name: payload.attachmentName || null,
          is_internal: false,
        });
      }

      // গ্রাহক ও অ্যাডমিনদের নোটিফিকেশন প্রদান
      try {
        const userProf = await this.getUserProfile(payload.userId);
        await communicationService.notifyAndEmail({
          userId: payload.userId,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: 'সহায়তা টিকিট খোলা হয়েছে',
          message: `আপনার টিকিট #${ticketNumber} ("${payload.subject}") খোলা হয়েছে। আমাদের প্রতিনিধি দ্রুত যোগাযোগ করবেন।`,
          link: '/dashboard/support',
          category: 'support',
          templateType: 'system',
          templateData: {
            customMessage: `আপনার সহায়তা টিকিট #${ticketNumber} ("${payload.subject}") গৃহীত হয়েছে। সমস্যা সমাধানের জন্য আমাদের প্রতিনিধি পর্যালোচনা করছেন।`,
            actionUrl: `${window.location.origin}/dashboard/support`,
          },
          eventKey: `ticket_created_${ticketData.id}`,
        });
      } catch (err) {
        console.warn('Ticket created notification failed:', err);
      }

      return ticketData as SupportTicket;
    }

    // LocalStorage fallback
    const all = getLS<SupportTicket[]>('tickets', []);
    const newId = `tick_${Date.now()}`;
    const newT: SupportTicket = {
      id: newId,
      ticket_number: ticketNumber,
      user_id: payload.userId,
      subject: payload.subject,
      category: payload.category,
      priority: payload.priority,
      status: 'open',
      order_id: payload.orderId || null,
      description: payload.description || '',
      attachment_url: payload.attachmentUrl || null,
      attachment_name: payload.attachmentName || null,
      created_at: now,
      updated_at: now,
    };
    all.unshift(newT);
    setLS('tickets', all);

    if (payload.description) {
      const messages = getLS<TicketMessage[]>(`ticket_msgs_${newId}`, []);
      messages.push({
        id: `msg_${Date.now()}`,
        ticket_id: newId,
        sender_id: payload.userId,
        sender_role: 'customer',
        message: payload.description,
        attachment_url: payload.attachmentUrl || null,
        attachment_name: payload.attachmentName || null,
        is_internal: false,
        created_at: now,
      });
      setLS(`ticket_msgs_${newId}`, messages);
    }

    try {
      const userProf = await this.getUserProfile(payload.userId);
      await communicationService.notifyAndEmail({
        userId: payload.userId,
        recipientEmail: userProf?.email,
        recipientName: userProf?.full_name,
        title: 'সহায়তা টিকিট খোলা হয়েছে',
        message: `আপনার টিকিট #${ticketNumber} ("${payload.subject}") খোলা হয়েছে। আমাদের প্রতিনিধি দ্রুত যোগাযোগ করবেন।`,
        link: '/dashboard/support',
        category: 'support',
        templateType: 'system',
        templateData: {
          customMessage: `আপনার সহায়তা টিকিট #${ticketNumber} ("${payload.subject}") গৃহীত হয়েছে।`,
          actionUrl: `${window.location.origin}/dashboard/support`,
        },
        eventKey: `ticket_created_${newId}`,
      });
    } catch (err) {
      console.warn('Ticket created notification failed:', err);
    }

    return newT;
  },

  async getTicketMessages(ticketId: string, isAdminView: boolean = false): Promise<TicketMessage[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase
        .from('ticket_messages')
        .select('*, sender:profiles(*)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (!isAdminView) {
        q = q.eq('is_internal', false);
      }
      const { data, error } = await q;
      if (!error && data) return data as TicketMessage[];
    }
    const messages = getLS<TicketMessage[]>(`ticket_msgs_${ticketId}`, []);
    if (!isAdminView) {
      return messages.filter((m) => !m.is_internal);
    }
    return messages;
  },

  async sendTicketMessage(payload: {
    ticketId: string;
    senderId: string;
    senderRole: 'customer' | 'admin' | 'staff' | 'system';
    message: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    isInternal?: boolean;
    updateStatus?: TicketStatus;
  }): Promise<TicketMessage> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: payload.ticketId,
          sender_id: payload.senderId,
          sender_role: payload.senderRole,
          message: payload.message,
          attachment_url: payload.attachmentUrl || null,
          attachment_name: payload.attachmentName || null,
          is_internal: payload.isInternal || false,
        })
        .select('*, sender:profiles(*)')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'বার্তা পাঠানো সম্ভব হয়নি');
      }

      // টিকিট আপডেট ও স্ট্যাটাস পরিবর্তন
      const updates: Record<string, unknown> = { updated_at: now };
      if (payload.updateStatus) {
        updates.status = payload.updateStatus;
      } else if (payload.senderRole === 'customer') {
        updates.status = 'in_progress';
      }
      await supabase.from('support_tickets').update(updates).eq('id', payload.ticketId);

      // গ্রাহককে নোটিফিকেশন ও ইমেইল প্রেরণ (যদি অ্যাডমিন উত্তর পাঠায় এবং অভ্যন্তরীণ নোট না হয়)
      if ((payload.senderRole === 'admin' || payload.senderRole === 'staff') && !payload.isInternal) {
        try {
          const { data: ticket } = await supabase
            .from('support_tickets')
            .select('user_id, ticket_number, subject')
            .eq('id', payload.ticketId)
            .single();
          if (ticket) {
            const userProf = await this.getUserProfile(ticket.user_id);
            await communicationService.notifyAndEmail({
              userId: ticket.user_id,
              recipientEmail: userProf?.email,
              recipientName: userProf?.full_name,
              title: 'সাপোর্ট টিকিটে নতুন উত্তর',
              message: `আপনার টিকিট #${ticket.ticket_number}-এ সহায়তা প্রতিনিধি নতুন উত্তর দিয়েছেন।`,
              link: '/dashboard/support',
              category: 'support',
              templateType: 'support_reply',
              templateData: {
                ticketNumber: ticket.ticket_number,
                ticketSubject: ticket.subject,
                replyMessage: payload.message,
                responderName: 'MukiSoft সহায়তা প্রতিনিধি',
                actionUrl: `${window.location.origin}/dashboard/support`,
              },
              eventKey: `ticket_reply_${payload.ticketId}_${Date.now()}`,
            });
          }
        } catch (err) {
          console.warn('Support reply notification failed:', err);
        }
      }

      return data as TicketMessage;
    }

    // LocalStorage fallback
    const messages = getLS<TicketMessage[]>(`ticket_msgs_${payload.ticketId}`, []);
    const newMsg: TicketMessage = {
      id: `msg_${Date.now()}`,
      ticket_id: payload.ticketId,
      sender_id: payload.senderId,
      sender_role: payload.senderRole,
      message: payload.message,
      attachment_url: payload.attachmentUrl || null,
      attachment_name: payload.attachmentName || null,
      is_internal: payload.isInternal || false,
      created_at: now,
    };
    messages.push(newMsg);
    setLS(`ticket_msgs_${payload.ticketId}`, messages);

    // টিকিটের স্ট্যাটাস আপডেট
    const allTickets = getLS<SupportTicket[]>('tickets', []);
    const tIdx = allTickets.findIndex((t) => t.id === payload.ticketId);
    if (tIdx >= 0) {
      allTickets[tIdx].updated_at = now;
      if (payload.updateStatus) {
        allTickets[tIdx].status = payload.updateStatus;
      } else if (payload.senderRole === 'customer') {
        allTickets[tIdx].status = 'in_progress';
      }
      setLS('tickets', allTickets);

      if ((payload.senderRole === 'admin' || payload.senderRole === 'staff') && !payload.isInternal) {
        try {
          const userProf = await this.getUserProfile(allTickets[tIdx].user_id);
          communicationService.notifyAndEmail({
            userId: allTickets[tIdx].user_id,
            recipientEmail: userProf?.email,
            recipientName: userProf?.full_name,
            title: 'সাপোর্ট টিকিটে নতুন উত্তর',
            message: `আপনার টিকিট #${allTickets[tIdx].ticket_number}-এ সহায়তা প্রতিনিধি নতুন উত্তর দিয়েছেন।`,
            link: '/dashboard/support',
            category: 'support',
            templateType: 'support_reply',
            templateData: {
              ticketNumber: allTickets[tIdx].ticket_number,
              ticketSubject: allTickets[tIdx].subject,
              replyMessage: payload.message,
              responderName: 'MukiSoft সহায়তা প্রতিনিধি',
              actionUrl: `${window.location.origin}/dashboard/support`,
            },
            eventKey: `ticket_reply_${payload.ticketId}_${Date.now()}`,
          });
        } catch (err) {
          console.warn('Local support reply notification failed:', err);
        }
      }
    }

    return newMsg;
  },

  async updateTicketStatus(ticketId: string, status: TicketStatus, actorId?: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      await supabase.from('support_tickets').update({ status, updated_at: now }).eq('id', ticketId);
      if (actorId) {
        await this.logAudit({
          actorId,
          action: 'TICKET_STATUS_UPDATED',
          targetType: 'ticket',
          targetId: ticketId,
          details: { new_status: status },
        });
      }
    } else {
      const all = getLS<SupportTicket[]>('tickets', []);
      const idx = all.findIndex((t) => t.id === ticketId);
      if (idx >= 0) {
        all[idx].status = status;
        all[idx].updated_at = now;
        setLS('tickets', all);
      }
    }

    // Notify customer about ticket status change
    try {
      const ticket = await this.getTicketById(ticketId);
      if (ticket) {
        const userProf = await this.getUserProfile(ticket.user_id);
        const statusMap: Record<string, string> = {
          open: 'উন্মুক্ত (Open)',
          in_progress: 'প্রক্রিয়াধীন (In Progress)',
          waiting_customer_reply: 'গ্রাহকের উত্তর প্রয়োজন',
          resolved: 'সমাধানকৃত (Resolved)',
          closed: 'বন্ধ (Closed)',
        };
        const statusBn = statusMap[status] || status;
        await communicationService.notifyAndEmail({
          userId: ticket.user_id,
          recipientEmail: userProf?.email,
          recipientName: userProf?.full_name,
          title: `সাপোর্ট টিকিট #${ticket.ticket_number}: ${statusBn}`,
          message: `আপনার টিকিট "${ticket.subject}"-এর অবস্থা পরিবর্তিত হয়ে "${statusBn}" হয়েছে।`,
          link: '/dashboard/support',
          category: 'support',
          templateType: 'system',
          templateData: {
            customMessage: `আপনার সহায়তা টিকিট #${ticket.ticket_number} ("${ticket.subject}")-এর অবস্থা পরিবর্তন করা হয়েছে। বর্তমান অবস্থা: ${statusBn}।`,
            actionUrl: `${window.location.origin}/dashboard/support`,
          },
          eventKey: `ticket_status_${ticketId}_${status}`,
        });
      }
    } catch (err) {
      console.warn('Ticket status notification failed:', err);
    }
  },

  async updateTicketPriority(ticketId: string, priority: TicketPriority, actorId?: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      await supabase.from('support_tickets').update({ priority, updated_at: now }).eq('id', ticketId);
      if (actorId) {
        await this.logAudit({
          actorId,
          action: 'TICKET_PRIORITY_UPDATED',
          targetType: 'ticket',
          targetId: ticketId,
          details: { new_priority: priority },
        });
      }
      return;
    }

    const all = getLS<SupportTicket[]>('tickets', []);
    const idx = all.findIndex((t) => t.id === ticketId);
    if (idx >= 0) {
      all[idx].priority = priority;
      all[idx].updated_at = now;
      setLS('tickets', all);
    }
  },

  async assignTicket(ticketId: string, assignedTo: string | null, actorId?: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      await supabase.from('support_tickets').update({ assigned_to: assignedTo, updated_at: now }).eq('id', ticketId);
      if (actorId) {
        await this.logAudit({
          actorId,
          action: 'TICKET_ASSIGNED',
          targetType: 'ticket',
          targetId: ticketId,
          details: { assigned_to: assignedTo },
        });
      }
      return;
    }

    const all = getLS<SupportTicket[]>('tickets', []);
    const idx = all.findIndex((t) => t.id === ticketId);
    if (idx >= 0) {
      all[idx].assigned_to = assignedTo;
      all[idx].updated_at = now;
      setLS('tickets', all);
    }
  },

  async reopenTicket(ticketId: string, userId: string, reason: string): Promise<void> {
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('support_tickets')
        .update({
          status: 'open',
          reopened_at: now,
          reopen_reason: reason,
          updated_at: now,
        })
        .eq('id', ticketId);

      await supabase.from('ticket_messages').insert({
        ticket_id: ticketId,
        sender_id: userId,
        sender_role: 'customer',
        message: `[টিকিট পুনরায় খোলা হয়েছে]: ${reason}`,
        is_internal: false,
      });
      return;
    }

    const all = getLS<SupportTicket[]>('tickets', []);
    const idx = all.findIndex((t) => t.id === ticketId);
    if (idx >= 0) {
      all[idx].status = 'open';
      all[idx].reopened_at = now;
      all[idx].reopen_reason = reason;
      all[idx].updated_at = now;
      setLS('tickets', all);

      const msgs = getLS<TicketMessage[]>(`ticket_msgs_${ticketId}`, []);
      msgs.push({
        id: `msg_${Date.now()}`,
        ticket_id: ticketId,
        sender_id: userId,
        sender_role: 'customer',
        message: `[টিকিট পুনরায় খোলা হয়েছে]: ${reason}`,
        is_internal: false,
        created_at: now,
      });
      setLS(`ticket_msgs_${ticketId}`, msgs);
    }
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
        return {
          ...INITIAL_PLATFORM_SETTINGS,
          ...(result as unknown as Partial<PlatformSettings>),
        };
      }
    }
    return getLS<PlatformSettings>('platform_settings', INITIAL_PLATFORM_SETTINGS);
  },

  async updateSettings(newSettings: Partial<PlatformSettings>, adminId: string): Promise<PlatformSettings> {
    const current = await this.getSettings();
    const merged: PlatformSettings = {
      ...current,
      ...newSettings,
      general: {
        ...current.general,
        ...(newSettings.general || {}),
      },
      payment_methods: {
        ...current.payment_methods,
        ...(newSettings.payment_methods || {}),
      },
    };

    if (isSupabaseConfigured && supabase) {
      if (newSettings.general) {
        await supabase.from('platform_settings').upsert({
          key: 'general',
          value: merged.general,
          updated_at: new Date().toISOString(),
        });
      }
      if (newSettings.payment_methods) {
        await supabase.from('platform_settings').upsert({
          key: 'payment_methods',
          value: merged.payment_methods,
          updated_at: new Date().toISOString(),
        });
      }
    }

    setLS('platform_settings', merged);

    // Audit log
    const auditLogs = getLS<AuditLog[]>('audit_logs', []);
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: adminId,
      action: 'UPDATE_PLATFORM_SETTINGS',
      target_type: 'platform_settings',
      target_id: 'general',
      details: { updated_by: adminId, timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
    setLS('audit_logs', auditLogs);

    return merged;
  },
};
