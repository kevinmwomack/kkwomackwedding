# Security and privacy

A wedding site holds other people's information: your guests' names, phone
numbers, dietary needs, notes. This template is built so you can keep the
repo public (GitHub Pages is free for public repos) without publishing any
of that. Here's what it protects, what it doesn't, and the rules that keep
it that way.

## What's private, and where it lives

| Thing | Where it lives | Published? |
|---|---|---|
| Invitation code (`SITE_PASSWORD`) | `js/config.js` on your machine, `SITE_CONFIG_JS` secret on GitHub | **Never.** The build replaces it with a PBKDF2 key check and fails if it finds the code in any output file. |
| Guest list | `js/guests.js` on your machine, `GUESTS_JS` secret | **Encrypted** (AES-GCM, key derived from the code). Without the code it's ciphertext. |
| Personal invite links | `guests.csv`, `invite-cards/` (gitignored) | Only on the cards you send. |
| Guest names for the Sheet | `guests-sheet.csv` (gitignored; no links) | Only in your Sheet's Guests tab. |
| RSVP answers (phones, notes, dietary needs) | Your Google Sheet | **Never sent back to a browser.** |

`js/config.js`, `js/guests.js`, `guests.csv`, `guests-sheet.csv`,
`invite-cards/` and `print/` are in `.gitignore`. The deploy workflow
builds from repository secrets and publishes only the generated `_site/`
folder.

## Public or private repo?

Your secrets never go in git either way, so a public repo is safe for the
code and guest list. What a public repo does publish is everything you
type into the HTML: names, venue, schedule, travel notes. The site itself
asks search engines not to index it; GitHub search will happily index a
public repo. So:

- **Private repo** if you can: GitHub Pages from a private repo needs a
  paid plan (GitHub Pro or a team plan).
- **Public repo** is fine if you're comfortable with the page text being
  findable. Create it with **"Use this template"** (or a plain new repo you
  push to), not **Fork**: a fork of a public repo is always public and
  stays linked to it.

## What the gate does and doesn't do

The invitation code is a **soft gate**. It keeps search engines, link
previews and casual visitors out, and it keeps the guest list unreadable.
It does **not** hide the page text: the HTML (date, venue, schedule,
travel info) is downloadable by anyone who has the URL, gate or no gate.
Treat everything in the HTML and in `js/config.js` (minus the code) as
semi-public. Don't put anything there that would be a problem if a
stranger read it, such as a home address or a gift-account number you
wouldn't share with every guest's plus-one.

Anyone can download the site and try codes offline. PBKDF2 makes each
guess slow (310,000 iterations by default), but a short or guessable code
falls quickly anyway. Use a phrase of three or more words.

The code is shared: every guest has it, and it's in every QR link. Assume
it will spread. Changing it later (edit `SITE_PASSWORD`, update the secret,
redeploy) locks everyone out until they get the new one, and printed QR
codes stop working, so pick one you're happy to live with.

## The RSVP endpoint

The Apps Script URL ends up in the published config, so anyone can POST to
it. The script is written with that in mind:

- **No private data in responses.** When a name already has an RSVP, the
  response says only whether they're attending and how many. Phone
  numbers, notes and dietary needs stay in the Sheet. (An earlier version
  echoed them back, which meant anyone who knew a guest's name could read
  their phone number.)
- **Blank fields keep what's on file** on an update, done server-side, so
  the browser never needs the old values.
- **Everything a guest types is written as plain text**, the name included,
  so a "name" like `=IMPORTXML(...)` can't run as a formula in your Sheet.
- **Free text is capped** at 1,000 characters per field.
- **With a `Guests` tab** (strongly recommended), unknown names and counts
  above an invitation's max are rejected. Without it, anyone can add rows.
- A honeypot field and a script lock handle naive bots and simultaneous
  submissions.

Known limits: someone who knows a guest's exact name can still learn
whether they've RSVP'd yes or no and overwrite their answer. That's the
cost of name-based RSVPs without accounts; the Sheet keeps a timestamp, and
the notification email (`NOTIFY_EMAIL`) tells you about every change.
There's no rate limiting beyond Apps Script's own quotas.

## Rules for anyone changing this repo (people and AI agents)

1. Never commit `js/config.js`, `js/guests.js`, `guests.csv`,
   `guests-sheet.csv`, `invite-cards/`, `print/`, or exports of the RSVP
   Sheet. Run `git status` before every commit.
2. Never write the invitation code into HTML or JS, including in a link
   (`live.html?pw=...`). One code opens every page and the key is
   remembered on the device, so links don't need it. The build fails if
   it finds one.
3. Insert anything that came from a guest or a config value into the page
   with `textContent` or through `escHtml()`, never raw into `innerHTML`.
4. External links get `rel="noopener"`. Pages keep
   `<meta name="referrer" content="strict-origin-when-cross-origin">` so
   other sites see only your domain, never a personal link's query string.
   (Tightening it to `no-referrer` or `same-origin` can stop embedded
   YouTube players from loading, and buys nothing: the query string is
   already withheld.)
5. Keep `robots.txt` and the `noindex` meta tags.
6. New free-text column in the Sheet? Add it to `TEXT_FIELDS` in the Apps
   Script, and don't return it in any response.

## Publishing a fork, or making your own repo public

Before you flip a repo to public, check its **history**, not just the
current files: a code or guest list committed once and deleted later is
still in every clone. `git log -p | grep -i "<your code>"` (and your
surname, venue, email) should find nothing. If it finds something, the
simplest fix is a fresh repo from the current files
(`git checkout --orphan clean && git commit`) rather than rewriting
history, and change the code if it was ever pushed anywhere public.

## After the wedding

Export the Sheet, delete phone numbers and notes you no longer need, and
archive the Apps Script deployment so the endpoint stops accepting
submissions. See [examples/after-the-wedding/](examples/after-the-wedding/).

## Reporting a security problem

Found a way to read the guest list without the code, get private RSVP
answers from the endpoint, or anything like that? Please report it
privately through the repository's **Security** tab ("Report a
vulnerability") rather than in a public issue, so sites already built from
the template can be fixed first.
