// Hospital & Med-Out Zero-Waste Optimizer
// Calculates optimal combination of medical items to reach 100% Life with lowest cooldown

export const MEDICAL_ITEMS = [
  { name: 'Morphine', lifePercent: 20, cooldownMin: 25 },
  { name: 'First Aid Pack', lifePercent: 10, cooldownMin: 15 },
  { name: 'Small First Aid Pack', lifePercent: 5, cooldownMin: 10 },
];

/**
 * Find lowest cooldown combination to heal at least targetPercent missing life
 * @param {number} targetPercent Missing life percentage (0 - 100)
 */
export function calculateOptimalMeds(targetPercent) {
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

export function initHospitalOptimizer() {
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
