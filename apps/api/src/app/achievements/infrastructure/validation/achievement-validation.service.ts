import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
}

@Injectable()
export class AchievementValidationService {
  private readonly MAX_STRING_LENGTH = 1000;
  private readonly MAX_METADATA_SIZE = 10000; // 10KB
  private readonly ALLOWED_EVENT_TYPES = [
    'quiz_completed',
    'quiz_started', 
    'answer_submitted',
    'streak_updated',
    'daily_goal_reached',
    'accuracy_milestone',
    'speed_milestone'
  ];

  constructor(private readonly eventEmitter: EventEmitter2) {}

  validateCreateAchievementEvent(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!data.userId) {
      errors.push('userId is required');
    } else if (!this.isValidUUID(data.userId)) {
      errors.push('userId must be a valid UUID');
    }

    if (!data.eventType) {
      errors.push('eventType is required');
    } else if (!this.ALLOWED_EVENT_TYPES.includes(data.eventType)) {
      errors.push(`eventType must be one of: ${this.ALLOWED_EVENT_TYPES.join(', ')}`);
    }

    // Validate eventData
    if (!data.eventData || typeof data.eventData !== 'object') {
      errors.push('eventData must be a valid object');
    } else {
      const eventDataValidation = this.validateEventData(data.eventData, data.eventType);
      errors.push(...eventDataValidation.errors);
      warnings.push(...eventDataValidation.warnings);
    }

    // Security checks
    const securityValidation = this.performSecurityChecks(data);
    errors.push(...securityValidation.errors);
    warnings.push(...securityValidation.warnings);

