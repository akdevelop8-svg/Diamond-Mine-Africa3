import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Upload, Clock, AlertCircle, ShieldAlert, ArrowLeft, Building2 } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { RechargeRequest, BusinessPaymentConfig } from '../types.ts';
import { isSupabaseConfigured, supabase } from '../services/supabase.ts';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupport: () => void;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({ isOpen, onClose, onOpenSupport }) => {
  const { currentUser, paymentConfig } = useStore();

  const amounts = [300, 500, 1000, 3000, 7000, 15000, 30000, 60000, 120000, 200000];

  const [step, setStep] = useState<'select' | 'confirm' | 'instructions' | 'pending'>('select');
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [txReference, setTxReference] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<RechargeRequest | null>(null);
  const [serverPaymentConfig, setServerPaymentConfig] = useState<BusinessPaymentConfig | null>(null);
  const [paymentConfigLoading, setPaymentConfigLoading] = useState(false);
  const [paymentConfigError, setPaymentConfigError] = useState('');

  // Use the latest active payment destination configured by the administrator.
  // The default local value is a safe placeholder and must never be used for transfers.
  useEffect(() => {
    if (!isOpen || !currentUser || !isSupabaseConfigured || !supabase) {
      setServerPaymentConfig(null);
      setPaymentConfigError('');
      setPaymentConfigLoading(false);
      return;
    }
    let active = true;
    setPaymentConfigLoading(true);
    setPaymentConfigError('');
    void (async () => {
      try {
        const { data, error } = await supabase!
          .from('business_payment_config')
          .select('id,provider,account_holder,account_number,instructions,version,is_active,updated_by,updated_at')
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        setServerPaymentConfig(data ? {
          id: data.id,
          provider: data.provider,
          accountHolder: data.account_holder,
          accountNumber: data.account_number,
          instructions: data.instructions,
          updatedAt: data.updated_at || new Date().toISOString(),
          updatedBy: data.updated_by || 'SUPABASE',
          version: Number(data.version || 1),
        } : null);
      } catch (error) {
        if (active) setPaymentConfigError(error instanceof Error ? error.message : 'Could not load the configured payment account.');
      } finally {
        if (active) setPaymentConfigLoading(false);
      }
    })();
    return () => { active = false; };
  }, [isOpen, currentUser?.id]);

  // 15-minute interface timer countdown
  const [countdownSeconds, setCountdownSeconds] = useState(15 * 60);

  useEffect(() => {
    let interval: any;
    if (step === 'pending' && countdownSeconds > 0) {
      interval = setInterval(() => {
        setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, countdownSeconds]);

  if (!isOpen || !currentUser) return null;

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;
  const activePaymentConfig = serverPaymentConfig ?? paymentConfig;
  const hasPlaceholderPaymentAccount = /DEMO|NO[- ]?TRANSFER|PLACEHOLDER|TEST ONLY|DO NOT TRANSFER|NOT BE ACCEPTED/i.test(`${activePaymentConfig.accountHolder} ${activePaymentConfig.accountNumber} ${activePaymentConfig.instructions}`);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText(activePaymentConfig.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleConfirmSelect = () => {
    if (!Number.isFinite(currentAmount) || currentAmount < 300 || currentAmount > 200000) {
      setErrorMessage('Select a recharge amount between 300 and 200,000 ETB.');
      return;
    }
    setErrorMessage('');
    setStep('instructions');
  };

  const handleSubmitRecharge = async () => {
    if (isSubmitting) return;
    if (isSupabaseConfigured && paymentConfigLoading) {
      setErrorMessage('Payment account is still loading. Please wait a moment and try again.');
      return;
    }
    if (isSupabaseConfigured && paymentConfigError) {
      setErrorMessage(`Could not verify the configured payment account: ${paymentConfigError}`);
      return;
    }
    if (isSupabaseConfigured && hasPlaceholderPaymentAccount) {
      setErrorMessage('The administrator has not configured a real payment destination yet. Do not transfer money; contact support.');
      return;
    }
    if (!txReference.trim()) {
      setErrorMessage('Please enter the CBE transaction short-code / reference number.');
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const requestId = `RCH-${crypto.randomUUID().replace(/-/g, '').slice(0, 18).toUpperCase()}`;
        const createdAt = new Date().toISOString();
        const { error } = await supabase.from('recharge_requests').insert({
          id: requestId,
          profile_id: currentUser.id,
          amount: currentAmount,
          provider: activePaymentConfig.provider,
          tx_reference: txReference.trim(),
          evidence_url: null,
          status: 'pending_verification',
          payment_config_version: activePaymentConfig.version || 1,
          reviewed_by: null,
          reviewed_at: null,
        });
        if (error) throw error;
        setActiveRequest({
          id: requestId, userId: currentUser.id, userName: currentUser.name, userPhone: currentUser.phone,
          amount: currentAmount, provider: activePaymentConfig.provider, txReference: txReference.trim(),
          evidenceFileName: evidenceName || undefined, status: 'pending_verification', createdAt,
          paymentConfigVersion: activePaymentConfig.version || 1,
        });
        setCountdownSeconds(15 * 60);
        setStep('pending');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not save the request to Supabase.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const res = store.submitRechargeRequest({
      userId: currentUser.id,
      amount: currentAmount,
      txReference,
      evidenceFileName: evidenceName || 'cbe_transfer_receipt.jpg',
    });

    if (res.success && res.request) {
      setActiveRequest(res.request);
      setCountdownSeconds(15 * 60);
      setStep('pending');
    } else {
      setErrorMessage(res.message);
    }
    setIsSubmitting(false);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCloseAll = () => {
    setStep('select');
    setTxReference('');
    setEvidenceName('');
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            {step === 'instructions' && (
              <button
                onClick={() => setStep('select')}
                className="p-1 -ml-1 text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h3 className="font-display font-bold text-base text-slate-900">
              {step === 'pending' ? 'Verification Request Submitted' : 'Recharge Request'}
            </h3>
          </div>
          <button
            onClick={handleCloseAll}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {isSupabaseConfigured && paymentConfigLoading && <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">Loading the current payment destination…</div>}
          {isSupabaseConfigured && paymentConfigError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-800">Could not load the payment destination. Please contact support. {paymentConfigError}</div>}
          {/* STEP 1: Select Amount */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select VIP Tier Recharge Amount (ETB)
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {amounts.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amt);
                        setCustomAmount('');
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        selectedAmount === amt && !customAmount
                          ? 'border-blue-600 bg-blue-50/80 text-blue-700 font-extrabold ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 font-semibold'
                      }`}
                    >
                      <span className="block text-sm tabular-nums">{amt.toLocaleString()}</span>
                      <span className="text-[10px] text-slate-500 font-normal">ETB</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Confirmation Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">Selected Amount</span>
                <span className="font-display font-black text-lg text-blue-700 tabular-nums">
                  {currentAmount.toLocaleString()} ETB
                </span>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCloseAll}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmSelect}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CBE Payment Instructions */}
          {step === 'instructions' && (
            <div className="space-y-4">
              {hasPlaceholderPaymentAccount ? <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">No real payment account is configured. Do not transfer money. Ask the administrator to save and verify the official account first.</div> : <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">Verify the beneficiary details through an official channel before transferring. Submitted references are reviewed manually and do not automatically add wallet funds.</div>}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>{hasPlaceholderPaymentAccount ? 'Test Payment Details — Do Not Transfer Money' : 'Configured Payment Destination'}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Provider</span>
                    <span className="font-bold text-slate-800">{activePaymentConfig.provider}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Beneficiary Name</span>
                    <span className="font-bold text-slate-800">{activePaymentConfig.accountHolder}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Account Number</span>
                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200 mt-0.5">
                      <span className="font-mono font-black text-sm text-blue-800 tracking-wider">
                        {activePaymentConfig.accountNumber}
                      </span>
                      <button
                        onClick={handleCopyAccount}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                      >
                        {copiedAccount ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-slate-500 block text-[11px]">Transfer Amount</span>
                    <span className="font-black text-base text-blue-700 tabular-nums">
                      {currentAmount.toLocaleString()} ETB
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed border-t border-blue-200/60 pt-2">
                  {activePaymentConfig.instructions}
                </p>
              </div>

              {/* Form Input: Transaction Reference & Receipt Attachment */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Transaction Short-Code / Reference ID *
                  </label>
                  <input
                    type="text"
                    value={txReference}
                    onChange={(e) => setTxReference(e.target.value)}
                    placeholder="e.g. CBE-FT261011982 or SMS Short-Code"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    *Enter the reference code provided by your CBE mobile banking receipt.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Payment Evidence / Screenshot (Optional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="evidence-upload"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setEvidenceName(file.name);
                      }}
                    />
                    <label
                      htmlFor="evidence-upload"
                      className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-blue-400 text-xs text-slate-600 bg-slate-50 hover:bg-blue-50/40 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="truncate max-w-[200px]">
                        {evidenceName || 'Attach CBE transfer receipt'}
                      </span>
                    </label>
                    {evidenceName && (
                      <button
                        onClick={() => setEvidenceName('')}
                        className="p-1 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-semibold border border-rose-200">
                  {errorMessage}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRecharge}
                  disabled={isSubmitting || (isSupabaseConfigured && (paymentConfigLoading || Boolean(paymentConfigError) || hasPlaceholderPaymentAccount))}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting…' : isSupabaseConfigured && hasPlaceholderPaymentAccount ? 'Real Account Not Configured' : 'Submit For Verification'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Pending Verification & 15-Minute Interface Countdown */}
          {step === 'pending' && activeRequest && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border-4 border-blue-100">
                <Clock className="w-8 h-8 animate-pulse text-blue-600" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Waiting for Verification
                </span>
                <h4 className="font-display font-black text-xl text-slate-900 mt-2">
                  Request #{activeRequest.id}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Your demonstration recharge of{' '}
                  <strong className="text-blue-700">
                    {activeRequest.amount.toLocaleString()} ETB
                  </strong>{' '}
                  has been submitted for administrative verification.
                </p>
              </div>

              {/* 15-Minute Interface Timer Display */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white max-w-xs mx-auto shadow-inner">
                <span className="text-[11px] text-slate-400 uppercase tracking-widest block font-medium">
                  Estimated Verification Window
                </span>
                <span className="font-mono font-black text-3xl text-amber-300 tracking-wider my-1 block">
                  {formatTimer(countdownSeconds)}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  Interface timer only; administrators review requests in queue.
                </span>
              </div>

              {/* Request Details Card */}
              <div className="text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Submitted Amount:</span>
                  <span className="font-bold text-slate-800">{activeRequest.amount.toLocaleString()} ETB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Code:</span>
                  <span className="font-mono font-semibold text-slate-800">{activeRequest.txReference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Provider:</span>
                  <span className="font-medium text-slate-800">{activeRequest.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className="font-bold text-amber-600">Pending Review</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50 text-[11px] text-blue-800 text-left border border-blue-200">
                This request records a payment reference for manual review only; it does not verify a transfer or credit your wallet. {hasPlaceholderPaymentAccount ? 'The displayed account is a testing placeholder. Do not send money.' : 'Wait for confirmation from the administrator before treating a recharge as accepted.'}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => {
                    handleCloseAll();
                    onOpenSupport();
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  Need Assistance? Contact Support
                </button>
              </div>

              <button
                onClick={handleCloseAll}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xs"
              >
                Done / Return to Platform
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
