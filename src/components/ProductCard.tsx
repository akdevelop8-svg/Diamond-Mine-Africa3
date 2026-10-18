import React from 'react';
import { VipProduct } from '../types.ts';
import { GemstoneIcon } from './GemstoneIcon.tsx';
import { Eye, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured } from '../services/supabase.ts';

interface ProductCardProps {
  product: VipProduct;
  isOwned: boolean;
  onViewDetails: (product: VipProduct) => void;
  onPurchase: (product: VipProduct) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isOwned,
  onViewDetails,
  onPurchase,
}) => {

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group">
      {/* Gemstone Header Showcase */}
      <div className="relative p-4 pb-2 bg-gradient-to-b from-slate-50 to-white flex flex-col items-center text-center">
        {/* Tier Tag (Left) & Period (Top Right in RED color) */}
        <div className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
              VIP {product.tier}
            </span>
            {isOwned && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Active
              </span>
            )}
          </div>

          {/* Period written in RED color at top right */}
          <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full tabular-nums shadow-2xs">
            {product.periodDays} Days
          </span>
        </div>

        {/* Unique Gemstone Cut Profile Image */}
        <div className="my-2 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border border-slate-100 p-2 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300">
          <GemstoneIcon tier={product.tier} image={product.image} size="lg" />
        </div>

        {/* Cut Name */}
        <h4 className="font-display font-bold text-sm text-slate-900 mt-1 line-clamp-1">
          {product.cutName}
        </h4>
        <span className="text-[11px] text-slate-500 font-medium">
          {product.caratEquivalent} · {product.colorGrade}
        </span>
      </div>

      {/* Configured catalogue figures are not guaranteed income. */}
      <div className="px-4 py-2.5 bg-slate-50/70 border-t border-b border-slate-100 flex flex-col gap-1.5">
        {/* Price in GREEN */}
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-slate-600 font-medium">Price</span>
          <span className="font-display font-black text-base text-emerald-600 tabular-nums">
            {product.price.toLocaleString()} ETB
          </span>
        </div>

        {!isSupabaseConfigured ? (
          <>
            {/* Demo-only illustration; it never represents credited wallet funds. */}
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-[11px] text-slate-600 font-medium">Demo Daily Figure</span>
              <span className="font-bold text-emerald-600 tabular-nums">
                +{product.dailyReturn.toLocaleString()} ETB/day
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs border-t border-slate-200/60 pt-1.5">
              <span className="text-[11px] text-slate-800 font-bold">Illustrative Total</span>
              <span className="font-display font-black text-emerald-600 tabular-nums">
                {((product.dailyReturn * product.periodDays) || product.illustrativeTotal).toLocaleString()} ETB
              </span>
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-900">
            Daily figures are not guaranteed. Mining credits require sufficient funds in the verified reward reserve.
          </p>
        )}
      </div>

      {/* Card Action Controls */}
      <div className="p-3 grid grid-cols-2 gap-2 bg-white">
        <button
          onClick={() => onViewDetails(product)}
          className="w-full py-2 px-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Details</span>
        </button>

        <button
          onClick={() => onPurchase(product)}
          disabled={!product.isAvailable || (isOwned && product.isOneTime)}
          className={`w-full py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-xs ${
            !product.isAvailable || (isOwned && product.isOneTime)
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-98 cursor-pointer'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>{!product.isAvailable ? 'Unavailable' : (isOwned && product.isOneTime ? 'Owned' : 'Purchase')}</span>
        </button>
      </div>
    </div>
  );
};
