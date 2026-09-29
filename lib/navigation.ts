export function safeNextPath(value: string | null | undefined) {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  const localOrigin = "https://loo-york-times.invalid";

  try {
    const url = new URL(value, localOrigin);
    if (url.origin !== localOrigin) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
