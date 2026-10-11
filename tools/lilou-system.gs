/**
 * Lilou Books – free pattern, email sequence and the Lilou Club (monthly membership).
 *
 * One Google Sheet runs everything. Tabs (created by `setupSheets`):
 *   נרשמים  – people who asked for the free pattern (+ follow-up emails progress)
 *   מנויות  – club members. Edit "סטטוס" by hand when needed: פעיל / תשלום נכשל / בוטל
 *   תוכן    – the club content. Add a row and it appears in the members area on its publish date.
 *   הגדרות  – WhatsApp group link, next live date, Zoom link, prices.
 *   לוג     – raw payment notifications from Grow (for troubleshooting).
 *
 * Web app endpoints (the same /exec URL):
 *   POST (no key)        – free-pattern signup form (gift-form.js)
 *   POST ?key=SECRET     – Grow webhook: new member, monthly charge, failed charge
 *   GET  ?unsub=..&t=..  – unsubscribe from emails
 *   GET  ?action=content – members area content (personal link: e + k)
 *   GET  ?action=resend  – email the personal link again
 *
 * Setup (once): see "02-מדריך-הקמת-המערכת.md".
 */

const CONFIG = {
  OWNER_EMAIL: 'liloubooks.com@gmail.com',   // gets alerts about new members and failed payments
  SENDER_NAME: 'להב מלילו בוקס',
  SITE: 'https://liloubooks.com',
  CLUB_SITE: 'https://club.liloubooks.com',
  INSTAGRAM_URL: 'https://www.instagram.com/liloubooks____/',
  WHATSAPP_NUMBER: '972502534643',

  // Free pattern
  PATTERN_URL: 'https://liloubooks.com/gift/lilou-heart-in-heart-x7q2.pdf',
  PATTERN_FILENAME: 'לב בתוך לב - Lilou Books.pdf',
  SUBJECT: '🎁 תבנית "לב בתוך לב" במתנה מלילו בוקס',
  RESEND_COOLDOWN_HOURS: 24,
  FOLLOW_UP_DAYS: [2, 4, 6, 8],

  // Club. Only Grow payments whose details contain this word are treated as club payments,
  // so workshop payments never create members. Put it in the Grow product name.
  CLUB_KEYWORD: 'מועדון',
  PRE_CHARGE_REMINDER_DAY: 25,   // days after joining: "in a few days the 69 ₪ charge starts"
};

const SHEETS = {
  LEADS: 'נרשמים',
  MEMBERS: 'מנויות',
  CONTENT: 'תוכן',
  SETTINGS: 'הגדרות',
  LOG: 'לוג',
};

const STATUS = { ACTIVE: 'פעיל', FAILED: 'תשלום נכשל', CANCELLED: 'בוטל' };

// Leads columns (1-based)
const L = { DATE: 1, NAME: 2, EMAIL: 3, SOURCE: 4, STATUS: 5, STEP: 6, UNSUB: 7 };
// Members columns (1-based)
const M = { EMAIL: 1, NAME: 2, PHONE: 3, STATUS: 4, JOINED: 5, LAST_PAYMENT: 6, CHARGES: 7, DEBIT_ID: 8, REMINDED: 9, NOTES: 10 };

const HEADERS = {
  [SHEETS.LEADS]: ['תאריך', 'שם', 'מייל', 'עמוד', 'סטטוס', 'מיילי המשך שנשלחו', 'הוסרה'],
  [SHEETS.MEMBERS]: ['מייל', 'שם', 'טלפון', 'סטטוס', 'הצטרפה', 'תשלום אחרון', 'מספר חיובים', 'קוד הוראת קבע', 'תזכורת לפני חיוב', 'הערות'],
  [SHEETS.CONTENT]: ['תאריך פרסום', 'קטגוריה', 'כותרת', 'תיאור', 'קישור לתבנית (PDF)', 'סרטון (קישור YouTube)', 'רמה'],
  [SHEETS.SETTINGS]: ['הגדרה', 'ערך', 'הסבר'],
  [SHEETS.LOG]: ['זמן', 'סוג', 'פרטים'],
};

// =====================================================================
// Web app
// =====================================================================

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.key !== undefined) return handleGrowWebhook_(e);
  return handleGiftSignup_(p);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.unsub) return unsubscribePage_(p);
  if (p.action === 'content') return json_(memberContent_(p));
  if (p.action === 'resend') return json_(resendLink_(p));
  return json_({ ok: true });
}

// =====================================================================
// Free pattern + follow-up sequence
// =====================================================================

