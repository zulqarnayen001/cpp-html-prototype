/* Storyline-style player engine for HTML courses.
   - A slide is a 960 x 540 stage, scaled to fit, with a timeline driven by its narration clip.
   - Objects enter at cue times (seconds), like objects on the Storyline timeline. Seeking shows the right state.
   - Layers (feedback, Did You Know?, glossary pop-ups) get their own timeline and narration, and pause the
     base layer while open, like a Storyline layer set to "pause timeline of base layer".
   - Captions come from the course's own VTT cues (js/media-data.js).
   No fetch() and no modules, so the course runs by double-clicking index.html. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* Small DOM helper: h('div', {class: 'x', onclick: fn}, child, 'text') */
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  }
  /* Absolute box in Storyline slide coordinates */
  function box(x, y, w, hgt, extra) {
    const s = { left: x + 'px', top: y + 'px' };
    if (w != null) s.width = w + 'px';
    if (hgt != null) s.height = hgt + 'px';
    return Object.assign(s, extra || {});
  }

  /* ---------- Timeline ---------- */
  class Timeline {
    constructor(opts) {
      this.clip = opts.clip || null;
      const clipDur = this.clip ? (window.CLIP_DURATION[this.clip] || 0) : 0;
      this.dur = Math.max(opts.dur || 0, clipDur, 0.5);
      this.cues = this.clip ? (window.CAPTIONS[this.clip] || []) : [];
      this.items = [];
      this.t = 0;
      this.playing = false;
      this.ended = false;
      this.onEnd = opts.onEnd || null;
      this.onTick = opts.onTick || null;
      this.audio = null;
      if (this.clip) {
        this.audio = new Audio('assets/audio/' + this.clip + '.mp3');
        this.audio.preload = 'auto';
        this.audio.volume = Player.volume;
        this.audio.muted = Player.muted;
      }
    }
    add(el, at, opts) {
      opts = opts || {};
      const it = { el, at: at || 0, out: opts.out, motion: opts.motion, shown: null };
      el.classList.add('tl');
      if (opts.anim) el.classList.add('anim-' + opts.anim);
      if (opts.dur) el.style.setProperty('--d', opts.dur + 's');
      this.items.push(it);
      this.render(true);
      return el;
    }
    render(force) {
      for (const it of this.items) {
        const on = this.t >= it.at - 0.001 && (it.out == null || this.t < it.out);
        if (on !== it.shown || force) {
          it.el.classList.toggle('in', on);
          it.el.toggleAttribute('inert', !on);
          if (!on) it.el.setAttribute('aria-hidden', 'true'); else it.el.removeAttribute('aria-hidden');
          it.shown = on;
        }
        if (it.motion) {
          const m = it.motion, p = Math.min(1, Math.max(0, (this.t - m.start) / (m.end - m.start)));
          const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          it.el.style.translate = `${m.dx * e}px ${m.dy * e}px`;
        }
      }
      const cue = this.cues.find(c => this.t >= c[0] && this.t < c[1]);
      Player.caption(cue ? cue[2] : '');
      Player.syncSeek(this);
    }
    play() {
      if (this.ended && this.t >= this.dur) return;
      this.playing = true;
      this.last = performance.now();
      if (this.audio && this.t < (window.CLIP_DURATION[this.clip] || 0)) {
        this.audio.playbackRate = Player.rate;
        this.audio.currentTime = this.t;
        const pr = this.audio.play();
        if (pr && pr.catch) pr.catch(() => {});
      }
      this.loop();
      Player.syncPlaying();
    }
    pause() {
      this.playing = false;
      if (this.audio) this.audio.pause();
      cancelAnimationFrame(this.raf);
      Player.syncPlaying();
    }
    toggle() { this.playing ? this.pause() : (this.t >= this.dur ? this.seek(0, true) : this.play()); }
    seek(t, andPlay) {
      this.t = Math.max(0, Math.min(this.dur, t));
      this.ended = this.t >= this.dur;
      if (this.audio) {
        const cd = window.CLIP_DURATION[this.clip] || 0;
        if (this.t < cd) { this.audio.currentTime = this.t; if (this.playing) this.audio.play().catch(() => {}); }
        else this.audio.pause();
      }
      this.render();
      if (andPlay) this.play();
    }
    loop() {
      cancelAnimationFrame(this.raf);
      const step = now => {
        if (!this.playing) return;
        const dt = (now - this.last) / 1000; this.last = now;
        const a = this.audio;
        if (a && !a.paused && !a.ended && a.currentTime > 0) this.t = a.currentTime;
        else this.t += dt * Player.rate;
        if (this.t >= this.dur) {
          this.t = this.dur; this.playing = false; this.ended = true; this.render();
          Player.syncPlaying();
          if (this.onEnd) this.onEnd();
          return;
        }
        this.render();
        if (this.onTick) this.onTick(this.t);
        this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }
    destroy() { this.pause(); if (this.audio) { this.audio.src = ''; this.audio = null; } this.items = []; }
  }

  /* ---------- Player ---------- */
  const Player = {
    h, box, Timeline,
    slides: [], idx: -1, visited: new Set(), state: {},
    volume: 1, muted: false, rate: 1, cc: true,
    base: null, layers: [],
    get active() { return this.layers.length ? this.layers[this.layers.length - 1].tl : this.base; },

    register(slide) { this.slides.push(slide); },
    index(id) { return this.slides.findIndex(s => s.id === id); },

    init() {
      this.stage = $('#stage'); this.frame = $('#stage-frame'); this.app = $('#app');
      this.fade = h('div', { class: 'pfade', 'aria-hidden': 'true' }); this.frame.append(this.fade);
      this.buildMenu(); this.buildResources(); this.buildSpeed(); this.wire(); this.tooltips();
      let rt = 0;
      window.addEventListener('resize', () => { this.fit(); clearTimeout(rt); rt = setTimeout(() => this.pfit(true), 120); });
      this.fit();
      const start = () => { $('#cover').hidden = true; this.state = {}; this.visited.clear(); this.goto(0); this.stage.focus(); };
      $('#btn-start').addEventListener('click', start);
      // Back from the LMS with a bookmark: offer to resume, like Storyline's "resume where you left off?" prompt
      const L = window.LMS, at = L && L.on && L.location ? this.index(L.location) : -1;
      if (at > 0 && L.resume) {
        $('#cover').classList.add('resume');
        $('#btn-start').querySelector('.lbl').textContent = 'Start over';
        $('#btn-resume').hidden = false;
        $('#btn-resume').addEventListener('click', () => {
          $('#cover').hidden = true; this.restore(L.resume); this.goto(at); this.stage.focus();
        });
        $('#btn-resume').focus();
      } else $('#btn-start').focus();
      this.syncNav();
      this.preview(L);
    },

    /* Review links, outside an LMS only: index.html#slide=q1 opens that slide, &end=1 at its last moment,
       &mute=1 without sound. "Phone preview.html" uses them to show one slide at several phone sizes. */
    preview(L) {
      if (L && L.on) return;
      const q = new URLSearchParams(location.hash.slice(1)), id = q.get('slide');
      if (!id || this.index(id) < 0) return;
      if (q.get('mute') === '1') this.setVolume(0);
      $('#cover').hidden = true;
      this.goto(id, { paused: q.get('end') === '1' });
      if (q.get('end') === '1') this.base.seek(this.base.dur - 0.05);
    },

    /* Desktop: the 960 x 540 slide scaled to fit, like the Storyline player.
       Phone (same rule as the Athleader player): when the player area is under 600 px wide or clearly taller than
       wide, body gets .portrait and the stage becomes a canvas as wide as the phone. Each slide then uses its
       phone layout from css/responsive.css. "Fit first, scroll if needed": pfit() zooms out a little (never below
       94%) when a slide is slightly too long, and otherwise lets it scroll with a fade at the foot. */
    pz: 1, portrait: false,
    fit() {
      const area = $('#stage-area'), vw = area.clientWidth, vh = area.clientHeight;
      const portrait = vw > 0 && vh > 0 && (vw < 600 || vw / vh < 0.8);
      document.body.classList.toggle('portrait', portrait);
      let SW = 960, SH = 540;
      if (portrait) {
        // As wide as the phone, down to 280 px (a folded phone), so phone pixels are layout pixels
        SW = vw <= 600 ? Math.round(Math.max(280, vw)) : Math.round(Math.min(720, vw / 1.3));
        SH = Math.round(Math.max(360, SW * vh / vw));
        if (this.pz < 1) { SW = Math.round(SW / this.pz); SH = Math.round(SH / this.pz); }
      } else this.pz = 1;
      this.frame.style.width = SW + 'px'; this.frame.style.height = SH + 'px';
      this.frame.style.setProperty('--sw', SW + 'px'); this.frame.style.setProperty('--sh', SH + 'px');
      let s = Math.min(vw / SW, vh / SH);
      if (this.zoomFill && !portrait) s = vw / 960;
      s = Math.max(s, 0.2);
      const x = (vw - SW * s) / 2, y = Math.max(0, (vh - SH * s) / 2);
      this.frame.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
      area.style.overflowY = this.zoomFill && !portrait ? 'auto' : '';
      if (portrait !== this.portrait) { this.portrait = portrait; requestAnimationFrame(() => this.pfit(true)); }
    },
    pfit(reset) {
      const slide = this.stage.querySelector('.slide');
      if (!slide) return;
      if (!this.portrait) {
        this.frame.classList.remove('pscroll');
        if (this.pz !== 1) { this.pz = 1; this.fit(); }
        return;
      }
      if (reset && this.pz !== 1) { this.pz = 1; this.fit(); }
      for (let i = 0; i < 6; i++) {
        const need = slide.scrollHeight, have = slide.clientHeight;
        if (need <= have + 1) break;
        if (this.pz <= 0.94) { this.pz = 1; this.fit(); break; } // too long to zoom: scroll instead
        this.pz = Math.max(0.94, this.pz * have / need - 0.004); this.fit();
      }
      const over = slide.scrollHeight > slide.clientHeight + 1;
      this.frame.classList.toggle('pscroll', over);
      this.fade.style.setProperty('--fade', getComputedStyle(slide).backgroundColor);
      this.pend(slide);
    },
    pend(slide) { this.frame.classList.toggle('pend', slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 6); },

    /* --- course state, saved to the LMS for resume --- */
    snapshot() {
      const st = this.state;
      return { v: 1, vis: Array.from(this.visited), quiz: st.quiz || null, terms: st.terms ? Array.from(st.terms) : [] };
    },
    restore(s) {
      this.visited = new Set((s && s.vis) || []);
      this.state = {};
      if (s && s.quiz) this.state.quiz = s.quiz;
      if (s && s.terms && s.terms.length) this.state.terms = new Set(s.terms);
    },
    emit(ev, d) {
      const L = window.LMS; if (!L || !L.on) return;
      if (ev === 'answer') { L.answer(d); this.saveState(); } // the answer is part of the bookmark too
      if (ev === 'score') L.score(d.raw, d.max);
      if (ev === 'state') this.saveState();
    },
    saveState() {
      const L = window.LMS, sd = this.slides[this.idx]; if (!L || !L.on || !sd) return;
      const menu = this.slides.filter(s => s.menu), seen = menu.filter(s => this.visited.has(s.id)).length;
      L.save(this.snapshot(), sd.id, menu.length ? seen / menu.length : 0);
    },
    track(sd) {
      const L = window.LMS; if (!L || !L.on) return;
      this.saveState();
      if (window.COURSE && sd.id === window.COURSE.completeOn) L.complete();
    },

    /* --- navigation --- */
    goto(i, opts) {
      if (typeof i === 'string') i = this.index(i);
      if (i < 0 || i >= this.slides.length) return;
      this.closeAllLayers(true);
      if (this.base) this.base.destroy();
      this.stage.innerHTML = '';
      this.idx = i;
      const sd = this.slides[i];
      this.visited.add(sd.id);
      const root = h('div', { class: 'slide ' + (sd.cls || ''), 'data-id': sd.id, 'data-p': sd.p || 'stack', role: 'region', 'aria-label': sd.title });
      this.stage.append(root);
      const clip = typeof sd.clip === 'function' ? sd.clip(this.state) : sd.clip;
      const tl = new Timeline({ clip, dur: sd.dur, onEnd: () => sd.onEnd && sd.onEnd(ctx) });
      this.base = tl;
      const ctx = this.ctx(root, tl, sd);
      sd.build(ctx);
      this.app.classList.toggle('cap-left', !!sd.capLeft);
      tl.render(true);
      this.syncMenu(); this.syncNav();
      $('#seek').classList.toggle('locked', !!sd.lockSeek);
      $('#sr-live').textContent = 'Slide: ' + sd.title;
      document.title = sd.title + ' | The CPP and Me';
      // Phone layout: fit or scroll, again once the images have their real sizes
      root.addEventListener('scroll', () => this.pend(root), { passive: true });
      root.querySelectorAll('img').forEach(im => { if (!im.complete) im.addEventListener('load', () => this.pfit(), { once: true }); });
      this.pfit(true);
      this.track(sd);
      if (!(opts && opts.paused)) tl.play();
    },
    next() { const sd = this.slides[this.idx]; if (sd && sd.nextTo) return this.goto(sd.nextTo); this.goto(this.idx + 1); },
    prev() { const sd = this.slides[this.idx]; if (sd && sd.prevTo) return this.goto(sd.prevTo); this.goto(this.idx - 1); },
    replay() {
      if (this.layers.length) { const L = this.layers[this.layers.length - 1]; L.tl.seek(0, true); return; }
      this.goto(this.idx);
    },

    ctx(root, tl, sd) {
      const P = this;
      return {
        root, tl, slide: sd, h, box, state: P.state,
        add(el, at, opts) { root.append(el); return tl.add(el, at, opts); },
        next: () => P.next(), goto: id => P.goto(id),
        layer: o => P.openLayer(o),
        closeLayer: () => P.closeLayer(),
      };
    },

    /* --- layers --- */
    openLayer(o) {
      const parent = this.active;
      const wasPlaying = parent && parent.playing;
      if (o.pauseBase !== false && parent) parent.pause();
      const el = h('div', { class: 'layer ' + (o.cls || ''), role: o.modal ? 'dialog' : 'group', 'aria-modal': o.modal ? 'true' : null, 'aria-label': o.label || 'Layer' });
      this.stage.append(el);
      // Everything under a modal layer becomes inert, like a Storyline layer that blocks the base layer
      const blocked = o.modal ? Array.from(this.stage.children).filter(c => c !== el && !c.hasAttribute('inert')) : [];
      blocked.forEach(c => c.setAttribute('inert', ''));
      const tl = new Timeline({ clip: o.clip, dur: o.dur });
      const L = { el, tl, parent, wasPlaying, blocked, onClose: o.onClose, opener: document.activeElement };
      this.layers.push(L);
      const lctx = { root: el, tl, h, box, state: this.state, add(e, at, op) { el.append(e); return tl.add(e, at, op); }, close: () => this.closeLayer(), next: () => this.next(), goto: id => this.goto(id), layer: x => this.openLayer(x) };
      o.build(lctx);
      tl.render(true);
      tl.play();
      $('#seek').classList.toggle('locked', true);
      setTimeout(() => { const f = el.querySelector('[data-autofocus]') || el.querySelector('button, a'); if (f) f.focus(); }, 60);
      return L;
    },
    closeLayer(silent) {
      const L = this.layers.pop(); if (!L) return;
      L.tl.destroy(); L.el.remove();
      L.blocked.forEach(c => c.removeAttribute('inert'));
      if (L.onClose) L.onClose();
      if (silent) return;
      const sd = this.slides[this.idx];
      $('#seek').classList.toggle('locked', this.layers.length > 0 || !!(sd && sd.lockSeek));
      this.active && this.active.render(true);
      if (L.parent && L.wasPlaying && !L.parent.ended) L.parent.play();
      if (L.opener && document.contains(L.opener)) L.opener.focus();
    },
    closeAllLayers(silent) { while (this.layers.length) this.closeLayer(silent); },

    /* --- chrome sync --- */
    caption(text) { const s = $('#captions span'); if (s.textContent !== text) s.textContent = text; },
    syncSeek(tl) {
      if (tl !== this.active) return;
      const p = tl.dur ? tl.t / tl.dur : 0;
      $('#seek .fill').style.width = (p * 100) + '%';
      $('#seek .knob').style.left = (p * 100) + '%';
      $('#seek').setAttribute('aria-valuenow', Math.round(p * 100));
      $('#seek').setAttribute('aria-valuetext', `${tl.t.toFixed(0)} of ${tl.dur.toFixed(0)} seconds`);
    },
    syncPlaying() {
      const a = this.active; const on = !!(a && a.playing);
      this.app.classList.toggle('playing', on);
      $('#btn-play').setAttribute('aria-label', on ? 'Pause' : 'Play');
      $('#btn-play').dataset.tip = on ? 'Pause (Ctrl+Alt+P)' : 'Play (Ctrl+Alt+P)';
    },
    syncNav() {
      const sd = this.slides[this.idx] || {};
      const nav = sd.nav || {};
      $('#btn-prev').hidden = this.idx <= 0 || nav.prev === false;
      $('#btn-next').hidden = this.idx < 0 || this.idx >= this.slides.length - 1 || nav.next === false;
      const cnt = $('#slide-count'); // shown on phones only
      if (cnt) cnt.textContent = this.idx < 0 ? '' : `${this.idx + 1} of ${this.slides.length}`;
    },
    syncMenu() {
      const cur = this.slides[this.idx];
      $$('.menu-item').forEach(b => {
        const id = b.dataset.id, s = this.slides[this.index(id)];
        const vis = this.visited.has(id) || (s.menuGroup && s.menuGroup.some(g => this.visited.has(g)));
        b.classList.toggle('visited', vis && id !== (cur && cur.id));
        b.setAttribute('aria-disabled', vis ? 'false' : 'true');
        const isCur = cur && (cur.id === id || (cur.menuAs === id));
        b.setAttribute('aria-current', isCur ? 'true' : 'false');
        if (isCur) b.closest('.scene').classList.add('open');
      });
    },

    buildMenu() {
      const tree = $('#menu-tree'); const scenes = new Map();
      for (const s of this.slides) {
        if (!s.menu) continue;
        if (!scenes.has(s.scene)) scenes.set(s.scene, []);
        scenes.get(s.scene).push(s);
      }
      for (const [name, list] of scenes) {
        const ul = h('ul');
        for (const s of list) {
          ul.append(h('li', {}, h('button', {
            class: 'menu-item', 'data-id': s.id, 'aria-disabled': 'true',
            onclick: e => { if (e.currentTarget.getAttribute('aria-disabled') === 'true') return; this.goto(s.id); if (innerWidth <= 900) this.toggleSidebar(false); }
          }, h('span', {}, s.menuTitle || s.title),
            h('span', { html: '<svg class="tick" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' }))));
        }
        const li = h('li', { class: 'scene open' },
          h('button', { 'aria-expanded': 'true', onclick: e => { const sc = e.currentTarget.parentElement; sc.classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', sc.classList.contains('open')); } }, name), ul);
        tree.append(li);
      }
      $('.side-search').addEventListener('click', () => { const r = $('.side-search-row'); r.hidden = !r.hidden; if (!r.hidden) $('#menu-search').focus(); });
      $('#menu-search').addEventListener('input', e => {
        const q = e.target.value.trim().toLowerCase();
        $$('.menu-item').forEach(b => b.classList.toggle('hit', !!q && b.textContent.toLowerCase().includes(q)));
      });
    },
    buildResources() {
      const list = $('#res-list');
      for (const r of (window.RESOURCES || [])) {
        list.append(h('li', {}, h('a', { href: r.url, target: '_blank', rel: 'noopener' },
          h('span', { html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/></svg>' }), r.title)));
      }
      const tabs = [['#tab-menu', '#panel-menu'], ['#tab-res', '#panel-res']];
      tabs.forEach(([t, p]) => $(t).addEventListener('click', () => {
        tabs.forEach(([t2, p2]) => { $(t2).setAttribute('aria-selected', t2 === t); $(p2).hidden = p2 !== p; });
      }));
    },
    buildSpeed() {
      const pop = $('#pop-speed');
      [0.5, 0.75, 1, 1.25, 1.5, 2].forEach(r => pop.append(h('button', {
        role: 'menuitemradio', 'aria-checked': r === 1 ? 'true' : 'false',
        onclick: e => {
          this.rate = r; $$('#pop-speed button').forEach(b => b.setAttribute('aria-checked', b === e.currentTarget));
          const a = this.active; if (a && a.audio) a.audio.playbackRate = r; pop.hidden = true; $('#btn-speed').setAttribute('aria-expanded', 'false');
        }
      }, r === 1 ? 'Normal' : r + 'x')));
    },
    toggleSidebar(force) {
      const sb = $('#sidebar'); const open = force != null ? force : sb.hidden;
      sb.hidden = !open; $('#btn-menu').setAttribute('aria-expanded', open);
      $('#btn-menu').setAttribute('aria-label', open ? 'Close sidebar' : 'Open sidebar');
      this.fit();
    },
    setVolume(v) {
      this.volume = v; this.muted = v === 0;
      this.app.classList.toggle('muted', this.muted);
      [this.base, ...this.layers.map(l => l.tl)].forEach(t => { if (t && t.audio) { t.audio.volume = v; t.audio.muted = this.muted; } });
    },

    wire() {
      $('#btn-menu').addEventListener('click', () => this.toggleSidebar());
      $('#btn-play').addEventListener('click', () => this.active && this.active.toggle());
      $('#btn-replay').addEventListener('click', () => this.replay());
      $('#btn-next').addEventListener('click', () => this.next());
      $('#btn-prev').addEventListener('click', () => this.prev());
      $('#btn-cc').addEventListener('click', () => {
        this.cc = !this.cc; this.app.classList.toggle('cc-off', !this.cc);
        $('#btn-cc').setAttribute('aria-pressed', this.cc);
        $('#btn-cc').dataset.tip = (this.cc ? 'Hide' : 'Show') + ' captions (Ctrl+Alt+C)';
      });
      $('#btn-full').addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
      });
      document.addEventListener('fullscreenchange', () => setTimeout(() => this.fit(), 50));
      // popovers
      [['#btn-vol', '#pop-vol'], ['#btn-speed', '#pop-speed'], ['#btn-settings', '#pop-settings']].forEach(([b, p]) => {
        $(b).addEventListener('click', e => {
          e.stopPropagation(); const open = $(p).hidden;
          $$('.pop').forEach(x => x.hidden = true); $$('.pop-wrap > .icon-btn').forEach(x => x.setAttribute('aria-expanded', 'false'));
          $(p).hidden = !open; $(b).setAttribute('aria-expanded', open);
        });
        $(p).addEventListener('click', e => e.stopPropagation());
      });
      document.addEventListener('click', e => {
        $$('.pop').forEach(x => x.hidden = true);
        // On narrow screens the sidebar overlays the slide: a tap outside it closes it
        if (innerWidth <= 900 && !$('#sidebar').hidden && !e.target.closest('#sidebar, #btn-menu')) this.toggleSidebar(false);
      });
      $('#vol').addEventListener('input', e => this.setVolume(+e.target.value));
      $('#opt-a11y').addEventListener('change', e => this.app.classList.toggle('a11y-text', e.target.checked));
      $('#opt-zoom').addEventListener('change', e => { this.zoomFill = e.target.checked; this.fit(); });
      // seekbar
      const seek = $('#seek');
      const seekTo = cx => {
        if (seek.classList.contains('locked')) return;
        const r = seek.getBoundingClientRect(); const a = this.active; if (!a) return;
        a.seek(Math.max(0, Math.min(1, (cx - r.left) / r.width)) * a.dur);
      };
      seek.addEventListener('pointerdown', e => {
        if (seek.classList.contains('locked')) return;
        seekTo(e.clientX); seek.setPointerCapture(e.pointerId);
        const mv = ev => seekTo(ev.clientX);
        const up = () => { seek.removeEventListener('pointermove', mv); seek.removeEventListener('pointerup', up); };
        seek.addEventListener('pointermove', mv); seek.addEventListener('pointerup', up);
      });
      seek.addEventListener('keydown', e => {
        const a = this.active; if (!a || seek.classList.contains('locked')) return;
        if (e.key === 'ArrowRight') { a.seek(a.t + 2); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { a.seek(a.t - 2); e.preventDefault(); }
      });
      // keyboard shortcuts (Storyline's own)
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          $$('.pop').forEach(x => x.hidden = true);
          const L = this.layers[this.layers.length - 1];
          if (L && L.el.dataset.escClose === '1') this.closeLayer();
          return;
        }
        if (!(e.ctrlKey && e.altKey)) return;
        const k = e.key.toLowerCase();
        const map = { p: '#btn-play', ',': '#btn-prev', '.': '#btn-next', r: '#btn-replay', c: '#btn-cc', m: '#btn-menu' };
        if (map[k]) { const b = $(map[k]); if (!b.hidden) b.click(); e.preventDefault(); }
        if (k === 'd') { this.setVolume(this.muted ? 1 : 0); $('#vol').value = this.volume; e.preventDefault(); }
      });
    },
    tooltips() {
      let tip = null;
      $$('[title]').forEach(el => { el.dataset.tip = el.title; el.removeAttribute('title'); });
      document.addEventListener('pointerover', e => {
        if (e.pointerType && e.pointerType !== 'mouse') return; // a tap would leave the tip stuck on a phone
        const el = e.target.closest('[data-tip]'); if (!el || el.hidden) return;
        tip = tip || document.body.appendChild(h('div', { class: 'tip', role: 'tooltip' }));
        tip.textContent = el.dataset.tip; tip.hidden = false;
        const r = el.getBoundingClientRect(), tw = tip.offsetWidth;
        tip.style.left = Math.min(innerWidth - tw - 4, Math.max(4, r.left + r.width / 2 - tw / 2)) + 'px';
        tip.style.top = (r.top - 34) + 'px';
      });
      document.addEventListener('pointerout', e => { if (tip && e.target.closest('[data-tip]')) tip.hidden = true; });
    },
  };
  window.Player = Player;
})();
