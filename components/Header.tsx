export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 bg-white/70 backdrop-blur-xl backdrop-saturate-150 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mx-auto max-w-4xl px-8 h-16 flex items-center">
        <a href="/" className="group flex items-baseline gap-0.5 transition-opacity hover:opacity-70">
          <span className="text-2xl font-black tracking-[-0.05em] text-zinc-900">
            DEAL
          </span>
          <span className="text-2xl font-black tracking-[-0.05em] text-emerald-600 transition-colors group-hover:text-emerald-700">
            R
          </span>
        </a>
        <span className="mx-4 hidden sm:block h-5 w-px bg-zinc-200" />
        <p className="hidden sm:block text-sm text-zinc-400 tracking-wide">
          Buy smart. Negotiate better.
        </p>
        <div className="ml-auto">
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            Beta
          </span>
        </div>
      </div>
    </header>
  );
}
