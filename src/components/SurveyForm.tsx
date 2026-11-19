import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Edit3, Send } from 'lucide-react';
import {
  ALL_QUESTIONS,
  SURVEY_SECTIONS,
  SURVEY_VERSION,
  countCompletedQuestions,
  isQuestionRequired,
  validateSectionAnswers,
  validateSurveyAnswers,
} from '../data/surveyQuestions.ts';
import type { PublicPolicyConfig, QuestionId, SurveyAnswers } from '../types/survey.ts';
import { SubmissionStatus } from './SubmissionStatus.tsx';
import { SurveyProgress } from './SurveyProgress.tsx';
import { SurveySection } from './SurveySection.tsx';

interface SurveyFormProps {
  participantName: string;
  onParticipantNameChange: (name: string) => void;
  consentConfirmed: boolean;
  onConsentChange: (checked: boolean) => void;
  policy: PublicPolicyConfig;
  answers: SurveyAnswers;
  onChangeAnswer: (questionId: QuestionId, value: string) => void;
  onBackToWelcome: () => void;
  onSubmissionSuccess: (result: { responseId: string; submittedAt: string }) => void;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `whs-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function SurveyForm({
  participantName,
  onParticipantNameChange,
  consentConfirmed,
  onConsentChange,
  policy,
  answers,
  onChangeAnswer,
  onBackToWelcome,
  onSubmissionSuccess,
}: SurveyFormProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [sectionErrors, setSectionErrors] = useState<Partial<Record<QuestionId, string>>>({});
  const [consentError, setConsentError] = useState('');
  const [minorAcknowledged, setMinorAcknowledged] = useState(false);
  const [minorAckError, setMinorAckError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => createIdempotencyKey());

  const currentSection = SURVEY_SECTIONS[currentSectionIndex];
  const completedCount = useMemo(() => countCompletedQuestions(answers), [answers]);
  const isLastSection = currentSectionIndex === SURVEY_SECTIONS.length - 1;

  const handleSelectAnswer = (questionId: QuestionId, value: string) => {
    onChangeAnswer(questionId, value);
    setIdempotencyKey(createIdempotencyKey());
    setSubmitError('');
    setSectionErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  };

  const scrollToTopOfCard = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    setSubmitError('');
    if (isReviewStep) {
      setIsReviewStep(false);
      setCurrentSectionIndex(SURVEY_SECTIONS.length - 1);
      scrollToTopOfCard();
      return;
    }
    if (currentSectionIndex > 0) {
      setSectionErrors({});
      setCurrentSectionIndex((prev) => prev - 1);
      scrollToTopOfCard();
    } else {
      onBackToWelcome();
    }
  };

  const handleNext = () => {
    const errors = validateSectionAnswers(currentSectionIndex, answers);
    if (Object.keys(errors).length > 0) {
      setSectionErrors(errors);
      const firstInvalidId = Object.keys(errors)[0];
      document.getElementById(`question-label-${firstInvalidId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      return;
    }

