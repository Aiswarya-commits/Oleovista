/*
  OLIVIA - Oleovista AI assistant
  ------------------------------------------------------------------
  Files:
    src/ui/Olivia.js        this file (launcher, chat UI, voice)
    src/ui/OliviaOrb.js     3D WebGL glass orb + smoke background
    src/ui/olivia.css       styles
    server/olivia-core.mjs  AI brain (Claude API) - runs on the server only
    api/olivia-chat.mjs     Vercel serverless endpoint  -> /api/olivia-chat
    vite.config.js          same endpoint during `npm run dev`

  Setup: in src/main.js
      import { OliviaAssistant } from './ui/Olivia.js';
      this.olivia = new OliviaAssistant({ uiManager: this.uiManager });   // after UIManager is created
  and put ANTHROPIC_API_KEY in .env (local) / your host's environment variables.

  The launcher orb is inserted automatically inside .bottom-actions, directly
  ABOVE the WhatsApp button. If the AI endpoint is unreachable, Olivia falls
  back to the built-in keyword answers (INTENTS) below, so she never breaks.
*/
import './olivia.css';
import { CONTACT } from './Contact.js';
import { JOBS, CAREERS_EMAIL } from './Careers.js';
import { LEADERSHIP, TEAM } from './Team.js';
import { OliviaOrb } from './OliviaOrb.js';

/* Where the AI answers come from (see server/olivia-core.mjs).
   If this endpoint is missing/unreachable, Olivia falls back to the built-in answers below. */
