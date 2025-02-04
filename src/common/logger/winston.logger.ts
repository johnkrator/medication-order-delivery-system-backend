import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';
import * as fs from 'fs';

@Injectable()
export class WinstonLogger implements LoggerService {
  private logger;

  constructor() {
    // Define log directory - use /tmp for Lambda environments
    const logDir = process.env.AWS_LAMBDA_FUNCTION_NAME
      ? '/tmp/logs'
      : './logs';

    // Create logs directory if it doesn't exist
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      console.warn(`Unable to create log directory: ${error.message}`);
    }

    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json(),
      ),
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.printf(
              ({ timestamp, level, message, stack }) =>
                `${timestamp} [${level}] ${message} ${stack || ''}`,
            ),
          ),
        }),
      ],
    });

    // Only add file transports if directory creation was successful
    try {
      this.logger.add(
        new transports.File({
          filename: `${logDir}/error.log`,
          level: 'error',
        }),
      );
      this.logger.add(
        new transports.File({
          filename: `${logDir}/combined.log`,
        }),
      );
    } catch (error) {
      console.warn(`Unable to initialize file transports: ${error.message}`);
    }
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
