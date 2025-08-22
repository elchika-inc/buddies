export class PawMatchError extends Error {
  constructor(message: string, public status = 500, public code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'PawMatchError';
  }
}

export class ValidationError extends PawMatchError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends PawMatchError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ServiceUnavailableError extends PawMatchError {
  constructor(message: string) {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

export function createErrorResponse(error: unknown) {
  if (error instanceof PawMatchError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      }
    };
  }

  // 予期しないエラーの場合
  console.error('Unexpected error:', error);
  return {
    success: false,
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }
  };
}

export function handleError(c: { json: (data: object, status?: number) => Response }, error: unknown) {
  const errorResponse = createErrorResponse(error);
  const status = error instanceof PawMatchError ? error.status : 500;
  return c.json(errorResponse, status);
}