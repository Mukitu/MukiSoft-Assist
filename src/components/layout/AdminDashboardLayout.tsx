import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  CheckSquare,
  ShoppingBag,
  Users,
  ShieldAlert,
  Sliders,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Menu,
  X,
  Lock,
  HelpCircle,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

interface AdminDashboardLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const AdminDashboardLayout: React.FC<AdminDashboardLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
}) => {
  const { user, profile, role, isAdmin, isSuperAdmin, logout, switchDemoRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // অননুমোদিত গ্রাহক প্রবেশ নিষেধ গেট
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">প্রশাসনিক অনুমতি প্রয়োজন</h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              আপনি বর্তমানে সাধারণ গ্রাহক হিসেবে লগইন করে আছেন (<code className="font-mono text-slate-800">{user?.email}</code>)।
              এই কনসোলে প্রবেশের জন্য <code className="font-mono text-slate-800">admin</code> বা <code className="font-mono text-slate-800">super_admin</code> অনুমতির প্রয়োজন।
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={() => switchDemoRole('super_admin')}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              সুপার অ্যাডমিন হিসেবে দেখুন (মূল্যায়ন টেস্ট মোড)
            </button>
            <button
              onClick={() => onNavigate('/')}
              className="w-full py-2.5 px-4 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
            >
              মূল ওয়েবসাইটে ফিরে যান
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'প্রশাসনিক ড্যাশবোর্ড', path: '/admin', icon: LayoutDashboard },
    { label: 'সেবা ও ক্যাটালগ', path: '/admin/services', icon: Layers },
    { label: 'টাকা জমার অনুরোধ যাচাই', path: '/admin/deposits', icon: CheckSquare },
    { label: 'অর্ডার ও ফাইল ডেলিভারি', path: '/admin/orders', icon: ShoppingBag },
    { label: 'সহায়তা ডেস্ক ও টিকিট', path: '/admin/tickets', icon: HelpCircle },
    { label: 'ব্যবহারকারী ও ভূমিকা', path: '/admin/users', icon: Users },
    { label: 'নিরাপত্তা অডিট লগ', path: '/admin/audit-logs', icon: ShieldAlert, superAdminOnly: true },
    { label: 'যোগাযোগ ও ইমেইল সেটিংস', path: '/admin/communication', icon: Mail, superAdminOnly: true },
    { label: 'প্ল্যাটফর্ম সেটিংস', path: '/admin/settings', icon: Sliders, superAdminOnly: true },
  ];

  const getBreadcrumbs = () => {
    if (currentPath === '/admin') return ['প্রশাসনিক কনসোল', 'সারসংক্ষেপ'];
    if (currentPath === '/admin/services') return ['প্রশাসনিক কনসোল', 'সেবা ও ক্যাটালগ'];
    if (currentPath === '/admin/deposits') return ['প্রশাসনিক কনসোল', 'টাকা জমার অনুরোধ যাচাই'];
    if (currentPath === '/admin/orders') return ['প্রশাসনিক কনসোল', 'অর্ডার ও ডেলিভারি'];
    if (currentPath === '/admin/tickets') return ['প্রশাসনিক কনসোল', 'সহায়তা ডেস্ক ও টিকিট'];
    if (currentPath === '/admin/users') return ['প্রশাসনিক কনসোল', 'ব্যবহারকারী ও ভূমিকা'];
    if (currentPath === '/admin/audit-logs') return ['প্রশাসনিক কনসোল', 'অডিট লগ'];
    if (currentPath === '/admin/communication') return ['প্রশাসনিক কনসোল', 'যোগাযোগ ও ইমেইল কনফিগারেশন'];
    if (currentPath === '/admin/settings') return ['প্রশাসনিক কনসোল', 'প্ল্যাটফর্ম সেটিংস'];
    return ['প্রশাসনিক কনসোল'];
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* মোবাইল টপ বার */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <span className="text-[10px] text-indigo-400 font-mono uppercase block">প্রশাসন</span>
          <span className="font-bold text-sm">MukiSoft Assist</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-11 h-11 flex items-center justify-center text-slate-300 hover:text-white rounded-lg"
          aria-label={mobileMenuOpen ? 'অ্যাডমিন মেনু বন্ধ করুন' : 'অ্যাডমিন মেনু খুলুন'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* সাইডবার নেভিগেশন */}
      <aside
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-64 bg-slate-900 text-slate-300 shrink-0 md:min-h-screen flex flex-col justify-between border-r border-slate-800`}
      >
        <div>
          {/* ব্র্যান্ড হেডার */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 block">
                প্রশাসনিক ব্যবস্থা
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight">MukiSoft Assist</h2>
            </div>
            <button
              onClick={() => onNavigate('/')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              title="মূল ওয়েবসাইটে যান"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>মূল সাইট</span>
            </button>
          </div>

          {/* বর্তমান ভূমিকা নির্দেশক */}
          <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">বর্তমান ভূমিকা</span>
              <StatusBadge status={role} />
            </div>
            <div className="text-xs text-slate-300 truncate font-mono">{user?.email}</div>
          </div>

          {/* মেনু আইটেমসমূহ */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              const isRestricted = item.superAdminOnly && !isSuperAdmin;

              if (isRestricted) {
                return (
                  <div
                    key={item.path}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg text-slate-600 cursor-not-allowed select-none"
                    title="শুধুমাত্র সুপার অ্যাডমিনের জন্য অনুমোদিত"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <Lock className="w-3 h-3 text-slate-600" />
                  </div>
                );
              }

              return (
                <button
                  key={item.path}
                  onClick={() => {
                    onNavigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.superAdminOnly && (
                    <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-mono">সুপার</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* সাইডবার ফুটার */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="truncate pr-2">
            <div className="text-white font-medium truncate">{profile?.full_name || 'অ্যাডমিনিস্ট্রেটর'}</div>
            <div className="text-[11px] text-slate-500">মুকিসফট টেকনোলজি</div>
          </div>
          <button
            onClick={() => {
              logout();
              onNavigate('/login');
            }}
            className="p-2 text-slate-400 hover:text-rose-400 rounded-lg transition-colors"
            title="লগআউট করুন"
            aria-label="লগআউট"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* মূল কনটেন্ট এরিয়া */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* টপ হেডার */}
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

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-xs text-slate-500 hidden sm:inline">অপারেটিং সিস্টেম</span>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              MukiSoft Assist v1.0
            </span>
          </div>
        </header>

        {/* কনটেন্ট ভিউপোর্ট */}
        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto flex-1">{children}</main>
      </div>
    </div>
  );
};
