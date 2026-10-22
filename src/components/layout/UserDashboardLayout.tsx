import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Wallet as WalletIcon,
  ShoppingBag,
  HelpCircle,
  User as UserIcon,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency } from '../../lib/i18n';
import { api } from '../../services/api';
import { Wallet } from '../../types/database';

interface UserDashboardLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const UserDashboardLayout: React.FC<UserDashboardLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
}) => {
  const { user, profile, logout } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api.getWallet(user.id).then(setWallet);
    }
  }, [user, currentPath]);

  const navItems = [
    { label: 'ড্যাশবোর্ড ওভারভিউ', path: '/dashboard', icon: LayoutDashboard },
    { label: 'ওয়ালেট ও টাকা জমা', path: '/dashboard/wallet', icon: WalletIcon },
    { label: 'সহায়তা টিকিট ডেস্ক', path: '/dashboard/support', icon: HelpCircle },
    { label: 'আমার অর্ডার ও বার্তা চ্যাট', path: '/dashboard/orders', icon: ShoppingBag },
    { label: 'বিজ্ঞপ্তি পছন্দসমূহ', path: '/dashboard/preferences', icon: Bell },
    { label: 'প্রোফাইল সেটিংস', path: '/dashboard/profile', icon: UserIcon },
  ];

  const getBreadcrumbs = () => {
    if (currentPath === '/dashboard') return ['ড্যাশবোর্ড', 'সারসংক্ষেপ'];
    if (currentPath === '/dashboard/wallet') return ['ড্যাশবোর্ড', 'ওয়ালেট ও টাকা জমা'];
    if (currentPath.startsWith('/dashboard/orders/')) return ['ড্যাশবোর্ড', 'আমার অর্ডার', 'অর্ডারের বিবরণ'];
    if (currentPath === '/dashboard/orders') return ['ড্যাশবোর্ড', 'আমার অর্ডারসমূহ'];
    if (currentPath === '/dashboard/support') return ['ড্যাশবোর্ড', 'সহায়তা ডেস্ক'];
    if (currentPath === '/dashboard/preferences') return ['ড্যাশবোর্ড', 'বিজ্ঞপ্তি ও ইমেইল পছন্দসমূহ'];
    if (currentPath === '/dashboard/profile') return ['ড্যাশবোর্ড', 'প্রোফাইল ও নিরাপত্তা'];
    return ['ড্যাশবোর্ড'];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* মোবাইল টপ বার */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <button onClick={() => onNavigate('/')} className="font-bold text-slate-900 text-sm">
          MukiSoft Assist
        </button>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-11 h-11 flex items-center justify-center text-slate-700 hover:text-slate-900 rounded-lg"
          aria-label={mobileMenuOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* মোবাইল ড্রয়ার নেভিগেশন (পপ-আপ ব্যাকড্রপ ওভারলে) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-white h-screen flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div>
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                    গ্রাহক পোর্টাল
                  </span>
                  <h2 className="text-xs font-bold text-slate-900 truncate">
                    {profile?.full_name || user?.email || 'গ্রাহক'}
                  </h2>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* সাইডবারে ওয়ালেট ব্যালেন্স কার্ড */}
              <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                  <span>ওয়ালেট ব্যালেন্স</span>
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {toBengaliCurrency(wallet?.balance ?? 0)}
                </div>
                <button
                  onClick={() => {
                    onNavigate('/dashboard/wallet');
                    setMobileMenuOpen(false);
                  }}
                  className="mt-2.5 w-full py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  + টাকা জমা দিন
                </button>
              </div>

              <nav className="p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPath === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        onNavigate(item.path);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl transition-colors ${
                        isActive
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 text-indigo-600" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="truncate pr-2">
                <div className="font-medium text-slate-800 truncate">{user?.email}</div>
                <div className="text-[11px] text-slate-500">গ্রাহক অ্যাকাউন্ট</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  onNavigate('/login');
                }}
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                title="লগআউট"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ডেস্কটপ সাইডবার নেভিগেশন */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 shrink-0 min-h-screen flex-col justify-between">
        <div>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                গ্রাহক পোর্টাল
              </span>
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {profile?.full_name || user?.email || 'গ্রাহক'}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('/')}
              className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
              title="মূল ওয়েবসাইটে ফিরে যান"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>হোম</span>
            </button>
          </div>

          <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>ওয়ালেট ব্যালেন্স</span>
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900">
              {toBengaliCurrency(wallet?.balance ?? 0)}
            </div>
            <button
              onClick={() => onNavigate('/dashboard/wallet')}
              className="mt-2.5 w-full py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              + টাকা জমা দিন
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="truncate pr-2">
            <div className="font-medium text-slate-800 truncate">{user?.email}</div>
            <div className="text-[11px] text-slate-500">গ্রাহক অ্যাকাউন্ট</div>
          </div>
          <button
            onClick={() => {
              logout();
              onNavigate('/login');
            }}
            className="p-2 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
            title="লগআউট"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* মূল কনটেন্ট এরিয়া */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* টপ বার ও ব্রেডক্রাম্বস */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                <span className={idx === breadcrumbs.length - 1 ? 'font-semibold text-slate-900' : ''}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('/services')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              সকল সেবা দেখুন
            </button>
          </div>
        </header>

        {/* কনটেন্ট ভিউপোর্ট */}
        <main className="p-4 sm:p-6 max-w-6xl w-full mx-auto flex-1">{children}</main>
      </div>
    </div>
  );
};
