# 📄 Caprae Internship Challenge – One-Page Report

## 🧠 Problem Statement

Caprae analysts frequently browse startup directories, GitHub orgs, LinkedIn, and AngelList to identify founders. Collecting emails and social profiles manually is repetitive, time-consuming, and prone to human error.

### 🎯 Goal

Build a lightweight Chrome Extension that:
- Automatically extracts potential founder contact details
- Scores and tags each lead intelligently
- Enables filtering, preview, and export to CSV/JSON

---

## 🔍 Approach

1. Inject a content script into all websites (`<all_urls>`)
2. Extract:
   - Emails using regex on page text
   - Social links (LinkedIn, GitHub, Twitter, AngelList) via anchor tag filtering
3. Normalize URLs and remove noise (e.g., GitHub `/about`)
4. Score leads using keyword heuristics and domain intelligence
5. Store leads in `chrome.storage.local`
6. Display results via:
   - Compact popup view
   - Full-screen dashboard with filters and exports

---

## ⚙️ Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)
- **Scraping:** Regex + DOM parsing (anchor filtering)
- **Persistence:** `chrome.storage.local` (fast local state)
- **UI Logic:** Table rendering, live search, filtering, copy/export

---

## 🧹 Data Cleaning & Scoring Logic

- Normalized URLs by removing query/hash/fragments
- Filtered noisy links (GitHub `/settings`, `/notifications`, etc.)
- Applied scoring:
  - `+10` for strong keywords in email/URL: `ceo`, `founder`, `owner`
  - `+5` for business domains or TLDs like `.ai`, `.io`, `.tech`
  - `+3–5` for social profiles with “build”, “startup”, “tech”

---

## ⚡ Performance

- Loads content script at `document_idle` for low latency
- Uses `MutationObserver` to capture dynamically injected DOM (SPAs)
- Instant performance on pages like LinkedIn, GitHub, Twitter, AngelList
- All actions are local — no backend or login required

---

## 💼 Business Value

- Saves analysts 30–60 minutes per session on lead collection
- Extracts high-signal founder leads in one click
- Supports flexible filtering and export for CRM or investor outreach
- Requires no user onboarding or API access — just works out of the box

---

## 🔮 Future Improvements

- [ ] **CRM Integration** — One-click sync to HubSpot, Notion, or Airtable
- [ ] **AI Scoring Model** — Use LLMs to enrich profiles and improve tag accuracy
- [ ] **Auto-Scroll/Batch Mode** — Automatically scroll and extract from paginated lists
- [ ] **Team Collaboration** — Allow exporting shared lead boards
- [ ] **Ethical Scraping Guardrails** — Add opt-out detection and ethical filter flags
- [ ] **Multi-tab Aggregation** — Combine leads from multiple tabs into one dashboard

---

## 📂 Deliverables

- ✅ Chrome Extension Codebase (GitHub)
- ✅ `README.md` with setup instructions
- ✅ One-Page Report (this file)
- ✅ Resume Attached

---

## ⏳ Time Spent

4.5 hours (within Caprae’s 5-hour limit)

---
