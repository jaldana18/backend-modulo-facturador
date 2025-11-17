import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { analyticsSwaggerSpec } from './config/swagger.analytics';
import { config } from './config/environment';
import cors from 'cors';

const app = express();
const PORT = config.port + 1; // Puerto 3001 para Swagger de Analytics

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI para Analytics
app.use(
  '/api-docs/analytics',
  swaggerUi.serve,
  swaggerUi.setup(analyticsSwaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Analytics API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  })
);

// Endpoint para descargar especificación OpenAPI
app.get('/api-docs/analytics.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(analyticsSwaggerSpec);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'analytics-api-docs' });
});

// Redirect root to docs
app.get('/', (req, res) => {
  res.redirect('/api-docs/analytics');
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                                 ║
║   📊 Analytics API Documentation Server                       ║
║                                                                 ║
║   🌐 Swagger UI:      http://localhost:${PORT}/api-docs/analytics      ║
║   📄 OpenAPI Spec:    http://localhost:${PORT}/api-docs/analytics.json ║
║   ❤️  Health Check:    http://localhost:${PORT}/health                  ║
║                                                                 ║
║   Environment: ${config.nodeEnv.toUpperCase().padEnd(49)} ║
║                                                                 ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
