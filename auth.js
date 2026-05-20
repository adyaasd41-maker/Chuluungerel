import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header && !required) return next();
    if (!header) return res.status(401).json({ message: 'Unauthorized' });
    try {
      const token = header.replace('Bearer ', '');
      req.user = jwt.verify(token, env.jwtSecret);
      next();
    } catch {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
}

export function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}
