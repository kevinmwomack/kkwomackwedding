# After the wedding

The site doesn't have to go dark the day after. What we did, in order:

1. **Turn the home page into a thank-you.** Swap the hero for the one below
   and put the thank-you section right after it. Move the practical
   sections (details, travel, FAQ) to a `details.html` page or delete them;
   nobody needs parking directions any more.
2. **Link the livestream recording** straight from the hero and the nav. A
   YouTube live stream becomes a normal video at the same URL, so the link
   you already shared keeps working.
3. **Keep the photo album link alive** (see `examples/short-link/`) and ask
   for photos. Guests keep adding them for weeks.
4. **Close the RSVP form** if it isn't already: `RSVP_DEADLINE` in the past.
   Remove `DAY_OF_BUTTON`, and let `OPEN_WINDOW` expire.
5. **Decide how long the gate stays.** The welcome-card links on everyone's
   invitations still work. If you want the thank-you open to everyone,
   delete the `<!-- include: password-gate -->` line from `index.html`; the guest list stays
   encrypted either way.
6. **Clean up the data.** Export the RSVP sheet for your records, then
   delete phone numbers and notes you no longer need, and archive the Apps
   Script deployment (Deploy → Manage deployments → Archive) so the
   endpoint stops accepting submissions.

## Hero

```html
  <section id="hero" class="hero">
    <div class="hero-bg"></div>
    <div class="hero-overlay"></div>
    <div class="hero-content fade-in">
      <p class="hero-script">Thank you!!</p>
      <h1 class="hero-names" data-field="coupleNames">{{Couple Names}}</h1>
      <div class="hero-divider"><span></span><span class="hero-divider-icon">&#10022;</span><span></span></div>
      <p class="hero-date" data-field="weddingDateDisplay">{{Wedding Date}}</p>
      <div class="hero-btns">
        <a href="{{livestream recording URL}}" class="hero-btn hero-btn--solid" target="_blank" rel="noopener">Watch the Livestream</a>
        <a href="photos.html" class="hero-btn">Share &amp; See Photos</a>
      </div>
    </div>
    <a href="#thanks" class="hero-scroll" aria-label="Scroll down">
      <span class="scroll-arrow"></span>
    </a>
  </section>
```

## Thank-you section

```html
  <section id="thanks" class="thanks-section section-pad">
    <div class="container container--narrow">
      <p class="section-eyebrow reveal">Thank You</p>
      <h2 class="section-title reveal">With Full Hearts</h2>
      <p class="section-body reveal">{{To everyone who celebrated with us, in person and on the livestream: thank you.}}</p>
      <p class="section-body reveal">If you missed the livestream, you can <a href="{{livestream recording URL}}" target="_blank" rel="noopener">watch it here</a>. And please keep sharing your photos in <a href="photos.html">our album</a>.</p>
      <p class="thanks-sig reveal">With love, <span data-field="coupleNames">{{Couple Names}}</span></p>
    </div>
  </section>
```

The styles (`.hero-btns`, `.hero-btn--solid`, `.thanks-section`, `.thanks-sig`)
are already in `css/style.css`.
