import { Router } from 'express';

export const userRouter = Router();

function authMiddleware(req: any, res: any, next: any) {
  next();
}

function getUserProfile(req: any, res: any) {
  res.status(200).json({ id: req.params.id });
}

// Protected route with path param :id
userRouter.get('/users/:id', authMiddleware, getUserProfile);

// Dynamic unresolved route test case
const dynamicSegment = '/dynamic';
userRouter.get(dynamicSegment, (req, res) => res.send('ok'));