function handleGiftSignup_(p) {
  if (p.website) return json_({ ok: true });   // honeypot

  const name = String(p.name || '').trim().slice(0, 100);
  const email = normEmail_(p.email);
  const source = String(p.source || '').slice(0, 200);
  if (!name || !isEmail_(email)) return json_({ ok: false, error: 'invalid' });

  return withLock_(() => {
    const sheet = sheet_(SHEETS.LEADS);
    if (sentRecently_(sheet, email)) return json_({ ok: true, duplicate: true });

    sheet.appendRow([new Date(), name, email, source, 'sending', 0, '']);
    const row = sheet.getLastRow();
    try {
      sendPattern_(name, email);
      sheet.getRange(row, L.STATUS).setValue('sent');
    } catch (err) {
      sheet.getRange(row, L.STATUS).setValue('error: ' + err.message);
      throw err;
    }
    return json_({ ok: true });
  });
}

function sendPattern_(name, email) {
  const pdf = UrlFetchApp.fetch(CONFIG.PATTERN_URL).getBlob()
    .setContentType('application/pdf')
    .setName(CONFIG.PATTERN_FILENAME);
  const n = escapeHtml_(name);
  sendEmail_(email, CONFIG.SUBJECT, [
    `היי ${n} 💛`,
    'תודה שנרשמת! מצורפת למייל הזה <strong>תבנית "לב בתוך לב"</strong>, תבנית קיפול ספרים מקורית שלי, במתנה.',
    '<strong>כמה טיפים לפני שמתחילים:</strong><br>' +
      '• התבנית מתאימה לספר בגובה 20 ס"מ עם 250 עמודים. ספר בכריכה קשה יעמוד הכי יפה.<br>' +
      '• שיטת הקיפול: סימון וקיפול (MMF). מודדים לפי התבנית, מסמנים בעיפרון ומקפלים.<br>' +
      '• סרגל, עיפרון ומעט סבלנות. זה כל מה שצריך.<br>' +
      '• טעית בקיפול? זה בסדר גמור. ככה כולנו למדנו.',
    `אשמח מאוד לראות את התוצאה! תייגי אותי באינסטגרם <a href="${CONFIG.INSTAGRAM_URL}" style="color:#8B6F47;">@liloubooks____</a> או פשוט תעני למייל הזה עם תמונה.`,
  ], { attachments: [pdf], unsubEmail: email });
}

/** The 4 follow-ups after the free pattern. The last two invite to the club. */
function followUp_(step, name) {
  const clubUrl = CONFIG.CLUB_SITE + '/?utm_source=email&utm_medium=sequence&utm_content=' + (step + 1);
  const s = settings_();
  const price = s.monthly_price || 69;
  switch (step) {
    case 0: return {
      subject: 'הטעות שכמעט כולן עושות בקיפול הראשון',
      paragraphs: [
        `היי ${name},`,
        'כבר יצא לך לפתוח את התבנית? אם לא, זה בדיוק הזמן 🙂',
        'הטעות הכי נפוצה שאני רואה בסדנאות: <strong>מסמנים את כל הספר קודם, ורק אחר כך מקפלים.</strong> נשמע יעיל, אבל ככה הסימנים מתמרחים, ובאמצע כבר לא ברור איפה היית.',
        'מה שעובד הרבה יותר טוב: <strong>דף אחד, סימון אחד, קיפול אחד.</strong> מודדים, מסמנים, מקפלים מיד, ועוברים לדף הבא. כל דף נגמר, וזה גם הרבה יותר מרגיע.',
        'ועוד טיפ קטן: קפלי עם הציפורן או עם הצד של הסרגל, כדי שהקיפול יהיה חד. קיפול רך נפתח עם הזמן.',
        'קיפלת כבר כמה דפים? אשמח שתשלחי לי תמונה, פשוט בתשובה למייל הזה.',
      ],
    };
    case 1: return {
      subject: 'איך הכול התחיל: דוכני ספרים ישנים בצרפת',
      paragraphs: [
        `היי ${name},`,
        'רציתי לספר לך איך כל זה התחיל.',
        'ב-2021 יצאתי לחילופי סטודנטים בצרפת, במסגרת לימודי מנהל עסקים וטכנולוגיה. תכננתי קריירה בעולם החדשנות, אבל מצאתי את עצמי מבלה יותר זמן בשווקי פשפשים ובחנויות ספרים משומשים מאשר בכיתה.',
        'יום אחד ראיתי תמונה של לב שקופץ מתוך דפי ספר. קניתי ספר ישן, התיישבתי עם סרגל ועיפרון, ו<strong>הספר הראשון היה אסון.</strong> רק בספר הרביעי או החמישי יצא משהו שהעזתי לצלם ולשלוח לחבר בארץ. הוא ביקש שאכין אחד בשבילו, ואחריו עוד חברה, ועוד אחת.',
        'אף פעם לא למדתי את זה באופן מסודר. למדתי מטעויות, דף אחרי דף. ומה שהכי הפתיע אותי זה לא התוצאה, אלא <strong>השקט</strong> שהשעות האלה נתנו לי.',
        'אז אם הלב הראשון שלך לא יוצא מושלם, זה בדיוק הסימן שאת בדרך הנכונה.',
      ],
    };
    case 2: return {
      subject: 'שעה שקטה בשבוע, ומתנה שאי אפשר לקנות',
      paragraphs: [
        `היי ${name},`,
        'אחרי הלב הראשון, כמעט כולן שואלות אותי: <strong>"ומה עכשיו? איך עושים שם של נכדה? תאריך חתונה? משהו לחג?"</strong>',
        'בשביל זה פתחתי את <strong>מועדון לילו</strong>: מקום שבו כל חודש מחכות לך תבניות חדשות, הסברים בווידאו, וחברות שמקפלות איתך.',
        '• תבניות חדשות כל חודש, כולל לחגים ולמתנות<br>• סרטון הסבר לכל תבנית<br>• מסלול מתחילות: מהלב הראשון ועד מילה שלמה<br>• קבוצת וואטסאפ סגורה, רק למנויות<br>• מפגש לייב איתי פעם בחודש: מקפלות יחד ושואלות הכול',
        `<strong>החודש הראשון בשקל אחד.</strong> אחר כך ${price} ₪ לחודש, בלי התחייבות. אפשר לבטל בהודעה אחת.`,
      ],
      cta: { text: 'אני רוצה להצטרף בשקל', url: clubUrl },
    };
    case 3: return {
      subject: 'שאלות שקיבלתי על המועדון',
      paragraphs: [
        `היי ${name},`,
        'מאז שסיפרתי על מועדון לילו קיבלתי כמה שאלות, אז ריכזתי את התשובות:',
        '<strong>"אין לי שום ניסיון."</strong><br>במועדון יש מסלול מתחילות שמתחיל מהדף הראשון, כולל איך בוחרים ספר.',
        '<strong>"אין לי הרבה זמן."</strong><br>אין שיעורים בשעות קבועות. התבניות והסרטונים מחכים לך, ואת מקפלת מתי שנוח לך. גם 20 דקות בערב זה מספיק.',
        '<strong>"מה אם אתקע?"</strong><br>מצלמת, שולחת לקבוצת הוואטסאפ, ואני או אחת החברות עונות. ופעם בחודש יש מפגש לייב לכל השאלות.',
        `<strong>"ואם זה לא בשבילי?"</strong><br>החודש הראשון עולה שקל. לפני שהחיוב של ${price} ₪ מתחיל, אשלח לך תזכורת, וביטול זה הודעה אחת בוואטסאפ או במייל.`,
        'ואם יש לך שאלה אחרת, פשוט תעני למייל הזה. אני קוראת הכול.',
      ],
      cta: { text: 'להצטרפות למועדון בשקל', url: clubUrl },
    };
  }
  return null;
}

