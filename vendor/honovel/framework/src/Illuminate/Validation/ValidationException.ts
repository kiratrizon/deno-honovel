export class ValidationException extends Error {
  public errors: Record<string, string[]>;

  public response: unknown | null = null;
  constructor(
    errors: Record<string, string[]>,
    message = "The given data was invalid."
  ) {
    super(message);
    this.name = "ValidationException";
    this.errors = errors;
  }

  setDefaultResponse(response: unknown): void {
    this.response = response;
  }
}
