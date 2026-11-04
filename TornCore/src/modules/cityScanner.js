// City Map Item Scanner: Highlights hidden items on torn.com/city.php

// Common item ID lookup table for quick display
const COMMON_CITY_ITEMS = {
  '180': 'Small First Aid Pack',
  '181': 'First Aid Pack',
  '182': 'Morphine',
  '258': 'Cesium-137',
  '366': 'Cannabis',
  '367': 'Ecstasy',
  '368': 'Ketamine',
  '369': 'LSD',
  '370': 'Opium',
  '371': 'PCP',
  '372': 'Shrooms',
  '373': 'Speed',
  '374': 'Vicodin',
  '375': 'Xanax',
  '384': 'Can of Red Cow',
  '385': 'Can of Munster',
  '386': 'Can of Rockstar',
  '387': 'Can of Taurine Elite',
  '388': 'Can of X-MASS',
  '389': 'Can of Santa Shoot',
  '450': 'Drug Pack',
  '451': 'Six-pack of Energy Drink',
  '452': 'Six-pack of Alcohol',
  '453': 'Lottery Voucher',
  '454': 'Gift Card',
  '528': 'Feathery Hotel Coupon',
};

let scanInterval = null;

export function initCityScanner() {
  if (!window.location.href.includes('city.php')) {
    if (scanInterval) clearInterval(scanInterval);
    return;
  }

  // Periodic rescan on city map to pick up dynamically loaded tiles / removals
  setTimeout(scanCityMap, 500);
  setTimeout(scanCityMap, 1500);

  if (!scanInterval) {
    scanInterval = setInterval(scanCityMap, 2500);
  }
}

function getItemNameFromMarker(marker) {
  // Check title or alt attributes
  const title = marker.getAttribute('title') || marker.getAttribute('alt') || marker.getAttribute('data-title');
  if (title && title.trim()) return title.trim();

  // Check parent title
  const parentTitle = marker.parentElement?.getAttribute('title');
  if (parentTitle && parentTitle.trim()) return parentTitle.trim();

  // Extract from image src: .../items/<id>/large.png
  const src = marker.getAttribute('src') || '';
  const match = src.match(/\/items\/(\d+)\//);
  if (match && match[1]) {
    const id = match[1];
    if (COMMON_CITY_ITEMS[id]) return COMMON_CITY_ITEMS[id];
    return `Item (#${id})`;
  }

  return 'Collectible Item';
}

function scanCityMap() {
  if (!window.location.href.includes('city.php')) return;

  const markerPane = document.querySelector('.leaflet-marker-pane, #map');
  if (!markerPane) return;

  // Filter for collectible items on the map
  const rawMarkers = markerPane.querySelectorAll(
    'img[src*="/items/"], .leaflet-marker-icon[src*="items"], [data-item-id]'
  );

  // If no items remain on the map, remove the summary card immediately
  if (!rawMarkers || rawMarkers.length === 0) {
    const existingCard = document.getElementById('torncore-city-items-card');
    if (existingCard) existingCard.remove();
    return;
  }

  const itemsFound = [];

  rawMarkers.forEach((marker) => {
    // Force marker visibility & elevation above standard map tiles
    marker.style.outline = '3px solid #10b981';
    marker.style.borderRadius = '50%';
    marker.style.boxShadow = '0 0 16px #10b981, inset 0 0 6px #10b981';
    marker.style.zIndex = '99999';
    marker.style.opacity = '1';
    marker.style.visibility = 'visible';

    // Hook click listener to auto-refresh after item is collected
    if (!marker.dataset.torncoreHooked) {
      marker.dataset.torncoreHooked = 'true';
      marker.addEventListener('click', () => {
        setTimeout(scanCityMap, 600);
        setTimeout(scanCityMap, 1500);
      });
    }

    const name = getItemNameFromMarker(marker);
    itemsFound.push({ name, element: marker });
  });

  if (itemsFound.length === 0) {
    const existingCard = document.getElementById('torncore-city-items-card');
    if (existingCard) existingCard.remove();
    return;
  }

  // Create or update card
  let card = document.getElementById('torncore-city-items-card');
  if (!card) {
    card = document.createElement('div');
    card.id = 'torncore-city-items-card';
    card.className = 'torncore-card';
    card.style.position = 'relative';
    card.style.zIndex = '1000';

    const cityContainer = document.querySelector('.content-wrapper, #city-root, .city-box, .content');
    if (cityContainer) {
      cityContainer.prepend(card);
    }
  }

  card.innerHTML = `
    <div class="torncore-card-header">
      <span style="color:#34d399;">📍 Hidden City Items Found (${itemsFound.length})</span>
      <span style="font-size:10px; color:#94a3b8;">Click item to pan map directly to it</span>
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

  // Pan smoothly and pulse marker when chip is clicked
  card.querySelectorAll('.torncore-chip').forEach((chip) => {
    chip.onclick = () => {
      const idx = parseInt(chip.getAttribute('data-index'), 10);
      const target = itemsFound[idx]?.element;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        target.style.transition = 'transform 0.3s ease';
        target.style.transform = 'scale(2.2)';
        setTimeout(() => {
          target.style.transform = 'scale(1)';
        }, 1000);
      }
    };
  });
}
