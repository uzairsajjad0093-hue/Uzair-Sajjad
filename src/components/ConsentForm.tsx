import { useState } from 'react';
import type { FormEvent } from 'react';
import { AlertCircle, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import type { PublicPolicyConfig } from '../types/survey.ts';

interface ConsentFormProps {
  participantName: string;
  onParticipantNameChange: (name: string) => void;
  consentConfirmed: boolean;
  onConsentChange: (checked: boolean) => void;
  policy: PublicPolicyConfig;
  onStartSurvey: () => void;
}

export function ConsentForm({
  participantName,
  onParticipantNameChange,
  consentConfirmed,
  onConsentChange,
  policy,
  onStartSurvey,
}: ConsentFormProps) {
  const [consentError, setConsentError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!consentConfirmed) {
      setConsentError(
        'Please check the consent box above to confirm your voluntary participation before starting.'
      );
      return;
    }
    setConsentError('');
    onStartSurvey();
  };

  return (
    <section
      id="consent-privacy"
      className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto"
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white rounded-3xl border border-[#F8BBD0] shadow-[0_12px_40px_-12px_rgba(231,84,128,0.14)] p-6 sm:p-10 space-y-8"
      >
        <div className="space-y-2 border-b border-[#F8BBD0]/60 pb-6">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#333333]">
            Participant Consent &amp; Privacy Notice
          </h2>
          <p className="text-sm sm:text-base text-[#666666] leading-relaxed">
            Before beginning the 21-question survey, please review how your responses are handled and
            confirm your voluntary participation.
          </p>
        </div>

        {/* Survey Facts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 py-4 px-5 rounded-2xl bg-[#FFF0F5] border border-[#F8BBD0]/70 text-center">
          <div>
            <p className="text-lg font-bold text-[#E75480] tabular-nums">21</p>
            <p className="text-xs text-[#666666]">Questions</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#E75480] tabular-nums">5</p>
            <p className="text-xs text-[#666666]">Sections</p>
          </div>
          <div>
            <p className="text-lg font-bold text-[#E75480] tabular-nums">5–8 min</p>
            <p className="text-xs text-[#666666]">Estimated Time</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#333333] pt-0.5">Voluntary</p>
            <p className="text-xs text-[#666666]">Participation</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-sm font-semibold text-[#333333] pt-0.5">Educational</p>
            <p className="text-xs text-[#666666]">ICT Research</p>
          </div>
        </div>

        {/* Privacy & Access Disclosure */}
        <div className="space-y-4 text-sm text-[#666666] leading-relaxed bg-white rounded-2xl border border-[#F8BBD0]/70 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-[#E75480] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-[#333333] mb-1">
                Data Storage, Access Controls &amp; Privacy
              </h3>
              <p>
                Submitted answers are transmitted securely over HTTPS to our project server and
                stored in a restricted-access research database dedicated to this ICT university
                educational project. Only authorized project administrators authenticated through
                the protected Admin Portal can view individual entries, analytics, or CSV exports.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-[#E75480] shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p>
                We do not collect precise GPS location, phone numbers, email addresses, or
                advertising trackers. Providing your name is completely optional.
              </p>
              <p>
                <strong className="font-medium text-[#333333]">
                  Retention &amp; Removal Policy:
                </strong>{' '}
                Responses are retained for up to{' '}
                <span className="tabular-nums font-medium text-[#333333]">
                  {policy.retentionDays} days
                </span>{' '}
                for educational evaluation and then archived or deleted by the project administrator.
                Save your Response Reference ID after submission if you wish to request removal of
                your entry
                {policy.contactEmail ? (
                  <>
                    {' '}
                    by contacting{' '}
                    <a
                      href={`mailto:${policy.contactEmail}`}
                      className="text-[#E75480] underline hover:text-[#D94F8A]"
                    >
                      {policy.contactEmail}
                    </a>
                    .
                  </>
                ) : (
                  ' through the project coordinator.'
                )}
              </p>
              <p>
                <strong className="font-medium text-[#333333]">
                  Participants Under 18 &amp; Educational Scope:
                </strong>{' '}
                If you are under 18, please participate only with parent or guardian awareness and
                leave your name blank if you prefer extra privacy. This student ICT research survey
                is for educational understanding only and does not provide medical diagnosis,
                treatment, or institutional clinical approval.
              </p>
            </div>
          </div>
        </div>

        {/* Optional Participant Name */}
        <div className="space-y-2">
          <label
            htmlFor="participant-name"
            className="block text-sm font-semibold text-[#333333]"
          >
            Participant Name (Optional)
          </label>
          <input
            id="participant-name"
            type="text"
            maxLength={80}
            value={participantName}
            onChange={(e) => onParticipantNameChange(e.target.value)}
            placeholder="Leave blank to remain unnamed"
            className="w-full px-4 py-3 rounded-xl border border-[#F8BBD0] bg-white text-[#333333] placeholder:text-[#666666]/60 focus:border-[#E75480] focus:ring-2 focus:ring-[#E75480]/20 transition-colors"
          />
          <p className="text-xs text-[#666666]">
            Optional — you may skip this field and participate anonymously.
          </p>
        </div>

        {/* Voluntary Consent Checkbox */}
        <div className="space-y-2">
          <label
            htmlFor="consent-checkbox"
            className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-colors ${
              consentConfirmed
                ? 'bg-[#FFF0F5] border-[#E75480]'
                : 'bg-white border-[#F8BBD0] hover:bg-[#FFF0F5]/60'
            }`}
          >
            <input
              id="consent-checkbox"
              type="checkbox"
              checked={consentConfirmed}
              onChange={(e) => {
                onConsentChange(e.target.checked);
                if (e.target.checked) setConsentError('');
              }}
              className="mt-1 h-5 w-5 rounded border-[#E75480] text-[#E75480] accent-[#E75480] shrink-0 cursor-pointer"
            />
            <span className="text-sm sm:text-base font-medium text-[#333333] leading-snug">
              I understand that participation is voluntary and that my responses will be used for
              educational research purposes.
            </span>
          </label>

          {consentError && (
            <div
              role="alert"
              className="flex items-center gap-2 text-sm text-[#B91C1C] bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{consentError}</span>
            </div>
          )}
        </div>

        {/* Start Survey CTA */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#666666]">
            You can move backward to review or edit any answer before final submission.
          </p>
          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-full text-base font-bold text-white bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 shadow-md shadow-[#E75480]/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>START SURVEY</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </form>
    </section>
  );
}
