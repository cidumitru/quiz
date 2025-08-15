import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

interface RateLimitOptions {
  points: number; // Number of requests
  duration: number; // Per duration in seconds
  blockDuration?: number; // Block duration in seconds when limit exceeded
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly rateLimitStore = new Map<string, { points: number; resetTime: number; blocked?: number }>();
  
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    
    // Get rate limit options from decorator or use defaults
    const options: RateLimitOptions = this.reflector.get<RateLimitOptions>('rateLimit', context.getHandler()) || {
      points: 100,
      duration: 60,
      blockDuration: 60
    };

    const key = `${context.getHandler().name}:${userId}`;
    const now = Date.now();
    const record = this.rateLimitStore.get(key);

    // Check if user is blocked
    if (record?.blocked && record.blocked > now) {
      const retryAfter = Math.ceil((record.blocked - now) / 1000);
      throw new HttpException({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded. Too many requests.',
        retryAfter
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Initialize or reset counter
    if (!record || record.resetTime < now) {
      this.rateLimitStore.set(key, {
        points: options.points - 1,
        resetTime: now + (options.duration * 1000)
      });
      
      // Clean up old entries periodically
      this.cleanupOldEntries();
      return true;
    }

    // Decrement points
    if (record.points > 0) {
      record.points--;
      this.rateLimitStore.set(key, record);
      return true;
    }

    // Block user when limit exceeded
    record.blocked = now + (options.blockDuration! * 1000);
    this.rateLimitStore.set(key, record);
    
    throw new HttpException({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Rate limit exceeded. Too many requests.',
      retryAfter: options.blockDuration
    }, HttpStatus.TOO_MANY_REQUESTS);
  }

  private cleanupOldEntries(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [key, record] of this.rateLimitStore.entries()) {
      if (record.resetTime < now - maxAge) {
        this.rateLimitStore.delete(key);
      }
    }
  }
}

// Decorator for rate limiting
export function RateLimit(points: number, duration: number, blockDuration?: number) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata('rateLimit', { points, duration, blockDuration }, descriptor.value);
    return descriptor;
  };
}