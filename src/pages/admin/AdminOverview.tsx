import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckSquare,
  ShoppingBag,
  TrendingUp,
  RotateCcw,
  CheckCircle2,
  DollarSign,
  BarChart3,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toBengaliCurrency, toBengaliDigits, toBengaliDate } from '../../lib/i18n';
import { api } from '../../services/api';
import { DepositRequest, Order, Profile, SupportTicket } from '../../types/database';
import { StatusBadge } from '../../components/common/StatusBadge';

interface AdminOverviewProps {
  onNavigate: (path: string) => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ onNavigate }) => {
  const { user, isSuperAdmin, role } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [deps, ords, usrs, tcks] = await Promise.all([
        api.getAllDepositRequests(),
        api.getAllOrders(),
        api.getUsers(),
        api.getTickets(),
      ]);
      setDeposits(deps);
      setOrders(ords);
      setUsers(usrs);
      setTickets(tcks);
      setLoading(false);
    }
    load();
  }, []);

  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'waiting_for_user');
  const pendingDeposits = deposits.filter((d) => d.status === 'pending');
  const activeOrders = orders.filter((o) =>
    ['pending', 'accepted', 'in_progress', 'needs_information', 'review', 'in_review', 'revision_requested'].includes(o.status)
  );
  const completedOrders = orders.filter((o) => o.status === 'completed' || o.status === 'delivered');
  const refundedOrders = orders.filter((o) => o.status === 'refunded');

  // আর্থিক মেট্রিকসমূহ (Prompt 4 Section 10)
  // গ্রস বিক্রয় (সব সফল ও চলমান অর্ডারের মোট মূল্য)
  const grossOrderSales = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.amount, 0);

  // অনুমোদিত রিফান্ডের পরিমাণ
  const totalRefundAmount = orders
    .filter((o) => o.status === 'refunded')
    .reduce((sum, o) => sum + (o.refund_amount || o.amount), 0);

  // নিট রেভিনিউ = গ্রস সেলস - রিফান্ড
  const netRevenue = Math.max(0, grossOrderSales - totalRefundAmount);

  // সেবাভিত্তিক বিক্রয় হিসাব (Top services breakdown)
  const serviceBreakdown = orders.reduce<Record<string, { title: string; count: number; total: number }>>((acc, ord) => {
    const title = ord.service?.title_bn || ord.service?.title || 'অন্যান্য সেবা';
    if (!acc[title]) {
      acc[title] = { title, count: 0, total: 0 };
    }
    acc[title].count += 1;
    if (ord.status !== 'cancelled' && ord.status !== 'refunded') {
      acc[title].total += ord.amount;
    }
    return acc;
  }, {});

  const topServices = Object.values(serviceBreakdown).sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* শিরোনাম */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 block">
            অপারেশনস ও আর্থিক কন্ট্রোল সেন্টার
          </span>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">প্রশাসনিক ড্যাশবোর্ড ও আর্থিক প্রতিবেদন</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            বাস্তব ডাটাবেজ রেকর্ডভিত্তিক অর্ডার পাইপলাইন, প্রকৃত বিক্রয়, রিফান্ড ও নিট আয়ের আর্থিক হিসাব।
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {openTickets.length > 0 && (
            <button
              onClick={() => onNavigate('/admin/tickets')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-2 shadow-xs"
            >
              <HelpCircle className="w-4 h-4 shrink-0" />
              <span>{toBengaliDigits(openTickets.length)}টি টিকিট উন্মুক্ত</span>
            </button>
          )}
          {pendingDeposits.length > 0 && (
            <button
              onClick={() => onNavigate('/admin/deposits')}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{toBengaliDigits(pendingDeposits.length)}টি জমার অনুরোধ অপেক্ষমাণ</span>
            </button>
          )}
        </div>
      </div>

      {/* আর্থিক ও অর্ডার সারাংশ কার্ডসমূহ (Prompt 4 Section 10) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* মোট অর্ডার */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">মোট অর্ডার</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliDigits(orders.length)}
          </div>
          <div className="text-[11px] text-slate-500">
            চলমান: {toBengaliDigits(activeOrders.length)}টি | সমাপ্ত: {toBengaliDigits(completedOrders.length)}টি
          </div>
        </div>

        {/* গ্রস অর্ডার ভলিউম */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">গ্রস সার্ভিস বিক্রয় (Gross Sales)</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {toBengaliCurrency(grossOrderSales)}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium">অর্ডারভিত্তিক মোট ডেবিট</div>
        </div>

        {/* অনুমোদিত রিফান্ড */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">অনুমোদিত রিফান্ড (Refunds)</span>
          <div className="text-2xl font-bold font-mono text-rose-600">
            {toBengaliCurrency(totalRefundAmount)}
          </div>
          <div className="text-[11px] text-slate-500">
            {toBengaliDigits(refundedOrders.length)}টি রিফান্ডকৃত অর্ডার
          </div>
        </div>

        {/* নিট রেভিনিউ */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-medium text-slate-500 block">নিট আয় (Net Revenue)</span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {toBengaliCurrency(netRevenue)}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>প্রকৃত বিক্রয় রাজস্ব</span>
          </div>
        </div>
      </div>

      {/* জরুরি অ্যালার্ট স্ট্রিপ */}
      {pendingDeposits.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <CheckSquare className="w-6 h-6 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                জরুরি নোটিশ: গ্রাহকের টাকা জমা যাচাইকরণ
              </h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                বর্তমানে {toBengaliDigits(pendingDeposits.length)}টি জমার অনুরোধ ব্যাংক বা মোবাইল ব্যাংকিং স্টেটমেন্ট মেলানোর অপেক্ষায় রয়েছে।
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/admin/deposits')}
            className="px-4 py-2 text-xs font-semibold text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            অনুরোধগুলো যাচাই করুন
          </button>
        </div>
      )}

      {/* সেবাভিত্তিক বিক্রয় প্রতিবেদন (Service Sales Breakdown) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-sm">সেবাভিত্তিক বিক্রয় ও অর্ডারের হার</h3>
          </div>
          <span className="text-xs text-slate-500">শীর্ষ বিক্রিত ডিজিটাল সেবা</span>
        </div>

        {topServices.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">এখনও কোনো বিক্রয় ডেটা নেই।</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topServices.map((svc) => (
              <div key={svc.title} className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="font-semibold text-xs text-slate-900 truncate" title={svc.title}>
                  {svc.title}
                </div>
                <div className="flex items-baseline justify-between pt-1">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {toBengaliCurrency(svc.total)}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {toBengaliDigits(svc.count)}টি অর্ডার
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* সাম্প্রতিক সকল অর্ডার টেবিল */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">সাম্প্রতিক সকল অর্ডার</h3>
            <p className="text-xs text-slate-500 mt-0.5">সকল গ্রাহকের চলমান প্রজেক্ট ও ডেলিভারি স্ট্যাটাস</p>
          </div>
          <button
            onClick={() => onNavigate('/admin/orders')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>সকল অর্ডার পরিচালনা করুন</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">বর্তমানে কোনো অর্ডার রেকর্ড নেই।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">অর্ডার নম্বর</th>
                  <th className="py-3 px-4 font-medium">গ্রাহক</th>
                  <th className="py-3 px-4 font-medium">সেবা</th>
                  <th className="py-3 px-4 font-medium text-right">মূল্য</th>
                  <th className="py-3 px-4 font-medium">অবস্থা</th>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {orders.slice(0, 8).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{order.order_number}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 font-mono text-[11px] max-w-[140px] truncate">
                      {order.customer?.email || order.user_id}
                    </td>
                    <td className="py-3.5 px-4 text-slate-900 font-semibold max-w-[180px] truncate">
                      {order.service?.title_bn || order.service?.title || 'সেবা'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      {toBengaliCurrency(order.amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(order.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigate('/admin/orders')}
                        className="text-xs text-indigo-600 hover:underline font-semibold"
                      >
                        ব্যবস্থাপনা
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* সাম্প্রতিক সহায়তা টিকিট (Prompt 5) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">সাম্প্রতিক সহায়তা টিকিট ও গ্রাহক প্রশ্ন</h3>
            <p className="text-xs text-slate-500 mt-0.5">গ্রাহকদের সহায়তার জন্য নতুন টিকিট ও অপেক্ষমাণ কথোপকথন</p>
          </div>
          <button
            onClick={() => onNavigate('/admin/tickets')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>সহায়তা ডেস্কে যান</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">বর্তমানে কোনো সহায়তা টিকিট জমা নেই।</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-medium">টিকিট নম্বর</th>
                  <th className="py-3 px-4 font-medium">গ্রাহক</th>
                  <th className="py-3 px-4 font-medium">বিষয় ও বিভাগ</th>
                  <th className="py-3 px-4 font-medium">অগ্রাধিকার</th>
                  <th className="py-3 px-4 font-medium">অবস্থা</th>
                  <th className="py-3 px-4 font-medium">তারিখ</th>
                  <th className="py-3 px-4 font-medium text-right">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {tickets.slice(0, 6).map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {ticket.ticket_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 text-[11px] max-w-[140px] truncate">
                      {ticket.customer?.full_name || ticket.customer?.email || 'গ্রাহক'}
                    </td>
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <div className="font-semibold text-slate-900 truncate">{ticket.subject}</div>
                      <div className="text-[11px] text-slate-500">{ticket.category}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          ticket.priority === 'urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : ticket.priority === 'high'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ticket.priority === 'urgent'
                          ? 'অতি জরুরি'
                          : ticket.priority === 'high'
                          ? 'জরুরি'
                          : ticket.priority === 'medium'
                          ? 'মাঝারি'
                          : 'সাধারণ'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {toBengaliDate(ticket.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onNavigate('/admin/tickets')}
                        className="text-xs text-indigo-600 hover:underline font-semibold"
                      >
                        উত্তর দিন
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
