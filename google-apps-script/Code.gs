/**
 * Women's Health Survey — Google Apps Script Backend
 * --------------------------------------------------
 * Stores validated survey responses in Google Sheets and allows the
 * authenticated server-side admin proxy to read real rows for analytics.
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet and copy its Spreadsheet ID from the URL:
 *    https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit
 * 2. Open Extensions -> Apps Script in that Google Sheet.
 * 3. Paste this entire file into Code.gs.
 * 4. In Apps Script Project Settings -> Script Properties, add:
 *      - SPREADSHEET_ID : Your Google Sheet ID
 *      - API_SECRET     : A strong random secret shared with your Express server
 * 5. Run `setupInitialSheet()` once in the editor to initialize headers and authorize permissions.
 * 6. Deploy -> New deployment -> Type: Web app
 *      - Execute as: Me
 *      - Who has access: Anyone (required so your Express server proxy can POST without OAuth;
 *        all requests are strictly authenticated with API_SECRET).
 * 7. Copy the Web App URL (ends with /exec) into your server environment variable
 *    GOOGLE_APPS_SCRIPT_URL (or configure it inside the Admin Dashboard Setup panel).
 */

var SHEET_NAME = 'Responses';
var SURVEY_VERSION = '1.0.0';

var HEADERS = [
  'Response ID',
  'Submission Timestamp',
  'Participant Name',
  'Q1 - Age',
  'Q2 - Marital Status',
  'Q3 - Country',
  'Q4 - Occupation',
  'Q5 - Menstrual Pain',
  'Q6 - Menstrual Pain Severity',
  'Q7 - Menstrual Pain Location',
  'Q8 - Daily Activities Affected',
  'Q9 - Menstrual Back Pain',
  'Q10 - Pregnancy History',
  'Q11 - Back Pain During Pregnancy',
  'Q12 - Pregnancy Trimester',
  'Q13 - Back Pain After Childbirth',
  'Q14 - Frequent Back Pain',
  'Q15 - Back Pain Area',
  'Q16 - Sitting and Back Pain',
  'Q17 - Posture Awareness',
  'Q18 - Exercise Awareness',
  'Q19 - Doctor Consultation',
  'Q20 - Interest in Health Awareness',
  'Q21 - Reproductive Health Education',
  'Consent Confirmed',
  'Survey Version'
];

var QUESTION_SPECS = [
  { id: 'Q1', options: ['Under 18', '18–25', '26–35', '36–45', 'Above 45'], conditionalOptional: false },
  { id: 'Q2', options: ['Single', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'], conditionalOptional: false },
  { id: 'Q3', options: ['Pakistan', 'India', 'Other'], conditionalOptional: false },
  { id: 'Q4', options: ['Student', 'Housewife', 'Working woman', 'Other'], conditionalOptional: false },
  { id: 'Q5', options: ['Yes', 'No', 'Sometimes'], conditionalOptional: false },
  { id: 'Q6', options: ['Mild', 'Moderate', 'Severe', 'No pain'], conditionalOptional: false },
  { id: 'Q7', options: ['Lower abdomen', 'Lower back', 'Legs', 'Multiple areas', 'No pain'], conditionalOptional: false },
  { id: 'Q8', options: ['Yes', 'No', 'Sometimes'], conditionalOptional: false },
  { id: 'Q9', options: ['Yes', 'No', 'Sometimes'], conditionalOptional: false },
  { id: 'Q10', options: ['Yes', 'No', 'Prefer not to say'], conditionalOptional: false },
  { id: 'Q11', options: ['Yes', 'No', 'Not applicable'], conditionalOptional: true },
  { id: 'Q12', options: ['First trimester', 'Second trimester', 'Third trimester', 'Not applicable'], conditionalOptional: true },
  { id: 'Q13', options: ['Yes', 'No', 'Not applicable'], conditionalOptional: true },
  { id: 'Q14', options: ['Yes', 'No', 'Sometimes'], conditionalOptional: false },
  { id: 'Q15', options: ['Upper back', 'Middle back', 'Lower back', 'Entire back', 'No pain'], conditionalOptional: false },
  { id: 'Q16', options: ['Yes', 'No', 'Sometimes'], conditionalOptional: false },
  { id: 'Q17', options: ['Yes', 'No', 'Not sure'], conditionalOptional: false },
  { id: 'Q18', options: ['Yes', 'No', 'A little'], conditionalOptional: false },
  { id: 'Q19', options: ['Yes', 'No', 'Prefer not to say'], conditionalOptional: false },
  { id: 'Q20', options: ['Yes', 'No', 'Maybe'], conditionalOptional: false },
  {
    id: 'Q21',
    options: [
      'Yes, through school or university',
      'Yes, through doctors or healthcare professionals',
      'Yes, through the internet or social media',
      'No, I have never received such information'
    ],
    conditionalOptional: false
  }
];

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  var spreadsheetId = props.getProperty('SPREADSHEET_ID') || '';
  var apiSecret = props.getProperty('API_SECRET') || '';
  return {
    spreadsheetId: spreadsheetId.trim(),
    apiSecret: apiSecret.trim()
  };
}

function getOrCreateSheet_(spreadsheetId) {
  var ss = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!ss) {
    throw new Error('Spreadsheet not found. Configure SPREADSHEET_ID in Script Properties.');
  }

  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#FFF0F5');
    headerRange.setFontColor('#333333');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function setupInitialSheet() {
  var cfg = getConfig_();
  var sheet = getOrCreateSheet_(cfg.spreadsheetId);
  Logger.log('Initialized sheet "' + sheet.getName() + '" with ' + HEADERS.length + ' columns.');
}

function sanitizeText_(value, maxLen) {
  if (typeof value !== 'string') return '';
  var cleaned = value
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen || 80);

  if (!cleaned) return '';
  if (/^[=+\-@\t\r]/.test(cleaned)) {
    return "'" + cleaned;
  }
  return cleaned;
}

