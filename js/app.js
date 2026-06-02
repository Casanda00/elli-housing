/* ==========================================================================
   Elli Distance Finder — Core Application Logic
   Map, OSRM routing, UI rendering, sorting, filtering, i18n
   ========================================================================== */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────
  const OSRM_BASE = 'https://router.project-osrm.org';
  const MAP_CENTER = [62.601, 29.763];
  const MAP_ZOOM = 13;
  const FETCH_TIMEOUT = 10000;

  // ── Digitransit (Public Transit) Config ─────────────────────────────
  // API key is loaded from js/config.js (gitignored).
  // Copy js/config.example.js → js/config.js and add your key.
  // Register for a free key at: https://portal-api.digitransit.fi/
  const DIGITRANSIT_API_KEY = (window.ELLI_CONFIG && window.ELLI_CONFIG.DIGITRANSIT_API_KEY) || '';
  const DIGITRANSIT_URL = 'https://api.digitransit.fi/routing/v2/waltti/gtfs/v1';

  const SPEEDS = { foot: 5, bike: 15, bus: 20, car: 40 };
  const THRESHOLDS = { close: 2, medium: 5 };

  // ── i18n ────────────────────────────────────────────────────────────
  const TRANSLATIONS = {
    en: {
      title: "Elli Distance Finder",
      tagline: "Find housing near your campus",
      campus: "Campus",
      locations: "Locations",
      maxRent: "Max rent / month",
      apartmentType: "Apartment type",
      shared: "Shared",
      studio: "Studio",
      family: "Family",
      walk: "Walk",
      bike: "Bike",
      bus: "Bus",
      drive: "Drive",
      searchPlaceholder: "Search by address or area...",
      sortBy: "Sort by",
      distanceNearest: "Distance (nearest)",
      priceLowest: "Price (lowest)",
      nameAZ: "Name (A–Z)",
      neighborhood: "Neighborhood",
      properties: "Properties",
      nearest: "Nearest",
      average: "Average",
      maxTravelTime: "Max travel time",
      all: "All",
      calculatingDistances: "Calculating distances...",
      noResults: "No properties match your search",
      viewOnElli: "View on Elli's website →",
      showing: "showing",
      of: "of",
      // Area translations
      "Center": "Center",
      "Noljakka": "Noljakka",
      "Kanervala": "Kanervala",
      "Penttilä": "Penttilä",
      "Rantakylä": "Rantakylä",
      "Hukanhauta": "Hukanhauta",
      "Near Campus": "Near Campus",
      // Modal translations
      aboutProject: "About this project",
      modalTitle: "Welcome to Elli Distance Finder",
      modalProblem: "For prospective students who haven't arrived in Joensuu yet, finding the right housing can be tough. You constantly have to juggle between Joensuun Elli's website to check available apartments and Google Maps to manually search the distance to your new campus. This back-and-forth makes finding the right home from afar tedious and frustrating.",
      modalSolution: "This project solves that by providing a unified platform! Now you can:",
      modalLi1: "Instantly see travel times by foot, bike, bus, or car.",
      modalLi2: "Filter housing by your rent budget and preferred apartment type.",
      modalLi3: "Discover nearby amenities like supermarkets and sports facilities.",
      modalStart: "Start Exploring",
      // Feedback modal
      feedbackTitle: "Give feedback",
      feedbackBtn: "Leave Feedback",
      feedbackModalTitle: "Send Feedback",
      filtersToggle: "Filters & Sort"
    },
    fi: {
      title: "Ellin Etäisyyshaku",
      tagline: "Löydä asunto kampuksen läheltä",
      campus: "Kampus",
      locations: "Kohteet",
      maxRent: "Max vuokra / kk",
      apartmentType: "Asuntotyyppi",
      shared: "Solu",
      studio: "Yksiö",
      family: "Perhe",
      walk: "Kävely",
      bike: "Pyörä",
      bus: "Bussi",
      drive: "Auto",
      searchPlaceholder: "Hae osoitteella tai alueella...",
      sortBy: "Järjestä",
      distanceNearest: "Etäisyys (lähin)",
      priceLowest: "Hinta (halvin)",
      nameAZ: "Nimi (A–Ö)",
      neighborhood: "Asuinalue",
      properties: "Kohteet",
      nearest: "Lähin",
      average: "Keskiarvo",
      maxTravelTime: "Max matka-aika",
      all: "Kaikki",
      calculatingDistances: "Lasketaan etäisyyksiä...",
      noResults: "Hakua vastaavia kohteita ei löytynyt",
      viewOnElli: "Katso Ellin sivuilla →",
      showing: "näytetään",
      of: "/",
      // Area translations
      "Center": "Keskusta",
      "Noljakka": "Noljakka",
      "Kanervala": "Kanervala",
      "Penttilä": "Penttilä",
      "Rantakylä": "Rantakylä",
      "Hukanhauta": "Hukanhauta",
      "Near Campus": "Kampuksen lähellä",
      // Modal translations
      aboutProject: "Tietoa projektista",
      modalTitle: "Tervetuloa Ellin Etäisyyshakuun",
      modalProblem: "Uusille opiskelijoille, jotka eivät ole vielä saapuneet Joensuuhun, oikean asunnon löytäminen voi olla haastavaa. Joudut jatkuvasti hyppimään Joensuun Ellin verkkosivujen (vapaiden asuntojen selaaminen) ja Google Mapsin (etäisyyksien mittaaminen) välillä. Tämä edestakainen pomppiminen tekee asunnon etsimisestä kaukaa työlästä ja turhauttavaa.",
      modalSolution: "Tämä projekti ratkaisee ongelman tarjoamalla yhdistetyn alustan! Nyt voit:",
      modalLi1: "Nähdä heti matka-ajat kävellen, pyörällä, bussilla tai autolla.",
      modalLi2: "Suodattaa asuntoja vuokrabudjetin ja asuntotyypin mukaan.",
      modalLi3: "Löytää lähipalvelut, kuten supermarketit ja liikuntapaikat.",
      modalStart: "Aloita tutkiminen",
      // Feedback modal
      feedbackTitle: "Anna palautetta",
      feedbackBtn: "Palaute",
      feedbackModalTitle: "Lähetä palautetta",
      filtersToggle: "Suodattimet & Järjestys"
    }
  };

  // ── State ───────────────────────────────────────────────────────────
  let map;
  let currentInstitution = null;
  let currentMode = 'foot';
  let currentSort = 'distance';
  let currentLang = 'en';
  let maxMinutes = 0; // 0 = show all
  let maxRent = 0; // 0 = show all
  let selectedType = 'all'; // 'all', 'Solu', 'Yksiö', 'Perhe'
  let searchQuery = '';
  let propertyMarkers = {};
  let campusMarker = null;
  let routeLayer = null;
  let activePropertyId = null;
  let distances = {};

  // ── Helpers ─────────────────────────────────────────────────────────
  function t(key) {
    return TRANSLATIONS[currentLang]?.[key] || TRANSLATIONS.en[key] || key;
  }

  function tArea(area) {
    return TRANSLATIONS[currentLang]?.[area] || area;
  }

  const APT_TYPE_EN = {
    'Soluasunto': 'Shared room',
    'Solu': 'Shared',
    'Yksiö': 'Studio',
    'Perheasunto': 'Family apt',
    'Perhe': 'Family'
  };

  function tAptType(type) {
    if (currentLang === 'fi') return type;
    return APT_TYPE_EN[type] || type;
  }

  function elliUrl(prop) {
    const slug = prop.elliSlug || prop.id;
    return `https://www.joensuunelli.fi/kohde/${slug}/`;
  }

  // ── Initialization ──────────────────────────────────────────────────
  function init() {
    try {
      currentInstitution = INSTITUTIONS[0];
      initMap();
      initInstitutions();
      initTransportToggle();
      initSortSelect();
      initSearch();
      initRouteCloseBtn();
      initRadiusFilter();
      initRentFilter();
      initTypeFilter();
      initMobileFilterToggle();
      initMobileLayout();
      initLangToggle();
      initModal();
      initFeedbackModal();
      applyTranslations();
      calculateAllDistances();
    } catch (err) {
      console.error('Elli Distance Finder init failed:', err);
      showLoading(false);
    }
  }

  // ── Map Setup ───────────────────────────────────────────────────────
  function initMap() {
    map = L.map('map', {
      center: MAP_CENTER,
      zoom: MAP_ZOOM,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    const tilePane = document.querySelector('.leaflet-tile-pane');
    if (tilePane) tilePane.style.filter = 'none';

    PROPERTIES.forEach(prop => {
      const marker = L.marker([prop.lat, prop.lng], {
        icon: createPropertyIcon(prop.id)
      });
      marker.on('click', () => selectProperty(prop.id));
      marker.addTo(map);
      propertyMarkers[prop.id] = marker;
    });

    placeCampusMarker();

    // Ensure map tiles render correctly after layout shifts (mobile orientation, resize)
    window.addEventListener('resize', () => {
      if (map) map.invalidateSize();
    });
  }

  function createPropertyIcon(propId, distClass, outOfRadius) {
    const cls = (distClass || '') + (outOfRadius ? ' out-of-radius' : '');
    return L.divIcon({
      className: 'custom-marker-wrapper',
      html: `<div class="custom-marker ${cls}" data-id="${propId}"><i class="ph-fill ph-house"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -16]
    });
  }

  function createCampusIcon() {
    return L.divIcon({
      className: 'campus-marker-wrapper',
      html: `<div class="campus-marker"><i class="ph-fill ph-graduation-cap"></i></div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
      popupAnchor: [0, -24]
    });
  }

  function placeCampusMarker() {
    if (!currentInstitution) return;
    if (campusMarker) map.removeLayer(campusMarker);
    const inst = currentInstitution;
    campusMarker = L.marker([inst.lat, inst.lng], {
      icon: createCampusIcon(),
      zIndexOffset: 1000
    });
    const instName = currentLang === 'fi' && inst.namefi ? inst.namefi : inst.name;
    campusMarker.bindPopup(`
      <div class="popup-campus">
        <div class="popup-name">${instName}</div>
        <div class="popup-address">${inst.address}</div>
      </div>
    `);
    campusMarker.addTo(map);
  }

  // ── Institution Selector ────────────────────────────────────────────
  function initInstitutions() {
    const select = document.getElementById('institution-select');
    populateInstitutionSelect(select);
    select.addEventListener('change', (e) => {
      currentInstitution = INSTITUTIONS[parseInt(e.target.value)];
      placeCampusMarker();
      calculateAllDistances();
    });
  }

  function populateInstitutionSelect(select) {
    select.innerHTML = '';
    INSTITUTIONS.forEach((inst, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = currentLang === 'fi' && inst.namefi ? inst.namefi : inst.name;
      if (inst === currentInstitution) opt.selected = true;
      select.appendChild(opt);
    });
  }

  // ── Transport Mode Toggle ───────────────────────────────────────────
  function initTransportToggle() {
    const buttons = document.querySelectorAll('.transport-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMode = btn.dataset.mode;
        renderPropertyList();
        updateMapMarkers();
        updateOverlayStats();
        if (activePropertyId) showRoute(activePropertyId);
      });
    });
  }

  // ── Sort ────────────────────────────────────────────────────────────
  function initSortSelect() {
    document.getElementById('sort-select').addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderPropertyList();
    });
  }

  // ── Search ──────────────────────────────────────────────────────────
  function initSearch() {
    const input = document.getElementById('search-input');
    let debounceTimer;
    input.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderPropertyList();
      }, 200);
    });
  }

  // ── Route Close ─────────────────────────────────────────────────────
  function initRouteCloseBtn() {
    document.getElementById('route-close-btn').addEventListener('click', clearRoute);
  }

  // ── Filters ─────────────────────────────────────────────────────────
  function initRadiusFilter() {
    const buttons = document.querySelectorAll('.radius-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        maxMinutes = parseInt(btn.dataset.minutes);
        renderPropertyList();
        updateMapMarkers();
        updateOverlayStats();
      });
    });
  }

  function initRentFilter() {
    const slider = document.getElementById('rent-slider');
    const valueEl = document.getElementById('rent-value');
    
    slider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      if (val >= 800) {
        maxRent = 0;
        valueEl.textContent = t('all');
        valueEl.setAttribute('data-i18n', 'all');
      } else {
        maxRent = val;
        valueEl.textContent = `< ${val} €`;
        valueEl.removeAttribute('data-i18n');
      }
      renderPropertyList();
      updateMapMarkers();
      updateOverlayStats();
    });
  }

  function initTypeFilter() {
    const buttons = document.querySelectorAll('.type-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = btn.dataset.type;
        renderPropertyList();
        updateMapMarkers();
        updateOverlayStats();
      });
    });
  }

  function matchesFilters(prop) {
    // 1. Radius Filter
    if (maxMinutes > 0) {
      const dist = distances[prop.id]?.[currentMode];
      if (dist) {
        const mins = dist.duration / 60;
        if (mins > maxMinutes) return false;
      }
    }

    // 2. Rent Filter
    if (maxRent > 0) {
      let minPropRent = null;
      if (prop.apartments && prop.apartments.length > 0) {
        prop.apartments.forEach(apt => {
          const r = parseFloat(apt.rent);
          if (!isNaN(r) && (minPropRent === null || r < minPropRent)) minPropRent = r;
        });
      }
      if (minPropRent === null || minPropRent > maxRent) return false;
    }

    // 3. Type Filter
    if (selectedType !== 'all') {
      if (!prop.types || !prop.types.includes(selectedType)) return false;
    }

    return true;
  }

  function initMobileFilterToggle() {
    const filterToggle = document.getElementById('mobile-filter-toggle');
    const filterDrawer = document.getElementById('filter-drawer');
    const drawerOverlay = document.getElementById('filter-drawer-overlay');
    const drawerClose = document.getElementById('drawer-close');

    function openDrawer() {
      if (filterDrawer && drawerOverlay) {
        filterDrawer.classList.add('open');
        drawerOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
      }
    }

    function closeDrawer() {
      if (filterDrawer && drawerOverlay) {
        filterDrawer.classList.remove('open');
        drawerOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    if (filterToggle) filterToggle.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
  }

  function initMobileLayout() {
    function updateStickyOffsets() {
      if (window.innerWidth > 768) return;
      const header = document.getElementById('app-header');
      const mapPanel = document.getElementById('map-panel');
      if (!header || !mapPanel) return;

      const headerHeight = header.offsetHeight;
      const mapHeight = mapPanel.offsetHeight;
      document.documentElement.style.setProperty('--mobile-header-height', `${headerHeight}px`);
      document.documentElement.style.setProperty('--mobile-map-height', `${mapHeight}px`);
    }

    function updateTransportTogglePosition() {
      const toggle = document.getElementById('transport-toggle');
      const mobileHeader = document.querySelector('.mobile-controls-header');
      const desktopHeaderRight = document.querySelector('.header-right');
      const langToggle = document.getElementById('lang-toggle');
      const filterToggle = document.getElementById('mobile-filter-toggle');
      const searchBox = document.querySelector('.search-box');
      const institutionSelector = document.querySelector('.institution-selector');
      const filterDrawer = document.getElementById('filter-drawer');
      const drawerContent = document.querySelector('.drawer-scroll-content');
      let mobileSearchRow = document.querySelector('.mobile-search-campus-row');

      if (!toggle || !mobileHeader || !desktopHeaderRight || !searchBox || !institutionSelector || !filterDrawer || !drawerContent) return;

      if (!mobileSearchRow) {
        mobileSearchRow = document.createElement('div');
        mobileSearchRow.className = 'mobile-search-campus-row';
        searchBox.parentNode.insertBefore(mobileSearchRow, searchBox);
      }

      if (window.innerWidth <= 768) {
        if (toggle.parentNode !== mobileHeader) {
          mobileHeader.insertBefore(toggle, filterToggle);
        }
        if (searchBox.parentNode !== mobileSearchRow) {
          mobileSearchRow.appendChild(searchBox);
        }
        if (institutionSelector.parentNode !== mobileSearchRow) {
          mobileSearchRow.appendChild(institutionSelector);
        }
      } else {
        if (toggle.parentNode !== desktopHeaderRight) {
          desktopHeaderRight.insertBefore(toggle, langToggle);
        }
        if (searchBox.parentNode !== document.querySelector('.panel-controls')) {
          document.querySelector('.panel-controls').insertBefore(searchBox, filterDrawer);
        }
        if (institutionSelector.parentNode !== drawerContent) {
          drawerContent.insertBefore(institutionSelector, drawerContent.firstElementChild || null);
        }
      }
    }

    window.addEventListener('resize', updateTransportTogglePosition);
    window.addEventListener('resize', updateStickyOffsets);
    updateTransportTogglePosition();
    updateStickyOffsets();
  }

  // ✨ Modal Logic ✨
  function initModal() {
    const modal = document.getElementById('intro-modal');
    const closeBtn = document.getElementById('modal-close');
    const startBtn = document.getElementById('modal-start-btn');
    const aboutBtn = document.getElementById('about-btn');

    function closeModal() {
      modal.classList.remove('active');
    }

    function openModal() {
      modal.classList.add('active');
    }

    closeBtn.addEventListener('click', closeModal);
    startBtn.addEventListener('click', closeModal);
    if (aboutBtn) {
      aboutBtn.addEventListener('click', openModal);
    }

    // Close on clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Check if it's the first time visiting in this session.
    // Keep the intro modal off mobile so it does not block list scrolling.
    const hasSeenModal = sessionStorage.getItem('elli-modal-seen');
    if (!hasSeenModal && window.innerWidth > 768) {
      setTimeout(openModal, 500); // Small delay for effect
      sessionStorage.setItem('elli-modal-seen', 'true');
    }
  }

  // 📝 Feedback Modal Logic 📝
  function initFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    const closeBtn = document.getElementById('feedback-modal-close');
    const feedbackBtn = document.getElementById('feedback-btn');
    const iframe = document.getElementById('feedback-iframe');
    let iframeLoaded = false;

    function closeFeedback() {
      modal.classList.remove('active');
    }

    function openFeedback() {
      // Lazy-load iframe src on first open
      if (!iframeLoaded && iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
        iframeLoaded = true;
      }
      modal.classList.add('active');
    }

    if (feedbackBtn) {
      feedbackBtn.addEventListener('click', openFeedback);
    }
    closeBtn.addEventListener('click', closeFeedback);

    // Close on clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeFeedback();
    });
  }


  // 🌍 Language Toggle 🌍─────────────────────────────────────────────────
  function initLangToggle() {
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentLang = btn.dataset.lang;
        applyTranslations();
        // Refresh UI with new language
        populateInstitutionSelect(document.getElementById('institution-select'));
        placeCampusMarker();
        renderPropertyList();
        updateOverlayStats();
      });
    });
  }

  function applyTranslations() {
    // Translate elements with data-i18n attribute (textContent)
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    // Translate elements with data-i18n-placeholder (input placeholder)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    // Update page title
    document.title = `${t('title')} — ${t('tagline')}`;
  }

  // ── Fetch with timeout ──────────────────────────────────────────────
  function fetchWithTimeout(url, timeout = FETCH_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  function fetchWithOptions(url, options = {}, timeout = FETCH_TIMEOUT) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
  }

  // ── Distance Calculation ────────────────────────────────────────────
  async function calculateAllDistances() {
    showLoading(true);
    distances = {};
    const inst = currentInstitution;
    let osrmSuccess = false;

    try {
      await calculateDistancesOSRM(inst);
      osrmSuccess = true;
    } catch (err) {
      console.warn('OSRM failed, using Haversine fallback:', err.message);
    }

    if (!osrmSuccess) {
      ['foot', 'bike', 'bus', 'car'].forEach(mode => calculateDistancesHaversine(mode, inst));
    }

    // Try real bus routing via Digitransit (overrides speed estimate)
    if (DIGITRANSIT_API_KEY) {
      try {
        await calculateBusDistancesDigitransit(inst);
      } catch (err) {
        console.warn('Digitransit bus routing failed, keeping estimate:', err.message);
      }
    } else {
      console.info('Digitransit API key not set — using speed-based bus estimate. Register at https://portal-api.digitransit.fi/');
    }

    showLoading(false);
    renderPropertyList();
    updateMapMarkers();
    updateOverlayStats();
  }

  async function calculateDistancesOSRM(inst) {
    const coords = [`${inst.lng},${inst.lat}`];
    PROPERTIES.forEach(p => coords.push(`${p.lng},${p.lat}`));
    const url = `${OSRM_BASE}/table/v1/driving/${coords.join(';')}?sources=0&annotations=distance,duration`;

    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`OSRM HTTP ${response.status}`);
    const data = await response.json();
    if (data.code !== 'Ok') throw new Error(`OSRM error: ${data.code}`);

    const distRow = data.distances[0];
    const durRow = data.durations[0];

    PROPERTIES.forEach((prop, i) => {
      const roadDistMeters = distRow[i + 1];
      const drivingDurSecs = durRow[i + 1];
      const roadDistKm = roadDistMeters / 1000;

      distances[prop.id] = {
        foot: { distance: roadDistMeters, duration: (roadDistKm / SPEEDS.foot) * 3600 },
        bike: { distance: roadDistMeters, duration: (roadDistKm / SPEEDS.bike) * 3600 },
        bus:  { distance: roadDistMeters, duration: (roadDistKm / SPEEDS.bus) * 3600 },
        car:  { distance: roadDistMeters, duration: drivingDurSecs }
      };
    });
  }

  // ── Digitransit Public Transit Routing ──────────────────────────────
  async function calculateBusDistancesDigitransit(inst) {
    // Query Digitransit for bus+walk itineraries for each property.
    // We use Promise.allSettled so one failure doesn't block the rest.
    const BATCH_SIZE = 5; // Max concurrent requests to respect rate limits
    const results = [];

    for (let i = 0; i < PROPERTIES.length; i += BATCH_SIZE) {
      const batch = PROPERTIES.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(prop => fetchDigitransitRoute(inst, prop))
      );
      results.push(...batchResults);
      // Small delay between batches to stay under 10 req/s
      if (i + BATCH_SIZE < PROPERTIES.length) {
        await new Promise(r => setTimeout(r, 200));
      }
    }

    let successCount = 0;
    PROPERTIES.forEach((prop, i) => {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        const { duration, distance, startTime, itinerary } = result.value;
        const hasBusLeg = itinerary && itinerary.legs.some(leg => leg.mode === 'BUS');
        
        if (!distances[prop.id]) distances[prop.id] = {};
        
        if (hasBusLeg) {
          distances[prop.id].bus = { distance, duration, startTime, itinerary };
        } else {
          // If the best itinerary is just a walk, clear out any bus estimate
          distances[prop.id].bus = null;
        }
        successCount++;
      }
      // If failed, the speed-based estimate from OSRM/Haversine stays
    });

    console.info(`Digitransit: ${successCount}/${PROPERTIES.length} bus routes fetched successfully`);
  }

  async function fetchDigitransitRoute(inst, prop) {
    const query = `{
      plan(
        from: {lat: ${prop.lat}, lon: ${prop.lng}}
        to: {lat: ${inst.lat}, lon: ${inst.lng}}
        numItineraries: 10
        searchWindow: 86400
        transportModes: [{mode: BUS}, {mode: WALK}]
      ) {
        itineraries {
          startTime
          duration
          legs {
            mode
            startTime
            endTime
            duration
            distance
            route {
              shortName
            }
            from {
              name
            }
            to {
              name
            }
          }
        }
      }
    }`;

    const response = await fetchWithOptions(DIGITRANSIT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'digitransit-subscription-key': DIGITRANSIT_API_KEY
      },
      body: JSON.stringify({ query })
    }, 15000);

    if (!response.ok) throw new Error(`Digitransit HTTP ${response.status}`);
    const data = await response.json();

    if (data.errors) {
      throw new Error(`Digitransit GraphQL error: ${data.errors[0].message}`);
    }

    const itineraries = data?.data?.plan?.itineraries;
    if (!itineraries || itineraries.length === 0) {
      // No transit route found (e.g. no bus service to this location)
      return null;
    }

    // Prefer itineraries that actually use a bus
    const busItineraries = itineraries.filter(itin => itin.legs.some(leg => leg.mode === 'BUS'));
    const candidateItineraries = busItineraries.length > 0 ? busItineraries : itineraries;

    // Pick the itinerary with shortest duration
    let bestDuration = Infinity;
    let bestDistance = 0;
    let bestStartTime = null;
    let bestItinerary = null;
    
    for (const itin of candidateItineraries) {
      if (itin.duration < bestDuration) {
        bestDuration = itin.duration;
        bestDistance = itin.legs.reduce((sum, leg) => sum + (leg.distance || 0), 0);
        bestStartTime = itin.startTime;
        bestItinerary = itin;
      }
    }

    if (bestDuration === Infinity) return null;

    return { duration: bestDuration, distance: bestDistance, startTime: bestStartTime, itinerary: bestItinerary };
  }

  function calculateDistancesHaversine(mode, inst) {
    PROPERTIES.forEach(prop => {
      const d = haversineDistance(inst.lat, inst.lng, prop.lat, prop.lng) * 1.35;
      if (!distances[prop.id]) distances[prop.id] = {};
      distances[prop.id][mode] = {
        distance: d * 1000,
        duration: (d / SPEEDS[mode]) * 3600
      };
    });
  }

  function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── UI Rendering ────────────────────────────────────────────────────
  function getDistanceClass(km) {
    if (km <= THRESHOLDS.close) return 'close';
    if (km <= THRESHOLDS.medium) return 'medium';
    return 'far';
  }

  function getFilteredSortedProperties() {
    let props = [...PROPERTIES];

    // Text search
    if (searchQuery) {
      props = props.filter(p =>
        p.name.toLowerCase().includes(searchQuery) ||
        p.address.toLowerCase().includes(searchQuery) ||
        p.area.toLowerCase().includes(searchQuery) ||
        tArea(p.area).toLowerCase().includes(searchQuery)
      );
    }

    // Combined Filters
    props = props.filter(p => matchesFilters(p));

    // Sort
    if (currentSort === 'distance') {
      props.sort((a, b) => {
        const dA = distances[a.id]?.[currentMode]?.distance ?? Infinity;
        const dB = distances[b.id]?.[currentMode]?.distance ?? Infinity;
        return dA - dB;
      });
    } else if (currentSort === 'price') {
      props.sort((a, b) => {
        const getMin = p => {
          if (!p.apartments || p.apartments.length === 0) return Infinity;
          return Math.min(...p.apartments.map(a => parseFloat(a.rent) || Infinity));
        };
        return getMin(a) - getMin(b);
      });
    } else if (currentSort === 'name') {
      props.sort((a, b) => a.name.localeCompare(b.name, 'fi'));
    } else if (currentSort === 'area') {
      props.sort((a, b) => {
        const cmp = a.area.localeCompare(b.area, 'fi');
        if (cmp !== 0) return cmp;
        return (distances[a.id]?.[currentMode]?.distance ?? Infinity) -
               (distances[b.id]?.[currentMode]?.distance ?? Infinity);
      });
    }

    return props;
  }

  function renderPropertyList() {
    const list = document.getElementById('property-list');
    const props = getFilteredSortedProperties();

    list.querySelectorAll('.property-card, .no-results').forEach(c => c.remove());

    if (props.length === 0) {
      list.insertAdjacentHTML('beforeend', `
        <div class="no-results">
          <span class="no-results-icon">🔍</span>
          <p>${t('noResults')}</p>
        </div>
      `);
      updateResultsSummary(0);
      return;
    }

    props.forEach((prop, i) => list.appendChild(createPropertyCard(prop, i)));
    updateResultsSummary(props.length);
  }

  function createPropertyCard(prop, index) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.dataset.id = prop.id;
    card.style.animationDelay = `${Math.min(index * 0.02, 0.3)}s`;

    const dist = distances[prop.id];
    let distKm = '—';
    let distClass = '';
    let timeTexts = { foot: '—', bike: '—', bus: '—', car: '—' };

    if (dist) {
      if (dist[currentMode]) {
        distKm = (dist[currentMode].distance / 1000).toFixed(1);
        distClass = getDistanceClass(parseFloat(distKm));
      }
      ['foot', 'bike', 'bus', 'car'].forEach(mode => {
        if (dist[mode]) {
          timeTexts[mode] = formatDuration(dist[mode].duration);
          if (mode === 'bus' && dist[mode].startTime) {
            const d = new Date(dist[mode].startTime);
            const timeString = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            timeTexts[mode] += ` <span style="font-size: 0.85em; opacity: 0.7;">(${timeString})</span>`;
          }
        }
      });
    }

    if (distClass) card.classList.add(distClass);
    if (prop.id === activePropertyId) card.classList.add('active');

    const areaLabel = tArea(prop.area);
    const elliLink = t('viewOnElli');

    // Build rent summary from cheapest apartment
    let rentMin = null;
    if (prop.apartments && prop.apartments.length > 0) {
      prop.apartments.forEach(apt => {
        const r = parseFloat(apt.rent);
        if (!isNaN(r) && (rentMin === null || r < rentMin)) rentMin = r;
      });
    }
    const rentText = rentMin ? `${currentLang === 'fi' ? 'alk.' : 'from'} ${Math.round(rentMin)} €/kk` : '';

    // Build type tags
    const typeTags = (prop.types && prop.types.length > 0)
      ? prop.types.map(tp => `<span class="type-tag">${tAptType(tp)}</span>`).join('')
      : '';

    // Build amenity icons
    const amenities = [];
    if (prop.sauna) amenities.push({ icon: '<i class="ph ph-fire"></i>', label: currentLang === 'fi' ? 'Sauna' : 'Sauna' });
    if (prop.elevator) amenities.push({ icon: '<i class="ph ph-elevator"></i>', label: currentLang === 'fi' ? 'Hissi' : 'Elevator' });
    if (prop.ellinet) amenities.push({ icon: '<i class="ph ph-wifi-high"></i>', label: `Ellinet${prop.ellinet !== 'Yes' ? ' (' + prop.ellinet + ')' : ''}` });
    if (prop.parking) amenities.push({ icon: '<i class="ph ph-car"></i>', label: currentLang === 'fi' ? 'Pysäköinti' : 'Parking' });
    if (prop.laundry) amenities.push({ icon: '<i class="ph ph-washing-machine"></i>', label: currentLang === 'fi' ? 'Pesutupa' : 'Laundry' });
    if (prop.bikeStorage) amenities.push({ icon: '<i class="ph ph-bicycle"></i>', label: currentLang === 'fi' ? 'Pyörävarasto' : 'Bike storage' });

    const amenityHtml = amenities.map(a => `<span class="amenity-icon" title="${a.label}">${a.icon}</span>`).join('');

    // Year built
    const yearText = prop.yearBuilt ? `${prop.yearBuilt}` : '';

    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-name">${prop.name}</div>
          <div class="card-area">${areaLabel}${yearText ? ` · ${yearText}` : ''}</div>
        </div>
        <div class="distance-badge ${distClass}">
          <span class="distance-value">${distKm}</span>
          <span class="distance-unit">km</span>
        </div>
      </div>
      ${typeTags || rentText ? `
      <div class="card-details">
        ${typeTags ? `<div class="type-tags">${typeTags}</div>` : ''}
        ${rentText ? `<div class="rent-text">${rentText}</div>` : ''}
      </div>` : ''}
      ${amenityHtml ? `<div class="card-amenities">${amenityHtml}</div>` : ''}
      <div class="card-footer">
        <span class="time-estimate ${currentMode === 'foot' ? 'active-mode' : ''}">
          <span class="time-icon"><i class="ph ph-person-simple-walk"></i></span> ${timeTexts.foot}
        </span>
        <span class="time-estimate ${currentMode === 'bike' ? 'active-mode' : ''}">
          <span class="time-icon"><i class="ph ph-bicycle"></i></span> ${timeTexts.bike}
        </span>
        <span class="time-estimate ${currentMode === 'bus' ? 'active-mode' : ''}">
          <span class="time-icon"><i class="ph ph-bus"></i></span> ${timeTexts.bus}
        </span>
        <span class="time-estimate ${currentMode === 'car' ? 'active-mode' : ''}">
          <span class="time-icon"><i class="ph ph-car"></i></span> ${timeTexts.car}
        </span>
      </div>
      <a class="card-link" href="https://www.joensuunelli.fi/kohde/${prop.id}/" target="_blank" rel="noopener noreferrer">
        ${elliLink}
      </a>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-link')) return;
      selectProperty(prop.id);
    });

    return card;
  }

  function formatDuration(seconds) {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
  }

  function updateResultsSummary(visibleCount) {
    const summary = document.getElementById('results-summary');
    const total = PROPERTIES.length;

    if (visibleCount === total) {
      const allDists = PROPERTIES.map(p => distances[p.id]?.[currentMode]?.distance).filter(d => d != null);
      if (allDists.length > 0) {
        const near = (Math.min(...allDists) / 1000).toFixed(1);
        summary.innerHTML = `<span>${total} ${t('properties').toLowerCase()}</span> · <span>${t('nearest')}: <span class="highlight">${near} km</span></span>`;
      } else {
        summary.innerHTML = `<span>${total} ${t('properties').toLowerCase()}</span>`;
      }
    } else {
      summary.innerHTML = `<span>${t('showing')} <span class="highlight">${visibleCount}</span> ${t('of')} ${total} ${t('properties').toLowerCase()}</span>`;
    }
  }

  function updateOverlayStats() {
    const visibleProps = getFilteredSortedProperties();
    const allDists = visibleProps.map(p => distances[p.id]?.[currentMode]?.distance).filter(d => d != null);

    document.getElementById('stat-total').textContent = visibleProps.length;

    if (allDists.length > 0) {
      document.getElementById('stat-nearest').textContent = `${(Math.min(...allDists) / 1000).toFixed(1)} km`;
      document.getElementById('stat-avg').textContent = `${(allDists.reduce((a, b) => a + b, 0) / allDists.length / 1000).toFixed(1)} km`;
    } else {
      document.getElementById('stat-nearest').textContent = '—';
      document.getElementById('stat-avg').textContent = '—';
    }
  }

  function updateMapMarkers() {
    PROPERTIES.forEach(prop => {
      const dist = distances[prop.id]?.[currentMode]?.distance;
      const filteredOut = !matchesFilters(prop);
      let distClass = '';
      if (dist != null) distClass = getDistanceClass(dist / 1000);
      const marker = propertyMarkers[prop.id];
      if (marker) {
        const markerEl = marker.getElement();
        if (markerEl) {
          if (filteredOut) markerEl.classList.add('filtered-out');
          else markerEl.classList.remove('filtered-out');
        }
        marker.setIcon(createPropertyIcon(prop.id, distClass, filteredOut));
      }
    });
  }

  // ── Property Selection & Routing ────────────────────────────────────
  function selectProperty(propId) {
    if (activePropertyId) {
      const prevCard = document.querySelector(`.property-card[data-id="${activePropertyId}"]`);
      if (prevCard) prevCard.classList.remove('active');
      const prevMarker = document.querySelector(`.custom-marker[data-id="${activePropertyId}"]`);
      if (prevMarker) prevMarker.classList.remove('active');
    }

    if (activePropertyId === propId) {
      activePropertyId = null;
      clearRoute();
      return;
    }

    activePropertyId = propId;

    const card = document.querySelector(`.property-card[data-id="${propId}"]`);
    if (card) {
      card.classList.add('active');
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const markerEl = document.querySelector(`.custom-marker[data-id="${propId}"]`);
    if (markerEl) markerEl.classList.add('active');

    showRoute(propId);

    const prop = PROPERTIES.find(p => p.id === propId);
    if (prop) {
      map.fitBounds(
        L.latLngBounds([currentInstitution.lat, currentInstitution.lng], [prop.lat, prop.lng]),
        { padding: [60, 60], maxZoom: 15 }
      );
    }
  }

  async function showRoute(propId) {
    const prop = PROPERTIES.find(p => p.id === propId);
    if (!prop) return;

    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }

    try {
      const coords = `${currentInstitution.lng},${currentInstitution.lat};${prop.lng},${prop.lat}`;
      const url = `${OSRM_BASE}/route/v1/driving/${coords}?overview=full&geometries=geojson`;
      const response = await fetchWithTimeout(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        routeLayer = L.geoJSON(data.routes[0].geometry, {
          style: { color: '#e84393', weight: 4, opacity: 0.85, dashArray: '8, 6', lineCap: 'round', lineJoin: 'round' }
        }).addTo(map);

        const dist = distances[propId]?.[currentMode];
        if (dist) showRouteInfoBar(prop, dist.distance, dist.duration);
        else showRouteInfoBar(prop, data.routes[0].distance, data.routes[0].duration);
      }
    } catch (err) {
      console.warn('Route display failed:', err);
      const dist = distances[propId]?.[currentMode];
      if (dist) {
        routeLayer = L.polyline(
          [[currentInstitution.lat, currentInstitution.lng], [prop.lat, prop.lng]],
          { color: '#e84393', weight: 3, opacity: 0.6, dashArray: '5, 10' }
        ).addTo(map);
        showRouteInfoBar(prop, dist.distance, dist.duration);
      }
    }
  }

  function showRouteInfoBar(prop, distance, duration) {
    document.getElementById('route-property-name').textContent = prop.name;
    document.getElementById('route-property-area').textContent =
      `${tArea(prop.area)}${prop.yearBuilt ? ' · ' + prop.yearBuilt : ''}`;
    document.getElementById('route-distance').textContent = `${(distance / 1000).toFixed(1)} km`;
    document.getElementById('route-time').textContent = formatDuration(duration);

    // Apartment chips
    const aptsEl = document.getElementById('route-apartments');
    aptsEl.innerHTML = '';
    if (prop.apartments && prop.apartments.length > 0) {
      prop.apartments.forEach(apt => {
        const rentParts = apt.rent.split('-');
        const rentDisplay = rentParts.length > 1
          ? `${Math.round(parseFloat(rentParts[0]))}–${Math.round(parseFloat(rentParts[1]))} €`
          : `${Math.round(parseFloat(apt.rent))} €`;
        aptsEl.innerHTML += `<span class="route-apt-chip">${tAptType(apt.type)} ${apt.size} m² · <span class="apt-rent">${rentDisplay}</span></span>`;
      });
    }

    // Amenity icons
    const amenEl = document.getElementById('route-amenities');
    amenEl.innerHTML = '';
    const amenities = [];
    if (prop.sauna) amenities.push({ icon: '<i class="ph ph-fire"></i>', label: t('campus') === 'Kampus' ? 'Sauna' : 'Sauna' });
    if (prop.elevator) amenities.push({ icon: '<i class="ph ph-elevator"></i>', label: currentLang === 'fi' ? 'Hissi' : 'Elevator' });
    if (prop.ellinet) amenities.push({ icon: '<i class="ph ph-wifi-high"></i>', label: `Ellinet${prop.ellinet !== 'Yes' ? ' (' + prop.ellinet + ')' : ''}` });
    if (prop.parking) amenities.push({ icon: '<i class="ph ph-car"></i>', label: currentLang === 'fi' ? 'Pysäköinti' : 'Parking' });
    if (prop.laundry) amenities.push({ icon: '<i class="ph ph-washing-machine"></i>', label: currentLang === 'fi' ? 'Pesutupa' : 'Laundry' });
    if (prop.bikeStorage) amenities.push({ icon: '<i class="ph ph-bicycle"></i>', label: currentLang === 'fi' ? 'Pyörävarasto' : 'Bike storage' });
    amenities.forEach(a => {
      amenEl.innerHTML += `<span class="amenity-icon" title="${a.label}">${a.icon}</span>`;
    });

    // Nearby Amenities
    const nearbyEl = document.getElementById('route-nearby');
    if (nearbyEl) {
      nearbyEl.innerHTML = '';
      if (prop.amenities) {
        const typeIcons = {
          'supermarket': { icon: '<i class="ph ph-shopping-cart"></i>', label: 'Supermarket' },
          'sports': { icon: '<i class="ph ph-soccer-ball"></i>', label: 'Sports' },
          'center': { icon: '<i class="ph ph-buildings"></i>', label: 'City Center' }
        };
        for (const [type, data] of Object.entries(prop.amenities)) {
          const info = typeIcons[type];
          if (info && data) {
            const distStr = data.distance >= 1000 
              ? `${(data.distance / 1000).toFixed(1)} km` 
              : `${data.distance} m`;
            // Reusing route-apt-chip style for nearby places
            nearbyEl.innerHTML += `<span class="route-apt-chip" style="background: var(--bg-glass); border-color: var(--bg-glass-border); padding: 4px 8px; margin-top: 4px;"><span title="${info.label}">${info.icon}</span> ${data.name} · <span style="opacity: 0.7;">${distStr}</span></span>`;
          }
        }
      }
    }

    // Elli link & Schedule link
    const linksContainer = document.getElementById('route-links-container');
    if (linksContainer) {
      // If we added a container
    }
    
    let elliLinkHtml = `<a class="route-elli-link" id="route-elli-link" href="${elliUrl(prop)}" target="_blank" rel="noopener noreferrer">
      <span data-i18n="viewOnElli">View on Elli's website →</span>
    </a>`;

    const dist = distances[prop.id];
    const hasBusItin = dist && dist.bus && dist.bus.itinerary;
    if (hasBusItin) {
      elliLinkHtml += `
      <a class="route-elli-link" href="#" onclick="window.showBusSchedule('${prop.id}'); return false;" style="margin-left: 15px; color: var(--accent-light);">
        <span>View bus schedule →</span>
      </a>`;
    }

    // We'll replace the existing route-elli-link with our new HTML inside its parent
    const oldLink = document.getElementById('route-elli-link');
    if (oldLink && oldLink.parentElement) {
      // Find or create a container so we don't duplicate
      let container = document.getElementById('route-links-wrapper');
      if (!container) {
        container = document.createElement('div');
        container.id = 'route-links-wrapper';
        container.style.display = 'flex';
        container.style.gap = '15px';
        container.style.flexWrap = 'wrap';
        oldLink.parentElement.replaceChild(container, oldLink);
      }
      container.innerHTML = elliLinkHtml;
    }

    document.getElementById('route-info-bar').classList.add('visible');
  }

  function clearRoute() {
    activePropertyId = null;
    if (routeLayer) { 
      try { map.removeLayer(routeLayer); } catch(e) { console.warn('Could not remove route layer', e); }
      routeLayer = null; 
    }
    document.getElementById('route-info-bar').classList.remove('visible');
    document.querySelectorAll('.property-card.active').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.custom-marker.active').forEach(m => m.classList.remove('active'));
    try { map.closePopup(); } catch(e) {}
  }

  // ── Loading State ───────────────────────────────────────────────────
  function showLoading(show) {
    const loader = document.getElementById('loading-state');
    loader.classList.toggle('hidden', !show);
  }

  // ── Boot ────────────────────────────────────────────────────────────
  // Modal Events
  document.getElementById('close-schedule-modal')?.addEventListener('click', () => {
    document.getElementById('schedule-modal').classList.remove('active');
  });
  document.getElementById('schedule-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'schedule-modal') {
      e.target.classList.remove('active');
    }
  });

  // Global function for Leaflet popup button
  window.showBusSchedule = function(propId) {
    const prop = PROPERTIES.find(p => p.id === propId);
    const dist = distances[propId];
    if (!prop || !dist || !dist.bus || !dist.bus.itinerary) return;

    const itin = dist.bus.itinerary;
    const titleEl = document.getElementById('schedule-modal-title');
    const bodyEl = document.getElementById('schedule-modal-body');
    
    titleEl.textContent = `Bus Schedule: ${prop.name} → ${currentInstitution.name}`;

    let html = '';
    itin.legs.forEach(leg => {
      const sTime = new Date(leg.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
      const eTime = new Date(leg.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false});
      
      let icon = leg.mode === 'BUS' ? '<i class="ph-fill ph-bus"></i>' : '<i class="ph-fill ph-person-simple-walk"></i>';
      let desc = '';
      if (leg.mode === 'BUS') {
        const routeName = leg.route && leg.route.shortName ? leg.route.shortName : 'Bus';
        const fromName = leg.from && leg.from.name ? leg.from.name : 'Unknown stop';
        const toName = leg.to && leg.to.name ? leg.to.name : 'Unknown stop';
        desc = `Take bus ${routeName} from ${fromName} to ${toName}`;
      } else {
        const toName = leg.to && leg.to.name !== 'Destination' ? leg.to.name : currentInstitution.name;
        desc = `Walk to ${toName}`;
      }

      html += `
        <div class="schedule-step">
          <div class="step-icon">${icon}</div>
          <div class="step-details">
            <div class="step-time">${sTime} - ${eTime} (${Math.round(leg.duration/60)} min)</div>
            <div class="step-desc">${desc}</div>
            <div class="step-sub">${(leg.distance).toFixed(0)}m</div>
          </div>
        </div>
      `;
    });

    bodyEl.innerHTML = html;
    document.getElementById('schedule-modal').classList.add('active');
  };

  init();
})();
