# Task 17 verification

Task 17 is in progress. This document is the repeatable checklist and evidence
log for the complete working demonstration. Run the automated suite with:

```bash
npm run verify:demo
```

The live checks use temporary users and records in the Supabase project. Each
check removes the records it creates before exiting. They require the three
Supabase variables documented in `.env.example`.

## Automated baseline - September 30, 2026

| Check | Result | Evidence |
| --- | --- | --- |
| ESLint | Pass | `npm run lint` completed with no findings. |
| Import planning | Pass | All three import tests passed, including stable reruns and reconciliation. |
| Production build | Pass with local runner workaround | `next build --webpack` compiled, type-checked, and generated all 15 routes. The default Turbopack build could not bind its internal CSS worker port in the restricted verification environment. |
| Database permissions | Pass | Owner isolation, denied ordinary-user writes, admin listing updates, and admin review removal passed. |
| Review behavior | Pass | Create, edit, duplicate denial, public read, and a stable count of one passed. |
| Approval and rejection | Blocked | The live Supabase schema does not expose `public.approve_submission`; apply `20260929120000_add_idempotent_submission_approval.sql` before rerunning. |
| Listing maintenance | Pass | Ordinary-user denial, admin maintenance/removal, public refresh data, and rating-count update passed. |
| Admin article entry | Blocked | The live Supabase schema does not contain `public.articles`; apply `20260930120000_create_articles.sql` before rerunning. |

The approval verification now identifies its inserted approval and rejection
records by their unique test names. It no longer orders the representation
returned directly by an insert, which PostgREST rejected even though the
`created_at` column exists.

## Deployed public experience - September 30, 2026

The deployed site at `https://loo-york-times.vercel.app` was exercised at a
390 by 844 mobile viewport and the default desktop viewport.

- The home page exposed one descriptive H1, a skip link targeting
  `#main-content`, labeled interactive controls, and 1,062 published listings.
- Searching for `Bryant Park` returned one match. An unmatched query displayed
  the explicit empty-result state, and clearing search restored browsing.
- The map reached its ready state and retained MapTiler/OpenStreetMap
  attribution.
- Mobile navigation replaced desktop navigation, the search control remained
  usable, and the page had no horizontal document overflow.
- City progress, journalism, My submissions, new submission, admin, and login
  pages had descriptive headings, main landmarks, and no horizontal overflow
  at the mobile viewport.
- Signed-out visitors saw sign-in gates for private submission and admin pages.

## Remaining end-to-end work

- [ ] Apply the two missing live migrations and rerun `npm run verify:demo`.
- [ ] With one ordinary account, request a magic link, return to the intended
  route, create a review, edit it, submit a restroom, and verify persistence in
  a fresh browser session.
- [ ] With an administrator account, correct and approve one submission, reject
  another as a duplicate, remove a review, maintain a listing, and add article
  links both with and without an image.
- [ ] Return to the ordinary account and confirm approved/rejected statuses,
  duplicate and published-listing links, and isolation from another user's
  private submissions.
- [ ] Deny browser location permission and verify the non-blocking message; then
  test unavailable geolocation and a failed MapTiler request while continuing
  to browse the list.
- [ ] Complete a keyboard-only pass through desktop and mobile navigation,
  search, list selection, forms, review controls, and admin controls. Confirm
  visible focus and sensible screen-reader announcements.
- [ ] Repeat the responsive visual pass at representative tablet and wide
  desktop widths, including restroom detail, populated account, and populated
  admin states.

Task 17 is complete only after these checks pass with separate administrator
and ordinary-user accounts and data is confirmed across sessions.
