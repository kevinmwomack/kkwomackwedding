# Wedding site implementation plan

Status, 25 October 2026: the design is settled. Wedding-specific copy, the real form embed URL, the invitation password, and whether to buy a domain now are still open. None of those block the first code change.

This file replaces `wedding-site-plan.md`. That earlier plan had the right destination and the wrong steps for this checkout.

## Decisions

One password-gated invitation page. Wedding facts live on the site. Guest responses live in an embedded Google Form, so an RSVP does not require a code change or a redeploy.

- One shared invitation password. No guest list, no per-guest QR codes, no first-and-last-name gate.
- The welcome card is removed. It only appears for a `?name=&pw=` link, it repeats the schedule, and it needs a guest list. Plus-ones would be more columns to match. The form collects the name instead.
- No visa-support question. Guests are in the US.
- The RSVP section will embed the form once the real form exists. The first version of the page says Coming Soon there instead.
- `js/config.js` stays gitignored and is injected as the `SITE_CONFIG_JS` secret. Do not commit it. Skip the `GUESTS_JS` secret. Do not create `js/guests.js`. Do not deploy the Apps Script.
- Remove the on-site RSVP engine, the guest-list files, the welcome card, the personal-invitation card generator, and the tests that only cover those. This fork does not need them.
- Keep the password gate and the build checks that protect it, including the refusal to publish the example password `ChangeMe123`.
- Gallery, gifts, day-of, and thank-you stay unused until asked for.
- Real names, date, venue, schedule, dress code, travel, registry, palette, hero photo, and the favicon wait until copy is ready.

## How this template actually works

Checked against a fresh template on `main`, with no couple-specific commits.

- GitHub Pages runs `.github/workflows/deploy.yml` on push to `main` (and on a manual run). It builds `_site/` and publishes only that folder. The workflow runs only when the repo is not still marked as a template. Without `SITE_CONFIG_JS` it skips the deploy with a warning.
- The build turns `SITE_PASSWORD` into a PBKDF2 check (`AUTH.salt`, `AUTH.iterations`, `AUTH.check`, 310,000 iterations by default) and fails if the plaintext code appears in the output. The browser stores the derived key in `localStorage` under `wedding_key`. There is no `VALID_HASHES` list and no `sessionStorage` unlock.
- The gate is a courtesy. The HTML is readable without the code. Do not put a home address or a gift-account number in the page.
- The directions link is already built from `VENUE_NAME` plus `VENUE_ADDRESS`. `data-field` only sets text. An iframe `src` needs its own assignment and must not go through `innerHTML`.
- `<section id="rsvp">` with no guest list fails the build (`setup/build.js`). `CUSTOMIZING.md` says to use a different id. The documented example is `rsvp-elsewhere`.
- A correct `?pw=` with a `?name=` still looks up the guest list. An empty list is truthy, so a stray name in the URL would show “not on the list” instead of opening the page. Removing the welcome card means removing that branch in `initPasswordGate()`.
- The active palette in `css/theme.css` is Midnight & Blush. `CLAUDE.md` only imports `AGENTS.md`.

## Google Forms

Checked against Google’s help pages on 25 October 2026, then confirmed with a tester form. Sound for a wedding under a few hundred RSVPs on a free personal account, if guests are not forced to sign in.

### Limits

