"use client";

interface PremiumModalProps {
  savings: number;
  onClose: () => void;
  onActivate: () => void;
}

export default function PremiumModal({ savings, onClose, onActivate }: PremiumModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-300 hover:text-zinc-500 transition-colors cursor-pointer text-sm">✕</button>

        <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">DEALR Pro</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
          Voyez ce que les autres ne voient pas.
        </h2>

        <div className="mt-8 flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-base">💸</span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Économisez jusqu&apos;à {savings.toLocaleString("fr-FR")} €</p>
              <p className="text-[11px] text-zinc-400">Prix cibles basés sur le marché réel</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-base">💬</span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Messages de négociation prêts</p>
              <p className="text-[11px] text-zinc-400">Adaptés à chaque annonce</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-base">🎯</span>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Acheter, négocier ou attendre</p>
              <p className="text-[11px] text-zinc-400">Décisions claires, zéro hésitation</p>
            </div>
          </div>
        </div>

        <button onClick={onActivate} className="mt-8 w-full rounded-xl bg-zinc-900 px-4 py-3.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 cursor-pointer">
          Activer DEALR Pro
        </button>
        <p className="mt-3 text-center text-[10px] text-zinc-400 tracking-wide">Activation instantanée · Aucun engagement</p>
      </div>
    </div>
  );
}
