# Product analytics

The site keeps free Vercel Web Analytics for page views. Custom events use a
standard Google Analytics 4 property, which does not require a monthly Vercel
subscription. No custom events are sent to Vercel. Google tracking is disabled
until both a Measurement ID is configured and the visitor opts in using the
footer's **Allow usage analytics** control.

## Activation (no paid upgrade)

1. Keep Vercel Web Analytics enabled on the existing project for page views.
2. Open https://analytics.google.com/ and create an Analytics account/property
   (standard/free). Select **Web**, enter `https://loo.reaginvonlehe.com`, and
   create the web data stream.
3. In that stream, turn **Enhanced measurement off**. This integration sends
   only deliberate custom events; automatic form/search/outbound tracking could
   otherwise capture unwanted data or duplicate events.
4. Copy the stream's public Measurement ID (`G-...`). Add it as
   `NEXT_PUBLIC_GA_MEASUREMENT_ID` in the existing Vercel project's production
   environment, then redeploy. This is a public identifier, not a secret. Do not
   enable a paid Vercel plan or Google Analytics 360.
5. On the deployed site choose **Allow usage analytics**, then use search,
   filters, and links. In Google Analytics check **Reports → Realtime** and,
   after processing, **Engagement → Events**. Add event-scoped custom dimensions
   in **Admin → Custom definitions** for properties you want to break down in
   reports (for example `form`, `status`, `source`, `article_type`, `destination`).
   Result counts may be registered as custom metrics. No configuration is needed
   just to see event names and counts.

Initial and client-side page views remain automatic in Vercel; Google automatic
page views are disabled to avoid a second page-view integration. Without a GA
ID or visitor opt-in, the site works normally and Vercel's free page views remain
available. GA event counts reflect opted-in visitors only. The footer lets a
visitor turn interaction analytics off again; the choice is stored locally.
If browser storage is blocked, Google tracking stays off.

Local testing: set the public ID in `.env.local` and use a test property, or
intercept `googletagmanager.com/gtag/js` in a browser test and inspect `dataLayer`.
Do not send test traffic to a production property unnecessarily.

## Event dictionary

| Event | Trigger / properties |
| --- | --- |
| Automatic page view | Public pages, including client navigation |
| `navigation_clicked` | Internal link; destination pathname only |
| `directions_clicked` | Google Maps directions link; no coordinates |
| `article_clicked` | Editorial article link; internal/external |
| `article_scroll` | 50% and 90% of an article page, once each per navigation |
| `restroom_selected` | Explicit selection; map/list source (not automatic selection) |
| `directory_searched` | Search change after 600 ms idle; has_query, result_count; never the text |
| `directory_filtered` | Filter change after 600 ms idle; open_only, accessibility, changing_only, result_count |
| `map_status` | Map ready/error transition |
| `location_requested` | User requests geolocation |
| `location_result` | located/denied/timed-out/unavailable; no position |
| `form_started` | First focus inside login/review/submission form per page visit |
| `form_submitted` | Browser-valid submission attempt, before the server result |
| `form_result` | Resolved login/review/submission result; success/error only |

A successful login form result means the magic-link email was requested, **not**
that the recipient authenticated. Review and submission successes follow the
server action's database write. Validation failures resolve as errors; unexpected
network/server exceptions are not counted as successes. Abandoned forms can be
estimated from starts versus attempts/results; these are aggregate funnels, not
user-level session reconstruction. Short articles without scrollable content do
not emit scroll events.

## Privacy and reliability

`lib/analytics.ts` is the typed event contract and delivery wrapper. Callers pass
only deliberate properties, never arbitrary objects, error messages, DOM text,
form values, email, review content, search queries, coordinates, or user IDs.
Admin routes, authentication callbacks, and unknown routes are excluded from
page views and custom events. The before-send hook removes all URL query strings
and fragments from page-view and custom-event URLs, including auth codes and
return paths. Public listing IDs/article slugs may appear in pathnames.
Do Not Track and Global Privacy Control suppress events. Google loads only after explicit opt-in; it may then use Analytics cookies.
Advertising storage, advertising personalization, and Google Signals are disabled.
Referrers are blanked and a fixed site title is sent with custom events. The
application does not send contributor IDs or email to either provider. Turning
Google analytics off disables subsequent delivery but does not delete existing
Google cookies; visitors may clear those through their browser. Vercel manages
its own aggregate visitor measurements and request metadata. Keep the privacy
notice aligned with both providers' current retention and data handling.

Tracking is best effort and cannot block the underlying action. Google queues
custom events while its script loads. Search is debounced to avoid a keystroke event
stream. Scroll thresholds are deduplicated per route visit. No changes are made
to authentication, editorial permissions, or database schema.

## Checks

Run `npm run test:analytics` with Node 22.18+ or Node 24 (native TypeScript
stripping), and `npm run build`. Tests exercise URL redaction, excluded routes,
DNT/GPC suppression, visitor opt-in, Google initialization, event delivery, and analytics failure isolation.

For a deployed smoke check, navigate between the map, journalism, and a listing;
use search and filters; select a marker/list row; request directions; and submit
both invalid and valid forms. In browser network tools confirm analytics requests
contain only the documented properties, sanitized page URLs, and no personal
input. Verify page views reach Vercel and custom events reach Google Analytics after its ingestion delay. Keep
production test contributions identifiable for manual cleanup.
