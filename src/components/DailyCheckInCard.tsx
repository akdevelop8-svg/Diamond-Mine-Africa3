import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Sparkles, Check, Clock } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';
import type { DailyCheckInRecord } from '../types.ts';

const addisAbabaDateKey = (date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

type ServerCheckinRow = {
  date_str: string;
  amount: number | string | null;
  claimed_at: string | null;
};

type ClaimResult = {
  success?: boolean;
  already_claimed?: boolean;
  message?: string;
  date?: string;
  claimed_at?: string;
  reward?: number;
};

export const DailyCheckInCard: React.FC = () => {
  const { currentUser, dailyCheckIns } = useStore();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [serverCheckIns, setServerCheckIns] = useState<DailyCheckInRecord[]>([]);

  const loadServerHistory = useCallback(async () => {
    if (!currentUser || !isSupabaseConfigured || !supabase) return;
    setIsLoadingHistory(true);
    setLoadError('');
    try {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('date_str,amount,claimed_at')
        .eq('profile_id', currentUser.id)
        .order('claimed_at', { ascending: false })
        .limit(365);
      if (error) throw error;
      const rows = (data ?? []) as ServerCheckinRow[];
      setServerCheckIns(rows.map((row) => ({
        userId: currentUser.id,
        dateStr: String(row.date_str),
        amount: Number(row.amount ?? 1),
        claimedAt: row.claimed_at ?? `${row.date_str}T00:00:00.000Z`,
      })));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load daily check-in history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) void loadServerHistory();
  }, [loadServerHistory]);

  if (!currentUser) return null;

  const todayStr = addisAbabaDateKey();
  const userCheckIns = isSupabaseConfigured
    ? serverCheckIns.filter((item) => item.userId === currentUser.id)
    : dailyCheckIns.filter((item) => item.userId === currentUser.id);
  const isCheckedInToday = userCheckIns.some((item) => item.dateStr === todayStr);
  const lastCheckIn = [...userCheckIns].sort(
    (a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime()
  )[0];

  const handleClaim = async () => {
    if (isCheckedInToday || isSubmitting || isLoadingHistory) return;
    setIsSubmitting(true);
    setFeedback(null);
    setLoadError('');

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.rpc('dma_claim_daily_checkin');
        if (error) throw error;
        const result = data as ClaimResult | null;
        if (!result) throw new Error('The check-in service returned no result. Apply the daily check-in SQL migration and try again.');
        if (result.already_claimed) {
          setFeedback(result.message || 'Today’s check-in has already been claimed. Please return tomorrow.');
          await loadServerHistory();
          return;
        }
        if (result.success !== true) {
          throw new Error(result.message || 'Daily check-in was not completed.');
        }

        const claimedAt = result.claimed_at || new Date().toISOString();
        const dateStr = result.date || todayStr;
        setServerCheckIns((previous) => {
          if (previous.some((item) => item.userId === currentUser.id && item.dateStr === dateStr)) return previous;
          return [{ userId: currentUser.id, dateStr, amount: Number(result.reward ?? 1), claimedAt }, ...previous];
        });
        setFeedback(result.message || 'Daily check-in saved. This is a demonstration reward, not withdrawable funds.');
      } else {
        const res = store.dailyCheckIn(currentUser.id);
        setFeedback(res.message);
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Daily check-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-xs relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-amber-50 rounded-full blur-2xl -z-10 pointer-events-none" />
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-bold text-sm text-slate-900">Daily Check-In</h3>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                +1 ETB demo reward
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">One check-in per day, recorded to your account.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleClaim()}
          disabled={isCheckedInToday || isSubmitting || isLoadingHistory}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 shadow-xs ${
            isCheckedInToday
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white cursor-pointer disabled:opacity-60'
          }`}
        >
          {isCheckedInToday ? <><Check className="w-3.5 h-3.5 stroke-[2.5]" /><span>Claimed</span></> : <><Sparkles className="w-3.5 h-3.5" /><span>{isLoadingHistory ? 'Loading…' : isSubmitting ? 'Saving…' : 'Claim'}</span></>}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /><span>{isCheckedInToday ? 'Today: Completed' : 'Today: Ready to claim'}</span></div>
        <div>{lastCheckIn ? <span>Last check-in: {new Date(lastCheckIn.claimedAt).toLocaleDateString()}</span> : <span>No previous check-in</span>}</div>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-slate-500">The check-in reward is currently a demonstration record and does not add withdrawable wallet funds.</p>
      {loadError && <div role="alert" className="mt-2.5 p-2 rounded-lg bg-rose-50 text-rose-800 text-xs font-medium border border-rose-200">Could not load check-in history: {loadError}</div>}
      {feedback && <div role="status" className="mt-2.5 p-2 rounded-lg bg-blue-50 text-blue-800 text-xs font-medium border border-blue-200">{feedback}</div>}
    </div>
  );
};
