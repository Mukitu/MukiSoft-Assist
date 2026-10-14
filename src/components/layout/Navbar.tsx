import React, { useState } from 'react';
import { Menu, X, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../lib/i18n';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (path: string) => {
    onNavigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200">
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

          {/* মোবাইল মেনু বাটন (মিনিমাম ৪৪px টাচ টার্গেট) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-11 h-11 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label={mobileMenuOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* মোবাইল ড্রয়ার নেভিগেশন */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-3 shadow-lg">
          <nav className="flex flex-col space-y-1 text-sm font-medium text-slate-700">
            <button
              onClick={() => handleNavClick('/')}
              className={`text-left px-3 py-2.5 rounded-lg transition-colors ${
                currentPath === '/' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              {t.navHome}
            </button>
            <button
              onClick={() => handleNavClick('/services')}
              className={`text-left px-3 py-2.5 rounded-lg transition-colors ${
                currentPath === '/services' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              {t.navServices}
            </button>
            <button
              onClick={() => handleNavClick('/how-it-works')}
              className={`text-left px-3 py-2.5 rounded-lg transition-colors ${
                currentPath === '/how-it-works' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              {t.navHowItWorks}
            </button>
            <button
              onClick={() => handleNavClick('/about')}
              className={`text-left px-3 py-2.5 rounded-lg transition-colors ${
                currentPath === '/about' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              {t.navAbout}
            </button>
            <button
              onClick={() => handleNavClick('/contact')}
              className={`text-left px-3 py-2.5 rounded-lg transition-colors ${
                currentPath === '/contact' ? 'bg-indigo-50 text-indigo-600 font-semibold' : 'hover:bg-slate-50'
              }`}
            >
              {t.navContact}
            </button>
          </nav>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              isAdmin ? (
                <button
                  onClick={() => handleNavClick('/admin')}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg text-center"
                >
                  {t.navAdminPanel}
                </button>
              ) : (
                <button
                  onClick={() => handleNavClick('/dashboard')}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 rounded-lg text-center"
                >
                  {t.navDashboard}
                </button>
              )
            ) : (
              <>
                <button
                  onClick={() => handleNavClick('/login')}
                  className="w-full py-2.5 px-4 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg text-center"
                >
                  {t.navLogin}
                </button>
                <button
                  onClick={() => handleNavClick('/register')}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg text-center"
                >
                  {t.navRegister}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
