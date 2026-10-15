import React from 'react';
import { Gift, Zap, Award } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';

export const TeamRechargeRewardTable: React.FC = () => {
  const { teamRewards } = useStore();

  return (
    <div className="bg-white rounded-2xl border border-blue-200/90 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-4 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-1">
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>Recharge Your Team · Get Rewarded!</span>
        </div>
        <h3 className="font-display font-extrabold text-lg text-white">
          TEAM RECHARGE REWARD
        </h3>
        <p className="text-xs text-blue-200 mt-0.5">
          Reference Team Recharge Range: 15,000 – 250,000 ETB
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-blue-900 text-white font-bold text-center border-b border-blue-950">
              <th className="py-2.5 px-3 text-left">TEAM RECHARGE (ETB)</th>
              <th className="py-2.5 px-3 text-right">YOUR REWARD (ETB)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {teamRewards.map((tier, idx) => (
              <tr
                key={tier.id}
                className={idx % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-slate-50/60 hover:bg-blue-50/40'}
              >
                <td className="py-2.5 px-3 font-semibold text-slate-800 tabular-nums">
                  {tier.label}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="inline-block px-2.5 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-extrabold tabular-nums border border-amber-200">
                    +{tier.rewardETB.toLocaleString()} ETB
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Notes */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-600 flex items-center justify-center font-bold text-blue-700">
        <span>Together We Earn More · Diamond Mine Africa</span>
      </div>
    </div>
  );
};
