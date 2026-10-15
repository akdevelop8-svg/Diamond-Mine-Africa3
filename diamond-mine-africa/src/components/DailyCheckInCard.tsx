import React, { useState } from 'react';
import { CalendarCheck, Sparkles, Check, Clock } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { isSupabaseConfigured } from '../services/supabase.ts';

export const DailyCheckInCard: React.FC = () => {
  const { currentUser, dailyCheckIns } = useStore();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentUser) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const userCheckIns = dailyCheckIns.filter((c) => c.userId === currentUser.id);
  const isCheckedInToday = userCheckIns.some((c) => c.dateStr === todayStr);

  // Sort by claimedAt descending
  const lastCheckIn = [...userCheckIns].sort(
    (a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()
  )[0];

  const handleClaim = () => {
    if (isSupabaseConfigured) { setFeedback('Check-in rewards are demonstration-only and are disabled for server wallets.'); return; }
    if (isCheckedInToday || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);

    const res = store.dailyCheckIn(currentUser.id);
    setFeedback(res.message);
    setIsSubmitting(false);

    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs relative overflow-hidden">
      {/* Decorative accent banner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-amber-50 rounded-full blur-2xl -z-10 pointer-events-none" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-slate-900">
                Daily Mining Check-In
              </h3>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                +1 ETB Daily
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Attendance reward in demonstration environment.
            </p>
          </div>
        </div>

        {/* Claim Action */}
        <button
          onClick={handleClaim}
          disabled={isSupabaseConfigured || isCheckedInToday || isSubmitting}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-xs ${
            isCheckedInToday
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white cursor-pointer'
          }`}
        >
          {isCheckedInToday ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Claimed</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSupabaseConfigured ? 'Demo only' : (isSubmitting ? 'Checking...' : 'Claim 1 ETB')}</span>
            </>
          )}
        </button>
      </div>

      {/* Status Info Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>
            {isCheckedInToday ? 'Today: Completed' : 'Today: Ready to claim'}
          </span>
        </div>

        <div>
          {lastCheckIn ? (
            <span>
              Last check-in: {new Date(lastCheckIn.claimedAt).toLocaleDateString()}
            </span>
          ) : (
            <span>No previous check-in</span>
          )}
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="mt-2.5 p-2 rounded-lg bg-blue-50 text-blue-800 text-xs font-medium border border-blue-200 transition-all animate-fadeIn"
        >
          {feedback}
        </div>
      )}
    </div>
  );
};
