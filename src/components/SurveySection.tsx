import { Info } from 'lucide-react';
import { isQuestionRequired } from '../data/surveyQuestions.ts';
import type {
  QuestionId,
  SurveyAnswers,
  SurveySection as SurveySectionType,
} from '../types/survey.ts';
import { SurveyQuestion } from './SurveyQuestion.tsx';

interface SurveySectionProps {
  section: SurveySectionType;
  answers: SurveyAnswers;
  errors: Partial<Record<QuestionId, string>>;
  onSelectAnswer: (questionId: QuestionId, value: string) => void;
}

export function SurveySection({
  section,
  answers,
  errors,
  onSelectAnswer,
}: SurveySectionProps) {
  const pregnancyOptionalMode =
    section.id === 'pregnancy-and-back-pain' &&
    (answers.Q10 === 'No' || answers.Q10 === 'Prefer not to say');

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-[#D94F8A]">
          {section.title}
        </p>
        <p className="text-sm text-[#666666] leading-relaxed">{section.description}</p>
      </div>

      {pregnancyOptionalMode && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#FFF0F5] border border-[#F8BBD0] text-sm text-[#333333]">
          <Info className="w-5 h-5 text-[#E75480] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Because you selected <strong>{answers.Q10}</strong> for Question 10, Questions 11–13 are
            optional. You may select <strong>Not applicable</strong> or leave them blank and
            continue.
          </p>
        </div>
      )}

      <div className="space-y-5">
        {section.questions.map((question) => (
          <SurveyQuestion
            key={question.id}
            question={question}
            selectedValue={answers[question.id]}
            isOptional={!isQuestionRequired(question, answers)}
            errorMessage={errors[question.id]}
            onSelect={onSelectAnswer}
          />
        ))}
      </div>
    </div>
  );
}
