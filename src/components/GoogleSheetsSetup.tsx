import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Play,
  Save,
} from 'lucide-react';
import type { IntegrationStatus } from '../types/survey.ts';
import { getAdminAuthHeaders } from '../utils/adminAuth.ts';

interface GoogleSheetsSetupProps {
  onIntegrationUpdated: () => void;
}

export function GoogleSheetsSetup({ onIntegrationUpdated }: GoogleSheetsSetupProps) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [codeGs, setCodeGs] = useState('');
  const [appsScriptUrl, setAppsScriptUrl] = useState('');
  const [appsScriptSecret, setAppsScriptSecret] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [retentionDays, setRetentionDays] = useState('365');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    fetch('/api/admin/integration', {
      headers: getAdminAuthHeaders(),
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data: { ok?: boolean; integration?: IntegrationStatus; codeGs?: string }) => {
        if (data.ok && data.integration) {
          setStatus(data.integration);
          setContactEmail(data.integration.contactEmail || '');
          setRetentionDays(String(data.integration.retentionDays || 365));
        }
        if (data.codeGs) {
          setCodeGs(data.codeGs);
        }
      })
      .catch(() => {
        // Handled cleanly in UI
      });
  }, []);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          appsScriptUrl: appsScriptUrl.trim(),
          appsScriptSecret: appsScriptSecret.trim(),
          contactEmail: contactEmail.trim(),
          retentionDays: Number(retentionDays) || 365,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        integration?: IntegrationStatus;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.integration) {
        setFeedback({
          type: 'error',
          text: data.error || 'Failed to save configuration.',
        });
        return;
      }
      setStatus(data.integration);
      setAppsScriptSecret('');
      setFeedback({
        type: 'success',
        text: 'Configuration saved on the server. Click "Test Google Sheets Connection" to verify live write/read access.',
      });
      onIntegrationUpdated();
    } catch {
      setFeedback({ type: 'error', text: 'Network error while saving settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          testOnly: true,
          appsScriptUrl: appsScriptUrl.trim() || undefined,
          appsScriptSecret: appsScriptSecret.trim() || undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        sheetName?: string;
        responseCount?: number;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setFeedback({
          type: 'error',
          text:
            data.error ||
            'Could not verify Google Apps Script connection. Check your URL, API_SECRET, and "Anyone" web app access.',
        });
        return;
      }
      setFeedback({
        type: 'success',
        text: `Connected to Google Sheet tab "${data.sheetName}" (${data.responseCount ?? 0} stored rows).`,
      });
      onIntegrationUpdated();
    } catch {
      setFeedback({ type: 'error', text: 'Unable to reach server to test connection.' });
    } finally {
      setTesting(false);
    }
  };

  const handleCopyCode = async () => {
    if (!codeGs) return;
    try {
      await navigator.clipboard.writeText(codeGs);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Status Card */}
      <div className="bg-white rounded-2xl border border-[#F8BBD0] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F8BBD0]/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#FFF0F5] text-[#E75480] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-[#333333]">
                Google Sheets &amp; Apps Script Integration
              </h2>
              <p className="text-xs text-[#666666]">
                Server-side HTTPS proxy routes submissions to Google Apps Script (no CORS errors or
                exposed credentials).
              </p>
            </div>
          </div>

          <span
            className={`text-xs font-semibold px-3 py-1 rounded-lg border ${
              status?.configured
                ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/25'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
          >
            {status?.configured ? 'Endpoint Configured' : 'Not Configured Yet'}
          </span>
        </div>

        {status?.source === 'env' && (
          <div className="p-3.5 rounded-xl bg-[#FFF0F5] border border-[#F8BBD0] text-xs text-[#333333]">
            Active URL is currently loaded from environment variable{' '}
            <code>GOOGLE_APPS_SCRIPT_URL</code> ({status.maskedUrl}). Environment variables take
            precedence over runtime settings saved below.
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label htmlFor="gas-url" className="block text-sm font-semibold text-[#333333]">
                Google Apps Script Web App URL (ends with <code>/exec</code>)
              </label>
              <input
                id="gas-url"
                type="url"
                value={appsScriptUrl}
                onChange={(e) => setAppsScriptUrl(e.target.value)}
                placeholder={
                  status?.maskedUrl || 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec'
                }
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gas-secret" className="block text-sm font-semibold text-[#333333]">
                Shared API Secret (matches <code>API_SECRET</code> in Script Properties)
              </label>
              <input
                id="gas-secret"
                type="password"
                value={appsScriptSecret}
                onChange={(e) => setAppsScriptSecret(e.target.value)}
                placeholder={status?.hasSecret ? 'Configured (enter new value to update)' : 'Enter shared secret'}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-email" className="block text-sm font-semibold text-[#333333]">
                Project Removal Contact Email (Optional, shown in Privacy Notice)
              </label>
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="research-team@university.edu"
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#F8BBD0] bg-white text-[#333333] focus:border-[#E75480]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="retention-days" className="block text-sm font-semibold text-[#333333]">
                Data Retention Policy (Days)
              </label>
              <input
                id="retention-days"
                type="number"
                min={7}
                max={3650}
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-[#F8BBD0] bg-white text-[#333333] tabular-nums focus:border-[#E75480]"
              />
            </div>
          </div>

          {feedback && (
            <div
              role="status"
              className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-xs sm:text-sm ${
                feedback.type === 'success'
                  ? 'bg-[#E8F5E9] border-[#2E7D32]/30 text-[#1B5E20]'
                  : 'bg-red-50 border-red-200 text-[#991B1B]'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-[#E75480] to-[#D94F8A] hover:opacity-95 disabled:opacity-55 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>

            <button
              type="button"
              disabled={testing}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-[#333333] bg-[#FFF0F5] border border-[#F8BBD0] hover:bg-[#F8BBD0]/40 disabled:opacity-55 cursor-pointer"
            >
              <Play className="w-4 h-4 text-[#E75480]" />
              <span>{testing ? 'Testing...' : 'Test Google Sheets Connection'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Step-by-Step Setup Instructions */}
      <div className="bg-white rounded-2xl border border-[#F8BBD0] p-6 space-y-4">
        <h3 className="text-base font-bold text-[#333333]">
          Step-by-Step Google Sheets &amp; Apps Script Setup
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-[#666666] leading-relaxed">
          <li>
            Create a new Google Sheet in your Google Drive and copy the{' '}
            <strong className="text-[#333333]">Spreadsheet ID</strong> from the URL (the string
            between <code>/d/</code> and <code>/edit</code>).
          </li>
          <li>
            Open <strong className="text-[#333333]">Extensions &rarr; Apps Script</strong> inside
            that spreadsheet.
          </li>
          <li>
            Replace the editor contents with the complete <code>Code.gs</code> script below and save.
          </li>
          <li>
            Open <strong className="text-[#333333]">Project Settings &rarr; Script Properties</strong>{' '}
            and add two properties: <code>SPREADSHEET_ID</code> (your Sheet ID) and{' '}
            <code>API_SECRET</code> (a strong random passphrase).
          </li>
          <li>
            Select <code>setupInitialSheet</code> in the toolbar and click{' '}
            <strong className="text-[#333333]">Run</strong> once to authorize Google Sheets access
            and create the 26 formatted header columns.
          </li>
          <li>
            Click <strong className="text-[#333333]">Deploy &rarr; New deployment &rarr; Web app</strong>,
            set <strong className="text-[#333333]">Execute as: Me</strong>, and{' '}
            <strong className="text-[#333333]">Who has access: Anyone</strong> (requests are
            authenticated via <code>API_SECRET</code> from our Express server proxy).
          </li>
          <li>
            Paste the deployed <code>/exec</code> URL and matching secret above (or set{' '}
            <code>GOOGLE_APPS_SCRIPT_URL</code> and <code>APPS_SCRIPT_SECRET</code> in your hosting
            environment variables), then click <strong className="text-[#333333]">Test Google Sheets Connection</strong>.
          </li>
        </ol>

        <div className="pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#333333]">
              google-apps-script/Code.gs
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E75480] bg-[#FFF0F5] hover:bg-[#F8BBD0]/50 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Copied!' : 'Copy Code.gs'}</span>
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-neutral-900 text-neutral-100 text-xs font-mono overflow-x-auto max-h-72">
            <code>{codeGs || 'Loading Code.gs...'}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
