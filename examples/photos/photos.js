/* =============================================
   photos.js — gallery grid + Our Story timeline, both opening photos in
   one accessible lightbox. Copy to js/photos.js and load it after
   js/main.js on any page with a #gallery-grid or .timeline-img-wrap and the
   #lightbox markup (see gallery-section.html / our-story.html).
   ============================================= */

'use strict';

(function () {

  // Creates a lightbox backed by an arbitrary items array.
  // getContent(item, index, total) must return { src, alt, caption }.
  function createLightbox(items, getContent) {
    const lightbox  = document.getElementById('lightbox');
    const lbImg     = document.getElementById('lightbox-img');
    const lbCaption = document.getElementById('lightbox-caption');
    const lbCounter = document.getElementById('lightbox-counter');
    const closeBtn  = document.getElementById('lightbox-close');
    const prevBtn   = document.getElementById('lightbox-prev');
    const nextBtn   = document.getElementById('lightbox-next');

    if (!items.length || !lightbox) return null;

    let current     = 0;
    let lastFocused = null;
    let behind      = []; // the rest of the page, inert while the lightbox is open
    window.WeddingSite.trapFocus(lightbox); // shared with the password gate (js/main.js)

    function updateContent(index) {
      const { src, alt, caption } = getContent(items[index], index, items.length);
      lbImg.src = src;
      lbImg.alt = alt;
      if (lbCaption) lbCaption.textContent = caption;
      if (lbCounter) lbCounter.textContent = `${index + 1} ∕ ${items.length}`;
    }

    function open(index) {
      current     = index;
      lastFocused = document.activeElement;
      updateContent(index);
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
      behind = Array.from(document.body.children).filter(el => el !== lightbox && !el.inert);
      behind.forEach(el => { el.inert = true; });
      closeBtn.focus();
    }

    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
      behind.forEach(el => { el.inert = false; });
      behind = [];
      if (lastFocused) lastFocused.focus();
    }

    function navigate(dir) {
      current = (current + dir + items.length) % items.length;
      updateContent(current);
    }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click',  () => navigate(-1));
    nextBtn.addEventListener('click',  () => navigate(1));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft')  navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    return { open, close, navigate };
  }

  // Make each item a keyboard-reachable button that opens the lightbox.
  function wire(items, lb, label) {
    items.forEach((item, i) => {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      if (label) item.setAttribute('aria-label', label);
      item.addEventListener('click', () => lb.open(i));
      item.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lb.open(i); }
      });
    });
  }

  // Gallery grid: each .gallery-item has data-src (full-size image), an
  // <img> (thumbnail) and an optional .gallery-caption.
  function initGallery() {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    const items = Array.from(grid.querySelectorAll('.gallery-item'));
    const lb = createLightbox(items, item => ({
      src:     item.dataset.src || item.querySelector('img').src,
      alt:     item.querySelector('img').alt,
      caption: item.querySelector('.gallery-caption')?.textContent.trim() || '',
    }));
    if (lb) wire(items, lb);
  }

  // Our Story timeline: the caption is the entry's date + title.
  function initTimelineLightbox() {
    const wraps = Array.from(document.querySelectorAll('.timeline-img-wrap'));
    const lb = createLightbox(wraps, wrap => {
      const img     = wrap.querySelector('img');
      const content = wrap.closest('.timeline-item')?.querySelector('.timeline-content');
      const date    = content?.querySelector('.timeline-date')?.textContent || '';
      const title   = content?.querySelector('h3')?.textContent || '';
      return { src: img.src, alt: img.alt, caption: [date, title].filter(Boolean).join(' · ') };
    });
    if (lb) wire(wraps, lb, 'View photo full size');
  }

  document.addEventListener('DOMContentLoaded', () => {
    initGallery();
    initTimelineLightbox();
  });

})();
