import React, { useState } from 'react';
import { Menu, X, ArrowRight, Layers, HelpCircle, Info, Phone, LayoutDashboard, ShoppingBag, LogIn, UserPlus, BookOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../lib/i18n';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* জোন ১: ব্র্যান্ডের নাম ও লোগো */}
          <button
            onClick={() => handleNavClick('/')}
            className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
            aria-label="হোম পেজে যান"
          >
            <span>MukiSoft Assist</span>
          </button>

          {/* জোন ২: ডেস্কটপ নেভিগেশন লিংকসমূহ (বাংলায়) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-700">
            <button
              onClick={() => handleNavClick('/services')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-indigo-600 ${
                currentPath === '/services' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              {t.navServices}
            </button>
            <button
              onClick={() => handleNavClick('/blog')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-indigo-600 ${
                currentPath.startsWith('/blog') ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              ব্লগ
            </button>
            <button
              onClick={() => handleNavClick('/how-it-works')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-indigo-600 ${
                currentPath === '/how-it-works' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              {t.navHowItWorks}
            </button>
            <button
              onClick={() => handleNavClick('/about')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-indigo-600 ${
                currentPath === '/about' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              {t.navAbout}
            </button>
            <button
              onClick={() => handleNavClick('/contact')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-indigo-600 ${
                currentPath === '/contact' ? 'text-indigo-600 font-semibold' : ''
              }`}
            >
              {t.navContact}
            </button>
            <button
              onClick={() => handleNavClick('/apply-worker')}
              className={`whitespace-nowrap shrink-0 transition-colors text-indigo-600 font-semibold hover:text-indigo-800 ${
                currentPath === '/apply-worker' ? 'text-indigo-700 underline' : ''
              }`}
            >
              ওয়ার্কার হোন
            </button>
          </nav>

          {/* জোন ৩: মূল অ্যাকশন বাটন এবং মোবাইল মেনু টগল */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAuthenticated ? (
              isAdmin ? (
                <button
                  onClick={() => handleNavClick('/admin')}
                  className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  {t.navAdminPanel}
                </button>
              ) : (
                <button
                  onClick={() => handleNavClick('/dashboard')}
                  className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
                >
                  {t.navDashboard}
                </button>
              )
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => handleNavClick('/login')}
                  className="px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
                >
                  {t.navLogin}
                </button>
                <button
                  onClick={() => handleNavClick('/register')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  {t.navRegister}
                </button>
              </div>
            )}

            {/* মোবাইল নেভিগেশন ড্রয়ার বাটন (থ্রি ডট/মেনু আইকন) */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center w-11 h-11 text-slate-800 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
              aria-label="মোবাইল নেভিগেশন ড্রয়ার খুলুন"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* মোবাইল ড্রয়ার নেভিগেশন (OUTSIDE <header> to avoid CSS backdrop-blur stacking context bug) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden flex justify-end">
          {/* ব্যাকড্রপ ওভারলে */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* সাইড ড্রয়ার প্যানেল */}
          <div className="relative z-10 w-80 max-w-[85vw] bg-white h-screen flex flex-col justify-between shadow-2xl p-5 overflow-y-auto">
            <div className="space-y-6">
              {/* ড্রয়ার হেডার */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 block">
                    MukiSoft Assist
                  </span>
                  <span className="font-bold text-slate-900 text-base">মেনু নেভিগেশন</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  aria-label="মেনু বন্ধ করুন"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* মোবাইল মেনু লিংকস */}
              <nav className="flex flex-col space-y-1 text-sm font-medium text-slate-800">
                <button
                  onClick={() => handleNavClick('/')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                    currentPath === '/' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                  <span>{t.navHome}</span>
                </button>
                <button
                  onClick={() => handleNavClick('/services')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                    currentPath === '/services' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>{t.navServices}</span>
                </button>
                <button
                  onClick={() => handleNavClick('/blog')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                    currentPath.startsWith('/blog') ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  <span>ব্লগ</span>
                </button>
                <button
                  onClick={() => handleNavClick('/how-it-works')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                    currentPath === '/how-it-works' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  <span>{t.navHowItWorks}</span>
                </button>
                <button
                  onClick={() => handleNavClick('/about')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                    currentPath === '/about' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <Info className="w-4 h-4 text-indigo-600" />
                  <span>{t.navAbout}</span>
                </button>
                <button
                  onClick={() => handleNavClick('/contact')}
                  className={`text-left px-4 py-3 rounded-xl transition-colors flex items-center gap-3 ${
                    currentPath === '/contact' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'hover:bg-slate-50'
                  }`}
                >
                  <Phone className="w-4 h-4 text-indigo-600" />
                  <span>{t.navContact}</span>
                </button>
              </nav>
            </div>

            {/* পোর্টাল বাটন বা লগইন বাটন */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              {isAuthenticated ? (
                isAdmin ? (
                  <button
                    onClick={() => handleNavClick('/admin')}
                    className="w-full py-3 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl text-center shadow-md transition-colors"
                  >
                    {t.navAdminPanel}
                  </button>
                ) : (
                  <button
                    onClick={() => handleNavClick('/dashboard')}
                    className="w-full py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl text-center shadow-md transition-colors"
                  >
                    {t.navDashboard}
                  </button>
                )
              ) : (
                <>
                  <button
                    onClick={() => handleNavClick('/login')}
                    className="w-full py-3 px-4 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4 text-slate-600" />
                    <span>{t.navLogin}</span>
                  </button>
                  <button
                    onClick={() => handleNavClick('/register')}
                    className="w-full py-3 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl text-center shadow-md transition-colors flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{t.navRegister}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
