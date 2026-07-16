export async function runWithDeadline(
  operation: () => void | Promise<void>,
  timeoutMs: number,
  onTimeout: () => void
): Promise<"completed" | "timed-out"> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<"timed-out">((resolve) => {
    timer = setTimeout(() => {
      onTimeout();
      resolve("timed-out");
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      Promise.resolve().then(operation).then(() => "completed" as const),
      timeout
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
