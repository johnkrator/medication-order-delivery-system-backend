import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { WinstonLogger } from './winston.logger'; // Import WinstonLogger

// Base error response interface
export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  details?: unknown;
}

// Password requirement interfaces
export interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

// Validation specific error details
export interface ValidationErrorDetails {
  kind: 'validation';
  failed_requirements: Record<string, string>;
  fulfilled_requirements: Record<string, string>;
}

// Password validation messages
const PASSWORD_REQUIREMENT_MESSAGES = {
  minLength: 'Password must be at least 8 characters long',
  hasUpperCase: 'A capital (uppercase) letter',
  hasLowerCase: 'A lowercase letter',
  hasNumber: 'A number',
  hasSpecialChar: 'A special character (!@#$%^&*(),.?":{}|<>)',
} as const;

// Password validation patterns
const PASSWORD_PATTERNS = {
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/,
};

export const validatePasswordRequirements = (
  password: string,
): PasswordRequirements => {
  return {
    minLength: password.length >= 8,
    hasUpperCase: PASSWORD_PATTERNS.hasUpperCase.test(password),
    hasLowerCase: PASSWORD_PATTERNS.hasLowerCase.test(password),
    hasNumber: PASSWORD_PATTERNS.hasNumber.test(password),
    hasSpecialChar: PASSWORD_PATTERNS.hasSpecialChar.test(password),
  };
};

export const getPasswordValidationDetails = (
  password: string,
): ValidationErrorDetails => {
  const requirements = validatePasswordRequirements(password);

  const failed_requirements: Record<string, string> = {};
  const fulfilled_requirements: Record<string, string> = {};

  (Object.keys(requirements) as Array<keyof PasswordRequirements>).forEach(
    (requirement) => {
      if (requirements[requirement]) {
        fulfilled_requirements[requirement] =
          PASSWORD_REQUIREMENT_MESSAGES[requirement];
      } else {
        failed_requirements[requirement] =
          PASSWORD_REQUIREMENT_MESSAGES[requirement];
      }
    },
  );

  return {
    kind: 'validation',
    failed_requirements,
    fulfilled_requirements,
  };
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new WinstonLogger(); // Use WinstonLogger

  catch(exception: unknown, host: ArgumentsHost) {
    try {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const request = ctx.getRequest();

      let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      let message: string | string[] = 'Internal server error';
      let error = 'Internal Server Error';
      let details: unknown = undefined;

      // Handle HTTP exceptions (including our custom PasswordValidationException)
      if (exception instanceof HttpException) {
        statusCode = exception.getStatus();
        const errorResponse = exception.getResponse();

        if (typeof errorResponse === 'object' && errorResponse !== null) {
          const typedResponse = errorResponse as Record<string, unknown>;

          // Handle class-validator validation errors
          if (Array.isArray(typedResponse.message)) {
            message = typedResponse.message;

            // Check if this is a password validation error
            if (
              request.body?.password &&
              message.some((msg) => msg.toLowerCase().includes('password'))
            ) {
              details = getPasswordValidationDetails(request.body.password);
            } else {
              // Handle other validation errors
              details = {
                kind: 'validation',
                failed_requirements: message.reduce(
                  (acc, msg, index) => {
                    acc[`validation${index + 1}`] = msg;
                    return acc;
                  },
                  {} as Record<string, string>,
                ),
                fulfilled_requirements: {},
              };
            }
          } else {
            message = (typedResponse.message as string) || exception.message;
            error = (typedResponse.error as string) || 'Http Exception';

            if ('details' in typedResponse && typedResponse.details) {
              details = typedResponse.details;
            }
          }
        } else {
          message = errorResponse as string;
        }
      }
      // Handle TypeORM errors
      else if (exception instanceof QueryFailedError) {
        const err = exception as any;
        if (err.code === '23505') {
          statusCode = HttpStatus.CONFLICT;
          message = this.parseUniqueViolationError(err.detail);
          error = 'Database Constraint Violation';
        }
      }
      // Handle other validation errors
      else if (exception instanceof Error) {
        if (exception.name === 'ValidationError') {
          statusCode = HttpStatus.BAD_REQUEST;
          message = exception.message;
          error = 'Validation Error';

          // Check if this is a password validation error
          if ('details' in exception && (exception as any).details) {
            details = (exception as any).details;
          }
        }
        // Handle JWT errors
        else if (exception.name === 'JsonWebTokenError') {
          statusCode = HttpStatus.UNAUTHORIZED;
          message = 'Invalid token';
          error = 'Authentication Error';
        } else if (exception.name === 'TokenExpiredError') {
          statusCode = HttpStatus.UNAUTHORIZED;
          message = 'Token expired';
          error = 'Authentication Error';
        }
      }

      const timestamp = new Date().toISOString();

      // Create error object for logging
      const errorLog = {
        timestamp,
        path: request.url,
        method: request.method,
        statusCode,
        message,
        error,
        details,
        body: request.body,
        params: request.params,
        query: request.query,
        stack: exception instanceof Error ? exception.stack : undefined,
      };

      // Log based on severity
      if (statusCode >= 500) {
        this.logger.error({ ...errorLog });
      } else if (statusCode >= 400) {
        this.logger.warn({ ...errorLog });
      } else {
        this.logger.log({ ...errorLog });
      }

      // Construct the error response
      const errorResponse: ErrorResponse = {
        statusCode,
        message,
        error,
        timestamp,
        path: request.url,
      };

      if (details) {
        errorResponse.details = details;
      }

      // Send response
      response.status(statusCode).json(errorResponse);
    } catch (err) {
      // Fallback error handling
      this.logger.error('Error in exception filter', err);
      const response = host.switchToHttp().getResponse<Response>();
      response.status(500).json({
        statusCode: 500,
        message: 'Internal server error',
        error: 'Error Handler Failed',
        timestamp: new Date().toISOString(),
      });
    }
  }

  private parseUniqueViolationError(detail: string): string {
    try {
      const matches = detail.match(/Key \((.*?)\)=\((.*?)\)/);
      if (matches) {
        const [, field, value] = matches;
        return `${field} '${value}' already exists`;
      }
      return 'A record with these details already exists';
    } catch {
      return 'A unique constraint was violated';
    }
  }
}
