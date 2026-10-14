// תיקיית התבניות לבוגרות – liloubooks.com/patterns/
// הרשמה → נרשמת בגיליון "לקוחות סדנאות" → קוד אימות במייל → רשימת התבניות מתיקיית הדרייב.
// התקנה: בגיליון → תוספים → Apps Script → להדביק → שמירה → פריסה → אפליקציית אינטרנט (גישה: כל אחד).
// להוספת תבנית: פשוט שמים PDF בתיקיית הדרייב. היא מופיעה באתר מיד.

var FOLDER_ID = '1oLb6Cd0Ze_ehM5UzYu0_Of_cMGnd1bEh';
var COL = { DATE: 1, NAME: 2, PHONE: 3, EMAIL: 4, LAST: 5 };
var CODE_MINUTES = 15;
var MAX_TRIES = 5;

function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, reason: 'bad' }); }
  var email = String(d.email || '').trim().toLowerCase().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return out_({ ok: false, reason: 'email' });

  if (d.action === 'signup') return out_(signup_(d, email));
  if (d.action === 'sendcode') return out_(sendCode_(email));
  if (d.action === 'verify') return out_(verify_(email, String(d.code || '').trim()));
  if (d.action === 'list') return out_(list_(email, String(d.token || '')));
  return out_({ ok: false, reason: 'bad' });
}

function doGet() { return out_({ ok: true }); }

function signup_(d, email) {
  var name = String(d.name || '').trim().slice(0, 100);
  var phone = String(d.phone || '').trim().slice(0, 30);
  if (!name || !phone) return { ok: false, reason: 'fields' };
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (!findRow_(email)) sheet_().appendRow([new Date(), safe_(name), "'" + phone, safe_(email), '']);
  } finally { lock.releaseLock(); }
  return sendCode_(email);
}

function sendCode_(email) {
  var row = findRow_(email);
  if (!row) return { ok: false, reason: 'unknown' };
  var cache = CacheService.getScriptCache();
  if (cache.get('sent:' + email)) return { ok: true }; // כבר נשלח קוד בדקה האחרונה
  var code = String(Math.floor(100000 + Math.random() * 900000));
  cache.put('code:' + email, code, CODE_MINUTES * 60);
  cache.remove('tries:' + email);
  cache.put('sent:' + email, '1', 60);
  var name = String(sheet_().getRange(row, COL.NAME).getValue() || '').split(' ')[0];
  MailApp.sendEmail({
    to: email,
    name: 'Lilou Books',
    subject: 'קוד הכניסה שלך לתיקיית התבניות: ' + code,
    htmlBody:
      '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;color:#3a2a1e;line-height:1.6">' +
      '<p>היי ' + escapeHtml_(name) + ' 🤍</p>' +
      '<p>זה קוד הכניסה שלך לתיקיית התבניות של לילו בוקס:</p>' +
      '<p style="font-size:30px;font-weight:bold;letter-spacing:6px;color:#5c3d2e">' + code + '</p>' +
      '<p>הקוד בתוקף ל-' + CODE_MINUTES + ' דקות.</p>' +
      '<p>להב · Lilou Books</p></div>'
  });
  return { ok: true };
}

function verify_(email, code) {
  var cache = CacheService.getScriptCache();
  var tries = Number(cache.get('tries:' + email) || 0);
  if (tries >= MAX_TRIES) return { ok: false, reason: 'tries' };
  var saved = cache.get('code:' + email);
  if (!saved) return { ok: false, reason: 'expired' };
  if (code !== saved) {
    cache.put('tries:' + email, String(tries + 1), CODE_MINUTES * 60);
    return { ok: false, reason: 'code' };
  }
  cache.remove('code:' + email);
  var row = findRow_(email);
  if (!row) return { ok: false, reason: 'unknown' };
  sheet_().getRange(row, COL.LAST).setValue(new Date());
  var name = String(sheet_().getRange(row, COL.NAME).getValue() || '');
  return { ok: true, token: token_(email), name: name, patterns: patterns_() };
}

function list_(email, token) {
  if (token !== token_(email) || !findRow_(email)) return { ok: false, reason: 'token' };
  return { ok: true, patterns: patterns_() };
}

function patterns_() {
  var files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  var list = [];
  while (files.hasNext()) {
    var f = files.next();
    if (f.isTrashed()) continue;
    list.push({ id: f.getId(), title: cleanTitle_(f.getName()), created: f.getDateCreated().getTime() });
  }
  list.sort(function (a, b) { return b.created - a.created; });
  return list;
}

function cleanTitle_(s) {
  return String(s)
    .replace(/[‎‏⁦-⁩‪-‮]/g, '')
    .replace(/\.pdf$/i, '')
    .replace(/[-–]?\s*תבנית מספרית/g, '')
    .replace(/^\s*תבנית\s*(ל(?=מזל))?/, '')
    .replace(/\s*(להדפסה|ללימינציה)\s*$/, '')
    .replace(/\s+/g, ' ').trim();
}

function sheet_() { return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]; }

function findRow_(email) {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var emails = sh.getRange(2, COL.EMAIL, last - 1, 1).getValues();
  for (var i = 0; i < emails.length; i++) {
    if (String(emails[i][0]).replace(/^'/, '').trim().toLowerCase() === email) return i + 2;
  }
  return 0;
}

function token_(email) {
  var props = PropertiesService.getScriptProperties();
  var secret = props.getProperty('SECRET');
  if (!secret) { secret = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('SECRET', secret); }
  var sig = Utilities.computeHmacSha256Signature(email, secret);
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '');
}

// מונע מתא להתפרש כנוסחה
function safe_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
function escapeHtml_(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

// להרצה ידנית פעם אחת מהעורך, כדי לאשר הרשאות (מייל, דרייב, גיליון)
function authorize() {
  Logger.log(patterns_().length + ' תבניות בתיקייה');
  Logger.log(MailApp.getRemainingDailyQuota() + ' מיילים נותרו היום');
}
