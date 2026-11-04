> 🧠 **Obsidian Hub**: [[_Brain/Projects/Torn|Torn]] · [[Antigravity/Torn/CONTEXT|Torn/CONTEXT.md]]

# Torn Developer Suite

Collection of 100% rule-compliant tools, userscripts, and automation utilities for [Torn.com](https://www.torn.com).

---

## 📁 Projects in This Workspace

### 1. [TornCore](TornCore/) (In-Browser Userscript Suite)
* **Type**: Tampermonkey / Violentmonkey Userscript (`TornCore/dist/TornCore.user.js`)
* **Focus**: UI decluttering, zero-waste medical calculators, travel profit matrices, city item scanner, Crimes 2.0 word matcher, and vault quick-fill chips.
* **Status**: Live on Torn Forums (v1.0.1).
* **Direct Install**: [Click to install TornCore.user.js](https://raw.githubusercontent.com/kiwicoder171/torn-core-suite/main/TornCore/dist/TornCore.user.js)

### 2. [TornFlipper](TornFlipper/) (Market Deal Scanner — In Development)
* **Type**: Standalone Python / Node.js background service & Discord webhook bot.
* **Focus**: Monitors high-liquidity item markets (Xanax, FHC, Plushies, Cans), computes valid market median prices, and pings Discord when cheap flippable items are listed.
* **Specification**: See [TornFlipper/README.md](TornFlipper/README.md).

---

## 🛡 Torn Rule Guardrail Principles
All projects in this workspace strictly adhere to:
1. **1-to-1 Action Ratio**: Zero automated actions, no auto-buying.
2. **Official API Only**: No unauthorized page scraping.
3. **Conservative Rate Limiting**: Capped safely below 100 calls/min.
4. **Local Key Storage**: API keys are stored only on your machine and never leaked.