function sendFollowUps_() {
  withLock_(() => {
    const sheet = sheet_(SHEETS.LEADS);
    const last = sheet.getLastRow();
    if (last < 2) return;
    const rows = sheet.getRange(2, 1, last - 1, L.UNSUB).getValues();
    const unsubscribed = new Set(rows.filter(r => r[L.UNSUB - 1]).map(r => normEmail_(r[L.EMAIL - 1])));
    const members = new Set(memberRows_().filter(m => m.status === STATUS.ACTIVE).map(m => m.email));
    const seen = new Set();
    const now = Date.now();

    rows.forEach((r, i) => {
      const email = normEmail_(r[L.EMAIL - 1]);
      if (r[L.STATUS - 1] !== 'sent' || seen.has(email)) return;
      seen.add(email);
      if (unsubscribed.has(email)) return;

      const step = Number(r[L.STEP - 1]) || 0;
      if (step >= CONFIG.FOLLOW_UP_DAYS.length) return;
      // Already a member: no need to invite her to the club.
      if (members.has(email)) { sheet.getRange(i + 2, L.STEP).setValue(CONFIG.FOLLOW_UP_DAYS.length); return; }
      const dueAt = new Date(r[L.DATE - 1]).getTime() + CONFIG.FOLLOW_UP_DAYS[step] * 86400000;
      if (now < dueAt || MailApp.getRemainingDailyQuota() < 10) return;

      const fu = followUp_(step, escapeHtml_(String(r[L.NAME - 1])));
      try {
        sendEmail_(email, fu.subject, fu.paragraphs, { cta: fu.cta, unsubEmail: email });
        sheet.getRange(i + 2, L.STEP).setValue(step + 1);
      } catch (err) {
        console.error(`Follow-up ${step} to ${email} failed: ${err.message}`);
      }
    });
  });
}

