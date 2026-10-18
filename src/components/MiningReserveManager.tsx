import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { supabase } from '../services/supabase.ts';

type MiningPoolStatus = {
  available_balance: number | string;
  total_funded: number | string;
  total_paid: number | string;
  updated_at?: string | null;
};

const money = (value: number | string | null | undefined) =>
  `${Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;

export const MiningReserveManager: React.FC = () => {
  const [status, setStatus] = useState<MiningPoolStatus | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadStatus = useCallback(async () => {
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('dma_admin_mining_pool_status');
    if (rpcError) {
      setError(`Could not load mining reserve: ${rpcError.message}`);
      setStatus(null);
    } else {
      setStatus(data as MiningPoolStatus);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleFund = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || saving) return;

    const amountValue = Number(amount);
    const cleanReference = reference.trim();
    if (!Number.isFinite(amountValue) || amountValue <= 0 || Math.round(amountValue * 100) !== amountValue * 100) {
      setError('Enter a positive amount with no more than 2 decimal places.');
      return;
    }
    if (cleanReference.length < 5) {
      setError('Enter a verifiable bank/accounting reference of at least 5 characters.');
      return;
    }

    const confirmed = window.confirm(
      `Record ${money(amountValue)} in the mining reward reserve? Only proceed if this is independently verified company operating revenue already available to pay rewards. Do not use pending/customer deposits or fabricate a reference.`
    );
    if (!confirmed) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const { data, error: rpcError } = await supabase.rpc('dma_admin_fund_mining_pool', {
        p_amount: amountValue,
        p_reference: cleanReference,
        p_note: note.trim() || null,
      });
      if (rpcError) throw new Error(rpcError.message);
      const result = data as { success?: boolean; available_balance?: number | string; funded_amount?: number | string } | null;
      if (!result?.success) throw new Error('The server did not confirm reserve funding.');
      setNotice(`Reserve funding recorded: ${money(result.funded_amount)}. Available mining reserve: ${money(result.available_balance)}.`);
      setAmount('');
      setReference('');
      setNote('');
      await loadStatus();
    } catch (fundError) {
      setError(fundError instanceof Error ? fundError.message : 'Could not record reserve funding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <h2 className="font-extrabold text-slate-900">Daily Mining Reward Reserve</h2>
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
            Mining claims are paid only from this separately recorded reserve. A zero or insufficient balance means no mining reward will be credited. This screen does not verify bank records automatically.
          </p>
        </div>
        <button type="button" onClick={() => void loadStatus()} disabled={loading || saving} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-50">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-xs font-semibold text-blue-800">Available reserve</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-blue-950">{loading ? 'Loading…' : money(status?.available_balance)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">Total funded</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{loading ? 'Loading…' : money(status?.total_funded)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-600">Mining rewards paid</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900">{loading ? 'Loading…' : money(status?.total_paid)}</p>
        </div>
      </div>

      <form onSubmit={handleFund} className="space-y-3 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-extrabold text-slate-900">Record verified reserve funding</h3>
        </div>
        <p className="text-xs leading-5 text-amber-800">
          Only record actual, independently verified company operating revenue that is available for payouts. Do not use customer deposits, pending recharges, or invented references. This form records an administrator assertion; it does not move or verify bank money.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-semibold text-slate-700">
            Amount (ETB)
            <input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" placeholder="e.g. 1000.00" />
          </label>
          <label className="space-y-1 text-xs font-semibold text-slate-700">
            Verified bank/accounting reference
            <input required minLength={5} maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" placeholder="Actual reference number" />
          </label>
        </div>
        <label className="block space-y-1 text-xs font-semibold text-slate-700">
          Note (optional)
          <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={500} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-blue-500" placeholder="Source and verification details" />
        </label>
        <button type="submit" disabled={saving || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
          <ShieldCheck className="h-4 w-4" /> {saving ? 'Saving reserve record…' : 'Record verified funding'}
        </button>
      </form>
    </section>
  );
};
