import winston from 'winston';
import { PrismaClient } from '../generated/prisma/client';

interface LoggingSettings {
  level: string;
  destinations: {
    console: boolean;
    file: boolean;
    errorFile: boolean;
  };
  filePath: string;
  errorFilePath: string;
}

export class LoggingService {
  private static instance: LoggingService | null;
  private prisma: PrismaClient;
  private currentLogger: winston.Logger;
  private defaultSettings: LoggingSettings = {
    level: 'error',
    destinations: {
      console: true,
      file: false,
      errorFile: false,
    },
    filePath: 'logs/combined.log',
    errorFilePath: 'logs/error.log',
  };

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.currentLogger = this.createDefaultLogger();
  }

  public static getInstance(prisma?: PrismaClient): LoggingService {
    if (!LoggingService.instance) {
      if (!prisma) {
        throw new Error('Prisma client is required for first initialization');
      }
      LoggingService.instance = new LoggingService(prisma);
    }
    return LoggingService.instance;
  }

  /**
   * Reset the singleton instance for testing purposes only
   */
  public static resetInstance(): void {
    LoggingService.instance = null;
  }

  /**
   * Get the current logger instance
   */
  public getLogger(): winston.Logger {
    return this.currentLogger;
  }

  /**
   * Load logging settings from database and reconfigure logger
   */
  public async loadSettings(): Promise<void> {
    try {
      const settings = await this.getLoggingSettings();
      this.currentLogger = this.createLoggerWithSettings(settings);
    } catch (error) {
      // If we can't load from database, use default logger
      console.warn('Failed to load logging settings from database, using defaults:', error);
      this.currentLogger = this.createDefaultLogger();
    }
  }

  /**
   * Update logging settings in database and reconfigure logger
   */
  public async updateSettings(newSettings: Partial<LoggingSettings>): Promise<void> {
    try {
      const currentSettings = await this.getLoggingSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };

      // Save to database
      await this.saveLoggingSettings(updatedSettings);

      // Recreate logger with new settings
      this.currentLogger = this.createLoggerWithSettings(updatedSettings);
    } catch (error) {
      throw new Error(`Failed to update logging settings: ${error}`);
    }
  }

  /**
   * Get current logging settings from database
   */
  public async getLoggingSettings(): Promise<LoggingSettings> {
    try {
      const settings = await this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['logLevel', 'logDestinations', 'logFilePath', 'logErrorFilePath']
          }
        }
      });

      const result: LoggingSettings = { ...this.defaultSettings };

      settings.forEach(setting => {
        switch (setting.key) {
          case 'logLevel':
            result.level = setting.value;
            break;
          case 'logDestinations':
            try {
              result.destinations = JSON.parse(setting.value);
            } catch {
              // Use default if parsing fails
            }
            break;
          case 'logFilePath':
            result.filePath = setting.value;
            break;
          case 'logErrorFilePath':
            result.errorFilePath = setting.value;
            break;
        }
      });

      return result;
    } catch (error) {
      // Return defaults if database access fails
      return this.defaultSettings;
    }
  }

  /**
   * Save logging settings to database
   */
  private async saveLoggingSettings(settings: LoggingSettings): Promise<void> {
    const settingsToSave = [
      { key: 'logLevel', value: settings.level },
      { key: 'logDestinations', value: JSON.stringify(settings.destinations) },
      { key: 'logFilePath', value: settings.filePath },
      { key: 'logErrorFilePath', value: settings.errorFilePath },
    ];

    for (const setting of settingsToSave) {
      await this.prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      });
    }
  }

  /**
   * Create logger with specific settings
   */
  private createLoggerWithSettings(settings: LoggingSettings): winston.Logger {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4,
    };

    const colors = {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      debug: 'blue',
    };

    winston.addColors(colors);

    const format = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    );

    const transports: winston.transport[] = [];

    // Console transport
    if (settings.destinations.console) {
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.printf(({ timestamp, level, message, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
              return `${timestamp || ''} ${level}: ${message}${metaStr}`;
            })
          ),
        })
      );
    }

    // Error file transport
    if (settings.destinations.errorFile) {
      transports.push(
        new winston.transports.File({
          filename: settings.errorFilePath,
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    }

    // Combined file transport
    if (settings.destinations.file) {
      transports.push(
        new winston.transports.File({
          filename: settings.filePath,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
        })
      );
    }

    const logger = winston.createLogger({
      level: settings.level,
      levels,
      format,
      transports,
      exitOnError: false,
    });

    // Add stream for Morgan HTTP logging
    (logger as any).stream = {
      write: (message: string) => {
        logger.http(message.trim());
      },
    };

    return logger;
  }

  /**
   * Create default logger (fallback)
   */
  private createDefaultLogger(): winston.Logger {
    return this.createLoggerWithSettings(this.defaultSettings);
  }

  /**
   * Get available log levels
   */
  public getAvailableLogLevels(): string[] {
    return ['error', 'warn', 'info', 'http', 'debug'];
  }

  /**
   * Get available log destinations
   */
  public getAvailableDestinations(): Array<{key: keyof LoggingSettings['destinations'], label: string}> {
    return [
      { key: 'console', label: 'Console Output' },
      { key: 'file', label: 'Log File' },
      { key: 'errorFile', label: 'Error Log File' },
    ];
  }
}

export default LoggingService; 