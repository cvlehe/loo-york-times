# The Loo York Times

A Next.js demonstration that helps people find eligible New York City public
restrooms, rate them, and submit locations for editorial approval.

Product analytics uses free Vercel page views and optional Google Analytics 4 custom events.
See [`docs/analytics.md`](docs/analytics.md) for activation, the event dictionary,
privacy controls, and verification.

## Getting Started

Copy `.env.example` to `.env.local`, replace the placeholders with the Supabase
project URL, publishable key, and browser-safe MapTiler key, then run the
development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. The
temporary Task 03 magic-link test page is at
[http://localhost:3000/login](http://localhost:3000/login).

Service setup decisions and the remaining external configuration are recorded in
[`docs/service-configuration.md`](docs/service-configuration.md).

Task 19 moved production authentication to the aligned domain
[`loo.reaginvonlehe.com`](https://loo.reaginvonlehe.com). Its deliverability
evidence, current templates, and fresh-mailbox acceptance checklist are in
[`docs/task-19-auth-email-deliverability.md`](docs/task-19-auth-email-deliverability.md).

Task 05 permissions, import behavior, live reconciliation, and rerun instructions
are recorded in [`docs/permissions-and-import.md`](docs/permissions-and-import.md).

The Task 13 admin queue depends on
`supabase/migrations/20260929120000_add_idempotent_submission_approval.sql`.
After applying that migration, verify the administrator-only approval and
rejection workflow against a configured Supabase project with:

```bash
npm run verify:admin-review
```

The verification creates temporary users, submissions, and one published
listing, checks approval retry behavior and contributor-visible decisions, then
removes all temporary records.

Task 14 adds administrator-only listing maintenance and review removal at
`/admin`. To verify the existing row-level policies, public listing changes, and
review-count updates against a configured Supabase project, run:

```bash
npm run verify:maintenance
```

This verification temporarily updates one published listing and creates two
test users plus one review. It restores the listing and removes all temporary
records before exiting.

The journalism desk supports external links and articles published directly on
the site. Apply `supabase/migrations/20260930120000_create_articles.sql` and
`supabase/migrations/20261001091000_add_internal_articles.sql`, then use
`/admin/articles/new` to choose the destination. Internal articles require a
title and body and may include a public header-image URL; external articles
require a title and article URL. Verify public reads, administrator creation,
ordinary-user denial, and optional-image behavior against the configured project with:

```bash
npm run verify:articles
```

The public map reads only published listings. If the MapTiler key is absent or a
map request fails, the accessible list remains available alongside an explicit
map-error message.

Task 17's complete automated verification suite is available with:

```bash
npm run verify:demo
```

It runs lint, import tests, a production build, and every focused live Supabase
verification while continuing through failures so the final summary shows all
outstanding work. The current manual and automated evidence log is in
[`docs/task-17-verification.md`](docs/task-17-verification.md).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
