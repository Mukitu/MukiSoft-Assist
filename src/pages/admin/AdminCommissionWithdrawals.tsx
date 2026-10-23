import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Briefcase,
  CheckCircle2,
  XCircle,
  Percent,
  Wallet,
  TrendingUp,
  Building2,
  Users,
  Clock,
  Lock,
  Search,
  ExternalLink,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import {
  WorkerApplication,
  CommissionSettings,
  WithdrawalRequest,
  CompanyProfitRecord,
} from '../../types/database';
import { toBengaliCurrency, toBengaliDate, toBengaliDigits } from '../../lib/i18n';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminCommissionWithdrawals: React.FC = () => {
  const { isSuperAdmin, role, user } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'applications' | 'commission' | 'withdrawals' | 'analytics'>('applications');
  const [loading, setLoading] = useState(false);

  // States
  const [applications, setApplications] = useState<WorkerApplication[]>(() => {
    try {
      const raw = localStorage.getItem('mukisoft_demo_worker_applications');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings | null>(() => {
    try {
      const raw = localStorage.getItem('mukisoft_demo_commission_settings');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      id: 'comm_default',
      worker_commission_percentage: 80,
      admin_commission_percentage: 70,
      updated_at: new Date().toISOString(),
    };
  });
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(() => {
    try {
      const raw = localStorage.getItem('mukisoft_demo_withdrawal_requests');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [profitRecords, setProfitRecords] = useState<CompanyProfitRecord[]>(() => {
    try {
      const raw = localStorage.getItem('mukisoft_demo_company_profit_records');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [profitSummary, setProfitSummary] = useState(() => {
    try {
      const raw = localStorage.getItem('mukisoft_demo_company_profit_records');
      if (raw) {
        const records: CompanyProfitRecord[] = JSON.parse(raw);
        return {
          totalRevenue: records.reduce((sum, r) => sum + (r.total_order_amount || 0), 0),
          totalWorkerPayouts: records.reduce((sum, r) => sum + (r.worker_or_admin_payout || 0), 0),
          totalCompanyProfit: records.reduce((sum, r) => sum + (r.company_profit_amount || 0), 0),
          completedOrdersCount: records.length,
        };
      }
    } catch {}
    return {
      totalRevenue: 0,
      totalWorkerPayouts: 0,
      totalCompanyProfit: 0,
      completedOrdersCount: 0,
    };
  });

  // Commission Edit Inputs
  const [workerCommInput, setWorkerCommInput] = useState<number>(80);
  const [adminCommInput, setAdminCommInput] = useState<number>(70);
  const [savingSettings, setSavingSettings] = useState(false);

  // Modal State for Reviewing Applications
  const [reviewModalApp, setReviewModalApp] = useState<WorkerApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Modal State for Processing Withdrawals
  const [reviewModalReq, setReviewModalReq] = useState<WithdrawalRequest | null>(null);
  const [withdrawalNotes, setWithdrawalNotes] = useState('');

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [apps, comm, reqs, profits, summary] = await Promise.all([
        api.getWorkerApplications(),
        api.getCommissionSettings(),
        api.getWithdrawalRequests(),
        api.getCompanyProfitRecords(),
        api.getCompanyProfitSummary(),
      ]);

      setApplications(apps);
      setCommissionSettings(comm);
      setWorkerCommInput(comm.worker_commission_percentage);
      setAdminCommInput(comm.admin_commission_percentage);
      setWithdrawals(reqs);
      setProfitRecords(profits);
      setProfitSummary(summary);
    } catch (err) {
      console.warn('Load commission dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const handleUpdate = () => {
      loadAllData();
    };

    window.addEventListener('wallet_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('orders_updated', handleUpdate);

    return () => {
      window.removeEventListener('wallet_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('orders_updated', handleUpdate);
    };
  }, []);

  const handleSaveCommission = async () => {
    if (!isSuperAdmin) {
      showToast({ type: 'error', title: 'অনুমতি নেই', message: 'কমিশন শতকরা হারের পরিবর্তন শুধুমাত্র সুপার অ্যাডমিন করতে পারবেন।' });
      return;
    }

    setSavingSettings(true);
    try {
      const updated = await api.updateCommissionSettings(
        {
          worker_commission_percentage: Number(workerCommInput),
          admin_commission_percentage: Number(adminCommInput),
        },
        user?.id || 'admin'
      );
      setCommissionSettings(updated);
      showToast({ type: 'success', title: 'কমিশন হার আপডেট হয়েছে', message: 'নতুন কমিশন হার সফলভাবে সংরক্ষিত হয়েছে।' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'কমিশন সেটিংস সেভ করতে ব্যর্থ';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApproveApplication = async (status: 'approved' | 'rejected') => {
    if (!reviewModalApp || !user) return;
    setProcessingAction(true);
    try {
      await api.reviewWorkerApplication(reviewModalApp.id, status, reviewNotes, user.id);
      showToast({
        type: 'success',
        title: status === 'approved' ? 'ওয়ার্কার অনুমোদিত!' : 'আবেদন বাতিল করা হয়েছে',
        message: status === 'approved' ? 'ইউজারকে সফলভাবে স্পেশালিস্ট ওয়ার্কার রোলে রূপান্তর করা হয়েছে।' : 'আবেদনটি রিজেক্ট করা হয়েছে।',
      });
      setReviewModalApp(null);
      setReviewNotes('');
      await loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'আবেদন রিভিউ করতে ব্যর্থ';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleProcessWithdrawal = async (status: 'approved' | 'rejected') => {
    if (!reviewModalReq || !user) return;
    setProcessingAction(true);
    try {
      await api.processWithdrawalRequest(reviewModalReq.id, status, withdrawalNotes, user.id);
      showToast({
        type: 'success',
        title: status === 'approved' ? 'উইথড্র অনুমোদিত ও পেইড!' : 'উইথড্র রিকোয়েস্ট বাতিল',
        message: status === 'approved' ? 'উত্তোলনের আবেদনটি সফলভাবে প্রসেস করা হয়েছে।' : 'আবেদনটি বাতিল করা হয়েছে।',
      });
      setReviewModalReq(null);
      setWithdrawalNotes('');
      await loadAllData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'উইথড্র প্রসেস করতে ব্যর্থ';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setProcessingAction(false);
    }
  };

  const pendingAppsCount = applications.filter((a) => a.status === 'pending').length;
  const pendingWithdrawalsCount = withdrawals.filter((w) => w.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* পেজ হেডার */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            প্রশাসনিক ফাইন্যান্সিয়াল কন্ট্রোল
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
            ওয়ার্কার, কমিশন ও উইথড্রয়াল প্যানেল
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ওয়ার্কার আবেদন যাচাই, সুপার অ্যাডমিন কমিশন নির্ধারণ, পে-আউট ও কোম্পানি নিট মুনাফা পর্যবেক্ষণ।
          </p>
        </div>

        {!isSuperAdmin && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>কমিশন সেটিংস পরিবর্তনের ক্ষমতা শুধুমাত্র সুপার অ্যাডমিনের রয়েছে।</span>
          </div>
        )}
      </div>

      {/* মেট্রিক্স সমুহ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>কোম্পানি নেট প্রফিট</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-indigo-600">
            {toBengaliCurrency(profitSummary.totalCompanyProfit)}
          </div>
          <div className="text-[11px] text-slate-500">মোট অর্ডারের প্ল্যাটফর্ম লভ্যাংশ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>মোট পে-আউট (কমিশন)</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600">
            {toBengaliCurrency(profitSummary.totalWorkerPayouts)}
          </div>
          <div className="text-[11px] text-slate-500">ওয়ার্কার ও অ্যাডমিনদের দেওয়া অর্থ</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>অপেক্ষমাণ ওয়ার্কার আবেদন</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-600">
            {toBengaliDigits(pendingAppsCount)} টি
          </div>
          <div className="text-[11px] text-slate-500">ভেরিফিকেশনের অপেক্ষায়</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>পেন্ডিং উইথড্র রিকোয়েস্ট</span>
            <Wallet className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-rose-600">
            {toBengaliDigits(pendingWithdrawalsCount)} টি
          </div>
          <div className="text-[11px] text-slate-500">উত্তোলনের অনুরোধ</div>
        </div>
      </div>

      {/* ট্যাব নেভিগেশন */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'applications'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>ওয়ার্কার আবেদনসমূহ</span>
          {pendingAppsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono">
              {toBengaliDigits(pendingAppsCount)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'withdrawals'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>উইথড্র রিকোয়েস্ট তালিকা</span>
          {pendingWithdrawalsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-mono">
              {toBengaliDigits(pendingWithdrawalsCount)}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('commission')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'commission'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Percent className="w-4 h-4" />
          <span>কমিশন কনফিগারেশন (Super Admin)</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>কোম্পানি প্রফিট অ্যানালিটিক্স</span>
        </button>
      </div>

      {/* কনটেন্ট ভিউ */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 border border-slate-200 text-center text-xs text-slate-500">
          তথ্য লোড করা হচ্ছে...
        </div>
      ) : activeTab === 'applications' ? (
        /* ১. ওয়ার্কার আবেদন তালিকা */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">আবেদনকারীদের তালিকা ও ভেরিফিকেশন</h3>
            <span className="text-xs text-slate-500">মোট আবেদন: {toBengaliDigits(applications.length)} টি</span>
          </div>

          {applications.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              এখন পর্যন্ত কোনো ওয়ার্কার আবেদন জমা পড়েনি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">আবেদনকারীর নাম</th>
                    <th className="py-3 px-4 font-medium">যোগাযোগের নম্বর</th>
                    <th className="py-3 px-4 font-medium">দক্ষতা ও সেবাসমূহ</th>
                    <th className="py-3 px-4 font-medium">আবেদনের তারিখ</th>
                    <th className="py-3 px-4 font-medium">স্ট্যাটাস</th>
                    <th className="py-3 px-4 font-medium text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{app.full_name}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-slate-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {app.phone}
                          </span>
                          {app.whatsapp && (
                            <span className="font-mono text-emerald-700 text-[11px]">
                              WA: {app.whatsapp}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate" title={app.skills}>
                        {app.skills}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {toBengaliDate(app.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setReviewModalApp(app);
                            setReviewNotes(app.admin_notes || '');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          যাচাই ও রিভিউ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'withdrawals' ? (
        /* ২. উইথড্র রিকোয়েস্ট তালিকা */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">ওয়ার্কার ও অ্যাডমিন উইথড্র রিকোয়েস্ট</h3>
            <span className="text-xs text-slate-500">মোট রিকোয়েস্ট: {toBengaliDigits(withdrawals.length)} টি</span>
          </div>

          {withdrawals.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              এখন পর্যন্ত কোনো উত্তোলনের অনুরোধ নেই।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">কর্মকর্তা / ওয়ার্কার</th>
                    <th className="py-3 px-4 font-medium">ভূমিকা</th>
                    <th className="py-3 px-4 font-medium">উত্তোলনের পরিমাণ</th>
                    <th className="py-3 px-4 font-medium">পেমেন্ট মেথড ও নম্বর</th>
                    <th className="py-3 px-4 font-medium">তারিখ</th>
                    <th className="py-3 px-4 font-medium">স্ট্যাটাস</th>
                    <th className="py-3 px-4 font-medium text-right">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {withdrawals.map((req) => (
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
                        <div className="font-semibold text-slate-800 uppercase">
                          {req.payout_account?.method}
                        </div>
                        <div className="font-mono text-xs text-slate-600">
                          {req.payout_account?.account_number}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {toBengaliDate(req.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {req.status === 'pending' ? (
                          <button
                            onClick={() => {
                              setReviewModalReq(req);
                              setWithdrawalNotes(req.admin_notes || '');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            অনুমোদন ও পরিশোধ
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-mono">প্রসেসকৃত</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeTab === 'commission' ? (
        /* ৩. কমিশন কনফিগারেশন */
        <div className="bg-white rounded-xl p-6 border border-slate-200 max-w-2xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-indigo-600" />
              <span>পারফরম্যান্স কমিশন বন্টন কনফিগারেশন</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              সুপার অ্যাডমিন কর্তৃক নির্ধারিত পার্সেন্টেজ অনুযায়ী ইউজার অর্ডার সম্পন্ন হওয়ার পর ওয়ার্কার/অ্যাডমিনের উপার্জিত ব্যালেন্সে টাকা জমা হবে এবং বাকি টাকা কোম্পানির নিট লাভ হিসেবে গণ্য হবে।
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                স্পেশালিস্ট ওয়ার্কারদের কমিশন (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={workerCommInput}
                  onChange={(e) => setWorkerCommInput(Number(e.target.value))}
                  disabled={!isSuperAdmin}
                  className="w-32 px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600">
                  ওয়ার্কার পাবেন <strong>{toBengaliDigits(workerCommInput)}%</strong> | প্ল্যাটফর্ম লাভ: <strong>{toBengaliDigits(100 - workerCommInput)}%</strong>
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                সাধারণ অ্যাডমিনদের কমিশন (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={adminCommInput}
                  onChange={(e) => setAdminCommInput(Number(e.target.value))}
                  disabled={!isSuperAdmin}
                  className="w-32 px-3 py-2 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-600">
                  অ্যাডমিন পাবেন <strong>{toBengaliDigits(adminCommInput)}%</strong> | প্ল্যাটফর্ম লাভ: <strong>{toBengaliDigits(100 - adminCommInput)}%</strong>
                </span>
              </div>
            </div>

            {isSuperAdmin && (
              <button
                type="button"
                onClick={handleSaveCommission}
                disabled={savingSettings}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
              >
                {savingSettings ? 'সংরক্ষিত হচ্ছে...' : 'কমিশন হার সংরক্ষণ করুন'}
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ৪. কোম্পানি প্রফিট অ্যানালিটিক্স */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden space-y-4">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">সম্পূর্ণ হওয়া কাজের প্ল্যাটফর্ম নিট লাভ হিস্ট্রি</h3>
            <span className="text-xs text-slate-500">মোট রেকর্ড: {toBengaliDigits(profitRecords.length)} টি</span>
          </div>

          {profitRecords.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              এখন পর্যন্ত কোনো সম্পন্ন অর্ডারের কমিশন রেকর্ড নেই।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">সার্ভিস কাজ</th>
                    <th className="py-3 px-4 font-medium">মোট অর্ডার মূল্য</th>
                    <th className="py-3 px-4 font-medium">দায়িত্বপ্রাপ্ত ব্যক্তি</th>
                    <th className="py-3 px-4 font-medium">ওয়ার্কার/অ্যাডমিন পারিশ্রমিক</th>
                    <th className="py-3 px-4 font-medium text-emerald-700">কোম্পানির নিট লাভ</th>
                    <th className="py-3 px-4 font-medium">তারিখ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {profitRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{rec.service_title}</td>
                      <td className="py-3 px-4 font-mono font-medium">{toBengaliCurrency(rec.total_order_amount)}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{rec.assigned_name}</span>
                        <span className="ml-1 text-[10px] text-slate-500 font-mono">({rec.assigned_role})</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">{toBengaliCurrency(rec.worker_or_admin_payout)}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 bg-emerald-50/50">
                        + {toBengaliCurrency(rec.company_profit_amount)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{toBengaliDate(rec.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ওয়ার্কার আবেদন রিভিউ মডাল */}
      {reviewModalApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">ওয়ার্কার আবেদন যাচাই</h3>
              <button onClick={() => setReviewModalApp(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="text-slate-400 block">আবেদনকারীর নাম:</span>
                <span className="font-bold text-slate-900 text-sm">{reviewModalApp.full_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-400 block">ফোন নম্বর:</span>
                  <span className="font-mono font-semibold">{reviewModalApp.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">হোয়াটসঅ্যাপ:</span>
                  <span className="font-mono text-emerald-700">{reviewModalApp.whatsapp || 'দেওয়া হয়নি'}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block">দক্ষতা ও সেবাসমূহ:</span>
                <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 mt-1">{reviewModalApp.skills}</p>
              </div>
              {reviewModalApp.experience && (
                <div>
                  <span className="text-slate-400 block">অভিজ্ঞতা:</span>
                  <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 mt-1">{reviewModalApp.experience}</p>
                </div>
              )}
              {reviewModalApp.portfolio_url && (
                <div>
                  <span className="text-slate-400 block">পোর্টফোলিও লিংক:</span>
                  <a href={reviewModalApp.portfolio_url} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-mono">
                    {reviewModalApp.portfolio_url}
                  </a>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">অ্যাডমিন প্রসেসিং নোট</label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="যেমন: কথা বলে যোগ্যতা নিশ্চিত করা হয়েছে"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleApproveApplication('rejected')}
                disabled={processingAction}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
              >
                আবেদন বাতিল
              </button>
              <button
                type="button"
                onClick={() => handleApproveApplication('approved')}
                disabled={processingAction}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
              >
                {processingAction ? 'প্রসেস হচ্ছে...' : 'অনুমোদন করুন (Approve Worker)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* উইথড্র রিকোয়েস্ট প্রসেসিং মডাল */}
      {reviewModalReq && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">উইথড্র রিকোয়েস্ট প্রসেসিং</h3>
              <button onClick={() => setReviewModalReq(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                <span className="text-[11px] text-emerald-700 block">উত্তোলনের পরিমাণ:</span>
                <span className="text-lg font-bold font-mono">{toBengaliCurrency(reviewModalReq.amount)}</span>
              </div>
              <div>
                <span className="text-slate-400 block">কর্মকর্তার নাম:</span>
                <span className="font-bold text-slate-900">{reviewModalReq.user_name} ({reviewModalReq.role})</span>
              </div>
              <div>
                <span className="text-slate-400 block">পেমেন্ট মেথড ও একাউন্ট:</span>
                <span className="font-bold font-mono uppercase text-indigo-600">{reviewModalReq.payout_account?.method}</span>
                <span className="ml-2 font-mono text-slate-900">{reviewModalReq.payout_account?.account_number}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">পেমেন্ট ট্রানজেকশন নোট</label>
                <input
                  type="text"
                  value={withdrawalNotes}
                  onChange={(e) => setWithdrawalNotes(e.target.value)}
                  placeholder="যেমন: বিকাশে ৳১,০০০ টাকা সেন্ড মানি করা হয়েছে (TrxID: 8N7X61)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleProcessWithdrawal('rejected')}
                disabled={processingAction}
                className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
              >
                অনুরোধ বাতিল
              </button>
              <button
                type="button"
                onClick={() => handleProcessWithdrawal('approved')}
                disabled={processingAction}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
              >
                {processingAction ? 'প্রসেস হচ্ছে...' : 'পরিশোধ সম্পন্ন করুন (Approve & Paid)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
