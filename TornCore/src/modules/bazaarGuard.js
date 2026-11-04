// Bazaar Cash Guard: Alerts when Bazaar is Open and holding liquid cash
import { fetchTornApi } from '../core/api.js';
import { loadSettings } from '../core/storage.js';

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

export async function checkBazaarExposure() {
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
