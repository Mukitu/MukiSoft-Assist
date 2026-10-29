import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  Clock,
  Layers,
  Sparkles,
  AlertTriangle,
  X,
  RefreshCw,
  FolderTree,
  CheckCircle2,
  Database,
  ArrowRight,
  Code,
  Globe,
  Palette,
  Shield,
  Headphones,
  ShoppingBag,
  FileText,
  Briefcase,
  Sliders,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';
import { api } from '../../services/api';
import { toBengaliCurrency, toBengaliDigits } from '../../lib/i18n';
import { ServiceItem, ServiceCategory } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { INITIAL_CATEGORIES, INITIAL_SERVICES } from '../../data/initialCatalog';

interface AdminServicesProps {
  defaultTab?: 'services' | 'categories';
  onNavigate?: (path: string) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Layers', label: 'Layers (ডিফল্ট)', icon: Layers },
  { name: 'Code', label: 'Code (প্রোগ্রামিং)', icon: Code },
  { name: 'Globe', label: 'Globe (ওয়েব/ইন্টারনেট)', icon: Globe },
  { name: 'Palette', label: 'Palette (ডিজাইন/ক্রিয়েটিভ)', icon: Palette },
  { name: 'Shield', label: 'Shield (নিরাপত্তা)', icon: Shield },
  { name: 'Headphones', label: 'Headphones (সাপোর্ট)', icon: Headphones },
  { name: 'ShoppingBag', label: 'ShoppingBag (ই-কমার্স)', icon: ShoppingBag },
  { name: 'FileText', label: 'FileText (ডকুমেন্টেশন)', icon: FileText },
  { name: 'Briefcase', label: 'Briefcase (ব্যবসা)', icon: Briefcase },
  { name: 'Sparkles', label: 'Sparkles (বিশেষ)', icon: Sparkles },
];

