/**
 * Unified error handling system for the Chrome extension
 * Provides consistent error classification, logging, and user feedback
 */

import { createComponentLogger } from './logger';

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'auth', 
  CONFIGURATION = 'config',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  RUNTIME = 'runtime',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  userMessage: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: number;
}

export interface ErrorHandlerOptions {
  component: string;
  operation?: string;
  context?: Record<string, any>;
  userFriendly?: boolean;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private logger = createComponentLogger('ErrorHandler');

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Classify error based on message, status, and context
   */
  classifyError(error: Error | any, context?: Record<string, any>): ErrorCategory {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.response?.status || 0;

    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      status >= 500
    ) {
      return ErrorCategory.NETWORK;
    }

    // Authentication errors
    if (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('invalid api key') ||
      message.includes('authentication') ||
      status === 401 ||
      status === 403
    ) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Configuration errors
    if (
      message.includes('400') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('configuration') ||
      message.includes('missing') ||
      status === 400
    ) {
      return ErrorCategory.CONFIGURATION;
    }

    // Permission errors
    if (
      message.includes('permission') ||
      message.includes('denied') ||
      message.includes('not granted')
    ) {
      return ErrorCategory.PERMISSION;
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('format') ||
      message.includes('schema')
    ) {
      return ErrorCategory.VALIDATION;
    }

    // Runtime errors
    if (
      message.includes('runtime') ||
      message.includes('chrome') ||
      message.includes('extension')
    ) {
      return ErrorCategory.RUNTIME;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Determine error severity
   */
  getSeverity(category: ErrorCategory, error: Error | any): ErrorSeverity {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.PERMISSION:
        return ErrorSeverity.HIGH;
      
      case ErrorCategory.CONFIGURATION:
      case ErrorCategory.VALIDATION:
        return ErrorSeverity.MEDIUM;
      
      case ErrorCategory.NETWORK:
        return ErrorSeverity.MEDIUM;
      
      case ErrorCategory.RUNTIME:
        return ErrorSeverity.HIGH;
      
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Generate user-friendly error message
   */
  getUserMessage(category: ErrorCategory, originalMessage: string): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'Network connection failed. Please check your internet connection and try again.';
      
      case ErrorCategory.AUTHENTICATION:
        return 'Authentication failed. Please check your API key and try again.';
      
      case ErrorCategory.CONFIGURATION:
        return 'Configuration error. Please check your settings and try again.';
      
      case ErrorCategory.PERMISSION:
        return 'Permission denied. Please grant the necessary permissions and try again.';
      
      case ErrorCategory.VALIDATION:
        return 'Invalid input. Please check your data and try again.';
      
      case ErrorCategory.RUNTIME:
        return 'Extension runtime error. Please refresh the page and try again.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Create standardized AppError
   */
  createError(
    error: Error | any,
    options: ErrorHandlerOptions
  ): AppError {
    const category = this.classifyError(error, options.context);
    const severity = this.getSeverity(category, error);
    const userMessage = this.getUserMessage(category, error?.message || '');
    
    const appError: AppError = {
      category,
      severity,
      code: `${category.toUpperCase()}_${Date.now()}`,
      message: error?.message || 'Unknown error',
      userMessage,
      originalError: error instanceof Error ? error : undefined,
      context: {
        component: options.component,
        operation: options.operation,
        ...options.context
      },
      timestamp: Date.now()
    };

    return appError;
  }

  /**
   * Handle error with logging and optional user notification
   */
  handleError(
    error: Error | any,
    options: ErrorHandlerOptions
  ): AppError {
    const appError = this.createError(error, options);

    // Log based on severity
    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        this.logger.error(
          `[${appError.category}] ${appError.message}`,
          {
            code: appError.code,
            context: appError.context,
            originalError: appError.originalError
          }
        );
        break;
      
      case ErrorSeverity.MEDIUM:
        this.logger.warn(
          `[${appError.category}] ${appError.message}`,
          {
            code: appError.code,
            context: appError.context
          }
        );
        break;
      
      default:
        this.logger.info(
          `[${appError.category}] ${appError.message}`,
          {
            code: appError.code,
            context: appError.context
          }
        );
        break;
    }

    return appError;
  }

  /**
   * Handle API response errors specifically
   */
  handleApiError(
    response: Response,
    operation: string,
    context?: Record<string, any>
  ): AppError {
    const error = new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
    
    return this.handleError(error, {
      component: 'API',
      operation,
      context: {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        ...context
      }
    });
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenient component-specific error handlers
export const createComponentErrorHandler = (componentName: string) => ({
  handle: (error: Error | any, operation?: string, context?: Record<string, any>) =>
    errorHandler.handleError(error, {
      component: componentName,
      operation,
      context
    }),
  
  classify: (error: Error | any, context?: Record<string, any>) =>
    errorHandler.classifyError(error, context),
  
  createError: (error: Error | any, operation?: string, context?: Record<string, any>) =>
    errorHandler.createError(error, {
      component: componentName,
      operation,
      context
    }),

  handleApiError: (response: Response, operation: string, context?: Record<string, any>) =>
    errorHandler.handleApiError(response, operation, context)
});