function unsubscribePage_(p) {
  const email = normEmail_(p.unsub);
  let msg = 'הקישור לא תקין.';
  if (email && p.t === token_(email, 'unsub')) {
    const sheet = sheet_(SHEETS.LEADS);
    const last = sheet.getLastRow();
    if (last >= 2) {
      sheet.getRange(2, L.EMAIL, last - 1, 1).getValues().forEach((r, i) => {
        if (normEmail_(r[0]) === email) sheet.getRange(i + 2, L.UNSUB).setValue(new Date());
      });
    }
    msg = 'הוסרת מרשימת התפוצה, ולא יישלחו אלייך יותר מיילים שיווקיים. תודה, ובהצלחה עם הקיפולים 💛';
  }
  return HtmlService.createHtmlOutput(
    '<div dir="rtl" style="font-family:Arial,sans-serif;max-width:480px;margin:60px auto;text-align:center;color:#5c3d2e;font-size:18px;line-height:1.7">' +
    escapeHtml_(msg) + '</div>');
}

// =====================================================================
// Club: Grow webhook
// =====================================================================

function handleGrowWebhook_(e) {
  const p = e.parameter || {};
  if (p.key !== webhookKey_()) return json_({ ok: false });

  let payload = {};
  try { payload = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}; } catch (err) { payload = {}; }
  // Some Grow systems send form fields instead of JSON.
  Object.keys(p).forEach(k => { if (k !== 'key' && payload[k] === undefined) payload[k] = p[k]; });

  const raw = JSON.stringify(payload);
  log_('grow', raw.slice(0, 45000));

  if (raw.indexOf(CONFIG.CLUB_KEYWORD) === -1) {
    log_('ignored', 'לא תשלום של המועדון (אין את המילה "' + CONFIG.CLUB_KEYWORD + '")');
    return json_({ ok: true });
  }

  const email = normEmail_(find_(payload, /^(payer_?email|email)$/i) || findFieldValue_(payload, /mail|מייל/i));
  const name = String(find_(payload, /^(fullName|payer_?name|name)$/i) || findFieldValue_(payload, /name|שם/i) || '').trim();
  const phone = String(find_(payload, /^(payerPhone|phone)$/i) || findFieldValue_(payload, /phone|טלפון/i) || '').trim();
  const debitId = String(find_(payload, /^(directDebitId|regular_payment_id)$/i) || '').trim();
  const error = find_(payload, /^error_message$/i);

  withLock_(() => {
    const members = memberRows_();
    const m = members.find(x => (email && x.email === email) || (debitId && x.debitId === debitId));

    if (error) {
      if (m) {
        setMember_(m.row, { [M.STATUS]: STATUS.FAILED, [M.NOTES]: `חיוב נכשל ${fmtDate_(new Date())}: ${error}` });
        sendEmail_(m.email, 'עדכון קטן לגבי המנוי שלך במועדון לילו', [
          `היי ${escapeHtml_(m.name || '')},`,
          'ניסינו לחייב את המנוי החודשי שלך במועדון לילו, והחיוב לא עבר (לפעמים זה כרטיס שפג תוקפו).',
          `כדי שהגישה לא תיעצר, כתבי לי בוואטסאפ ואשלח לך קישור לעדכון פרטי התשלום: <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}" style="color:#8B6F47;">לשיחה בוואטסאפ</a>.`,
        ]);
      }
      notifyOwner_('⚠️ חיוב נכשל במועדון', `${name || (m && m.name) || ''} ${email || (m && m.email) || ''}\nסיבה: ${error}\nקוד הוראת קבע: ${debitId}`);
      return;
    }

    if (!email || !isEmail_(email)) {
      notifyOwner_('תשלום מועדון בלי מייל', 'הגיע תשלום למועדון אבל לא מצאתי בו כתובת מייל. בדקי בלשונית "לוג" והוסיפי את המנויה ידנית (addMemberManually).');
      return;
    }

    if (m && m.status === STATUS.ACTIVE && m.charges >= 1) {
      // Monthly charge
      setMember_(m.row, { [M.LAST_PAYMENT]: new Date(), [M.CHARGES]: m.charges + 1, [M.DEBIT_ID]: debitId || m.debitId });
      return;
    }

    if (m) {
      // Re-joining, or a failed payment that went through on a retry
      const wasFailed = m.status === STATUS.FAILED;
      setMember_(m.row, {
        [M.STATUS]: STATUS.ACTIVE, [M.LAST_PAYMENT]: new Date(), [M.CHARGES]: m.charges + 1,
        [M.DEBIT_ID]: debitId || m.debitId, [M.NOTES]: wasFailed ? 'התשלום הוסדר ' + fmtDate_(new Date()) : 'חזרה למועדון ' + fmtDate_(new Date()),
      });
      if (!wasFailed) { sendWelcome_(email, name || m.name); notifyOwner_('🎉 חזרה למועדון', `${name || m.name} ${email}`); }
      return;
    }

    sheet_(SHEETS.MEMBERS).appendRow([email, name, phone, STATUS.ACTIVE, new Date(), new Date(), 1, debitId, '', '']);
    sendWelcome_(email, name);
    notifyOwner_('🎉 מנויה חדשה במועדון', `${name} ${email} ${phone}`);
  });

  return json_({ ok: true });
}

