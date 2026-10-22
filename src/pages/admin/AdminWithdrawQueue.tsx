import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle2, XCircle, Trash2, Clock, Phone, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { WithdrawalRequest } from '../../types/database';
import { toBengaliCurrency, toBengaliDate, toBengaliDigits } from '../../lib/i18n';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminWithdrawQueue: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [selectedReq, setSelectedReq] = useState<WithdrawalRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delete' | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getWithdrawalRequests();
      setRequests(data);
    } catch (err) {
      console.warn('Load withdrawal requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleConfirmAction = async () => {
    if (!selectedReq || !user || !actionType) return;
    setProcessing(true);
    try {
      if (actionType === 'delete') {
        await api.deleteWithdrawalRequest(selectedReq.id, user.id);
        showToast({ type: 'success', title: 'মুছে ফেলা হয়েছে', message: 'উইথড্র রিকোয়েস্ট রেকর্ডটি সফলভাবে ডিলিট করা হয়েছে।' });
      } else {
        const status = actionType === 'approve' ? 'approved' : 'rejected';
        await api.processWithdrawalRequest(selectedReq.id, status, adminNotes, user.id);
        showToast({
          type: 'success',
          title: status === 'approved' ? 'উইথড্র অনুমোদিত ও পেইড!' : 'উইথড্র বাতিল করা হয়েছে',
          message: status === 'approved' ? 'ওয়ার্কারের কাছে পেমেন্ট অনুমোদন সম্পন্ন হয়েছে।' : 'উইথড্র আবেদনটি রিজেক্ট করা হয়েছে।',
        });
      }

      setSelectedReq(null);
      setActionType(null);
      setAdminNotes('');
      await loadRequests();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অ্যাকশন প্রসেস করতে ব্যর্থ';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch =
      r.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.payout_account?.account_number.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            প্রশাসনিক পে-আউট প্যানেল
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            ওয়ার্কার ও অ্যাডমিন উইথড্র রিকোয়েস্ট ম্যানেজমেন্ট
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ওয়ার্কার ও অ্যাডমিনদের পাঠানো টাকা উত্তোলনের আবেদন যাচাই করুন, তাদের একাউন্ট নম্বরে টাকা পাঠিয়ে 'Approve' করুন অথবা প্রয়োজন অনুযায়ী ডিলিট করুন।
          </p>
        </div>

        <button
          onClick={loadRequests}
          className="self-start sm:self-center px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>রিফ্রেশ করুন</span>
        </button>
      </div>

      {/* ফিল্টার ও সার্চ বার */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              filter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            সকল রিকোয়েস্ট ({toBengaliDigits(requests.length)})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'pending' ? 'bg-amber-600 text-white' : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <span>পেন্ডিং রিকোয়েস্ট</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-900 text-white rounded-full font-mono">
                {toBengaliDigits(pendingCount)}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              filter === 'approved' ? 'bg-emerald-600 text-white' : 'text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
            }`}
          >
            অনুমোদিত (Paid)
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
              filter === 'rejected' ? 'bg-rose-600 text-white' : 'text-rose-800 bg-rose-50 hover:bg-rose-100'
            }`}
          >
            বাতিলকৃত
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="নাম, ইমেইল বা নম্বর দিয়ে খুঁজুন..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* রিকোয়েস্ট তালিকা */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">উইথড্র রিকোয়েস্ট তালিকা লোড হচ্ছে...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            কোনো উইথড্র রিকোয়েস্ট পাওয়া যায়নি।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">আবেদনকারী কর্মকর্তা</th>
                  <th className="py-3 px-4 font-medium">ভূমিকা</th>
                  <th className="py-3 px-4 font-medium">উত্তোলনের পরিমাণ</th>
                  <th className="py-3 px-4 font-medium">পেমেন্ট মেথড ও নম্বর</th>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium">স্ট্যাটাস</th>
                  <th className="py-3 px-4 font-medium text-right">ম্যানেজমেন্ট অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{req.user_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{req.user_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.role} />
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-sm">
                      {toBengaliCurrency(req.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-indigo-700 uppercase flex items-center gap-1">
                        <span>{req.payout_account?.method}</span>
                      </div>
                      <div className="font-mono text-xs font-semibold text-slate-900 mt-0.5">
                        {req.payout_account?.account_number}
                      </div>
                      {req.payout_account?.method === 'bank' && (
                        <div className="text-[11px] text-slate-500 font-sans">
                          {req.payout_account?.bank_name} - {req.payout_account?.branch_name}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(req.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedReq(req);
                                setActionType('approve');
                                setAdminNotes(req.admin_notes || '');
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs"
                              title="অনুমোদন ও পরিশোধ"
                            >
                              Approve & Paid
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReq(req);
                                setActionType('reject');
                                setAdminNotes(req.admin_notes || '');
                              }}
                              className="px-2 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                              title="বাতিল করুন"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setSelectedReq(req);
                            setActionType('delete');
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="রেকর্ড মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* নিশ্চিতকরণ মডাল */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {actionType === 'delete'
                  ? 'উইথড্র রিকোয়েস্ট ডিলিট করুন'
                  : actionType === 'approve'
                  ? 'উইথড্র অনুমোদন ও পেমেন্ট কনফার্মেশন'
                  : 'উইথড্র আবেদন রিজেক্ট করুন'}
              </h3>
              <button
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {actionType === 'delete' ? (
              <p className="text-xs text-slate-600 leading-relaxed">
                আপনি কি নিশ্চিতভাবে <strong className="text-slate-900">{selectedReq.user_name}</strong>-এর <strong className="font-mono">{toBengaliCurrency(selectedReq.amount)}</strong> উত্তোলনের রিকোয়েস্ট ডিলিট করতে চান?
              </p>
            ) : (
              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                  <span className="text-[11px] text-emerald-700 block">উত্তোলনের পরিমাণ:</span>
                  <span className="text-lg font-bold font-mono">{toBengaliCurrency(selectedReq.amount)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">আবেদনকারী:</span>
                  <span className="font-bold text-slate-900">{selectedReq.user_name} ({selectedReq.user_email})</span>
                </div>
                <div>
                  <span className="text-slate-400 block">পেমেন্ট নম্বর:</span>
                  <span className="font-bold font-mono uppercase text-indigo-700">{selectedReq.payout_account?.method}</span>
                  <span className="ml-2 font-mono text-slate-900 font-bold">{selectedReq.payout_account?.account_number}</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">প্রসেসিং নোট (TrxID বা বার্তা)</label>
                  <input
                    type="text"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="যেমন: বিকাশে ৳১,০০০ টাকা প্রদান সম্পন্ন (TrxID: 8N7X61)"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                }}
                disabled={processing}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={processing}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl transition-colors shadow-sm ${
                  actionType === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {processing
                  ? 'প্রসেসিং হচ্ছে...'
                  : actionType === 'delete'
                  ? 'ডিলিট করুন'
                  : actionType === 'approve'
                  ? 'পেমেন্ট সম্পন্ন করুন'
                  : 'আবেদন রিজেক্ট করুন'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
