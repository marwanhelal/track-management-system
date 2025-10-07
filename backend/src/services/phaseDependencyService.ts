import { query, transaction } from '@/database/connection';
import { PhaseDependency, CascadeEffect } from '@/types';

// Professional Phase Dependency Service
// Connected intelligence for phase relationships and cascade analysis

export class PhaseDependencyService {

  // Auto-generate phase dependencies based on project phase sequence
  static async generateAutomaticDependencies(projectId: number): Promise<PhaseDependency[]> {
    try {
      console.log('🔗 Generating automatic phase dependencies for project:', projectId);

      // Get all phases for the project in order
      const phasesResult = await query(`
        SELECT id, phase_order, phase_name, planned_weeks, predicted_hours
        FROM project_phases
        WHERE project_id = $1
        ORDER BY phase_order ASC
      `, [projectId]);

      const phases = phasesResult.rows;
      const dependencies: PhaseDependency[] = [];

      // Generate finish-to-start dependencies between consecutive phases
      for (let i = 0; i < phases.length - 1; i++) {
        const currentPhase = phases[i];
        const nextPhase = phases[i + 1];

        // Check if dependency already exists
        const existingDep = await query(`
          SELECT id FROM phase_dependencies
          WHERE predecessor_phase_id = $1 AND successor_phase_id = $2
        `, [currentPhase.id, nextPhase.id]);

        if (existingDep.rows.length === 0) {
          // Create dependency
          const dependencyResult = await query(`
            INSERT INTO phase_dependencies (
              project_id, predecessor_phase_id, successor_phase_id,
              dependency_type, lag_days, is_critical_path, weight_factor
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
          `, [
            projectId,
            currentPhase.id,
            nextPhase.id,
            'finish_to_start',
            0, // No lag by default
            true, // All sequential dependencies are on critical path
            1.0 // Default weight
          ]);

          dependencies.push(dependencyResult.rows[0]);
          console.log(`✅ Created dependency: ${currentPhase.phase_name} → ${nextPhase.phase_name}`);
        }
      }

      return dependencies;
    } catch (error) {
      console.error('❌ Error generating automatic dependencies:', error);
      throw error;
    }
  }

  // Analyze cascade effects when a phase is delayed
  static async analyzeCascadeEffects(
    phaseId: number,
    delayDays: number,
    impactType: 'delay' | 'cost' | 'resource' | 'quality' = 'delay'
  ): Promise<CascadeEffect[]> {
    try {
      console.log('🌊 Analyzing cascade effects for phase:', phaseId, 'delay:', delayDays);

      const cascadeEffects: CascadeEffect[] = [];

      // Get all phases that depend on this phase (direct and indirect)
      const dependentPhasesResult = await query(`
        WITH RECURSIVE phase_cascade AS (
          -- Base case: direct dependencies
          SELECT
            pd.successor_phase_id as phase_id,
            pp.phase_name,
            pd.dependency_type,
            pd.weight_factor,
            1 as depth_level,
            pd.lag_days
          FROM phase_dependencies pd
          JOIN project_phases pp ON pd.successor_phase_id = pp.id
          WHERE pd.predecessor_phase_id = $1

          UNION ALL

          -- Recursive case: indirect dependencies
          SELECT
            pd.successor_phase_id as phase_id,
            pp.phase_name,
            pd.dependency_type,
            pd.weight_factor,
            pc.depth_level + 1,
            pd.lag_days
          FROM phase_dependencies pd
          JOIN project_phases pp ON pd.successor_phase_id = pp.id
          JOIN phase_cascade pc ON pd.predecessor_phase_id = pc.phase_id
          WHERE pc.depth_level < 5 -- Limit recursion depth
        )
        SELECT * FROM phase_cascade
        ORDER BY depth_level ASC, phase_id ASC
      `, [phaseId]);

      for (const dependent of dependentPhasesResult.rows) {
        // Calculate impact magnitude based on dependency type and depth
        let impactMagnitude = delayDays * dependent.weight_factor;

        // Reduce impact with each level of separation
        impactMagnitude = impactMagnitude * Math.pow(0.8, dependent.depth_level - 1);

        // Calculate propagation probability (higher for direct dependencies)
        const propagationProbability = Math.max(20, 90 - (dependent.depth_level - 1) * 15);

        // Determine mitigation urgency based on impact
        let mitigationUrgency: 'immediate' | 'within_24h' | 'within_week' | 'monitor' = 'monitor';
        if (impactMagnitude > 5 && dependent.depth_level <= 2) {
          mitigationUrgency = 'immediate';
        } else if (impactMagnitude > 3 && dependent.depth_level <= 3) {
          mitigationUrgency = 'within_24h';
        } else if (impactMagnitude > 1) {
          mitigationUrgency = 'within_week';
        }

        cascadeEffects.push({
          affected_phase_id: dependent.phase_id,
          phase_name: dependent.phase_name,
          impact_type: impactType,
          impact_magnitude: Math.round(impactMagnitude * 100) / 100, // Round to 2 decimal places
          propagation_probability: Math.round(propagationProbability),
          mitigation_urgency: mitigationUrgency
        });
      }

      console.log(`🎯 Found ${cascadeEffects.length} cascade effects`);
      return cascadeEffects;
    } catch (error) {
      console.error('❌ Error analyzing cascade effects:', error);
      return [];
    }
  }

