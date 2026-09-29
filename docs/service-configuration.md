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

Supabase custom SMTP must use the Resend SMTP credentials associated with a
verified sender under `reaginvonlehe.com`. The sender address is
`login@reaginvonlehe.com`, with sender name `The Loo York Times`.

The required DKIM, return-path, and sending CNAME records were added in
Squarespace and confirmed in public DNS on September 28, 2026. Resend may show
the domain as pending until its verifier refreshes.

The first local magic-link test reached Supabase successfully, but Resend
rejected delivery with SMTP status 550 while the domain remained pending. Retry
the test after Resend marks the domain verified.

After the domain is verified, configure Supabase Authentication > Emails > SMTP
Settings with:

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: the Resend API key generated for SMTP
- Sender email: the chosen verified address
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
- [ ] `reaginvonlehe.com` sending domain verified.
- [x] Sender address selected (`login@reaginvonlehe.com`).
- [x] Sending-only Resend credential created and stored in Supabase SMTP.
- [x] Public Supabase variables added to Vercel Production.
- [ ] Non-admin magic-link delivery and redirect verified locally.
- [ ] Non-admin magic-link delivery and redirect verified on the deployed URL.
