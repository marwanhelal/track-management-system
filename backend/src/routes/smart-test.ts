import { Router, Request, Response } from 'express';
import { query } from '@/database/connection';
import { SmartRecoveryService } from '@/services/smartRecoveryService';
import { EnhancedWarning } from '@/types';

const router = Router();

// Helper function to persist warnings to database
async function persistWarningsToDatabase(projectId: number, warnings: any[]): Promise<void> {
  try {
    // First, mark old warnings for this project as inactive if they're resolved
    await query(`
      UPDATE warning_analytics
      SET is_active = false
      WHERE project_id = $1
        AND is_active = true
        AND resolved_at IS NULL
    `, [projectId]);

    // Insert new warnings
    for (const warning of warnings) {
      // Map warning type to database enum
      let warningType = 'timeline_deviation';
      switch (warning.type) {
        case 'phase_delay':
        case 'overdue':
        case 'approaching_due_date':
          warningType = 'timeline_deviation';
          break;
        case 'progress_risk':
          warningType = 'capacity_overload';
          break;
        case 'resource_conflict':
          warningType = 'resource_conflict';
          break;
        case 'warning_flag':
          warningType = 'quality_gate_violation';
          break;
        default:
          warningType = 'timeline_deviation';
      }

      // Map severity
      let severity = 'warning';
      if (warning.severity === 'critical') severity = 'critical';
      else if (warning.severity === 'urgent') severity = 'urgent';
      else if (warning.severity === 'warning') severity = 'warning';

      // Calculate risk probability and confidence
      const riskProbability = warning.severity === 'critical' ? 90 : warning.severity === 'urgent' ? 75 : 50;
      const confidenceScore = 85;

      // Prepare warning data JSONB
      const warningData = {
        phase_id: warning.phase_id,
        phase_name: warning.phase_name,
        message: warning.message,
        days_overdue: warning.days_overdue,
        days_until_due: warning.days_until_due,
        planned_end_date: warning.planned_end_date,
        due_date: warning.due_date,
        actual_duration: warning.actual_duration,
        progress_gap: warning.progress_gap,
        expected_progress: warning.expected_progress,
        actual_progress: warning.actual_progress,
        hours_remaining: warning.hours_remaining,
        daily_hours_required: warning.daily_hours_required,
        risk_level: warning.risk_level,
        original_warning_id: warning.id
      };

      // Insert warning into database
      await query(`
        INSERT INTO warning_analytics (
          project_id,
          warning_type,
          severity,
          confidence_score,
          risk_probability,
          predicted_impact_days,
          predicted_impact_cost,
          warning_data,
          is_active,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `, [
        projectId,
        warningType,
        severity,
        confidenceScore,
        riskProbability,
        warning.days_overdue || warning.days_until_due || 0,
        (warning.days_overdue || warning.days_until_due || 0) * 500, // $500/day estimate
        JSON.stringify(warningData),
        true
      ]);
    }

    console.log(`✅ Persisted ${warnings.length} warnings to database for project ${projectId}`);
  } catch (error) {
    console.error('❌ Error persisting warnings to database:', error);
    // Don't throw - we don't want to break the API response if persistence fails
  }
}

// Get all projects for dropdown selection
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const projectsResult = await query(`
      SELECT id, name, status
      FROM projects
      ORDER BY name
    `);

    return res.json({
      success: true,
      data: {
        projects: projectsResult.rows
      },
      message: `Found ${projectsResult.rows.length} projects`
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch projects'
    });
  }
});

