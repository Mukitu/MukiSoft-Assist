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
  OrderEvent,
  SupportTicket,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  AuditLog,
  AppNotification,
  PlatformSettings,
  UserRole,
  OrderStatus,
  OrderReview,
  OrderWorkMessage,
  PaymentMethodConfig,
  WorkerApplication,
  CommissionSettings,
  PayoutAccount,
  WithdrawalRequest,
  CompanyProfitRecord,
  SuspiciousChatFlag,
  BlogPost,
} from '../types/database';
import { INITIAL_CATEGORIES, INITIAL_SERVICES, INITIAL_PLATFORM_SETTINGS, INITIAL_BLOG_POSTS } from '../data/initialCatalog';
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
      // Reassign any services under this category to another category or null to prevent foreign key errors
      try {
        const allCats = await this.getCategories();
        const fallbackCat = allCats.find((c) => c.id !== id);
        if (fallbackCat) {
          await supabase.from('services').update({ category_id: fallbackCat.id }).eq('category_id', id);
        } else {
          await supabase.from('services').update({ category_id: null }).eq('category_id', id);
        }
      } catch (e) {
        console.warn('Reassigning services before category delete failed:', e);
      }

      const { error } = await supabase.from('service_categories').delete().eq('id', id);
      if (error) {
        console.warn('Direct category delete failed, soft deleting:', error.message);
        await supabase.from('service_categories').update({ is_active: false }).eq('id', id);
      }
      await this.getCategories();
      return true;
    }

    const current = getLS<ServiceCategory[]>('categories', INITIAL_CATEGORIES);
    const services = getLS<ServiceItem[]>('services', INITIAL_SERVICES);
    const fallbackCat = current.find((c) => c.id !== id);
    services.forEach((s) => {
      if (s.category_id === id) {
        s.category_id = fallbackCat?.id || '';
      }
    });
    setLS('services', services);
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
      try {
        // 1. Unlink existing orders referencing this service so foreign key constraint does not block
        try {
          await supabase.from('orders').update({ service_id: null }).eq('service_id', id);
        } catch (ordErr) {
          console.warn('Unlinking orders for service deletion error:', ordErr);
        }

        // 2. Delete child reviews and faqs if exist
        try { await supabase.from('service_reviews').delete().eq('service_id', id); } catch {}
        try { await supabase.from('service_faqs').delete().eq('service_id', id); } catch {}

        // 3. Delete from services table
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (error) {
          console.warn('Hard delete service failed, soft deleting:', error.message);
          await supabase.from('services').update({ is_active: false, slug: `deleted-${id}-${Date.now()}` }).eq('id', id);
        }
      } catch (err: any) {
        console.warn('deleteService exception:', err);
        try {
          await supabase.from('services').update({ is_active: false }).eq('id', id);
        } catch {}
      }
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
    const wallets = getLS<Record<string, Wallet>>('wallets', {});
    const localWallet = wallets[userId];

    if (isSupabaseConfigured && supabase) {
      const fetchRemoteWallet = async () => {
        try {
          if (!supabase) return;
          const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
          if (!error && data) {
            const remoteWallet = data as Wallet;
            const currentWallets = getLS<Record<string, Wallet>>('wallets', {});
            const oldWallet = currentWallets[userId];
            currentWallets[userId] = remoteWallet;
            setLS('wallets', currentWallets);

            if (!oldWallet || oldWallet.balance !== remoteWallet.balance || oldWallet.pending_balance !== remoteWallet.pending_balance) {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('wallet_updated'));
              }
            }
          }
        } catch (e) {
          console.warn('getWallet Supabase error:', e);
        }
      };

      if (localWallet) {
        // Stale-while-revalidate: return local instantly in 0ms!
        fetchRemoteWallet().catch(() => {});
        return localWallet;
      } else {
        await fetchRemoteWallet();
        const updatedWallets = getLS<Record<string, Wallet>>('wallets', {});
        if (updatedWallets[userId]) return updatedWallets[userId];
      }
    }

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

    const currentWallet = wallets[userId];
    const orders = getLS<Order[]>('orders', []);
    const userRefunded = orders.filter((o) => o.user_id === userId && o.status === 'refunded');
    const txs = getLS<WalletTransaction[]>('transactions', []);
    const creditedIds = new Set(txs.filter((t) => t.user_id === userId && t.type === 'refund').map((t) => String(t.reference_id)));
    const uncredited = userRefunded.filter((o) => !creditedIds.has(String(o.id)));

    if (uncredited.length > 0) {
      const addAmount = uncredited.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
      currentWallet.balance = (currentWallet.balance || 0) + addAmount;
      currentWallet.total_spent = Math.max(0, (currentWallet.total_spent || 0) - addAmount);
      currentWallet.updated_at = new Date().toISOString();

      for (const un of uncredited) {
        txs.unshift({
          id: `tx_rec_${Date.now()}_${un.id}`,
          wallet_id: currentWallet.id,
          user_id: userId,
          type: 'refund',
          amount: un.amount,
          balance_after: currentWallet.balance,
          status: 'completed',
          reference_id: un.id,
          reference_type: 'order',
          description: `অর্ডার রিফান্ড সমন্বয়: #${un.order_number}`,
          created_at: new Date().toISOString(),
        });
      }
      setLS('transactions', txs);
      setLS('wallets', wallets);
    }

    return currentWallet;
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
          slip_url: request.slipUrl?.trim() || null,
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
        slip_url: request.slipUrl?.trim() || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      current.unshift(newReq);
      setLS('deposit_requests', current);
    }

    // Keep local cache synced
    const currentLocal = getLS<DepositRequest[]>('deposit_requests', []);
    if (!currentLocal.some((r) => r.id === newReq.id)) {
      currentLocal.unshift(newReq);
      setLS('deposit_requests', currentLocal);
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
    let remoteReqs: DepositRequest[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('deposit_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          const userIds = Array.from(new Set(data.map((r: any) => r.user_id).filter(Boolean)));
          let profilesMap = new Map<string, Profile>();
          if (userIds.length > 0) {
            try {
              const { data: profs } = await supabase
                .from('profiles')
                .select('*')
                .in('id', userIds);
              if (profs && Array.isArray(profs)) {
                profs.forEach((p: Profile) => profilesMap.set(p.id, p));
              }
            } catch (pErr) {
              console.warn('Profile fetch warning in deposit requests:', pErr);
            }
          }

          remoteReqs = data.map((r: any) => {
            const prof = profilesMap.get(r.user_id);
            return {
              ...r,
              profile: prof || r.profile || undefined,
            };
          }) as DepositRequest[];
        } else if (error) {
          console.error('Error fetching deposit_requests from Supabase:', error);
        }
      } catch (err) {
        console.error('getAllDepositRequests exception:', err);
      }
    }

    const localReqs = getLS<DepositRequest[]>('deposit_requests', []);

    const mergedMap = new Map<string, DepositRequest>();
    remoteReqs.forEach((r) => mergedMap.set(r.id, r));
    localReqs.forEach((r) => {
      if (!mergedMap.has(r.id)) {
        mergedMap.set(r.id, r);
      }
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async approveDeposit(
    depositId: string,
    adminId: string,
    adminNotes?: string,
    approvedAmount?: number
  ): Promise<{ success: boolean; newBalance: number }> {
    let resultBalance = 0;
    let targetDeposit: DepositRequest | null = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.rpc('approve_deposit_request', {
          p_deposit_id: depositId,
          p_admin_notes: adminNotes || null,
          p_approved_amount: approvedAmount !== undefined ? approvedAmount : null,
        });
        if (error) throw error;
        resultBalance = data?.new_balance ?? 0;
      } catch (rpcErr) {
        console.warn('RPC approve_deposit_request failed, executing direct tables update fallback:', rpcErr);

        const { data: dep, error: depErr } = await supabase
          .from('deposit_requests')
          .select('*')
          .eq('id', depositId)
          .single();
        if (depErr || !dep) throw new Error(depErr?.message || 'Deposit request not found');

        const creditAmount = approvedAmount !== undefined && !isNaN(approvedAmount) && approvedAmount >= 0 ? approvedAmount : dep.amount;

        const { error: updateDepErr } = await supabase
          .from('deposit_requests')
          .update({
            status: 'approved',
            amount: creditAmount,
            admin_notes: adminNotes || 'Approved by administrator',
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', depositId);
        if (updateDepErr) throw new Error(updateDepErr.message);

        // Fetch or create wallet
        const { data: walletData } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', dep.user_id)
          .maybeSingle();

        if (walletData) {
          const newBal = (Number(walletData.balance) || 0) + creditAmount;
          const newTotal = (Number(walletData.total_deposited) || 0) + creditAmount;
          const { error: wErr } = await supabase
            .from('wallets')
            .update({
              balance: newBal,
              total_deposited: newTotal,
              updated_at: new Date().toISOString(),
            })
            .eq('id', walletData.id);
          if (wErr) throw new Error(wErr.message);
          resultBalance = newBal;
        } else {
          const newBal = creditAmount;
          const { error: wErr } = await supabase
            .from('wallets')
            .insert({
              user_id: dep.user_id,
              balance: newBal,
              pending_balance: 0,
              total_deposited: newBal,
              total_spent: 0,
              updated_at: new Date().toISOString(),
            });
          if (wErr) throw new Error(wErr.message);
          resultBalance = newBal;
        }

        // Insert wallet transaction
        await supabase.from('wallet_transactions').insert({
          user_id: dep.user_id,
          type: 'deposit',
          amount: creditAmount,
          balance_after: resultBalance,
          status: 'completed',
          reference_id: depositId,
          reference_type: 'deposit_request',
          description: `Approved deposit via ${dep.payment_method} (${dep.transaction_reference})`,
        });
      }

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

      const creditAmount = approvedAmount !== undefined && !isNaN(approvedAmount) && approvedAmount >= 0 ? approvedAmount : target.amount;
      const isAdjusted = creditAmount !== target.amount;

      target.status = 'approved';
      target.reviewed_by = adminId;
      target.reviewed_at = new Date().toISOString();
      const defaultNote = isAdjusted
        ? `অনুমোদিত পরিমাণ সমন্বিত: ৳${creditAmount} (দাবি ছিল: ৳${target.amount})`
        : 'Approved by administrator';
      target.admin_notes = adminNotes || defaultNote;
      target.amount = creditAmount;
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

      wallet.balance += creditAmount;
      wallet.total_deposited += creditAmount;
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
  // PAYMENT METHOD CONFIGURATIONS (SUPER ADMIN ONLY)
  // -------------------------------------------------------------
  // PAYMENT METHOD CONFIGURATIONS (SUPER ADMIN ONLY)
  // -------------------------------------------------------------
  async getPaymentMethodConfigs(): Promise<PaymentMethodConfig[]> {
    const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
      {
        id: 'bkash',
        name: 'bKash Send Money',
        type: 'mobile_banking',
        number_or_account: '01303595062',
        account_type_label: 'পার্সোনাল নম্বর (Send Money)',
        instructions: '১. বিকাশ অ্যাপ বা *247# এ যান\n২. Send Money নির্বাচন করুন\n৩. রেফারেন্সে আপনার ইমেইল বা ইউজার আইডি লিখুন\n৪. পিন চেপে পেমেন্ট সম্পন্ন করে TrxID সংরক্ষণ করুন।',
        is_active: true,
      },
      {
        id: 'nagad',
        name: 'নগদ (Nagad)',
        type: 'mobile_banking',
        number_or_account: '01800000000',
        account_type_label: 'মার্চেন্ট নম্বর (Merchant Pay)',
        instructions: '১. Nagad App অথবা *167# ডায়াল করে "Merchant Pay" নির্বাচন করুন।\n২. পেমেন্ট সম্পন্ন করে TrxID সংরক্ষণ করুন।',
        is_active: false,
      },
      {
        id: 'rocket',
        name: 'রকেট (Rocket)',
        type: 'mobile_banking',
        number_or_account: '01900000000',
        account_type_label: 'পার্সোনাল নম্বর (Send Money)',
        instructions: '১. Rocket App অথবা *322# ডায়াল করে "Send Money" নির্বাচন করুন।\n২. সফল পেমেন্টের পর TrxID সংগ্রহ করে ইনপুট দিন।',
        is_active: false,
      },
      {
        id: 'bank',
        name: 'ব্যাংক ট্রান্সফার (Bank Transfer)',
        type: 'bank_transfer',
        number_or_account: '11002233445566',
        account_type_label: 'The City Bank PLC (MukiSoft Technology Ltd.)',
        instructions: 'ব্যাংকের নাম: The City Bank PLC\nঅ্যাকাউন্টের নাম: MukiSoft Technology Ltd.\nঅ্যাকাউন্ট নম্বর: 11002233445566\nরাউটিং নম্বর: 085272183\nশাখা: গুলশান এভিনিউ, ঢাকা।\nNPSB / BEFTN বা ডিপোজিট স্লিপের ছবি ও তথ্য জমা দিন।',
        is_active: false,
      },
    ];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('payment_method_configs')
          .select('*');

        if (!error && data && data.length > 0) {
          const mapped: PaymentMethodConfig[] = data.map((row: any) => ({
            id: String(row.id),
            name: String(row.name || row.id),
            type: row.type === 'bank_transfer' ? 'bank_transfer' : 'mobile_banking',
            number_or_account: String(row.number || row.number_or_account || ''),
            account_type_label: String(row.account_type_label || (row.type === 'Personal' ? 'পার্সোনাল নম্বর (Send Money)' : row.type === 'Merchant' ? 'মার্চেন্ট নম্বর (Make Payment)' : (row.type || ''))),
            instructions: String(row.instructions || row.instruction || ''),
            is_active: Boolean(row.is_active),
          }));

          // Guarantee default standard templates exist as inactive if not in DB
          for (const d of DEFAULT_PAYMENT_METHODS) {
            if (!mapped.some((m) => m.id === d.id)) {
              mapped.push({ ...d, is_active: false });
            }
          }

          setLS('payment_method_configs', mapped);
          return mapped;
        }

        if (error) {
          console.warn('getPaymentMethodConfigs Supabase error, falling back to cache:', error.message);
        }
      } catch (err) {
        console.error('getPaymentMethodConfigs exception:', err);
      }
    }

    return getLS<PaymentMethodConfig[]>('payment_method_configs', DEFAULT_PAYMENT_METHODS);
  },

  async updatePaymentMethodConfigs(configs: PaymentMethodConfig[], requesterRole: UserRole): Promise<boolean> {
    if (requesterRole !== 'super_admin') {
      throw new Error('অনুমতি নেই: শুধুমাত্র সুপার অ্যাডমিন পেমেন্ট মেথড কনফিগারেশন পরিবর্তন করতে পারবেন।');
    }

    if (isSupabaseConfigured && supabase) {
      try {
        for (const c of configs) {
          const dbRow = {
            id: c.id,
            name: c.name,
            number: c.number_or_account,
            type: c.type === 'bank_transfer' ? 'bank_transfer' : (c.account_type_label?.includes('Merchant') ? 'Merchant' : 'Personal'),
            account_type_label: c.account_type_label,
            instructions: c.instructions,
            is_active: Boolean(c.is_active),
            updated_at: new Date().toISOString(),
          };

          const { error } = await supabase.from('payment_method_configs').upsert(dbRow, { onConflict: 'id' });
          if (error) {
            console.warn(`Supabase payment_method_configs upsert error for ${c.id}:`, error.message);
          }
        }

        // Also save to platform_settings if possible
        try {
          await supabase.from('platform_settings').upsert({
            key: 'payment_method_configs',
            value: configs,
            description: 'Payment method configurations and activation status',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'key' });
        } catch {
          // ignore RLS error if platform_settings protected
        }
      } catch (err: any) {
        console.warn('Failed to update payment_method_configs in Supabase:', err);
      }
    }

    setLS('payment_method_configs', configs);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('payment_configs_updated'));
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
      try {
        const { data, error } = await supabase.rpc('purchase_service_with_wallet', {
          p_service_id: serviceId,
          p_requirements_text: requirementsText,
          p_reference_link: referenceLink || null,
          p_attachment_name: attachmentName || null,
          p_attachment_url: attachmentUrl || null,
          p_idempotency_key: idempotencyKey,
        });
        if (error) throw error;
        orderId = data.order_id;
        orderNumber = data.order_number;
        remainingBalance = data.remaining_balance;
      } catch (rpcErr: any) {
        console.warn('RPC purchase_service_with_wallet failed, executing direct tables update fallback:', rpcErr);

        const service = await this.getServiceById(serviceId);
        if (!service) throw new Error('অনুরোধকৃত সেবাটি ক্যাটালগে পাওয়া যায়নি।');
        if (!service.is_active) throw new Error('এই সেবাটি বর্তমানে সাময়িকভাবে বন্ধ রয়েছে।');

        const finalPrice = service.promotional_price ?? service.price;
        const wallet = await this.getWallet(userId);
        if (wallet.balance < finalPrice) {
          throw new Error(`পর্যাপ্ত ওয়ালেট ব্যালেন্স নেই। আপনার বর্তমান ব্যালেন্স ৳ ${wallet.balance}, কিন্তু প্রয়োজনীয় মূল্য ৳ ${finalPrice}। দয়া করে আগে ওয়ালেটে টাকা জমা দিন।`);
        }

        orderNumber = `MS-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // 1. Debit wallet in Supabase
        const newBalance = wallet.balance - finalPrice;
        const newSpent = (wallet.total_spent || 0) + finalPrice;
        await supabase.from('wallets').update({
          balance: newBalance,
          total_spent: newSpent,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId);

        // 2. Insert order in Supabase
        let insertedOrder: any = null;
        const orderPayload = {
          order_number: orderNumber,
          user_id: userId,
          service_id: serviceId,
          amount: finalPrice,
          status: 'pending',
          requirements_submitted: requirementsText,
          reference_link: referenceLink || null,
          attachment_name: attachmentName || null,
          attachment_url: attachmentUrl || null,
          idempotency_key: idempotencyKey,
        };

        const res1 = await supabase.from('orders').insert(orderPayload).select().single();
        if (res1.error) {
          // If 'pending' status fails due to enum, try 'accepted'
          const res2 = await supabase.from('orders').insert({ ...orderPayload, status: 'accepted' }).select().single();
          if (res2.error) {
            throw new Error(res1.error.message || res2.error.message);
          }
          insertedOrder = res2.data;
        } else {
          insertedOrder = res1.data;
        }

        orderId = insertedOrder.id;
        remainingBalance = newBalance;

        // 3. Record transaction in Supabase
        await supabase.from('wallet_transactions').insert({
          wallet_id: wallet.id,
          user_id: userId,
          type: 'service_purchase',
          amount: -finalPrice,
          balance_after: newBalance,
          status: 'completed',
          reference_id: orderId,
          reference_type: 'order',
          description: `সেবা ক্রয়: ${service.title_bn || service.title} (অর্ডার #${orderNumber})`,
        });

        // 4. Record order event
        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: userId,
          event_type: 'ORDER_CREATED',
          message: `অর্ডার গ্রহণ সম্পন্ন হয়েছে এবং ওয়ালেট এসক্রো থেকে ৳ ${finalPrice} পরিশোধ করা হয়েছে।`,
        });
      }
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
        status: 'pending',
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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orders_updated'));
    }

    // Non-blocking background notification
    Promise.resolve().then(async () => {
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
    });

    return {
      success: true,
      orderId,
      orderNumber,
      remainingBalance,
    };
  },

  async enrichOrders(rawOrders: any[]): Promise<Order[]> {
    if (!rawOrders || rawOrders.length === 0) return [];

    const serviceIds = Array.from(new Set(rawOrders.map((o) => o.service_id).filter(Boolean)));
    const userIds = Array.from(new Set(rawOrders.map((o) => o.user_id).filter(Boolean)));
    const orderIds = Array.from(new Set(rawOrders.map((o) => o.id).filter(Boolean)));

    const servicesMap = new Map<string, ServiceItem>();
    const profilesMap = new Map<string, Profile>();
    const deliverablesMap = new Map<string, OrderDeliverable[]>();
    const eventsMap = new Map<string, OrderEvent[]>();
    const refundedOrderIds = new Set<string>();
    const completedByProfitOrderIds = new Set<string>();

    if (isSupabaseConfigured && supabase) {
      try {
        const promises: Promise<any>[] = [];

        if (serviceIds.length > 0) {
          promises.push(
            (async () => {
              try {
                const { data } = await supabase.from('services').select('*').in('id', serviceIds);
                if (data) data.forEach((s: ServiceItem) => servicesMap.set(s.id, s));
              } catch {}
            })()
          );
        }

        if (userIds.length > 0) {
          promises.push(
            (async () => {
              try {
                const { data } = await supabase.from('profiles').select('*').in('id', userIds);
                if (data) data.forEach((p: Profile) => profilesMap.set(p.id, p));
              } catch {}
            })()
          );
        }

        if (orderIds.length > 0) {
          promises.push(
            (async () => {
              try {
                const { data } = await supabase.from('order_deliverables').select('*').in('order_id', orderIds);
                if (data) {
                  data.forEach((d: OrderDeliverable) => {
                    const list = deliverablesMap.get(d.order_id) || [];
                    list.push(d);
                    deliverablesMap.set(d.order_id, list);
                  });
                }
              } catch {}
            })()
          );

          promises.push(
            (async () => {
              try {
                const { data } = await supabase.from('order_events').select('*').in('order_id', orderIds);
                if (data) {
                  data.forEach((e: OrderEvent) => {
                    const list = eventsMap.get(e.order_id) || [];
                    list.push(e);
                    eventsMap.set(e.order_id, list);
                  });
                }
              } catch {}
            })()
          );

          promises.push(
            (async () => {
              try {
                const { data } = await supabase
                  .from('wallet_transactions')
                  .select('reference_id')
                  .in('reference_id', orderIds)
                  .eq('type', 'refund');
                if (data) {
                  data.forEach((t: { reference_id: string }) => {
                    if (t.reference_id) refundedOrderIds.add(t.reference_id);
                  });
                }
              } catch {}
            })()
          );

          promises.push(
            (async () => {
              try {
                const { data } = await supabase
                  .from('company_profit_records')
                  .select('order_id')
                  .in('order_id', orderIds);
                if (data) {
                  data.forEach((p: { order_id: string }) => {
                    if (p.order_id) completedByProfitOrderIds.add(p.order_id);
                  });
                }
              } catch {}
            })()
          );
        }

        await Promise.all(promises);
      } catch (err) {
        console.warn('enrichOrders parallel fetch warning:', err);
      }
    }

    const localOrders = getLS<Order[]>('orders', []);
    const localCompletedSet = new Set(localOrders.filter((o) => o.status === 'completed').map((o) => o.id));

    return rawOrders.map((o) => {
      let status = o.status;
      const deliverablesList = deliverablesMap.get(o.id) || o.deliverables || [];
      const evts = eventsMap.get(o.id) || o.events || [];
      const hasCompletedEvent = evts.some((e: OrderEvent) => e.event_type === 'ORDER_COMPLETED');
      const hasProfitRecord = completedByProfitOrderIds.has(o.id);
      const isLocalCompleted = localCompletedSet.has(o.id);

      const hasDeliverables = deliverablesList.length > 0;
      const isCompleted =
        (status === 'completed' ||
          hasCompletedEvent ||
          hasProfitRecord ||
          isLocalCompleted ||
          Boolean(o.completed_at)) &&
        (hasDeliverables || Boolean(o.completed_at));

      const isRefundedOrCancelled =
        refundedOrderIds.has(o.id) ||
        (o.refund_amount && Number(o.refund_amount) > 0) ||
        Boolean(o.cancellation_reason) ||
        o.status === 'cancelled' ||
        o.status === 'refunded';

      if (isCompleted) {
        status = 'completed';
        if (isSupabaseConfigured && supabase && o.status !== 'completed') {
          Promise.resolve(
            supabase
              .from('orders')
              .update({
                status: 'completed',
                completed_at: o.completed_at || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', o.id)
          ).catch(() => {});
        }
      } else if (isRefundedOrCancelled) {
        status = 'refunded';
        if (isSupabaseConfigured && supabase && o.status !== 'cancelled') {
          Promise.resolve(
            supabase
              .from('orders')
              .update({ status: 'cancelled', refund_amount: o.amount })
              .eq('id', o.id)
          ).catch(() => {});
        }
      } else if (hasDeliverables && !['completed', 'cancelled', 'refunded', 'revision_requested'].includes(status)) {
        status = 'delivered';
        if (isSupabaseConfigured && supabase && o.status !== 'delivered') {
          Promise.resolve(
            supabase
              .from('orders')
              .update({ status: 'delivered', updated_at: new Date().toISOString() })
              .eq('id', o.id)
          ).catch(() => {});
        }
      } else if (o.assigned_admin && (status === 'completed' || status === 'accepted' || status === 'pending')) {
        status = 'in_progress';
        if (isSupabaseConfigured && supabase && o.status !== 'in_progress') {
          Promise.resolve(
            supabase
              .from('orders')
              .update({ status: 'in_progress', updated_at: new Date().toISOString() })
              .eq('id', o.id)
          ).catch(() => {});
        }
      }

      const finalAttachmentUrl = o.attachment_url || o.brief_attachment_url || o.file_url || o.requirements_attachment_url || null;
      const finalAttachmentName = o.attachment_name || o.brief_attachment_name || o.file_name || (finalAttachmentUrl ? 'Attachment.pdf' : null);

      return {
        ...o,
        attachment_url: finalAttachmentUrl,
        attachment_name: finalAttachmentName,
        status,
        service: servicesMap.get(o.service_id) || o.service || undefined,
        customer: profilesMap.get(o.user_id) || o.customer || undefined,
        deliverables: deliverablesList,
        events: evts,
      };
    }) as Order[];
  },

  async getUserOrders(userId: string): Promise<Order[]> {
    await this.checkAndAutoCompleteOrders();
    let remoteOrders: Order[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (!error && data && Array.isArray(data)) {
          remoteOrders = await this.enrichOrders(data);
        }
      } catch (err) {
        console.error('getUserOrders exception:', err);
      }
    }
    const localOrders = getLS<Order[]>('orders', []).filter((o) => o.user_id === userId);
    const map = new Map<string, Order>();
    remoteOrders.forEach((o) => map.set(o.id, o));
    localOrders.forEach((o) => {
      if (!map.has(o.id)) {
        map.set(o.id, o);
      } else {
        const remote = map.get(o.id)!;
        let finalStatus = remote.status;
        const hasDelivs = Boolean((remote.deliverables && remote.deliverables.length > 0) || (o.deliverables && o.deliverables.length > 0));
        const isGenuinelyCompleted = (remote.status === 'completed' || o.status === 'completed') && (hasDelivs || Boolean(remote.completed_at || o.completed_at));

        if (remote.status === 'refunded' || o.status === 'refunded') {
          finalStatus = 'refunded';
        } else if (remote.status === 'cancelled' || o.status === 'cancelled') {
          finalStatus = 'cancelled';
        } else if (isGenuinelyCompleted) {
          finalStatus = 'completed';
        } else if ((o.assigned_admin || remote.assigned_admin) && (finalStatus === 'completed' || finalStatus === 'accepted' || finalStatus === 'pending')) {
          finalStatus = 'in_progress';
        }
        map.set(o.id, {
          ...remote,
          status: finalStatus,
          cancellation_reason: o.cancellation_reason || remote.cancellation_reason,
          refund_amount: o.refund_amount || remote.refund_amount,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getAllOrders(): Promise<Order[]> {
    await this.checkAndAutoCompleteOrders();
    let remoteOrders: Order[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          remoteOrders = await this.enrichOrders(data);
        } else if (error) {
          console.error('Error fetching orders from Supabase:', error);
        }
      } catch (err) {
        console.error('getAllOrders exception:', err);
      }
    }

    const localOrders = getLS<Order[]>('orders', []);
    const map = new Map<string, Order>();
    remoteOrders.forEach((o) => map.set(o.id, o));
    localOrders.forEach((o) => {
      if (!map.has(o.id)) {
        map.set(o.id, o);
      } else {
        const remote = map.get(o.id)!;
        // টার্মিনাল স্ট্যাটাস অগ্রাধিকার: একবার কোনো অর্ডার বাতিল, রিফান্ড বা সমাপ্ত হলে তা আর রিভার্ট হবে না
        let finalStatus = remote.status;
        const hasDelivs = Boolean((remote.deliverables && remote.deliverables.length > 0) || (o.deliverables && o.deliverables.length > 0));
        const isGenuinelyCompleted = (remote.status === 'completed' || o.status === 'completed') && (hasDelivs || Boolean(remote.completed_at || o.completed_at));

        if (remote.status === 'refunded' || o.status === 'refunded') {
          finalStatus = 'refunded';
        } else if (remote.status === 'cancelled' || o.status === 'cancelled') {
          finalStatus = 'cancelled';
        } else if (isGenuinelyCompleted) {
          finalStatus = 'completed';
        } else if ((o.assigned_admin || remote.assigned_admin) && (finalStatus === 'completed' || finalStatus === 'accepted' || finalStatus === 'pending')) {
          finalStatus = 'in_progress';
        }

        map.set(o.id, {
          ...remote,
          assigned_admin: o.assigned_admin || remote.assigned_admin,
          assigned_admin_name: o.assigned_admin_name || remote.assigned_admin_name,
          assigned_admin_email: o.assigned_admin_email || remote.assigned_admin_email,
          claimed_at: o.claimed_at || remote.claimed_at,
          status: finalStatus,
          cancellation_reason: o.cancellation_reason || remote.cancellation_reason,
          refund_amount: o.refund_amount || remote.refund_amount,
        });
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getOrderById(orderId: string, currentUserId?: string, isAdmin?: boolean): Promise<Order | null> {
    const localOrders = getLS<Order[]>('orders', []);
    const localFound = localOrders.find((o) => o.id === orderId);

    let resultOrder: Order | null = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle();

        if (!error && data) {
          if (currentUserId && !isAdmin && data.user_id !== currentUserId) {
            return null; // unauthorized access
          }
          const enriched = await this.enrichOrders([data]);
          resultOrder = enriched[0] || (data as Order);
        }
      } catch (err) {
        console.error('getOrderById exception:', err);
      }
    }

    if (!resultOrder) {
      resultOrder = localFound || null;
      if (resultOrder && resultOrder.assigned_admin && (!resultOrder.deliverables || resultOrder.deliverables.length === 0) && !resultOrder.completed_at) {
        if (['completed', 'accepted', 'pending'].includes(resultOrder.status)) {
          resultOrder.status = 'in_progress';
        }
      }
    } else if (localFound) {
      const mergedDeliverables = (resultOrder.deliverables && resultOrder.deliverables.length > 0)
        ? resultOrder.deliverables
        : (localFound.deliverables || []);
      const hasDelivs = mergedDeliverables.length > 0;
      const isGenuinelyCompleted = (localFound.status === 'completed' || resultOrder.status === 'completed') && (hasDelivs || Boolean(localFound.completed_at || resultOrder.completed_at));

      let finalStatus = resultOrder.status;
      if (localFound.status === 'refunded' || resultOrder.status === 'refunded') {
        finalStatus = 'refunded';
      } else if (localFound.status === 'cancelled' || resultOrder.status === 'cancelled') {
        finalStatus = 'cancelled';
      } else if (isGenuinelyCompleted) {
        finalStatus = 'completed';
      } else if ((resultOrder.assigned_admin || localFound.assigned_admin) && (finalStatus === 'completed' || finalStatus === 'accepted' || finalStatus === 'pending')) {
        finalStatus = 'in_progress';
      }

      resultOrder = {
        ...resultOrder,
        status: finalStatus,
        completed_at: localFound.completed_at || resultOrder.completed_at,
        delivered_at: localFound.delivered_at || resultOrder.delivered_at,
        auto_completed_after_48h: localFound.auto_completed_after_48h ?? resultOrder.auto_completed_after_48h,
        cancellation_reason: localFound.cancellation_reason || resultOrder.cancellation_reason,
        refund_amount: localFound.refund_amount || resultOrder.refund_amount,
        deliverables: mergedDeliverables,
      };
    }

    if (!resultOrder) return null;
    if (currentUserId && !isAdmin && resultOrder.user_id !== currentUserId) {
      return null; // unauthorized access
    }

    // ৪৮ ঘণ্টার অটো-কমপ্লিশন চেক
    if (resultOrder.status === 'delivered') {
      const deliveredAtStr = resultOrder.delivered_at || resultOrder.deliverables?.[0]?.created_at || resultOrder.updated_at || resultOrder.created_at;
      const deliveredMs = new Date(deliveredAtStr).getTime();
      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
      if (!isNaN(deliveredMs) && Date.now() - deliveredMs >= FORTY_EIGHT_HOURS_MS) {
        resultOrder.status = 'completed';
        resultOrder.completed_at = new Date().toISOString();
        resultOrder.auto_completed_after_48h = true;
        this.distributeOrderCommission(resultOrder).catch(() => {});
      }
    }

    return resultOrder;
  },

  async updateOrderStatus(orderId: string, status: OrderStatus, adminId: string, eventMessage?: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
        if (error) {
          console.warn('Supabase updateOrderStatus warning:', error.message);
        }
        if (eventMessage) {
          try {
            await supabase.from('order_events').insert({
              order_id: orderId,
              actor_id: adminId,
              event_type: 'STATUS_UPDATED',
              message: eventMessage,
            });
          } catch (eventErr) {
            console.warn('Order event insert error:', eventErr);
          }
        }
      } catch (err) {
        console.warn('updateOrderStatus Supabase exception:', err);
      }
    }

    // Always keep LocalStorage and in-memory state updated
    const orders = getLS<Order[]>('orders', []);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = status;
      order.updated_at = new Date().toISOString();
      if (!order.events) order.events = [];
      order.events.unshift({
        id: `event_${Date.now()}`,
        order_id: orderId,
        actor_id: adminId,
        event_type: 'STATUS_UPDATED',
        message: eventMessage || `অর্ডারের অবস্থা পরিবর্তন করা হয়েছে: ${status}`,
        created_at: new Date().toISOString(),
      });
      setLS('orders', orders);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orders_updated'));
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

  /**
   * মাল্টি-অ্যাডমিন অর্ডার ক্লেইম / সেলফ-অ্যাসাইন (Claim Order)
   * ২০-৩০ জন অ্যাডমিনের মধ্যে যিনি কাজটি পারবেন তিনি এক ক্লিকে নিজের দায়িত্বে নিয়ে নেবেন।
   * কাজটি ইতিমধ্যে অন্য কেউ নিলে সিস্টেম স্বয়ংক্রিয়ভাবে লক করে দেবে।
   */
  async claimOrder(orderId: string, adminId: string, adminName: string, adminEmail?: string): Promise<Order> {
    const existing = await this.getOrderById(orderId, undefined, true);
    if (!existing) throw new Error('অর্ডারটি পাওয়া যায়নি।');

    if (existing.assigned_admin && existing.assigned_admin !== adminId) {
      throw new Error(`এই কাজটি ইতিমধ্যে অন্য একজন কর্মকর্তা/ওয়ার্কার (${existing.assigned_admin_name || 'অন্য কর্মকর্তা'}) গ্রহণ করেছেন। ডুপ্লিকেট কাজ এড়াতে এটি লক করা হয়েছে।`);
    }

    // ক্লেইম লিমিট নীতি চেক: একজন ওয়ার্কার/অ্যাডমিন একসাথে ১টির বেশি চলমান কাজ ক্লেইম রাখতে পারবে না
    const allOrders = await this.getAllOrders();
    const activeClaimedOrder = allOrders.find(
      (o: Order) =>
        o.assigned_admin === adminId &&
        ['accepted', 'in_progress', 'review', 'in_review', 'revision_requested'].includes(o.status) &&
        o.id !== orderId
    );
    if (activeClaimedOrder) {
      throw new Error(
        `আপনি ইতিমধ্যে অর্ডার #${activeClaimedOrder.order_number} ক্লেইম করে রেখেছেন। কাজের মান বজায় রাখতে এবং একচেটিয়া কাজ আটকানোতে এই কাজটি ডেলিভারি করার পরেই নতুন কাজ গ্রহণ করতে পারবেন।`
      );
    }

    const now = new Date().toISOString();
    const newStatus: OrderStatus = ['pending', 'accepted'].includes(existing.status) ? 'in_progress' : existing.status;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('orders')
          .update({
            assigned_admin: adminId,
            assigned_admin_name: adminName,
            assigned_admin_email: adminEmail || null,
            claimed_at: now,
            status: newStatus,
            updated_at: now,
          })
          .eq('id', orderId);

        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: adminId,
          event_type: 'ORDER_CLAIMED',
          message: `স্পেশালিস্ট অ্যাডমিন "${adminName}" কাজটি নিজের দায়িত্বে গ্রহণ করেছেন এবং কাজের দায়িত্ব নিয়েছেন।`,
        });
      } catch (err) {
        console.warn('Supabase claim order error:', err);
      }
    }

    // Local storage fallback sync
    const orders = getLS<Order[]>('orders', []);
    const idx = orders.findIndex((o) => o.id === orderId);
    let updatedOrder: Order;
    if (idx >= 0) {
      orders[idx] = {
        ...orders[idx],
        assigned_admin: adminId,
        assigned_admin_name: adminName,
        assigned_admin_email: adminEmail || null,
        claimed_at: now,
        status: newStatus,
        updated_at: now,
      };
      if (!orders[idx].events) orders[idx].events = [];
      orders[idx].events!.unshift({
        id: `evt_claim_${Date.now()}`,
        order_id: orderId,
        actor_id: adminId,
        event_type: 'ORDER_CLAIMED',
        message: `স্পেশালিস্ট অ্যাডমিন "${adminName}" কাজটি নিজের দায়িত্বে গ্রহণ করেছেন এবং কাজের দায়িত্ব নিয়েছেন।`,
        created_at: now,
      });
      setLS('orders', orders);
      updatedOrder = orders[idx];
    } else {
      updatedOrder = {
        ...existing,
        assigned_admin: adminId,
        assigned_admin_name: adminName,
        assigned_admin_email: adminEmail || null,
        claimed_at: now,
        status: newStatus,
        updated_at: now,
      };
      orders.unshift(updatedOrder);
      setLS('orders', orders);
    }

    // গ্রাহককে নোটিফিকেশন পাঠানো যে স্পেশালিস্ট অ্যাডমিন তার কাজ শুরু করেছেন
    try {
      const userProf = await this.getUserProfile(existing.user_id);
      await communicationService.notifyAndEmail({
        userId: existing.user_id,
        recipientEmail: userProf?.email,
        recipientName: userProf?.full_name,
        title: 'আপনার অর্ডারে স্পেশালিস্ট অ্যাডমিন যুক্ত হয়েছেন',
        message: `আপনার অর্ডার #${existing.order_number}-এর কাজ পরিচালনার দায়িত্ব নিয়েছেন স্পেশালিস্ট অ্যাডমিন "${adminName}"। আপনি ওনার সাথে যেকোনো বিষয়ে সরাসরি অর্ডার চ্যাটে কথা বলতে পারবেন।`,
        link: `/dashboard/orders/${orderId}`,
        category: 'orders',
        templateType: 'order_status',
        templateData: {
          orderNumber: existing.order_number,
          statusBengali: 'স্পেশালিস্ট নির্ধারিত',
          statusNote: `দায়িত্বপ্রাপ্ত অ্যাডমিন: ${adminName}`,
          actionUrl: `${window.location.origin}/dashboard/orders/${orderId}`,
        },
        eventKey: `order_claimed_${orderId}`,
      });
    } catch (err) {
      console.warn('Claim notification failed:', err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('order_claimed', { detail: { orderId, order: updatedOrder } }));
      window.dispatchEvent(new CustomEvent('orders_updated'));
      window.dispatchEvent(new CustomEvent('wallet_updated'));
    }

    return updatedOrder;
  },

  /**
   * অর্ডার রিলিজ / আন-অ্যাসাইন করা (যাতে অন্য কোনো যোগ্য অ্যাডমিন নিতে পারেন)
   */
  async releaseOrder(orderId: string, adminId: string, isSuperAdmin?: boolean): Promise<Order> {
    const existing = await this.getOrderById(orderId, undefined, true);
    if (!existing) throw new Error('অর্ডারটি পাওয়া যায়নি।');

    if (!isSuperAdmin && existing.assigned_admin && existing.assigned_admin !== adminId) {
      throw new Error('আপনি এই অর্ডারের দায়িত্বপ্রাপ্ত নন। শুধুমাত্র নির্ধারিত অ্যাডমিন বা সুপার অ্যাডমিন রিলিজ করতে পারবেন।');
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('orders')
          .update({
            assigned_admin: null,
            assigned_admin_name: null,
            assigned_admin_email: null,
            claimed_at: null,
            updated_at: now,
          })
          .eq('id', orderId);

        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: adminId,
          event_type: 'ORDER_RELEASED',
          message: `অর্ডারটি অ্যাডমিন পুলের জন্য উন্মুক্ত করা হয়েছে যাতে অন্য একজন স্পেশালিস্ট দায়িত্ব নিতে পারেন।`,
        });
      } catch (err) {
        console.warn('Supabase release order error:', err);
      }
    }

    const orders = getLS<Order[]>('orders', []);
    const idx = orders.findIndex((o) => o.id === orderId);
    let updatedOrder: Order;
    if (idx >= 0) {
      orders[idx] = {
        ...orders[idx],
        assigned_admin: null,
        assigned_admin_name: null,
        assigned_admin_email: null,
        claimed_at: null,
        updated_at: now,
      };
      if (!orders[idx].events) orders[idx].events = [];
      orders[idx].events!.unshift({
        id: `evt_release_${Date.now()}`,
        order_id: orderId,
        actor_id: adminId,
        event_type: 'ORDER_RELEASED',
        message: `অর্ডারটি অ্যাডমিন পুলের জন্য উন্মুক্ত করা হয়েছে যাতে অন্য একজন স্পেশালিস্ট দায়িত্ব নিতে পারেন।`,
        created_at: now,
      });
      setLS('orders', orders);
      updatedOrder = orders[idx];
    } else {
      updatedOrder = {
        ...existing,
        assigned_admin: null,
        assigned_admin_name: null,
        assigned_admin_email: null,
        claimed_at: null,
        updated_at: now,
      };
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('order_released', { detail: { orderId, order: updatedOrder } }));
      window.dispatchEvent(new CustomEvent('orders_updated'));
    }

    return updatedOrder;
  },

  /**
   * গ্রাহক কর্তৃক কাজ অনুমোদন ও সম্পন্ন ঘোষণা (Delivery Confirmation)
   */
  async confirmOrderCompletion(orderId: string, userId: string): Promise<Order> {
    const existing = await this.getOrderById(orderId, undefined, true);
    if (!existing) throw new Error('অর্ডার পাওয়া যায়নি।');

    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('orders')
          .update({
            status: 'completed',
            completed_at: now,
            updated_at: now,
          })
          .eq('id', orderId);

        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: userId,
          event_type: 'ORDER_COMPLETED',
          message: 'গ্রাহক ডেলিভারিকৃত কাজ যাচাই করে সন্তুষ্টি প্রকাশ করেছেন এবং অর্ডারটি সম্পন্ন করেছেন।',
        });
      } catch (err) {
        console.warn('Supabase confirm completion error:', err);
      }
    }

    const orders = getLS<Order[]>('orders', []);
    const idx = orders.findIndex((o) => o.id === orderId);
    let updatedOrder: Order;
    if (idx >= 0) {
      orders[idx] = {
        ...orders[idx],
        status: 'completed',
        completed_at: now,
        updated_at: now,
      };
      if (!orders[idx].events) orders[idx].events = [];
      orders[idx].events!.unshift({
        id: `evt_comp_${Date.now()}`,
        order_id: orderId,
        actor_id: userId,
        event_type: 'ORDER_COMPLETED',
        message: 'গ্রাহক ডেলিভারিকৃত কাজ যাচাই করে সন্তুষ্টি প্রকাশ করেছেন এবং অর্ডারটি সম্পন্ন করেছেন।',
        created_at: now,
      });
      setLS('orders', orders);
      updatedOrder = orders[idx];
    } else {
      updatedOrder = {
        ...existing,
        status: 'completed',
        completed_at: now,
        updated_at: now,
      };
      orders.unshift(updatedOrder);
      setLS('orders', orders);
    }

    // কাজের কমিশন ও কোম্পানির লাভ স্বয়ংক্রিয়ভাবে ক্রেডিট ও ডিস্ট্রিবিউট করা
    try {
      await this.distributeOrderCommission(updatedOrder);
    } catch (err) {
      console.warn('Commission distribution error:', err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orders_updated'));
      window.dispatchEvent(new CustomEvent('wallet_updated'));
    }

    // অ্যাডমিন বা ওয়ার্কারকে নোটিফাই করা
    if (existing.assigned_admin) {
      try {
        await communicationService.notifyAndEmail({
          userId: existing.assigned_admin,
          title: 'গ্রাহক কাজ সম্পন্ন হিসেবে অনুমোদন করেছেন! 🎉',
          message: `আপনার সম্পন্নকৃত অর্ডার #${existing.order_number} গ্রাহক অনুমোদন করেছেন। আপনি এখন গ্রাহককে একটি রিভিউ প্রদান করতে পারেন।`,
          link: `/admin/orders`,
          category: 'orders',
        });
      } catch (err) {
        console.warn('Admin complete notify error:', err);
      }
    }

    return updatedOrder;
  },

  /**
   * ৪৮ ঘণ্টা পার হওয়া ডেলিভারিকৃত অর্ডার স্বয়ংক্রিয়ভাবে সম্পন্ন করা
   * গ্রাহক যদি ৪৮ ঘণ্টার মধ্যে অনুমোদন বা রিভিশন না চান, তবে সিস্টেম স্বয়ংক্রিয়ভাবে
   * অর্ডারটি সম্পন্ন করবে এবং ওয়ার্কার/অ্যাডমিনের অ্যাকাউন্টে সম্পূর্ণ টাকা হস্তান্তর করবে।
   */
  async checkAndAutoCompleteOrders(): Promise<void> {
    try {
      const orders = getLS<Order[]>('orders', []);
      const nowMs = Date.now();
      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
      let hasChanges = false;

      for (const order of orders) {
        if (order.status === 'delivered') {
          const deliveredAtStr = order.delivered_at || order.deliverables?.[0]?.created_at || order.updated_at || order.created_at;
          const deliveredMs = new Date(deliveredAtStr).getTime();

          if (!isNaN(deliveredMs) && nowMs - deliveredMs >= FORTY_EIGHT_HOURS_MS) {
            const nowIso = new Date().toISOString();
            order.status = 'completed';
            order.completed_at = nowIso;
            order.updated_at = nowIso;
            order.auto_completed_after_48h = true;

            if (!order.events) order.events = [];
            order.events.unshift({
              id: `evt_auto_comp_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
              order_id: order.id,
              actor_id: 'system',
              event_type: 'ORDER_COMPLETED',
              message: '৪৮ ঘণ্টা পার হয়ে যাওয়ায় সিস্টেম স্বয়ংক্রিয়ভাবে অর্ডারটি সম্পন্ন ঘোষণা করেছে এবং দায়িত্বপ্রাপ্ত স্পেশালিস্টের অ্যাকাউন্টে টাকা স্থানান্তর করেছে।',
              created_at: nowIso,
            });

            try {
              await this.distributeOrderCommission(order);
            } catch (distErr) {
              console.warn('Auto-complete commission distribute error:', distErr);
            }

            if (isSupabaseConfigured && supabase) {
              try {
                await supabase
                  .from('orders')
                  .update({
                    status: 'completed',
                    completed_at: nowIso,
                    updated_at: nowIso,
                  })
                  .eq('id', order.id);

                await supabase.from('order_events').insert({
                  order_id: order.id,
                  actor_id: 'system',
                  event_type: 'ORDER_COMPLETED',
                  message: '৪৮ ঘণ্টা পার হয়ে যাওয়ায় সিস্টেম স্বয়ংক্রিয়ভাবে অর্ডারটি সম্পন্ন ঘোষণা করেছে এবং দায়িত্বপ্রাপ্ত স্পেশালিস্টের অ্যাকাউন্টে টাকা স্থানান্তর করেছে।',
                });
              } catch (sbErr) {
                console.warn('Supabase auto-complete sync error:', sbErr);
              }
            }

            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        setLS('orders', orders);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('orders_updated'));
          window.dispatchEvent(new CustomEvent('wallet_updated'));
        }
      }
    } catch (e) {
      console.warn('checkAndAutoCompleteOrders exception:', e);
    }
  },

  /**
   * মিউচুয়াল রিভিউ সাবমিশন (গ্রাহক বা অ্যাডমিন উভয়ই রিভিউ দিতে পারেন)
   */
  async submitOrderReview(
    orderId: string,
    reviewerId: string,
    reviewerName: string,
    reviewerRole: 'customer' | 'admin',
    rating: number,
    comment: string
  ): Promise<OrderReview> {
    const existing = await this.getOrderById(orderId, undefined, true);
    if (!existing) throw new Error('অর্ডার পাওয়া যায়নি।');

    const cleanRating = Math.max(1, Math.min(5, Math.round(rating)));
    const now = new Date().toISOString();

    const review: OrderReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order_id: orderId,
      reviewer_id: reviewerId,
      reviewer_name: reviewerName,
      reviewer_role: reviewerRole,
      rating: cleanRating,
      comment: comment.trim(),
      created_at: now,
    };

    const updateField = reviewerRole === 'customer' ? { customer_review: review } : { admin_review: review };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('orders').update({ ...updateField, updated_at: now }).eq('id', orderId);
        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: reviewerId,
          event_type: 'REVIEW_SUBMITTED',
          message: reviewerRole === 'customer'
            ? `গ্রাহক কাজের মানের ওপর ${cleanRating}★ রিভিউ জমা দিয়েছেন: "${comment.trim()}"`
            : `দায়িত্বপ্রাপ্ত অ্যাডমিন গ্রাহকের ওপর ${cleanRating}★ মূল্যায়ন জমা দিয়েছেন: "${comment.trim()}"`,
        });
      } catch (err) {
        console.warn('Supabase review submit error:', err);
      }
    }

    const orders = getLS<Order[]>('orders', []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      if (reviewerRole === 'customer') {
        orders[idx].customer_review = review;
      } else {
        orders[idx].admin_review = review;
      }
      if (!orders[idx].events) orders[idx].events = [];
      orders[idx].events!.unshift({
        id: `evt_rev_${Date.now()}`,
        order_id: orderId,
        actor_id: reviewerId,
        event_type: 'REVIEW_SUBMITTED',
        message: reviewerRole === 'customer'
          ? `গ্রাহক কাজের মানের ওপর ${cleanRating}★ রিভিউ জমা দিয়েছেন: "${comment.trim()}"`
          : `দায়িত্বপ্রাপ্ত অ্যাডমিন গ্রাহকের ওপর ${cleanRating}★ মূল্যায়ন জমা দিয়েছেন: "${comment.trim()}"`,
        created_at: now,
      });
      setLS('orders', orders);
    }

    // প্রতিপক্ষকে নোটিফিকেশন পাঠানো
    try {
      const recipientId = reviewerRole === 'customer' ? existing.assigned_admin : existing.user_id;
      if (recipientId) {
        await communicationService.notifyAndEmail({
          userId: recipientId,
          title: reviewerRole === 'customer' ? 'গ্রাহক আপনাকে একটি রিভিউ দিয়েছেন! ⭐' : 'অ্যাডমিন আপনাকে একটি রিভিউ প্রদান করেছেন! ⭐',
          message: `অর্ডার #${existing.order_number}-এ ${cleanRating}★ রেটিং ও মন্তব্য: "${comment.trim().slice(0, 80)}"`,
          link: reviewerRole === 'customer' ? `/admin/orders` : `/dashboard/orders/${orderId}`,
          category: 'orders',
        });
      }
    } catch {
      // ignore
    }

    return review;
  },

  /**
   * অর্ডারের মেসেজ তালিকা সংগ্রহ (Order Workroom Messages)
   */
  /**
   * অর্ডারের সম্পূর্ণ মেসেজ তালিকা সংগ্রহ (Order Messages)
   * chat_messages, order_messages, order_events এবং স্থানীয় স্টোরেজ থেকে সকল বার্তা সংগ্রহ ও ডুপ্লিকেটমুক্ত একত্রীকরণ।
   */
  async getOrderMessages(orderId: string): Promise<OrderWorkMessage[]> {
    const rawList: OrderWorkMessage[] = [];

    // অর্ডারের তথ্য নিয়ে প্রেরকের রোল ও নাম নিশ্চিত করা
    let orderContext: Order | null = null;
    try {
      orderContext = await this.getOrderById(orderId, undefined, true);
    } catch {
      // ignore
    }

    if (isSupabaseConfigured && supabase) {
      // ১. ইউনিফাইড chat_messages টেবিল থেকে ডাটা নেওয়া (Primary Table)
      try {
        const { data: cmData, error: cmErr } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('order_id', String(orderId))
          .order('created_at', { ascending: true });

        if (!cmErr && cmData && Array.isArray(cmData)) {
          cmData.forEach((row: any) => {
            let derivedRole: 'customer' | 'admin' | 'worker' = 'customer';
            if (row.sender_role === 'admin' || row.sender_role === 'worker') {
              derivedRole = 'admin';
            } else if (row.sender_role === 'customer') {
              derivedRole = 'customer';
            } else if (orderContext) {
              derivedRole = row.sender_id === orderContext.user_id ? 'customer' : 'admin';
            }

            let sName = row.sender_name;
            if (!sName || sName === 'গ্রাহক' || sName === 'অ্যাডমিন') {
              if (derivedRole === 'customer') {
                sName = orderContext?.customer_name || 'গ্রাহক';
              } else {
                sName = orderContext?.assigned_admin_name || 'দায়িত্বপ্রাপ্ত স্পেশালিস্ট';
              }
            }

            rawList.push({
              id: String(row.id),
              order_id: String(row.order_id),
              sender_id: String(row.sender_id),
              receiver_id: row.receiver_id ? String(row.receiver_id) : null,
              sender_name: sName,
              sender_role: derivedRole,
              message: row.message || row.message_content || '',
              message_content: row.message || row.message_content || '',
              is_read: Boolean(row.is_read),
              attachment_name: row.attachment_name || null,
              attachment_url: row.attachment_url || null,
              created_at: row.created_at || new Date().toISOString(),
            });
          });
        }
      } catch (err) {
        console.warn('chat_messages fetch exception:', err);
      }

      // ২. order_messages টেবিল থেকে ডাটা নেওয়া (Backward Compatibility)
      try {
        const { data: omData, error: omErr } = await supabase
          .from('order_messages')
          .select('*')
          .eq('order_id', String(orderId))
          .order('created_at', { ascending: true });

        if (!omErr && omData && Array.isArray(omData)) {
          omData.forEach((row: any) => {
            let derivedRole: 'customer' | 'admin' | 'worker' = 'customer';
            if (row.sender_role === 'admin' || row.sender_role === 'worker') {
              derivedRole = 'admin';
            } else if (row.sender_role === 'customer') {
              derivedRole = 'customer';
            } else if (orderContext) {
              derivedRole = row.sender_id === orderContext.user_id ? 'customer' : 'admin';
            }

            let sName = row.sender_name;
            if (!sName || sName === 'গ্রাহক' || sName === 'অ্যাডমিন') {
              if (derivedRole === 'customer') {
                sName = orderContext?.customer_name || 'গ্রাহক';
              } else {
                sName = orderContext?.assigned_admin_name || 'দায়িত্বপ্রাপ্ত স্পেশালিস্ট';
              }
            }

            rawList.push({
              id: String(row.id),
              order_id: String(row.order_id),
              sender_id: String(row.sender_id),
              receiver_id: row.receiver_id ? String(row.receiver_id) : null,
              sender_name: sName,
              sender_role: derivedRole,
              message: row.message || row.message_content || '',
              message_content: row.message || row.message_content || '',
              is_read: Boolean(row.is_read),
              attachment_name: row.attachment_name || null,
              attachment_url: row.attachment_url || null,
              created_at: row.created_at || new Date().toISOString(),
            });
          });
        }
      } catch (err) {
        console.warn('order_messages fetch exception:', err);
      }

      // ৩. order_events টেবিল থেকে চ্যাট মেসেজ সিঙ্ক (দ্বিমুখী ব্যাকআপ)
      try {
        const { data: oeData } = await supabase
          .from('order_events')
          .select('*')
          .eq('order_id', String(orderId))
          .eq('event_type', 'ORDER_CHAT_MESSAGE')
          .order('created_at', { ascending: true });

        if (oeData && Array.isArray(oeData)) {
          oeData.forEach((evt: any) => {
            let meta: any = {};
            if (evt.metadata) {
              if (typeof evt.metadata === 'string') {
                try { meta = JSON.parse(evt.metadata); } catch { meta = {}; }
              } else if (typeof evt.metadata === 'object') {
                meta = evt.metadata;
              }
            }
            let derivedRole: 'customer' | 'admin' | 'worker' = 'customer';
            if (meta.sender_role === 'admin' || meta.sender_role === 'worker') {
              derivedRole = 'admin';
            } else if (meta.sender_role === 'customer') {
              derivedRole = 'customer';
            } else if (orderContext) {
              derivedRole = (evt.actor_id || meta.sender_id) === orderContext.user_id ? 'customer' : 'admin';
            }

            let sName = meta.sender_name;
            if (!sName || sName === 'গ্রাহক' || sName === 'অ্যাডমিন') {
              if (derivedRole === 'customer') {
                sName = orderContext?.customer_name || 'গ্রাহক';
              } else {
                sName = orderContext?.assigned_admin_name || 'দায়িত্বপ্রাপ্ত স্পেশালিস্ট';
              }
            }

            rawList.push({
              id: String(meta.id || evt.id),
              order_id: String(evt.order_id),
              sender_id: String(evt.actor_id || meta.sender_id),
              receiver_id: meta.receiver_id ? String(meta.receiver_id) : null,
              sender_name: sName,
              sender_role: derivedRole,
              message: evt.message || meta.message || '',
              message_content: evt.message || meta.message || '',
              is_read: false,
              attachment_name: meta.attachment_name || null,
              attachment_url: meta.attachment_url || null,
              created_at: evt.created_at || new Date().toISOString(),
            });
          });
        }
      } catch (err) {
        console.warn('order_events chat sync fetch error:', err);
      }
    }

    // ৪. লোকাল স্টোরেজ থেকে ডাটা মার্জ করা
    const localMsgs = getLS<OrderWorkMessage[]>(`order_messages_${orderId}`, []);
    rawList.push(...localMsgs);

    // ৫. ডুপ্লিকেশন প্রতিরোধ (Deduplication by ID and Content/Timestamp)
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();
    const deduplicated: OrderWorkMessage[] = [];

    const sorted = [...rawList].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const m of sorted) {
      const id = String(m.id || '');
      if (id && seenIds.has(id)) {
        continue;
      }

      const textNorm = (m.message || m.message_content || '').trim().toLowerCase();
      // ১০ সেকেন্ডের মধ্যকার একই মেসেজ ডুপ্লিকেট হিসেবে বাদ দেওয়া
      const timeWindow = Math.floor(new Date(m.created_at).getTime() / 10000);
      const fp = `${m.order_id}_${m.sender_id}_${textNorm}_${timeWindow}`;

      if (seenFingerprints.has(fp)) {
        continue;
      }

      if (id) seenIds.add(id);
      seenFingerprints.add(fp);
      deduplicated.push(m);
    }

    return deduplicated;
  },

  /**
   * অর্ডারের সরাসরি মেসেজ প্রেরণ (গ্রাহক ও দায়িত্বপ্রাপ্ত অ্যাডমিন/ওয়ার্কারের মধ্যে)
   */
  async sendOrderMessage(
    orderId: string,
    senderId: string,
    senderName: string,
    senderRole: 'customer' | 'admin' | 'worker',
    messageText: string,
    attachment?: { name: string; url: string }
  ): Promise<OrderWorkMessage> {
    if (!messageText.trim() && !attachment) {
      throw new Error('মেসেজের টেক্সট বা ফাইল আবশ্যক।');
    }

    const order = await this.getOrderById(orderId, undefined, true);
    if (!order) throw new Error('অর্ডার পাওয়া যায়নি।');

    // সম্পন্ন বা বাতিল অর্ডারের ক্ষেত্রে চ্যাট বন্ধ (ডেলিভারিকৃত ও রিভিশন চলাকালীন চ্যাট সম্পূর্ণ সক্রিয় থাকবে)
    if (['completed', 'cancelled', 'refunded'].includes(order.status)) {
      throw new Error('এই অর্ডারের কাজ সম্পন্ন বা বাতিল হওয়ায় চ্যাট সার্ভিস বন্ধ রয়েছে।');
    }

    const now = new Date().toISOString();
    const cleanRole = senderRole === 'worker' ? 'admin' : senderRole;
    // Explicit recipient identification
    const recipientId = senderRole === 'customer' ? order.assigned_admin || null : order.user_id;

    // PostgreSQL UUID সাপোর্ট করার জন্য ভ্যালিড UUID তৈরি
    const realUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : null;
    const generatedId = realUuid || `msg_${Date.now()}`;

    const newMsg: OrderWorkMessage = {
      id: generatedId,
      order_id: String(orderId),
      sender_id: String(senderId),
      receiver_id: recipientId ? String(recipientId) : null,
      sender_name: senderName,
      sender_role: cleanRole,
      message: messageText.trim(),
      message_content: messageText.trim(),
      is_read: false,
      attachment_name: attachment?.name || null,
      attachment_url: attachment?.url || null,
      created_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      let supabaseSaved = false;

      // ১. ইউনিফাইড chat_messages টেবিলে ইনসার্ট (Primary Delivery System)
      const chatPayload: Record<string, any> = {
        order_id: String(orderId),
        sender_id: String(senderId),
        receiver_id: recipientId ? String(recipientId) : null,
        sender_name: senderName,
        sender_role: cleanRole,
        message: messageText.trim(),
        message_content: messageText.trim(),
        attachment_name: attachment?.name || null,
        attachment_url: attachment?.url || null,
        is_read: false,
        created_at: now,
        ...(realUuid ? { id: realUuid } : {}),
      };

      try {
        const { data: cData, error: cErr } = await supabase
          .from('chat_messages')
          .insert(chatPayload as any)
          .select()
          .maybeSingle();

        if (!cErr && cData) {
          supabaseSaved = true;
          newMsg.id = String(cData.id);
          newMsg.created_at = cData.created_at || now;
        }
      } catch (err) {
        console.warn('chat_messages insert exception:', err);
      }

      // ২. order_messages টেবিলে রেজিলিয়েন্ট ইনসার্ট (Fallback Delivery System)
      const attempts: Record<string, any>[] = [
        chatPayload,
        {
          order_id: String(orderId),
          sender_id: String(senderId),
          receiver_id: recipientId ? String(recipientId) : null,
          message: messageText.trim(),
          is_read: false,
          created_at: now,
          ...(realUuid ? { id: realUuid } : {}),
        },
        {
          order_id: String(orderId),
          sender_id: String(senderId),
          receiver_id: recipientId ? String(recipientId) : null,
          message_content: messageText.trim(),
          is_read: false,
          created_at: now,
          ...(realUuid ? { id: realUuid } : {}),
        },
        {
          order_id: String(orderId),
          sender_id: String(senderId),
          message: messageText.trim(),
        },
        {
          order_id: String(orderId),
          sender_id: String(senderId),
          message_content: messageText.trim(),
        },
      ];

      for (const payload of attempts) {
        try {
          const res = await supabase.from('order_messages').insert(payload as any).select().maybeSingle();
          if (!res.error && res.data) {
            if (!supabaseSaved) {
              newMsg.id = String(res.data.id || newMsg.id);
              newMsg.created_at = res.data.created_at || now;
              supabaseSaved = true;
            }
            break;
          }
        } catch {
          // continue
        }
      }

      // ৩. সুপাবেসের বিশ্বস্ত order_events টেবিলে চ্যাট ইভেন্ট সিঙ্ক
      try {
        await supabase.from('order_events').insert({
          order_id: String(orderId),
          actor_id: String(senderId),
          event_type: 'ORDER_CHAT_MESSAGE',
          message: messageText.trim(),
          metadata: {
            id: newMsg.id,
            order_id: String(orderId),
            sender_id: String(senderId),
            receiver_id: recipientId ? String(recipientId) : null,
            sender_name: senderName,
            sender_role: cleanRole,
            message: messageText.trim(),
            attachment_name: attachment?.name || null,
            attachment_url: attachment?.url || null,
            created_at: now,
          },
        });
      } catch (eventErr) {
        console.warn('order_events chat sync error:', eventErr);
      }

      try {
        await supabase.from('orders').update({ updated_at: now }).eq('id', orderId);
      } catch (err) {
        // ignore
      }

      try {
        await supabase.channel(`order-chat-${orderId}`).send({
          type: 'broadcast',
          event: 'new_message',
          payload: newMsg,
        });
      } catch {
        // ignore broadcast fail
      }
    }

    const list = getLS<OrderWorkMessage[]>(`order_messages_${orderId}`, []);
    list.push(newMsg);
    setLS(`order_messages_${orderId}`, list);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('order_message_sent', { detail: { orderId, message: newMsg } }));
    }

    // অফ-প্ল্যাটফর্ম লেনদেন বা অননুমোদিত পরিচিতি বিনিময়ের সন্দেহজনক কিওয়ার্ড চেক
    const SUSPICIOUS_KEYWORDS = [
      'phone', 'mobile', 'whatsapp', 'bkash', 'nagad', '017', '018', '019', '013', '014', '015', '016',
      'outside', 'pay direct', 'call', 'gmail', 'email', 'telegram', 'facebook', 'বাইরে', 'হোয়াটসঅ্যাপ',
      'নম্বর', 'কল করুন', 'টাকা সরাসরি', 'অফ-মার্কেট'
    ];
    const lowerText = messageText.toLowerCase();
    const matchedKw = SUSPICIOUS_KEYWORDS.find((kw) => lowerText.includes(kw));

    if (matchedKw) {
      const flagRecord: SuspiciousChatFlag = {
        id: `sflag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: orderId,
        order_number: order.order_number,
        sender_id: senderId,
        sender_name: senderName,
        sender_role: senderRole,
        message_content: messageText.trim(),
        matched_keyword: matchedKw,
        status: 'pending',
        created_at: now,
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('suspicious_chat_flags').insert(flagRecord);
        } catch (err) {
          console.warn('Supabase suspicious flag save error:', err);
        }
      }

      const flags = getLS<SuspiciousChatFlag[]>('suspicious_chat_flags', []);
      flags.unshift(flagRecord);
      setLS('suspicious_chat_flags', flags);
    }

    // প্রতিপক্ষকে নোটিফিকেশন পাঠানো
    try {
      const recipientId = senderRole === 'customer' ? order.assigned_admin : order.user_id;
      if (recipientId) {
        await communicationService.notifyAndEmail({
          userId: recipientId,
          title: `অর্ডার #${order.order_number}-এ নতুন বার্তা`,
          message: `${senderName}: "${messageText.trim().slice(0, 60)}"`,
          link: senderRole === 'customer' ? `/admin/orders` : `/dashboard/orders/${orderId}`,
          category: 'orders',
        });
      }
    } catch {
      // ignore
    }

    return newMsg;
  },

  async getSuspiciousChatFlags(): Promise<SuspiciousChatFlag[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('suspicious_chat_flags')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data as SuspiciousChatFlag[];
      } catch {
        // fallback
      }
    }
    return getLS<SuspiciousChatFlag[]>('suspicious_chat_flags', []);
  },

  async resolveSuspiciousChatFlag(flagId: string, status: 'reviewed' | 'action_taken', adminNotes?: string): Promise<boolean> {
    const flags = await this.getSuspiciousChatFlags();
    const target = flags.find((f) => f.id === flagId);
    if (target) {
      target.status = status;
      if (adminNotes) target.admin_notes = adminNotes;

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('suspicious_chat_flags').update({ status, admin_notes: adminNotes }).eq('id', flagId);
        } catch (err) {
          console.warn('Supabase update suspicious flag error:', err);
        }
      }

      const localFlags = getLS<SuspiciousChatFlag[]>('suspicious_chat_flags', []);
      const idx = localFlags.findIndex((f) => f.id === flagId);
      if (idx >= 0) {
        localFlags[idx] = target;
        setLS('suspicious_chat_flags', localFlags);
      }
    }
    return true;
  },

  async refundOrder(orderId: string, arg2: string, arg3?: string): Promise<{ success: boolean; newBalance: number }> {
    const adminId = arg3 ? arg2 : 'worker';
    const refundReason = (arg3 || arg2 || 'গ্রাহকের অনুরোধে অর্ডার বাতিল ও রিফান্ড').trim();
    if (!refundReason) {
      throw new Error('রিফান্ড করার জন্য সুনির্দিষ্ট কারণ উল্লেখ করা আবশ্যক।');
    }

    // ১. আইডিমপোটেন্সি ও প্রি-চেক: ইতিপূর্বে রিফান্ড বা বাতিল হয়ে থাকলে কোনো অবস্থাতেই পুনরায় রিফান্ড হবে না
    const existingOrder = await this.getOrderById(orderId, undefined, true);
    if (!existingOrder) {
      throw new Error('অর্ডারটি পাওয়া যায়নি।');
    }
    if (existingOrder.status === 'refunded' || existingOrder.status === 'cancelled') {
      throw new Error('এই অর্ডারটি ইতিমধ্যে বাতিল ও রিফান্ড করা হয়েছে। একাধিকবার রিফান্ড গ্রহণ সম্ভব নয়।');
    }

    let refundBalance = 0;
    const now = new Date().toISOString();
    const orderAmount = existingOrder.amount;
    const orderUserId = existingOrder.user_id;

    if (isSupabaseConfigured && supabase) {
      // লেজারে ডুপ্লিকেট রিফান্ড এড়াতে আগে চেক করা
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('reference_id', orderId)
        .eq('type', 'refund')
        .maybeSingle();

      if (existingTx) {
        // লেজারে ইতিমধ্যে রিফান্ড সম্পন্ন হয়ে আছে
        await supabase.from('orders').update({
          status: 'cancelled',
          cancellation_reason: refundReason,
          refund_amount: orderAmount,
          updated_at: now,
        }).eq('id', orderId);

        const { data: currentW } = await supabase.from('wallets').select('balance').eq('user_id', orderUserId).single();
        refundBalance = currentW?.balance || 0;
      } else {
        let rpcSucceeded = false;
        try {
          const { data, error } = await supabase.rpc('refund_order', {
            p_order_id: orderId,
            p_refund_reason: refundReason,
          });
          if (!error && data) {
            refundBalance = data.new_balance;
            rpcSucceeded = true;
          }
        } catch (e) {
          console.warn('RPC refund_order warning, trying direct queries:', e);
        }

        if (!rpcSucceeded) {
          await supabase.from('orders').update({
            status: 'cancelled',
            cancellation_reason: refundReason,
            refund_amount: orderAmount,
            updated_at: now,
          }).eq('id', orderId);

          const { data: w } = await supabase.from('wallets').select('*').eq('user_id', orderUserId).single();
          if (w) {
            const newBal = (w.balance || 0) + orderAmount;
            await supabase.from('wallets').update({
              balance: newBal,
              total_spent: Math.max(0, (w.total_spent || 0) - orderAmount),
              updated_at: now,
            }).eq('id', w.id);

            await supabase.from('wallet_transactions').insert({
              wallet_id: w.id,
              user_id: orderUserId,
              type: 'refund',
              amount: orderAmount,
              balance_after: newBal,
              status: 'completed',
              reference_id: orderId,
              reference_type: 'order',
              description: `অর্ডার রিফান্ড: #${existingOrder.order_number} (কারণ: ${refundReason})`,
            });
            refundBalance = newBal;
          }
        }
      }
    } else {
      // Local fallback
      const orders = getLS<Order[]>('orders', []);
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new Error('অর্ডার পাওয়া যায়নি');
      if (order.status === 'refunded' || order.status === 'cancelled') {
        throw new Error('এই অর্ডারটি ইতিমধ্যে রিফান্ড বা বাতিল করা হয়েছে।');
      }

      // লেজার ডুপ্লিকেট চেক
      const txs = getLS<WalletTransaction[]>('transactions', []);
      const duplicateTx = txs.find((t) => t.reference_id === orderId && t.type === 'refund');
      if (duplicateTx) {
        throw new Error('এই অর্ডারের অর্থ ইতিপূর্বে রিফান্ড করা হয়েছে।');
      }

      // Refund wallet
      const wallets = getLS<Record<string, Wallet>>('wallets', {});
      const wallet = wallets[order.user_id] || {
        id: `wallet_${order.user_id}`,
        user_id: order.user_id,
        balance: 0,
        pending_balance: 0,
        total_deposited: 0,
        total_spent: 0,
        updated_at: now,
      };

      wallet.balance += order.amount;
      wallet.total_spent = Math.max(0, wallet.total_spent - order.amount);
      wallet.updated_at = now;
      wallets[order.user_id] = wallet;
      setLS('wallets', wallets);

      // Ledger record
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
        description: `অর্ডার রিফান্ড: #${order.order_number} (কারণ: ${refundReason})`,
        created_at: now,
      });
      setLS('transactions', txs);

      // Update order
      order.status = 'refunded';
      order.cancellation_reason = refundReason;
      order.refund_amount = order.amount;
      order.updated_at = now;
      if (!order.events) order.events = [];
      order.events.push({
        id: `event_${Date.now()}`,
        order_id: orderId,
        actor_id: adminId,
        event_type: 'ORDER_REFUNDED',
        message: `অ্যাডমিন কর্তৃক ৳ ${order.amount} সম্পূর্ণ রিফান্ড অনুমোদিত হয়েছে। কারণ: ${refundReason}`,
        created_at: now,
      });
      setLS('orders', orders);

      refundBalance = wallet.balance;
    }

    // লোকাল স্টোরেজ অর্ডারস সবসময় সিঙ্ক নিশ্চিত করা (Supabase সচল থাকলেও)
    const localOrders = getLS<Order[]>('orders', []);
    const localIdx = localOrders.findIndex((o) => o.id === orderId);
    if (localIdx !== -1) {
      localOrders[localIdx].status = 'refunded';
      localOrders[localIdx].cancellation_reason = refundReason;
      localOrders[localIdx].refund_amount = orderAmount;
      localOrders[localIdx].updated_at = now;
      setLS('orders', localOrders);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orders_updated', { detail: { orderId, status: 'refunded' } }));
      window.dispatchEvent(new CustomEvent('wallet_updated', { detail: { newBalance: refundBalance } }));
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
          message: `আপনার অর্ডার #${refundOrderObj.order_number}-এর ৳${refundOrderObj.amount.toLocaleString('bn-BD')} নিরাপদে ওয়ালেট ব্যালেন্সে ফেরত দেওয়া হয়েছে। কারণ: ${refundReason}`,
          link: `/dashboard/orders/${orderId}`,
          category: 'wallet',
          templateType: 'refund_processed',
          templateData: {
            orderNumber: refundOrderObj.order_number,
            amount: refundOrderObj.amount,
            statusNote: refundReason,
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
    const cleanReason = cancellationReason.trim();
    if (!cleanReason) {
      throw new Error('বাতিল করার কারণ উল্লেখ করা আবশ্যক।');
    }

    // ১. আইডিমপোটেন্সি ও অনুমতি যাচাই
    const existingOrder = await this.getOrderById(orderId, userId, false);
    if (!existingOrder) {
      throw new Error('অর্ডার পাওয়া যায়নি অথবা আপনার এই অর্ডারে অনুমতি নেই।');
    }

    if (existingOrder.status === 'refunded' || existingOrder.status === 'cancelled') {
      throw new Error('এই অর্ডারটি ইতিমধ্যে বাতিল ও রিফান্ড করা হয়েছে। একাধিকবার বাতিল সম্ভব নয়।');
    }

    if (existingOrder.assigned_admin) {
      throw new Error('এই কাজটির দায়িত্ব ইতিমধ্যে একজন স্পেশালিস্ট অ্যাডমিন/ওয়ার্কার গ্রহণ করেছেন। অর্ডারটি এখন সরাসরি বাতিল করা সম্ভব নয়। দয়া করে সরাসরি চ্যাটে দায়িত্বে থাকা কর্মকর্তার সাথে যোগাযোগ করে বাতিলের অনুরোধ করুন।');
    }

    if (['delivered', 'completed'].includes(existingOrder.status)) {
      throw new Error('ডেলিভারি সম্পন্ন বা সমাপ্ত হওয়া অর্ডার সরাসরি বাতিলযোগ্য নয়।');
    }

    let finalBalance = 0;
    const now = new Date().toISOString();
    const orderAmount = existingOrder.amount;

    if (isSupabaseConfigured && supabase) {
      // লেজারে পূর্বে রিফান্ড হয়েছে কি না চেক
      const { data: existingTx } = await supabase
        .from('wallet_transactions')
        .select('id')
        .eq('reference_id', orderId)
        .eq('type', 'refund')
        .maybeSingle();

      if (existingTx) {
        await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            cancellation_reason: cleanReason,
            refund_amount: orderAmount,
            updated_at: now,
          })
          .eq('id', orderId);

        const { data: currentW } = await supabase.from('wallets').select('balance').eq('user_id', userId).single();
        finalBalance = currentW?.balance || 0;
      } else {
        try {
          const { data, error } = await supabase.rpc('cancel_order_by_customer', {
            p_order_id: orderId,
            p_reason: cleanReason,
          });
          if (!error && data) {
            finalBalance = data.new_balance;
          }
        } catch {
          // Continue to direct queries fallback
        }

        if (finalBalance === 0) {
          await supabase
            .from('orders')
            .update({
              status: 'cancelled',
              cancellation_reason: cleanReason,
              refund_amount: orderAmount,
              updated_at: now,
            })
            .eq('id', orderId);

          await supabase.from('order_events').insert({
            order_id: orderId,
            actor_id: userId,
            event_type: 'ORDER_REFUNDED',
            message: `গ্রাহক কর্তৃক অর্ডার বাতিল করা হয়েছে এবং ৳ ${orderAmount} ওয়ালেটে ফেরত দেওয়া হয়েছে। কারণ: ${cleanReason}`,
          });

          const { data: walletData } = await supabase
            .from('wallets')
            .select('*')
            .eq('user_id', userId)
            .single();

          const newBal = (walletData?.balance || 0) + orderAmount;
          if (walletData) {
            await supabase
              .from('wallets')
              .update({
                balance: newBal,
                total_spent: Math.max(0, (walletData.total_spent || 0) - orderAmount),
                updated_at: now,
              })
              .eq('id', walletData.id);

            await supabase.from('wallet_transactions').insert({
              wallet_id: walletData.id,
              user_id: userId,
              type: 'refund',
              amount: orderAmount,
              balance_after: newBal,
              status: 'completed',
              reference_id: orderId,
              reference_type: 'order',
              description: `অর্ডার বাতিল ও রিফান্ড: #${existingOrder.order_number} (কারণ: ${cleanReason})`,
            });
          }
          finalBalance = newBal;
        }
      }
    } else {
      // Local state fallback
      const orders = getLS<Order[]>('orders', []);
      const order = orders.find((o) => o.id === orderId && o.user_id === userId);
      if (!order) throw new Error('অর্ডার পাওয়া যায়নি');
      if (order.status === 'refunded' || order.status === 'cancelled') {
        throw new Error('এই অর্ডারটি ইতিমধ্যে বাতিল ও রিফান্ড করা হয়েছে।');
      }

      const txs = getLS<WalletTransaction[]>('transactions', []);
      const duplicateTx = txs.find((t) => t.reference_id === orderId && t.type === 'refund');
      if (duplicateTx) {
        throw new Error('এই অর্ডারের অর্থ ইতিপূর্বে রিফান্ড করা হয়েছে।');
      }

      const wallets = getLS<Record<string, Wallet>>('wallets', {});
      const wallet = wallets[userId] || {
        id: `wallet_${userId}`,
        user_id: userId,
        balance: 0,
        pending_balance: 0,
        total_deposited: 0,
        total_spent: 0,
        updated_at: now,
      };

      wallet.balance += order.amount;
      wallet.total_spent = Math.max(0, wallet.total_spent - order.amount);
      wallet.updated_at = now;
      wallets[userId] = wallet;
      setLS('wallets', wallets);

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
        description: `অর্ডার বাতিল ও রিফান্ড: #${order.order_number} (কারণ: ${cleanReason})`,
        created_at: now,
      });
      setLS('transactions', txs);

      order.status = 'refunded';
      order.cancellation_reason = cleanReason;
      order.refund_amount = order.amount;
      order.updated_at = now;
      if (!order.events) order.events = [];
      order.events.push({
        id: `event_${Date.now()}`,
        order_id: orderId,
        actor_id: userId,
        event_type: 'ORDER_REFUNDED',
        message: `গ্রাহক কর্তৃক অর্ডার বাতিল করা হয়েছে এবং ৳ ${order.amount} ওয়ালেটে ফেরত দেওয়া হয়েছে। কারণ: ${cleanReason}`,
        created_at: now,
      });
      setLS('orders', orders);

      finalBalance = wallet.balance;
    }

    // লোকাল স্টোরেজ অর্ডারস সবসময় সিঙ্ক নিশ্চিত করা (Supabase সচল থাকলেও)
    const localOrders = getLS<Order[]>('orders', []);
    const localIdx = localOrders.findIndex((o) => o.id === orderId);
    if (localIdx !== -1) {
      localOrders[localIdx].status = 'refunded';
      localOrders[localIdx].cancellation_reason = cleanReason;
      localOrders[localIdx].refund_amount = orderAmount;
      localOrders[localIdx].updated_at = now;
      setLS('orders', localOrders);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orders_updated', { detail: { orderId, status: 'refunded' } }));
      window.dispatchEvent(new CustomEvent('wallet_updated', { detail: { newBalance: finalBalance } }));
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
            statusNote: `গ্রাহক কর্তৃক বাতিল: ${cleanReason}`,
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
    const cleanNotes = revisionNotes.trim();
    if (!cleanNotes) throw new Error('সংশোধনের বিবরণ দেওয়া আবশ্যক।');

    let supabaseHandled = false;

    if (isSupabaseConfigured && supabase) {
      try {
        const { error: rpcErr } = await supabase.rpc('request_order_revision', {
          p_order_id: orderId,
          p_revision_notes: cleanNotes,
        });
        if (!rpcErr) {
          supabaseHandled = true;
        } else {
          console.warn('Supabase RPC request_order_revision warning:', rpcErr.message);
        }
      } catch (rpcEx) {
        console.warn('request_order_revision RPC exception:', rpcEx);
      }

      if (!supabaseHandled) {
        // Direct query update with enum resilience:
        // Try updating status to 'revision_requested'
        let { error: statusErr } = await supabase
          .from('orders')
          .update({
            status: 'revision_requested',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId);

        // If PostgreSQL enum order_status does not yet include 'revision_requested', fallback safely
        if (statusErr) {
          console.warn('Fallback status update due to enum constraint:', statusErr.message);
          await supabase
            .from('orders')
            .update({
              status: 'in_progress',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);
        }

        // Record event in order_events table
        try {
          await supabase.from('order_events').insert({
            order_id: orderId,
            actor_id: userId,
            event_type: 'REVISION_REQUESTED',
            message: `গ্রাহক সংশোধনের (Revision) অনুরোধ পাঠিয়েছেন: ${cleanNotes}`,
          });
        } catch (evErr) {
          console.warn('order_events revision insert error:', evErr);
        }
      }
    }

    // Always keep LocalStorage state in sync
    const orders = getLS<Order[]>('orders', []);
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'revision_requested';
      order.updated_at = new Date().toISOString();
      if (!order.events) order.events = [];
      order.events.unshift({
        id: `event_${Date.now()}`,
        order_id: orderId,
        actor_id: userId,
        event_type: 'REVISION_REQUESTED',
        message: `গ্রাহক সংশোধনের (Revision) অনুরোধ পাঠিয়েছেন: ${cleanNotes}`,
        created_at: new Date().toISOString(),
      });
      setLS('orders', orders);
    }

    // চ্যাটে নোটিশ পাঠানো যাতে দায়িত্বপ্রাপ্ত ওয়ার্কার/অ্যাডমিন সরাসরি দেখতে পান
    try {
      const orderObj = await this.getOrderById(orderId, undefined, true);
      if (orderObj && orderObj.assigned_admin) {
        await this.sendOrderMessage(
          orderId,
          userId,
          'গ্রাহক',
          'customer',
          `⚠️ কাজের সংশোধনের (Revision) অনুরোধ পাঠানো হয়েছে:\n"${cleanNotes}"\nঅনুগ্রহ করে সংশোধন করে পুনরায় ফাইল আপলোড করুন।`
        );
      }
    } catch (chatNoticeErr) {
      console.warn('Revision chat notice error:', chatNoticeErr);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orders_updated'));
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
    const now = new Date().toISOString();
    let newDeliverable: OrderDeliverable;

    // যদি fileUrl বড় ডেটা ইউআরএল হয়, তবে ইভেন্ট টেক্সটে পুরো বেস৬৪ না রেখে পরিচ্ছন্ন টেক্সট রাখা
    const eventLinkNote = deliverable.fileUrl.startsWith('data:')
      ? ''
      : ` (ফাইল লিংক: ${deliverable.fileUrl})`;

    if (isSupabaseConfigured && supabase) {
      let insertedData: any = null;
      try {
        // দ্রুত রেসপন্স ও টাইমআউট গার্ড
        const insertPromise = supabase
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
          .maybeSingle();

        const timeoutPromise = new Promise<{ data: null; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: null }), 3000)
        );

        const raceRes: any = await Promise.race([insertPromise, timeoutPromise]);
        if (raceRes && !raceRes.error && raceRes.data) {
          insertedData = raceRes.data;
        }
      } catch (insertErr) {
        console.warn('order_deliverables insert exception:', insertErr);
      }

      // Always update order status to delivered with delivered_at
      try {
        await supabase
          .from('orders')
          .update({
            status: 'delivered',
            delivered_at: now,
            updated_at: now,
          })
          .eq('id', orderId);
      } catch (orderUpdateErr) {
        console.warn('orders status update error:', orderUpdateErr);
      }

      // Log event
      try {
        await supabase.from('order_events').insert({
          order_id: orderId,
          actor_id: adminId,
          event_type: 'DELIVERABLE_UPLOADED',
          message: `ডেলিভারি ফাইল যুক্ত করা হয়েছে: "${deliverable.title}"${eventLinkNote}`,
        });
      } catch (eventErr) {
        console.warn('order_events insert error:', eventErr);
      }

      if (insertedData) {
        newDeliverable = insertedData as OrderDeliverable;
      } else {
        newDeliverable = {
          id: `deliv_${Date.now()}`,
          order_id: orderId,
          title: deliverable.title,
          file_url: deliverable.fileUrl,
          file_size: deliverable.fileSize || 1024 * 1024 * 2.5,
          file_type: deliverable.fileType || 'application/pdf',
          deliverable_notes: deliverable.notes || null,
          uploaded_by: adminId,
          created_at: now,
        };
      }

      // Mirror to local storage as well for guaranteed offline & real-time sync
      try {
        const orders = getLS<Order[]>('orders', []);
        const order = orders.find((o) => o.id === orderId);
        if (order) {
          if (!order.deliverables) order.deliverables = [];
          order.deliverables.unshift(newDeliverable);
          order.status = 'delivered';
          order.delivered_at = now;
          order.updated_at = now;
          setLS('orders', orders);
        }
      } catch {}
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
        created_at: now,
      };
      if (!order.deliverables) order.deliverables = [];
      order.deliverables.unshift(newDeliverable);
      order.status = 'delivered';
      order.delivered_at = now;
      order.updated_at = now;
      if (!order.events) order.events = [];
      order.events.push({
        id: `event_${Date.now()}`,
        order_id: orderId,
        actor_id: adminId,
        event_type: 'DELIVERABLE_UPLOADED',
        message: `ডেলিভারি ফাইল আপলোড সম্পন্ন: "${deliverable.title}"${eventLinkNote}। কাজের অবস্থা "ডেলিভারি সম্পন্ন" হিসেবে চিহ্নিত।`,
        created_at: now,
      });
      setLS('orders', orders);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('orders_updated'));
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
      try {
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', targetUserId);
        if (error) {
          console.warn('Supabase updateUserRole error:', error.message);
          if (error.message.includes('enum user_role') || error.code === '22P02') {
            console.warn('Supabase enum missing "worker" value. Local storage updated. Please run SQL migration.');
          } else {
            throw new Error(error.message);
          }
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.warn('Falling back to local profile role update:', errorMessage);
        if (!errorMessage.includes('enum user_role')) {
          // If not an enum error, rethrow
        }
      }
    }

    // Always update local profiles storage so UI state stays in sync
    const profiles = await this.getUsers();
    const user = profiles.find((p) => p.id === targetUserId);
    if (user) {
      user.role = newRole;
      user.updated_at = new Date().toISOString();
      setLS('profiles', profiles);
    }
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

  async getPlatformSettings(): Promise<PlatformSettings> {
    return this.getSettings();
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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settings_updated', { detail: merged }));
    }

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

  async updatePlatformSettings(newSettings: Partial<PlatformSettings>, adminId: string): Promise<PlatformSettings> {
    return this.updateSettings(newSettings, adminId);
  },

  // -------------------------------------------------------------
  // WORKER APPLICATIONS & VERIFICATION
  // -------------------------------------------------------------
  async submitWorkerApplication(data: {
    user_id: string;
    full_name: string;
    phone: string;
    whatsapp?: string;
    skills: string;
    experience?: string;
    portfolio_url?: string;
  }): Promise<WorkerApplication> {
    const now = new Date().toISOString();
    const app: WorkerApplication = {
      id: `wapp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: data.user_id,
      full_name: data.full_name,
      phone: data.phone,
      whatsapp: data.whatsapp || undefined,
      skills: data.skills,
      experience: data.experience || undefined,
      portfolio_url: data.portfolio_url || undefined,
      status: 'pending',
      created_at: now,
    };

    // Save to local storage first so application is immediately available and never lost
    const apps = getLS<WorkerApplication[]>('worker_applications', []);
    apps.unshift(app);
    setLS('worker_applications', apps);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('worker_applications').insert(app);
      } catch (err) {
        console.warn('Supabase worker application insert error:', err);
      }
    }

    return app;
  },

  async getWorkerApplications(): Promise<WorkerApplication[]> {
    let remoteApps: WorkerApplication[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('worker_applications')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) remoteApps = data as WorkerApplication[];
      } catch {
        // fallback
      }
    }
    const localApps = getLS<WorkerApplication[]>('worker_applications', []);

    // Merge remote and local applications by ID
    const mergedMap = new Map<string, WorkerApplication>();
    remoteApps.forEach((app) => mergedMap.set(app.id, app));
    localApps.forEach((app) => mergedMap.set(app.id, app));

    return Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async reviewWorkerApplication(
    appId: string,
    status: 'approved' | 'rejected',
    notes: string,
    adminId: string
  ): Promise<WorkerApplication> {
    const apps = await this.getWorkerApplications();
    const target = apps.find((a) => a.id === appId);
    if (!target) throw new Error('ওয়ার্কার আবেদন পাওয়া যায়নি।');

    const now = new Date().toISOString();
    target.status = status;
    target.admin_notes = notes;
    target.reviewed_at = now;
    target.reviewed_by = adminId;

    if (status === 'approved') {
      // ইউজারের রোলকে 'worker' এ রূপান্তর করা
      await this.updateUserRole(target.user_id, 'worker', 'super_admin');
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('worker_applications')
          .update({
            status,
            admin_notes: notes,
            reviewed_at: now,
            reviewed_by: adminId,
          })
          .eq('id', appId);
      } catch (err) {
        console.warn('Supabase review application error:', err);
      }
    }

    const localApps = getLS<WorkerApplication[]>('worker_applications', []);
    const idx = localApps.findIndex((a) => a.id === appId);
    if (idx >= 0) {
      localApps[idx] = target;
      setLS('worker_applications', localApps);
    }

    // নোটিফিকেশন প্রেরণ
    try {
      await communicationService.notifyAndEmail({
        userId: target.user_id,
        title: status === 'approved' ? 'ওয়ার্কার আবেদন অনুমোদিত হয়েছে! 🎉' : 'ওয়ার্কার আবেদন পর্যালোচিত হয়েছে',
        message:
          status === 'approved'
            ? 'অভিনন্দন! আপনার ওয়ার্কার আবেদনটি সফলভাবে অনুমোদিত হয়েছে। এখন থেকে আপনি সার্ভিস অর্ডার ক্লেইম করে কাজ করতে পারবেন।'
            : `আপনার ওয়ার্কার আবেদনটি পর্যালোচনার পর বাতিল করা হয়েছে। নোট: ${notes || 'পর্যাপ্ত তথ্যের অভাব'}`,
        link: status === 'approved' ? '/admin/claim-tasks' : '/dashboard',
        category: 'system',
      });
    } catch {
      // ignore
    }

    return target;
  },

  // -------------------------------------------------------------
  // COMMISSION SETTINGS & COMPANY PROFIT ENGINE
  // -------------------------------------------------------------
  async getCommissionSettings(): Promise<CommissionSettings> {
    const defaultSettings: CommissionSettings = {
      id: 'comm_default',
      worker_commission_percentage: 80, // 80% to worker, 20% to company
      admin_commission_percentage: 70,  // 70% to admin, 30% to company
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('commission_settings').select('*').limit(1).single();
        if (!error && data) return data as CommissionSettings;
      } catch {
        // fallback
      }
    }

    return getLS<CommissionSettings>('commission_settings', defaultSettings);
  },

  async updateCommissionSettings(
    newSettings: { worker_commission_percentage: number; admin_commission_percentage: number },
    adminId: string
  ): Promise<CommissionSettings> {
    const current = await this.getCommissionSettings();
    const updated: CommissionSettings = {
      ...current,
      worker_commission_percentage: Math.max(0, Math.min(100, newSettings.worker_commission_percentage)),
      admin_commission_percentage: Math.max(0, Math.min(100, newSettings.admin_commission_percentage)),
      updated_at: new Date().toISOString(),
      updated_by: adminId,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('commission_settings').upsert(updated);
      } catch (err) {
        console.warn('Supabase commission settings update error:', err);
      }
    }

    setLS('commission_settings', updated);
    return updated;
  },

  /**
   * অর্ডার সম্পূর্ণ হলে অটোমেটিক ওয়ার্কার/অ্যাডমিনের অ্যাকাউন্টে কমিশন ক্রেডিট ও কোম্পানি প্রফিট ক্যালকুলেশন
   */
  async distributeOrderCommission(order: Order): Promise<CompanyProfitRecord | null> {
    if (!order.assigned_admin) return null;

    // যদি এই অর্ডারের জন্য ইতিমধ্যে ডিস্ট্রিবিউশন করা হয়ে থাকে
    const existingProfits = await this.getCompanyProfitRecords();
    if (existingProfits.some((p) => p.order_id === order.id)) {
      return existingProfits.find((p) => p.order_id === order.id) || null;
    }

    const assignedProf = await this.getUserProfile(order.assigned_admin);
    const role = assignedProf?.role === 'worker' ? 'worker' : 'admin';
    const commSettings = await this.getCommissionSettings();

    const rate = role === 'worker' ? commSettings.worker_commission_percentage : commSettings.admin_commission_percentage;
    const workerPayout = Math.round((order.amount * rate) / 100);
    const companyProfit = order.amount - workerPayout;

    const record: CompanyProfitRecord = {
      id: `cprofit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      order_id: order.id,
      service_title: order.service_title || 'সার্ভিস অর্ডার',
      total_order_amount: order.amount,
      assigned_id: order.assigned_admin,
      assigned_name: order.assigned_admin_name || assignedProf?.full_name || 'কর্মকর্তা',
      assigned_role: role,
      worker_or_admin_payout: workerPayout,
      company_profit_amount: companyProfit,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('company_profit_records').insert(record);
      } catch (err) {
        console.warn('Supabase profit record insert error:', err);
      }
    }

    const localProfits = getLS<CompanyProfitRecord[]>('company_profit_records', []);
    localProfits.unshift(record);
    setLS('company_profit_records', localProfits);

    // ওয়ার্কার/অ্যাডমিনের উইথড্রএবল ব্যালেন্স বৃদ্ধি করা
    const balances = getLS<Record<string, number>>('worker_withdrawable_balances', {});
    balances[order.assigned_admin] = (balances[order.assigned_admin] || 0) + workerPayout;
    if (order.assigned_admin_email) {
      balances[order.assigned_admin_email] = (balances[order.assigned_admin_email] || 0) + workerPayout;
    }
    setLS('worker_withdrawable_balances', balances);

    // নোটিফাই করা
    try {
      await communicationService.notifyAndEmail({
        userId: order.assigned_admin,
        title: 'কাজের কমিশন অ্যাকাউন্টে যোগ হয়েছে! 💵',
        message: `অর্ডার #${order.order_number}-এর জন্য আপনার ৳${workerPayout.toLocaleString('bn-BD')} উপার্জিত ব্যালেন্সে ক্রেডিট হয়েছে। আপনি এখন উইথড্র রিকোয়েস্ট পাঠাতে পারবেন।`,
        link: '/admin/my-withdraw',
        category: 'wallet',
      });
    } catch {
      // ignore
    }

    return record;
  },

  async getCompanyProfitRecords(): Promise<CompanyProfitRecord[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('company_profit_records')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data as CompanyProfitRecord[];
      } catch {
        // fallback
      }
    }
    return getLS<CompanyProfitRecord[]>('company_profit_records', []);
  },

  async getCompanyProfitSummary(): Promise<{
    totalRevenue: number;
    totalWorkerPayouts: number;
    totalCompanyProfit: number;
    completedOrdersCount: number;
  }> {
    const records = await this.getCompanyProfitRecords();
    const totalRevenue = records.reduce((sum, r) => sum + r.total_order_amount, 0);
    const totalWorkerPayouts = records.reduce((sum, r) => sum + r.worker_or_admin_payout, 0);
    const totalCompanyProfit = records.reduce((sum, r) => sum + r.company_profit_amount, 0);

    return {
      totalRevenue,
      totalWorkerPayouts,
      totalCompanyProfit,
      completedOrdersCount: records.length,
    };
  },

  // -------------------------------------------------------------
  // PAYOUT ACCOUNTS & WITHDRAWAL REQUESTS
  // -------------------------------------------------------------
  async getPayoutAccount(userId: string): Promise<PayoutAccount | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('payout_accounts').select('*').eq('user_id', userId).maybeSingle();
        if (!error && data) return data as PayoutAccount;
      } catch {
        // fallback
      }
    }

    const accounts = getLS<Record<string, PayoutAccount>>('payout_accounts', {});
    return accounts[userId] || null;
  },

  async savePayoutAccount(account: PayoutAccount): Promise<PayoutAccount> {
    const now = new Date().toISOString();
    const payload = { ...account, updated_at: now };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('payout_accounts').upsert(payload);
      } catch (err) {
        console.warn('Supabase save payout account error:', err);
      }
    }

    const accounts = getLS<Record<string, PayoutAccount>>('payout_accounts', {});
    accounts[account.user_id] = payload;
    setLS('payout_accounts', accounts);

    return payload;
  },

  async getUserWithdrawableBalance(userId: string, userEmail?: string): Promise<number> {
    const balances = getLS<Record<string, number>>('worker_withdrawable_balances', {});
    const normEmail = userEmail?.trim().toLowerCase();
    const normId = userId?.trim().toLowerCase();

    try {
      await this.checkAndAutoCompleteOrders();
      const [allOrders, commSettings, withdrawals] = await Promise.all([
        this.getAllOrders(),
        this.getCommissionSettings(),
        this.getWithdrawalRequests(),
      ]);

      const myAccepted = allOrders.filter((o) => {
        const oAdminId = o.assigned_admin?.trim().toLowerCase();
        const oAdminEmail = o.assigned_admin_email?.trim().toLowerCase();
        const isAssigned =
          (oAdminId && (oAdminId === normId || (normEmail && oAdminId === normEmail))) ||
          (oAdminEmail && ((normEmail && oAdminEmail === normEmail) || oAdminEmail === normId));

        const isActiveOrDone = !['cancelled', 'refunded', 'pending'].includes(o.status);
        return isAssigned && isActiveOrDone;
      });

      const rate = commSettings.worker_commission_percentage || 80;
      const totalEarned = myAccepted.reduce((sum, o) => {
        return sum + Math.round((o.amount * rate) / 100);
      }, 0);

      const totalWithdrawn = withdrawals
        .filter((w) => {
          const wEmail = w.user_email?.trim().toLowerCase();
          const wId = w.user_id?.trim().toLowerCase();
          const isMyWithdraw =
            (wId && (wId === normId || (normEmail && wId === normEmail))) ||
            (wEmail && (wEmail === normEmail || wEmail === normId));
          return isMyWithdraw && (w.status === 'approved' || w.status === 'pending');
        })
        .reduce((sum, w) => sum + w.amount, 0);

      const calculated = Math.max(0, totalEarned - totalWithdrawn);

      balances[userId] = calculated;
      if (userEmail) balances[userEmail] = calculated;
      setLS('worker_withdrawable_balances', balances);

      return calculated;
    } catch (e) {
      console.warn('getUserWithdrawableBalance error:', e);
      const explicitById = balances[userId] || 0;
      const explicitByEmail = userEmail ? balances[userEmail] || 0 : 0;
      return Math.max(explicitById, explicitByEmail);
    }
  },

  async getWorkerCompletedOrders(
    userId: string,
    userEmail?: string
  ): Promise<{ order: Order; commission: number; rate: number; companyShare: number; companyRate: number }[]> {
    await this.checkAndAutoCompleteOrders();
    try {
      const [allOrders, commSettings] = await Promise.all([
        this.getAllOrders(),
        this.getCommissionSettings(),
      ]);
      const rate = commSettings.worker_commission_percentage || 80;
      const companyRate = 100 - rate;

      const normEmail = userEmail?.trim().toLowerCase();
      const normId = userId?.trim().toLowerCase();

      const myAccepted = allOrders.filter((o) => {
        const oAdminId = o.assigned_admin?.trim().toLowerCase();
        const oAdminEmail = o.assigned_admin_email?.trim().toLowerCase();
        const isAssigned =
          (oAdminId && (oAdminId === normId || (normEmail && oAdminId === normEmail))) ||
          (oAdminEmail && ((normEmail && oAdminEmail === normEmail) || oAdminEmail === normId));

        const isActiveOrDone = !['cancelled', 'refunded', 'pending'].includes(o.status);
        return isAssigned && isActiveOrDone;
      });

      return myAccepted.map((o) => {
        const commission = Math.round((o.amount * rate) / 100);
        const companyShare = o.amount - commission;
        return {
          order: o,
          commission,
          rate,
          companyShare,
          companyRate,
        };
      });
    } catch {
      return [];
    }
  },

  async submitWithdrawalRequest(
    userId: string,
    userName: string,
    userEmail: string,
    role: 'worker' | 'admin',
    amount: number,
    account: PayoutAccount
  ): Promise<WithdrawalRequest> {
    const normId = userId?.trim().toLowerCase();
    const normEmail = userEmail?.trim().toLowerCase();

    // 1. ডাবল উইথড্র রিকোয়েস্ট প্রিভেনশন Guard
    const requests = await this.getWithdrawalRequests();
    const hasPending = requests.some((r) => {
      const rId = r.user_id?.trim().toLowerCase();
      const rEmail = r.user_email?.trim().toLowerCase();
      const isMyReq = (rId && (rId === normId || (normEmail && rId === normEmail))) ||
                      (rEmail && (rEmail === normEmail || rEmail === normId));
      return isMyReq && r.status === 'pending';
    });

    if (hasPending) {
      throw new Error('আপনার একটি উইথড্র রিকোয়েস্ট ইতিপূর্বে পেন্ডিং রয়েছে। অনুগ্রহ করে পূর্বের আবেদনটি প্রসেস হওয়া পর্যন্ত অপেক্ষা করুন।');
    }

    // 2. ব্যালেন্স চেক
    const currentBalance = await this.getUserWithdrawableBalance(userId, userEmail);
    if (amount <= 0) throw new Error('উত্তোলনের পরিমাণ ০ টাকার বেশি হতে হবে।');
    if (amount > currentBalance) {
      throw new Error(`আপনার পর্যাপ্ত উত্তোলনযোগ্য ব্যালেন্স নেই। বর্তমান ব্যালেন্স: ৳ ${currentBalance.toLocaleString('bn-BD')}`);
    }

    const now = new Date().toISOString();
    const req: WithdrawalRequest = {
      id: `wreq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      role,
      amount,
      payout_account: account,
      status: 'pending',
      created_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('withdrawal_requests').upsert({
          id: req.id,
          user_id: req.user_id,
          user_name: req.user_name,
          user_email: req.user_email,
          role: req.role,
          amount: req.amount,
          payout_account: req.payout_account,
          status: req.status,
          created_at: req.created_at,
        });
        if (error) {
          console.warn('Supabase withdrawal insert error:', error.message);
        }
      } catch (err) {
        console.warn('Supabase withdrawal request insert exception:', err);
      }
    }

    const allReqs = getLS<WithdrawalRequest[]>('withdrawal_requests', []);
    allReqs.unshift(req);
    setLS('withdrawal_requests', allReqs);

    // 3. ব্যালেন্স তাত্ক্ষণিকভাবে কর্তন ও আপডেট
    const remainingBalance = Math.max(0, currentBalance - amount);
    const balances = getLS<Record<string, number>>('worker_withdrawable_balances', {});
    balances[userId] = remainingBalance;
    if (userEmail) balances[userEmail] = remainingBalance;
    setLS('worker_withdrawable_balances', balances);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet_updated'));
      window.dispatchEvent(new CustomEvent('withdrawal_requests_updated'));
    }

    return req;
  },

  async getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
    let remoteReqs: WithdrawalRequest[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('withdrawal_requests')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && Array.isArray(data)) remoteReqs = data as WithdrawalRequest[];
      } catch {
        // fallback
      }
    }
    const localReqs = getLS<WithdrawalRequest[]>('withdrawal_requests', []);

    const mergedMap = new Map<string, WithdrawalRequest>();

    // ১. প্রথমে লোকাল স্টোরেজ থেকে ডেটা ম্যাপে প্রবেশ করানো
    localReqs.forEach((r) => {
      if (r && r.id) {
        let accountObj = r.payout_account;
        if (typeof accountObj === 'string') {
          try { accountObj = JSON.parse(accountObj); } catch {}
        }
        mergedMap.set(r.id, {
          ...r,
          payout_account: accountObj || { user_id: r.user_id, method: 'bkash', account_number: '', updated_at: r.created_at },
        });
      }
    });

    // ২. সুপাবেজ (Remote Supabase) ডেটা ম্যাপে প্রসেস করা — সুপাবেজের অনুমোদিত/প্রত্যাখ্যাত স্ট্যাটাস সব সময় প্রাধান্য পাবে
    remoteReqs.forEach((r) => {
      if (r && r.id) {
        let accountObj = r.payout_account;
        if (typeof accountObj === 'string') {
          try { accountObj = JSON.parse(accountObj); } catch {}
        }
        const local = mergedMap.get(r.id);
        mergedMap.set(r.id, {
          ...(local || {}),
          ...r, // Remote Supabase values (especially status: 'approved' | 'rejected') overwrite local state
          payout_account: accountObj || local?.payout_account || { user_id: r.user_id, method: 'bkash', account_number: '', updated_at: r.created_at },
        });
      }
    });

    const finalResult = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
    setLS('withdrawal_requests', finalResult);

    // ৩. সুপাবেজে নতুন লোকাল রিকোয়েস্ট সিঙ্ক করা (শুধুমাত্র পেন্ডিং অবস্থায় থাকলে)
    if (isSupabaseConfigured && supabase && localReqs.length > 0) {
      const remoteIds = new Set(remoteReqs.map((r) => r.id));
      const missingInRemote = localReqs.filter((r) => r && r.id && !remoteIds.has(r.id) && r.status === 'pending');
      if (missingInRemote.length > 0) {
        Promise.all(
          missingInRemote.map((r) =>
            supabase!.from('withdrawal_requests').upsert({
              id: r.id,
              user_id: r.user_id,
              user_name: r.user_name,
              user_email: r.user_email,
              role: r.role,
              amount: r.amount,
              payout_account: r.payout_account,
              status: r.status,
              admin_notes: r.admin_notes,
              created_at: r.created_at,
            })
          )
        ).catch((err) => console.warn('Auto-sync withdrawal requests error:', err));
      }
    }

    return finalResult;
  },

  async processWithdrawalRequest(
    requestId: string,
    status: 'approved' | 'rejected',
    notes: string,
    adminId: string
  ): Promise<WithdrawalRequest> {
    const requests = await this.getWithdrawalRequests();
    const target = requests.find((r) => r.id === requestId);
    if (!target) throw new Error('উইথড্র রিকোয়েস্ট পাওয়া যায়নি।');
    if (target.status !== 'pending') throw new Error('এই রিকোয়েস্টটি ইতিমধ্যে প্রসেস করা হয়েছে।');

    const now = new Date().toISOString();
    target.status = status;
    target.admin_notes = notes;
    target.processed_at = now;
    target.processed_by = adminId;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('withdrawal_requests')
          .update({
            status,
            admin_notes: notes,
            processed_at: now,
            processed_by: adminId,
          })
          .eq('id', requestId);
      } catch (err) {
        console.warn('Supabase process withdrawal request error:', err);
      }
    }

    const localRequests = getLS<WithdrawalRequest[]>('withdrawal_requests', []);
    const idx = localRequests.findIndex((r) => r.id === requestId);
    if (idx >= 0) {
      localRequests[idx] = target;
      setLS('withdrawal_requests', localRequests);
    }

    // ব্যালেন্স রিক্যালকুলেট ও রিফ্রেশ (বাতিল হলে টাকা রিফান্ড হবে, এপ্রুভ হলে কনফার্ম থাকবে)
    await this.getUserWithdrawableBalance(target.user_id, target.user_email);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet_updated'));
      window.dispatchEvent(new CustomEvent('withdrawal_requests_updated'));
    }

    // নোটিফিকেশন পাঠানো
    try {
      await communicationService.notifyAndEmail({
        userId: target.user_id,
        title: status === 'approved' ? 'টাকা উত্তোলন সফল হয়েছে! 💸' : 'টাকা উত্তোলনের অনুরোধ বাতিল',
        message:
          status === 'approved'
            ? `আপনার ৳${target.amount.toLocaleString('bn-BD')} উত্তোলনের আবেদনটি অনুমোদিত হয়েছে এবং ${target.payout_account.method.toUpperCase()} (${target.payout_account.account_number})-এ প্রেরণ করা হয়েছে।`
            : `আপনার ৳${target.amount.toLocaleString('bn-BD')} উত্তোলনের আবেদনটি বাতিল করা হয়েছে। কারণ: ${notes || 'পেমেন্ট তথ্য যাচাই করতে ব্যর্থ'}`,
        link: '/admin/withdraw',
        category: 'wallet',
      });
    } catch {
      // ignore
    }

    return target;
  },

  async cancelWithdrawalRequest(requestId: string, userId: string): Promise<WithdrawalRequest> {
    const requests = await this.getWithdrawalRequests();
    const target = requests.find((r) => r.id === requestId);
    if (!target) throw new Error('উইথড্র রিকোয়েস্ট পাওয়া যায়নি।');
    if (target.status !== 'pending') {
      throw new Error('শুধুমাত্র অপেক্ষমাণ (Pending) উইথড্র রিকোয়েস্ট বাতিল করা সম্ভব। অনুমোদিত বা পরিশোধিত রিকোয়েস্ট আর কোনো অবস্থাতেই বাতিল করা সম্ভব নয়।');
    }

    const now = new Date().toISOString();
    target.status = 'rejected';
    target.admin_notes = 'ব্যবহারকারী কর্তৃক উইথড্র আবেদন বাতিল করা হয়েছে';
    target.processed_at = now;
    target.processed_by = userId;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('withdrawal_requests')
          .update({
            status: 'rejected',
            admin_notes: 'ব্যবহারকারী কর্তৃক উইথড্র আবেদন বাতিল করা হয়েছে',
            processed_at: now,
            processed_by: userId,
          })
          .eq('id', requestId);
      } catch (err) {
        console.warn('Supabase cancel withdrawal request error:', err);
      }
    }

    const localRequests = getLS<WithdrawalRequest[]>('withdrawal_requests', []);
    const idx = localRequests.findIndex((r) => r.id === requestId);
    if (idx >= 0) {
      localRequests[idx] = target;
      setLS('withdrawal_requests', localRequests);
    }

    // ব্যালেন্স রিক্যালকুলেট ও রিফ্রেশ (বাতিল হওয়ায় টাকা ফেরত আসবে)
    await this.getUserWithdrawableBalance(target.user_id, target.user_email);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wallet_updated'));
      window.dispatchEvent(new CustomEvent('withdrawal_requests_updated'));
    }

    return target;
  },

  async deleteWithdrawalRequest(requestId: string, adminId: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('withdrawal_requests').delete().eq('id', requestId);
      } catch (err) {
        console.warn('Supabase delete withdrawal request error:', err);
      }
    }

    const localRequests = getLS<WithdrawalRequest[]>('withdrawal_requests', []);
    const filtered = localRequests.filter((r) => r.id !== requestId);
    setLS('withdrawal_requests', filtered);

    // Audit log
    const auditLogs = getLS<AuditLog[]>('audit_logs', []);
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      actor_id: adminId,
      action: 'DELETE_WITHDRAWAL_REQUEST',
      target_type: 'withdrawal_request',
      target_id: requestId,
      details: { timestamp: new Date().toISOString() },
      created_at: new Date().toISOString(),
    });
    setLS('audit_logs', auditLogs);

    return true;
  },

  // -------------------------------------------------------------
  // BLOG POSTS
  // -------------------------------------------------------------
  async getBlogPosts(options?: {
    onlyPublished?: boolean;
    category?: string;
    tag?: string;
    search?: string;
  }): Promise<BlogPost[]> {
    let posts: BlogPost[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
        if (options?.onlyPublished) {
          query = query.eq('is_published', true);
        }
        if (options?.category && options.category !== 'all') {
          query = query.eq('category', options.category);
        }
        const { data, error } = await query;
        if (!error && data) {
          posts = data as BlogPost[];
          setLS('blog_posts', posts);
        } else {
          posts = getLS<BlogPost[]>('blog_posts', INITIAL_BLOG_POSTS);
        }
      } catch {
        posts = getLS<BlogPost[]>('blog_posts', INITIAL_BLOG_POSTS);
      }
    } else {
      posts = getLS<BlogPost[]>('blog_posts', INITIAL_BLOG_POSTS);
    }

    if (options?.onlyPublished) {
      posts = posts.filter((p) => p.is_published);
    }
    if (options?.category && options.category !== 'all') {
      posts = posts.filter((p) => p.category.toLowerCase() === options.category?.toLowerCase());
    }
    if (options?.tag && options.tag !== 'all') {
      posts = posts.filter((p) => p.tags && p.tags.some((t) => t.toLowerCase() === options.tag?.toLowerCase()));
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.title_bn?.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.excerpt_bn?.toLowerCase().includes(q) ||
          p.content.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return posts;
  },

  async getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .or(`slug.eq.${slug},id.eq.${slug}`)
          .maybeSingle();
        if (!error && data) return data as BlogPost;
      } catch {
        // fallback to list search
      }
    }
    const posts = await this.getBlogPosts({ onlyPublished: false });
    return posts.find((p) => p.slug === slug || p.id === slug) || null;
  },

  async createBlogPost(postData: Partial<BlogPost>): Promise<BlogPost> {
    const now = new Date().toISOString();
    const slug =
      postData.slug ||
      (postData.title || postData.title_bn || 'post')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') ||
      `post-${Date.now()}`;

    const newPost: BlogPost = {
      id: postData.id || `blog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: postData.title || 'Untitled Post',
      title_bn: postData.title_bn || postData.title || 'শিরোনামহীন পোস্ট',
      slug,
      excerpt: postData.excerpt || '',
      excerpt_bn: postData.excerpt_bn || postData.excerpt || '',
      content: postData.content || '',
      content_bn: postData.content_bn || postData.content || '',
      category: postData.category || 'General',
      category_bn: postData.category_bn || 'সাধারণ',
      tags: Array.isArray(postData.tags) ? postData.tags : [],
      cover_image: postData.cover_image || 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1200&q=80',
      author_id: postData.author_id || 'admin_super_01',
      author_name: postData.author_name || 'MukiSoft Team',
      author_role: postData.author_role || 'MukiSoft Team',
      author_avatar: postData.author_avatar || '',
      meta_title: postData.meta_title || postData.title,
      meta_description: postData.meta_description || postData.excerpt,
      is_published: postData.is_published ?? true,
      is_featured: postData.is_featured ?? false,
      views_count: 1,
      likes_count: 0,
      reading_time_minutes: Math.ceil(((postData.content || '').length + 100) / 500),
      created_at: now,
      updated_at: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('blog_posts').insert(newPost);
      } catch (err) {
        console.warn('Supabase create blog post error:', err);
      }
    }

    // Server-side persistent storage sync for OpenGraph
    try {
      fetch('/api/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      }).catch(() => {});
    } catch {
      // ignore
    }

    const local = getLS<BlogPost[]>('blog_posts', INITIAL_BLOG_POSTS);
    local.unshift(newPost);
    setLS('blog_posts', local);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('blog_posts_updated'));
    }

    return newPost;
  },

  async updateBlogPost(id: string, updates: Partial<BlogPost>): Promise<BlogPost> {
    const local = getLS<BlogPost[]>('blog_posts', INITIAL_BLOG_POSTS);
    const idx = local.findIndex((p) => p.id === id);
    let target = idx >= 0 ? { ...local[idx] } : null;

    if (!target) {
      const fetched = await this.getBlogPostBySlug(id);
      if (fetched) target = { ...fetched };
    }

    if (!target) {
      throw new Error('Blog post not found');
    }

    const updatedPost: BlogPost = {
      ...target,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('blog_posts').update(updatedPost).eq('id', id);
      } catch (err) {
        console.warn('Supabase update blog post error:', err);
      }
    }

    // Server-side sync for OpenGraph
    try {
      fetch('/api/blog-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPost),
      }).catch(() => {});
    } catch {
      // ignore
    }

    if (idx >= 0) {
      local[idx] = updatedPost;
    } else {
      local.unshift(updatedPost);
    }
    setLS('blog_posts', local);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('blog_posts_updated'));
    }

    return updatedPost;
  },

  async deleteBlogPost(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('blog_posts').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete blog post error:', err);
      }
    }

    try {
      fetch(`/api/blog-posts/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {
      // ignore
    }

    const local = getLS<BlogPost[]>('blog_posts', INITIAL_BLOG_POSTS);
    const filtered = local.filter((p) => p.id !== id);
    setLS('blog_posts', filtered);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('blog_posts_updated'));
    }

    return true;
  },

  async incrementBlogPostViews(id: string): Promise<number> {
    const local = getLS<BlogPost[]>('blog_posts', INITIAL_BLOG_POSTS);
    const idx = local.findIndex((p) => p.id === id || p.slug === id);
    if (idx >= 0) {
      local[idx].views_count = (local[idx].views_count || 0) + 1;
      setLS('blog_posts', local);
      return local[idx].views_count;
    }
    return 1;
  },
};

