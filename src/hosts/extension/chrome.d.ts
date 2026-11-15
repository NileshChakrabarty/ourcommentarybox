// The few chrome.* APIs the side panel uses (no @types/chrome dependency).
declare namespace chrome.runtime {
  interface Port {
    name: string;
    postMessage(m: unknown): void;
    disconnect(): void;
    onMessage: { addListener(cb: (m: unknown) => void): void };
    onDisconnect: { addListener(cb: () => void): void };
    sender?: { tab?: { id?: number; url?: string } };
  }
  const onConnect: { addListener(cb: (p: Port) => void): void };
  const id: string;
}
