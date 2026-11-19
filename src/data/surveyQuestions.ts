import type {
  QuestionId,
  SurveyAnswers,
  SurveyQuestion,
  SurveySection,
} from '../types/survey.ts';

export const SURVEY_VERSION = '1.0.0';

export const SURVEY_SECTIONS: readonly SurveySection[] = [
  {
    id: 'general-information',
    number: 1,
    title: 'SECTION 1: GENERAL INFORMATION',
    shortTitle: 'General Information',
    description:
      'Basic demographic background to help contextualize survey findings across age groups and occupations.',
    questions: [
      {
        id: 'Q1',
        number: 1,
        text: 'What is your age?',
        options: ['Under 18', '18–25', '26–35', '36–45', 'Above 45'],
        sheetColumn: 'Q1 - Age',
      },
      {
        id: 'Q2',
        number: 2,
        text: 'What is your marital status?',
        options: ['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'],
        sheetColumn: 'Q2 - Marital Status',
      },
      {
        id: 'Q3',
        number: 3,
        text: 'Which country do you live in?',
        options: ['Pakistan', 'India', 'Other'],
        sheetColumn: 'Q3 - Country',
      },
      {
        id: 'Q4',
        number: 4,
        text: 'What is your occupation?',
        options: ['Student', 'Housewife', 'Working woman', 'Other'],
        sheetColumn: 'Q4 - Occupation',
      },
    ],
  },
  {
    id: 'menstrual-health',
    number: 2,
    title: 'SECTION 2: MENSTRUAL HEALTH',
    shortTitle: 'Menstrual Health',
    description:
      'Questions exploring menstrual pain experiences, severity, pain regions, and impact on daily routine.',
    questions: [
      {
        id: 'Q5',
        number: 5,
        text: 'Do you experience pain during menstrual periods?',
        options: ['Yes', 'No', 'Sometimes'],
        sheetColumn: 'Q5 - Menstrual Pain',
      },
      {
        id: 'Q6',
        number: 6,
        text: 'How severe is your menstrual pain?',
        options: ['Mild', 'Moderate', 'Severe', 'No pain'],
        sheetColumn: 'Q6 - Menstrual Pain Severity',
      },
      {
        id: 'Q7',
        number: 7,
        text: 'Where do you usually experience pain during periods?',
        options: ['Lower abdomen', 'Lower back', 'Legs', 'Multiple areas', 'No pain'],
        sheetColumn: 'Q7 - Menstrual Pain Location',
      },
      {
        id: 'Q8',
        number: 8,
        text: 'Does period pain affect your daily activities?',
        options: ['Yes', 'No', 'Sometimes'],
        sheetColumn: 'Q8 - Daily Activities Affected',
      },
      {
        id: 'Q9',
        number: 9,
        text: 'Do you experience back pain before or during menstruation?',
        options: ['Yes', 'No', 'Sometimes'],
        sheetColumn: 'Q9 - Menstrual Back Pain',
      },
    ],
  },
  {
    id: 'pregnancy-and-back-pain',
    number: 3,
    title: 'SECTION 3: PREGNANCY AND BACK PAIN',
    shortTitle: 'Pregnancy and Back Pain',
    description:
      'Questions about pregnancy history and back discomfort during or after pregnancy. Questions 11–13 are optional if you have never been pregnant or prefer not to say.',
    questions: [
      {
        id: 'Q10',
        number: 10,
        text: 'Have you ever been pregnant?',
        options: ['Yes', 'No', 'Prefer not to say'],
        sheetColumn: 'Q10 - Pregnancy History',
      },
      {
        id: 'Q11',
        number: 11,
        text: 'Did you experience back pain during pregnancy?',
        options: ['Yes', 'No', 'Not applicable'],
        sheetColumn: 'Q11 - Back Pain During Pregnancy',
        conditionalOptionalOnQ10: true,
      },
      {
        id: 'Q12',
        number: 12,
        text: 'During which stage of pregnancy was back pain most noticeable?',
        options: ['First trimester', 'Second trimester', 'Third trimester', 'Not applicable'],
        sheetColumn: 'Q12 - Pregnancy Trimester',
        conditionalOptionalOnQ10: true,
      },
      {
        id: 'Q13',
        number: 13,
        text: 'Did you experience back pain after childbirth?',
        options: ['Yes', 'No', 'Not applicable'],
        sheetColumn: 'Q13 - Back Pain After Childbirth',
        conditionalOptionalOnQ10: true,
      },
    ],
  },
  {
    id: 'spine-and-back-health',
    number: 4,
    title: 'SECTION 4: SPINE AND BACK HEALTH',
    shortTitle: 'Spine and Back Health',
    description:
      'Questions about general spine or back pain patterns, sitting duration, and posture habits.',
    questions: [
      {
        id: 'Q14',
        number: 14,
        text: 'Do you frequently experience spine or back pain?',
        options: ['Yes', 'No', 'Sometimes'],
        sheetColumn: 'Q14 - Frequent Back Pain',
      },
      {
        id: 'Q15',
        number: 15,
        text: 'Which area of your back experiences the most pain?',
        options: ['Upper back', 'Middle back', 'Lower back', 'Entire back', 'No pain'],
        sheetColumn: 'Q15 - Back Pain Area',
      },
      {
        id: 'Q16',
        number: 16,
        text: 'Does sitting for long periods increase your back pain?',
        options: ['Yes', 'No', 'Sometimes'],
        sheetColumn: 'Q16 - Sitting and Back Pain',
      },
      {
        id: 'Q17',
        number: 17,
        text: 'Do you think poor sitting or standing posture contributes to back pain?',
        options: ['Yes', 'No', 'Not sure'],
        sheetColumn: 'Q17 - Posture Awareness',
      },
    ],
  },
  {
    id: 'awareness-and-prevention',
    number: 5,
    title: 'SECTION 5: AWARENESS AND PREVENTION',
    shortTitle: 'Awareness and Prevention',
    description:
      'Questions covering exercise awareness, medical consultations, and access to reproductive health education.',
    questions: [
      {
        id: 'Q18',
        number: 18,
        text: 'Are you aware of exercises that can help reduce back pain?',
        options: ['Yes', 'No', 'A little'],
        sheetColumn: 'Q18 - Exercise Awareness',
      },
      {
        id: 'Q19',
        number: 19,
        text: 'Have you ever consulted a doctor about menstrual or back pain?',
        options: ['Yes', 'No', 'Prefer not to say'],
        sheetColumn: 'Q19 - Doctor Consultation',
      },
      {
        id: 'Q20',
        number: 20,
        text: "Would you like to receive more awareness and information about women's menstrual, pregnancy, and spine health?",
        options: ['Yes', 'No', 'Maybe'],
        sheetColumn: 'Q20 - Interest in Health Awareness',
      },
      {
        id: 'Q21',
        number: 21,
        text: 'Have you ever received information or education about menstrual and reproductive health?',
        options: [
          'Yes, through school or university',
          'Yes, through doctors or healthcare professionals',
          'Yes, through the internet or social media',
          'No, I have never received such information',
        ],
        sheetColumn: 'Q21 - Reproductive Health Education',
      },
    ],
  },
];

