import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Settings,
  Table2,
  Trash2,
  X,
} from 'lucide-react';
import type { StoredSurveyResponse } from '../types/survey.ts';
import { getAdminAuthHeaders } from '../utils/adminAuth.ts';
import { AnalyticsCharts } from './AnalyticsCharts.tsx';
import { GoogleSheetsSetup } from './GoogleSheetsSetup.tsx';
import { ResponseTable } from './ResponseTable.tsx';

interface AdminDashboardProps {
  username: string;
  onLoggedOut: () => void;
  onBackToSurvey: () => void;
}

type AdminTab = 'overview' | 'charts' | 'responses' | 'settings';

function getTodayKarachiDatePrefix(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Karachi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function AdminDashboard({
  username,
  onLoggedOut,
  onBackToSurvey,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [responses, setResponses] = useState<StoredSurveyResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string>('');

  const fetchResponses = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await fetch('/api/admin/responses', {
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      if (res.status === 401) {
        onLoggedOut();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        responses?: StoredSurveyResponse[];
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setLoadError(data.error || 'Could not retrieve survey responses.');
        setResponses([]);
        return;
      }
      setResponses(Array.isArray(data.responses) ? data.responses : []);
    } catch {
      setLoadError('Network error while fetching responses.');
    } finally {
      setLoading(false);
    }
  }, [onLoggedOut]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: getAdminAuthHeaders(),
      credentials: 'include',
    }).catch(() => undefined);
    onLoggedOut();
  };

  const handleClearData = async () => {
    if (clearing) return;
    setClearing(true);
    setLoadError('');
    setActionMessage('');
    try {
      const res = await fetch('/api/admin/responses/clear', {
        method: 'POST',
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      if (res.status === 401) {
        onLoggedOut();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        clearedCount?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setLoadError(data.error || 'Failed to clear stored survey responses.');
        setConfirmClearOpen(false);
        return;
      }
      setResponses([]);
      setConfirmClearOpen(false);
      setActionMessage(
        `All stored survey responses (${data.clearedCount ?? 0}) have been cleared.`
      );
    } catch {
      setLoadError('Network error while clearing data.');
      setConfirmClearOpen(false);
    } finally {
      setClearing(false);
    }
  };

  const stats = useMemo(() => {
    const todayPrefix = getTodayKarachiDatePrefix();
    const total = responses.length;
    const today = responses.filter((r) => r.submittedAt.startsWith(todayPrefix)).length;
    const periodPainYesOrSometimes = responses.filter(
      (r) => r.answers.Q5 === 'Yes' || r.answers.Q5 === 'Sometimes'
    ).length;
    const everPregnantYes = responses.filter((r) => r.answers.Q10 === 'Yes').length;
    const pregnancyBackPainYes = responses.filter((r) => r.answers.Q11 === 'Yes').length;
    const frequentBackPainYesOrSometimes = responses.filter(
      (r) => r.answers.Q14 === 'Yes' || r.answers.Q14 === 'Sometimes'
    ).length;
    const wantsAwarenessYes = responses.filter((r) => r.answers.Q20 === 'Yes').length;

    return {
      total,
      today,
      periodPainYesOrSometimes,
      everPregnantYes,
      pregnancyBackPainYes,
      frequentBackPainYesOrSometimes,
      wantsAwarenessYes,
    };
  }, [responses]);

  const navItems: { id: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'charts', label: 'All 21 Question Analytics', icon: BarChart3 },
    { id: 'responses', label: 'Responses Table', icon: Table2 },
    { id: 'settings', label: 'Settings & Optional Sync', icon: Settings },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row bg-[#FFF0F5]">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#F8BBD0] p-4 sm:p-5 flex flex-col justify-between gap-6">
        <div className="space-y-5">
          <div className="px-2">
            <p className="text-xs font-semibold text-[#D94F8A]">Research Administration</p>
            <h1 className="text-base font-bold text-[#333333] mt-0.5">Admin Portal</h1>
          </div>

          <nav
            aria-label="Admin Dashboard Navigation"
            className="flex lg:flex-col gap-1.5 overflow-x-auto"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#FFF0F5] text-[#E75480] font-semibold border border-[#F8BBD0]'
                      : 'text-[#666666] hover:bg-[#FFF0F5]/60 hover:text-[#333333]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block pt-4 border-t border-[#F8BBD0]/60 space-y-3">
          <div className="px-2 text-xs text-[#666666]">
            Signed in as <strong className="text-[#333333]">{username}</strong>
          </div>
          <button
            type="button"
            onClick={onBackToSurvey}
            className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#666666] hover:bg-[#FFF0F5] hover:text-[#333333] transition-colors cursor-pointer"
          >
            View Public Survey
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full inline-flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#333333] border border-[#F8BBD0] hover:bg-[#FFF0F5] transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#E75480]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Dashboard Content */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-[#F8BBD0] px-5 py-4">
          <div>
            <p className="text-xs text-[#666666]">
              Admin Portal /{' '}
              <span className="text-[#333333] font-medium">
                {navItems.find((n) => n.id === activeTab)?.label}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={fetchResponses}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#333333] bg-[#FFF0F5] border border-[#F8BBD0] hover:bg-[#F8BBD0]/50 disabled:opacity-50 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-[#E75480] ${loading ? 'animate-spin' : ''}`}
              />
              <span>Refresh Data</span>
            </button>

            <button
              type="button"
              disabled={loading || responses.length === 0}
              onClick={() => setConfirmClearOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#B91C1C] bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-45 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Data</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#333333] border border-[#F8BBD0] hover:bg-[#FFF0F5] cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E75480]" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {actionMessage && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#E8F5E9] border border-[#2E7D32]/30 text-sm text-[#1B5E20]"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setActionMessage('')}
              className="text-xs font-semibold hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {loadError && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#991B1B]"
          >
            {loadError}
          </div>
        )}

        {/* Active Tab Viewport */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                label="Total Survey Responses"
                value={loading ? '—' : String(stats.total)}
                detail="Stored in Admin Portal database"
              />
              <StatCard
                label="Responses Submitted Today"
                value={loading ? '—' : String(stats.today)}
                detail="Asia/Karachi (PKT) date"
              />
              <StatCard
                label="Menstrual Pain (Yes / Sometimes)"
                value={
                  loading
                    ? '—'
                    : stats.total > 0
                      ? `${stats.periodPainYesOrSometimes} (${Math.round(
                          (stats.periodPainYesOrSometimes / stats.total) * 100
                        )}%)`
                      : '0'
                }
                detail="From Question 5"
              />
              <StatCard
                label="Frequent Back Pain (Yes / Sometimes)"
                value={
                  loading
                    ? '—'
                    : stats.total > 0
                      ? `${stats.frequentBackPainYesOrSometimes} (${Math.round(
                          (stats.frequentBackPainYesOrSometimes / stats.total) * 100
                        )}%)`
                      : '0'
                }
                detail="From Question 14"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard
                label="Pregnancy History (Yes)"
                value={loading ? '—' : String(stats.everPregnantYes)}
                detail="Question 10"
              />
              <StatCard
                label="Pregnancy Back Pain (Yes)"
                value={loading ? '—' : String(stats.pregnancyBackPainYes)}
                detail="Question 11"
              />
              <StatCard
                label="Interested in Health Awareness"
                value={loading ? '—' : String(stats.wantsAwarenessYes)}
                detail="Question 20 (Yes)"
              />
            </div>

            {!loading && <AnalyticsCharts responses={responses} showAllQuestions />}
          </div>
        )}

        {activeTab === 'charts' && !loading && (
          <AnalyticsCharts responses={responses} showAllQuestions />
        )}

        {activeTab === 'responses' && (
          <ResponseTable responses={responses} configured={true} />
        )}

        {activeTab === 'settings' && (
          <GoogleSheetsSetup onIntegrationUpdated={fetchResponses} />
        )}
      </div>

      {/* Clear All Data Confirmation Modal */}
      {confirmClearOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-data-title"
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl border border-[#F8BBD0] shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-red-50 text-[#B91C1C] flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h2 id="clear-data-title" className="text-base font-bold text-[#333333]">
                    Clear All Survey Responses?
                  </h2>
                  <p className="text-xs text-[#666666]">This action cannot be undone.</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Cancel clear data"
                onClick={() => setConfirmClearOpen(false)}
                className="w-8 h-8 rounded-lg border border-[#F8BBD0] flex items-center justify-center text-[#666666] hover:text-[#333333] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-[#666666] leading-relaxed">
              This will permanently delete all{' '}
              <strong className="text-[#333333] tabular-nums">{responses.length}</strong> stored
              survey {responses.length === 1 ? 'response' : 'responses'} from the Admin Portal
              database and reset all question charts to zero. If needed, export a CSV backup from
              the Responses Table before clearing.
            </p>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                disabled={clearing}
                onClick={() => setConfirmClearOpen(false)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#333333] bg-white border border-[#F8BBD0] hover:bg-[#FFF0F5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={handleClearData}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearing ? 'Clearing...' : 'Yes, Clear All Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#F8BBD0] p-5 space-y-1.5">
      <p className="text-xs font-medium text-[#666666]">{label}</p>
      <p className="text-2xl font-bold text-[#333333] tabular-nums">{value}</p>
      <p className="text-xs text-[#D94F8A]">{detail}</p>
    </div>
  );
}
