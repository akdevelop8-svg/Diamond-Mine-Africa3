import React, { useCallback, useEffect, useState } from 'react';
import { X, CheckCircle2, ExternalLink, Sparkles, Gift, Lock, Eye, Share2 } from 'lucide-react';
import { PLATFORM_TASKS } from '../data/constants.ts';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';

type ServerTaskCompletion = {
  task_id: string;
  completed_at: string | null;
  claimed_at: string | null;
  reward_amount: number | string | null;
};

interface TaskCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMineralCatalogue: () => void;
  onOpenShare: () => void;
}

export const TaskCenterModal: React.FC<TaskCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenMineralCatalogue,
  onOpenShare,
}) => {
  const { currentUser, taskCompletions, allUsers } = useStore();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [serverCompletions, setServerCompletions] = useState<ServerTaskCompletion[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverLoadError, setServerLoadError] = useState('');
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const refreshServerCompletions = useCallback(async () => {
    if (!isOpen || !currentUser || !isSupabaseConfigured || !supabase) return;
    const profileId = currentUser.id;
    setServerLoading(true);
    setServerLoadError('');
    setServerCompletions([]);
    try {
      const { data, error } = await supabase
        .from('dma_task_completions')
        .select('task_id,completed_at,claimed_at,reward_amount')
        .eq('profile_id', profileId)
        .order('completed_at', { ascending: false });
      if (error) throw error;
      if (store.getState().currentUser?.id === profileId) {
        setServerCompletions((data ?? []) as ServerTaskCompletion[]);
      }
    } catch (error) {
      if (store.getState().currentUser?.id === profileId) {
        setServerLoadError(error instanceof Error ? error.message : 'Could not load task status from the server.');
      }
    } finally {
      if (store.getState().currentUser?.id === profileId) setServerLoading(false);
    }
  }, [isOpen, currentUser?.id]);

  useEffect(() => {
    void refreshServerCompletions();
  }, [refreshServerCompletions]);

  if (!isOpen || !currentUser) return null;

  const userCompletions = taskCompletions.filter((tc) => tc.userId === currentUser.id);

  // Check referral count for Task 3
  const directReferralsCount = allUsers.filter((u) => u.referredBy === currentUser.id).length;

  const completeServerTask = async (taskId: string): Promise<string> => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.rpc('dma_complete_platform_task', { p_task_id: taskId });
    if (error) throw error;
    const result = data as { success?: boolean; message?: string } | null;
    if (result?.success === false) throw new Error(result.message || 'The server did not accept this task.');
    await refreshServerCompletions();
    return result?.message || 'Task status saved to your account.';
  };

  const handleAction = async (task: typeof PLATFORM_TASKS[0]) => {
    setFeedback(null);

    if (isSupabaseConfigured) {
      setPendingTaskId(task.id);
      try {
        if (task.actionType === 'external_link' && task.targetUrl) {
          // Open the link before awaiting network calls so mobile browsers do not block the new tab.
          window.open(task.targetUrl, '_blank', 'noopener,noreferrer');
          const message = await completeServerTask(task.id);
          setFeedback(`${message} Opening the link does not independently verify channel membership.`);
        } else if (task.actionType === 'view_catalogue') {
          onOpenMineralCatalogue();
          const message = await completeServerTask(task.id);
          setFeedback(`${message} This records the catalogue action; it is not a paid-product purchase.`);
        } else if (task.actionType === 'share_invite') {
          try {
            const message = await completeServerTask(task.id);
            setFeedback(message);
          } catch (error) {
            onOpenShare();
            const detail = error instanceof Error ? error.message : 'The referral does not yet meet the server requirements.';
            setFeedback(`${detail}. Share your invitation, then return after the invited member has completed a qualifying approved recharge or active product purchase.`);
          }
        }
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Could not save task status to the server.');
      } finally {
        setPendingTaskId(null);
      }
      return;
    }

    if (task.actionType === 'external_link' && task.targetUrl) {
      window.open(task.targetUrl, '_blank', 'noopener,noreferrer');
      store.completeTask(currentUser.id, task.id);
      setFeedback('Channel link opened! Task marked as completed. You may now claim your reward.');
    } else if (task.actionType === 'view_catalogue') {
      onOpenMineralCatalogue();
      store.completeTask(currentUser.id, task.id);
    } else if (task.actionType === 'share_invite') {
      if (directReferralsCount >= 1) {
        store.completeTask(currentUser.id, task.id);
      } else {
        onOpenShare();
      }
    }
  };

  const handleClaim = async (taskId: string) => {
    setFeedback(null);
    if (pendingTaskId) return;

    if (isSupabaseConfigured) {
      if (!supabase) {
        setFeedback('Supabase is not configured. No reward was credited.');
        return;
      }
      const profileId = currentUser.id;
      setPendingTaskId(taskId);
      try {
        const { data, error } = await supabase.rpc('dma_claim_task_reward', { p_task_id: taskId });
        if (error) throw error;
        const result = data as {
          success?: boolean;
          already_claimed?: boolean;
          reward?: number | string;
          wallet_balance?: number | string;
          message?: string;
        } | null;
        setFeedback(result?.message || 'The server returned no task reward details.');

        // Re-read the authoritative wallet after a successful or already-claimed response.
        if (result?.success || result?.already_claimed) {
          const { data: balance, error: balanceError } = await supabase.rpc('dma_wallet_balance');
          if (!balanceError && balance !== null && balance !== undefined) {
            if (store.getState().currentUser?.id === profileId) {
              store.updateServerWalletBalance(Number(balance));
            }
          } else if (balanceError) {
            setFeedback(`${result.message || 'Task claim processed.'} Wallet balance refresh failed: ${balanceError.message}`);
          }
          await refreshServerCompletions();
        }
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : 'Could not claim the task reward.');
      } finally {
        setPendingTaskId(null);
      }
      return;
    }

    const res = store.claimTaskReward(currentUser.id, taskId);
    setFeedback(res.message);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Task Center & Activity Rewards
              </h3>
              <span className="text-[10px] text-blue-200">
                Complete platform tasks to earn activity bonuses
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Banner */}
        <div className="p-4 bg-blue-50/80 border-b border-blue-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-blue-900 font-bold block">Community Reward Tasks</span>
            <span className="text-blue-700 text-[11px]">
              Earn activity rewards by engaging with our platform
            </span>
          </div>
          <span className="font-display font-black text-blue-800 text-sm">
            Active Tasks
          </span>
        </div>

        {/* Task List */}
        <div className="p-5 overflow-y-auto space-y-3">
          {isSupabaseConfigured && serverLoading && (
            <p role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600 text-xs">Loading task records from your account…</p>
          )}
          {isSupabaseConfigured && serverLoadError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800 text-xs">Task history could not be loaded: {serverLoadError}</p>
          )}
          {PLATFORM_TASKS.map((task) => {
            const completion = userCompletions.find((tc) => tc.taskId === task.id);
            const serverCompletion = serverCompletions.find((tc) => tc.task_id === task.id);
            const isCompleted = isSupabaseConfigured
              ? Boolean(serverCompletion?.completed_at)
              : Boolean(completion?.isCompleted || (task.id === 'task-3' && directReferralsCount >= 1));
            const isClaimed = isSupabaseConfigured
              ? Boolean(serverCompletion?.claimed_at)
              : Boolean(completion?.isClaimed);

            if (task.category === 'unallocated') {
              return (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs space-y-1 opacity-75"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      {task.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
                      +{task.rewardETB} ETB
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {task.description}
                  </p>
                  <span className="inline-block text-[10px] text-amber-800 font-semibold bg-amber-100/60 px-2 py-0.5 rounded-md mt-1">
                    Unallocated bonus reserve pending official task definition
                  </span>
                </div>
              );
            }

            return (
              <div
                key={task.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-300 shadow-xs space-y-2 text-xs transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-display font-bold text-slate-900 text-sm">
                      {task.title}
                    </h4>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {task.description}
                    </p>
                  </div>
                  <span className="text-xs font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100 shrink-0 tabular-nums">
                    +{task.rewardETB} ETB
                  </span>
                </div>

                {/* Status & Action Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {isClaimed ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Claimed
                      </span>
                    ) : isCompleted ? (
                      <span className="text-blue-700 font-semibold">
                        Ready to claim
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Requirements pending
                      </span>
                    )}
                  </div>

                  {isClaimed ? (
                    <button
                      disabled
                      className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-[11px] border border-emerald-200"
                    >
                      Rewarded
                    </button>
                  ) : isCompleted ? (
                    <button
                      onClick={() => void handleClaim(task.id)}
                      disabled={pendingTaskId === task.id || serverLoading}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-[11px] shadow-xs active:scale-95 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      {pendingTaskId === task.id ? 'Processing…' : 'Claim Reward'}
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleAction(task)}
                      disabled={pendingTaskId === task.id || serverLoading}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      {task.actionType === 'external_link' && <ExternalLink className="w-3 h-3" />}
                      {task.actionType === 'view_catalogue' && <Eye className="w-3 h-3" />}
                      {task.actionType === 'share_invite' && <Share2 className="w-3 h-3" />}
                      <span>{task.actionLabel}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {feedback && (
            <div className="p-3 rounded-xl bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
              {feedback}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
