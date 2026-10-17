import { CareersBoard } from './Careers.js';
import { TeamBoard } from './Team.js';
import { ContactBoard } from './Contact.js';

// ---------------------------------------------------------------------
//  LIGHT themes. The key is the data-time="" of the dropdown button in index.html.
//  sky   = preset name in Atmosphere.js setPreset()
//  water = preset name in Water.js setPreset()
//  The label "Jade" is also read by Aboutocean.js (keep it the same).
// ---------------------------------------------------------------------
const THEMES = {
  greenery: { label: 'Greenery', icon: '🌱', sky: 'greenery', water: 'greenery' },
  day:      { label: 'Dawn',     icon: '🌅', sky: 'day',      water: 'day' },
  sunset:   { label: 'Sunset',   icon: '🌇', sky: 'sunset',   water: 'sunset' },
  night:    { label: 'Night',    icon: '🌌', sky: 'night',    water: 'night' },
  jade:     { label: 'Jade',     icon: '🌿', sky: 'about',    water: 'about' },
  aurora:   { label: 'Aurora',   icon: '🟢', sky: 'contact',  water: 'contact' },
  mint:     { label: 'Mint',     icon: '🍃', sky: 'mint',     water: 'about' },
  pine:     { label: 'Pine',     icon: '🌲', sky: 'pine',     water: 'greenery' },
  spring:   { label: 'Spring',   icon: '🌼', sky: 'spring',   water: 'greenery' },
  olive:    { label: 'Olive',    icon: '🫒', sky: 'olive',    water: 'greenery' },
  sage:     { label: 'Sage',     icon: '🌾', sky: 'sage',     water: 'greenery' }
};

// Which theme each page opens with (Home and Team unchanged)
const PAGE_THEMES = {
  home: 'day',
  team: 'greenery',
  about: 'jade',
  contact: 'aurora',
  services: 'mint',
  careers: 'spring'
};

