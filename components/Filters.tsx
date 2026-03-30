"use client";

import { useState } from "react";

const BRANDS = ["Peugeot", "Renault", "Volkswagen", "BMW", "Audi", "Mercedes", "Toyota"];

const MODELS_BY_BRAND: Record<string, string[]> = {
  Peugeot: ["208", "308", "2008"],
  Renault: ["Clio", "Captur", "Mégane"],
  Volkswagen: ["Golf", "Polo", "Tiguan"],
  BMW: ["Série 1", "Série 3", "X1"],
  Audi: ["A1", "A3", "Q3"],
  Mercedes: ["Classe A", "Classe C", "GLA"],
  Toyota: ["Yaris", "Corolla", "C-HR"],
};

const FUELS = ["Essence", "Diesel", "Hybride", "Électrique", "GPL"];
const GEARBOXES = ["Manuelle", "Automatique"];
const SELLERS = ["Tous", "Particulier", "Professionnel"];
const SOURCES = ["Leboncoin", "La Centrale", "AutoScout24"] as const;
const EQUIPMENT_LIST = ["GPS", "Radar recul", "Caméra", "CarPlay", "Aide stationnement"];

function capitalize(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export interface FilterValues {
  maxPrice: number;
  maxKm: number;
  brand: string;
  model: string;
  yearMin: number;
  yearMax: number;
  fuel: string;
  gearbox: string;
  seller: string;
  location: string;
  radius: number;
  equipment: string[];
  sources: string[];
}

interface FiltersProps {
  values: FilterValues;
  onChange: (v: FilterValues) => void;
  onReset: () => void;
}

export default function Filters({ values, onChange, onReset }: FiltersProps) {
  const [customBrand, setCustomBrand] = useState("");
  const [customModel, setCustomModel] = useState("");

  const isOtherBrand = values.brand === "__other__";
  const activeBrand = isOtherBrand ? customBrand : values.brand;
  const models = !isOtherBrand && values.brand ? MODELS_BY_BRAND[values.brand] || [] : [];

  function set<K extends keyof FilterValues>(key: K, val: FilterValues[K]) {
    onChange({ ...values, [key]: val });
  }

  function handleBrandChange(brand: string) {
    set("brand", brand);
    set("model", "");
    if (brand !== "__other__") setCustomBrand("");
  }

  function handleCustomBrandBlur() {
    const clean = capitalize(customBrand);
    setCustomBrand(clean);
  }

  function toggleEquipment(eq: string) {
    const next = values.equipment.includes(eq)
      ? values.equipment.filter((e) => e !== eq)
      : [...values.equipment, eq];
    set("equipment", next);
  }

  function toggleSource(src: string) {
    const next = values.sources.includes(src)
      ? values.sources.filter((s) => s !== src)
      : [...values.sources, src];
    set("sources", next);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Row 1: Budget + Km + Year */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Budget max</label>
          <div className="flex items-center gap-1">
            <input type="number" value={values.maxPrice || ""} placeholder="—" onChange={(e) => set("maxPrice", Number(e.target.value))} className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            <span className="text-xs text-zinc-300">€</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Km max</label>
          <div className="flex items-center gap-1">
            <input type="number" value={values.maxKm || ""} placeholder="—" onChange={(e) => set("maxKm", Number(e.target.value))} className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
            <span className="text-xs text-zinc-300">km</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Année min</label>
          <input type="number" min={2000} max={new Date().getFullYear() + 1} value={values.yearMin || ""} placeholder="—" onChange={(e) => set("yearMin", Number(e.target.value))} onBlur={() => { if (values.yearMin && values.yearMax && values.yearMin > values.yearMax) set("yearMin", values.yearMax); }} className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Année max</label>
          <input type="number" min={2000} max={new Date().getFullYear() + 1} value={values.yearMax || ""} placeholder="—" onChange={(e) => set("yearMax", Number(e.target.value))} onBlur={() => { if (values.yearMax && values.yearMin && values.yearMax < values.yearMin) set("yearMax", values.yearMin); }} className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
        </div>
      </div>

      {/* Row 2: Brand + Model */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Marque</label>
          <select
            value={values.brand}
            onChange={(e) => handleBrandChange(e.target.value)}
            className="w-full bg-transparent text-sm text-zinc-900 outline-none cursor-pointer appearance-none"
          >
            <option value="">Toutes les marques</option>
            {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            <option value="__other__">Autre</option>
          </select>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Modèle</label>
          {isOtherBrand ? (
            <input
              type="text"
              value={customModel}
              placeholder="Entrer le modèle"
              onChange={(e) => { setCustomModel(e.target.value); set("model", e.target.value.trim()); }}
              onBlur={() => { const c = capitalize(customModel); setCustomModel(c); set("model", c); }}
              className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300"
            />
          ) : models.length > 0 ? (
            <select value={values.model} onChange={(e) => set("model", e.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none cursor-pointer appearance-none">
              <option value="">Tous les modèles</option>
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <span className="text-sm text-zinc-300">Choisir une marque</span>
          )}
        </div>
      </div>

      {/* Custom brand input */}
      {isOtherBrand && (
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm max-w-xs animate-[fadeIn_0.2s_ease-out]">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Marque personnalisée</label>
          <input
            type="text"
            value={customBrand}
            placeholder="Entrer la marque"
            onChange={(e) => setCustomBrand(e.target.value)}
            onBlur={handleCustomBrandBlur}
            className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300"
          />
        </div>
      )}

      {/* Row 3: Fuel + Gearbox + Seller */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Carburant</label>
          <select value={values.fuel} onChange={(e) => set("fuel", e.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none cursor-pointer appearance-none">
            <option value="">Tous</option>
            {FUELS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Boîte</label>
          <select value={values.gearbox} onChange={(e) => set("gearbox", e.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none cursor-pointer appearance-none">
            <option value="">Toutes</option>
            {GEARBOXES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Vendeur</label>
          <select value={values.seller} onChange={(e) => set("seller", e.target.value)} className="w-full bg-transparent text-sm text-zinc-900 outline-none cursor-pointer appearance-none">
            {SELLERS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Row 4: Location + Radius */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Ville ou code postal</label>
          <input
            type="text"
            value={values.location}
            placeholder="Toute la France"
            onChange={(e) => set("location", e.target.value)}
            onBlur={() => set("location", values.location.trim())}
            className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-300"
          />
        </div>
        <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
          <label className="text-[10px] text-zinc-400 uppercase tracking-widest">Rayon</label>
          <select value={values.radius} onChange={(e) => set("radius", Number(e.target.value))} className="w-full bg-transparent text-sm text-zinc-900 outline-none cursor-pointer appearance-none">
            <option value={0}>France entière</option>
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
            <option value={200}>200 km</option>
          </select>
        </div>
      </div>
      {values.location && values.radius > 0 && (
        <p className="text-xs text-zinc-400">Autour de <span className="text-zinc-600">{values.location}</span> · {values.radius} km</p>
      )}

      {/* Plateforme */}
      <div>
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">Plateforme</p>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((src) => {
            const active = values.sources.includes(src);
            return (
              <button
                key={src}
                onClick={() => toggleSource(src)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-500 shadow-sm hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                {src}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 4: Equipment */}
      <div>
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-2">Équipements</p>
        <div className="flex flex-wrap gap-2">
          {EQUIPMENT_LIST.map((eq) => {
            const active = values.equipment.includes(eq);
            return (
              <button
                key={eq}
                onClick={() => toggleEquipment(eq)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium tracking-wide transition-all duration-200 cursor-pointer ${
                  active
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-500 shadow-sm hover:border-zinc-300 hover:text-zinc-700"
                }`}
              >
                {eq}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reset */}
      <div className="flex justify-end">
        <button onClick={onReset} className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer uppercase tracking-wider font-medium">
          Réinitialiser les filtres
        </button>
      </div>
    </div>
  );
}
