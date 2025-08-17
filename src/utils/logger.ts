/**
 * Unified logging utility for the Chrome extension
 * Provides consistent logging across development and production environments
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private isProduction: boolean = false;
  private minLevel: LogLevel = LogLevel.DEBUG;

  private constructor() {
    // Detect if we're in production based on build artifacts
    this.isProduction = !chrome.runtime.getManifest().update_url?.includes('dev');
    this.minLevel = this.isProduction ? LogLevel.INFO : LogLevel.DEBUG;
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.minLevel;
  }

  private formatMessage(component: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${component}]`;
    
    if (data !== undefined) {
      return `${prefix} ${message}`;
    }
    return `${prefix} ${message}`;
  }

  debug(component: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const formattedMessage = this.formatMessage(component, message, data);
    if (data !== undefined) {
      console.debug(formattedMessage, data);
    } else {
      console.debug(formattedMessage);
    }
  }

  info(component: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const formattedMessage = this.formatMessage(component, message, data);
    if (data !== undefined) {
      console.info(formattedMessage, data);
    } else {
      console.info(formattedMessage);
    }
  }

  warn(component: string, message: string, data?: any): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const formattedMessage = this.formatMessage(component, message, data);
    if (data !== undefined) {
      console.warn(formattedMessage, data);
    } else {
      console.warn(formattedMessage);
    }
  }

  error(component: string, message: string, error?: any): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const formattedMessage = this.formatMessage(component, message);
    if (error !== undefined) {
      console.error(formattedMessage, error);
    } else {
      console.error(formattedMessage);
    }
  }

  /**
   * Performance timing utility
   */
  time(component: string, label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(`[${component}] ${label}`);
    }
  }

  timeEnd(component: string, label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(`[${component}] ${label}`);
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Export convenient component-specific loggers
export const createComponentLogger = (componentName: string) => ({
  debug: (message: string, data?: any) => logger.debug(componentName, message, data),
  info: (message: string, data?: any) => logger.info(componentName, message, data),
  warn: (message: string, data?: any) => logger.warn(componentName, message, data),
  error: (message: string, error?: any) => logger.error(componentName, message, error),
  time: (label: string) => logger.time(componentName, label),
  timeEnd: (label: string) => logger.timeEnd(componentName, label),
});
