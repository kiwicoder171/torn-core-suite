// Global Happy 15-Minute Reset Countdown (:00, :15, :30, :45 TCT ticks)
// Injects directly beside the Happy bar in the sidebar on EVERY page, plus detailed card on gym.php

let timerInterval = null;

export function getNextHappyTickSeconds() {
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

export function formatTimeRemaining(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function getHappyStats() {
  const happyBar = document.querySelector('#barHappy, [data-happy], .bar-happy, [class*="bar-happy"]');
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

export function initGymTimer() {
  // Run on all pages: inject into sidebar Happy row
  renderSidebarHappyPill();

  // If on gym page, also render full detailed card
  if (window.location.href.includes('gym.php')) {
    renderGymTimerCard();
  }

  if (!timerInterval) {
    timerInterval = setInterval(updateAllHappyDisplays, 1000);
  }
}

function renderSidebarHappyPill() {
  const happyRow = document.querySelector('#barHappy, .bar-happy, [class*="happyRow"], [class*="bar-happy"]')?.closest('li, div, [class*="row"]');
  if (!happyRow) return;

  if (document.getElementById('torncore-happy-sidebar-pill')) return;

  const pill = document.createElement('span');
  pill.id = 'torncore-happy-sidebar-pill';
  pill.style.cssText = `
    display: inline-block;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    font-family: monospace;
    margin-left: 6px;
    cursor: pointer;
    vertical-align: middle;
    transition: all 0.2s ease;
  `;
  pill.title = 'Countdown to next :00, :15, :30, :45 TCT server tick (Surplus Happy decays at tick)';

  happyRow.appendChild(pill);
  updateAllHappyDisplays();
}

function renderGymTimerCard() {
  if (document.getElementById('torncore-gym-timer-card')) return;

  const gymContainer = document.querySelector('.gymContent___, .content-wrapper, #gymroot, .content');
  if (!gymContainer) return;

  const card = document.createElement('div');
  card.id = 'torncore-gym-timer-card';
  card.className = 'torncore-card';
  gymContainer.prepend(card);

  updateAllHappyDisplays();
}

function updateAllHappyDisplays() {
  const happy = getHappyStats();
  const secLeft = getNextHappyTickSeconds();
  const timeFormatted = formatTimeRemaining(secLeft);
  const isUrgent = secLeft <= 120; // 2 minutes or less

  // 1. Update Sidebar Happy Pill (On every page!)
  let pill = document.getElementById('torncore-happy-sidebar-pill');
  if (!pill) {
    renderSidebarHappyPill();
    pill = document.getElementById('torncore-happy-sidebar-pill');
  }

  if (pill) {
    if (happy.isOvercapped) {
      // High alert mode during Happy Jumps!
      pill.style.background = isUrgent ? '#ef4444' : '#f59e0b';
      pill.style.color = '#ffffff';
      pill.style.boxShadow = isUrgent ? '0 0 8px #ef4444' : '0 0 5px #f59e0b';
      pill.textContent = `🚨 ${timeFormatted}`;
    } else {
      // Normal subtle mode
      pill.style.background = 'rgba(30, 41, 59, 0.85)';
      pill.style.color = '#38bdf8';
      pill.style.border = '1px solid rgba(56, 189, 248, 0.3)';
      pill.textContent = `⏱ ${timeFormatted}`;
    }
  }

  // 2. Update Gym Card (if present on gym.php)
  const card = document.getElementById('torncore-gym-timer-card');
  if (card) {
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
}