  // Calculate critical path for a project
  static async calculateCriticalPath(projectId: number): Promise<{
    criticalPhases: number[],
    totalDuration: number,
    floatAnalysis: Record<string, number>
  }> {
    try {
      console.log('🎯 Calculating critical path for project:', projectId);

      // Get all phases with their durations and dependencies
      const phasesResult = await query(`
        SELECT
          pp.id,
          pp.phase_name,
          pp.planned_weeks,
          pp.phase_order,
          pp.status,
          array_agg(pd.predecessor_phase_id) FILTER (WHERE pd.predecessor_phase_id IS NOT NULL) as predecessors
        FROM project_phases pp
        LEFT JOIN phase_dependencies pd ON pp.id = pd.successor_phase_id
        WHERE pp.project_id = $1
        GROUP BY pp.id, pp.phase_name, pp.planned_weeks, pp.phase_order, pp.status
        ORDER BY pp.phase_order ASC
      `, [projectId]);

      const phases = phasesResult.rows;
      const phaseMap = new Map(phases.map((p: any) => [p.id, p]));

      // Forward pass - calculate early start and early finish
      const earlyStart = new Map<number, number>();
      const earlyFinish = new Map<number, number>();

      for (const phase of phases) {
        let maxPredecessorFinish = 0;

        if (phase.predecessors && phase.predecessors[0] !== null) {
          for (const predId of phase.predecessors) {
            const predFinish = earlyFinish.get(predId) || 0;
            maxPredecessorFinish = Math.max(maxPredecessorFinish, predFinish);
          }
        }

        const es = maxPredecessorFinish;
        const ef = es + (phase.planned_weeks * 7); // Convert weeks to days

        earlyStart.set(phase.id, es);
        earlyFinish.set(phase.id, ef);
      }

      // Project total duration is the maximum early finish
      const totalDuration = Math.max(...Array.from(earlyFinish.values()));

      // Backward pass - calculate late start and late finish
      const lateFinish = new Map<number, number>();
      const lateStart = new Map<number, number>();

      // Initialize all phases with project end time
      for (const phase of phases) {
        lateFinish.set(phase.id, totalDuration);
      }

      // Work backwards through phases
      for (let i = phases.length - 1; i >= 0; i--) {
        const phase = phases[i];

        // Find all successors of this phase
        const successors = phases.filter((p: any) =>
          p.predecessors && p.predecessors.includes(phase.id)
        );

        if (successors.length > 0) {
          const minSuccessorStart = Math.min(
            ...successors.map((s: any) => lateStart.get(s.id) || totalDuration)
          );
          lateFinish.set(phase.id, minSuccessorStart);
        }

        const lf = lateFinish.get(phase.id) || totalDuration;
        const ls = lf - (phase.planned_weeks * 7);
        lateStart.set(phase.id, ls);
      }

      // Calculate float and identify critical path
      const criticalPhases: number[] = [];
      const floatAnalysis: Record<string, number> = {};

      for (const phase of phases) {
        const es = earlyStart.get(phase.id) || 0;
        const ls = lateStart.get(phase.id) || 0;
        const totalFloat = ls - es;

        floatAnalysis[phase.id.toString()] = totalFloat;

        // Phase is critical if total float is zero (or very close to zero)
        if (totalFloat <= 0.1) {
          criticalPhases.push(phase.id);

          // Mark as critical in database
          await query(`
            UPDATE phase_dependencies
            SET is_critical_path = true
            WHERE predecessor_phase_id = $1 OR successor_phase_id = $1
          `, [phase.id]);
        }
      }

      console.log(`🎯 Critical path calculated: ${criticalPhases.length} critical phases, ${totalDuration} days total`);

      return {
        criticalPhases,
        totalDuration,
        floatAnalysis
      };
    } catch (error) {
      console.error('❌ Error calculating critical path:', error);
      throw error;
    }
  }

