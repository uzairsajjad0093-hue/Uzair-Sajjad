import { useCallback, useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AdminLogin } from './components/AdminLogin.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { Navbar } from './components/Navbar.tsx';
import { SurveyForm } from './components/SurveyForm.tsx';
import { ThankYouPage } from './components/ThankYouPage.tsx';
import type { PublicPolicyConfig, QuestionId, SurveyAnswers } from './types/survey.ts';
import { clearAdminSessionToken, getAdminAuthHeaders } from './utils/adminAuth.ts';

type AppView = 'landing' | 'survey' | 'thank-you' | 'admin-login' | 'admin-dashboard';

export default function App() {
  const [view, setView] = useState<AppView>(() => {
    if (window.location.pathname.startsWith('/admin')) return 'admin-login';
    if (window.location.pathname === '/survey') return 'survey';
    return 'landing';
  });
  const [participantName, setParticipantName] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submissionResult, setSubmissionResult] = useState<{
    responseId: string;
    submittedAt: string;
  } | null>(null);

  const [policy, setPolicy] = useState<PublicPolicyConfig>({
    contactEmail: '',
    retentionDays: 365,
    sheetsConfigured: true,
  });

  const [adminSession, setAdminSession] = useState<{
    checked: boolean;
    initialized: boolean;
    authenticated: boolean;
    username: string;
  }>({
    checked: false,
    initialized: true,
    authenticated: false,
    username: '',
  });

  const refreshPublicPolicy = useCallback(() => {
    fetch('/api/public-policy')
      .then((res) => res.json())
      .then((data: PublicPolicyConfig) => {
        if (typeof data.retentionDays === 'number') {
          setPolicy(data);
        }
      })
      .catch(() => undefined);
  }, []);

  const refreshAdminSession = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/session', {
        headers: getAdminAuthHeaders(),
        credentials: 'include',
      });
      const data = (await res.json()) as {
        initialized?: boolean;
        authenticated?: boolean;
        username?: string;
      };
      const authenticated = Boolean(data.authenticated);
      const nextSession = {
        checked: true,
        initialized: Boolean(data.initialized),
        authenticated,
        username: data.username || '',
      };
      setAdminSession(nextSession);
      if (!authenticated) {
        clearAdminSessionToken();
      }
      if (window.location.pathname.startsWith('/admin')) {
        setView(authenticated ? 'admin-dashboard' : 'admin-login');
      }
      return nextSession;
    } catch {
      setAdminSession((prev) => ({ ...prev, checked: true }));
      return null;
    }
  }, []);

  useEffect(() => {
    refreshPublicPolicy();
    refreshAdminSession();
  }, [refreshPublicPolicy, refreshAdminSession]);

  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname.startsWith('/admin')) {
        setView(adminSession.authenticated ? 'admin-dashboard' : 'admin-login');
      } else if (window.location.pathname === '/survey') {
        setView('survey');
      } else {
        setView('landing');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [adminSession.authenticated]);

  const navigateToPath = (nextPath: string, nextView: AppView) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenSurvey = () => {
    navigateToPath('/survey', 'survey');
  };

  const handleChangeAnswer = (questionId: QuestionId, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmissionSuccess = (result: { responseId: string; submittedAt: string }) => {
    setSubmissionResult(result);
    navigateToPath('/thank-you', 'thank-you');
  };

  const handleBackToHome = () => {
    if (view === 'thank-you') {
      setAnswers({});
      setParticipantName('');
      setConsentConfirmed(false);
      setSubmissionResult(null);
    }
    navigateToPath('/', 'landing');
  };

  const handleNavigateAdmin = async () => {
    const session = await refreshAdminSession();
    if (session?.authenticated) {
      navigateToPath('/admin', 'admin-dashboard');
    } else {
      navigateToPath('/admin', 'admin-login');
    }
  };

  const handleAuthSuccess = (username: string) => {
    setAdminSession({
      checked: true,
      initialized: true,
      authenticated: true,
      username,
    });
    navigateToPath('/admin', 'admin-dashboard');
  };

  const handleLoggedOut = () => {
    clearAdminSessionToken();
    setAdminSession((prev) => ({
      ...prev,
      authenticated: false,
      username: '',
    }));
    navigateToPath('/admin', 'admin-login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF0F5] text-[#333333]">
      <Navbar
        activeView={view}
        onNavigateHome={handleBackToHome}
        onStartSurveyAction={handleOpenSurvey}
        onNavigateAdmin={handleNavigateAdmin}
      />

      <div className="flex-1 flex flex-col">
        {view === 'landing' && <LandingPage onStartSurvey={handleOpenSurvey} />}

        {view === 'survey' && (
          <SurveyForm
            participantName={participantName}
            onParticipantNameChange={setParticipantName}
            consentConfirmed={consentConfirmed}
            onConsentChange={setConsentConfirmed}
            policy={policy}
            answers={answers}
            onChangeAnswer={handleChangeAnswer}
            onBackToWelcome={() => navigateToPath('/', 'landing')}
            onSubmissionSuccess={handleSubmissionSuccess}
          />
        )}

        {view === 'thank-you' && submissionResult && (
          <ThankYouPage
            responseId={submissionResult.responseId}
            submittedAt={submissionResult.submittedAt}
            onBackToHome={handleBackToHome}
          />
        )}

        {view === 'admin-login' && (
          <AdminLogin
            initialized={adminSession.initialized}
            onAuthSuccess={handleAuthSuccess}
            onBackToHome={handleBackToHome}
          />
        )}

        {view === 'admin-dashboard' && (
          <AdminDashboard
            username={adminSession.username}
            onLoggedOut={handleLoggedOut}
            onBackToSurvey={handleBackToHome}
          />
        )}
      </div>

      {view !== 'admin-dashboard' && (
        <footer className="bg-white border-t border-[#F8BBD0]/70 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm text-[#666666]">
            <div className="space-y-0.5">
              <p className="font-semibold text-[#333333]">Women&apos;s Health Survey</p>
              <p>
                ICT University Educational Project · Pregnancy, Menstrual Periods, and Spine Pain
                in Women
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleBackToHome}
                className="hover:text-[#E75480] transition-colors cursor-pointer"
              >
                Home
              </button>
              <button
                type="button"
                onClick={handleOpenSurvey}
                className="hover:text-[#E75480] transition-colors cursor-pointer"
              >
                Start Survey
              </button>
              <button
                type="button"
                onClick={handleNavigateAdmin}
                className="hover:text-[#E75480] transition-colors cursor-pointer"
              >
                Admin Portal
              </button>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