    // Sanitize data if valid
    let sanitizedData;
    if (errors.length === 0) {
      sanitizedData = this.sanitizeEventData(data);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData
    };
  }

  validateBatchCreateEvents(events: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!Array.isArray(events)) {
      errors.push('Events must be an array');
      return { isValid: false, errors, warnings };
    }

    if (events.length === 0) {
      errors.push('Events array cannot be empty');
      return { isValid: false, errors, warnings };
    }

    if (events.length > 100) {
      errors.push('Batch size cannot exceed 100 events');
      return { isValid: false, errors, warnings };
    }

    // Check for duplicate events in batch
    const eventHashes = new Set();
    const duplicates: number[] = [];

    events.forEach((event, index) => {
      const hash = this.createEventHash(event);
      if (eventHashes.has(hash)) {
        duplicates.push(index);
      } else {
        eventHashes.add(hash);
      }

      // Validate each event
      const eventValidation = this.validateCreateAchievementEvent(event);
      if (!eventValidation.isValid) {
        errors.push(`Event ${index}: ${eventValidation.errors.join(', ')}`);
      }
      warnings.push(...eventValidation.warnings.map(w => `Event ${index}: ${w}`));
    });

    if (duplicates.length > 0) {
      warnings.push(`Duplicate events found at indices: ${duplicates.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedData: errors.length === 0 ? events.map(e => this.sanitizeEventData(e)) : undefined
    };
  }

  validateUserAccess(userId: string, requestedUserId: string, userRoles: string[] = []): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Users can only access their own data unless they have admin role
    if (userId !== requestedUserId && !userRoles.includes('admin')) {
      errors.push('Access denied: Cannot access other users data');
    }

    // Validate UUID format
    if (!this.isValidUUID(requestedUserId)) {
      errors.push('Invalid user ID format');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateEventData(eventData: any, eventType: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check size
    const dataSize = JSON.stringify(eventData).length;
    if (dataSize > this.MAX_METADATA_SIZE) {
      errors.push(`Event data size (${dataSize} bytes) exceeds maximum (${this.MAX_METADATA_SIZE} bytes)`);
    }

    // Type-specific validations
    switch (eventType) {
      case 'quiz_completed':
        this.validateQuizCompletedData(eventData, errors, warnings);
        break;
      case 'answer_submitted':
        this.validateAnswerSubmittedData(eventData, errors, warnings);
        break;
      case 'streak_updated':
        this.validateStreakUpdatedData(eventData, errors, warnings);
        break;
      default:
        // Generic validation for unknown types
        this.validateGenericEventData(eventData, errors, warnings);
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private validateQuizCompletedData(data: any, errors: string[], warnings: string[]): void {
    if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
      errors.push('score must be a number between 0 and 100');
    }

    if (typeof data.timeSpent !== 'number' || data.timeSpent < 0) {
      errors.push('timeSpent must be a non-negative number');
    }

    if (data.timeSpent > 7200000) { // 2 hours in milliseconds
      warnings.push('timeSpent exceeds 2 hours, potential invalid data');
    }

    if (data.answers && !Array.isArray(data.answers)) {
      errors.push('answers must be an array if provided');
    }

    if (data.difficulty && !['easy', 'medium', 'hard'].includes(data.difficulty)) {
      errors.push('difficulty must be one of: easy, medium, hard');
    }
  }

  private validateAnswerSubmittedData(data: any, errors: string[], warnings: string[]): void {
    if (!data.questionId || typeof data.questionId !== 'string') {
      errors.push('questionId is required and must be a string');
    }

    if (typeof data.isCorrect !== 'boolean') {
      errors.push('isCorrect must be a boolean');
    }

    if (data.responseTime && (typeof data.responseTime !== 'number' || data.responseTime < 0)) {
      errors.push('responseTime must be a non-negative number if provided');
    }
  }

  private validateStreakUpdatedData(data: any, errors: string[], warnings: string[]): void {
    if (typeof data.currentStreak !== 'number' || data.currentStreak < 0) {
      errors.push('currentStreak must be a non-negative number');
    }

    if (data.previousStreak !== undefined && 
        (typeof data.previousStreak !== 'number' || data.previousStreak < 0)) {
      errors.push('previousStreak must be a non-negative number if provided');
    }

    if (data.currentStreak > 1000) {
      warnings.push('currentStreak exceeds 1000, potential suspicious activity');
    }
  }

  private validateGenericEventData(data: any, errors: string[], warnings: string[]): void {
    // Check for potentially dangerous content
    const dataString = JSON.stringify(data);
    
    if (this.containsSuspiciousContent(dataString)) {
      warnings.push('Event data contains potentially suspicious content');
    }

    // Check for excessive nesting
    if (this.getObjectDepth(data) > 10) {
      errors.push('Event data is too deeply nested (max 10 levels)');
    }
  }

  private performSecurityChecks(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for SQL injection patterns
    const dataString = JSON.stringify(data);
    if (this.containsSQLInjectionPatterns(dataString)) {
      errors.push('Potential SQL injection detected in input data');
      this.logSecurityIncident('sql_injection_attempt', data);
    }

    // Check for XSS patterns
    if (this.containsXSSPatterns(dataString)) {
      warnings.push('Potential XSS content detected in input data');
      this.logSecurityIncident('xss_attempt', data);
    }

    // Check for excessively long strings
    if (this.hasExcessivelyLongStrings(data)) {
      errors.push(`String values cannot exceed ${this.MAX_STRING_LENGTH} characters`);
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousContent(dataString)) {
      warnings.push('Input contains potentially suspicious patterns');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private sanitizeEventData(data: any): any {
    // Deep clone to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove any null bytes
    const dataString = JSON.stringify(sanitized);
    if (dataString.includes('\0')) {
      throw new BadRequestException('Input contains null bytes');
    }

    // Trim string values
    this.trimStringValues(sanitized);

    // Add sanitization timestamp
    sanitized._sanitized = Date.now();

    return sanitized;
  }

  private trimStringValues(obj: any): void {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        obj[key] = value.trim().substring(0, this.MAX_STRING_LENGTH);
      } else if (typeof value === 'object' && value !== null) {
        this.trimStringValues(value);
      }
    }
  }

  // Utility methods
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return typeof uuid === 'string' && uuidRegex.test(uuid);
  }

  private createEventHash(event: any): string {
    const hashData = {
      userId: event.userId,
      eventType: event.eventType,
      // Simple hash of event data
      dataHash: JSON.stringify(event.eventData)
    };
    return JSON.stringify(hashData);
  }

  private containsSQLInjectionPatterns(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /(--|\/\*|\*\/)/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /'(\s*(OR|AND)\s*'?\d+'?\s*=\s*'?\d+'?)/i
    ];
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private containsXSSPatterns(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi
    ];
    return xssPatterns.some(pattern => pattern.test(input));
  }

  private containsSuspiciousContent(input: string): boolean {
    const suspiciousPatterns = [
      /(\.\.\/{2,})/,  // Directory traversal
      /eval\s*\(/i,   // Code evaluation
      /exec\s*\(/i,   // Code execution
      /system\s*\(/i, // System calls
    ];
    return suspiciousPatterns.some(pattern => pattern.test(input));
  }

  private hasExcessivelyLongStrings(obj: any): boolean {
    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return value.length > this.MAX_STRING_LENGTH;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(checkValue);
      }
      return false;
    };

    return checkValue(obj);
  }

  private getObjectDepth(obj: any, depth = 0): number {
    if (typeof obj !== 'object' || obj === null) {
      return depth;
    }

    const depths = Object.values(obj).map(value => this.getObjectDepth(value, depth + 1));
    return Math.max(depth, ...depths);
  }

  private logSecurityIncident(type: string, data: any): void {
    this.eventEmitter.emit('security.incident', {
      type,
      timestamp: Date.now(),
      data: this.sanitizeForLogging(data)
    });
  }

  private sanitizeForLogging(data: any): any {
    // Remove sensitive data from logs
    const sanitized = JSON.parse(JSON.stringify(data));
    delete sanitized.token;
    delete sanitized.password;
    delete sanitized.secret;
    return sanitized;
  }
}