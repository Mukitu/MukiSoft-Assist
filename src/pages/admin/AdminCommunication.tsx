import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  Sliders,
  Server,
  ShieldCheck,
  Lock,
  ExternalLink,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { communicationService } from '../../services/communicationService';
import { EmailOutboxItem, EmailTemplateType } from '../../types/database';
import { renderEmailTemplate } from '../../lib/emailTemplates';

export const AdminCommunication: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();

  // সার্ভার ইমেইল স্ট্যাটাস
  const [serverStatus, setServerStatus] = useState<{
    configured: boolean;
    provider: string;
    senderName: string;
    senderEmail: string;
    supportEmail: string;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // আউটবক্স কিউ
  const [outbox, setOutbox] = useState<EmailOutboxItem[]>([]);
  const [outboxFilter, setOutboxFilter] = useState<'all' | 'queued' | 'sent' | 'failed'>('all');
  const [loadingOutbox, setLoadingOutbox] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // টেস্ট ইমেইল প্রেরণ
  const [testEmail, setTestEmail] = useState('');
  const [testTemplate, setTestTemplate] = useState<EmailTemplateType>('welcome');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

  // টেমপ্লেট প্রিভিউ
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplateType>('order_created');

  const loadData = async () => {
    try {
      setLoadingStatus(true);
      const st = await communicationService.getEmailServerStatus();
      setServerStatus(st);
    } catch {
      // Fallback
    } finally {
      setLoadingStatus(false);
    }

    try {
      setLoadingOutbox(true);
      const items = await communicationService.getEmailOutbox({ status: outboxFilter });
      setOutbox(items);
    } catch {
      // Fallback
    } finally {
      setLoadingOutbox(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [outboxFilter]);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <Lock className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">সুপার অ্যাডমিনদের জন্য সংরক্ষিত</h2>
        <p className="text-xs text-slate-500">
          প্ল্যাটফর্মের যোগাযোগ আর্কিটেকচার, ইমেইল আউটবক্স ও সার্ভার কনফিগারেশন দেখার অনুমতি শুধুমাত্র সুপার অ্যাডমিনদের রয়েছে।
        </p>
      </div>
    );
  }

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'একটি বৈধ ইমেইল ঠিকানা প্রদান করুন।' });
      return;
    }

    setSendingTest(true);
    setTestResult(null);
    try {
      const res = await communicationService.sendTestEmail(testEmail.trim(), testTemplate);
      if (res.success) {
        setTestResult({
          success: true,
          message: `সফলভাবে প্রেরিত হয়েছে (Message ID: ${res.messageId || 'OK'})`,
        });
        showToast({
          type: 'success',
          title: 'টেস্ট ইমেইল সম্পন্ন',
          message: `${testEmail} ঠিকানায় পরীক্ষামূলক ইমেইল প্রেরিত হয়েছে।`,
        });
        loadData();
      } else {
        setTestResult({
          success: false,
          message: res.error || 'ইমেইল পাঠানো যায়নি।',
        });
        showToast({
          type: 'error',
          title: 'ডেলিভারি ব্যর্থ',
          message: res.error || 'সার্ভার থেকে ইমেইল পাঠানো সম্ভব হয়নি।',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অজ্ঞাত ত্রুটি';
      setTestResult({ success: false, message: msg });
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setSendingTest(false);
    }
  };

  const handleRetryOutbox = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await communicationService.retryOutboxItem(id);
      if (res.success) {
        showToast({
          type: 'success',
          title: 'পুনঃপ্রেরণ সফল',
          message: 'আউটবক্স রেকর্ডটি পুনরায় পাঠিয়ে সফল হয়েছে।',
        });
      } else {
        showToast({
          type: 'error',
          title: 'পুনঃপ্রেরণ ব্যর্থ',
          message: res.error || 'ডেলিভারি সম্পন্ন হয়নি।',
        });
      }
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'পুনঃচেষ্টা ত্রুটি';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setRetryingId(null);
    }
  };

  // প্রিভিউ রেন্ডার
  const renderedPreview = renderEmailTemplate(previewTemplate, {
    recipientName: user?.name || 'তানভীর হোসেন',
    recipientEmail: user?.email || 'customer@example.com',
    orderNumber: 'MS-20261016-8841',
    serviceTitle: 'ফুল-স্ট্যাক ওয়েব অ্যাপ্লিকেশন ডেভেলপমেন্ট',
    amount: 15000,
    deliveryDays: 5,
    statusBengali: 'চলমান কাজ',
    statusNote: 'ডেভেলপমেন্ট টিম প্রথম পর্যায়ের ডাটাবেজ ইন্টিগ্রেশন সম্পন্ন করেছেন।',
    deliverableTitle: 'Final_Source_Code_Archive.zip',
    paymentMethod: 'bKash',
    transactionRef: 'TRX9921827419',
    depositStatus: 'approved',
    walletBalance: 24500,
    ticketNumber: 'TKT-88401',
    ticketSubject: 'কাস্টম এপিআই সংযোগ সংক্রান্ত জিজ্ঞাসা',
    replyMessage: 'আপনার ডোমেইন কনফিগারেশন আমরা সফলভাবে যাচাই করেছি। নতুন ক্রিডেনশিয়াল দিয়ে পুনরায় চেষ্টা করুন।',
    responderName: 'আরিফ আহমেদ (সিনিয়র টেক লিড)',
    actionUrl: window.location.origin,
  });

  return (
    <div className="max-w-6xl space-y-8">
      {/* হেডার */}
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
          সিস্টেম যোগাযোগ ও মেসেজিং
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">যোগাযোগ ও ইমেইল নোটিফিকেশন কনফিগারেশন</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          সার্ভার-সাইড ইমেইল প্রোভাইডার স্ট্যাটাস, বাংলা রেসপন্সিভ ইমেইল টেমপ্লেট ও ডেলিভারি আউটবক্স পর্যবেক্ষণ করুন।
        </p>
      </div>

      {/* ১. সার্ভার প্রোভাইডার স্ট্যাটাস কার্ড */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">সার্ভার-সাইড ইমেইল প্রোভাইডার স্ট্যাটাস</h3>
            </div>
            <button
              onClick={loadData}
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>রিফ্রেশ</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 block">বর্তমান প্রোভাইডার</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-900 uppercase">
                  {serverStatus?.provider || 'sandbox'}
                </span>
                {serverStatus?.configured ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> সক্রিয়
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3 h-3" /> কনফিগার প্রয়োজন
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 block">সার্ভার সিকিউরিটি নীতি</span>
              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>ক্লায়েন্ট সিক্রেট সম্পূর্ণ সুরক্ষিত</span>
              </div>
              <p className="text-[10px] text-slate-400">
                ইমেইল API কী বা SMTP পাসওয়ার্ড কখনই ফ্রন্টএন্ডে এক্সপোজ করা হয় না।
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 block">প্রেরকের নাম (Sender Name)</span>
              <span className="font-semibold text-slate-800">
                {serverStatus?.senderName || 'MukiSoft Assist'}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-500 block">ভেরিফাইড প্রেরক ইমেইল</span>
              <span className="font-mono font-medium text-slate-800">
                {serverStatus?.senderEmail || 'no-reply@mukisoft.com'}
              </span>
            </div>
          </div>

          {!serverStatus?.configured && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2 text-amber-950">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Info className="w-4 h-4 text-amber-600" />
                <span>ইমেইল প্রোভাইডার সেটআপ নির্দেশনা</span>
              </div>
              <p className="leading-relaxed">
                লাইভ ইমেইল পাঠানোর জন্য আপনার সার্ভার এনভায়রনমেন্ট ফাইলে (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-amber-900">.env</code>) Resend বা SMTP ক্রিডেনশিয়াল যুক্ত করুন:
              </p>
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
{`RESEND_API_KEY="re_1234567890abcdef"
EMAIL_FROM_NAME="MukiSoft Assist"
EMAIL_FROM_ADDRESS="notifications@yourdomain.com"
EMAIL_SUPPORT_ADDRESS="support@yourdomain.com"`}
              </pre>
              <p className="text-[11px] text-amber-800">
                💡 প্রোভাইডার কনফিগার না থাকলেও অ্যাপ্লিকেশন যথারীতি সচল থাকবে এবং সমস্ত নোটিফিকেশন গ্রাহকের অভ্যন্তরীণ ড্যাশবোর্ডে সাথে সাথে প্রদর্শিত হবে।
              </p>
            </div>
          )}
        </div>

        {/* টেস্ট ইমেইল প্রেরক */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Send className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">টেস্ট ইমেইল প্রেরণ</h3>
          </div>
          <p className="text-xs text-slate-500">
            সিস্টেমের লাইভ ইমেইল ডেলিভারি পাইপলাইন ও টেমপ্লেট যাচাই করতে টেস্ট বার্তা পাঠান।
          </p>

          <form onSubmit={handleSendTestEmail} className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">প্রাপকের ইমেইল</label>
              <input
                type="email"
                required
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">টেম্পলেট নির্বাচন</label>
              <select
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value as EmailTemplateType)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
              >
                <option value="welcome">স্বাগতম ইমেইল (Welcome)</option>
                <option value="order_created">অর্ডার নিশ্চিতকরণ (Order Created)</option>
                <option value="order_status">অর্ডারের অবস্থা পরিবর্তন (Status Update)</option>
                <option value="deliverable_ready">ফাইল ডেলিভারি প্রস্তুত (Deliverable)</option>
                <option value="deposit_status">টাকা জমা নিশ্চিতকরণ (Deposit Status)</option>
                <option value="refund_processed">অর্থ ফেরত (Refund Processed)</option>
                <option value="support_reply">সাপোর্ট টিকিট উত্তর (Support Reply)</option>
                <option value="password_reset">পাসওয়ার্ড রিসেট (Password Reset)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={sendingTest}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingTest ? 'প্রেরণ করা হচ্ছে...' : 'টেস্ট ইমেইল পাঠান'}</span>
            </button>
          </form>

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed font-mono break-all">{testResult.message}</div>
            </div>
          )}
        </div>
      </div>

      {/* ২. টেমপ্লেট প্রিভিউয়ার */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">বাংলা ইমেইল টেমপ্লেট লাইভ প্রিভিউ</h3>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <label className="text-slate-600 font-medium">টেমপ্লেট:</label>
            <select
              value={previewTemplate}
              onChange={(e) => setPreviewTemplate(e.target.value as EmailTemplateType)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-xs"
            >
              <option value="welcome">স্বাগতম (Welcome)</option>
              <option value="order_created">অর্ডার নিশ্চিতকরণ (Order Created)</option>
              <option value="order_status">অর্ডারের অবস্থা পরিবর্তন (Status Update)</option>
              <option value="deliverable_ready">ফাইল ডেলিভারি (Deliverable)</option>
              <option value="deposit_status">টাকা জমা অনুমোদন (Deposit Status)</option>
              <option value="refund_processed">অর্থ ফেরত (Refund Processed)</option>
              <option value="support_reply">সাপোর্ট টিকিট উত্তর (Support Reply)</option>
              <option value="password_reset">পাসওয়ার্ড রিসেট (Password Reset)</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">ইমেইল বিষয় (Subject):</span>
            <span className="font-medium text-slate-900">{renderedPreview.subject}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">HTML + Plaintext Responsive</span>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[460px] overflow-y-auto p-4 flex justify-center">
          <iframe
            srcDoc={renderedPreview.html}
            title="Email Template Preview"
            className="w-full max-w-[650px] min-h-[400px] border-0"
          />
        </div>
      </div>

      {/* ৩. ইমেইল আউটবক্স কিউ ও রিট্রাই মনিটর */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">ইমেইল আউটবক্স কিউ (Email Outbox Queue)</h3>
              <p className="text-xs text-slate-500">
                ডেলিভারি স্ট্যাটাস ট্র্যাকিং, রিট্রাই কাউন্টার ও আইডেমপোটেন্সি কিউ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">ফিল্টার:</span>
            <select
              value={outboxFilter}
              onChange={(e) => setOutboxFilter(e.target.value as any)}
              className="p-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden text-xs"
            >
              <option value="all">সমস্ত রেকর্ড ({outbox.length})</option>
              <option value="queued">অপেক্ষমান (Queued)</option>
              <option value="sent">সফল (Sent)</option>
              <option value="failed">ব্যর্থ (Failed)</option>
            </select>
          </div>
        </div>

        {loadingOutbox ? (
          <div className="py-12 text-center text-xs text-slate-500">আউটবক্স লোড হচ্ছে...</div>
        ) : outbox.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">কোনো আউটবক্স মেসেজ পাওয়া যায়নি।</p>
            <p className="text-slate-400">অর্ডার, পেমেন্ট বা সহায়তার ইভেন্ট তৈরি হলে এখানে কিউ প্রদর্শিত হবে।</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-3 px-4">প্রাপক ও বিষয়</th>
                  <th className="py-3 px-4">ক্যাটাগরি</th>
                  <th className="py-3 px-4">স্ট্যাটাস</th>
                  <th className="py-3 px-4">চেষ্টা (Retries)</th>
                  <th className="py-3 px-4">আইডেমপোটেন্সি কী</th>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outbox.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-slate-900">{item.recipient_email}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{item.subject}</div>
                      {item.error_message && (
                        <div className="text-[10px] text-rose-600 mt-0.5 line-clamp-1" title={item.error_message}>
                          ত্রুটি: {item.error_message}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {item.status === 'sent' && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" /> প্রেরিত
                        </span>
                      )}
                      {item.status === 'queued' && (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                          <RotateCw className="w-3 h-3" /> অপেক্ষমান
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                          <XCircle className="w-3 h-3" /> ব্যর্থ
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {item.retry_count} / {item.max_retries}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {item.event_key || '—'}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleTimeString('bn-BD', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {item.status !== 'sent' && item.retry_count < item.max_retries ? (
                        <button
                          onClick={() => handleRetryOutbox(item.id)}
                          disabled={retryingId === item.id}
                          className="px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors disabled:opacity-50"
                        >
                          {retryingId === item.id ? 'চেষ্টা...' : 'পুনঃচেষ্টা'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
