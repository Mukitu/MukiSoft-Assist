import React from 'react';
import { statusLabels } from '../../lib/i18n';

interface StatusBadgeProps {
  status: string;
  type?: 'order' | 'deposit' | 'ticket' | 'role';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const label = statusLabels[status] || status;

  const getStyle = () => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'resolved':
        return 'text-emerald-800 bg-emerald-50 border border-emerald-300';
      case 'accepted':
      case 'delivered':
      case 'in_review':
      case 'review':
        return 'text-indigo-800 bg-indigo-50 border border-indigo-300';
      case 'waiting_for_user':
        return 'text-sky-800 bg-sky-50 border border-sky-300';
      case 'in_progress':
      case 'pending':
      case 'open':
      case 'pending_requirements':
        return 'text-amber-800 bg-amber-50 border border-amber-300';
      case 'needs_information':
      case 'revision_requested':
        return 'text-orange-800 bg-orange-50 border border-orange-300';
      case 'failed':
      case 'rejected':
      case 'cancelled':
      case 'closed':
        return 'text-rose-800 bg-rose-50 border border-rose-300';
      case 'refunded':
        return 'text-cyan-800 bg-cyan-50 border border-cyan-300';
      case 'super_admin':
        return 'text-purple-800 bg-purple-50 border border-purple-300';
      case 'admin':
        return 'text-blue-800 bg-blue-50 border border-blue-300';
      case 'worker':
        return 'text-teal-800 bg-teal-50 border border-teal-300';
      default:
        return 'text-slate-700 bg-slate-100 border border-slate-300';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded whitespace-nowrap ${getStyle()}`}
    >
      {label}
    </span>
  );
};
