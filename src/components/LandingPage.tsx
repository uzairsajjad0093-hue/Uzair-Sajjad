import { useState } from 'react';
import { ArrowRight, HeartPulse } from 'lucide-react';

interface LandingPageProps {
  onStartSurvey: () => void;
}

export function LandingPage({ onStartSurvey }: LandingPageProps) {
  const [heroImgError, setHeroImgError] = useState(false);

  return (
    <main className="relative overflow-x-clip flex-1 flex items-center">
      {/* Subtle pink glow accents around outer edges */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-[#F8BBD0]/35 to-[#FFF0F5]/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 -left-32 w-[360px] h-[360px] rounded-full bg-gradient-to-tr from-[#F8BBD0]/30 to-transparent blur-3xl"
      />

      <section
        id="overview"
        className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-[#D94F8A]">
              <span>ICT University Research Project</span>
              <span aria-hidden="true">·</span>
              <span>Voluntary &amp; Educational</span>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.35rem] font-bold text-[#333333] leading-[1.12] tracking-tight">
                Women&apos;s Health Survey
              </h1>
              <p className="text-lg sm:text-xl font-semibold text-[#E75480] leading-snug">
                Pregnancy, Menstrual Periods, and Spine Pain in Women
              </p>
            </div>

            <p className="text-base sm:text-[17px] text-[#666666] leading-relaxed max-w-2xl">
              We are conducting this survey as part of our ICT project to understand women&apos;s
              experiences and awareness regarding menstrual health, pregnancy, and spine or back
              pain. Your responses will remain confidential and will be used only for educational
              purposes. Participation is voluntary.
            </p>

            {/* Unboxed Metadata Strip */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-[#666666] pt-1">
              <span className="font-medium text-[#333333] tabular-nums">21 Questions</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-[#333333] tabular-nums">5 Sections</span>
              <span aria-hidden="true">·</span>
              <span>Approximately 5–8 Minutes</span>
              <span aria-hidden="true">·</span>
              <span>Voluntary Participation</span>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onStartSurvey}
                className="inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 shadow-md shadow-[#E75480]/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>START SURVEY</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Right Hero Illustration */}
          <div className="lg:col-span-5 flex">
            <div className="w-full rounded-3xl border border-[#F8BBD0] bg-white overflow-hidden shadow-[0_12px_36px_-14px_rgba(231,84,128,0.18)] flex flex-col">
              {!heroImgError ? (
                <img
                  src="/src/assets/images/hero_womens_health_1795056711373.jpg"
                  alt="Diverse women smiling alongside a compassionate female healthcare professional"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgError(true)}
                  className="w-full h-64 sm:h-80 lg:h-full object-cover"
                />
              ) : (
                <div className="w-full h-64 sm:h-80 lg:h-full bg-gradient-to-br from-[#FFF0F5] via-white to-[#F8BBD0]/40 flex flex-col items-center justify-center p-8 text-center">
                  <HeartPulse className="w-12 h-12 text-[#E75480] mb-3" />
                  <p className="font-display text-lg font-semibold text-[#333333]">
                    Women&apos;s Health &amp; Spine Awareness
                  </p>
                  <p className="text-sm text-[#666666] mt-1">
                    Educational survey for menstrual, maternal, and spinal well-being
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
