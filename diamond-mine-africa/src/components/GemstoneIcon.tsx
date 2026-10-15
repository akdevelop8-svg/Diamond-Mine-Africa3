import React, { useState } from 'react';

const DIAMOND_IMAGES: Record<number, string> = {
  1: '/diamond1.png',
  2: '/diamond2.png',
  3: '/diamond3.png',
  4: '/diamond4.png',
  5: '/diamond5.png',
  6: '/diamond6.png',
  7: '/diamond7.png',
  8: '/diamond8.png',
  9: '/diamond9.png',
  10: '/diamond10.png',
};

interface GemstoneIconProps {
  tier: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  image?: string;
}

export const GemstoneIcon: React.FC<GemstoneIconProps> = ({ tier, className = '', size = 'md', image }) => {
  const [attempt, setAttempt] = useState(0);

  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const containerClass = `${sizeMap[size]} ${className} relative flex items-center justify-center shrink-0`;
  
  // Sequence of image URLs to try
  const candidateImages = [
    image || DIAMOND_IMAGES[tier],
    `/diamond${tier}.png`,
    `/diamon${tier}.png`,
    `/images/diamond${tier}.png`,
    `/images/diamon${tier}.png`,
  ].filter(Boolean) as string[];

  const currentImgSrc = candidateImages[attempt];

  if (currentImgSrc && attempt < candidateImages.length) {
    return (
      <div className={containerClass}>
        <img
          src={currentImgSrc}
          alt={`VIP ${tier} Diamond Profile`}
          className="w-full h-full object-contain drop-shadow-md select-none transition-transform"
          onError={() => setAttempt((prev) => prev + 1)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Render unique cut silhouettes for tiers 1 through 10 as fallback
  switch (tier) {
    case 1:
      // VIP 1: Brilliant Round Cut (Sky Blue)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g1-table" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="g1-facet" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0369a1" />
                <stop offset="100%" stopColor="#7dd3fc" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="#0c4a6e" />
            <polygon points="50,8 78,22 92,50 78,78 50,92 22,78 8,50 22,22" fill="url(#g1-table)" />
            <polygon points="50,22 68,32 78,50 68,68 50,78 32,68 22,50 32,32" fill="#ffffff" fillOpacity="0.4" />
            <polygon points="50,22 50,8 68,32 78,22" fill="#e0f2fe" fillOpacity="0.8" />
            <polygon points="78,50 92,50 68,68 78,78" fill="url(#g1-facet)" />
            <polygon points="50,78 50,92 32,68 22,78" fill="#0284c7" />
            <polygon points="22,50 8,50 32,32 22,22" fill="#bae6fd" />
            <polygon points="50,30 63,38 70,50 63,62 50,70 37,62 30,50 37,38" fill="#ffffff" fillOpacity="0.7" />
            {/* Sparkle */}
            <circle cx="34" cy="34" r="2" fill="#ffffff" />
            <circle cx="66" cy="38" r="1.5" fill="#ffffff" />
          </svg>
        </div>
      );

    case 2:
      // VIP 2: Princess Cut (Square Brilliant)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g2-square" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="40%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>
            <rect x="12" y="12" width="76" height="76" rx="2" fill="#075985" />
            <polygon points="12,12 88,12 50,50" fill="#bae6fd" fillOpacity="0.6" />
            <polygon points="88,12 88,88 50,50" fill="#0284c7" fillOpacity="0.85" />
            <polygon points="88,88 12,88 50,50" fill="#0369a1" />
            <polygon points="12,88 12,12 50,50" fill="#7dd3fc" fillOpacity="0.75" />
            <rect x="28" y="28" width="44" height="44" fill="url(#g2-square)" />
            {/* Cross facets */}
            <line x1="28" y1="28" x2="72" y2="72" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="72" y1="28" x2="28" y2="72" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
            <circle cx="30" cy="30" r="2.5" fill="#ffffff" />
          </svg>
        </div>
      );

    case 3:
      // VIP 3: Radiant Cut (Trimmed Corner Rectangle)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g3-radiant" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bfdbfe" />
                <stop offset="50%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>
            <polygon points="26,10 74,10 90,26 90,74 74,90 26,90 10,74 10,26" fill="#1e3a8a" />
            <polygon points="28,14 72,14 86,28 86,72 72,86 28,86 14,72 14,28" fill="url(#g3-radiant)" />
            <polygon points="34,24 66,24 76,34 76,66 66,76 34,76 24,66 24,34" fill="#ffffff" fillOpacity="0.5" />
            {/* Facet starburst */}
            <line x1="50" y1="24" x2="50" y2="76" stroke="#93c5fd" strokeWidth="1.2" />
            <line x1="24" y1="50" x2="76" y2="50" stroke="#93c5fd" strokeWidth="1.2" />
            <line x1="34" y1="24" x2="66" y2="76" stroke="#ffffff" strokeWidth="1" />
            <line x1="66" y1="24" x2="34" y2="76" stroke="#ffffff" strokeWidth="1" />
            <circle cx="50" cy="50" r="3" fill="#ffffff" />
          </svg>
        </div>
      );

    case 4:
      // VIP 4: Emerald Step Cut (Classic Step Facets)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g4-emerald" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="50%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#172554" />
              </linearGradient>
            </defs>
            <polygon points="25,12 75,12 88,25 88,75 75,88 25,88 12,75 12,25" fill="#0f172a" />
            {/* Outer Step */}
            <polygon points="26,14 74,14 86,26 86,74 74,86 26,86 14,74 14,26" fill="url(#g4-emerald)" />
            {/* Mid Step */}
            <polygon points="32,22 68,22 78,32 78,68 68,78 32,78 22,68 22,32" fill="#3b82f6" fillOpacity="0.6" stroke="#dbeafe" strokeWidth="1" />
            {/* Center Table */}
            <polygon points="38,30 62,30 70,38 70,62 62,70 38,70 30,62 30,38" fill="#ffffff" fillOpacity="0.75" />
            <line x1="14" y1="26" x2="38" y2="30" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="86" y1="26" x2="62" y2="30" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
            <circle cx="36" cy="34" r="2" fill="#ffffff" />
          </svg>
        </div>
      );

    case 5:
      // VIP 5: Cushion Modified Cut (Pillow Outline)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g5-cushion" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#dbeafe" />
                <stop offset="40%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
            </defs>
            <rect x="14" y="14" width="72" height="72" rx="22" fill="#172554" />
            <rect x="16" y="16" width="68" height="68" rx="20" fill="url(#g5-cushion)" />
            {/* Facet lines */}
            <polygon points="50,22 74,38 74,62 50,78 26,62 26,38" fill="#ffffff" fillOpacity="0.35" />
            <rect x="32" y="32" width="36" height="36" rx="8" fill="#ffffff" fillOpacity="0.6" />
            <line x1="16" y1="16" x2="32" y2="32" stroke="#ffffff" strokeWidth="1.2" />
            <line x1="84" y1="16" x2="68" y2="32" stroke="#ffffff" strokeWidth="1.2" />
            <line x1="84" y1="84" x2="68" y2="68" stroke="#ffffff" strokeWidth="1.2" />
            <line x1="16" y1="84" x2="32" y2="68" stroke="#ffffff" strokeWidth="1.2" />
            <circle cx="38" cy="38" r="2.5" fill="#ffffff" />
          </svg>
        </div>
      );

    case 6:
      // VIP 6: Marquise Cut (Football / Navette Silhouette)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g6-marquise" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="50%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#075985" />
              </linearGradient>
            </defs>
            {/* Marquise shape */}
            <path
              d="M 50 6 C 78 28, 90 50, 50 94 C 10 50, 22 28, 50 6 Z"
              fill="#082f49"
            />
            <path
              d="M 50 10 C 74 30, 84 50, 50 90 C 16 50, 26 30, 50 10 Z"
              fill="url(#g6-marquise)"
            />
            {/* Center diamond table */}
            <polygon points="50,24 68,50 50,76 32,50" fill="#ffffff" fillOpacity="0.55" />
            <line x1="50" y1="10" x2="50" y2="90" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.9" />
            <line x1="24" y1="50" x2="76" y2="50" stroke="#bae6fd" strokeWidth="1.2" />
            <circle cx="48" cy="36" r="2.5" fill="#ffffff" />
          </svg>
        </div>
      );

    case 7:
      // VIP 7: Oval Cut (Teal / Ocean Emerald Lustre)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g7-oval" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#99f6e4" />
                <stop offset="40%" stopColor="#0d9488" />
                <stop offset="100%" stopColor="#115e59" />
              </linearGradient>
            </defs>
            <ellipse cx="50" cy="50" rx="40" ry="46" fill="#134e4a" />
            <ellipse cx="50" cy="50" rx="37" ry="43" fill="url(#g7-oval)" />
            {/* Crown facets */}
            <ellipse cx="50" cy="50" rx="24" ry="28" fill="#ffffff" fillOpacity="0.45" />
            <line x1="50" y1="7" x2="50" y2="93" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
            <line x1="13" y1="50" x2="87" y2="50" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.8" />
            <circle cx="40" cy="35" r="2.5" fill="#ffffff" />
            <circle cx="60" cy="65" r="1.5" fill="#ffffff" />
          </svg>
        </div>
      );

    case 8:
      // VIP 8: Pear Cut (Teardrop)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g8-pear" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c7d2fe" />
                <stop offset="50%" stopColor="#4f46e5" />
                <stop offset="100%" stopColor="#312e81" />
              </linearGradient>
            </defs>
            <path
              d="M 50 8 C 68 28, 86 52, 86 68 C 86 82, 70 94, 50 94 C 30 94, 14 82, 14 68 C 14 52, 32 28, 50 8 Z"
              fill="#1e1b4b"
            />
            <path
              d="M 50 12 C 65 30, 82 52, 82 66 C 82 78, 68 90, 50 90 C 32 90, 18 78, 18 66 C 18 52, 35 30, 50 12 Z"
              fill="url(#g8-pear)"
            />
            {/* Center table facet */}
            <path
              d="M 50 28 C 60 40, 70 56, 70 66 C 70 74, 61 80, 50 80 C 39 80, 30 74, 30 66 C 30 56, 40 40, 50 28 Z"
              fill="#ffffff"
              fillOpacity="0.45"
            />
            <line x1="50" y1="12" x2="50" y2="90" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.8" />
            <circle cx="44" cy="42" r="3" fill="#ffffff" />
          </svg>
        </div>
      );

    case 9:
      // VIP 9: Heart Cut (Romantic Masterpiece)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            <defs>
              <linearGradient id="g9-heart" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0e7ff" />
                <stop offset="40%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#3730a3" />
              </linearGradient>
            </defs>
            <path
              d="M 50 26 C 44 14, 20 12, 14 30 C 8 50, 34 74, 50 90 C 66 74, 92 50, 86 30 C 80 12, 56 14, 50 26 Z"
              fill="#1e1b4b"
            />
            <path
              d="M 50 29 C 45 18, 24 16, 18 32 C 13 49, 36 71, 50 86 C 64 71, 87 49, 82 32 C 76 16, 55 18, 50 29 Z"
              fill="url(#g9-heart)"
            />
            {/* Center table */}
            <path
              d="M 50 40 C 46 32, 32 30, 28 42 C 24 54, 40 68, 50 78 C 60 68, 76 54, 72 42 C 68 30, 54 32, 50 40 Z"
              fill="#ffffff"
              fillOpacity="0.45"
            />
            <circle cx="34" cy="34" r="2.5" fill="#ffffff" />
            <circle cx="64" cy="36" r="1.5" fill="#ffffff" />
          </svg>
        </div>
      );

    case 10:
    default:
      // VIP 10: Crown Royal Asscher Cut (Gold & Royal Diamond Prism)
      return (
        <div className={containerClass}>
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
            <defs>
              <linearGradient id="g10-gold-diamond" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="30%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>
              <radialGradient id="g10-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>
            </defs>
            {/* Octagonal Asscher Outer */}
            <polygon points="28,8 72,8 92,28 92,72 72,92 28,92 8,72 8,28" fill="#451a03" />
            <polygon points="30,10 70,10 90,30 90,70 70,90 30,90 10,70 10,30" fill="url(#g10-gold-diamond)" />
            {/* Step 2 */}
            <polygon points="34,16 66,16 84,34 84,66 66,84 34,84 16,66 16,34" fill="#fbbf24" fillOpacity="0.8" />
            {/* Step 3 */}
            <polygon points="38,24 62,24 76,38 76,62 62,76 38,76 24,62 24,38" fill="#d97706" />
            {/* Asscher Windmill Center */}
            <polygon points="42,32 58,32 68,42 68,58 58,68 42,68 32,58 32,42" fill="url(#g10-core)" />
            {/* Windmill Facet Lines */}
            <line x1="8" y1="8" x2="92" y2="92" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.9" />
            <line x1="92" y1="8" x2="8" y2="92" stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.9" />
            {/* Crown Embellishment */}
            <circle cx="50" cy="50" r="4" fill="#ffffff" />
            <circle cx="36" cy="22" r="2" fill="#ffffff" />
          </svg>
        </div>
      );
  }
};
