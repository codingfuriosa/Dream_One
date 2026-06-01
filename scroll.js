/* ============================================================
   DREAM ONE — scroll.js
   Lenis smooth scroll + GSAP ScrollTrigger choreography
   ============================================================ */

(() => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  /* ---------------- LENIS ---------------- */
  const lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: true,         // ENABLE smooth scroll on touch so ScrollTrigger pin works on mobile
    wheelMultiplier: 1,
    touchMultiplier: 1.6,
  });
  window.__lenis = lenis;

  /* ---------------- GSAP BRIDGE ----------------
     Drive Lenis from the GSAP ticker ONLY. (A separate requestAnimationFrame
     loop was also calling lenis.raf each frame — double-driving Lenis, which
     made every scrub animation, incl. the hero wipe & gallery, jitter/flicker.) */
  gsap.registerPlugin(ScrollTrigger);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  /* ---------------- SMOOTH ANCHORS ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const tgt = document.querySelector(id);
      if (!tgt) return;
      e.preventDefault();
      lenis.scrollTo(tgt, { offset: -90, duration: 1.4 });
    });
  });

  /* ---------------- SCROLL PROGRESS ---------------- */
  const progBar = document.querySelector('.scroll-progress');
  lenis.on('scroll', ({ scroll, limit }) => {
    if (!progBar) return;
    progBar.style.width = (limit > 0 ? (scroll / limit) * 100 : 0) + '%';
  });

  /* ---------------- SPLIT LINES ---------------- */
  document.querySelectorAll('[data-split-lines]').forEach(el => {
    if (el.dataset.split === 'done') return;
    const html = el.innerHTML.trim();
    el.innerHTML = html.replace(/[^\s<]+/g, w => `<span class="ln-word"><span>${w}</span></span>`);
    el.dataset.split = 'done';
  });

  document.querySelectorAll('[data-split-lines]').forEach(el => {
    const inners = el.querySelectorAll('.ln-word > span');
    gsap.to(inners, {
      y: '0%',
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.05,
      scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' },
    });
  });

  /* ---------------- FADE PRIMITIVE ---------------- */
  gsap.utils.toArray('[data-fade]').forEach(el => {
    gsap.to(el, {
      y: 0, opacity: 1, duration: 1.1, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 95%', toggleActions: 'play none none none' },
    });
  });

  /* ---------------- SECT DIVIDER + OV DIVIDER ---------------- */
  gsap.utils.toArray('.sect-divider, .ov-divider').forEach(el => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () => el.classList.add('shown'),
    });
  });

  /* ---------------- HERO — first image stays at scale 1, wipes to image 2, no zoom ---------------- */
  const vw0 = window.innerWidth;
  const desktopImgs = document.querySelectorAll('.hero-img--desktop');
  const tabImgs = document.querySelectorAll('.hero-img--tab');
  const mobileImgs = document.querySelectorAll('.hero-img--mobile');
  // Pick the visible set for the current breakpoint: >1024 desktop, 601–1024 tab, ≤600 mobile
  const activeSet = vw0 > 1024 ? desktopImgs : (vw0 > 600 ? tabImgs : mobileImgs);
  const img1 = activeSet[0];
  const img2 = activeSet[1];

  if (img1 && img2) {
    gsap.set(img1, { scale: 1 });
    gsap.set(img2, { scale: 1, clipPath: 'inset(0 100% 0 0)' });

    const pagerBtns = document.querySelectorAll('.hero-pager-btn');
    const pagerCue = document.querySelectorAll('.hero-pager, .hero-scroll-cue');

    // Direct-drive the wipe + pager/cue fade straight from the pin's progress.
    // (A scrub tween here lost its link in this Lenis setup — the wipe jumped
    // to its end state and never tracked the scroll, which read as a flicker.)
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: '+=140%',
      pin: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      refreshPriority: 100,
      onUpdate: self => {
        const p = self.progress;
        gsap.set(img2, { clipPath: `inset(0 ${((1 - p) * 100).toFixed(2)}% 0 0)` });
        gsap.set(pagerCue, { opacity: Math.max(0, 1 - p * 1.4), y: p * 20 });
        const idx = p > 0.5 ? 1 : 0;
        pagerBtns.forEach((b, i) => b.classList.toggle('active', i === idx));
      },
      onRefresh: self => {
        gsap.set(img2, { clipPath: `inset(0 ${((1 - self.progress) * 100).toFixed(2)}% 0 0)` });
      },
    });
  }

  /* ---------------- OVERVIEW FIGURE — scroll-driven clip-path reveal + parallax ---------------- */
  const ovFig = document.querySelector('.ov-figure');
  const ovImg = ovFig?.querySelector('img');
  if (ovFig) {
    gsap.fromTo(ovFig,
      { clipPath: 'inset(0% 0% 100% 0% round 18px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.4, ease: 'expo.out',
        scrollTrigger: { trigger: ovFig, start: 'top 85%', toggleActions: 'play none none reverse' } }
    );
  }
  // Overview image: no parallax/zoom — it stays static so the FULL image is
  // always visible, uncropped. The figure's clip-path wipe handles the reveal.

  /* ---------------- HIGHLIGHTS — sticky stack on mobile, stagger fade on desktop ---------------- */
  const hlCards = gsap.utils.toArray('[data-hl]');
  const hlIsMobile = window.matchMedia('(max-width:600px)').matches;
  if (hlIsMobile && hlCards.length > 1) {
    // Mobile: peel/overlap. Scroll range extended to 'top top' (full viewport)
    // so the scale/dim transition feels slower and more deliberate.
    hlCards.forEach((card, i) => {
      if (i >= hlCards.length - 1) return;
      gsap.to(card, {
        scale: 0.94,
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: hlCards[i + 1],
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });
  } else {
    hlCards.forEach((card, i) => {
      gsap.from(card, {
        y: 60, opacity: 0, duration: 1, ease: 'expo.out',
        delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: card, start: 'top 95%', toggleActions: 'play none none none' },
      });
    });
  }

  /* ---------------- AMENITY TILES — unique alternating slide-in (original) ---------------- */
  gsap.utils.toArray('[data-am]').forEach((tile, i) => {
    const fromX = (i % 2 === 0) ? -60 : 60;
    gsap.set(tile, { opacity: 0, x: fromX, scale: 0.92 });
    gsap.to(tile, {
      opacity: 1, x: 0, scale: 1, duration: 1, ease: 'expo.out',
      delay: (i % 2) * 0.06,
      scrollTrigger: { trigger: tile, start: 'top 95%', toggleActions: 'play none none reverse' },
    });
  });

  /* (Plans animation lives in the consolidated PLAN CARDS block below) */
  // Mobile: no animation, no scroll trigger, no jank

  /* ---------------- CONFIG CARDS — sticky stack on mobile, rich reveal on desktop/tablet ---------------- */
  const cfgCards = gsap.utils.toArray('[data-cfg]');
  const cfgIsMobile = window.matchMedia('(max-width:600px)').matches;
  if (cfgIsMobile) {
    // Mobile: sticky-stack "peel" effect — each card under the next dims + shrinks
    // Range extended to 'top top' so the transition feels slower and more cinematic.
    cfgCards.forEach((card, i) => {
      if (i >= cfgCards.length - 1) return;
      gsap.to(card, {
        scale: 0.94,
        opacity: 0.6,
        ease: 'none',
        scrollTrigger: {
          trigger: cfgCards[i + 1],
          start: 'top bottom',
          end: 'top top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });
  } else {
    // Desktop / tablet: clean lift + fade (no 3D rotation), plays once
    cfgCards.forEach((card, i) => {
      gsap.from(card, {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: 'expo.out',
        delay: (i % 4) * 0.08,
        scrollTrigger: {
          trigger: card,
          start: 'top 95%',
          toggleActions: 'play none none none',
        },
      });
    });
  }

  /* ---------------- PLAN CARDS — gentle fade up (single source of truth) ---------------- */
  /* ---------------- PLAN CARDS — premium 3D lift-in (one-shot, no reverse) ---------------- */
  gsap.utils.toArray('[data-plan]').forEach((card, i) => {
    gsap.fromTo(card,
      { opacity: 0, y: 70, scale: 0.92, rotationY: 6, transformPerspective: 1000, transformOrigin: '50% 100%' },
      {
        opacity: 1, y: 0, scale: 1, rotationY: 0,
        duration: 1.1, ease: 'expo.out',
        delay: (i % 3) * 0.08,
        scrollTrigger: {
          trigger: card,
          start: 'top 92%',
          toggleActions: 'play none none none',
          invalidateOnRefresh: true,
        },
      }
    );
  });

  const floorPane = document.querySelector('[data-pane="floor"]');
  if (floorPane) {
    document.querySelector('.ptab[data-tab="floor"]')?.addEventListener('click', () => {
      const floorCards = floorPane.querySelectorAll('.plan-card');
      const cols = window.innerWidth > 900 ? 3 : (window.innerWidth > 600 ? 2 : 1);
      floorCards.forEach((card, i) => {
        const row = Math.floor(i / cols);
        const col = i % cols;
        gsap.fromTo(card,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: 'expo.out', delay: row * 0.15 + col * 0.06 }
        );
      });
    });
  }

  /* video section removed — block deleted */

  /* ---------------- GALLERY — horizontal-pinned scroll (Lenis classic) ----------------
     Heading + images + progress all live in the pinned viewport. Vertical scroll
     drives horizontal movement of the image row. Scrub auto-reverses on scroll-up.
     When all images have scrolled past + progress fills, the pin releases and the
     page continues to the next section. */
  const gPin = document.querySelector('[data-g-pin]');
  const gTrack = document.querySelector('[data-g-track]');
  const gProg = document.querySelector('.g-progress > span');

  if (gPin && gTrack) {
    const initGScroll = () => {
      const getDistance = () => {
        const tw = gTrack.scrollWidth;
        const vw = window.innerWidth;
        // Shift the track left until the last card ends with ~8vw breathing room
        // on the right (so the last card isn't flush against the viewport edge)
        const rightMargin = vw * 0.08;
        return Math.max(0, tw - vw + rightMargin);
      };
      if (getDistance() <= 0) return;

      // Drive the horizontal track DIRECTLY from the pin's scroll progress.
      // (A separate scrub-tween proved unreliable here — it would stay at 0
      // while the section pinned, freezing the images. Lenis already smooths
      // the scroll value, so a direct progress→x map is smooth and glitch-free.)
      ScrollTrigger.create({
        trigger: gPin,
        start: 'top top',
        end: () => '+=' + getDistance(),
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        refreshPriority: 10,
        onUpdate: self => {
          gsap.set(gTrack, { x: -getDistance() * self.progress });
          if (gProg) gProg.style.width = (self.progress * 100) + '%';
        },
        onRefresh: self => {
          gsap.set(gTrack, { x: -getDistance() * self.progress });
        },
      });
      ScrollTrigger.refresh();
    };

    // Init when all images loaded OR after a safety-net timeout (avoid flicker on
    // fast scroll to gallery before images finish loading — pin must exist by then).
    // CRITICAL: even when the safety-net path runs first, we still listen for image
    // loads and call ScrollTrigger.refresh(true) once they finish, so the pin's
    // getDistance() callback recomputes with the now-real scrollWidth. Otherwise
    // the pin gets locked in with a too-short range and never engages.
    let initialized = false;
    const initOnce = () => { if (initialized) return; initialized = true; initGScroll(); };
    const imgs = gTrack.querySelectorAll('img');
    let loaded = 0;
    const onAllLoaded = () => {
      if (++loaded >= imgs.length) {
        if (initialized) ScrollTrigger.refresh(true);
        else initOnce();
      }
    };
    setTimeout(initOnce, 2500); // safety net — init pin even if some images are slow
    if (imgs.length === 0) { initOnce(); }
    else {
      imgs.forEach(img => {
        if (img.complete && img.naturalHeight > 0) onAllLoaded();
        else { img.addEventListener('load', onAllLoaded); img.addEventListener('error', onAllLoaded); }
      });
    }
  }

  /* Gallery header visibility per breakpoint (no sticky-header on laptop) */
  /* ---------------- LOCATION — progressional scroll, each container has scroll magic ---------------- */
  gsap.from('.loc-left', {
    x: -50, opacity: 0, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.location', start: 'top 75%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.loc-right', {
    x: 50, opacity: 0, duration: 1.2, ease: 'expo.out', delay: 0.15,
    scrollTrigger: { trigger: '.location', start: 'top 75%', toggleActions: 'play none none reverse' },
  });

  // Each accordion row reveals on scroll (own trigger so reverse is progressive)
  gsap.utils.toArray('.loc-accordion details').forEach((d, i) => {
    gsap.from(d, {
      y: 40, opacity: 0, duration: 0.95, ease: 'expo.out',
      scrollTrigger: { trigger: d, start: 'top 92%', toggleActions: 'play none none reverse' },
    });
  });

  // Map slides + scales subtly as it crosses center
  gsap.from('.loc-map', {
    scale: 0.94, opacity: 0, duration: 1.2, ease: 'expo.out',
    scrollTrigger: { trigger: '.loc-map', start: 'top 88%', toggleActions: 'play none none reverse' },
  });
  gsap.from('.loc-map-tabs', {
    y: 20, opacity: 0, duration: 0.8, ease: 'expo.out',
    scrollTrigger: { trigger: '.loc-map-tabs', start: 'top 92%', toggleActions: 'play none none reverse' },
  });

  // Location section progress bar (fills as user scrolls through it)
  const locSection = document.querySelector('.location');
  if (locSection) {
    const locProgWrap = document.createElement('div');
    locProgWrap.className = 'loc-progress';
    locProgWrap.innerHTML = '<span></span>';
    locSection.appendChild(locProgWrap);
    const locFill = locProgWrap.querySelector('span');
    ScrollTrigger.create({
      trigger: locSection,
      start: 'top 60%',
      end: 'bottom 80%',
      scrub: 0.6,
      onUpdate: self => { locFill.style.transform = `scaleY(${self.progress})`; },
    });
  }

  /* ---------------- LEGACY — no pin, numbers roll as you scroll past each counter ---------------- */
  const lgItemsArr = document.querySelectorAll('.lg-item');
  const counterEls = Array.from(document.querySelectorAll('.lg-num[data-counter]'));

  // Cards fade in normally
  gsap.set(lgItemsArr, { opacity: 0, y: 40 });
  lgItemsArr.forEach(item => {
    gsap.to(item, {
      opacity: 1, y: 0, duration: 0.9, ease: 'expo.out',
      scrollTrigger: { trigger: item, start: 'top 90%', toggleActions: 'play none none reverse' },
    });
  });

  // Each counter scrubbed individually as it crosses the viewport
  counterEls.forEach(el => {
    const target = parseFloat(el.dataset.counter);
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        end: 'top 35%',
        scrub: true,
      },
      onUpdate: () => {
        const n = Math.round(obj.v);
        const formatted = target >= 1000 ? n.toLocaleString('en-IN') : n.toString();
        el.textContent = formatted + suffix;
      },
    });
  });

  /* ---------------- FOOTER REVEAL ---------------- */
  gsap.from('.ftr-top > *, .ftr-bottom', {
    y: 30, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.1,
    scrollTrigger: { trigger: '.ftr', start: 'top 88%', toggleActions: 'play none none reverse' },
  });

  /* ---------------- CUSTOM CURSOR ---------------- */
  const supportsHover = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (supportsHover) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;
    window.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px,${my}px,0) translate(-50%,-50%)`;
    });
    gsap.ticker.add(() => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0) translate(-50%,-50%)`;
    });
    document.querySelectorAll('a, button, .am-tile, .g-tile, .hl-card, .cfg-card, .lg-item, summary, .plan-card, .video-card').forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('hover'));
      el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
    });
  }

  /* ---------------- MAGNETIC BUTTONS (skip floating buttons) ---------------- */
  if (supportsHover) {
    document.querySelectorAll('[data-magnetic]:not(.float-btn)').forEach(el => {
      const strength = 0.3;
      const setX = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'expo.out' });
      const setY = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'expo.out' });
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        setX((e.clientX - r.left - r.width / 2) * strength);
        setY((e.clientY - r.top - r.height / 2) * strength);
      });
      el.addEventListener('mouseleave', () => { setX(0); setY(0); });
    });
  }

  /* ---------------- WHY DREAM ONE — staggered diagonal reveal + counter, no light theme ---------------- */
  gsap.utils.toArray('.why-card').forEach((card, i) => {
    // Diagonal slide-in: alternate cards come from different directions
    const fromX = (i % 2 === 0) ? -40 : 40;
    gsap.fromTo(card,
      { opacity: 0, y: 50, x: fromX },
      { opacity: 1, y: 0, x: 0, duration: 1, ease: 'expo.out',
        delay: (i % 4) * 0.12,
        scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none reverse' } }
    );
    // Animate the top border line on scroll-in
    gsap.to(card, {
      '--why-line': '1',
      duration: 1,
      ease: 'expo.out',
      delay: (i % 4) * 0.12 + 0.2,
      scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none reverse' },
      onComplete: () => card.classList.add('why-revealed'),
      onReverseComplete: () => card.classList.remove('why-revealed'),
    });
  });
  // Disabled theme toggle: page stays dark.

  /* ---------------- FLOATING BUTTONS + MOBILE CTA BAR — hide over hero & footer, show in between ---------------- */
  const floatSide = document.querySelector('.float-side');
  const mobBar = document.getElementById('mobBar');

  if (floatSide) {
    floatSide.style.transition = 'opacity .4s ease, transform .4s var(--ease)';
    floatSide.style.opacity = '0';
    floatSide.style.transform = 'translate(40px,-50%)';
    floatSide.style.pointerEvents = 'none';
  }
  // Mobile bottom CTA bar: starts hidden (we're on the hero), slides up once
  // the hero pin releases and the overview begins to appear, and tucks away
  // again over the footer.
  if (mobBar) {
    mobBar.style.transition = 'opacity .4s ease, transform .45s var(--ease)';
    mobBar.style.opacity = '0';
    mobBar.style.transform = 'translateY(110%)';
    mobBar.style.pointerEvents = 'none';
  }

  function setCTA(show) {
    if (floatSide) {
      floatSide.style.opacity = show ? '1' : '0';
      floatSide.style.transform = show ? 'translate(0,-50%)' : 'translate(40px,-50%)';
      floatSide.style.pointerEvents = show ? 'auto' : 'none';
    }
    if (mobBar) {
      mobBar.style.opacity = show ? '1' : '0';
      mobBar.style.transform = show ? 'translateY(0)' : 'translateY(110%)';
      mobBar.style.pointerEvents = show ? 'auto' : 'none';
    }
  }

  if (floatSide || mobBar) {
    // Hide while the hero (and its pinned wipe to the 2nd image) is on screen;
    // reveal once the hero scrolls away and the overview starts to appear.
    ScrollTrigger.create({
      trigger: '.hero',
      start: 'top top',
      end: 'bottom 50%',
      onEnter: () => setCTA(false),
      onEnterBack: () => setCTA(false),
      onLeave: () => setCTA(true),
      onLeaveBack: () => setCTA(false),
    });

    // Hide the moment the footer starts entering the viewport (so the buttons
    // never overlap it); reveal again when the footer scrolls back out of view.
    ScrollTrigger.create({
      trigger: '.ftr',
      start: 'top bottom',
      end: 'bottom bottom',
      onEnter: () => setCTA(false),
      onEnterBack: () => setCTA(false),
      onLeave: () => setCTA(false),
      onLeaveBack: () => setCTA(true),
    });
  }

  /* ---------------- CINEMA — circle video that expands to fullscreen ----------------
     Pin the section when its top hits the viewport top (circle fully visible).
     Scrub-animate the mask scale from 1 → enough to cover the viewport, and
     fade the label out. First time the pin engages: start the video. Once
     started, the <video loop> attribute keeps it playing for the rest of the
     visit, regardless of where the user scrolls. */
  const cinemaSection = document.querySelector('.cinema');
  const cinemaMask = document.querySelector('[data-cinema-mask]');
  const cinemaVideo = document.querySelector('[data-cinema-video]');
  const cinemaLabel = document.querySelector('[data-cinema-label]');

  if (cinemaSection && cinemaMask) {
    // Pick the correct video file for the current pill orientation.
    // Desktop / tablet → horizontal pill → img/Video.mp4
    // Mobile (<= 600px) → vertical pill → img/Video 2.mp4
    if (cinemaVideo) {
      const pickSrc = () => (window.innerWidth <= 1024
        ? cinemaVideo.dataset.srcMobile
        : cinemaVideo.dataset.srcDesktop);
      const desired = pickSrc();
      // Use getAttribute to compare relative paths (cinemaVideo.src would be absolute)
      if (desired && cinemaVideo.getAttribute('src') !== desired) {
        cinemaVideo.setAttribute('src', desired);
        cinemaVideo.load();
      }
      // If user resizes across the 1024px boundary, swap the source
      let lastIsMobile = window.innerWidth <= 1024;
      window.addEventListener('resize', () => {
        const nowMobile = window.innerWidth <= 1024;
        if (nowMobile !== lastIsMobile) {
          lastIsMobile = nowMobile;
          const next = pickSrc();
          if (next && cinemaVideo.getAttribute('src') !== next) {
            cinemaVideo.setAttribute('src', next);
            cinemaVideo.load();
            cinemaVideo.play?.().catch(() => {});
          }
        }
      });
    }

    // --- Pill geometry ---
    // START: a slim pill that crops the video (cover). END: the largest box at
    // the video's REAL aspect ratio that fits the viewport — so the WHOLE video
    // is visible (no crop) while covering most of the screen (height-first).
    const isMob = () => window.innerWidth <= 1024;
    const vidAR = () => {
      if (cinemaVideo && cinemaVideo.videoWidth && cinemaVideo.videoHeight) {
        return cinemaVideo.videoWidth / cinemaVideo.videoHeight; // real frame ratio
      }
      return isMob() ? 9 / 16 : 16 / 9; // fallback until metadata loads
    };

    // Start = a WIDE CAPSULE (the original cinematic pill): wide, short, fully
    // rounded ends. As it grows toward the final box (the video's real AR) it
    // reveals the frame from the centre outward — top & bottom open uniformly —
    // ending on the WHOLE video with no crop.
    const getPillSize = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      if (isMob()) {
        const h = Math.min(vh * 0.5, 500);
        return { w: h * (9 / 20), h };   // vertical-ish capsule for portrait mobile video
      }
      const w = Math.min(vw * 0.6, 1080);
      return { w, h: w * (9 / 22) };     // wide horizontal capsule (AR ≈ 2.44)
    };

    // Maximise HEIGHT first (cover most of the page), then clamp to width if the
    // frame would overflow. Reserve the navbar height at the top so the full
    // frame sits BELOW the nav (its top never slides under the fixed navbar).
    const getFinalSize = () => {
      const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 80;
      const vw = window.innerWidth * 0.97;
      const vh = (window.innerHeight - navH) * 0.95;
      const ar = vidAR();
      let h = vh, w = vh * ar;
      if (w > vw) { w = vw; h = vw / ar; }
      return { w, h };
    };

    const applyMask = p => {
      const a = getPillSize(), b = getFinalSize();
      gsap.set(cinemaMask, {
        width: a.w + (b.w - a.w) * p,
        height: a.h + (b.h - a.h) * p,
        borderRadius: (a.h / 2) * (1 - p),
      });
    };

    applyMask(0); // initial slim pill

    let videoStarted = false;
    const startVideo = () => {
      if (videoStarted || !cinemaVideo) return;
      videoStarted = true;
      const pr = cinemaVideo.play();
      if (pr && typeof pr.catch === 'function') pr.catch(() => { videoStarted = false; });
    };

    // Pin the section and DIRECT-DRIVE the grow from scroll progress (scrub
    // tweens proved unreliable with Lenis here). The video starts ONLY when the
    // section is reached (pin engages) — not before, not after.
    ScrollTrigger.create({
      trigger: cinemaSection,
      start: 'top top',
      end: () => (window.innerWidth <= 1024 ? '+=260%' : '+=180%'),
      pin: true,
      pinSpacing: true,
      invalidateOnRefresh: true,
      refreshPriority: 50,
      onEnter: startVideo,
      onEnterBack: startVideo,
      onUpdate: self => applyMask(self.progress),
      onRefresh: self => applyMask(self.progress),
    });

    // Once the real video dimensions are known, refresh so the end box snaps to
    // the true aspect ratio (guarantees the full frame, no crop).
    if (cinemaVideo) {
      cinemaVideo.addEventListener('loadedmetadata', () => ScrollTrigger.refresh(), { once: true });
    }
  }

  ScrollTrigger.sort(); // sort all triggers by refreshPriority
  window.addEventListener('load', () => {
    setTimeout(() => {
      ScrollTrigger.refresh(true);
      ScrollTrigger.sort();
    }, 600);
  });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => setTimeout(() => ScrollTrigger.refresh(true), 300));
  }

})();
