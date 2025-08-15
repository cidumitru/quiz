import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient();
      const token = this.extractTokenFromHandshake(client);

      if (!token) {
        throw new WsException('Unauthorized: No token provided');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET
      });

      // Attach user info to the socket for later use
      client.data.user = payload;
      client.data.userId = payload.sub || payload.userId;
      client.data.authenticated = true;

      return true;
    } catch (error) {
      throw new WsException(`Unauthorized: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractTokenFromHandshake(client: Socket): string | null {
    // Try to get token from handshake auth
    const authToken = client.handshake?.auth?.token;
    if (authToken) return authToken;

    // Try to get token from handshake headers
    const authHeader = client.handshake?.headers?.authorization;
    if (authHeader) {
      const [type, token] = authHeader.split(' ');
      if (type === 'Bearer' && token) return token;
    }

    // Try to get token from query params (less secure, but sometimes necessary)
    const queryToken = client.handshake?.query?.token;
    if (queryToken && typeof queryToken === 'string') return queryToken;

    return null;
  }
}