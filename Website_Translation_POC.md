# Website Translation Tool — Proof of Concept

**Prepared by:** Rikaian Technologies
**Date:** May 6, 2026
**Version:** 1.0
**Status:** POC / Internal Review

---

## 1. Executive Summary

This document outlines the Proof of Concept for Rikaian's Website Translation Tool — a lightweight, automated solution that translates a client's website into multiple languages with minimal client involvement. The client does not need to manage translations, maintain language files, or modify their development workflow. Rikaian handles the entire translation lifecycle end-to-end: scraping, translation, proofreading, and delivery.

---

## 2. Problem Statement

The client requires their website to be available in multiple regional and international languages. They do not want to:

- Manage translation files or workflows internally
- Modify their existing codebase significantly
- Hire or coordinate with translators directly
- Manually track which content has changed and needs re-translation

They want to outsource the entire process to a partner who keeps translations up to date as the website evolves.

---

## 3. Proposed Solution

Rikaian's translation tool works as a script layer that sits on top of the client's website. It performs three core functions:

1. **Scrape** — Automatically detects all translatable text content on the website
2. **Translate** — Sends new or changed content to the Rian.io translation API
3. **Deliver** — Stores translations and serves the correct language based on user selection

---

## 4. Integration Method

### 4.1 What the Client Needs to Do (One-Time Setup)

The client adds **two lines** to their website's HTML — a script tag and a language switcher widget:

```html
<!-- Add before closing </body> tag -->
<script src="https://cdn.rikaian.io/translate/client.js" data-site-id="CLIENT_SITE_ID"></script>
```

The language switcher can either be:
- **Rikaian's default widget** — a floating language selector injected automatically by the script
- **Custom integration** — the client's own dropdown/button that calls the translation API

That's it. No other changes to their codebase are required.

### 4.2 Do We Need Access to the Client's Codebase?

**No.** The tool operates as a client-side script and a backend translation service. We do not need:

- Access to the client's source code repository
- Access to their hosting or deployment pipeline
- Any server-side changes on their end

However, **optional deeper integration** is available if the client prefers:

| Integration Level | What's Required | Benefit |
|---|---|---|
| **Basic (recommended)** | One script tag added to HTML | Zero maintenance, works on any website |
| **CMS Plugin** | Install a plugin (WordPress, Shopify, etc.) | Tighter integration with CMS content |
| **Codebase Integration** | Access to repo, add `data-i18n` attributes | Most precise control over what gets translated |

For the POC and recommended production approach, **Basic integration** is sufficient.

---

## 5. How It Works — Technical Workflow

### 5.1 Initial Setup & First Translation

```
┌─────────────────────────────────────────────────────┐
│  CLIENT WEBSITE                                     │
│                                                     │
│  1. Script loads on page                            │
│  2. Scraper walks the DOM tree                      │
│  3. Extracts all visible text content               │
│     (headings, paragraphs, buttons, links,          │ 
│      navigation, footers, etc.)                     │
│  4. Generates a content fingerprint per element     │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       	      │
                              ▼
┌─────────────────────────────────────────────────────┐
│  RIKAIAN TRANSLATION SERVER                         │
│                                                     │
│  5. Receives scraped text payload                   │
│  6. Stores English source in database               │
│  7. Sends text to Rian.io Translation API           │
│  8. Receives machine translations                   │
│  9. Stores translations (pending proofreading)      │
│ 10. Notifies Rian Delivery Team for review          │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────┐
│  RIAN DELIVERY TEAM                                 │
│                                                     │
│ 11. Reviews machine translations in dashboard       │
│ 12. Corrects terminology, tone, context             │
│ 13. Marks translations as "approved"                │
│ 14. Approved translations go live on client site    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 5.2 Ongoing Content Changes (e.g., Client Adds a Blog Post)

When the client adds new content (a blog post, a new page, updated copy):

1. **Automatic Detection** — The script runs on every page load. It compares the current page content against the last known snapshot stored on Rikaian's server.

2. **Diff & Extract** — Only new or changed text is extracted. Unchanged content is skipped entirely.

3. **Notification** — The Rikaian server sends an automated notification to the Rian Delivery Team:
   - Email and/or Slack notification
   - Contains: page URL, number of new/changed strings, preview of changes
   - Example: *"New content detected on client-website.com/blog/summer-collection — 24 new strings require translation and review."*

4. **Machine Translation** — New strings are immediately translated via the Rian.io API and stored as draft translations.

5. **Human Review** — The Delivery Team reviews and approves translations through the Rikaian dashboard.

6. **Go Live** — Approved translations are served to end users on the next page load.

### 5.3 Content Change Detection — How It Works

The scraper identifies content changes using a combination of:

- **Text fingerprinting** — Each text element gets a hash based on its content. If the hash changes, the text has been modified.
- **DOM path mapping** — Elements are identified by their position in the page structure (e.g., `section#about > div > h2`), allowing the system to track which specific element changed.
- **Page-level diffing** — The system maintains a per-page snapshot of all translatable content. On each scan, it diffs the current state against the snapshot.

