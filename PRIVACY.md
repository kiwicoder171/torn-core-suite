# Privacy Policy & Security Guarantee

**Last Updated:** November 2026

**TornCore QoL Suite** ("TornCore") is an open-source, client-side userscript designed for players of Torn City (https://www.torn.com). Your privacy and account security are our primary architectural principles.

---

## 1. What Data is Collected?
**None.** TornCore does not collect, record, or transmit any personal data, account credentials, gameplay patterns, or IP addresses to any external server.

---

## 2. API Key Storage & Handling
* **Local Storage Only**: If you choose to configure a Torn API key, it is stored strictly inside your browser's local sandbox (`localStorage` / Tampermonkey `GM_setValue`).
* **Direct Official Communication**: Your API key is used exclusively in direct HTTPS requests from your browser to the official Torn API endpoint:
  ```text
  https://api.torn.com/*
  ```
* **No Proxies or Relays**: TornCore does not operate any intermediate proxy server, cloud relay, webhook, or backend database. No third party ever sees your key.
* **Minimal Scope**: TornCore operates entirely with a **Public Access** key. You should never supply a Full Access key.

---

## 3. Third-Party Services & Telemetry
* **No Analytics**: TornCore does not include Google Analytics, Sentry, Mixpanel, or any tracking SDKs.
* **No External CDNs**: All logic, stylesheets, and wordlists are bundled directly into the standalone userscript. No external JavaScript files are loaded at runtime.
* **No Obfuscation**: The source code is 100% human-readable to allow full peer-review by the Torn community and Torn Staff.

---

## 4. Open-Source Transparency
The entire source code of TornCore is licensed under the MIT License and hosted on GitHub. You are free to inspect, verify, and audit every line of code before installing.
