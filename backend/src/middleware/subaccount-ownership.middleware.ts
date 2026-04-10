import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { db } from '../config/database';
import { twilioSubaccounts } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const verifySubaccountOwnership = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Support both subaccount_id and subaccount_sid parameter names
  const subaccountId = req.params.subaccount_id || req.params.subaccount_sid;
  const userId = req.userId;

  if (!subaccountId) {
    return res.status(400).json({ error: 'Subaccount ID is required' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const subaccount = await db.query.twilioSubaccounts.findFirst({
      where: and(
        eq(twilioSubaccounts.id, subaccountId),
        eq(twilioSubaccounts.userId, userId)
      ),
    });

    if (!subaccount) {
      return res.status(403).json({ error: 'Access denied: You do not own this subaccount' });
    }

    next();
  } catch (error) {
    console.error('Error verifying subaccount ownership:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
