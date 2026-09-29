"use client";

import { type FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setMessage(null);

    const requestedNext = new URLSearchParams(window.location.search).get("next");
    const next = requestedNext?.startsWith("/") ? requestedNext : "/";
    const callback = new URL("/auth/callback", window.location.origin);
    callback.searchParams.set("next", next);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callback.toString(),
      },
    });

    setMessage(
      error
        ? error.message
        : "Check your inbox for a sign-in link. You can close this page after it arrives.",
    );
    setIsPending(false);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
        The Loo York Times
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">Sign in by email</h1>
      <p className="mt-3 text-zinc-600">
        Enter your email and we will send a one-time sign-in link.
      </p>

      <form className="mt-8 space-y-4" onSubmit={requestLink}>
        <label className="block text-sm font-medium" htmlFor="email">
          Email address
        </label>
        <input
          autoComplete="email"
          className="w-full rounded border border-zinc-400 px-3 py-2 text-base focus:outline-2 focus:outline-offset-2 focus:outline-black"
          id="email"
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <button
          className="w-full rounded bg-black px-4 py-2.5 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Sending..." : "Email me a sign-in link"}
        </button>
      </form>

      {message ? (
        <p aria-live="polite" className="mt-5 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </main>
  );
}

