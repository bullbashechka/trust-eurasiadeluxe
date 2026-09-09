export type ProjectFetcher = (
  url: string,
  options: RequestInit,
) => Promise<Response>;
export async function fetchProjectHTML(
  url: URL,
  signal: AbortSignal,
  fetcher: ProjectFetcher = fetch,
) {
  const response = await fetcher(url.href, {
    signal,
    headers: { Accept: "text/html" },
  });
  if (
    !response.ok ||
    new URL(response.url || url.href).pathname !== "/eurasia-deluxe/" ||
    !response.headers.get("content-type")?.includes("text/html")
  ) {
    throw new Error("Project unavailable");
  }
  const html = await response.text();
  signal.throwIfAborted();
  return html;
}

export function abortable<T>(
  promise: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const onAbort = () =>
      reject(signal.reason ?? new Error("Navigation cancelled"));
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    promise
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", onAbort));
  });
}
