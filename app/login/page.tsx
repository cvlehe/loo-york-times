"use client";

import { trackEvent } from "@/lib/analytics";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    const requestedNext = new URLSearchParams(window.location.search).get("next");
    const next = safeNextPath(requestedNext);
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback.toString() },
    });

    trackEvent("form_result", { form: "login", status: error ? "error" : "success" });
    setMessage(
      error
        ? error.message
        : "Check your inbox for a sign-in link. You can close this page after it arrives.",
    );
    setIsPending(false);
  }

  return (
    <main id="main-content" className="narrow-page">
      <p className="kicker">Reader access</p>
      <h1>Sign in by email</h1>
      <p className="dek">
        No password needed. We&apos;ll send a one-time sign-in link to your inbox.
      </p>

      <form className="login-form" onSubmit={requestLink}>
        <label htmlFor="email">Email address</label>
        <input
          autoComplete="email"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <button disabled={isPending} type="submit">
          {isPending ? "Sending..." : "Email me a sign-in link"}
        </button>
      </form>

      {message ? <p aria-live="polite" className="form-message">{message}</p> : null}
      <Link className="text-link back-link" href="/">← Back to the map</Link>
    </main>
  );
}
