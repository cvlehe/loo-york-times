"use client";

import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { googleConsent, googleMeasurementId, hasGoogleAnalytics, setGoogleConsent, initializeGoogleAnalytics, isTrackedPath, sanitizeAnalyticsEvent, trackEvent } from "@/lib/analytics";

const subscribe = () => () => {};
const canTrack = () => navigator.doNotTrack !== "1" &&
  !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl;

const subscribeConsent = (callback: () => void) => {
  window.addEventListener("loo-analytics-consent", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("loo-analytics-consent", callback);
    window.removeEventListener("storage", callback);
  };
};

export function SiteAnalytics() {
  const googleEnabled = useSyncExternalStore(subscribeConsent, googleConsent, () => false);
  const enabled = useSyncExternalStore(subscribe, canTrack, () => false);
  const pathname = usePathname();

  useEffect(() => {
    const allowed = enabled && googleEnabled && isTrackedPath(pathname);
    if (hasGoogleAnalytics) {
      (window as unknown as Record<string, unknown>)[`ga-disable-${googleMeasurementId}`] = !allowed;
      window.gtag?.("consent", "update", { analytics_storage: allowed ? "granted" : "denied" });
    }
    if (allowed) initializeGoogleAnalytics();
  }, [enabled, googleEnabled, pathname]);

  useEffect(() => {
    const started = new WeakSet<HTMLFormElement>();
    const formName = (form: HTMLFormElement) => form.classList.contains("review-form") ? "review" :
      form.classList.contains("submission-form") ? "submission" :
      form.classList.contains("login-form") ? "login" : null;
    function onFocus(event: FocusEvent) {
      const form = (event.target as HTMLElement).closest("form");
      if (!form || started.has(form)) return;
      const name = formName(form);
      if (name) { started.add(form); trackEvent("form_started", { form: name }); }
    }
    function onSubmit(event: SubmitEvent) {
      const name = formName(event.target as HTMLFormElement);
      if (name && !event.defaultPrevented) trackEvent("form_submitted", { form: name });
    }
    function onClick(event: MouseEvent) {
      const link = (event.target instanceof Element ? event.target : null)?.closest("a");
      if (!link) return;
      const url = new URL(link.href, window.location.origin);
      if (url.hostname === "www.google.com" && url.pathname === "/maps/dir/") {
        trackEvent("directions_clicked", {});
      } else if (link.closest(".editorial-article-card") && !link.closest("form")) {
        trackEvent("article_clicked", { article_type: url.origin === window.location.origin ? "internal" : "external" });
      } else if (url.origin === window.location.origin && isTrackedPath(url.pathname) && !link.hash) {
        trackEvent("navigation_clicked", { destination: url.pathname });
      }
    }
    const depths = new Set<number>();
    function onScroll() {
      if (!pathname.startsWith("/journalism/")) return;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (height <= 0) return;
      const progress = window.scrollY / height * 100;
      for (const depth of [50, 90] as const) {
        if (progress >= depth && !depths.has(depth)) {
          depths.add(depth); trackEvent("article_scroll", { depth });
        }
      }
    }
    document.addEventListener("focusin", onFocus);
    document.addEventListener("submit", onSubmit, true);
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return enabled ? <>
    <Analytics beforeSend={sanitizeAnalyticsEvent} />
    {hasGoogleAnalytics && googleEnabled && isTrackedPath(pathname) ? <Script
      id="google-custom-events"
      src={`https://www.googletagmanager.com/gtag/js?id=${googleMeasurementId}`}
      strategy="afterInteractive"
    /> : null}
    {hasGoogleAnalytics && isTrackedPath(pathname) ? <div className="analytics-preferences">
      <p>Optional usage analytics helps us improve the site. Search text and form contents are excluded.</p>
      <button type="button" onClick={() => setGoogleConsent(!googleEnabled)}>
        {googleEnabled ? "Turn off usage analytics" : "Allow usage analytics"}
      </button>
    </div> : null}
  </> : null;
}