/** For members who paid another way (Bit, cash), or to fix a missed webhook. Edit the values and Run. */
function addMemberManually() {
  const email = 'example@gmail.com';
  const name = 'שם מלא';
  const phone = '';
  withLock_(() => {
    const m = memberRows_().find(x => x.email === normEmail_(email));
    if (m) setMember_(m.row, { [M.STATUS]: STATUS.ACTIVE });
    else sheet_(SHEETS.MEMBERS).appendRow([normEmail_(email), name, phone, STATUS.ACTIVE, new Date(), new Date(), 1, '', '', 'נוספה ידנית']);
  });
  sendWelcome_(normEmail_(email), name);
}

function memberLink_(email) {
  return `${CONFIG.CLUB_SITE}/members/?e=${encodeURIComponent(email)}&k=${token_(email, 'member')}`;
}

function sendWelcome_(email, name) {
  const s = settings_();
  const n = escapeHtml_(String(name || '').split(' ')[0] || '');
  const parts = [
    `היי ${n}, ברוכה הבאה למועדון לילו! 💛`,
    'אני כל כך שמחה שהצטרפת. הנה כל מה שצריך כדי להתחיל:',
    '<strong>1. האזור האישי שלך</strong><br>כל התבניות, הסרטונים ומסלול המתחילות נמצאים כאן. שמרי את המייל הזה, הקישור אישי ורק שלך:',
  ];
  const opts = { cta: { text: 'כניסה לאזור המנויות', url: memberLink_(email) } };
  const after = [];
  if (s.whatsapp_group_link) after.push(`<strong>2. קבוצת הוואטסאפ של המועדון</strong><br><a href="${s.whatsapp_group_link}" style="color:#8B6F47;">להצטרפות לקבוצה</a>. שם משתפות עבודות, שואלות שאלות, ואני עונה.`);
  if (s.next_live) after.push(`<strong>3. מפגש הלייב הקרוב</strong><br>${escapeHtml_(String(s.next_live))}. הקישור לזום מחכה באזור המנויות, ותקבלי תזכורת יום לפני.`);
  after.push('<strong>איפה מתחילים?</strong> אם זו הפעם הראשונה שלך, פתחי את "מסלול מתחילות" באזור המנויות ולכי לפי הסדר. אם את כבר מקפלת, תבניות החודש מחכות לך.');
  after.push(`החודש הראשון עלה לך שקל אחד. בעוד כ-${CONFIG.PRE_CHARGE_REMINDER_DAY} יום אשלח לך תזכורת לפני שמתחיל החיוב החודשי של ${s.monthly_price || 69} ₪. אפשר לבטל בכל רגע בהודעה אחת.`);
  opts.after = after;
  sendEmail_(email, 'ברוכה הבאה למועדון לילו 💛 כל מה שצריך כדי להתחיל', parts, opts);
}

// =====================================================================
// Club: members area API
// =====================================================================

function memberContent_(p) {
  const email = normEmail_(p.e);
  if (!email || p.k !== token_(email, 'member')) return { ok: false, reason: 'link' };
  const m = memberRows_().find(x => x.email === email);
  if (!m) return { ok: false, reason: 'link' };
  if (m.status === STATUS.CANCELLED) return { ok: false, reason: 'cancelled' };

  const s = settings_();
  const today = new Date();
  const items = contentRows_()
    .filter(c => c.title && (!c.date || c.date <= today))
    .sort((a, b) => (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0));

  return {
    ok: true,
    name: String(m.name || '').split(' ')[0],
    paymentProblem: m.status === STATUS.FAILED,
    whatsapp: s.whatsapp_group_link || '',
    live: { when: s.next_live ? String(s.next_live) : '', zoom: s.zoom_link || '', recordingsNote: s.live_note || '' },
    items: items.map(c => ({
      date: c.date ? fmtDate_(c.date) : '', category: c.category, title: c.title, description: c.description,
      pdf: c.pdf, video: c.video, level: c.level,
    })),
  };
}

function resendLink_(p) {
  const email = normEmail_(p.e);
  if (!isEmail_(email)) return { ok: false };
  const cache = CacheService.getScriptCache();
  if (cache.get('resend:' + email)) return { ok: true };
  cache.put('resend:' + email, '1', 600);
  const m = memberRows_().find(x => x.email === email && x.status !== STATUS.CANCELLED);
  if (m) {
    sendEmail_(email, 'הקישור שלך לאזור המנויות של מועדון לילו', [
      `היי ${escapeHtml_(String(m.name || '').split(' ')[0])},`,
      'ביקשת את הקישור לאזור המנויות. הנה הוא. כדאי לשמור את המייל הזה:',
    ], { cta: { text: 'כניסה לאזור המנויות', url: memberLink_(email) } });
  }
  return { ok: true };   // same answer either way, so nobody can check who is a member
}

