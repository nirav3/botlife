import jwt from 'jsonwebtoken';

/** Generates a valid auth header for a given user id/email, signed with the test JWT_SECRET. */
export function authHeader(userId: string, email = 'user@example.com'): string {
  const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET as string, { expiresIn: '1h' });
  return `Bearer ${token}`;
}

/** Signs a token with a *different* secret, to simulate a tampered/forged JWT. */
export function authHeaderWithWrongSecret(userId: string, email = 'user@example.com'): string {
  const token = jwt.sign({ id: userId, email }, 'wrong-secret-not-the-real-one', { expiresIn: '1h' });
  return `Bearer ${token}`;
}

/** Signs an already-expired token. */
export function authHeaderExpired(userId: string, email = 'user@example.com'): string {
  const token = jwt.sign({ id: userId, email }, process.env.JWT_SECRET as string, { expiresIn: '-1s' });
  return `Bearer ${token}`;
}

export const USER_A_ID = 'user-a-id';
export const USER_B_ID = 'user-b-id';
