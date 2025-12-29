/**
 * Metrics Manager - CRM Analytics
 * Calculates and stores business metrics
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

class MetricsManager {
    /**
     * Get dashboard metrics
     */
    getDashboard() {
        const today = new Date().toISOString().split('T')[0];

        // Overall metrics
        const overview = db.db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM contacts) as total_contacts,
                (SELECT COUNT(*) FROM contacts WHERE created_at >= date('now', '-7 days')) as new_contacts_7d,
                (SELECT COUNT(*) FROM deals WHERE stage NOT IN ('won', 'lost')) as active_deals,
                (SELECT COALESCE(SUM(value), 0) FROM deals WHERE stage NOT IN ('won', 'lost')) as pipeline_value,
                (SELECT COUNT(*) FROM deals WHERE stage = 'won') as total_won,
                (SELECT COALESCE(SUM(value), 0) FROM deals WHERE stage = 'won') as total_revenue,
                (SELECT COUNT(*) FROM deals WHERE stage = 'won' AND actual_close_date >= date('now', '-30 days')) as won_30d,
                (SELECT COALESCE(SUM(value), 0) FROM deals WHERE stage = 'won' AND actual_close_date >= date('now', '-30 days')) as revenue_30d,
                (SELECT COUNT(*) FROM tasks WHERE status = 'pending' AND due_date <= date('now')) as overdue_tasks
        `).get();

        // Conversion rate
        const conversion = db.db.prepare(`
            SELECT
                COUNT(CASE WHEN stage = 'won' THEN 1 END) * 100.0 /
                NULLIF(COUNT(CASE WHEN stage IN ('won', 'lost') THEN 1 END), 0) as conversion_rate
            FROM deals
        `).get();

        return {
            ...overview,
            conversion_rate: conversion.conversion_rate || 0
        };
    }

    /**
     * Get funnel metrics
     */
    getFunnel(pipeline = 'default') {
        return db.db.prepare(`
            SELECT
                ps.name as stage,
                ps.order_index,
                ps.color,
                ps.probability,
                COUNT(d.id) as count,
                COALESCE(SUM(d.value), 0) as value
            FROM pipeline_stages ps
            LEFT JOIN deals d ON d.stage = ps.name AND d.pipeline = ps.pipeline
            WHERE ps.pipeline = ?
            GROUP BY ps.id
            ORDER BY ps.order_index ASC
        `).all(pipeline);
    }

    /**
     * Get revenue forecast
     */
    getRevenueForecast(pipeline = 'default') {
        const forecast = db.db.prepare(`
            SELECT
                stage,
                probability,
                COUNT(*) as deals,
                SUM(value) as total_value,
                SUM(value * probability / 100.0) as weighted_value
            FROM deals
            WHERE pipeline = ? AND stage NOT IN ('won', 'lost')
            GROUP BY stage, probability
        `).all(pipeline);

        const totals = forecast.reduce((acc, row) => ({
            total_value: acc.total_value + row.total_value,
            weighted_value: acc.weighted_value + row.weighted_value,
            deals: acc.deals + row.deals
        }), { total_value: 0, weighted_value: 0, deals: 0 });

        return { byStage: forecast, totals };
    }

    /**
     * Get activity metrics
     */
    getActivityMetrics(days = 30) {
        return db.db.prepare(`
            SELECT
                DATE(created_at) as date,
                type,
                COUNT(*) as count
            FROM activities
            WHERE created_at >= date('now', '-' || ? || ' days')
            GROUP BY DATE(created_at), type
            ORDER BY date ASC
        `).all(days);
    }

    /**
     * Get daily metrics history
     */
    getDailyMetrics(days = 30) {
        return db.db.prepare(`
            SELECT * FROM daily_metrics
            WHERE date >= date('now', '-' || ? || ' days')
            ORDER BY date ASC
        `).all(days);
    }

    /**
     * Update daily metrics (call at end of day or on demand)
     */
    updateDailyMetrics(date = null) {
        const targetDate = date || new Date().toISOString().split('T')[0];

        const metrics = db.db.prepare(`
            SELECT
                ? as date,
                (SELECT COUNT(*) FROM contacts WHERE DATE(created_at) = ?) as new_contacts,
                (SELECT COUNT(*) FROM deals WHERE DATE(created_at) = ?) as new_deals,
                (SELECT COUNT(*) FROM deals WHERE stage = 'won' AND DATE(actual_close_date) = ?) as deals_won,
                (SELECT COUNT(*) FROM deals WHERE stage = 'lost' AND DATE(actual_close_date) = ?) as deals_lost,
                (SELECT COALESCE(SUM(value), 0) FROM deals WHERE stage = 'won' AND DATE(actual_close_date) = ?) as revenue_won,
                (SELECT COUNT(*) FROM activities WHERE type = 'message_sent' AND DATE(created_at) = ?) as messages_sent,
                (SELECT COUNT(*) FROM activities WHERE type = 'message_received' AND DATE(created_at) = ?) as messages_received,
                (SELECT COUNT(*) FROM activities WHERE type = 'followup' AND DATE(created_at) = ?) as followups_sent
        `).get(targetDate, targetDate, targetDate, targetDate, targetDate, targetDate, targetDate, targetDate, targetDate);

        db.db.prepare(`
            INSERT INTO daily_metrics (
                id, date, new_contacts, new_deals, deals_won, deals_lost,
                revenue_won, messages_sent, messages_received, followups_sent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                new_contacts = excluded.new_contacts,
                new_deals = excluded.new_deals,
                deals_won = excluded.deals_won,
                deals_lost = excluded.deals_lost,
                revenue_won = excluded.revenue_won,
                messages_sent = excluded.messages_sent,
                messages_received = excluded.messages_received,
                followups_sent = excluded.followups_sent
        `).run(
            uuidv4(), targetDate, metrics.new_contacts, metrics.new_deals,
            metrics.deals_won, metrics.deals_lost, metrics.revenue_won,
            metrics.messages_sent, metrics.messages_received, metrics.followups_sent,
            new Date().toISOString()
        );

        return this.getDailyMetricsByDate(targetDate);
    }

    /**
     * Get metrics for specific date
     */
    getDailyMetricsByDate(date) {
        return db.db.prepare('SELECT * FROM daily_metrics WHERE date = ?').get(date);
    }

    /**
     * Get performance by user
     */
    getPerformanceByUser(days = 30) {
        return db.db.prepare(`
            SELECT
                assigned_to as user,
                COUNT(*) as total_deals,
                COUNT(CASE WHEN stage = 'won' THEN 1 END) as won,
                COUNT(CASE WHEN stage = 'lost' THEN 1 END) as lost,
                COALESCE(SUM(CASE WHEN stage = 'won' THEN value END), 0) as revenue,
                COUNT(CASE WHEN stage = 'won' THEN 1 END) * 100.0 /
                    NULLIF(COUNT(CASE WHEN stage IN ('won', 'lost') THEN 1 END), 0) as conversion_rate
            FROM deals
            WHERE created_at >= date('now', '-' || ? || ' days')
            GROUP BY assigned_to
        `).all(days);
    }

    /**
     * Get lost reasons analysis
     */
    getLostReasons(days = 90) {
        return db.db.prepare(`
            SELECT
                COALESCE(lost_reason, 'Não especificado') as reason,
                COUNT(*) as count,
                SUM(value) as lost_value
            FROM deals
            WHERE stage = 'lost'
              AND actual_close_date >= date('now', '-' || ? || ' days')
            GROUP BY lost_reason
            ORDER BY count DESC
        `).all(days);
    }

    /**
     * Get average deal cycle time
     */
    getAverageCycleTime(pipeline = 'default') {
        const result = db.db.prepare(`
            SELECT
                AVG(julianday(actual_close_date) - julianday(created_at)) as avg_days
            FROM deals
            WHERE pipeline = ? AND stage = 'won' AND actual_close_date IS NOT NULL
        `).get(pipeline);

        return Math.round(result.avg_days || 0);
    }

    /**
     * Export metrics to CSV format
     */
    exportMetrics(type, options = {}) {
        let data = [];

        switch (type) {
            case 'contacts':
                data = db.db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
                break;
            case 'deals':
                data = db.db.prepare(`
                    SELECT d.*, c.name as contact_name, c.phone as contact_phone
                    FROM deals d
                    LEFT JOIN contacts c ON d.contact_id = c.id
                    ORDER BY d.created_at DESC
                `).all();
                break;
            case 'activities':
                data = db.db.prepare(`
                    SELECT a.*, c.name as contact_name
                    FROM activities a
                    LEFT JOIN contacts c ON a.contact_id = c.id
                    ORDER BY a.created_at DESC
                    LIMIT ?
                `).all(options.limit || 1000);
                break;
            case 'daily_metrics':
                data = db.db.prepare('SELECT * FROM daily_metrics ORDER BY date DESC').all();
                break;
        }

        return data;
    }
}

export default new MetricsManager();