// =====================================================================
// Daily jobs
// =====================================================================

/** Runs every day at about 10:00 (installDailyTrigger). */
function dailyJobs() {
  sendFollowUps_();
  sendPreChargeReminders_();
  sendLiveReminder_();
}

/** A few days before the first 69 ₪ charge, remind new members (good practice, and builds trust). */
function sendPreChargeReminders_() {
  const s = settings_();
  const price = s.monthly_price || 69;
  const now = Date.now();
  memberRows_().forEach(m => {
    if (m.status !== STATUS.ACTIVE || m.charges !== 1 || m.reminded || !m.joined) return;
    if (now < m.joined.getTime() + CONFIG.PRE_CHARGE_REMINDER_DAY * 86400000) return;
    const chargeDate = new Date(m.joined.getTime() + 30 * 86400000);
    try {
      sendEmail_(m.email, 'תזכורת: החודש הראשון שלך במועדון לילו מסתיים בקרוב', [
        `היי ${escapeHtml_(String(m.name || '').split(' ')[0])},`,
        `רק רציתי לעדכן: חודש הניסיון שלך במועדון מסתיים בסביבות ${fmtDate_(chargeDate)}, ואז מתחיל החיוב החודשי של ${price} ₪.`,
        'אם את נהנית, לא צריך לעשות כלום, והתבניות של החודש הבא כבר בדרך 🙂',
        `אם זה לא בשבילך, אין בעיה בכלל. תעני למייל הזה או <a href="https://wa.me/${CONFIG.WHATSAPP_NUMBER}" style="color:#8B6F47;">כתבי לי בוואטסאפ</a>, ואבטל לפני החיוב.`,
      ]);
      setMember_(m.row, { [M.REMINDED]: new Date() });
    } catch (err) {
      console.error(`Pre-charge reminder to ${m.email} failed: ${err.message}`);
    }
  });
}

/** The day before the live meeting (setting next_live_date), email all active members. */
function sendLiveReminder_() {
  const s = settings_();
  if (!s.next_live_date) return;
  const live = new Date(s.next_live_date);
  if (isNaN(live)) return;
  const key = fmtDate_(live);
  if (s.live_reminder_sent_for === key) return;
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  if (fmtDate_(tomorrow) !== key) return;

  const active = memberRows_().filter(m => m.status === STATUS.ACTIVE || m.status === STATUS.FAILED);
  active.forEach(m => {
    if (MailApp.getRemainingDailyQuota() < 2) return;
    sendEmail_(m.email, 'מחר: מפגש הלייב של מועדון לילו', [
      `היי ${escapeHtml_(String(m.name || '').split(' ')[0])},`,
      `מזכירה שמחר, ${escapeHtml_(String(s.next_live || key))}, נפגשות בלייב! מקפלות יחד, שואלות הכול, ואני מראה את התבנית החדשה.`,
      'כדאי להכין: ספר, סרגל, עיפרון, ואת התבנית מאזור המנויות.',
    ], { cta: { text: 'לאזור המנויות ולקישור לזום', url: memberLink_(m.email) } });
  });
  setSetting_('live_reminder_sent_for', key);
}

function installDailyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['dailyJobs', 'sendFollowUps'].indexOf(t.getHandlerFunction()) !== -1)
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyJobs').timeBased().everyDays(1).atHour(10).create();
}

// =====================================================================
// Setup & tests
// =====================================================================

/** Run once: creates the tabs, headers, settings and sample content rows. Safe to run again. */
function setupSheets() {
  Object.keys(HEADERS).forEach(name => sheet_(name));

  const settings = sheet_(SHEETS.SETTINGS);
  const existing = settings_();
  const defaults = [
    ['monthly_price', 69, 'מחיר חודשי (מוצג במיילים)'],
    ['whatsapp_group_link', '', 'קישור ההצטרפות לקבוצת הוואטסאפ של המנויות'],
    ['next_live', 'יום ה׳, 3.12 בשעה 20:30', 'מתי הלייב הבא (טקסט שמוצג למנויות)'],
    ['next_live_date', '2026-12-03', 'תאריך הלייב (YYYY-MM-DD). יום לפני נשלחת תזכורת'],
    ['zoom_link', '', 'קישור לזום של הלייב'],
    ['live_note', 'ההקלטה תעלה לאזור המנויות תוך יומיים', 'משפט שמוצג ליד פרטי הלייב'],
    ['live_reminder_sent_for', '', 'נכתב אוטומטית. לא צריך לגעת'],
  ];
  defaults.forEach(d => { if (!(d[0] in existing)) settings.appendRow(d); });

  const content = sheet_(SHEETS.CONTENT);
  if (content.getLastRow() < 2) {
    const t = new Date();
    content.getRange(2, 1, 4, 7).setValues([
      [t, 'מסלול מתחילות', 'שיעור 1: הציוד, ואיך בוחרים ספר', 'מה באמת צריך, ואיפה למצוא ספר מתאים בכמה שקלים', '', '', 'מתחילות'],
      [t, 'מסלול מתחילות', 'שיעור 2: איך קוראים תבנית', 'מספרי עמודים, מידות, ואיך לא ללכת לאיבוד', '', '', 'מתחילות'],
      [t, 'תבנית החודש', 'לב בתוך לב', 'התבנית הראשונה שלך במועדון', CONFIG.PATTERN_URL, '', 'מתחילות'],
      [t, 'הקלטת לייב', 'דוגמה: הקלטת המפגש של חודש X', 'מחקי את השורה הזו כשתעלה ההקלטה הראשונה', '', '', ''],
    ]);
  }
  webhookKey_();
  SpreadsheetApp.getUi && SpreadsheetApp.getActiveSpreadsheet().toast('הלשוניות מוכנות ✓');
}