This means the client can:
- Edit existing text → detected as a change
- Add new sections or pages → detected as new content
- Remove content → detected and flagged for cleanup
- Reorder content → handled gracefully via DOM path mapping

---

## 6. Translation Engine — Rian.io API

All machine translations are powered by **Rian.io's translation API**, not third-party services like Google Translate or ChatGPT. This provides:

- **Consistency** — Translations are processed through Rian's engine, ensuring consistent terminology across the entire website
- **Custom glossaries** — Industry-specific terms, brand names, and preferred translations can be configured in Rian's system
- **Quality baseline** — Rian.io provides high-quality machine translations that reduce the proofreading effort for the Delivery Team
- **API key management** — All API keys are managed by Rikaian; the client has no exposure to API credentials or costs

### Translation Flow

```
Scraped Text
      │
      ▼
Rian.io API
      │
      ▼
Machine Translation (Draft)
        │
        ▼
Delivery Team Review
        │
        ▼
Approved Translation → Served to Users
```

---

## 7. Data Storage

### 7.1 Where Is the Data Stored?

| Data | Storage Location | Format |
|---|---|---|
| English source text | Rikaian Translation Server | JSON (key-value pairs) |
| Machine translations (draft) | Rikaian Translation Server | JSON per language |
| Approved translations (live) | Rikaian CDN | JSON per language |
| Content change history | Rikaian Database | Timestamped diffs |
| Proofreading notes & edits | Rian Dashboard | Per-string audit trail |

### 7.2 Data Flow

```
Client Website  ──→  Rikaian Server  ──→  Rian.io API
                          │
                          ├── Source DB (English JSON)
                          ├── Translation DB (per-language JSON)
                          ├── Change Log (diffs + timestamps)
                          └── CDN (approved translations served to users)
```

### 7.3 Data Ownership & Security

- The client retains full ownership of all source content and translations
- All data is transmitted over HTTPS
- API keys and credentials are stored server-side; nothing is exposed in client-side code
- Translation data can be exported at any time in standard JSON format

---

## 8. Language Serving — How Users See Translations

When a visitor selects a language on the client's website:

1. The script fetches the approved translation file for that language from Rikaian's CDN
2. It walks the DOM and replaces each English text element with its translated counterpart
3. The page language attribute (`<html lang="xx">`) is updated
4. The user's language preference is saved in localStorage for future visits

This happens **client-side** with no page reload. The experience is instant.

---

## 9. Dashboard & Notifications

The Rian Delivery Team gets access to a translation management dashboard with:

- **Queue view** — All pending translations awaiting review, sorted by priority
- **Side-by-side editor** — English source on the left, translation on the right, with inline editing
- **Change alerts** — Email/Slack notifications when new content is detected
- **Approval workflow** — Review → Edit → Approve → Live
- **Analytics** — Translation coverage per page, per language, approval turnaround time

---

## 10. Supported Scenarios

| Scenario | How It's Handled |
|---|---|
| Client updates homepage copy | Auto-detected on next visit, sent for translation + review |
| Client adds a new blog post | New page scraped automatically, full content queued for translation |
| Client adds a new page/section | Detected when any user visits the page with the script loaded |
| Client removes content | Flagged in dashboard, orphaned translations marked for cleanup |
| Client wants a new language added | Rikaian configures the new language; all existing content is batch-translated |
| Seasonal/temporary content | Translated normally; can be archived when removed |

---

## 11. What the Client Does NOT Need to Do

- Manage translation files or JSON
- Tag content with special attributes
- Give access to their codebase or server
- Coordinate with translators
- Track what content has changed
- Handle any technical integration beyond the initial script tag

---

## 12. Known Limitation — Content Tagging

### The Problem

In the current POC implementation, every translatable text element on the website must carry a custom HTML attribute (`data-i18n="unique.key"`) for the scraper to detect it. For example:

```html
<h2 data-i18n="about.heading">Five decades of excellence</h2>
```

This means:
- When the client adds a new section, blog post, or page, the new content will **not** be picked up by the scraper unless it has been manually tagged with `data-i18n` attributes.
- The client or a developer must remember to add these tags to every new piece of translatable text.
- If tags are missing, the content silently remains untranslated — there is no warning or error.

This defeats the goal of a zero-effort, fully outsourced solution for the client.

### Proposed Solutions

We have identified three approaches to solve this, ranging from simplest to most robust:

#### Option A: Auto-Detect All Visible Text (No Tags Required)

