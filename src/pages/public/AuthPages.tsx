import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

interface AuthPagesProps {
  mode: 'login' | 'register' | 'forgot-password';
  onNavigate: (path: string) => void;
}

export const AuthPages: React.FC<AuthPagesProps> = ({ mode, onNavigate }) => {
  const { login, register, resetPassword, isSupabaseConfigured, switchDemoRole } = useAuth();
  const { showToast } = useNotification();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await login(email, password);
        if (res.success) {
          showToast({ type: 'success', title: 'স্বাগতম', message: 'সফলভাবে লগইন হয়েছে।' });
          onNavigate('/dashboard');
        } else {
          showToast({ type: 'error', title: 'লগইন ব্যর্থ', message: res.error || 'ভুল ইমেইল বা পাসওয়ার্ড দেওয়া হয়েছে।' });
        }
      } else if (mode === 'register') {
        const res = await register(email, password, fullName);
        if (res.success) {
          showToast({
            type: 'success',
            title: 'অ্যাকাউন্ট তৈরি হয়েছে',
            message: 'আপনার প্রোফাইল এবং ওয়ালেট সক্রিয় করা হয়েছে।',
          });
          onNavigate('/dashboard');
        } else {
          showToast({ type: 'error', title: 'নিবন্ধন ব্যর্থ', message: res.error || 'অ্যাকাউন্ট তৈরি করা যায়নি।' });
        }
      } else if (mode === 'forgot-password') {
        const res = await resetPassword(email);
        if (res.success) {
          setResetSent(true);
          showToast({
            type: 'success',
            title: 'লিংক পাঠানো হয়েছে',
            message: 'পাসওয়ার্ড পুনরুদ্ধারের লিংক আপনার ইমেইলে পাঠানো হয়েছে।',
          });
        } else {
          showToast({ type: 'error', title: 'ব্যর্থ হয়েছে', message: res.error || 'পুনরুদ্ধার সম্পন্ন করা যায়নি।' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        {/* ব্র্যান্ড হেডার */}
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            MukiSoft Assist
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            {mode === 'login' && 'আপনার অ্যাকাউন্টে লগইন করুন'}
            {mode === 'register' && 'নতুন গ্রাহক অ্যাকাউন্ট খুলুন'}
            {mode === 'forgot-password' && 'পাসওয়ার্ড পুনরুদ্ধার করুন'}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {mode === 'login' && 'আপনার ওয়ালেট ব্যালেন্স দেখতে, অর্ডার ট্র্যাক করতে ও ফাইল ডাউনলোড করতে লগইন করুন।'}
            {mode === 'register' && 'নিবন্ধনের সাথে সাথে আপনার একটি নিজস্ব নিরাপদ ডিজিটাল ওয়ালেট তৈরি হয়ে যাবে।'}
            {mode === 'forgot-password' && 'আপনার নিবন্ধিত ইমেইল ঠিকানা প্রদান করুন।'}
          </p>
        </div>

        {resetSent ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-semibold text-emerald-900 text-sm">নির্দেশনা পাঠানো হয়েছে</h3>
            <p className="text-xs text-emerald-700 leading-relaxed">
              অনুগ্রহ করে আপনার ইনবক্স <span className="font-mono font-medium">{email}</span> চেক করুন।
            </p>
            <button
              onClick={() => onNavigate('/login')}
              className="mt-2 text-xs font-semibold text-indigo-700 underline"
            >
              লগইন পেজে ফিরে যান
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {mode === 'register' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">পূর্ণ নাম</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="তানভীর হোসেন"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">ইমেইল ঠিকানা</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            {mode !== 'forgot-password' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">পাসওয়ার্ড</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => onNavigate('/forgot-password')}
                      className="text-[11px] text-indigo-600 hover:underline"
                    >
                      পাসওয়ার্ড ভুলে গেছেন?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>
                {loading
                  ? 'যাচাই করা হচ্ছে...'
                  : mode === 'login'
                  ? 'লগইন করুন'
                  : mode === 'register'
                  ? 'অ্যাকাউন্ট খুলুন'
                  : 'রিসেট লিংক পাঠান'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* টেস্ট মোডে ১-ক্লিকে ভূমিকা বদল */}
        {!isSupabaseConfigured && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
              তাৎক্ষণিক টেস্ট লগইন (১-ক্লিক)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  switchDemoRole('user');
                  onNavigate('/dashboard');
                }}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-center"
              >
                গ্রাহক
              </button>
              <button
                type="button"
                onClick={() => {
                  switchDemoRole('admin');
                  onNavigate('/admin');
                }}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-center"
              >
                অ্যাডমিন
              </button>
              <button
                type="button"
                onClick={() => {
                  switchDemoRole('super_admin');
                  onNavigate('/admin');
                }}
                className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-center"
              >
                সুপার অ্যাডমিন
              </button>
            </div>
          </div>
        )}

        {/* পেজ সুইচ লিংক */}
        <div className="pt-2 text-center text-xs text-slate-600">
          {mode === 'login' && (
            <div>
              এখনও কোনো অ্যাকাউন্ট নেই?{' '}
              <button onClick={() => onNavigate('/register')} className="font-semibold text-indigo-600 hover:underline">
                নতুন অ্যাকাউন্ট খুলুন
              </button>
            </div>
          )}
          {mode === 'register' && (
            <div>
              ইতিমধ্যে একটি অ্যাকাউন্ট আছে?{' '}
              <button onClick={() => onNavigate('/login')} className="font-semibold text-indigo-600 hover:underline">
                লগইন করুন
              </button>
            </div>
          )}
          {mode === 'forgot-password' && (
            <button onClick={() => onNavigate('/login')} className="font-semibold text-indigo-600 hover:underline">
              লগইন পেজে ফিরে যান
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
