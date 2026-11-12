export function friendlyMessage(err: unknown): string {
  const e = err as { status?: number; code?: string; message?: string } | undefined;

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Check your connection and try again.";
  }

  const status = e?.status;
  const code = e?.code;

  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) {
    if (code === "password_change_required") {
      return "Please change your password to continue.";
    }
    return "You don't have permission to perform this action. Contact the department if this seems wrong.";
  }
  if (status === 404) return "The requested item could not be found.";
  if (status === 409) return "This record already exists or conflicts with an existing one.";
  if (status === 422) return "Please check the highlighted fields and try again.";
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (status && status >= 500) return "Something went wrong on our side. Please contact the department.";

  if (err instanceof TypeError) {
    return "Unable to reach the server. Check your connection and contact the department if it persists.";
  }

  return "Something went wrong. Please contact the department.";
}