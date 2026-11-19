import { useMemo, useState } from 'react';
import { Download, Eye, Search, X } from 'lucide-react';
import { ALL_QUESTIONS, SURVEY_SECTIONS } from '../data/surveyQuestions.ts';
import type { StoredSurveyResponse } from '../types/survey.ts';
import { getAdminAuthHeaders } from '../utils/adminAuth.ts';

interface ResponseTableProps {
  responses: StoredSurveyResponse[];
  configured: boolean;
}

export function ResponseTable({ responses, configured }: ResponseTableProps) {
  const [searchId, setSearchId] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedRow, setSelectedRow] = useState<StoredSurveyResponse | null>(null);
  const [exporting, setExporting] = useState(false);

  const filteredResponses = useMemo(() => {
    const query = searchId.trim().toLowerCase();
    return responses.filter((item) => {
      if (ageFilter && item.answers.Q1 !== ageFilter) return false;
      if (countryFilter && item.answers.Q3 !== countryFilter) return false;
      if (dateFilter && !item.submittedAt.startsWith(dateFilter)) return false;
      if (
        query &&
        !item.responseId.toLowerCase().includes(query) &&
        !item.participantName.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [responses, searchId, ageFilter, countryFilter, dateFilter]);

  const handleExportCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (searchId.trim()) params.set('search', searchId.trim());
      if (ageFilter) params.set('age', ageFilter);
      if (countryFilter) params.set('country', countryFilter);
      if (dateFilter) params.set('date', dateFilter);
      const qs = params.toString();
      const res = await fetch(`/api/admin/export-csv${qs ? `?${qs}` : ''}`, {
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `womens-health-survey-responses-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Filters & Export Toolbar */}
      <div className="bg-white rounded-2xl border border-[#F8BBD0] p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#666666] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Search by Response ID or Name..."
              aria-label="Search by Response ID or Name"
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480]"
            />
          </div>

          <select
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
            aria-label="Filter by age group"
            className="px-3 py-2.5 text-sm rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480]"
          >
            <option value="">All Age Groups</option>
            {ALL_QUESTIONS[0].options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            aria-label="Filter by country"
            className="px-3 py-2.5 text-sm rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480]"
          >
            <option value="">All Countries</option>
            {ALL_QUESTIONS[2].options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            aria-label="Filter by submission date"
            className="px-3 py-2.5 text-sm rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs sm:text-sm text-[#666666] tabular-nums">
            Showing <strong className="text-[#333333]">{filteredResponses.length}</strong> of{' '}
            <strong className="text-[#333333]">{responses.length}</strong> responses
            {(searchId || ageFilter || countryFilter || dateFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchId('');
                  setAgeFilter('');
                  setCountryFilter('');
                  setDateFilter('');
                }}
                className="ml-3 text-[#E75480] font-semibold hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            )}
          </div>

          <button
            type="button"
            disabled={!configured || filteredResponses.length === 0}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 disabled:opacity-45 transition-opacity cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Responses Table */}
      <div className="bg-white rounded-2xl border border-[#F8BBD0] overflow-hidden">
        {filteredResponses.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-base font-semibold text-[#333333]">
              {responses.length === 0
                ? 'No submitted survey rows found yet'
                : 'No responses match the active filters'}
            </p>
            <p className="text-sm text-[#666666]">
              {responses.length === 0
                ? 'Submit a response through the public survey to see it recorded here.'
                : 'Adjust your search query or filter selections above.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#FFF0F5] border-b border-[#F8BBD0] text-xs font-semibold text-[#333333]">
                  <th className="py-3 px-4 whitespace-nowrap">Response ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Submitted (PKT)</th>
                  <th className="py-3 px-4 whitespace-nowrap">Name</th>
                  <th className="py-3 px-4 whitespace-nowrap">Age</th>
                  <th className="py-3 px-4 whitespace-nowrap">Country</th>
                  <th className="py-3 px-4 whitespace-nowrap">Period Pain</th>
                  <th className="py-3 px-4 whitespace-nowrap">Pregnant</th>
                  <th className="py-3 px-4 whitespace-nowrap">Back Pain</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F8BBD0]/50">
                {filteredResponses.map((row) => (
                  <tr
                    key={row.responseId}
                    className="hover:bg-[#FFF0F5]/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-[#333333] tabular-nums whitespace-nowrap">
                      {row.responseId}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#666666] tabular-nums whitespace-nowrap">
                      {row.submittedAt}
                    </td>
                    <td className="py-3 px-4 text-[#333333] whitespace-nowrap">
                      {row.participantName || 'Anonymous'}
                    </td>
                    <td className="py-3 px-4 text-[#333333] tabular-nums whitespace-nowrap">
                      {row.answers.Q1}
                    </td>
                    <td className="py-3 px-4 text-[#333333] whitespace-nowrap">
                      {row.answers.Q3}
                    </td>
                    <td className="py-3 px-4 text-[#333333] whitespace-nowrap">
                      {row.answers.Q5}
                    </td>
                    <td className="py-3 px-4 text-[#333333] whitespace-nowrap">
                      {row.answers.Q10}
                    </td>
                    <td className="py-3 px-4 text-[#333333] whitespace-nowrap">
                      {row.answers.Q14}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedRow(row)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E75480] bg-[#FFF0F5] hover:bg-[#F8BBD0]/60 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Individual Response Detail Modal */}
      {selectedRow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Survey response ${selectedRow.responseId}`}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl border border-[#F8BBD0] shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-[#FFF0F5] border-b border-[#F8BBD0] flex items-center justify-between gap-4">
              <div>
                <h3 className="font-mono text-sm sm:text-base font-bold text-[#333333] tabular-nums">
                  {selectedRow.responseId}
                </h3>
                <p className="text-xs text-[#666666] tabular-nums">
                  {selectedRow.submittedAt} ·{' '}
                  {selectedRow.participantName || 'Anonymous Participant'}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close response details"
                onClick={() => setSelectedRow(null)}
                className="w-9 h-9 rounded-xl bg-white border border-[#F8BBD0] flex items-center justify-center text-[#333333] hover:text-[#E75480] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {SURVEY_SECTIONS.map((sec) => (
                <div key={sec.id} className="space-y-2">
                  <h4 className="text-xs font-bold tracking-wide text-[#D94F8A]">
                    {sec.title}
                  </h4>
                  <dl className="divide-y divide-[#F8BBD0]/50 border border-[#F8BBD0]/70 rounded-xl px-4">
                    {sec.questions.map((q) => (
                      <div
                        key={q.id}
                        className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 text-xs sm:text-sm"
                      >
                        <dt className="text-[#666666]">
                          <strong className="text-[#333333] mr-1 tabular-nums">Q{q.number}.</strong>
                          {q.text}
                        </dt>
                        <dd className="font-semibold text-[#333333] sm:text-right shrink-0">
                          {selectedRow.answers[q.id] || 'Not answered'}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
