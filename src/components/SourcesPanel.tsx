// "Go Deeper" outbound links (Chunk 9, Plan.md §4 / §9a). Docked over the
// scene canvas as a retro signpost plaque in the opposite ground corner
// from the radar dish/ENLIL readout, matching the same pixel-console
// styling so it reads as scene furniture rather than a bolted-on web
// widget (art-direction note in Plan.md §5/§10).

const LINKS = [
  { label: 'WSA-Enlil Model', href: 'https://www.spaceweather.live/en/solar-activity/wsa-enlil.html' },
  { label: 'NOAA SWPC Home', href: 'https://www.spaceweather.gov' },
  { label: 'NOAA Model Catalog', href: 'https://www.spaceweather.gov/models' },
  { label: 'NOAA Aurora Forecast', href: 'https://www.swpc.noaa.gov/products/aurora-30-minute-forecast' },
]

const PANEL_FRACTIONS = { x: 0.62, y: 0.68, w: 0.35, h: 0.3 }

export function SourcesPanel() {
  return (
    <div
      className="absolute flex flex-col border-2 border-slate-700 bg-slate-950/90 p-0.5 font-mono shadow-[3px_3px_0_0_rgba(0,0,0,0.5)]"
      style={{
        left: `${PANEL_FRACTIONS.x * 100}%`,
        top: `${PANEL_FRACTIONS.y * 100}%`,
        width: `${PANEL_FRACTIONS.w * 100}%`,
        height: `${PANEL_FRACTIONS.h * 100}%`,
      }}
    >
      <div className="shrink-0 text-[0.7rem] uppercase tracking-[0.15em] text-cyan-400">
        Go Deeper
      </div>
      <ul className="flex min-h-0 flex-1 flex-col justify-center gap-0">
        {LINKS.map((link) => (
          <li key={link.href} className="min-w-0 text-[0.7rem] leading-none">
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-slate-300 hover:text-cyan-300"
            >
              &gt; {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
