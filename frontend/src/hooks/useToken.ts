import { useSyncExternalStore } from "react";
import { getToken, subscribe, tokenClientSnapshot, tokenServerSnapshot } from "@/src/lib/tokenStore";

export function useAuthToken(): string | null {
  return useSyncExternalStore(subscribe, tokenClientSnapshot, tokenServerSnapshot);
}

export { getToken };
