/**
 * Pipeline Manager - CRM Pipeline Stages
 * Manages sales pipeline stages configuration
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';

class PipelineManager {
    /**
     * Get all stages for a pipeline
     */
    getStages(pipeline = 'default') {
        return db.db.prepare(`
            SELECT * FROM pipeline_stages
            WHERE pipeline = ?
            ORDER BY order_index ASC
        `).all(pipeline);
    }

    /**
     * Get stage by ID
     */
    getStageById(id) {
        return db.db.prepare('SELECT * FROM pipeline_stages WHERE id = ?').get(id);
    }

    /**
     * Get stage by name
     */
    getStageByName(pipeline, name) {
        return db.db.prepare(`
            SELECT * FROM pipeline_stages
            WHERE pipeline = ? AND name = ?
        `).get(pipeline, name);
    }

    /**
     * Create a new stage
     */
    createStage(data) {
        const id = data.id || `stage_${uuidv4().slice(0, 8)}`;

        // Get max order_index
        const maxOrder = db.db.prepare(`
            SELECT COALESCE(MAX(order_index), 0) as max_order
            FROM pipeline_stages
            WHERE pipeline = ?
        `).get(data.pipeline || 'default');

        db.db.prepare(`
            INSERT INTO pipeline_stages (
                id, pipeline, name, order_index, color, probability, is_won, is_lost, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id,
            data.pipeline || 'default',
            data.name,
            data.order_index ?? (maxOrder.max_order + 1),
            data.color || '#3B82F6',
            data.probability ?? 50,
            data.is_won ? 1 : 0,
            data.is_lost ? 1 : 0,
            new Date().toISOString()
        );

        return this.getStageById(id);
    }

    /**
     * Update stage
     */
    updateStage(id, data) {
        const updates = [];
        const values = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            values.push(data.name);
        }
        if (data.order_index !== undefined) {
            updates.push('order_index = ?');
            values.push(data.order_index);
        }
        if (data.color !== undefined) {
            updates.push('color = ?');
            values.push(data.color);
        }
        if (data.probability !== undefined) {
            updates.push('probability = ?');
            values.push(data.probability);
        }

        if (updates.length === 0) return this.getStageById(id);

        values.push(id);
        db.db.prepare(`UPDATE pipeline_stages SET ${updates.join(', ')} WHERE id = ?`).run(...values);

        return this.getStageById(id);
    }

    /**
     * Delete stage (only if no deals in it)
     */
    deleteStage(id) {
        const stage = this.getStageById(id);
        if (!stage) return { success: false, error: 'Stage not found' };

        // Check for deals
        const dealCount = db.db.prepare(`
            SELECT COUNT(*) as count FROM deals WHERE stage = ?
        `).get(stage.name);

        if (dealCount.count > 0) {
            return {
                success: false,
                error: `Cannot delete: ${dealCount.count} deals in this stage`
            };
        }

        db.db.prepare('DELETE FROM pipeline_stages WHERE id = ?').run(id);
        return { success: true };
    }

    /**
     * Reorder stages
     */
    reorderStages(pipeline, stageIds) {
        const stmt = db.db.prepare('UPDATE pipeline_stages SET order_index = ? WHERE id = ?');

        db.db.transaction(() => {
            stageIds.forEach((id, index) => {
                stmt.run(index + 1, id);
            });
        })();

        return this.getStages(pipeline);
    }

    /**
     * Get all pipelines
     */
    getPipelines() {
        return db.db.prepare(`
            SELECT DISTINCT pipeline, COUNT(*) as stage_count
            FROM pipeline_stages
            GROUP BY pipeline
        `).all();
    }

    /**
     * Create new pipeline with default stages
     */
    createPipeline(name, stages = null) {
        const defaultStages = stages || [
            { name: 'Lead', probability: 10, color: '#94A3B8' },
            { name: 'Qualificado', probability: 25, color: '#3B82F6' },
            { name: 'Proposta', probability: 50, color: '#8B5CF6' },
            { name: 'Negociação', probability: 75, color: '#F59E0B' },
            { name: 'Ganho', probability: 100, color: '#10B981', is_won: true },
            { name: 'Perdido', probability: 0, color: '#EF4444', is_lost: true }
        ];

        defaultStages.forEach((stage, index) => {
            this.createStage({
                pipeline: name,
                name: stage.name,
                order_index: index + 1,
                color: stage.color,
                probability: stage.probability,
                is_won: stage.is_won || false,
                is_lost: stage.is_lost || false
            });
        });

        return this.getStages(name);
    }

    /**
     * Delete entire pipeline
     */
    deletePipeline(name) {
        if (name === 'default') {
            return { success: false, error: 'Cannot delete default pipeline' };
        }

        const dealCount = db.db.prepare(`
            SELECT COUNT(*) as count FROM deals WHERE pipeline = ?
        `).get(name);

        if (dealCount.count > 0) {
            return {
                success: false,
                error: `Cannot delete: ${dealCount.count} deals in this pipeline`
            };
        }

        db.db.prepare('DELETE FROM pipeline_stages WHERE pipeline = ?').run(name);
        return { success: true };
    }

    /**
     * Get pipeline summary with deal counts
     */
    getPipelineSummary(pipeline = 'default') {
        return db.db.prepare(`
            SELECT
                ps.*,
                COUNT(d.id) as deal_count,
                COALESCE(SUM(d.value), 0) as total_value
            FROM pipeline_stages ps
            LEFT JOIN deals d ON d.stage = ps.name AND d.pipeline = ps.pipeline
            WHERE ps.pipeline = ?
            GROUP BY ps.id
            ORDER BY ps.order_index ASC
        `).all(pipeline);
    }
}

export default new PipelineManager();
