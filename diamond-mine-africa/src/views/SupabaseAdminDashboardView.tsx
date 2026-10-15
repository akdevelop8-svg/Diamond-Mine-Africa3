import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, ArrowDownRight, CreditCard, RefreshCw, ShieldCheck, Users, ArrowLeft, AlertTriangle, Search, UserCheck, UserX, Settings, FileImage } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { supabase } from '../services/supabase.ts';

type AdminTab = 'overview' | 'users' | 'recharges' | 'withdrawals' | 'ledger' | 'audit' | 'settings';
type ProfileRow = { id: string; user_id: string | null; name: string; phone: string; role: string | null; status: string | null; account_badge: string | null; created_at: string };
type RechargeRow = { id: string; profile_id: string; amount: number | string; provider: string; tx_reference: string; evidence_url: string | null; status: string; rejection_reason: string | null; created_at: string; reviewed_at: string | null };
type WithdrawalRow = { id: string; profile_id: string; amount: number | string; fee: number | string; net_amount: number | string; method: string; account_name: string; account_number: string; status: string; payout_reference: string | null; rejection_reason: string | null; created_at: string; reviewed_at: string | null };
type AuditRow = { id: string; admin_id: string; admin_name: string; action_type: string; details: string; reason: string | null; timestamp: string };
type WalletRow = { profile_id: string; available_balance: number | string; updated_at: string };
type LedgerRow = { id: string; profile_id: string; entry_type: string; amount: number | string; balance_after: number | string; related_type: string | null; related_id: string | null; description: string; created_at: string };
type PaymentRow = { id: string; provider: string; account_holder: string; account_number: string; instructions: string; version: number; is_active: boolean; updated_by: string; created_at: string };

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
  const [query, setQuery] = useState('');
  const [serverAdmin, setServerAdmin] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [recharges, setRecharges] = useState<RechargeRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);
  const [walletAccounts, setWalletAccounts] = useState<WalletRow[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentRow | null>(null);
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!supabase) { setError('Supabase is not configured.'); if (!quiet) setLoading(false); return; }
    if (!quiet) setLoading(true); setError('');
    try {
      const { data: adminValue, error: adminError } = await supabase.rpc('is_admin');
      if (adminError) throw new Error(`Could not verify admin permission: ${adminError.message}`);
      const allowed = adminValue === true;
      setServerAdmin(allowed);
      if (!allowed) throw new Error('Access denied by the database. Promote this account to admin in Supabase, then sign out and sign in again.');

      const [p, r, w, a, cfg, wallet, ledger] = await Promise.all([
        supabase.from('profiles').select('id,user_id,name,phone,role,status,account_badge,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('recharge_requests').select('id,profile_id,amount,provider,tx_reference,evidence_url,status,rejection_reason,created_at,reviewed_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('withdrawal_requests').select('id,profile_id,amount,fee,net_amount,method,account_name,account_number,status,payout_reference,rejection_reason,created_at,reviewed_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('audit_logs').select('id,admin_id,admin_name,action_type,details,reason,timestamp').order('timestamp', { ascending: false }).limit(200),
        supabase.from('business_payment_config').select('id,provider,account_holder,account_number,instructions,version,is_active,updated_by,created_at').ilike('provider', '%CBE%').order('version', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('wallet_accounts').select('profile_id,available_balance,updated_at').order('updated_at', { ascending: false }).limit(1000),
        supabase.from('wallet_ledger').select('id,profile_id,entry_type,amount,balance_after,related_type,related_id,description,created_at').order('created_at', { ascending: false }).limit(500),
      ]);
      for (const result of [p, r, w, a, cfg, wallet, ledger]) if (result.error) throw new Error(result.error.message);
      setProfiles((p.data ?? []) as ProfileRow[]);
      setRecharges((r.data ?? []) as RechargeRow[]);
      setWithdrawals((w.data ?? []) as WithdrawalRow[]);
      setAuditLogs((a.data ?? []) as AuditRow[]);
      setWalletAccounts((wallet.data ?? []) as WalletRow[]);
      setLedgerRows((ledger.data ?? []) as LedgerRow[]);
      const payment = (cfg.data ?? null) as PaymentRow | null;
      setPaymentConfig(payment);
      if (payment) { setAccountHolder(payment.account_holder || ''); setAccountNumber(payment.account_number || ''); setPaymentInstructions(payment.instructions || ''); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admin data.');
    } finally { if (!quiet) setLoading(false); }
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

  const statusPill = (status: string | null) => <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${status === 'active' || status === 'approved' || status === 'completed' ? 'bg-emerald-50 text-emerald-700' : status === 'suspended' || status === 'rejected' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-800'}`}>{status || 'unknown'}</span>;

  if (!serverAdmin && !loading) {
    return <div className="min-h-screen bg-slate-50 p-4 flex items-center justify-center"><div className="max-w-md rounded-2xl bg-white border p-6"><ShieldCheck className="h-8 w-8 text-rose-600"/><h1 className="mt-3 text-lg font-bold">Admin access required</h1><p className="mt-2 text-sm text-slate-600">{error || 'The database did not authorize this account as an administrator.'}</p><button onClick={onBackToCustomer} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Back to customer app</button></div></div>;
  }

  const tabs: { id: AdminTab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity }, { id: 'users', label: 'Users', icon: Users },
    { id: 'recharges', label: 'Recharges', icon: CreditCard }, { id: 'withdrawals', label: 'Withdrawals', icon: ArrowDownRight },
    { id: 'ledger', label: 'Wallet ledger', icon: Activity }, { id: 'audit', label: 'Audit log', icon: ShieldCheck }, { id: 'settings', label: 'Payment settings', icon: Settings },
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
      <nav className="flex gap-2 overflow-x-auto pb-1">{tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => { setTab(item.id); setQuery(''); }} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold ${tab === item.id ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}><Icon className="h-4 w-4"/>{item.label}</button>; })}</nav>
      {loading ? <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">Loading Supabase records…</div> : <>
        {tab === 'overview' && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Registered users', String(nonAdminUsers.length), Users], ['Pending recharge records', String(pendingRecharges.length), CreditCard], ['Pending withdrawal records', String(pendingWithdrawals.length), ArrowDownRight], ['Wallet ledger entries', String(ledgerRows.length), Activity], ['Audit entries', String(auditLogs.length), ShieldCheck]].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><Icon className="h-5 w-5 text-blue-600"/><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold">{value}</p></div>)}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:col-span-2 lg:col-span-4"><h2 className="font-bold">System status</h2><p className="mt-1 text-sm text-slate-600">Database admin verification succeeded. Requests shown here are only those actually saved in Supabase; local-browser demo records are not shared and will not appear.</p></div>
        </div>}
        {tab === 'users' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><h2 className="font-extrabold">Registered users</h2><p className="text-xs text-slate-500">This changes the stored status flag; it does not delete the account or replace a full account-revocation process.</p></div><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name / phone / ID" className="rounded-xl border py-2 pl-9 pr-3 text-sm"/></div></div><div className="divide-y">{filteredUsers.map((p) => <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="font-bold">{p.name} {statusPill(p.status)}</p><p className="mt-1 break-all text-xs text-slate-500">{p.phone} · {p.id}</p><p className="mt-1 text-xs font-bold text-blue-700">Wallet: {money(walletByProfile.get(p.id) ?? 0)}</p><p className="mt-1 text-[11px] text-slate-400">Joined {date(p.created_at)} · {p.account_badge || 'Standard Member'}</p></div><div className="flex flex-wrap gap-2"><button disabled={workingId === p.id || p.status === 'active'} onClick={() => void setUserStatus(p, 'active')} className="flex items-center gap-1 rounded-lg border px-2.5 py-2 text-[11px] font-bold disabled:opacity-40"><UserCheck className="h-3.5 w-3.5"/> Activate</button><button disabled={workingId === p.id || p.status === 'warned'} onClick={() => void setUserStatus(p, 'warned')} className="rounded-lg border border-amber-200 px-2.5 py-2 text-[11px] font-bold text-amber-800 disabled:opacity-40">Warn</button><button disabled={workingId === p.id || p.status === 'suspended'} onClick={() => void setUserStatus(p, 'suspended')} className="flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-40"><UserX className="h-3.5 w-3.5"/> Suspend</button></div></div>)}{filteredUsers.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No users found.</p>}</div></section>}
        {tab === 'recharges' && <section className="rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Recharge requests · manual bank verification</h2><p className="mt-1 text-xs text-slate-500">Open the private receipt, confirm the transaction in CBE, then Accept to credit the wallet once, or Reject with a reason.</p></div><div className="divide-y">{recharges.map((r) => { const p = profileById.get(r.profile_id); const canReview = ['pending_verification','under_review','submitted'].includes(r.status); return <article key={r.id} className="space-y-1 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{r.id} · {money(r.amount)}</p>{statusPill(r.status)}</div><p className="text-xs text-slate-600">{p?.name || 'Unknown profile'} · {p?.phone || r.profile_id}</p><p className="text-xs text-slate-600">{r.provider} · Customer code: <span className="font-mono font-bold">{r.tx_reference}</span></p><p className="text-[11px] text-slate-400">Submitted {date(r.created_at)} · Reviewed {date(r.reviewed_at)}</p>{r.rejection_reason && <p className="text-xs text-rose-700">Reason: {r.rejection_reason}</p>}<div className="flex flex-wrap gap-2 pt-2"><button disabled={workingId === r.id || !r.evidence_url} onClick={() => void openReceipt(r)} className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-bold disabled:opacity-40"><FileImage className="h-3.5 w-3.5"/> View receipt</button><button disabled={workingId === r.id || !canReview} onClick={() => void approveRecharge(r)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">Accept + credit wallet</button><button disabled={workingId === r.id || !canReview} onClick={() => void rejectRequest('recharge', r.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-40">Reject</button></div></article>; })}{recharges.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No recharge records have been saved to Supabase yet.</p>}</div></section>}
        {tab === 'withdrawals' && <section className="rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Withdrawal requests · manual payout</h2><p className="mt-1 text-xs text-slate-500">The requested amount is reserved on submission. Reject returns it to wallet; Mark Paid is only for a transfer already completed outside this app.</p></div><div className="divide-y">{withdrawals.map((r) => { const p = profileById.get(r.profile_id); const canReview = ['pending_verification','under_review','submitted'].includes(r.status); return <article key={r.id} className="space-y-1 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{r.id} · {money(r.amount)}</p>{statusPill(r.status)}</div><p className="text-xs text-slate-600">{p?.name || 'Unknown profile'} · {p?.phone || r.profile_id}</p><p className="text-xs text-slate-600">{r.method} · {r.account_name} · {mask(r.account_number)} · Net payout {money(r.net_amount)} (8% fee {money(r.fee)})</p><p className="text-[11px] text-slate-400">Submitted {date(r.created_at)} · Reviewed {date(r.reviewed_at)}</p>{r.payout_reference && <p className="text-xs text-emerald-700">Payout reference: {r.payout_reference}</p>}{r.rejection_reason && <p className="text-xs text-rose-700">Reason: {r.rejection_reason}</p>}<div className="flex flex-wrap gap-2 pt-2"><button disabled={workingId === r.id || !canReview} onClick={() => void markWithdrawalPaid(r)} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-40">Mark Paid (after transfer)</button><button disabled={workingId === r.id || !canReview} onClick={() => void rejectRequest('withdrawal', r.id)} className="rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700 disabled:opacity-40">Reject + return balance</button></div></article>; })}{withdrawals.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No withdrawal records have been saved to Supabase yet.</p>}</div></section>}
        {tab === 'settings' && <section className="max-w-2xl rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-extrabold">CBE recharge account settings</h2><p className="mt-1 text-xs text-slate-500">Saving creates a new version and makes it visible to authenticated customers. Do not use a personal account or publish collection details until ownership, business purpose and compliance have been independently confirmed.</p></div><form onSubmit={(e) => void saveCbeSettings(e)} className="space-y-4 p-4"><div><label className="mb-1 block text-xs font-bold">Account holder name</label><input required minLength={2} maxLength={255} value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Verified account holder" /></div><div><label className="mb-1 block text-xs font-bold">CBE account number</label><input required minLength={6} maxLength={60} inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 font-mono text-sm" placeholder="Account number" /></div><div><label className="mb-1 block text-xs font-bold">Customer instructions</label><textarea value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} rows={3} maxLength={1000} className="w-full rounded-xl border px-3 py-2.5 text-sm" placeholder="Explain what customers should verify before payment" /></div>{paymentConfig && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Current version: v{paymentConfig.version} · {paymentConfig.provider} · {paymentConfig.is_active ? 'Active' : 'Inactive'} · Account ending {paymentConfig.account_number.slice(-4)}</p>}<button type="submit" disabled={savingSettings || !accountHolder.trim() || !accountNumber.trim()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{savingSettings ? 'Saving…' : 'Save new CBE account version'}</button></form></section>}
        {tab === 'ledger' && <section className="rounded-2xl border border-slate-200 bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Server-side wallet ledger</h2><p className="mt-1 text-xs text-slate-500">Immutable-style transaction history written by finance RPCs; the available balance is kept separately in wallet_accounts. Showing the latest 500 records.</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 font-bold">Time</th><th className="p-3 font-bold">User</th><th className="p-3 font-bold">Entry</th><th className="p-3 font-bold">Amount</th><th className="p-3 font-bold">Balance after</th><th className="p-3 font-bold">Related request</th><th className="p-3 font-bold">Description</th></tr></thead><tbody className="divide-y divide-slate-100">{ledgerRows.map((entry) => <tr key={entry.id}><td className="whitespace-nowrap p-3 text-slate-500">{date(entry.created_at)}</td><td className="p-3"><div className="font-bold">{profileById.get(entry.profile_id)?.name || 'Unknown user'}</div><div className="font-mono text-[10px] text-slate-400">{profileById.get(entry.profile_id)?.phone || entry.profile_id}</div></td><td className="whitespace-nowrap p-3">{entry.entry_type}</td><td className={`whitespace-nowrap p-3 font-extrabold ${Number(entry.amount) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{Number(entry.amount) > 0 ? '+' : ''}{money(entry.amount)}</td><td className="whitespace-nowrap p-3 font-bold">{money(entry.balance_after)}</td><td className="p-3 font-mono text-[10px]">{entry.related_id || '—'}</td><td className="min-w-60 p-3 text-slate-600">{entry.description}</td></tr>)}</tbody></table>{ledgerRows.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No wallet ledger entries have been recorded yet.</p>}</div></section>}
        {tab === 'audit' && <section className="rounded-2xl border bg-white"><div className="border-b p-4"><h2 className="font-extrabold">Administrative audit log</h2><p className="mt-1 text-xs text-slate-500">Recent actions recorded in Supabase.</p></div><div className="divide-y">{auditLogs.map((a) => <article key={a.id} className="space-y-1 p-4"><p className="font-bold text-sm">{a.action_type} · {a.admin_name}</p><p className="text-xs text-slate-600">{a.details}</p>{a.reason && <p className="text-xs text-slate-500">Reason: {a.reason}</p>}<p className="text-[11px] text-slate-400">{date(a.timestamp)} · {a.id}</p></article>)}{auditLogs.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No audit entries recorded yet.</p>}</div></section>}
      </>}
    </main>
  </div>;
};
