# Project Handoff: TornFlipper (Market Deal Scanner & Webhook Notifier)

## 1. Project Overview & Vision
* **Tool Name**: `TornFlipper`
* **Purpose**: A standalone, 24/7 background service (Python or Node.js) that monitors high-liquidity item markets in [Torn.com](https://www.torn.com) via the official Torn API, identifies underpriced items suitable for flipping, and instantly dispatches rich webhook notifications (Discord / Telegram) with direct bazaar buy links.
* **Execution Boundary**: Must be a **separate standalone tool** (outside the browser userscript) to avoid exhausting in-browser API quotas and to comply strictly with Torn’s active-page rules.

---

## 2. Strict Torn Rule Guardrails (Ban Prevention)
* **Zero Automation**: TornFlipper **NEVER** executes buy actions automatically. It only detects deals and sends notifications. The human player clicks the link and manually presses "Buy" in their browser.
* **Official API Only**: All market queries route strictly through `https://api.torn.com/market/<itemID>?selections=bazaar,itemmarket`. Zero HTML page scraping.
* **Rate-Limit Enforcement**: Torn enforces a hard ceiling of 100 API calls/minute. TornFlipper must include an internal queue capped conservatively at **60–80 calls/minute** with variable polling intervals.
* **No Unfocused Browser Loops**: Operates entirely as a headless CLI/daemon script on the user's machine or cloud worker, not inside a hidden browser tab.

---

## 3. Market Pricing & Deal Detection Algorithm

### A. High-Liquidity Item Whitelist
To protect against market-manipulated junk items and low-volume traps, the scanner targets **only high-velocity goods**:
* **Drugs**: Xanax, Vicodin, Ecstasy
* **Energy Drinks**: Cans of Munster, Red Cow, Taurine Elite, Rockstar, X-MASS
* **Medical**: Feathery Hotel Coupons (FHC), Medical Packs, Blood Bags
* **Sets**: 11 Travel Plushies & 8 Exotic Flowers
* **Currency**: Points, Donator Packs

### B. "Valid Market Price" Calculation (Outlier-Proof)
1. Query active bazaar listings for a whitelisted item.
2. Filter out single-item bait listings (e.g. quantity = 1 at 50% discount used by muggers).
3. Compute the **Median Price** of the top 3–5 lowest active bazaar listings.
4. **Deal Trigger Condition**:
   $$\text{Price} \le \text{Median} \times (1 - \text{DiscountThreshold})$$
   *(Default: $\ge 3\%$ below market median AND potential total profit $\ge \$100,000$)*.

---

## 4. Architecture Blueprint

```text
torn-flipper/
├── config.json          // API key, Discord Webhook URL, min profit ($), poll interval
├── items.json           // Whitelist of target item IDs, names, and buy ceilings
├── flipper.py           // Core async poller + sliding-window rate limiter (≤80 calls/min)
├── analyzer.py          // Median price calculator + outlier/scam detection filter
├── notifier.py          // Formats and sends Discord Webhook embeds
├── requirements.txt     // requests / aiohttp
└── README.md            // Setup and usage guide
```

### Discord Notification Embed Example:
```text
🔔 DEAL DETECTED: Xanax
🏷 Price: $812,000 (Market Median: $838,000)
💰 Profit per unit: $26,000 (3.1% margin)
📦 Quantity: 40 units | Total Potential Profit: $1,040,000
👤 Seller: Heisenberg [1928374]
🔗 [Open Bazaar on Torn](https://www.torn.com/bazaar.php?userId=1928374)
```

---

## 5. Next Agent Implementation Plan
1. Scaffold Python project structure and create `config.example.json` and `items.json`.
2. Implement `api_client.py` with sliding-window rate limiter (hard cap at 80/min) and robust error handling.
3. Build `analyzer.py` to calculate true median market price and filter outliers.
4. Implement `notifier.py` with rich Discord Webhook embeds including one-click direct bazaar links.
5. Add unit tests verifying median calculations and rate-limiting queue.
