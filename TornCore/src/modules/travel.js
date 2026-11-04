// Travel Agency Profit Matrix & Overseas Tarmac Max-Fill Helper
import { loadSettings } from '../core/storage.js';

// Standard round-trip flight times (minutes) without/with Airstrip & WLT
const DESTINATIONS = [
  { name: 'UAE', flightMin: 190, highProfitItem: 'Camel Plushie', avgProfitPerItem: 85000 },
  { name: 'Mexico', flightMin: 18, highProfitItem: 'Jaguar Plushie', avgProfitPerItem: 7500 },
  { name: 'Cayman Islands', flightMin: 25, highProfitItem: 'Banana Orchid', avgProfitPerItem: 9200 },
  { name: 'United Kingdom', flightMin: 111, highProfitItem: 'Red Fox Plushie', avgProfitPerItem: 38000 },
  { name: 'South Africa', flightMin: 208, highProfitItem: 'Lion Plushie', avgProfitPerItem: 68000 },
  { name: 'China', flightMin: 169, highProfitItem: 'Panda Plushie', avgProfitPerItem: 55000 },
  { name: 'Japan', flightMin: 158, highProfitItem: 'Cherry Blossom', avgProfitPerItem: 48000 },
  { name: 'Switzerland', flightMin: 123, highProfitItem: 'Chamois Plushie', avgProfitPerItem: 36000 },
  { name: 'Canada', flightMin: 29, highProfitItem: 'Wolverine Plushie', avgProfitPerItem: 8300 },
  { name: 'Argentina', flightMin: 117, highProfitItem: 'Ceibo Flower', avgProfitPerItem: 22000 },
  { name: 'Hawaii', flightMin: 94, highProfitItem: 'Tsarina Orchid', avgProfitPerItem: 12000 },
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

export function initTravelSuite() {
  const bodyText = document.body?.textContent || '';
  const isAtTravelAgency =
    window.location.href.includes('travelagency') ||
    !!document.querySelector('input[placeholder*="inventory" i]') ||
    /Select\s+Destination/i.test(bodyText) ||
    /Travel\s+Agency/i.test(bodyText);

  if (isAtTravelAgency) {
    renderTravelAgencyProfits();
    setTimeout(renderTravelAgencyProfits, 250);
    setTimeout(renderTravelAgencyProfits, 750);
    setTimeout(renderTravelAgencyProfits, 1500);
  }

  // Overseas shop helper (only when abroad at an item market/shop)
  const isOverseasShop = !!document.querySelector('.itemRow___, .item-list li, tr[data-item], .item-row');
  if (isOverseasShop && !isAtTravelAgency) {
    initOverseasShopHelper();
    setTimeout(initOverseasShopHelper, 500);
  }
}

function renderTravelAgencyProfits() {
  const existing = document.getElementById('torncore-travel-card');
  if (existing && existing.isConnected && existing.offsetHeight > 0) {
    return;
  }
  if (existing) {
    existing.remove();
  }

  const settings = loadSettings();
  const capacity = settings.travelCarryCapacity || 29;

  const card = document.createElement('div');
  card.id = 'torncore-travel-card';
  card.className = 'torncore-card';
  card.style.cssText = 'margin:12px 0; background:#1e293b; border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:12px; box-shadow:0 4px 12px rgba(0,0,0,0.3);';

  // Calculate & rank by hourly yield descending
  const ranked = DESTINATIONS.map((d) => {
    const totalProfit = d.avgProfitPerItem * capacity;
    const roundTripMin = d.flightMin * 2;
    const profitPerHour = Math.round((totalProfit / roundTripMin) * 60);
    return { ...d, totalProfit, roundTripMin, profitPerHour };
  }).sort((a, b) => b.profitPerHour - a.profitPerHour);

  const rows = ranked.map((d, idx) => {
    let rankBadge = `<span style="color:#64748b; font-size:10px; margin-right:4px;">#${idx + 1}</span>`;
    if (idx === 0) rankBadge = `<span style="color:#fbbf24; font-weight:700; margin-right:4px;">🥇 #1</span>`;
    if (idx === 1) rankBadge = `<span style="color:#cbd5e1; font-weight:700; margin-right:4px;">🥈 #2</span>`;
    if (idx === 2) rankBadge = `<span style="color:#f97316; font-weight:700; margin-right:4px;">🥉 #3</span>`;

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06); text-align:left;">
        <td style="padding:6px 8px; font-weight:600; color:#f1f5f9;">
          ${rankBadge} ${d.name}
        </td>
        <td style="padding:6px 8px; color:#cbd5e1;">${d.highProfitItem}</td>
        <td style="padding:6px 8px; color:#94a3b8;">${d.flightMin}m (one-way)</td>
        <td style="padding:6px 8px; color:#34d399; font-weight:600;">$${d.totalProfit.toLocaleString()}</td>
        <td style="padding:6px 8px; color:#60a5fa; font-weight:700; font-family:monospace;">$${d.profitPerHour.toLocaleString()}/hr</td>
      </tr>
    `;
  }).join('');

  card.innerHTML = `
    <div class="torncore-card-header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px; margin-bottom:8px;">
      <span style="font-size:13px; font-weight:700; color:#38bdf8;">✈ Travel Agency Flight Profit Matrix (${capacity} Items Capacity)</span>
      <span style="font-size:11px; color:#94a3b8;">Sorted by Hourly Yield · Updated Estimates</span>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%; font-size:11px; border-collapse:collapse;">
        <thead>
          <tr style="color:#64748b; border-bottom:1px solid rgba(255,255,255,0.12); text-align:left;">
            <th style="padding:6px 8px;">Rank / Country</th>
            <th style="padding:6px 8px;">Target Plushie / Flower</th>
            <th style="padding:6px 8px;">Flight Time</th>
            <th style="padding:6px 8px;">Roundtrip Net</th>
            <th style="padding:6px 8px;">Hourly Yield</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;

  // Strategy 1: Anchor before "Select Destination and Traveling Method" header row
  const allElements = document.querySelectorAll('div, h4, h3, h2, span, p');
  for (const el of allElements) {
    if (el.textContent && /Select\s+Destination/i.test(el.textContent) && el.children.length <= 2) {
      // Find its outer row wrapper in the stage layout
      let target = el;
      while (target.parentElement && target.parentElement.children.length === 1 && target.parentElement !== document.body) {
        target = target.parentElement;
      }
      if (target.parentElement) {
        target.parentElement.insertBefore(card, target);
        return;
      }
    }
  }

  // Strategy 2: Anchor after the inventory slots search box
  const invInput = document.querySelector('input[placeholder*="inventory" i]');
  if (invInput) {
    let invBox = invInput.closest('form, div');
    while (invBox && invBox.parentElement && invBox.parentElement.children.length === 1 && invBox.parentElement !== document.body) {
      invBox = invBox.parentElement;
    }
    if (invBox && invBox.parentElement) {
      invBox.parentElement.insertBefore(card, invBox.nextSibling);
      return;
    }
  }

  // Strategy 3: Anchor after the "Travel Agency" title header
  for (const el of allElements) {
    if (el.children.length <= 1 && /^Travel\s+Agency$/i.test(el.textContent?.trim() || '')) {
      let titleBox = el;
      while (titleBox.parentElement && titleBox.parentElement.children.length === 1 && titleBox.parentElement !== document.body) {
        titleBox = titleBox.parentElement;
      }
      if (titleBox.parentElement) {
        titleBox.parentElement.insertBefore(card, titleBox.nextSibling);
        return;
      }
    }
  }

  // Strategy 4: Fallback prepend to stage or main content container
  const mainStage = document.querySelector('.travel-agency, #travelagency-container, .stage, .content-wrapper, #mainContainer, .content');
  if (mainStage) {
    mainStage.prepend(card);
  }
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
