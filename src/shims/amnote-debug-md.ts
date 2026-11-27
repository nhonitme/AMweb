/** Local no-op shim when the optional @amnote/debug-md package is not installed. */
export function debugMd(..._args: unknown[]): void {
  // Intentionally empty — keeps report pages runnable without the debug package.
}
