import { Freshness } from "@/components/Freshness";
import { GlobeView } from "@/components/globe/GlobeView";
import { Legend } from "@/components/globe/Legend";
import { AnswerPanel } from "@/components/panel/AnswerPanel";
import { ANSWER_END_ID, PinnedBar } from "@/components/PinnedBar";
import { QuestionBar } from "@/components/QuestionBar";
import { UrlSync } from "@/components/UrlSync";

export default function Home() {
  return (
    // The page scrolls like a page; nothing scrolls inside a box.
    // Phone: title (centered), key, globe, answer, with the question bar pinned to the bottom.
    // Wide, and a phone on its side: the globe is pinned on the left, centered in its half;
    // the answer column scrolls past it, with the question bar pinned to its bottom.
    <main className="grid min-h-dvh grid-cols-1 [grid-template-areas:'header'_'globe'_'panel'_'bar'] short:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] short:grid-rows-[auto_1fr_auto] short:[grid-template-areas:'globe_header'_'globe_panel'_'globe_bar'] lg:grid-cols-[minmax(0,1fr)_minmax(460px,44%)] lg:grid-rows-[auto_1fr_auto] lg:[grid-template-areas:'globe_header'_'globe_panel'_'globe_bar']">
      <UrlSync />
      <header className="flex items-start justify-between gap-4 px-4 pt-5 [grid-area:header] max-md:flex-col max-md:items-center max-md:gap-2 max-md:text-center md:px-10 short:px-4 short:pt-4 lg:pt-10 lg:pr-14 lg:pl-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight md:text-xl">Ask the planet</h1>
          <p className="mt-0.5 max-w-[44ch] text-sm text-balance text-muted max-md:mx-auto md:mt-1">
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
        // Phone: the key sits above the globe, centered, so it never covers it.
        className="relative flex flex-col [grid-area:globe] md:block md:h-[36svh] md:min-h-[260px] short:sticky short:top-0 short:row-span-3 short:h-dvh short:min-h-0 short:self-start lg:sticky lg:top-0 lg:row-span-3 lg:h-dvh lg:min-h-[640px] lg:self-start"
      >
        <p id="globe-help" className="sr-only">
          A 3D globe of the earthquakes in the answer. Drag to spin, scroll to zoom. Every earthquake shown is also
          listed in the answer panel, which works with a keyboard.
        </p>
        <div className="relative h-[36svh] min-h-[260px] md:absolute md:inset-0 md:h-auto md:min-h-0">
          <GlobeView />
        </div>
        <div className="order-first flex justify-center px-4 pt-4 md:absolute md:bottom-2 md:left-10 md:block md:max-w-[calc(100%-2rem)] md:p-0 short:bottom-3 short:left-4 lg:bottom-10">
          <Legend />
        </div>
      </section>

      {/* Pinned to the bottom of the screen at every size, so asking is always in view; the answer
          scrolls under it, and at the end of the page it settles back into place.
          First in the page order all the same, so Tab reaches the question before the answer. */}
      <PinnedBar className="sticky bottom-0 z-10 bg-bg/95 px-4 pt-2 pb-4 backdrop-blur-sm [grid-area:bar] md:px-10 short:px-4 short:pb-3 lg:pr-14 lg:pb-8 lg:pl-4">
        <QuestionBar />
      </PinnedBar>

      <div className="min-w-0 px-4 pt-2 pb-10 [grid-area:panel] md:px-10 short:px-4 short:pt-3 lg:pt-6 lg:pr-14 lg:pb-4 lg:pl-4">
        <AnswerPanel />
        <div id={ANSWER_END_ID} aria-hidden="true" />
      </div>
    </main>
  );
}
