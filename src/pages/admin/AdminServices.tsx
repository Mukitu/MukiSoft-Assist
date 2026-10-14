import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Eye,
  Tag,
  Clock,
  Layers,
  Sparkles,
  AlertTriangle,
  X,
} from 'lucide-react';
import { api } from '../../services/api';
import { toBengaliCurrency, toBengaliDigits } from '../../lib/i18n';
import { ServiceItem, ServiceCategory } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';

export const AdminServices: React.FC = () => {
  const { showToast } = useNotification();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // ফিল্টার ও সার্চ স্টেট
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // এডিট ও নতুন সেবা যুক্ত করার মডাল
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<ServiceItem> | null>(null);
  const [saving, setSaving] = useState(false);

  // ডিলিট কনফার্মেশন মডাল
  const [deletingService, setDeletingService] = useState<ServiceItem | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [srvs, cats] = await Promise.all([api.getServices(), api.getCategories()]);
        setServices(srvs);
        setCategories(cats);
      } catch {
        showToast({ type: 'error', title: 'ত্রুটি', message: 'ক্যাটালগ লোড করা যায়নি' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleToggleActive = async (service: ServiceItem) => {
    try {
      const updated = await api.createOrUpdateService({ ...service, is_active: !service.is_active });
      setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast({
        type: 'info',
        title: 'ক্যাটালগ আপডেট',
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

    setSaving(true);
    try {
      // স্লাগ তৈরি বা আপডেট
      const baseTitle = editingService.title || editingService.title_bn || 'service';
      const autoSlug = editingService.slug || baseTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `service-${Date.now()}`;

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
      setIsModalOpen(false);
      setEditingService(null);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'সেবা সংরক্ষণ করা সম্ভব হয়নি' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async () => {
    if (!deletingService) return;
    try {
      await api.deleteService(deletingService.id);
      setServices((prev) => prev.filter((s) => s.id !== deletingService.id));
      showToast({
        type: 'success',
        title: 'সেবা মুছে ফেলা হয়েছে',
        message: `${deletingService.title_bn || deletingService.title} সফলভাবে ক্যাটালগ থেকে মুছে ফেলা হয়েছে।`,
      });
      setDeletingService(null);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'সেবা মুছে ফেলা যায়নি' });
    }
  };

  // ফিল্টার লজিক
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

  const activeCount = services.filter((s) => s.is_active).length;
  const inactiveCount = services.filter((s) => !s.is_active).length;

  return (
    <div className="space-y-6">
      {/* হেডার ও অ্যাকশন বোতাম */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            ক্যাটালগ ও সার্ভিস ম্যানেজমেন্ট
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">সেবা ও ক্যাটালগ নিয়ন্ত্রণ</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            সকল ৯টি বিভাগের ডিজিটাল সেবার বিবরণ, নির্ধারিত মূল্য, রিভিশন পলিসি এবং ডেলিভারি সময় নির্ধারণ করুন।
          </p>
        </div>

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
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন সেবা যুক্ত করুন</span>
        </button>
      </div>

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
            {toBengaliDigits(activeCount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            নিষ্ক্রিয় সেবা
          </span>
          <div className="text-2xl font-bold text-slate-700 mt-1 font-mono">
            {toBengaliDigits(inactiveCount)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
            মোট বিভাগ
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
            <option value="all">সকল বিভাগ ({toBengaliDigits(categories.length)})</option>
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

      {/* সেবা তালিকা টেবিল */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">ক্যাটালগ লোড হচ্ছে...</div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <Layers className="w-10 h-10 text-slate-300 mx-auto" />
            <p>কোনো সেবা পাওয়া যায়নি। ফিল্টার পরিবর্তন করুন বা নতুন সেবা যুক্ত করুন।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">সেবার নাম ও স্লাগ</th>
                  <th className="py-3 px-4 font-medium">বিভাগ</th>
                  <th className="py-3 px-4 font-medium text-right">স্ট্যান্ডার্ড ফি</th>
                  <th className="py-3 px-4 font-medium text-right">ছাড়ের মূল্য</th>
                  <th className="py-3 px-4 font-medium">ডেলিভারি সময়</th>
                  <th className="py-3 px-4 font-medium">রিভিশন পলিসি</th>
                  <th className="py-3 px-4 font-medium text-center">অবস্থা</th>
                  <th className="py-3 px-4 font-medium text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredServices.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/50">
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
                      {srv.category?.name_bn || srv.category?.name || 'বিভাগ'}
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
                      {toBengaliDigits(srv.delivery_days)} কর্মদিবস
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] max-w-[150px] truncate">
                      {srv.revision_policy || '২ বার ফ্রি রিভিশন'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(srv)}
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
                            setIsModalOpen(true);
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

      {/* এডিট ও নতুন সেবা যুক্ত করার মডাল */}
      {isModalOpen && editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingService.id ? 'সেবার বিবরণ ও মূল্য সম্পাদনা' : 'নতুন সেবা যোগ করুন'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
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
                  <label className="block font-semibold text-slate-700 mb-1">সেবার বিভাগ</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">থাম্বনেইল ইমেজ ইউআরএল (ঐচ্ছিক)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={editingService.thumbnail || ''}
                    onChange={(e) =>
                      setEditingService({ ...editingService, thumbnail: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
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
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'সংরক্ষণ করা হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ডিলিট কনফার্মেশন মডাল */}
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
                ক্যাটালগ থেকে মুছে ফেলা হবে। পূর্বের সম্পন্ন হওয়া অর্ডারে এর কোনো নেতিবাচক প্রভাব পড়বে না।
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
    </div>
  );
};
