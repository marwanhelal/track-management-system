import { Router, Request, Response } from 'express';
import { query } from '@/database/connection';

const router = Router();

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
        pp.id, pp.phase_name, pp.status, pp.planned_weeks, pp.planned_start_date,
        pp.actual_start_date, pp.warning_flag, pp.phase_order, pp.predicted_hours,
        COALESCE(SUM(wl.hours), 0) as actual_hours_logged
      FROM project_phases pp
      LEFT JOIN work_logs wl ON pp.id = wl.phase_id
      WHERE pp.project_id = $1
      GROUP BY pp.id, pp.phase_name, pp.status, pp.planned_weeks, pp.planned_start_date,
               pp.actual_start_date, pp.warning_flag, pp.phase_order, pp.predicted_hours
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
      // Check for phases that are overdue
      if (phase.status === 'in_progress' && phase.actual_start_date) {
        const plannedDuration = phase.planned_weeks * 7; // Convert weeks to days
        const actualStart = new Date(phase.actual_start_date);
        const currentDate = new Date();
        const daysInProgress = Math.floor((currentDate.getTime() - actualStart.getTime()) / (1000 * 60 * 60 * 24));

        if (daysInProgress > plannedDuration) {
          const daysOverdue = daysInProgress - plannedDuration;
          warnings.push({
            id: `delay-${phase.id}`,
            type: 'phase_delay',
            severity: daysOverdue > 7 ? 'critical' : 'warning',
            phase_name: phase.phase_name,
            message: `Phase "${phase.phase_name}" is ${daysOverdue} days overdue`,
            days_overdue: daysOverdue,
            planned_duration: plannedDuration,
            actual_duration: daysInProgress,
            timestamp: new Date()
          });
          totalRiskScore += daysOverdue > 7 ? 30 : 15;
        }
      }

      // Check for approaching due dates
      if (phase.status === 'in_progress' && phase.planned_start_date) {
        const plannedStart = new Date(phase.planned_start_date);
        const plannedEnd = new Date(plannedStart);
        plannedEnd.setDate(plannedStart.getDate() + (phase.planned_weeks * 7));

        const currentDate = new Date();
        const daysUntilDue = Math.floor((plannedEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

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

        // Already overdue
        if (daysUntilDue < 0) {
          warnings.push({
            id: `overdue-${phase.id}`,
            type: 'overdue',
            severity: 'critical',
            phase_name: phase.phase_name,
            message: `Phase "${phase.phase_name}" was due ${Math.abs(daysUntilDue)} days ago`,
            days_overdue: Math.abs(daysUntilDue),
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
      if (phase.status === 'in_progress' && phase.actual_start_date && phase.predicted_hours > 0) {
        const plannedStart = new Date(phase.actual_start_date);
        const plannedEnd = new Date(plannedStart);
        plannedEnd.setDate(plannedStart.getDate() + (phase.planned_weeks * 7));

        const currentDate = new Date();
        const daysUntilDue = Math.floor((plannedEnd.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysElapsed = Math.floor((currentDate.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24));
        const totalPlannedDays = phase.planned_weeks * 7;

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
        recommendations,
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

export default router;