import { ShaderBackground } from "@/components/ui/dwd"
import { AlertTriangle, Map as MapIcon, Search, MapPin } from "lucide-react"

export type HeroTab = "civic" | "lostfound" | "map"

interface HeroSectionProps {
  onNavigate: (tab: HeroTab) => void
  onReport: () => void
  civicCount: number
  lostFoundCount: number
  isDark?: boolean
}

export default function HeroSection({
  onNavigate,
  onReport,
  civicCount,
  lostFoundCount,
  isDark = false,
}: HeroSectionProps) {
  return (
    <section className="relative w-full overflow-hidden h-[62vh] min-h-[460px] max-h-[680px]">
      {/* WebGL mesh-drift shader fills the hero — Apple light palette by default */}
      <ShaderBackground className="absolute inset-0 h-full w-full" dark={isDark} />

      {/* Readability + blend into page background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-stone-50 dark:from-black/10 dark:to-[#000000] pointer-events-none" />

      {/* Hero content */}
      <div className="relative z-10 h-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-indigo-600 bg-white/75 border border-stone-200/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-subtle dark:text-cyan-200 dark:bg-cyan-950/40 dark:border-cyan-400/20 dark:shadow-none">
          <MapPin className="w-3 h-3" />
          BBIT · Budge Budge · Kolkata
        </span>

        <h1 className="mt-5 text-4xl sm:text-6xl font-extrabold tracking-tight text-stone-900 dark:text-white dark:drop-shadow-lg">
          Pin<span className="text-indigo-600 dark:text-cyan-300">Point</span>
        </h1>

        <p className="mt-4 max-w-xl text-sm sm:text-base font-medium text-stone-500 dark:text-cyan-50/90">
          Report campus hazards, upvote what matters, and reunite lost things —
          one verified, satellite-pinned community board for Budge Budge
          Institute of Technology.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onReport}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-glow-indigo transition-colors active:scale-95"
          >
            <AlertTriangle className="w-4 h-4" />
            Report a Hazard
          </button>
          <button
            type="button"
            onClick={() => onNavigate("lostfound")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/70 hover:bg-white border border-stone-300/70 text-stone-900 text-sm font-semibold backdrop-blur-sm transition-colors dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:text-white"
          >
            <Search className="w-4 h-4" />
            Lost & Found
          </button>
          <button
            type="button"
            onClick={() => onNavigate("map")}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/70 hover:bg-white border border-stone-300/70 text-stone-900 text-sm font-semibold backdrop-blur-sm transition-colors dark:bg-white/10 dark:hover:bg-white/20 dark:border-white/20 dark:text-white"
          >
            <MapIcon className="w-4 h-4" />
            Campus Map
          </button>
        </div>

        <div className="mt-8 flex items-center gap-6 text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-cyan-100/70">
          <span>
            <span className="text-indigo-600 dark:text-cyan-300">{civicCount}</span> active issues
          </span>
          <span className="w-px h-3 bg-stone-300 dark:bg-cyan-100/30" />
          <span>
            <span className="text-indigo-600 dark:text-cyan-300">{lostFoundCount}</span> lost & found
          </span>
          <span className="w-px h-3 bg-stone-300 dark:bg-cyan-100/30" />
          <span>
            <span className="text-indigo-600 dark:text-cyan-300">50</span> mapped places
          </span>
        </div>
      </div>
    </section>
  )
}
