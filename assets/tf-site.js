const REDUCE = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.querySelectorAll('svg.pix').forEach(svg => {
  const rows = svg.dataset.pix.split(',');
  const w = Math.max(...rows.map(r => r.length)), h = rows.length, n = Math.max(w, h);
  const ox = (n - w) / 2, oy = (n - h) / 2;
  svg.setAttribute('viewBox', `0 0 ${n} ${n}`);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.innerHTML = rows.map((r, y) => [...r].map((c, x) => c === '1' ? `<rect x="${x + ox}" y="${y + oy}" width=".86" height=".86" fill="currentColor"/>` : '').join('')).join('');
});

(() => {
  const tabs = [...document.querySelectorAll('.tablist [role="tab"]')];
  const note = document.querySelector('.tab-note');
  function show(t, focus) {
    tabs.forEach(x => {
      const on = x === t, p = document.getElementById(x.getAttribute('aria-controls'));
      const was = !p.hidden;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
      p.hidden = !on;
      if (on && !was) { p.classList.remove('enter'); void p.offsetWidth; p.classList.add('enter'); }
    });
    if (note) note.textContent = t.querySelector('.tab-desc').textContent;
    if (focus) t.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });
  const pre = tabs.find(x => '#' + x.id.slice(2) === location.hash);
  if (pre) {
    show(pre);
    addEventListener('load', () => document.getElementById('produto').scrollIntoView({ behavior: 'instant' }));
  }
})();

(() => {
  const card = document.querySelector('.run');
  const items = [...document.querySelectorAll('#run li')];
  const nameEl = document.getElementById('run-name'), idEl = document.getElementById('run-id');
  const mini = [...document.querySelectorAll('#mini span')];
  const toast = document.querySelector('.toast'), toastT = document.getElementById('toast-t'), toastTxt = document.getElementById('toast-txt');
  if (!items.length || REDUCE) return;
  let v = 15, id = 4822;
  const runs = window.TF_RUNS || [
    { name: 'Twin · Montagem da esteira', tag: () => 'v' + v, stage: 2,
      steps: ['Leu o pedido do credor', 'Montou a assinatura no WhatsApp', 'Testou com propostas de exemplo', 'Enviou para aprovação do credor'],
      who: 'Credor', done: () => 'Aprovou a versão ' + v + ' do fluxo' },
    { name: 'Twin · Documentos e proposta', tag: () => '#' + id, stage: 0,
      steps: ['Recebeu os documentos', 'Leu documento e comprovante de renda', 'Preencheu a proposta', 'Enviou para a política do credor'],
      who: 'Política do credor', done: () => '#' + id + ' dentro da política' }
  ];
  let r = 0, step = 2;
  function load() {
    const run = runs[r];
    nameEl.textContent = run.name; idEl.textContent = run.tag();
    items.forEach((li, i) => { li.querySelector('span:nth-child(2)').textContent = run.steps[i]; });
    mini.forEach((m, i) => { m.className = i < run.stage ? 'done' : i === run.stage ? 'now' : ''; });
    card.classList.remove('enter'); void card.offsetWidth; card.classList.add('enter');
  }
  function paint() {
    items.forEach((li, i) => {
      li.className = i < step ? 'done' : i === step ? 'now' : 'next';
      li.querySelector('small').textContent = i === step ? 'rodando…' : '';
    });
  }
  setInterval(() => {
    if (document.hidden) return;
    step++;
    if (step > items.length) {
      if (r === 0) v++; else id++;
      r = (r + 1) % runs.length; step = 0; load();
    }
    paint();
    if (step === items.length && toast) {
      toastT.textContent = runs[r].who; toastTxt.textContent = runs[r].done();
      toast.classList.remove('pop'); void toast.offsetWidth; toast.classList.add('pop');
    }
  }, 1700);
})();

(() => {
  const root = document.querySelector('.journey');
  if (!root) return;
  const btns = [...root.querySelectorAll('.steps-bar button')];
  const screens = [...root.querySelectorAll('.screen')];
  const step = root.querySelector('.j-step'), txt = root.querySelector('.j-txt span'), shape = root.querySelector('.j-txt .shape');
  const AUTO = 3600, HOLD = 9000;
  let i = 0, timer = null;
  function go(n, user) {
    i = n;
    const dur = user ? HOLD : AUTO;
    btns.forEach((b, k) => {
      b.setAttribute('aria-selected', k === i);
      b.classList.toggle('done', k < i);
      b.classList.remove('on');
    });
    void root.offsetWidth;
    btns[i].style.setProperty('--dur', dur + 'ms');
    if (!REDUCE) btns[i].classList.add('on'); else btns[i].classList.add('done');
    screens.forEach((s, k) => s.classList.toggle('is-on', k === i));
    const s = screens[i];
    step.textContent = String(i + 1).padStart(2, '0') + ' · ' + btns[i].textContent.trim();
    txt.textContent = s.dataset.cap;
    shape.className = 'shape ' + s.dataset.kind;
    clearTimeout(timer);
    if (!REDUCE) timer = setTimeout(() => { if (!document.hidden) go((i + 1) % screens.length); else go(i); }, dur);
  }
  btns.forEach((b, k) => b.addEventListener('click', () => go(k, true)));
  go(0);
})();

