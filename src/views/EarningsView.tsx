import React, { useState } from 'react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { isSupabaseConfigured } from '../services/supabase.ts';
import { claimDailyMiningReward, refreshServerVipData } from '../services/vip.ts';
import { GemstoneIcon } from '../components/GemstoneIcon.tsx';
import { UserOwnedProduct } from '../types.ts';
import {
  TrendingUp,
  Sparkles,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Gem,
  ArrowRight,
  History,
} from 'lucide-react';

interface EarningsViewProps {
  onNavigateHome: () => void;
}

export const EarningsView: React.FC<EarningsViewProps> = ({ onNavigateHome }) => {
  const { currentUser, userOwnedProducts, claimHistory } = useStore();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; message: string; success: boolean } | null>(null);

  if (!currentUser) return null;

  const myProducts = userOwnedProducts.filter((p) => p.userId === currentUser.id);
  const myClaims = claimHistory
    .filter((c) => c.userId === currentUser.id)
    .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime());

  const handleClaim = async (item: UserOwnedProduct) => {
    if (!currentUser || claimingId) return;
    setClaimingId(item.id);
    setFeedback(null);

    if (isSupabaseConfigured) {
      try {
        const result = await claimDailyMiningReward(item.id);
        let message = `${result.message} +${result.reward.toLocaleString()} ETB. Wallet balance: ${result.walletBalance.toLocaleString()} ETB.`;
        try {
          await refreshServerVipData(currentUser.id);
        } catch (refreshError) {
          // The claim RPC has already committed; only the UI refresh failed.
          console.error('Mining claim succeeded but account refresh failed:', refreshError);
          message += ' Refresh the page if the balance/history does not update immediately.';
        }
        setFeedback({ id: item.id, message, success: true });
      } catch (error) {
        setFeedback({
          id: item.id,
          message: error instanceof Error ? error.message : 'Daily mining claim failed. No wallet credit was confirmed.',
          success: false,
        });
      } finally {
        setClaimingId(null);
      }
      return;
    }

    const res = store.claimDailyEarnings(currentUser.id, item.id);
    setFeedback({ id: item.id, message: res.message, success: res.success });
    setClaimingId(null);
  };

  // Helper to calculate eligibility
  const getClaimEligibility = (item: UserOwnedProduct) => {
    if (item.status === 'expired' || item.totalClaimedDays >= item.periodDays) {
      return { eligible: false, text: '365-Day Cycle Completed', hoursLeft: 0 };
    }

    if (!item.lastClaimTimestamp) {
      return { eligible: true, text: 'Ready to Claim', hoursLeft: 0 };
    }

    const lastTime = new Date(item.lastClaimTimestamp).getTime();
    const elapsed = Date.now() - lastTime;
    const interval = 24 * 60 * 60 * 1000;

    if (elapsed >= interval) {
      return { eligible: true, text: 'Ready to Claim', hoursLeft: 0 };
    }

    const remainingMs = interval - elapsed;
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    return { eligible: false, text: `Cooldown: ${hours}h ${mins}m`, hoursLeft: hours };
  };

  return (
    <div className="space-y-5 pb-8 animate-fadeIn">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest block">
              Active Gemstone Assets
            </span>
            <h2 className="font-display font-extrabold text-xl text-white tracking-tight">
              Mining Production & Claims
            </h2>
          </div>
          <div className="text-right">
            <span className="text-xs text-blue-200 block">Total Active Plans</span>
            <span className="font-display font-black text-2xl text-amber-300 tabular-nums">
              {myProducts.filter((p) => p.status === 'active').length}
            </span>
          </div>
        </div>
        <p className="text-xs text-blue-100/80 mt-2">
          Live claims are checked by the database and are limited to once every 24 hours per VIP. Wallet credits require sufficient verified funds in the mining reward reserve.
        </p>
      </div>

      {/* Owned Products List */}
      {myProducts.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
            <Gem className="w-8 h-8 opacity-70" />
          </div>
          <h3 className="font-display font-bold text-base text-slate-800">
            No Active VIP Plans Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You do not own any VIP gemstone tiers yet. Browse the VIP catalogue to purchase an available tier using your server wallet balance.
          </p>
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
          >
            <span>Browse VIP Catalogue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-display font-bold text-sm text-slate-900">
            Your Active Mining Portfolios ({myProducts.length})
          </h3>

          {myProducts.map((item) => {
            const eligibility = getClaimEligibility(item);
            const remainingDays = Math.max(0, item.periodDays - item.totalClaimedDays);
            const illustrativeTotal = item.dailyReturn * item.periodDays;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-blue-300 shadow-xs p-4 sm:p-5 space-y-4 transition-all"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <GemstoneIcon tier={item.tier} size="md" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          VIP {item.tier}
                        </span>
                        <h4 className="font-display font-bold text-sm text-slate-900">
                          {item.name}
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        Activated: {new Date(item.purchaseDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      item.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>

                {/* Metrics Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Configured Daily Figure (not guaranteed)</span>
                    <span className="font-black text-emerald-600 tabular-nums">
                      +{item.dailyReturn.toLocaleString()} ETB
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Days Claimed</span>
                    <span className="font-bold text-slate-800 tabular-nums">
                      {item.totalClaimedDays} / {item.periodDays}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-red-50/50 border border-red-200">
                    <span className="text-slate-600 block text-[11px]">Remaining Period</span>
                    <span className="font-black text-red-600 tabular-nums">
                      {remainingDays} Days
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-500 block text-[11px]">Illustrative Total (not guaranteed)</span>
                    <span className="font-black text-emerald-600 tabular-nums">
                      {illustrativeTotal.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                {/* Claim Interaction Row */}
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>
                      {item.lastClaimTimestamp
                        ? `Last Claim: ${new Date(item.lastClaimTimestamp).toLocaleString()}`
                        : 'No claims recorded yet'}
                    </span>
                  </div>

                  <button
                    onClick={() => handleClaim(item)}
                    disabled={!eligibility.eligible || claimingId === item.id}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                      eligibility.eligible
                        ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {claimingId === item.id ? 'Claiming...' : (isSupabaseConfigured ? (eligibility.eligible ? 'Claim mining reward' : eligibility.text) : eligibility.text)}
                    </span>
                  </button>
                </div>

                {/* Feedback Message */}
                {feedback && feedback.id === item.id && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-semibold ${
                      feedback.success
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {feedback.message}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Illustrative Total Formula Disclosure */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
        <span className="font-bold text-slate-800 block">
          Reference Calculation Formula:
        </span>
        <code className="text-[11px] font-mono text-blue-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 block">
          Illustrative Total = Reference Daily Amount × Reference Period (365 Days)
        </code>
        <p className="text-[11px] text-slate-500 italic pt-1">
          *Configured figures are not guaranteed returns. In Supabase mode, a successful claim is paid only from the pre-funded reward reserve; a claim fails when that reserve lacks sufficient verified funds.
        </p>
      </div>

      {/* Claim History Audit Table */}
      {myClaims.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <History className="w-4 h-4 text-blue-600" />
            <span>Recent Claim History Ledger</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {myClaims.slice(0, 5).map((clm) => (
              <div key={clm.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">
                    VIP {clm.tier} Daily Mining Reward
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(clm.claimedAt).toLocaleString()}
                  </span>
                </div>
                <span className="font-bold text-emerald-600 tabular-nums">
                  +{clm.amount} ETB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
