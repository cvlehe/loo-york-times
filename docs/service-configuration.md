# Service configuration

This is the working record for Task 03 of the implementation plan. Do not put
secret keys or SMTP passwords in this file.

## Supabase

- Organization: `Loo York Times` (Free)
- Project: `loo-york-times`
- Region: Canada Central (`ca-central-1`)
- Project reference: `wwdjjxtgdrpgerhyyrzo`
- Project URL: `https://wwdjjxtgdrpgerhyyrzo.supabase.co`
- Data API: enabled
- Automatically expose new tables: disabled
- Automatic RLS for new `public` tables: enabled
- Site URL: `https://loo-york-times.vercel.app`
- Allowed redirect URLs:
  - `http://localhost:3000/**`
  - `https://loo-york-times.vercel.app/**`

The application uses the publishable browser key only. Never add the database
password, service-role key, Supabase account token, Resend API key, or SMTP
password to a `NEXT_PUBLIC_` variable or commit them to Git.

## Authentication delivery

Supabase custom SMTP uses the Resend SMTP credentials associated with the
verified authentication subdomain `loo.reaginvonlehe.com`. The sender address
is `login@loo.reaginvonlehe.com`, with sender name `The Loo York Times`.

The required DKIM, return-path, and sending CNAME records were added in
Squarespace and confirmed in public DNS on September 28, 2026. Resend marked
the domain verified on September 28, 2026.

On September 29, 2026, magic-link delivery and callback redirects were verified
against both `http://localhost:3000` and `https://loo-york-times.vercel.app`.
Each callback established a session and returned to the matching application
origin. Gmail classified both test messages as spam even though Gmail reported
SPF, DKIM, and DMARC as passing. Resend's message insight identified the
remaining high-priority problem: the visible sender used `reaginvonlehe.com`
while the sign-in URL used `wwdjjxtgdrpgerhyyrzo.supabase.co`.

Task 19 moved production authentication to the aligned subdomain
`https://loo.reaginvonlehe.com` on October 1, 2026:

- Vercel serves the production app at `loo.reaginvonlehe.com` with a valid TLS
  certificate; the original `loo-york-times.vercel.app` address remains active.
- Resend verified `loo.reaginvonlehe.com` for sending. Its DKIM record and
  `rsend.loo`/`send.loo` return-path records are published in public DNS.
- The inherited DMARC policy remains strict: `p=reject; sp=reject; adkim=s;
  aspf=s`. DKIM is expected to provide exact DMARC alignment for mail from
  `login@loo.reaginvonlehe.com`; SPF authenticates the Resend return path.
- Supabase's Site URL is `https://loo.reaginvonlehe.com`. Allowed redirects
  retain localhost and the Vercel URL and add
  `https://loo.reaginvonlehe.com/**`.
- Confirm-signup and magic-link templates link directly to the requested
  application callback with `TokenHash` and `type=email`. The callback still
  verifies the single-use token server-side and preserves the requested
  destination.
- Resend click and open tracking remain disabled. The domain configuration
  continues to show tracking as available to configure, rather than enabled.

Fresh Gmail testing now passes inbox placement, SPF, DKIM, DMARC, and both the
production and localhost callback flows. The required non-Gmail placement test
is still pending. Evidence is tracked in
[`task-19-auth-email-deliverability.md`](task-19-auth-email-deliverability.md).

Supabase Authentication > Emails > SMTP Settings is configured with:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the Resend API key generated for SMTP
- Sender email: `login@loo.reaginvonlehe.com`
- Sender name: `The Loo York Times`

Disable Resend click tracking for authentication email because rewriting a
single-use Supabase link can break it.

## Environment variables

Local development uses the ignored `.env.local`. Vercel needs these same public
values in Production and Preview:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

No server secret is currently required by the application. Future import/admin
scripts must use a non-public variable and execute only in a trusted server or
operator environment.

## Plan suitability checked September 28, 2026

- Supabase Free includes 50,000 monthly active users, a 500 MB database, and
  5 GB egress. It can pause after seven days of low activity, and downloadable
  backups are unavailable. This is suitable for an actively demonstrated
  prototype, not for an availability-sensitive launch.
- With custom SMTP, Supabase starts auth delivery at 30 messages per hour. The
  project should keep that limit during the demonstration and revisit it before
  any publicity spike.
- Resend Free includes 3,000 emails per month, 100 per day, and three domains.
  That is suitable for a small demonstration and its auth-only email scope.
- Vercel Hobby permits personal, non-commercial use and includes one million
  function invocations per month. It fits a personal demonstration only. If the
  site is operated as journalism for an organization, business, or revenue-
  generating project, use Vercel Pro rather than Hobby.

Sources:

- [Supabase billing and Free-plan limits](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase production checklist and auth limits](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend pricing](https://resend.com/pricing)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)

## Completion checklist

- [x] Supabase organization and project created.
- [x] Local and production redirect URLs configured.
- [x] Next.js SSR clients, callback route, and session-refresh proxy added.
- [x] Local public environment variables configured without server secrets.
- [x] Current service limits and hosting suitability checked.
- [x] Resend account connected.
- [x] `reaginvonlehe.com` sending domain verified.
- [x] Sender address selected (`login@reaginvonlehe.com`).
- [x] Sending-only Resend credential created and stored in Supabase SMTP.
- [x] Public Supabase variables added to Vercel Production.
- [x] Non-admin magic-link delivery and redirect verified locally.
- [x] Non-admin magic-link delivery and redirect verified on the deployed URL.
