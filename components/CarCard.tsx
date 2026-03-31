"use client";

import { ScoredCar } from "@/lib/types";
import { useState } from "react";

const DEAL_BADGES: Record<string, { text: string; color: string; bg: string }> = {
  Excellent: { text: "Excellent", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  Bon:       { text: "Good",     color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" },
  Moyen:     { text: "Average",  color: "text-zinc-500",    bg: "bg-zinc-100 border-zinc-200" },
};

function negoLevel(days: number) {
  if (days > 60) return { text: "Very high", badge: "High leverage",  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
  if (days > 30) return { text: "High",      badge: "Good leverage",  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" };
  if (days > 15) return { text: "Medium",    badge: "Some leverage",  color: "text-amber-600",   bg: "bg-amber-50 border-amber-200" };
  return                { text: "Low",       badge: "Firm price",     color: "text-zinc-500",    bg: "bg-zinc-100 border-zinc-200" };
}

function diffLabel(val: number, unit: string) {
  if (val === 0) return <span className="text-zinc-400">—</span>;
  const sign = val > 0 ? "+" : "";
  const color = val > 0 ? "text-red-500" : "text-emerald-600";
  return <span className={color}>{sign}{val.toLocaleString("fr-FR")} {unit}</span>;
}

function smartBadges(car: ScoredCar): { text: string; cls: string }[] {
  const b: { text: string; cls: string }[] = [];
  if (car.price < car.estimated_market_price) b.push({ text: "Sous le marché", cls: "text-emerald-600 bg-emerald-50 border-emerald-200" });
  if (car.days_online > 60) b.push({ text: "Rare window", cls: "text-amber-600 bg-amber-50 border-amber-200" });
  if (car.price_history.length > 1 && car.price_history[0] > car.price_history[car.price_history.length - 1]) b.push({ text: "Price dropped", cls: "text-emerald-600 bg-emerald-50 border-emerald-200" });
  if (car.km < 60000) b.push({ text: "Low km", cls: "text-zinc-500 bg-zinc-100 border-zinc-200" });
  return b.slice(0, 3);
}

interface CarCardProps {
  car: ScoredCar;
  highlight?: boolean;
  bestCar?: ScoredCar;
  isPremium?: boolean;
  onUnlock?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: number) => void;
  isComparing?: boolean;
  onToggleCompare?: (id: number) => void;
  matchPercent?: number;
  multiPlatform?: boolean;
}

export default function CarCard({ car, highlight = false, bestCar, isPremium = false, onUnlock, isFavorite = false, onToggleFavorite, isComparing = false, onToggleCompare, matchPercent = 0, multiPlatform = false }: CarCardProps) {
  const [showCompare, setShowCompare] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasDiscount = car.target_price < car.price;
  const deal = DEAL_BADGES[car.label];
  const nego = negoLevel(car.days_online);
  const canCompare = bestCar && bestCar.id !== car.id;
  const scoreBarColor = car.score >= 80 ? "bg-emerald-500" : car.score >= 60 ? "bg-amber-400" : "bg-zinc-300";
  const badges = smartBadges(car);

  return (
    <div className={`group rounded-2xl border transition-all duration-300 animate-[fadeIn_0.4s_ease-out] hover:scale-[1.005] ${
      highlight
        ? "border-emerald-200 bg-emerald-50/30 shadow-md shadow-emerald-100/50 hover:shadow-lg hover:shadow-emerald-100/60"
        : "border-zinc-200 bg-white shadow-sm hover:shadow-md hover:border-zinc-300"
    }`}>

      {/* Photo area */}
      <div className={`relative h-36 rounded-t-2xl overflow-hidden ${
        highlight ? "bg-gradient-to-br from-emerald-50 to-white" : "bg-gradient-to-br from-zinc-50 to-white"
      }`}>
        {car.image ? (
          <img src={car.image} alt={car.title} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl opacity-20">{car.brand?.[0] ?? "?"}</span>
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {highlight && (
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white shadow-sm">
              Top Deal
            </span>
          )}
          <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[10px] font-medium text-zinc-600">
            {car.source}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${deal.bg} ${deal.color}`}>
            {car.score}
          </span>
        </div>
      </div>

      <div className="p-6 pt-4">
        {/* Title */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-zinc-900">{car.title}</h2>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
              <span>{car.year}</span><span>·</span><span>{car.trim}</span><span>·</span><span>{car.location}</span>
            </div>
          </div>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${nego.bg} ${nego.color}`}>{nego.badge}</span>
        </div>

        {/* Multi-platform */}
        {multiPlatform && (
          <p className="mt-2 text-[11px] text-zinc-400">Disponible sur plusieurs plateformes</p>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.map((b) => <span key={b.text} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${b.cls}`}>{b.text}</span>)}
          </div>
        )}

        {/* Match + Equipment */}
        {matchPercent >= 80 && (
          <div className="mt-3">
            <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
              Match {matchPercent}% — Parfait pour vous
            </span>
          </div>
        )}
        {car.equipment.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {car.equipment.map((eq) => (
              <span key={eq} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-500">{eq}</span>
            ))}
          </div>
        )}

        {/* Publication */}
        <div className="mt-4 flex items-center gap-2 text-xs">
          <span className="text-zinc-400">Publié le {car.publication.posted_date}</span>
          <span className="text-zinc-200">·</span>
          <span className="text-zinc-500 font-medium">{car.publication.duration_label}</span>
          {car.days_online > 90 && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Très négociable</span>}
          {car.days_online > 60 && car.days_online <= 90 && <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Forte négociation</span>}
          {car.days_online > 30 && car.days_online <= 60 && <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-600">Négociation possible</span>}
        </div>

        {/* Score bar */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1 h-1 rounded-full bg-zinc-100 overflow-hidden">
            <div className={`h-full rounded-full ${scoreBarColor} transition-all duration-700 ease-out`} style={{ width: `${car.score}%` }} />
          </div>
          <span className={`text-xs font-medium ${deal.color}`}>{deal.text}</span>
        </div>

        {/* ─── PRICING ─── */}
        <div className="mt-6 border-t border-zinc-100 pt-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Price</p>
              <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">
                {car.price.toLocaleString("fr-FR")}<span className="text-sm font-normal text-zinc-400 ml-0.5">€</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Target</p>
              <p className={`mt-1 text-xl font-semibold tracking-tight ${isPremium ? "text-emerald-600" : "blur-md select-none text-emerald-600"}`}>
                {car.target_price.toLocaleString("fr-FR")}<span className="text-sm font-normal ml-0.5">€</span>
              </p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Save</p>
              <p className={`mt-1 text-xl font-semibold tracking-tight ${isPremium ? "text-emerald-600" : "blur-md select-none text-emerald-600"}`}>
                {hasDiscount ? `−${(car.price - car.target_price).toLocaleString("fr-FR")}` : "—"}
                {hasDiscount && <span className="text-sm font-normal ml-0.5">€</span>}
              </p>
            </div>
          </div>
        </div>

        {/* ─── DEALR MARKET PRICE ─── */}
        <div className="mt-4 border-t border-zinc-100 pt-5">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">DEALR Market Price</p>
              {(() => {
                const pct = car.market.gap_percent;
                if (pct > 3) return <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-medium text-red-500">Au-dessus du marché</span>;
                if (pct < -3) return <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Sous le marché</span>;
                return <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-medium text-zinc-500">Aligné marché</span>;
              })()}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-zinc-400">Market est.</p>
                <p className={`mt-0.5 text-base font-semibold tracking-tight ${isPremium ? "text-zinc-900" : "blur-md select-none text-zinc-900"}`}>
                  {car.market.dealr_market_price.toLocaleString("fr-FR")} €
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Gap</p>
                <p className={`mt-0.5 text-base font-semibold tracking-tight ${isPremium ? (car.market.gap > 0 ? "text-red-500" : "text-emerald-600") : "blur-md select-none text-zinc-900"}`}>
                  {isPremium ? `${car.market.gap > 0 ? "+" : ""}${car.market.gap.toLocaleString("fr-FR")} €` : `${car.market.gap.toLocaleString("fr-FR")} €`}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Negotiated</p>
                <p className={`mt-0.5 text-base font-semibold tracking-tight ${isPremium ? "text-emerald-600" : "blur-md select-none text-emerald-600"}`}>
                  {car.market.negotiated_price.toLocaleString("fr-FR")} €
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── BUYER ADVANTAGE ─── */}
        {(() => {
          const overpay = car.market.gap;
          const saving = car.price - car.market.negotiated_price;
          const leveragePct = nego.text === "Very high" ? 12 : nego.text === "High" ? 8 : nego.text === "Medium" ? 5 : 2;
          return (
            <div className="mt-4 border-t border-zinc-100 pt-5">
              <div className={`rounded-xl border p-5 ${isPremium ? "border-emerald-200 bg-emerald-50/50" : "border-zinc-200 bg-zinc-50"}`}>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium mb-4">Your advantage</p>

                {/* Overpay alert */}
                {overpay > 0 && (
                  <div className={`flex items-center gap-3 rounded-lg px-4 py-3 mb-3 ${isPremium ? "bg-red-50 border border-red-100" : "bg-zinc-100 border border-zinc-200"}`}>
                    <span className="text-lg">⚠️</span>
                    <div>
                      <p className={`text-sm font-semibold ${isPremium ? "text-red-600" : "blur-[5px] select-none text-red-600"}`}>
                        You&apos;re paying {overpay.toLocaleString("fr-FR")} € too much
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        vs DEALR market estimate
                      </p>
                    </div>
                  </div>
                )}

                {/* Savings + margin */}
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-lg px-4 py-3 ${isPremium ? "bg-emerald-100/60 border border-emerald-200/60" : "bg-zinc-100 border border-zinc-200"}`}>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Potential saving</p>
                    <p className={`mt-1 text-2xl font-black tracking-tight ${isPremium ? "text-emerald-700" : "blur-lg select-none text-emerald-700"}`}>
                      {saving > 0 ? `${saving.toLocaleString("fr-FR")} €` : "—"}
                    </p>
                    {saving > 0 && isPremium && (
                      <p className="text-[10px] text-emerald-600/70 mt-1">Listed price → negotiated</p>
                    )}
                  </div>
                  <div className={`rounded-lg px-4 py-3 ${isPremium ? "bg-emerald-100/60 border border-emerald-200/60" : "bg-zinc-100 border border-zinc-200"}`}>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Negotiation margin</p>
                    <p className={`mt-1 text-2xl font-black tracking-tight ${isPremium ? nego.color : "blur-lg select-none text-zinc-900"}`}>
                      ~{leveragePct}%
                    </p>
                    {isPremium && (
                      <p className="text-[10px] text-zinc-400 mt-1">{nego.text} leverage</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Km */}
        <div className="mt-3 flex items-center gap-4 text-sm">
          <span className="text-zinc-400">{car.km.toLocaleString("fr-FR")} km</span>
          <span className="text-zinc-200">·</span>
          <span className={`text-xs ${nego.color}`}>{nego.text} leverage</span>
        </div>

        {/* ─── COMPARE TO #1 ─── */}
        {canCompare && (
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <button onClick={() => setShowCompare(!showCompare)} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs text-zinc-500 uppercase tracking-wider transition-colors hover:bg-zinc-100 hover:text-zinc-700 cursor-pointer">
              {showCompare ? "Masquer" : "Comparer au n°1"}
            </button>
            {showCompare && bestCar && (
              <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-3">vs {bestCar.title}</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-zinc-400 text-xs">Prix</p><p className="mt-0.5 font-medium">{diffLabel(car.price - bestCar.price, "€")}</p></div>
                  <div><p className="text-zinc-400 text-xs">Km</p><p className="mt-0.5 font-medium">{diffLabel(car.km - bestCar.km, "km")}</p></div>
                  <div><p className="text-zinc-400 text-xs">Score</p><p className="mt-0.5 font-medium">{diffLabel(car.score - bestCar.score, "pts")}</p></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── VERDICT ─── */}
        <div className="mt-4 border-t border-zinc-100 pt-5">
          {isPremium ? (
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                car.decision.action === "Acheter maintenant" ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                : car.decision.action === "Négocier" ? "bg-amber-50 border-amber-200 text-amber-600"
                : "bg-zinc-100 border-zinc-200 text-zinc-500"
              }`}>{car.decision.icon} {car.decision.action}</span>
              <p className="text-xs text-zinc-400 text-right max-w-[180px]">{car.decision.reason}</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1.5 text-sm text-zinc-400 blur-[3px] select-none">
                {car.decision.icon} {car.decision.action}
              </span>
              <span className="text-xs text-zinc-300">Réservé Pro</span>
            </div>
          )}
          {isPremium && car.decision.action === "Acheter maintenant" && (
            <p className="mt-2 text-[11px] text-amber-500">⚡ Opportunité rare — vente rapide probable</p>
          )}
        </div>

        {/* ─── MESSAGE ─── */}
        <div className="mt-4 border-t border-zinc-100 pt-5">
          {isPremium ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Message de négociation</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(car.negotiation_message); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer uppercase tracking-wider font-medium"
                >
                  {copied ? "✓ Copié" : "Copier"}
                </button>
              </div>
              <p className="text-sm leading-relaxed text-zinc-600">{car.negotiation_message}</p>
              <p className="mt-2 text-[10px] text-zinc-400">
                {car.days_online > 30 ? "Forte probabilité d'acceptation" : "Réponse typique sous 24h"}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">Message de négociation</p>
              <p className="text-sm text-zinc-300 blur-[4px] select-none leading-relaxed">{car.negotiation_message}</p>
            </div>
          )}
        </div>

        {/* Unlock */}
        {!isPremium && (
          <button onClick={onUnlock} className="mt-5 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium uppercase tracking-widest text-emerald-600 transition-all hover:bg-emerald-100 cursor-pointer">
            Voir l&apos;analyse complète
          </button>
        )}

        {/* Actions */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => onToggleFavorite?.(car.id)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all duration-300 cursor-pointer ${
              isFavorite
                ? "border-red-200 bg-red-50 text-red-500 scale-[1.06] shadow-sm shadow-red-100/50"
                : "border-zinc-200 bg-white text-zinc-400 shadow-sm hover:border-zinc-300 hover:text-zinc-600"
            }`}
          >
            <span className={`transition-transform duration-300 ${isFavorite ? "scale-125" : "hover:scale-110"}`}>
              {isFavorite ? "❤️" : "🤍"}
            </span>
            {isFavorite ? "Favori" : "Sauver"}
          </button>
          <button
            onClick={() => onToggleCompare?.(car.id)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all duration-200 cursor-pointer ${
              isComparing
                ? "border-blue-200 bg-blue-50 text-blue-500"
                : "border-zinc-200 bg-white text-zinc-400 shadow-sm hover:border-zinc-300 hover:text-zinc-600"
            }`}
          >
            ⚖️ {isComparing ? "En comparaison" : "Comparer"}
          </button>
          {car.url && (
            <a
              href={car.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 shadow-sm transition-all duration-200 hover:border-zinc-300 hover:text-zinc-600"
            >
              ↗ Voir l&apos;annonce
            </a>
          )}
        </div>

        <p className="mt-4 text-[10px] text-zinc-300 tracking-wide">Analyse DEALR · durée de publication · positionnement marché · équipements</p>
      </div>
    </div>
  );
}
