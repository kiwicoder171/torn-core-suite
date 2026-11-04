> 🧠 **Obsidian Hub**: [[_Brain/Projects/Torn|Torn]] · [[Antigravity/Torn/CONTEXT|Torn/CONTEXT.md]]

# TornCore QoL Suite

Unified, 100% rule-compliant Quality-of-Life & calculation suite for [Torn.com](https://www.torn.com).

Designed for complete UI control, zero-clutter, shared API rate-limit budgeting, and zero bot-detection risk.

---

## 🛡 Torn Rule Guardrail Compliance

This suite is strictly architected around Torn's **Automation & Scripting Rules**:
1. **1-to-1 Action Ratio**: Pre-fills inputs (e.g. `$10M` in vault, `29` items overseas). The player must physically click the submit/buy button themselves.
2. **Active Foreground Only**: Reads and modifies DOM nodes only on pages actively loaded and viewed by the user. Zero background tab scraping.
3. **No Synthetic Non-API Requests**: Zero background AJAX requests to Torn page endpoints.
4. **Shared Rate-Limited API Client**: Includes client-side rate limiting (capped at 80 calls/min) and TTL caching in `localStorage` to never breach the official 100 calls/min limit.
5. **No CAPTCHA Interference**: Safe DOM insertion that never alters or interacts with Torn bot checks.

---

## 📦 What's Inside the Single Script

All modules are bundled into a single Tampermonkey script (`dist/TornCore.user.js`) that automatically loads the relevant module based on your current page:

| Module | Location | Purpose |
| :--- | :--- | :--- |
| **Vault Quick-Fill** | `properties.php`, `factions.php` | Injects `$1M`, `$5M`, `$10M`, `Max Cash`, and `Keep $20k` deposit chips. |
| **Bazaar Cash Guard** | Global (Top Header) | Displays a prominent red warning banner if your Bazaar is open while holding liquid cash. |
| **Travel & Tarmac Suite** | `travelagency.php`, `page=travel` | Calculates round-trip plushie/flower profit per flight hour; auto-fills max carry quantity overseas. |
| **City Map Scanner** | `city.php` | Highlights hidden items on the city map with glowing markers and a quick-jump panel. |
| **Crimes 2.0 Cracking** | `loader.php?sid=crimes` | Matches revealed letters against a built-in dictionary of Torn cracking words. |
| **Zero-Waste Med-Out** | `hospitalview.php`, `item.php` | Calculates the exact combination of meds to reach 100% Life with minimum medical cooldown. |
| **Gym Happy Reset Timer** | `gym.php` | Displays a live countdown to the next `:00, :15, :30, :45` TCT server tick during Happy Jumps. |

---

## 🚀 How to Install

### Method A: Import Backup JSON (Fastest)
1. Open **Tampermonkey Dashboard** -> click the **Utilities** tab.
2. Under **File** / **Import**, click **Choose File** and select:
   [`dist/tampermonkey-backup.json`](dist/tampermonkey-backup.json)
3. Click **Import** — Tampermonkey will install the script immediately.

### Method B: Manual Copy-Paste
1. Open **Tampermonkey Dashboard** -> click the **`+`** (Add a new script) tab.
2. Select all existing boilerplate code and delete it.
3. Open [`dist/TornCore.user.js`](dist/TornCore.user.js), copy the full content, and paste it into the editor.
4. Press **File -> Save** (or `Cmd+S` / `Ctrl+S`).

---

## 🛠 Development & Building

Source files live in `src/`:
```text
src/
├── core/
│   ├── api.js         // Rate-limited API caller & localStorage cache
│   ├── router.js      // Page URL matcher & mutation observer
│   ├── storage.js     // Settings storage & defaults
│   └── ui.js          // Settings modal, chips, banner, dark theme
├── modules/
│   ├── bazaarGuard.js // Open bazaar alert
│   ├── cityScanner.js // City map glow pins & card
│   ├── crimes.js      // Cracking dictionary matcher
│   ├── gymTimer.js    // 15-minute Happy tick countdown
│   ├── hospital.js    // Optimal medical cooldown calculator
│   ├── travel.js      // Travel agency profit & max-buy tarmac helper
│   └── vault.js       // Quick-deposit chips
└── main.js            // Userscript entrypoint
```

### Commands
```bash
# Bundle into dist/TornCore.user.js
npm run build

# Run unit tests
npm test
```
