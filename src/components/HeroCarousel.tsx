import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ASSETS } from '../data/constants.ts';

export const HeroCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const slides = ASSETS.heroSlides;

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartX.current = null;
    setIsPaused(false);
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl shadow-sm border border-slate-200/80 bg-slate-900 group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Aspect Ratio Box 16:9 */}
      <div className="relative aspect-16/9 w-full overflow-hidden">
        {slides.map((slide, idx) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <img
              src={slide.image}
              alt={slide.alt}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Scrim Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

            {/* Captions */}
            <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 text-white z-20 flex flex-col justify-end">
              <span className="text-[11px] font-semibold text-amber-300 tracking-wider uppercase mb-1">
                {slide.tag}
              </span>
              <h2 className="font-display font-bold text-lg sm:text-2xl text-white tracking-tight leading-tight">
                {slide.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-200/90 mt-0.5 font-normal max-w-lg">
                {slide.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Manual Arrow Controls */}
      <button
        onClick={handlePrev}
        aria-label="Previous Slide"
        className="absolute left-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/40 text-white/90 hover:bg-black/70 hover:text-white transition-colors backdrop-blur-xs"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNext}
        aria-label="Next Slide"
        className="absolute right-2 top-1/2 -translate-y-1/2 z-30 p-1.5 rounded-full bg-black/40 text-white/90 hover:bg-black/70 hover:text-white transition-colors backdrop-blur-xs"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Pagination Dots */}
      <div className="absolute bottom-2 right-4 z-30 flex items-center gap-1.5">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`transition-all rounded-full ${
              idx === currentIndex
                ? 'w-5 h-1.5 bg-amber-400'
                : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>
    </div>
  );
};
