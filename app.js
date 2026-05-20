import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

import authRoutes from './modules/auth/auth.routes.js';
import productRoutes from './modules/products/products.routes.js';
import posRoutes from './modules/pos/pos.routes.js';
import bankRoutes from './modules/bank/bank.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';

export const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Cafe AI Finance API', version: '1.0.0' },
    servers: [{ url: 'http://localhost:4000/api' }]
  },
  apis: ['./src/**/*.js']
});

app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: err.message || 'Server error' });
});
