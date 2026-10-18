import React, { useState } from 'react';
import { VipProduct } from '../types.ts';
import { GemstoneIcon } from './GemstoneIcon.tsx';
import { X, ShieldCheck, AlertCircle, ShoppingCart, Info } from 'lucide-react';
import { useStore } from '../hooks/useStore.ts';
import { store } from '../services/store.ts';
import { isSupabaseConfigured } from '../services/supabase.ts';

interface ProductDetailModalProps {
  product: VipProduct | null;
  onClose: () => void;
  onOpenRecharge: () => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onOpenRecharge,
}) => {
  const { currentUser, userOwnedProducts } = useStore();
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  if (!product) return null;

  const isOwned = userOwnedProducts.some(
    (p) => p.userId === currentUser?.id && p.productId === product.id && p.status === 'active'
  );

  const handlePurchase = () => {
    if (!currentUser) return;
    setFeedback(null);

    if (isSupabaseConfigured) {
      setFeedback({ type: 'error', message: 'Live VIP purchase is disabled. No wallet was charged. A verified product-delivery, revenue, and compliant payout model is required before real-money VIP transactions can be enabled.' });
      return;
    }

    const res = store.purchaseProduct(currentUser.id, product.id);
    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      setTimeout(() => {
        onClose();
      }, 1800);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
              VIP {product.tier}
            </span>
            <h3 className="font-display font-bold text-base text-slate-900">
              {product.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Gemstone Spotlight */}
          <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-blue-50/50 to-slate-50 rounded-2xl border border-blue-100">
            <GemstoneIcon tier={product.tier} image={product.image} size="xl" />
            <h4 className="font-display font-bold text-lg text-slate-900 mt-3">
              {product.cutName}
            </h4>
            <p className="text-xs text-slate-600 text-center max-w-xs mt-1">
              {product.description}
            </p>
          </div>

          {/* Gemstone Specifications Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Equivalent Carat</span>
              <span className="font-bold text-slate-800">{product.caratEquivalent}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Color Grade</span>
              <span className="font-bold text-slate-800">{product.colorGrade}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-slate-500 block text-[11px]">Clarity Rating</span>
              <span className="font-bold text-slate-800">{product.clarityGrade}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50/50 border border-red-200">
              <span className="text-slate-600 block text-[11px]">Mining Period</span>
              <span className="font-black text-red-600 tabular-nums">{product.periodDays} Days</span>
            </div>
          </div>

          {/* Financial Breakdown Table (All Amounts in GREEN) */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-700 font-medium">Product Price</span>
              <span className="font-black text-emerald-600 text-sm tabular-nums">
                {product.price.toLocaleString()} ETB
              </span>
            </div>
            {!isSupabaseConfigured ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 font-medium">Demo Daily Figure</span>
                  <span className="font-black text-emerald-600 tabular-nums">
                    +{product.dailyReturn.toLocaleString()} ETB / Day
                  </span>
                </div>
                <div className="flex justify-between items-center border-t border-emerald-200 pt-2">
                  <span className="text-slate-900 font-bold">Illustrative Total</span>
                  <span className="font-black text-emerald-600 text-base tabular-nums">
                    {((product.dailyReturn * product.periodDays) || product.illustrativeTotal).toLocaleString()} ETB
                  </span>
                </div>
              </>
            ) : (
              <div className="border-t border-emerald-200 pt-2 text-[11px] leading-5 font-semibold text-amber-900">
                Daily payouts are not enabled for real-money accounts. No return is promised or credited by this app.
              </div>
            )}
          </div>

          {/* Safety notice: real-money VIP purchases stay disabled until product and payout claims are verified. */}
          <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              {isSupabaseConfigured ? (
                <><strong>Live transaction status:</strong> VIP purchases and daily payouts are not enabled for database-connected accounts. No wallet funds will be charged. Verified product delivery, underlying revenue, and appropriate legal/compliance review are needed first.</>
              ) : (
                <><strong>Daily figures:</strong> Illustrative only; earnings are not guaranteed.</>
              )}
            </span>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 ${
                feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span>{feedback.message}</span>
              {feedback.type === 'error' && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenRecharge();
                  }}
                  className="px-2 py-1 bg-rose-600 text-white rounded-md text-[11px] hover:bg-rose-700 font-bold"
                >
                  Recharge Now
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handlePurchase}
            disabled={isSupabaseConfigured || (isOwned && product.isOneTime)}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
              isSupabaseConfigured || (isOwned && product.isOneTime)
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98 cursor-pointer'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{isSupabaseConfigured ? 'Not Live Yet' : (isOwned && product.isOneTime ? 'Already Owned' : 'Confirm Purchase')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
