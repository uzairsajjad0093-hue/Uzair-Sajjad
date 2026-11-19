import { AlertCircle } from 'lucide-react';
import type { QuestionId, SurveyQuestion as SurveyQuestionType } from '../types/survey.ts';

interface SurveyQuestionProps {
  question: SurveyQuestionType;
  selectedValue: string | undefined;
  isOptional: boolean;
  errorMessage?: string;
  onSelect: (questionId: QuestionId, value: string) => void;
}

export function SurveyQuestion({
  question,
  selectedValue,
  isOptional,
  errorMessage,
  onSelect,
}: SurveyQuestionProps) {
  const labelId = `question-label-${question.id}`;
  const errorId = `question-error-${question.id}`;

  return (
    <fieldset
      aria-labelledby={labelId}
      aria-describedby={errorMessage ? errorId : undefined}
      className={`rounded-2xl border p-5 sm:p-6 transition-colors ${
        errorMessage
          ? 'border-red-300 bg-red-50/30'
          : 'border-[#F8BBD0]/80 bg-white'
      }`}
    >
      <legend id={labelId} className="sr-only">
        Question {question.number}: {question.text}
      </legend>

      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <h3 className="text-base sm:text-[17px] font-semibold text-[#333333] leading-snug">
          <span className="text-[#E75480] font-bold mr-1.5 tabular-nums">
            Q{question.number}.
          </span>
          {question.text}
        </h3>
        <span className="text-xs font-medium text-[#666666] whitespace-nowrap shrink-0">
          {isOptional ? 'Optional' : 'Required'}
        </span>
      </div>

      <div role="radiogroup" aria-labelledby={labelId} className="space-y-2.5">
        {question.options.map((option) => {
          const isSelected = selectedValue === option;
          const inputId = `${question.id}-${option.replace(/[^a-zA-Z0-9]/g, '_')}`;

          return (
            <label
              key={option}
              htmlFor={inputId}
              className={`flex items-center gap-3.5 min-h-[48px] px-4 py-3 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                isSelected
                  ? 'border-[#E75480] bg-[#FFF0F5] text-[#333333] shadow-xs'
                  : 'border-[#F8BBD0]/80 bg-white text-[#333333] hover:bg-[#FFF0F5]/50 hover:border-[#E75480]/50'
              }`}
            >
              <input
                id={inputId}
                type="radio"
                name={question.id}
                value={option}
                checked={isSelected}
                onChange={() => onSelect(question.id, option)}
                className="sr-only"
              />

              {/* Custom Radio Circle */}
              <span
                aria-hidden="true"
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors duration-150 ${
                  isSelected ? 'border-[#E75480] bg-white' : 'border-[#D94F8A]/45 bg-white'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full bg-[#E75480] transition-transform duration-150 ${
                    isSelected ? 'scale-100' : 'scale-0'
                  }`}
                />
              </span>

              <span className={`text-sm sm:text-base ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                {option}
              </span>
            </label>
          );
        })}
      </div>

      {errorMessage && (
        <div
          id={errorId}
          role="alert"
          className="mt-3 flex items-center gap-2 text-xs sm:text-sm font-medium text-[#B91C1C]"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </fieldset>
  );
}
