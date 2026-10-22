import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  RefreshCw,
  FileCheck,
  ShieldCheck,
  Wallet as WalletIcon,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliDigits, toBengaliCurrency } from '../../lib/i18n';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { ServiceItem, Wallet } from '../../types/database';

interface ServiceDetailPageProps {
  serviceSlug: string;
  onNavigate: (path: string) => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({ serviceSlug, onNavigate }) => {
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useNotification();

  const [service, setService] = useState<ServiceItem | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);

  // অর্ডার কনফার্মেশন মডাল স্টেট
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [requirementsText, setRequirementsText] = useState('');
  const [referenceLink, setReferenceLink] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const item = await api.getServiceBySlug(serviceSlug);
        setService(item);
        if (user) {
          const w = await api.getWallet(user.id);
          setWallet(w);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [serviceSlug, user]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <div className="h-64 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">সেবা পাওয়া যায়নি</h2>
        <p className="text-xs text-slate-500">অনুরোধকৃত সেবাটি বর্তমানে ক্যাটালগে নেই বা পরিবর্তন করা হয়েছে।</p>
        <button
          onClick={() => onNavigate('/services')}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
        >
          ক্যাটালগে ফিরে যান
        </button>
      </div>
    );
  }

  const price = service.promotional_price ?? service.price;
  const hasSufficientBalance = wallet ? wallet.balance >= price : false;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: max 20MB
    if (file.size > 20 * 1024 * 1024) {
      setAttachmentError('ফাইলের আকার সর্বোচ্চ ২০ মেগাবাইট হতে পারবে।');
      setAttachmentFile(null);
      return;
    }

    // Check extension
    const allowed = ['pdf', 'doc', 'docx', 'zip', 'rar', 'png', 'jpg', 'jpeg', 'txt', 'csv', 'xlsx'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !allowed.includes(ext)) {
      setAttachmentError('অননুমোদিত ফাইল ফরম্যাট। শুধু PDF, DOC, DOCX, ZIP, PNG, JPG বা XLSX আপলোড করা যাবে।');
      setAttachmentFile(null);
      return;
    }

    setAttachmentError(null);
    setAttachmentFile(file);
  };

  const handleStartCommission = () => {
    if (!isAuthenticated) {
      showToast({
        type: 'info',
        title: 'লগইন প্রয়োজন',
        message: 'সেবা অর্ডার করার পূর্বে অনুগ্রহ করে লগইন করুন অথবা অ্যাকাউন্ট তৈরি করুন।',
      });
      onNavigate(`/login?redirect=${encodeURIComponent(`/service/${serviceSlug}`)}&reason=order`);
      return;
    }
    setIsCommissionModalOpen(true);
  };

  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!requirementsText.trim()) {
      showToast({
        type: 'error',
        title: 'তথ্য দিন',
        message: 'অর্ডারটি শুরু করার জন্য অনুগ্রহ করে আপনার প্রজেক্টের কাজের বিবরণ দিন।',
      });
      return;
    }

    if (!hasSufficientBalance) {
      showToast({
        type: 'error',
        title: 'পর্যাপ্ত ব্যালেন্স নেই',
        message: `আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই। প্রয়োজনীয় মূল্য ৳ ${price}। অনুগ্রহ করে ওয়ালেটে টাকা জমা দিন।`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      let attachUrl: string | undefined = undefined;
      const attachName = attachmentFile ? attachmentFile.name : undefined;

      if (attachmentFile) {
        try {
          attachUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(attachmentFile);
          });
        } catch {
          attachUrl = `https://storage.mukisoft.com/attachments/${encodeURIComponent(attachmentFile.name)}`;
        }
      }

      const result = await api.purchaseService(
        service.id,
        user.id,
        requirementsText.trim(),
        referenceLink.trim() || undefined,
        attachName,
        attachUrl
      );

      showToast({
        type: 'success',
        title: 'অর্ডার সফলভাবে গ্রহণ করা হয়েছে',
        message: `অর্ডার #${result.orderNumber} সম্পন্ন হয়েছে। ওয়ালেট থেকে ${toBengaliCurrency(price)} কর্তন করা হয়েছে।`,
      });
      setIsCommissionModalOpen(false);
      onNavigate(`/dashboard/orders/${result.orderId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অর্ডার সম্পন্ন করা সম্ভব হয়নি';
      showToast({
        type: 'error',
        title: 'অর্ডার ব্যর্থ',
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* ব্যাক বাটন */}
      <button
        onClick={() => onNavigate('/services')}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>সেবা ক্যাটালগে ফিরে যান</span>
      </button>

      {/* মূল গ্রিড: বামে বিবরণ, ডানে অর্ডার বক্স */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* বাম কলাম (২ কলাম) */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500">
              <span className="font-semibold text-indigo-600 uppercase tracking-wider">
                {service.category?.name_bn || service.category?.name || 'যাচাইকৃত সেবা বিভাগ'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                {toBengaliDigits(service.delivery_days)} কর্মদিবসের মধ্যে ডেলিভারি
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {service.title_bn || service.title}
            </h1>

            <div className="pt-2 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {service.description_bn || service.description}
            </div>

            {/* সরকারি সেবা শর্তাবলি */}
            {service.is_gov_service && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
                <div className="font-semibold text-amber-900 text-sm">প্ল্যাটফর্ম সহায়তা ও নির্দেশিকা পরিধি</div>
                <p className="leading-relaxed">{service.gov_fee_notice}</p>
                {service.gov_official_link && (
                  <div className="pt-1">
                    <a
                      href={service.gov_official_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-indigo-700 hover:underline"
                    >
                      <span>সরকারি অফিসিয়াল সিটিজেন পোর্টালে যান</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* সেবার আবশ্যিক শর্তাবলি ও ইনপুট নির্দেশিকা */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">প্রয়োজনীয় ইনপুট ও তথ্য</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {service.requirements ||
                  'অর্ডার নিশ্চিত করার সময় আপনার খসড়া ফাইল, গুগল ড্রাইভ লিংক বা কাজের মূল উদ্দেশ্য বিস্তারিত উল্লেখ করুন।'}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-2">রিভিশন ও গুণগত নীতি</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {service.revision_policy ||
                  'কাজের সর্বোচ্চ মান বজায় রাখতে নির্ধারিত রিভিশন অন্তর্ভুক্ত রয়েছে।'}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-3">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">স্ট্যান্ডার্ড কাজের নিশ্চয়তা</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>মানবীয় যাচাইকরণ ও এআই কাঠামোগত নির্ভুলতা</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>মূল ফাইল ও এডিটেবল ফরম্যাট সরাসরি ডাউনলোড</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>ডেলিভারি সমাপ্ত না হওয়া পর্যন্ত ওয়ালেট এসক্রো নিরাপত্তা</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>সরাসরি টিকিটের মাধ্যমে ডেডিকেটেড সাপোর্ট সুবিধা</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ডান কলাম: স্টিকি চেকআউট বক্স (১ কলাম) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-24 shadow-sm space-y-6">
          <div>
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">নির্ধারিত মোট মূল্য</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold font-mono text-slate-900">
                {toBengaliCurrency(price)}
              </span>
              {service.promotional_price && (
                <span className="text-sm text-slate-400 line-through font-mono">
                  {toBengaliCurrency(service.price)}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500 block mt-1">
              আপনার অ্যাকাউন্টের ওয়ালেট থেকে স্বয়ংক্রিয়ভাবে প্রদানযোগ্য
            </span>
          </div>

          <div className="border-y border-slate-100 py-4 space-y-3 text-xs sm:text-sm text-slate-600">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-4 h-4" />
                ডেলিভারি সময়সীমা
              </span>
              <span className="font-semibold text-slate-900">
                {toBengaliDigits(service.delivery_days)} কর্মদিবস
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <RefreshCw className="w-4 h-4" />
                রিভিশন সুবিধা
              </span>
              <span className="font-semibold text-slate-900">পলিসি অনুযায়ী প্রযোজ্য</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <FileCheck className="w-4 h-4" />
                আউটপুট
              </span>
              <span className="font-semibold text-slate-900">পূর্ণাঙ্গ ডিজিটাল ফাইল</span>
            </div>
          </div>

          {/* ওয়ালেট ব্যালেন্স নিরীক্ষণ */}
          {isAuthenticated && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>আপনার ওয়ালেট ব্যালেন্স:</span>
                <span className="font-mono font-bold text-slate-900">
                  {toBengaliCurrency(wallet?.balance ?? 0)}
                </span>
              </div>

              {!hasSufficientBalance && (
                <div className="text-[11px] text-rose-600 flex items-start gap-1 pt-1 leading-tight">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    পর্যাপ্ত ব্যালেন্স নেই। আরও {toBengaliCurrency(price - (wallet?.balance || 0))} রিচার্জ প্রয়োজন।
                  </span>
                </div>
              )}
            </div>
          )}

          {/* অ্যাকশন বাটন */}
          {isAuthenticated && !hasSufficientBalance ? (
            <button
              onClick={() => onNavigate('/dashboard/wallet')}
              className="w-full py-3 px-4 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <WalletIcon className="w-4 h-4" />
              <span>ওয়ালেটে টাকা জমা দিন</span>
            </button>
          ) : (
            <button
              onClick={handleStartCommission}
              className="w-full py-3 px-4 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              সেবাটি অর্ডার করুন
            </button>
          )}

          <div className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>মুকিসফট টেকনোলজি এসক্রো দ্বারা সুরক্ষিত</span>
          </div>
        </div>
      </div>

      {/* অর্ডার রিকোয়ারমেন্টস মডাল (সম্পূর্ণ বাংলায়) */}
      {isCommissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 block">
                অর্ডার নিশ্চিতকরণ ও ওয়ালেট চেকআউট
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {service.title_bn || service.title}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                নিচের তথ্যগুলো প্রদান করে অর্ডার নিশ্চিত করুন। সফল অর্ডারের সাথে সাথে স্বয়ংক্রিয়ভাবে একটি ডেবিট ট্রানজ্যাকশন লেজার তৈরি হবে।
              </p>
            </div>

            <form onSubmit={handleConfirmPurchase} className="space-y-4">
              {/* কাজের বিবরণ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  প্রজেক্টের কাজের বিবরণ ও নির্দেশনা <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={requirementsText}
                  onChange={(e) => setRequirementsText(e.target.value)}
                  placeholder="আপনার ফাইল বা খসড়ার ড্রাইভ লিংক, পছন্দনীয় কালার কোড বা গুরুত্বপূর্ণ কোনো তথ্য লিখুন..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* রেফারেন্স লিংক */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রেফারেন্স ওয়েব লিংক বা গুগল ড্রাইভ ফোল্ডার (ঐচ্ছিক)
                </label>
                <input
                  type="url"
                  value={referenceLink}
                  onChange={(e) => setReferenceLink(e.target.value)}
                  placeholder="https://drive.google.com/... বা https://figma.com/..."
                  className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>

              {/* রেফারেন্স ফাইল আপলোড */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  রেফারেন্স ফাইল / ডকুমেন্ট আপলোড (ঐচ্ছিক, সর্বোচ্চ ২০ MB)
                </label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200 cursor-pointer bg-slate-50 border border-slate-300 rounded-lg p-1.5"
                />
                {attachmentFile && (
                  <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>সংযুক্ত ফাইল: {attachmentFile.name} ({(attachmentFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
                {attachmentError && (
                  <div className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{attachmentError}</span>
                  </div>
                )}
              </div>

              {/* ওয়ালেট চেকআউট ব্রেকডাউন (Prompt 4 শর্তাবলি) */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block border-b border-slate-200 pb-1.5">
                  ওয়ালেট আর্থিক হিসাব বিবরণী
                </span>
                <div className="flex justify-between text-slate-600">
                  <span>নির্বাচিত সেবার নাম:</span>
                  <span className="font-semibold text-slate-900 text-right max-w-[240px] truncate">
                    {service.title_bn || service.title}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>সেবার নির্ধারিত মূল্য:</span>
                  <span className="font-mono font-bold text-slate-900">{toBengaliCurrency(price)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>বর্তমান ওয়ালেট ব্যালেন্স:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {toBengaliCurrency(wallet?.balance ?? 0)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                  <span>অর্ডারের পর সম্ভাব্য অবশিষ্ট ব্যালেন্স:</span>
                  <span
                    className={`font-mono font-bold ${
                      hasSufficientBalance ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {hasSufficientBalance
                      ? toBengaliCurrency(wallet ? wallet.balance - price : 0)
                      : 'অপর্যাপ্ত ফান্ড'}
                  </span>
                </div>
              </div>

              {/* অপর্যাপ্ত ব্যালেন্স সতর্কবার্তা */}
              {!hasSufficientBalance && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-2">
                  <div className="flex items-start gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span>আপনার ওয়ালেটে পর্যাপ্ত ব্যালেন্স নেই।</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    অর্ডারটি সম্পন্ন করতে আরও {toBengaliCurrency(price - (wallet?.balance || 0))} জমা দিতে হবে। অনুগ্রহ করে ওয়ালেটে টাকা জমা দিন।
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCommissionModalOpen(false);
                      onNavigate('/dashboard/wallet');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                  >
                    <WalletIcon className="w-3.5 h-3.5" />
                    <span>ওয়ালেট রিচার্জ করুন</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCommissionModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                  disabled={isSubmitting}
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !hasSufficientBalance}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting
                    ? 'অর্ডার প্রসেসিং হচ্ছে...'
                    : `অর্ডার নিশ্চিত করুন (৳ ${toBengaliDigits(price)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
