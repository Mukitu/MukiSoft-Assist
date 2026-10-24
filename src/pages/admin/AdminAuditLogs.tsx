import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliDate } from '../../lib/i18n';
import { api } from '../../services/api';
import { AuditLog } from '../../types/database';
import { Pagination } from '../../components/common/Pagination';

export const AdminAuditLogs: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function load() {
      const data = await api.getAuditLogs();
      setLogs(data);
      setLoading(false);
    }
    load();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <Lock className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">শুধুমাত্র সুপার অ্যাডমিনের জন্য সীমাবদ্ধ</h2>
        <p className="text-xs text-slate-500">নিরাপত্তা অডিট লগ শুধুমাত্র সুপার অ্যাডমিনিস্ট্রেটর পরিদর্শন করতে পারেন।</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
          নিরাপত্তা ও নিরীক্ষণ
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">নিরাপত্তা অডিট লগ</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          ভূমিকা পরিবর্তন, টাকা জমা অনুমোদন এবং সিস্টেম সংক্রান্ত গুরুত্বপূর্ণ কার্যকলাপের অপরিবর্তনীয় লগ।
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">অডিট লগ লোড হচ্ছে...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">কোনো নিরাপত্তা ইভেন্ট রেকর্ড নেই।</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">তারিখ ও সময়</th>
                    <th className="py-3 px-4 font-medium">অ্যাকশন</th>
                    <th className="py-3 px-4 font-medium">অ্যাক্টর</th>
                    <th className="py-3 px-4 font-medium">টার্গেট সত্ত্বা</th>
                    <th className="py-3 px-4 font-medium">বিবরণ (পেলোড)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logs.slice((currentPage - 1) * 10, currentPage * 10).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {toBengaliDate(log.created_at)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{log.action}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{log.actor_id || 'সিস্টেম'}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">
                        {log.target_type}:{log.target_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {JSON.stringify(log.details || {})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(logs.length / 10)}
              totalItems={logs.length}
              pageSize={10}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};
