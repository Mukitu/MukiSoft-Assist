import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../services/api';
import { toBengaliCurrency, toBengaliDigits } from '../../lib/i18n';
import { ServiceItem, ServiceCategory } from '../../types/database';
import { useNotification } from '../../context/NotificationContext';

export const AdminServices: React.FC = () => {
  const { showToast } = useNotification();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // এডিট ও নতুন সেবা যুক্ত করার মডাল
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<ServiceItem> | null>(null);

  useEffect(() => {
    async function load() {
      const [srvs, cats] = await Promise.all([api.getServices(), api.getCategories()]);
      setServices(srvs);
      setCategories(cats);
      setLoading(false);
    }
    load();
  }, []);

  const handleToggleActive = async (service: ServiceItem) => {
    const updated = await api.createOrUpdateService({ ...service, is_active: !service.is_active });
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    showToast({
      type: 'info',
      title: 'ক্যাটালগ আপডেট',
      message: `${service.title_bn || service.title} এখন ${updated.is_active ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে।`,
    });
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.title && !editingService?.title_bn) return;
    if (!editingService?.price) return;

    try {
      const saved = await api.createOrUpdateService(editingService);
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
        message: 'ক্যাটালগে সেবার তথ্য সফলভাবে সংরক্ষণ করা হয়েছে।',
      });
      setIsModalOpen(false);
      setEditingService(null);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'সেবা সংরক্ষণ করা সম্ভব হয়নি' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            ক্যাটালগ ব্যবস্থাপনা
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">সেবা ও ক্যাটালগ</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ডিজিটাল সেবার বিবরণ, নির্ধারিত মূল্য, প্রোমোশন এবং ডেলিভারি সময়সীমা নির্ধারণ করুন।
          </p>
        </div>

        <button
          onClick={() => {
            setEditingService({
              category_id: categories[0]?.id,
              delivery_days: 3,
              is_active: true,
              is_featured: false,
            });
            setIsModalOpen(true);
          }}
          className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>নতুন সেবা যুক্ত করুন</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">ক্যাটালগ লোড হচ্ছে...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">সেবার নাম</th>
                  <th className="py-3 px-4 font-medium">বিভাগ</th>
                  <th className="py-3 px-4 font-medium text-right">স্ট্যান্ডার্ড ফি</th>
                  <th className="py-3 px-4 font-medium text-right">ছাড়ের মূল্য</th>
                  <th className="py-3 px-4 font-medium">ডেলিভারি</th>
                  <th className="py-3 px-4 font-medium">অবস্থা</th>
                  <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {services.map((srv) => (
                  <tr key={srv.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{srv.title_bn || srv.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{srv.slug}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {srv.category?.name_bn || srv.category?.name || 'বিভাগ'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium">
                      {toBengaliCurrency(srv.price)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      {srv.promotional_price ? toBengaliCurrency(srv.promotional_price) : '—'}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {toBengaliDigits(srv.delivery_days)} দিন
                    </td>
                    <td className="py-3 px-4">
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
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingService(srv);
                          setIsModalOpen(true);
                        }}
                        className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                      >
                        সম্পাদনা
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* এডিট ও যোগ করার মডাল */}
      {isModalOpen && editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              {editingService.id ? 'সেবার বিবরণ সম্পাদনা' : 'নতুন সেবা যোগ করুন'}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">সেবার নাম (বাংলা)</label>
                <input
                  type="text"
                  required
                  value={editingService.title_bn || editingService.title || ''}
                  onChange={(e) =>
                    setEditingService({ ...editingService, title_bn: e.target.value, title: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ডেলিভারির সময় (কর্মদিবস)</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">স্ট্যান্ডার্ড ফি (টাকা)</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">ছাড়ের মূল্য (ঐচ্ছিক)</label>
                  <input
                    type="number"
                    min={0}
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
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">সেবার বিস্তারিত বিবরণ</label>
                <textarea
                  rows={3}
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
