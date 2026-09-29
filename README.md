# The Loo York Times

A Next.js demonstration that helps people find eligible New York City public
restrooms, rate them, and submit locations for editorial approval.

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

Task 05 permissions, import behavior, live reconciliation, and rerun instructions
are recorded in [`docs/permissions-and-import.md`](docs/permissions-and-import.md).

The public map reads only published listings. If the MapTiler key is absent or a
map request fails, the accessible list remains available alongside an explicit
map-error message.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
