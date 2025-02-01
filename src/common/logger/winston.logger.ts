import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';

@Injectable()
export class WinstonLogger implements LoggerService {
  private logger;

  constructor() {
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        // Log to the console
        new transports.Console({
          format: format.combine(
            format.colorize(), // Add colors to console logs
            format.printf(
              ({ timestamp, level, message, stack }) =>
                `${timestamp} [${level}] ${message} ${stack || ''}`,
            ),
          ),
        }),
        // Log errors to a file
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        // Log all messages to a combined file
        new transports.File({ filename: 'logs/combined.log' }),
      ],
    });
  }

  log(message: string | object) {
    if (typeof message === 'object') {
      this.logger.info(JSON.stringify(message));
    } else {
      this.logger.info(message);
    }
  }

  error(message: string | object, trace?: string) {
    if (typeof message === 'object') {
      this.logger.error(JSON.stringify(message), { trace });
    } else {
      this.logger.error(message, { trace });
    }
  }

  warn(message: string | object) {
    if (typeof message === 'object') {
      this.logger.warn(JSON.stringify(message));
    } else {
      this.logger.warn(message);
    }
  }

  debug(message: string) {
    this.logger.debug(message);
  }

  verbose(message: string) {
    this.logger.verbose(message);
  }
}
