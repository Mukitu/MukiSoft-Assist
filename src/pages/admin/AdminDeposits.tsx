import React, { useState, useEffect } from 'react';
import {
  Check,
  X,
  CheckCircle2,
  Lock,
  Plus,
  Edit2,
  Trash2,
  CreditCard,
  Building,
  Smartphone,
  Save,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { DepositRequest, PaymentMethodConfig } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Pagination } from '../../components/common/Pagination';
import { FilePreviewModal } from '../../components/common/FilePreviewModal';

export const AdminDeposits: React.FC = () => {
  const { user, isSuperAdmin, role } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'requests' | 'payment_methods'>('requests');
  const [currentPage, setCurrentPage] = useState(1);
  const [requests, setRequests] = useState<DepositRequest[]>([]);
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentMethodConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // ফাইল প্রিভিউ মোডাল
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; notes?: string }>({ url: '', name: '' });

  // জমার পরিমাণ ম্যানুয়ালি এডিট করে অনুমোদনের মডাল স্টেট
  const [approveModalDeposit, setApproveModalDeposit] = useState<DepositRequest | null>(null);
  const [approvedAmountInput, setApprovedAmountInput] = useState<string>('');
  const [approveNoteInput, setApproveNoteInput] = useState<string>('');

  // বাতিল করার মডাল স্টেট
  const [rejectModalDeposit, setRejectModalDeposit] = useState<DepositRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // পেমেন্ট মাধ্যম এডিটিং মডাল (সুপার অ্যাডমিন)
  const [editingMethod, setEditingMethod] = useState<PaymentMethodConfig | null>(null);
  const [isAddingNewMethod, setIsAddingNewMethod] = useState(false);
  const [methodForm, setMethodForm] = useState<PaymentMethodConfig>({
    id: '',
    name: '',
    type: 'mobile_banking',
    number_or_account: '',
    account_type_label: '',
    instructions: '',
    is_active: true,
  });

  const loadData = async () => {
    try {
      const [reqData, configData] = await Promise.all([
        api.getAllDepositRequests(),
        api.getPaymentMethodConfigs(),
      ]);
      setRequests(reqData);
      setPaymentConfigs(configData);
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'ডেটা লোড করা সম্ভব হয়নি' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ১. জমার অনুরোধ অনুমোদন (প্রয়োজনে অ্যাডমিন পরিমাণ ম্যানুয়ালি পরিবর্তন করতে পারেন)
  const confirmApproveDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !approveModalDeposit) return;

    if (!isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'অনুমতি নেই',
        message: 'টাকা জমার অনুরোধ শুধুমাত্র সুপার অ্যাডমিন অনুমোদন করতে পারবেন।',
      });
      return;
    }

    const finalAmount = parseFloat(approvedAmountInput);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      showToast({ type: 'error', title: 'অকার্যকর পরিমাণ', message: 'অনুগ্রহ করে সঠিক টাকার পরিমাণ দিন।' });
      return;
    }

    const depositId = approveModalDeposit.id;
    setProcessingId(depositId);
    try {
      const isAdjusted = finalAmount !== approveModalDeposit.amount;
      const note = approveNoteInput.trim() || (isAdjusted ? `অনুমোদিত পরিমাণ এডজাস্ট করা হয়েছে: ৳${finalAmount} (দাবি ছিল: ৳${approveModalDeposit.amount})` : 'স্টেটমেন্ট অনুযায়ী যাচাইকৃত');

      const result = await api.approveDeposit(depositId, user.id, note, finalAmount);

      showToast({
        type: 'success',
        title: 'জমা অনুমোদন সম্পন্ন হয়েছে! 🎉',
        message: `৳ ${toBengaliDigits(finalAmount)} সফলভাবে গ্রাহকের ওয়ালেটে যোগ করা হয়েছে। গ্রাহকের বর্তমান ব্যালেন্স: ${toBengaliCurrency(result.newBalance)}।`,
      });

      setRequests((prev) =>
        prev.map((r) =>
          r.id === depositId
            ? { ...r, status: 'approved', amount: finalAmount, admin_notes: note, reviewed_by: user.id }
            : r
        )
      );
      setApproveModalDeposit(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুমোদন ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setProcessingId(null);
    }
  };

  // ২. টাকা জমার অনুরোধ বাতিল
  const confirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rejectModalDeposit) return;

    if (!isSuperAdmin) {
      showToast({
        type: 'error',
        title: 'অনুমতি নেই',
        message: 'টাকা জমার অনুরোধ শুধুমাত্র সুপার অ্যাডমিন বাতিল করতে পারবেন।',
      });
      return;
    }

    if (!rejectReason.trim()) {
      showToast({ type: 'error', title: 'কারণ আবশ্যক', message: 'অনুগ্রহ করে বাতিলের কারণ লিখুন।' });
      return;
    }

    const depositId = rejectModalDeposit.id;
    setProcessingId(depositId);
    try {
      await api.rejectDeposit(depositId, user.id, rejectReason.trim());
      showToast({
        type: 'info',
        title: 'জমা প্রত্যাখ্যাত হয়েছে',
        message: 'অনুরোধটি প্রত্যাখ্যাত হিসেবে চিহ্নিত করা হয়েছে।',
      });
      setRequests((prev) =>
        prev.map((r) => (r.id === depositId ? { ...r, status: 'rejected', admin_notes: rejectReason.trim() } : r))
      );
      setRejectModalDeposit(null);
      setRejectReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'প্রত্যাখ্যান ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setProcessingId(null);
    }
  };

  // ৩. সুপার অ্যাডমিন পেমেন্ট মেথড টগল (ON / OFF)
  const handleTogglePaymentMethod = async (methodId: string) => {
    if (!isSuperAdmin) {
      showToast({ type: 'error', title: 'অনুমতি নেই', message: 'পেমেন্ট মেথড চালুকরণ/বন্ধ করার অনুমতি শুধুমাত্র সুপার অ্যাডমিনের।' });
      return;
    }

    const updated = paymentConfigs.map((m) => (m.id === methodId ? { ...m, is_active: !m.is_active } : m));
    setPaymentConfigs(updated);

    try {
      await api.updatePaymentMethodConfigs(updated, role);
      showToast({
        type: 'success',
        title: 'পেমেন্ট মেথড আপডেট হয়েছে',
        message: 'পেমেন্ট গেটওয়ের অ্যাক্টিভ স্ট্যাটাস সফলভাবে সেভ করা হয়েছে।',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'আপডেট ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
      await loadData();
    }
  };

  // ৪. পেমেন্ট মেথড সেভ বা এডিট (সুপার অ্যাডমিন)
  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast({ type: 'error', title: 'অনুমতি নেই', message: 'শুধুমাত্র সুপার অ্যাডমিন পেমেন্ট তথ্য পরিবর্তন করতে পারবেন।' });
      return;
    }

    if (!methodForm.name.trim() || !methodForm.number_or_account.trim()) {
      showToast({ type: 'error', title: 'ঘর পূরণ করুন', message: 'পেমেন্ট মাধ্যমের নাম ও নম্বর দেওয়া আবশ্যক।' });
      return;
    }

    const id = methodForm.id || `method_${Date.now()}`;
    const newConfig: PaymentMethodConfig = { ...methodForm, id };

    let updatedList: PaymentMethodConfig[];
    if (paymentConfigs.some((m) => m.id === id)) {
      updatedList = paymentConfigs.map((m) => (m.id === id ? newConfig : m));
    } else {
      updatedList = [...paymentConfigs, newConfig];
    }

    try {
      await api.updatePaymentMethodConfigs(updatedList, role);
      setPaymentConfigs(updatedList);
      showToast({
        type: 'success',
        title: 'পেমেন্ট মাধ্যম সংরক্ষিত হয়েছে',
        message: 'নতুন নম্বর ও নির্দেশিকা গ্রাহকদের ডিপোজিট ফর্মে কার্যকর হয়েছে।',
      });
      setEditingMethod(null);
      setIsAddingNewMethod(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সেভ করা সম্ভব হয়নি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            ট্রেজারি ও আর্থিক যাচাইকরণ
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">টাকা জমা ও পেমেন্ট কনসোল</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            গ্রাহকের জমার অনুরোধ ম্যানুয়ালি যাচাই করুন, আসল প্রদেয় টাকার পরিমাণ সমন্বয় করুন এবং সুপার অ্যাডমিন পেমেন্ট মেথড কনফিগার করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-semibold">
            {toBengaliDigits(pendingCount)}টি জমা অপেক্ষমাণ
          </div>
        </div>
      </div>

      {/* ট্যাব সুইচার: জমার অনুরোধ এবং পেমেন্ট মাধ্যম কনফিগারেশন */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'requests'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          জমার অনুরোধসমূহ ({toBengaliDigits(pendingCount)})
        </button>

        <button
          onClick={() => setActiveTab('payment_methods')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === 'payment_methods'
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>পেমেন্ট মাধ্যম কনফিগারেশন (Super Admin)</span>
          {!isSuperAdmin && <Lock className="w-3 h-3 text-slate-400 ml-1" />}
        </button>
      </div>

      {/* ট্যাব ১: জমার অনুরোধ তালিকা */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500">জমার অনুরোধ লোড হচ্ছে...</div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-800 text-sm">অনুরোধের তালিকা খালি</p>
              <p>সকল গ্রাহকের রিচার্জ প্রক্রিয়া সম্পন্ন হয়েছে।</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 font-medium">তারিখ</th>
                    <th className="py-3 px-4 font-medium">গ্রাহক</th>
                    <th className="py-3 px-4 font-medium">পদ্ধতি</th>
                    <th className="py-3 px-4 font-medium">প্রেরকের নম্বর</th>
                    <th className="py-3 px-4 font-medium">TrxID / রেফারেন্স</th>
                    <th className="py-3 px-4 font-medium text-right">দাবিকৃত পরিমাণ</th>
                    <th className="py-3 px-4 font-medium">অবস্থা</th>
                    <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {requests.slice((currentPage - 1) * 8, currentPage * 8).map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {toBengaliDate(req.created_at)}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900 font-mono text-[11px]">
                        <div className="font-semibold text-slate-900 font-sans">{req.profile?.full_name || (req as any).user_name || 'গ্রাহক'}</div>
                        <div className="text-slate-500 font-mono text-[10px]">{req.profile?.email || (req as any).user_email || req.user_id}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{req.payment_method}</td>
                      <td className="py-3 px-4 font-mono">{req.sender_account}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div>{req.transaction_reference}</div>
                        {req.slip_url ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPreviewFile({
                                url: req.slip_url!,
                                name: `deposit_slip_${req.transaction_reference}.pdf`,
                                notes: `ডিপোজিট রেফারেন্স: ${req.transaction_reference}`,
                              });
                              setPreviewModalOpen(true);
                            }}
                            className="inline-block mt-0.5 text-[10px] font-sans text-indigo-600 hover:underline font-normal cursor-pointer"
                          >
                            📄 স্লিপ দেখুন
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-sans font-normal block mt-0.5">স্লিপ ছাড়া</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {toBengaliCurrency(req.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {req.status === 'pending' ? (
                          isSuperAdmin ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setApproveModalDeposit(req);
                                  setApprovedAmountInput(req.amount.toString());
                                  setApproveNoteInput('');
                                }}
                                disabled={processingId === req.id}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-xs transition-colors"
                                title="অনুমোদন করুন ও জমার পরিমাণ প্রয়োজনে সংশোধন করুন"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>অনুমোদন</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectModalDeposit(req);
                                  setRejectReason('');
                                }}
                                disabled={processingId === req.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded text-xs transition-colors border border-rose-200"
                                title="অনুরোধ বাতিল করুন"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>বাতিল</span>
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>সুপার অ্যাডমিন দরকার</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px] block max-w-[140px] truncate">
                            {req.admin_notes || 'যাচাইকৃত'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(requests.length / 8)}
              totalItems={requests.length}
              pageSize={8}
              onPageChange={setCurrentPage}
            />
          </>
          )}
        </div>
      )}

      {/* ট্যাব ২: পেমেন্ট মাধ্যম কনফিগারেশন (সুপার অ্যাডমিন) */}
      {activeTab === 'payment_methods' && (
        <div className="space-y-6">
          {!isSuperAdmin && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                পেমেন্ট মেথড (বিকাশ, নগদ, রকেট, ব্যাংক) চালুকরণ/বন্ধকরণ এবং অ্যাকাউন্ট নম্বর পরিবর্তনের অধিকার শুধুমাত্র <strong>সুপার অ্যাডমিনের</strong> রয়েছে।
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">সক্রিয় পেমেন্ট মাধ্যমে নাম্বার ও নির্দেশিকা</h2>
            {isSuperAdmin && (
              <button
                onClick={() => {
                  setMethodForm({
                    id: `custom_${Date.now()}`,
                    name: '',
                    type: 'mobile_banking',
                    number_or_account: '',
                    account_type_label: 'মার্চেন্ট / পার্সোনাল নম্বর',
                    instructions: '',
                    is_active: true,
                  });
                  setIsAddingNewMethod(true);
                  setEditingMethod(null);
                }}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ নতুন পেমেন্ট মেথড যোগ করুন</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paymentConfigs.map((method) => (
              <div
                key={method.id}
                className={`p-5 rounded-2xl border transition-all space-y-4 ${
                  method.is_active ? 'bg-white border-slate-200 shadow-xs' : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900">{method.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        method.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {method.is_active ? 'সক্রিয় (Active)' : 'বন্ধ (Off)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{method.account_type_label}</p>
                  </div>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-2 shrink-0">
                      {/* টগল বাটন */}
                      <button
                        onClick={() => handleTogglePaymentMethod(method.id)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          method.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={method.is_active ? 'বন্ধ করুন' : 'চালু করুন'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            method.is_active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>

                      <button
                        onClick={() => {
                          setMethodForm(method);
                          setEditingMethod(method);
                          setIsAddingNewMethod(false);
                        }}
                        className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="সম্পাদনা করুন"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono space-y-1">
                  <span className="text-[10px] text-slate-400 font-sans block">নম্বর / অ্যাকাউন্ট:</span>
                  <span className="font-bold text-slate-900 text-sm">{method.number_or_account}</span>
                </div>

                <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-100 pt-3">
                  <span className="font-semibold text-slate-800 block mb-1">পেমেন্ট নির্দেশিকা:</span>
                  {method.instructions || 'কোনো লিখিত নির্দেশিকা নেই।'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* টাকা জমার পরিমাণ ম্যানুয়ালি এডজাস্ট ও অনুমোদন মডাল */}
      {approveModalDeposit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block">
                অর্থ অনুমোদন ও এডজাস্টমেন্ট
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                টাকা জমা অনুমোদন ও পরিমাণ যাচাই
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                গ্রাহক: <code className="font-mono text-slate-800">{approveModalDeposit.profile?.email || approveModalDeposit.user_id}</code>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">পেমেন্ট মেথড:</span>
                <span className="font-bold text-slate-900">{approveModalDeposit.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">প্রেরকের নম্বর:</span>
                <span className="font-mono font-bold text-slate-900">{approveModalDeposit.sender_account}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TrxID / রেফারেন্স:</span>
                <span className="font-mono font-bold text-slate-900">{approveModalDeposit.transaction_reference}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">গ্রাহকের দাবিকৃত পরিমাণ:</span>
                <span className="font-mono font-bold text-slate-900">{toBengaliCurrency(approveModalDeposit.amount)}</span>
              </div>
            </div>

            <form onSubmit={confirmApproveDeposit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অনুমোদিত প্রকৃত জমার পরিমাণ (৳) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={approvedAmountInput}
                  onChange={(e) => setApprovedAmountInput(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
                {parseFloat(approvedAmountInput) !== approveModalDeposit.amount && !isNaN(parseFloat(approvedAmountInput)) && (
                  <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      দাবিকৃত ৳{approveModalDeposit.amount} পরিবর্তন করে ৳{approvedAmountInput} ওয়ালেটে ক্রেডিট করা হবে।
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  এডজাস্টমেন্ট বা অনুমোদনের মন্তব্য
                </label>
                <textarea
                  rows={2}
                  value={approveNoteInput}
                  onChange={(e) => setApproveNoteInput(e.target.value)}
                  placeholder="যেমন: ব্যাংক স্টেটমেন্ট অনুযায়ী ১০০ টাকা প্রাপ্তি নিশ্চিত করা হয়েছে।"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApproveModalDeposit(null)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  disabled={processingId === approveModalDeposit.id}
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={processingId === approveModalDeposit.id}
                  className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {processingId === approveModalDeposit.id
                      ? 'অনুমোদন হচ্ছে...'
                      : `৳ ${approvedAmountInput || '0'} ক্রেডিট করুন`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* টাকা জমা বাতিলের সুনির্দিষ্ট কারণ লেখার মডাল */}
      {rejectModalDeposit && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">টাকা জমার অনুরোধ বাতিল</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  লেনদেন বাতিল করার কারণ উল্লেখ করুন (গ্রাহকের পোর্টালে প্রদর্শিত হবে)।
                </p>
              </div>
              <button
                onClick={() => setRejectModalDeposit(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={confirmReject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  বাতিলের কারণ <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="যেমন: ব্যাংক স্টেটমেন্টে উক্ত ট্রানজ্যাকশন আইডি ও জমার তথ্যের অমিল রয়েছে।"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:bg-white focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalDeposit(null)}
                  className="px-4 py-2 font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectModalDeposit.id}
                  className="px-4 py-2 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs"
                >
                  {processingId === rejectModalDeposit.id ? 'বাতিল হচ্ছে...' : 'বাতিল নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* পেমেন্ট পদ্ধতি এডিট / ক্রিয়েট মডাল (সুপার অ্যাডমিন) */}
      {(editingMethod || isAddingNewMethod) && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  সুপার অ্যাডমিন গেটওয়ে কনফিগারেশন
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {isAddingNewMethod ? 'নতুন পেমেন্ট মেথড যোগ করুন' : `${methodForm.name} সম্পাদনা করুন`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingMethod(null);
                  setIsAddingNewMethod(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentMethod} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  পেমেন্ট মাধ্যমের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={methodForm.name}
                  onChange={(e) => setMethodForm({ ...methodForm, name: e.target.value })}
                  placeholder="যেমন: বিকাশ (bKash), রকেট (Rocket), Brac Bank"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অ্যাকাউন্ট টাইপ / লেবেল
                </label>
                <input
                  type="text"
                  value={methodForm.account_type_label}
                  onChange={(e) => setMethodForm({ ...methodForm, account_type_label: e.target.value })}
                  placeholder="যেমন: মার্চেন্ট নম্বর (Make Payment), City Bank - MukiSoft Tech"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অ্যাকাউন্ট নম্বর / ব্যাংকিং তথ্য <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={methodForm.number_or_account}
                  onChange={(e) => setMethodForm({ ...methodForm, number_or_account: e.target.value })}
                  placeholder="01700-000000 অথবা 11002233445566"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  ধাপভিত্তিক পেমেন্ট নির্দেশিকা (Instructions)
                </label>
                <textarea
                  rows={4}
                  value={methodForm.instructions}
                  onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })}
                  placeholder="১. App থেকে Make Payment ক্লিক করুন..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={methodForm.is_active}
                    onChange={(e) => setMethodForm({ ...methodForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>গ্রাহক পোর্টালে এই মেথডটি চালু থাকবে (Active)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingMethod(null);
                    setIsAddingNewMethod(false);
                  }}
                  className="px-4 py-2 font-medium text-slate-600 hover:text-slate-800"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>পেমেন্ট মাধ্যম সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ফাইল প্রিভিউ মোডাল */}
      <FilePreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        fileUrl={previewFile.url}
        fileName={previewFile.name}
        notes={previewFile.notes}
      />
    </div>
  );
};
