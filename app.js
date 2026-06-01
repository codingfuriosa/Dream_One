/* ============================================================
   DREAM ONE — app.js
   ============================================================ */

(() => {

  /* ---------------- LOADER ---------------- */
  const loader = document.getElementById('loader');
  const loaderCount = document.getElementById('loaderCount');
  const loaderBar = loader?.querySelector('.loader-bar > span');

  let progress = 0;
  const tick = () => {
    progress = Math.min(100, progress + Math.random() * 7 + 3);
    if (loaderCount) loaderCount.textContent = String(Math.floor(progress)).padStart(3, '0');
    if (loaderBar) loaderBar.style.width = progress + '%';
    if (progress < 100) {
      setTimeout(tick, 90 + Math.random() * 60);
    } else {
      setTimeout(() => {
        loader?.classList.add('gone');
        document.body.classList.remove('is-loading');
        window.dispatchEvent(new Event('do:loaded'));
      }, 350);
    }
  };
  // Start the loader animation as soon as the DOM is ready — NOT on window
  // 'load' (which waits for every image + the video to finish downloading and
  // made the loader sit there far too long). The count runs on its own ~1.6s
  // timeline; images stream in lazily behind it.
  const startLoader = () => setTimeout(tick, 150);
  // Coming back from the Thank You page → skip the loader entirely.
  if (sessionStorage.getItem('do:skiploader') === '1') {
    sessionStorage.removeItem('do:skiploader');
    loader?.classList.add('gone');
    document.body.classList.remove('is-loading');
    window.dispatchEvent(new Event('do:loaded'));
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLoader);
  } else {
    startLoader();
  }

  /* ---------------- NAV SOLID/HIDE ---------------- */
  // Keep the nav transparent while the user is still inside the hero pin
  // (the wipe). Only switch to .solid once the page has actually started
  // scrolling beyond the hero's pinned range.
  const nav = document.getElementById('nav');
  function onScroll() {
    const y = window.scrollY;
    const heroPinEnd = window.innerHeight * 1.4; // matches scroll.js hero end '+=140%'
    if (y > heroPinEnd + 40) nav?.classList.add('solid');
    else nav?.classList.remove('solid');
  }
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------------- MOBILE MENU ---------------- */
  /* Sync the --nav-h variable so the mobile menu starts right under the navbar */
  function syncNavH() {
    if (nav) {
      const h = nav.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--nav-h', h + 'px');
    }
  }
  window.addEventListener('load', () => { syncNavH(); setTimeout(syncNavH, 500); });
  window.addEventListener('resize', syncNavH);
  syncNavH();
  const burger = document.getElementById('navBurger');
  const menu = document.getElementById('navMenu');
  burger?.addEventListener('click', () => {
    const open = burger.classList.toggle('open');
    menu?.classList.toggle('mobile-open', open);
  });
  document.querySelectorAll('#navMenu a').forEach(a => {
    a.addEventListener('click', () => {
      burger?.classList.remove('open');
      menu?.classList.remove('mobile-open');
    });
  });

  /* ---------------- HERO PAGER (manual only, no auto-cycle; scroll.js drives it) ---------------- */
  const heroImgs = document.querySelectorAll('[data-hero-img], [data-hero-img-mobile]');
  const heroPagers = document.querySelectorAll('.hero-pager-btn');
  function setHero(i) {
    const groups = [
      document.querySelectorAll('.hero-img--desktop'),
      document.querySelectorAll('.hero-img--tab'),
      document.querySelectorAll('.hero-img--mobile')
    ];
    groups.forEach(grp => {
      grp.forEach((img, j) => img.classList.toggle('active', j === i));
    });
    heroPagers.forEach((b, j) => b.classList.toggle('active', j === i));
  }
  heroPagers.forEach((b, i) => b.addEventListener('click', () => setHero(i)));

  /* ---------------- PLANS TABS ---------------- */
  /* Wrap plans-tabs in a centered wrap so the pill stays centered */
  document.querySelectorAll('.plans-tabs').forEach(tabsEl => {
    if (tabsEl.parentElement && !tabsEl.parentElement.classList.contains('plans-tabs-wrap')) {
      const wrap = document.createElement('div');
      wrap.className = 'plans-tabs-wrap';
      tabsEl.parentElement.insertBefore(wrap, tabsEl);
      wrap.appendChild(tabsEl);
    }
  });
  document.querySelectorAll('.ptab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.plans-pane').forEach(p => p.classList.toggle('active', p.dataset.pane === tab));

      // Aggressive multi-pass refresh chain for mobile pin recomputation
      if (window.ScrollTrigger) {
        const isMobile = window.innerWidth <= 1024;
        if (window.__lenis && window.__lenis.stop) window.__lenis.stop();

        // Pass 1: immediately after class swap
        requestAnimationFrame(() => {
          window.ScrollTrigger.refresh(true);
        });
        // Pass 2: after layout
        setTimeout(() => window.ScrollTrigger.refresh(true), 150);
        // Pass 3: after CSS transitions settle
        setTimeout(() => {
          window.ScrollTrigger.refresh(true);
          window.ScrollTrigger.update();
        }, 400);
        // Pass 4: mobile-extra — Lenis & touch reflow
        setTimeout(() => {
          window.ScrollTrigger.refresh(true);
          if (window.__lenis && window.__lenis.start) window.__lenis.start();
        }, isMobile ? 800 : 600);
      }
    });
  });

  /* ---------------- PLAN UNLOCK ---------------- */
  function syncUnlock() {
    const ok = localStorage.getItem('do:enquired') === '1';
    document.querySelectorAll('.plan-card').forEach(c => {
      c.classList.toggle('unlocked', ok);
      c.classList.toggle('locked', !ok);
    });
  }
  syncUnlock();

  /* ---------------- MAP TABS ---------------- */
  document.querySelectorAll('.mtab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tgt = btn.dataset.map;
      document.querySelectorAll('.mtab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('[data-map-view]').forEach(v => {
        v.hidden = v.dataset.mapView !== tgt;
      });
    });
  });

  /* ---------------- MODAL ---------------- */
  const modal = document.getElementById('modal');
  const modalClose = document.getElementById('modalClose');
  const form = document.getElementById('enqForm');
  let pendingAction = null;

  function openModal(action) {
    pendingAction = action || null;
    modal?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal?.classList.remove('open');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.open-modal[data-type="enquiry"]').forEach(b => {
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openModal('enquiry'); });
  });
  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeLightbox(); } });

  /* ---------------- BROCHURE BUTTON ---------------- */
  const brochureBtn = document.getElementById('brochureBtn');
  const brochureLabel = document.getElementById('brochureLabel');
  function syncBrochure() {
    // Label stays "View Brochure" regardless of enquiry state.
  }
  syncBrochure();
  brochureBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (localStorage.getItem('do:enquired') === '1') {
      window.open('img/brochure.pdf', '_blank');
    } else {
      openModal('brochure');
    }
  });

  form?.addEventListener('submit', e => {
    e.preventDefault();
    const n = document.getElementById('enqName').value.trim();
    const p = document.getElementById('enqPhone').value.trim();
    const m = document.getElementById('enqEmail').value.trim();
    const agree = document.getElementById('enqAgree')?.checked;
    if (!n || !p || !m) return;
    if (!agree) { showToast('Please agree to be contacted.'); return; }
    localStorage.setItem('do:enquired', '1');
    syncUnlock();
    syncBrochure();
    closeModal();
    form.reset();
    const agreeBox = document.getElementById('enqAgree');
    if (agreeBox) agreeBox.checked = true;
    if (pendingAction === 'brochure') {
      showToast('Thank you. Opening brochure…');
      setTimeout(() => window.open('img/brochure.pdf', '_blank'), 600);
    } else {
      // Navigate to dedicated thank-you page (no Lenis), then return to home
      window.location.href = 'thankyou.html';
      return;
    }
    pendingAction = null;
  });

  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);background:#15111e;border:1px solid rgba(184,156,255,.3);color:#fff;padding:14px 22px;border-radius:999px;font-family:"JetBrains Mono",monospace;font-size:11px;letter-spacing:.18em;z-index:99999;opacity:0;transition:opacity .3s,transform .4s;text-transform:uppercase;';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(-6px)'; });
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2800);
  }

  /* ---------------- LIGHTBOX (gallery + unlocked plans) ---------------- */
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbClose = document.getElementById('lbClose');

  function openLightbox(src) {
    if (!lightbox || !lbImg) return;
    lbImg.src = src;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox?.classList.remove('open');
    document.body.style.overflow = '';
  }
  lbClose?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', e => { if (e.target === lightbox || e.target === lbImg) closeLightbox(); });

  // Gallery cards — click to open zoomed lightbox (same as plans)
  document.querySelectorAll('.g-card').forEach(tile => {
    tile.addEventListener('click', () => {
      const img = tile.querySelector('img');
      if (img) openLightbox(img.src);
    });
  });

  // Plan cards — only if unlocked
  document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', e => {
      if (card.classList.contains('locked')) return;
      if (e.target.closest('button')) return;
      const img = card.querySelector('img');
      if (img) openLightbox(img.src);
    });
  });

  /* ---------------- VIDEO PLAY (real video, lazy source) ---------------- */
  document.querySelectorAll('[data-video-card]').forEach(card => {
    const video = card.querySelector('.video-el');
    card.addEventListener('click', () => {
      if (!video) return;
      if (card.classList.contains('playing')) {
        if (video.paused) video.play();
        else video.pause();
        return;
      }

      // Lazy attach source the first time
      if (!video.querySelector('source')) {
        const src = video.dataset.videoSrc;
        if (src) {
          const s = document.createElement('source');
          s.src = src;
          s.type = 'video/mp4';
          video.appendChild(s);
          video.load();
        }
      }

      card.classList.add('playing');
      video.controls = true;
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          // No source / blocked — fall back to lightbox of poster
          card.classList.remove('playing');
          const poster = card.querySelector('.video-poster');
          if (poster) openLightbox(poster.src);
        });
      }

      // Handle missing file
      video.addEventListener('error', () => {
        card.classList.remove('playing');
        const poster = card.querySelector('.video-poster');
        if (poster) openLightbox(poster.src);
      }, { once: true });
    });
  });

  /* ---------------- LOCATION ACCORDION — sort by distance, close others when one opens ---------------- */
  // Sort each accordion list ascending by distance (e.g. 2 km, 3.5 km, 5 km)
  document.querySelectorAll('.loc-accordion .acc-inner ul').forEach(ul => {
    const items = Array.from(ul.children);
    const dist = li => {
      const spans = li.querySelectorAll('span');
      const txt = spans.length ? spans[spans.length - 1].textContent : '';
      const m = txt.replace(/,/g, '').match(/[\d.]+/);
      return m ? parseFloat(m[0]) : Infinity;
    };
    items.sort((a, b) => dist(a) - dist(b)).forEach(li => ul.appendChild(li));
  });

  const accDetails = document.querySelectorAll('.loc-accordion details');
  accDetails.forEach(d => {
    d.addEventListener('toggle', () => {
      if (d.open) {
        accDetails.forEach(o => { if (o !== d) o.open = false; });
      }
    });
  });

})();
