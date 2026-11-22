# Wedding site implementation plan

Status, 25 October 2026: the first version is live at `https://kevinmwomack.github.io/kkwomackwedding/` and matches a local `npm start`. The next session is the design and the wedding copy. The real form embed URL, the invitation password guests will use, and whether to buy a domain are still open.

This file replaces `wedding-site-plan.md`. That earlier plan had the right destination and the wrong steps for this checkout.

## Decisions

One password-gated invitation page. Wedding facts live on the site. Guest responses live in an embedded Google Form, so an RSVP does not require a code change or a redeploy.

- One shared invitation password. No guest list, no per-guest QR codes, no first-and-last-name gate.
- The welcome card is removed. It only appears for a `?name=&pw=` link, it repeats the schedule, and it needs a guest list. Plus-ones would be more columns to match. The form collects the name instead.
- No visa-support question. Guests are in the US.
- The RSVP lives on its own page, `rsvp.html`, so a finished reply is not sitting in the home scroll. That page embeds `RSVP_FORM_URL`. The current value is the tester form, not the guest-facing form.
- `js/config.js` stays gitignored and is injected as the `SITE_CONFIG_JS` secret. Do not commit it. There is no `GUESTS_JS` secret and no `js/guests.js`. Do not add them. Do not deploy an Apps Script.
- The on-site RSVP engine, the guest-list files, the welcome card, the personal-invitation card generator, and the tests that only covered those are already gone. Do not rebuild them.
- Keep the password gate and the build checks that protect it, including the refusal to publish the example password `ChangeMe123`. A section with `id="rsvp"` fails the build.
- Gallery, gifts, day-of, a photo short link, and a thank-you page live in `examples/` and are not wired in. Copy one in only when someone asks for it. The gifts starter is the place a PayPal cash-gift link would go. Do not add a guest list to satisfy notes in that folder.
- Real names, venue, schedule, dress code, travel, registry, palette, hero photo, and the favicon wait until copy is ready. The calendar day and the contact email are already in gitignored `js/config.js`. Keep them there and in `SITE_CONFIG_JS`. The clock time and timezone are still the template default until the couple confirms them.

## How this template actually works

Checked against the template, then updated for this fork.

- GitHub Pages runs `.github/workflows/deploy.yml` on push to `main` (and on a manual run). It builds `_site/` and publishes only that folder. The workflow runs only when the repo is not still marked as a template. Without `SITE_CONFIG_JS` it skips the deploy with a warning.
- This site is not built by Jekyll. `setup/build.js` produces `_site/`, and the workflow publishes that folder. An empty `.nojekyll` at the repo root is copied into `_site/` so Pages does not run Jekyll on the artifact.
- GitHub never shows a saved Actions secret. The pencil on `SITE_CONFIG_JS` opens a blank box even when the secret is set. The blank box does not mean the secret is empty. Saving that form without pasting a complete new `js/config.js` replaces the working secret with nothing, and the next build skips. Edit the local file, check it with `npm start`, paste the whole file into the secret, then re-run the workflow. A push to `main` does not refresh the secret: a green deploy can ship new HTML and the wedding facts from the secret that was already stored. `AGENTS.md` tells later sessions to run `gh secret set SITE_CONFIG_JS < js/config.js` and re-run the workflow after every config edit. Do not copy the password or the filled-in facts into this file.
- The build turns `SITE_PASSWORD` into a PBKDF2 check (`AUTH.salt`, `AUTH.iterations`, `AUTH.check`, 310,000 iterations by default) and fails if the plaintext code appears in the output. The browser stores the derived key in `localStorage` under `wedding_key`. There is no `VALID_HASHES` list and no `sessionStorage` unlock.
- The gate is a courtesy. The HTML is readable without the code. Do not put a home address or a gift-account number in the page.
- The directions link is already built from `VENUE_NAME` plus `VENUE_ADDRESS`. `data-field` only sets text. An iframe `src` needs its own assignment and must not go through `innerHTML`.
- A `<section>` with `id="rsvp"` fails the build (`setup/build.js`). This fork has no guest list, so that failure does not depend on one. `rsvp.html` uses `id="rsvp-coming"`. `CUSTOMIZING.md` shows `rsvp-elsewhere` for a button to another service.
- A leftover `?name=` on the URL is ignored. A correct password always opens the page. The welcome-card branch that used to look up a guest list was removed with the card.
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
6. After the DNS check passes, turn on **Enforce HTTPS**. The certificate can take up to an hour, and the checkbox can take up to 24 hours to become available. A greyed-out box after an hour is slow, not necessarily broken. Extra `A`, `AAAA`, or `CNAME` records can block it. If the domain uses CAA records, one of them must allow Let’s Encrypt.
7. Put the final address in `SITE_URL`, update the `SITE_CONFIG_JS` secret, and re-run the workflow. Do this before printing anything that contains the address.

