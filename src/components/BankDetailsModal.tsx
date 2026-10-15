import React, { useEffect, useState } from 'react';
import { CheckCircle2, Landmark, ShieldAlert, X } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { WithdrawalMethod } from '../types.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';

interface BankDetailsModalProps { isOpen: boolean; onClose: () => void; }
const METHODS: WithdrawalMethod[] = ['Bank of Abyssinia', 'Awash Bank', 'Telebirr', 'CBE'];
const mask = (value: string) => value.length <= 4 ? '••••' : `${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;

export const BankDetailsModal: React.FC<BankDetailsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useStore();
  const [method, setMethod] = useState<WithdrawalMethod>('CBE');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [hasSaved, setHasSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    let active = true;
    setError(''); setSuccess(''); setLoading(isSupabaseConfigured);
    setHasSaved(false);
    setMethod(currentUser.withdrawalDetails?.method ?? 'CBE');
    setAccountName(currentUser.withdrawalDetails?.accountName ?? currentUser.name);
    setAccountNumber(currentUser.withdrawalDetails?.accountNumber ?? '');

    if (isSupabaseConfigured && supabase) {
      void (async () => {
        try {
          const { data, error: loadError } = await supabase
            .from('withdrawal_destinations')
            .select('method,account_name,account_number')
            .eq('profile_id', currentUser.id)
            .maybeSingle();
          if (!active) return;
          if (loadError) throw loadError;
          if (data) {
            setMethod(data.method as WithdrawalMethod);
            setAccountName(data.account_name);
            setAccountNumber(data.account_number);
            setHasSaved(true);
          }
        } catch (e) {
          if (active) setError(e instanceof Error ? `${e.message}. Confirm the finance migration has been installed.` : 'Could not load saved bank details.');
        } finally { if (active) setLoading(false); }
      })();
    } else {
      setHasSaved(Boolean(currentUser.withdrawalDetails));
      setLoading(false);
    }
    return () => { active = false; };
  }, [isOpen, currentUser?.id]);

  if (!isOpen || !currentUser) return null;
  const isTelebirr = method === 'Telebirr';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (hasSaved) { setError('Your withdrawal destination is already saved and cannot be edited here. Contact support if there is an error.'); return; }
    if (accountName.trim().length < 2 || accountNumber.trim().length < 4) { setError('Enter a valid account holder name and account number.'); return; }
    setSaving(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: saveError } = await supabase.rpc('dma_save_withdrawal_destination', {
          p_method: method, p_account_name: accountName.trim(), p_account_number: accountNumber.trim(),
        });
        if (saveError) throw saveError;
      } else {
        const result = store.saveWithdrawalDetails({ userId: currentUser.id, method, accountName: accountName.trim(), accountNumber: accountNumber.trim() });
        if (!result.success) throw new Error(result.message);
      }
      setHasSaved(true);
      setSuccess('Withdrawal details saved. They are locked for future withdrawal requests. Contact support to request a correction.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save withdrawal details.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="bank-details-title">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700"><Landmark className="w-5 h-5" /></span>
            <div><h2 id="bank-details-title" className="font-bold text-base text-slate-900">My Bank Details</h2><p className="text-[11px] text-slate-500">Save once before your first withdrawal</p></div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close bank details" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {loading && <p className="rounded-xl bg-slate-50 p-3 text-slate-600">Loading saved destination…</p>}
          {hasSaved && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="font-bold text-emerald-800">Saved destination — locked</p><p className="mt-1 text-emerald-700">{method} · {accountName} · {mask(accountNumber)}</p><p className="mt-1 text-[10px] text-emerald-700">This destination will be sent to the admin with each withdrawal request and cannot be edited in the app.</p></div>}

          <fieldset disabled={hasSaved || loading || saving} className="space-y-4 disabled:opacity-70">
            <div><label htmlFor="withdrawal-method" className="block mb-1.5 font-bold text-slate-700">Withdrawal Method *</label><select id="withdrawal-method" required value={method} onChange={(e) => setMethod(e.target.value as WithdrawalMethod)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600">{METHODS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div><label htmlFor="withdrawal-account-name" className="block mb-1.5 font-bold text-slate-700">Account Holder / Wallet Owner *</label><input id="withdrawal-account-name" autoComplete="name" required minLength={2} maxLength={100} value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600" placeholder="Full name as registered" /></div>
            <div><label htmlFor="withdrawal-account-number" className="block mb-1.5 font-bold text-slate-700">{isTelebirr ? 'Telebirr Registered Phone Number *' : 'Bank Account Number *'}</label><input id="withdrawal-account-number" required autoComplete="off" inputMode={isTelebirr ? 'tel' : 'numeric'} maxLength={34} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-3 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600" placeholder={isTelebirr ? '09XXXXXXXX or +2519XXXXXXXX' : 'Enter your bank account number'} /></div>
          </fieldset>

          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900"><ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" /><p><strong>Security notice:</strong> In Supabase-configured staging, the destination is stored in the database and only you and authorized administrators can read it. The app will not automatically send a bank transfer.</p></div>
          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">{error}</div>}
          {success && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{success}</span></div>}
          <div className="flex gap-2 pt-1"><button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 bg-white py-3 font-bold text-slate-700 hover:bg-slate-50">{hasSaved || success ? 'Done' : 'Cancel'}</button>{!hasSaved && <button type="submit" disabled={loading || saving || !accountName.trim() || !accountNumber.trim()} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save Details'}</button>}</div>
        </form>
      </div>
    </div>
  );
};