export const ALL_QUESTIONS: readonly SurveyQuestion[] = SURVEY_SECTIONS.flatMap(
  (section) => section.questions
);

export const SPREADSHEET_HEADERS: readonly string[] = [
  'Response ID',
  'Submission Timestamp',
  'Participant Name',
  ...ALL_QUESTIONS.map((q) => q.sheetColumn),
  'Consent Confirmed',
  'Survey Version',
];

export function isQuestionRequired(question: SurveyQuestion, answers: SurveyAnswers): boolean {
  if (!question.conditionalOptionalOnQ10) {
    return true;
  }
  const q10 = answers.Q10;
  if (q10 === 'No' || q10 === 'Prefer not to say') {
    return false;
  }
  return true;
}

export function sanitizeTextForSheet(raw: unknown, maxLen = 80): string {
  if (typeof raw !== 'string') {
    return '';
  }
  const cleaned = raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);

  if (!cleaned) {
    return '';
  }

  // Prevent spreadsheet formula injection (=, +, -, @, tab, CR)
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    return `'${cleaned}`;
  }
  return cleaned;
}

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<QuestionId | 'consent' | 'minorAcknowledged', string>>;
  sanitizedAnswers: Record<QuestionId, string>;
  sanitizedName: string;
}

export function validateSurveyAnswers(
  answers: SurveyAnswers,
  options: {
    consentConfirmed: boolean;
    participantName?: string;
    minorAcknowledged?: boolean;
  }
): ValidationResult {
  const errors: Partial<Record<QuestionId | 'consent' | 'minorAcknowledged', string>> = {};
  const sanitizedAnswers = {} as Record<QuestionId, string>;

  if (!options.consentConfirmed) {
    errors.consent = 'Please confirm voluntary participation consent before submitting.';
  }

  for (const question of ALL_QUESTIONS) {
    const val = answers[question.id];
    const required = isQuestionRequired(question, answers);

    if (!val || typeof val !== 'string' || val.trim() === '') {
      if (required) {
        errors[question.id] = 'Please select an option for this question.';
      } else {
        sanitizedAnswers[question.id] = '';
      }
      continue;
    }

    if (!question.options.includes(val)) {
      errors[question.id] = 'Selected option is not valid for this question.';
      continue;
    }

    sanitizedAnswers[question.id] = val;
  }

  if (answers.Q1 === 'Under 18' && !options.minorAcknowledged) {
    errors.minorAcknowledged =
      'Please confirm the age-appropriate participation acknowledgement before submitting.';
  }

  const sanitizedName = sanitizeTextForSheet(options.participantName ?? '', 80);

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitizedAnswers,
    sanitizedName,
  };
}

export function validateSectionAnswers(
  sectionIndex: number,
  answers: SurveyAnswers
): Partial<Record<QuestionId, string>> {
  const section = SURVEY_SECTIONS[sectionIndex];
  if (!section) {
    return {};
  }
  const errors: Partial<Record<QuestionId, string>> = {};
  for (const question of section.questions) {
    const val = answers[question.id];
    const required = isQuestionRequired(question, answers);
    if (!val || typeof val !== 'string' || val.trim() === '') {
      if (required) {
        errors[question.id] = 'Please select an answer before continuing.';
      }
    } else if (!question.options.includes(val)) {
      errors[question.id] = 'Please choose one of the listed options.';
    }
  }
  return errors;
}

export function countCompletedQuestions(answers: SurveyAnswers): number {
  let count = 0;
  for (const q of ALL_QUESTIONS) {
    const val = answers[q.id];
    if (val && q.options.includes(val)) {
      count += 1;
    }
  }
  return count;
}
