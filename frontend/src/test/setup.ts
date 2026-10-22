/**
 * Test setup.
 *
 * The API client reads the stored session the moment it is loaded, so the
 * tests need a `localStorage` to exist. The suite runs in a Node environment
 * on purpose: the components under test are pure TypeScript logic, and a
 * browser-like environment would only hide problems.
 */

if (typeof globalThis.localStorage === 'undefined') {
  const entries = new Map<string, string>()

  globalThis.localStorage = {
    get length() {
      return entries.size
    },
    clear() {
      entries.clear()
    },
    getItem(key: string) {
      return entries.get(key) ?? null
    },
    key(index: number) {
      return [...entries.keys()][index] ?? null
    },
    removeItem(key: string) {
      entries.delete(key)
    },
    setItem(key: string, value: string) {
      entries.set(key, value)
    },
  } as Storage
}
