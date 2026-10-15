import React from 'react';
import { Users, Crown, Sparkles, TrendingUp, ShieldCheck, Gem } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';

export const TeamCommissionInfographic: React.FC = () => {
  const { commissionRates } = useStore();

  const levels = [
    {
      level: 1,
      title: 'LEVEL 1',
      percentage: `${commissionRates.level1Percent}%`,
      subtitle: 'From your direct referrals',
      colorClass: 'from-amber-500 to-amber-600',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      borderClass: 'border-amber-300',
      iconColor: 'text-amber-500',
    },
    {
      level: 2,
      title: 'LEVEL 2',
      percentage: `${commissionRates.level2Percent}%`,
      subtitle: 'From your 2nd level team',
      colorClass: 'from-sky-500 to-blue-600',
      badgeClass: 'bg-sky-100 text-sky-900 border-sky-300',
      borderClass: 'border-sky-300',
      iconColor: 'text-sky-500',
    },
    {
      level: 3,
      title: 'LEVEL 3',
      percentage: `${commissionRates.level3Percent}%`,
      subtitle: 'From your 3rd level team',
      colorClass: 'from-emerald-500 to-teal-600',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      borderClass: 'border-emerald-300',
      iconColor: 'text-emerald-500',
    },
    {
      level: 4,
      title: 'LEVEL 4',
      percentage: `${commissionRates.level4Percent}%`,
      subtitle: 'From your 4th level team',
      colorClass: 'from-purple-500 to-indigo-600',
      badgeClass: 'bg-purple-100 text-purple-900 border-purple-300',
      borderClass: 'border-purple-300',
      iconColor: 'text-purple-500',
    },
  ];

  const totalPercent =
    commissionRates.level1Percent +
    commissionRates.level2Percent +
    commissionRates.level3Percent +
    commissionRates.level4Percent;

  return (
    <div className="w-full bg-slate-900 text-white rounded-3xl p-4 sm:p-6 shadow-xl border-2 border-amber-400/40 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="text-center relative z-10 mb-4 sm:mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>Build Your Team · Earn More</span>
        </div>
        <h3 className="font-display font-black text-2xl sm:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-white to-amber-300 tracking-tight">
          TEAM COMMISSION
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto mt-1">
          Stronger Together · Bigger Success
        </p>
      </div>

      {/* 4 Level Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 relative z-10">
        {levels.map((item) => (
          <div
            key={item.level}
            className={`rounded-2xl bg-slate-800/90 border-2 ${item.borderClass} p-3 sm:p-4 flex flex-col items-center text-center shadow-lg hover:scale-102 transition-transform`}
          >
            {/* Level Label */}
            <span
              className={`text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border mb-2 ${item.badgeClass}`}
            >
              {item.title}
            </span>

            {/* Percentage Display */}
            <div className="my-1">
              <span className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight tabular-nums">
                {item.percentage}
              </span>
            </div>

            {/* Subtitle */}
            <p className="text-[11px] text-slate-300 font-medium leading-tight mt-1">
              {item.subtitle}
            </p>
          </div>
        ))}
      </div>

      {/* Total Banner */}
      <div className="mt-4 sm:mt-5 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/30 to-amber-500/20 border border-amber-400/60 flex items-center justify-center gap-2 text-center relative z-10">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <span className="font-display font-black text-base sm:text-lg text-amber-300 tracking-wide">
          TOTAL: {totalPercent}% (Across 4 Levels)
        </span>
        <Sparkles className="w-4 h-4 text-amber-400" />
      </div>

      {/* Footer 3 Pillars */}
      <div className="mt-4 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px] sm:text-xs text-slate-300 relative z-10">
        <div className="flex flex-col items-center">
          <span className="font-bold text-amber-300">Teamwork</span>
          <span className="text-[10px] text-slate-400">Creates Wealth</span>
        </div>
        <div className="flex flex-col items-center border-x border-slate-800">
          <span className="font-bold text-amber-300">More Members</span>
          <span className="text-[10px] text-slate-400">More Rewards</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="font-bold text-amber-300">Build Team</span>
          <span className="text-[10px] text-slate-400">Build Future</span>
        </div>
      </div>
    </div>
  );
};