    setSectionErrors({});
    if (!isLastSection) {
      setCurrentSectionIndex((prev) => prev + 1);
      scrollToTopOfCard();
    } else {
      setIsReviewStep(true);
      scrollToTopOfCard();
    }
  };

  const handleJumpToSection = (sectionIndex: number) => {
    setIsReviewStep(false);
    setCurrentSectionIndex(sectionIndex);
    setSubmitError('');
    scrollToTopOfCard();
  };

  const handleSubmitSurvey = async () => {
    if (isSubmitting) return;
    setSubmitError('');
    setConsentError('');
    setMinorAckError('');

    const validation = validateSurveyAnswers(answers, {
      consentConfirmed,
      participantName,
      minorAcknowledged: answers.Q1 === 'Under 18' ? minorAcknowledged : true,
    });

    if (!validation.valid) {
      if (validation.errors.consent) {
        setConsentError(validation.errors.consent);
      }
      if (validation.errors.minorAcknowledged) {
        setMinorAckError(validation.errors.minorAcknowledged);
      }
      if (validation.errors.consent || validation.errors.minorAcknowledged) {
        return;
      }

      // Find first section with a question error and navigate there
      for (let idx = 0; idx < SURVEY_SECTIONS.length; idx += 1) {
        const sec = SURVEY_SECTIONS[idx];
        const secErrs: Partial<Record<QuestionId, string>> = {};
        for (const q of sec.questions) {
          if (validation.errors[q.id]) {
            secErrs[q.id] = validation.errors[q.id];
          }
        }
        if (Object.keys(secErrs).length > 0) {
          setIsReviewStep(false);
          setCurrentSectionIndex(idx);
          setSectionErrors(secErrs);
          scrollToTopOfCard();
          return;
        }
      }
      setSubmitError('Please review all required questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participantName,
          consentConfirmed,
          minorAcknowledged: answers.Q1 === 'Under 18' ? minorAcknowledged : false,
          answers,
          idempotencyKey,
          surveyVersion: SURVEY_VERSION,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        responseId?: string;
        submittedAt?: string;
        error?: string;
      };

      if (!response.ok || data.ok !== true || !data.responseId) {
        setSubmitError(
          data.error || 'Your response could not be submitted. Please try again.'
        );
        return;
      }

      onSubmissionSuccess({
        responseId: data.responseId,
        submittedAt: data.submittedAt || '',
      });
    } catch {
      setSubmitError('Your response could not be submitted. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl border border-[#F8BBD0] shadow-[0_14px_44px_-14px_rgba(231,84,128,0.16)] p-5 sm:p-8 lg:p-10 space-y-8">
        <SurveyProgress
          sectionNumber={currentSection.number}
          totalSections={SURVEY_SECTIONS.length}
          sectionTitle={currentSection.shortTitle}
          completedQuestions={completedCount}
          totalQuestions={ALL_QUESTIONS.length}
          isReviewStep={isReviewStep}
        />

        {/* Section Step Indicators */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
          {SURVEY_SECTIONS.map((sec, idx) => {
            const isActive = !isReviewStep && idx === currentSectionIndex;
            const isPast = isReviewStep || idx < currentSectionIndex;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => handleJumpToSection(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#E75480] text-white'
                    : isPast
                      ? 'bg-[#FFF0F5] text-[#D94F8A] hover:bg-[#F8BBD0]/50'
                      : 'bg-neutral-100 text-[#666666] hover:bg-[#FFF0F5]'
                }`}
              >
                <span className="tabular-nums">{sec.number}.</span> {sec.shortTitle}
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {!isReviewStep ? (
            <motion.div
              key={currentSection.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              {/* Optional Participant Name right at top of Section 1 */}
              {currentSectionIndex === 0 && (
                <div className="rounded-2xl border border-[#F8BBD0]/80 bg-[#FFF0F5]/45 p-5 sm:p-6 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      htmlFor="participant-name"
                      className="text-base font-semibold text-[#333333]"
                    >
                      Participant Name (Optional)
                    </label>
                    <span className="text-xs font-medium text-[#666666]">Optional</span>
                  </div>
                  <input
                    id="participant-name"
                    type="text"
                    maxLength={80}
                    value={participantName}
                    onChange={(e) => onParticipantNameChange(e.target.value)}
                    placeholder="Enter your name or leave blank to remain anonymous"
                    className="w-full px-4 py-3 rounded-xl border border-[#F8BBD0] bg-white text-[#333333] placeholder:text-[#666666]/60 focus:border-[#E75480] focus:ring-2 focus:ring-[#E75480]/20 transition-colors"
                  />
                </div>
              )}

              <SurveySection
                section={currentSection}
                answers={answers}
                errors={sectionErrors}
                onSelectAnswer={handleSelectAnswer}
              />
            </motion.div>
          ) : (
            <motion.div
              key="review-step"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className="space-y-6"
            >
              <div className="p-4 rounded-2xl bg-[#FFF0F5] border border-[#F8BBD0] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <div className="text-sm text-[#333333]">
                  <p className="font-semibold">Please review your answers before final submission.</p>
                  <p className="text-[#666666] mt-0.5">
                    Click &ldquo;Edit Section&rdquo; on any group below to modify an answer without
                    losing your other selections.
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 rounded-xl border border-[#F8BBD0]/80 flex items-center justify-between text-sm">
                <span className="text-[#666666]">Participant Name (Optional)</span>
                <span className="font-semibold text-[#333333]">
                  {participantName.trim() ? participantName.trim() : 'Anonymous'}
                </span>
              </div>

              <div className="space-y-5">
                {SURVEY_SECTIONS.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="rounded-2xl border border-[#F8BBD0]/80 overflow-hidden"
                  >
                    <div className="px-5 py-3.5 bg-[#FFF0F5]/70 border-b border-[#F8BBD0]/60 flex items-center justify-between gap-4">
                      <h3 className="text-sm font-bold text-[#333333]">
                        Section {sec.number}: {sec.shortTitle}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleJumpToSection(idx)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E75480] hover:text-[#D94F8A] whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Section</span>
                      </button>
                    </div>
                    <dl className="divide-y divide-[#F8BBD0]/40 px-5">
                      {sec.questions.map((q) => {
                        const ans = answers[q.id];
                        const optional = !isQuestionRequired(q, answers);
                        return (
                          <div
                            key={q.id}
                            className="py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-6 text-sm"
                          >
                            <dt className="text-[#666666]">
                              <span className="font-semibold text-[#333333] mr-1.5 tabular-nums">
                                Q{q.number}.
                              </span>
                              {q.text}
                            </dt>
                            <dd className="font-semibold text-[#333333] sm:text-right shrink-0">
                              {ans ? ans : optional ? 'Not answered (optional)' : 'Unanswered'}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </div>
                ))}
              </div>

              {answers.Q1 === 'Under 18' && (
                <div className="space-y-2 pt-2">
                  <label
                    htmlFor="minor-ack-checkbox"
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${
                      minorAcknowledged
                        ? 'bg-[#FFF0F5] border-[#E75480]'
                        : 'bg-white border-[#F8BBD0]'
                    }`}
                  >
                    <input
                      id="minor-ack-checkbox"
                      type="checkbox"
                      checked={minorAcknowledged}
                      onChange={(e) => {
                        setMinorAcknowledged(e.target.checked);
                        if (e.target.checked) setMinorAckError('');
                      }}
                      className="mt-1 h-5 w-5 rounded accent-[#E75480] shrink-0 cursor-pointer"
                    />
                    <span className="text-sm text-[#333333] leading-relaxed">
                      <strong>Participants Under 18 Notice:</strong> I confirm that I am
                      participating voluntarily in this educational survey with parent or guardian
                      awareness.
                    </span>
                  </label>
                  {minorAckError && (
                    <p role="alert" className="text-xs font-medium text-[#B91C1C] px-1">
                      {minorAckError}
                    </p>
                  )}
                </div>
              )}

              {/* Consent & Brief Privacy Notice on Final Review Step */}
              <div className="space-y-3 pt-2">
                <label
                  htmlFor="final-consent-checkbox"
                  className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-colors ${
                    consentConfirmed
                      ? 'bg-[#FFF0F5] border-[#E75480]'
                      : 'bg-white border-[#F8BBD0] hover:bg-[#FFF0F5]/50'
                  }`}
                >
                  <input
                    id="final-consent-checkbox"
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={(e) => {
                      onConsentChange(e.target.checked);
                      if (e.target.checked) setConsentError('');
                    }}
                    className="mt-1 h-5 w-5 rounded border-[#E75480] text-[#E75480] accent-[#E75480] shrink-0 cursor-pointer"
                  />
                  <span className="text-sm text-[#333333] leading-relaxed">
                    <strong>Voluntary Consent:</strong> I understand that participation is voluntary
                    and that my responses will be used for educational research purposes.
                  </span>
                </label>

                <p className="text-xs text-[#666666] leading-relaxed px-1">
                  Responses are stored in the project&apos;s restricted Admin Portal database for up
                  to <span className="tabular-nums">{policy.retentionDays}</span> days with no GPS,
                  phone, or email collection.
                  {policy.contactEmail ? ` Removal requests: ${policy.contactEmail}.` : ''}
                </p>

                {consentError && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 text-xs sm:text-sm text-[#B91C1C] bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{consentError}</span>
                  </div>
                )}
              </div>

              <SubmissionStatus isSubmitting={isSubmitting} errorMessage={submitError} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Navigation Buttons */}
        <div className="pt-4 border-t border-[#F8BBD0]/60 flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePrevious}
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 rounded-full text-sm font-semibold text-[#333333] bg-white border border-[#F8BBD0] hover:bg-[#FFF0F5] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{currentSectionIndex === 0 && !isReviewStep ? 'HOME' : 'PREVIOUS'}</span>
          </button>

          {!isReviewStep ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 shadow-sm transition-opacity cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>{isLastSection ? 'REVIEW & SUBMIT' : 'NEXT'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitSurvey}
              className="inline-flex items-center justify-center gap-2 px-7 sm:px-9 py-3.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 disabled:opacity-60 shadow-md shadow-[#E75480]/25 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT SURVEY'}</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
