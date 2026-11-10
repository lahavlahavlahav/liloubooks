/* Lilou Books shop: catalog, product, cart, checkout, thank-you.
 * One script for Hebrew (/shop/) and English (/en/shop/); the page type comes
 * from <body data-page>, the language from <html lang>. Prices are previews:
 * the checkout API recomputes every line from catalog.json before payment. */
(function () {
  'use strict';
  var LANG = document.documentElement.lang === 'en' ? 'en' : 'he';
  var BASE = LANG === 'en' ? '/en/shop/' : '/shop/';
  var API = 'https://www.mekapele.com/api/liloubooks/checkout';
  var CART_KEY = 'lb_cart_v1';

  var T = {
    he: {
      billing: 'פרטי חיוב ומשלוח', moreInfo: 'מידע נוסף', orderDetails: 'פרטי ההזמנה', productCol: 'מוצר',
      streetPh: 'מספר בית ושם רחוב', aptPh: 'דירה, כניסה, קומה וכו׳ (אופציונלי)', zipPh: '7 ספרות', optional: 'לא חובה באיסוף עצמי',
      notesPh: 'הערות על ההזמנה, לדוגמה הערות מיוחדות למסירה.',
      payMethod: 'כרטיס אשראי / Bit', payDesc: 'בלחיצה על "שליחת הזמנה" תועברו לדף תשלום מאובטח של Grow, לסכום המדויק של ההזמנה.',
      privacy: 'הנתונים האישיים שלך ישמשו לעיבוד ההזמנה, לתמיכה בחוויית השימוש שלך באתר, ולמטרות נוספות המתוארות ב', privacyLink: 'מדיניות הפרטיות',
      shop: 'החנות', cart: 'עגלה', home: 'לאתר הראשי', other: 'English', otherHref: '/en/shop/',
      title: 'החנות של Lilou Books', lead: 'ספרים מפוסלים בעבודת יד, בהתאמה אישית. בוחרים, מוסיפים לעגלה, ואני מקפלת עבורכם באהבה.',
      trust: ['✋ עבודת יד בתל אביב', '🎁 התאמה אישית לכל ספר', '🔒 תשלום מאובטח'],
      all: 'הכל', from: 'החל מ-', add: 'הוספה לעגלה', added: 'נוסף לעגלה!', toCart: 'לעגלה', qty: 'כמות',
      required: 'שדה חובה', extras: 'תוספות', back: '→ חזרה לחנות', notFound: 'המוצר לא נמצא.',
      cartTitle: 'העגלה שלך', empty: 'העגלה ריקה.', keep: 'להמשך קניות', remove: 'הסרה', subtotal: 'סכום ביניים',
      checkout: 'להמשך הזמנה', shipping: 'משלוח', total: 'סה"כ לתשלום', free: 'חינם',
      coTitle: 'פרטים להזמנה', you: 'פרטים אישיים', first: 'שם פרטי', last: 'שם משפחה', email: 'כתובת אימייל', phone: 'טלפון',
      delivery: 'קבלת ההזמנה', street: 'כתובת רחוב', city: 'עיר', zip: 'מיקוד', notes: 'הערות להזמנה (אופציונלי)',
      terms: 'קראתי ואני מאשר/ת את', termsLink: 'התקנון ומדיניות הביטולים', pay: 'שליחת הזמנה', summary: 'סיכום הזמנה',
      secure: '🔒 התשלום מתבצע בדף סליקה מאובטח של Grow', moving: 'מעבירים אותך לתשלום מאובטח…',
      errPhone: 'נא להזין טלפון נייד ישראלי (05XXXXXXXX)', errEmail: 'נא להזין אימייל תקין', errTerms: 'יש לאשר את התקנון',
      errGeneric: 'משהו השתבש. נסו שוב בעוד רגע.',
      received: 'ההזמנה נשלחה!', receivedText: 'קיבלתי את פרטי ההזמנה. אחזור אליך בהקדם עם קישור לתשלום.',
      thanks: 'תודה! ההזמנה התקבלה 💛', thanksText: 'קיבלתי את ההזמנה שלך ואתחיל לעבוד עליה. אישור יישלח אליך במייל.', order: 'מספר הזמנה',
      photoNote: 'בספרי הנצחה ודיוקנאות - אחרי ההזמנה שלחו לי תמונה חדה במייל hi@liloubooks.com או בוואטסאפ.',
      pickupNote: 'איסוף מתל אביב - נתאם מועד אחרי שהספר מוכן.'
    },
    en: {
      billing: 'Billing & shipping details', moreInfo: 'Additional information', orderDetails: 'Your order', productCol: 'Product',
      streetPh: 'House number and street name', aptPh: 'Apartment, entrance, floor etc. (optional)', zipPh: '7 digits', optional: 'optional for pickup',
      notesPh: 'Notes about your order, e.g. special delivery instructions.',
      payMethod: 'Credit card / Bit', payDesc: 'Clicking "Place order" takes you to a secure Grow payment page for the exact order total.',
      privacy: 'Your personal data will be used to process your order, support your experience on this website, and for other purposes described in our', privacyLink: 'privacy policy',
      shop: 'Shop', cart: 'Cart', home: 'Main site', other: 'עברית', otherHref: '/shop/',
      title: 'The Lilou Books Shop', lead: 'Hand-folded, personalised book sculptures. Choose, add to your cart, and I will fold it for you with love.',
      trust: ['✋ Handmade in Tel Aviv', '🎁 Personalised for you', '🔒 Secure payment'],
      all: 'All', from: 'From ', add: 'Add to cart', added: 'Added to cart!', toCart: 'View cart', qty: 'Quantity',
      required: 'Required', extras: 'Extras', back: '← Back to shop', notFound: 'Product not found.',
      cartTitle: 'Your cart', empty: 'Your cart is empty.', keep: 'Continue shopping', remove: 'Remove', subtotal: 'Subtotal',
      checkout: 'Checkout', shipping: 'Shipping', total: 'Total', free: 'Free',
      coTitle: 'Checkout', you: 'Your details', first: 'First name', last: 'Last name', email: 'Email', phone: 'Mobile phone',
      delivery: 'Delivery', street: 'Street address', city: 'Town / City', zip: 'Postcode', notes: 'Order notes (optional)',
      terms: 'I have read and accept the', termsLink: 'terms and cancellation policy', pay: 'Place order', summary: 'Order summary',
      secure: '🔒 Payment is processed on a secure Grow payment page', moving: 'Taking you to secure payment…',
      errPhone: 'Please enter an Israeli mobile number (05XXXXXXXX)', errEmail: 'Please enter a valid email', errTerms: 'Please accept the terms',
      errGeneric: 'Something went wrong. Please try again in a moment.',
      received: 'Order sent!', receivedText: 'I received your order details and will get back to you shortly with a payment link.',
      thanks: 'Thank you! Your order is in 💛', thanksText: 'I received your order and will start working on it. A confirmation will be sent by email.', order: 'Order number',
      photoNote: 'For memorial books and portraits - after ordering, please send me a clear photo at hi@liloubooks.com or on WhatsApp.',
      pickupNote: 'Pickup in Tel Aviv - we will set a time once your book is ready.'
    }
  }[LANG];

  var nf = new Intl.NumberFormat(LANG === 'he' ? 'he-IL' : 'en-IL');
  function money(n) { return '₪' + nf.format(n); }
  function tx(o) { return o ? (o[LANG] || o.he || '') : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }

  // ---------- storage (wrapped: private mode can throw) ----------
  function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } }
  function writeCart(c) { try { localStorage.setItem(CART_KEY, JSON.stringify(c)); } catch (e) {} updateCount(); }
  function updateCount() {
    var n = readCart().reduce(function (s, l) { return s + l.qty; }, 0);
    document.querySelectorAll('[data-cart-count]').forEach(function (el) { el.textContent = n; });
  }

  // ---------- pricing ----------
  function product(cat, id) { return cat.products.filter(function (p) { return p.id === id; })[0]; }
  function unitPrice(cat, line) {
    var p = product(cat, line.productId); if (!p) return 0;
    var price = p.price;
    (p.options || []).forEach(function (o) {
      var v = (o.values || []).filter(function (x) { return x.id === line.options[o.id]; })[0];
      if (v) price += v.delta;
    });
    (line.addons || []).forEach(function (a) { if (cat.addons[a]) price += cat.addons[a].price; });
    return price;
  }
  function describe(cat, line) {
    var p = product(cat, line.productId); var parts = [];
    (p.options || []).forEach(function (o) {
      var v = o.values.filter(function (x) { return x.id === line.options[o.id]; })[0];
      if (v) parts.push(tx(o.name) + ': ' + tx(v.name));
    });
    (p.fields || []).forEach(function (f) { if (line.fields[f.id]) parts.push(tx(f.name) + ': ' + line.fields[f.id]); });
    (line.addons || []).forEach(function (a) { parts.push('+ ' + tx(cat.addons[a].name)); });
    return parts;
  }
  function totals(cat, cart, method) {
    var sub = cart.reduce(function (s, l) { return s + unitPrice(cat, l) * l.qty; }, 0);
    var ship = method && cat.shipping[method] ? cat.shipping[method].price : 0;
    return { sub: sub, ship: ship, total: sub + ship };
  }

  // ---------- layout ----------
  function chrome() {
    var page = document.body.dataset.page;
    var header = document.createElement('header');
    header.className = 'shop-header';
    header.innerHTML =
      '<div class="in">' +
      '<a class="logo" href="' + (LANG === 'en' ? '/en/shop/' : '/') + '"><img src="/lilou-books-logo.png" alt="Lilou Books" width="910" height="116"></a>' +
      '<nav aria-label="' + (LANG === 'he' ? 'ניווט' : 'Navigation') + '">' +
      '<a href="/">' + T.home + '</a>' +
      '<a href="' + BASE + '"' + (page === 'catalog' ? ' aria-current="page"' : '') + '>' + T.shop + '</a>' +
      '<a href="' + T.otherHref + '" lang="' + (LANG === 'he' ? 'en' : 'he') + '">' + T.other + '</a>' +
      '<a class="cart-link" href="' + BASE + 'cart.html"' + (page === 'cart' ? ' aria-current="page"' : '') + '>🛒 ' + T.cart +
      ' <span class="cart-count" data-cart-count aria-live="polite">0</span></a>' +
      '</nav></div>';
    document.body.insertBefore(header, document.body.firstChild);
    var skip = document.createElement('a'); skip.className = 'skip'; skip.href = '#main';
    skip.textContent = LANG === 'he' ? 'דלג לתוכן הראשי' : 'Skip to main content';
    document.body.insertBefore(skip, header);
    var footer = document.createElement('footer'); footer.className = 'shop-footer';
    footer.innerHTML = '<p>Lilou Books · ' + (LANG === 'he' ? 'תל אביב, ישראל' : 'Tel Aviv, Israel') + '</p>' +
      '<p><a href="mailto:hi@liloubooks.com">hi@liloubooks.com</a><a href="/#contact">' + (LANG === 'he' ? 'צור קשר' : 'Contact') + '</a>' +
      '<a href="/shop/terms.html">' + (LANG === 'he' ? 'תקנון' : 'Terms') + '</a><a href="/shop/terms.html#accessibility">' + (LANG === 'he' ? 'הצהרת נגישות' : 'Accessibility') + '</a></p>';
    document.body.appendChild(footer);
    updateCount();
  }

  // ---------- pages ----------
  function catalogPage(cat, main) {
    var active = new URLSearchParams(location.search).get('cat') || 'all';
    function render() {
      var list = cat.products.filter(function (p) { return active === 'all' || p.cat === active; });
      main.innerHTML =
        '<h1>' + T.title + '</h1><p class="lead">' + T.lead + '</p>' +
        '<p class="trust">' + T.trust.map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</p>' +
        '<div class="chips" role="group" aria-label="' + (LANG === 'he' ? 'סינון לפי קטגוריה' : 'Filter by category') + '">' +
        [{ id: 'all', name: { he: T.all, en: T.all } }].concat(cat.categories).map(function (c) {
          return '<button type="button" class="chip" data-cat="' + c.id + '" aria-pressed="' + (c.id === active) + '">' + esc(tx(c.name)) + '</button>';
        }).join('') + '</div>' +
        '<div class="grid">' + list.map(function (p) {
          var hasOpts = (p.options || []).some(function (o) { return o.values.some(function (v) { return v.delta > 0; }); });
          return '<a class="card" href="' + BASE + 'product.html?id=' + p.id + '">' +
            '<img src="' + encodeURI(p.image) + '" alt="" loading="lazy">' +
            '<div class="b"><h2>' + esc(tx(p.name)) + '</h2><span class="price">' + (hasOpts ? T.from : '') + money(p.price) + '</span></div></a>';
        }).join('') + '</div>';
      main.querySelectorAll('.chip').forEach(function (b) {
        b.addEventListener('click', function () {
          active = b.dataset.cat; history.replaceState(null, '', active === 'all' ? BASE : BASE + '?cat=' + active); render();
          var first = main.querySelector('.chip[aria-pressed="true"]'); if (first) first.focus();
        });
      });
    }
    render();
  }

  function productPage(cat, main) {
    var p = product(cat, new URLSearchParams(location.search).get('id'));
    if (!p) { main.innerHTML = '<p>' + T.notFound + '</p><p><a href="' + BASE + '">' + T.back + '</a></p>'; return; }
    document.title = tx(p.name) + ' | Lilou Books';
    var qty = 1;
    main.innerHTML =
      '<p><a href="' + BASE + '">' + T.back + '</a></p><br>' +
      '<div class="product"><div class="pic"><img src="' + encodeURI(p.image) + '" alt="' + esc(tx(p.name)) + '"></div>' +
      '<form id="pf" novalidate><h1>' + esc(tx(p.name)) + '</h1>' +
      '<p class="price" id="pp" aria-live="polite"></p><p class="desc">' + esc(tx(p.desc)) + '</p>' +
      (p.options || []).map(function (o) {
        return '<fieldset><legend>' + esc(tx(o.name)) + '</legend><div class="opts">' + o.values.map(function (v, i) {
          return '<label class="opt"><input type="radio" name="o_' + o.id + '" value="' + v.id + '"' + (i === 0 ? ' checked' : '') + '>' +
            '<span>' + esc(tx(v.name)) + (v.delta ? ' <small>(+' + money(v.delta) + ')</small>' : '') + '</span></label>';
        }).join('') + '</div></fieldset>';
      }).join('') +
      (p.fields || []).map(function (f) {
        var long = f.max > 40;
        return '<div class="field"><label class="lbl" for="f_' + f.id + '">' + esc(tx(f.name)) + (f.required ? ' *' : '') + '</label>' +
          (long ? '<textarea id="f_' + f.id + '" name="f_' + f.id + '" maxlength="' + f.max + '"></textarea>'
                : '<input type="text" id="f_' + f.id + '" name="f_' + f.id + '" maxlength="' + f.max + '"' + (f.required ? ' required aria-required="true"' : '') + '>') +
          '<p class="err" id="e_' + f.id + '" hidden>' + T.required + '</p></div>';
      }).join('') +
      ((p.addons || []).length ? '<fieldset><legend>' + T.extras + '</legend>' + p.addons.map(function (a) {
        var ad = cat.addons[a];
        return '<label class="addon"><input type="checkbox" name="a_' + a + '"><span><strong>' + esc(tx(ad.name)) + ' (+' + money(ad.price) + ')</strong><small>' + esc(tx(ad.desc)) + '</small></span></label>';
      }).join('') + '</fieldset>' : '') +
      (p.cat === 'memorial' ? '<p class="hint">' + T.photoNote + '</p>' : '') +
      '<div class="buy"><div class="qty" role="group" aria-label="' + T.qty + '"><button type="button" data-q="-1" aria-label="-">−</button><output id="qv">1</output><button type="button" data-q="1" aria-label="+">+</button></div>' +
      '<button type="submit" class="btn">' + T.add + '</button></div></form></div>';
    var form = $('#pf', main);
    function current() {
      var line = { productId: p.id, options: {}, addons: [], fields: {}, qty: qty };
      (p.options || []).forEach(function (o) { var c = form.querySelector('input[name="o_' + o.id + '"]:checked'); line.options[o.id] = c ? c.value : o.values[0].id; });
      (p.addons || []).forEach(function (a) { if (form.querySelector('input[name="a_' + a + '"]').checked) line.addons.push(a); });
      (p.fields || []).forEach(function (f) { line.fields[f.id] = form.querySelector('[name="f_' + f.id + '"]').value.trim(); });
      return line;
    }
    function refresh() { $('#pp', main).textContent = money(unitPrice(cat, current()) * qty); }
    form.addEventListener('change', refresh); refresh();
    form.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () { qty = Math.max(1, Math.min(10, qty + Number(b.dataset.q))); $('#qv', main).textContent = qty; refresh(); });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var line = current(), ok = true;
      (p.fields || []).forEach(function (f) {
        var bad = f.required && !line.fields[f.id];
        $('#e_' + f.id, main).hidden = !bad;
        var inp = form.querySelector('[name="f_' + f.id + '"]'); inp.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad && ok) { inp.focus(); ok = false; }
      });
      if (!ok) return;
      var cart = readCart(); line.id = Date.now().toString(36); cart.push(line); writeCart(cart);
      showToast();
    });
  }

  function showToast() {
    var old = $('.toast'); if (old) old.remove();
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + T.added + '</span><a href="' + BASE + 'cart.html">' + T.toCart + '</a>';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 6000);
  }

  function lineHtml(cat, l, editable) {
    var p = product(cat, l.productId); if (!p) return '';
    return '<div class="line"><img src="' + encodeURI(p.image) + '" alt="">' +
      '<div><h3>' + esc(tx(p.name)) + '</h3><p class="meta">' + describe(cat, l).map(esc).join(' · ') + '</p>' +
      (editable ? '<div class="ctl"><div class="qty" role="group" aria-label="' + T.qty + '"><button type="button" data-l="' + l.id + '" data-q="-1" aria-label="-">−</button><output>' + l.qty + '</output><button type="button" data-l="' + l.id + '" data-q="1" aria-label="+">+</button></div>' +
        '<button type="button" class="link-btn" data-rm="' + l.id + '">' + T.remove + '</button></div>' : '<p class="meta">' + T.qty + ': ' + l.qty + '</p>') +
      '</div><strong>' + money(unitPrice(cat, l) * l.qty) + '</strong></div>';
  }

  function cartPage(cat, main) {
    function render() {
      var cart = readCart().filter(function (l) { return product(cat, l.productId); });
      if (!cart.length) { main.innerHTML = '<div class="empty"><h1>' + T.cartTitle + '</h1><p>' + T.empty + '</p><br><a class="btn" href="' + BASE + '">' + T.keep + '</a></div>'; return; }
      var t = totals(cat, cart);
      main.innerHTML = '<h1>' + T.cartTitle + '</h1><br><div class="two"><div class="panel">' + cart.map(function (l) { return lineHtml(cat, l, true); }).join('') + '</div>' +
        '<div class="panel"><div class="sum-row"><span>' + T.subtotal + '</span><strong>' + money(t.sub) + '</strong></div>' +
        '<br><a class="btn wide" href="' + BASE + 'checkout.html">' + T.checkout + '</a><br><br><a class="btn ghost wide" href="' + BASE + '">' + T.keep + '</a></div></div>';
      main.querySelectorAll('[data-q]').forEach(function (b) {
        b.addEventListener('click', function () {
          var c = readCart(); c.forEach(function (l) { if (l.id === b.dataset.l) l.qty = Math.max(1, Math.min(10, l.qty + Number(b.dataset.q))); }); writeCart(c); render();
        });
      });
      main.querySelectorAll('[data-rm]').forEach(function (b) {
        b.addEventListener('click', function () { writeCart(readCart().filter(function (l) { return l.id !== b.dataset.rm; })); render(); });
      });
    }
    render();
  }

  function checkoutPage(cat, main) {
    var cart = readCart().filter(function (l) { return product(cat, l.productId); });
    if (!cart.length) { location.replace(BASE + 'cart.html'); return; }
    var memorial = cart.some(function (l) { return product(cat, l.productId).cat === 'memorial'; });
    main.innerHTML = '<h1>' + T.coTitle + '</h1><br><form id="co" class="co" novalidate>' +
      '<div class="co-fields">' +
      '<h2 class="co-h">' + T.billing + '</h2>' +
      fld('first', T.first, 'text', 'given-name', true) + fld('last', T.last, 'text', 'family-name', true) +
      fld('street', T.street, 'text', 'address-line1', 'addr', T.streetPh) +
      fld('apt', '', 'text', 'address-line2', false, T.aptPh) +
      fld('zip', T.zip, 'text', 'postal-code', 'addr', T.zipPh) +
      fld('city', T.city, 'text', 'address-level2', 'addr') +
      fld('phone', T.phone, 'tel', 'tel', true) + fld('email', T.email, 'email', 'email', true) +
      '<h2 class="co-h">' + T.moreInfo + '</h2>' +
      '<div class="field"><label class="lbl" for="notes">' + T.notes + '</label><textarea id="notes" name="notes" maxlength="500" placeholder="' + T.notesPh + '"></textarea></div>' +
      (memorial ? '<p class="hint">' + T.photoNote + '</p>' : '') +
      '</div>' +
      '<div class="co-box"><h2 class="co-h">' + T.orderDetails + '</h2>' +
      '<table class="co-table"><thead><tr><th scope="col">' + T.productCol + '</th><th scope="col">' + T.subtotal + '</th></tr></thead><tbody>' +
      cart.map(function (l) {
        var p = product(cat, l.productId);
        return '<tr><td>' + esc(tx(p.name)) + ' <strong>× ' + l.qty + '</strong><small>' + describe(cat, l).map(esc).join(' · ') + '</small></td><td>' + money(unitPrice(cat, l) * l.qty) + '</td></tr>';
      }).join('') +
      '</tbody><tbody id="sumBody"></tbody></table>' +
      '<div class="co-pay"><p class="co-pay-head"><span class="dot" aria-hidden="true"></span>' + T.payMethod + '</p><p>' + T.payDesc + '</p></div>' +
      '<p class="co-privacy">' + T.privacy + (LANG === 'en' ? ' ' : '') + '<a href="/shop/terms.html#privacy" target="_blank">' + T.privacyLink + '</a>.</p>' +
      '<label class="check"><input type="checkbox" id="terms" name="terms"><span>' + T.terms + ' <a href="/shop/terms.html" target="_blank">' + T.termsLink + '</a> <span class="req">*</span></span></label>' +
      '<p class="err" id="e_terms" hidden>' + T.errTerms + '</p>' +
      '<button type="submit" class="btn wide" id="payBtn">' + T.pay + '</button>' +
      '<p class="err" id="e_form" role="alert" hidden></p><p class="secure">' + T.secure + '</p></div></form>';

    function fld(id, label, type, ac, req, ph) {
      var star = req ? ' <span class="req" aria-hidden="true">*</span>' : '';
      return '<div class="field" id="w_' + id + '">' + (label ? '<label class="lbl" for="' + id + '">' + label + '<span data-star="' + id + '">' + star + '</span></label>' : '<label class="sr-only" for="' + id + '">' + ph + '</label>') +
        '<input type="' + type + '" id="' + id + '" name="' + id + '" autocomplete="' + ac + '"' + (ph ? ' placeholder="' + ph + '"' : '') + (req === true ? ' required aria-required="true"' : '') + (type === 'tel' ? ' inputmode="tel" dir="ltr"' : '') + (type === 'email' ? ' dir="ltr"' : '') + (id === 'zip' ? ' inputmode="numeric"' : '') + '>' +
        '<p class="err" id="e_' + id + '" hidden></p></div>';
    }
    var form = $('#co', main);
    function method() { var c = form.querySelector('input[name="method"]:checked'); return c ? c.value : 'delivery'; }
    function refresh() {
      var m = method(), t = totals(cat, cart, m);
      $('#sumBody', main).innerHTML =
        '<tr class="co-sub"><th scope="row">' + T.subtotal + '</th><td>' + money(t.sub) + '</td></tr>' +
        '<tr class="co-ship"><th scope="row" colspan="2">' + T.shipping +
        ['delivery', 'pickup'].map(function (k) {
          var sh = cat.shipping[k];
          return '<label class="co-radio"><input type="radio" name="method" value="' + k + '"' + (k === m ? ' checked' : '') + '> ' + esc(tx(sh.name)) + (sh.price ? ': ' + money(sh.price) : '') + '</label>';
        }).join('') + (m === 'pickup' ? '<small>' + T.pickupNote + '</small>' : '') + '</th></tr>' +
        '<tr class="co-total"><th scope="row">' + T.total + '</th><td>' + money(t.total) + '</td></tr>';
      var del = m === 'delivery';
      ['street', 'zip', 'city'].forEach(function (id) {
        var i = $('#' + id, main); i.required = del; i.setAttribute('aria-required', del ? 'true' : 'false');
        $('[data-star="' + id + '"]', main).innerHTML = del ? ' <span class="req" aria-hidden="true">*</span>' : ' <small>(' + T.optional + ')</small>';
      });
    }
    form.addEventListener('change', function (e) { if (e.target.name === 'method') refresh(); }); refresh();

    function setErr(id, msg) { var e = $('#e_' + id, main); e.textContent = msg || ''; e.hidden = !msg; var i = $('#' + id, main); if (i) i.setAttribute('aria-invalid', msg ? 'true' : 'false'); }
    function req(label) { return LANG === 'he' ? 'חיוב ' + label + ' הוא שדה חובה.' : label + ' is a required field.'; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = function (id) { var el = $('#' + id, main); return el ? el.value.trim() : ''; };
      var phone = v('phone').replace(/[^\d]/g, '');
      var errs = [];
      [['first', T.first], ['last', T.last]].forEach(function (f) { var bad = v(f[0]).length < 2; setErr(f[0], bad ? req(f[1]) : ''); if (bad) errs.push(f[0]); });
      if (method() === 'delivery') {
        [['street', T.street], ['city', T.city]].forEach(function (f) { var bad = v(f[0]).length < 2; setErr(f[0], bad ? req(f[1]) : ''); if (bad) errs.push(f[0]); });
        var bz = !/^\d{5}(\d{2})?$/.test(v('zip')); setErr('zip', bz ? req(T.zip) : ''); if (bz) errs.push('zip');
      } else { ['street', 'city', 'zip'].forEach(function (id) { setErr(id, ''); }); }
      var bp = !/^05\d{8}$/.test(phone); setErr('phone', bp ? (v('phone') ? T.errPhone : req(T.phone)) : ''); if (bp) errs.push('phone');
      var be = !/^\S+@\S+\.\S+$/.test(v('email')); setErr('email', be ? (v('email') ? T.errEmail : req(T.email)) : ''); if (be) errs.push('email');
      var bt = !$('#terms', main).checked; $('#e_terms', main).hidden = !bt; if (bt) errs.push('terms');
      if (errs.length) { var f = $('#' + errs[0], main); if (f) f.focus(); return; }

      var btn = $('#payBtn', main); btn.disabled = true;
      var overlay = document.createElement('div'); overlay.className = 'overlay'; overlay.setAttribute('role', 'status');
      overlay.innerHTML = '<div><img src="/lilou-books-logo.png" alt="Lilou Books"><p>' + T.moving + '</p><div class="spinner" aria-hidden="true"></div></div>';
      document.body.appendChild(overlay);
      var body = {
        lang: LANG,
        lines: cart.map(function (l) { return { productId: l.productId, options: l.options, addons: l.addons, fields: l.fields, qty: l.qty }; }),
        customer: { firstName: v('first'), lastName: v('last'), email: v('email'), phone: phone },
        delivery: { method: method(), street: [v('street'), v('apt')].filter(Boolean).join(', '), city: v('city'), zip: v('zip') },
        notes: v('notes'), terms: true
      };
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.j && res.j.paymentUrl) {
            try { sessionStorage.setItem('lb_pending_order', res.j.orderId || ''); } catch (e2) {}
            location.href = res.j.paymentUrl; return;
          }
          if (res.ok && res.j && res.j.orderId) { // order saved, payment link unavailable right now
            writeCart([]);
            overlay.remove();
            main.innerHTML = '<div class="empty"><h1>' + T.received + '</h1><p>' + T.receivedText + '</p><p>' + T.order + ': <strong>' + esc(res.j.orderId) + '</strong></p></div>';
            return;
          }
          throw new Error((res.j && res.j.error) || 'error');
        })
        .catch(function (err) {
          overlay.remove(); btn.disabled = false;
          var e3 = $('#e_form', main); e3.textContent = (err && err.message && err.message !== 'error' && err.message !== 'Failed to fetch') ? err.message : T.errGeneric; e3.hidden = false;
        });
    });
  }

  function thanksPage(cat, main) {
    var id = new URLSearchParams(location.search).get('order');
    try { if (!id) id = sessionStorage.getItem('lb_pending_order'); sessionStorage.removeItem('lb_pending_order'); } catch (e) {}
    writeCart([]);
    main.innerHTML = '<div class="empty"><h1>' + T.thanks + '</h1><p>' + T.thanksText + '</p>' +
      (id ? '<p>' + T.order + ': <strong>' + esc(id) + '</strong></p>' : '') +
      '<br><a class="btn" href="' + BASE + '">' + T.keep + '</a></div>';
  }

  // ---------- boot ----------
  chrome();
  var main = $('#main');
  var page = document.body.dataset.page;
  if (page === 'terms') return; // static content page: header and footer only
  fetch('/shop/catalog.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (cat) {
    ({ catalog: catalogPage, product: productPage, cart: cartPage, checkout: checkoutPage, thanks: thanksPage }[page] || catalogPage)(cat, main);
  }).catch(function () { main.innerHTML = '<p>' + T.errGeneric + '</p>'; });
})();