  // Get all dependencies for a project
  static async getProjectDependencies(projectId: number): Promise<PhaseDependency[]> {
    try {
      const result = await query(`
        SELECT
          pd.*,
          pred.phase_name as predecessor_name,
          succ.phase_name as successor_name
        FROM phase_dependencies pd
        JOIN project_phases pred ON pd.predecessor_phase_id = pred.id
        JOIN project_phases succ ON pd.successor_phase_id = succ.id
        WHERE pd.project_id = $1
        ORDER BY pred.phase_order, succ.phase_order
      `, [projectId]);

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting project dependencies:', error);
      throw error;
    }
  }

  // Create custom dependency
  static async createCustomDependency(
    projectId: number,
    predecessorPhaseId: number,
    successorPhaseId: number,
    dependencyType: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish',
    lagDays: number = 0,
    weightFactor: number = 1.0
  ): Promise<PhaseDependency> {
    try {
      console.log('🔗 Creating custom dependency:', {
        predecessorPhaseId,
        successorPhaseId,
        dependencyType,
        lagDays
      });

      const result = await query(`
        INSERT INTO phase_dependencies (
          project_id, predecessor_phase_id, successor_phase_id,
          dependency_type, lag_days, is_critical_path, weight_factor
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        projectId,
        predecessorPhaseId,
        successorPhaseId,
        dependencyType,
        lagDays,
        false, // Will be calculated by critical path analysis
        weightFactor
      ]);

      console.log('✅ Custom dependency created successfully');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating custom dependency:', error);
      throw error;
    }
  }

  // Delete dependency
  static async deleteDependency(dependencyId: number): Promise<void> {
    try {
      await query(`
        DELETE FROM phase_dependencies
        WHERE id = $1
      `, [dependencyId]);

      console.log('✅ Dependency deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting dependency:', error);
      throw error;
    }
  }

  // Optimize project schedule using dependency analysis
  static async optimizeSchedule(projectId: number): Promise<{
    recommendations: string[],
    potentialTimeSavings: number,
    riskFactors: string[]
  }> {
    try {
      console.log('🚀 Optimizing schedule for project:', projectId);

      const recommendations: string[] = [];
      const riskFactors: string[] = [];
      let potentialTimeSavings = 0;

      // Get critical path analysis
      const criticalPath = await this.calculateCriticalPath(projectId);

      // Get phases with high float (potential for parallel execution)
      const highFloatPhases = Object.entries(criticalPath.floatAnalysis)
        .filter(([_, float]) => float > 5) // More than 5 days float
        .map(([phaseId, float]) => ({ phaseId: parseInt(phaseId), float }));

      if (highFloatPhases.length > 0) {
        recommendations.push(`Consider parallel execution for ${highFloatPhases.length} phases with available float time`);
        potentialTimeSavings += highFloatPhases.reduce((sum, p) => sum + p.float, 0) * 0.3; // Conservative 30% savings
      }

      // Identify bottleneck phases (critical path with high duration)
      const bottlenecks = await query(`
        SELECT pp.id, pp.phase_name, pp.planned_weeks
        FROM project_phases pp
        JOIN phase_dependencies pd ON pp.id = pd.predecessor_phase_id OR pp.id = pd.successor_phase_id
        WHERE pp.project_id = $1 AND pd.is_critical_path = true AND pp.planned_weeks > 3
        GROUP BY pp.id, pp.phase_name, pp.planned_weeks
        ORDER BY pp.planned_weeks DESC
      `, [projectId]);

      if (bottlenecks.rows.length > 0) {
        recommendations.push(`Focus resource allocation on ${bottlenecks.rows.length} bottleneck phases to reduce critical path`);
        riskFactors.push('High-duration phases on critical path increase project risk');
      }

      // Check for resource conflicts
      const resourceConflicts = await query(`
        SELECT COUNT(DISTINCT pp.id) as conflict_count
        FROM project_phases pp
        JOIN work_logs wl ON pp.id = wl.phase_id
        WHERE pp.project_id = $1 AND pp.status = 'in_progress'
        GROUP BY wl.engineer_id
        HAVING COUNT(DISTINCT pp.id) > 1
      `, [projectId]);

      if (resourceConflicts.rows.length > 0) {
        recommendations.push('Resolve resource conflicts by redistributing workload or adjusting phase timing');
        riskFactors.push('Resource conflicts may cause delays and reduce quality');
      }

      console.log('✅ Schedule optimization complete:', {
        recommendations: recommendations.length,
        potentialTimeSavings: Math.round(potentialTimeSavings)
      });

      return {
        recommendations,
        potentialTimeSavings: Math.round(potentialTimeSavings),
        riskFactors
      };
    } catch (error) {
      console.error('❌ Error optimizing schedule:', error);
      throw error;
    }
  }
}