# Optional extras

None of these are wired in by default, and the build doesn't publish this
folder. Each one is a working, genericized copy of something a real
wedding site used, with the couple's content replaced by `{{placeholders}}`.
Copy the files into place (each file's header says where), fill in the
placeholders, and run `npm start` to check.

| Folder | What it is |
|---|---|
| [`photos/`](photos/) | A photo **gallery** section for `index.html`, an **"Our Story"** timeline page, sharing one keyboard-accessible lightbox, and **wedding party** cards. |
| [`gifts/`](gifts/) | **Registry + gift options** (payment handles, a registry button) as two cards. |
| [`day-of/`](day-of/) | A **wedding-day program** page (`live.html`): the current item highlights itself on the day, optional second time zone for remote family, link cards for the livestream and photo album. Plus a **menu & bar** page (`menu.html`) with an allergy key, where dinner folds away after the speeches. Pair them with `DAY_OF_BUTTON` and `OPEN_WINDOW` in `js/config.js`. |
| [`short-link/`](short-link/) | A public **redirect page** (`/photos` → your shared album), and the pattern for retiring a page without breaking printed QR codes. |
| [`after-the-wedding/`](after-the-wedding/) | Turning the home page into a **thank-you** page, and what to clean up afterwards. |

## Adding another page behind the same code

Any page with the password-gate include and these scripts is gated by the
same invitation code, and a guest who unlocked one page is unlocked on all
of them (the key is remembered on the device):

```html
  <!-- include: password-gate -->
  ...
  <script src="js/config.js" defer></script>
  <script src="js/main.js" defer></script>
```

The build swaps the include for `partials/password-gate.html`; give a
page its own wording with `title="..."` and `prompt="..."` on the include
(see `live.html`). Add `js/guests.js` too only if the page needs the guest
list (an RSVP section, or a personalized `?name=` welcome). A page without
the include is public. `live.html` in `day-of/` is a complete example.

Each page has its own copy of the nav bar (there's no shared nav), so when
you add or remove a page, update the links in the nav of every page,
`index.html` included. `grep -l 'nav-links' *.html` lists them.

We started with a *separate* password for the day-of pages (so guests
couldn't open the program early, before the day) and merged it into the
main code right after the wedding, so one code opens everything. If you're
starting fresh, start there: one code, plus `OPEN_WINDOW` for the weekend
itself, is what this template assumes.

## Other events (welcome drinks, a brunch)

Copy `index.html` or `examples/day-of/live.html` to a new page and cut it
down to the hero, a details card and the countdown. Point the countdown at
that event instead of the wedding with an attribute:

```html
<div class="countdown-grid" data-countdown-date="2027-06-13T11:30:00-04:00">
```

(the `cd-days`/`cd-hours`/... ids inside stay the same). Keep details that
only matter to some guests, like hotel directions, off a page everyone
gets: ours started with them and we took them back out because not
everyone was staying at the hotel.

## Guests watching from far away

There's no separate livestream page here because `live.html` already does
the job: the livestream card at the top, and `data-alt-time-zone` adds the
time where your remote family is under every item. If most of the remote
audience is in one place, you can copy `live.html` to `livestream.html`
and list the times in their zone instead, with the venue's start time in
the intro. Link it from `WELCOME.groups` buttons for those guests. Put the
streaming link itself (YouTube etc.) on the page rather than on printed
cards; it may change.

## Games and puzzles

We had a cocktail-hour crossword, but its content is one-off, so it isn't
here. If you build one, put it on its own gated page as above. The
phone lessons from ours:

- Drive the whole grid from **one hidden `<input>`** rather than an input per
  square. With per-square inputs, on a phone a tap didn't select the square,
  `maxlength` blocked overwriting a letter, and Android's backspace (which
  reports key code 229) did nothing.
- Inputs need a **16px or larger font** or iOS zooms the page on focus.
- Show the current clue in a fixed-height bar above the grid with
  previous/next buttons. Scrolling to a clue list on every move made the
  page jump, and a bar that changes height moves the grid under a finger.
- Test on a real iPhone and a real Android phone, not only an emulator.
- Ours started with clues that used our names and we changed them to
  "the bride" and "the groom"; worth doing from the start.
