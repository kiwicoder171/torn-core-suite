// City Map Item Scanner: Highlights hidden items on torn.com/city.php

export function initCityScanner() {
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
