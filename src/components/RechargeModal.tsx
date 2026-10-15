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

  const amounts = [300, 500, 800, 900, 1700, 15000, 60000];

  const [step, setStep] = useState<'select' | 'confirm' | 'instructions' | 'pending'>('select');
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [txReference, setTxReference] = useState('');
  const [evidenceName, setEvidenceName] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<BusinessPaymentConfig>(paymentConfig);
  const [hasActiveCbeAccount, setHasActiveCbeAccount] = useState(!isSupabaseConfigured);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [hasCopiedAccount, setHasCopiedAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeRequest, setActiveRequest] = useState<RechargeRequest | null>(null);

  // 15-minute interface timer countdown, restored from the server request expiry when available.
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

  // Restore the newest pending server-side request when the user reopens the modal
  // or reloads the page. The 15-minute timer is derived from the database timestamp.
  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured || !supabase || !currentUser) return;
    let active = true;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('recharge_requests')
          .select('id,profile_id,amount,provider,tx_reference,evidence_url,status,rejection_reason,created_at,reviewed_at,payment_config_version,expires_at')
          .eq('profile_id', currentUser.id)
          .in('status', ['pending_verification', 'under_review', 'submitted'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!active || error) return;
        if (!data) {
          setActiveRequest(null);
          setCountdownSeconds(15 * 60);
          setStep((previous) => previous === 'pending' ? 'select' : previous);
          return;
        }
        setActiveRequest({
          id: String(data.id), userId: currentUser.id, userName: currentUser.name, userPhone: currentUser.phone,
          amount: Number(data.amount), provider: String(data.provider), txReference: String(data.tx_reference),
          evidenceFileName: String(data.evidence_url || '').split('/').pop() || 'Receipt attached',
          status: data.status as RechargeRequest['status'], createdAt: String(data.created_at),
          reviewedAt: data.reviewed_at ? String(data.reviewed_at) : undefined,
          rejectionReason: data.rejection_reason ? String(data.rejection_reason) : undefined,
          paymentConfigVersion: Number(data.payment_config_version) || 1,
        });
        const expiry = data.expires_at ? String(data.expires_at) : null;
        setCountdownSeconds(expiry ? Math.max(0, Math.ceil((Date.parse(expiry) - Date.now()) / 1000)) : 0);
        setStep('pending');
      } catch {
        // A missing finance migration must not prevent a user from using the rest of demo UI.
      }
    })();
    return () => { active = false; };
  }, [isOpen, currentUser?.id]);

  useEffect(() => {
    if (!isOpen || !isSupabaseConfigured || !supabase) return;
    let active = true;
    setHasActiveCbeAccount(false);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('business_payment_config')
          .select('id,provider,account_holder,account_number,instructions,version,updated_by,created_at')
          .eq('is_active', true)
          .ilike('provider', '%CBE%')
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!active) return;
        if (error || !data || !String(data.provider).toLowerCase().includes('cbe') || String(data.account_number).includes('DEMO-ONLY')) {
          setHasActiveCbeAccount(false);
          return;
        }
        setPaymentInfo({
          id: String(data.id), provider: String(data.provider), accountHolder: String(data.account_holder),
          accountNumber: String(data.account_number), instructions: String(data.instructions),
          updatedAt: String(data.created_at), updatedBy: String(data.updated_by), version: Number(data.version) || 1,
        });
        setHasActiveCbeAccount(true);
      } catch {
        if (active) setHasActiveCbeAccount(false);
      }
    })();
    return () => { active = false; };
  }, [isOpen, paymentConfig.version]);

  if (!isOpen || !currentUser) return null;

  const currentAmount = customAmount ? Number(customAmount) : selectedAmount;

  const handleCopyAccount = () => {
    void navigator.clipboard.writeText(paymentInfo.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleConfirmSelect = () => {
    if (isSupabaseConfigured && !hasActiveCbeAccount) {
      setErrorMessage('An administrator must configure an active CBE recipient account in Admin → Payment settings before recharge requests can be submitted.');
      return;
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 300 || currentAmount > 200000 || !Number.isInteger(currentAmount)) {
      setErrorMessage('Select a recharge amount between 300 and 200,000 ETB.');
      return;
    }
    setErrorMessage('');
    setHasCopiedAccount(false);
    setStep('instructions');
  };

  const handleSubmitRecharge = async () => {
    if (isSubmitting) return;
    if (!txReference.trim()) {
      setErrorMessage('Please enter the CBE transaction short-code / reference number.');
      return;
    }
    if (!receiptFile) {
      setErrorMessage('Attach a screenshot of the CBE receipt before submitting.');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(receiptFile.type) || receiptFile.size > 5 * 1024 * 1024) {
      setErrorMessage('Receipt must be a JPG, PNG, or WebP image up to 5 MB.');
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);

    if (isSupabaseConfigured && supabase) {
      try {
        const requestId = `RCH-${crypto.randomUUID().replace(/-/g, '').slice(0, 18).toUpperCase()}`;
        const createdAt = new Date().toISOString();
        const safeFileName = receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-90) || 'receipt.png';
        const receiptPath = `${currentUser.id}/${crypto.randomUUID()}-${safeFileName}`;
        const { error: uploadError } = await supabase.storage.from('recharge-receipts').upload(receiptPath, receiptFile, {
          contentType: receiptFile.type, upsert: false, cacheControl: '3600',
        });
        if (uploadError) throw new Error(`Receipt upload failed: ${uploadError.message}. Check that the finance migration and private storage bucket are installed.`);
        const { data: savedRequest, error } = await supabase.from('recharge_requests').insert({
          id: requestId,
          profile_id: currentUser.id,
          amount: currentAmount,
          provider: 'Commercial Bank of Ethiopia (CBE)',
          tx_reference: txReference.trim(),
          evidence_url: receiptPath,
          status: 'pending_verification',
          payment_config_version: paymentInfo.version || 1,
          reviewed_by: null,
          reviewed_at: null,
        }).select('id,amount,provider,tx_reference,status,created_at,payment_config_version,expires_at').single();
        if (error) {
          // Avoid leaving an orphan receipt if the request insert fails.
          await supabase.storage.from('recharge-receipts').remove([receiptPath]);
          throw error;
        }
        const serverExpiry = savedRequest?.expires_at ? String(savedRequest.expires_at) : null;
        setActiveRequest({
          id: String(savedRequest?.id || requestId), userId: currentUser.id, userName: currentUser.name, userPhone: currentUser.phone,
          amount: Number(savedRequest?.amount ?? currentAmount), provider: String(savedRequest?.provider || 'Commercial Bank of Ethiopia (CBE)'), txReference: String(savedRequest?.tx_reference || txReference.trim()),
          evidenceFileName: receiptFile.name, status: (savedRequest?.status || 'pending_verification') as RechargeRequest['status'], createdAt: String(savedRequest?.created_at || createdAt),
          paymentConfigVersion: Number(savedRequest?.payment_config_version) || paymentInfo.version || 1,
        });
        setCountdownSeconds(serverExpiry ? Math.max(0, Math.ceil((Date.parse(serverExpiry) - Date.now()) / 1000)) : 15 * 60);
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
      evidenceFileName: receiptFile?.name || 'cbe_transfer_receipt.jpg',
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
    if (isSupabaseConfigured && activeRequest && step === 'pending') {
      setErrorMessage('');
      onClose();
      return;
    }
    setStep('select');
    setTxReference('');
    setEvidenceName('');
    setReceiptFile(null);
    setHasCopiedAccount(false);
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
          {/* STEP 1: Select Amount */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Choose amount (ETB) — minimum 300, maximum 200,000
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
                <div className="mt-3">
                  <label htmlFor="custom-recharge-amount" className="block text-xs font-bold text-slate-700 mb-1">Or enter a custom amount</label>
                  <input id="custom-recharge-amount" type="number" min="300" max="200000" step="1" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} placeholder="300–200,000 ETB" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-bold text-slate-900" />
                </div>
              </div>

              {isSupabaseConfigured && !hasActiveCbeAccount && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">An administrator must configure and verify the active CBE recipient in Admin → Payment settings before this staging form will accept requests.</div>}

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
                  disabled={isSupabaseConfigured && !hasActiveCbeAccount}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs disabled:opacity-50"
                >
                  Continue to Payment
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CBE Payment Instructions */}
          {step === 'instructions' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-950">Staging workflow only: do not transfer real money. Admin approval credits only the staging ledger after the actual bank account is checked.</div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-blue-700" />
                  <span>Staging CBE Payment Details — Do Not Transfer Money</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Provider</span>
                    <span className="font-bold text-slate-800">{paymentInfo.provider}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Beneficiary Name</span>
                    <span className="font-bold text-slate-800">{paymentInfo.accountHolder}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Account Number</span>
                    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-blue-200 mt-0.5">
                      <span className="font-mono font-black text-sm text-blue-800 tracking-wider">
                        {paymentInfo.accountNumber}
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
                  {paymentInfo.instructions}
                </p>
              </div>

              {!hasCopiedAccount ? (
                <button type="button" onClick={() => setHasCopiedAccount(true)} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-blue-700">I have copied the account</button>
              ) : (<>
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
                    Payment Receipt Screenshot (Required)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      id="evidence-upload"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setErrorMessage('');
                        if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
                          setReceiptFile(null); setEvidenceName(''); setErrorMessage('Receipt must be JPG, PNG, or WebP and no larger than 5 MB.'); return;
                        }
                        setReceiptFile(file); setEvidenceName(file.name);
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
                        type="button"
                        onClick={() => { setEvidenceName(''); setReceiptFile(null); }}
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
                  onClick={() => { setHasCopiedAccount(false); setStep('select'); }}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitRecharge}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs disabled:opacity-60"
                >
                  {isSubmitting ? 'Submitting…' : 'Submit For Verification'}
                </button>
              </div>
              </>)}
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
                  Your recharge request for{' '}
                  <strong className="text-blue-700">
                    {activeRequest.amount.toLocaleString()} ETB
                  </strong>{' '}
                  has been submitted for administrative verification.
                </p>
              </div>

              {/* 15-minute member countdown, restored from the server expiry timestamp */}
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
                The receipt and reference are sent to the admin review queue. The admin must independently confirm the transfer in CBE before accepting. This build is still staging-only: do not transfer real money.
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
