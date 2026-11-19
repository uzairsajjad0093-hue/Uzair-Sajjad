import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { SURVEY_SECTIONS } from '../data/surveyQuestions.ts';
import type { StoredSurveyResponse, SurveyQuestion } from '../types/survey.ts';

interface AnalyticsChartsProps {
  responses: StoredSurveyResponse[];
  showAllQuestions?: boolean;
}

const CHART_COLORS = ['#E75480', '#D94F8A', '#F48FB1', '#AD1457', '#64748B', '#94A3B8'];

interface DistributionPoint {
  name: string;
  shortName: string;
  count: number;
  percentage: number;
}

function truncateLabel(text: string, maxLen = 22): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}

function buildQuestionDistribution(
  responses: StoredSurveyResponse[],
  question: SurveyQuestion
): {
  data: DistributionPoint[];
  answeredCount: number;
  unansweredCount: number;
} {
  const counts = new Map<string, number>();
  for (const opt of question.options) {
    counts.set(opt, 0);
  }

  let unansweredCount = 0;
  for (const row of responses) {
    const val = row.answers[question.id];
    if (!val || val.trim() === '') {
      unansweredCount += 1;
    } else {
      counts.set(val, (counts.get(val) || 0) + 1);
    }
  }

  const includeUnanswered = Boolean(question.conditionalOptionalOnQ10 && unansweredCount > 0);
  const denominator = includeUnanswered
    ? responses.length
    : Math.max(0, responses.length - unansweredCount);

  const data: DistributionPoint[] = question.options.map((opt) => {
    const count = counts.get(opt) || 0;
    const percentage = denominator > 0 ? Math.round((count / denominator) * 1000) / 10 : 0;
    return {
      name: opt,
      shortName: truncateLabel(opt, 24),
      count,
      percentage,
    };
  });

  if (includeUnanswered) {
    data.push({
      name: 'Skipped (Optional)',
      shortName: 'Skipped (Optional)',
      count: unansweredCount,
      percentage:
        denominator > 0 ? Math.round((unansweredCount / denominator) * 1000) / 10 : 0,
    });
  }

  return {
    data,
    answeredCount: responses.length - unansweredCount,
    unansweredCount,
  };
}

function formatPieLabel(props: PieLabelRenderProps): string {
  const pct = typeof props.percent === 'number' ? Math.round(props.percent * 1000) / 10 : 0;
  if (pct === 0) return '';
  return `${pct}%`;
}

function formatTooltipValue(
  value: number | string | readonly (number | string)[] | undefined,
  _name: number | string | undefined,
  item: { payload?: unknown }
): [string, string] {
  const pt = (item?.payload || {}) as Partial<DistributionPoint>;
  const numericVal = typeof value === 'number' ? value : Number(value ?? 0);
  const pct = typeof pt.percentage === 'number' ? pt.percentage : 0;
  return [`${numericVal} respondents (${pct}%)`, pt.name || 'Option'];
}

