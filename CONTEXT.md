# Torn — Persistent Project Context
Part of [[_Brain/00-Master-Orchestrator-MOC|00-Master-Orchestrator-MOC]] · Hub Node: [[_Brain/Projects/Torn|Torn]]

## 1. Overview & Stack
- **Project**: Torn
- **Workspace**: `/Users/kiwi/Desktop/Developer/Antigravity/Torn`
- **Stack**: TypeScript / Web
- **Summary**: Active workspace in `Antigravity/Torn`.
- **Connected Guilds**: [[_Brain/Guilds/Guild-1-Frontend-UX|Guild-1-Frontend-UX]] · [[_Brain/Guilds/Guild-3-Engineering-Delivery|Guild-3-Engineering-Delivery]]

## 2. Project Knowledge Graph
- 8 linked docs → full index in [[_Brain/Projects/Torn|Torn hub]] (read on demand only)
- Code graph: `graphify-out/GRAPH_REPORT.md`


## 3. Working Memory & Recent Milestones
- 2026-11-04: Completed implementation of all 9 tickets for TornCore QoL Suite. 13 unit tests passing.
- 2026-11-04: Pushed repository to GitHub (`kiwicoder171/torn-core-suite`), published v1.0.1 with in-modal privacy guarantee.
- 2026-11-04: Published thread on Torn Forums (*Tools & Userscripts*).
- 2026-11-05: Re-organized repository into modular subfolders (`TornCore/` for userscript, prepared for `TornFlipper/`). Maintained root `dist/` mirror so live forum links remain operational.
- 2026-11-05: Shipped v1.1.0 milestone — fixed vault quick-fill deposit positioning directly above cash deposit row, overhauled Travel Agency profit matrix with hourly yield rankings and leaf-node DOM insertion. Synchronized TornFlipper Torn API v2 updates.


## 4. TornFlipper Backlog & Implementation Tickets
- [x] **TF-01**: Finalized architecture specification and guardrails in `TornFlipper/README.md`.
- [x] **TF-02**: Configuration templates & categorized item whitelist (`config.example.json`, `items.json`).
- [x] **TF-03**: Sliding-window token-bucket rate limiter enforcing $\le 80$ calls/min (`rate_limiter.py`).
- [x] **TF-04**: Async Torn API v1/v2 client with backoff and error recovery (`api_client.py`).
- [x] **TF-05**: Dual-anchor pricing engine & mugger trap heuristics (`analyzer.py`).
- [x] **TF-06**: In-memory alert deduplication cache with TTL (`cache.py`).
- [x] **TF-07**: Multi-platform webhook notifier with origin-aware direct buy links (`notifier.py`).
- [x] **TF-08**: Async multi-tier poller loop with graceful shutdown (`flipper.py`).
- [x] **TF-09**: Comprehensive unit tests covering rate limiter, analyzer, cache, and notifier (`tests/` — 13 passing).
