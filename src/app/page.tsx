import { Freshness } from "@/components/Freshness";
import { GlobeView } from "@/components/globe/GlobeView";
import { Legend } from "@/components/globe/Legend";
import { AnswerPanel } from "@/components/panel/AnswerPanel";
import { QuestionBar } from "@/components/QuestionBar";
import { UrlSync } from "@/components/UrlSync";

export default function Home() {
  return (
    // The page scrolls like a page; nothing scrolls inside a box.
    // Phone: title, globe, answer, with the question bar pinned to the bottom.
    // Wide: the globe is pinned on the left, centered in its half; the answer
    // column scrolls past it, with the question bar pinned to its bottom.
    <main className="grid min-h-dvh grid-cols-1 [grid-template-areas:'header'_'globe'_'panel'_'bar'] lg:grid-cols-[minmax(0,1fr)_minmax(460px,44%)] lg:grid-rows-[auto_1fr_auto] lg:[grid-template-areas:'globe_header'_'globe_panel'_'globe_bar']">
      <UrlSync />
      <header className="flex items-start justify-between gap-4 px-4 pt-5 [grid-area:header] md:px-10 lg:pt-10 lg:pr-14 lg:pl-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">Ask the planet</h1>
          <p className="mt-0.5 max-w-[44ch] text-sm text-muted md:mt-1">
            <span className="md:hidden">An AI turns your question into a filter over real USGS data.</span>
            <span className="hidden md:inline">
              Ask about the last month of earthquakes. An AI turns your question into a filter and every dot is real USGS
              data.
            </span>
          </p>
        </div>
        <Freshness />
      </header>

      <section
        aria-label="Globe"
        aria-describedby="globe-help"
        className="relative h-[36svh] min-h-[260px] [grid-area:globe] lg:sticky lg:top-0 lg:row-span-3 lg:h-dvh lg:min-h-[640px] lg:self-start"
      >
        <p id="globe-help" className="sr-only">
          A 3D globe of the earthquakes in the answer. Drag to spin, scroll to zoom. Every earthquake shown is also
          listed in the answer panel, which works with a keyboard.
        </p>
        <div className="absolute inset-0">
          <GlobeView />
        </div>
        <div className="absolute bottom-2 left-4 max-w-[calc(100%-2rem)] md:left-10 lg:bottom-10">
          <Legend />
        </div>
      </section>

      {/* Phones: pinned to the bottom of the screen, so asking is always a thumb away.
          Wide screens: the end of the answer column, so it never covers the answer ("/" jumps to it).
          First in the page order all the same, so Tab reaches the question before the answer. */}
      <div className="sticky bottom-0 z-10 bg-bg/95 px-4 pt-2 pb-4 backdrop-blur-sm [grid-area:bar] md:px-10 lg:static lg:bg-transparent lg:pr-14 lg:pb-8 lg:pl-4 lg:backdrop-blur-none">
        <QuestionBar />
      </div>

      <div className="min-w-0 px-4 pt-2 pb-10 [grid-area:panel] md:px-10 lg:pt-6 lg:pr-14 lg:pb-4 lg:pl-4">
        <AnswerPanel />
      </div>
    </main>
  );
}
