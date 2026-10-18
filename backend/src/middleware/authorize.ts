import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access forbidden: Insufficient permissions' });
    }

    next();
  };
}