// GET /api/v1/smart-test/delays?project_id=123
// Simple delay detection test endpoint - NO AUTH FOR TESTING
router.get('/delays', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
    }

    console.log('🧠 Testing Smart Delay Detection...', { project_id });

    // Get project phases with progress data
    const phasesResult = await query(`
      SELECT
        pp.id, pp.phase_name, pp.status, pp.planned_weeks, pp.planned_start_date, pp.planned_end_date,
        pp.actual_start_date, pp.actual_end_date, pp.warning_flag, pp.phase_order, pp.predicted_hours,
        COALESCE(SUM(wl.hours), 0) as actual_hours_logged
      FROM project_phases pp
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      WHERE pp.project_id = $1
      GROUP BY pp.id, pp.phase_name, pp.status, pp.planned_weeks, pp.planned_start_date, pp.planned_end_date,
               pp.actual_start_date, pp.actual_end_date, pp.warning_flag, pp.phase_order, pp.predicted_hours
      ORDER BY pp.phase_order
    `, [project_id]);

    const phases = phasesResult.rows;
    const warnings = [];
    let totalRiskScore = 0;

    // Performance metrics (calculate early)
    const completedPhases = phases.filter((p: any) => p.status === 'completed').length;
    const inProgressPhases = phases.filter((p: any) => p.status === 'in_progress').length;
    const notStartedPhases = phases.filter((p: any) => p.status === 'not_started').length;
    const completionPercentage = phases.length > 0 ? (completedPhases / phases.length) * 100 : 0;

    for (const phase of phases) {
      // ✅ FIXED: Check for phases that are overdue using database planned_end_date
      if (phase.status === 'in_progress' && phase.planned_end_date) {
        const plannedEnd = new Date(phase.planned_end_date);
        const currentDate = new Date();
        const daysUntilDue = Math.floor((plannedEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        // Phase is overdue if current date is past planned_end_date
        if (daysUntilDue < 0) {
          const daysOverdue = Math.abs(daysUntilDue);
          const actualStart = phase.actual_start_date ? new Date(phase.actual_start_date) : null;
          const daysInProgress = actualStart ?
            Math.floor((currentDate.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24)) : null;

          warnings.push({
            id: `delay-${phase.id}`,
            type: 'phase_delay',
            severity: daysOverdue > 7 ? 'critical' : 'warning',
            phase_id: phase.id, // Add phase_id for recovery service
            phase_name: phase.phase_name,
            message: `Phase "${phase.phase_name}" is ${daysOverdue} days overdue (due date: ${plannedEnd.toLocaleDateString()})`,
            days_overdue: daysOverdue,
            planned_end_date: plannedEnd,
            actual_duration: daysInProgress,
            timestamp: new Date()
          });
          totalRiskScore += daysOverdue > 7 ? 30 : 15;
        }
      }

      // ✅ FIXED: Check for approaching due dates using database planned_end_date
      if (phase.status === 'in_progress' && phase.planned_end_date) {
        const plannedEnd = new Date(phase.planned_end_date);
        const currentDate = new Date();
        const daysUntilDue = Math.floor((plannedEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        // Approaching deadline (within 7 days, but not overdue)
        if (daysUntilDue <= 7 && daysUntilDue >= 0) {
          warnings.push({
            id: `due-${phase.id}`,
            type: 'approaching_due_date',
            severity: daysUntilDue <= 3 ? 'urgent' : 'warning',
            phase_name: phase.phase_name,
            message: `Phase "${phase.phase_name}" is due in ${daysUntilDue} days (${plannedEnd.toLocaleDateString()})`,
            days_until_due: daysUntilDue,
            due_date: plannedEnd,
            timestamp: new Date()
          });
          totalRiskScore += daysUntilDue <= 3 ? 20 : 10;
        }

        // Already overdue (this creates a separate "overdue" type warning in addition to "phase_delay")
        if (daysUntilDue < 0) {
          const daysOverdue = Math.abs(daysUntilDue);
          warnings.push({
            id: `overdue-${phase.id}`,
            type: 'overdue',
            severity: 'critical',
            phase_id: phase.id, // Add phase_id for recovery service
            phase_name: phase.phase_name,
            message: `Phase "${phase.phase_name}" was due ${daysOverdue} days ago`,
            days_overdue: daysOverdue,
            due_date: plannedEnd,
            timestamp: new Date()
          });
          totalRiskScore += 40;
        }
      }

      // Check warning flags
      if (phase.warning_flag) {
        warnings.push({
          id: `warning-${phase.id}`,
          type: 'warning_flag',
          severity: 'warning',
          phase_name: phase.phase_name,
          message: `Phase "${phase.phase_name}" has been flagged for attention`,
          timestamp: new Date()
        });
        totalRiskScore += 10;
      }

      // 🎯 PROFESSIONAL PROGRESS-BASED RISK DETECTION
      // Check for phases approaching deadline with insufficient progress
      if (phase.status === 'in_progress' && phase.actual_start_date && phase.predicted_hours > 0 && phase.planned_end_date) {
        const actualStart = new Date(phase.actual_start_date);
        const plannedEnd = new Date(phase.planned_end_date);
        const plannedStart = phase.planned_start_date ? new Date(phase.planned_start_date) : actualStart;

        const currentDate = new Date();
        const daysUntilDue = Math.floor((plannedEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.floor((currentDate.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));
        const totalPlannedDays = Math.floor((plannedEnd.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24));

        // Only check phases that are 3-7 days from deadline (professional early warning)
        if (daysUntilDue >= 3 && daysUntilDue <= 7 && daysElapsed > 0) {
          // Calculate expected vs actual progress
          const expectedProgressPercent = Math.min(100, (daysElapsed / totalPlannedDays) * 100);
          const actualProgressPercent = Math.min(100, (phase.actual_hours_logged / phase.predicted_hours) * 100);
          const progressGap = expectedProgressPercent - actualProgressPercent;

          // Professional risk thresholds
          let riskLevel = null;
          let severity = 'info';
          let riskScore = 0;

          if (progressGap >= 30) { // Critical: 30%+ behind expected progress
            riskLevel = 'critical';
            severity = 'critical';
            riskScore = 25;
          } else if (progressGap >= 20) { // High: 20%+ behind expected progress
            riskLevel = 'high';
            severity = 'urgent';
            riskScore = 20;
          } else if (progressGap >= 10) { // Medium: 10%+ behind expected progress
            riskLevel = 'medium';
            severity = 'warning';
            riskScore = 15;
          }

          // Generate professional warning if risk detected
          if (riskLevel) {
            const hoursNeeded = Math.max(0, phase.predicted_hours - phase.actual_hours_logged);
            const dailyHoursRequired = Math.ceil(hoursNeeded / Math.max(1, daysUntilDue));

            warnings.push({
              id: `progress-risk-${phase.id}`,
              type: 'progress_risk',
              severity,
              phase_name: phase.phase_name,
              message: `Phase "${phase.phase_name}" is ${progressGap.toFixed(1)}% behind expected progress with ${daysUntilDue} days remaining. ${hoursNeeded} hours still needed (${dailyHoursRequired} hours/day required).`,
              days_until_due: daysUntilDue,
              progress_gap: Math.round(progressGap),
              expected_progress: Math.round(expectedProgressPercent),
              actual_progress: Math.round(actualProgressPercent),
              hours_remaining: hoursNeeded,
              daily_hours_required: dailyHoursRequired,
              risk_level: riskLevel,
              timestamp: new Date()
            });
            totalRiskScore += riskScore;
          }
        }
      }
    }

    // Advanced Health score calculation with multiple factors
    let healthScore = 100;
    healthScore -= totalRiskScore; // Reduce by risk score
    healthScore -= (warnings.length * 5); // Penalty for warnings

    // Bonus for completed phases
    const completionBonus = Math.min(20, completionPercentage * 0.2);
    healthScore += completionBonus;

    // Penalty for stalled projects (no recent activity)
    const hasRecentActivity = phases.some((p: any) =>
      p.actual_start_date &&
      new Date().getTime() - new Date(p.actual_start_date).getTime() < 7 * 24 * 60 * 60 * 1000
    );
    if (!hasRecentActivity && phases.length > 0) {
      healthScore -= 15; // Penalty for no recent activity
    }

    healthScore = Math.max(10, Math.min(100, healthScore)); // Clamp between 10-100

    // Generate intelligent recommendations
    const recommendations = [];
    const criticalWarnings = warnings.filter(w => w.severity === 'critical');
    const urgentWarnings = warnings.filter(w => w.severity === 'urgent');

    if (criticalWarnings.length > 0) {
      recommendations.push({
        id: 'critical-action',
        category: 'immediate',
        priority: 95,
        title: 'Immediate Action Required',
        description: `${criticalWarnings.length} critical issue(s) detected. Schedule emergency review meeting.`,
        action_items: [
          'Review overdue phases immediately',
          'Reallocate resources to critical paths',
          'Update stakeholders on project status'
        ]
      });
    }

    if (urgentWarnings.length > 0) {
      recommendations.push({
        id: 'urgent-planning',
        category: 'planning',
        priority: 80,
        title: 'Strategic Planning Session',
        description: `${urgentWarnings.length} urgent issue(s) require attention within 48 hours.`,
        action_items: [
          'Schedule team meeting within 24 hours',
          'Review resource allocation',
          'Adjust timeline if necessary'
        ]
      });
    }

    // Advanced recommendations based on project patterns
    if (completionPercentage < 30 && inProgressPhases === 0) {
      recommendations.push({
        id: 'project-kickoff',
        category: 'execution',
        priority: 90,
        title: 'Project Execution Needed',
        description: 'Project has not started execution phase. Immediate action required to begin work.',
        action_items: [
          'Activate project team and assign resources',
          'Begin first phase execution',
          'Set up regular progress monitoring'
        ]
      });
    }

    if (completionPercentage > 70 && warnings.length === 0) {
      recommendations.push({
        id: 'project-completion',
        category: 'completion',
        priority: 60,
        title: 'Project Near Completion',
        description: 'Project is performing well and nearing completion. Focus on quality assurance.',
        action_items: [
          'Begin final quality checks',
          'Prepare project closure documentation',
          'Schedule stakeholder review meetings'
        ]
      });
    }

    // Performance-based recommendations
    if (healthScore < 40) {
      recommendations.push({
        id: 'health-recovery',
        category: 'recovery',
        priority: 85,
        title: 'Project Health Recovery Plan',
        description: 'Project health is critically low. Comprehensive recovery plan needed.',
        action_items: [
          'Conduct immediate project health assessment',
          'Identify root causes of delays',
          'Implement corrective action plan'
        ]
      });
    }

    // 🎯 PROFESSIONAL PROGRESS-BASED RECOMMENDATIONS
    const progressRiskWarnings = warnings.filter(w => w.type === 'progress_risk');
    const criticalProgressRisks = progressRiskWarnings.filter(w => w.severity === 'critical');
    const highProgressRisks = progressRiskWarnings.filter(w => w.severity === 'urgent');

    if (criticalProgressRisks.length > 0) {
      recommendations.push({
        id: 'critical-progress-intervention',
        category: 'urgent',
        priority: 95,
        title: 'Critical Progress Intervention Required',
        description: `${criticalProgressRisks.length} phase(s) are critically behind schedule and approaching deadlines. Immediate resource reallocation needed.`,
        action_items: [
          'Immediately assign additional team members to at-risk phases',
          'Consider overtime or extended work hours',
          'Review and streamline phase requirements if possible',
          'Schedule daily progress check-ins',
          'Escalate to project stakeholders immediately'
        ]
      });
    }

    if (highProgressRisks.length > 0) {
      recommendations.push({
        id: 'progress-acceleration-plan',
        category: 'planning',
        priority: 85,
        title: 'Progress Acceleration Plan',
        description: `${highProgressRisks.length} phase(s) require immediate attention to meet deadlines. Enhanced focus and resources needed.`,
        action_items: [
          'Increase daily working hours on affected phases',
          'Remove blockers and non-essential requirements',
          'Assign senior team members to accelerate progress',
          'Implement daily progress tracking and reporting',
          'Consider parallel work streams where possible'
        ]
      });
    }

    if (progressRiskWarnings.length > 0) {
      const totalHoursNeeded = progressRiskWarnings.reduce((sum: any, w: any) => sum + (w.hours_remaining || 0), 0);
      recommendations.push({
        id: 'resource-optimization',
        category: 'resource',
        priority: 75,
        title: 'Resource Optimization Strategy',
        description: `${totalHoursNeeded} additional hours needed across ${progressRiskWarnings.length} at-risk phases. Strategic resource management required.`,
        action_items: [
          'Redistribute team members from ahead-of-schedule phases',
          'Consider bringing in temporary contractors or freelancers',
          'Negotiate deadline extensions if quality cannot be compromised',
          'Implement productivity enhancement tools and processes',
          'Schedule progress review meetings every 48 hours'
        ]
      });
    }

    // ✅ ENHANCED: Generate intelligent recovery suggestions using SmartRecoveryService
    // Convert critical warnings to EnhancedWarning format for recovery service
    const enhancedRecoverySuggestions: any[] = [];

    for (const warning of criticalWarnings.slice(0, 3)) { // Process top 3 critical warnings
      try {
        // Map warning type to recovery service type
        let warningType = 'timeline_deviation'; // default
        if (warning.type === 'phase_delay' || warning.type === 'overdue') {
          warningType = 'timeline_deviation';
        } else if (warning.type === 'progress_risk') {
          warningType = 'capacity_overload';
        }

        // Create EnhancedWarning for recovery service
        const enhancedWarning: EnhancedWarning = {
          id: warning.id,
          type: warningType,
          severity: warning.severity === 'critical' ? 'critical' : 'urgent',
          title: warning.phase_name || 'Project Issue',
          message: warning.message,
          context: `Phase: ${warning.phase_name}, Days overdue: ${warning.days_overdue || 0}`,
          confidence_score: 85,
          risk_probability: 70,
          predicted_impact: {
            days: warning.days_overdue || warning.days_until_due || 7,
            cost: (warning.days_overdue || 7) * 500, // Estimate $500/day
            resources_affected: 2
          },
          cascade_effects: [],
          recovery_suggestions: [],
          project_id: parseInt(project_id as string),
          phase_ids: warning.phase_id ? [warning.phase_id] : [],
          affected_engineers: [],
          action_required: true,
          escalation_level: warning.severity === 'critical' ? 3 : 2,
          timestamp: new Date(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expires in 7 days
        };

        // Generate contextual recovery suggestions
        const recoverySuggestions = await SmartRecoveryService.generateContextualRecovery(
          enhancedWarning,
          { phases, completionPercentage, healthScore }
        );

        // Convert recovery suggestions to recommendation format
        recoverySuggestions.slice(0, 2).forEach((suggestion, idx) => {
          enhancedRecoverySuggestions.push({
            id: `recovery-${warning.id}-${idx}`,
            category: 'recovery',
            priority: 90 - (idx * 5),
            title: suggestion.title,
            description: suggestion.description,
            action_items: suggestion.implementation_steps || [],
            effort_required: suggestion.effort_required,
            success_probability: suggestion.success_probability,
            estimated_recovery_days: suggestion.estimated_recovery_days,
            risks: suggestion.risks || []
          });
        });
      } catch (error) {
        console.error('Error generating recovery suggestion:', error);
      }
    }

    // Merge enhanced suggestions with existing recommendations
    const allRecommendations = [...recommendations, ...enhancedRecoverySuggestions]
      .sort((a, b) => b.priority - a.priority) // Sort by priority
      .slice(0, 10); // Keep top 10

    // ✅ NEW: Persist warnings to database for historical tracking
    await persistWarningsToDatabase(parseInt(project_id as string), warnings);

    // Advanced trend analysis
    const projectVelocity = completionPercentage > 0 ?
      Math.round((completedPhases / Math.max(1, (new Date().getTime() - new Date(phases[0]?.planned_start_date || new Date()).getTime()) / (1000 * 60 * 60 * 24 * 7)))) : 0;

    // Predictive analytics
    const estimatedCompletionWeeks = projectVelocity > 0 ?
      Math.round((phases.length - completedPhases) / Math.max(0.1, projectVelocity)) : null;

    const response = {
      success: true,
      data: {
        project_id: parseInt(project_id as string),
        total_phases: phases.length,
        warnings,
        total_warnings: warnings.length,
        total_risk_score: Math.min(totalRiskScore, 100),
        health_score: Math.round(healthScore),
        completion_percentage: Math.round(completionPercentage),
        project_velocity: projectVelocity,
        estimated_completion_weeks: estimatedCompletionWeeks,
        analysis_timestamp: new Date(),
        summary: {
          delays: warnings.filter(w => w.type === 'phase_delay').length,
          approaching_due_dates: warnings.filter(w => w.type === 'approaching_due_date').length,
          overdue: warnings.filter(w => w.type === 'overdue').length,
          flagged: warnings.filter(w => w.type === 'warning_flag').length
        },
        performance_metrics: {
          completed_phases: completedPhases,
          in_progress_phases: inProgressPhases,
          not_started_phases: notStartedPhases,
          completion_percentage: Math.round(completionPercentage)
        },
        recommendations: allRecommendations,
        risk_assessment: {
          level: totalRiskScore >= 70 ? 'critical' : totalRiskScore >= 40 ? 'high' : totalRiskScore >= 20 ? 'medium' : 'low',
          description: totalRiskScore >= 70 ? 'Immediate attention required' :
                      totalRiskScore >= 40 ? 'Action needed soon' :
                      totalRiskScore >= 20 ? 'Monitor closely' : 'On track',
          mitigation_required: totalRiskScore >= 40
        }
      },
      message: `Professional Smart Warning Analysis completed. Risk Score: ${totalRiskScore}% • Health Score: ${Math.round(healthScore)}% • Found ${warnings.length} issue(s) across ${phases.length} phases.`
    };

    console.log(`✅ Smart Delay Detection Complete - Risk Score: ${totalRiskScore}`, {
      project_id,
      warnings: warnings.length,
      types: response.data.summary
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Smart delay detection error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze phase delays'
    });
  }
});

// GET /api/v1/smart-test/warnings/history?project_id=123
// Retrieve warning history for a project
router.get('/warnings/history', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
    }

    console.log('📊 Fetching warning history...', { project_id });

    // Get all warnings for this project with resolution info
    const warningsResult = await query(`
      SELECT
        wa.*,
        u.name as resolved_by_name,
        wa.created_at::date as warning_date
      FROM warning_analytics wa
      LEFT JOIN users u ON wa.resolved_by = u.id
      WHERE wa.project_id = $1
      ORDER BY wa.created_at DESC
      LIMIT 100
    `, [project_id]);

    const warnings = warningsResult.rows;

    // Group warnings by date for trending
    const warningsByDate: Record<string, any[]> = {};
    warnings.forEach((warning: any) => {
      const dateKey = warning.warning_date;
      if (!warningsByDate[dateKey]) {
        warningsByDate[dateKey] = [];
      }
      warningsByDate[dateKey].push(warning);
    });

    // Calculate statistics
    const totalWarnings = warnings.length;
    const activeWarnings = warnings.filter((w: any) => w.is_active).length;
    const resolvedWarnings = warnings.filter((w: any) => w.resolved_at !== null).length;
    const criticalWarnings = warnings.filter((w: any) => w.severity === 'critical').length;

    // Get warning trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendResult = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count
      FROM warning_analytics
      WHERE project_id = $1
        AND created_at >= $2
      GROUP BY DATE(created_at)
      ORDER BY date
    `, [project_id, sevenDaysAgo]);

    return res.json({
      success: true,
      data: {
        warnings,
        statistics: {
          total: totalWarnings,
          active: activeWarnings,
          resolved: resolvedWarnings,
          critical: criticalWarnings,
          resolution_rate: totalWarnings > 0 ? Math.round((resolvedWarnings / totalWarnings) * 100) : 0
        },
        trend: trendResult.rows,
        warnings_by_date: warningsByDate
      },
      message: `Found ${totalWarnings} warnings for project ${project_id}`
    });
  } catch (error) {
    console.error('❌ Error fetching warning history:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch warning history'
    });
  }
});

// PUT /api/v1/smart-test/warnings/:id/resolve
// Mark a warning as resolved
router.put('/warnings/:id/resolve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolution_note, resolved_by } = req.body;

    console.log('✅ Resolving warning...', { id, resolved_by });

    // Update warning as resolved
    const result = await query(`
      UPDATE warning_analytics
      SET
        resolved_at = NOW(),
        resolved_by = $1,
        resolution_note = $2,
        is_active = false,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [resolved_by, resolution_note, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Warning not found'
      });
    }

    return res.json({
      success: true,
      data: {
        warning: result.rows[0]
      },
      message: 'Warning marked as resolved'
    });
  } catch (error) {
    console.error('❌ Error resolving warning:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to resolve warning'
    });
  }
});

