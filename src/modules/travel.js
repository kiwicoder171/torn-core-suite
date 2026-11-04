// Travel Agency Profit Matrix & Overseas Tarmac Max-Fill Helper
import { loadSettings } from '../core/storage.js';

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

export function initTravelSuite() {
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
