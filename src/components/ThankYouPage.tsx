import { motion } from 'motion/react';
import { CheckCircle2, Home } from 'lucide-react';

interface ThankYouPageProps {
  responseId: string;
  submittedAt: string;
  onBackToHome: () => void;
}

export function ThankYouPage({
  responseId,
  submittedAt,
  onBackToHome,
}: ThankYouPageProps) {
  return (
    <main className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <motion.section
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-3xl border border-[#F8BBD0] shadow-[0_14px_44px_-14px_rgba(231,84,128,0.18)] p-8 sm:p-12 text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.28, delay: 0.05 }}
          className="w-20 h-20 rounded-full bg-[#E8F5E9] border border-[#2E7D32]/25 flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="w-11 h-11 text-[#2E7D32]" />
        </motion.div>

        <div className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#333333]">
            Thank You for Participating!
          </h1>
          <p className="text-base sm:text-lg text-[#333333] font-medium leading-relaxed">
            Thank you for participating in our survey! Your response is valuable to our ICT project.
          </p>
          <p className="text-sm sm:text-base text-[#2E7D32] font-semibold">
            Your response has been successfully submitted.
          </p>
        </div>

        <div className="bg-[#FFF0F5] border border-[#F8BBD0] rounded-2xl p-5 space-y-2 text-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[#666666]">Response Reference ID</span>
            <span className="font-mono font-semibold text-[#333333] tabular-nums">
              {responseId}
            </span>
          </div>
          {submittedAt && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-[#666666]">Recorded Timestamp</span>
              <span className="font-mono text-xs sm:text-sm text-[#333333] tabular-nums">
                {submittedAt}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-[#666666] leading-relaxed max-w-md mx-auto">
          Please keep your Response Reference ID if you ever wish to ask the project coordinator
          to remove your entry. This survey is strictly for educational ICT research.
        </p>

        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 shadow-md shadow-[#E75480]/20 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
          >
            <Home className="w-4 h-4" />
            <span>BACK TO HOME</span>
          </button>
        </div>
      </motion.section>
    </main>
  );
}