Squarespace. A domain registered there can point at this site without a Squarespace website. Squarespace adds a preset named Squarespace Defaults that points the name at Squarespace. Delete that preset before steps 3 and 4. Squarespace’s help does not list the records inside the preset. They use the same hosts as those steps, and extra records on those hosts can block the certificate in step 6. In the domains dashboard: the domain, then DNS, then DNS Settings, then the red trash can next to Squarespace Defaults. Confirm with the account password, or with two-factor authentication if it is on. Add the records above under Custom Records. The host column is labeled Name. Use `@` for each `A` and `AAAA` record. Use `www` for the `CNAME`. A `CNAME` cannot use `@`. Squarespace’s help does not list GitHub’s addresses. Use the values in steps 3 and 4. [DNS records for web hosting](https://support.squarespace.com/hc/en-us/articles/31119879125645-DNS-records-for-web-hosting).

### Notes for the day this step runs

These are working notes from research on 22 November 2026, not settled policy. Remove them, or fold them into `SETUP.md`, once the domain is live and we know what held up. Prices are left out on purpose because they change.

**Before buying**

- Use a `.com`. Avoid `.us`: Squarespace does not offer free WHOIS privacy for it, so the owner’s contact details could be public.
- At checkout, set the registration term to one year and read the Review Order page before paying. Squarespace’s term selector is only visible after login, and an anonymous cart stored a term value of 3 that Squarespace never explained. Do not assume the first screen means one year.
- Skip any website plan. A domain alone is allowed. The free-domain offer requires an annual website plan.
- Leave the Organization field blank. If one is entered, ICANN treats it as the legal owner.
- Auto-renew is on by default. Squarespace emails 30 days before and charges the card 15 days before the renewal date. If the site is not meant to outlive one year, switch it off in the domains dashboard right after buying. Renewals are not refundable. A full refund exists only within five days of the first purchase.
- Click the verification link in the registration email. Squarespace suspends the domain if that is not done within 15 days.
- Registration can show “Registration In Progress” for up to 48 hours, usually about an hour. Wait for it to finish before editing DNS.

**Doing the DNS and GitHub steps**

- Suggested sequence at Squarespace: delete Squarespace Defaults, add the verification `TXT` record from step 1, verify on the GitHub profile, enter the domain under the repo’s Pages settings, then add the `A`, `AAAA`, and `www` `CNAME` records. Squarespace’s pages I read did not show the `TXT` form. Check that `TXT` is in the Type menu under Custom Records, and use the exact name GitHub shows as the Name.
- Use the four `A` records for the bare domain. Squarespace also offers an `ALIAS` record, but it requires turning DNSSEC off first, so the `A` records are simpler.
- Do not add a wildcard record (`*`). GitHub warns it invites takeovers.
- Squarespace asks for the account password or two-factor confirmation on each record change.
- Keep the `TXT` verification record in place permanently, not only until GitHub says verified.
- Choose the address guests use before step 2: `www.<domain>` or the bare `<domain>`. GitHub calls `www` the more stable choice because it does not depend on GitHub’s IP addresses. `SITE_URL` must match the name entered in Pages.
- `SITE_URL` lives in gitignored `js/config.js` and the `SITE_CONFIG_JS` secret. Changing it is not a commit. Run `gh secret set SITE_CONFIG_JS < js/config.js`, then re-run Deploy to GitHub Pages. A green deploy of a commit does not carry the change by itself.
- Keep the real domain out of committed docs, issues, and PR text. Use `example.com` there.
- After the domain is attached, the `github.io` address and the custom domain are one deployment. The default host redirects to the custom domain, so use `npm start` for draft checks.

**Test the live domain before anything is printed or sent**

- Both the bare name and `www` load over `https://`, with a padlock and no certificate warning.
- `curl -sI` on the bare name, `www`, and the old `github.io` address shows the expected redirects. The `github.io` redirect is reported by independent sources but is not promised in GitHub’s docs, so confirm it.
- The password gate appears, a wrong code is refused, and the right code opens the page. View source and confirm the code does not appear.
- `rsvp.html` shows the form in the frame. Download a calendar file and confirm it uses the new address.
- Check on a phone at 320px and 375px wide.

**After the wedding**

- Remove the Custom domain in the repo’s Pages settings, or the DNS records at Squarespace, before the registration lapses. A lapsed name can be registered by someone else and pointed at other content, which matters if printed invitations or QR codes still show it.
- Keep the `TXT` verification record until then.
- If the site should stay up for photos, renew the registration deliberately, and check the renewal price in the dashboard next to “Renews on”.

**Gaps in the template docs to fold back in later**

- `SETUP.md` step 5 lists only four `A` records. It leaves out the `AAAA` records and the `TXT` verification that this section lists first. Follow this section, not that list.
- Neither document covers registrars, the Squarespace Defaults preset, or the live-domain checks above.

A public repo is free. GitHub Pages from a private repo needs a paid plan. The invitation code is not what a public repo would expose, because `js/config.js` is gitignored. The page text would be readable in the repo.

## Deploy and local preview

`npm start` builds `_site/` and serves it on port 3000. That is the iteration loop. Preview the built site, not the raw files. The raw folder has no generated key check and will not unlock.

Creating `js/config.js` with a password other than `ChangeMe123` and running `npm start` is a local check. That file is gitignored. It is not a commit, and it is not the `github.io` deploy below.

One repository has one GitHub Pages site. The workflow deploys only `main`, into that single site. A `test` branch does not get its own `github.io` address. Pointing the workflow at `test` as well would publish over the same URL. Reserving `main` for a future custom domain and `test` for `github.io` does not work: the custom domain and the `github.io` URL are two names for whatever was deployed last, and GitHub redirects the default host to the custom domain once it is set.

Use `main` for the site. Use `github.io` until a domain is purchased, then attach the domain to that same deployment. Do not add a long-lived preview branch.

## Why two things stay

**The example password.** `setup/build.js` refuses to build when `SITE_PASSWORD` is still `ChangeMe123`. That string is the public placeholder in `js/config.example.js`. The check is in the build, not only in a test. `tests/02-build.test.js` asserts that the build still fails. Removing the check would let a site deploy with a password anyone can read in the template. Keep the check. The first deploy uses a real password in gitignored `js/config.js`, copied into the `SITE_CONFIG_JS` secret. The example file can keep showing `ChangeMe123`.

**Tests that match the site we are keeping.** The suite does not drive an on-site RSVP form, a guest list, a welcome card, an Apps Script, personal invitation cards, or pages copied out of `examples/`. Keep the journeys that protect the password gate and the build: the code must not appear in published files, the example password must be refused, a gate with no password must fail, and `id="rsvp"` must fail.

`examples/` holds starters that are not on the site: a gallery, Our Story, wedding party, gifts, a day-of program, a menu, a public photo redirect, and a thank-you. Copy one in only when someone asks. The test suite does not install them.

## Implementation steps

Check these off in `PLAN.md` as each commit lands.

- [x] **Commit 1 — this plan.** Add it to the repo as `PLAN.md`. No code changes. It contains no invitation code, no guest names, and no email addresses.

- [x] **Commit 2 — remove what this site will not run.** Delete the on-site RSVP client, guest-list example, Apps Script, welcome-card code and its CSS, the personal-card generator, and the tests that only cover those. In `index.html`, remove the RSVP script tags and replace `<section id="rsvp">` with a section whose id is not `rsvp`, containing a Coming Soon message. A correct password always opens the page. Keep the password gate, `localStorage`, and the `ChangeMe123` build check. `npm start`: wrong code stays on the gate, right code shows Coming Soon, no missing-script errors. `npm test` passes for the journeys that remain.

- [x] **Commit 3 — point the docs at this fork.** Rewrite `AGENTS.md`, `SETUP.md`, `README.md`, `CUSTOMIZING.md`, and `JOURNEYS.md` so a later session follows the password gate and `#rsvp-coming`, and does not rebuild the guest list, welcome card, Apps Script, or personal invitation cards. `js/config.example.js` keeps `SITE_PASSWORD` as `ChangeMe123`. Creating gitignored `js/config.js` with a different password and running `npm start` is a local check, not a commit.

- [x] **First `github.io` deploy.** Gitignored `js/config.js` with a real password (not `ChangeMe123`) and placeholder copy. `SITE_CONFIG_JS` is set. Pages source is GitHub Actions. The Actions token cannot create the Pages site (`Resource not accessible by integration` on `enablement: true`). The owner turned Pages on once under Settings → Pages → GitHub Actions, then re-ran the workflow. The live site matches `npm start`.

- [ ] **Guest-facing Google Form,** outside GitHub. Settings from the Google Forms section above. `rsvp.html` currently embeds the tester form through `RSVP_FORM_URL`. Swap that URL for the guest-facing form, then check the iframe on a phone.

- [ ] **Cash gifts via PayPal.** Look at a PayPal link guests can use for a cash gift. The layout to start from is `examples/gifts/`: a card for ways to send money next to a registry card. A PayPal.me link is a public handle, in the same category as the Venmo handle already sketched there. Do not publish a bank account number. The gate does not hide it. Wiring this in is a later change, after the couple decides the link and whether the registry stays.

- [ ] **QR codes on the gift tiles.** The Registry tiles flip, and each back face is blank. Add `images/gifts/zelle-qr.png`, `paypal-qr.png`, `venmo-qr.png`, and `cash-app-qr.png`, then place each image inside that tile's `.gift-face-back`. Leave the hint sentence as it is. Do not publish a bank account number. The gate does not hide the image.

- [ ] **Design and guest-facing copy,** in a later session. Names, date, venue, schedule, travel, palette, photos, favicon, and the real embed URL.

- [ ] **Custom domain,** when one is purchased. Follow the custom-domain section and its notes for the day this step runs. No file changes. The only repo-side change is the `SITE_URL` value in gitignored `js/config.js` and the `SITE_CONFIG_JS` secret, followed by a re-run of the deploy.

## Still open, and only these

- The invitation copy still open: names, venue and address, schedule, dress code, travel, registry (keep or remove), hashtag, initials, and a confirmed clock time and timezone. The calendar day and the contact email are already in gitignored `js/config.js` and `SITE_CONFIG_JS`. Do not copy them into this file, and do not put the template placeholders back.
- A PayPal link for cash gifts, and whether it replaces or sits beside a registry. Start from `examples/gifts/`. Do not publish a bank account number.
- QR images for the four Registry tiles. The backs stay blank until `images/gifts/zelle-qr.png`, `paypal-qr.png`, `venmo-qr.png`, and `cash-app-qr.png` are shown on each `.gift-face-back`.
- The shared password phrase.
- The real form’s embed URL. The tester form is not the guest-facing form.
- Whether to buy a domain before invitations go out, or launch on `github.io` first.
- Public repo or paid private repo.
- Who receives the form’s “email me on each response” mail. That is a form setting, not a code change.
