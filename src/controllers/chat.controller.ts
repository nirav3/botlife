import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { generateWorkoutPlanReply, ChatTurn } from '../services/chat.service';

export const postWorkoutPlanChat = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messages } = req.body as { messages: ChatTurn[] };
    const reply = await generateWorkoutPlanReply(messages);
    res.json({ data: reply });
  } catch (err) {
    next(err);
  }
};
