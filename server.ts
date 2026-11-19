import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import {
  ALL_QUESTIONS,
  SPREADSHEET_HEADERS,
  SURVEY_VERSION,
  sanitizeTextForSheet,
  validateSurveyAnswers,
} from './src/data/surveyQuestions.ts';
import type { StoredSurveyResponse, SurveyAnswers } from './src/types/survey.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, '.data');
const ADMIN_FILE = path.join(DATA_DIR, 'admin.json');
const RESPONSES_FILE = path.join(DATA_DIR, 'responses.json');
const INTEGRATION_FILE = path.join(DATA_DIR, 'integration.json');
const CODE_GS_FILE = path.join(__dirname, 'google-apps-script', 'Code.gs');

const SESSION_COOKIE_NAME = 'whs_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours
const IDEMPOTENCY_TTL_MS = 1000 * 60 * 10; // 10 minutes

const runtimeSessionSecret =
  (process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');

interface AdminCredentialFile {
  username: string;
  salt: string;
  hash: string;
  createdAt: string;
}

interface IntegrationConfigFile {
  appsScriptUrl?: string;
  appsScriptSecret?: string;
  contactEmail?: string;
  retentionDays?: number;
  updatedAt?: string;
}

interface SessionRecord {
  username: string;
  expiresAt: number;
}

interface IdempotencyRecord {
  responseId: string;
  submittedAt: string;
  expiresAt: number;
}

const activeSessions = new Map<string, SessionRecord>();
const idempotencyCache = new Map<string, IdempotencyRecord>();
const rateLimitBuckets = new Map<string, number[]>();

let writeChain: Promise<void> = Promise.resolve();

function withWriteLock<T>(task: () => T | Promise<T>): Promise<T> {
  const next = writeChain.then(() => task());
  writeChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, data: unknown): void {
  ensureDataDir();
  const tempPath = `${filePath}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempPath, filePath);
}

function loadStoredResponses(): StoredSurveyResponse[] {
  const saved = readJsonFile<StoredSurveyResponse[]>(RESPONSES_FILE);
  return Array.isArray(saved) ? saved : [];
}

function saveStoredResponses(responses: StoredSurveyResponse[]): void {
  writeJsonFile(RESPONSES_FILE, responses);
}

function formatPakistanTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')} PKT`;
}

function generateResponseId(date = new Date()): string {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `WHS-${ymd}-${rand}`;
}

function isValidHttpsScriptUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host === '169.254.169.254'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function getEffectiveIntegrationConfig() {
  const saved = readJsonFile<IntegrationConfigFile>(INTEGRATION_FILE) || {};
  const envUrl = (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
  const envSecret = (process.env.APPS_SCRIPT_SECRET || '').trim();
  const envEmail = (process.env.PROJECT_CONTACT_EMAIL || '').trim();
  const envRetention = Number.parseInt(process.env.DATA_RETENTION_DAYS || '', 10);

  const appsScriptUrl = envUrl || (saved.appsScriptUrl || '').trim();
  const appsScriptSecret = envSecret || (saved.appsScriptSecret || '').trim();
  const contactEmail = envEmail || (saved.contactEmail || '').trim();
  const retentionDays =
    Number.isFinite(envRetention) && envRetention > 0
      ? envRetention
      : typeof saved.retentionDays === 'number' && saved.retentionDays > 0
        ? saved.retentionDays
        : 365;

  const source: 'env' | 'runtime-config' | 'none' = envUrl
    ? 'env'
    : saved.appsScriptUrl
      ? 'runtime-config'
      : 'none';

  return {
    appsScriptUrl,
    appsScriptSecret,
    contactEmail,
    retentionDays,
    source,
    configured: Boolean(appsScriptUrl && isValidHttpsScriptUrl(appsScriptUrl)),
  };
}

function maskUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const tail = pathname.length > 16 ? `...${pathname.slice(-14)}` : pathname;
    return `${parsed.origin}${tail}`;
  } catch {
    return 'Configured URL';
  }
}