export class UIManager {
  constructor(cameraRig, soundManager, atmosphere, terrain = null, water = null, tradingObjects = null) {
    this.cameraRig = cameraRig;
    this.soundManager = soundManager;
    this.atmosphere = atmosphere;
    this.terrain = terrain;
    this.water = water;
    this.tradingObjects = tradingObjects;

    this.currentMode = 'home'; // 'home' | 'about' | 'services' | 'careers' | 'team'

    this.cursor = document.getElementById('cursor');
    this.cursorInner = this.cursor ? this.cursor.querySelector('.cursor-inner') : null;
    this.mousePos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this.progressBar = document.getElementById('loader-bar');
    this.loaderText = document.getElementById('loader-text');
    this.progressFillHome = document.getElementById('progress-bar-fill');
    this.progressFillAbout = document.getElementById('progress-bar-fill-about');

    this.homeSections = [
      { id: 'sec-hero', range: [0.0, 0.14] },
      { id: 'sec-strategy', range: [0.14, 0.34] },
      { id: 'sec-oil', range: [0.34, 0.62] },
      { id: 'sec-metals', range: [0.62, 0.85] },
      { id: 'sec-global', range: [0.85, 1.01] }
    ];

    this.aboutSections = [
      { id: 'sec-about-hero', range: [0.0, 0.14] },
      { id: 'sec-about-who', range: [0.14, 0.34] },
      { id: 'sec-about-mission', range: [0.34, 0.62] },
      { id: 'sec-about-vision', range: [0.62, 0.85] },
      { id: 'sec-about-stats', range: [0.85, 1.01] }
    ];

    this.servicesSections = [
      { id: 'sec-svc-hero', range: [0.0, 0.14] },
      { id: 'sec-svc-acers', range: [0.14, 0.34] },
      { id: 'sec-svc-risk', range: [0.34, 0.62] },
      { id: 'sec-svc-workflow', range: [0.62, 0.85] },
      { id: 'sec-svc-contact', range: [0.85, 1.01] }
    ];

    this.careersSections = [
      { id: 'sec-car-hero', range: [0.0, 0.14] },
      { id: 'sec-car-why', range: [0.14, 0.34] },
      { id: 'sec-car-openings', range: [0.34, 0.68] },
      { id: 'sec-car-process', range: [0.68, 0.86] },
      { id: 'sec-car-apply', range: [0.86, 1.01] }
    ];

    this.teamSections = [
      { id: 'sec-team-hero', range: [0.0, 0.12] },
      { id: 'sec-team-grid', range: [0.12, 1.01] }
    ];

    this.contactSections = [
      { id: 'sec-contact-hero', range: [0.0, 0.12] },
      { id: 'sec-contact-grid', range: [0.12, 1.01] }
    ];

    this.homeView = document.getElementById('home-view');
    this.aboutView = document.getElementById('about-view');
    this.servicesView = document.getElementById('services-view');
    this.chaptersHome = document.getElementById('chapters-home');
    this.chaptersAbout = document.getElementById('chapters-about');
    this.chaptersServices = document.getElementById('chapters-services');

    this.chapterItemsHome = Array.from(this.chaptersHome?.querySelectorAll('.chapter-item') || []);
    this.chapterItemsAbout = Array.from(this.chaptersAbout?.querySelectorAll('.chapter-item') || []);
    this.chapterItemsServices = Array.from(this.chaptersServices?.querySelectorAll('.chapter-item') || []);
    this.progressFillServices = document.getElementById('progress-bar-fill-services');
    this.careersView = document.getElementById('careers-view');
    this.chaptersCareers = document.getElementById('chapters-careers');
    this.chapterItemsCareers = Array.from(this.chaptersCareers?.querySelectorAll('.chapter-item') || []);
    this.progressFillCareers = document.getElementById('progress-bar-fill-careers');
    this.teamView = document.getElementById('team-view');
    this.chaptersTeam = document.getElementById('chapters-team');
    this.chapterItemsTeam = Array.from(this.chaptersTeam?.querySelectorAll('.chapter-item') || []);
    this.progressFillTeam = document.getElementById('progress-bar-fill-team');
    this.contactView = document.getElementById('contact-view');
    this.chaptersContact = document.getElementById('chapters-contact');
    this.chapterItemsContact = Array.from(this.chaptersContact?.querySelectorAll('.chapter-item') || []);
    this.progressFillContact = document.getElementById('progress-bar-fill-contact');

    // soft full-screen fade used when switching pages (hides the camera jump)
    this.curtain = document.createElement('div');
    this.curtain.style.cssText = 'position:fixed;inset:0;z-index:90;pointer-events:none;opacity:0;' +
      'background:radial-gradient(ellipse at 50% 45%,#0c1d2c 0%,#03070c 100%);transition:opacity 0.55s cubic-bezier(0.65,0,0.35,1);';
    document.body.appendChild(this.curtain);

    this.brandLogoBtn = document.getElementById('brand-logo-btn');
    this.navHome = document.getElementById('nav-home');
    this.navAbout = document.getElementById('nav-about');
    this.navServices = document.getElementById('nav-services');
    this.navCareers = document.getElementById('nav-careers');
    this.navTeam = document.getElementById('nav-team');
    this.navContact = document.getElementById('nav-contact');

    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');

    this.initCursor();
    this.initChapters();
    this.initNavigation();
    this.initDropdowns();
    this.initDrawer();
    this.initModals();
    this.initAudioAndTopButtons();

    // Careers page: job list, job details panel and apply-by-email form
    this.careers = new CareersBoard(this.cameraRig);

    // Team page: member cards that scroll over the meadow
    this.team = new TeamBoard();

    // Contact page: interactive brief form, live AI chat, FAQs, map & 3D network
    this.contact = new ContactBoard(this.cameraRig);
  }

  initCursor() {
    // Native system cursor is used for ultra-fast, smooth, zero-latency response
  }

  initChapters() {
    const bindChapters = (items) => {
      items.forEach(item => {
        item.addEventListener('click', () => {
          const prog = parseFloat(item.dataset.progress);
          this.cameraRig.glideTo(prog, 1.2);
        });
      });
    };

    bindChapters(this.chapterItemsHome);
    bindChapters(this.chapterItemsAbout);
    bindChapters(this.chapterItemsServices);
    bindChapters(this.chapterItemsCareers);
    bindChapters(this.chapterItemsTeam);
    bindChapters(this.chapterItemsContact);
  }