function generateResponseId_() {
  var dateStr = Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyyMMdd');
  var rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return 'WHS-' + dateStr + '-' + rand;
}

function formatPakistanTimestamp_() {
  return Utilities.formatDate(new Date(), 'Asia/Karachi', 'yyyy-MM-dd HH:mm:ss') + ' PKT';
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function constantTimeEquals_(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function doGet() {
  return jsonResponse_({
    ok: true,
    service: "Women's Health Survey Apps Script Endpoint",
    message: 'Use authenticated POST requests via the application server.'
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: 'Missing request payload.' });
    }

    var body = JSON.parse(e.postData.contents);
    var cfg = getConfig_();

    if (cfg.apiSecret) {
      if (!body.secret || !constantTimeEquals_(String(body.secret), cfg.apiSecret)) {
        return jsonResponse_({ ok: false, error: 'Unauthorized request.' });
      }
    }

    var action = body.action || 'submit';

    if (action === 'health') {
      var healthSheet = getOrCreateSheet_(cfg.spreadsheetId);
      var rowCount = Math.max(0, healthSheet.getLastRow() - 1);
      return jsonResponse_({
        ok: true,
        sheetName: healthSheet.getName(),
        responseCount: rowCount,
        timezone: 'Asia/Karachi'
      });
    }

    if (action === 'list') {
      var listSheet = getOrCreateSheet_(cfg.spreadsheetId);
      var lastRow = listSheet.getLastRow();
      if (lastRow <= 1) {
        return jsonResponse_({ ok: true, responses: [] });
      }
      var values = listSheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
      var responses = values.map(function (row) {
        var answers = {};
        for (var i = 0; i < QUESTION_SPECS.length; i++) {
          answers[QUESTION_SPECS[i].id] = String(row[3 + i] || '');
        }
        return {
          responseId: String(row[0] || ''),
          submittedAt: String(row[1] || ''),
          participantName: String(row[2] || ''),
          answers: answers,
          consentConfirmed: String(row[24] || ''),
          surveyVersion: String(row[25] || '')
        };
      });
      return jsonResponse_({ ok: true, responses: responses });
    }

    if (action !== 'submit') {
      return jsonResponse_({ ok: false, error: 'Unsupported action.' });
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(15000);

    try {
      var idempotencyKey = sanitizeText_(body.idempotencyKey || '', 120);
      var cache = CacheService.getScriptCache();
      if (idempotencyKey) {
        var cachedResult = cache.get('idem_' + idempotencyKey);
        if (cachedResult) {
          return jsonResponse_(JSON.parse(cachedResult));
        }
      }

      if (body.consentConfirmed !== true) {
        return jsonResponse_({ ok: false, error: 'Participant consent is required.' });
      }

      var answersObj = body.answers || {};
      var q10 = answersObj.Q10;
      var q10AllowsOptional = (q10 === 'No' || q10 === 'Prefer not to say');

      var answerRowValues = [];
      for (var qIdx = 0; qIdx < QUESTION_SPECS.length; qIdx++) {
        var spec = QUESTION_SPECS[qIdx];
        var val = answersObj[spec.id];
        var isRequired = !(spec.conditionalOptional && q10AllowsOptional);

        if (!val || typeof val !== 'string' || val.trim() === '') {
          if (isRequired) {
            return jsonResponse_({ ok: false, error: 'Missing required answer for ' + spec.id });
          }
          answerRowValues.push('');
        } else {
          if (spec.options.indexOf(val) === -1) {
            return jsonResponse_({ ok: false, error: 'Invalid option for ' + spec.id });
          }
          answerRowValues.push(val);
        }
      }

      var sheet = getOrCreateSheet_(cfg.spreadsheetId);
      var responseId = generateResponseId_();
      var submittedAt = formatPakistanTimestamp_();
      var participantName = sanitizeText_(body.participantName || '', 80);
      var surveyVersion = sanitizeText_(body.surveyVersion || SURVEY_VERSION, 24) || SURVEY_VERSION;

      var rowData = [
        responseId,
        submittedAt,
        participantName,
      ].concat(answerRowValues).concat([
        'Yes',
        surveyVersion
      ]);

      sheet.appendRow(rowData);
      SpreadsheetApp.flush();

      var successPayload = {
        ok: true,
        responseId: responseId,
        submittedAt: submittedAt
      };

      if (idempotencyKey) {
        cache.put('idem_' + idempotencyKey, JSON.stringify(successPayload), 600);
      }

      return jsonResponse_(successPayload);
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : 'Unexpected Apps Script error.'
    });
  }
}
