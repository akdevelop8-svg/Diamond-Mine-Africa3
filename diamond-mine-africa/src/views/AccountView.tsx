import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';
import type { RechargeRequest, RequestStatus, WithdrawalRequest } from '../types.ts';
import { ASSETS } from '../data/constants.ts';
import {
  CreditCard,
  ArrowDownRight,
  History,
  Users,
  Gift,
  FileText,
  Info,
  Headphones,
  LogOut,
  ChevronRight,
  Gem,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Landmark,
  RefreshCw,
} from 'lucide-react';

type ServerWalletLedgerEntry = {
  id: string;
  entry_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  related_type?: string | null;
  related_id?: string | null;
};

function walletEntryTitle(entryType: string): string {
  const titles: Record<string, string> = {
    recharge_credit: 'Verified recharge credit',
    withdrawal_reserve: 'Withdrawal amount reserved',
    withdrawal_release: 'Withdrawal reserve returned',
    admin_adjustment: 'Wallet adjustment',
    daily_checkin_reward: 'Daily check-in reward',
    task_reward: 'Task Center reward',
  };
  return titles[entryType] || entryType.replaceAll('_', ' ');
}


interface AccountViewProps {
  onOpenRecharge: () => void;
  onOpenWithdraw: () => void;
  onOpenTaskCenter: () => void;
  onOpenBankDetails: () => void;
  onOpenSupport: () => void;
  onOpenRules: () => void;
  onNavigateTab: (tab: 'home' | 'earnings' | 'share' | 'account') => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  onOpenRecharge,
  onOpenWithdraw,
  onOpenTaskCenter,
  onOpenBankDetails,
  onOpenSupport,
  onOpenRules,
  onNavigateTab,
}) => {
  const { currentUser, rechargeRequests, withdrawalRequests, claimHistory } = useStore();
  const [historyModal, setHistoryModal] = useState<'all' | 'recharges' | 'withdrawals' | 'about' | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletRefreshError, setWalletRefreshError] = useState('');
  const [serverRecharges, setServerRecharges] = useState<RechargeRequest[]>([]);
  const [serverWithdrawals, setServerWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [serverWalletLedger, setServerWalletLedger] = useState<ServerWalletLedgerEntry[]>([]);
  const [serverDestinationMethod, setServerDestinationMethod] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const refreshWalletBalance = useCallback(async () => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    const profileId = currentUser.id;
    setWalletLoading(true);
    setWalletRefreshError('');
    try {
      const { data, error } = await supabase.rpc('dma_wallet_balance');
      if (error) throw error;
      const balance = Number(data);
      if (!Number.isFinite(balance) || balance < 0) throw new Error('The server returned an invalid wallet balance.');
      // Do not apply a slow response to a different account after a session switch.
      if (store.getState().currentUser?.id === profileId) store.updateServerWalletBalance(balance);
    } catch (error) {
      if (store.getState().currentUser?.id === profileId) {
        setWalletRefreshError(error instanceof Error ? error.message : 'Could not refresh the wallet balance.');
      }
    } finally {
      setWalletLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshWalletBalance();
    };
    void refreshWalletBalance();
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentUser?.id, refreshWalletBalance]);

  const refreshServerHistory = useCallback(async () => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    const profileId = currentUser.id;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const [rechargeResult, withdrawalResult, ledgerResult] = await Promise.all([
        supabase.from('recharge_requests')
          .select('id,profile_id,amount,provider,tx_reference,status,rejection_reason,reviewed_by,reviewed_at,payment_config_version,created_at')
          .eq('profile_id', profileId).order('created_at', { ascending: false }).limit(100),
        supabase.from('withdrawal_requests')
          .select('id,profile_id,amount,fee,net_amount,method,account_name,account_number,status,rejection_reason,reviewed_by,reviewed_at,created_at')
          .eq('profile_id', profileId).order('created_at', { ascending: false }).limit(100),
        supabase.from('wallet_ledger')
          .select('id,entry_type,amount,balance_after,description,created_at,related_type,related_id')
          .eq('profile_id', profileId).order('created_at', { ascending: false }).limit(200),
      ]);
      if (rechargeResult.error) throw rechargeResult.error;
      if (withdrawalResult.error) throw withdrawalResult.error;
      if (ledgerResult.error) throw ledgerResult.error;
      if (store.getState().currentUser?.id !== profileId) return;

      setServerRecharges((rechargeResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        userId: String(row.profile_id),
        userName: currentUser.name,
        userPhone: currentUser.phone,
        amount: Number(row.amount) || 0,
        provider: String(row.provider ?? ''),
        txReference: String(row.tx_reference ?? ''),
        status: row.status as RequestStatus,
        createdAt: String(row.created_at ?? ''),
        reviewedAt: row.reviewed_at ?? undefined,
        reviewedBy: row.reviewed_by ?? undefined,
        rejectionReason: row.rejection_reason ?? undefined,
        paymentConfigVersion: Number(row.payment_config_version) || 1,
      })));
      setServerWithdrawals((withdrawalResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        userId: String(row.profile_id),
        userName: currentUser.name,
        userPhone: currentUser.phone,
        amount: Number(row.amount) || 0,
        fee: Number(row.fee) || 0,
        netAmount: Number(row.net_amount) || 0,
        method: row.method as WithdrawalRequest['method'],
        accountName: String(row.account_name ?? ''),
        accountNumber: String(row.account_number ?? ''),
        status: row.status as RequestStatus,
        createdAt: String(row.created_at ?? ''),
        reviewedAt: row.reviewed_at ?? undefined,
        reviewedBy: row.reviewed_by ?? undefined,
        rejectionReason: row.rejection_reason ?? undefined,
      })));
      setServerWalletLedger((ledgerResult.data ?? []).map((row: any) => ({
        id: String(row.id),
        entry_type: String(row.entry_type ?? ''),
        amount: Number(row.amount) || 0,
        balance_after: Number(row.balance_after) || 0,
        description: String(row.description ?? ''),
        created_at: String(row.created_at ?? ''),
        related_type: row.related_type == null ? null : String(row.related_type),
        related_id: row.related_id == null ? null : String(row.related_id),
      })));
      // Destination-summary failure must not hide otherwise-readable transaction history.
      try {
        const { data: destinationData, error: destinationError } = await supabase
          .from('withdrawal_destinations').select('method').eq('profile_id', profileId).maybeSingle();
        if (!destinationError && store.getState().currentUser?.id === profileId) {
          setServerDestinationMethod(destinationData?.method ?? null);
        }
      } catch {
        // The Bank Details modal shows any destination-specific error when opened.
      }
    } catch (error) {
      if (store.getState().currentUser?.id === profileId) {
        setHistoryError(error instanceof Error ? error.message : 'Could not load transaction history from the server.');
      }
    } finally {
      if (store.getState().currentUser?.id === profileId) setHistoryLoading(false);
    }
  }, [currentUser?.id, currentUser?.name, currentUser?.phone]);

  useEffect(() => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    void refreshServerHistory();
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshServerHistory();
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [currentUser?.id, historyModal, refreshServerHistory]);

  if (!currentUser) return null;

  const userRecharges = isSupabaseConfigured
    ? serverRecharges.filter((r) => r.userId === currentUser.id)
    : rechargeRequests.filter((r) => r.userId === currentUser.id);
  const userWithdrawals = isSupabaseConfigured
    ? serverWithdrawals.filter((w) => w.userId === currentUser.id)
    : withdrawalRequests.filter((w) => w.userId === currentUser.id);
  const userClaims = claimHistory.filter((c) => c.userId === currentUser.id);

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Supabase sign-out failed:', error);
    }
    store.logout();
  };

  return (
    <div className="space-y-5 pb-8 animate-fadeIn">
      {/* Profile Card with Standing Person Avatar */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white/30 shadow-md bg-white shrink-0">
            <img
              src={ASSETS.avatar}
              alt={currentUser.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-lg sm:text-xl text-white truncate">
                {currentUser.name}
              </h2>
              <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 border border-amber-300/40 px-2 py-0.5 rounded-full shrink-0">
                {currentUser.accountBadge}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-blue-200 mt-1">
              <span className="font-mono">ID: {currentUser.id}</span>
              <span>·</span>
              <span className="font-mono">{currentUser.phone}</span>
            </div>

            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-semibold text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Status: {currentUser.status.toUpperCase()}
              </span>
              <span className="text-[10px] text-blue-200">
                Code: <strong className="text-amber-300 font-mono">{currentUser.referralCode}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Balance Showcase Bar */}
        <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-blue-200 block">{isSupabaseConfigured ? 'Available Wallet Balance' : 'Demonstration Balance'}</span>
              {isSupabaseConfigured && <button type="button" onClick={() => void refreshWalletBalance()} disabled={walletLoading} aria-label="Refresh wallet balance" title="Refresh wallet balance" className="rounded-md p-1 text-blue-100 hover:bg-white/10 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${walletLoading ? 'animate-spin' : ''}`} /></button>}
            </div>
            <span className="font-display font-black text-xl text-amber-300 tabular-nums">
              {currentUser.demoBalance.toLocaleString()} <span className="text-xs text-white">ETB</span>
            </span>
            {walletRefreshError && isSupabaseConfigured && <p role="alert" className="mt-1 text-[10px] leading-4 text-amber-100">Wallet refresh failed: {walletRefreshError}</p>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenRecharge}
              className="flex-1 py-3 px-2 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Recharge</span>
            </button>
            <button
              onClick={onOpenWithdraw}
              className="flex-1 py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1"
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary CTA: Browse Products */}
      <button
        onClick={() => onNavigateTab('home')}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold text-xs shadow-xs flex items-center justify-between transition-all"
      >
        <div className="flex items-center gap-2.5">
          <Gem className="w-5 h-5 text-amber-300" />
          <div className="text-left">
            <span className="block font-bold">Browse VIP Diamond Catalogue</span>
            <span className="text-[10px] text-blue-200 font-normal">
              Activate VIP 1 to VIP 10 gemstones
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/80" />
      </button>

      {/* Account Menu Items (Strictly NO Gift Code) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden text-xs">
        {/* 1. Transaction History */}
        <button
          onClick={() => setHistoryModal('all')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">Transaction History</span>
              <span className="text-[11px] text-slate-400">Complete demonstration ledger entries</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 2. Withdrawal History */}
        <button
          onClick={() => setHistoryModal('withdrawals')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">Withdrawal History</span>
              <span className="text-[11px] text-slate-400">
                {userWithdrawals.length} request records
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 3. Recharge History */}
        <button
          onClick={() => setHistoryModal('recharges')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">Recharge History</span>
              <span className="text-[11px] text-slate-400">
                {userRecharges.length} CBE top-up submissions
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Withdrawal destination settings */}
        <button
          onClick={onOpenBankDetails}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">My Bank Details</span>
              <span className="text-[11px] text-slate-400">{currentUser.withdrawalDetails?.method || serverDestinationMethod ? `${currentUser.withdrawalDetails?.method || serverDestinationMethod} · saved destination` : isSupabaseConfigured ? 'Add your bank or mobile-money destination' : 'Set a demo destination for testing'}</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 4. My Team */}
        <button
          onClick={() => onNavigateTab('share')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">My Team Network</span>
              <span className="text-[11px] text-slate-400">4 referral levels and commissions</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 5. Task Center (Inside My Account per requirement!) */}
        <button
          onClick={onOpenTaskCenter}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">Task Center</span>
              <span className="text-[11px] text-slate-400">Community tasks & activities</span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
            Activities
          </span>
        </button>

        {/* 6. Platform Rules */}
        <button
          onClick={onOpenRules}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">Platform Rules & Policies</span>
              <span className="text-[11px] text-slate-400">Terms, policies, and withdrawal rules</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 7. About Us */}
        <button
          onClick={() => setHistoryModal('about')}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">About Us</span>
              <span className="text-[11px] text-slate-400">Mining vision and corporate heritage</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 8. Customer Support */}
        <button
          onClick={onOpenSupport}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Headphones className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-800 block">Customer Support</span>
              <span className="text-[11px] text-slate-400">24/7 Telegram & In-App Assistance</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* 9. Logout */}
        <button
          onClick={handleLogout}
          className="w-full p-4 flex items-center justify-between hover:bg-rose-50 text-rose-700 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <LogOut className="w-4 h-4" />
            </div>
            <span className="font-bold">Log Out</span>
          </div>
          <ChevronRight className="w-4 h-4 text-rose-300" />
        </button>
      </div>

      {/* History & Info Modals */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-display font-bold text-sm text-slate-900">
                {historyModal === 'all'
                  ? 'All Transaction Records'
                  : historyModal === 'recharges'
                  ? 'Recharge History'
                  : historyModal === 'withdrawals'
                  ? 'Withdrawal History'
                  : 'About Diamond Mine Africa'}
              </h3>
              <button
                onClick={() => setHistoryModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              {historyModal !== 'about' && isSupabaseConfigured && historyLoading && (
                <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">Loading transaction history from your account…</p>
              )}
              {historyModal !== 'about' && isSupabaseConfigured && historyError && (
                <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">History could not be loaded: {historyError}</p>
              )}
              {historyModal === 'about' ? (
                <div className="space-y-3 leading-relaxed text-slate-600">
                  <div className="w-16 h-16 rounded-2xl mx-auto overflow-hidden border border-blue-200 p-1">
                    <img
                      src={ASSETS.logo}
                      alt="Diamond Mine Africa"
                      className="w-full h-full object-contain rounded-xl"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h4 className="font-display font-bold text-base text-slate-900 text-center">
                    Diamond Mine Africa
                  </h4>
                  <p className="text-center font-medium text-amber-700 text-xs">
                    Mine Today · Grow Tomorrow
                  </p>
                  <div className="space-y-2.5 text-[11px] leading-relaxed">
                    <p>
                      Diamond Mine Africa is a digital platform concept built around the diamond and mineral industries. Its visual identity brings together gemstone-inspired imagery, mining-industry themes, member account tools, and a mobile-first interface designed to make navigation straightforward on phones as well as larger screens. The name and design express an ambition to make information about diamonds, mineral resources, and the wider mining ecosystem easier to explore through one organised online experience.
                    </p>
                    <p>
                      The platform experience is organised around a member account, a gemstone catalogue, account activity pages, support information, and referral-link attribution. Members can explore the interface, understand how account pages are arranged, review product-style catalogue cards, and see how user actions would be presented in a structured digital service. The interface uses clear navigation, readable labels, and a consistent visual system so that important account actions are easy to find.
                    </p>
                    <p>
                      The gemstone catalogue in this version is an illustrative presentation of diamond cuts, colours, clarity terminology, and tier-style product cards. The pictures are visual assets for the interface; they are not certificates of ownership, laboratory grading reports, proof of mineral reserves, or evidence that a particular gemstone is held by the platform. Any future commercial listing should be supported by accurate product specifications, provenance information, independent grading where applicable, and terms that customers can review before making a purchase.
                    </p>
                    <p>
                      Member tools are designed to keep account activity easy to follow. The application layout includes a home page, an earnings-style activity area, sharing and team views, account settings, support, task information, and transaction-history views. Referral information helps attribute an invitation to the correct account. Any real-world reward or commission arrangement would need clear written rules, verifiable eligibility criteria, appropriate controls against abuse, and records that can be independently reconciled.
                    </p>
                    <p>
                      Transparency is essential whenever an online service displays balances, rewards, deposits, or withdrawals. In this source package, the balance, VIP daily figures, claims, check-in rewards, referral commissions, and withdrawal actions are demonstration workflows; they do not represent verified revenue or guaranteed payments. Recharge references submitted through the configured review path are not proof that a bank transfer has cleared, and this version does not perform a bank transfer or payout. Do not send money to placeholder account details or treat any displayed figure as an expected financial return.
                    </p>
                    <p>
                      Before this concept can responsibly offer real-money services, its operator must establish and document the actual business activity behind each paid product, provide evidence for any mining or trading claims, confirm all required permissions with qualified local professionals, publish understandable customer terms, and deploy a secure server-side transaction ledger. Deposits must only be credited after independent payment reconciliation; withdrawals must be recorded, checked against available verified funds, and marked complete only after the payout is actually sent. Administrative actions must be restricted, audited, and recoverable, and private customer data must not be exposed to other members.
                    </p>
                    <p>
                      Diamond Mine Africa’s intended direction is a clear, dependable, and accessible digital experience for diamond- and mineral-related information and services. Trust should be earned through verifiable operations, accurate product descriptions, fair customer support, responsible handling of personal information, and financial records that match real transactions. Until those production requirements have been independently established and implemented, this build remains an evaluation prototype rather than a live investment, mining-yield, deposit, or payout service.
                    </p>
                    <p>
                      Our mission is to make information about diamonds, gemstones, and the wider mineral value chain easier to understand through a carefully organised digital experience. Many people encounter the mineral sector through unfamiliar grading terms, complex supply chains, technical product descriptions, or confusing online services. Diamond Mine Africa aims to present information in a clear structure, explain terminology in accessible language, and help users navigate their account activity without unnecessary friction. This mission is an intended direction for the platform, not a claim that the service currently owns mines, mineral reserves, or certified gemstones.
                    </p>
                    <p>
                      Our vision is an African-focused digital experience where useful information, responsible technology, transparent policies, and respectful customer service belong together. The continent contains diverse mineral knowledge, skilled people, developing businesses, and communities with different needs. A digital platform can help people explore the subject, compare information, and understand the processes involved when product listings are supported by reliable evidence. We believe a trustworthy service should explain what it offers, what it does not offer, and what a customer should verify before making a decision.
                    </p>
                    <p>
                      Clarity and integrity should guide every part of the customer experience. Product descriptions should be accurate and easy to read. Images should be used as illustrations unless they are backed by evidence identifying the actual item. Any future listing involving a physical stone or mineral should include appropriate documentation, origin and provenance information where available, and independent grading or testing when relevant. Marketing language should never replace verifiable information, and projected values should never be presented as guaranteed outcomes.
                    </p>
                    <p>
                      We also believe digital services should be designed around the people who use them. The mobile-first layout, straightforward navigation, account pages, support tools, and activity history are intended to make the platform usable on a range of devices and connection conditions. Important actions should be labelled plainly, errors should explain how to recover, and customers should be able to review the status of their requests. Personal details should be collected only for a clear purpose, protected by appropriate permissions, and never exposed to other members without a valid reason.
                    </p>
                    <p>
                      Responsible growth requires more than a polished interface. Any real commercial activity connected with minerals should be supported by evidence, suitable authorisations, qualified partners, clear contractual terms, and appropriate safeguards. If the platform introduces real deposits or payouts in the future, each transaction will need auditable records, independent payment reconciliation, fraud controls, privacy protections, customer support procedures, and a reliable method to resolve disputes. The team should measure success through dependable service and accountable operations rather than unverified return figures or exaggerated promises.
                    </p>
                    <p>
                      We recognise that sustainability, community impact, and responsible sourcing matter in the mineral sector. Any future claims about ethical sourcing, environmental performance, employment, community investment, or operational standards should be backed by credible policies and evidence rather than assumptions. The platform’s long-term ambition is to encourage better-informed decisions by presenting information carefully and by making commitments only when they can be demonstrated.
                    </p>
                    <p>
                      Customer trust is built over time. We aim for clear communication, consistent service, timely support responses, accurate records, and fair handling of questions or complaints. The account and activity tools are intended to provide a structured foundation for these standards. As the platform evolves, its policies and functions should be reviewed regularly so that the experience remains understandable, access controls remain appropriate, and published information continues to match actual capabilities.
                    </p>
                    <p>
                      Diamond Mine Africa is therefore presented as a developing digital platform with a clear ambition: to offer an accessible place to explore diamond- and mineral-related information, use well-organised account tools, and understand the standards that a responsible service should meet. Its future depends on transparent governance, verifiable products, sound security, and evidence-based operations. Until live payments, payouts, and any claimed commercial returns are independently implemented and tested, financial figures and reward displays must be treated as illustrative rather than withdrawable money or guaranteed income.
                    </p>
                  </div>
                </div>
              ) : historyModal === 'recharges' ? (
                userRecharges.length === 0 ? (
                  historyError ? null : historyLoading && isSupabaseConfigured
                    ? <p className="text-center py-6 text-slate-400">Loading recharge requests…</p>
                    : <p className="text-center py-6 text-slate-400">No recharge requests found.</p>
                ) : (
                  userRecharges.map((r) => (
                    <div key={r.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{r.amount.toLocaleString()} ETB ({r.provider})</span>
                        <span
                          className={`capitalize text-[10px] px-2 py-0.5 rounded-full ${
                            r.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between font-mono">
                        <span>Ref: {r.txReference}</span>
                        <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.rejectionReason && (
                        <p className="text-[10px] text-rose-600 font-medium pt-1">
                          Reason: {r.rejectionReason}
                        </p>
                      )}
                    </div>
                  ))
                )
              ) : historyModal === 'withdrawals' ? (
                userWithdrawals.length === 0 ? (
                  historyError ? null : historyLoading && isSupabaseConfigured
                    ? <p className="text-center py-6 text-slate-400">Loading withdrawal requests…</p>
                    : <p className="text-center py-6 text-slate-400">No withdrawal requests found.</p>
                ) : (
                  userWithdrawals.map((w) => (
                    <div key={w.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{w.amount.toLocaleString()} ETB ({w.method})</span>
                        <span
                          className={`capitalize text-[10px] px-2 py-0.5 rounded-full ${
                            w.status === 'approved' || w.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : w.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {w.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between">
                        <span>Net: {w.netAmount.toLocaleString()} ETB (Fee: {w.fee} ETB)</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(w.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        To: {w.accountName} ({w.accountNumber.length > 4 ? `${'•'.repeat(Math.min(8, w.accountNumber.length - 4))}${w.accountNumber.slice(-4)}` : '••••'})
                      </span>
                    </div>
                  ))
                )
              ) : isSupabaseConfigured ? (
                /* Database-backed history: wallet ledger entries are authoritative for actual balance movements. */
                <div className="space-y-4">
                  <section className="space-y-2">
                    <span className="font-bold text-slate-700 block">Wallet Ledger — recorded balance movements</span>
                    {serverWalletLedger.length === 0 ? (
                      <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center text-slate-500">No wallet ledger entries have been recorded yet.</p>
                    ) : serverWalletLedger.map((entry) => (
                      <div key={entry.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-semibold block">{walletEntryTitle(entry.entry_type)}</span>
                          <span className="text-[10px] text-slate-500 block">{new Date(entry.created_at).toLocaleString()}</span>
                          {entry.description && <span className="text-[10px] text-slate-500 block">{entry.description}</span>}
                          <span className="text-[10px] text-slate-400 block">Balance after: {entry.balance_after.toLocaleString()} ETB</span>
                        </div>
                        <span className={`font-bold whitespace-nowrap ${entry.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {entry.amount >= 0 ? '+' : '−'}{Math.abs(entry.amount).toLocaleString()} ETB
                        </span>
                      </div>
                    ))}
                  </section>

                  <section className="space-y-2">
                    <span className="font-bold text-slate-700 block">Recharge and withdrawal requests (status only)</span>
                    {userRecharges.length === 0 && userWithdrawals.length === 0 ? (
                      <p className="text-slate-500">No recharge or withdrawal requests found.</p>
                    ) : (
                      <>
                        {userRecharges.map((r) => (
                          <div key={`request-r-${r.id}`} className="p-2.5 rounded-xl border border-slate-100 bg-white flex justify-between gap-3">
                            <div><span className="font-semibold block">Recharge request · {r.provider}</span><span className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleString()} · Ref: {r.txReference}</span></div>
                            <span className="text-right whitespace-nowrap"><span className="font-semibold block">{r.amount.toLocaleString()} ETB</span><span className="capitalize text-[10px] text-slate-500">{r.status.replaceAll('_', ' ')}</span></span>
                          </div>
                        ))}
                        {userWithdrawals.map((w) => (
                          <div key={`request-w-${w.id}`} className="p-2.5 rounded-xl border border-slate-100 bg-white flex justify-between gap-3">
                            <div><span className="font-semibold block">Withdrawal request</span><span className="text-[10px] text-slate-500">{new Date(w.createdAt).toLocaleString()} · Net after fee: {w.netAmount.toLocaleString()} ETB</span></div>
                            <span className="text-right whitespace-nowrap"><span className="font-semibold block">{w.amount.toLocaleString()} ETB</span><span className="capitalize text-[10px] text-slate-500">{w.status.replaceAll('_', ' ')}</span></span>
                          </div>
                        ))}
                      </>
                    )}
                    <p className="text-[10px] text-slate-500">A request is not itself a wallet credit or proof of payout. Only wallet ledger entries show recorded balance movements.</p>
                  </section>
                </div>
              ) : (
                /* Demo-only history */
                <div className="space-y-2">
                  <span className="font-bold text-slate-700 block">Recent Activity Log</span>
                  {userClaims.map((c) => (
                    <div key={c.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex justify-between">
                      <div>
                        <span className="font-semibold block">VIP {c.tier} Daily Return</span>
                        <span className="text-[10px] text-slate-400">{new Date(c.claimedAt).toLocaleString()}</span>
                      </div>
                      <span className="font-bold text-emerald-600">+{c.amount} ETB</span>
                    </div>
                  ))}
                  {userRecharges.map((r) => (
                    <div key={r.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex justify-between">
                      <div>
                        <span className="font-semibold block">Recharge ({r.status})</span>
                        <span className="text-[10px] text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="font-bold text-blue-600">+{r.amount} ETB</span>
                    </div>
                  ))}
                  {userWithdrawals.map((w) => (
                    <div key={w.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 flex justify-between">
                      <div>
                        <span className="font-semibold block">Withdrawal ({w.status})</span>
                        <span className="text-[10px] text-slate-400">{new Date(w.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className="font-bold text-rose-600">-{w.amount} ETB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