(() => {
  const track = document.getElementById('track');
  const stations = [...document.querySelectorAll('#stations .st')];
  const log = document.getElementById('log');
  if (!track || !stations.length) return;

  const STEPS = [
    { who: 'Banco parceiro', kind: 'sys' },
    { who: 'Twin de documentos', kind: 'twin', say: window.TF_DOC_TEXT || (id => `Leu os documentos e preencheu a proposta #${id}`) },
    { who: 'Credor', kind: 'lender', say: id => `#${id} dentro da política de crédito`, no: id => `#${id} fora da política de crédito · encerrada` },
    { who: 'Banco parceiro', kind: 'sys', say: id => `CCB #${id} emitida` },
    { who: 'Twin de pendências', kind: 'twin', say: id => `Cobrou a assinatura pendente de #${id} pelo WhatsApp`, alt: id => `Tomador de #${id} assinou a CCB` },
    { who: 'TwinFinance', kind: 'sys' },
    { who: 'Banco parceiro', kind: 'sys' },
    { who: 'Twin de cessão', kind: 'twin', say: id => `Incluiu #${id} no lote de cessão ao fundo` },
  ];
  const TRAVEL = 1500, DWELL = { sys: 500, twin: 1200, lender: 1300 }, SPAWN = 4200, MAX = 4;
  const mobile = () => window.matchMedia('(max-width: 960px)').matches;
  let pts = [];
  function measure() {
    const t = track.getBoundingClientRect();
    pts = stations.map(st => { const n = st.querySelector('.node').getBoundingClientRect(); return { x: n.left - t.left + n.width / 2, y: n.top - t.top + n.height / 2 }; });
  }
  const pad = n => String(n).padStart(2, '0');
  const clock = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
  function say(kind, who, text) {
    const li = document.createElement('li');
    li.className = 'new';
    li.innerHTML = `<time>${clock()}</time><span class="w-${kind}"></span><span class="what"></span>`;
    li.children[1].textContent = who;
    li.children[2].textContent = text;
    log.prepend(li);
    while (log.children.length > 4) log.lastElementChild.remove();
  }
  function hit(i, no) {
    const st = stations[i];
    st.classList.add('hit'); st.classList.toggle('no', !!no);
    clearTimeout(st._t); st._t = setTimeout(() => st.classList.remove('hit', 'no'), 700);
  }
  const toks = [];
  let nextId = 4823;
  function place(tk, x, y) {
    const m = mobile(), w = tk.el.offsetWidth, h = tk.el.offsetHeight;
    tk.el.style.transform = `translate(${m ? x - 34 - w : x - w / 2}px, ${m ? y - h / 2 : y - 36 - h / 2}px)`;
  }
  function arrive(tk) {
    const s = STEPS[tk.seg], no = s.kind === 'lender' && tk.rejected;
    hit(tk.seg, no);
    tk.el.classList.toggle('is-twin', s.kind === 'twin');
    if (no) say(s.kind, s.who, s.no(tk.id));
    else if (s.say) say(s.kind, s.who, (s.alt && tk.alt) ? s.alt(tk.id) : s.say(tk.id));
    if (no) { tk.done = true; setTimeout(() => tk.el.classList.add('gone'), 600); setTimeout(() => tk.el.remove(), 1100); }
  }
  function add(seg, id, extra) {
    const el = document.createElement('span');
    el.className = 'tok' + (STEPS[seg].kind === 'twin' ? ' is-twin' : '');
    el.textContent = '#' + id;
    track.appendChild(el);
    const tk = Object.assign({ el, id, seg, phase: 'dwell', t0: performance.now(), rejected: false, alt: false }, extra);
    toks.push(tk); place(tk, pts[seg].x, pts[seg].y);
    return tk;
  }
  function frame(now) {
    for (const tk of toks) {
      if (tk.done) continue;
      const a = pts[tk.seg];
      if (tk.phase === 'dwell') {
        place(tk, a.x, a.y);
        if (now - tk.t0 > DWELL[STEPS[tk.seg].kind]) {
          if (tk.seg === pts.length - 1) { tk.done = true; tk.el.classList.add('gone'); setTimeout(() => tk.el.remove(), 500); }
          else { tk.phase = 'travel'; tk.t0 = now; tk.el.classList.remove('is-twin'); }
        }
      } else {
        const b = pts[tk.seg + 1];
        let p = Math.min(1, (now - tk.t0) / TRAVEL);
        p = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        place(tk, a.x + (b.x - a.x) * p, a.y + (b.y - a.y) * p);
        if (p >= 1) { tk.seg++; tk.phase = 'dwell'; tk.t0 = now; arrive(tk); }
      }
    }
    for (let i = toks.length - 1; i >= 0; i--) if (toks[i].done && !toks[i].el.isConnected) toks.splice(i, 1);
    requestAnimationFrame(frame);
  }
  measure();
  [[7, 4816], [4, 4819], [2, 4821], [1, 4822]].forEach(([seg, id], k) => add(seg, id, { t0: performance.now() - k * 180 }));
  window.addEventListener('resize', () => { measure(); toks.forEach(tk => !tk.done && tk.phase === 'dwell' && place(tk, pts[tk.seg].x, pts[tk.seg].y)); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); toks.forEach(tk => !tk.done && place(tk, pts[tk.seg].x, pts[tk.seg].y)); });
  if (REDUCE) return;
  setInterval(() => {
    if (document.hidden || toks.filter(t => !t.done).length >= MAX) return;
    arrive(add(0, nextId++, { rejected: Math.random() < 0.14, alt: Math.random() < 0.5 }));
  }, SPAWN);
  requestAnimationFrame(frame);
})();
