import { Router } from 'express';
import { userRouter } from './userRouter.js';

export const apiRouter = Router();

apiRouter.use('/v1', userRouter);
