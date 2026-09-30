import { ShaderBackground } from "@/components/ui/dwd"
import { AlertTriangle, Map as MapIcon, Search, MapPin } from "lucide-react"

export type HeroTab = "civic" | "lostfound" | "map"

interface HeroSectionProps {
  onNavigate: (tab: HeroTab) => void
  onReport: () => void
  civicCount: number
  lostFoundCount: number
}

export default function HeroSection({
  onNavigate,
  onReport,
  civicCount,
  lostFoundCount,
}: HeroSectionProps) {
  return (
    <section className="relative w-full overflow-hidden h-[62vh] min-h-[460px] max-h-[680px]">
      {/* WebGL mesh-drift shader fills the hero */}
      <ShaderBackground className="absolute inset-0 h-full w-full" />

      {/* Readability + blend into page background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-stone-50 dark:to-[#0B0D13] pointer-events-none" />

      {/* Hero content */}
      <div className="relative z-10 h-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase text-cyan-200 bg-cyan-950/40 border border-cyan-400/20 backdrop-blur-sm px-3 py-1 rounded-full">
          <MapPin className="w-3 h-3" />
          BBIT · Budge Budge · Kolkata
        </span>

        <h1 className="mt-5 text-4xl sm:text-6xl font-black tracking-tight text-white drop-shadow-lg">
          Pin<span className="text-cyan-300">Point</span>
        </h1>

        <p className="mt-4 max-w-xl text-sm sm:text-base font-medium text-cyan-50/90 drop-shadow">
          Report campus hazards, upvote what matters, and reunite lost things —
          one verified, satellite-pinned community board for Budge Budge
          Institute of Technology.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onReport}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-sm font-bold shadow-lg shadow-amber-950/40 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Report a Hazard
          </button>
          <button
            type="button"
            onClick={() => onNavigate("lostfound")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white text-sm font-bold transition-colors"
          >
            <Search className="w-4 h-4" />
            Lost & Found
          </button>
          <button
            type="button"
            onClick={() => onNavigate("map")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white text-sm font-bold transition-colors"
          >
            <MapIcon className="w-4 h-4" />
            Campus Map
          </button>
        </div>

        <div className="mt-8 flex items-center gap-6 text-[11px] font-bold uppercase tracking-wider text-cyan-100/70">
          <span>
            <span className="text-cyan-300">{civicCount}</span> active issues
          </span>
          <span className="w-px h-3 bg-cyan-100/30" />
          <span>
            <span className="text-cyan-300">{lostFoundCount}</span> lost & found
          </span>
          <span className="w-px h-3 bg-cyan-100/30" />
          <span>
            <span className="text-cyan-300">50</span> mapped places
          </span>
        </div>
      </div>
    </section>
  )
}
