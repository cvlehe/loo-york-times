# Product analytics

The site uses `@vercel/analytics` with the Next.js integration. It records the
initial page view and client-side route changes; do not add a second manual
`page_view` event. View traffic and custom events in the Vercel project's
**Analytics** dashboard.

## Activation

1. Enable Web Analytics for the existing Vercel project.
2. Verify that the project's current plan supports custom events (Vercel may
   require a paid plan). This change does not upgrade plans or enable billing.
3. Deploy this change and visit the production site. Confirm page views and
   custom events arrive in Analytics. No analytics API key is required.
4. `npm run dev` uses the SDK's development/debug mode; production delivery is
   verified only on a configured deployment. Ad blockers and privacy controls
   can reduce counts. These are product signals, not an audit log.

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
Do Not Track and Global Privacy Control suppress events. The application does
not add tracking cookies or persistent user identifiers. Vercel manages its own
aggregate visitor measurements and request metadata; consult its current privacy
and retention documentation when maintaining the site's privacy notice.

Tracking is best effort and cannot block the underlying action. The SDK queues
custom events while loading. Search is debounced to avoid a keystroke event
stream. Scroll thresholds are deduplicated per route visit. No changes are made
to authentication, editorial permissions, or database schema.

## Checks

Run `npm run test:analytics` with Node 22.18+ or Node 24 (native TypeScript
stripping), and `npm run build`. Tests exercise URL redaction, excluded routes,
DNT/GPC suppression, event delivery, and analytics failure isolation.

For a deployed smoke check, navigate between the map, journalism, and a listing;
use search and filters; select a marker/list row; request directions; and submit
both invalid and valid forms. In browser network tools confirm analytics requests
contain only the documented properties, sanitized page URLs, and no personal
input. Verify the events reach the dashboard after its ingestion delay. Keep
production test contributions identifiable for manual cleanup.
