import React from 'react';
import { X, Gem, CheckCircle2, MapPin, Compass, ShieldCheck } from 'lucide-react';
import { ASSETS } from '../data/constants.ts';

interface MineralCatalogueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MineralCatalogueModal: React.FC<MineralCatalogueModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const minerals = [
    {
      title: 'Kimberlite Diamond Pipes',
      location: 'East African Rift & Craton Terranes',
      description: 'Ancient volcanic pipes containing diamond crystals formed under ultra-high pressure and temperature in the Earth mantle.',
      grade: 'High Diamondiferous Yield',
    },
    {
      title: 'Alluvial Riverbed Crystals',
      location: 'Sedimentary Gravel Deposits',
      description: 'Naturally eroded and water-transported diamond crystals with supreme crystalline clarity and minimal surface impurities.',
      grade: 'Top Colorless D–F Grade',
    },
    {
      title: 'Rare Colored Fancy Gemstones',
      location: 'Deep Continental Lithosphere',
      description: 'Vivid blue boron-infused diamonds, fancy golden-amber stones, and exceptional pink mineral specimens.',
      grade: 'Museum-Quality Scarcity',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
          <div className="flex items-center gap-2">
            <Gem className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Official African Mineral Catalogue
              </h3>
              <span className="text-[10px] text-blue-200">
                Geological Diamond Exploration Archive
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Showcase Banner */}
          <div className="relative rounded-xl overflow-hidden aspect-16/9 border border-slate-200">
            <img
              src="/images/hero_luxury_diamonds_1791719774120.jpg"
              alt="Raw and cut diamonds showcase"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-4">
              <div className="text-white">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest block">
                  African Geological Heritage
                </span>
                <h4 className="font-display font-bold text-base text-white">
                  Ethically Sourced Natural Gemstone Deposits
                </h4>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-900">
            <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
            <span className="font-semibold text-[11px]">
              Mineral Catalogue Explored! Your task reward (+30 ETB) is now unlocked in the Task Center.
            </span>
          </div>

          {/* Geological Profiles */}
          <div className="space-y-2.5">
            <h4 className="font-display font-bold text-slate-800 text-sm">
              Featured Geological Formations
            </h4>
            {minerals.map((m, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition-colors space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{m.title}</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {m.grade}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>{m.location}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
          >
            Finished Reading
          </button>
        </div>
      </div>
    </div>
  );
};