/** Run after deploying: prints the URL to give Grow support for the webhook. */
function showWebhookUrl() {
  const url = ScriptApp.getService().getUrl();
  console.log('כתובת ל-Grow (Webhook):\n' + url + '?key=' + webhookKey_());
  console.log('כתובת לאתר (GIFT_ENDPOINT / CLUB_API):\n' + url);
}

function testSend() { sendPattern_('להב', Session.getActiveUser().getEmail()); }

function testFollowUps() {
  const me = Session.getActiveUser().getEmail();
  for (let s = 0; s < CONFIG.FOLLOW_UP_DAYS.length; s++) {
    const fu = followUp_(s, 'להב');
    sendEmail_(me, '[בדיקה] ' + fu.subject, fu.paragraphs, { cta: fu.cta, unsubEmail: me });
  }
}

/** Adds you as a test member and sends you the welcome email with your personal link. */
function testWelcome() {
  const me = normEmail_(Session.getActiveUser().getEmail());
  if (!memberRows_().find(x => x.email === me)) {
    sheet_(SHEETS.MEMBERS).appendRow([me, 'להב (בדיקה)', '', STATUS.ACTIVE, new Date(), new Date(), 1, '', '', 'בדיקה. אפשר למחוק']);
  }
  sendWelcome_(me, 'להב');
}

// =====================================================================
// Helpers
// =====================================================================

function sendEmail_(to, subject, paragraphs, opts) {
  opts = opts || {};
  const ps = paragraphs.map(p => `<p style="margin:0 0 14px;">${p}</p>`).join('');
  const cta = opts.cta
    ? `<p style="text-align:center;margin:24px 0;"><a href="${opts.cta.url}" style="display:inline-block;background:#5c3d2e;color:#fff;text-decoration:none;font-weight:bold;padding:14px 30px;border-radius:50px;">${opts.cta.text}</a></p>`
    : '';
  const after = (opts.after || []).map(p => `<p style="margin:0 0 14px;">${p}</p>`).join('');
  const unsubUrl = opts.unsubEmail && ScriptApp.getService().getUrl()
    ? `${ScriptApp.getService().getUrl()}?unsub=${encodeURIComponent(opts.unsubEmail)}&t=${token_(opts.unsubEmail, 'unsub')}`
    : '';
  const footer = unsubUrl
    ? `קיבלת את המייל כי נרשמת באתר liloubooks.com. <a href="${unsubUrl}" style="color:#aaa;">להסרה מרשימת התפוצה</a>`
    : 'Lilou Books · liloubooks.com';
  const html = `
<div dir="rtl" style="font-family: Arial, sans-serif; background:#F8F4EE; padding:24px;">
  <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; padding:32px; color:#333; line-height:1.75; font-size:16px;">
    ${ps}${cta}${after}
    <p style="margin-top:28px;">באהבה,<br>להב<br><span style="color:#999;">Lilou Books · <a href="${CONFIG.INSTAGRAM_URL}" style="color:#8B6F47;">אינסטגרם</a></span></p>
  </div>
  <p style="text-align:center; color:#aaa; font-size:12px; margin-top:16px;">${footer}</p>
</div>`;
  const toText = p => p.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
  const text = paragraphs.map(toText).join('\n\n') +
    (opts.cta ? `\n\n${opts.cta.text}: ${opts.cta.url}` : '') +
    (opts.after ? '\n\n' + opts.after.map(toText).join('\n\n') : '') +
    '\n\nבאהבה,\nלהב – Lilou Books' + (unsubUrl ? `\n\nלהסרה: ${unsubUrl}` : '');
  const mail = { to, subject, name: CONFIG.SENDER_NAME, body: text, htmlBody: html };
  if (opts.attachments) mail.attachments = opts.attachments;
  MailApp.sendEmail(mail);
}

