/*
  Team.js  -  team members shown on the Team page (scrolls over the 3D meadow).
  -----------------------------------------------------------------------------
  HOW TO ADD YOUR PEOPLE
    1. Put the photos in your project's  public/team/  folder  (e.g. public/team/arun.jpg).
       Portrait photos (about 4:5, e.g. 800 x 1000 px) look best.
    2. Edit the LEADERSHIP and TEAM lists below:
         name   - shown on the card
         role   - designation, shown under the name
         photo  - '/team/arun.jpg'   (leave '' to show a placeholder silhouette)
         bio    - optional, shown when the card is clicked
         linkedin / email - optional links shown when the card is clicked
    That is all. Cards, layout and scrolling adjust automatically to however many people you list.
*/
const ANJITHA = '/assets/anj.png';
const ANUSHAD = '/assets/anushad.jpeg';
const DILEENA = '/assets/dileena.jpeg';
const SHAM = '/assets/shemeem.jpeg';
const AISH = '/assets/Aisu.jpeg';
const RAZ = '/assets/razik.jpeg';
const PRAV = '/assets/praveena.jpeg';
export const LEADERSHIP = [
  { name: 'Anjitha Sebastian', role: 'Director', photo: ANJITHA, bio: 'Leads Oleovista\'s vision and strategy across energy and commodity trading software.', linkedin: '', email: '' },
  { name: 'Anushad', role: 'Director', photo: ANUSHAD, bio: 'Heads product engineering and the ACERS platform architecture.', linkedin: '', email: '' },
  { name: 'Dileena Beegum', role: 'Director', photo: DILEENA, bio: 'Runs delivery, client success and day-to-day operations.', linkedin: '', email: '' }
];

export const TEAM = [
  { name: 'Shemeem', role: 'Frontend Developer', photo: SHAM },
  { name: 'Aiswarya', role: 'Frontend Developer', photo: AISH },
  { name: 'Razik', role: 'Tester', photo: RAZ },
  { name: 'Praveena', role: 'Tester', photo: PRAV },
  // { name: 'Member Name', role: 'QA Engineer', photo: '' },
  // { name: 'Member Name', role: 'Project Manager', photo: '' },
  // { name: 'Member Name', role: 'HR Manager', photo: '' },
  // { name: 'Member Name', role: 'Business Development Manager', photo: '' },
  // { name: 'Member Name', role: 'Marketing Executive', photo: '' }
];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// placeholder portrait (soft silhouette) used until a photo is added
const SILHOUETTE = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f4a1a"/><stop offset="1" stop-color="#0f1a07"/></linearGradient></defs>
    <rect width="400" height="500" fill="url(#g)"/>
    <circle cx="200" cy="190" r="78" fill="#6f8f45" opacity="0.55"/>
    <path d="M60 500c0-95 63-165 140-165s140 70 140 165z" fill="#6f8f45" opacity="0.55"/>
  </svg>`);

// scroll timing (matches the Team section range in UIManager)
const START = 0.13;   // cards begin rising from the bottom
const END = 0.97;     // last card reaches its final position

export class TeamBoard {
  constructor() {
    this.track = document.getElementById('team-track');
    this.lead = document.getElementById('team-leadership');
    this.grid = document.getElementById('team-grid');
    this.modal = document.getElementById('modal-overlay');
    this.modalContent = document.getElementById('modal-content');
    if (!this.track || !this.grid) return;

    this.render();
    this.measure();
    window.addEventListener('resize', () => this.measure());
    this.track.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => this.measure()));
    if (window.ResizeObserver) new ResizeObserver(() => this.measure()).observe(this.track);

    document.querySelectorAll('[data-team-careers]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('nav-careers')?.click();
    }));
  }

  card(p, i, big) {
    const photo = p.photo || SILHOUETTE;
    return `
      <button class="tm-card${big ? ' tm-card-lead' : ''}${p.photo ? '' : ' tm-no-photo'}" data-i="${i}" data-big="${big ? 1 : 0}" style="--d:${(i % 4) * 70}ms">
        <span class="tm-photo"><img src="${esc(photo)}" alt="${esc(p.name)}" loading="lazy" onerror="this.src='${SILHOUETTE}'"></span>
        <span class="tm-info">
          <span class="tm-name">${esc(p.name)}</span>
          <span class="tm-role">${esc(p.role)}</span>
        </span>
      </button>`;
  }

  render() {
    if (this.lead) this.lead.innerHTML = LEADERSHIP.map((p, i) => this.card(p, i, true)).join('');
    this.grid.innerHTML = TEAM.map((p, i) => this.card(p, i, false)).join('');
    this.track.querySelectorAll('.tm-card').forEach((c) => {
      c.addEventListener('click', () => {
        const list = c.dataset.big === '1' ? LEADERSHIP : TEAM;
        this.open(list[+c.dataset.i]);
      });
    });
  }

  open(p) {
    if (!p || !this.modal || !this.modalContent) return;
    const links = [
      p.linkedin && `<a class="car-btn" href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>`,
      p.email && `<a class="car-btn" href="mailto:${esc(p.email)}">Email</a>`
    ].filter(Boolean).join('');
    this.modalContent.innerHTML = `
      <div class="tm-modal">
        <img class="tm-modal-photo" src="${esc(p.photo || SILHOUETTE)}" alt="${esc(p.name)}" onerror="this.src='${SILHOUETTE}'">
        <div>
          <div class="card-eyebrow tm-modal-role">${esc(p.role)}</div>
          <h2 class="card-title">${esc(p.name)}</h2>
          ${p.bio ? `<p class="tm-modal-bio">${esc(p.bio)}</p>` : ''}
          ${links ? `<div class="tm-modal-links">${links}</div>` : ''}
        </div>
      </div>`;
    this.modal.classList.add('open');
  }

  // where the track starts (below the screen) and ends (last row on screen)
  measure() {
    if (!this.track) return;
    this.vh = window.innerHeight;
    this.h = this.track.offsetHeight;
    this.from = this.vh * 0.95;
    this.to = Math.min(this.from, -(this.h - this.vh * 0.82));

    // point the side chapters / menu links at the right parts of the list
    const anchors = { lead: 'team-anchor-lead', grid: 'team-anchor-grid', join: 'team-anchor-join' };
    Object.entries(anchors).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const want = -(el.offsetTop - this.vh * 0.16);
      const s = Math.min(Math.max((want - this.from) / (this.to - this.from), 0), 1);
      const prog = (START + s * (END - START)).toFixed(3);
      document.querySelectorAll(`[data-team-anchor="${key}"]`).forEach((n) => {
        if ('progress' in n.dataset) n.dataset.progress = prog;
        if ('target' in n.dataset) n.dataset.target = prog;
      });
    });
  }

  update(prog) {
    if (!this.track || this.h === undefined) return;
    const s = Math.min(Math.max((prog - START) / (END - START), 0), 1);
    const y = this.from + (this.to - this.from) * s;
    this.track.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
  }
}
