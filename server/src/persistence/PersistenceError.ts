/**
 * Failure to reach or complete a persistence operation.
 *
 * The public message is intentionally safe to log or display, while `cause`
 * retains the provider or transport error for server-side diagnostics.
 */
export class PersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PersistenceError";
  }
}
