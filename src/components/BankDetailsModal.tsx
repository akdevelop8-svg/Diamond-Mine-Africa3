import React, { useEffect, useState } from 'react';
import { CheckCircle2, Landmark, ShieldAlert, X } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { WithdrawalMethod } from '../types.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';

interface BankDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const METHODS: WithdrawalMethod[] = ['CBE', 'Telebirr', 'Awash Bank', 'Bank of Abyssinia'];

export const BankDetailsModal: React.FC<BankDetailsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useStore();
  const [method, setMethod] = useState<WithdrawalMethod>('CBE');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDestination, setIsLoadingDestination] = useState(false);
  const [hasServerDestination, setHasServerDestination] = useState(false);
  const [destinationLoadFailed, setDestinationLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isOpen || !currentUser) return () => { active = false; };
    setError('');
    setSuccess('');
    setDestinationLoadFailed(false);
    if (!isSupabaseConfigured || !supabase) {
      setMethod(currentUser.withdrawalDetails?.method ?? 'CBE');
      setAccountName(currentUser.withdrawalDetails?.accountName ?? currentUser.name);
      setAccountNumber(currentUser.withdrawalDetails?.accountNumber ?? '');
      setHasServerDestination(Boolean(currentUser.withdrawalDetails));
      return () => { active = false; };
    }

    setIsLoadingDestination(true);
    setHasServerDestination(false);
    setMethod('CBE');
    setAccountName(currentUser.name);
    setAccountNumber('');
    void (async () => {
      try {
        const { data, error: queryError } = await supabase!.from('withdrawal_destinations')
          .select('method,account_name,account_number')
          .eq('profile_id', currentUser.id).maybeSingle();
        if (queryError) throw queryError;
        if (!active) return;
        if (data) {
          setMethod(data.method as WithdrawalMethod);
          setAccountName(data.account_name);
          setAccountNumber(data.account_number);
          setHasServerDestination(true);
        }
      } catch (queryError) {
        if (active) {
          setDestinationLoadFailed(true);
          setError(queryError instanceof Error ? queryError.message : 'Could not load saved bank details. Confirm the withdrawal setup first.');
        }
      } finally {
        if (active) setIsLoadingDestination(false);
      }
    })();
    return () => { active = false; };
  }, [isOpen, currentUser?.id]);

  if (!isOpen || !currentUser) return null;

  const isTelebirr = method === 'Telebirr';
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const normalizedNumber = accountNumber.trim().replace(/\s+/g, '');
    const normalizedName = accountName.trim();
    if (normalizedName.length < 2) { setError('Enter the account holder or wallet owner name.'); return; }
    if (normalizedNumber.length < 6 || normalizedNumber.length > 34) { setError('Enter a valid account or wallet number.'); return; }
    if (method === 'Telebirr' && !/^(\+251|251|0)9\d{8}$/.test(normalizedNumber)) { setError('Enter a valid Ethiopian Telebirr mobile number.'); return; }

    setIsSubmitting(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error: saveError } = await supabase.rpc('dma_save_withdrawal_destination', {
          p_method: method, p_account_name: normalizedName, p_account_number: normalizedNumber,
        });
        if (saveError) throw saveError;
        // Cache only a masked summary in UI memory; the full number stays in Supabase.
        const summaryResult = store.cacheWithdrawalDestinationSummary({
          userId: currentUser.id, method, accountName: normalizedName, accountNumber: normalizedNumber,
        });
        if (!summaryResult.success) throw new Error(summaryResult.message);
        setSuccess('Withdrawal destination saved securely. The full account number is not saved in browser storage.');
      } else {
        const result = store.saveWithdrawalDetails({
          userId: currentUser.id, method, accountName: normalizedName, accountNumber: normalizedNumber,
        });
        if (!result.success) throw new Error(result.message);
        setSuccess(result.message);
      }
      setHasServerDestination(true);
      setDestinationLoadFailed(false);
      setAccountName(normalizedName);
      setAccountNumber(normalizedNumber);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save withdrawal destination.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mask = (value: string) => value.length <= 4 ? '••••' : `${'•'.repeat(Math.min(8, value.length - 4))}${value.slice(-4)}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="bank-details-title">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700"><Landmark className="w-5 h-5" /></span>
            <div>
              <h2 id="bank-details-title" className="font-bold text-base text-slate-900">My Bank Details</h2>
              <p className="text-[11px] text-slate-500">{isSupabaseConfigured ? 'Save a destination for your signed-in account' : 'Testing-only browser storage'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close bank details" className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {isLoadingDestination && <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600">Loading saved destination…</p>}
          {!isLoadingDestination && hasServerDestination && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-1">
              <p className="font-bold text-emerald-800">Saved withdrawal destination</p>
              <p className="text-emerald-800">{method} · {mask(accountNumber)}</p>
              <p className="text-emerald-800">Account holder: {accountName}</p>
              <p className="pt-1 text-[10px] leading-relaxed text-emerald-800">This destination is locked after saving. Contact support if it needs correction. {isSupabaseConfigured ? 'The full account number is kept in Supabase and is not stored in browser storage.' : 'This is demonstration-only data stored in this browser; do not use real banking details in demo mode.'}</p>
            </div>
          )}

          {!hasServerDestination && (
            <>
              <div>
                <label htmlFor="withdrawal-method" className="block mb-1.5 font-bold text-slate-700">Withdrawal Method *</label>
                <select id="withdrawal-method" value={method} onChange={(e) => setMethod(e.target.value as WithdrawalMethod)} disabled={destinationLoadFailed} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:opacity-50">
                  {METHODS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="withdrawal-account-name" className="block mb-1.5 font-bold text-slate-700">Account Holder / Wallet Owner *</label>
                <input id="withdrawal-account-name" autoComplete="name" required minLength={2} maxLength={100} value={accountName} onChange={(e) => setAccountName(e.target.value)} disabled={destinationLoadFailed} className="w-full rounded-xl border border-slate-300 px-3 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:opacity-50" placeholder="Full name as registered" />
              </div>

              <div>
                <label htmlFor="withdrawal-account-number" className="block mb-1.5 font-bold text-slate-700">{isTelebirr ? 'Telebirr Registered Phone Number *' : 'Bank Account Number *'}</label>
                <input id="withdrawal-account-number" required autoComplete="off" inputMode={isTelebirr ? 'tel' : 'numeric'} maxLength={34} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} disabled={destinationLoadFailed} className="w-full rounded-xl border border-slate-300 px-3 py-3 font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 disabled:opacity-50" placeholder={isTelebirr ? '09XXXXXXXX or +2519XXXXXXXX' : 'Enter your bank account number'} />
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{isSupabaseConfigured ? <><strong>Privacy notice:</strong> The full destination is stored in Supabase and is not saved to browser localStorage. Verify the withdrawal process before entering real banking details.</> : <><strong>Demo privacy notice:</strong> These details are saved in this browser's localStorage for testing only. This storage is not secure enough for real banking data. Do not enter sensitive real account information into a public demo.</>}</p>
              </div>
            </>
          )}

          {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">{error}</div>}
          {success && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{success}</span></div>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-300 bg-white py-3 font-bold text-slate-700 hover:bg-slate-50">{success ? 'Done' : 'Cancel'}</button>
            <button type="submit" disabled={isSubmitting || isLoadingDestination || destinationLoadFailed || hasServerDestination} className="flex-1 rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50">{hasServerDestination ? 'Already Saved' : isSubmitting ? 'Saving…' : 'Save Details'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
