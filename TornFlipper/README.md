> 🧠 **Obsidian Hub**: [[_Brain/Projects/Torn|Torn]] · [[Antigravity/Torn/CONTEXT|Torn/CONTEXT.md]]

# TornFlipper: High-Frequency Market Scanner & Webhook Notifier

## 1. Project Overview & Vision
* **Tool Name**: `TornFlipper`
* **Purpose**: A standalone 24/7 background service in Python that continuously monitors high-liquidity item markets in [Torn.com](https://www.torn.com) via the official Torn API, identifies underpriced flipping opportunities using dual-anchor pricing, and instantly dispatches rich webhook alerts (Discord / Telegram) with direct 1-click buy links.
* **Execution Boundary**: Runs strictly outside the browser userscript to conserve active-play API quotas, prevent tab throttling, and operate as an autonomous daemon/service.

---

## 2. Strict Torn Rule Guardrails (Ban Prevention)
* **Zero Automation / No Auto-Buy**: TornFlipper **NEVER** executes purchase transactions. It is an alerting tool only. The human player clicks the link and manually presses "Buy" in their browser.
* **Official API Only**: All market queries route strictly through `https://api.torn.com/market/<itemID>?selections=bazaar,itemmarket&key=<API_KEY>`. Zero HTML scraping or unauthorized browser automation.
* **Rate-Limit Cushion**: Hard rate limit of 100 requests/minute is protected by a token-bucket sliding-window rate limiter locked at **80 calls/minute** max (default: 60-75 calls/min).

---

## 3. Market Pricing & Detection Heuristics

### A. Prioritized Whitelist & Tiered Polling
To avoid ghost alerts on fast-moving deals, polling frequency is tiered:
* **Tier 1 (High Velocity — every 4–6s)**:
  * Xanax (ID 206), Feathery Hotel Coupon (ID 366), Donator Pack (ID 283), Points Market.
  * Captures ultra-liquid deals within the 5–15 second window before bazaar campers sweep them.
* **Tier 2 (Medium Velocity — every 20–30s)**:
  * Energy Cans (Munster ID 532, Red Cow ID 533, Taurine Elite ID 534, Rockstar ID 535, X-MASS ID 554), First Aid Kits / Small First Aid, Medical Blood Bags.
* **Tier 3 (Batch Rotation — every 60–90s)**:
  * 11 Travel Plushies (Camel, Chamois, Jaguar, Lion, Monkey, Nessie, Panda, Red Fox, Stingray, Wolverine, Peep) & 8 Exotic Flowers.

### B. Dual-Anchor Pricing (Outlier & Anti-Manipulation)
A listing is flagged as a deal **only if** both criteria are met:
1. **Bazaar Median Anchor**: Listing price $\le \text{Median of top 3–5 active listings} \times (1 - \text{DiscountThreshold})$.
2. **Global Baseline Anchor**: Listing price $\le \text{Item Baseline Market Value} \times (1 - \text{DiscountThreshold})$.
   *(Prevents being tricked by seller flash manipulation where all top listings are fake).*

### C. Mugger Trap Heuristics
* If a listing has `quantity <= 3` and `discount >= 5%`, tag the alert with:
  `⚠️ HIGH MUG RISK — Check seller hospital/overseas status before buying!`
* Filter out single-unit non-profitable baits if configured.

### D. Alert Deduplication Cache
* LRU cache tracking `(item_id, seller_id, price)` with a 30-minute expiration window.
* Re-alerts only if the seller further reduces the price or if a previously seen listing reappears after being delisted.

---

## 4. Origin-Aware One-Click Buy Links
* **Bazaar Listings**:
  `https://www.torn.com/bazaar.php?userId=<sellerID>`
* **Item Market Listings**:
  `https://www.torn.com/imarket.php#/p=shop&step=shop&type=&searchitem=<itemID>`

---

## 5. System Architecture Blueprint

```text
TornFlipper/
├── config.example.json   # Configuration template (API key, webhooks, thresholds)
├── items.json            # Whitelisted item IDs categorized by polling tier
├── rate_limiter.py       # Sliding-window token bucket rate limiter (<= 80 req/min)
├── api_client.py         # Async Torn API client with error handling & backoff
├── analyzer.py           # Dual-anchor discount engine & mugger risk detection
├── cache.py              # In-memory alert deduplication with TTL
├── notifier.py           # Formats and sends Discord Webhook embeds
├── flipper.py            # Main async scheduler and orchestrator
├── tests/                # Comprehensive unit tests
│   ├── test_rate_limiter.py
│   ├── test_analyzer.py
│   ├── test_cache.py
│   └── test_notifier.py
├── requirements.txt      # aiohttp
└── README.md
```
