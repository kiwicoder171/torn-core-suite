// ==UserScript==
// @name         TornCore QoL Suite
// @namespace    https://github.com/kiwicoder171/torn-core-suite
// @version      1.0.1
// @description  Unified, 100% rule-compliant Quality-of-Life & calculation suite for Torn.com
// @author       Kiwi
// @license      MIT
// @match        https://*.torn.com/*
// @match        https://torn.com/*
// @updateURL    https://raw.githubusercontent.com/kiwicoder171/torn-core-suite/main/TornCore/dist/TornCore.user.js
// @downloadURL  https://raw.githubusercontent.com/kiwicoder171/torn-core-suite/main/TornCore/dist/TornCore.user.js
// @supportURL   https://github.com/kiwicoder171/torn-core-suite/issues
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

import { router } from './core/router.js';
import { initSettingsUI, openSettingsModal } from './core/ui.js';
import { checkBazaarExposure } from './modules/bazaarGuard.js';
import { initVaultHelper } from './modules/vault.js';
import { initTravelSuite } from './modules/travel.js';
import { initCityScanner } from './modules/cityScanner.js';
import { initCrimesHelper } from './modules/crimes.js';
import { initHospitalOptimizer } from './modules/hospital.js';
import { initGymTimer } from './modules/gymTimer.js';

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
