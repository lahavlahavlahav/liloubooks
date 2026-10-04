/**
 * Lilou Books – free pattern by email.
 *
 * Receives the signup form from liloubooks.com (gift-form.js), saves the
 * name + email to this Google Sheet, and emails the pattern PDF from Drive.
 *
 * Setup (once):
 * 1. Upload the pattern PDF to Google Drive. Open it and copy the file ID from
 *    the URL: drive.google.com/file/d/<FILE_ID>/view
 * 2. Create a new Google Sheet (e.g. "Lilou – נרשמים לתבנית").
 * 3. In the sheet: Extensions → Apps Script. Delete the sample code and paste this file.
 * 4. Paste the file ID into PATTERN_FILE_ID below and save.
 * 5. Select the function `testSend` and click Run. Approve the permissions
 *    and check that the email arrives in your inbox.
 * 6. Deploy → New deployment → type "Web app".
 *    Execute as: Me. Who has access: Anyone. Click Deploy and copy the Web app URL.
 */

const CONFIG = {
  PATTERN_FILE_ID: 'PASTE_DRIVE_FILE_ID_HERE',
  SHEET_NAME: 'נרשמים',
  SENDER_NAME: 'Lilou Books – להב ברק',
  SUBJECT: '🎁 התבנית שלך מלילו בוקס',
  // Don't resend to the same address more than once in this many hours
  // (protects your Gmail daily sending quota from repeated or abusive submissions).
  RESEND_COOLDOWN_HOURS: 24,
};

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Honeypot field – real visitors never fill it in.
  if (p.website) return respond_({ ok: true });

  const name = String(p.name || '').trim().slice(0, 100);
  const email = String(p.email || '').trim().toLowerCase().slice(0, 200);
  const source = String(p.source || '').slice(0, 200);

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return respond_({ ok: false, error: 'invalid' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sheet = getSheet_();
    if (sentRecently_(sheet, email)) return respond_({ ok: true, duplicate: true });

    sheet.appendRow([new Date(), name, email, source, 'sending']);
    const row = sheet.getLastRow();
    try {
      sendPattern_(name, email);
      sheet.getRange(row, 5).setValue('sent');
    } catch (err) {
      sheet.getRange(row, 5).setValue('error: ' + err.message);
      throw err;
    }
  } finally {
    lock.releaseLock();
  }
  return respond_({ ok: true });
}

function sendPattern_(name, email) {
  const pdf = DriveApp.getFileById(CONFIG.PATTERN_FILE_ID).getBlob();
  const safeName = escapeHtml_(name);

  const html = `
<div dir="rtl" style="font-family: Arial, sans-serif; background:#F8F4EE; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; padding:32px; color:#333; line-height:1.7;">
    <h1 style="color:#8B6F47; font-family: Georgia, serif; font-size:26px; margin:0 0 16px;">היי ${safeName} 💛</h1>
    <p>תודה שנרשמת! מצורפת למייל הזה <strong>תבנית קיפול ספרים במתנה</strong> ממני.</p>
    <p><strong>כמה טיפים לפני שמתחילים:</strong></p>
    <ul style="padding-right:20px;">
      <li>בחרו ספר בכריכה קשה עם מספיק עמודים (בדקו בתבנית כמה צריך).</li>
      <li>סרגל, עיפרון ומעט סבלנות. זה כל מה שצריך.</li>
      <li>טעיתם בקיפול? זה בסדר גמור. ככה כולנו למדנו.</li>
    </ul>
    <p>אשמח מאוד לראות את התוצאה! תייגו אותי באינסטגרם
      <a href="https://www.instagram.com/liloubooks____/" style="color:#8B6F47;">@liloubooks____</a>.</p>
    <p>ובכל חודש מחכה פוסט חדש בבלוג על העולם של קיפול ספרים:
      <a href="https://liloubooks.com/blog/" style="color:#8B6F47;">liloubooks.com/blog</a></p>
    <p style="margin-top:28px;">באהבה,<br>להב<br><span style="color:#999;">Lilou Books</span></p>
  </div>
  <p style="text-align:center; color:#aaa; font-size:12px; margin-top:16px;">
    קיבלת את המייל הזה כי נרשמת לתבנית במתנה באתר liloubooks.com. לא רוצה לקבל יותר מיילים? פשוט השב/י למייל הזה.
  </p>
</div>`;

  const text =
    `היי ${name},\n\nתודה שנרשמת! מצורפת למייל הזה תבנית קיפול ספרים במתנה.\n\n` +
    `אשמח לראות את התוצאה. תייגו אותי באינסטגרם @liloubooks____\n\n` +
    `באהבה,\nלהב – Lilou Books\nhttps://liloubooks.com`;

  MailApp.sendEmail({
    to: email,
    subject: CONFIG.SUBJECT,
    name: CONFIG.SENDER_NAME,
    body: text,
    htmlBody: html,
    attachments: [pdf],
  });
}

function sentRecently_(sheet, email) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const rows = sheet.getRange(2, 1, last - 1, 5).getValues();
  const cutoff = Date.now() - CONFIG.RESEND_COOLDOWN_HOURS * 3600 * 1000;
  return rows.some(r => String(r[2]).toLowerCase() === email &&
                        r[4] === 'sent' &&
                        new Date(r[0]).getTime() > cutoff);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(['תאריך', 'שם', 'מייל', 'עמוד', 'סטטוס']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function respond_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function escapeHtml_(s) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Run this once from the editor to approve permissions and test the email. */
function testSend() {
  sendPattern_('להב', Session.getActiveUser().getEmail());
}