  initNavigation() {
    // 1. Brand Logo: Return to initial landing page state
    this.brandLogoBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchMode('home');
    });

    // 2. Home Navigation Link
    this.navHome?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchMode('home');
    });

    // 3. About Navigation Link
    this.navAbout?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchMode('about');
    });

    // 4. Services Navigation Link - opens the Services page (hologram scroll)
    this.navServices?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchMode('services');
    });

    // 4b. Careers Navigation Link - opens the Careers page (mountain -> globe scroll)
    this.navCareers?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchMode('careers');
    });

    // 4c. Team Navigation Link - opens the Team page (mountain -> meadow scroll)
    this.navTeam?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchMode('team');
    });

    // 5. Contact Navigation Link - opens the Contact Us page (Aurora Emerald mountain -> 3D network scroll)
    this.navContact?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchMode('contact');
    });
  }

  switchMode(newMode) {
    if (this.currentMode === newMode) {
      // Already in this mode, smoothly glide to top/hero vista
      this.cameraRig.glideTo(0.0, 1.2);
      return;
    }
    if (this.switching) return;
    this.switching = true;

    // 1. fade to dark, 2. swap page + reset camera while hidden, 3. fade back in
    this.curtain.style.opacity = '1';
    setTimeout(() => {
      this.applyMode(newMode);
      this.cameraRig.jumpToProgress(0.0, false);
      setTimeout(() => {
        this.curtain.style.opacity = '0';
        this.switching = false;
      }, 120);
    }, 560);
  }

  // Applies one LIGHT theme to the mountain, sky and lake, and updates the dropdown.
  // instant = true jumps straight to the colours (used while the page-change fade covers the screen)
  applyTheme(name, instant = false) {
    const t = THEMES[name] || THEMES.day;
    if (this.terrain) {
      if (typeof this.terrain.setTheme === 'function') {
        this.terrain.setTheme(name);
      } else {
        this.terrain.setContactTheme?.(name === 'aurora' ? 1.0 : 0.0);
        this.terrain.setAboutTheme?.(name === 'jade' ? 1.0 : 0.0);
        this.terrain.setGreenery?.(name === 'greenery' ? 1.0 : 0.0);
      }
    }
    this.atmosphere?.setPreset(t.sky);
    this.water?.setPreset(t.water);

    const lightCurrent = document.getElementById('light-current');
    if (lightCurrent) lightCurrent.textContent = `${t.icon} ${t.label}`;
    document.querySelectorAll('#dropdown-light .dropdown-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.time === name);
    });

    if (instant) {
      this.atmosphere?.update(1, 0);
      this.water?.update(1, 0);
      if (this.terrain) {
        if (typeof this.terrain.snapTheme === 'function') {
          this.terrain.snapTheme();
        } else {
          this.terrain.uniforms.uAboutTheme.value = this.terrain.targetAboutTheme;
          this.terrain.uniforms.uGreenery.value = this.terrain.targetGreenery;
          this.terrain.uniforms.uContactTheme.value = this.terrain.targetContactTheme;
        }
      }
    }
  }

  applyMode(newMode) {
    this.currentMode = newMode;
    this.careers?.close();
    const lightCurrent = document.getElementById('light-current');

    // 1. navigation active state
    this.navHome?.classList.toggle('active', newMode === 'home');
    this.navAbout?.classList.toggle('active', newMode === 'about');
    this.navServices?.classList.toggle('active', newMode === 'services');
    this.navCareers?.classList.toggle('active', newMode === 'careers');
    this.navTeam?.classList.toggle('active', newMode === 'team');
    this.navContact?.classList.toggle('active', newMode === 'contact');
    document.querySelectorAll('.drawer-page-link').forEach(link => {
      link.classList.toggle('active', link.dataset.page === newMode);
    });

    // 2-4. theme for each page (change the names in PAGE_THEMES at the top of this file)
    this.applyTheme(PAGE_THEMES[newMode] || 'day', true);

    // 5. oil & metals 3D objects only on Home
    this.tradingObjects?.setEnabled(newMode === 'home');

    // 6. view layers
    this.homeView?.classList.toggle('active', newMode === 'home');
    this.aboutView?.classList.toggle('active', newMode === 'about');
    this.servicesView?.classList.toggle('active', newMode === 'services');
    this.careersView?.classList.toggle('active', newMode === 'careers');
    this.teamView?.classList.toggle('active', newMode === 'team');
    this.contactView?.classList.toggle('active', newMode === 'contact');
    if (newMode === 'team') this.team?.measure();
    if (newMode === 'contact') this.contact?.measure();

    // 7. chapter navigation sidebar
    if (this.chaptersHome) this.chaptersHome.style.display = newMode === 'home' ? 'flex' : 'none';
    if (this.chaptersAbout) this.chaptersAbout.style.display = newMode === 'about' ? 'flex' : 'none';
    if (this.chaptersServices) this.chaptersServices.style.display = newMode === 'services' ? 'flex' : 'none';
    if (this.chaptersCareers) this.chaptersCareers.style.display = newMode === 'careers' ? 'flex' : 'none';
    if (this.chaptersTeam) this.chaptersTeam.style.display = newMode === 'team' ? 'flex' : 'none';
    if (this.chaptersContact) this.chaptersContact.style.display = newMode === 'contact' ? 'flex' : 'none';

    // 8. drawer links
    const drawers = { home: 'drawer-home-nav', about: 'drawer-about-nav', services: 'drawer-services-nav', careers: 'drawer-careers-nav', team: 'drawer-team-nav', contact: 'drawer-contact-nav' };
    Object.entries(drawers).forEach(([mode, id]) => {
      const el = document.getElementById(id);
      if (el) el.style.display = mode === newMode ? 'block' : 'none';
    });
  }

  initDropdowns() {
    const dropdowns = document.querySelectorAll('.header-dropdown');
    const lightCurrent = document.getElementById('light-current');
    const modeCurrent = document.getElementById('mode-current');

    // Click toggle support for mobile / touch / click interaction
    dropdowns.forEach(dd => {
      const btn = dd.querySelector('.header-dropdown-btn');
      btn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdowns.forEach(other => {
          if (other !== dd) other.classList.remove('open');
        });
        dd.classList.toggle('open');
      });
    });

    // Close on click outside
    document.addEventListener('click', () => {
      dropdowns.forEach(dd => dd.classList.remove('open'));
    });

    // Light dropdown items
    const lightItems = Array.from(document.querySelectorAll('#dropdown-light .dropdown-item'));
    lightItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const time = item.dataset.time;
        if (time) this.applyTheme(time, false);

        dropdowns.forEach(dd => dd.classList.remove('open'));
      });
    });

    // Mode dropdown items
    const modeItems = Array.from(document.querySelectorAll('#dropdown-mode .dropdown-item'));
    modeItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        modeItems.forEach(b => b.classList.remove('active'));
        item.classList.add('active');

        const label = item.querySelector('.dropdown-item-label')?.textContent?.trim() || '';
        const icon = item.querySelector('.dropdown-icon')?.textContent?.trim() || '';
        if (modeCurrent) {
          modeCurrent.textContent = `${icon} ${label}`;
        }

        const mode = item.dataset.mode;
        if (mode) {
          this.cameraRig?.setMode(mode);
        }

        dropdowns.forEach(dd => dd.classList.remove('open'));
      });
    });
  }

  initDrawer() {
    const menuBtn = document.getElementById('menu-btn');
    const drawer = document.getElementById('menu-drawer');
    const closeBtn = document.getElementById('drawer-close');
    const backdrop = document.getElementById('drawer-backdrop');
    const drawerLinks = document.querySelectorAll('.drawer-link');
    const drawerPageLinks = document.querySelectorAll('.drawer-page-link');

    const openDrawer = () => {
      drawer?.classList.add('open');
      backdrop?.classList.add('open');
    };
    const closeDrawer = () => {
      drawer?.classList.remove('open');
      backdrop?.classList.remove('open');
    };

    menuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (drawer?.classList.contains('open')) closeDrawer();
      else openDrawer();
    });

    closeBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);

    drawerPageLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.dataset.page;
        if (page) {
          this.switchMode(page);
          closeDrawer();
        }
      });
    });

    drawerLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = parseFloat(link.dataset.target);
        if (!isNaN(target)) this.cameraRig?.glideTo(target, 1.4);
        closeDrawer();
      });
    });
  }

  initModals() {
    const expandBtns = document.querySelectorAll('.expand-btn');
    const closeBtn = document.getElementById('modal-close');

    const details = {
      crude: {
        title: 'Crude Oil Logistics & Trading',
        text: 'Oleovista coordinates large-scale transfers of crude oil from major producing nations in the Middle East, West Africa, and North America to refineries across the Mediterranean, Asia-Pacific, and proprietary assets. We operate chartered VLCCs and Suezmax tankers with real-time risk hedging.'
      },
      marine: {
        title: 'Marine Fuels & Fujairah Bunkering',
        text: 'Operating directly in the Port of Fujairah, our dedicated bunker barge fleet delivers VLSFO, LSMGO, and High Sulfur Fuel Oil round the clock. In line with IMO 2030 decarbonization goals, we are pioneering biofuel blends and methanol bunkering.'
      },
      gasoline: {
        title: 'Gasoline & Blending Hub',
        text: 'Our specialized blending facilities optimize octane numbers and vapor pressures to meet regional specifications across East Africa, Red Sea, and Indian Ocean markets, minimizing transit storage loss.'
      },
      lpg: {
        title: 'LPG Global Transport',
        text: 'Using modern VLGCs (Very Large Gas Carriers), Oleovista links US Gulf Coast and AG export terminals with petchem plants and utility distribution in East Asia and emerging African clean-cooking initiatives.'
      },
      'gas-power': {
        title: 'Gas & Power Markets',
        text: 'Licensed trading desks operate across cross-border interconnection corridors in Southeastern Europe and Turkey, facilitating physical natural gas flows and peak-load electrical power.'
      },
      'fuel-oil': {
        title: 'Fuel Oil & Industrial Utilities',
        text: 'Sophisticated heavy fuel oil blending for coastal power plants, utility boilers, and marine propulsion, with strict environmental sulfur auditing.'
      },
      distillates: {
        title: 'Distillates Distribution',
        text: 'Over 1 million metric tons of gasoil, diesel, and jet fuel moved annually into regional inland depots, mining sites, and transit hubs.'
      },
      naphtha: {
        title: 'Naphtha & Low Carbon Fuels',
        text: 'Supplying light and heavy virgin naphtha to steam crackers for petrochemical plastics, alongside drop-in renewable fuels and green hydrogen derivatives.'
      }
    };

    expandBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.product-card');
        const prod = card?.dataset.prod;
        const info = details[prod] || { title: 'Product Overview', text: card?.querySelector('.prod-snippet')?.textContent };
        
        if (this.modalContent) {
          this.modalContent.innerHTML = `
            <div class="card-eyebrow">COMMODITY SPECIFICATION</div>
            <h2 class="card-title">${info.title}</h2>
            <div class="card-text" style="margin-top:1.2rem;"><p>${info.text}</p></div>
          `;
        }
        this.modal?.classList.add('open');
      });
    });

    closeBtn?.addEventListener('click', () => this.modal?.classList.remove('open'));
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.modal.classList.remove('open');
    });
  }

  initAudioAndTopButtons() {
    const soundBtn = document.getElementById('sound-btn');
    const scrollTopBtn = document.getElementById('scroll-top-btn');

    soundBtn?.addEventListener('click', () => {
      this.soundManager.toggle();
    });

    scrollTopBtn?.addEventListener('click', () => {
      this.cameraRig?.glideTo(0.0, 1.4);
    });
  }

  updateProgress(loaded, total) {
    const pct = Math.round((loaded / total) * 100);
    if (this.progressBar) this.progressBar.style.width = `${pct}%`;
    if (this.loaderText) this.loaderText.textContent = `Loading 3D Alpine Environment (${pct}%)...`;
  }

  onLoaded() {
    document.body.classList.remove('loading');
    document.body.classList.add('loaded');
  }

  update(dt, elapsedTime) {
    const prog = this.cameraRig?.getProgress() || 0;

    // Update left progress track based on mode
    const tracks = {
      home: [this.progressFillHome, this.chapterItemsHome],
      about: [this.progressFillAbout, this.chapterItemsAbout],
      services: [this.progressFillServices, this.chapterItemsServices],
      careers: [this.progressFillCareers, this.chapterItemsCareers],
      team: [this.progressFillTeam, this.chapterItemsTeam],
      contact: [this.progressFillContact, this.chapterItemsContact]
    };
    const [fill, items] = tracks[this.currentMode] || tracks.home;
    if (this.currentMode === 'team') this.team?.update(prog);
    if (this.currentMode === 'contact') this.contact?.update(prog);
    if (fill) fill.style.height = `${prog * 100}%`;
    items.forEach(item => {
      const itemProg = parseFloat(item.dataset.progress);
      item.classList.toggle('active', Math.abs(prog - itemProg) < 0.12);
    });

    // Active Story Section visibility for current mode
    const all = { home: this.homeSections, about: this.aboutSections, services: this.servicesSections, careers: this.careersSections, team: this.teamSections, contact: this.contactSections };
    Object.entries(all).forEach(([mode, sections]) => {
      sections.forEach(sec => {
        const el = document.getElementById(sec.id);
        if (!el) return;
        const on = mode === this.currentMode && prog >= sec.range[0] && prog < sec.range[1];
        el.classList.toggle('active', on);
      });
    });
  }
}