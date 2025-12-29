/**
 * Metrics Routes
 * Analytics and reporting
 */

import { Router } from 'express';
import metrics from '../../crm/metrics.js';
import { asyncHandler } from '../middleware/errors.js';
import { success } from '../utils/response.js';

const router = Router();

// GET /api/metrics/dashboard - Dashboard KPIs
router.get('/dashboard', asyncHandler(async (req, res) => {
    const data = metrics.getDashboard();
    return success(res, data);
}));

// GET /api/metrics/funnel - Conversion funnel
router.get('/funnel', asyncHandler(async (req, res) => {
    const pipeline = req.query.pipeline || 'default';
    const data = metrics.getFunnel(pipeline);
    return success(res, data);
}));

// GET /api/metrics/revenue - Revenue forecast
router.get('/revenue', asyncHandler(async (req, res) => {
    const pipeline = req.query.pipeline || 'default';
    const data = metrics.getRevenueForecast(pipeline);
    return success(res, data);
}));

// GET /api/metrics/activity - Activity stats
router.get('/activity', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const data = metrics.getActivityMetrics(days);
    return success(res, data);
}));

// GET /api/metrics/daily - Daily metrics history
router.get('/daily', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const data = metrics.getDailyMetrics(days);
    return success(res, data);
}));

// GET /api/metrics/performance - Performance by user
router.get('/performance', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 30;
    const data = metrics.getPerformanceByUser(days);
    return success(res, data);
}));

// GET /api/metrics/lost-reasons - Lost reasons analysis
router.get('/lost-reasons', asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 90;
    const data = metrics.getLostReasons(days);
    return success(res, data);
}));

// GET /api/metrics/cycle-time - Average deal cycle time
router.get('/cycle-time', asyncHandler(async (req, res) => {
    const pipeline = req.query.pipeline || 'default';
    const avgDays = metrics.getAverageCycleTime(pipeline);
    return success(res, { average_days: avgDays });
}));

// POST /api/metrics/update-daily - Update daily metrics
router.post('/update-daily', asyncHandler(async (req, res) => {
    const { date } = req.body;
    const data = metrics.updateDailyMetrics(date);
    return success(res, data);
}));

// GET /api/metrics/export/:type - Export data
router.get('/export/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { limit } = req.query;

    const validTypes = ['contacts', 'deals', 'activities', 'daily_metrics'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Tipo inválido' });
    }

    const data = metrics.exportMetrics(type, { limit: parseInt(limit) || 1000 });

    // Set CSV headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_${new Date().toISOString().split('T')[0]}.csv`);

    // Convert to CSV
    if (data.length === 0) {
        return res.send('');
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
        Object.values(row).map(v =>
            typeof v === 'string' && v.includes(',') ? `"${v}"` : v
        ).join(',')
    );

    return res.send([headers, ...rows].join('\n'));
}));

export default router;
