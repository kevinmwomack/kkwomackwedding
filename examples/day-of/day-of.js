/* =============================================
   day-of.js — the wedding-day program page (live.html) and menu.html.
   Copy to js/day-of.js and load it after js/main.js.

   - Each .program-item has data-start: an ISO time WITH the venue's UTC
     offset. On the day, the item that's happening now is highlighted and
     scrolled into view, and a banner says the page updates on its own.
     (Comparing absolute moments, not "the clock says 8:05", means it works
     the same for a guest whose phone is set to another time zone.)
   - Optional: <section class="program-section" data-alt-time-zone="Europe/London"
     data-alt-label="UK"> adds each time in a second zone under the venue
     time, for family watching the livestream from abroad.
   ============================================= */

'use strict';

(function () {

  function items() {
    return Array.from(document.querySelectorAll('.program-item[data-start]'))
      .map(el => ({ el, at: Date.parse(el.dataset.start) }))
      .filter(x => !Number.isNaN(x.at))
      .sort((a, b) => a.at - b.at);
  }

  // "Today" = from 12 hours before the first item to 6 hours after the last.
  function update() {
    const list = items();
    if (!list.length) return;
    const now = Date.now();
    const onTheDay = now >= list[0].at - 12 * 3600e3 && now <= list[list.length - 1].at + 6 * 3600e3;

    const banner = document.getElementById('live-status-banner');
    if (banner) banner.classList.toggle('hidden', !onTheDay);

    let active = null;
    if (onTheDay) list.forEach(x => { if (now >= x.at) active = x.el; });
    list.forEach(x => {
      x.el.classList.toggle('is-current', x.el === active);
    });
    return active;
  }

  function addAltTimes() {
    const section = document.querySelector('[data-alt-time-zone]');
    if (!section) return;
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: section.dataset.altTimeZone, hour: 'numeric', minute: '2-digit',
    });
    const label = section.dataset.altLabel || section.dataset.altTimeZone;
    items().forEach(({ el, at }) => {
      const time = el.querySelector('.program-time');
      if (!time || time.querySelector('.program-time-alt')) return;
      const alt = document.createElement('span');
      alt.className = 'program-time-alt';
      alt.textContent = `${fmt.format(at)} ${label}`;
      time.appendChild(alt);
    });
  }

  // Wait until the password gate is gone before scrolling, or the scroll
  // happens behind the overlay and is lost.
  function whenGateCleared(fn) {
    if (!document.getElementById('password-gate')) return fn();
    const obs = new MutationObserver(() => {
      if (!document.getElementById('password-gate')) { obs.disconnect(); fn(); }
    });
    obs.observe(document.body, { childList: true });
  }

  // menu.html: <details data-fold-after="ISO time" data-folded-label="...">
  // closes itself once that time passes (e.g. dinner after the speeches),
  // so what's still being served comes first. Nothing is removed; a tap
  // opens it again.
  function foldPastSections() {
    document.querySelectorAll('details[data-fold-after]').forEach(d => {
      if (d.dataset.folded || Date.now() < Date.parse(d.dataset.foldAfter)) return;
      d.open = false;
      d.dataset.folded = 'yes';
      const label = d.querySelector('summary span') || d.querySelector('summary');
      if (d.dataset.foldedLabel) label.textContent = d.dataset.foldedLabel;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    foldPastSections();
    setInterval(foldPastSections, 60000);
    addAltTimes();
    const active = update();
    if (active) {
      whenGateCleared(() => setTimeout(() => {
        active.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      }, 300));
    }
    setInterval(update, 60000);
  });

})();
