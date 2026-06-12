import { logger } from './logger';

export function logRequest(request: Request, responseStatus: number, responseTime: number) {
  const url = new URL(request.url);
  
  logger.info({
    method: request.method,
    url: url.pathname,
    query: url.search,
    status: responseStatus,
    responseTimeMs: responseTime,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  }, 'HTTP Request');
}

export function logError(error: Error, context: Record<string, unknown> = {}) {
  logger.error({
    err: error,
    message: error.message,
    stack: error.stack,
    ...context,
  }, 'Application Error');
}

export function logAudit(action: string, userId: string, details: Record<string, unknown>) {
  logger.info({
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  }, 'Audit Log');
}