function checkRateLimit(bucket: string, ip: string, maxRequests: number, windowMs: number): boolean {
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const cutoff = now - windowMs;
  const timestamps = (rateLimitBuckets.get(key) || []).filter((ts) => ts > cutoff);
  if (timestamps.length >= maxRequests) {
    rateLimitBuckets.set(key, timestamps);
    return false;
  }
  timestamps.push(now);
  rateLimitBuckets.set(key, timestamps);
  return true;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
}

function signToken(token: string): string {
  const sig = crypto.createHmac('sha256', runtimeSessionSecret).update(token).digest('hex');
  return `${token}.${sig}`;
}

function verifySignedToken(signed: string | undefined): string | null {
  if (!signed) return null;
  const dotIdx = signed.indexOf('.');
  if (dotIdx === -1) return null;
  const token = signed.slice(0, dotIdx);
  const sig = signed.slice(dotIdx + 1);
  if (!token || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', runtimeSessionSecret).update(token).digest('hex');
  const sigBuf = Buffer.from(sig, 'utf8');
  const expectedBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;
  return token;
}

function isAdminInitialized(): boolean {
  if ((process.env.ADMIN_PASSWORD || '').trim().length > 0) {
    return true;
  }
  const saved = readJsonFile<AdminCredentialFile>(ADMIN_FILE);
  return Boolean(saved && saved.username && saved.salt && saved.hash);
}

function constantTimeStringMatch(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

function verifyAdminCredentials(username: string, password: string): boolean {
  const envPassword = (process.env.ADMIN_PASSWORD || '').trim();
  const envUsername = (process.env.ADMIN_USERNAME || 'admin').trim();

  if (envPassword.length > 0) {
    return (
      constantTimeStringMatch(username.trim(), envUsername) &&
      constantTimeStringMatch(password, envPassword)
    );
  }

  const saved = readJsonFile<AdminCredentialFile>(ADMIN_FILE);
  if (!saved || !saved.salt || !saved.hash) {
    return false;
  }
  if (!constantTimeStringMatch(username.trim(), saved.username)) {
    return false;
  }
  const derived = crypto.scryptSync(password, saved.salt, 64).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(saved.hash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isRequestHttps(req: Request): boolean {
  return Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
}

function createSessionCookie(res: Response, req: Request, username: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    username,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  const signed = signToken(token);
  const https = isRequestHttps(req);

  res.cookie(SESSION_COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });

  return signed;
}

function getAuthenticatedSession(req: Request): { token: string; username: string } | null {
  let raw: string | undefined;

  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    raw = authHeader.slice(7).trim();
  }

  if (!raw) {
    const cookies = parseCookies(req);
    raw = cookies[SESSION_COOKIE_NAME];
  }

  const token = verifySignedToken(raw);
  if (!token) return null;
  const record = activeSessions.get(token);
  if (!record) return null;
  if (record.expiresAt <= Date.now()) {
    activeSessions.delete(token);
    return null;
  }
  return { token, username: record.username };
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = getAuthenticatedSession(req);
  if (!session) {
    res.status(401).json({ ok: false, error: 'Unauthorized. Please log in.' });
    return;
  }
  next();
}

async function callAppsScript<T>(
  url: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; data?: T; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
      redirect: 'follow',
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        error: `Apps Script responded with HTTP ${response.status}.`,
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return {
        ok: false,
        error:
          'Apps Script returned a non-JSON response. Verify deployment access is set to "Anyone" and the URL ends with /exec.',
      };
    }

    if (parsed.ok !== true) {
      return {
        ok: false,
        error: typeof parsed.error === 'string' ? parsed.error : 'Apps Script reported an error.',
      };
    }

    return { ok: true, data: parsed as T };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error calling Google Apps Script.';
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timeout);
  }
}