function notifyOwner_(subject, body) {
  try { MailApp.sendEmail(CONFIG.OWNER_EMAIL, subject, body + '\n\nהגיליון: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()); }
  catch (err) { console.error('Owner notification failed: ' + err.message); }
}

function sheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS[name]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold');
    sh.setRightToLeft(true);
  } else if (name === SHEETS.LEADS && sh.getRange(1, L.STEP).getValue() === '') {
    sh.getRange(1, L.STEP, 1, 2).setValues([[HEADERS[name][L.STEP - 1], HEADERS[name][L.UNSUB - 1]]]);
  }
  return sh;
}

function memberRows_() {
  const sh = sheet_(SHEETS.MEMBERS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS[SHEETS.MEMBERS].length).getValues().map((r, i) => ({
    row: i + 2,
    email: normEmail_(r[M.EMAIL - 1]),
    name: r[M.NAME - 1],
    status: String(r[M.STATUS - 1]).trim(),
    joined: r[M.JOINED - 1] ? new Date(r[M.JOINED - 1]) : null,
    charges: Number(r[M.CHARGES - 1]) || 0,
    debitId: String(r[M.DEBIT_ID - 1] || ''),
    reminded: r[M.REMINDED - 1],
  })).filter(m => m.email);
}

function setMember_(row, values) {
  const sh = sheet_(SHEETS.MEMBERS);
  Object.keys(values).forEach(col => sh.getRange(row, Number(col)).setValue(values[col]));
}

function contentRows_() {
  const sh = sheet_(SHEETS.CONTENT);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 7).getValues().map(r => ({
    date: r[0] ? new Date(r[0]) : null,
    category: String(r[1] || '').trim(),
    title: String(r[2] || '').trim(),
    description: String(r[3] || '').trim(),
    pdf: String(r[4] || '').trim(),
    video: String(r[5] || '').trim(),
    level: String(r[6] || '').trim(),
  }));
}

function settings_() {
  const sh = sheet_(SHEETS.SETTINGS);
  const last = sh.getLastRow();
  const out = {};
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 2).getValues().forEach(r => { if (r[0]) out[String(r[0]).trim()] = r[1]; });
  if (out.next_live_date instanceof Date) out.next_live_date = Utilities.formatDate(out.next_live_date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return out;
}

function setSetting_(key, value) {
  const sh = sheet_(SHEETS.SETTINGS);
  const last = sh.getLastRow();
  const keys = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]).trim()) : [];
  const i = keys.indexOf(key);
  if (i === -1) sh.appendRow([key, value, '']); else sh.getRange(i + 2, 2).setValue(value);
}

function log_(type, details) {
  try {
    const sh = sheet_(SHEETS.LOG);
    sh.appendRow([new Date(), type, details]);
    if (sh.getLastRow() > 2000) sh.deleteRows(2, 500);
  } catch (err) { console.error(err); }
}

/** Finds the first value anywhere in the payload whose key matches. */
function find_(obj, re) {
  if (!obj || typeof obj !== 'object') return '';
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (re.test(k) && v !== null && typeof v !== 'object' && String(v).trim() !== '') return v;
  }
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === 'object') { const v = find_(obj[k], re); if (v !== '') return v; }
  }
  return '';
}

/** Finds a value in Grow "dynamic fields" style arrays: [{ name/label: '...', value: '...' }]. */
function findFieldValue_(obj, re) {
  if (!obj || typeof obj !== 'object') return '';
  if (obj.value !== undefined && typeof obj.value !== 'object') {
    const label = String(obj.name || obj.label || obj.title || obj.key || '');
    if (re.test(label) && String(obj.value).trim()) return obj.value;
  }
  for (const k of Object.keys(obj)) {
    if (obj[k] && typeof obj[k] === 'object') { const v = findFieldValue_(obj[k], re); if (v !== '') return v; }
  }
  return '';
}

function secret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('SECRET', s); }
  return s;
}

function token_(email, purpose) {
  const sig = Utilities.computeHmacSha256Signature(purpose + ':' + normEmail_(email), secret_());
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '').slice(0, 22);
}

function webhookKey_() {
  const props = PropertiesService.getScriptProperties();
  let k = props.getProperty('WEBHOOK_KEY');
  if (!k) { k = Utilities.getUuid().replace(/-/g, ''); props.setProperty('WEBHOOK_KEY', k); }
  return k;
}

function sentRecently_(sheet, email) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const cutoff = Date.now() - CONFIG.RESEND_COOLDOWN_HOURS * 3600 * 1000;
  return sheet.getRange(2, 1, last - 1, 5).getValues().some(r =>
    normEmail_(r[2]) === email && r[4] === 'sent' && new Date(r[0]).getTime() > cutoff);
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function normEmail_(e) { return String(e || '').trim().toLowerCase(); }
function isEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function fmtDate_(d) { return Utilities.formatDate(d, Session.getScriptTimeZone(), 'd.M.yyyy'); }

function escapeHtml_(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
