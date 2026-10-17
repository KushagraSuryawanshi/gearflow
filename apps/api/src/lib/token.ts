import jwt from 'jsonwebtoken';
import { config } from './config.js';

// The token carries only the user id. The role is read from the database on every request. SO that when admin is changing someone's role takes effect immediately.
export function signToken(userId: string): string {
  return jwt.sign({}, config.jwtSecret, { subject: userId, expiresIn: '8h' });
}

export function verifyToken(token: string): string {
  const payload = jwt.verify(token, config.jwtSecret);
  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new Error('Token has no subject');
  }
  return payload.sub;
}
