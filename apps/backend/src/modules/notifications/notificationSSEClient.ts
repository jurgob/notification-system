export type NotificationData = Record<string, string>
export type OnDataFunction = (d:NotificationData) => void

export function createNotificationSSEStream(
  url: string,
  onData: OnDataFunction
) {
  const controller = new AbortController();

  (async () => {
    const response = await fetch(url, {
      headers: { Accept: "text/event-stream" },
      signal: controller.signal
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