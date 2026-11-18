/* LMS tracking for the HTML player: SCORM 1.2 (API) or SCORM 2004 (API_1484_11), whichever the LMS offers.
   Built on the Athleader and ACLS trackers. Outside an LMS it finds no API and does nothing, so the course
   still runs by double-clicking index.html.

   What it reports, like a Storyline course published for LMS with "complete/incomplete":
   - status: incomplete from the first launch, completed when the learner reaches COURSE.completeOn
     (1.2 cmi.core.lesson_status, 2004 cmi.completion_status). Never set back once completed.
   - score: the quiz result as a percentage, raw/min/max (and scaled in 2004), from the results slide.
   - interactions: one record per quiz answer (id, type choice, response, correct pattern, result, latency).
   - bookmark and resume: location (the slide id) and suspend_data (slides seen, quiz answers, terms opened).
   - progress (2004): share of menu slides seen. session time, and exit "suspend" so a return visit resumes.
   Review and browse launches read the record but never change it. */
(function () {
  'use strict';
  const LOG = [];
  const note = (...a) => { LOG.push(a.join(' ')); if (window.LMS_DEBUG) console.log('[LMS]', ...a); };

  /* find the API: up through the parent frames, then the window that opened this one */
  function find(name) {
    let w = window;
    for (let i = 0; i < 20 && w; i++) {
      try { if (w[name]) return w[name]; } catch (e) { break; }
      let up = null; try { up = w.parent; } catch (e) { break; }
      if (!up || up === w) break;
      w = up;
    }
    try {
      let o = window.opener || (window.top && window.top.opener);
      for (let i = 0; i < 20 && o; i++) { if (o[name]) return o[name]; if (o.parent === o) break; o = o.parent; }
    } catch (e) { /* closed, or another origin */ }
    return null;
  }
  const a04 = find('API_1484_11'), a12 = a04 ? null : find('API');
  const V = a04 ? '2004' : a12 ? '1.2' : null;
  const L = window.LMS = { on: false, version: V, mode: '', location: '', resume: null, done: false, finished: false, log: LOG };
  if (!V) { note('No LMS API found. Running standalone.'); return; }
  const K = V === '2004'
    ? { status: 'cmi.completion_status', loc: 'cmi.location', mode: 'cmi.mode', exit: 'cmi.exit', time: 'cmi.session_time', raw: 'cmi.score.raw', min: 'cmi.score.min', max: 'cmi.score.max' }
    : { status: 'cmi.core.lesson_status', loc: 'cmi.core.lesson_location', mode: 'cmi.core.lesson_mode', exit: 'cmi.core.exit', time: 'cmi.core.session_time', raw: 'cmi.core.score.raw', min: 'cmi.core.score.min', max: 'cmi.core.score.max' };

  /* calls, with the error checked after each one */
  const err = () => { try { return parseInt(V === '2004' ? a04.GetLastError() : a12.LMSGetLastError(), 10) || 0; } catch (e) { return -1; } };
  const why = c => { try { return V === '2004' ? a04.GetErrorString(String(c)) : a12.LMSGetErrorString(String(c)); } catch (e) { return ''; } };
  function get(k) {
    let v = ''; try { v = V === '2004' ? a04.GetValue(k) : a12.LMSGetValue(k); } catch (e) { return ''; }
    const c = err(); if (c && c !== 403 && c !== 401) note('Get', k, 'error', c, why(c)); // 403: not set yet (2004)
    return c ? '' : String(v == null ? '' : v);
  }
  let track = false;
  function set(k, v) {
    if (!L.on || !track) return false;
    let ok = false; try { ok = String(V === '2004' ? a04.SetValue(k, String(v)) : a12.LMSSetValue(k, String(v))) === 'true'; } catch (e) { /* */ }
    if (!ok) { const c = err(); note('Set', k, '=', JSON.stringify(String(v)).slice(0, 80), 'error', c, why(c)); }
    return ok;
  }
  let ct = 0;
  function commit(now) {
    if (!L.on || !track) return;
    clearTimeout(ct);
    const go = () => { let ok = false; try { ok = String(V === '2004' ? a04.Commit('') : a12.LMSCommit('')) === 'true'; } catch (e) { /* */ } if (!ok) note('Commit error', err()); };
    if (now) go(); else ct = setTimeout(go, 800);
  }

  /* formats */
  const pad = (n, w) => String(n).padStart(w || 2, '0');
  function span(ms) { // 2004: PT0H4M12.37S   1.2: 0000:04:12.37
    let cs = Math.max(0, Math.round(ms / 10));
    const h = Math.floor(cs / 360000); cs -= h * 360000;
    const m = Math.floor(cs / 6000); cs -= m * 6000;
    const s = (cs / 100).toFixed(2);
    return V === '2004' ? 'PT' + h + 'H' + m + 'M' + s + 'S' : pad(h, 4) + ':' + pad(m) + ':' + pad(s, 5);
  }
  const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const ident = s => String(s).replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 250) || 'interaction';

  /* start */
  const t0 = Date.now();
  let ok = false; try { ok = String(V === '2004' ? a04.Initialize('') : a12.LMSInitialize('')) === 'true'; } catch (e) { /* */ }
  if (!ok) { const c = err(); note('Initialize error', c, why(c)); if (!(V === '2004' && c === 103)) return; } // 103: already initialized
  L.on = true;
  L.mode = get(K.mode) || 'normal';
  track = L.mode === 'normal'; // browse and review launches do not change the record
  L.location = get(K.loc);
  const status = get(K.status);
  L.done = status === 'completed' || status === 'passed';
  const sd = get('cmi.suspend_data');
  if (sd) { try { const d = JSON.parse(sd); if (d && d.v === 1) L.resume = d; } catch (e) { note('Suspend data could not be read; starting fresh'); } }
  let n = parseInt(get('cmi.interactions._count'), 10) || 0;
  note('Initialized SCORM', V, 'mode=' + L.mode, 'status=' + status, 'location=' + L.location, 'interactions=' + n);
  if (track) {
    if (!L.done) set(K.status, 'incomplete');
    set(K.exit, 'suspend'); // now as well as at the end, so a window that closes without warning keeps the bookmark
    commit(true);
  }

  /* called by the player */
  const MAX = V === '2004' ? 64000 : 4096;
  L.save = (state, where, progress) => {
    if (L.finished || !track) return;
    let s = JSON.stringify(state);
    if (s.length > MAX) { const c = Object.assign({}, state, { vis: [] }); s = JSON.stringify(c); } // drop the menu ticks before anything else
    if (s.length <= MAX) set('cmi.suspend_data', s); else note('Suspend data too long, not saved');
    if (where) set(K.loc, where);
    if (V === '2004' && progress != null) set('cmi.progress_measure', (L.done ? 1 : Math.max(0, Math.min(0.99, progress))).toFixed(2));
    commit();
  };
  /* r: { id, description, response, correct, ok, latencyMs } with response/correct as choice letters a, b, c */
  L.answer = r => {
    if (L.finished || !track) return;
    const p = 'cmi.interactions.' + n + '.';
    if (!set(p + 'id', ident(r.id))) return;
    n++;
    set(p + 'type', 'choice');
    if (V === '2004') {
      set(p + 'timestamp', new Date(Date.now() - (r.latencyMs || 0)).toISOString().replace(/\.\d+Z$/, ''));
      set(p + 'description', clip(r.description, 250));
      set(p + 'correct_responses.0.pattern', r.correct);
      set(p + 'learner_response', r.response);
      set(p + 'result', r.ok ? 'correct' : 'incorrect');
    } else {
      const d = new Date(); set(p + 'time', pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()));
      set(p + 'correct_responses.0.pattern', r.correct);
      set(p + 'student_response', r.response);
      set(p + 'result', r.ok ? 'correct' : 'wrong');
    }
    set(p + 'latency', span(r.latencyMs || 0));
    commit();
  };
  L.score = (raw, max) => {
    if (L.finished || !track || !max) return;
    const pct = Math.round(raw / max * 100);
    set(K.min, 0); set(K.max, 100); set(K.raw, pct);
    if (V === '2004') set('cmi.score.scaled', (raw / max).toFixed(2));
    commit(true);
    note('Score', raw + '/' + max, '=', pct + '%');
  };
  L.complete = () => {
    if (L.done || L.finished || !track) return;
    set(K.status, 'completed');
    if (V === '2004') set('cmi.progress_measure', '1');
    L.done = true;
    commit(true);
    note('Course completed');
  };
  L.finish = () => {
    if (L.finished || !L.on) return;
    L.finished = true; clearTimeout(ct);
    if (track) { set(K.time, span(Date.now() - t0)); set(K.exit, 'suspend'); }
    try { if (V === '2004') { if (track) a04.Commit(''); a04.Terminate(''); } else { if (track) a12.LMSCommit(''); a12.LMSFinish(''); } } catch (e) { /* */ }
    note('Terminated');
  };
  window.addEventListener('pagehide', L.finish);
  window.addEventListener('beforeunload', L.finish);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') commit(true); }); // phones may close a hidden tab without warning
})();
