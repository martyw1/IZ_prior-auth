import { db } from "../db";
import { appEventLogs } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO", 
  WARN = "WARN",
  ERROR = "ERROR",
  FATAL = "FATAL"
}

export interface AppEvent {
  level: LogLevel;
  message: string;
  component?: string;
  userId?: number;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  stack?: string;
  timestamp?: Date;
}

class AppLogger {
  private static instance: AppLogger;
  
  private constructor() {}
  
  static getInstance(): AppLogger {
    if (!AppLogger.instance) {
      AppLogger.instance = new AppLogger();
    }
    return AppLogger.instance;
  }

  private async logEvent(event: AppEvent) {
    try {
      // Force immediate database write with transaction
      const result = await db.insert(appEventLogs).values({
        level: event.level,
        message: event.message,
        component: event.component || "SYSTEM",
        userId: event.userId,
        sessionId: event.sessionId,
        requestId: event.requestId,
        metadata: event.metadata ? JSON.stringify(event.metadata) : null,
        stack: event.stack,
        timestamp: event.timestamp || new Date(),
      }).returning();
      
      // Debug log to confirm write
      console.log(`[AppLogger] ${event.level}: ${event.message} - Written to DB at ${new Date().toISOString()}`);
      return result;
    } catch (error) {
      // Fallback to console if database logging fails
      console.error("Failed to log event to database:", error);
      console.log("Original event:", event);
    }
  }

  debug(message: string, metadata?: Record<string, any>, component?: string) {
    this.logEvent({
      level: LogLevel.DEBUG,
      message,
      component,
      metadata,
    });
  }

  info(message: string, metadata?: Record<string, any>, component?: string) {
    this.logEvent({
      level: LogLevel.INFO,
      message,
      component,
      metadata,
    });
  }

  warn(message: string, metadata?: Record<string, any>, component?: string) {
    this.logEvent({
      level: LogLevel.WARN,
      message,
      component,
      metadata,
    });
  }

  error(message: string, metadata?: Record<string, any>, error?: Error, component?: string) {
    this.logEvent({
      level: LogLevel.ERROR,
      message,
      component,
      metadata: {
        ...metadata,
        error: error?.message,
      },
      stack: error?.stack,
    });
  }

  fatal(message: string, error?: Error, metadata?: Record<string, any>, component?: string) {
    this.logEvent({
      level: LogLevel.FATAL,
      message,
      component,
      metadata: {
        ...metadata,
        error: error?.message,
      },
      stack: error?.stack,
    });
  }

  // Context-aware logging methods
  request(message: string, requestId: string, userId?: number, metadata?: Record<string, any>) {
    this.logEvent({
      level: LogLevel.INFO,
      message,
      component: "REQUEST",
      userId,
      requestId,
      metadata,
    });
  }

  security(message: string, userId?: number, metadata?: Record<string, any>) {
    this.logEvent({
      level: LogLevel.WARN,
      message,
      component: "SECURITY",
      userId,
      metadata,
    });
  }

  database(message: string, metadata?: Record<string, any>) {
    this.logEvent({
      level: LogLevel.INFO,
      message,
      component: "DATABASE",
      metadata,
    });
  }

  auth(message: string, userId?: number, metadata?: Record<string, any>) {
    this.logEvent({
      level: LogLevel.INFO,
      message,
      component: "AUTH",
      userId,
      metadata,
    });
  }

  performance(message: string, duration: number, metadata?: Record<string, any>) {
    this.logEvent({
      level: LogLevel.INFO,
      message,
      component: "PERFORMANCE", 
      metadata: {
        ...metadata,
        duration_ms: duration,
      },
    });
  }

  // Query methods for retrieving logs
  async getLogs(limit = 100, offset = 0, level?: string, component?: string) {
    try {
      let query = db.select().from(appEventLogs);
      
      // Apply filters if provided
      const conditions = [];
      if (level && level !== 'all') {
        conditions.push(eq(appEventLogs.level, level));
      }
      if (component && component !== 'all') {
        conditions.push(eq(appEventLogs.component, component));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      // Order by timestamp descending (newest first) and apply pagination
      const logs = await query
        .orderBy(desc(appEventLogs.timestamp))
        .limit(limit)
        .offset(offset);
      
      console.log(`[AppLogger] Returning ${logs.length} logs, latest: ${logs[0]?.timestamp}, oldest: ${logs[logs.length-1]?.timestamp}`);
      
      return logs;
    } catch (error) {
      console.error("Failed to retrieve app logs:", error);
      return [];
    }
  }

  async getLogsByDateRange(startDate: Date, endDate: Date, level?: LogLevel) {
    try {
      const conditions = [
        sql`${appEventLogs.timestamp} >= ${startDate}`,
        sql`${appEventLogs.timestamp} <= ${endDate}`
      ];
      
      if (level) {
        conditions.push(eq(appEventLogs.level, level));
      }
      
      return await db.select()
        .from(appEventLogs)
        .where(and(...conditions))
        .orderBy(desc(appEventLogs.timestamp));
    } catch (error) {
      console.error("Failed to retrieve logs by date range:", error);
      return [];
    }
  }
}

export const appLogger = AppLogger.getInstance();