export const AdminServices: React.FC<AdminServicesProps> = ({ defaultTab = 'services', onNavigate }) => {
  const { showToast } = useNotification();
  const [activeTab, setActiveTab] = useState<'services' | 'categories'>(defaultTab);

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // মাল্টি-সিলেক্ট ও বাল্ক অ্যাকশন স্টেট
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSyncingCatalog, setIsSyncingCatalog] = useState(false);
  const [isConfirmBulkDeleteOpen, setIsConfirmBulkDeleteOpen] = useState(false);
  const [isConfirmDeleteAllOpen, setIsConfirmDeleteAllOpen] = useState(false);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  // সার্ভিসেস ফিল্টার ও সার্চ স্টেট
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // সার্ভিস এডিট ও নতুন সেবা যুক্ত করার মডাল
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<ServiceItem> | null>(null);
  const [savingService, setSavingService] = useState(false);
  const [deletingService, setDeletingService] = useState<ServiceItem | null>(null);

  // ক্যাটাগরি এডিট ও নতুন ক্যাটাগরি যুক্ত করার মডাল
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<ServiceCategory> | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ServiceCategory | null>(null);

  // সিংক ফাংশন: ডাটা লোড
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [srvs, cats] = await Promise.all([api.getServices(), api.getCategories()]);
      setServices(srvs);
      setCategories(cats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্যাটালগ লোড করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // সুপাবেস রিয়েল-টাইম লিসেনার (Realtime Subscription):
  // যখনই সুপাবেসের টেবিল এডিটরে কোনো ডাটা যুক্ত, এডিট বা ডিলিট হবে, সাথে সাথে অ্যাপ রিফ্রেশ হবে!
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const client = supabase;
    const channel = client
      .channel('admin-services-categories-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        loadData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_categories' }, () => {
        loadData(true);
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [loadData]);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  const handleTabChange = (tab: 'services' | 'categories') => {
    setActiveTab(tab);
    if (onNavigate) {
      onNavigate(tab === 'categories' ? '/admin/categories' : '/admin/services');
    }
  };

  // ----------------------------------------------------------------------
  // সার্ভিস অ্যাকশনস
  // ----------------------------------------------------------------------
  const handleToggleActiveService = async (service: ServiceItem) => {
    try {
      const updated = await api.createOrUpdateService({ ...service, is_active: !service.is_active });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast({
        type: 'info',
        title: 'অবস্থা হালনাগাদ',
        message: `${service.title_bn || service.title} এখন ${updated.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`,
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অবস্থা পরিবর্তন করা যায়নি' });
    }
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.title_bn && !editingService?.title) return;
    if (!editingService?.price || editingService.price <= 0) {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'সঠিক মূল্য নির্ধারণ করুন' });
      return;
    }

    setSavingService(true);
    try {
      const baseTitle = editingService.title || editingService.title_bn || 'service';
      const autoSlug =
        editingService.slug ||
        baseTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') ||
        `service-${Date.now()}`;

      const payload: Partial<ServiceItem> = {
        ...editingService,
        title: editingService.title || editingService.title_bn,
        title_bn: editingService.title_bn || editingService.title,
        slug: autoSlug,
        category_id: editingService.category_id || categories[0]?.id,
        price: Number(editingService.price),
        promotional_price: editingService.promotional_price ? Number(editingService.promotional_price) : null,
        delivery_days: Number(editingService.delivery_days || 3),
        is_active: editingService.is_active ?? true,
        is_featured: editingService.is_featured ?? false,
      };

      const saved = await api.createOrUpdateService(payload);

      setServices((prev) => {
        const idx = prev.findIndex((s) => s.id === saved.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = saved;
          return clone;
        }
        return [saved, ...prev];
      });

      showToast({
        type: 'success',
        title: 'সেবা সংরক্ষিত হয়েছে',
        message: 'ক্যাটালগে সেবার বিবরণ সফলভাবে হালনাগাদ করা হয়েছে।',
      });
      setIsServiceModalOpen(false);
      setEditingService(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সেবা সংরক্ষণ করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSavingService(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;
    try {
      await api.deleteService(deletingService.id);
      setServices((prev) => prev.filter((s) => s.id !== deletingService.id));
      setSelectedServiceIds((prev) => prev.filter((id) => id !== deletingService.id));
      showToast({
        type: 'success',
        title: 'সেবা মুছে ফেলা হয়েছে',
        message: `${deletingService.title_bn || deletingService.title} সফলভাবে ক্যাটালগ থেকে মুছে ফেলা হয়েছে।`,
      });
      setDeletingService(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সেবা মুছে ফেলা যায়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    }
  };

  const handleToggleSelectAllServices = () => {
    if (selectedServiceIds.length === filteredServices.length) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(filteredServices.map((s) => s.id));
    }
  };

  const handleToggleSelectService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteServices = async () => {
    if (selectedServiceIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await api.deleteServices(selectedServiceIds);
      setServices((prev) => prev.filter((s) => !selectedServiceIds.includes(s.id)));
      showToast({
        type: 'success',
        title: 'সেবাগুলো মুছে ফেলা হয়েছে',
        message: `${toBengaliDigits(selectedServiceIds.length)}টি সেবা সফলভাবে ক্যাটালগ থেকে মুছে ফেলা হয়েছে।`,
      });
      setSelectedServiceIds([]);
      setIsConfirmBulkDeleteOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সেবাগুলো মুছে ফেলা যায়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteAllServices = async () => {
    setIsBulkDeleting(true);
    try {
      await api.deleteAllServices();
      setServices([]);
      setSelectedServiceIds([]);
      showToast({
        type: 'success',
        title: 'সকল সেবা মুছে ফেলা হয়েছে',
        message: 'ক্যাটালগের সকল ডেমো/পূর্বের সেবা মুছে ফেলা হয়েছে। এখন আপনি নতুন সেবা যোগ করতে পারেন।',
      });
      setIsConfirmDeleteAllOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সকল সেবা মোছা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSyncOfficialCatalog = async () => {
    setIsSyncingCatalog(true);
    try {
      if (isSupabaseConfigured && supabase) {
        // 1. Categories upsert
        const catPayload = INITIAL_CATEGORIES.map((c) => ({
          id: c.id,
          name: c.name,
          name_bn: c.name_bn,
          slug: c.slug,
          description: c.description,
          description_bn: c.description_bn,
          icon: c.icon,
          display_order: c.display_order,
          is_active: c.is_active,
        }));
        const { error: catErr } = await supabase.from('service_categories').upsert(catPayload, { onConflict: 'id' });
        if (catErr) {
          console.warn('Upsert categories notice:', catErr.message);
        }

        // 2. Services upsert
        const srvPayload = INITIAL_SERVICES.map((s) => ({
          id: s.id,
          category_id: s.category_id,
          title: s.title,
          title_bn: s.title_bn,
          slug: s.slug,
          description: s.description,
          description_bn: s.description_bn,
          price: s.price,
          promotional_price: s.promotional_price ?? null,
          delivery_days: s.delivery_days,
          requirements: s.requirements,
          revision_policy: s.revision_policy,
          is_active: s.is_active,
          is_featured: s.is_featured,
          is_gov_service: false,
        }));
        const { error: srvErr } = await supabase.from('services').upsert(srvPayload, { onConflict: 'id' });
        if (srvErr) throw new Error(srvErr.message);
      } else {
        for (const cat of INITIAL_CATEGORIES) {
          await api.createOrUpdateCategory(cat);
        }
        for (const srv of INITIAL_SERVICES) {
          await api.createOrUpdateService(srv);
        }
      }
      await loadData(true);
      showToast({
        type: 'success',
        title: 'ক্যাটালগ সফলভাবে সিঙ্ক হয়েছে',
        message: 'অফিসিয়াল ৪টি ক্যাটাগরি ও ৯টি ডিজিটাল সেবা ডাটাবেজে হালনাগাদ করা হয়েছে।',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্যাটালগ সিঙ্ক করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsSyncingCatalog(false);
    }
  };

  // ----------------------------------------------------------------------
  // ক্যাটাগরি অ্যাকশনস
  // ----------------------------------------------------------------------
  const handleToggleActiveCategory = async (category: ServiceCategory) => {
    try {
      const updated = await api.createOrUpdateCategory({ ...category, is_active: !category.is_active });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      showToast({
        type: 'info',
        title: 'ক্যাটাগরি অবস্থা হালনাগাদ',
        message: `${category.name_bn || category.name} এখন ${updated.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}।`,
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'অবস্থা পরিবর্তন করা যায়নি' });
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name && !editingCategory?.name_bn) {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'ক্যাটাগরির নাম প্রদান করুন।' });
      return;
    }

    setSavingCategory(true);
    try {
      const baseName = editingCategory.name || editingCategory.name_bn || 'category';
      const autoSlug =
        editingCategory.slug ||
        baseName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') ||
        `cat-${Date.now()}`;

      const payload: Partial<ServiceCategory> = {
        ...editingCategory,
        name: editingCategory.name || editingCategory.name_bn,
        name_bn: editingCategory.name_bn || editingCategory.name,
        slug: autoSlug,
        icon: editingCategory.icon || 'Layers',
        display_order: Number(editingCategory.display_order ?? categories.length + 1),
        is_active: editingCategory.is_active ?? true,
      };

      const saved = await api.createOrUpdateCategory(payload);

      setCategories((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx >= 0) {
          const clone = [...prev];
          clone[idx] = saved;
          return clone;
        }
        return [...prev, saved];
      });

      showToast({
        type: 'success',
        title: 'ক্যাটাগরি সংরক্ষিত',
        message: `${saved.name_bn || saved.name} সফলভাবে হালনাগাদ হয়েছে।`,
      });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্যাটাগরি সংরক্ষণ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await api.deleteCategory(deletingCategory.id);
      setCategories((prev) => prev.filter((c) => c.id !== deletingCategory.id));
      showToast({
        type: 'success',
        title: 'ক্যাটাগরি মুছে ফেলা হয়েছে',
        message: `${deletingCategory.name_bn || deletingCategory.name} সফলভাবে মুছে ফেলা হয়েছে।`,
      });
      setDeletingCategory(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্যাটাগরি মুছে ফেলা যায়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    }
  };

  // ফিল্টার করা সার্ভিস
  const filteredServices = services.filter((s) => {
    if (selectedCategoryFilter !== 'all' && s.category_id !== selectedCategoryFilter) return false;
    if (statusFilter === 'active' && !s.is_active) return false;
    if (statusFilter === 'inactive' && s.is_active) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q) || (s.title_bn && s.title_bn.includes(q));
      const matchDesc = (s.description && s.description.toLowerCase().includes(q)) || (s.description_bn && s.description_bn.includes(q));
      return matchTitle || matchDesc;
    }
    return true;
  });

  const activeServicesCount = services.filter((s) => s.is_active).length;
  const activeCategoriesCount = categories.filter((c) => c.is_active).length;

  return (
    <div className="space-y-6">
      {/* শীর্ষ হেডার ও ট্যাব সুইচ */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
              ক্যাটালগ ও সার্ভিস ম্যানেজমেন্ট
            </span>
            {isSupabaseConfigured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Database className="w-3 h-3 text-emerald-600" />
                <span>Supabase Live Sync</span>
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">সেবা ও ক্যাটাগরি নিয়ন্ত্রণ</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            সার্ভিস ক্যাটাগরি এবং ডিজিটাল সেবাসমূহ যোগ, সম্পাদনা ও Supabase ডাটাবেজের সাথে স্বয়ংক্রিয়ভাবে সিংক রাখুন।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="p-2.5 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Supabase থেকে পুনরায় সিংক করুন"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            onClick={handleSyncOfficialCatalog}
            disabled={isSyncingCatalog}
            className="px-3.5 py-2.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            title="১-ক্লিকে অফিসিয়াল ৪টি ক্যাটাগরি ও ৯টি সেবা Supabase এ আপলোড করুন"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${isSyncingCatalog ? 'animate-spin' : ''}`} />
            <span>{isSyncingCatalog ? 'সিঙ্ক হচ্ছে...' : 'অফিসিয়াল ক্যাটালগ সিঙ্ক'}</span>
          </button>

          <button
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className={`px-3 py-2.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 shadow-xs ${
              showSqlGuide
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            title="Supabase Foreign Key এরর ফিক্স ও অল ডিলিট SQL স্ক্রিপ্ট"
          >
            <Terminal className="w-3.5 h-3.5 text-amber-600" />
            <span>SQL ফিক্স গাইড</span>
          </button>

          {activeTab === 'services' && services.length > 0 && (
            <button
              onClick={() => setIsConfirmDeleteAllOpen(true)}
              className="px-3 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              title="সকল ডেমো সেবা এক ক্লিকে মুছে ফেলুন"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>সব সেবা মুছুন</span>
            </button>
          )}

          {activeTab === 'services' ? (
            <button
              onClick={() => {
                setEditingService({
                  category_id: categories[0]?.id || '',
                  delivery_days: 3,
                  price: 1500,
                  is_active: true,
                  is_featured: false,
                  revision_policy: 'সর্বোচ্চ ২ বার ফ্রি রিভিশন',
                  requirements: 'প্রয়োজনীয় নথি বা বিস্তারিত তথ্য জমা দিন।',
                });
                setIsServiceModalOpen(true);
              }}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন সেবা যুক্ত করুন</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setEditingCategory({
                  display_order: categories.length + 1,
                  icon: 'Layers',
                  is_active: true,
                });
                setIsCategoryModalOpen(true);
              }}
              className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন ক্যাটাগরি যুক্ত করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* SQL গাইড ও ডিলিট ফিক্স প্যানেল */}
      {showSqlGuide && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-bold text-white">
                Supabase Foreign Key ফিক্স ও অফিসিয়াল ক্যাটালগ SQL স্ক্রিপ্ট
              </h4>
            </div>
            <button
              onClick={() => {
                const sqlText = `-- ========================================================
-- ধাপ ১: ডিলিট এরর ফিক্স (Foreign Key Safe Constraints)
-- ========================================================
ALTER TABLE public.orders ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_service_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.services ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_category_id_fkey;
ALTER TABLE public.services ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id) ON DELETE SET NULL;

-- ========================================================
-- ধাপ ২: অফিসিয়াল ৪টি ক্যাটাগরি এন্ট্রি / সিঙ্ক
-- ========================================================
INSERT INTO public.service_categories (id, name, name_bn, slug, description, description_bn, icon, display_order, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111101', $$Website & E-commerce$$, $$ওয়েবসাইট ও ই-কমার্স$$, $$website-ecommerce$$, $$Professional e-commerce stores, landing pages, website fixes, and store setup.$$, $$প্রফেশনাল ই-কমার্স স্টোর, ব্যবসার ল্যান্ডিং পেজ, ওয়েবসাইট ফিক্স ও অনলাইন শপ সেটআপ।$$, $$Globe$$, 1, true),
  ('11111111-1111-1111-1111-111111111102', $$Business & Digital Setup$$, $$ব্যবসা ও ডিজিটাল সেটআপ$$, $$business-digital-setup$$, $$Business presence, WhatsApp Business automation, and catalog configuration.$$, $$অফিসিয়াল হোয়াটসঅ্যাপ বিজনেস প্রোফাইল, ক্যাটালগ ও অটোমেশন সেটআপ।$$, $$Briefcase$$, 2, true),
  ('11111111-1111-1111-1111-111111111103', $$Career & Documents$$, $$ক্যারিয়ার ও ডকুমেন্ট$$, $$career-documents$$, $$Professional pitch decks, resumes, CVs, and job application cover letters.$$, $$প্রফেশনাল প্রেজেন্টেশন ও পিচ ডেক, স্ট্যান্ডার্ড সিভি ও কভার লেটার প্যাকেজ।$$, $$FileText$$, 3, true),
  ('11111111-1111-1111-1111-111111111104', $$Data & Productivity$$, $$ডেটা ও প্রোডাক্টিভিটি$$, $$data-productivity$$, $$Excel data cleanup, deduplication, spreadsheets, and website performance audits.$$, $$এক্সেল ডেটা ক্লিনআপ, স্প্রেডশিট সাজানো এবং ওয়েবসাইট পারফরম্যান্স অডিট রিপোর্ট।$$, $$Database$$, 4, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  description_bn = EXCLUDED.description_bn,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- ========================================================
-- ধাপ ৩: অফিসিয়াল ৯টি ডিজিটাল সার্ভিস এন্ট্রি / সিঙ্ক
-- ========================================================
INSERT INTO public.services (id, category_id, title, title_bn, slug, description, description_bn, price, delivery_days, requirements, revision_policy, is_active, is_featured, is_gov_service)
VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    $$E-commerce Website Development$$,
    $$ই-কমার্স ওয়েবসাইট তৈরি$$,
    $$ecommerce-website-development$$,
    $$Basic online store with product list, category filtering, product details, and contact options for small businesses.$$,
    $$ছোট ব্যবসার জন্য প্রোডাক্ট লিস্ট, ক্যাটাগরি, প্রোডাক্টের বিবরণ ও যোগাযোগের সুবিধাসহ একটি বেসিক অনলাইন স্টোর তৈরি করা হবে। উন্নত ফিচার প্রয়োজন হলে আলাদা মূল্য নির্ধারণ করা হবে।$$,
    1999.00,
    4,
    $$ব্যবসার বিবরণ, পণ্যের ছবি ও মূল্যতালিকা, লোগো এবং যোগাযোগের তথ্য।$$,
    $$২ বার প্রয়োজনীয় পরিবর্তন বা রিভিশন ফ্রি।$$,
    true,
    true,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111101',
    $$Business Landing Page$$,
    $$ব্যবসার ল্যান্ডিং পেজ$$,
    $$business-landing-page$$,
    $$Mobile-friendly one-page website designed to showcase business services, contact buttons, and clear calls to action.$$,
    $$ব্যবসা, পণ্য বা সার্ভিস প্রচারের জন্য একটি মোবাইল-ফ্রেন্ডলি ওয়েবপেজ তৈরি করা হবে, যেখানে প্রয়োজনীয় তথ্য, ছবি, যোগাযোগের বাটন ও কল-টু-অ্যাকশন থাকবে।$$,
    1499.00,
    3,
    $$কোম্পানি বা সার্ভিসের বিস্তারিত তথ্য, ব্যানার বা ছবি এবং যোগাযোগের নম্বর।$$,
    $$২ বার প্রয়োজনীয় রিভিশন সম্পন্ন করা হবে।$$,
    true,
    true,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111101',
    $$Website Fix & Integration$$,
    $$ওয়েবসাইট ফিক্স ও ইন্টিগ্রেশন$$,
    $$website-fix-integration$$,
    $$Quick resolution of small website bugs, contact form integration, social media link setup, or live chat integration.$$,
    $$ওয়েবসাইটের ছোটখাটো সমস্যা সমাধান, কন্টাক্ট ফর্ম যুক্ত করা, সোশ্যাল মিডিয়া লিংক যোগ করা, লাইভ চ্যাট বা মেসেঞ্জার চ্যাট যুক্ত করা।$$,
    299.00,
    1,
    $$ওয়েবসাইট অ্যাক্সেস বা সিপ্যানেল তথ্য এবং সমাধানের বিস্তারিত বিবরণ।$$,
    $$কাজ পুরোপুরি টেস্ট করে বুঝিয়ে দেওয়া হবে।$$,
    true,
    false,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111101',
    $$Product Upload & Store Setup$$,
    $$প্রোডাক্ট আপলোড ও স্টোর সেটআপ$$,
    $$product-upload-store-setup$$,
    $$Professional upload and organization of 10 products with images, titles, descriptions, and accurate pricing.$$,
    $$আপনার অনলাইন স্টোরে ১০টি প্রোডাক্ট ছবি, বিবরণ ও সঠিক মূল্যসহ আপলোড করে সাজিয়ে দেওয়া হবে।$$,
    299.00,
    1,
    $$১০টি পণ্যের ছবি, পণ্যের নাম, ক্যাটাগরি ও মূল্যতালিকা।$$,
    $$প্রোডাক্ট এন্ট্রি সঠিকতা নিশ্চিতকরণে ১ বার রিভিউ।$$,
    true,
    false,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222205',
    '11111111-1111-1111-1111-111111111102',
    $$WhatsApp Business Setup$$,
    $$হোয়াটসঅ্যাপ বিজনেস সেটআপ$$,
    $$whatsapp-business-setup$$,
    $$Creation of an official WhatsApp Business profile, business catalog, operating hours, and automated welcome and away messages.$$,
    $$অফিসিয়াল হোয়াটসঅ্যাপ বিজনেস প্রোফাইল তৈরি, ব্যবসার বিবরণ, সময়সূচি, ক্যাটালগ সেটআপ এবং অটোমেটিক গ্রিটিং ও অ্যাওয়ে মেসেজ কনফিগার করে দেওয়া হবে।$$,
    399.00,
    1,
    $$ব্যবসার নাম, মোবাইল নম্বর, লোগো, পণ্য/সার্ভিসের তালিকা ও সময়সূচি।$$,
    $$প্রোফাইল লাইভ যাচাইকরণ।$$,
    true,
    true,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222206',
    '11111111-1111-1111-1111-111111111103',
    $$Presentation & Pitch Deck$$,
    $$প্রেজেন্টেশন ও পিচ ডেক$$,
    $$presentation-pitch-deck$$,
    $$Professional and compelling slide design for schools, colleges, universities, or corporate presentations up to 10 slides.$$,
    $$স্কুল, কলেজ, বিশ্ববিদ্যালয় বা অফিসের জন্য প্রফেশনাল ও আকর্ষণীয় স্লাইড ডিজাইন (১০ স্লাইড পর্যন্ত)।$$,
    399.00,
    2,
    $$স্লাইডের খসড়া টেক্সট বা টপিক, লোগো ও পছন্দের কালার থিম।$$,
    $$সর্বোচ্চ ২ বার স্লাইড পরিবর্তন বা রিভিশন।$$,
    true,
    false,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222207',
    '11111111-1111-1111-1111-111111111103',
    $$CV & Job Application Package$$,
    $$সিভি ও জব অ্যাপ্লিকেশন প্যাকেজ$$,
    $$cv-job-application-package$$,
    $$Standard, professional CV creation for job applications paired with a tailored, modern cover letter.$$,
    $$চাকরির আবেদনের জন্য স্ট্যান্ডার্ড ও প্রফেশনাল সিভি তৈরি এবং একটি মানসম্মত কভার লেটার প্রস্তুত করে দেওয়া হবে।$$,
    399.00,
    2,
    $$বর্তমান তথ্য বা পুরোনো সিভি, শিক্ষাগত যোগ্যতা, অভিজ্ঞতার বিবরণ ও যে পদের জন্য আবেদন করছেন।$$,
    $$প্রয়োজনে ২ বার তথ্য হালনাগাদ রিভিশন।$$,
    true,
    true,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222208',
    '11111111-1111-1111-1111-111111111104',
    $$Excel & Data Cleanup$$,
    $$এক্সেল ও ডেটা ক্লিনআপ$$,
    $$excel-data-cleanup$$,
    $$Organizing messy spreadsheets, removing duplicates, applying essential filters, and preparing clean data.$$,
    $$অগোছালো ডেটা সাজানো, ডুপ্লিকেট রিমুভ করা, প্রয়োজনীয় ফিল্টারিং করা এবং ব্যবহারের উপযোগী স্প্রেডশিট প্রস্তুত করা।$$,
    249.00,
    1,
    $$কাঁচা এক্সেল বা সিএসভি ফাইল এবং আপনি কী ধরণের ফরম্যাট চান তার বিবরণ।$$,
    $$ডেটা নির্ভুলতা নিশ্চিতকরণে ১ বার রিভিউ।$$,
    true,
    false,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222209',
    '11111111-1111-1111-1111-111111111104',
    $$Website Audit & Improvement Report$$,
    $$ওয়েবসাইট অডিট ও ইমপ্রুভমেন্ট রিপোর্ট$$,
    $$website-audit-improvement-report$$,
    $$Detailed actionable report examining website speed, mobile responsiveness, and overall user experience.$$,
    $$আপনার বর্তমান ওয়েবসাইটের গতি, মোবাইল রেসপনসিভনেস ও ইউজার এক্সপেরিয়েন্স পর্যবেক্ষণ করে একটি বিস্তারিত অ্যাকশনেবল রিপোর্ট প্রদান করা হবে।$$,
    499.00,
    2,
    $$ওয়েবসাইটের লাইভ লিংক ও কোনো নির্দিষ্ট সমস্যা থাকলে তার উল্লেখ।$$,
    $$রিপোর্ট বুঝিয়ে দেওয়ার পর ১ বার প্রশ্নোত্তর সহায়তা।$$,
    true,
    false,
    false
  )
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  title = EXCLUDED.title,
  title_bn = EXCLUDED.title_bn,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  description_bn = EXCLUDED.description_bn,
  price = EXCLUDED.price,
  delivery_days = EXCLUDED.delivery_days,
  requirements = EXCLUDED.requirements,
  revision_policy = EXCLUDED.revision_policy,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  is_gov_service = EXCLUDED.is_gov_service;`;
                navigator.clipboard.writeText(sqlText);
                setSqlCopied(true);
                setTimeout(() => setSqlCopied(false), 2500);
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              {sqlCopied ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{sqlCopied ? 'কপি হয়েছে!' : 'সম্পূর্ণ SQL কপি করুন'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            <strong>ত্রুটির কারণ ও সমাধান:</strong> স্ক্রিনশটে যে এররটি দেখছেন (<code className="text-rose-400 font-mono">ERROR 23502</code>), তা ঘটেছিল কারণ <code className="text-amber-300 font-mono">orders</code> টেবিলে <code className="text-amber-300 font-mono">service_id</code> কলামে <code className="text-rose-400 font-mono">NOT NULL</code> ছিল। আর <code className="text-rose-400 font-mono">relation &quot;an&quot; does not exist</code> ঘটেছিল টেক্সট কপি করার সময় বা ব্রাউজার ট্রান্সেলেটর কোটেশন ভেঙে দেওয়ায়। নিচের স্ক্রিপ্টে <code className="text-emerald-400 font-mono">$$ ... $$</code> ডলার কোটেশন ব্যবহার করা হয়েছে যা ১০০% নিরাপদ।
          </p>

          <pre className="p-3 bg-slate-950 rounded-lg text-[11px] font-mono text-emerald-400 overflow-x-auto leading-relaxed border border-slate-800 max-h-56">
{`-- ধাপ ১: ডিলিট ফিক্স
ALTER TABLE public.orders ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_service_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.services ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_category_id_fkey;
ALTER TABLE public.services ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.service_categories(id) ON DELETE SET NULL;

-- ধাপ ২ ও ৩: ৪টি ক্যাটাগরি ও ৯টি অফিসিয়াল সার্ভিস ইন্সার্ট/আপসার্ট`}
          </pre>

          <div className="text-[11px] text-slate-400 flex items-center gap-1">
            <span>টিপ: আপনি উপরের <strong>&quot;অফিসিয়াল ক্যাটালগ সিঙ্ক&quot;</strong> বাটনে ক্লিক করেও সরাসরি ওয়েবসাইট থেকেই এটি সিঙ্ক করে নিতে পারেন!</span>
          </div>
        </div>
      )}

      {/* সেকশন সুইচ ট্যাব (সার্ভিস সমূহ বনাম সার্ভিস ক্যাটাগরি) */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button
          onClick={() => handleTabChange('services')}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
            activeTab === 'services'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>সেবা সমূহ (Services)</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {toBengaliDigits(services.length)}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('categories')}
          className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 relative transition-colors ${
            activeTab === 'categories'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>সার্ভিস ক্যাটাগরি (Categories)</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
            {toBengaliDigits(categories.length)}
          </span>
        </button>
      </div>

      {/* ================================================================= */}
      {/* ট্যাব ১: সেবা সমূহ (Services Management) */}
      {/* ================================================================= */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* KPI সারসংক্ষেপ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                মোট সেবা
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {toBengaliDigits(services.length)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                সক্রিয় সেবা
              </span>
              <div className="text-2xl font-bold text-emerald-800 mt-1 font-mono">
                {toBengaliDigits(activeServicesCount)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                নিষ্ক্রিয় সেবা
              </span>
              <div className="text-2xl font-bold text-slate-700 mt-1 font-mono">
                {toBengaliDigits(services.length - activeServicesCount)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                মোট ক্যাটাগরি
              </span>
              <div className="text-2xl font-bold text-indigo-800 mt-1 font-mono">
                {toBengaliDigits(categories.length)}
              </div>
            </div>
          </div>

          {/* সার্চ ও ফিল্টার বার */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="সেবার নাম বা বিবরণ দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
              >
                <option value="all">সকল ক্যাটাগরি ({toBengaliDigits(categories.length)})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_bn || c.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-hidden"
              >
                <option value="all">সকল অবস্থা</option>
                <option value="active">শুধুমাত্র সক্রিয়</option>
                <option value="inactive">শুধুমাত্র নিষ্ক্রিয়</option>
              </select>
            </div>
          </div>

          {/* নির্বাচিত সেবা বাল্ক অ্যাকশন বার */}
          {selectedServiceIds.length > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-semibold text-indigo-900">
                  {toBengaliDigits(selectedServiceIds.length)}টি সেবা নির্বাচিত হয়েছে
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedServiceIds([])}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg shadow-xs"
                >
                  নির্বাচন বাতিল
                </button>
                <button
                  onClick={() => setIsConfirmBulkDeleteOpen(true)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>নির্বাচিত ({toBengaliDigits(selectedServiceIds.length)}) সেবা মুছুন</span>
                </button>
              </div>
            </div>
          )}

          {/* সেবা তালিকা টেবিল */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-500">ক্যাটালগ লোড হচ্ছে...</div>
            ) : filteredServices.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 space-y-3">
                <Layers className="w-10 h-10 text-slate-300 mx-auto" />
                <p>কোনো সেবা পাওয়া যায়নি। নতুন সেবা যুক্ত করুন বা ফিল্টার পরিবর্তন করুন।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          aria-label="সব সেবা নির্বাচন করুন"
                          checked={filteredServices.length > 0 && selectedServiceIds.length === filteredServices.length}
                          onChange={handleToggleSelectAllServices}
                          className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 font-medium">সেবার নাম ও স্লাগ</th>
                      <th className="py-3 px-4 font-medium">ক্যাটাগরি</th>
                      <th className="py-3 px-4 font-medium text-right">স্ট্যান্ডার্ড ফি</th>
                      <th className="py-3 px-4 font-medium text-right">ছাড়ের মূল্য</th>
                      <th className="py-3 px-4 font-medium">ডেলিভারি</th>
                      <th className="py-3 px-4 font-medium">রিভিশন পলিসি</th>
                      <th className="py-3 px-4 font-medium text-center">অবস্থা</th>
                      <th className="py-3 px-4 font-medium text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredServices.map((srv) => (
                      <tr key={srv.id} className={`hover:bg-slate-50/50 ${selectedServiceIds.includes(srv.id) ? 'bg-indigo-50/30' : ''}`}>
                        <td className="py-3.5 px-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`নির্বাচন করুন ${srv.title_bn || srv.title}`}
                            checked={selectedServiceIds.includes(srv.id)}
                            onChange={() => handleToggleSelectService(srv.id)}
                            className="rounded text-indigo-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900">{srv.title_bn || srv.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{srv.slug}</div>
                          {srv.is_featured && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded mt-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>ফিচার্ড সেবা</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-700">
                            <Tag className="w-3 h-3 text-slate-500" />
                            {srv.category?.name_bn || srv.category?.name || 'ক্যাটাগরি'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-medium whitespace-nowrap text-slate-900">
                          {toBengaliCurrency(srv.price)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                          {srv.promotional_price ? (
                            <span className="text-emerald-700 font-semibold">
                              {toBengaliCurrency(srv.promotional_price)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                          {toBengaliDigits(srv.delivery_days)} দিন
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-[150px] truncate">
                          {srv.revision_policy || '২ বার ফ্রি রিভিশন'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleActiveService(srv)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                              srv.is_active
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {srv.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingService(srv);
                                setIsServiceModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>সম্পাদনা</span>
                            </button>
                            <button
                              onClick={() => setDeletingService(srv)}
                              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                              title="সেবা মুছে ফেলুন"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ট্যাব ২: সার্ভিস ক্যাটাগরি (Category Management) */}
      {/* ================================================================= */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          {/* ক্যাটাগরি KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                মোট ক্যাটাগরি
              </span>
              <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                {toBengaliDigits(categories.length)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
                সক্রিয় ক্যাটাগরি
              </span>
              <div className="text-2xl font-bold text-emerald-800 mt-1 font-mono">
                {toBengaliDigits(activeCategoriesCount)}
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                ক্যাটালগ কভারেজ
              </span>
              <div className="text-sm font-semibold text-slate-800 mt-2">
                সকল ক্যাটাগরিতে মোট {toBengaliDigits(services.length)}টি সক্রিয় সেবা রয়েছে
              </div>
            </div>
          </div>

          {/* ক্যাটাগরি কার্ড লিস্ট */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const matchedCount = services.filter((s) => s.category_id === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                          <FolderTree className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{cat.name_bn || cat.name}</h3>
                          <span className="text-[11px] font-mono text-slate-400 block">{cat.slug}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleActiveCategory(cat)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          cat.is_active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {cat.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {cat.description_bn || cat.description || 'কোনো বিবরণ যুক্ত করা হয়নি।'}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                      <span className="font-mono">ক্রম: #{toBengaliDigits(cat.display_order || 0)}</span>
                      <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-full text-slate-700">
                        {toBengaliDigits(matchedCount)}টি সেবা যুক্ত
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingCategory(cat);
                        setIsCategoryModalOpen(true);
                      }}
                      className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>সম্পাদনা</span>
                    </button>
                    <button
                      onClick={() => setDeletingCategory(cat)}
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                      title="ক্যাটাগরি মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* সার্ভিস এডিট ও নতুন সেবা যুক্ত করার মডাল */}
      {/* ================================================================= */}
      {isServiceModalOpen && editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingService.id ? 'সেবার বিবরণ ও মূল্য সম্পাদনা' : 'নতুন সেবা যোগ করুন'}
              </h3>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    সেবার নাম (বাংলা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: পেশাদার বায়োডাটা ও জীবনবৃত্তান্ত তৈরি"
                    value={editingService.title_bn || editingService.title || ''}
                    onChange={(e) =>
                      setEditingService({ ...editingService, title_bn: e.target.value, title: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি নির্বাচন</label>
                  <select
                    value={editingService.category_id || ''}
                    onChange={(e) => setEditingService({ ...editingService, category_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name_bn || c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    স্ট্যান্ডার্ড মূল্য (টাকা ৳) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingService.price || ''}
                    onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ছাড়ের মূল্য (টাকা ৳, ঐচ্ছিক)</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="অফারের মূল্য"
                    value={editingService.promotional_price || ''}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        promotional_price: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ডেলিভারির সময় (কর্মদিবস)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editingService.delivery_days || 3}
                    onChange={(e) =>
                      setEditingService({ ...editingService, delivery_days: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">রিভিশন পলিসি</label>
                  <input
                    type="text"
                    placeholder="যেমন: সর্বোচ্চ ২ বার ফ্রি রিভিশন"
                    value={editingService.revision_policy || ''}
                    onChange={(e) =>
                      setEditingService({ ...editingService, revision_policy: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">কাস্টম স্লাগ (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    placeholder="স্বয়ংক্রিয়ভাবে তৈরি হবে..."
                    value={editingService.slug || ''}
                    onChange={(e) => setEditingService({ ...editingService, slug: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">সেবার পূর্ণাঙ্গ বিবরণ (বাংলা)</label>
                <textarea
                  rows={3}
                  placeholder="সেবাটি সম্পর্কে গ্রাহকদের প্রয়োজনীয় বিস্তারিত তথ্য লিখুন..."
                  value={editingService.description_bn || editingService.description || ''}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      description_bn: e.target.value,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অর্ডারের জন্য গ্রাহকের কাছ থেকে কী কী তথ্য বা ফাইল প্রয়োজন (Requirements)
                </label>
                <textarea
                  rows={2}
                  placeholder="যেমন: আপনার পূর্বের সিভি, শিক্ষাগত যোগ্যতার সনদ এবং যে পদের জন্য আবেদন করবেন তার লিংক।"
                  value={editingService.requirements || ''}
                  onChange={(e) =>
                    setEditingService({ ...editingService, requirements: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingService.is_active ?? true}
                    onChange={(e) => setEditingService({ ...editingService, is_active: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>সেবাটি সক্রিয় রাখুন (ক্যাটালগে প্রদর্শিত হবে)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingService.is_featured ?? false}
                    onChange={(e) =>
                      setEditingService({ ...editingService, is_featured: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>ফিচার্ড সেবা হিসেবে হাইলাইট করুন</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="px-5 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {savingService ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ক্যাটাগরি এডিট ও নতুন ক্যাটাগরি যুক্ত করার মডাল */}
      {/* ================================================================= */}
      {isCategoryModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingCategory.id ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি তৈরি করুন'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ক্যাটাগরির নাম (বাংলা) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ওয়েব ডেভেলপমেন্ট"
                    value={editingCategory.name_bn || ''}
                    onChange={(e) =>
                      setEditingCategory({
                        ...editingCategory,
                        name_bn: e.target.value,
                        name: editingCategory.name || e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ক্যাটাগরির নাম (ইংরেজি) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web Development"
                    value={editingCategory.name || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">স্লাগ (URL Slug)</label>
                  <input
                    type="text"
                    placeholder="স্বয়ংক্রিয়ভাবে তৈরি হবে..."
                    value={editingCategory.slug || ''}
                    onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ডিসপ্লে ক্রম (Order)</label>
                  <input
                    type="number"
                    min={1}
                    value={editingCategory.display_order ?? 1}
                    onChange={(e) =>
                      setEditingCategory({ ...editingCategory, display_order: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">আইকন নির্বাচন</label>
                <select
                  value={editingCategory.icon || 'Layers'}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                >
                  {AVAILABLE_ICONS.map((ic) => (
                    <option key={ic.name} value={ic.name}>
                      {ic.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">ক্যাটাগরি বিবরণ (বাংলা)</label>
                <textarea
                  rows={2}
                  placeholder="এই ক্যাটাগরিতে কী কী সেবা পাওয়া যায় তার সংক্ষিপ্ত বিবরণ..."
                  value={editingCategory.description_bn || ''}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      description_bn: e.target.value,
                      description: editingCategory.description || e.target.value,
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={editingCategory.is_active ?? true}
                    onChange={(e) => setEditingCategory({ ...editingCategory, is_active: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>ক্যাটাগরিটি সক্রিয় রাখুন (কাস্টমাররা দেখতে পাবে)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={savingCategory}
                  className="px-5 py-2 font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {savingCategory ? 'সংরক্ষণ হচ্ছে...' : 'ক্যাটাগরি সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* সার্ভিস ডিলিট কনফার্মেশন মডাল */}
      {/* ================================================================= */}
      {deletingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">সেবাটি মুছে ফেলতে চান?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                <strong className="text-slate-800">{deletingService.title_bn || deletingService.title}</strong>{' '}
                ক্যাটালগ ও Supabase ডাটাবেজ থেকে মুছে ফেলা হবে।
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingService(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                বাতিল
              </button>
              <button
                onClick={handleDeleteService}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ক্যাটাগরি ডিলিট কনফার্মেশন মডাল */}
      {/* ================================================================= */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">ক্যাটাগরি মুছে ফেলতে চান?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                <strong className="text-slate-800">{deletingCategory.name_bn || deletingCategory.name}</strong>{' '}
                ক্যাটাগরিটি মুছে ফেলা হবে।
              </p>
              {services.some((s) => s.category_id === deletingCategory.id) && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] text-left">
                  ⚠️ <strong>সতর্কতা:</strong> এই ক্যাটাগরিতে{' '}
                  {toBengaliDigits(services.filter((s) => s.category_id === deletingCategory.id).length)}টি সেবা রয়েছে।
                  ক্যাটাগরি মুছে ফেলার আগে সেবাগুলো স্থানান্তর করুন অথবা মুছে ফেলুন।
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                বাতিল
              </button>
              <button
                onClick={handleDeleteCategory}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors"
              >
                ক্যাটাগরি মুছে ফেলুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* নির্বাচিত সেবা বাল্ক ডিলিট কনফার্মেশন মডাল */}
      {/* ================================================================= */}
      {isConfirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                নির্বাচিত {toBengaliDigits(selectedServiceIds.length)}টি সেবা মুছে ফেলতে চান?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                নির্বাচিত সেবাসমূহ ক্যাটালগ ও Supabase ডাটাবেজ থেকে স্থায়ীভাবে মুছে ফেলা হবে।
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={isBulkDeleting}
                onClick={() => setIsConfirmBulkDeleteOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
              >
                বাতিল
              </button>
              <button
                disabled={isBulkDeleting}
                onClick={handleBulkDeleteServices}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {isBulkDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isBulkDeleting ? 'মুছে ফেলা হচ্ছে...' : 'হ্যাঁ, মুছে ফেলুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* সকল সেবা মুছুন (Wipe All Demo Services) কনফার্মেশন মডাল */}
      {/* ================================================================= */}
      {isConfirmDeleteAllOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-200 max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">সকল সেবা মুছে ফেলতে চান?</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                ক্যাটালগের সকল <strong className="text-rose-700">{toBengaliDigits(services.length)}টি সেবা</strong> সম্পূর্ণভাবে মুছে ফেলা হবে। এরপর ক্যাটালগ সম্পূর্ণ খালি হয়ে যাবে এবং আপনি আপনার নতুন রিয়েল সেবাগুলো যুক্ত করতে পারবেন।
              </p>
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] text-left">
                ⚠️ এই কাজটি অপরিবর্তনীয়। আপনি কি নিশ্চিত যে সমস্ত সেবা মুছে সম্পূর্ণ ফ্রেশ শুরু করতে চান?
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={isBulkDeleting}
                onClick={() => setIsConfirmDeleteAllOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
              >
                বাতিল
              </button>
              <button
                disabled={isBulkDeleting}
                onClick={handleDeleteAllServices}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {isBulkDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isBulkDeleting ? 'সব মুছে ফেলা হচ্ছে...' : 'সব সেবা মুছে ফেলুন'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