export function AnalyticsCharts({
  responses,
  showAllQuestions = true,
}: AnalyticsChartsProps) {
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  if (responses.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#F8BBD0] p-8 text-center space-y-2">
        <h3 className="text-lg font-semibold text-[#333333]">No Survey Data Available Yet</h3>
        <p className="text-sm text-[#666666] max-w-md mx-auto">
          Graphs and per-question respondent counts for all 21 questions will appear here as soon
          as participants submit the survey.
        </p>
      </div>
    );
  }

  const visibleSections = showAllQuestions
    ? selectedSectionId === 'all'
      ? SURVEY_SECTIONS
      : SURVEY_SECTIONS.filter((s) => s.id === selectedSectionId)
    : [SURVEY_SECTIONS[1], SURVEY_SECTIONS[3]];

  return (
    <div className="space-y-6">
      {/* Summary Notice + Controls */}
      <div className="bg-white rounded-2xl border border-[#F8BBD0] p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-[#666666]">
          Showing exact respondent counts and percentages across{' '}
          <strong className="text-[#333333] tabular-nums">
            n = {responses.length}
          </strong>{' '}
          submitted {responses.length === 1 ? 'response' : 'responses'}. Educational statistics
          only (no medical conclusions).
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#FFF0F5] border border-[#F8BBD0] rounded-xl self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              chartType === 'bar'
                ? 'bg-white text-[#E75480] shadow-xs'
                : 'text-[#666666] hover:text-[#333333]'
            }`}
          >
            Bar Graphs
          </button>
          <button
            type="button"
            onClick={() => setChartType('pie')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              chartType === 'pie'
                ? 'bg-white text-[#E75480] shadow-xs'
                : 'text-[#666666] hover:text-[#333333]'
            }`}
          >
            Pie Charts
          </button>
        </div>
      </div>

      {/* Section Filter Tabs */}
      {showAllQuestions && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedSectionId('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedSectionId === 'all'
                ? 'bg-[#E75480] text-white'
                : 'bg-white border border-[#F8BBD0] text-[#666666] hover:text-[#333333]'
            }`}
          >
            All 21 Questions
          </button>
          {SURVEY_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSelectedSectionId(sec.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                selectedSectionId === sec.id
                  ? 'bg-[#E75480] text-white'
                  : 'bg-white border border-[#F8BBD0] text-[#666666] hover:text-[#333333]'
              }`}
            >
              <span className="tabular-nums">{sec.number}.</span> {sec.shortTitle}
            </button>
          ))}
        </div>
      )}

      {/* Per-Section & Per-Question Analytics Cards */}
      <div className="space-y-8">
        {visibleSections.map((section) => (
          <section key={section.id} className="space-y-4">
            <div className="flex items-baseline justify-between gap-4 border-b border-[#F8BBD0] pb-2">
              <h2 className="text-base sm:text-lg font-bold text-[#333333]">
                {section.title}
              </h2>
              <span className="text-xs font-medium text-[#D94F8A] tabular-nums shrink-0">
                {section.questions.length} Questions
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {section.questions.map((question) => {
                const { data, answeredCount, unansweredCount } = buildQuestionDistribution(
                  responses,
                  question
                );
                const hasLongLabels = question.options.some((o) => o.length > 16);

                return (
                  <article
                    key={question.id}
                    className="bg-white rounded-2xl border border-[#F8BBD0] p-5 sm:p-6 flex flex-col justify-between space-y-5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-bold text-[#E75480] tabular-nums">
                          Question {question.number} ({question.id})
                        </span>
                        <span className="text-xs text-[#666666] tabular-nums whitespace-nowrap shrink-0">
                          Answered: {answeredCount}
                          {unansweredCount > 0 ? ` · Skipped: ${unansweredCount}` : ''}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#333333] leading-snug">
                        {question.text}
                      </h3>
                    </div>

                    {/* Recharts Visualization */}
                    <div className="w-full h-[230px]">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'pie' ? (
                          <PieChart>
                            <Pie
                              data={data}
                              dataKey="count"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={36}
                              outerRadius={76}
                              label={formatPieLabel}
                            >
                              {data.map((entry, idx) => (
                                <Cell
                                  key={entry.name}
                                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={formatTooltipValue} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                          </PieChart>
                        ) : hasLongLabels ? (
                          <BarChart
                            data={data}
                            layout="vertical"
                            margin={{ top: 4, right: 20, left: 8, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F8BBD0" />
                            <XAxis
                              type="number"
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: '#666666' }}
                            />
                            <YAxis
                              type="category"
                              dataKey="shortName"
                              width={132}
                              tick={{ fontSize: 11, fill: '#333333' }}
                            />
                            <Tooltip formatter={formatTooltipValue} />
                            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                              {data.map((entry, idx) => (
                                <Cell
                                  key={entry.name}
                                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        ) : (
                          <BarChart
                            data={data}
                            margin={{ top: 8, right: 12, left: -16, bottom: 4 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#F8BBD0" />
                            <XAxis
                              dataKey="shortName"
                              tick={{ fontSize: 11, fill: '#333333' }}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: '#666666' }}
                            />
                            <Tooltip formatter={formatTooltipValue} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                              {data.map((entry, idx) => (
                                <Cell
                                  key={entry.name}
                                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    {/* Exact Count & Percentage List per Answer Option */}
                    <ul className="space-y-2 pt-2 border-t border-[#F8BBD0]/50">
                      {data.map((pt, idx) => (
                        <li key={pt.name} className="space-y-1">
                          <div className="flex items-baseline justify-between gap-2 text-xs">
                            <span className="text-[#333333] flex items-center gap-2">
                              <span
                                aria-hidden="true"
                                className="w-2.5 h-2.5 rounded-xs shrink-0"
                                style={{
                                  backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                                }}
                              />
                              <span>{pt.name}</span>
                            </span>
                            <span className="font-mono font-semibold text-[#333333] tabular-nums shrink-0">
                              {pt.count} ({pt.percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 bg-[#FFF0F5] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pt.percentage}%`,
                                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                              }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
