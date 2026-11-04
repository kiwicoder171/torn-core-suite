// ==UserScript==
// @name         TornCore QoL Suite
// @namespace    https://github.com/kiwicoder171/torn-core-suite
// @version      1.0.0
// @description  Unified, 100% rule-compliant Quality-of-Life & calculation suite for Torn.com
// @author       Kiwi
// @license      MIT
// @match        https://*.torn.com/*
// @match        https://torn.com/*
// @updateURL    https://raw.githubusercontent.com/kiwicoder171/torn-core-suite/main/dist/TornCore.user.js
// @downloadURL  https://raw.githubusercontent.com/kiwicoder171/torn-core-suite/main/dist/TornCore.user.js
// @supportURL   https://github.com/kiwicoder171/torn-core-suite/issues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  // --- Module: core/storage.js ---
  // Storage & Configuration Manager for TornCore Suite
  
  const STORAGE_KEY = 'torncore_settings';
  
  const DEFAULT_SETTINGS = {
    apiKey: '',
    enabledModules: {
      vault: true,
      bazaarGuard: true,
      travel: true,
      cityScanner: true,
      crimes: true,
      hospital: true,
      gymTimer: true,
    },
    vaultChips: [1000000, 5000000, 10000000], // $1M, $5M, $10M
    vaultKeepCash: 20000, // Keep $20k
    bazaarCashThreshold: 100000, // $100k
    travelCarryCapacity: 29, // 15 + 10 suitcase + 4 perks
  };
  
  function getRaw(key) {
    try {
      if (typeof GM_getValue !== 'undefined') {
        return GM_getValue(key, null);
      }
      return localStorage.getItem(key);
    } catch (e) {
      return localStorage.getItem(key);
    }
  }
  
  function setRaw(key, val) {
    try {
      if (typeof GM_setValue !== 'undefined') {
        GM_setValue(key, val);
        return;
      }
      localStorage.setItem(key, val);
    } catch (e) {
      localStorage.setItem(key, val);
    }
  }
  
  function loadSettings() {
    const raw = getRaw(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        enabledModules: {
          ...DEFAULT_SETTINGS.enabledModules,
          ...(parsed.enabledModules || {}),
        },
      };
    } catch (e) {
      console.error('[TornCore] Error reading settings:', e);
      return { ...DEFAULT_SETTINGS };
    }
  }
  
  function saveSettings(settings) {
    setRaw(STORAGE_KEY, JSON.stringify(settings));
  }
  
  function isModuleEnabled(moduleName) {
    const s = loadSettings();
    return s.enabledModules[moduleName] !== false;
  }
  
  // --- Module: core/api.js ---
  // Rate-Limited Torn API Client with Sliding-Window Protection & TTL Cache
  
  const CACHE_PREFIX = 'torncore_api_cache_';
  const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
  const MAX_CALLS_PER_WINDOW = 80; // Conservative buffer under Torn's 100/min limit
  
  let callTimestamps = [];
  
  function checkRateLimit() {
    const now = Date.now();
    callTimestamps = callTimestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    return callTimestamps.length < MAX_CALLS_PER_WINDOW;
  }
  
  function recordCall() {
    callTimestamps.push(Date.now());
  }
  
  function getCached(key) {
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const { timestamp, ttl, data } = JSON.parse(raw);
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  }
  
  function setCached(key, data, ttlMs = 5 * 60 * 1000) {
    try {
      const payload = {
        timestamp: Date.now(),
        ttl: ttlMs,
        data,
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(payload));
    } catch (e) {
      console.warn('[TornCore] LocalStorage cache write failed:', e);
    }
  }
  
  /**
   * Fetch from Torn API with caching and rate limiting
   * @param {string} endpoint e.g. 'user', 'torn', 'market'
   * @param {string} selections e.g. 'bars,profile' or 'items'
   * @param {number} ttlMs Cache duration in milliseconds (default: 5 min)
   * @param {string} id Optional target ID
   */
  async function fetchTornApi(endpoint, selections = '', ttlMs = 5 * 60 * 1000, id = '') {
    const settings = loadSettings();
    const apiKey = settings.apiKey?.trim();
  
    if (!apiKey) {
      return { error: { code: 2, error: 'No API key configured in TornCore settings' } };
    }
  
    const cacheKey = `${endpoint}_${id}_${selections}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return cached;
    }
  
    if (!checkRateLimit()) {
      console.warn('[TornCore] Rate limit safeguard engaged (>80 calls/min). Request throttled.');
      return { error: { code: -1, error: 'TornCore client rate-limit engaged to protect account' } };
    }
  
    try {
      recordCall();
      const url = `https://api.torn.com/${endpoint}/${id}?selections=${encodeURIComponent(selections)}&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} from Torn API`);
      }
      const json = await response.json();
      if (json.error) {
        console.warn('[TornCore] Torn API returned error:', json.error);
        return json;
      }
  
      setCached(cacheKey, json, ttlMs);
      return json;
    } catch (err) {
      console.error('[TornCore] Fetch error:', err);
      return { error: { code: -2, error: err.message } };
    }
  }
  
  // --- Module: core/router.js ---
  // URL Router & Dynamic Page Observer for Torn.com
  
  class TornRouter {
    constructor() {
      this.routes = [];
      this.currentHref = window.location.href;
      this.observer = null;
    }
  
    /**
     * Register a module handler
     * @param {string} id Unique identifier for the module
     * @param {RegExp|Function} pattern RegExp to match against window.location.href, or matcher function
     * @param {Function} handler Callback to run when page matches
     */
    register(id, pattern, handler) {
      this.routes.push({ id, pattern, handler, active: false });
    }
  
    matches(pattern) {
      const href = window.location.href;
      if (pattern instanceof RegExp) {
        return pattern.test(href);
      }
      if (typeof pattern === 'function') {
        return pattern(href, window.location);
      }
      return href.includes(pattern);
    }
  
    evaluate() {
      for (const route of this.routes) {
        if (!isModuleEnabled(route.id)) continue;
  
        if (this.matches(route.pattern)) {
          try {
            route.handler();
          } catch (err) {
            console.error(`[TornCore] Error in module [${route.id}]:`, err);
          }
        }
      }
    }
  
    start() {
      // Initial run
      this.evaluate();
  
      // Monitor for URL changes (HTML5 History API + Hash changes)
      let lastUrl = window.location.href;
      const checkUrlChange = () => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          setTimeout(() => this.evaluate(), 250);
        }
      };
  
      window.addEventListener('popstate', checkUrlChange);
      window.addEventListener('hashchange', checkUrlChange);
  
      // Observe body for dynamically loaded Torn AJAX containers
      let debounceTimer = null;
      this.observer = new MutationObserver((mutations) => {
        checkUrlChange();
        // Debounce re-evaluations on significant DOM tree mutations
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.evaluate();
        }, 400);
      });
  
      if (document.body) {
        this.observer.observe(document.body, { childList: true, subtree: true });
      } else {
        window.addEventListener('DOMContentLoaded', () => {
          this.observer.observe(document.body, { childList: true, subtree: true });
        });
      }
    }
  }
  
  const router = new TornRouter();
  
  // --- Module: core/ui.js ---
  // UI Components, Modal Settings, and Consistent Theme Styles for TornCore Suite
  
  const STYLES = `
  /* TornCore Design System */
  .torncore-chip-container {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 6px 0;
    align-items: center;
  }
  
  .torncore-chip {
    background: rgba(35, 41, 55, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #e2e8f0;
    border-radius: 4px;
    padding: 3px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
  
  .torncore-chip:hover {
    background: rgba(59, 130, 246, 0.25);
    border-color: rgba(96, 165, 250, 0.5);
    color: #ffffff;
    transform: translateY(-1px);
  }
  
  .torncore-chip:active {
    transform: translateY(0);
  }
  
  .torncore-chip.accent {
    background: rgba(16, 185, 129, 0.2);
    border-color: rgba(52, 211, 153, 0.4);
    color: #6ee7b7;
  }
  
  .torncore-chip.accent:hover {
    background: rgba(16, 185, 129, 0.35);
    border-color: rgba(52, 211, 153, 0.7);
    color: #a7f3d0;
  }
  
  .torncore-banner-alert {
    background: linear-gradient(90deg, rgba(220, 38, 38, 0.92) 0%, rgba(185, 28, 28, 0.95) 100%);
    color: #ffffff;
    border-bottom: 2px solid #f87171;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.3px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    z-index: 99999;
  }
  
  .torncore-card {
    background: #1f2430;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 10px 14px;
    margin: 10px 0;
    color: #cbd5e1;
    font-size: 12px;
  }
  
  .torncore-card-header {
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding-bottom: 4px;
  }
  
  /* Floating Settings Button */
  #torncore-menu-btn {
    position: fixed;
    bottom: 72px;
    right: 20px;
    z-index: 999999;
    background: #0f172a;
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 50%;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    transition: all 0.2s;
    font-size: 14px;
  }
  
  #torncore-menu-btn:hover {
    background: #1e293b;
    color: #f8fafc;
    border-color: rgba(96, 165, 250, 0.5);
    transform: scale(1.05);
  }
  
  /* Modal Overlay */
  .torncore-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 1000000;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .torncore-modal {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    width: 440px;
    max-width: 90vw;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    color: #e2e8f0;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  }
  
  .torncore-modal-head {
    padding: 14px 18px;
    background: #1e293b;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .torncore-modal-title {
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
  }
  
  .torncore-modal-body {
    padding: 16px 18px;
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .torncore-form-group {
    margin-bottom: 14px;
  }
  
  .torncore-form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 4px;
  }
  
  .torncore-input {
    width: 100%;
    box-sizing: border-box;
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    padding: 7px 10px;
    color: #f8fafc;
    font-size: 13px;
    outline: none;
  }
  
  .torncore-input:focus {
    border-color: #3b82f6;
  }
  
  .torncore-checkbox-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
  
  .torncore-checkbox-row span {
    font-size: 13px;
    color: #cbd5e1;
  }
  
  .torncore-btn {
    background: #2563eb;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  
  .torncore-btn:hover {
    background: #1d4ed8;
  }
  
  .torncore-btn-secondary {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #cbd5e1;
  }
  `;
  
  function injectGlobalStyles() {
    if (document.getElementById('torncore-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'torncore-styles';
    styleEl.textContent = STYLES;
    (document.head || document.documentElement).appendChild(styleEl);
  }
  
  function initSettingsUI() {
    injectGlobalStyles();
    if (document.getElementById('torncore-menu-btn')) return;
  
    const btn = document.createElement('div');
    btn.id = 'torncore-menu-btn';
    btn.title = 'TornCore Suite Settings';
    btn.innerHTML = '⚙';
    btn.onclick = openSettingsModal;
    document.body.appendChild(btn);
  }
  
  function openSettingsModal() {
    const existing = document.getElementById('torncore-modal-overlay');
    if (existing) existing.remove();
  
    const settings = loadSettings();
  
    const overlay = document.createElement('div');
    overlay.id = 'torncore-modal-overlay';
    overlay.className = 'torncore-modal-overlay';
  
    const modal = document.createElement('div');
    modal.className = 'torncore-modal';
  
    const modules = [
      { key: 'vault', label: 'Vault Quick-Fill Chips' },
      { key: 'bazaarGuard', label: 'Bazaar Open / Cash Guard' },
      { key: 'travel', label: 'Travel Profit & Tarmac Max-Fill' },
      { key: 'cityScanner', label: 'City Map Item Scanner' },
      { key: 'crimes', label: 'Crimes 2.0 Cracking Matcher' },
      { key: 'hospital', label: 'Zero-Waste Med-Out Calculator' },
      { key: 'gymTimer', label: 'Gym 15-Minute Happy Reset Timer' },
    ];
  
    let moduleCheckboxes = modules
      .map(
        (m) => `
      <div class="torncore-checkbox-row">
        <span>${m.label}</span>
        <input type="checkbox" id="torncore-toggle-${m.key}" ${settings.enabledModules[m.key] !== false ? 'checked' : ''} />
      </div>
    `
      )
      .join('');
  
    modal.innerHTML = `
      <div class="torncore-modal-head">
        <span class="torncore-modal-title">⚙ TornCore QoL Suite Settings</span>
        <span style="cursor:pointer; color:#94a3b8; font-size:16px;" id="torncore-modal-close">&times;</span>
      </div>
      <div class="torncore-modal-body">
        <div class="torncore-form-group">
          <label>Torn API Key (Public/Minimal Access)</label>
          <input type="password" id="torncore-api-key" class="torncore-input" value="${settings.apiKey || ''}" placeholder="Enter 16-character Torn API key" />
          <small style="color:#64748b; font-size:11px; display:block; margin-top:3px;">
            Stored locally in your browser. Used for safe profile & item checks.
          </small>
        </div>
  
        <div class="torncore-form-group">
          <label>Bazaar Cash Risk Threshold ($)</label>
          <input type="number" id="torncore-bazaar-threshold" class="torncore-input" value="${settings.bazaarCashThreshold || 100000}" />
        </div>
  
        <div class="torncore-form-group">
          <label>Travel Max Carry Capacity</label>
          <input type="number" id="torncore-travel-capacity" class="torncore-input" value="${settings.travelCarryCapacity || 29}" />
        </div>
  
        <div style="font-weight:700; color:#f8fafc; font-size:12px; margin: 12px 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px;">
          Active Modules
        </div>
        ${moduleCheckboxes}
  
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
          <button id="torncore-save-btn" class="torncore-btn">Save Changes</button>
        </div>
      </div>
    `;
  
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  
    document.getElementById('torncore-modal-close').onclick = () => overlay.remove();
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };
  
    document.getElementById('torncore-save-btn').onclick = () => {
      const updated = loadSettings();
      updated.apiKey = document.getElementById('torncore-api-key').value.trim();
      updated.bazaarCashThreshold = parseInt(document.getElementById('torncore-bazaar-threshold').value, 10) || 100000;
      updated.travelCarryCapacity = parseInt(document.getElementById('torncore-travel-capacity').value, 10) || 29;
  
      for (const m of modules) {
        const el = document.getElementById(`torncore-toggle-${m.key}`);
        if (el) updated.enabledModules[m.key] = el.checked;
      }
  
      saveSettings(updated);
      overlay.remove();
    };
  }
  
  // --- Module: modules/vault.js ---
  // Vault & Faction Bank Quick-Fill Deposit Chips
  
  function getLiquidCash() {
    // Check common Torn top-bar money elements
    const moneyEl = document.querySelector('#user-money, [data-money], .money___vgW');
    if (moneyEl) {
      const raw = moneyEl.getAttribute('data-money') || moneyEl.textContent;
      const clean = raw.replace(/[^0-9]/g, '');
      const num = parseInt(clean, 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  }
  
  function formatMoney(amount) {
    if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
    if (amount >= 1e6) return `$${(amount / 1e6).toFixed(0)}M`;
    if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}k`;
    return `$${amount.toLocaleString()}`;
  }
  
  function setInputValue(input, val) {
    input.value = val;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
  }
  
  function initVaultHelper() {
    // Target deposit inputs on property vault and faction bank
    const depositInputs = document.querySelectorAll(
      'input[name="deposit"], input[id*="deposit" i], input[placeholder*="deposit" i], .deposit-box input'
    );
  
    depositInputs.forEach((input) => {
      // Avoid double injection
      if (input.parentElement.querySelector('.torncore-vault-chips')) return;
  
      const settings = loadSettings();
      const chipsContainer = document.createElement('div');
      chipsContainer.className = 'torncore-chip-container torncore-vault-chips';
  
      const currentCash = getLiquidCash();
  
      // Standard increment chips
      settings.vaultChips.forEach((amount) => {
        const chip = document.createElement('span');
        chip.className = 'torncore-chip';
        chip.textContent = `+${formatMoney(amount)}`;
        chip.title = `Pre-fill ${amount.toLocaleString()}`;
        chip.onclick = (e) => {
          e.preventDefault();
          const currentVal = parseInt(input.value.replace(/[^0-9]/g, ''), 10) || 0;
          setInputValue(input, currentVal + amount);
        };
        chipsContainer.appendChild(chip);
      });
  
      // Max Cash chip
      const maxChip = document.createElement('span');
      maxChip.className = 'torncore-chip accent';
      maxChip.textContent = 'Max Cash';
      maxChip.title = 'Pre-fill all liquid cash in hand';
      maxChip.onclick = (e) => {
        e.preventDefault();
        const cash = getLiquidCash();
        if (cash > 0) setInputValue(input, cash);
      };
      chipsContainer.appendChild(maxChip);
  
      // Keep $20k chip
      const keepChip = document.createElement('span');
      keepChip.className = 'torncore-chip';
      const keepAmount = settings.vaultKeepCash || 20000;
      chipFormatKeep();
  
      function chipFormatKeep() {
        keepChip.textContent = `Keep ${formatMoney(keepAmount)}`;
        keepChip.title = `Pre-fill cash minus ${formatMoney(keepAmount)}`;
        keepChip.onclick = (e) => {
          e.preventDefault();
          const cash = getLiquidCash();
          const depositVal = Math.max(0, cash - keepAmount);
          setInputValue(input, depositVal);
        };
      }
      chipsContainer.appendChild(keepChip);
  
      // Insert directly before or after input
      input.parentNode.insertBefore(chipsContainer, input);
    });
  }
  
  // --- Module: modules/bazaarGuard.js ---
  // Bazaar Cash Guard: Alerts when Bazaar is Open and holding liquid cash
  
  
  let dismissedThisSession = false;
  
  function getLiquidCash() {
    const moneyEl = document.querySelector('#user-money, [data-money], .money___vgW');
    if (moneyEl) {
      const raw = moneyEl.getAttribute('data-money') || moneyEl.textContent;
      const clean = raw.replace(/[^0-9]/g, '');
      const num = parseInt(clean, 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  }
  
  async function checkBazaarExposure() {
    if (dismissedThisSession) return;
    if (document.getElementById('torncore-bazaar-alert')) return;
  
    const settings = loadSettings();
    const threshold = settings.bazaarCashThreshold || 100000;
    const cash = getLiquidCash();
  
    if (cash < threshold) return;
  
    // 1. Check if DOM reveals bazaar state
    const bazaarLink = document.querySelector('a[href*="bazaar.php"]');
    let isBazaarOpen = false;
  
    // 2. If API Key is present, query cached user profile (cached for 2 min)
    if (settings.apiKey) {
      const data = await fetchTornApi('user', 'profile,bars', 2 * 60 * 1000);
      if (data && data.bazaar_open) {
        isBazaarOpen = true;
      }
    } else if (bazaarLink && (bazaarLink.classList.contains('active') || bazaarLink.textContent.includes('Open'))) {
      isBazaarOpen = true;
    }
  
    if (isBazaarOpen) {
      injectAlertBanner(cash);
    }
  }
  
  function injectAlertBanner(cash) {
    if (document.getElementById('torncore-bazaar-alert')) return;
  
    const banner = document.createElement('div');
    banner.id = 'torncore-bazaar-alert';
    banner.className = 'torncore-banner-alert';
    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <span style="font-size:16px;">🚨</span>
        <span>
          <strong>HIGH BUY-MUG RISK:</strong> Your Bazaar is <strong>OPEN</strong> while holding 
          <span style="text-decoration:underline;">$${cash.toLocaleString()}</span> in cash!
        </span>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <a href="https://www.torn.com/properties.php#/p=options&tab=vault" style="background:#ffffff; color:#991b1b; padding:4px 10px; border-radius:4px; font-weight:700; text-decoration:none; font-size:11px;">
          Go to Vault
        </a>
        <span id="torncore-bazaar-dismiss" style="cursor:pointer; padding:2px 8px; font-size:16px; opacity:0.8;">&times;</span>
      </div>
    `;
  
    document.body.prepend(banner);
  
    const dismissBtn = document.getElementById('torncore-bazaar-dismiss');
    if (dismissBtn) {
      dismissBtn.onclick = () => {
        dismissedThisSession = true;
        banner.remove();
      };
    }
  }
  
  // --- Module: modules/travel.js ---
  // Travel Agency Profit Matrix & Overseas Tarmac Max-Fill Helper
  
  // Standard round-trip flight times (minutes) without/with Airstrip & WLT
  const DESTINATIONS = [
    { name: 'Mexico', flightMin: 18, highProfitItem: 'Jaguar Plushie', avgProfitPerItem: 7500 },
    { name: 'Cayman Islands', flightMin: 25, highProfitItem: 'Banana Orchid', avgProfitPerItem: 9200 },
    { name: 'Canada', flightMin: 29, highProfitItem: 'Wolverine Plushie', avgProfitPerItem: 8300 },
    { name: 'Hawaii', flightMin: 94, highProfitItem: 'Tsarina Orchid', avgProfitPerItem: 12000 },
    { name: 'United Kingdom', flightMin: 111, highProfitItem: 'Red Fox Plushie', avgProfitPerItem: 38000 },
    { name: 'Argentina', flightMin: 117, highProfitItem: 'Ceibo Flower', avgProfitPerItem: 22000 },
    { name: 'Switzerland', flightMin: 123, highProfitItem: 'Chamois Plushie', avgProfitPerItem: 36000 },
    { name: 'Japan', flightMin: 158, highProfitItem: 'Cherry Blossom', avgProfitPerItem: 48000 },
    { name: 'China', flightMin: 169, highProfitItem: 'Panda Plushie', avgProfitPerItem: 55000 },
    { name: 'UAE', flightMin: 190, highProfitItem: 'Camel Plushie', avgProfitPerItem: 85000 },
    { name: 'South Africa', flightMin: 208, highProfitItem: 'Lion Plushie', avgProfitPerItem: 68000 },
  ];
  
  function getLiquidCash() {
    const moneyEl = document.querySelector('#user-money, [data-money], .money___vgW');
    if (moneyEl) {
      const raw = moneyEl.getAttribute('data-money') || moneyEl.textContent;
      const clean = raw.replace(/[^0-9]/g, '');
      const num = parseInt(clean, 10);
      if (!isNaN(num)) return num;
    }
    return 0;
  }
  
  function initTravelSuite() {
    const href = window.location.href;
  
    if (href.includes('travelagency.php')) {
      renderTravelAgencyProfits();
    }
  
    if (href.includes('page=travel') || href.includes('index.php')) {
      initOverseasShopHelper();
    }
  }
  
  function renderTravelAgencyProfits() {
    if (document.getElementById('torncore-travel-card')) return;
  
    const targetContainer = document.querySelector('.travel-agency-container, .content-wrapper, #travel-root');
    if (!targetContainer) return;
  
    const settings = loadSettings();
    const capacity = settings.travelCarryCapacity || 29;
  
    const card = document.createElement('div');
    card.id = 'torncore-travel-card';
    card.className = 'torncore-card';
  
    let rows = DESTINATIONS.map((d) => {
      const totalProfit = d.avgProfitPerItem * capacity;
      const roundTripMin = d.flightMin * 2;
      const profitPerHour = Math.round((totalProfit / roundTripMin) * 60);
  
      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05); text-align:left;">
          <td style="padding:4px 6px; font-weight:600; color:#f1f5f9;">${d.name}</td>
          <td style="padding:4px 6px; color:#94a3b8;">${d.highProfitItem}</td>
          <td style="padding:4px 6px; color:#94a3b8;">${d.flightMin}m (one-way)</td>
          <td style="padding:4px 6px; color:#34d399; font-weight:600;">$${totalProfit.toLocaleString()}</td>
          <td style="padding:4px 6px; color:#60a5fa; font-weight:700;">$${profitPerHour.toLocaleString()}/hr</td>
        </tr>
      `;
    }).join('');
  
    card.innerHTML = `
      <div class="torncore-card-header">
        <span>✈ Travel Agency Estimated Flight Profit (${capacity} Items Capacity)</span>
        <span style="font-size:10px; color:#94a3b8;">Estimates based on plushie/flower sets</span>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; font-size:11px; border-collapse:collapse;">
          <thead>
            <tr style="color:#64748b; border-bottom:1px solid rgba(255,255,255,0.1); text-align:left;">
              <th style="padding:4px 6px;">Country</th>
              <th style="padding:4px 6px;">Target Item</th>
              <th style="padding:4px 6px;">Flight</th>
              <th style="padding:4px 6px;">Roundtrip Net</th>
              <th style="padding:4px 6px;">Hourly Yield</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  
    targetContainer.prepend(card);
  }
  
  function initOverseasShopHelper() {
    // Check if we are at an overseas item market/shop
    const itemRows = document.querySelectorAll('.itemRow___, .item-list li, tr[data-item], .item-row');
    if (!itemRows.length) return;
  
    const settings = loadSettings();
    const maxCapacity = settings.travelCarryCapacity || 29;
    const cashOnHand = getLiquidCash();
  
    itemRows.forEach((row) => {
      if (row.querySelector('.torncore-max-buy')) return;
  
      const input = row.querySelector('input[type="number"], input.amount, input[name*="amount"]');
      if (!input) return;
  
      // Try finding price
      const priceText = row.querySelector('.cost, .price, [class*="price"]')?.textContent || '0';
      const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 1;
  
      const maxAffordable = Math.floor(cashOnHand / price);
      const fillAmount = Math.min(maxCapacity, maxAffordable);
  
      const btn = document.createElement('span');
      btn.className = 'torncore-chip accent torncore-max-buy';
      btn.textContent = `Max (${fillAmount})`;
      btn.title = `Pre-fill ${fillAmount} (Cap: ${maxCapacity}, Cash: $${cashOnHand.toLocaleString()})`;
      btn.onclick = (e) => {
        e.preventDefault();
        input.value = fillAmount;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.focus();
      };
  
      input.parentNode.appendChild(btn);
    });
  }
  
  // --- Module: modules/cityScanner.js ---
  // City Map Item Scanner: Highlights hidden items on torn.com/city.php
  
  function initCityScanner() {
    if (!window.location.href.includes('city.php')) return;
  
    // Give Leaflet map a brief moment to render markers
    setTimeout(() => scanCityMap(), 500);
  }
  
  function scanCityMap() {
    // Torn city map markers are rendered inside Leaflet marker panes
    const markerPane = document.querySelector('.leaflet-marker-pane, #map');
    if (!markerPane) return;
  
    // Filter for item icons (Torn item icons usually have item IDs or images in /images/items/)
    const itemMarkers = markerPane.querySelectorAll('img[src*="/items/"], .leaflet-marker-icon[src*="items"], [data-item-id]');
    
    if (itemMarkers.length === 0) return;
  
    // Check if summary card already exists
    let card = document.getElementById('torncore-city-items-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'torncore-city-items-card';
      card.className = 'torncore-card';
      card.style.position = 'relative';
      card.style.zIndex = '1000';
  
      const cityContainer = document.querySelector('.content-wrapper, #city-root, .city-box');
      if (cityContainer) {
        cityContainer.prepend(card);
      }
    }
  
    const itemsFound = [];
  
    itemMarkers.forEach((marker, idx) => {
      // Add pulsing glow around map item
      marker.style.outline = '3px solid #10b981';
      marker.style.borderRadius = '50%';
      marker.style.boxShadow = '0 0 14px #10b981, inset 0 0 8px #10b981';
      marker.style.filter = 'drop-shadow(0 0 6px #34d399)';
  
      const itemName = marker.getAttribute('title') || marker.getAttribute('alt') || `Item #${idx + 1}`;
      itemsFound.push({ name: itemName, element: marker });
    });
  
    card.innerHTML = `
      <div class="torncore-card-header">
        <span style="color:#34d399;">📍 Hidden City Items Found (${itemsFound.length})</span>
        <span style="font-size:10px; color:#94a3b8;">Click an item to highlight on map</span>
      </div>
      <div class="torncore-chip-container">
        ${itemsFound
          .map(
            (item, i) => `
          <span class="torncore-chip accent" data-index="${i}">
            🔍 ${item.name}
          </span>
        `
          )
          .join('')}
      </div>
    `;
  
    // Add click to focus on map marker
    card.querySelectorAll('.torncore-chip').forEach((chip) => {
      chip.onclick = () => {
        const idx = parseInt(chip.getAttribute('data-index'), 10);
        const target = itemsFound[idx]?.element;
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          target.style.transition = 'transform 0.3s ease';
          target.style.transform = 'scale(1.8)';
          setTimeout(() => {
            target.style.transform = 'scale(1)';
          }, 800);
        }
      };
    });
  }
  
  // --- Module: modules/crimes.js ---
  // Crimes 2.0 Cracking Word Matcher & Sub-Crime Advice Overlay
  
  // Curated Torn Cracking Wordlist (lengths 4 - 12)
  const TORN_CRACKING_DICTIONARY = [
    // 4 letters
    'BANK', 'BOMB', 'CASH', 'COIN', 'COLD', 'DARK', 'DOOR', 'FIRE', 'GOLD', 'HACK', 'HERO', 'IRON', 'JAIL', 'KILL', 'LOCK', 'LOOT', 'MASK', 'MINE', 'OPEN', 'PASS', 'SAFE', 'SHOT', 'SWAT', 'TRAP', 'VAULT', 'WIRE',
    // 5 letters
    'AGENT', 'ALARM', 'ALERT', 'ARMOR', 'BLADE', 'BOUNTY', 'BRAIN', 'BRUTE', 'BURGLAR', 'CIPHER', 'CLOAK', 'CRIME', 'DEATH', 'DRUGS', 'ENEMY', 'FIGHT', 'FORCE', 'FRAUD', 'GHOST', 'GUARD', 'HEIST', 'KNIFE', 'LASER', 'MONEY', 'NINJA', 'PISTOL', 'POWER', 'RADAR', 'REBEL', 'RIFLE', 'ROGUE', 'SECRET', 'SHADOW', 'SMOKE', 'SNIPER', 'STEAL', 'THIEF', 'TRACK', 'UNDER', 'VIRUS', 'WATCH',
    // 6 letters
    'ATTACK', 'BULLET', 'CAMERA', 'CASINO', 'COMBAT', 'COPTER', 'CORRUPT', 'CREDIT', 'CYBER', 'DAMAGE', 'DANGER', 'DEPUTY', 'DOLLAR', 'ESCAPE', 'FELONY', 'FORGER', 'FROZEN', 'GANGS', 'HACKER', 'HIJACK', 'HUNTER', 'ILLEGAL', 'IMPACT', 'JAILER', 'LEADER', 'LETHAL', 'MEDICS', 'MURDER', 'OFFICE', 'OUTLAW', 'PATROL', 'PHANTOM', 'PRISON', 'RANSOM', 'RESCUE', 'REVENGE', 'ROBBER', 'ROCKET', 'RUNNER', 'SAFETY', 'SCOUTS', 'SECRET', 'SERIAL', 'SERVER', 'SHADOW', 'SHIELD', 'SILENT', 'SNIPER', 'STEALTH', 'STRIKE', 'SYSTEM', 'TARGET', 'THREAT', 'TRACER', 'VICTIM', 'WARRIOR', 'WEAPON',
    // 7 letters
    'ARSENAL', 'ASSAULT', 'BANDITS', 'BATTERY', 'BOMBING', 'BURGLARY', 'CAPTURE', 'CHOPPER', 'COMMAND', 'CONSPIR', 'COUNTER', 'CRACKER', 'CRIMINAL', 'DEFENSE', 'DESTROY', 'DIGITAL', 'DYNAMITE', 'ESPIONAGE', 'EXPLODE', 'FACTION', 'FIREARM', 'FORGERY', 'GANGSTER', 'GRENADE', 'HOSTAGE', 'JUSTICE', 'KIDNAPPING', 'LOCKPICK', 'MACHINE', 'MANSION', 'MILITIA', 'MISSION', 'NETWORK', 'OFFICER', 'OUTLAWS', 'PAYROLL', 'PURSUIT', 'RADICAL', 'RAIDERS', 'RANSOMS', 'ROBBERY', 'ROCKETS', 'SECURITY', 'SMUGGLE', 'SOLDIER', 'SPECIAL', 'STALKER', 'STEALTH', 'TACTICAL', 'TERROR', 'TRACKER', 'TRIGGER', 'TROUBLE', 'VANDAL', 'VIOLENT', 'WARFARE', 'WITNESS',
    // 8 letters
    'ALLIANCE', 'AMBUSHED', 'ASSASSIN', 'BLACKMAIL', 'BREAKOUT', 'CASUALTY', 'COERCION', 'CRITICAL', 'CYBERNET', 'DEADLOCK', 'DISASTER', 'DISGUISE', 'EXPLOSION', 'EXTORTION', 'FIGHTERS', 'FIREWALL', 'FORENSIC', 'FUGITIVE', 'HANDCUFF', 'HEAVYARM', 'INCIDENT', 'INTRUDER', 'INVASION', 'LOCKDOWN', 'MASTERY', 'MERCENARY', 'OFFENDER', 'OVERKILL', 'PARANOIA', 'PASSWORD', 'PROTOCOL', 'REACTION', 'REVOLVER', 'RUNAWAYS', 'SABOTAGE', 'SENTINEL', 'SHOTGUNS', 'SHUTDOWN', 'SMUGGLER', 'SURVIVAL', 'SUSPECTS', 'SYNDICATE', 'TACTICAL', 'TERMINAL', 'TERRORIST', 'TREASURY', 'TRESPASS', 'UNDERDOG', 'VANDALISM', 'WARRIORS',
    // 9 letters
    'AMBULANCE', 'ARRESTING', 'AUTONOMOUS', 'BLACKMAIL', 'CASUALTIES', 'CONFIDENTIAL', 'CONVICTION', 'CONVICTED', 'CORRUPTION', 'CRACKDOWN', 'DETECTIVE', 'ENCRYPTION', 'EXECUTION', 'EXPLOSIVE', 'FIREARMS', 'GANGSTERS', 'HARDDRIVE', 'INFILTRATE', 'INTERCEPT', 'INVESTIGATE', 'MERCENARY', 'MILITARY', 'NIGHTSTICK', 'OBSERVERS', 'ORGANIZED', 'PARALYZED', 'PUNISHMENT', 'REVOLUTION', 'SANCTION', 'SATELLITE', 'SECURITY', 'TERRORISM', 'VIGILANTE', 'VIOLATION',
    // 10 letters
    'BLACKMARKET', 'BREAKTHROUGH', 'CONSPIRACY', 'CONTROLLED', 'CRIMINALITY', 'CYBERSPACE', 'DESTRUCTION', 'DISPATCHED', 'DOMINATION', 'EXPLOSIVES', 'EXTINCTION', 'INFILTRATOR', 'INTERROGATOR', 'LOCKSMITHS', 'MANSLAUGHTER', 'PATROLLING', 'PUNISHABLE', 'RESISTANCE', 'RETALIATION', 'SURVEILLANCE', 'TERMINATED', 'VULNERABLE'
  ];
  
  /**
   * Filter dictionary matching a known pattern, e.g. "C _ M P _ T _ R" -> regex /^C.MP.T.R$/i
   */
  function matchCrackingWords(pattern) {
    if (!pattern) return [];
    const clean = pattern.replace(/\s+/g, '');
    const regexStr = '^' + clean.replace(/_/g, '.') + '$';
    const regex = new RegExp(regexStr, 'i');
    return TORN_CRACKING_DICTIONARY.filter(word => regex.test(word));
  }
  
  function initCrimesHelper() {
    const crimesRoot = document.querySelector('#crimes-root, .crimes-app, .crimes-container');
    if (!crimesRoot) return;
  
    detectCrackingModule(crimesRoot);
    injectSubcrimeGuide(crimesRoot);
  }
  
  function detectCrackingModule(root) {
    // Look for cracking letter cells
    const letterCells = root.querySelectorAll('.character-input, .character___, .letter___, [class*="character"]');
    if (!letterCells || letterCells.length === 0) return;
  
    // Build pattern
    let pattern = '';
    letterCells.forEach(cell => {
      const text = cell.textContent.trim().toUpperCase();
      if (text && text.length === 1 && /[A-Z]/.test(text)) {
        pattern += text;
      } else {
        pattern += '_';
      }
    });
  
    if (pattern.length < 3) return;
  
    const matches = matchCrackingWords(pattern);
    let card = document.getElementById('torncore-cracking-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'torncore-cracking-card';
      card.className = 'torncore-card';
      root.prepend(card);
    }
  
    card.innerHTML = `
      <div class="torncore-card-header">
        <span style="color:#60a5fa;">💻 Crimes 2.0 Cracking Word Matches [${pattern}]</span>
        <span style="font-size:10px; color:#94a3b8;">${matches.length} candidate words</span>
      </div>
      <div class="torncore-chip-container">
        ${matches.length > 0
          ? matches.slice(0, 10).map(m => `<span class="torncore-chip accent">${m}</span>`).join('')
          : '<span style="color:#94a3b8; font-size:11px;">No exact dictionary match. Keep guessing letters!</span>'
        }
      </div>
    `;
  }
  
  function injectSubcrimeGuide(root) {
    if (document.getElementById('torncore-crime-advisory')) return;
  
    const hour = new Date().getUTCHours();
    let timeAdvice = 'Daytime: Standard detection rates across city targets.';
    if (hour >= 22 || hour <= 5) {
      timeAdvice = '🌙 Night Hours: Cemeteries & Unlit Alleys have reduced guard presence.';
    }
  
    const advisory = document.createElement('div');
    advisory.id = 'torncore-crime-advisory';
    advisory.className = 'torncore-card';
    advisory.style.margin = '6px 0';
    advisory.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px;">
        <span><strong>Crime Advisory:</strong> ${timeAdvice}</span>
        <span style="color:#94a3b8;">TCT: ${hour.toString().padStart(2, '0')}:00</span>
      </div>
    `;
    root.prepend(advisory);
  }
  
  // --- Module: modules/hospital.js ---
  // Hospital & Med-Out Zero-Waste Optimizer
  // Calculates optimal combination of medical items to reach 100% Life with lowest cooldown
  
  const MEDICAL_ITEMS = [
    { name: 'Morphine', lifePercent: 20, cooldownMin: 25 },
    { name: 'First Aid Pack', lifePercent: 10, cooldownMin: 15 },
    { name: 'Small First Aid Pack', lifePercent: 5, cooldownMin: 10 },
  ];
  
  /**
   * Find lowest cooldown combination to heal at least targetPercent missing life
   * @param {number} targetPercent Missing life percentage (0 - 100)
   */
  function calculateOptimalMeds(targetPercent) {
    if (targetPercent <= 0) return { items: [], totalCooldown: 0, totalHealed: 0 };
  
    let bestResult = null;
  
    // Search combinations (max 5 morphine, max 10 first aid, max 20 small)
    for (let m = 0; m <= 5; m++) {
      for (let f = 0; f <= 10; f++) {
        for (let s = 0; s <= 20; s++) {
          const healed = m * 20 + f * 10 + s * 5;
          if (healed >= targetPercent) {
            const cooldown = m * 25 + f * 15 + s * 10;
            if (!bestResult || cooldown < bestResult.totalCooldown || (cooldown === bestResult.totalCooldown && healed < bestResult.totalHealed)) {
              bestResult = {
                morphine: m,
                firstAid: f,
                smallFirstAid: s,
                totalCooldown: cooldown,
                totalHealed: healed,
              };
            }
          }
        }
      }
    }
  
    return bestResult;
  }
  
  function getLifeStats() {
    const lifeBar = document.querySelector('#barLife, [data-life], .bar-life');
    if (lifeBar) {
      const text = lifeBar.textContent || '';
      const match = text.match(/([0-9,]+)\s*\/\s*([0-9,]+)/);
      if (match) {
        const current = parseInt(match[1].replace(/,/g, ''), 10);
        const max = parseInt(match[2].replace(/,/g, ''), 10);
        if (max > 0) {
          return { current, max, percent: Math.round((current / max) * 100) };
        }
      }
    }
    return null;
  }
  
  function initHospitalOptimizer() {
    const stats = getLifeStats();
    if (!stats) return;
  
    const missingPercent = 100 - stats.percent;
    if (missingPercent <= 0) return;
  
    const optimal = calculateOptimalMeds(missingPercent);
    if (!optimal) return;
  
    let card = document.getElementById('torncore-med-calc-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'torncore-med-calc-card';
      card.className = 'torncore-card';
  
      const container = document.querySelector('.hospital-view, .content-wrapper, #hospital-root');
      if (container) {
        container.prepend(card);
      }
    }
  
    const itemsList = [];
    if (optimal.morphine > 0) itemsList.push(`${optimal.morphine}x Morphine`);
    if (optimal.firstAid > 0) itemsList.push(`${optimal.firstAid}x First Aid Pack`);
    if (optimal.smallFirstAid > 0) itemsList.push(`${optimal.smallFirstAid}x Small First Aid`);
  
    card.innerHTML = `
      <div class="torncore-card-header">
        <span style="color:#f87171;">🩹 Zero-Waste Med-Out Calculator (Missing: ${missingPercent}% Life)</span>
        <span style="font-size:10px; color:#94a3b8;">Minimal Cooldown: +${optimal.totalCooldown} mins</span>
      </div>
      <div style="font-size:12px; margin-top:4px;">
        <strong>Optimal Treatment:</strong> ${itemsList.join(' + ') || 'Full health'} 
        <span style="color:#34d399; margin-left:6px;">(+${optimal.totalHealed}% restored)</span>
      </div>
    `;
  }
  
  // --- Module: modules/gymTimer.js ---
  // Gym Happy Reset Countdown Timer (:00, :15, :30, :45 TCT ticks)
  
  let timerInterval = null;
  
  function getNextHappyTickSeconds() {
    const now = new Date();
    const minutes = now.getUTCMinutes();
    const seconds = now.getUTCSeconds();
  
    const nextQuarterMinute = Math.ceil((minutes + 0.001) / 15) * 15;
    const targetMinute = nextQuarterMinute === 60 ? 0 : nextQuarterMinute;
  
    let diffMinutes = targetMinute - minutes;
    if (diffMinutes <= 0) diffMinutes += 60;
  
    const totalSeconds = (diffMinutes * 60) - seconds;
    return totalSeconds;
  }
  
  function formatTimeRemaining(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  
  function getHappyStats() {
    const happyBar = document.querySelector('#barHappy, [data-happy], .bar-happy');
    if (happyBar) {
      const text = happyBar.textContent || '';
      const match = text.match(/([0-9,]+)\s*\/\s*([0-9,]+)/);
      if (match) {
        const current = parseInt(match[1].replace(/,/g, ''), 10);
        const max = parseInt(match[2].replace(/,/g, ''), 10);
        return { current, max, isOvercapped: current > max };
      }
    }
    return { current: 0, max: 0, isOvercapped: false };
  }
  
  function initGymTimer() {
    if (!window.location.href.includes('gym.php')) {
      if (timerInterval) clearInterval(timerInterval);
      return;
    }
  
    renderGymTimer();
  
    if (!timerInterval) {
      timerInterval = setInterval(updateTimerDisplay, 1000);
    }
  }
  
  function renderGymTimer() {
    if (document.getElementById('torncore-gym-timer-card')) return;
  
    const gymContainer = document.querySelector('.gymContent___, .content-wrapper, #gymroot');
    if (!gymContainer) return;
  
    const card = document.createElement('div');
    card.id = 'torncore-gym-timer-card';
    card.className = 'torncore-card';
    gymContainer.prepend(card);
  
    updateTimerDisplay();
  }
  
  function updateTimerDisplay() {
    const card = document.getElementById('torncore-gym-timer-card');
    if (!card) return;
  
    const happy = getHappyStats();
    const secLeft = getNextHappyTickSeconds();
    const timeFormatted = formatTimeRemaining(secLeft);
  
    const isUrgent = secLeft <= 120; // 2 minutes or less
  
    let statusHtml = '';
    if (happy.isOvercapped) {
      statusHtml = `
        <div style="background: ${isUrgent ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.2)'}; border: 1px solid ${isUrgent ? '#ef4444' : '#f59e0b'}; padding: 6px 10px; border-radius: 4px; margin-top: 6px;">
          <span style="color: ${isUrgent ? '#f87171' : '#fbbf24'}; font-weight:700;">
            ${isUrgent ? '🚨 CRITICAL: ' : '⚠️ '}HAPPY JUMP ACTIVE (${happy.current.toLocaleString()} / ${happy.max.toLocaleString()} Happy)
          </span>
          <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">
            Surplus Happy will decay to natural max at the tick! Train your energy now.
          </div>
        </div>
      `;
    }
  
    card.innerHTML = `
      <div class="torncore-card-header">
        <span style="color:#fbbf24;">⏱ 15-Minute Happy Tick Clock</span>
        <span style="font-size:14px; font-weight:700; color:${isUrgent ? '#ef4444' : '#38bdf8'}; font-family:monospace;">
          ${timeFormatted}
        </span>
      </div>
      <div style="font-size:11px; color:#94a3b8;">
        Server ticks every :00, :15, :30, and :45 TCT past the hour.
      </div>
      ${statusHtml}
    `;
  }
  
  // --- Entrypoint: main.js ---
  function bootstrap() {
    console.log('[TornCore] Initializing QoL Suite v1.0.0...');
  
    // Initialize UI & Settings drawer
    initSettingsUI();
  
    // Register native Tampermonkey menu command if available
    if (typeof GM_registerMenuCommand !== 'undefined') {
      GM_registerMenuCommand('⚙ Open TornCore Settings', openSettingsModal);
    }
  
    // Register Global Modules
    router.register('bazaarGuard', () => true, checkBazaarExposure);
  
    // Register Page Specific Modules
    router.register('vault', (href) => href.includes('properties.php') || href.includes('factions.php'), initVaultHelper);
    router.register('travel', (href) => href.includes('travelagency.php') || href.includes('page=travel'), initTravelSuite);
    router.register('cityScanner', (href) => href.includes('city.php'), initCityScanner);
    router.register('crimes', (href) => href.includes('loader.php?sid=crimes'), initCrimesHelper);
    router.register('hospital', (href) => href.includes('hospitalview.php') || href.includes('item.php'), initHospitalOptimizer);
    router.register('gymTimer', (href) => href.includes('gym.php'), initGymTimer);
  
    // Start watching URL changes and dynamic DOM mutations
    router.start();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
  

})();
