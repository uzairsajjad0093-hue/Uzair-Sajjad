import { AlertTriangle, Loader2 } from 'lucide-react';

interface SubmissionStatusProps {
  isSubmitting: boolean;
  errorMessage: string;
}

export function SubmissionStatus({ isSubmitting, errorMessage }: SubmissionStatusProps) {
  if (!isSubmitting && !errorMessage) {
    return null;
  }

  if (isSubmitting) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 p-4 rounded-2xl bg-[#FFF0F5] border border-[#F8BBD0] text-sm font-medium text-[#333333]"
      >
        <Loader2 className="w-5 h-5 text-[#E75480] animate-spin shrink-0" />
        <span>Submitting and saving your response... Please wait.</span>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#991B1B]"
    >
      <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p className="font-semibold">{errorMessage}</p>
        <p className="text-xs text-[#7F1D1D]">
          Your answers are still preserved on this page. Please check your connection or try
          submitting again.
        </p>
      </div>
    </div>
  );
}
