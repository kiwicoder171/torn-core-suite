// Overseas Tarmac Max-Fill Helper (0-API Quick-Buy when landed abroad)
import { loadSettings } from '../core/storage.js';

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
  // Clean up any stale travel profit card if present
  const staleCard = document.getElementById('torncore-travel-card');
  if (staleCard) {
    staleCard.remove();
  }

  // Overseas shop helper: activates when landed abroad at a foreign market/shop
  const isOverseasShop = !!document.querySelector('.itemRow___, .item-list li, tr[data-item], .item-row');
  if (isOverseasShop) {
    initOverseasShopHelper();
    setTimeout(initOverseasShopHelper, 500);
  }
}

function initOverseasShopHelper() {
  // Target overseas shop item rows (e.g. plushies, flowers abroad)
  const itemRows = document.querySelectorAll('.itemRow___, .item-list li, tr[data-item], .item-row');
  if (!itemRows.length) return;

  const settings = loadSettings();
  const maxCapacity = settings.travelCarryCapacity || 29;
  const cashOnHand = getLiquidCash();

  itemRows.forEach((row) => {
    if (row.querySelector('.torncore-max-buy')) return;

    const input = row.querySelector('input[type="number"], input.amount, input[name*="amount"]');
    if (!input) return;

    // Extract item price
    const priceText = row.querySelector('.cost, .price, [class*="price"]')?.textContent || '0';
    const price = parseInt(priceText.replace(/[^0-9]/g, ''), 10) || 1;

    const maxAffordable = Math.floor(cashOnHand / price);
    const fillAmount = Math.min(maxCapacity, maxAffordable);

    const btn = document.createElement('span');
    btn.className = 'torncore-chip accent torncore-max-buy';
    btn.textContent = `Max (${fillAmount})`;
    btn.title = `Pre-fill ${fillAmount} (Cap: ${maxCapacity}, Cash: $${cashOnHand.toLocaleString()})`;
    btn.style.marginLeft = '6px';
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
