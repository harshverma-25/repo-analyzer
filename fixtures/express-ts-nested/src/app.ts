import express from 'express';
import { apiRouter } from './routes/apiRouter.js';

const app = express();

app.use(express.json());
app.use('/api', apiRouter);

export default app;
