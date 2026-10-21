import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, Lock, ShieldCheck, Phone, Mail, Building, CreditCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { api } from '../../services/api';
import { PlatformSettings } from '../../types/database';

export const AdminSettings: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const { showToast } = useNotification();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ফর্ম ফিল্ডসমূহ
  const [platformName, setPlatformName] = useState('');
  const [parentCompany, setParentCompany] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');

  // পেমেন্ট তথ্য
  const [bkashNumber, setBkashNumber] = useState('');
  const [bkashInstructions, setBkashInstructions] = useState('');
  const [nagadNumber, setNagadNumber] = useState('');
  const [nagadInstructions, setNagadInstructions] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankRouting, setBankRouting] = useState('');

  useEffect(() => {
    async function load() {
      const s = await api.getSettings();
      setSettings(s);
      if (s) {
        setPlatformName(s.general?.platform_name || 'MukiSoft Assist');
        setParentCompany(s.general?.parent_company || 'MukiSoft Technology');
        setSupportEmail(s.general?.support_email || 'support@mukisoft.com');
        setSupportPhone(s.general?.support_phone || '+880 1700 000000');

        setBkashNumber(s.payment_methods?.bKash?.account_number || '01700-000000');
        setBkashInstructions(s.payment_methods?.bKash?.instructions_bn || '');
        setNagadNumber(s.payment_methods?.nagad?.account_number || s.payment_methods?.Nagad?.account_number || '01800-000000');
        setNagadInstructions(s.payment_methods?.nagad?.instructions_bn || s.payment_methods?.Nagad?.instructions_bn || '');
        setBankAccountNumber(s.payment_methods?.bank?.account_number || s.payment_methods?.Bank_Transfer?.account_number || '1100-2233-4455-66');
        setBankName(s.payment_methods?.bank?.bank_name || s.payment_methods?.Bank_Transfer?.bank_name || 'The City Bank PLC');
        setBankRouting(s.payment_methods?.bank?.routing || s.payment_methods?.Bank_Transfer?.routing || '085272183');
      }
      setLoading(false);
    }
    load();
  }, []);

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 space-y-3">
        <Lock className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">সুপার অ্যাডমিনদের জন্য সংরক্ষিত</h2>
        <p className="text-xs text-slate-500">
          প্ল্যাটফর্মের মূল কনফিগারেশন ও আর্থিক সেটিংস পরিবর্তনের অনুমতি শুধুমাত্র সুপার অ্যাডমিনদের রয়েছে।
        </p>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    try {
      const updated = await api.updateSettings(
        {
          general: {
            platform_name: platformName.trim(),
            parent_company: parentCompany.trim(),
            support_email: supportEmail.trim(),
            support_phone: supportPhone.trim(),
            currency: 'BDT',
            currency_symbol: '৳',
          },
          payment_methods: {
            bKash: {
              id: 'bKash',
              name: 'bKash',
              name_bn: 'বিকাশ (bKash)',
              account_number: bkashNumber.trim(),
              account_name: parentCompany.trim(),
              type: 'merchant',
              instructions_bn: bkashInstructions.trim() || 'আপনার বিকাশ অ্যাপ থেকে পেমেন্ট করুন।',
              min_deposit: 100,
              max_deposit: 100000,
              is_active: true,
            },
            Nagad: {
              id: 'Nagad',
              name: 'Nagad',
              name_bn: 'নগদ (Nagad)',
              account_number: nagadNumber.trim(),
              account_name: parentCompany.trim(),
              type: 'merchant',
              instructions_bn: nagadInstructions.trim() || 'আপনার নগদ অ্যাপ থেকে মার্চেন্ট পেমেন্ট করুন।',
              min_deposit: 100,
              max_deposit: 100000,
              is_active: true,
            },
            Bank_Transfer: {
              id: 'Bank_Transfer',
              name: 'Bank Transfer',
              name_bn: `ব্যাংক ট্রান্সফার (${bankName.trim()})`,
              bank_name: bankName.trim(),
              account_name: parentCompany.trim(),
              account_number: bankAccountNumber.trim(),
              branch_name: 'Principal Branch, Dhaka',
              routing: bankRouting.trim(),
              type: 'bank',
              instructions_bn: 'NPSB, BEFTN বা RTGS এর মাধ্যমে ব্যাংক ট্রান্সফার করুন।',
              min_deposit: 500,
              max_deposit: 500000,
              is_active: true,
            },
          },
        },
        user.id
      );

      setSettings(updated);
      showToast({
        type: 'success',
        title: 'কনফিগারেশন সংরক্ষিত',
        message: 'প্ল্যাটফর্মের তথ্য ও গেটওয়ে সেটিংস সফলভাবে আপডেট করা হয়েছে।',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'সেটিংস সংরক্ষণ ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-xs text-slate-500">সেটিংস লোড হচ্ছে...</div>;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
          গ্লোবাল কনফিগারেশন
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">প্ল্যাটফর্ম সেটিংস ও পেমেন্ট গেটওয়ে</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          প্রতিষ্ঠানের প্রাতিষ্ঠানিক পরিচয়, গ্রাহক সেবা লাইন এবং ওয়ালেটে টাকা জমার গেটওয়ে তথ্য পরিচালনা করুন।
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* ১. প্রাতিষ্ঠানিক পরিচয় */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
              <Building className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-sm">প্রাতিষ্ঠানিক পরিচয় ও ব্র্যান্ডিং</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  প্ল্যাটফর্মের নাম <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  মাদার কোম্পানি / পরিচালনাকারী প্রতিষ্ঠান <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={parentCompany}
                  onChange={(e) => setParentCompany(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অফিশিয়াল সাপোর্ট ইমেইল <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  অফিশিয়াল হটলাইন নম্বর <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-medium font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ২. পেমেন্ট গেটওয়ে তথ্য */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex items-center gap-2 text-slate-900 border-b border-slate-100 pb-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm">টাকা জমার পেমেন্ট গেটওয়ে তথ্য (গ্রাহক পোর্টালে দৃশ্যমান)</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">বিকাশ মার্চেন্ট নম্বর</label>
                <input
                  type="text"
                  required
                  value={bkashNumber}
                  onChange={(e) => setBkashNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">নগদ মার্চেন্ট নম্বর</label>
                <input
                  type="text"
                  required
                  value={nagadNumber}
                  onChange={(e) => setNagadNumber(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h4 className="font-semibold text-slate-800 text-xs">ব্যাংক ট্রান্সফার তথ্য</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">ব্যাংকের নাম</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-hidden focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">হিসাব নম্বর</label>
                  <input
                    type="text"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium focus:outline-hidden focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">রাউটিং নম্বর</label>
                  <input
                    type="text"
                    value={bankRouting}
                    onChange={(e) => setBankRouting(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium focus:outline-hidden focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">
              পরিবর্তন করার সাথে সাথে অডিট লগে অপরিবর্তনীয় রেকর্ড সংরক্ষিত হবে।
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
