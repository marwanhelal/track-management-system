// Simplified Resource Conflict Service for database testing
import { query } from '@/database/connection';

export interface ResourceConflict {
  id: string;
  engineer_id: string;
  project_id: string;
  phase_id: string;
  conflict_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  created_at: Date;
}

export class ResourceConflictService {
  static async detectConflicts(projectId: string): Promise<ResourceConflict[]> {
    try {
      // Get project phases
      const phasesResult = await query(`
        SELECT * FROM project_phases WHERE project_id = $1
      `, [projectId]);

      const conflicts: ResourceConflict[] = [];

      // Simple conflict detection logic
      const phases = phasesResult.rows;

      for (const phase of phases) {
        if (phase.status === 'in_progress' && !phase.actual_start_date) {
          conflicts.push({
            id: `conflict-${phase.id}`,
            engineer_id: 'unknown',
            project_id: projectId,
            phase_id: phase.id,
            conflict_type: 'schedule_mismatch',
            severity: 'medium',
            description: `Phase ${phase.phase_name} is marked as in progress but has no start date`,
            created_at: new Date()
          });
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error detecting conflicts:', error);
      return [];
    }
  }

  static async getResourceCapacity(engineerId: string): Promise<number> {
    try {
      // Simple capacity calculation
      return 40; // 40 hours per week capacity
    } catch (error) {
      console.error('Error getting resource capacity:', error);
      return 0;
    }
  }
}