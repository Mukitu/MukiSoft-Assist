import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useNotification } from '../../context/NotificationContext';
import { communicationService } from '../../services/communicationService';

interface ResetPasswordProps {
  onNavigate: (path: string) => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onNavigate }) => {
  const { showToast } = useNotification();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isValidSession, setIsValidSession] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function verifyRecoverySession() {
      if (!isSupabaseConfigured || !supabase) {
        // Fallback test mode
        setIsValidSession(true);
        setCheckingSession(false);
        return;
      }

      // Check current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      // Also check hash for error parameters (e.g. error=access_denied&error_code=otp_expired)
      const hash = window.location.hash;
      const urlParams = new URLSearchParams(hash.replace(/^#/, ''));
      const errorCode = urlParams.get('error_code') || urlParams.get('error');

      if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
        setIsValidSession(false);
        setErrorMessage('পাসওয়ার্ড রিসেট লিংকের মেয়াদ উত্তীর্ণ হয়ে গেছে অথবা লিংকটি পূর্বে ব্যবহৃত হয়েছে।');
        setCheckingSession(false);
        return;
      }

      if (session || hash.includes('type=recovery') || hash.includes('access_token')) {
        setIsValidSession(true);
      } else {
        setIsValidSession(false);
        setErrorMessage('কোনো কার্যকর পাসওয়ার্ড রিসেট সেশন পাওয়া যায়নি। দয়া করে পুনরায় নতুন লিংকের আবেদন করুন।');
      }
      setCheckingSession(false);
    }

    verifyRecoverySession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showToast({
        type: 'error',
        title: 'দুর্বল পাসওয়ার্ড',
        message: 'পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।',
      });
      return;
    }

    if (password !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'পাসওয়ার্ড অমিল',
        message: 'উভয় ঘরে একই পাসওয়ার্ড প্রদান করুন।',
      });
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.updateUser({
          password: password,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Notify user about security update (without password)
        if (data.user) {
          await communicationService.notifyAndEmail({
            userId: data.user.id,
            recipientEmail: data.user.email,
            title: 'পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে',
            message: 'আপনার MukiSoft Assist অ্যাকাউন্টের পাসওয়ার্ড পরিবর্তন সম্পন্ন হয়েছে।',
            category: 'security',
            templateType: 'system',
            templateData: {
              customMessage: 'আপনার অ্যাকাউন্টের পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে। আপনি এই পরিবর্তন না করে থাকলে অবিলম্বে অ্যাডমিন সাপোর্টে জানান।',
              actionUrl: `${window.location.origin}/login`,
            },
            eventKey: `pwd_changed_${Date.now()}`,
          });
        }
      }

      setSuccess(true);
      showToast({
        type: 'success',
        title: 'পাসওয়ার্ড সফলভাবে আপডেট হয়েছে',
        message: 'এখন নতুন পাসওয়ার্ড দিয়ে লগইন করতে পারেন।',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে';
      showToast({ type: 'error', title: 'ত্রুটি', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="text-xs text-slate-500 font-medium">রিসেট লিংক যাচাই করা হচ্ছে...</div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-2xl border border-rose-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">লিংক অকার্যকর বা মেয়াদোত্তীর্ণ</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {errorMessage || 'পাসওয়ার্ড রিসেট লিংকের মেয়াদ শেষ হয়ে গেছে অথবা লিংকটি অকার্যকর। দয়া করে পুনরায় নতুন লিংকের আবেদন করুন।'}
          </p>
          <div className="pt-2">
            <button
              onClick={() => onNavigate('/forgot-password')}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              নতুন পাসওয়ার্ড রিসেট লিংক পাঠান
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            MukiSoft Assist
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            নতুন পাসওয়ার্ড নির্ধারণ করুন
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            আপনার অ্যাকাউন্টের সুরক্ষার জন্য একটি শক্তিশালী নতুন পাসওয়ার্ড লিখুন।
          </p>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <h3 className="font-semibold text-emerald-900 text-sm">পাসওয়ার্ড পরিবর্তন সফল</h3>
            <p className="text-xs text-emerald-700 leading-relaxed">
              আপনার অ্যাকাউন্টের পাসওয়ার্ড সফলভাবে নতুন করে সেট করা হয়েছে।
            </p>
            <button
              onClick={() => onNavigate('/login')}
              className="mt-3 w-full py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              লগইন পেজে যান
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">নতুন পাসওয়ার্ড</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ন্যূনতম ৬ অক্ষর"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">পাসওয়ার্ড নিশ্চিত করুন</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:bg-white focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2 text-slate-600 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>পাসওয়ার্ড কখনোই ইমেইল বা নোটিফিকেশনে সংরক্ষিত বা প্রদর্শিত হয় না।</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <span>{loading ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড নিশ্চিত করুন'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
