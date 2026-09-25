/**
 * Used by forms when `isDemoReadOnly` is true (see DemoModeContext): skips
 * the real Firestore write, but still waits a beat before calling `onDone`
 * so the save *feels* the same as a real one, rather than closing instantly
 * in a way that reads as broken.
 */
export function simulateDemoSave(onDone: () => void, delayMs = 1100): void {
  setTimeout(onDone, delayMs)
}
