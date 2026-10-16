/*
  Careers.js  -  job openings list, job details panel and "apply by email" form for the Careers page.
  ---------------------------------------------------------------------------------------------------
  Edit CAREERS_EMAIL and the JOBS list below to change what is shown. Nothing else needs changing.

  How applying works: the form opens the visitor's email app with a ready-made email to CAREERS_EMAIL
  (subject + all the form details filled in). They attach their CV and press Send. No server needed.
*/

export const CAREERS_EMAIL = 'careers@oleovista.com';

const BENEFITS = [
  'Hybrid working and flexible hours',
  'Health insurance for you and your family',
  'Yearly learning budget and certifications',
  'Work on live global energy-trading systems'
];

export const JOBS = [
  {
    id: 'OV-ENG-101',
    title: 'Senior Full-Stack Engineer – ACERS Platform',
    dept: 'Engineering',
    location: 'India · Hybrid',
    type: 'Full-time',
    experience: '5+ years',
    summary: 'Build the core of ACERS, our ERP + ETRM platform for commodity and energy trading firms.',
    about: 'You will design and ship features across trade capture, positions, risk and settlements, working closely with product, quants and our clients\' trading desks. You will own modules end to end, from data model to UI.',
    responsibilities: [
      'Design, build and maintain services and UIs for trade capture, positions and P/L',
      'Model complex commodity contracts (physical and paper) in clean, testable code',
      'Integrate exchange, market-data and ERP feeds through robust APIs',
      'Review code, mentor engineers and keep quality high with automated tests',
      'Work with clients to turn trading workflows into product features'
    ],
    requirements: [
      '5+ years building production web applications',
      'Strong in TypeScript / JavaScript and one backend stack (Node.js, Java or .NET)',
      'Solid SQL and data-modelling skills (PostgreSQL or SQL Server)',
      'Experience with REST / event-driven architectures and cloud deployment',
      'Clear communication in English'
    ],
    niceToHave: ['Exposure to ETRM / CTRM, banking or trading systems', 'React and data-heavy dashboards', 'Kafka, Redis or time-series databases']
  },
  {
    id: 'OV-PRD-102',
    title: 'ETRM Business Analyst',
    dept: 'Product',
    location: 'India · Hybrid',
    type: 'Full-time',
    experience: '3–6 years',
    summary: 'Be the bridge between trading desks and our engineers, turning workflows into clear product specs.',
    about: 'You will run discovery workshops with traders, risk managers and back-office teams, map their processes, and write the specifications our engineers build ACERS features from.',
    responsibilities: [
      'Run client workshops and document trade lifecycle, risk and settlement workflows',
      'Write user stories, acceptance criteria and functional specifications',
      'Configure ACERS for new clients and support user-acceptance testing',
      'Prioritise the backlog with product and engineering leads',
      'Train client users and write product documentation'
    ],
    requirements: [
      '3+ years as a business analyst on trading, treasury, banking or ERP systems',
      'Understanding of the trade lifecycle: front, middle and back office',
      'Confident with SQL and Excel for data analysis',
      'Excellent written and spoken English'
    ],
    niceToHave: ['Experience with oil, gas, power or metals trading', 'Certification such as CBAP or PSPO', 'Agile / Scrum delivery']
  },
  {
    id: 'OV-RSK-103',
    title: 'Quantitative Risk Analyst',
    dept: 'Trading & Risk',
    location: 'India · Hybrid',
    type: 'Full-time',
    experience: '2–5 years',
    summary: 'Build the MTM, VaR and stress-testing models behind our risk analytics module.',
    about: 'You will develop and validate the risk models inside ACERS: mark-to-market, Value-at-Risk, exposure and scenario analysis for commodity portfolios, and help clients understand the numbers.',
    responsibilities: [
      'Implement and validate MTM, P/L attribution, VaR and stress-test models',
      'Build forward curves and volatility surfaces from market data',
      'Prototype analytics in Python and work with engineers to productionise them',
      'Write clear model documentation for clients and auditors'
    ],
    requirements: [
      'Degree in finance, maths, statistics, engineering or similar',
      '2+ years in market risk, quant or trading analytics',
      'Strong Python (pandas, NumPy) and SQL',
      'Good grasp of derivatives: futures, swaps and options'
    ],
    niceToHave: ['FRM or CFA progress', 'Commodity or energy market experience', 'Monte-Carlo simulation']
  },
  {
    id: 'OV-ENG-104',
    title: 'DevOps & Cloud Engineer',
    dept: 'Engineering',
    location: 'Remote · India',
    type: 'Full-time',
    experience: '3+ years',
    summary: 'Run secure, multi-tenant cloud environments for clients trading around the clock.',
    about: 'You will own our cloud infrastructure, CI/CD and observability, keeping ACERS fast, secure and always available for clients across time zones.',
    responsibilities: [
      'Manage cloud infrastructure as code (Terraform or similar)',
      'Build and improve CI/CD pipelines and container deployments',
      'Set up monitoring, alerting, logging, backups and disaster recovery',
      'Harden security: access control, secrets, patching and audits'
    ],
    requirements: [
      '3+ years in DevOps / SRE roles',
      'Hands-on with AWS or Azure, Docker and Kubernetes',
      'Scripting in Bash or Python',
      'Experience running production databases'
    ],
    niceToHave: ['ISO 27001 / SOC 2 experience', 'Prometheus and Grafana', 'On-call experience for financial systems']
  },
  {
    id: 'OV-DSN-105',
    title: 'Creative Developer – 3D Web',
    dept: 'Design',
    location: 'India · Hybrid',
    type: 'Full-time',
    experience: '2+ years',
    summary: 'Craft immersive WebGL experiences like this website, and beautiful product dashboards.',
    about: 'You will design and build 3D, motion-rich web experiences with three.js and shaders, and help bring the same polish to data visualisation inside our products.',
    responsibilities: [
      'Build interactive 3D scenes with three.js / WebGL and GLSL shaders',
      'Create scroll-driven storytelling and smooth UI animation',
      'Optimise for performance on laptops and phones',
      'Design data visualisations for trading dashboards'
    ],
    requirements: [
      '2+ years front-end development with a strong portfolio',
      'Good knowledge of three.js, WebGL and modern JavaScript',
      'An eye for typography, motion and detail'
    ],
    niceToHave: ['Blender or other 3D tools', 'GSAP', 'D3 or other charting libraries']
  },
  {
    id: 'OV-BD-106',
    title: 'Business Development Manager – Energy Markets',
    dept: 'Business',
    location: 'Dubai, UAE',
    type: 'Full-time',
    experience: '6+ years',
    summary: 'Grow ACERS across trading houses, refiners and bunker suppliers in the Middle East and beyond.',
    about: 'You will find and win new clients for our trading and risk software, from first meeting to signed contract, working with our solution team on demos and proposals.',
    responsibilities: [
      'Build a pipeline of trading houses, refiners, shippers and bunker suppliers',
      'Lead discovery meetings, product demos and commercial proposals',
      'Negotiate and close software and services contracts',
      'Represent Oleovista at industry events'
    ],
    requirements: [
      '6+ years in B2B sales or business development in energy, commodities or fintech',
      'A network in Middle East energy and trading markets',
      'Strong presentation and negotiation skills'
    ],
    niceToHave: ['Selling ETRM / CTRM or ERP software', 'Arabic language skills']
  },
  {
    id: 'OV-ENG-107',
    title: 'Graduate Software Engineer',
    dept: 'Engineering',
    location: 'India · On-site',
    type: 'Full-time · Graduate',
    experience: '0–1 years',
    summary: 'Start your career building real software for global energy-trading companies.',
    about: 'A structured first year: mentoring, a learning plan and real work in a product team, shipping features to live clients from your first months.',
    responsibilities: [
      'Write, test and ship code with a senior engineer as your mentor',
      'Fix bugs and add features across the ACERS platform',
      'Learn how trading, risk and settlements work'
    ],
    requirements: [
      'Degree in computer science, IT or engineering (2024–2026 graduates)',
      'Good programming basics in any language',
      'Curious, eager to learn and a good team player'
    ],
    niceToHave: ['Internship or personal projects you can show', 'Interest in finance or markets']
  }
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class CareersBoard {
  constructor(cameraRig) {
    this.cameraRig = cameraRig;
    this.filter = 'All';
    this.job = null;

    this.list = document.getElementById('careers-job-list');
    this.filters = document.getElementById('careers-filters');
    this.count = document.getElementById('careers-count');
    this.panel = document.getElementById('job-panel');
    this.body = document.getElementById('job-panel-body');
    if (!this.list || !this.panel || !this.body) return;   // careers markup not present

    this.renderFilters();
    this.renderList();
    this.bindPanel();
    this.isolateScroll(this.list);

    // buttons anywhere on the careers page
    document.querySelectorAll('[data-careers-goto]').forEach((b) => {
      b.addEventListener('click', (e) => { e.preventDefault(); this.cameraRig?.glideTo(parseFloat(b.dataset.careersGoto), 1.4); });
    });
    document.querySelectorAll('[data-careers-general]').forEach((b) => {
      b.addEventListener('click', (e) => { e.preventDefault(); this.open(null, true); });
    });
    document.querySelectorAll('.careers-mail').forEach((el) => { el.textContent = CAREERS_EMAIL; });
  }

  /* ---------- list ---------- */
  renderFilters() {
    if (!this.filters) return;
    const depts = ['All', ...new Set(JOBS.map((j) => j.dept))];
    this.filters.innerHTML = depts.map((d) =>
      `<button class="car-chip${d === this.filter ? ' active' : ''}" data-dept="${esc(d)}">${esc(d)}</button>`).join('');
    this.filters.querySelectorAll('.car-chip').forEach((b) => {
      b.addEventListener('click', () => { this.filter = b.dataset.dept; this.renderFilters(); this.renderList(); });
    });
  }

  renderList() {
    const jobs = JOBS.filter((j) => this.filter === 'All' || j.dept === this.filter);
    if (this.count) this.count.textContent = `${JOBS.length} open position${JOBS.length === 1 ? '' : 's'}`;
    this.list.innerHTML = jobs.map((j) => `
      <button class="car-job" data-id="${esc(j.id)}">
        <span class="car-job-main">
          <span class="car-job-dept">${esc(j.dept)}</span>
          <span class="car-job-title">${esc(j.title)}</span>
          <span class="car-job-meta"><span>${esc(j.location)}</span><span>${esc(j.type)}</span><span>${esc(j.experience)}</span></span>
        </span>
        <span class="car-job-arrow" aria-hidden="true">→</span>
      </button>`).join('') || '<p class="car-empty">No openings in this team right now.</p>';
    this.list.querySelectorAll('.car-job').forEach((b) => {
      b.addEventListener('click', () => this.open(JOBS.find((j) => j.id === b.dataset.id)));
    });
  }

  /* ---------- details panel ---------- */
  bindPanel() {
    document.getElementById('job-panel-close')?.addEventListener('click', () => this.close());
    this.panel.addEventListener('click', (e) => { if (e.target === this.panel) this.close(); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.isOpen()) this.close(); });
    // keep wheel / touch / keys inside the panel from moving the 3D camera
    ['wheel', 'touchmove'].forEach((ev) => this.panel.addEventListener(ev, (e) => e.stopPropagation(), { passive: true }));
    this.panel.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Escape') this.close();
    });
  }

  // let a scrollable list scroll on its own; only pass the wheel to the page at its ends
  isolateScroll(el) {
    el.addEventListener('wheel', (e) => {
      const canScroll = el.scrollHeight > el.clientHeight + 2;
      if (!canScroll) return;
      const atTop = el.scrollTop <= 0 && e.deltaY < 0;
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atEnd) e.stopPropagation();
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      if (el.scrollHeight > el.clientHeight + 2) e.stopPropagation();
    }, { passive: true });
  }

  isOpen() { return this.panel?.classList.contains('open'); }

  open(job, goToForm = false) {
    this.job = job;
    this.body.innerHTML = job ? this.detailsHTML(job) : this.generalHTML();
    this.body.scrollTop = 0;
    this.panel.classList.add('open');
    document.body.classList.add('job-panel-open');

    this.body.querySelector('[data-apply-scroll]')?.addEventListener('click', () => {
      this.body.querySelector('#job-apply')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    this.body.querySelector('[data-copy-mail]')?.addEventListener('click', (e) => this.copyMail(e.currentTarget));
    this.body.querySelector('#job-form')?.addEventListener('submit', (e) => { e.preventDefault(); this.submit(e.currentTarget); });
    if (goToForm) setTimeout(() => this.body.querySelector('#job-form input')?.focus(), 350);
  }

  close() {
    this.panel?.classList.remove('open');
    document.body.classList.remove('job-panel-open');
  }

  list_(items) { return `<ul class="jp-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`; }

  detailsHTML(j) {
    return `
      <div class="jp-eyebrow">${esc(j.dept)} · ${esc(j.id)}</div>
      <h2 class="jp-title">${esc(j.title)}</h2>
      <div class="jp-meta">
        <span>📍 ${esc(j.location)}</span><span>🕒 ${esc(j.type)}</span><span>🎯 ${esc(j.experience)}</span>
      </div>
      <p class="jp-summary">${esc(j.summary)}</p>
      <div class="jp-actions">
        <button class="car-btn car-btn-primary" data-apply-scroll>Apply for this role</button>
        <a class="car-btn" href="${this.mailto(j)}">Email your CV</a>
      </div>

      <h3 class="jp-h">About the role</h3>
      <p class="jp-text">${esc(j.about)}</p>
      <h3 class="jp-h">What you'll do</h3>${this.list_(j.responsibilities)}
      <h3 class="jp-h">What we're looking for</h3>${this.list_(j.requirements)}
      ${j.niceToHave?.length ? `<h3 class="jp-h">Nice to have</h3>${this.list_(j.niceToHave)}` : ''}
      <h3 class="jp-h">What you'll get</h3>${this.list_(BENEFITS)}
      ${this.formHTML(j)}`;
  }

  generalHTML() {
    return `
      <div class="jp-eyebrow">GENERAL APPLICATION</div>
      <h2 class="jp-title">Don't see the right role?</h2>
      <p class="jp-summary">We are always happy to meet talented people. Tell us about yourself and the kind of work you'd love to do, and we'll get in touch when something fits.</p>
      ${this.formHTML(null)}`;
  }

  formHTML(j) {
    return `
      <form id="job-form" class="jp-form" novalidate>
        <h3 class="jp-h" id="job-apply">Apply ${j ? 'for this role' : 'now'}</h3>
        <div class="jp-grid">
          <label>Full name *<input name="name" required autocomplete="name" placeholder="Your name"></label>
          <label>Email *<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label>
          <label>Phone<input name="phone" type="tel" autocomplete="tel" placeholder="+91 …"></label>
          <label>Current location<input name="city" placeholder="City, country"></label>
          <label>Total experience<input name="exp" placeholder="e.g. 4 years"></label>
          <label>Notice period<input name="notice" placeholder="e.g. 30 days"></label>
          ${j ? '' : '<label class="jp-wide">Role you are interested in<input name="role" placeholder="e.g. Backend engineer"></label>'}
          <label class="jp-wide">LinkedIn / portfolio link<input name="link" type="url" placeholder="https://"></label>
          <label class="jp-wide">Why you? (short note)<textarea name="note" rows="4" placeholder="A few lines about you and what you'd bring"></textarea></label>
        </div>
        <p class="jp-hint">Clicking the button opens your email app with everything filled in. Attach your CV (PDF) and press Send.</p>
        <div class="jp-error" role="alert"></div>
        <div class="jp-actions">
          <button type="submit" class="car-btn car-btn-primary">Apply via email</button>
          <button type="button" class="car-btn" data-copy-mail>Copy ${esc(CAREERS_EMAIL)}</button>
        </div>
        <div class="jp-done" hidden>✓ Your email app should now be open with your application. Don't forget to attach your CV.<br>
          If nothing opened, email <strong>${esc(CAREERS_EMAIL)}</strong> directly.</div>
      </form>`;
  }

  mailto(j, extra = '') {
    const subject = j ? `Application: ${j.title} [${j.id}]` : 'General application';
    const body = extra || `Hello Oleovista team,\n\nI would like to apply for ${j ? `the ${j.title} role (${j.id})` : 'a role at Oleovista'}.\nPlease find my CV attached.\n\nRegards,\n`;
    return `mailto:${CAREERS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  submit(form) {
    const f = Object.fromEntries(new FormData(form).entries());
    const err = form.querySelector('.jp-error');
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email || '');
    if (!f.name?.trim() || !emailOk) {
      err.textContent = !f.name?.trim() ? 'Please enter your name.' : 'Please enter a valid email address.';
      return;
    }
    err.textContent = '';
    const j = this.job;
    const lines = [
      'Hello Oleovista team,', '',
      `I would like to apply for ${j ? `the ${j.title} role (${j.id})` : `a role at Oleovista${f.role ? `: ${f.role}` : ''}`}.`, '',
      `Name: ${f.name}`, `Email: ${f.email}`,
      f.phone ? `Phone: ${f.phone}` : null, f.city ? `Location: ${f.city}` : null,
      f.exp ? `Experience: ${f.exp}` : null, f.notice ? `Notice period: ${f.notice}` : null,
      f.link ? `LinkedIn / portfolio: ${f.link}` : null,
      f.note ? `\nAbout me:\n${f.note}` : null,
      '', 'My CV is attached.', '', 'Regards,', f.name
    ].filter((l) => l !== null);
    window.location.href = this.mailto(j, lines.join('\n'));
    const done = form.querySelector('.jp-done');
    if (done) done.hidden = false;
  }

  copyMail(btn) {
    const ok = () => { const t = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => { btn.textContent = t; }, 1600); };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(CAREERS_EMAIL).then(ok, () => {});
    else {
      const ta = document.createElement('textarea'); ta.value = CAREERS_EMAIL; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { /* ignore */ } ta.remove();
    }
  }
}