function escapeCsvCell(value: string): string {
  const safe = sanitizeTextForSheet(value, 500);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '64kb' }));

  // Baseline security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Public health & policy endpoints
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, sheetsConfigured: true });
  });

  app.get('/api/public-policy', (_req: Request, res: Response) => {
    const cfg = getEffectiveIntegrationConfig();
    res.json({
      contactEmail: cfg.contactEmail,
      retentionDays: cfg.retentionDays,
      sheetsConfigured: true,
    });
  });

  // Survey submission endpoint storing directly into built-in Admin Portal database (.data/responses.json)
  app.post('/api/survey/submit', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (!checkRateLimit('survey-submit', ip, 30, 15 * 60 * 1000)) {
      res.status(429).json({
        ok: false,
        error: 'Too many submissions from this network. Please wait a few minutes and try again.',
      });
      return;
    }

    const body = (req.body || {}) as Record<string, unknown>;
    const idempotencyKey =
      typeof body.idempotencyKey === 'string'
        ? body.idempotencyKey.trim().slice(0, 120)
        : '';

    if (!idempotencyKey) {
      res.status(400).json({
        ok: false,
        error: 'Your response could not be submitted. Please try again.',
      });
      return;
    }

    const cached = idempotencyCache.get(idempotencyKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.json({
        ok: true,
        responseId: cached.responseId,
        submittedAt: cached.submittedAt,
        deduplicated: true,
      });
      return;
    }

    const answers = (body.answers && typeof body.answers === 'object' ? body.answers : {}) as SurveyAnswers;
    const consentConfirmed = body.consentConfirmed === true;
    const minorAcknowledged = body.minorAcknowledged === true;
    const participantName = typeof body.participantName === 'string' ? body.participantName : '';

    const validation = validateSurveyAnswers(answers, {
      consentConfirmed,
      participantName,
      minorAcknowledged,
    });

    if (!validation.valid) {
      res.status(400).json({
        ok: false,
        error: 'Please check your responses and ensure all required questions are completed.',
        fieldErrors: validation.errors,
      });
      return;
    }

    try {
      const savedEntry = await withWriteLock(() => {
        const current = loadStoredResponses();
        const now = new Date();
        const responseId = generateResponseId(now);
        const submittedAt = formatPakistanTimestamp(now);

        const newRecord: StoredSurveyResponse = {
          responseId,
          submittedAt,
          participantName: validation.sanitizedName,
          answers: validation.sanitizedAnswers,
          consentConfirmed: 'Yes',
          surveyVersion: SURVEY_VERSION,
        };

        current.push(newRecord);
        saveStoredResponses(current);
        return newRecord;
      });

      idempotencyCache.set(idempotencyKey, {
        responseId: savedEntry.responseId,
        submittedAt: savedEntry.submittedAt,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });

      // Optional non-blocking mirror if Google Apps Script URL is configured
      const cfg = getEffectiveIntegrationConfig();
      if (cfg.configured) {
        void callAppsScript(cfg.appsScriptUrl, {
          action: 'submit',
          secret: cfg.appsScriptSecret,
          idempotencyKey,
          participantName: savedEntry.participantName,
          consentConfirmed: true,
          answers: savedEntry.answers,
          surveyVersion: SURVEY_VERSION,
        }).catch(() => undefined);
      }

      res.json({
        ok: true,
        responseId: savedEntry.responseId,
        submittedAt: savedEntry.submittedAt,
      });
    } catch (err) {
      console.error('[Survey Submit] Failed to persist response:', err);
      res.status(500).json({
        ok: false,
        error: 'Your response could not be submitted. Please try again.',
      });
    }
  });

  // Admin session & auth routes
  app.get('/api/admin/session', (req: Request, res: Response) => {
    const initialized = isAdminInitialized();
    const session = getAuthenticatedSession(req);
    res.json({
      initialized,
      authenticated: Boolean(session),
      username: session ? session.username : undefined,
    });
  });

  app.post('/api/admin/setup', (req: Request, res: Response) => {
    if (isAdminInitialized()) {
      res.status(403).json({
        ok: false,
        error: 'Administrator account is already configured.',
      });
      return;
    }

    const { username, password } = (req.body || {}) as { username?: string; password?: string };
    const cleanUser = typeof username === 'string' ? username.trim() : '';
    const cleanPass = typeof password === 'string' ? password : '';

    if (cleanUser.length < 3 || cleanUser.length > 40 || !/^[a-zA-Z0-9_.-]+$/.test(cleanUser)) {
      res.status(400).json({
        ok: false,
        error: 'Username must be 3–40 characters using letters, numbers, dots, underscores, or hyphens.',
      });
      return;
    }
    if (cleanPass.length < 8 || cleanPass.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'Password must be at least 8 characters long.',
      });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(cleanPass, salt, 64).toString('hex');
    writeJsonFile(ADMIN_FILE, {
      username: cleanUser,
      salt,
      hash,
      createdAt: new Date().toISOString(),
    });

    const sessionToken = createSessionCookie(res, req, cleanUser);
    res.json({ ok: true, username: cleanUser, sessionToken });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    if (!checkRateLimit('admin-login', ip, 10, 15 * 60 * 1000)) {
      res.status(429).json({
        ok: false,
        error: 'Too many login attempts. Please wait 15 minutes and try again.',
      });
      return;
    }

    if (!isAdminInitialized()) {
      res.status(400).json({
        ok: false,
        error: 'Administrator account has not been initialized yet.',
      });
      return;
    }

    const { username, password } = (req.body || {}) as { username?: string; password?: string };
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ ok: false, error: 'Username and password are required.' });
      return;
    }

    if (!verifyAdminCredentials(username, password)) {
      res.status(401).json({ ok: false, error: 'Invalid administrator credentials.' });
      return;
    }

    const sessionToken = createSessionCookie(res, req, username.trim());
    res.json({ ok: true, username: username.trim(), sessionToken });
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const session = getAuthenticatedSession(req);
    if (session) {
      activeSessions.delete(session.token);
    }
    const https = isRequestHttps(req);
    res.clearCookie(SESSION_COOKIE_NAME, {
      path: '/',
      sameSite: https ? 'none' : 'lax',
      secure: https,
    });
    res.json({ ok: true });
  });

  // Protected Admin integration settings
  app.get('/api/admin/integration', requireAdmin, (_req: Request, res: Response) => {
    const cfg = getEffectiveIntegrationConfig();
    let codeGs = '';
    try {
      codeGs = fs.readFileSync(CODE_GS_FILE, 'utf8');
    } catch {
      codeGs = '';
    }
    res.json({
      ok: true,
      integration: {
        configured: cfg.configured,
        source: cfg.source,
        hasSecret: Boolean(cfg.appsScriptSecret),
        maskedUrl: maskUrl(cfg.appsScriptUrl),
        contactEmail: cfg.contactEmail,
        retentionDays: cfg.retentionDays,
      },
      codeGs,
    });
  });

  app.post('/api/admin/integration', requireAdmin, async (req: Request, res: Response) => {
    const body = (req.body || {}) as {
      appsScriptUrl?: string;
      appsScriptSecret?: string;
      contactEmail?: string;
      retentionDays?: number;
      testOnly?: boolean;
    };

    const existing = readJsonFile<IntegrationConfigFile>(INTEGRATION_FILE) || {};
    const cfg = getEffectiveIntegrationConfig();

    if (body.testOnly) {
      const targetUrl =
        typeof body.appsScriptUrl === 'string' && body.appsScriptUrl.trim()
          ? body.appsScriptUrl.trim()
          : cfg.appsScriptUrl;
      const targetSecret =
        typeof body.appsScriptSecret === 'string' && body.appsScriptSecret.trim()
          ? body.appsScriptSecret.trim()
          : cfg.appsScriptSecret;

      if (!targetUrl || !isValidHttpsScriptUrl(targetUrl)) {
        res.status(400).json({
          ok: false,
          error: 'Please enter a valid HTTPS Google Apps Script Web App URL.',
        });
        return;
      }

      const health = await callAppsScript<{
        ok: true;
        sheetName: string;
        responseCount: number;
      }>(targetUrl, {
        action: 'health',
        secret: targetSecret,
      });

      if (!health.ok) {
        res.status(502).json({
          ok: false,
          error: health.error || 'Could not reach Google Apps Script endpoint.',
        });
        return;
      }

      res.json({
        ok: true,
        sheetName: health.data?.sheetName || 'Responses',
        responseCount: health.data?.responseCount ?? 0,
      });
      return;
    }

    const nextUrl =
      typeof body.appsScriptUrl === 'string'
        ? body.appsScriptUrl.trim()
        : existing.appsScriptUrl || '';

    if (nextUrl && !isValidHttpsScriptUrl(nextUrl)) {
      res.status(400).json({
        ok: false,
        error: 'Apps Script Web App URL must be a valid public HTTPS URL.',
      });
      return;
    }

    const nextSecret =
      typeof body.appsScriptSecret === 'string' && body.appsScriptSecret.trim()
        ? body.appsScriptSecret.trim()
        : existing.appsScriptSecret || '';

    const nextEmail =
      typeof body.contactEmail === 'string'
        ? body.contactEmail.trim().slice(0, 120)
        : existing.contactEmail || '';

    const parsedRetention = Number(body.retentionDays);
    const nextRetention =
      Number.isFinite(parsedRetention) && parsedRetention >= 7 && parsedRetention <= 3650
        ? Math.round(parsedRetention)
        : existing.retentionDays || 365;

    writeJsonFile(INTEGRATION_FILE, {
      appsScriptUrl: nextUrl,
      appsScriptSecret: nextSecret,
      contactEmail: nextEmail,
      retentionDays: nextRetention,
      updatedAt: new Date().toISOString(),
    });

    const updated = getEffectiveIntegrationConfig();
    res.json({
      ok: true,
      integration: {
        configured: updated.configured,
        source: updated.source,
        hasSecret: Boolean(updated.appsScriptSecret),
        maskedUrl: maskUrl(updated.appsScriptUrl),
        contactEmail: updated.contactEmail,
        retentionDays: updated.retentionDays,
      },
    });
  });

  // Protected Admin Responses & Analytics endpoint (reads directly from built-in database)
  app.get('/api/admin/responses', requireAdmin, (_req: Request, res: Response) => {
    const responses = loadStoredResponses();
    res.json({
      ok: true,
      configured: true,
      responses: [...responses].reverse(),
    });
  });

  // Protected Clear All Data endpoint
  app.post('/api/admin/responses/clear', requireAdmin, async (_req: Request, res: Response) => {
    try {
      const clearedCount = await withWriteLock(() => {
        const existing = loadStoredResponses();
        saveStoredResponses([]);
        idempotencyCache.clear();
        return existing.length;
      });
      res.json({ ok: true, clearedCount });
    } catch (err) {
      console.error('[Admin Clear] Failed to clear stored responses:', err);
      res.status(500).json({ ok: false, error: 'Failed to clear stored survey responses.' });
    }
  });

  // Protected CSV Export endpoint
  app.get('/api/admin/export-csv', requireAdmin, (req: Request, res: Response) => {
    const allResponses = loadStoredResponses();

    const ageFilter = typeof req.query.age === 'string' ? req.query.age : '';
    const countryFilter = typeof req.query.country === 'string' ? req.query.country : '';
    const dateFilter = typeof req.query.date === 'string' ? req.query.date : '';
    const searchFilter =
      typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

    const rows = allResponses.filter((r) => {
      if (ageFilter && r.answers.Q1 !== ageFilter) return false;
      if (countryFilter && r.answers.Q3 !== countryFilter) return false;
      if (dateFilter && !r.submittedAt.startsWith(dateFilter)) return false;
      if (
        searchFilter &&
        !r.responseId.toLowerCase().includes(searchFilter) &&
        !r.participantName.toLowerCase().includes(searchFilter)
      ) {
        return false;
      }
      return true;
    });

    const csvLines: string[] = [SPREADSHEET_HEADERS.map(escapeCsvCell).join(',')];
    for (const item of rows) {
      const cells = [
        item.responseId,
        item.submittedAt,
        item.participantName,
        ...ALL_QUESTIONS.map((q) => item.answers[q.id] || ''),
        item.consentConfirmed || 'Yes',
        item.surveyVersion || SURVEY_VERSION,
      ];
      csvLines.push(cells.map(escapeCsvCell).join(','));
    }

    const filename = `womens-health-survey-responses-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${csvLines.join('\r\n')}`);
  });

  // Frontend serving: Vite middleware in dev, dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Women's Health Survey server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server error:', err);
  process.exit(1);
});
