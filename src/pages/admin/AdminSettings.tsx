import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2, Lock, ShieldCheck, Phone, Mail, Building, CreditCard, Bot, Key, Eye, EyeOff, Sparkles } from 'lucide-react';
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
  const [addressBn, setAddressBn] = useState('');

  // AI ও Grok API সেটিংস
  const [grokApiKey, setGrokApiKey] = useState('');
  const [grokModel, setGrokModel] = useState('grok-beta');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingGrok, setTestingGrok] = useState(false);

  useEffect(() => {
    async function load() {
      const s = await api.getSettings();
      setSettings(s);
      if (s) {
        setPlatformName(s.general?.platform_name || 'MukiSoft Assist');
        setParentCompany(s.general?.parent_company || 'MukiSoft Technology');
        setSupportEmail(s.general?.support_email || 'support@mukisoft.com');
        setSupportPhone(s.general?.support_phone || '+880 1700 000000');
        setAddressBn(s.general?.address_bn || 'মুকিসফট টেকনোলজি, রাজশাহী, বাংলাদেশ');
      }

      const savedGrok = localStorage.getItem('mukisoft_grok_key') || '';
      const defaultModel = savedGrok.startsWith('gsk_') ? 'openai/gpt-oss-120b' : 'openai/gpt-oss-120b';
      const savedGrokModel = localStorage.getItem('mukisoft_grok_model') || defaultModel;
      setGrokApiKey(savedGrok);
      setGrokModel(savedGrokModel);

      // Check central server AI key
      try {
        const keyStatusRes = await fetch('/api/admin/ai-key-status');
        const keyStatus = await keyStatusRes.json();
        if (keyStatus.configured && !savedGrok && keyStatus.maskedKey) {
          setGrokApiKey(keyStatus.maskedKey);
        }
      } catch {
        // ignore
      }

      setLoading(false);
    }
    load();
  }, []);

  const handleTestGrokConnection = async () => {
    setTestingGrok(true);
    try {
      const res = await fetch('/api/chat/grok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello test AI connection',
          customApiKey: grokApiKey.includes('...') ? undefined : grokApiKey.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast({
          type: 'success',
          title: 'MukiSoft AI সহকারী কানেকশন সফল!',
          message: `AI সহকারী সার্ভারের সাথে সফলভাবে সংযোগ স্থাপিত হয়েছে। সক্রিয় মডেল: ${data.modelUsed || 'স্বয়ংক্রিয় সর্বোত্তম'}`,
        });
      } else {
        showToast({
          type: 'error',
          title: 'AI কানেকশন ত্রুটি',
          message: data.error || data.reply || 'API কি ভ্যালিডেশন ব্যর্থ হয়েছে। অনুগ্রহ করে কি সঠিক কি না যাচাই করুন।',
        });
      }
    } catch {
      showToast({ type: 'error', title: 'ত্রুটি', message: 'সার্ভারে সংযোগ করা সম্ভব হয়নি।' });
    } finally {
      setTestingGrok(false);
    }
  };

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
      if (grokApiKey.trim() && !grokApiKey.includes('...')) {
        localStorage.setItem('mukisoft_grok_key', grokApiKey.trim());
        localStorage.setItem('mukisoft_grok_model', grokModel);

        await fetch('/api/admin/set-ai-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: grokApiKey.trim(),
            model: grokModel,
          }),
        });
      }

      const updated = await api.updateSettings(
        {
          general: {
            platform_name: platformName.trim(),
            parent_company: parentCompany.trim(),
            support_email: supportEmail.trim(),
            support_phone: supportPhone.trim(),
            address_bn: addressBn.trim(),
            currency: 'BDT',
            currency_symbol: '৳',
          },
          payment_methods: settings?.payment_methods || {},
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

            <div className="pt-1">
              <label className="block font-semibold text-slate-700 mb-1">
                প্রধান কার্যালয়ের ঠিকানা <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={addressBn}
                  onChange={(e) => setAddressBn(e.target.value)}
                  placeholder="যেমন: মুকিসফট টেকনোলজি, রাজশাহী, বাংলাদেশ"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* ২. MukiSoft AI সহকারী কনফিগারেশন */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2 text-slate-900">
                <Bot className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm">MukiSoft AI সহকারী কনফিগারেশন</h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  grokApiKey
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {grokApiKey ? 'API Key সক্রিয়' : 'API Key প্রয়োজন'}
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              গ্রাহক লাইভ চ্যাটে সমস্যা লিখলে MukiSoft AI সহকারী স্বয়ংক্রিয়ভাবে আমাদের ওয়েবসাইটের ক্যাটালগ ও ডাটাবেজ বিশ্লেষণ করে সঠিক পরামর্শ ও লিঙ্কসহ উত্তর দেবে। আপনার সিক্রেট API Key এখানে পেস্ট করে সংরক্ষণ করুন (মডেল স্বয়ংক্রিয়ভাবে সর্বোত্তম কনফিগারেশনে সেট হয়ে যাবে)।
            </p>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                MukiSoft AI Secret API Key
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="আপনার API Key এখানে পেস্ট করুন..."
                  value={grokApiKey}
                  onChange={(e) => {
                    const val = e.target.value;
                    setGrokApiKey(val);
                    if (val.trim().startsWith('gsk_')) {
                      setGrokModel('llama-3.3-70b-versatile');
                    } else if (val.trim().startsWith('xai-')) {
                      setGrokModel('grok-beta');
                    }
                  }}
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                টিপ: AI সহকারী মডেল ব্যাকএন্ড থেকে স্বয়ংক্রিয়ভাবে সর্বোত্তম কনফিগারেশনে পরিচালিত হয়।
              </span>
              <button
                type="button"
                onClick={handleTestGrokConnection}
                disabled={testingGrok || !grokApiKey.trim()}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{testingGrok ? 'যাচাই করা হচ্ছে...' : 'কানেকশন টেস্ট করুন'}</span>
              </button>
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
