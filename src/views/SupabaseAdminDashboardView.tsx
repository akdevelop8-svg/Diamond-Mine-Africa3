import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, CreditCard, RefreshCw, ShieldCheck, Users, ArrowLeft, AlertTriangle, Search, UserCheck, UserX, Settings, FileImage, Package, ClipboardList, Award, Crown, MessageSquare } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { supabase } from '../services/supabase.ts';

type AdminTab = 'overview' | 'users' | 'recharges' | 'withdrawals' | 'products' | 'tasks' | 'team_rewards' | 'manager_reward' | 'support' | 'ledger' | 'audit' | 'settings';
type ProfileRow = { id: string; user_id: string | null; name: string; phone: string; role: string | null; status: string | null; account_badge: string | null; created_at: string };
type RechargeRow = { id: string; profile_id: string; amount: number | string; provider: string; tx_reference: string; evidence_url: string | null; status: string; rejection_reason: string | null; created_at: string; reviewed_at: string | null };
type WithdrawalRow = { id: string; profile_id: string; amount: number | string; fee: number | string; net_amount: number | string; method: string; account_name: string; account_number: string; status: string; payout_reference: string | null; rejection_reason: string | null; created_at: string; reviewed_at: string | null };
type AuditRow = { id: string; admin_id: string; admin_name: string; action_type: string; details: string; reason: string | null; timestamp: string };
type WalletRow = { profile_id: string; available_balance: number | string; updated_at: string };
type LedgerRow = { id: string; profile_id: string; entry_type: string; amount: number | string; balance_after: number | string; related_type: string | null; related_id: string | null; description: string; created_at: string };
type PaymentRow = { id: string; provider: string; account_holder: string; account_number: string; instructions: string; version: number; is_active: boolean; updated_by: string; created_at: string };
type ProductRow = { id: string; tier: number; name: string; price: number | string; daily_return: number | string; period_days: number; illustrative_total: number | string; cut_name: string; is_available: boolean };
type TeamRewardRow = { id: string; label: string; min_recharge: number | string; max_recharge: number | string; reward_etb: number | string };
type ManagerRewardRow = { id: string; amount: number | string; criteria: string; period: string; status: string; updated_at: string | null; updated_by: string | null };
type TaskRow = { id: string; title: string; description: string; reward_etb: number | string; category: string; is_available: boolean; action_type: string };
type SupportRow = { id: string; profile_id: string; category: string; message: string; status: string; admin_response: string | null; created_at: string; updated_at: string | null };

const money = (value: number | string) => `${Number(value || 0).toLocaleString()} ETB`;
const date = (value?: string | null) => value ? new Date(value).toLocaleString() : '—';
const mask = (value: string) => value ? `•••• ${value.replace(/\s/g, '').slice(-4)}` : '—';

