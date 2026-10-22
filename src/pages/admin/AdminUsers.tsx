import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { Profile, UserRole } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminUsers: React.FC = () => {
  const { user, isSuperAdmin, role } = useAuth();
  const { showToast } = useNotification();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await api.getUsers();
      setUsers(data);
      setLoading(false);
    }
    load();
  }, []);

  const [pendingDemote, setPendingDemote] = useState<{ targetUser: Profile; newRole: UserRole } | null>(null);

  const applyRoleUpdate = async (targetUser: Profile, newRole: UserRole) => {
    try {
      await api.updateUserRole(targetUser.id, newRole, role);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
      showToast({
        type: 'success',
        title: 'ভূমিকা পরিবর্তিত হয়েছে',
        message: `${targetUser.email}-এর ভূমিকা সফলভাবে আপডেট করা হয়েছে।`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ভূমিকা পরিবর্তন করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setPendingDemote(null);
    }
  };

  const handleRoleChange = async (targetUser: Profile, newRole: UserRole) => {
    if (!isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'অনুমতি নেই',
        message: 'ব্যবহারকারীর ভূমিকা পরিবর্তন করার অনুমতি শুধুমাত্র সুপার অ্যাডমিনের রয়েছে।',
      });
      return;
    }

    if (targetUser.role === 'super_admin' && newRole !== 'super_admin') {
      setPendingDemote({ targetUser, newRole });
      return;
    }

    await applyRoleUpdate(targetUser, newRole);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            অ্যাক্সেস ও পারমিশন কন্ট্রোল
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">ব্যবহারকারী ও ভূমিকা ব্যবস্থাপনা</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            সুপার অ্যাডমিন, অ্যাডমিন এবং সাধারণ গ্রাহক অ্যাকাউন্টের অ্যাক্সেস নিয়ন্ত্রণ।
          </p>
        </div>

        {!isSuperAdmin && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>ভূমিকা পরিবর্তন শুধুমাত্র সুপার অ্যাডমিনের জন্য সীমাবদ্ধ।</span>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">অ্যাকাউন্ট তালিকা লোড হচ্ছে...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">ইমেইল ঠিকানা</th>
                  <th className="py-3 px-4 font-medium">নাম</th>
                  <th className="py-3 px-4 font-medium">বর্তমান ভূমিকা</th>
                  <th className="py-3 px-4 font-medium">নিবন্ধনের তারিখ</th>
                  <th className="py-3 px-4 font-medium text-right">ভূমিকা নির্ধারণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => {
                  const canEdit = isSuperAdmin;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{u.email}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{u.full_name}</td>
                      <td className="py-3 px-4">
                        <StatusBadge status={u.role} />
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {toBengaliDate(u.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canEdit ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                            className="p-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-hidden"
                          >
                            <option value="user">সাধারণ গ্রাহক</option>
                            <option value="worker">স্পেশালিস্ট ওয়ার্কার</option>
                            <option value="admin">অ্যাডমিন</option>
                            <option value="super_admin">সুপার অ্যাডমিন</option>
                          </select>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">সুরক্ষিত</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* সুপার অ্যাডমিন ক্ষমতা হ্রাসের নিশ্চিতকরণ মডাল */}
      {pendingDemote && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">সতর্কতা: সুপার অ্যাডমিন পদ পরিবর্তন</h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                আপনি <strong className="text-slate-900 font-mono">{pendingDemote.targetUser.email}</strong> ব্যবহারকারীর সুপার অ্যাডমিন ক্ষমতা হ্রাস করতে যাচ্ছেন। আপনি কি নিশ্চিতভাবে এটি সম্পন্ন করতে চান?
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingDemote(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                type="button"
                onClick={() => applyRoleUpdate(pendingDemote.targetUser, pendingDemote.newRole)}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-xs"
              >
                হ্যাঁ, পদ পরিবর্তন করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