// GET /api/v1/smart-test/warnings/stats?project_id=123
// Get warning statistics and trends
router.get('/warnings/stats', async (req: Request, res: Response) => {
  try {
    const { project_id } = req.query;

    if (!project_id) {
      return res.status(400).json({
        success: false,
        error: 'Project ID is required'
      });
    }

    // Get warning type distribution
    const typeDistribution = await query(`
      SELECT
        warning_type,
        COUNT(*) as count,
        AVG(risk_probability) as avg_risk
      FROM warning_analytics
      WHERE project_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY warning_type
      ORDER BY count DESC
    `, [project_id]);

    // Get severity distribution
    const severityDistribution = await query(`
      SELECT
        severity,
        COUNT(*) as count
      FROM warning_analytics
      WHERE project_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY severity
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'urgent' THEN 2
          WHEN 'warning' THEN 3
          WHEN 'advisory' THEN 4
        END
    `, [project_id]);

    // Get resolution time stats
    const resolutionStats = await query(`
      SELECT
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::DECIMAL(10,2) as avg_resolution_hours,
        MIN(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::DECIMAL(10,2) as min_resolution_hours,
        MAX(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::DECIMAL(10,2) as max_resolution_hours
      FROM warning_analytics
      WHERE project_id = $1
        AND resolved_at IS NOT NULL
    `, [project_id]);

    return res.json({
      success: true,
      data: {
        type_distribution: typeDistribution.rows,
        severity_distribution: severityDistribution.rows,
        resolution_stats: resolutionStats.rows[0] || {
          avg_resolution_hours: null,
          min_resolution_hours: null,
          max_resolution_hours: null
        }
      },
      message: 'Warning statistics retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching warning stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch warning statistics'
    });
  }
});

export default router;