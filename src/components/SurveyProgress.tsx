interface SurveyProgressProps {
  sectionNumber: number;
  totalSections: number;
  sectionTitle: string;
  completedQuestions: number;
  totalQuestions: number;
  isReviewStep: boolean;
}

export function SurveyProgress({
  sectionNumber,
  totalSections,
  sectionTitle,
  completedQuestions,
  totalQuestions,
  isReviewStep,
}: SurveyProgressProps) {
  const percentage = isReviewStep
    ? 100
    : Math.round((sectionNumber / totalSections) * 100);

  return (
    <div className="space-y-4 pb-6 border-b border-[#F8BBD0]/60">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-[#666666]">
        <span className="text-[#E75480] font-semibold">Women&apos;s Health Survey</span>
        <span className="tabular-nums">
          {completedQuestions} of {totalQuestions} Questions Answered
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-[#333333]">
          {isReviewStep
            ? 'Review Your Responses'
            : `Section ${sectionNumber} of ${totalSections} — ${sectionTitle}`}
        </h2>
        <span className="text-sm font-semibold text-[#E75480] tabular-nums whitespace-nowrap shrink-0">
          Progress: {percentage}%
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Survey progress ${percentage}%`}
        className="w-full h-2.5 bg-[#FFF0F5] rounded-full overflow-hidden border border-[#F8BBD0]/70"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#E75480] to-[#D94F8A] transition-transform duration-300 ease-out origin-left"
          style={{ transform: `scaleX(${percentage / 100})` }}
        />
      </div>
    </div>
  );
}
