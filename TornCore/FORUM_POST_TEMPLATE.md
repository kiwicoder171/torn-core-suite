> 🧠 **Obsidian Hub**: [[_Brain/Projects/Torn|Torn]] · [[Antigravity/Torn/CONTEXT|Torn/CONTEXT.md]]

# Torn Forum Thread Template (BBCode)

*Copy and paste the text below directly into a new thread in the **Tools & Userscripts** subforum on Torn.com:*

```bbcode
[center][size=5][b][color=#38bdf8]TornCore QoL Suite[/color] [color=#94a3b8]v1.0.2[/color][/b][/size]
[size=3][i]A clean, modular, 100% rule-compliant Quality-of-Life & calculation suite for Torn.[/i][/size][/center]

[hr]

[size=4][b]🛡 100% Rule-Compliant & Ban-Safe Guarantee[/b][/size]

Before anything else: [b]TornCore is strictly built to follow all Torn Automation & Scripting Rules and API Terms.[/b]
[list]
[*] [b]1-to-1 Action Ratio[/b]: TornCore [b]NEVER[/b] auto-clicks or submits actions for you. It only pre-fills quantity/deposit fields (e.g. $5M deposit or max plushies) so you only have to click once.
[*] [b]0 Non-API Requests[/b]: No background scraping of torn.com pages.
[*] [b]Active Tab Only[/b]: Zero execution on background/unfocused tabs.
[*] [b]Local API Storage Only[/b]: Your API key is stored 100% locally in your own browser's storage ([i]localStorage / Tampermonkey[/i]). It is never sent to any third party, webhook, or external server.
[*] [b]Public Key Only[/b]: Requires only a [b]Public Access[/b] key.
[*] [b]Safe Rate Limiting[/b]: Built-in sliding-window limiter capped at 80 calls/minute with local caching to stay well below the 100 calls/min limit.
[*] [b]Open Source[/b]: 100% unminified, human-readable code on GitHub.
[/list]

[hr]

[size=4][b]📦 Feature Breakdown[/b][/size]

[b]1. Vault & Faction Bank Quick-Fill Chips[/b]
Adds quick-click chips ([color=#34d399]+$1M, +$5M, +$10M, Max Cash, Keep $20k[/color]) above deposit inputs in your Property Vault and Faction Bank. Pre-fills the field without clicking deposit.

[b]2. Bazaar Open / Cash Exposure Alert[/b]
Flashes a prominent red warning banner across your header if your Bazaar is active while you are holding liquid cash over your chosen threshold (default $100k), preventing accidental buy-mugs.

[b]3. Travel Agency & Overseas Tarmac Suite[/b]
[list]
[*] [b]Travel Agency[/b]: Displays an estimated profit-per-hour matrix for plushies and flowers based on your flight capacity (up to 29 items).
[*] [b]Overseas Shop[/b]: Adds a [b]Max Buy[/b] chip that calculates [i]min(capacityRemaining, affordableQuantity)[/i] and pre-fills the input.
[/list]

[b]4. City Map Spawns Scanner[/b]
Inspects the city map DOM on [i]city.php[/i], adds an emerald glowing aura around hidden spawns, and gives you a top summary list with click-to-pan coordinates. (No auto-collection).

[b]5. Crimes 2.0 Cracking Word Matcher[/b]
Live regex pattern matcher that compares revealed characters against an embedded dictionary of known Torn cracking words. Shows candidate words right above the console.

[b]6. Zero-Waste Med-Out Calculator[/b]
When in hospital or viewing meds, it calculates the lowest-cooldown combination of Small First Aid, First Aid, and Morphine needed to reach 100% Life with zero surplus cooldown waste.

[b]7. 15-Minute Happy Reset Clock[/b]
On the Gym page, shows a live countdown to the next :00, :15, :30, or :45 TCT server tick. Warns you during Happy Jumps so your surplus Happy never resets before training!

[hr]

[size=4][b]⚙ Customizable Settings[/b][/size]
Every module can be toggled on or off individually! Look for the floating [b]⚙[/b] icon on the bottom-right of your screen or click the Tampermonkey extension menu to configure.

[hr]

[size=4][b]🚀 Installation[/b][/size]

[list=1]
[*] Install [url=https://www.tampermonkey.net/]Tampermonkey[/url] (Chrome, Firefox, Safari, Edge, or Kiwi Browser).
[*] Install the script directly:
[url=https://raw.githubusercontent.com/kiwicoder171/torn-core-suite/main/TornCore/dist/TornCore.user.js][b]👉 Click Here to Install TornCore.user.js[/b][/url]
[*] Navigate to Torn, open [b]Settings -> API Keys[/b], generate a [b]Public[/b] key, and paste it into TornCore's [b]⚙[/b] settings drawer.
[/list]

[b]GitHub Repository & Code Audit:[/b]
[url=https://github.com/kiwicoder171/torn-core-suite]https://github.com/kiwicoder171/torn-core-suite[/url]

[size=1][i]TornCore is an unofficial open-source fan project under the MIT License and complies with all Torn Scripting Guidelines.[/i][/size]
```
