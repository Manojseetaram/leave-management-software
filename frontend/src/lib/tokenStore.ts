const STORAGE_KEY = "leave.token";
const EVENT = "leave:token";

let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((listener) => listener());
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  emit();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  const handler = () => listener();
  if (typeof window !== "undefined") {
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
  }
  return () => {
    listeners = listeners.filter((l) => l !== listener);
    if (typeof window !== "undefined") {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    }
  };
}

export function useToken(): string | null {
  // React hook wrapper is in hooks; this is the raw store accessor.
  return getToken();
}

// useSyncExternalStore helpers
export const tokenServerSnapshot = (): string | null => null;
export const tokenClientSnapshot = (): string | null => getToken();
