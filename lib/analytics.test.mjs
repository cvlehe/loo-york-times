import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123456";
const { isTrackedPath, sanitizeAnalyticsEvent, trackEvent } = await import("./analytics.ts");

const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
function browser(path = "/", privacy = {}) {
  const calls = [];
  globalThis.window = { location: { pathname: path, origin: "https://loo.example" }, localStorage: { getItem: () => "granted" }, gtag: (...args) => calls.push(args), looGoogleAnalyticsInitialized: true };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: privacy });
  return calls;
}
afterEach(() => {
  delete globalThis.window;
  Object.defineProperty(globalThis, "navigator", originalNavigator);
});

test("public views and custom events strip auth/query/fragment data", () => {
  browser();
  for (const type of ["pageview", "event"]) {
    assert.deepEqual(sanitizeAnalyticsEvent({ type, url: "https://loo.example/login?email=private@example.com&code=secret#token" }),
      { type, url: "https://loo.example/login" });
  }
  assert.equal(sanitizeAnalyticsEvent({ type: "pageview", url: "bad-url" }), null);
});
test("admin, callbacks, and unrecognized routes never emit", () => {
  for (const path of ["/admin", "/admin/articles/new", "/auth/callback", "/unknown"]) {
    const calls = browser(path);
    assert.equal(isTrackedPath(path), false);
    assert.equal(sanitizeAnalyticsEvent({ type: "pageview", url: `https://loo.example${path}?code=secret` }), null);
    trackEvent("form_result", { form: "review", status: "success" });
    assert.deepEqual(calls, []);
  }
});
test("DNT and GPC suppress both page views and custom events", () => {
  for (const privacy of [{ doNotTrack: "1" }, { globalPrivacyControl: true }]) {
    const calls = browser("/", privacy);
    trackEvent("location_result", { status: "located" });
    assert.deepEqual(calls, []);
    assert.equal(sanitizeAnalyticsEvent({ type: "pageview", url: "https://loo.example/" }), null);
  }
});
test("forwards useful aggregate properties without requiring identity", () => {
  const calls = browser();
  trackEvent("directory_searched", { has_query: true, result_count: 0 });
  assert.deepEqual(calls, [["event", "directory_searched", { has_query: true, result_count: 0, send_to: "G-TEST123456", page_location: "https://loo.example/", page_referrer: "", page_title: "The Loo York Times" }]]);
});
test("unavailable analytics and server rendering cannot break product actions", () => {
  browser();
  window.gtag = () => { throw new Error("blocked"); };
  assert.doesNotThrow(() => trackEvent("directions_clicked", {}));
  delete globalThis.window;
  assert.doesNotThrow(() => trackEvent("directions_clicked", {}));
});

test("Google initialization requires opt-in, denies ad storage, and disables automatic pageviews", async () => {
  browser();
  delete window.looGoogleAnalyticsInitialized;
  const { initializeGoogleAnalytics } = await import("./analytics.ts");
  initializeGoogleAnalytics();
  const queue = window.dataLayer.map(args => Array.from(args));
  assert.equal(queue[0][0], "consent");
  assert.equal(queue[0][2].analytics_storage, "granted");
  assert.equal(queue[0][2].ad_storage, "denied");
  assert.equal(queue[2][2].send_page_view, false);
  assert.equal(queue[2][2].page_referrer, "");
  assert.equal(queue[2][2].page_location, "https://loo.example/");
  initializeGoogleAnalytics();
  assert.equal(window.dataLayer.length, 3);
});

test("custom events and Google initialization are disabled without visitor opt-in", async () => {
  const calls = browser();
  delete window.looGoogleAnalyticsInitialized;
  window.localStorage.getItem = () => null;
  const { initializeGoogleAnalytics } = await import("./analytics.ts");
  initializeGoogleAnalytics();
  trackEvent("directions_clicked", {});
  assert.deepEqual(calls, []);
  assert.equal(window.dataLayer, undefined);
});
