/**
 * CRM API Server
 * Express server for the CRM REST API
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { initialize } from '../crm/index.js';
import { authMiddleware, optionalAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

// Routes
import authRoutes from './routes/auth.js';
import contactsRoutes from './routes/contacts.js';
import dealsRoutes from './routes/deals.js';
import activitiesRoutes from './routes/activities.js';
import tasksRoutes from './routes/tasks.js';
import notesRoutes from './routes/notes.js';
import pipelineRoutes from './routes/pipeline.js';
import metricsRoutes from './routes/metrics.js';
import usersRoutes from './routes/users.js';
import tagsRoutes from './routes/tags.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.CRM_API_PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.CRM_CORS_ORIGIN || '*',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (process.env.NODE_ENV !== 'production') {
            console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

// Health check (no auth required)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/contacts', authMiddleware, contactsRoutes);
app.use('/api/deals', authMiddleware, dealsRoutes);
app.use('/api/activities', authMiddleware, activitiesRoutes);
app.use('/api/tasks', authMiddleware, tasksRoutes);
app.use('/api/notes', authMiddleware, notesRoutes);
app.use('/api/pipeline', authMiddleware, pipelineRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/tags', authMiddleware, tagsRoutes);

// Serve dashboard static files
const dashboardPath = join(__dirname, '..', 'dashboard');
app.use('/dashboard', express.static(dashboardPath));

// SPA fallback - serve index.html for any /dashboard route not matched by static
app.use('/dashboard', (req, res, next) => {
    // If static file was found, it would have been served above
    // This catches all other /dashboard/* routes for SPA routing
    res.sendFile(join(dashboardPath, 'index.html'));
});

// Root redirect to dashboard
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Start the API server
 */
async function startServer() {
    try {
        // Initialize CRM
        await initialize();

        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║     🌐 CRM API Server                                     ║
║                                                           ║
║     API:       http://localhost:${PORT}/api                ║
║     Dashboard: http://localhost:${PORT}/dashboard          ║
║     Health:    http://localhost:${PORT}/api/health         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

export { app, startServer };
export default app;
