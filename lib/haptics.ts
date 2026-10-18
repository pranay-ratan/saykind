/** A tiny physical tap where the browser allows it (Android Chrome). iPhone Safari has no web haptics, so this does nothing there. */
export function tap(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
  } catch {
    // not available
  }
}
