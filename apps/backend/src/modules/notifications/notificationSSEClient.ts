export type NotificationEvent = Record<string, string>
export type OnDataFunction = (d:NotificationEvent) => void
export function createNotificationSSEStream(
  url: string,
  onData: OnDataFunction,
  userId: string,
) {
  const controller = new AbortController();

  (async () => {
    const response = await fetch(url, {
      headers: { 
      Accept: "text/event-stream",
      "Content-Type": "application/json" 
      },
      signal: controller.signal,
      method: "POST",
      body: JSON.stringify({ userId })
    });

    if (!response.body) throw new Error("No body in SSE response");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);

        for (const line of rawEvent.split("\n")) {
          if (line.startsWith("data:")) {
            try {
              onData(JSON.parse(line.slice(5).trim()));
            } catch (err) {
              console.warn("Invalid JSON from SSE:", line);
            }
          }
        }
      }
    }
  })();

  return {
    close: () => controller.abort()
  };
}