// מקבל הרשמות מ-liloubooks.com/patterns/ ורושם אותן בגיליון "לקוחות סדנאות".
// התקנה: בגיליון → תוספים → Apps Script → להדביק → פריסה → אפליקציית אינטרנט (גישה: כל אחד).
function doPost(e) {
  var d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out_('bad'); }
  var name = String(d.name || '').trim().slice(0, 100);
  var phone = String(d.phone || '').trim().slice(0, 30);
  var email = String(d.email || '').trim().toLowerCase().slice(0, 120);
  if (!name || !phone || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return out_('bad');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
      .appendRow([new Date(), safe_(name), "'" + phone, safe_(email)]);
  } finally { lock.releaseLock(); }
  return out_('ok');
}

function doGet() { return out_('ok'); }

// מונע מתא להתפרש כנוסחה
function safe_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }
function out_(s) { return ContentService.createTextOutput(s); }
