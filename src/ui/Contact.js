/*
  Contact.js  -  Contact Us page: contact links, project brief form, chat assistant, FAQ and map.
  ----------------------------------------------------------------------------------------------
  Same class name and API as before (ContactBoard: measure() + update(prog)), so UIManager.js
  needs no changes.

  EDIT YOUR DETAILS HERE ONLY - every phone / email / address / link on the page is filled from this.
*/
export const CONTACT = {
  company: 'Oleovista Solutions Private Limited',
  phone: '+91 95394 94809',            // shown on the page
  phoneLink: '+919539494809',          // used for tel: links
  whatsapp: '919539494809',            // country code + number, digits only (for wa.me)
  email: 'corporate@oleovista.com',
  address: 'Oleovista Solutions Private Limited<br>Carnival Infopark, Phase 1, Infopark Campus,<br>Kakkanad, Kochi, Kerala, India',
  addressShort: 'Carnival Infopark, Phase 1, Kakkanad, Kochi',
  mapQuery: 'Carnival Infopark Phase 1, Kakkanad, Kochi, Kerala',
  social: {                              // put your profile links here ('' hides the link)
    linkedin: '',
    instagram: '',
    facebook: '',
    x: ''
  }
};

// scroll timing (matches the Contact section range in UIManager)
const START = 0.13;
const END = 0.98;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class ContactBoard {
  constructor(cameraRig) {
    this.cameraRig = cameraRig;
    this.track = document.getElementById('contact-track');
    if (!this.track) return;

    this.fillDetails();
    this.initForm();
    this.initChat();
    this.initFAQ();
    this.initMap();
    this.initLinks();
    this.guardInputs();

    this.measure();
    window.addEventListener('resize', () => this.measure());
    if (window.ResizeObserver) new ResizeObserver(() => this.measure()).observe(this.track);
  }

  /* ---------------- contact details everywhere on the page ---------------- */
  links() {
    const c = CONTACT;
    return {
      tel: `tel:${c.phoneLink}`,
      mail: `mailto:${c.email}`,
      whatsapp: `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(`Hello ${c.company}, I'd like to talk about a project.`)}`,
      maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapQuery)}`
    };
  }

  fillDetails() {
    const L = this.links();
    const view = document.getElementById('contact-view');
    if (!view) return;
    view.querySelectorAll('[data-ct]').forEach((el) => {
      const k = el.dataset.ct;
      if (k === 'address') el.innerHTML = CONTACT.address;
      else if (CONTACT[k] !== undefined) el.textContent = CONTACT[k];
    });
    view.querySelectorAll('[data-ct-href]').forEach((el) => { el.href = L[el.dataset.ctHref] || '#'; });
    const floatWa = document.getElementById('whatsapp-float-btn');
    if (floatWa) floatWa.href = L.whatsapp;
    view.querySelectorAll('[data-ct-social]').forEach((el) => {
      const url = CONTACT.social[el.dataset.ctSocial];
      if (url) el.href = url; else el.closest('li')?.remove();
    });
    // hide the "Social media" heading until at least one link is added
    view.querySelectorAll('.ct-social-list').forEach((ul) => {
      if (!ul.children.length) { ul.previousElementSibling?.remove(); ul.remove(); }
    });
    const yr = document.getElementById('ct-year');
    if (yr) yr.textContent = new Date().getFullYear();
  }

  /* ---------------- scroll: the track rises over the 3D world ---------------- */
  measure() {
    if (!this.track) return;
    this.vh = window.innerHeight;
    this.h = this.track.offsetHeight;
    this.from = this.vh * 0.95;
    this.to = Math.min(this.from, -(this.h - this.vh * 0.86));

    const anchors = { reach: 'contact-anchor-reach', brief: 'contact-anchor-brief', chat: 'contact-anchor-chat', faq: 'contact-anchor-faq', map: 'contact-anchor-map' };
    this.anchorProg = {};
    Object.entries(anchors).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const want = -(el.offsetTop - this.vh * 0.14);
      const s = Math.min(Math.max((want - this.from) / (this.to - this.from), 0), 1);
      const prog = START + s * (END - START);
      this.anchorProg[key] = prog;
      document.querySelectorAll(`[data-contact-anchor="${key}"]`).forEach((n) => {
        if ('progress' in n.dataset) n.dataset.progress = prog.toFixed(3);
        if ('target' in n.dataset) n.dataset.target = prog.toFixed(3);
      });
    });
  }

  update(prog) {
    if (!this.track || this.h === undefined) return;
    const s = Math.min(Math.max((prog - START) / (END - START), 0), 1);
    const y = this.from + (this.to - this.from) * s;
    this.track.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  }

  goTo(key) {
    if (!this.anchorProg) this.measure();
    const p = this.anchorProg?.[key];
    if (p !== undefined) this.cameraRig?.glideTo(p, 1.4);
  }

  /* ---------------- buttons and footer links ---------------- */
  initLinks() {
    document.querySelectorAll('[data-contact-go]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      this.goTo(b.dataset.contactGo);
    }));
    document.querySelectorAll('[data-ct-nav]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(b.dataset.ctNav)?.click();
    }));
    document.getElementById('ct-scroll-top')?.addEventListener('click', () => this.cameraRig?.glideTo(0, 1.6));
  }

  // typing in the form/chat must not move the 3D camera (space / arrow keys)
  guardInputs() {
    this.track.addEventListener('keydown', (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) e.stopPropagation();
    });
  }

  // let a scrollable box scroll by itself; pass the wheel on to the page only at its ends
  isolateScroll(el) {
    el.addEventListener('wheel', (e) => {
      if (el.scrollHeight <= el.clientHeight + 2) return;
      const atTop = el.scrollTop <= 0 && e.deltaY < 0;
      const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1 && e.deltaY > 0;
      if (!atTop && !atEnd) e.stopPropagation();
    }, { passive: true });
  }

  /* ---------------- project brief form ---------------- */
  initForm() {
    this.form = document.getElementById('contact-project-form');
    this.success = document.getElementById('contact-form-success');
    if (!this.form) return;
    const err = this.form.querySelector('.ct-form-error');
    this.isolateScroll(document.getElementById('cf-message'));

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = this.read();
      if (!f) return;
      window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(f.subjectLine)}&body=${encodeURIComponent(f.body)}`;
      const n = document.getElementById('cf-success-name');
      if (n) n.textContent = f.name.split(' ')[0];
      this.form.hidden = true;
      if (this.success) this.success.hidden = false;
    });

    document.getElementById('cf-whatsapp')?.addEventListener('click', () => {
      const f = this.read();
      if (!f) return;
      window.open(`https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(f.body)}`, '_blank', 'noopener');
    });

    document.getElementById('cf-reset-btn')?.addEventListener('click', () => {
      this.form.reset();
      this.form.hidden = false;
      if (this.success) this.success.hidden = true;
      err.textContent = '';
    });

    this.read = () => {
      const v = (id) => (document.getElementById(id)?.value || '').trim();
      const f = {
        name: v('cf-name'), email: v('cf-email'), code: v('cf-code'), phone: v('cf-phone'),
        company: v('cf-company'), service: v('cf-service'), subject: v('cf-subject'), message: v('cf-message')
      };
      const problem =
        !f.name ? 'Please enter your name.' :
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) ? 'Please enter a valid email address.' :
        f.phone.replace(/\D/g, '').length < 6 ? 'Please enter your phone number.' :
        !f.subject ? 'Please add a subject.' :
        !f.message ? 'Please tell us a little about your project.' : '';
      err.textContent = problem;
      if (problem) return null;
      f.subjectLine = `Project enquiry: ${f.subject}`;
      f.body = [
        `Hello ${CONTACT.company},`, '',
        f.message, '',
        '---',
        `Name: ${f.name}`,
        `Email: ${f.email}`,
        `Phone: ${f.code} ${f.phone}`.trim(),
        f.company ? `Company: ${f.company}` : null,
        f.service ? `Interested in: ${f.service}` : null,
        `Subject: ${f.subject}`
      ].filter((l) => l !== null).join('\n');
      return f;
    };
  }

  /* ---------------- chat assistant (scripted, honest, hands off to WhatsApp) ---------------- */
  initChat() {
    this.msgs = document.getElementById('ai-chat-messages');
    this.input = document.getElementById('ai-chat-input');
    if (!this.msgs) return;
    this.isolateScroll(this.msgs);
    document.querySelectorAll('[data-chat-prompt]').forEach((b) => b.addEventListener('click', () => this.ask(b.dataset.chatPrompt)));
    document.getElementById('ai-chat-send')?.addEventListener('click', () => this.sendInput());
    this.input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.sendInput(); } });
  }

  sendInput() {
    const t = this.input?.value.trim();
    if (!t) return;
    this.input.value = '';
    this.ask(t);
  }

  bubble(html, who) {
    const d = document.createElement('div');
    d.className = `ct-msg ct-msg-${who}`;
    d.innerHTML = `<div class="ct-bubble">${html}</div>`;
    this.msgs.appendChild(d);
    this.msgs.scrollTop = this.msgs.scrollHeight;
    return d;
  }

  ask(text) {
    if (!this.msgs || this.busy) return;
    this.busy = true;
    this.bubble(esc(text), 'user');
    const typing = this.bubble('<span class="ct-typing"><i></i><i></i><i></i></span>', 'bot');
    setTimeout(() => {
      typing.remove();
      this.bubble(this.reply(text), 'bot');
      this.busy = false;
    }, 650);
  }

  reply(q) {
    const s = q.toLowerCase();
    const L = this.links();
    const wa = `<a href="${L.whatsapp}" target="_blank" rel="noopener">WhatsApp</a>`;
    const has = (...w) => w.some((x) => s.includes(x));
    if (has('acers', 'platform', 'etrm', 'erp')) {
      return 'ACERS is our ERP + ETRM platform for commodity and energy companies. It brings trade capture, positions, risk, finance, operations and compliance into one cloud-ready system.';
    }
    if (has('service', 'offer', 'what do you do', 'build')) {
      return 'We build:<ul><li>ACERS – ERP + ETRM platform</li><li>Risk analytics &amp; compliance (MTM, P/L, VaR)</li><li>Workflow automation for settlements and operations</li><li>Custom enterprise software</li></ul>Want to tell us about your project? Use the form above.';
    }
    if (has('cost', 'price', 'pricing', 'budget', 'quote')) {
      return 'Pricing depends on scope. We offer fixed-scope quotes and dedicated-team engagements. Share a short brief (form above) and we\'ll come back with options.';
    }
    if (has('start', 'soon', 'timeline', 'how long', 'when')) {
      return 'After a short discovery call we send a clear plan with milestones. Smaller modules can go live in weeks; larger roll-outs are planned in phases.';
    }
    if (has('office', 'where', 'location', 'address', 'visit', 'kochi', 'infopark')) {
      return `Our office is at <strong>${CONTACT.addressShort}</strong>. <a href="${L.maps}" target="_blank" rel="noopener">Get directions</a>.`;
    }
    if (has('support', 'maintenance', 'after launch', 'after release')) {
      return 'Yes, we offer support and maintenance plans covering updates, monitoring, fixes and new features.';
    }
    if (has('contact', 'call', 'phone', 'email', 'mail', 'whatsapp', 'team', 'human', 'person')) {
      return `You can reach the team here:<br>📞 <a href="${L.tel}">${CONTACT.phone}</a><br>✉️ <a href="${L.mail}">${CONTACT.email}</a><br>💬 ${wa}`;
    }
    if (has('job', 'career', 'hiring', 'vacanc')) {
      return 'Have a look at our Careers page for open roles. You can apply directly from there.';
    }
    if (has('hi', 'hello', 'hey')) {
      return 'Hello! Ask me about our services, ACERS, pricing, timelines or our office.';
    }
    return `I'm a simple assistant, so I may not know that one. Our team can help on ${wa}, by email at <a href="${L.mail}">${CONTACT.email}</a>, or by phone on <a href="${L.tel}">${CONTACT.phone}</a>.`;
  }

  /* ---------------- FAQ accordion ---------------- */
  initFAQ() {
    const items = Array.from(document.querySelectorAll('#contact-view .ct-faq-item'));
    items.forEach((item) => {
      item.querySelector('.ct-faq-q')?.addEventListener('click', () => {
        const open = item.classList.contains('open');
        items.forEach((o) => o.classList.remove('open'));
        if (!open) item.classList.add('open');
        setTimeout(() => this.measure(), 360);
      });
    });
  }

  /* ---------------- map (loads when the page is opened; click to interact) ---------------- */
  initMap() {
    const frame = document.getElementById('ct-map-frame');
    const shield = document.getElementById('ct-map-shield');
    if (!frame) return;
    const src = `https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapQuery)}&z=16&output=embed`;
    const load = () => { if (!frame.src) frame.src = src; };
    const view = document.getElementById('contact-view');
    if (view?.classList.contains('active')) load();
    else if (view && window.MutationObserver) {
      const mo = new MutationObserver(() => { if (view.classList.contains('active')) { load(); mo.disconnect(); } });
      mo.observe(view, { attributes: true, attributeFilter: ['class'] });
    }
    // the map would swallow the scroll wheel, so it only becomes interactive after a click
    shield?.addEventListener('click', () => {
      shield.classList.add('off');
      frame.tabIndex = 0;
    });
    frame.parentElement?.addEventListener('mouseleave', () => shield?.classList.remove('off'));
  }
}
