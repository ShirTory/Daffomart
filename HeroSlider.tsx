"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Banner } from "@/lib/types";

export default function HeroSlider({ banners }: { banners: Banner[] }) {
  const [i, setI] = useState(0);
  const [pause, setPause] = useState(false);
  const n = banners.length;
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (n < 2 || pause) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 5500);
    return () => clearInterval(t);
  }, [n, pause]);

  const onTouchStart = useCallback((e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; setPause(true); }, []);
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) setI((x) => (dx < 0 ? (x + 1) % n : (x - 1 + n) % n));
    touchX.current = null;
    setPause(false);
  }, [n]);

  if (n === 0) return null;

  return (
    <section
      className="group relative overflow-hidden rounded-2xl bg-gray-100 shadow-card"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
    >
      <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${i * 100}%)` }}>
        {banners.map((b, idx) => {
          const hasText = b.title || b.subtitle || b.ctaLabel || b.description || b.discountText;
          const inner = (
            <div className="relative aspect-[4/3] w-full sm:aspect-[21/7] md:aspect-[16/5]">
              <picture>
                {b.mobileImage && <source media="(max-width: 639px)" srcSet={b.mobileImage} />}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.image}
                  alt={b.title || "Offer"}
                  className="absolute inset-0 h-full w-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  decoding="async"
                />
              </picture>
              {b.discountText && (
                <span className="absolute right-3 top-3 rounded-full bg-accent px-3 py-1 text-xs font-bold text-white shadow sm:right-5 sm:top-5 sm:text-sm">
                  {b.discountText}
                </span>
              )}
              {hasText && (
                <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/65 via-black/30 to-transparent px-5 sm:px-12">
                  <div className="max-w-lg text-white">
                    {b.title && <h2 className="text-xl font-extrabold leading-tight drop-shadow sm:text-3xl md:text-4xl">{b.title}</h2>}
                    {b.subtitle && <p className="mt-1.5 text-sm text-white/90 sm:mt-2 sm:text-base">{b.subtitle}</p>}
                    {b.description && <p className="mt-1 hidden text-sm text-white/80 sm:block line-clamp-2">{b.description}</p>}
                    {b.ctaLabel && <span className="btn-accent mt-3 inline-flex px-5 py-2 text-sm sm:mt-4 sm:px-6 sm:py-2.5">{b.ctaLabel}</span>}
                  </div>
                </div>
              )}
            </div>
          );
          return (
            <div key={b.id} className="w-full shrink-0" aria-hidden={idx !== i}>
              {b.ctaHref ? (
                <Link href={b.ctaHref} tabIndex={idx === i ? 0 : -1}>{inner}</Link>
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <>
          <button
            onClick={() => setI((i - 1 + n) % n)}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg shadow transition hover:bg-white sm:left-3 sm:h-10 sm:w-10 sm:group-hover:flex"
          >
            ‹
          </button>
          <button
            onClick={() => setI((i + 1) % n)}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg shadow transition hover:bg-white sm:right-3 sm:h-10 sm:w-10 sm:group-hover:flex"
          >
            ›
          </button>
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5 sm:bottom-3 sm:gap-2">
            {banners.map((b, k) => (
              <button
                key={b.id}
                onClick={() => setI(k)}
                aria-label={`Slide ${k + 1}`}
                className={`h-1.5 rounded-full transition-all sm:h-2 ${k === i ? "w-5 bg-white sm:w-6" : "w-1.5 bg-white/60 sm:w-2"}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
