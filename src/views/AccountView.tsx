import React, { useState } from 'react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';
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
} from 'lucide-react';

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

  if (!currentUser) return null;

  const userRecharges = rechargeRequests.filter((r) => r.userId === currentUser.id);
  const userWithdrawals = withdrawalRequests.filter((w) => w.userId === currentUser.id);
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
            <span className="text-[11px] text-blue-200 block">{isSupabaseConfigured ? 'Staging Wallet Balance' : 'Demonstration Balance'}</span>
            <span className="font-display font-black text-xl text-amber-300 tabular-nums">
              {currentUser.demoBalance.toLocaleString()} <span className="text-xs text-white">ETB</span>
            </span>
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
              <span className="text-[11px] text-slate-400">{currentUser.withdrawalDetails ? `${currentUser.withdrawalDetails.method} · saved destination` : 'Set a preferred demo withdrawal destination'}</span>
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
                  <p className="text-[11px]">
                    Diamond Mine Africa is presented here as a diamond-themed demonstration application with a gemstone catalogue, sample referral views, and simulated account workflows. This demo does not verify mining operations, licences, mineral reserves, actual production, or real financial returns.
                  </p>
                </div>
              ) : historyModal === 'recharges' ? (
                userRecharges.length === 0 ? (
                  <p className="text-center py-6 text-slate-400">No recharge requests found.</p>
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
                  <p className="text-center py-6 text-slate-400">No withdrawal requests found.</p>
                ) : (
                  userWithdrawals.map((w) => (
                    <div key={w.id} className="p-3 rounded-xl border border-slate-200 bg-white space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{w.amount.toLocaleString()} ETB ({w.method})</span>
                        <span
                          className={`capitalize text-[10px] px-2 py-0.5 rounded-full ${
                            w.status === 'approved'
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
              ) : (
                /* All transactions ledger */
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
