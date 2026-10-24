/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './lib/i18n';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { UserDashboardLayout } from './components/layout/UserDashboardLayout';
import { AdminDashboardLayout } from './components/layout/AdminDashboardLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Public Pages
import { HomePage } from './pages/public/HomePage';
import { ServicesPage } from './pages/public/ServicesPage';
import { CategoryPage } from './pages/public/CategoryPage';
import { ServiceDetailPage } from './pages/public/ServiceDetailPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { AboutPage } from './pages/public/AboutPage';
import { ContactPage } from './pages/public/ContactPage';
import { AuthPages } from './pages/public/AuthPages';
import { LegalPages } from './pages/public/LegalPages';
import { ApplyWorkerPage } from './pages/public/ApplyWorkerPage';
import { BlogListPage } from './pages/BlogListPage';
import { BlogPostDetailPage } from './pages/BlogPostDetailPage';

// Dashboard Pages
import { UserOverview } from './pages/dashboard/UserOverview';
import { UserWallet } from './pages/dashboard/UserWallet';
import { UserOrders } from './pages/dashboard/UserOrders';
import { UserOrderDetail } from './pages/dashboard/UserOrderDetail';
import { UserSupport } from './pages/dashboard/UserSupport';
import { UserProfile } from './pages/dashboard/UserProfile';
import { UserPreferences } from './pages/dashboard/UserPreferences';
import { UserMessagesHub } from './pages/dashboard/UserMessagesHub';
import { WorkerWithdraw } from './pages/dashboard/WorkerWithdraw';

// Admin Pages
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminServices } from './pages/admin/AdminServices';
import { AdminDeposits } from './pages/admin/AdminDeposits';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminClaimTasks } from './pages/admin/AdminClaimTasks';
import { AdminTickets } from './pages/admin/AdminTickets';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminCommunication } from './pages/admin/AdminCommunication';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminLiveChat } from './pages/admin/AdminLiveChat';
import { AdminCommissionWithdrawals } from './pages/admin/AdminCommissionWithdrawals';
import { AdminWithdrawQueue } from './pages/admin/AdminWithdrawQueue';
import { AdminFlaggedChats } from './pages/admin/AdminFlaggedChats';
import { AdminBlogManagement } from './pages/admin/AdminBlogManagement';
import { useAuth } from './context/AuthContext';
import { ResetPassword } from './pages/public/ResetPassword';
import { LiveChatWidget } from './components/chat/LiveChatWidget';

import { api } from './services/api';

