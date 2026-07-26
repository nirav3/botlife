import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Maps the Prisma error codes this app can actually hit to an HTTP status +
// a message safe to show a client (Prisma's own message includes raw column/
// constraint names we don't want to leak). Anything not listed here falls
// through to the generic 500 below rather than guessing.
function fromPrismaError(err: Prisma.PrismaClientKnownRequestError): { status: number; message: string } | null {
  switch (err.code) {
    case 'P2002': {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      return { status: 409, message: `A record with this ${target} already exists` };
    }
    case 'P2025':
      return { status: 404, message: 'Record not found' };
    case 'P2003':
      return { status: 400, message: 'Referenced record does not exist' };
    default:
      return null;
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = fromPrismaError(err);
    if (mapped) {
      res.status(mapped.status).json({ error: mapped.message });
      return;
    }
  }

  // express.json() throws a SyntaxError for malformed request bodies —
  // that's a client mistake, not a server fault, so it shouldn't be a 500.
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({ error: 'Malformed JSON in request body' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};
