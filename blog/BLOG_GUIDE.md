# Monthly blog post – instructions for the publishing agent

liloubooks.com is the Hebrew website of Lilou Books (לילו בוקס), the book-folding and
book-sculpting art business of Lahav Barak (להב ברק). Once a month a new blog post is
published automatically. This file is the source of truth for how to do that.

The site is plain static HTML on GitHub Pages. Pushing to `main` deploys it
(`.github/workflows/static.yml`), so whatever you push is live within minutes.
Real readers will see it under Lahav's name, so quality matters more than speed.

## 1. Pick a topic

- Read every existing post in `blog/` (and the original post in the `#blog` section of
  `index.html`). **Do not repeat a topic or angle that already exists.**
- Prefer a topic that fits the season in Israel. A post goes out at the start of each month, so
  think about what readers will make or gift during that month (for example טו באב / Valentine's Day in
  February, Mother's Day / Family Day, Passover, Rosh Hashanah, Hanukkah, weddings season,
  back to school, end-of-year teacher gifts).
- Topic ideas (one per month):
  - the history of book folding and book art
  - the main techniques: Measure-Mark-Fold (MMF), cut & fold, inverted folding, combi
  - how to choose the right book: page count, paper thickness, binding
  - tools you really need (and what you don't)
  - how to read a book-folding pattern
  - beginner mistakes and how to fix them
  - names and initials in books as personal gifts
  - book art at weddings and events (link to https://events.liloubooks.com)
  - giving old books a second life: recycling and upcycling
  - caring for and displaying a folded book
  - book folding as a calming, mindful hobby
  - how long a project takes, from planning to the last fold
  - seasonal gift ideas made from books

## 2. Write it

- **Language:** natural, warm, fluent Hebrew. Never use machine-translated phrasing.
- **Voice:** first person, as Lahav, matching the tone of the existing post: personal,
  friendly, a little humorous, and encouraging to beginners. Lahav writes about herself
  in the feminine form (e.g. "התחלתי", "הייתי מכורה").
- **Length:** 600–900 words. Use 3–5 `<h2>` subheadings, short paragraphs, and a list where it helps.
- **Accuracy (very important):**
  - Only state facts you are confident are true. No invented statistics, dates,
    studies, prices or quotes.
  - **Do not invent personal stories, customers, events or achievements** for Lahav.
    Write from general craft knowledge and opinion ("אני אוהבת...", "הטיפ שלי..."),
    not from made-up memories.
  - No promises about prices, dates, workshops or products.
- End with a short practical tip inside `<p class="tip">…</p>`.
- You may link to the site's existing sections (`/#workshops`, `/#custom-orders`,
  `/#events`, `/#gallery`) and to https://events.liloubooks.com when it is relevant.
  Do not link to other outside sites.
- Do not add images. The site has no image pipeline for posts.

## 3. Build the files

1. **Slug:** `YYYY-MM-short-english-slug` (lowercase, hyphens, for example `2026-11-choosing-the-right-book`).
2. **Post page:** copy `blog/_template.html` to `blog/<slug>.html` and replace every placeholder:
   - `{{TITLE}}` – Hebrew title, under 70 characters
   - `{{DESCRIPTION}}` – Hebrew meta description, 120–155 characters
   - `{{SLUG}}` – the slug
   - `{{ISO_DATE}}` – today, `YYYY-MM-DD`
   - `{{HEBREW_DATE}}` – today in Hebrew, for example `1 בנובמבר, 2026`
   - `{{BODY}}` – the article HTML (`<p>`, `<h2>`, `<ul>`, `<p class="tip">`)
   - Escape `"` inside attribute values and inside the JSON-LD. Make sure no `{{` is left.
3. **Archive:** in `blog/index.html`, insert a card **directly below** the
   `<!-- BLOG-ARCHIVE:START ... -->` line (newest first):
   ```html
   <a class="post-card" href="/blog/<slug>.html">
     <h2>TITLE</h2>
     <div class="meta">HEBREW_DATE • מאת להב</div>
     <p>EXCERPT – 1–2 sentences, about 25–35 words</p>
     <span class="more">להמשך קריאה ←</span>
   </a>
   ```
4. **Homepage:** in `index.html`, insert the card below immediately after the
   `<!-- BLOG-LATEST:START ... -->` comment (newest first, before the other cards and the
   `<!-- BLOG-LATEST:END -->` comment). Then keep **only the 3 newest** cards between the
   two comments, removing the oldest if there are more.
   ```html
   <a class="blog-card" href="/blog/<slug>.html">
     <h3>TITLE</h3>
     <div class="blog-card-meta">HEBREW_DATE • מאת להב</div>
     <p>EXCERPT</p>
     <span class="blog-card-more">להמשך קריאה ←</span>
   </a>
   ```
   Do not change anything else in `index.html`.
5. **Sitemap:** if `sitemap.xml` exists, add a `<url>` for the new post.

## 4. Check before publishing

- `grep -n "{{" blog/<slug>.html` returns nothing.
- `python3 -c "import html.parser,sys; html.parser.HTMLParser().feed(open(sys.argv[1],encoding='utf-8').read())" blog/<slug>.html` runs without errors.
- `git diff --stat` shows only: the new post, `blog/index.html`, `index.html` (and `sitemap.xml`).
- Read the Hebrew one more time for spelling, grammar and gender agreement.

## 5. Publish

Commit to `main` with the message `Blog: <Hebrew title>` and push to `origin main`.
If pushing to `main` is rejected, push to a branch named `blog/<slug>` and open a pull
request to `main` instead. Say clearly in your final message that it was **not** published.
