# Task 19 authentication-email deliverability

This is the evidence log and runbook for Task 19 of the implementation plan.
It covers authentication email only. Do not enable click tracking, add marketing
mail, or replace the one-time-link flow.

## Finding

The September 29, 2026 Gmail messages were delivered but classified as spam.
Gmail's original-message diagnostics reported SPF, DKIM, and DMARC as passing:

- SPF passed for the Resend return path at `rsend.reaginvonlehe.com`.
- DKIM passed with `d=reaginvonlehe.com`.
- DMARC passed with the published reject policy.

Resend's per-message deliverability insight identified one item requiring
attention: the sign-in URL used the Supabase project domain while the visible
sender used `reaginvonlehe.com`. Gmail described the message as similar to mail
previously identified as spam. The sender name, subject, small multipart body,
plain-text alternative, and lack of tracking were already acceptable.

## Remediation applied October 1, 2026

- Added `loo.reaginvonlehe.com` to the Vercel production project and published
  its required CNAME. HTTPS returns `200` for `/login`.
- Added and verified `loo.reaginvonlehe.com` as a Resend sending domain.
- Published the Resend DKIM record plus `rsend.loo` and `send.loo` return-path
  CNAME records. Public DNS returns the expected values.
- Kept the inherited strict DMARC policy (`p=reject; sp=reject; adkim=s;
  aspf=s`) and did not relax authentication policy.
- Changed the Supabase sender to `The Loo York Times
  <login@loo.reaginvonlehe.com>`.
- Changed the Supabase Site URL to `https://loo.reaginvonlehe.com` and added
  `https://loo.reaginvonlehe.com/**` to the redirect allow list without removing
  localhost or the Vercel URL.
- Replaced Supabase-hosted confirmation links in the confirm-signup and
  magic-link templates with the requested app callback plus `TokenHash` and
  `type=email`. The application callback verifies that single-use token before
  creating a session.
- Kept Resend click and open tracking disabled.

## Current templates

Returning-user subject: `Your sign-in link`

```html
<h2>Your sign-in link</h2>

<p>Use this one-time link to sign in to The Loo York Times. It expires shortly and can only be used once.</p>
<p><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Sign in to The Loo York Times</a></p>
<p>If you did not request this email, you can ignore it.</p>
```

First-time subject: `Confirm your email for The Loo York Times`

```html
<h2>Confirm your email</h2>

<p>Use this one-time link to confirm your email and sign in to The Loo York Times. It expires shortly and can only be used once.</p>
<p><a href="{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email">Confirm email and sign in</a></p>
<p>If you did not request this email, you can ignore it.</p>
```

## Public DNS evidence

Expected records under `reaginvonlehe.com`:

| Name | Type | Expected target/purpose |
| --- | --- | --- |
| `loo` | CNAME | Vercel production target |
| `resend._domainkey.loo` | TXT | Resend DKIM public key |
| `rsend.loo` | CNAME | `rsend.forge.rmta.net` return path |
| `send.loo` | CNAME | `send.forge.rmta.net` sending record |
| `_dmarc` | TXT | Strict reject policy inherited by the subdomain |

For a fresh delivered message, require the mailbox's original-message or raw
header view to show:

- SPF `pass` for the Resend return path.
- DKIM `pass` with `d=loo.reaginvonlehe.com`.
- DMARC `pass` for `header.from=loo.reaginvonlehe.com`.
- A visible From address of `login@loo.reaginvonlehe.com`.
- A sign-in link whose host is `loo.reaginvonlehe.com`, with no tracking
  redirect host.

## Acceptance checks

- [x] Branded production domain resolves, has valid TLS, and serves `/login`.
- [x] Resend sending domain is verified.
- [x] DKIM and return-path records resolve publicly.
- [x] Strict DMARC policy remains published.
- [x] Supabase Site URL and redirect allow list include the branded domain.
- [x] Sender, subjects, and template content are clear and consistent.
- [x] Click and open tracking remain disabled.
- [x] A fresh Gmail message reaches the inbox without manual allow-listing.
- [x] Gmail raw headers pass SPF, DKIM, and DMARC with the new domains.
- [ ] A fresh message reaches a non-Gmail major mailbox inbox without manual
  allow-listing, and its raw headers pass SPF, DKIM, and DMARC.
- [x] A production link establishes a session on
  `https://loo.reaginvonlehe.com` and returns to the intended path.
- [x] A localhost link establishes a session on `http://localhost:3000` and
  returns to the intended path.

## Fresh test evidence

Tests performed October 1, 2026:

- A production-requested message to Gmail arrived in the Inbox without a
  filter, allow-list entry, or manual move. Gmail also marked it important.
- Gmail's original-message report showed SPF `PASS` for
  `rsend.loo.reaginvonlehe.com`, DKIM `PASS` with
  `d=loo.reaginvonlehe.com`, and DMARC `PASS`. Gmail displayed `mailed-by:
  rsend.loo.reaginvonlehe.com` and `signed-by: loo.reaginvonlehe.com`.
- The delivered message linked directly to
  `https://loo.reaginvonlehe.com/auth/callback` without a tracking redirect.
  Following it established an authenticated production session and returned
  to `https://loo.reaginvonlehe.com/submissions`.
- A second, localhost-requested message also arrived in the Gmail Inbox. Its
  direct link targeted `http://localhost:3000/auth/callback`; following it
  established a localhost session and returned to
  `http://localhost:3000/submissions`.
- The non-Gmail major-mailbox test remains pending until a test address is
  supplied. Task 19 is not fully accepted until that test passes.

## Test procedure

Use fresh messages. Moving an old message out of spam does not count.

1. Sign out of the app in the test browser.
2. Request a link from the production `/login` page to the Gmail test account.
3. Record inbox/spam placement before moving or marking the message.
4. Open the raw/original message and record SPF, DKIM, DMARC, From, and link
   host results.
5. Follow the link once. Confirm the branded origin, authenticated session, and
   intended destination. Confirm a second use does not create another session.
6. Repeat steps 2-5 with a major non-Gmail mailbox.
7. Start the local app, request a fresh link from `http://localhost:3000/login`,
   follow it in the same browser, and confirm the session is established on the
   localhost origin.

If placement still fails while authentication and link alignment pass, leave
the security and tracking settings unchanged. Record the receiving provider's
reason, the Resend insight, and the new domain's sending history; then allow
reputation to develop through requested, low-volume authentication mail rather
than sending artificial warm-up traffic.
