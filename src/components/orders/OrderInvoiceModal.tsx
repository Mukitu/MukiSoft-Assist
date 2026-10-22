import React, { useRef } from 'react';
import { Printer, Download, X, CheckCircle2, Building2, User, Calendar, FileText } from 'lucide-react';
import { Order, CompanyProfitRecord } from '../../types/database';
import { toBengaliCurrency, toBengaliDate, toBengaliDigits } from '../../lib/i18n';

interface OrderInvoiceModalProps {
  order: Order;
  profitRecord?: CompanyProfitRecord | null;
  onClose: () => void;
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({
  order,
  profitRecord,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200">
        {/* টপ মডাল বার */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span>ডিজিটাল সার্ভিস ইনভয়েস ও পে-রোল স্লিপ</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট / PDF সেভ</span>
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* প্রিন্টেবল মেমো এরিয়া */}
        <div ref={printRef} className="space-y-6 text-slate-800 font-sans p-2">
          {/* ইনভয়েস হেডার */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 block">
                অফিসিয়াল ইনভয়েস
              </span>
              <h2 className="text-xl font-bold text-slate-900">MukiSoft Assist</h2>
              <p className="text-xs text-slate-500 mt-1">মুকিসফট টেকনোলজি ডিজিটাল প্ল্যাটফর্ম</p>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded">
                পরিশোধিত (PAID)
              </span>
              <div className="text-xs font-mono text-slate-600">মেমো #: INV-{order.order_number}</div>
              <div className="text-xs text-slate-500">{toBengaliDate(order.created_at)}</div>
            </div>
          </div>

          {/* গ্রাহক ও অর্ডার তথ্য */}
          <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 block font-medium">গ্রাহকের তথ্য:</span>
              <span className="font-bold text-slate-900">{order.customer_name || order.customer?.full_name || 'গ্রাহক'}</span>
              <span className="text-slate-600 block font-mono mt-0.5">{order.customer_email || order.customer?.email || 'গ্রাহক ইমেইল'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">দায়িত্বপ্রাপ্ত স্পেশালিস্ট:</span>
              <span className="font-bold text-slate-900">{order.assigned_admin_name || 'টিম স্পেশালিস্ট'}</span>
              <span className="text-slate-600 block font-mono mt-0.5">{order.assigned_admin_email || 'স্পেশালিস্ট অ্যাসাইনড'}</span>
            </div>
          </div>

          {/* বিলে কাজের বিবরণী */}
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 bg-slate-100/80">
                <th className="py-2.5 px-3 font-semibold">সার্ভিসের শিরোনাম</th>
                <th className="py-2.5 px-3 font-semibold text-right">মূল্য</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-3 px-3">
                  <div className="font-bold text-slate-900">{order.service_title || order.service?.title_bn || order.service?.title || 'সার্ভিস কাজ'}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">অর্ডার নম্বর: #{order.order_number}</div>
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                  {toBengaliCurrency(order.amount)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* পারফরম্যান্স পে-রোল ব্রেকডাউন (যদি থাকে) */}
          {profitRecord && (
            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 space-y-2 text-xs text-indigo-950">
              <span className="font-bold text-indigo-900 block border-b border-indigo-200/60 pb-1.5">
                পারফরম্যান্স কমিশন বন্টন বিবরণী (Payroll Breakdown)
              </span>
              <div className="flex justify-between font-mono">
                <span>স্পেশালিস্ট পারিশ্রমিক ({profitRecord.assigned_role}):</span>
                <span className="font-bold text-slate-900">{toBengaliCurrency(profitRecord.worker_or_admin_payout)}</span>
              </div>
              <div className="flex justify-between font-mono text-emerald-800">
                <span>প্ল্যাটফর্ম নিট প্রফিট:</span>
                <span className="font-bold">{toBengaliCurrency(profitRecord.company_profit_amount)}</span>
              </div>
            </div>
          )}

          {/* মেমো ফুটার */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <div>
              <span>কম্পিউটার জেনারেটেড ডিজিটাল ইনভয়েস।</span>
            </div>
            <div className="font-bold text-slate-800">
              MukiSoft Assist Support
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
