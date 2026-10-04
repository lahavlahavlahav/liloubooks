// Free-pattern signup form. Renders into every element with [data-gift-form].
// Submissions go to a Google Apps Script web app (tools/gift-email-apps-script.gs),
// which saves the name + email to a Google Sheet and emails the pattern PDF.
// Until GIFT_ENDPOINT is set the form stays hidden, so nothing broken is ever shown.
(function () {
  var GIFT_ENDPOINT = '';

  if (!GIFT_ENDPOINT) return;

  var css = '' +
    '.gift-form h3{color:#8B6F47;font-size:1.5rem;margin-bottom:.5rem}' +
    '.gift-form p.lead{color:#666;margin-bottom:1.25rem;line-height:1.7}' +
    '.gift-form form{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;max-width:560px;margin:0 auto}' +
    '.gift-form input[type=text],.gift-form input[type=email]{flex:1 1 200px;min-width:0;padding:.85rem 1rem;border:1px solid #ddd;border-radius:50px;font-size:1rem;font-family:inherit;background:#fff}' +
    '.gift-form input:focus{outline:2px solid #FFB6C1;border-color:#FFB6C1}' +
    '.gift-form button{flex:1 1 100%;padding:.95rem 2rem;border:none;border-radius:50px;background:#8B6F47;color:#fff;font-weight:bold;font-size:1rem;cursor:pointer;font-family:inherit}' +
    '.gift-form button:disabled{opacity:.6;cursor:default}' +
    '.gift-form .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}' +
    '.gift-form .msg{margin-top:1rem;font-weight:600}' +
    '.gift-form .msg.ok{color:#3c7a4a}.gift-form .msg.err{color:#b03a3a}' +
    '.gift-form .fine{color:#999;font-size:.8rem;margin-top:.75rem}';
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var html = '' +
    '<div class="gift-form">' +
      '<h3>🎁 תבנית קיפול ספרים במתנה</h3>' +
      '<p class="lead">השאירו שם ומייל, והתבנית תגיע אליכם למייל תוך כמה דקות. בחינם!</p>' +
      '<form novalidate>' +
        '<input type="text" name="name" placeholder="השם שלך" autocomplete="name" required aria-label="שם">' +
        '<input type="email" name="email" placeholder="המייל שלך" autocomplete="email" required aria-label="מייל" dir="ltr">' +
        '<div class="hp" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"></div>' +
        '<button type="submit">שלחו לי את התבנית</button>' +
      '</form>' +
      '<div class="msg" role="status" aria-live="polite"></div>' +
      '<p class="fine">לא נשלח ספאם. מדי פעם יגיעו עדכונים מלילו בוקס, ואפשר להסיר את עצמך בכל רגע.</p>' +
    '</div>';

  function init(box) {
    box.innerHTML = html;
    box.hidden = false;
    var form = box.querySelector('form');
    var msg = box.querySelector('.msg');
    var btn = form.querySelector('button');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var email = form.email.value.trim();
      msg.className = 'msg';
      if (!name) { msg.className = 'msg err'; msg.textContent = 'נא למלא שם'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.className = 'msg err'; msg.textContent = 'נא למלא כתובת מייל תקינה'; return; }

      btn.disabled = true;
      btn.textContent = 'שולח...';
      var body = new URLSearchParams({
        name: name,
        email: email,
        website: form.website.value,
        source: location.pathname
      });
      // Apps Script web apps don't send CORS headers, so the response is opaque.
      fetch(GIFT_ENDPOINT, { method: 'POST', mode: 'no-cors', body: body })
        .then(function () {
          form.hidden = true;
          msg.className = 'msg ok';
          msg.textContent = 'תודה ' + name + '! התבנית בדרך למייל שלך 💌 (אם היא לא מגיעה תוך כמה דקות, כדאי לבדוק בתיקיית הספאם)';
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = 'שלחו לי את התבנית';
          msg.className = 'msg err';
          msg.textContent = 'משהו השתבש. אפשר לנסות שוב בעוד רגע.';
        });
    });
  }

  function start() {
    var boxes = document.querySelectorAll('[data-gift-form]');
    for (var i = 0; i < boxes.length; i++) init(boxes[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
