import React, { useState, useEffect } from 'react';
import { HelpCircle, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliDate } from '../../lib/i18n';
import { api } from '../../services/api';
import { SupportTicket } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useNotification } from '../../context/NotificationContext';

export const UserSupport: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('সেবা অর্ডার সংক্রান্ত');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      const data = await api.getTickets(user.id);
      setTickets(data);
      setLoading(false);
    }
    load();
  }, [user]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim()) return;

    try {
      const created = await api.createTicket({
        userId: user.id,
        subject,
        category,
        priority,
      });
      setTickets((prev) => [created, ...prev]);
      setIsModalOpen(false);
      setSubject('');
      showToast({
        type: 'success',
        title: 'টিকিট খোলা হয়েছে',
        message: `টিকিট #${created.ticket_number} তৈরি করা হয়েছে এবং সহায়তা ডেস্কে পাঠানো হয়েছে।`,
      });
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'টিকিট তৈরি করা সম্ভব হয়নি' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            গ্রাহক সহায়তা ডেস্ক
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">সহায়তা টিকিট</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            অর্ডার সংক্রান্ত সমস্যা, রিভিশন অনুরোধ বা ওয়ালেট বিষয়ে সহায়তার জন্য টিকিট তৈরি করুন।
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>নতুন টিকিট খুলুন</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">টিকিট লোড হচ্ছে...</div>
        ) : tickets.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <p>আপনার কোনো সহায়তা টিকিট জমা দেওয়া নেই।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">টিকিট আইডি</th>
                  <th className="py-3 px-4 font-medium">বিষয়</th>
                  <th className="py-3 px-4 font-medium">বিভাগ</th>
                  <th className="py-3 px-4 font-medium">অগ্রাধিকার</th>
                  <th className="py-3 px-4 font-medium">অবস্থা</th>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">{t.ticket_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{t.subject}</td>
                    <td className="py-3 px-4 text-slate-600">{t.category}</td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-slate-700">
                        {t.priority === 'urgent'
                          ? 'অতি জরুরি'
                          : t.priority === 'high'
                          ? 'জরুরি'
                          : t.priority === 'medium'
                          ? 'মাঝারি'
                          : 'সাধারণ'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(t.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* টিকিট মডাল */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">নতুন সহায়তা টিকিট তৈরি করুন</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">টিকিটের বিষয়</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="যেমন: ডেলিভারিকৃত ফাইলের রিভিশন প্রয়োজন..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">বিভাগ</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="সেবা অর্ডার সংক্রান্ত">সেবা অর্ডার সংক্রান্ত</option>
                    <option value="ওয়ালেট ও টাকা জমা">ওয়ালেট ও টাকা জমা</option>
                    <option value="ফাইল ডেলিভারি রিভিশন">ফাইল ডেলিভারি রিভিশন</option>
                    <option value="টেকনিক্যাল সমস্যা">টেকনিক্যাল সমস্যা</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">জরুরিত্ব (অগ্রাধিকার)</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicket['priority'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="low">সাধারণ</option>
                    <option value="medium">মাঝারি</option>
                    <option value="high">জরুরি</option>
                    <option value="urgent">অতি জরুরি</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                  টিকিট জমা দিন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
