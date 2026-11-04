# Torn Scripting & API Compliance Manifesto

**TornCore QoL Suite** is engineered from the ground up to comply 100% with Torn’s **Automation & Scripting Rules** and the **Torn API Terms of Service** (https://www.torn.com/api.html).

---

## 1. Compliance with Torn’s Automation & Scripting Rules

Torn’s official rules state:
> *"The use of scripts, extensions, applications, or any other software is permitted only when they rely on data from our API or from a page that you have manually loaded and are actively viewing. Such software must not make additional non-API requests to Torn, scrape pages that are not currently being viewed, attempt to bypass CAPTCHA protections, or extract data from unfocused pages to send elsewhere, generate alerts, or draw attention to itself or another window.*
> 
> *Any software that makes non-API requests which are not directly and manually initiated by the user is prohibited and may be tracked.*
> 
> *Furthermore, releasing software with malicious or undisclosed functionality is strictly forbidden..."*

### How TornCore Adheres to Every Clause:

| Policy Requirement | How TornCore Complies |
| :--- | :--- |
| **Only rely on official API or active viewed page** | TornCore only interacts with DOM elements on the page currently in the player's active foreground viewport. All server-side data fetching uses exclusively `https://api.torn.com/`. |
| **Zero synthetic non-API requests** | TornCore makes **0 background `fetch()`, `XMLHttpRequest`, or AJAX requests to `torn.com/*.php` endpoints**. All navigation and page loads are 100% human-initiated. |
| **No scraping unfocused pages** | TornCore contains no background iframes, background workers, or scraping routines targeting pages not actively loaded in the active tab. |
| **No CAPTCHA interference** | TornCore contains **no code that inspects, manipulates, hides, or attempts to solve bot-check CAPTCHA dialogs**. If a CAPTCHA appears, TornCore remains completely dormant. |
| **1-to-1 Action Ratio (No Automation)** | TornCore **NEVER submits a form or clicks a purchase/action button automatically**. It only pre-fills numeric values into input fields (e.g. quantity or deposit amounts), which is explicitly permitted under Torn scripting rules. The player must physically click the action button. |
| **Zero Undisclosed Functionality** | The entire codebase is open-source, unminified, readable vanilla JavaScript. There are no tracking scripts, analytics, telemetry pings, or hidden endpoints. |

---

## 2. API Key Security & Privacy Guarantee

* **100% Client-Side Storage**: The user's API key is stored exclusively in their own browser's `localStorage` (or Tampermonkey `GM_setValue`).
* **Zero External Transmission**: The API key is ONLY sent in requests to `https://api.torn.com/` and is never logged, cached externally, or sent to any third-party server or webhook.
* **Minimal Permission Tier**: TornCore works fully with a **Public Access** key. It never requires or requests Limited, Full, or Admin key tiers.
* **Rate-Limit Safeguard**: TornCore enforces an internal sliding-window rate limiter capped at **80 calls/minute** (conservative safety buffer below Torn's 100/minute cap) and caches data with TTLs to prevent redundant calls.

---

## 3. Module-by-Module Technical Audit

1. **Vault Quick-Fill (`vault.js`)**:
   * Reads cash from active top-bar DOM.
   * Inserts numbers into deposit input field upon user clicking a quick chip (`+$1M`, `Max`, etc.).
   * Does NOT click the deposit button.
2. **Bazaar Guard (`bazaarGuard.js`)**:
   * Inspects cached user profile state.
   * Displays an informational CSS warning banner if Bazaar is open while carrying cash.
   * Purely cosmetic DOM indicator.
3. **Travel & Tarmac Suite (`travel.js`)**:
   * Pre-computes static flight profit tables using standard community flower/plushie market prices.
   * Overseas Shop: Pre-fills quantity field with `min(carryCapacity, affordableQuantity)`.
   * Does NOT click the "Buy" button.
4. **City Scanner (`cityScanner.js`)**:
   * Reads Leaflet map marker DOM nodes already loaded on `city.php`.
   * Adds CSS glowing ring (`outline`) to item pins to aid visual accessibility.
   * Does NOT auto-click or auto-collect items.
5. **Crimes 2.0 Cracking Solver (`crimes.js`)**:
   * Reads revealed letter slots on the active cracking screen.
   * Matches regex against an embedded offline dictionary of English words.
   * Displays matching words; player enters guess manually.
6. **Med-Out Calculator (`hospital.js`)**:
   * Reads Life bar percentage on active hospital/items view.
   * Runs local combinatorial algorithm to find minimum-cooldown medication mix.
   * Pure mathematical calculation; player uses items manually.
7. **Gym Happy Reset Timer (`gymTimer.js`)**:
   * Reads local system UTC time and Happy bar.
   * Displays client-side countdown timer to next `:00`, `:15`, `:30`, `:45` server tick.
