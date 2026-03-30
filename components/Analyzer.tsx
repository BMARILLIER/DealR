"use client";

import { useState, useRef, useEffect } from "react";
import { scoreCar } from "@/lib/score";
import { Car, ScoredCar } from "@/lib/types";

const MOCK_DATA: Record<string, Partial<Car>> = {
  leboncoin: { title: "Peugeot 308 Allure", brand: "Peugeot", model: "308", price: 16500, km: 72000, year: 2020, fuel: "Essence", gearbox: "Manuelle", trim: "Allure", source: "Leboncoin", platform: "leboncoin", estimated_market_price: 17500 },
  lacentrale: { title: "Renault Clio Intens", brand: "Renault", model: "Clio", price: 14800, km: 45000, year: 2021, fuel: "Essence", gearbox: "Automatique", trim: "Intens", source: "La Centrale", platform: "lacentrale", estimated_market_price: 15200 },
  autoscout24: { title: "BMW Série 3 Sport", brand: "BMW", model: "Série 3", price: 19900, km: 58000, year: 2020, fuel: "Diesel", gearbox: "Automatique", trim: "Sport", source: "AutoScout24", platform: "autoscout24", estimated_market_price: 21000 },
};

function detectPlatform(url: string): string {
  if (url.includes("leboncoin")) return "leboncoin";
  if (url.includes("lacentrale")) return "lacentrale";
  if (url.includes("autoscout24")) return "autoscout24";
  return "leboncoin";
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

interface AnalyzerProps {
  onResult: (car: ScoredCar) => void;
}

interface FormData {
  title: string;
  price: string;
  km: string;
  year: string;
  fuel: string;
  gearbox: string;
}

export default function Analyzer({ onResult }: AnalyzerProps) {
  const [url, setUrl] = useState("");
  const [step, setStep] = useState<"url" | "form" | "done">("url");
  const [form, setForm] = useState<FormData>({ title: "", price: "", km: "", year: "", fuel: "", gearbox: "" });
  const [platform, setPlatform] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "form" && titleRef.current) titleRef.current.focus();
  }, [step]);

  // Update warnings on form changes
  useEffect(() => {
    if (step !== "form") return;
    const w: string[] = [];
    const price = Number(form.price);
    const km = Number(form.km);
    const year = Number(form.year);
    if (price > 0 && price > 25000) w.push("Prix au-dessus du marché pour ce segment");
    if (km > 0 && year > 0) {
      const age = new Date().getFullYear() - year;
      if (age > 0 && km / age > 20000) w.push("Kilométrage élevé pour ce modèle");
    }
    setWarnings(w);
  }, [form, step]);

  function handleAnalyze() {
    if (!url.trim()) return;
    const p = detectPlatform(url);
    setPlatform(p);
    const mock = MOCK_DATA[p] || MOCK_DATA.leboncoin;
    setForm({
      title: mock.title || "",
      price: String(mock.price || ""),
      km: String(mock.km || ""),
      year: String(mock.year || ""),
      fuel: mock.fuel || "Essence",
      gearbox: mock.gearbox || "Manuelle",
    });
    setStep("form");
  }

  function handleValidate() {
    const price = Number(form.price);
    const km = Number(form.km);
    const year = Number(form.year);
    if (!form.title || !price || !km || !year) return;

    const car: Car = {
      id: Date.now(),
      title: form.title,
      brand: form.title.split(" ")[0] || "",
      model: form.title.split(" ").slice(1).join(" ") || "",
      price,
      km,
      year,
      fuel: form.fuel,
      gearbox: form.gearbox,
      seller: "Particulier",
      location: "",
      trim: "",
      equipment: [],
      days_online: 15,
      estimated_market_price: Math.round(price * 1.05),
      source: platform === "lacentrale" ? "La Centrale" : platform === "autoscout24" ? "AutoScout24" : "Leboncoin",
      platform,
      url: url.trim(),
      posted_at: daysAgo(15),
      price_history: [price],
    };

    const scored = scoreCar(car);
    onResult(scored);
    setStep("done");
  }

  function handleReset() {
    setUrl("");
    setForm({ title: "", price: "", km: "", year: "", fuel: "", gearbox: "" });
    setStep("url");
    setWarnings([]);
  }

  const inputCls = "w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300";
  const fieldCls = "flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm";
  const labelCls = "text-[10px] text-zinc-400 uppercase tracking-widest";

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">Analyser une annonce</p>

      {step === "url" && (
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
            <input
              type="text"
              value={url}
              placeholder="Coller un lien Leboncoin, La Centrale ou AutoScout24"
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={!url.trim()}
            className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
          >
            Analyser
          </button>
        </div>
      )}

      {step === "form" && (
        <div className="animate-[fadeIn_0.3s_ease-out]">
          <p className="text-sm text-zinc-500 mb-5">Vérifiez ou complétez les informations.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className={`${fieldCls} col-span-2 sm:col-span-3`}>
              <label className={labelCls}>Titre</label>
              <input ref={titleRef} type="text" value={form.title} placeholder="Ex : Peugeot 308 Allure" onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Prix</label>
              <div className="flex items-center gap-1">
                <input type="number" value={form.price} placeholder="—" onChange={(e) => setForm({ ...form, price: e.target.value })} className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} />
                <span className="text-xs text-zinc-300">€</span>
              </div>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Kilométrage</label>
              <div className="flex items-center gap-1">
                <input type="number" value={form.km} placeholder="—" onChange={(e) => setForm({ ...form, km: e.target.value })} className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} />
                <span className="text-xs text-zinc-300">km</span>
              </div>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Année</label>
              <input type="number" value={form.year} placeholder="—" onChange={(e) => setForm({ ...form, year: e.target.value })} className={`${inputCls} [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} />
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Carburant</label>
              <select value={form.fuel} onChange={(e) => setForm({ ...form, fuel: e.target.value })} className="w-full bg-transparent text-sm text-zinc-900 outline-none cursor-pointer appearance-none">
                <option>Essence</option><option>Diesel</option><option>Hybride</option><option>Électrique</option><option>GPL</option>
              </select>
            </div>
            <div className={fieldCls}>
              <label className={labelCls}>Boîte</label>
              <select value={form.gearbox} onChange={(e) => setForm({ ...form, gearbox: e.target.value })} className="w-full bg-transparent text-sm text-zinc-900 outline-none cursor-pointer appearance-none">
                <option>Manuelle</option><option>Automatique</option>
              </select>
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-4 flex flex-col gap-1.5">
              {warnings.map((w) => (
                <p key={w} className="text-xs text-amber-600 flex items-center gap-1.5">
                  <span>⚠️</span> {w}
                </p>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button onClick={handleValidate} className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-zinc-800 cursor-pointer shadow-sm">
              Valider l&apos;analyse
            </button>
            <button onClick={handleReset} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
              Annuler
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="animate-[fadeIn_0.3s_ease-out] text-center py-4">
          <p className="text-sm text-emerald-600 font-medium">✓ Analyse terminée</p>
          <p className="mt-1 text-xs text-zinc-400">Analyse basée sur vos données.</p>
          <button onClick={handleReset} className="mt-4 text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
            Analyser une autre annonce
          </button>
        </div>
      )}
    </div>
  );
}
