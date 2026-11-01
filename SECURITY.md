# Security and privacy

This fork is one password-gated invitation page. RSVP answers live in the
embedded Google Form, outside this repository. The page text (names, date,
venue, travel) is readable by anyone who has the URL.

## The invitation code

`SITE_PASSWORD` lives in gitignored `js/config.js` and in the
`SITE_CONFIG_JS` repository secret. Never commit `js/config.js`. The build
replaces the password with a PBKDF2 key check and fails if the plaintext
code appears in any published file, including a link such as
`index.html?pw=...`. Check `git status` before every commit.

Anyone can download the site and try codes offline. PBKDF2 makes each
guess slow (310,000 iterations by default), but a short or guessable code
falls quickly. Use a phrase of three or more words.

The code is shared. Assume it will spread. Changing it later (edit
`SITE_PASSWORD`, update the secret, redeploy) signs everyone out.

## The gate is a courtesy

The invitation code keeps search engines, link previews, and casual
visitors out of the rendered page. It does not hide the HTML. The date,
venue, schedule, and travel notes are downloadable by anyone who has the
URL. Do not put a home address or a gift-account number in the page.

## Rules that still apply

1. Never commit `js/config.js`. Run `git status` before every commit.
2. Never write the invitation code into HTML or JS, including in a link.
   One code opens every page, and the browser stores a derived key, so
   links do not need the code. The build fails if it finds one.
3. Insert a config value into the page with `textContent` or `escHtml()`,
   never raw into `innerHTML`. The form iframe `src` is its own assignment.
4. External links get `rel="noopener"`. Pages keep
   `<meta name="referrer" content="strict-origin-when-cross-origin">` so
   other sites see only the domain, never a query string.
5. Keep `robots.txt` and the `noindex` meta tags.

## Public or private repo

Secrets never go in git either way. A public repo publishes the page
text. GitHub search indexes a public repo even though the site asks
search engines not to index the live pages.

- **Private repo** if you can: GitHub Pages from a private repo needs a
  paid plan.
- **Public repo** is fine if the page text can be findable.

Before a repo becomes public, check its history, not just the current
files. A code committed once and deleted later is still in every clone.

## Reporting a security problem

Please report a problem privately through the repository's **Security**
tab ("Report a vulnerability") rather than in a public issue.
