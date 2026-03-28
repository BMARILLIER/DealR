"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { cars } from "@/data/cars";
import { scoreCar } from "@/lib/score";
import { ScoredCar } from "@/lib/types";
import CarCard from "@/components/CarCard";
import Filters, { FilterValues } from "@/components/Filters";
import Header from "@/components/Header";
import PremiumModal from "@/components/PremiumModal";
import Analyzer from "@/components/Analyzer";

const scoredCars = cars.map(scoreCar);

const DEFAULT_FILTERS: FilterValues = {
  maxPrice: 0, maxKm: 0, brand: "", model: "",
  yearMin: 0, yearMax: 0, fuel: "", gearbox: "",
  seller: "Tous", location: "", radius: 0, equipment: [],
};

export default function Home() {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState("best");
  const [customCars, setCustomCars] = useState<ScoredCar[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [analyzedEntries, setAnalyzedEntries] = useState<{ id: number; date: string }[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; carId: number; type: string; icon: string; message: string; date: string }[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dealr-favorites");
      if (stored) setFavoriteIds(JSON.parse(stored));
    } catch { /* ignore */ }
    try {
      const history = localStorage.getItem("dealr-analyzed-v2");
      if (history) setAnalyzedEntries(JSON.parse(history));
    } catch { /* ignore */ }
    try {
      const a = localStorage.getItem("dealr-alerts");
      if (a) setAlerts(JSON.parse(a));
    } catch { /* ignore */ }
  }, []);

  const toggleFavorite = useCallback((id: number) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [id, ...prev].slice(0, 20);
      try { localStorage.setItem("dealr-favorites", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const toggleCompare = useCallback((id: number) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }, []);

  const filtered = useMemo(() => scoredCars.filter((car) => {
    const f = filters;
    if (f.maxPrice > 0 && car.price > f.maxPrice) return false;
    if (f.maxKm > 0 && car.km > f.maxKm) return false;
    if (f.brand && f.brand !== "__other__" && car.brand !== f.brand) return false;
    if (f.brand === "__other__" && f.model && !car.title.toLowerCase().includes(f.model.toLowerCase())) return false;
    if (f.brand && f.brand !== "__other__" && f.model && car.model !== f.model) return false;
    if (f.yearMin > 0 && car.year < f.yearMin) return false;
    if (f.yearMax > 0 && car.year > f.yearMax) return false;
    if (f.fuel && car.fuel !== f.fuel) return false;
    if (f.gearbox && car.gearbox !== f.gearbox) return false;
    if (f.seller && f.seller !== "Tous" && car.seller !== f.seller) return false;
    if (f.location && f.radius > 0 && !car.location.toLowerCase().includes(f.location.toLowerCase().trim())) return false;
    if (f.equipment.length > 0 && !f.equipment.every((eq) => car.equipment.includes(eq))) return false;
    return true;
  }), [filters]);

  // Track analyzed cars (most recent first, max 20, no duplicates)
  useEffect(() => {
    if (filtered.length === 0) return;
    const now = new Date().toISOString();
    setAnalyzedEntries((prev) => {
      const existingIds = new Set(prev.map((e) => e.id));
      const newEntries = filtered
        .filter((c) => !existingIds.has(c.id))
        .map((c) => ({ id: c.id, date: now }));
      if (newEntries.length === 0) return prev;
      const next = [...newEntries, ...prev].slice(0, 20);
      localStorage.setItem("dealr-analyzed-v2", JSON.stringify(next));
      return next;
    });
  }, [filtered]);

  const best = filtered.length > 0 ? filtered.reduce((a, b) => (a.score >= b.score ? a : b)) : null;
  const totalSavings = filtered.reduce((s, c) => c.target_price < c.price ? s + (c.price - c.target_price) : s, 0);
  const topOpportunities = [...filtered].sort((a, b) => (b.score + (b.price - b.target_price) * 0.01) - (a.score + (a.price - a.target_price) * 0.01)).slice(0, 3);
  const favorites = scoredCars.filter((c) => favoriteIds.includes(c.id));
  const analyzed = analyzedEntries
    .map((e) => {
      const car = scoredCars.find((c) => c.id === e.id);
      return car ? { ...car, analyzedAt: e.date } : null;
    })
    .filter((c): c is ScoredCar & { analyzedAt: string } => c !== null);

  // Generate alerts for favorite cars only
  useEffect(() => {
    if (favorites.length === 0) return;
    const now = new Date().toISOString();
    setAlerts((prev) => {
      const existingKeys = new Set(prev.map((a) => a.id));
      const newAlerts: typeof prev = [];

      for (const car of favorites) {
        const priceDropped = car.price_history.length > 1 && car.price_history[0] > car.price_history[car.price_history.length - 1];
        const drop = priceDropped ? car.price_history[0] - car.price_history[car.price_history.length - 1] : 0;

        if (priceDropped && !existingKeys.has(`price-${car.id}`)) {
          newAlerts.push({ id: `price-${car.id}`, carId: car.id, type: "Prix en baisse", icon: "📉", message: `${car.title} a baissé de ${drop.toLocaleString("fr-FR")} €`, date: now });
        }
        if (car.score > 85 && car.price < car.market.dealr_market_price && !existingKeys.has(`rare-${car.id}`)) {
          newAlerts.push({ id: `rare-${car.id}`, carId: car.id, type: "Opportunité rare", icon: "🔥", message: `${car.title} — score ${car.score}, sous le marché`, date: now });
        }
        if (car.score > 80 && car.days_online < 20 && !existingKeys.has(`buy-${car.id}`)) {
          newAlerts.push({ id: `buy-${car.id}`, carId: car.id, type: "Moment d'acheter", icon: "⚡", message: `${car.title} — annonce récente, excellent score`, date: now });
        }
      }

      if (newAlerts.length === 0) return prev;
      const next = [...newAlerts, ...prev].slice(0, 30);
      try { localStorage.setItem("dealr-alerts", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [favorites]);

  function removeAlert(id: string) {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      try { localStorage.setItem("dealr-alerts", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function clearAlerts() {
    setAlerts([]);
    try { localStorage.removeItem("dealr-alerts"); } catch { /* ignore */ }
  }

  function removeAnalyzed(id: number) {
    setAnalyzedEntries((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try { localStorage.setItem("dealr-analyzed-v2", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function clearAnalyzed() {
    setAnalyzedEntries([]);
    try { localStorage.removeItem("dealr-analyzed-v2"); } catch { /* ignore */ }
  }
  const compareCars = compareIds.map((id) => scoredCars.find((c) => c.id === id)).filter((c): c is ScoredCar => c !== undefined);
  const dealsAboveMarket = filtered.filter((c) => c.market.gap > 0).length;

  // Recommendation: best across ALL cars (even outside filters)
  const recommendation = useMemo(() => {
    if (filters.equipment.length === 0) return null;
    const ranked = scoredCars
      .map((car) => {
        const eqMatch = filters.equipment.filter((eq) => car.equipment.includes(eq)).length;
        const eqScore = filters.equipment.length > 0 ? eqMatch / filters.equipment.length : 0;
        return { car, eqScore, combined: car.score * 0.6 + eqScore * 100 * 0.4 };
      })
      .sort((a, b) => b.combined - a.combined);
    const top = ranked[0];
    if (!top || top.combined < 50) return null;
    const isInFiltered = filtered.some((c) => c.id === top.car.id);
    return { car: top.car, eqScore: Math.round(top.eqScore * 100), isOutsideFilters: !isInFiltered };
  }, [filters, filtered]);

  // Match percentage per car
  function matchPercent(car: ScoredCar): number {
    if (filters.equipment.length === 0) return 0;
    const matched = filters.equipment.filter((eq) => car.equipment.includes(eq)).length;
    return Math.round((matched / filters.equipment.length) * 100);
  }

  // Active filters summary
  const summaryParts: string[] = [];
  if (filters.brand && filters.brand !== "__other__") summaryParts.push(filters.brand + (filters.model ? ` ${filters.model}` : ""));
  if (filters.maxPrice > 0) summaryParts.push(`Budget ${filters.maxPrice.toLocaleString("fr-FR")} €`);
  if (filters.maxKm > 0) summaryParts.push(`Max ${filters.maxKm.toLocaleString("fr-FR")} km`);
  if (filters.fuel) summaryParts.push(filters.fuel);
  if (filters.gearbox) summaryParts.push(filters.gearbox);
  if (filters.yearMin > 0) summaryParts.push(`Après ${filters.yearMin}`);
  if (filters.yearMax > 0) summaryParts.push(`Avant ${filters.yearMax}`);
  if (filters.seller && filters.seller !== "Tous") summaryParts.push(filters.seller);
  if (filters.location && filters.radius > 0) summaryParts.push(`${filters.location} · ${filters.radius} km`);
  else if (filters.location && filters.radius === 0) summaryParts.push(filters.location);
  if (filters.equipment.length > 0) summaryParts.push(filters.equipment.join(", "));

  const SORT_LABELS: Record<string, string> = {
    best: "Meilleures affaires", negotiable: "Plus négociables",
    "price-asc": "Prix croissant", "price-desc": "Prix décroissant",
    recent: "Plus récentes", oldest: "Plus anciennes", match: "Meilleur match",
  };

  function handleUnlock() { setShowPremiumModal(true); }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      {/* ─── HERO ─── */}
      <div className="border-b border-zinc-200/60 bg-gradient-to-b from-white to-zinc-50/80">
        <div className="mx-auto max-w-4xl px-8 pt-24 pb-20">
          <h2 className="text-[clamp(4rem,12vw,8rem)] font-black tracking-[-0.06em] leading-[0.85] text-zinc-900">
            DEAL<span className="text-emerald-600">R</span>
          </h2>
          <p className="mt-6 text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900/70">
            Trouvez la bonne affaire. Payez le juste prix.
          </p>
          <p className="mt-2 text-base text-zinc-400 font-light tracking-wide">
            Scoring, analyse marché et négociation — en un coup d&apos;oeil.
          </p>

          {filtered.length > 0 && (
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="animate-[fadeInUp_0.4s_ease-out]">
                <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-medium">Annonces</p>
                <p className="mt-1.5 text-4xl font-black text-zinc-900 tracking-tight">{filtered.length}</p>
              </div>
              {best && (
                <div className="animate-[fadeInUp_0.5s_ease-out]">
                  <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-medium">Meilleur score</p>
                  <p className="mt-1.5 text-4xl font-black text-emerald-600 tracking-tight">{best.score}</p>
                </div>
              )}
              {totalSavings > 0 && (
                <div className="animate-[fadeInUp_0.6s_ease-out]">
                  <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-medium">Économie totale</p>
                  <p className={`mt-1.5 text-4xl font-black tracking-tight ${isPremium ? "text-emerald-600" : "text-emerald-600 blur-lg select-none"}`}>
                    {totalSavings.toLocaleString("fr-FR")} €
                  </p>
                </div>
              )}
              {dealsAboveMarket > 0 && (
                <div className="animate-[fadeInUp_0.7s_ease-out]">
                  <p className="text-[11px] text-zinc-400 uppercase tracking-widest font-medium">Surcotées</p>
                  <p className="mt-1.5 text-4xl font-black text-red-500 tracking-tight">{dealsAboveMarket}</p>
                </div>
              )}
            </div>
          )}

          {!isPremium && (
            <button onClick={handleUnlock} className="mt-10 rounded-xl bg-zinc-900 px-8 py-3.5 text-sm font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-lg cursor-pointer shadow-sm">
              Voir l&apos;analyse complète &rarr;
            </button>
          )}
        </div>
      </div>

      {/* ─── TOP DEAL BANNER ─── */}
      {best && (
        <div className="border-b border-zinc-200/60 bg-emerald-50/40">
          <div className="mx-auto max-w-4xl px-8 py-6 flex items-center justify-between gap-6 animate-[fadeIn_0.5s_ease-out]">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-xl">🔥</span>
              <div>
                <p className="text-sm font-bold text-zinc-900">Top Deal — {best.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Score {best.score}/100 · {best.trim}
                  {best.market.gap > 0 && ` · ${best.market.gap.toLocaleString("fr-FR")} € de marge`}
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              {best.score >= 80 && <span className="rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Top Deal</span>}
              {best.days_online > 30 && <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">Marge forte</span>}
              {best.score > 80 && best.days_online < 20 && <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-red-500">À saisir</span>}
            </div>
          </div>
        </div>
      )}

      {/* ─── TODAY'S OPPORTUNITIES ─── */}
      {topOpportunities.length > 0 && (
        <div className="border-b border-zinc-200/60">
          <div className="mx-auto max-w-4xl px-8 py-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Opportunités du jour</span>
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-600 ml-2">Live</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
              {topOpportunities.map((car, i) => {
                const saving = car.price - car.market.negotiated_price;
                const scoreColor = car.score >= 80 ? "text-emerald-600" : car.score >= 60 ? "text-amber-600" : "text-zinc-400";
                const mp = matchPercent(car);
                return (
                  <div key={car.id} className={`shrink-0 w-72 rounded-2xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md animate-[fadeIn_0.4s_ease-out] ${i === 0 ? "border-emerald-200 ring-1 ring-emerald-100" : "border-zinc-200"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-3xl font-black tracking-tight ${scoreColor}`}>{car.score}</span>
                      <div className="flex gap-1.5">
                        {i === 0 && <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">TOP</span>}
                        {mp >= 80 && <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-600">Match {mp}%</span>}
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-zinc-900 truncate">{car.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">{car.km.toLocaleString("fr-FR")} km · {car.year} · {car.trim}</p>
                    <div className="mt-4 flex items-baseline justify-between border-t border-zinc-100 pt-3">
                      <span className="text-base font-bold text-zinc-900">{car.price.toLocaleString("fr-FR")} €</span>
                      {saving > 0 && (
                        <span className={`text-sm font-bold ${isPremium ? "text-emerald-600" : "text-emerald-600 blur-sm select-none"}`}>−{saving.toLocaleString("fr-FR")} €</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl px-8 py-12">
        {/* ─── FILTERS ─── */}
        <Filters values={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

        {/* ─── ANALYZER ─── */}
        <div className="mt-8">
          <Analyzer onResult={(car) => setCustomCars((prev) => [car, ...prev].slice(0, 10))} />
        </div>

        {/* Custom analyzed cars */}
        {customCars.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Vos analyses</span>
              <div className="flex-1 h-px bg-zinc-200" />
            </div>
            <div className="flex flex-col gap-5">
              {customCars.map((car) => (
                <div key={car.id}>
                  <CarCard car={car} isPremium={isPremium} onUnlock={handleUnlock} isFavorite={favoriteIds.includes(car.id)} onToggleFavorite={toggleFavorite} isComparing={compareIds.includes(car.id)} onToggleCompare={toggleCompare} matchPercent={matchPercent(car)} />
                  <p className="mt-2 text-[10px] text-zinc-300">Analyse basée sur le marché actuel · Estimation issue de données comparables · Résultat indicatif</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filter summary */}
        {summaryParts.length > 0 && (
          <p className="mt-5 text-sm text-zinc-400">
            <span className="text-zinc-600 font-medium">{filtered.length}</span> résultat{filtered.length !== 1 && "s"} · {summaryParts.join(" • ")} · <span className="text-zinc-500">{SORT_LABELS[sortBy] || SORT_LABELS.best}</span>
          </p>
        )}
        {summaryParts.length === 0 && (
          <p className="mt-5 text-sm text-zinc-400">
            <span className="text-zinc-600 font-medium">{filtered.length}</span> résultat{filtered.length !== 1 && "s"} · <span className="text-zinc-500">{SORT_LABELS[sortBy] || SORT_LABELS.best}</span>
          </p>
        )}

        {/* Equipment match hint */}
        {filters.equipment.length > 0 && (
          <p className="mt-2 text-xs text-zinc-400">
            Recherche : <span className="text-zinc-600">{filters.equipment.join(", ")}</span>
          </p>
        )}

        {/* ─── RECOMMENDATION ─── */}
        {recommendation && recommendation.isOutsideFilters && (
          <div className="mt-8 animate-[fadeInUp_0.4s_ease-out]">
            <p className="mb-3 text-sm text-zinc-500 italic">Nous avons trouvé mieux que votre recherche.</p>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-lg">🔥</span>
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Recommandé pour vous</span>
                <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">Meilleur choix</span>
              </div>
              <CarCard car={recommendation.car} highlight isPremium={isPremium} onUnlock={handleUnlock} isFavorite={favoriteIds.includes(recommendation.car.id)} onToggleFavorite={toggleFavorite} isComparing={compareIds.includes(recommendation.car.id)} onToggleCompare={toggleCompare} matchPercent={recommendation.eqScore} />
              <p className="mt-3 text-xs text-zinc-500">
                {recommendation.car.equipment.length > (best?.equipment.length ?? 0)
                  ? "Plus d'équipements pour un prix similaire."
                  : recommendation.car.score > (best?.score ?? 0)
                    ? "Meilleur rapport prix / équipements."
                    : "Plus récent avec un bon score."}
              </p>
            </div>
          </div>
        )}

        {/* ─── COMPARISON ─── */}
        {compareCars.length === 2 && (
          <div className="mt-8 animate-[fadeIn_0.3s_ease-out] rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Face à face</span>
              <button onClick={() => setCompareIds([])} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">Fermer</button>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 text-sm">
              <p className="font-medium text-zinc-900 truncate">{compareCars[0].title}</p>
              <span />
              <p className="font-medium text-zinc-900 truncate text-right">{compareCars[1].title}</p>
              {([
                ["Prix", (c: ScoredCar) => c.price, "€"],
                ["Km", (c: ScoredCar) => c.km, "km"],
                ["Score", (c: ScoredCar) => c.score, "pts"],
                ["Économie", (c: ScoredCar) => Math.max(0, c.price - c.market.negotiated_price), "€"],
              ] as [string, (c: ScoredCar) => number, string][]).map(([label, fn, unit]) => {
                const a = fn(compareCars[0]), b = fn(compareCars[1]);
                const low = label !== "Score" && label !== "Économie";
                const aW = low ? a < b : a > b, bW = low ? b < a : b > a;
                return (
                  <React.Fragment key={label}>
                    <p className={aW ? "text-emerald-600 font-medium" : "text-zinc-400"}>{a.toLocaleString("fr-FR")} {unit}</p>
                    <p className="text-zinc-300 text-center text-xs self-center">{label}</p>
                    <p className={`text-right ${bW ? "text-emerald-600 font-medium" : "text-zinc-400"}`}>{b.toLocaleString("fr-FR")} {unit}</p>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-zinc-100 text-center">
              <p className="text-xs text-zinc-400">Meilleure option : <span className="text-emerald-600 font-medium">{compareCars[0].score >= compareCars[1].score ? compareCars[0].title : compareCars[1].title}</span></p>
            </div>
          </div>
        )}
        {compareIds.length === 1 && <p className="mt-6 text-xs text-zinc-400 animate-[fadeIn_0.2s_ease-out]">Sélectionnez une deuxième voiture.</p>}

        {/* ─── ALERTS ─── */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">🔔 Mes alertes</span>
            {alerts.length > 0 && <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold text-red-500">{alerts.length}</span>}
            <div className="flex-1 h-px bg-zinc-200" />
            {alerts.length > 0 && (
              <button onClick={clearAlerts} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                Tout effacer
              </button>
            )}
          </div>
          {alerts.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-300">Aucune alerte active.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {alerts.map((alert) => {
                const typeBg = alert.type === "Prix en baisse"
                  ? "border-emerald-200 bg-emerald-50/50"
                  : alert.type === "Opportunité rare"
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-blue-200 bg-blue-50/50";
                const typeColor = alert.type === "Prix en baisse"
                  ? "text-emerald-700 bg-emerald-100 border-emerald-200"
                  : alert.type === "Opportunité rare"
                    ? "text-amber-700 bg-amber-100 border-amber-200"
                    : "text-blue-700 bg-blue-100 border-blue-200";
                const dateStr = new Date(alert.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={alert.id} className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-sm animate-[fadeIn_0.3s_ease-out] ${typeBg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-lg shrink-0 mt-0.5">{alert.icon}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${typeColor}`}>{alert.type}</span>
                            <span className="text-[11px] text-zinc-400">{dateStr}</span>
                          </div>
                          <p className="mt-1.5 text-sm text-zinc-700">{alert.message}</p>
                        </div>
                      </div>
                      <button onClick={() => removeAlert(alert.id)} className="shrink-0 text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer mt-0.5">
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── FAVORITES ─── */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">❤️ Mes favoris</span>
            <span className="text-xs text-zinc-300">{favorites.length}/20</span>
            <div className="flex-1 h-px bg-zinc-200" />
            {favorites.length > 0 && (
              <button onClick={() => { setFavoriteIds([]); try { localStorage.removeItem("dealr-favorites"); } catch { /* ignore */ } }} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                Tout retirer
              </button>
            )}
          </div>
          {favorites.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-300">Aucun favori pour le moment.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...favorites].sort((a, b) => b.score - a.score).map((car) => {
                const scoreColor = car.score >= 80 ? "text-emerald-600" : car.score >= 60 ? "text-amber-600" : "text-zinc-400";
                const isTopDeal = car.score >= 80 && car.market.gap_percent <= 0;
                const isWatch = !isTopDeal && car.score >= 60;
                const priceDropped = car.price_history.length > 1 && car.price_history[0] > car.price_history[car.price_history.length - 1];
                const trend = priceDropped ? "↓ Prix en baisse" : "Prix stable";
                const verdict = car.score >= 75 && car.market.gap_percent <= 3 ? "Bonne opportunité" : "À surveiller";
                return (
                  <div key={car.id} className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 hover:shadow-md animate-[fadeIn_0.3s_ease-out] ${isTopDeal ? "border-emerald-200 ring-1 ring-emerald-100" : "border-zinc-200"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{car.title}</p>
                          {isTopDeal && <span className="shrink-0 rounded-full bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-700">Top Deal</span>}
                          {isWatch && <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-600">À surveiller</span>}
                        </div>
                        <p className="mt-1 text-xs text-zinc-400">
                          {car.price.toLocaleString("fr-FR")} € · {car.km.toLocaleString("fr-FR")} km · {car.platform}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                          <span className={priceDropped ? "text-emerald-600" : "text-zinc-300"}>{trend}</span>
                          <span className="text-zinc-200">·</span>
                          <span className={car.score >= 75 && car.market.gap_percent <= 3 ? "text-emerald-600 font-medium" : "text-zinc-400"}>{verdict}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 text-lg font-black ${scoreColor}`}>{car.score}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {car.url && (
                        <a href={car.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 transition-colors">
                          Voir
                        </a>
                      )}
                      <button onClick={() => toggleFavorite(car.id)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer">
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── ANALYZED HISTORY ─── */}
        <div className="mt-10">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Mes analyses</span>
            <span className="text-xs text-zinc-300">{analyzed.length}</span>
            <div className="flex-1 h-px bg-zinc-200" />
            {analyzed.length > 0 && (
              <button onClick={clearAnalyzed} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                Vider l&apos;historique
              </button>
            )}
          </div>
          {analyzed.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-300">Aucune analyse enregistrée.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {analyzed.map((car) => {
                const scoreColor = car.score >= 80 ? "text-emerald-600" : car.score >= 60 ? "text-amber-600" : "text-zinc-400";
                const dateStr = new Date(car.analyzedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={car.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">{car.title}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {car.price.toLocaleString("fr-FR")} € · {car.platform}
                        </p>
                        <p className="mt-0.5 text-[11px] text-zinc-300">Analysé le {dateStr}</p>
                      </div>
                      <span className={`shrink-0 text-lg font-black ${scoreColor}`}>{car.score}</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {car.url && (
                        <a href={car.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 transition-colors">
                          Voir
                        </a>
                      )}
                      <button onClick={() => removeAnalyzed(car.id)} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] text-zinc-400 hover:text-red-500 hover:border-red-200 transition-colors cursor-pointer">
                        Supprimer
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── BEST CAR ─── */}
        {best && (
          <div className="mt-10 animate-[fadeInUp_0.4s_ease-out]">
            {(() => {
              const cheapest = filtered.reduce((a, b) => (a.price <= b.price ? a : b));
              return best.id !== cheapest.id && <p className="mb-4 text-sm text-zinc-500 italic">Pas la moins chère — la plus intelligente.</p>;
            })()}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-lg">🔥</span>
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Meilleure opportunité</span>
              {best.score >= 80 && <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">Top score</span>}
              {best.days_online > 30 && <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-[10px] font-semibold text-zinc-500">Marge forte</span>}
            </div>
            <CarCard car={best} highlight isPremium={isPremium} onUnlock={handleUnlock} isFavorite={favoriteIds.includes(best.id)} onToggleFavorite={toggleFavorite} isComparing={compareIds.includes(best.id)} onToggleCompare={toggleCompare} matchPercent={matchPercent(best)} />
          </div>
        )}

        {/* ─── ALL DEALS ─── */}
        {filtered.length > 1 && (
          <div className="mt-12 mb-6 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Toutes les annonces</span>
            <div className="flex-1 h-px bg-zinc-200" />
            <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 shadow-sm">
              <label className="text-[10px] text-zinc-400 uppercase tracking-widest whitespace-nowrap">Trier</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-xs text-zinc-700 outline-none cursor-pointer appearance-none pr-1">
                <option value="best">Meilleures affaires</option>
                <option value="negotiable">Plus négociables</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
                <option value="recent">Plus récentes</option>
                <option value="oldest">Plus anciennes</option>
                <option value="match">Meilleur match</option>
              </select>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-5">
          {filtered.length === 0 && <p className="py-16 text-center text-zinc-400 text-sm">Aucun résultat. Ajustez vos filtres.</p>}
          {[...filtered].sort((a, b) => {
            switch (sortBy) {
              case "best": return b.score - a.score;
              case "negotiable": return b.days_online - a.days_online;
              case "price-asc": return a.price - b.price;
              case "price-desc": return b.price - a.price;
              case "recent": return a.days_online - b.days_online;
              case "oldest": return b.days_online - a.days_online;
              case "match": return matchPercent(b) - matchPercent(a);
              default: return 0;
            }
          }).map((car) => (
            <CarCard key={car.id} car={car} bestCar={best ?? undefined} isPremium={isPremium} onUnlock={handleUnlock} isFavorite={favoriteIds.includes(car.id)} onToggleFavorite={toggleFavorite} isComparing={compareIds.includes(car.id)} onToggleCompare={toggleCompare} matchPercent={matchPercent(car)} />
          ))}
        </div>

        {/* ─── CONVERSION CTA ─── */}
        {!isPremium && (
          <div className="mt-16 rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm animate-[fadeInUp_0.5s_ease-out]">
            <p className="text-3xl font-black tracking-tight text-zinc-900">
              Économisez jusqu&apos;à <span className="text-emerald-600 blur-lg select-none">{totalSavings.toLocaleString("fr-FR")} €</span>
            </p>
            <p className="mt-3 text-base text-zinc-500">Prix cibles, messages de négociation, verdicts d&apos;achat — tout est prêt.</p>
            <button onClick={handleUnlock} className="mt-8 rounded-xl bg-zinc-900 px-10 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800 hover:shadow-lg cursor-pointer shadow-sm">
              Voir l&apos;analyse complète
            </button>
            <p className="mt-3 text-xs text-zinc-400">Activation instantanée · Aucun engagement</p>
          </div>
        )}

        <div className="mt-16 border-t border-zinc-200 pt-8 text-center">
          <p className="text-xs text-zinc-400">DEALR — Trouvez la bonne affaire. Payez le juste prix.</p>
        </div>
      </div>

      {showPremiumModal && (
        <PremiumModal savings={totalSavings} onClose={() => setShowPremiumModal(false)} onActivate={() => { setIsPremium(true); setShowPremiumModal(false); }} />
      )}
    </div>
  );
}
