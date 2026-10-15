import React, { useState } from 'react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { UserProfile, RechargeRequest, WithdrawalRequest, SupportTicket, VipProduct } from '../types.ts';
import {
  Shield,
  Users,
  CreditCard,
  ArrowDownRight,
  Gem,
  Settings,
  HelpCircle,
  FileText,
  Building2,
  Check,
  X,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  Edit3,
  Award,
  Crown,
  Lock,
  RefreshCw,
  Clock,
  History,
  MessageSquare,
} from 'lucide-react';

interface AdminDashboardViewProps {
  onBackToCustomer: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onBackToCustomer }) => {
  const {
    currentUser,
    allUsers,
    rechargeRequests,
    withdrawalRequests,
    userOwnedProducts,
    products,
    paymentConfig,
    paymentConfigHistory,
    teamRewards,
    managerReward,
    supportTickets,
    auditLogs,
  } = useStore();

  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'users'
    | 'recharges'
    | 'withdrawals'
    | 'products'
    | 'payment'
    | 'team_rewards'
    | 'manager_reward'
    | 'support'
    | 'audit'
  >('overview');

  // Search & Filter state
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [selectedUserForAction, setSelectedUserForAction] = useState<UserProfile | null>(null);
  const [userActionType, setUserActionType] = useState<'note' | 'warn' | 'suspend' | null>(null);
  const [actionReason, setActionReason] = useState('');

  // Recharge & Withdrawal Modals
  const [rejectingRechargeId, setRejectingRechargeId] = useState<string | null>(null);
  const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState<string | null>(null);
  const [decisionReason, setDecisionReason] = useState('');

  // Payment Account Edit Modal
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [editProvider, setEditProvider] = useState(paymentConfig.provider);
  const [editAccountHolder, setEditAccountHolder] = useState(paymentConfig.accountHolder);
  const [editAccountNumber, setEditAccountNumber] = useState(paymentConfig.accountNumber);
  const [editInstructions, setEditInstructions] = useState(paymentConfig.instructions);
  const [paymentFeedback, setPaymentFeedback] = useState<string | null>(null);

  // Support Reply Modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [replyTicketStatus, setReplyTicketStatus] = useState<SupportTicket['status']>('Resolved');

  // Manager reward state edit
  const [managerAmount, setManagerAmount] = useState(managerReward.amount.toString());
  const [managerCriteria, setManagerCriteria] = useState(managerReward.criteria);
  const [managerStatus, setManagerStatus] = useState(managerReward.status);

  // Calculations for Overview KPIs
  const totalRegistered = allUsers.filter((u) => u.role !== 'admin').length;
  const activeQualifying = allUsers.filter(
    (u) => u.role !== 'admin' && userOwnedProducts.some((p) => p.userId === u.id && p.status === 'active')
  ).length;
  const pendingRecharges = rechargeRequests.filter((r) => r.status === 'pending_verification').length;
  const pendingWithdrawals = withdrawalRequests.filter((w) => w.status === 'pending_verification').length;
  const openTickets = supportTickets.filter((t) => t.status === 'Open' || t.status === 'In Progress').length;

  // Filtered Users
  const filteredUsers = allUsers.filter((u) => {
    if (u.role === 'admin') return false;
    const matchesQuery =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch) ||
      u.id.toLowerCase().includes(userSearch.toLowerCase());
    const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
    return matchesQuery && matchesStatus;
  });

  // Action handlers
  const handleUserActionSubmit = () => {
    if (!selectedUserForAction) return;

    if (userActionType === 'note') {
      store.adminAddUserNote(selectedUserForAction.id, actionReason, 'ADM-000001');
    } else if (userActionType === 'warn') {
      store.adminIssueWarning(selectedUserForAction.id, actionReason, 'ADM-000001');
    } else if (userActionType === 'suspend') {
      const newStatus = selectedUserForAction.status === 'suspended' ? 'active' : 'suspended';
      store.adminUpdateUserStatus(selectedUserForAction.id, newStatus, actionReason, 'ADM-000001');
    }

    setSelectedUserForAction(null);
    setUserActionType(null);
    setActionReason('');
  };

  const handleApproveRecharge = (reqId: string) => {
    store.adminApproveRecharge(reqId, 'ADM-000001');
  };

  const handleRejectRecharge = (reqId: string) => {
    if (!decisionReason.trim()) return;
    store.adminRejectRecharge(reqId, 'ADM-000001', decisionReason);
    setRejectingRechargeId(null);
    setDecisionReason('');
  };

  const handleApproveWithdrawal = (reqId: string) => {
    store.adminApproveWithdrawal(reqId, 'ADM-000001');
  };

  const handleRejectWithdrawal = (reqId: string) => {
    if (!decisionReason.trim()) return;
    store.adminRejectWithdrawal(reqId, 'ADM-000001', decisionReason);
    setRejectingWithdrawalId(null);
    setDecisionReason('');
  };

  const handleSavePaymentAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentFeedback(null);

    const res = store.adminUpdatePaymentAccount({
      provider: editProvider,
      accountHolder: editAccountHolder,
      accountNumber: editAccountNumber,
      instructions: editInstructions,
      adminId: 'ADM-000001',
    });

    if (res.success) {
      setPaymentFeedback(res.message);
      setTimeout(() => {
        setIsEditPaymentModalOpen(false);
        setPaymentFeedback(null);
      }, 1500);
    } else {
      setPaymentFeedback(`Error: ${res.message}`);
    }
  };

  const handleReplyTicket = () => {
    if (!selectedTicket || !adminReplyText.trim()) return;
    store.adminRespondTicket(selectedTicket.id, adminReplyText, replyTicketStatus, 'ADM-000001');
    setSelectedTicket(null);
    setAdminReplyText('');
  };

  const handleSaveManagerReward = () => {
    store.adminUpdateManagerReward(
      {
        amount: Number(managerAmount) || 25000,
        criteria: managerCriteria,
        period: managerReward.period,
        status: managerStatus as any,
      },
      'ADM-000001'
    );
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-white p-6 flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <h1 className="font-bold text-lg text-rose-900">Admin access denied</h1>
          <p className="mt-2 text-sm text-rose-800">Sign in with the designated demo administrator account to view this dashboard.</p>
          <button onClick={onBackToCustomer} className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Back to app</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-12 animate-fadeIn">
      {/* Top Admin Bar */}
      <div className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display font-extrabold text-sm text-slate-900 tracking-wide block">
                DIAMOND MINE AFRICA
              </span>
              <span className="text-[10px] text-blue-700 font-medium">
                Executive Control Portal · Demonstration System
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToCustomer}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold border border-blue-700 transition-colors"
            >
              Back to Customer App
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs mb-6 overflow-x-auto flex gap-1.5 text-xs font-semibold">
          {[
            { id: 'overview' as const, label: 'Overview', icon: Shield },
            { id: 'users' as const, label: `Users (${totalRegistered})`, icon: Users },
            { id: 'recharges' as const, label: `Recharges (${pendingRecharges} Pending)`, icon: CreditCard },
            { id: 'withdrawals' as const, label: `Withdrawals (${pendingWithdrawals} Pending)`, icon: ArrowDownRight },
            { id: 'products' as const, label: 'VIP Products', icon: Gem },
            { id: 'payment' as const, label: 'Business Payment (CBE)', icon: Building2 },
            { id: 'team_rewards' as const, label: 'Team Rewards', icon: Award },
            { id: 'manager_reward' as const, label: 'Manager Reward', icon: Crown },
            { id: 'support' as const, label: `Support (${openTickets})`, icon: MessageSquare },
            { id: 'audit' as const, label: 'Audit Logs', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <span className="text-[11px] text-slate-500 font-medium block">Registered Users</span>
                <span className="font-display font-black text-2xl text-slate-900 tabular-nums">
                  {totalRegistered}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Verified accounts</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
                <span className="text-[11px] text-emerald-800 font-medium block">Qualifying Members</span>
                <span className="font-display font-black text-2xl text-emerald-700 tabular-nums">
                  {activeQualifying}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-1">Active VIP owners</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
                <span className="text-[11px] text-amber-800 font-medium block">Pending Recharges</span>
                <span className="font-display font-black text-2xl text-amber-700 tabular-nums">
                  {pendingRecharges}
                </span>
                <span className="text-[10px] text-amber-600 block mt-1">Awaiting audit</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/20 shadow-xs">
                <span className="text-[11px] text-purple-800 font-medium block">Pending Withdrawals</span>
                <span className="font-display font-black text-2xl text-purple-700 tabular-nums">
                  {pendingWithdrawals}
                </span>
                <span className="text-[10px] text-purple-600 block mt-1">Under demo review</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
                <span className="text-[11px] text-blue-800 font-medium block">Active VIP Plans</span>
                <span className="font-display font-black text-2xl text-blue-700 tabular-nums">
                  {userOwnedProducts.length}
                </span>
                <span className="text-[10px] text-blue-600 block mt-1">Total subscriptions</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
                <span className="text-[11px] text-rose-800 font-medium block">Open Support</span>
                <span className="font-display font-black text-2xl text-rose-700 tabular-nums">
                  {openTickets}
                </span>
                <span className="text-[10px] text-rose-600 block mt-1">Tickets in queue</span>
              </div>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Account Details Spotlight */}
              <div className="bg-white p-5 rounded-2xl border border-blue-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-700" />
                    <h3 className="font-display font-bold text-sm text-slate-900">
                      Active Business Payment Configuration
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setEditProvider(paymentConfig.provider);
                      setEditAccountHolder(paymentConfig.accountHolder);
                      setEditAccountNumber(paymentConfig.accountNumber);
                      setEditInstructions(paymentConfig.instructions);
                      setIsEditPaymentModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    Change Payment Account
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bank / Provider:</span>
                    <span className="font-bold text-slate-800">{paymentConfig.provider}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Name:</span>
                    <span className="font-bold text-slate-800">{paymentConfig.accountHolder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Account Number:</span>
                    <span className="font-mono font-black text-blue-800">{paymentConfig.accountNumber}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200">
                    <span>Version {paymentConfig.version}</span>
                    <span>Updated by: {paymentConfig.updatedBy}</span>
                  </div>
                </div>
              </div>

              {/* Manager Reward Status Card */}
              <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    <h3 className="font-display font-bold text-sm text-slate-900">
                      Regional Manager Reward Tier
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('manager_reward')}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors"
                  >
                    Configure Manager Tier
                  </button>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Allocated Amount:</span>
                    <span className="font-bold text-amber-800 tabular-nums">
                      {managerReward.amount.toLocaleString()} ETB
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Evaluation Status:</span>
                    <span className="font-bold text-emerald-700">{managerReward.status}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 pt-1 border-t border-slate-200">
                    {managerReward.criteria}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Audit Activities */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-display font-bold text-sm text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Recent System & Administrative Audit Trail</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="py-2.5 flex items-start justify-between gap-4">
                    <div>
                      <span className="font-bold text-slate-800 block">{log.actionType}</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">{log.details}</p>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. USER MANAGEMENT TAB */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search name, phone, or ID..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-semibold">Status:</span>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="warned">Warned</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">User</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Badge</th>
                    <th className="py-2.5 px-3">Demo Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Referral Code</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const ownedCount = userOwnedProducts.filter((p) => p.userId === u.id).length;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{u.id}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">{u.phone}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-100">
                            {u.accountBadge} ({ownedCount} plans)
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-blue-700 tabular-nums">
                          {u.demoBalance.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              u.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : u.status === 'suspended'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{u.referralCode}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedUserForAction(u);
                                setUserActionType('note');
                                setActionReason(u.internalNote || '');
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold text-[11px]"
                            >
                              Note
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserForAction(u);
                                setUserActionType('warn');
                                setActionReason('');
                              }}
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md font-semibold text-[11px]"
                            >
                              Warn
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserForAction(u);
                                setUserActionType('suspend');
                                setActionReason('');
                              }}
                              className={`px-2 py-1 rounded-md font-semibold text-[11px] ${
                                u.status === 'suspended'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-rose-100 hover:bg-rose-200 text-rose-800'
                              }`}
                            >
                              {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. RECHARGE REQUESTS TAB */}
        {activeTab === 'recharges' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Demonstration Recharge Submissions Queue
            </h3>

            {rechargeRequests.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs">No recharge requests found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Request ID</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Reference Code</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Submission Date</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rechargeRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{req.id}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold block">{req.userName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{req.userPhone}</span>
                        </td>
                        <td className="py-3 px-3 font-extrabold text-blue-700 tabular-nums">
                          {req.amount.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {req.txReference}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 text-[11px]">
                          {new Date(req.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {req.status === 'pending_verification' || req.status === 'under_review' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveRecharge(req.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingRechargeId(req.id)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-xs"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Audited</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. WITHDRAWAL REQUESTS TAB */}
        {activeTab === 'withdrawals' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Demonstration Withdrawal Requests Queue
            </h3>

            {withdrawalRequests.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs">No withdrawal requests found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Request ID</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Requested</th>
                      <th className="py-2.5 px-3">Fee (8%)</th>
                      <th className="py-2.5 px-3">Net Payout</th>
                      <th className="py-2.5 px-3">Destination</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {withdrawalRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{req.id}</td>
                        <td className="py-3 px-3">
                          <span className="font-semibold block">{req.userName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{req.userPhone}</span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 tabular-nums">
                          {req.amount.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-3 font-bold text-rose-600 tabular-nums">
                          -{req.fee.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-3 font-extrabold text-emerald-700 tabular-nums">
                          {req.netAmount.toLocaleString()} ETB
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold block">{req.method}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {req.accountName} ({req.accountNumber})
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              req.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : req.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {req.status === 'pending_verification' || req.status === 'under_review' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleApproveWithdrawal(req.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => setRejectingWithdrawalId(req.id)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] rounded-lg shadow-xs"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">Audited</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 5. VIP PRODUCTS MANAGEMENT TAB */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900">
              VIP Product Catalogue Configuration (VIP 1 to VIP 10)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((p) => (
                <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2.5 text-xs shadow-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-blue-700 text-sm">VIP {p.tier} · {p.name}</span>
                    <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full tabular-nums">
                      {p.periodDays} Days
                    </span>
                  </div>
                  <div className="flex items-center gap-3 py-1">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                      <img
                        src={p.image || `/diamond${p.tier}.png`}
                        alt={`VIP ${p.tier}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="text-[11px] text-slate-600 space-y-0.5 flex-1">
                      <p>Price: <strong className="text-emerald-600 font-bold">{p.price.toLocaleString()} ETB</strong></p>
                      <p>Daily: <strong className="text-emerald-600 font-bold">+{p.dailyReturn.toLocaleString()} ETB/day</strong></p>
                      <p>Total: <strong className="text-emerald-600 font-bold">{((p.dailyReturn * p.periodDays) || p.illustrativeTotal).toLocaleString()} ETB</strong></p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 font-medium">{p.cutName}</span>
                    <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. BUSINESS PAYMENT SETTINGS TAB */}
        {activeTab === 'payment' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-slate-900">
                  Business Payment Account Settings (CBE)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update the payment details displayed in this demo's Recharge screen.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditProvider(paymentConfig.provider);
                  setEditAccountHolder(paymentConfig.accountHolder);
                  setEditAccountNumber(paymentConfig.accountNumber);
                  setEditInstructions(paymentConfig.instructions);
                  setIsEditPaymentModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                Change Payment Account
              </button>
            </div>

            <div role="note" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-950">
              <strong>Demo storage limitation:</strong> Changes are saved in this browser only and refresh open tabs on this same browser. They do not update other users' phones or a shared database. Do not enter a real bank account until secure Supabase Auth, database authorization, and RLS are implemented and tested.
            </div>

            {/* Current Active Settings */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest block">
                Active Customer Screen Version (v{paymentConfig.version})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-slate-500 block text-[11px]">Provider</span>
                  <span className="font-bold text-slate-900">{paymentConfig.provider}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Account Holder Name</span>
                  <span className="font-bold text-slate-900">{paymentConfig.accountHolder}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Account Number</span>
                  <span className="font-mono font-black text-blue-800 text-sm">{paymentConfig.accountNumber}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-200 text-slate-600 text-[11px]">
                <strong>Instructions:</strong> {paymentConfig.instructions}
              </div>
            </div>

            {/* Historical Versions Table */}
            <div className="space-y-2">
              <h4 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider">
                Configuration Audit History
              </h4>
              <div className="divide-y divide-slate-100 text-xs border border-slate-200 rounded-xl overflow-hidden">
                {paymentConfigHistory.map((hist) => (
                  <div key={hist.id} className="p-3 bg-white flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-800">
                        Version {hist.version} · {hist.accountHolder} ({hist.accountNumber})
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Updated {new Date(hist.updatedAt).toLocaleString()} by {hist.updatedBy}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      Archived
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. TEAM REWARDS CONFIGURATION TAB */}
        {activeTab === 'team_rewards' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Team Recharge Reward Schedule Configuration
            </h3>
            <div className="divide-y divide-slate-100 text-xs border border-slate-200 rounded-xl overflow-hidden">
              {teamRewards.map((tier) => (
                <div key={tier.id} className="p-3.5 bg-white flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800 block">{tier.label}</span>
                    <span className="text-[10px] text-slate-500">
                      Range: {tier.minRecharge.toLocaleString()} – {tier.maxRecharge.toLocaleString()} ETB
                    </span>
                  </div>
                  <span className="font-extrabold text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                    +{tier.rewardETB.toLocaleString()} ETB
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. MANAGER REWARD CONFIGURATION TAB */}
        {activeTab === 'manager_reward' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Manager Reward Configuration (Reference 25,000 ETB)
            </h3>

            <div className="space-y-3 text-xs max-w-xl">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Manager Reward Amount (ETB)
                </label>
                <input
                  type="number"
                  value={managerAmount}
                  onChange={(e) => setManagerAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Eligibility Criteria Description
                </label>
                <textarea
                  rows={3}
                  value={managerCriteria}
                  onChange={(e) => setManagerCriteria(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={managerStatus}
                  onChange={(e) => setManagerStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                >
                  <option value="Active">Active</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Configured">Configured</option>
                </select>
              </div>

              <button
                onClick={handleSaveManagerReward}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Save Manager Settings
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-bold text-xs text-slate-700 mb-2">Review History Log</h4>
              <div className="space-y-2 text-[11px] text-slate-600">
                {managerReward.reviewHistory.map((h, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="font-semibold block">{h.note}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(h.date).toLocaleString()} · {h.reviewedBy}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 9. SUPPORT TICKETS TAB */}
        {activeTab === 'support' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Customer Support & Inquiries Desk
            </h3>

            {supportTickets.length === 0 ? (
              <p className="text-center py-8 text-slate-400 text-xs">No support tickets found.</p>
            ) : (
              <div className="space-y-3">
                {supportTickets.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        #{t.id} · {t.userName} ({t.userPhone})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'In Progress'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="text-slate-700">{t.message}</p>
                    {t.adminResponse && (
                      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100 text-[11px]">
                        <strong>Response:</strong> {t.adminResponse}
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTicket(t);
                          setAdminReplyText(t.adminResponse || '');
                        }}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[11px]"
                      >
                        Reply / Update Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 10. AUDIT LOGS TAB */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-900">
              System Audit Logs & Compliance Records
            </h3>
            <div className="divide-y divide-slate-100 text-xs border border-slate-200 rounded-xl overflow-hidden">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3 bg-white space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900">{log.actionType}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{log.details}</p>
                  {log.reason && (
                    <span className="text-[10px] text-rose-600 font-semibold block">
                      Reason: {log.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Change Payment Account */}
      {isEditPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Change Payment Account
              </h3>
              <button
                onClick={() => setIsEditPaymentModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentAccount} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Payment Provider / Bank Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={editProvider}
                  onChange={(e) => { setEditProvider(e.target.value); setPaymentFeedback(null); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Account Holder / Business Name *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={120}
                  value={editAccountHolder}
                  onChange={(e) => { setEditAccountHolder(e.target.value); setPaymentFeedback(null); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Account Number *
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  maxLength={40}
                  autoComplete="off"
                  value={editAccountNumber}
                  onChange={(e) => { setEditAccountNumber(e.target.value); setPaymentFeedback(null); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Customer Transfer Instructions
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={editInstructions}
                  onChange={(e) => { setEditInstructions(e.target.value); setPaymentFeedback(null); }}
                  className="w-full p-3 rounded-xl border border-slate-300"
                />
              </div>

              {paymentFeedback && (
                <div role={paymentFeedback.startsWith('Error:') ? 'alert' : 'status'} className={`p-2.5 rounded-xl font-bold text-xs border ${paymentFeedback.startsWith('Error:') ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                  {paymentFeedback}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditPaymentModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-slate-700 bg-white border border-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reject Request Dialog with Reason */}
      {(rejectingRechargeId || rejectingWithdrawalId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Provide Rejection Reason
            </h3>
            <p className="text-slate-500 text-[11px]">
              This reason will be recorded in the audit log and delivered to the customer via in-app notification.
            </p>
            <textarea
              rows={3}
              required
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              placeholder="e.g. Invalid CBE reference code or transfer unconfirmed."
              className="w-full p-3 rounded-xl border border-slate-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setRejectingRechargeId(null);
                  setRejectingWithdrawalId(null);
                  setDecisionReason('');
                }}
                className="flex-1 py-2 rounded-xl text-slate-700 border border-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectingRechargeId) handleRejectRecharge(rejectingRechargeId);
                  if (rejectingWithdrawalId) handleRejectWithdrawal(rejectingWithdrawalId);
                }}
                className="flex-1 py-2 rounded-xl text-white bg-rose-600 hover:bg-rose-700 font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: User Action (Note / Warn / Suspend) */}
      {selectedUserForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <h3 className="font-display font-bold text-sm text-slate-900 capitalize">
              {userActionType === 'note'
                ? 'Internal Note'
                : userActionType === 'warn'
                ? 'Issue Official Warning'
                : 'Account Status Modification'}{' '}
              · {selectedUserForAction.name}
            </h3>
            <textarea
              rows={3}
              required
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Enter explanation or administrative note..."
              className="w-full p-3 rounded-xl border border-slate-300"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedUserForAction(null);
                  setUserActionType(null);
                  setActionReason('');
                }}
                className="flex-1 py-2 rounded-xl text-slate-700 border border-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleUserActionSubmit}
                className="flex-1 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Support Ticket Reply */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <h3 className="font-display font-bold text-sm text-slate-900">
              Reply to Ticket #{selectedTicket.id}
            </h3>
            <p className="text-slate-600 text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              "{selectedTicket.message}"
            </p>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Status</label>
              <select
                value={replyTicketStatus}
                onChange={(e) => setReplyTicketStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              >
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Official Response *</label>
              <textarea
                rows={3}
                value={adminReplyText}
                onChange={(e) => setAdminReplyText(e.target.value)}
                placeholder="Write message to customer..."
                className="w-full p-3 rounded-xl border border-slate-300"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedTicket(null)}
                className="flex-1 py-2 rounded-xl text-slate-700 border border-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleReplyTicket}
                className="flex-1 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold"
              >
                Send Response
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
