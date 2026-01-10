export default function ComingSoon() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,_rgba(245,158,11,0.12),_transparent_55%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:28px_28px]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.35em] text-white/60">
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          Coming soon
        </div>
        <h1 className="mt-6 text-4xl font-semibold sm:text-5xl">Flight Simulator</h1>
        <p className="mt-4 max-w-2xl text-base text-white/70">
          The flight simulator is temporarily unavailable while we finish the new release.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center rounded-full border border-emerald-300/60 bg-emerald-300/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 transition hover:border-emerald-200 hover:bg-emerald-300/20"
          style={{ fontFamily: "var(--recon-font-mono)" }}
        >
          Back to dashboard
        </a>
      </main>
    </div>
  );
}
