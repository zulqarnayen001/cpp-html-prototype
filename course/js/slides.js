/* The CPP and Me: representative slides rebuilt from CPP v00 18.story.
   Positions (x, y, w, h) and cue times are Storyline's own, on the 960 x 540 slide.
   Narration and captions are the course's own clips (assets/audio, js/media-data.js). */
(function () {
  'use strict';
  const P = window.Player, h = P.h, box = P.box;

  /* LMS settings: the course is complete when the learner reaches this slide (used by js/lms.js) */
  window.COURSE = { id: 'cpp_and_me_html', title: 'The CPP and Me', completeOn: 's4_4' };

  /* Each slide names its phone layout (p), like the Athleader screen types (css/responsive.css):
     split = photo on top, teal panel content below; stack = content in reading order; quiz; video;
     center; results; terms. */
  window.RESOURCES = [
    { title: 'The CPP and Me - Student Activity', url: 'assets/docs/The CPP and Me - Student Activity.pdf' },
    { title: 'The CPP and Me - Video Transcript', url: 'assets/docs/The CPP and Me - Video Transcript.pdf' },
  ];

  const IC = {
    chev: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    tick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    bubble: '<svg class="bubble" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H10l-4 4v-4H4z"/></svg>',
    restart: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12a7 7 0 1 0 2.05-4.95"/><path d="M5 4v4h4"/></svg>',
    pdf: '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/></svg>',
  };
  const btn = (cls, label, x, y, w, hh, onclick, icon, extra) =>
    h('button', Object.assign({ class: 'sbtn ' + cls, style: box(x, y, w, hh), onclick }, extra || {}),
      h('span', {}, label), icon ? h('span', { class: 'ic', html: icon }) : null);
  const img = (src, x, y, w, hh, alt, cls) =>
    h('img', { src: 'assets/img/' + src, alt: alt || '', class: 'simg ' + (cls || ''), style: box(x, y, w, hh), draggable: 'false' });
  const txt = (tag, cls, x, y, w, html) => h(tag, { class: cls, style: box(x, y, w), html });

  /* ---------- Introduction ---------- */
  P.register({
    id: 's1_1', scene: 'Introduction', title: 'The CPP and Me', menu: true, clip: 's1_1', cls: 'bg-white', p: 'split',
    build(c) {
      c.root.append(img('s1_1_hero.png', 0, 0, 960, 540, 'Four teenagers walk along a path toward a house on a hill, where an older couple sits on a bench.', 'cover photo'));
      c.root.append(h('div', { class: 'panel', style: box(0, 0, 432, 540) }));
      c.root.append(txt('h2', 't-hero', 48, 78, 360, 'The CPP<br>and Me'));
      c.root.append(txt('p', 't-hero-sub', 48, 222, 360, 'Investing in My<br>Financial Future'));
      c.root.append(btn('pill pill-white', 'Let’s Go', 48, 333, 150, 42, () => P.next()));
      c.root.append(img('ja_triangles.png', 256, 349, 134, 167, 'JA Logo', 'logo'));
    },
  });

  P.register({
    id: 's1_2', scene: 'Introduction', title: 'Navigating the Course', menu: true, clip: 's1_2', cls: 'bg-pale', nav: { next: false }, p: 'stack',
    build(c) {
      c.root.append(txt('h2', 't-title', 48, 78, 600, 'Navigating the Course'));
      const rows = [
        // A space before each <br>: the phone layout drops the line breaks and the words still need their gap
        { at: 0.25, icon: 'icon_sound.png', y: 178, html: 'Make sure your <b>sound</b> <br>is on.' },
        { at: 3.0, icon: 'icon_phone.png', y: 244, html: 'Turn your phone <br>sideways for the best <br>view.' },
        { at: 6.0, icon: 'icon_stopwatch.png', y: 330, html: 'This course takes about <br><b>15 minutes</b>.' },
      ];
      // Icon and text travel together as one row, so the phone layout can keep them side by side
      rows.forEach(r => c.add(h('div', { class: 'nav-row', style: box(34, r.y - 4, 332, 72) },
        img(r.icon, 0, 0, 56, 56, ''), txt('p', 't-body', 62, 4, 270, r.html)), r.at, { anim: 'fade' }));
      c.root.append(h('div', { class: 'shot', style: box(391, 150, 540, 269) }, img('s1_2_menu_screenshot.png', 0, 0, 540, 269,
        'The course player with the menu on the left and the CPP Key Terms slide.')));
      c.add(h('div', { class: 'callout callout-left', style: box(512, 134, 408, 78) },
        'Use the menu on the left to jump back to any slide you’ve already seen.'), 6.5, { anim: 'grow' });
      c.add(h('div', { class: 'callout callout-down', style: box(408, 366, 416, 96) },
        'Use the PREV and NEXT buttons in the bottom‑right corner to move through the course.'), 7.5, { anim: 'grow' });
      c.root.append(btn('pill pill-outline', 'Continue', 48, 422, 150, 40, () => P.next(), IC.chev));
    },
  });

  /* ---------- Video and Activity ---------- */
  P.register({
    id: 's2_1', scene: 'Video and Activity', title: 'The CPP: Helping support your future', menu: true, clip: 's2_1', cls: 'bg-white', p: 'split',
    build(c) {
      c.add(img('s2_1_thinking.png', 280, -2, 1048, 590, 'A teenager at a desk imagines different jobs and a graduation cap.', 'photo'), 0,
        { motion: { start: 0, end: 5.92, dx: -180, dy: 0 } });
      c.root.append(h('div', { class: 'panel', style: box(0, -2, 392, 544) }));
      c.root.append(txt('h2', 't-panel-title', 48, 78, 320, 'The CPP:<br>Helping support<br>your future'));
      c.add(btn('pill pill-white', 'Watch the Video', 48, 262, 240, 40, () => P.next()), 0.75, { anim: 'fade' });
    },
  });

  P.register({
    id: 's2_2', scene: 'Video and Activity', title: 'Video', menu: true, dur: 3, cls: 'bg-video', lockSeek: true, p: 'video',
    build(c) {
      c.root.append(h('div', { class: 'video-ph', style: box(0, 0, 960, 540) },
        h('div', { class: 'vp-play', html: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' }),
        h('p', { class: 'vp-title' }, 'The CPP and Me: the video'),
        h('p', { class: 'vp-note' }, 'In the course, the 3-minute Vyond video plays here with its own captions. It isn’t rebuilt in this prototype.')));
      c.add(btn('pill pill-white', 'Replay', 288, 380, 168, 40, () => P.replay()), 1.5, { anim: 'fade' });
      c.add(btn('pill pill-teal', 'Continue', 496, 380, 168, 40, () => P.next(), IC.chev), 1.5, { anim: 'fade' });
    },
  });

  P.register({
    id: 's2_3', scene: 'Video and Activity', title: 'CPP Fact Check Challenge', menu: true, clip: 's2_3', cls: 'bg-white', p: 'split',
    build(c) {
      c.root.append(img('s2_3_challenge.png', 424, -2, 536, 544, 'Students investigate with a magnifying glass, notes and a laptop.', 'cover photo'));
      c.root.append(h('div', { class: 'panel', style: box(0, -2, 424, 544) }));
      c.root.append(txt('h2', 't-panel-title', 48, 78, 376, 'CPP Fact Check<br>Challenge'));
      c.root.append(txt('p', 't-panel-body', 48, 182, 360, 'Ready to test what you know?'));
      c.root.append(btn('pill pill-white', 'Start the Challenge', 48, 414, 336, 40, () => {
        P.state.quiz = { answers: {}, order: {}, chosen: {} }; P.goto('q1');
      }));
    },
  });

  /* ---------- Quiz (two of the seven rounds) ---------- */
  const QUESTIONS = [
    {
      id: 'q1', n: 1, title: 'Why was the Canada Pension Plan (CPP) created?', image: 'q1_purpose.png',
      alt: 'A young worker holds a paycheque; behind him, an older couple sits by a bridge.',
      options: ['To help Canadians have income when they retire.', 'To help Canadians pay fewer taxes.', 'To help Canadians earn more money while working.'],
      correct: 0,
      feedback: 'The CPP was created in 1966 to help Canadians have a reliable source of steady income in retirement and reduce poverty among seniors.',
      dyk: 'Most working Canadians age 18 or older contribute to the CPP through each paycheque. People working in Québec contribute to the QPP instead.',
    },
    {
      id: 'q2', n: 2, title: 'How big is the CPP Fund today?', image: 'q2_fund.png',
      alt: 'A large glass vault full of coins and icons stands beside a young woman.',
      options: ['Less than $50 billion', 'About $200 billion', 'More than $800 billion'],
      correct: 2,
      feedback: 'The CPP Fund is one of the largest pension funds in the world, with hundreds of billions invested globally. CPP Investments is one of the top-performing public pension funds in the world. It’s something Canadians can be proud of.',
      dyk: 'The CPP is designed to support Canadians for many years to come. According to an independent report, the CPP is projected to remain financially sustainable for at least the next 75 years!',
    },
  ];
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  QUESTIONS.forEach((q, qi) => P.register({
    id: q.id, scene: 'Quiz', title: 'Question ' + q.n + ': ' + q.title, menu: false, clip: q.id + '_base', cls: 'bg-pale',
    nav: { prev: false, next: false }, menuAs: 's3_2', capLeft: true, p: 'quiz',
    build(c) {
      const S = P.state.quiz || (P.state.quiz = { answers: {}, order: {}, chosen: {} });
      S.chosen = S.chosen || {};
      const order = S.order[q.id] || (S.order[q.id] = shuffle([0, 1, 2]));
      let chosen = null, locked = q.id in S.answers, shownAt = Date.now();
      c.root.append(img(q.image, 672, -2, 288, 544, q.alt, 'cover qimg'));
      c.root.append(h('div', { class: 'q-tag', style: box(16, 14) }, 'Question ' + q.n));
      c.root.append(txt('h2', 't-q', 48, 78, 576, q.title));
      const group = h('div', { role: 'radiogroup', 'aria-label': q.title });
      order.forEach((oi, i) => {
        const b = h('button', {
          class: 'opt', role: 'radio', 'aria-checked': locked && S.chosen[q.id] === oi ? 'true' : 'false', style: box(48, 168 + i * 82, 560, 72),
          onclick: () => {
            if (locked) return; chosen = oi;
            group.querySelectorAll('.opt').forEach(o => o.setAttribute('aria-checked', o === b));
          },
        }, h('span', { class: 'radio' }), h('span', { class: 'opt-text' }, q.options[oi]));
        group.append(b);
      });
      c.root.append(group);
      const submit = btn('pill pill-outline', 'Submit', 504, 486, 150, 40, () => {
        if (locked) return;
        if (chosen == null) return openAlert();
        locked = true; S.answers[q.id] = chosen === q.correct; S.chosen[q.id] = chosen;
        // Journal the answer to the LMS (cmi.interactions), like a Storyline question with reporting on
        P.emit('answer', {
          id: q.id, description: 'Question ' + q.n + ': ' + q.title,
          response: 'abc'[chosen], correct: 'abc'[q.correct], ok: S.answers[q.id], latencyMs: Date.now() - shownAt,
        });
        openFeedback(S.answers[q.id]);
      }, IC.chev);
      c.root.append(submit);
      // A learner who resumes on a question they already answered gets its feedback again, so they can go on
      if (locked) setTimeout(() => openFeedback(S.answers[q.id]), 0);

      function openAlert() {
        P.openLayer({
          modal: true, label: 'Answer required', cls: 'dim', dur: 0.5,
          build(l) {
            l.root.dataset.escClose = '1';
            l.root.append(h('div', { class: 'card alert', style: box(250, 190, 460, 160) },
              h('p', {}, 'Please select an answer before you submit.'),
              btn('pill pill-teal', 'OK', 165, 92, 130, 40, () => P.closeLayer(), null, { 'data-autofocus': '' })));
          },
        });
      }
      function openFeedback(ok) {
        P.openLayer({
          label: ok ? 'Correct' : 'Incorrect', clip: q.id + (ok ? '_correct' : '_incorrect'), cls: 'fb-layer',
          build(l) {
            const panel = h('div', { class: 'fb-panel', style: box(480, 64, 480, 476) },
              h('div', { class: 'fb-corner', html: ok ? IC.tick : IC.x }),
              h('h3', { class: 't-fb', style: box(48, 66, 384) }, ok ? 'Correct' : 'Incorrect'),
              h('p', { class: 't-fb-body', style: box(48, 125, 384) }, q.feedback));
            l.add(panel, 0, { anim: 'slide-in' });
            const cont = btn('pill pill-white', 'Continue', 528, 406, 150, 40, () => {
              P.closeLayer(); P.goto(qi + 1 < QUESTIONS.length ? QUESTIONS[qi + 1].id : 's3_2');
            }, null, { 'data-autofocus': '' });
            const dyk = btn('pill pill-yellow', 'Did You Know?', 528, 470, 246, 40, () => openDyk(), IC.bubble);
            l.add(cont, 0.3, { anim: 'fade' }); l.add(dyk, 0.3, { anim: 'fade' });
          },
        });
      }
      function openDyk() {
        P.openLayer({
          modal: true, label: 'Did You Know?', clip: q.id + '_dyk', cls: 'dim',
          build(l) {
            l.root.dataset.escClose = '1';
            l.add(h('div', { class: 'card dyk', style: box(96, 150, 768, 240) },
              h('h3', { class: 't-dyk', style: box(40, 30, 600) }, 'Did You Know?'),
              h('p', { class: 't-dyk-body', style: box(40, 88, 680) }, q.dyk),
              h('button', { class: 'close-sq', style: box(720, 0, 48, 48), 'aria-label': 'Close', 'data-autofocus': '', onclick: () => P.closeLayer(), html: IC.x })), 0, { anim: 'grow' });
          },
        });
      }
    },
  }));

  P.register({
    id: 's3_2', scene: 'Quiz', title: 'CPP Fact Check Challenge Complete', menu: true, clip: 's3_2', cls: 'bg-white', nav: { next: false },
    menuGroup: ['q1', 'q2'], p: 'center',
    build(c) {
      c.root.append(img('s3_2_complete_bg.png', 0, -2, 960, 544, '', 'cover bg'));
      c.root.append(txt('h2', 't-title center', 48, 118, 864, 'CPP Fact Check Challenge Complete'));
      c.add(txt('p', 't-muted center', 328, 182, 304, 'Your score is being tallied…'), 0.5, { anim: 'fade' });
      c.add(h('div', { class: 'spinner', style: box(448, 230, 72, 72), 'aria-hidden': 'true' }), 0, { out: 4.5 });
      c.add(btn('pill pill-white shadow', 'Reveal My Results', 352, 246, 264, 40, () => P.goto('s3_3')), 4.5, { anim: 'fade' });
    },
  });

  const OUTCOMES = {
    high: { clip: 's3_3_high', badge: 'badge_future_navigator.png', badgeAlt: 'Badge: CPP Future Navigator', title: 'CPP Future-Ready!', body: 'You understand how the CPP contributes to retirement income and how the CPP Fund is invested for the long term to support Canadians.' },
    mid: { clip: 's3_3_mid', badge: 'badge_knowledge_builder.png', badgeAlt: 'Badge: CPP Knowledge Builder', title: 'Building Your CPP Knowledge', body: 'You’re developing your understanding of how the CPP supports Canadians.' },
    low: { clip: 's3_3_low', badge: 'badge_pathway_explorer.png', badgeAlt: 'Badge: CPP Pathway Explorer', title: 'Keep Building Your CPP Knowledge', body: 'Review the challenge facts, then try again.' },
  };
  const score = st => { const a = (st.quiz && st.quiz.answers) || {}; return Object.values(a).filter(Boolean).length; };
  const outcome = st => { const s = score(st), n = QUESTIONS.length; return s === n ? 'high' : s >= n / 2 ? 'mid' : 'low'; };

  P.register({
    id: 's3_3', scene: 'Quiz', title: 'CPP Fact Check Challenge Results', menu: true, cls: 'bg-white', nav: { next: false }, lockSeek: false,
    clip: st => OUTCOMES[outcome(st)].clip, p: 'results',
    build(c) {
      const o = OUTCOMES[outcome(P.state)], s = score(P.state);
      // Report the latest attempt's score to the LMS, as Storyline does from its results slide
      if (P.state.quiz && Object.keys(P.state.quiz.answers || {}).length === QUESTIONS.length) P.emit('score', { raw: s, max: QUESTIONS.length });
      c.add(img('s3_3_results_bg.png', -64, 48, 1094, 616, '', 'cover bg'), 0, { motion: { start: 0, end: 1.25, dx: 0, dy: -50 } });
      const card = h('div', { class: 'card result', style: box(96, 82, 768, 376) },
        img(o.badge, 40, 60, 264, 264, o.badgeAlt, 'badge'),
        h('div', { class: 'res-text', style: box(344, 60, 384) },
          h('h2', { class: 't-res' }, o.title), h('p', {}, o.body),
          h('p', { class: 'score' }, `Your Score: ${s} out of ${QUESTIONS.length}!`)),
        btn('pill pill-outline', 'Retry Quiz', 344, 308, 200, 40, () => { P.state.quiz = { answers: {}, order: {}, chosen: {} }; P.goto('q1'); }),
        btn('pill pill-teal', 'Continue', 552, 308, 168, 40, () => P.goto('s4_1'), IC.chev));
      c.add(card, 0.4, { anim: 'grow' });
    },
  });

  /* ---------- Conclusion ---------- */
  P.register({
    id: 's4_1', scene: 'Conclusion', title: 'Extension Activity', menu: true, clip: 's4_1', cls: 'bg-pale', p: 'stack',
    build(c) {
      c.root.append(h('div', { class: 'sec-tag', style: box(16, 14) }, h('span', {}, 'Section 4'), 'Optional Activity'));
      c.root.append(txt('h2', 't-title', 48, 70, 432, 'Create a PSA'));
      c.add(img('s4_1_psa.png', 49, 118, 431, 369, 'Students record a video message with a phone and a laptop.', 'cover framed'), 0.75, { anim: 'fade' });
      c.add(h('div', { class: 'psa-card', style: box(480, 118, 432, 368) },
        h('p', { class: 't-body xs', style: box(40, 22, 352) }, 'Create a short public service announcement explaining why young Canadians should care about the CPP. Use clear facts and finish with one strong call to action.')), 0.75, { anim: 'fade' });
      c.add(h('a', { class: 'sbtn pill pill-dark', style: box(520, 262, 352, 40), href: 'assets/docs/The CPP and Me - Student Activity.pdf', target: '_blank', rel: 'noopener' },
        h('span', {}, 'Download PDF'), h('span', { class: 'ic', html: IC.pdf })), 1.25, { anim: 'fade' });
      c.add(h('div', { class: 'note', style: box(496, 326, 400, 144) },
        h('span', { class: 'note-ic', html: IC.save }),
        h('p', {}, h('b', {}, 'Before you begin: '), 'Save the PDF to your computer to make sure you don’t lose your progress.')), 1.0, { anim: 'fade' });
    },
  });

  const TERMS = [
    ['kt_cpp.png', 'Canada Pension Plan (CPP)', 'A public pension program that helps provide income in retirement and offers other benefits. Nearly all working Canadians age 18 or older contribute to the CPP or, in Québec, the QPP.'],
    ['kt_qpp.png', 'Québec Pension Plan (QPP)', 'Québec\'s public pension program. It works similarly to the CPP, but it is administered separately for people who work in Québec.'],
    ['kt_contributions.png', 'CPP Contributions', 'Money that workers and employers pay into the CPP. When you earn a paycheque in Canada outside Québec, a percentage of your pay is automatically contributed to the CPP, and your employer matches it.'],
    ['kt_investments.png', 'CPP Investments', 'A professional investment management organization responsible for investing the CPP Fund. It invests in assets around the world, including Canada, with a long-term view to help grow the Fund for Canadians.'],
    ['kt_fund.png', 'CPP Fund', 'The pool of money built from CPP contributions and investment earnings. CPP Investments manages the Fund in the best interests of millions of Canadians.'],
    ['kt_retirement.png', 'Retirement Income', 'Money you receive after you stop working. The CPP provides a monthly retirement pension that replaces part of the income you earned while working.'],
    ['kt_diversification.png', 'Diversification', 'Diversification means not putting all your eggs in one basket. Instead, investments are spread across different assets, industries, and countries to help balance risk and support the Fund over time.'],
    ['kt_inflation.png', 'Inflation', 'The gradual increase in prices over time. CPP benefits are adjusted to help keep up with inflation.'],
    ['kt_rrsp.png', 'Registered Retirement Savings Plan (RRSP)', 'A retirement savings account that helps Canadians save and invest money for the future while offering tax advantages. It is one of the many ways that people can prepare for their financial future, along with the CPP, Tax-Free Savings Accounts, pension plans, and personal savings and investments.'],
  ];
  P.register({
    id: 's4_2', scene: 'Conclusion', title: 'CPP Key Terms', menu: true, dur: 2.5, cls: 'bg-pale', p: 'terms',
    build(c) {
      const seen = P.state.terms || (P.state.terms = new Set());
      c.root.append(txt('h2', 't-title', 48, 70, 432, 'CPP Key Terms'));
      c.root.append(txt('p', 't-body sm', 48, 128, 432, 'Click any term to see its definition.'));
      TERMS.forEach(([icon, term, def], i) => {
        const col = i % 3, row = Math.floor(i / 3);
        const b = h('button', {
          class: 'term' + (seen.has(i) ? ' seen' : '') + (term.length > 30 ? ' long' : ''), style: box(48 + col * 296, 173 + row * 120, 264, 96),
          'aria-haspopup': 'dialog',
          onclick: () => {
            seen.add(i); b.classList.add('seen'); P.emit('state');
            P.openLayer({
              modal: true, label: term, cls: 'dim', dur: 0.75,
              build(l) {
                l.root.dataset.escClose = '1';
                l.add(h('div', { class: 'card def', style: box(192, 126, 576, 280) },
                  h('h3', { class: 't-def', style: box(48, 50, 480) }, term),
                  h('p', { class: 't-def-body', style: box(48, 110, 480) }, def),
                  h('button', { class: 'close-sq', style: box(528, 0, 48, 48), 'aria-label': 'Close', 'data-autofocus': '', onclick: () => P.closeLayer(), html: IC.x })), 0, { anim: 'grow' });
              },
            });
          },
        }, img(icon, 14, 20, 56, 56, ''), h('span', { class: 'term-label' }, term), h('span', { class: 'term-tick', html: IC.tick }));
        c.add(b, [0, .25, .5, .75, 1, 1.25, 1.5, 1.75, 2][i], { anim: 'fly-up' });
      });
    },
  });

  P.register({
    id: 's4_4', scene: 'Conclusion', title: 'Thank You', menu: true, clip: 's4_4', cls: 'bg-white', nav: { next: false }, p: 'split',
    build(c) {
      c.root.append(img('s4_4_closing.png', 360, -2, 680, 544, 'Students work together at a table with a laptop and notebooks.', 'cover photo'));
      c.root.append(h('div', { class: 'panel', style: box(0, -2, 432, 544) }));
      c.root.append(txt('h2', 't-hero sm', 48, 62, 300, 'The CPP<br>and Me'));
      c.root.append(txt('p', 't-panel-body', 48, 198, 300, 'The CPP: Helping support your future'));
      c.root.append(btn('pill pill-white', 'Restart', 48, 286, 150, 40, () => { P.state = {}; P.visited.clear(); P.goto(0); }, IC.restart));
      c.add(img('ja_triangles.png', 296, 382, 108, 135, 'JA Logo', 'logo'), 0.5, { anim: 'fly-up' });
    },
  });
})();