There is a published response cap, and it is nowhere near a wedding. Starting in September 2026, each form can receive up to 500,000 responses, and up to 1 GB of form plus response data, not counting files guests upload. Sheets sync is the earlier practical cliff, past 100,000 responses. Source: [View & manage form responses](https://support.google.com/docs/answer/139706).

Other ceilings:

- Linked spreadsheet: up to 20 million cells or 100 MB. [Files you can store in Google Drive](https://support.google.com/docs/answer/37603).
- Personal account storage: up to 15 GB, shared by Drive, Gmail, and Photos. [Manage your storage](https://support.google.com/drive/answer/6374270). Plain text responses do not matter at this size.
- Form structure: up to 300 pieces of content and 75 sections. [Edit your form](https://support.google.com/docs/answer/2839737).
- No published daily cap on “Get email notifications for new responses.”

Closing the form is a form setting: turn off **Accepting responses**, or set a close date, or **After a number of responses**. That does not require a site change.

### Settings

Publish to anyone with the link. [Publish & share your form](https://support.google.com/docs/answer/2839588).

Use:

- **Collect email addresses → Responder input.** The guest types an address. **Verified** requires a Google account. [View & manage form responses](https://support.google.com/docs/answer/139706).
- **Send responders a copy of their response → Always.** Receipts can still be lost to spam filters.
- **Allow response editing.**
- **Get email notifications for new responses**, so the couple hears about each RSVP.

Leave off:

- **Limit to 1 response.** Guests must sign in with a Google account. Households may also submit more than once on purpose.
- **File upload.** Answering requires a Google account. [Choose a type of question](https://support.google.com/docs/answer/7322334).
- **View results summary.** Respondents would see other people’s answers.

There is no real password on a Google Form for anonymous guests. Restricting responders to named Google accounts is the actual lock, and it requires sign-in. A password question on the form is visible to anyone who can open it. The website password is the only password.

The embed is the form’s public link inside a frame. Anyone with that link can submit without the website. Embedding does not confine RSVPs to people who passed the gate.

### Tester result

A form with those settings was submitted three times, each with a different email. Each submission produced a receipt. Editing from the receipt updated the response in Google Forms and in the linked Google Sheet.

Duplicate submissions remain possible. That is accepted. Reconcile repeated names in the sheet.

## Custom domain

Checked against GitHub’s docs on 25 October 2026. A custom domain is optional and can be attached later. Until then the site is `https://<username>.github.io/<repo>/`.

- [About custom domains and GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages)
- [Managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Verifying your custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [Troubleshooting](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)
- [Securing your GitHub Pages site with HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)

This repo publishes with a custom GitHub Actions workflow. GitHub’s troubleshooting page says a `CNAME` file is ignored and is not required in that case. The Pages setting is what counts. `SETUP.md` already says this.

Order:

1. Verify the domain on the GitHub profile with the TXT record GitHub shows (`_github-pages-challenge-<username>`). Verification stops another GitHub user from attaching the name to their Pages site.
2. Enter the domain under the repo’s Pages settings before changing DNS. Pointing DNS at GitHub first leaves a window where someone else could host a site on the name.
3. At the registrar, for the bare domain, add all four `A` records and all four `AAAA` records:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
   - `2606:50c0:8000::153`
   - `2606:50c0:8001::153`
   - `2606:50c0:8002::153`
   - `2606:50c0:8003::153`
4. For `www`, one `CNAME` to `<username>.github.io`. Do not point `www` at the bare domain. That breaks HTTPS.
5. Configure both names. The one entered in Pages is the address guests use. GitHub redirects the other one to it.
6. After the DNS check passes, turn on **Enforce HTTPS**. The certificate can take up to an hour. Extra `A`, `AAAA`, or `CNAME` records can block it. If the domain uses CAA records, one of them must allow Let’s Encrypt.
7. Put the final address in `SITE_URL`, update the `SITE_CONFIG_JS` secret, and re-run the workflow. Do this before printing anything that contains the address.

A public repo is free. GitHub Pages from a private repo needs a paid plan. The invitation code and guest list are not what a public repo would expose, because those files are gitignored. The page text would be readable in the repo.

## Deploy and local preview

`npm start` builds `_site/` and serves it on port 3000. That is the iteration loop. Preview the built site, not the raw files. The raw folder has no generated key check and will not unlock.

Creating `js/config.js` with a password other than `ChangeMe123` and running `npm start` is a local check. That file is gitignored. It is not a commit, and it is not the `github.io` deploy below.

One repository has one GitHub Pages site. The workflow deploys only `main`, into that single site. A `test` branch does not get its own `github.io` address. Pointing the workflow at `test` as well would publish over the same URL. Reserving `main` for a future custom domain and `test` for `github.io` does not work: the custom domain and the `github.io` URL are two names for whatever was deployed last, and GitHub redirects the default host to the custom domain once it is set.

Use `main` for the site. Use `github.io` until a domain is purchased, then attach the domain to that same deployment. Do not add a long-lived preview branch.

## Why two things stay

**The example password.** `setup/build.js` refuses to build when `SITE_PASSWORD` is still `ChangeMe123`. That string is the public placeholder in `js/config.example.js`. The check is in the build, not only in a test. `tests/02-build.test.js` asserts that the build still fails. Removing the check would let a site deploy with a password anyone can read in the template. Keep the check. The first deploy uses a real password in gitignored `js/config.js`, copied into the `SITE_CONFIG_JS` secret. The example file can keep showing `ChangeMe123`.

**Tests that match the site we are keeping.** Delete the journeys that only drive the on-site RSVP, the guest list, the welcome card, the Apps Script, and personal invitation cards. Keep the journeys that protect the password gate and the build: the code must not appear in published files, the example password must be refused, and a gate with no password must fail.

`examples/` stays for now. Nothing in it is loaded. The design session can still copy a gallery or a day-of page from it.

## Implementation steps

Check these off in `PLAN.md` as each commit lands.

- [x] **Commit 1 — this plan.** Add it to the repo as `PLAN.md`. No code changes. It contains no invitation code, no guest names, and no email addresses.

- [x] **Commit 2 — remove what this site will not run.** Delete the on-site RSVP client, guest-list example, Apps Script, welcome-card code and its CSS, the personal-card generator, and the tests that only cover those. In `index.html`, remove the RSVP script tags and replace `<section id="rsvp">` with a section whose id is not `rsvp`, containing a Coming Soon message. A correct password always opens the page. Keep the password gate, `localStorage`, and the `ChangeMe123` build check. `npm start`: wrong code stays on the gate, right code shows Coming Soon, no missing-script errors. `npm test` passes for the journeys that remain.

- [x] **Commit 3 — point the docs at this fork.** Rewrite `AGENTS.md`, `SETUP.md`, `README.md`, `CUSTOMIZING.md`, and `JOURNEYS.md` so a later session follows the password gate and `#rsvp-coming`, and does not rebuild the guest list, welcome card, Apps Script, or personal invitation cards. `js/config.example.js` keeps `SITE_PASSWORD` as `ChangeMe123`. Creating gitignored `js/config.js` with a different password and running `npm start` is a local check, not a commit.

- [ ] **First `github.io` deploy.** Gitignored `js/config.js` with a real password (not `ChangeMe123`) and placeholder copy. Set `SITE_CONFIG_JS`. Pages source is GitHub Actions. Push `main`.

- [ ] **Guest-facing Google Form,** outside GitHub. Settings from the Google Forms section above. Swap Coming Soon for the embed in a later commit, then check the iframe on a phone.

- [ ] **Design and guest-facing copy,** in a later session. Names, date, venue, schedule, travel, palette, photos, favicon, and the real embed URL.

- [ ] **Custom domain,** when one is purchased. Follow the custom-domain section. The only code change is `SITE_URL`.

## Still open, and only these

- The invitation copy: names, date and time with timezone, venue and address, schedule, dress code, travel, registry (keep or remove), contact, hashtag, initials.
- The shared password phrase.
- The real form’s embed URL. The tester form is not the guest-facing form.
- Whether to buy a domain before invitations go out, or launch on `github.io` first.
- Public repo or paid private repo.
- Who receives the form’s “email me on each response” mail. That is a form setting, not a code change.