export const SupabaseAdminDashboardView: React.FC<{ onBackToCustomer: () => void }> = ({ onBackToCustomer }) => {
  const { currentUser } = useStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loadWarnings, setLoadWarnings] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [serverAdmin, setServerAdmin] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [recharges, setRecharges] = useState<RechargeRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<WalletRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [teamRewards, setTeamRewards] = useState<TeamRewardRow[]>([]);
  const [managerRewards, setManagerRewards] = useState<ManagerRewardRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportRow[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentRow | null>(null);
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!supabase) {
      setServerAdmin(false);
      setError('Supabase is not configured. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Vercel.');
      if (!quiet) setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    setError('');
    try {
      const { data: adminValue, error: adminError } = await supabase.rpc('is_admin');
      if (adminError) {
        setServerAdmin(false);
        throw new Error(`Could not verify admin permission: ${adminError.message}`);
      }
      const allowed = adminValue === true;
      setServerAdmin(allowed);
      if (!allowed) {
        throw new Error('Access denied by the database. The signed-in phone number must have role=admin in public.profiles. After changing the role, sign out and sign in again.');
      }

      // Load each dashboard section independently. A missing optional wallet table should
      // not prevent the administrator from viewing registered users, recharge requests,
      // withdrawals, payment settings, and audit history.
      const [p, r, w, a, cfg, wallet, ledger, prod, team, manager, taskRows, tickets] = await Promise.all([
        supabase.from('profiles').select('id,user_id,name,phone,role,status,account_badge,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('recharge_requests').select('id,profile_id,amount,provider,tx_reference,evidence_url,status,rejection_reason,created_at,reviewed_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('withdrawal_requests').select('id,profile_id,amount,fee,net_amount,method,account_name,account_number,status,payout_reference,rejection_reason,created_at,reviewed_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('audit_logs').select('id,admin_id,admin_name,action_type,details,reason,timestamp').order('timestamp', { ascending: false }).limit(200),
        supabase.from('business_payment_config').select('id,provider,account_holder,account_number,instructions,version,is_active,updated_by,created_at').ilike('provider', '%CBE%').order('version', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('wallet_accounts').select('profile_id,available_balance,updated_at').order('updated_at', { ascending: false }).limit(1000),
        supabase.from('wallet_ledger').select('id,profile_id,entry_type,amount,balance_after,related_type,related_id,description,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('products').select('id,tier,name,price,daily_return,period_days,illustrative_total,cut_name,is_available').order('tier', { ascending: true }),
        supabase.from('team_reward_tiers').select('id,label,min_recharge,max_recharge,reward_etb').order('min_recharge', { ascending: true }),
        supabase.from('manager_reward_config').select('id,amount,criteria,period,status,updated_at,updated_by').order('updated_at', { ascending: false }).limit(20),
        supabase.from('platform_tasks').select('id,title,description,reward_etb,category,is_available,action_type').order('title', { ascending: true }),
        supabase.from('support_tickets').select('id,profile_id,category,message,status,admin_response,created_at,updated_at').order('created_at', { ascending: false }).limit(300),
      ]);

      const warnings: string[] = [];
      if (p.error) warnings.push(`Users: ${p.error.message}`);
      else setProfiles((p.data ?? []) as ProfileRow[]);
      if (r.error) warnings.push(`Recharge requests: ${r.error.message}`);
      else setRecharges((r.data ?? []) as RechargeRow[]);
      if (w.error) warnings.push(`Withdrawal requests: ${w.error.message}`);
      else setWithdrawals((w.data ?? []) as WithdrawalRow[]);
      if (a.error) warnings.push(`Audit log: ${a.error.message}`);
      else setAuditLogs((a.data ?? []) as AuditRow[]);
      if (cfg.error) warnings.push(`Payment settings: ${cfg.error.message}`);
      else {
        const payment = (cfg.data ?? null) as PaymentRow | null;
        setPaymentConfig(payment);
        if (payment) {
          setAccountHolder(payment.account_holder || '');
          setAccountNumber(payment.account_number || '');
          setPaymentInstructions(payment.instructions || '');
        }
      }
      if (wallet.error) {
        warnings.push(`Wallet balances: ${wallet.error.message}. The wallet migration or its RLS policy may be missing.`);
      } else setWalletAccounts((wallet.data ?? []) as WalletRow[]);
      if (ledger.error) {
        warnings.push(`Wallet ledger: ${ledger.error.message}. The wallet migration or its RLS policy may be missing.`);
      } else setLedgerRows((ledger.data ?? []) as LedgerRow[]);
      if (prod.error) warnings.push(`VIP products: ${prod.error.message}`);
      else setProducts((prod.data ?? []) as ProductRow[]);
      if (team.error) warnings.push(`Team rewards: ${team.error.message}`);
      else setTeamRewards((team.data ?? []) as TeamRewardRow[]);
      if (manager.error) warnings.push(`Manager rewards: ${manager.error.message}`);
      else setManagerRewards((manager.data ?? []) as ManagerRewardRow[]);
      if (taskRows.error) warnings.push(`Platform tasks: ${taskRows.error.message}`);
      else setTasks((taskRows.data ?? []) as TaskRow[]);
      if (tickets.error) warnings.push(`Support tickets: ${tickets.error.message}`);
      else setSupportTickets((tickets.data ?? []) as SupportRow[]);
      setLoadWarnings(warnings);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not verify administrator access.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Keep the admin queues current while multiple members submit requests.
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const walletByProfile = useMemo(() => new Map(walletAccounts.map((w) => [w.profile_id, Number(w.available_balance) || 0])), [walletAccounts]);
  const nonAdminUsers = useMemo(() => profiles.filter((p) => p.role !== 'admin'), [profiles]);
  const pendingRecharges = recharges.filter((r) => ['pending_verification', 'submitted', 'under_review'].includes(r.status));
  const pendingWithdrawals = withdrawals.filter((r) => ['pending_verification', 'submitted', 'under_review'].includes(r.status));
  const filteredUsers = nonAdminUsers.filter((p) => `${p.name} ${p.phone} ${p.id}`.toLowerCase().includes(query.toLowerCase()));
  const openTickets = supportTickets.filter((t) => t.status !== 'Resolved').length;
  const activeProducts = products.filter((p) => p.is_available).length;

  const rejectRequest = async (kind: 'recharge' | 'withdrawal', requestId: string) => {
    if (!supabase) return;
    const reason = window.prompt(`Reason for rejecting ${requestId}:`);
    if (!reason?.trim()) return;
    setWorkingId(requestId); setError(''); setNotice('');
    try {
      const rpcName = kind === 'recharge' ? 'dma_admin_reject_recharge' : 'dma_admin_reject_withdrawal';
      const { error: rpcError } = await supabase.rpc(rpcName, { p_request_id: requestId, p_reason: reason.trim() });
      if (rpcError) throw rpcError;
      setNotice(`${requestId} was rejected. ${kind === 'withdrawal' ? 'The reserved wallet amount was returned.' : 'No wallet credit was created.'}`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not reject the request.'); }
    finally { setWorkingId(null); }
  };

  const approveRecharge = async (request: RechargeRow) => {
    if (!supabase) return;
    const verifiedReference = window.prompt(`Enter the transaction code exactly as shown in the CBE bank statement for ${request.id}:`, request.tx_reference);
    if (!verifiedReference?.trim()) return;
    const amountInput = window.prompt(`Enter the amount independently confirmed in the bank account (ETB) for ${request.id}:`, String(Number(request.amount)));
    if (!amountInput?.trim() || !Number.isFinite(Number(amountInput))) return;
    const note = window.prompt('Optional admin note (leave blank if none):') || '';
    if (!window.confirm(`Only continue if you personally confirmed this transfer in the CBE account. Credit ${money(request.amount)} to the user's wallet now?`)) return;
    setWorkingId(request.id); setError(''); setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('dma_admin_approve_recharge', {
        p_request_id: request.id, p_confirmed_amount: Number(amountInput),
        p_verified_tx_reference: verifiedReference.trim(), p_note: note.trim() || null,
      });
      if (rpcError) throw rpcError;
      setNotice(`${request.id} accepted. Wallet credit and audit log were written atomically by the database.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not accept the recharge.'); }
    finally { setWorkingId(null); }
  };

  const markWithdrawalPaid = async (request: WithdrawalRow) => {
    if (!supabase) return;
    const payoutReference = window.prompt(`Enter the real CBE/Telebirr transfer reference AFTER you have sent ${money(request.net_amount)} to the saved destination for ${request.id}:`);
    if (!payoutReference?.trim()) return;
    if (!window.confirm(`Have you already transferred ${money(request.net_amount)} to ${request.account_name} (${request.method}, account ending ${request.account_number.slice(-4)})? Do not mark paid before the transfer succeeds.`)) return;
    setWorkingId(request.id); setError(''); setNotice('');
    try {
      const { error: rpcError } = await supabase.rpc('dma_admin_mark_withdrawal_paid', {
        p_request_id: request.id, p_payout_reference: payoutReference.trim(), p_note: 'Manually paid by administrator after bank transfer verification',
      });
      if (rpcError) throw rpcError;
      setNotice(`${request.id} marked paid and audit logged. This UI does not send the transfer automatically.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not mark withdrawal paid.'); }
    finally { setWorkingId(null); }
  };

  const openReceipt = async (request: RechargeRow) => {
    if (!supabase || !request.evidence_url) { setError('No receipt file is attached to this request.'); return; }
    setError('');
    try {
      const { data, error: signedUrlError } = await supabase.storage.from('recharge-receipts').createSignedUrl(request.evidence_url, 300);
      if (signedUrlError || !data?.signedUrl) throw signedUrlError || new Error('Could not create a secure receipt link.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not open receipt.'); }
  };

  const saveCbeSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase || savingSettings) return;
    if (!window.confirm('Save this as the current CBE payment account? All authenticated customers will see the new details. Keep live-money operations disabled until the account and compliance checks are complete.')) return;
    setSavingSettings(true); setError(''); setNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('dma_admin_set_cbe_account', {
        p_account_holder: accountHolder.trim(), p_account_number: accountNumber.trim(), p_instructions: paymentInstructions.trim() || null,
      });
      if (rpcError) throw rpcError;
      setNotice(`CBE payment account version ${data} saved.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save payment account settings.'); }
    finally { setSavingSettings(false); }
  };

  const setUserStatus = async (profile: ProfileRow, nextStatus: 'active' | 'warned' | 'suspended') => {
    if (!supabase || !currentUser) return;
    const reason = window.prompt(`Reason for setting ${profile.name} to ${nextStatus}:`);
    if (!reason?.trim()) return;
    setWorkingId(profile.id); setError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', profile.id);
      if (updateError) throw updateError;
      const { error: auditError } = await supabase.from('audit_logs').insert({
        id: `ADM-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
        admin_id: currentUser.id,
        admin_name: currentUser.name,
        action_type: 'PROFILE_STATUS_CHANGED',
        details: `Changed status for ${profile.name} (${profile.id}) to ${nextStatus}.`,
        reason: reason.trim(),
      });
      if (auditError) throw new Error(`Status changed, but audit record failed: ${auditError.message}`);
      setNotice(`Updated ${profile.name} to ${nextStatus}.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update user.'); }
    finally { setWorkingId(null); }
  };

  const recordAudit = async (actionType: string, details: string, reason: string | null = null) => {
    if (!supabase || !currentUser) return 'The admin session is not available for audit logging.';
    const { error: auditError } = await supabase.from('audit_logs').insert({
      id: `ADM-${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
      admin_id: currentUser.id,
      admin_name: currentUser.name,
      action_type: actionType,
      details,
      reason,
    });
    return auditError?.message || '';
  };

  const editProduct = async (product: ProductRow) => {
    if (!supabase) return;
    const priceText = window.prompt(`VIP ${product.tier} price in ETB:`, String(Number(product.price)));
    if (priceText === null) return;
    const dailyText = window.prompt(`VIP ${product.tier} displayed daily figure in ETB:`, String(Number(product.daily_return)));
    if (dailyText === null) return;
    const periodText = window.prompt(`VIP ${product.tier} duration in days:`, String(product.period_days));
    if (periodText === null) return;
    const availableText = window.prompt('Availability: type ON or OFF', product.is_available ? 'ON' : 'OFF');
    if (availableText === null) return;
    const price = Number(priceText), daily = Number(dailyText), days = Number(periodText);
    const availability = availableText.trim().toUpperCase();
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(daily) || daily <= 0 || !Number.isInteger(days) || days < 1 || !['ON', 'OFF'].includes(availability)) {
      setError('Invalid VIP settings. Price and daily figure must be positive, duration must be a whole number, and availability must be ON or OFF.');
      return;
    }
    if (!window.confirm('Save these values as staging display settings? They are not verified mining output or guaranteed returns.')) return;
    setWorkingId(product.id); setError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('products').update({
        price,
        daily_return: daily,
        period_days: days,
        illustrative_total: Number((daily * days).toFixed(2)),
        is_available: availability === 'ON',
      }).eq('id', product.id);
      if (updateError) throw updateError;
      const auditWarning = await recordAudit('VIP_PRODUCT_UPDATED', `Updated staging settings for VIP ${product.tier} (${product.name}).`, null);
      setNotice(`VIP ${product.tier} settings saved.${auditWarning ? ` Audit warning: ${auditWarning}` : ''}`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the VIP product.'); }
    finally { setWorkingId(null); }
  };

  const editTeamReward = async (tier: TeamRewardRow) => {
    if (!supabase) return;
    const label = window.prompt('Reward tier label:', tier.label);
    if (label === null) return;
    const minText = window.prompt('Minimum qualifying team recharge (ETB):', String(Number(tier.min_recharge)));
    if (minText === null) return;
    const maxText = window.prompt('Maximum qualifying team recharge (ETB):', String(Number(tier.max_recharge)));
    if (maxText === null) return;
    const rewardText = window.prompt('Reward amount (ETB):', String(Number(tier.reward_etb)));
    if (rewardText === null) return;
    const min = Number(minText), max = Number(maxText), reward = Number(rewardText);
    if (!label.trim() || !Number.isFinite(min) || !Number.isFinite(max) || !Number.isFinite(reward) || min < 0 || max < min || reward < 0) {
      setError('Invalid team reward values. Ensure the label is not empty, all amounts are valid, and maximum is at least minimum.');
      return;
    }
    setWorkingId(tier.id); setError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('team_reward_tiers').update({ label: label.trim(), min_recharge: min, max_recharge: max, reward_etb: reward }).eq('id', tier.id);
      if (updateError) throw updateError;
      const auditWarning = await recordAudit('TEAM_REWARD_TIER_UPDATED', `Updated team reward tier ${tier.id} (${label.trim()}).`);
      setNotice(`Team reward tier saved.${auditWarning ? ` Audit warning: ${auditWarning}` : ''}`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the team reward tier.'); }
    finally { setWorkingId(null); }
  };

  const editManagerReward = async (config: ManagerRewardRow) => {
    if (!supabase) return;
    const amountText = window.prompt('Manager reward amount (ETB):', String(Number(config.amount)));
    if (amountText === null) return;
    const criteria = window.prompt('Eligibility criteria:', config.criteria);
    if (criteria === null) return;
    const period = window.prompt('Evaluation period:', config.period);
    if (period === null) return;
    const status = window.prompt('Status (Active, Under Review, Configured):', config.status);
    if (status === null) return;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount < 0 || !criteria.trim() || !period.trim() || !['Active', 'Under Review', 'Configured'].includes(status.trim())) {
      setError('Invalid manager reward settings. Check amount, criteria, period, and status.');
      return;
    }
    setWorkingId(config.id); setError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('manager_reward_config').update({ amount, criteria: criteria.trim(), period: period.trim(), status: status.trim(), updated_at: new Date().toISOString(), updated_by: currentUser?.id ?? null }).eq('id', config.id);
      if (updateError) throw updateError;
      const auditWarning = await recordAudit('MANAGER_REWARD_UPDATED', `Updated manager reward configuration ${config.id}.`);
      setNotice(`Manager reward settings saved.${auditWarning ? ` Audit warning: ${auditWarning}` : ''}`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update manager reward settings.'); }
    finally { setWorkingId(null); }
  };

  const createManagerReward = async () => {
    if (!supabase) return;
    const amountText = window.prompt('Initial manager reward amount (ETB):', '25000');
    if (amountText === null) return;
    const criteria = window.prompt('Eligibility criteria:', 'To be defined by administrator');
    if (criteria === null) return;
    const period = window.prompt('Evaluation period:', 'Monthly');
    if (period === null) return;
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount < 0 || !criteria.trim() || !period.trim()) { setError('Enter a valid amount, criteria, and period.'); return; }
    setWorkingId('manager-new'); setError(''); setNotice('');
    try {
      const id = `MGR-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
      const { error: insertError } = await supabase.from('manager_reward_config').insert({ id, amount, criteria: criteria.trim(), period: period.trim(), status: 'Configured', updated_by: currentUser?.id ?? null });
      if (insertError) throw insertError;
      const auditWarning = await recordAudit('MANAGER_REWARD_CREATED', `Created manager reward configuration ${id}.`);
      setNotice(`Manager reward configuration created.${auditWarning ? ` Audit warning: ${auditWarning}` : ''}`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create manager reward settings.'); }
    finally { setWorkingId(null); }
  };

  const editTask = async (task: TaskRow) => {
    if (!supabase) return;
    const title = window.prompt('Task title:', task.title);
    if (title === null) return;
    const description = window.prompt('Task description:', task.description);
    if (description === null) return;
    const rewardText = window.prompt('Displayed reward in ETB:', String(Number(task.reward_etb)));
    if (rewardText === null) return;
    const reward = Number(rewardText);
    if (!title.trim() || !description.trim() || !Number.isFinite(reward) || reward < 0) { setError('Enter a task title, description, and a valid non-negative reward.'); return; }
    setWorkingId(task.id); setError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('platform_tasks').update({ title: title.trim(), description: description.trim(), reward_etb: reward }).eq('id', task.id);
      if (updateError) throw updateError;
      const auditWarning = await recordAudit('PLATFORM_TASK_UPDATED', `Updated platform task ${task.id}.`);
      setNotice(`Task saved.${auditWarning ? ` Audit warning: ${auditWarning}` : ''}`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the task.'); }
    finally { setWorkingId(null); }
  };

  const toggleTask = async (task: TaskRow) => {
    if (!supabase) return;
    setWorkingId(task.id); setError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('platform_tasks').update({ is_available: !task.is_available }).eq('id', task.id);
      if (updateError) throw updateError;
      const auditWarning = await recordAudit('PLATFORM_TASK_AVAILABILITY_CHANGED', `${task.id} availability set to ${!task.is_available}.`);
      setNotice(`Task availability updated.${auditWarning ? ` Audit warning: ${auditWarning}` : ''}`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not change task availability.'); }
    finally { setWorkingId(null); }
  };

  const replyToTicket = async (ticket: SupportRow) => {
    if (!supabase) return;
    const response = window.prompt('Admin reply to customer:', ticket.admin_response || '');
    if (response === null) return;
    const status = window.prompt('Status must be Open, In Progress, or Resolved:', ticket.status);
    if (status === null) return;
    const cleanStatus = status.trim();
    if (!['Open', 'In Progress', 'Resolved'].includes(cleanStatus) || !response.trim()) {
      setError('Enter a non-empty reply and a valid status: Open, In Progress, or Resolved.');
      return;
    }
    setWorkingId(ticket.id); setError(''); setNotice('');
    try {
      const { error: updateError } = await supabase.from('support_tickets').update({ admin_response: response.trim(), status: cleanStatus, updated_at: new Date().toISOString() }).eq('id', ticket.id);
      if (updateError) throw updateError;
      const auditWarning = await recordAudit('SUPPORT_TICKET_REPLIED', `Replied to support ticket ${ticket.id}; status ${cleanStatus}.`);
      setNotice(`Support reply saved.${auditWarning ? ` Audit warning: ${auditWarning}` : ''}`);
      await load(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the support reply.'); }
    finally { setWorkingId(null); }
  };

  const statusPill = (status: string | null) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${status === 'active' || status === 'approved' || status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'suspended' || status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{status || 'unknown'}</span>;

  if (!serverAdmin && !loading) {
    return <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center"><div className="max-w-md rounded-2xl bg-white border p-6"><ShieldCheck className="h-8 w-8 text-rose-600"/><h1 className="mt-3 text-lg font-bold">Admin access required</h1><p className="mt-2 text-sm text-slate-600">{error || 'The database did not authorize this account as an administrator.'}</p><button onClick={onBackToCustomer} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Back to customer app</button></div></div>;
  }

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity }, { id: 'users', label: `Users (${nonAdminUsers.length})`, icon: Users },
    { id: 'recharges', label: `Recharges (${pendingRecharges.length})`, icon: CreditCard }, { id: 'withdrawals', label: `Withdrawals (${pendingWithdrawals.length})`, icon: ArrowDownRight },
    { id: 'products', label: 'VIP Products', icon: Package }, { id: 'tasks', label: 'Tasks', icon: ClipboardList },
    { id: 'team_rewards', label: 'Team Rewards', icon: Award }, { id: 'manager_reward', label: 'Manager Reward', icon: Crown },
    { id: 'support', label: `Support (${openTickets})`, icon: MessageSquare }, { id: 'ledger', label: 'Wallet ledger', icon: Activity },
    { id: 'audit', label: 'Audit log', icon: ShieldCheck }, { id: 'settings', label: 'Payment settings', icon: Settings },
  ];

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Diamond Mine Africa</p><h1 className="text-lg font-extrabold">Admin Dashboard</h1><p className="text-xs text-slate-500">Signed in as {currentUser?.name || 'administrator'}</p></div>
        <div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}/> Refresh</button><button onClick={onBackToCustomer} className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"><ArrowLeft className="h-3.5 w-3.5"/> Customer app</button></div>
      </div>
    </header>
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-5">
      <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="text-sm font-extrabold">Financial operations are not live</p><p className="mt-1 text-xs leading-5">This staging page uses database-side review functions for manual recharge approval, wallet ledger crediting and withdrawal request control. It does not initiate bank transfers, verify bank records automatically, or make VIP mining returns real. Do not accept real funds until security, account ownership and compliance reviews are complete.</p></div></div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      {loadWarnings.length > 0 && <section role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950"><p className="font-extrabold">Some dashboard sections could not load</p><p className="mt-1">The dashboard remains open, but the sections listed below need their Supabase tables, columns, or Row Level Security policies checked.</p><ul className="mt-2 list-disc space-y-1 pl-5">{loadWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p className="mt-2">Do not approve or pay requests unless the server-side financial migration and review functions are installed and working.</p></section>}
      <nav className="flex gap-2 overflow-x-auto pb-1">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTab(item.id); setQuery(''); }} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold ${tab === item.id ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}><Icon className="h-4 w-4"/>{item.label}</button>; })}</nav>
      {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading Supabase records…</div> : <>
        {tab === 'overview' && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Registered users', String(nonAdminUsers.length), Users], ['Pending recharges', String(pendingRecharges.length), CreditCard], ['Pending withdrawals', String(pendingWithdrawals.length), ArrowDownRight], ['Active VIP products', String(activeProducts), Package], ['Open support tickets', String(openTickets), MessageSquare], ['Wallet ledger entries', String(ledgerRows.length), Activity], ['Audit entries', String(auditLogs.length), ShieldCheck]].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon className="h-5 w-5 text-blue-600"/><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>)}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2 lg:col-span-4"><h2 className="font-bold">System status</h2><p className="mt-1 text-sm text-slate-600">Database admin verification succeeded. Requests shown here are only those actually saved in Supabase; local-browser demo records are not shared and will not appear.</p></div>
        </div>}
        {tab === 'users' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-extrabold">Registered users</h2><p className="text-xs text-slate-500">This changes the stored status flag; it does not delete the account or replace a full account-revocation process.</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name / phone / ID" className="rounded-xl border py-2 pl-9 pr-3 text-sm"/></div></div><div className="divide-y">{filteredUsers.map((p) => <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-bold">{p.name} {statusPill(p.status)}</p><p className="mt-1 break-all text-xs text-slate-500">{p.phone} · {p.id}</p><p className="mt-1 text-xs font-bold text-blue-700">Wallet: {money(walletByProfile.get(p.id) ?? 0)}</p><p className="mt-1 text-[11px] text-slate-400">Joined {date(p.created_at)} · {p.account_badge || 'Standard Member'}</p></div><div className="flex flex-wrap gap-2"><button disabled={workingId === p.id || p.status === 'active'} onClick={() => void setUserStatus(p, 'active')} className="flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-bold disabled:opacity-40"><UserCheck className="h-3.5 w-3.5"/> Activate</button><button disabled={workingId === p.id || p.status === 'warned'} onClick={() => void setUserStatus(p, 'warned')} className="rounded-lg border border-amber-200 px-2.5 py-2 text-[11px] font-bold text-amber-800 disabled:opacity-40">Warn</button><button disabled={workingId === p.id || p.status === 'suspended'} onClick={() => void setUserStatus(p, 'suspended')} className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-40"><UserX className="h-3.5 w-3.5"/> Suspend</button></div></div>)}{filteredUsers.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No users found.</p>}</div></section>}
        {tab === 'recharges' && <section className="rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Recharge requests · manual bank verification</h2><p className="mt-1 text-xs text-slate-500">Open the private receipt, confirm the transaction in CBE, then Accept to credit the wallet once, or Reject with a reason.</p></div><div className="divide-y">{recharges.map((r) => { const p = profileById.get(r.profile_id); const canReview = ['pending_verification','under_review','submitted'].includes(r.status); return <article key={r.id} className="space-y-1 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{r.id} · {money(r.amount)}</p>{statusPill(r.status)}</div><p className="text-xs text-slate-600">{p?.name || 'Unknown profile'} · {p?.phone || r.profile_id}</p><p className="text-xs text-slate-600">{r.provider} · Customer code: <span className="font-mono font-bold">{r.tx_reference}</span></p><p className="text-[11px] text-slate-400">Submitted {date(r.created_at)} · Reviewed {date(r.reviewed_at)}</p>{r.rejection_reason && <p className="text-xs text-rose-700">Reason: {r.rejection_reason}</p>}<div className="flex flex-wrap gap-2 pt-2"><button disabled={workingId === r.id || !r.evidence_url} onClick={() => void openReceipt(r)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-40"><FileImage className="h-3.5 w-3.5"/> View receipt</button><button disabled={workingId === r.id || !canReview} onClick={() => void approveRecharge(r)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">Accept + credit wallet</button><button disabled={workingId === r.id || !canReview} onClick={() => void rejectRequest('recharge', r.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-40">Reject</button></div></article>; })}{recharges.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No recharge records have been saved to Supabase yet.</p>}</div></section>}
        {tab === 'withdrawals' && <section className="rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Withdrawal requests · manual payout</h2><p className="mt-1 text-xs text-slate-500">The requested amount is reserved on submission. Reject returns it to wallet; Mark Paid is only for a transfer already completed outside this app.</p></div><div className="divide-y">{withdrawals.map((r) => { const p = profileById.get(r.profile_id); const canReview = ['pending_verification','under_review','submitted'].includes(r.status); return <article key={r.id} className="space-y-1 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{r.id} · {money(r.amount)}</p>{statusPill(r.status)}</div><p className="text-xs text-slate-600">{p?.name || 'Unknown profile'} · {p?.phone || r.profile_id}</p><p className="text-xs text-slate-600">{r.method} · {r.account_name} · {mask(r.account_number)} · Net payout {money(r.net_amount)} (8% fee {money(r.fee)})</p><p className="text-[11px] text-slate-400">Submitted {date(r.created_at)} · Reviewed {date(r.reviewed_at)}</p>{r.payout_reference && <p className="text-xs text-emerald-700">Payout reference: {r.payout_reference}</p>}{r.rejection_reason && <p className="text-xs text-rose-700">Reason: {r.rejection_reason}</p>}<div className="flex flex-wrap gap-2 pt-2"><button disabled={workingId === r.id || !canReview} onClick={() => void markWithdrawalPaid(r)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">Mark Paid (after transfer)</button><button disabled={workingId === r.id || !canReview} onClick={() => void rejectRequest('withdrawal', r.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-40">Reject + return balance</button></div></article>; })}{withdrawals.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No withdrawal records have been saved to Supabase yet.</p>}</div></section>}
        {tab === 'products' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-extrabold">VIP products · catalogue settings</h2><p className="mt-1 text-xs leading-5 text-amber-800">These values are staging display settings only. They are not verified mining output or guaranteed returns. Changes affect the catalogue customers see.</p></div><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{products.map((p) => <article key={p.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-extrabold text-blue-700">VIP {p.tier} · {p.name}</p><p className="mt-1 text-xs text-slate-500">{p.cut_name}</p></div>{statusPill(p.is_available ? 'active' : 'suspended')}</div><div className="mt-3 space-y-1 text-sm"><p>Price: <strong>{money(p.price)}</strong></p><p>Daily display: <strong>{money(p.daily_return)}</strong></p><p>Duration: <strong>{p.period_days} days</strong></p><p>Illustrative total: <strong>{money(Number(p.daily_return) * Number(p.period_days))}</strong></p></div><button disabled={workingId === p.id} onClick={() => void editProduct(p)} className="mt-4 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Edit VIP settings</button></article>)}{products.length === 0 && <p className="p-4 text-sm text-slate-500">No product catalogue rows are available in Supabase.</p>}</div></section>}
        {tab === 'tasks' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Task center settings</h2><p className="mt-1 text-xs text-slate-500">Manage task wording and availability. Reward claims remain subject to the platform's staging restrictions.</p></div><div className="divide-y">{tasks.map((t) => <article key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold">{t.title}</p>{statusPill(t.is_available ? 'active' : 'suspended')}</div><p className="mt-1 text-xs text-slate-600">{t.description}</p><p className="mt-1 text-[11px] text-slate-500">{t.category} · {t.action_type} · Displayed reward {money(t.reward_etb)}</p><p className="text-[10px] text-slate-400">ID: {t.id}</p></div><div className="flex shrink-0 flex-wrap gap-2"><button disabled={workingId === t.id} onClick={() => void editTask(t)} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">Edit task</button><button disabled={workingId === t.id} onClick={() => void toggleTask(t)} className={`rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${t.is_available ? 'bg-rose-600' : 'bg-emerald-600'}`}>{t.is_available ? 'Disable' : 'Enable'}</button></div></article>)}{tasks.length === 0 && <p className="p-4 text-sm text-slate-500">No platform tasks are configured.</p>}</div></section>}
        {tab === 'team_rewards' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Team recharge reward tiers</h2><p className="mt-1 text-xs text-slate-500">These are the configured team recharge tiers in Supabase; they are separate from level-based referral percentages.</p></div><div className="divide-y">{teamRewards.map((tier) => <article key={tier.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{tier.label}</p><p className="mt-1 text-xs text-slate-500">Qualifying recharge: {money(tier.min_recharge)} – {money(tier.max_recharge)}</p><p className="text-sm font-extrabold text-amber-700">Reward: {money(tier.reward_etb)}</p><p className="text-[10px] text-slate-400">Tier ID: {tier.id}</p></div><button disabled={workingId === tier.id} onClick={() => void editTeamReward(tier)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Edit reward tier</button></article>)}{teamRewards.length === 0 && <p className="p-4 text-sm text-slate-500">No team reward tiers are configured.</p>}</div></section>}
        {tab === 'manager_reward' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-extrabold">Manager reward configuration</h2><p className="mt-1 text-xs text-slate-500">Review reward amount, criteria, period, and configuration status.</p></div>{managerRewards.length === 0 && <button disabled={workingId === 'manager-new'} onClick={() => void createManagerReward()} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Create configuration</button>}</div><div className="divide-y">{managerRewards.map((m) => <article key={m.id} className="space-y-2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-extrabold">{money(m.amount)}</p>{statusPill(m.status)}</div><p className="text-sm text-slate-700">{m.criteria}</p><p className="text-xs text-slate-500">Period: {m.period} · Last updated {date(m.updated_at)}</p><p className="text-[10px] text-slate-400">ID: {m.id} · Updated by {m.updated_by || '—'}</p><button disabled={workingId === m.id} onClick={() => void editManagerReward(m)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Edit manager reward</button></article>)}{managerRewards.length === 0 && <p className="p-4 text-sm text-slate-500">No manager reward configuration exists yet.</p>}</div></section>}
        {tab === 'support' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Customer support desk</h2><p className="mt-1 text-xs text-slate-500">Reply to customer questions and update ticket status.</p></div><div className="divide-y">{supportTickets.map((t) => { const p = profileById.get(t.profile_id); return <article key={t.id} className="space-y-2 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">#{t.id} · {p?.name || 'Unknown user'} ({p?.phone || t.profile_id})</p>{statusPill(t.status === 'Resolved' ? 'completed' : t.status === 'In Progress' ? 'under_review' : 'pending_verification')}</div><p className="text-[11px] text-slate-500">Category: {t.category} · Submitted {date(t.created_at)}</p><p className="whitespace-pre-wrap text-sm text-slate-700">{t.message}</p>{t.admin_response && <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs"><strong>Current response:</strong><p className="mt-1 whitespace-pre-wrap">{t.admin_response}</p></div>}<div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><p className="text-[11px] text-slate-500">Status: {t.status} · Updated {date(t.updated_at)}</p><button disabled={workingId === t.id} onClick={() => void replyToTicket(t)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Reply / update</button></div></article>; })}{supportTickets.length === 0 && <p className="p-4 text-sm text-slate-500">No support tickets have been saved yet.</p>}</div></section>}
        {tab === 'settings' && <section className="max-w-2xl rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-extrabold">CBE recharge account settings</h2><p className="mt-1 text-xs text-slate-500">Saving creates a new version and makes it visible to authenticated customers. Do not use a personal account or publish collection details until ownership, business purpose and compliance have been independently confirmed.</p></div><form onSubmit={(e) => void saveCbeSettings(e)} className="space-y-4 p-4"><div><label className="mb-1 block text-xs font-bold">Account holder name</label><input required minLength={2} maxLength={255} value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Verified account holder" /></div><div><label className="mb-1 block text-xs font-bold">CBE account number</label><input required minLength={6} maxLength={60} inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 font-mono text-sm" placeholder="Account number" /></div><div><label className="mb-1 block text-xs font-bold">Customer instructions</label><textarea value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Explain what customers should verify before payment" /></div>{paymentConfig && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Current version: v{paymentConfig.version} · {paymentConfig.provider} · {paymentConfig.is_active ? 'Active' : 'Inactive'} · Account ending {paymentConfig.account_number.slice(-4)}</p>}<button type="submit" disabled={savingSettings || !accountHolder.trim() || !accountNumber.trim()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{savingSettings ? 'Saving…' : 'Save new CBE account version'}</button></form></section>}
        {tab === 'ledger' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Server-side wallet ledger</h2><p className="mt-1 text-xs text-slate-500">Immutable-style transaction history written by finance RPCs; the available balance is kept separately in wallet_accounts. Showing the latest 500 records.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 font-bold">Time</th><th className="p-3 font-bold">User</th><th className="p-3 font-bold">Entry</th><th className="p-3 font-bold">Amount</th><th className="p-3 font-bold">Balance after</th><th className="p-3 font-bold">Related request</th><th className="p-3 font-bold">Description</th></tr></thead><tbody className="divide-y divide-slate-100">{ledgerRows.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap p-3 text-slate-500">{date(entry.created_at)}</td><td className="p-3"><div className="font-bold">{profileById.get(entry.profile_id)?.name || 'Unknown user'}</div><div className="font-mono text-[10px] text-slate-400">{profileById.get(entry.profile_id)?.phone || entry.profile_id}</div></td><td className="whitespace-nowrap p-3">{entry.entry_type}</td><td className={`whitespace-nowrap p-3 font-extrabold ${Number(entry.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(entry.amount) > 0 ? '+' : ''}{money(entry.amount)}</td><td className="whitespace-nowrap p-3 font-bold">{money(entry.balance_after)}</td><td className="p-3 font-mono text-[10px]">{entry.related_id || '—'}</td><td className="min-w-60 p-3 text-slate-600">{entry.description}</td></tr>)}</tbody></table>{ledgerRows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No wallet ledger entries have been recorded yet.</p>}</div></section>}
        {tab === 'audit' && <section className="rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Administrative audit log</h2><p className="mt-1 text-xs text-slate-500">Recent actions recorded in Supabase.</p></div><div className="divide-y">{auditLogs.map((a) => <article key={a.id} className="space-y-1 p-4"><p className="font-bold text-sm">{a.action_type} · {a.admin_name}</p><p className="text-xs text-slate-600">{a.details}</p>{a.reason && <p className="text-xs text-slate-500">Reason: {a.reason}</p>}<p className="text-[11px] text-slate-400">{date(a.timestamp)} · {a.id}</p></article>)}{auditLogs.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No audit entries recorded yet.</p>}</div></section>}
      </>}
    </main>
  </div>;
};