const API_URL = '/api/olivia-chat';
const THINKING = ['Let me check...', 'One sec...', 'Thinking...', 'Looking into it...'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const LINKS = {
  tel: `tel:${CONTACT.phoneLink}`,
  mail: `mailto:${CONTACT.email}`,
  whatsapp: `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent('Hi Oleovista, I would like to know more.')}`,
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CONTACT.mapQuery)}`
};
const A = (href, text, ext = true) => `<a href="${href}"${ext ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
const contactBlock = () =>
  `<span class="ol-contact"><span>📞 ${A(LINKS.tel, esc(CONTACT.phone), false)}</span><span>✉️ ${A(LINKS.mail, esc(CONTACT.email), false)}</span><span>💬 ${A(LINKS.whatsapp, 'Chat on WhatsApp')}</span></span>`;

const GREETING = "Hey, I'm <strong>Olivia</strong>! Ask me anything about Oleovista, or tap a chip below.";
const START_CHIPS = ['What does Oleovista do?', 'What is ACERS?', 'Open positions', 'How much does it cost?', 'Contact the team'];

/* ---------------- knowledge ----------------
   k: keywords (any match scores; longer phrases score higher)
   r: reply (string or function returning HTML)
   go: optional page to open ('home' | 'about' | 'services' | 'careers' | 'team' | 'contact')
   chips: follow-up suggestions */
const INTENTS = [
  {
    id: 'greet', k: ['hi', 'hello', 'hey', 'hii', 'good morning', 'good evening', 'good afternoon', 'namaste', 'yo'],
    r: () => 'Hello! 👋 Lovely to meet you. I can tell you about our services, the ACERS platform, careers, our team or how to reach us.',
    chips: ['What does Oleovista do?', 'What is ACERS?', 'Meet the team']
  },
  {
    id: 'who', k: ['who are you', 'your name', 'are you a bot', 'are you human', 'are you real', 'what are you', 'olivia'],
    r: () => "I'm Olivia, Oleovista's AI assistant. I live in the corner of this site and know the essentials about our company, products, people and open roles. For anything detailed I'll connect you with the team.",
    chips: ['What does Oleovista do?', 'Contact the team']
  },
  {
    id: 'about', k: ['what does oleovista do', 'what do you do', 'about oleovista', 'about you', 'about company', 'oleovista', 'company', 'who is oleovista', 'tell me about'],
    r: () => `<strong>${esc(CONTACT.company)}</strong> builds enterprise software for <strong>energy and commodity trading</strong> companies. Our flagship platform <strong>ACERS</strong> combines ERP and ETRM, so trading, risk, operations and finance run on one system. We're based in Kochi, Kerala.`,
    go: 'about', chips: ['What is ACERS?', 'Your services', 'Where is your office?']
  },
  {
    id: 'acers', k: ['acers', 'platform', 'product', 'etrm', 'erp', 'ctrm', 'trade capture', 'treasury'],
    r: () => '<strong>ACERS</strong> is our ERP + ETRM platform for commodity and energy companies. It brings together:<ul><li>Trade capture &amp; deal management</li><li>Positions, exposure &amp; risk (MTM, P/L, VaR)</li><li>Operations, logistics &amp; settlements</li><li>Finance, invoicing &amp; compliance reporting</li></ul>It is cloud-ready and built to scale with your trading volume.',
    go: 'services', chips: ['Can I get a demo?', 'How much does it cost?', 'Is it secure?']
  },
  {
    id: 'services', k: ['service', 'services', 'offer', 'solutions', 'build', 'develop', 'custom software', 'what can you'],
    r: () => 'Here is what we do:<ul><li><strong>ACERS</strong>: ERP + ETRM platform</li><li><strong>Risk analytics &amp; compliance</strong>: MTM, P/L, VaR and regulatory reporting</li><li><strong>Workflow automation</strong> for settlements and operations</li><li><strong>Custom enterprise software</strong>, cloud and integrations</li></ul>I\'ve opened the Services page for you.',
    go: 'services', chips: ['What is ACERS?', 'How long does a project take?', 'Contact the team']
  },
  {
    id: 'risk', k: ['risk', 'var', 'mtm', 'mark to market', 'p/l', 'pnl', 'profit', 'hedg', 'exposure', 'analytics', 'compliance', 'report'],
    r: () => 'Our risk &amp; analytics suite gives live <strong>positions, exposure, MTM, P/L and VaR</strong>, plus audit trails and compliance reporting, so traders and risk teams see the same numbers in real time.',
    chips: ['What is ACERS?', 'Can I get a demo?']
  },
  {
    id: 'industries', k: ['industr', 'who do you work with', 'clients', 'customers', 'oil', 'gas', 'power', 'energy', 'commodit', 'metal', 'agri'],
    r: () => 'We focus on <strong>energy and commodity</strong> businesses: oil &amp; gas, power, metals, agri and other physical or financial traders, along with treasury and finance teams that need transaction-accurate systems.',
    chips: ['What is ACERS?', 'Your services']
  },
  {
    id: 'security', k: ['secure', 'security', 'safe', 'data protection', 'privacy', 'encryption', 'iso', 'soc', 'audit'],
    r: () => 'Security is built in: role-based access, SSO/OAuth2, MFA, encryption in transit and at rest, full audit logging and secure cloud deployments on Microsoft Azure.',
    chips: ['Is it cloud based?', 'Can I get a demo?']
  },
  {
    id: 'cloud', k: ['cloud', 'azure', 'aws', 'saas', 'on premise', 'on-prem', 'hosting', 'deploy', 'integrat', 'api'],
    r: () => 'ACERS is cloud-ready (we deploy on <strong>Microsoft Azure</strong>) and integrates with your existing systems through secure REST APIs: banks, exchanges, market data and accounting tools.',
    chips: ['Is it secure?', 'How long does a project take?']
  },
  {
    id: 'price', k: ['cost', 'price', 'pricing', 'budget', 'quote', 'how much', 'charges', 'fees', 'rate'],
    r: () => `Pricing depends on scope. We offer <strong>fixed-scope quotes</strong> and <strong>dedicated-team</strong> engagements. Share a short brief and we'll come back with options:${contactBlock()}`,
    chips: ['How long does a project take?', 'Can I get a demo?']
  },
  {
    id: 'time', k: ['how long', 'timeline', 'duration', 'deadline', 'when can', 'start', 'process', 'how do you work'],
    r: () => 'After a short discovery call we send a clear plan with milestones. Smaller modules can go live in <strong>weeks</strong>; larger roll-outs are delivered in phases so you see value early.',
    chips: ['How much does it cost?', 'Do you offer support?']
  },
  {
    id: 'demo', k: ['demo', 'trial', 'see it', 'walkthrough', 'presentation', 'meeting', 'book', 'schedule', 'call back'],
    r: () => `I'd love to set that up! The quickest way is to message the team and pick a time:${contactBlock()}`,
    go: 'contact', chips: ['What is ACERS?', 'Where is your office?']
  },
  {
    id: 'support', k: ['support', 'maintenance', 'after launch', 'help desk', 'bug', 'issue', 'problem', 'sla'],
    r: () => 'Yes, we offer support and maintenance plans covering updates, monitoring, fixes and new features, with clear response times.',
    chips: ['Contact the team', 'How much does it cost?']
  },
  {
    id: 'office', k: ['office', 'where', 'location', 'address', 'visit', 'kochi', 'kerala', 'infopark', 'kakkanad', 'direction', 'map'],
    r: () => `Our office is at <strong>${esc(CONTACT.addressShort)}</strong>. ${A(LINKS.maps, 'Get directions →')}`,
    chips: ['Contact the team', 'Open positions']
  },
  {
    id: 'contact', k: ['contact', 'call', 'phone', 'number', 'email', 'mail', 'whatsapp', 'reach', 'talk to', 'human', 'person', 'sales', 'enquiry', 'inquiry'],
    r: () => `You can reach the team here:${contactBlock()}I've opened the Contact page too.`,
    go: 'contact', chips: ['Where is your office?', 'Can I get a demo?']
  },
  {
    id: 'careers', k: ['job', 'jobs', 'career', 'hiring', 'vacanc', 'opening', 'position', 'work with you', 'work at', 'join', 'apply', 'internship', 'recruit', 'resume', 'cv'],
    r: () => `We're hiring in <strong>Kochi</strong>! Current openings:<ul>${JOBS.map((j) => `<li><strong>${esc(j.title)}</strong><br><small>${esc(j.experience || '')}${j.experience ? ' · ' : ''}${esc(j.type || '')}</small></li>`).join('')}</ul>Apply from the Careers page I've just opened, or send your CV to ${A(`mailto:${CAREERS_EMAIL}`, esc(CAREERS_EMAIL), false)}.`,
    go: 'careers', chips: ['Python developer role', 'Frontend roles', 'Meet the team']
  },
  {
    id: 'job-python', k: ['python', 'backend', 'django', 'fastapi', 'lead developer', 'tech lead'],
    r: () => jobReply(/python|backend/i),
    go: 'careers', chips: ['Frontend roles', 'How do I apply?']
  },
  {
    id: 'job-frontend', k: ['frontend', 'front end', 'front-end', 'react', 'angular', 'ui developer', 'javascript'],
    r: () => jobReply(/frontend/i),
    go: 'careers', chips: ['Python developer role', 'How do I apply?']
  },
  {
    id: 'apply', k: ['how do i apply', 'how to apply', 'application'],
    r: () => `Open any role on the Careers page and hit <strong>Apply</strong>, or email your CV and the role title to ${A(`mailto:${CAREERS_EMAIL}`, esc(CAREERS_EMAIL), false)}.`,
    go: 'careers', chips: ['Open positions']
  },
  {
    id: 'team', k: ['team', 'people', 'staff', 'employees', 'director', 'founder', 'ceo', 'leadership', 'management', 'who runs', 'owner'],
    r: () => `Oleovista is led by our directors <strong>${LEADERSHIP.map((p) => esc(p.name)).join(', ')}</strong>, supported by a team of ${TEAM.length ? TEAM.map((p) => esc(p.role)).filter((v, i, a) => a.indexOf(v) === i).join('s, ').toLowerCase() + 's' : 'engineers'} and more. Meet everyone on the Team page.`,
    go: 'team', chips: ['Open positions', 'What does Oleovista do?']
  },
  {
    id: 'thanks', k: ['thank', 'thanks', 'thx', 'great', 'awesome', 'cool', 'perfect', 'nice', 'ok', 'okay'],
    r: () => "You're welcome! 🌿 Anything else I can help with?",
    chips: ['Contact the team', 'Open positions']
  },
  {
    id: 'bye', k: ['bye', 'goodbye', 'see you', 'later', 'good night'],
    r: () => 'Bye for now! I\'ll be right here in the corner if you need me. 💚'
  }
];

const PAGES = {
  home: ['home', 'homepage', 'main page', 'start page'],
  about: ['about', 'about page', 'about us'],
  services: ['services', 'service page', 'services page'],
  careers: ['careers', 'career page', 'jobs page'],
  team: ['team', 'team page'],
  contact: ['contact', 'contact page', 'contact us']
};

function jobReply(re) {
  const list = JOBS.filter((j) => re.test(j.title));
  if (!list.length) return `No open role matches that right now, but send your CV to ${A(`mailto:${CAREERS_EMAIL}`, esc(CAREERS_EMAIL), false)} and we'll keep you in mind.`;
  return list.map((j) => `<strong>${esc(j.title)}</strong><br><small>${esc(j.location || '')} · ${esc(j.type || '')} · ${esc(j.experience || '')}</small><br>${esc(j.summary || '')}`).join('<br><br>') +
    '<br><br>Full details and the Apply button are on the Careers page.';
}

/* ================= the animated green orb (canvas) ================= */
const PALETTE = [
  [47, 227, 154],  // emerald
  [155, 229, 100], // lime
  [20, 184, 138],  // teal-green
  [96, 146, 62],   // brand olive green
  [196, 245, 120], // light chartreuse
  [10, 120, 90]    // deep forest
];

class Orb {
  constructor(canvas, { blobs = 6, blur = 0.12, fps = 60 } = {}) {
    this.c = canvas;
    this.ctx = canvas.getContext('2d');
    this.blurK = blur;
    this.minDt = 1000 / fps;
    this.energy = 0.35;     // 0..1, speed & pulse
    this.target = 0.35;
    this.running = false;
    this.last = 0;
    this.t = Math.random() * 100;
    this.blobs = Array.from({ length: blobs }, (_, i) => ({
      col: PALETTE[i % PALETTE.length],
      a: Math.random() * Math.PI * 2,
      sp: 0.25 + Math.random() * 0.5,
      orbit: 0.16 + Math.random() * 0.22,
      r: 0.42 + Math.random() * 0.22,
      ph: Math.random() * 10
    }));
    this.supportsFilter = typeof this.ctx.filter === 'string';
    this.resize();
    this.loop = this.loop.bind(this);
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const r = this.c.getBoundingClientRect();
    const s = Math.max(24, Math.round((r.width || 52) * dpr));
    if (this.c.width !== s) { this.c.width = s; this.c.height = s; }
  }
  setEnergy(v) { this.target = v; }
  start() { if (!this.running) { this.running = true; this.resize(); requestAnimationFrame(this.loop); } }
  stop() { this.running = false; }
  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (now - this.last < this.minDt) return;
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    this.energy += (this.target - this.energy) * 0.06;
    this.t += dt * (0.6 + this.energy * 2.2);
    this.draw();
  }
  draw() {
    const { ctx } = this;
    const S = this.c.width, h = S / 2;
    ctx.clearRect(0, 0, S, S);
    ctx.save();
    ctx.beginPath();
    const pulse = 1 + Math.sin(this.t * 2.1) * 0.012 * (1 + this.energy * 3);
    ctx.arc(h, h, h * 0.985 * pulse, 0, Math.PI * 2);
    ctx.clip();
    // base
    const base = ctx.createRadialGradient(h * 0.8, h * 0.7, 0, h, h, h);
    base.addColorStop(0, '#eafff3');
    base.addColorStop(0.55, '#7fe0a8');
    base.addColorStop(1, '#0e6b4d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, S, S);
    if (this.supportsFilter) ctx.filter = `blur(${Math.round(S * this.blurK)}px)`;
    ctx.globalCompositeOperation = 'source-over';
    for (const b of this.blobs) {
      const ang = b.a + this.t * b.sp;
      const o = b.orbit * (1 + Math.sin(this.t * 0.7 + b.ph) * 0.35);
      const x = h + Math.cos(ang) * o * S;
      const y = h + Math.sin(ang * 1.3 + b.ph) * o * S;
      const rad = b.r * S * (0.85 + Math.sin(this.t * 1.1 + b.ph) * 0.12);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const [r, gg, bb] = b.col;
      g.addColorStop(0, `rgba(${r},${gg},${bb},0.95)`);
      g.addColorStop(0.5, `rgba(${r},${gg},${bb},0.45)`);
      g.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    }
    // soft white core / glass highlight
    ctx.globalCompositeOperation = 'screen';
    const cx = h + Math.cos(this.t * 0.9) * S * 0.08, cy = h + Math.sin(this.t * 0.7) * S * 0.08;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.34);
    core.addColorStop(0, `rgba(255,255,255,${0.55 + this.energy * 0.3})`);
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, S, S);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    const hl = ctx.createRadialGradient(h * 0.62, h * 0.48, 0, h * 0.62, h * 0.48, h * 0.55);
    hl.addColorStop(0, 'rgba(255,255,255,0.55)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  }
}

/* ================= the assistant ================= */
export class OliviaAssistant {
  constructor({ uiManager = null, mount = null } = {}) {
    this.ui = uiManager;
    this.open = false;
    this.busy = false;
    this.soundOn = false;
    this.history = [];
    this.lastIntent = null;
    this.buildLauncher(mount);
    this.buildOverlay();
    this.bind();
  }

  /* ---------- DOM ---------- */
  buildLauncher(mount) {
    const wrap = document.createElement('div');
    wrap.className = 'olivia-launch';
    wrap.innerHTML = `
      <button type="button" class="olivia-btn" id="olivia-btn" aria-label="Chat with Olivia, Oleovista AI assistant" aria-haspopup="dialog" aria-expanded="false">
        <canvas class="olivia-btn-orb" aria-hidden="true"></canvas>
      </button>
      <div class="olivia-bubble" role="button" tabindex="-1" aria-hidden="true">
        <span>I'm Olivia, Oleovista AI assistant.</span><span>Click to interact with me</span>
        <button type="button" class="olivia-bubble-x" aria-label="Hide message">×</button>
      </div>`;
    const wa = document.getElementById('whatsapp-float-btn');
    const stack = mount || wa?.parentElement || document.querySelector('.bottom-actions');
    if (stack && wa && wa.parentElement === stack) stack.insertBefore(wrap, wa);
    else if (stack) stack.appendChild(wrap);
    else { wrap.classList.add('olivia-launch--solo'); document.body.appendChild(wrap); }
    this.launch = wrap;
    this.btn = wrap.querySelector('.olivia-btn');
    this.bubble = wrap.querySelector('.olivia-bubble');
    this.btnOrb = new Orb(wrap.querySelector('canvas'), { blobs: 5, blur: 0.1, fps: 40 });
    this.btnOrb.start();
  }

  buildOverlay() {
    const hasMic = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    const el = document.createElement('div');
    el.className = 'olivia-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Olivia, Oleovista AI assistant');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="olivia-bg" aria-hidden="true"><i></i><i></i><i></i></div>
      <canvas class="olivia-gl" aria-hidden="true"></canvas>
      <div class="olivia-top">
        <div class="olivia-brand" aria-hidden="true"></div>        <div class="olivia-top-actions">
          <button type="button" class="olivia-circle olivia-sound" aria-pressed="false" aria-label="Read replies aloud" title="Read replies aloud">
            <svg viewBox="0 0 24 24" class="ic-on"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            <svg viewBox="0 0 24 24" class="ic-off"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          </button>
          <button type="button" class="olivia-circle olivia-close" aria-label="Close Olivia">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
      <div class="olivia-content">
        <section class="olivia-chat">
          <div class="olivia-msgs" aria-live="polite"></div>
          <div class="olivia-chips"></div>
          <form class="olivia-form" autocomplete="off">
            <input class="olivia-input" type="text" name="q" maxlength="300" placeholder="Ask me anything..." aria-label="Message Olivia" enterkeyhint="send">
            ${hasMic ? `<button type="button" class="olivia-mic" aria-label="Speak your question" title="Speak">
              <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
            </button>` : ''}
            <button type="submit" class="olivia-send" aria-label="Send">
              <svg viewBox="0 0 24 24" class="ic-send"><path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <svg viewBox="0 0 24 24" class="ic-stop"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>
            </button>
          </form>
          <p class="olivia-note">Olivia gives quick answers. For anything specific, our team replies on ${A(LINKS.whatsapp, 'WhatsApp')}.</p>
        </section>
        <div class="olivia-orb-wrap" aria-hidden="true">
          <div class="olivia-orb-glow"></div>
          <canvas class="olivia-orb"></canvas>
        </div>
      </div>`;
    document.body.appendChild(el);
    this.ov = el;
    this.msgs = el.querySelector('.olivia-msgs');
    this.chipsEl = el.querySelector('.olivia-chips');
    this.form = el.querySelector('.olivia-form');
    this.input = el.querySelector('.olivia-input');
    this.micBtn = el.querySelector('.olivia-mic');
    this.soundBtn = el.querySelector('.olivia-sound');
    this.bigOrb = new Orb(el.querySelector('.olivia-orb'), { blobs: 7, blur: 0.09, fps: 60 });
    // 3D WebGL orb (falls back to the 2D canvas orb if WebGL is unavailable)
    this.gl = new OliviaOrb(el.querySelector('.olivia-gl'), el.querySelector('.olivia-orb-wrap'));
    if (this.gl.ok) el.classList.add('has-gl');
    this.sendBtn = el.querySelector('.olivia-send');
  }

  setMode(mode) {
    this.mode = mode;
    if (this.gl.ok) this.gl.setMode(mode);
    const e = { sleep: 0.25, idle: 0.35, listening: 0.75, thinking: 0.9, speaking: 0.7 }[mode] ?? 0.35;
    this.bigOrb.setEnergy(e);
    this.btnOrb.setEnergy(e);
    this.ov.dataset.mode = mode;
  }

  /* ---------- events ---------- */
  bind() {
    this.btn.addEventListener('click', () => this.toggle());
    // hover caption: show the "I'm Olivia..." bubble while the mouse is over the button (like the WhatsApp tooltip)
    // (inline styles are used so no other stylesheet on the site can override it)
    const showCaption = () => {
      this.launch.classList.add('is-hover');
      Object.assign(this.bubble.style, { opacity: '1', visibility: 'visible', transform: 'none', pointerEvents: 'auto', zIndex: '5' });
    };
    const hideCaption = () => {
      this.launch.classList.remove('is-hover');
      if (!this.launch.classList.contains('bubble-on')) {
        Object.assign(this.bubble.style, { opacity: '', visibility: '', transform: '', pointerEvents: '', zIndex: '' });
      }
    };
    this.hideCaption = hideCaption;
    this.btn.addEventListener('mouseenter', showCaption);
    this.btn.addEventListener('focus', showCaption);
    this.btn.addEventListener('blur', hideCaption);
    this.launch.addEventListener('mouseleave', hideCaption);
    this.bubble.addEventListener('click', (e) => {
      if (e.target.closest('.olivia-bubble-x')) { e.stopPropagation(); this.hideBubble(true); return; }
      this.show();
    });
    this.ov.querySelector('.olivia-close').addEventListener('click', () => this.hide());
    this.soundBtn.addEventListener('click', () => this.toggleSound());
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.busy) this.interrupt();
      else this.send(this.input.value);
    });
    this.chipsEl.addEventListener('click', (e) => {
      const c = e.target.closest('.olivia-chip');
      if (c) this.send(c.dataset.q);
    });
    this.micBtn?.addEventListener('click', () => this.listen());

    // Keep wheel / touch / keys inside Olivia from driving the 3D camera.
    ['wheel', 'touchstart', 'touchmove', 'touchend', 'keydown', 'mousemove'].forEach((t) =>
      this.ov.addEventListener(t, (e) => {
        e.stopPropagation();
        if (t === 'keydown' && e.key === 'Escape') this.hide();
      }, { passive: true })
    );
    // Keys pressed while focus is outside the overlay (e.g. body) must not scroll the scene either.
    window.addEventListener('keydown', (e) => {
      if (!this.open || this.ov.contains(e.target)) return;
      e.stopImmediatePropagation();
      if (e.key === 'Escape') this.hide();
    }, true);
    // Wheel on the backdrop parts of the overlay (not the message list) should not reach the page.
    this.ov.addEventListener('wheel', (e) => { if (!e.target.closest('.olivia-msgs')) e.preventDefault(); }, { passive: false });

    window.addEventListener('resize', () => { this.btnOrb.resize(); if (this.open) this.bigOrb.resize(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.btnOrb.stop(); this.bigOrb.stop(); }
      else { this.btnOrb.start(); if (this.open) this.bigOrb.start(); }
    });

    // speech bubble: show a few seconds after load, unless dismissed this session
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('olivia-bubble') === '1'; } catch (_) { /* storage blocked */ }
    if (!dismissed) {
      this.bubbleTimer = setTimeout(() => this.launch.classList.add('bubble-on'), 3500);
      this.bubbleHide = setTimeout(() => this.hideBubble(false), 15000);
    }
  }

  hideBubble(remember) {
    clearTimeout(this.bubbleTimer);
    clearTimeout(this.bubbleHide);
    this.launch.classList.remove('bubble-on');
    if (!this.launch.classList.contains('is-hover')) Object.assign(this.bubble.style, { opacity: '', visibility: '', transform: '', pointerEvents: '', zIndex: '' });
    if (remember) { try { sessionStorage.setItem('olivia-bubble', '1'); } catch (_) { /* ignore */ } }
  }

  /* ---------- open / close ---------- */
  toggle() { this.open ? this.hide() : this.show(); }

  show() {
    if (this.open) return;
    this.open = true;
    this.hideBubble(true);
    this.hideCaption?.();
    this.prevFocus = document.activeElement;
    this.ov.setAttribute('aria-hidden', 'false');
    this.ov.classList.add('is-open');
    document.documentElement.classList.add('olivia-lock');
    this.btn.setAttribute('aria-expanded', 'true');
    if (this.gl.ok) { this.gl.start(); this.setMode('sleep'); setTimeout(() => this.open && this.setMode('idle'), 450); }
    else { this.bigOrb.start(); requestAnimationFrame(() => this.bigOrb.resize()); }
    this.probeApi();
    if (!this.msgs.children.length) {
      const m = this.addMsg('bot', '');
      this.typeInto(m, GREETING, () => this.setChips(START_CHIPS));
    }
    // don't pop the keyboard on phones; focus on desktop
    if (window.matchMedia('(hover: hover)').matches) setTimeout(() => this.input.focus({ preventScroll: true }), 350);
  }

  hide() {
    if (!this.open) return;
    this.open = false;
    this.ov.classList.remove('is-open');
    this.ov.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('olivia-lock');
    this.btn.setAttribute('aria-expanded', 'false');
    this.stopListening();
    this.interrupt();
    try { window.speechSynthesis?.cancel(); } catch (_) { /* ignore */ }
    this.setMode('sleep');
    setTimeout(() => { if (!this.open) { this.bigOrb.stop(); this.gl.stop(); } }, 500);
    (this.prevFocus && this.prevFocus.focus ? this.prevFocus : this.btn).focus({ preventScroll: true });
  }

  /* ---------- chat ---------- */
  addMsg(who, html) {
    const m = document.createElement('div');
    m.className = `olivia-msg olivia-msg--${who}`;
    m.innerHTML = html;
    this.msgs.appendChild(m);
    if (who === 'user') this.ov.classList.add('has-chat');
    this.scrollDown();
    return m;
  }

  scrollDown() { requestAnimationFrame(() => { this.msgs.scrollTop = this.msgs.scrollHeight; }); }

  setChips(list = []) {
    this.chipsEl.innerHTML = list.map((q) =>
      `<button type="button" class="olivia-chip" data-q="${esc(q)}"><span aria-hidden="true">↳</span>${esc(q)}</button>`).join('');
  }

  /* Is the AI endpoint deployed? (checked once, then cached) */
  probeApi() {
    // Checks that the AI server endpoint exists AND has an API key.
    // Uses GET + JSON check, because some dev servers answer unknown URLs with index.html.
    if (this.apiState) return this.apiState;
    this.apiState = fetch(API_URL, { method: 'GET', cache: 'no-store', headers: { accept: 'application/json' } })
      .then(async (r) => {
        const isJson = (r.headers.get('content-type') || '').includes('application/json');
        const data = isJson ? await r.json().catch(() => ({})) : {};
        if (r.ok && data.ok) return true;
        let why;
        if (!isJson || r.status === 404) why = `The AI endpoint ${API_URL} was not found (HTTP ${r.status}). Locally: add the oliviaApi() plugin to vite.config.js and restart "npm run dev". Live: the host must run api/olivia-chat.mjs (Vercel) or server/standalone.mjs.`;
        else if (r.status === 503) why = 'The server has no API key. Put OPENROUTER_API_KEY (or ANTHROPIC_API_KEY) in .env (local) or your host\'s Environment Variables, then restart / redeploy.';        else why = `The AI endpoint answered HTTP ${r.status}.`;
        this.apiProblem(why);
        return false;
      })
      .catch(() => { this.apiProblem(`Could not reach ${API_URL}.`); return false; });
    return this.apiState;
  }

  /* Explain why Olivia is in offline mode: console always, chat only on localhost (visitors never see it). */
  apiProblem(why) {
    console.warn('[Olivia] AI is OFF, using built-in answers. ' + why);
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.)/.test(location.hostname);
    if (local && !this.devNoteShown) {
      this.devNoteShown = true;
      this.addMsg('bot', `<small><strong>Developer note (only shown on localhost):</strong> AI is not connected, so I'm using built-in answers. ${esc(why)}</small>`).classList.add('olivia-devnote');
    }
  }

  /* Ask the server again (e.g. after you add the key) without reloading the page. */
  retryApi() { this.apiState = null; return this.probeApi(); }

  async send(raw) {
    const q = String(raw || '').trim().slice(0, 500);
    if (!q || this.busy) return;
    this.input.value = '';
    this.addMsg('user', esc(q));
    this.history.push({ role: 'user', content: q });
    this.setChips([]);
    this.busy = true;
    this.ov.classList.add('is-busy');
    this.ov.classList.add('is-thinking');
    this.setMode('thinking');
    const phrase = THINKING[Math.floor(Math.random() * THINKING.length)];
    const typing = this.addMsg('bot', `<span class="olivia-thinking">${phrase}</span><span class="olivia-typing"><i></i><i></i><i></i></span>`);
    typing.classList.add('is-typing');
    const token = (this.token = (this.token || 0) + 1);

    let res = null;
    const useApi = await this.probeApi();
    if (useApi) {
      this.ctrl = new AbortController();
      try {
        const r = await fetch(API_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messages: this.history.slice(-12), page: this.ui?.currentMode || 'home' }),
          signal: this.ctrl.signal
        });
        const data = await r.json().catch(() => ({}));
        if (r.ok && data.reply) {
          res = {
            text: this.formatAi(data.reply),
            plain: data.reply,
            chips: (data.suggestions && data.suggestions.length ? data.suggestions : START_CHIPS.slice(0, 3)),
            go: data.navigate
          };
        } else if (r.status !== 429) {
          console.warn('[Olivia] AI request failed:', r.status, data.error || '');
          if (r.status === 502 || r.status === 503) this.apiProblem(data.error || `HTTP ${r.status}`);
        } else if (r.status === 429) {
          res = { text: esc(data.error || 'Too many messages, please wait a moment.'), chips: [] };
        }
      } catch (e) {
        if (e.name === 'AbortError') return; // user pressed stop
      }
    } else {
      await new Promise((ok) => setTimeout(ok, 700));
    }
    if (token !== this.token) return;
    if (!res) {
      const local = this.answer(q);
      res = { ...local, plain: null };
    }

    typing.remove();
    this.ov.classList.remove('is-thinking');
    const msg = this.addMsg('bot', '');
    this.history.push({ role: 'assistant', content: res.plain || msg.textContent || '' });
    this.setMode('speaking');
    if (res.go) setTimeout(() => this.navigate(res.go), 400);
    const spoken = this.speak(res.text);
    this.typeInto(msg, res.text, () => {
      if (token !== this.token) return;
      this.history[this.history.length - 1].content = res.plain || msg.textContent;
      this.setChips(res.chips);
      this.finish(spoken);
    });
  }

  finish(spoken) {
    this.busy = false;
    this.ctrl = null;
    this.ov.classList.remove('is-busy', 'is-thinking');
    if (!spoken || !(window.speechSynthesis?.speaking || window.speechSynthesis?.pending)) this.setMode(this.open ? 'idle' : 'sleep');
  }

  interrupt() {
    if (!this.busy) return;
    this.token = (this.token || 0) + 1;
    try { this.ctrl?.abort(); } catch (_) { /* ignore */ }
    clearInterval(this.typeTimer);
    this.msgs.querySelector('.is-typing')?.remove();
    if (this.typingEl) { this.typingEl.classList.remove('is-streaming'); if (!this.typingEl.textContent.trim()) this.typingEl.remove(); }
    try { window.speechSynthesis?.cancel(); } catch (_) { /* ignore */ }
    this.setChips(START_CHIPS.slice(0, 3));
    this.busy = false;
    this.ov.classList.remove('is-busy', 'is-thinking');
    this.setMode(this.open ? 'idle' : 'sleep');
  }

  /* Reveal HTML word by word (typewriter), keeping tags intact. */
  typeInto(el, html, done) {
    clearInterval(this.typeTimer);
    const parts = html.match(/<[^>]+>|[^<\s]+\s*|\s+/g) || [];
    let i = 0;
    this.typingEl = el;
    el.classList.add('is-streaming');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = () => {
      let n = reduce ? parts.length : 2;
      while (n > 0 && i < parts.length) { if (parts[i][0] !== '<') n--; i++; }
      el.innerHTML = parts.slice(0, i).join('');
      this.scrollDown();
      if (i >= parts.length) {
        clearInterval(this.typeTimer);
        el.classList.remove('is-streaming');
        el.innerHTML = html;
        this.typingEl = null;
        done && done();
      }
    };
    step();
    this.typeTimer = setInterval(step, 45);
  }

  /* AI replies are plain text: escape, keep line breaks, make contacts clickable. */
  formatAi(text) {
    let h = esc(String(text).trim())
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\n)\s*[-•]\s+/g, '$1• ');
    h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.]+[a-z])/gi, '$1<a href="mailto:$2">$2</a>');
    h = h.replace(/(\+\d{1,3}[\s-]?\d[\d\s-]{6,13}\d)/g, (m) => `<a href="tel:${m.replace(/[^\d+]/g, '')}">${m}</a>`);
    h = h.replace(/\bWhatsApp\b(?![^<]*<\/a>)/, `<a href="${LINKS.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>`);
    return h.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
  }

  answer(q) {
    const s = ' ' + q.toLowerCase().replace(/[^\p{L}\p{N}\s/+'-]/gu, ' ').replace(/\s+/g, ' ') + ' ';
    const word = (w) => (w.length <= 3 ? new RegExp(`(^|\\s)${w.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}(\\s|$)`).test(s) : s.includes(w));

    // explicit navigation: "open careers", "take me to the team page", "go to contact"
    const nav = s.match(/\b(open|show|go to|take me to|navigate to|visit)\b/);
    if (nav) {
      for (const [page, words] of Object.entries(PAGES)) {
        if (words.some((w) => s.includes(` ${w} `) || s.includes(` ${w}`))) {
          if (/page|section|take me|go to|navigate/.test(s) || s.trim().split(' ').length <= 3) {
            return { text: `Sure, opening the <strong>${page[0].toUpperCase() + page.slice(1)}</strong> page for you. ✨`, go: page, chips: START_CHIPS.slice(0, 3) };
          }
        }
      }
    }

    let best = null, bestScore = 0;
    for (const it of INTENTS) {
      let score = 0;
      for (const w of it.k) if (word(w)) score += 1 + w.length / 6;
      if (score > bestScore) { bestScore = score; best = it; }
    }
    // short follow-ups like "yes" / "tell me more" continue the last topic
    if (!best && /\b(yes|yeah|sure|more|tell me more|details|go on)\b/.test(s) && this.lastIntent) best = this.lastIntent;

    if (!best) {
      return {
        text: `Hmm, I'm not sure about that one yet. Our team will know. You can reach them here:${contactBlock()}`,
        chips: ['What does Oleovista do?', 'What is ACERS?', 'Open positions']
      };
    }
    this.lastIntent = best;
    const text = typeof best.r === 'function' ? best.r() : best.r;
    return { text, go: best.go, chips: best.chips || [] };
  }

  navigate(page) {
    // Prefer clicking the real nav link so every existing behaviour (menus, music, analytics) runs.
    const link = document.getElementById(`nav-${page}`);
    const current = this.ui?.currentMode;
    if (current === page) return;
    if (link) link.click();
    else if (this.ui?.switchMode) this.ui.switchMode(page);
  }

  /* ---------- voice ---------- */
  toggleSound() {
    this.soundOn = !this.soundOn;
    this.soundBtn.setAttribute('aria-pressed', String(this.soundOn));
    this.soundBtn.classList.toggle('is-on', this.soundOn);
    if (!this.soundOn) { try { window.speechSynthesis?.cancel(); } catch (_) { /* ignore */ } }
    else if (!('speechSynthesis' in window)) this.addMsg('bot', 'Sorry, your browser can\'t read replies aloud.');
  }

  speak(html) {
    if (!this.soundOn || !('speechSynthesis' in window)) return false;
    const tmp = document.createElement('div');
    tmp.innerHTML = html.replace(/<li>/g, '. ').replace(/<br\s*\/?>/g, '. ');
    const text = tmp.textContent.replace(/[📞✉️💬👋🌿💚✨→]/gu, '').replace(/\s+/g, ' ').trim();
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const v = voices.find((x) => /en[-_](IN|GB)/i.test(x.lang) && /female|samantha|zira|google uk english female|heera|veena/i.test(x.name))
        || voices.find((x) => /^en/i.test(x.lang) && /female|samantha|zira|serena|karen/i.test(x.name))
        || voices.find((x) => /^en/i.test(x.lang));
      if (v) u.voice = v;
      u.rate = 1.02; u.pitch = 1.08;
      u.onstart = () => this.setMode('speaking');
      u.onend = () => { if (!this.busy) this.setMode(this.open ? 'idle' : 'sleep'); };
      synth.speak(u);
      return true;
    } catch (_) { return false; }
  }

  listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (this.rec) { this.stopListening(); return; }
    try {
      const rec = new SR();
      rec.lang = 'en-IN';
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      this.rec = rec;
      this.micBtn.classList.add('is-listening');
      this.input.placeholder = 'Listening...';
      this.setMode('listening');
      let finalText = '';
      rec.onresult = (e) => {
        let txt = '';
        for (let i = 0; i < e.results.length; i++) {
          txt += e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText = txt;
        }
        this.input.value = txt;
      };
      rec.onerror = (e) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.addMsg('bot', 'I need microphone permission to hear you. You can always type instead. 🙂');
      };
      rec.onend = () => {
        const said = (finalText || this.input.value).trim();
        this.stopListening();
        if (said) this.send(said);
      };
      rec.start();
    } catch (_) { this.stopListening(); }
  }

  stopListening() {
    const r = this.rec;
    this.rec = null;
    if (r) { r.onend = null; try { r.stop(); } catch (_) { /* ignore */ } }
    this.micBtn?.classList.remove('is-listening');
    this.input.placeholder = 'Ask me anything...';
    if (!this.busy && this.open) this.setMode('idle');
  }
}