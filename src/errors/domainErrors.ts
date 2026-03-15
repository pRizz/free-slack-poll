import { AppError } from "./appError.js";

export class ValidationError extends AppError {
  constructor(
    message: string,
    metadata: Record<string, string | number | boolean> = {},
  ) {
    super("VALIDATION_ERROR", message, metadata);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super("AUTHORIZATION_ERROR", message);
  }
}

export class NotFoundError extends AppError {
  constructor(
    message: string,
    metadata: Record<string, string | number | boolean> = {},
  ) {
    super("NOT_FOUND", message, metadata);
  }
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    metadata: Record<string, string | number | boolean> = {},
  ) {
    super("CONFLICT", message, metadata);
  }
}
