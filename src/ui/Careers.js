/*
  Careers.js  -  job openings list, job details panel and "apply by email" form for the Careers page.
  ---------------------------------------------------------------------------------------------------
  Edit CAREERS_EMAIL and the JOBS list below to change what is shown. Nothing else needs changing.

  How applying works: the form opens the visitor's email app with a ready-made email to CAREERS_EMAIL
  (subject + all the form details filled in). They attach their CV and press Send. No server needed.
*/

export const CAREERS_EMAIL = 'hr@oleovista.com';

const BENEFITS = [
  'Hybrid working and flexible hours',
  'Health insurance for you and your family',
  'Yearly learning budget and certifications',
  'Work on live global energy-trading systems'
];

export const JOBS = [
  {
    id: 'OV-ENG-101',
    title: 'Lead Python Developer / Senior Backend Technical Lead',
    dept: 'Engineering',
    location: 'Kochi, Kerala, India',
    type: 'Full-time',
    experience: '6–7+ years',
    summary: 'Lead the backend architecture and development of our next-generation ETRM platform.',
    about: 'This is a hands-on technical leadership role focused on Python, Django/FastAPI, PostgreSQL, transaction processing, distributed systems, messaging, security, cloud and system architecture. You will own technical design and implementation, guide developers, and make sure the platform is scalable, secure, reliable and transactionally accurate. Experience in banking, fintech, payments, trading, brokerage, treasury or other financial transaction systems is strongly preferred. Direct ETRM/Treasury experience is an advantage but not mandatory.',
    responsibilities: [
      'Architecture & leadership: own backend architecture, system design, technical standards and implementation strategy; lead technical planning, code reviews, estimation, mentoring and delivery, working with Product, Business, QA, DevOps and Frontend teams',
      'Python backend development: build production-grade services with Python, Django and/or FastAPI, including REST APIs, business workflows, state-based processing, external integrations and high-volume transaction services, with asynchronous/background processing using Celery and messaging',
      'Transaction processing & data integrity: design reliable financial workflows with strong consistency, concurrency control, idempotency, locking, transaction isolation, retry/recovery and rollback, plus auditability, traceability and reconciliation between internal and external systems',
      'Event-driven & distributed systems: design architectures using Kafka, RabbitMQ, Celery or similar, with reliable asynchronous processing, retries, failure handling and recovery for scalability and resilience',
      'Database & data architecture: design and optimise PostgreSQL schemas, data models, SQL queries, indexes, transactions and performance; use Redis for caching/distributed processing and MongoDB/NoSQL where appropriate',
      'Security & financial controls: implement authentication, authorization, RBAC, OAuth2/OIDC, JWT, MFA, least privilege, encryption, TLS, secrets management and audit logging; protect sensitive financial data and enforce critical transaction authorization and business rules server-side, following OWASP principles',
      'Cloud & DevOps: deploy and support services on Microsoft Azure with Docker, CI/CD and Git; set up logging, monitoring, health checks, diagnostics, deployment practices and production troubleshooting'
    ],
    requirements: [
      '6–7+ years of professional backend development experience',
      'Backend & architecture: Python, Django/FastAPI, REST APIs, PostgreSQL, SQL, system design, microservices, distributed systems, transaction processing, concurrency, idempotency, workflow/state management, reconciliation and asynchronous processing',
      'Messaging & processing: Kafka, RabbitMQ, Celery, event-driven architecture, message-based processing, retry and failure-recovery patterns',
      'Security: API security, authentication, authorization, RBAC, OAuth2/OIDC, JWT, MFA, encryption, TLS, secrets management, access control, audit logging, secure coding and OWASP principles',
      'Cloud & engineering: Microsoft Azure, Docker, CI/CD, Git, application monitoring, logging, performance optimisation and production support',
      'Leadership: architecture ownership, code reviews, mentoring, technical decision-making, problem-solving, stakeholder collaboration and end-to-end delivery ownership'
    ],
    niceToHave: [
      'Banking, fintech, payments, trading, brokerage, treasury or financial technology experience',
      'Transaction-heavy, financially critical or regulated applications',
      'Financial reconciliation, settlements, balances, payments, positions or transaction lifecycles',
      'ETRM or Treasury Management Systems',
      'Banking APIs, payment systems, financial integrations, trading platforms or market-data systems',
      'Banking-grade security, compliance, audit and access-control requirements',
      'PCI DSS, ISO 27001, SOC 2 or similar security frameworks',
      'MongoDB, Redis, Kubernetes and multi-tenant SaaS architecture',
      'React, Angular, TypeScript or Java',
      'Oracle (an advantage, not mandatory)'
    ]
  },
  {
    id: 'OV-ENG-102',
    title: 'Lead Frontend Developer – Treasury & ETRM',
    dept: 'Engineering',
    location: 'Kochi, Kerala, India',
    type: 'Full-time · Remote / On-site',
    experience: '6–7+ years',
    summary: 'Own the frontend architecture and development of a next-generation Treasury Management System within our ETRM platform.',
    about: 'This is a hands-on leadership role requiring strong expertise in React, TypeScript, JavaScript, frontend architecture, enterprise data-intensive applications, API integration, security, performance, testing and modern frontend engineering. You will lead technical design and implementation, set development standards, mentor developers and own frontend delivery from requirements through production. Experience in banking, fintech, payments, trading, brokerage, treasury or other transaction-heavy financial systems is strongly preferred. Direct ETRM/Treasury experience is not mandatory.',
    responsibilities: [
      'Frontend architecture & leadership: own frontend architecture, component design, coding standards, design patterns, technical decisions, code reviews, estimation, task planning, mentoring and delivery, working with Product, UI/UX, Backend, QA, DevOps and Business teams',
      'React application development: build scalable, reusable, maintainable applications with React, TypeScript and JavaScript, including complex forms, dashboards, reports, transaction screens and workflow-driven interfaces',
      'Enterprise data & grids: build large, data-intensive interfaces with advanced data grids, server-side filtering, sorting, pagination, searching, virtualization, inline/editable grids, bulk actions, row selection, validation and high-volume data handling',
      'Treasury & transaction workflows: build interfaces for transaction entry, approvals, workflow/state transitions, exception handling, reconciliation, status tracking and reporting, with appropriate frontend validation and user controls',
      'API, state & real-time integration: integrate REST APIs and manage client/server state with Redux Toolkit, Zustand, TanStack Query/React Query or equivalent; implement WebSockets/SSE for real-time updates where required',
      'Security: authentication, authorization, RBAC, OAuth2/OIDC, JWT, session/token management, secure API communication, XSS/CSRF protection, secure data handling and OWASP principles',
      'Performance & user experience: optimise data-heavy applications through code splitting, lazy loading, caching, memoization, virtualization and bundle/rendering optimisation; maintain strong Core Web Vitals, responsiveness, accessibility and browser compatibility',
      'Testing & quality: establish automated unit, integration and end-to-end testing with Jest/Vitest, React Testing Library and Playwright/Cypress',
      'Cloud, CI/CD & production: work with Git, Docker, CI/CD, GitHub Actions/Azure DevOps and Azure/AWS; support monitoring, error tracking, logging, production troubleshooting, releases and operational stability'
    ],
    requirements: [
      '6–7+ years of professional frontend development experience',
      'Core: React.js, TypeScript, JavaScript (ES6+), frontend and component-based architecture, REST API integration, enterprise/data-intensive applications',
      'Data grids: large data grids, server-side filtering & pagination, editable grids',
      'State & forms: Redux Toolkit/Zustand, TanStack Query/React Query, complex forms and validation with React Hook Form and Zod',
      'Security: authentication, authorization, RBAC, OAuth2/OIDC, JWT, session/token management, secure API communication, XSS/CSRF protection, OWASP, secure data handling',
      'Performance & real-time: code splitting, lazy loading, memoization, caching, virtualization, bundle and rendering optimisation, Core Web Vitals, WebSockets, Server-Sent Events (SSE)',
      'Testing & engineering: Jest/Vitest, React Testing Library, Playwright/Cypress, Git, Docker, CI/CD, GitHub Actions/Azure DevOps, Azure/AWS, monitoring, error tracking, logging, production troubleshooting',
      'Responsive design, accessibility and browser compatibility',
      'Leadership: technical decision-making, code reviews, coding standards, design patterns, estimation, task planning, mentoring, team leadership and end-to-end delivery'
    ],
    niceToHave: [
      'Enterprise-level, transaction-heavy or data-intensive applications',
      'Financial, banking, fintech, payments, trading, brokerage or treasury systems (strongly preferred)',
      'Financial workflows: approvals, reconciliation, settlements, positions, balances, reporting or transaction lifecycles',
      'ETRM/Treasury systems (an advantage, not mandatory)',
      'Next.js, including SSR/SSG, routing, middleware and modern application patterns',
      'AG Grid or equivalent advanced data-grid frameworks',
      'Design systems and reusable component libraries',
      'Material UI, Ant Design or Tailwind CSS',
      'Recharts, ECharts, D3 or equivalent data-visualisation libraries',
      'Frontend observability and performance monitoring',
      'Kubernetes and cloud-native environments',
      'Micro-frontends or modular frontend architecture'
    ]
  },
  {
    id: 'OV-ENG-103',
    title: 'Backend Developer',
    dept: 'Engineering',
    location: 'Kochi, Kerala, India',
    type: 'Full-time · Remote / On-site',
    experience: '4–5 years',
    summary: 'Build secure, reliable Python backend services for our Treasury Management System.',
    about: 'We are looking for a mid-level Backend Developer with strong hands-on experience in Python, Django/FastAPI, databases, REST APIs, secure transaction processing and enterprise application development. You will work closely with the Lead Developer and the Frontend, QA, DevOps and Business teams to design, develop, test and maintain reliable backend solutions, and take ownership of assigned modules. Prior experience in ETRM, Treasury, Banking or Energy Trading is not required.',
    responsibilities: [
      'Develop and maintain backend services using Python, Django / FastAPI, PostgreSQL, Oracle and SQL',
      'Design and develop scalable, maintainable REST APIs and backend services',
      'Implement business logic and complex workflows based on functional requirements',
      'Design and optimise database schemas, queries, indexes, relationships and transactions',
      'Work with multiple databases / database instances and ensure data consistency and reliability',
      'Implement secure, reliable transaction processing, including validation, concurrency handling, error handling and data integrity',
      'Implement authentication, authorization, role-based access control and audit logging',
      'Develop integrations with external APIs and third-party systems',
      'Identify and resolve application bugs, performance issues and production problems',
      'Write and maintain unit and integration tests',
      'Take part in code reviews and follow established coding and architectural standards',
      'Collaborate with the Lead Developer on technical design and implementation decisions',
      'Work closely with Frontend, QA, DevOps, Product and Business teams across the lifecycle: requirements → development → testing → deployment → production support'
    ],
    requirements: [
      '4–5 years of professional software development experience',
      'Strong hands-on experience with Python',
      'Good experience with Django / Django REST Framework and/or FastAPI',
      'Strong experience with PostgreSQL, Oracle and SQL',
      'Good knowledge of database design, SQL queries, transactions, indexing and query optimisation',
      'Strong understanding of REST APIs and backend application development',
      'Good understanding of authentication, authorization, application security and secure data handling',
      'Understanding of transaction management, concurrency, data integrity and auditability',
      'Experience with Git, Docker, Linux, CI/CD and Redis',
      'Experience troubleshooting and optimising backend applications',
      'Strong problem-solving and debugging skills, and good communication and teamwork',
      'Understanding of frontend-backend integration and end-to-end flow: Frontend → API → Business Logic → Database'
    ],
    niceToHave: [
      'Multi-database architecture / multiple database instances',
      'React, JavaScript or similar frontend technologies',
      'Enterprise-level or transaction-heavy applications',
      'Turning complex business requirements into technical solutions',
      'Strong attention to data accuracy, security, reliability and performance',
      'Willingness to learn new business domains and technologies'
    ]
  },
  {
    id: 'OV-ENG-104',
    title: 'Frontend Developer – Treasury System',
    dept: 'Engineering',
    location: 'Kochi, Kerala, India',
    type: 'Full-time · Remote / On-site',
    experience: '3–4 years',
    summary: 'Build secure, responsive, user-friendly React interfaces for our Treasury Management System.',
    about: 'We are looking for a mid-level Frontend Developer with strong hands-on experience in React, JavaScript, TypeScript, Next.js, REST API integration and modern frontend practices. You will work closely with the Lead Frontend Developer and the Backend, QA, DevOps, Product and Business teams, take ownership of assigned modules and help build a secure, scalable and reliable enterprise application. Prior experience in ETRM, Treasury, Banking or Energy Trading is not required, but you should be willing to learn the Treasury domain.',
    responsibilities: [
      'Develop and maintain frontend applications using React, JavaScript, TypeScript and Next.js',
      'Build reusable, maintainable React components',
      'Develop forms, dashboards, reports, data tables, workflows and transaction screens',
      'Integrate with backend services over REST APIs, working with backend developers on data handling, validation and error handling',
      'Implement state management with Redux Toolkit, Zustand or similar',
      'Handle form validation with libraries such as React Hook Form / Zod',
      'Implement authentication, authorization and role-based access in coordination with backend services',
      'Follow frontend security and secure data-handling practices',
      'Build responsive interfaces with good UI/UX and browser compatibility',
      'Optimise performance for data-intensive screens and tables',
      'Write and maintain unit and component tests',
      'Take part in code reviews, fix bugs and production issues, and work with the team on Git, CI/CD, builds, deployment and production support'
    ],
    requirements: [
      '3–4 years of professional frontend development experience',
      'Strong hands-on experience with React.js',
      'Good knowledge of JavaScript and TypeScript',
      'Good experience with Next.js',
      'Strong understanding of React components, Hooks, state management and reusable component development',
      'Experience with Redux Toolkit, Zustand or similar state-management solutions',
      'Good understanding of REST APIs and frontend-backend integration',
      'Experience with Git and CI/CD',
      'Basic understanding of frontend security, authentication and authorization',
      'Good understanding of responsive design and frontend performance',
      'Strong problem-solving and debugging skills, and good communication and teamwork'
    ],
    niceToHave: [
      'Jest/Vitest or React Testing Library',
      'Material UI, Ant Design, Tailwind CSS or similar UI frameworks',
      'Dashboards, reports, forms and data-intensive applications',
      'Azure/AWS or cloud-based application environments'
    ]
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