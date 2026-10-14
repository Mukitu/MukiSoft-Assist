import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  currentPath,
  onNavigate,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isAdmin, isSuperAdmin, isLoading, role } = useAuth();
  const { showToast } = useNotification();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const isDepositRelated =
        currentPath === '/dashboard/wallet' ||
        currentPath.includes('deposit') ||
        currentPath.includes('wallet');

      if (isDepositRelated) {
        showToast({
          type: 'info',
          title: 'লগইন প্রয়োজন',
          message: 'টাকা জমা করতে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন। অ্যাকাউন্ট না থাকলে নতুন অ্যাকাউন্ট তৈরি করুন।',
        });
        onNavigate(`/login?redirect=${encodeURIComponent(currentPath)}&reason=deposit`);
      } else {
        showToast({
          type: 'info',
          title: 'লগইন প্রয়োজন',
          message: requireAdmin
            ? 'প্রশাসনিক কনসোলে প্রবেশ করতে প্রথমে অ্যাডমিন অ্যাকাউন্টে লগইন করুন।'
            : 'ড্যাশবোর্ডে প্রবেশ করতে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন।',
        });
        onNavigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
      }
      return;
    }

    if (requireAdmin && !isAdmin && !isSuperAdmin && role !== 'admin' && role !== 'super_admin') {
      showToast({
        type: 'error',
        title: 'প্রবেশাধিকার সংরক্ষিত',
        message: 'এই পৃষ্ঠায় প্রবেশের জন্য প্রশাসনিক অনুমতির প্রয়োজন।',
      });
      onNavigate('/dashboard');
    }
  }, [isLoading, isAuthenticated, isAdmin, isSuperAdmin, role, currentPath, requireAdmin, onNavigate, showToast]);

  // Loading state while checking session - no flash
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold text-slate-800 tracking-wide">
            MukiSoft Assist
          </p>
          <p className="text-xs text-slate-500">
            অ্যাকাউন্ট সেশন ও নিরাপত্তা যাচাই করা হচ্ছে...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    const isDepositRelated =
      currentPath === '/dashboard/wallet' ||
      currentPath.includes('deposit') ||
      currentPath.includes('wallet');

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-base font-bold text-slate-900">
            {isDepositRelated ? 'টাকা জমা করতে লগইন করুন' : 'নিরাপদ অ্যাকাউন্ট যাচাইকরণ'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {isDepositRelated
              ? 'টাকা জমা করতে প্রথমে আপনার অ্যাকাউন্টে লগইন করুন। অ্যাকাউন্ট না থাকলে নতুন অ্যাকাউন্ট তৈরি করুন।'
              : 'এই পৃষ্ঠায় প্রবেশ করার জন্য আপনার অ্যাকাউন্টে লগইন থাকা আবশ্যক।'}
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() =>
              onNavigate(
                `/login?redirect=${encodeURIComponent(currentPath)}${
                  isDepositRelated ? '&reason=deposit' : ''
                }`
              )
            }
            className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            লগইন পেজে যান
          </button>
          <button
            onClick={() =>
              onNavigate(
                `/register?redirect=${encodeURIComponent(currentPath)}${
                  isDepositRelated ? '&reason=deposit' : ''
                }`
              )
            }
            className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            নতুন অ্যাকাউন্ট খুলুন
          </button>
        </div>
      </div>
    );
  }

  // Admin required but user lacks admin privileges
  if (requireAdmin && !isAdmin && !isSuperAdmin && role !== 'admin' && role !== 'super_admin') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 space-y-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-base font-bold text-slate-900">প্রবেশাধিকার সংরক্ষিত</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            এই অংশে প্রবেশের জন্য প্রশাসনিক (অ্যাডমিন বা সুপার অ্যাডমিন) অনুমতির প্রয়োজন।
          </p>
        </div>
        <button
          onClick={() => onNavigate('/dashboard')}
          className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          গ্রাহক ড্যাশবোর্ডে ফিরুন
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
