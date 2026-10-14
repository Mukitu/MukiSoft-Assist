/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './lib/i18n';
import { NotificationProvider } from './context/NotificationContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { UserDashboardLayout } from './components/layout/UserDashboardLayout';
import { AdminDashboardLayout } from './components/layout/AdminDashboardLayout';

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

// Dashboard Pages
import { UserOverview } from './pages/dashboard/UserOverview';
import { UserWallet } from './pages/dashboard/UserWallet';
import { UserOrders } from './pages/dashboard/UserOrders';
import { UserOrderDetail } from './pages/dashboard/UserOrderDetail';
import { UserSupport } from './pages/dashboard/UserSupport';
import { UserProfile } from './pages/dashboard/UserProfile';

// Admin Pages
import { AdminOverview } from './pages/admin/AdminOverview';
import { AdminServices } from './pages/admin/AdminServices';
import { AdminDeposits } from './pages/admin/AdminDeposits';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminAuditLogs } from './pages/admin/AdminAuditLogs';
import { AdminSettings } from './pages/admin/AdminSettings';

function AppRouter() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Determine layout wrapper based on route prefix
  const isUserDashboard = currentPath.startsWith('/dashboard');
  const isAdminDashboard = currentPath.startsWith('/admin');

  const renderContent = () => {
    // -------------------------------------------------------------
    // CUSTOMER DASHBOARD ROUTES
    // -------------------------------------------------------------
    if (isUserDashboard) {
      if (currentPath.startsWith('/dashboard/orders/')) {
        const orderId = currentPath.replace('/dashboard/orders/', '');
        return (
          <UserDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <UserOrderDetail orderId={orderId} onNavigate={navigate} />
          </UserDashboardLayout>
        );
      }
      if (currentPath === '/dashboard/wallet') {
        return (
          <UserDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <UserWallet />
          </UserDashboardLayout>
        );
      }
      if (currentPath === '/dashboard/orders') {
        return (
          <UserDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <UserOrders onNavigate={navigate} />
          </UserDashboardLayout>
        );
      }
      if (currentPath === '/dashboard/support') {
        return (
          <UserDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <UserSupport />
          </UserDashboardLayout>
        );
      }
      if (currentPath === '/dashboard/profile') {
        return (
          <UserDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <UserProfile />
          </UserDashboardLayout>
        );
      }
      // default /dashboard
      return (
        <UserDashboardLayout currentPath={currentPath} onNavigate={navigate}>
          <UserOverview onNavigate={navigate} />
        </UserDashboardLayout>
      );
    }

    // -------------------------------------------------------------
    // ADMIN DASHBOARD ROUTES
    // -------------------------------------------------------------
    if (isAdminDashboard) {
      if (currentPath === '/admin/services') {
        return (
          <AdminDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <AdminServices />
          </AdminDashboardLayout>
        );
      }
      if (currentPath === '/admin/deposits') {
        return (
          <AdminDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <AdminDeposits />
          </AdminDashboardLayout>
        );
      }
      if (currentPath === '/admin/orders') {
        return (
          <AdminDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <AdminOrders />
          </AdminDashboardLayout>
        );
      }
      if (currentPath === '/admin/users') {
        return (
          <AdminDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <AdminUsers />
          </AdminDashboardLayout>
        );
      }
      if (currentPath === '/admin/audit-logs') {
        return (
          <AdminDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <AdminAuditLogs />
          </AdminDashboardLayout>
        );
      }
      if (currentPath === '/admin/settings') {
        return (
          <AdminDashboardLayout currentPath={currentPath} onNavigate={navigate}>
            <AdminSettings />
          </AdminDashboardLayout>
        );
      }
      // default /admin
      return (
        <AdminDashboardLayout currentPath={currentPath} onNavigate={navigate}>
          <AdminOverview onNavigate={navigate} />
        </AdminDashboardLayout>
      );
    }

    // -------------------------------------------------------------
    // PUBLIC ROUTES
    // -------------------------------------------------------------
    let pageContent: React.ReactNode = null;

    if (currentPath === '/') {
      pageContent = <HomePage onNavigate={navigate} />;
    } else if (currentPath.startsWith('/services')) {
      const urlParams = new URLSearchParams(window.location.search);
      const query = urlParams.get('q') || '';
      pageContent = <ServicesPage onNavigate={navigate} initialQuery={query} />;
    } else if (currentPath.startsWith('/category/')) {
      const slug = currentPath.replace('/category/', '');
      pageContent = <CategoryPage categorySlug={slug} onNavigate={navigate} />;
    } else if (currentPath.startsWith('/service/')) {
      const slug = currentPath.replace('/service/', '');
      pageContent = <ServiceDetailPage serviceSlug={slug} onNavigate={navigate} />;
    } else if (currentPath === '/how-it-works') {
      pageContent = <HowItWorksPage onNavigate={navigate} />;
    } else if (currentPath === '/about') {
      pageContent = <AboutPage onNavigate={navigate} />;
    } else if (currentPath === '/contact') {
      pageContent = <ContactPage onNavigate={navigate} />;
    } else if (currentPath === '/login') {
      pageContent = <AuthPages mode="login" onNavigate={navigate} />;
    } else if (currentPath === '/register') {
      pageContent = <AuthPages mode="register" onNavigate={navigate} />;
    } else if (currentPath === '/forgot-password') {
      pageContent = <AuthPages mode="forgot-password" onNavigate={navigate} />;
    } else if (currentPath === '/privacy') {
      pageContent = <LegalPages type="privacy" onNavigate={navigate} />;
    } else if (currentPath === '/terms') {
      pageContent = <LegalPages type="terms" onNavigate={navigate} />;
    } else {
      // Fallback 404
      pageContent = (
        <div className="max-w-xl mx-auto py-24 px-4 text-center space-y-4">
          <h1 className="text-3xl font-bold text-slate-900">Page Not Found</h1>
          <p className="text-xs text-slate-500">The requested address does not exist on MukiSoft Assist.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg"
          >
            Return to Home
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col min-h-screen">
        <Navbar currentPath={currentPath} onNavigate={navigate} />
        <main className="flex-1">{pageContent}</main>
        <Footer onNavigate={navigate} />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {renderContent()}
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