function AppRouter() {
  const { role, profile } = useAuth();
  const [currentUrl, setCurrentUrl] = useState<string>(() => {
    return (window.location.pathname || '/') + (window.location.search || '');
  });

  const pathname = currentUrl.split('?')[0] || '/';

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentUrl(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    api.checkAndAutoCompleteOrders();
    const interval = setInterval(() => {
      api.checkAndAutoCompleteOrders();
    }, 10000);

    const handlePopState = () => {
      setCurrentUrl((window.location.pathname || '/') + (window.location.search || ''));
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(interval);
    };
  }, []);

  // Determine layout wrapper based on route prefix
  const isUserDashboard = pathname.startsWith('/dashboard');
  const isAdminDashboard = pathname.startsWith('/admin');

  const renderContent = () => {
    // -------------------------------------------------------------
    // CUSTOMER DASHBOARD ROUTES (Protected by AuthGuard)
    // -------------------------------------------------------------
    if (isUserDashboard) {
      return (
        <ProtectedRoute currentPath={currentUrl} onNavigate={navigate}>
          {pathname.startsWith('/dashboard/orders/') ? (
            (() => {
              const orderId = pathname.replace('/dashboard/orders/', '');
              return (
                <UserDashboardLayout currentPath={pathname} onNavigate={navigate}>
                  <UserOrderDetail orderId={orderId} onNavigate={navigate} />
                </UserDashboardLayout>
              );
            })()
          ) : pathname === '/dashboard/messages' ? (
            <UserDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <UserMessagesHub onNavigate={navigate} />
            </UserDashboardLayout>
          ) : pathname === '/dashboard/wallet' ? (
            <UserDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <UserWallet />
            </UserDashboardLayout>
          ) : pathname === '/dashboard/orders' ? (
            <UserDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <UserOrders onNavigate={navigate} />
            </UserDashboardLayout>
          ) : pathname === '/dashboard/support' ? (
            <UserDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <UserSupport />
            </UserDashboardLayout>
          ) : pathname === '/dashboard/preferences' ? (
            <UserDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <UserPreferences />
            </UserDashboardLayout>
          ) : pathname === '/dashboard/profile' ? (
            <UserDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <UserProfile />
            </UserDashboardLayout>
          ) : (
            <UserDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <UserOverview onNavigate={navigate} />
            </UserDashboardLayout>
          )}
        </ProtectedRoute>
      );
    }

    // -------------------------------------------------------------
    // ADMIN DASHBOARD ROUTES (Protected by RoleGuard - requires Admin/SuperAdmin)
    // -------------------------------------------------------------
    if (isAdminDashboard) {
      return (
        <ProtectedRoute currentPath={currentUrl} onNavigate={navigate} requireAdmin>
          {pathname === '/admin/live-chat' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              {role === 'worker' ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center space-y-3 my-8 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <span className="text-xl font-bold">!</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">অনুমতি নেই</h2>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    লাইভ সাপোর্ট চ্যাট প্যানেলে শুধুমাত্র অ্যাডমিন ও সুপার অ্যাডমিনদের প্রবেশাধিকার রয়েছে।
                  </p>
                  <button
                    onClick={() => navigate('/admin/claim-tasks')}
                    className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    ক্লেইম টাস্কে ফিরুন
                  </button>
                </div>
              ) : (
                <AdminLiveChat />
              )}
            </AdminDashboardLayout>
          ) : pathname === '/admin/services' || pathname === '/admin/categories' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminServices defaultTab={pathname === '/admin/categories' ? 'categories' : 'services'} onNavigate={navigate} />
            </AdminDashboardLayout>
          ) : pathname === '/admin/deposits' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminDeposits />
            </AdminDashboardLayout>
          ) : pathname === '/admin/orders' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminOrders />
            </AdminDashboardLayout>
          ) : pathname === '/admin/claim-tasks' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminClaimTasks onNavigate={navigate} />
            </AdminDashboardLayout>
          ) : pathname === '/admin/tickets' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminTickets />
            </AdminDashboardLayout>
          ) : pathname === '/admin/users' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminUsers />
            </AdminDashboardLayout>
          ) : pathname === '/admin/commission' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminCommissionWithdrawals />
            </AdminDashboardLayout>
          ) : pathname === '/admin/withdraw' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminWithdrawQueue />
            </AdminDashboardLayout>
          ) : pathname === '/admin/my-withdraw' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <WorkerWithdraw />
            </AdminDashboardLayout>
          ) : pathname === '/admin/flagged-chats' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminFlaggedChats />
            </AdminDashboardLayout>
          ) : pathname === '/admin/audit-logs' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminAuditLogs />
            </AdminDashboardLayout>
          ) : pathname === '/admin/communication' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminCommunication />
            </AdminDashboardLayout>
          ) : pathname === '/admin/blogs' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminBlogManagement currentUser={profile || { id: 'admin_01', email: 'admin@mukisoft.com', full_name: 'Super Admin', role: 'super_admin', preferred_language: 'bn', created_at: '', updated_at: '' }} />
            </AdminDashboardLayout>
          ) : pathname === '/admin/settings' ? (
            <AdminDashboardLayout currentPath={pathname} onNavigate={navigate}>
              <AdminSettings />
            </AdminDashboardLayout>
          ) : (
            <AdminDashboardLayout currentPath={role === 'worker' ? '/admin/claim-tasks' : pathname} onNavigate={navigate}>
              {role === 'worker' ? <AdminClaimTasks onNavigate={navigate} /> : <AdminOverview onNavigate={navigate} />}
            </AdminDashboardLayout>
          )}
        </ProtectedRoute>
      );
    }

    // -------------------------------------------------------------
    // PUBLIC ROUTES
    // -------------------------------------------------------------
    let pageContent: React.ReactNode = null;

    if (pathname === '/') {
      pageContent = <HomePage onNavigate={navigate} />;
    } else if (pathname === '/blog') {
      pageContent = <BlogListPage />;
    } else if (pathname.startsWith('/blog/')) {
      pageContent = <BlogPostDetailPage />;
    } else if (pathname === '/apply-worker') {
      pageContent = <ApplyWorkerPage onNavigate={navigate} />;
    } else if (pathname.startsWith('/services')) {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q') || '';
      pageContent = <ServicesPage onNavigate={navigate} initialQuery={query} />;
    } else if (pathname.startsWith('/category/')) {
      const slug = pathname.replace('/category/', '');
      pageContent = <CategoryPage categorySlug={slug} onNavigate={navigate} />;
    } else if (pathname.startsWith('/service/')) {
      const slug = pathname.replace('/service/', '');
      pageContent = <ServiceDetailPage serviceSlug={slug} onNavigate={navigate} />;
    } else if (pathname === '/how-it-works') {
      pageContent = <HowItWorksPage onNavigate={navigate} />;
    } else if (pathname === '/about') {
      pageContent = <AboutPage onNavigate={navigate} />;
    } else if (pathname === '/contact') {
      pageContent = <ContactPage onNavigate={navigate} />;
    } else if (pathname === '/login') {
      pageContent = <AuthPages mode="login" onNavigate={navigate} />;
    } else if (pathname === '/register') {
      pageContent = <AuthPages mode="register" onNavigate={navigate} />;
    } else if (pathname === '/forgot-password') {
      pageContent = <AuthPages mode="forgot-password" onNavigate={navigate} />;
    } else if (pathname === '/reset-password') {
      pageContent = <ResetPassword onNavigate={navigate} />;
    } else if (pathname === '/privacy') {
      pageContent = <LegalPages type="privacy" onNavigate={navigate} />;
    } else if (pathname === '/terms') {
      pageContent = <LegalPages type="terms" onNavigate={navigate} />;
    } else {
      // 404 Not Found Page
      pageContent = (
        <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-4">
          <h1 className="text-3xl font-bold text-slate-900">পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</h1>
          <p className="text-xs text-slate-500">MukiSoft Assist-এ আপনার অনুরোধকৃত ঠিকানাটি বিদ্যমান নেই।</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
          >
            প্রধান পৃষ্ঠায় ফিরুন
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen">
        <Navbar currentPath={pathname} onNavigate={navigate} />
        <main className="flex-1">{pageContent}</main>
        <Footer onNavigate={navigate} />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {renderContent()}
      {!pathname.startsWith('/admin') && !pathname.startsWith('/dashboard/orders/') && (
        <LiveChatWidget onNavigate={navigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppRouter />
        </NotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