Instead of relying on `data-i18n` attributes, the scraper walks the entire DOM tree and extracts all visible text from semantic HTML elements (`<h1>`–`<h6>`, `<p>`, `<span>`, `<a>`, `<button>`, `<li>`, `<td>`, etc.).

- **How it works:** The scraper generates keys automatically based on DOM position (e.g., `section#about > div > h2` becomes `about.h2.0`). It skips non-translatable elements like `<script>`, `<style>`, `<svg>`, and code blocks.
- **Pros:** Zero client effort. Any new content is detected automatically.
- **Cons:** Auto-generated keys are tied to DOM structure — if the client restructures their HTML, keys may shift, causing translations to detach from their elements. Requires robust fallback matching (e.g., text fingerprinting) to handle structural changes.

#### Option B: Auto-Detect + Auto-Inject Tags

The scraper detects all visible text (like Option A) but then **automatically injects `data-i18n` attributes** back into the HTML source file. This gives us the best of both worlds: automatic detection with stable, persistent keys.

- **How it works:** On first scan, the scraper finds untagged text, generates a key, and writes the `data-i18n` attribute directly into the HTML file via the backend. Subsequent scans use the stable keys.
- **Pros:** Fully automatic. Keys are stable even if the DOM changes later. No client effort.
- **Cons:** Requires write access to the client's HTML files (either via repo access or a CMS plugin). The auto-generated keys may need cleanup for readability.

#### Option C: Proxy-Based Translation (No Script, No Tags)

Instead of a client-side script, Rikaian operates a **translation proxy** that sits between the user's browser and the client's website. The proxy intercepts the HTML response, identifies all text nodes, translates them on the fly, and serves the translated page.

- **How it works:** The client points a subdomain (e.g., `hi.client-website.com`) to Rikaian's proxy server. The proxy fetches the original page, translates all text content, caches the result, and serves it to the user.
- **Pros:** True zero-integration. No script tag, no tags, no codebase access needed. Works with any website. Best for multilingual SEO (separate URLs per language).
- **Cons:** Higher infrastructure cost. Adds latency on first load (cached after). More complex to build and maintain. Requires DNS/subdomain configuration from the client.

### Recommendation

For the production release, **Option A** is the recommended starting point — it removes the tagging burden entirely while keeping the architecture simple (client-side script + backend API). Option B can be layered on top for clients who want maximum key stability. Option C is the long-term vision for enterprise clients who need full SEO support and zero-touch integration.

---

## 13. Other Limitations & Considerations

- **Dynamic/JS-rendered content** — Content loaded asynchronously (e.g., via React, AJAX) may require the scraper to wait for rendering. The script includes a MutationObserver to handle dynamically injected content.
- **Images with text** — Text embedded in images cannot be translated by this tool. The client should use HTML text overlays where possible.
- **SEO** — Client-side translation does not create separate URLs per language (e.g., `/hi/about`). For full multilingual SEO, a server-side or proxy-based approach (Option C above) is recommended as a future enhancement.
- **Translation quality** — Machine translations are a starting point. Human proofreading by the Delivery Team is essential for production-quality output.
- **Right-to-left (RTL) languages** — Languages like Arabic, Hebrew, or Urdu require RTL layout adjustments. The current POC does not handle CSS direction changes automatically.
- **Content inside iframes** — Third-party widgets, embedded forms, or iframe content cannot be accessed or translated by the scraper due to browser security restrictions.

---

## 14. POC Deliverables

This Proof of Concept demonstrates:

1. Automatic content scraping from a live webpage
2. Diff detection — only new/changed content is processed
3. Machine translation via API (Rian.io in production; GPT-4o-mini used in POC for demonstration)
4. Translation storage in per-language JSON files
5. Client-side language switching with no page reload
6. Manual scrape trigger with progress modal and logging

### POC Test Site

- **Languages:** English, Hindi, Marathi, Bengali, Tamil
- **Files:**
  - `test.html` — Sample client website
  - `scrape.js` — Content scraper and translation trigger
  - `i18n.js` — Client-side language switcher
  - `server.js` — Backend API (scrape storage + translation proxy)
  - `lang/*.json` — Translation files per language

---

## 15. Next Steps

1. **Replace GPT-4o-mini with Rian.io API** — Swap the translation engine to use Rian.io's production API
2. **Build notification system** — Email/Slack alerts to Delivery Team on content changes
3. **Build proofreading dashboard** — Review, edit, and approve translations
4. **CDN deployment** — Serve approved translations from a CDN for production performance
5. **Client pilot** — Deploy script on client's staging site for real-world testing
6. **SEO strategy** — Evaluate server-side rendering or subdomain-based approach for multilingual SEO

---

*This document is confidential and intended for internal use at Rikaian Technologies.*
