import { query } from '@/database/connection';
import { RecoverySuggestion, EnhancedWarning, ProjectPhase } from '@/types';
import { PhaseDependencyService } from './phaseDependencyService';
import { ResourceConflictService } from './resourceConflictService';

// Smart Recovery Suggestion Engine
// AI-powered recovery strategy generation with contextual intelligence

export class SmartRecoveryService {

  // Generate intelligent recovery suggestions based on warning context
  static async generateContextualRecovery(
    warning: EnhancedWarning,
    projectContext?: any
  ): Promise<RecoverySuggestion[]> {
    try {
      console.log('🧠 Generating contextual recovery suggestions...', { warningType: warning.type });

      const suggestions: RecoverySuggestion[] = [];

      switch (warning.type) {
        case 'timeline_deviation':
          suggestions.push(...await this.generateTimelineRecovery(warning, projectContext));
          break;
        case 'budget_overrun':
          suggestions.push(...await this.generateBudgetRecovery(warning, projectContext));
          break;
        case 'resource_conflict':
          suggestions.push(...await this.generateResourceRecovery(warning, projectContext));
          break;
        case 'quality_gate_violation':
          suggestions.push(...await this.generateQualityRecovery(warning, projectContext));
          break;
        case 'client_approval_delay':
          suggestions.push(...await this.generateApprovalRecovery(warning, projectContext));
          break;
        case 'dependency_blockage':
          suggestions.push(...await this.generateDependencyRecovery(warning, projectContext));
          break;
        case 'skill_gap':
          suggestions.push(...await this.generateSkillRecovery(warning, projectContext));
          break;
        case 'capacity_overload':
          suggestions.push(...await this.generateCapacityRecovery(warning, projectContext));
          break;
        case 'early_access_abuse':
          suggestions.push(...await this.generateEarlyAccessRecovery(warning, projectContext));
          break;
      }

      // Add universal recovery strategies
      suggestions.push(...await this.generateUniversalStrategies(warning, projectContext));

      // Rank and optimize suggestions
      return this.rankAndOptimizeSuggestions(suggestions, warning);
    } catch (error) {
      console.error('❌ Error generating contextual recovery:', error);
      return [];
    }
  }

  // Timeline deviation recovery strategies
  private static async generateTimelineRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    // Analyze phase dependencies for parallel execution opportunities
    if (warning.phase_ids.length > 0) {
      const dependencies = await PhaseDependencyService.getProjectDependencies(warning.project_id);
      const parallelOpportunities = this.identifyParallelExecutionOpportunities(dependencies, warning.phase_ids);

      if (parallelOpportunities.length > 0) {
        suggestions.push({
          id: `parallel_execution_${Date.now()}`,
          title: 'Parallel Phase Execution',
          description: `Execute ${parallelOpportunities.length} phases in parallel to recover ${Math.ceil(warning.predicted_impact.days * 0.4)} days`,
          strategy_type: 'parallel_execution',
          effort_required: 'high',
          success_probability: 75,
          estimated_recovery_days: Math.ceil(warning.predicted_impact.days * 0.4),
          cost_impact: parallelOpportunities.length * 1000,
          prerequisites: ['Resource availability', 'Dependency analysis', 'Risk assessment'],
          implementation_steps: [
            'Verify phase independence',
            'Allocate additional resources',
            'Set up parallel tracking',
            'Monitor progress closely'
          ],
          risks: ['Resource conflicts', 'Quality impact', 'Coordination overhead']
        });
      }
    }

    // Resource acceleration strategy
    suggestions.push({
      id: `resource_acceleration_${Date.now()}`,
      title: 'Resource Acceleration',
      description: 'Add additional skilled resources to accelerate critical path activities',
      strategy_type: 'resource_reallocation',
      effort_required: 'high',
      success_probability: 80,
      estimated_recovery_days: Math.ceil(warning.predicted_impact.days * 0.6),
      cost_impact: warning.predicted_impact.days * 600, // Estimated daily cost
      prerequisites: ['Available resources', 'Budget approval', 'Onboarding plan'],
      implementation_steps: [
        'Identify resource requirements',
        'Source qualified personnel',
        'Execute rapid onboarding',
        'Integrate with existing team'
      ],
      risks: ['Onboarding time', 'Team dynamics', 'Knowledge transfer']
    });

    // Scope optimization
    suggestions.push({
      id: `scope_optimization_${Date.now()}`,
      title: 'Scope Optimization',
      description: 'Defer non-critical features to future phases to meet core deadlines',
      strategy_type: 'scope_modification',
      effort_required: 'medium',
      success_probability: 90,
      estimated_recovery_days: Math.ceil(warning.predicted_impact.days * 0.7),
      cost_impact: -2000, // Cost savings
      prerequisites: ['Stakeholder approval', 'Feature prioritization', 'Scope documentation'],
      implementation_steps: [
        'Analyze feature criticality',
        'Negotiate scope changes',
        'Update project plan',
        'Communicate changes'
      ],
      risks: ['Stakeholder satisfaction', 'Future scope creep', 'Quality perception']
    });

    return suggestions;
  }

  // Budget overrun recovery strategies
  private static async generateBudgetRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    // Cost optimization through efficiency improvements
    suggestions.push({
      id: `efficiency_optimization_${Date.now()}`,
      title: 'Process Efficiency Optimization',
      description: 'Implement efficiency measures to reduce labor costs and improve productivity',
      strategy_type: 'resource_reallocation',
      effort_required: 'medium',
      success_probability: 85,
      estimated_recovery_days: 7,
      cost_impact: -warning.predicted_impact.cost * 0.3,
      prerequisites: ['Process analysis', 'Tool implementation', 'Team training'],
      implementation_steps: [
        'Identify efficiency bottlenecks',
        'Implement automation tools',
        'Optimize workflows',
        'Monitor productivity metrics'
      ],
      risks: ['Implementation resistance', 'Short-term productivity dip', 'Tool adoption']
    });

    // Budget reallocation from other projects
    suggestions.push({
      id: `budget_reallocation_${Date.now()}`,
      title: 'Strategic Budget Reallocation',
      description: 'Reallocate budget from lower-priority initiatives to critical project needs',
      strategy_type: 'resource_reallocation',
      effort_required: 'low',
      success_probability: 70,
      estimated_recovery_days: 3,
      cost_impact: 0, // Net neutral
      prerequisites: ['Executive approval', 'Portfolio analysis', 'Impact assessment'],
      implementation_steps: [
        'Analyze project portfolio',
        'Identify reallocation opportunities',
        'Get stakeholder approval',
        'Execute budget transfer'
      ],
      risks: ['Other project delays', 'Stakeholder conflicts', 'Resource disruption']
    });

    return suggestions;
  }

  // Resource conflict recovery strategies
  private static async generateResourceRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    // Cross-training for skill flexibility
    suggestions.push({
      id: `cross_training_${Date.now()}`,
      title: 'Rapid Cross-Training Program',
      description: 'Implement intensive cross-training to create resource flexibility and reduce bottlenecks',
      strategy_type: 'resource_reallocation',
      effort_required: 'high',
      success_probability: 80,
      estimated_recovery_days: 14,
      cost_impact: 5000,
      prerequisites: ['Training materials', 'Mentor availability', 'Time allocation'],
      implementation_steps: [
        'Identify skill gaps',
        'Design training program',
        'Pair with experienced mentors',
        'Validate competency'
      ],
      risks: ['Training time investment', 'Competency validation', 'Quality consistency']
    });

    // Contractor augmentation
    suggestions.push({
      id: `contractor_augmentation_${Date.now()}`,
      title: 'Specialized Contractor Engagement',
      description: 'Bring in specialized contractors to handle specific skill requirements',
      strategy_type: 'resource_reallocation',
      effort_required: 'medium',
      success_probability: 85,
      estimated_recovery_days: 5,
      cost_impact: warning.predicted_impact.cost * 1.2,
      prerequisites: ['Contractor sourcing', 'Budget approval', 'Security clearance'],
      implementation_steps: [
        'Define skill requirements',
        'Source qualified contractors',
        'Execute contracting process',
        'Integrate with team'
      ],
      risks: ['Contractor availability', 'Knowledge retention', 'Integration challenges']
    });

    return suggestions;
  }

  // Quality gate violation recovery
  private static async generateQualityRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    suggestions.push({
      id: `quality_recovery_${Date.now()}`,
      title: 'Intensive Quality Recovery',
      description: 'Implement focused quality improvement measures to address violations',
      strategy_type: 'early_access',
      effort_required: 'high',
      success_probability: 90,
      estimated_recovery_days: 10,
      cost_impact: 3000,
      prerequisites: ['Quality team assignment', 'Defect analysis', 'Recovery plan'],
      implementation_steps: [
        'Conduct root cause analysis',
        'Implement quality controls',
        'Execute intensive testing',
        'Validate quality metrics'
      ],
      risks: ['Schedule impact', 'Resource allocation', 'Quality consistency']
    });

    return suggestions;
  }

  // Client approval delay recovery
  private static async generateApprovalRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    suggestions.push({
      id: `approval_acceleration_${Date.now()}`,
      title: 'Approval Process Acceleration',
      description: 'Implement measures to expedite client approval processes',
      strategy_type: 'timeline_adjustment',
      effort_required: 'medium',
      success_probability: 75,
      estimated_recovery_days: Math.ceil(warning.predicted_impact.days * 0.5),
      cost_impact: 1000,
      prerequisites: ['Client engagement', 'Process optimization', 'Communication plan'],
      implementation_steps: [
        'Analyze approval bottlenecks',
        'Engage client stakeholders',
        'Streamline approval process',
        'Implement progress tracking'
      ],
      risks: ['Client relationship', 'Approval quality', 'Communication gaps']
    });

    return suggestions;
  }

  // Dependency blockage recovery
  private static async generateDependencyRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    suggestions.push({
      id: `dependency_workaround_${Date.now()}`,
      title: 'Dependency Workaround Strategy',
      description: 'Implement alternative approaches to bypass blocked dependencies',
      strategy_type: 'timeline_adjustment',
      effort_required: 'high',
      success_probability: 70,
      estimated_recovery_days: Math.ceil(warning.predicted_impact.days * 0.6),
      cost_impact: 2000,
      prerequisites: ['Alternative analysis', 'Technical feasibility', 'Risk assessment'],
      implementation_steps: [
        'Analyze dependency requirements',
        'Design workaround solution',
        'Implement alternative approach',
        'Validate functionality'
      ],
      risks: ['Technical complexity', 'Future integration', 'Quality impact']
    });

    return suggestions;
  }

  // Skill gap recovery
  private static async generateSkillRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    suggestions.push({
      id: `skill_acquisition_${Date.now()}`,
      title: 'Rapid Skill Acquisition',
      description: 'Implement intensive training or bring in experts to address skill gaps',
      strategy_type: 'resource_reallocation',
      effort_required: 'high',
      success_probability: 80,
      estimated_recovery_days: 10,
      cost_impact: 4000,
      prerequisites: ['Skill assessment', 'Training resources', 'Expert availability'],
      implementation_steps: [
        'Assess skill requirements',
        'Design acquisition strategy',
        'Execute training/hiring',
        'Validate competency'
      ],
      risks: ['Learning curve', 'Competency validation', 'Time investment']
    });

    return suggestions;
  }

  // Capacity overload recovery
  private static async generateCapacityRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    suggestions.push({
      id: `capacity_rebalancing_${Date.now()}`,
      title: 'Capacity Rebalancing',
      description: 'Redistribute workload and add capacity to address overload conditions',
      strategy_type: 'resource_reallocation',
      effort_required: 'medium',
      success_probability: 85,
      estimated_recovery_days: 7,
      cost_impact: 2500,
      prerequisites: ['Capacity analysis', 'Resource availability', 'Workload assessment'],
      implementation_steps: [
        'Analyze capacity constraints',
        'Redistribute workload',
        'Add additional capacity',
        'Monitor balance'
      ],
      risks: ['Team disruption', 'Knowledge transfer', 'Quality consistency']
    });

    return suggestions;
  }

  // Early access abuse recovery
  private static async generateEarlyAccessRecovery(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    suggestions.push({
      id: `access_control_${Date.now()}`,
      title: 'Access Control Optimization',
      description: 'Implement stricter controls and processes for early access management',
      strategy_type: 'timeline_adjustment',
      effort_required: 'low',
      success_probability: 95,
      estimated_recovery_days: 2,
      cost_impact: 500,
      prerequisites: ['Policy definition', 'System configuration', 'Team training'],
      implementation_steps: [
        'Review access patterns',
        'Implement stricter controls',
        'Train team on policies',
        'Monitor compliance'
      ],
      risks: ['Team resistance', 'Process overhead', 'Productivity impact']
    });

    return suggestions;
  }

  // Universal recovery strategies
  private static async generateUniversalStrategies(
    warning: EnhancedWarning,
    context?: any
  ): Promise<RecoverySuggestion[]> {
    const suggestions: RecoverySuggestion[] = [];

    // Communication and stakeholder management
    suggestions.push({
      id: `stakeholder_engagement_${Date.now()}`,
      title: 'Enhanced Stakeholder Engagement',
      description: 'Improve communication and stakeholder alignment to prevent future issues',
      strategy_type: 'timeline_adjustment',
      effort_required: 'low',
      success_probability: 90,
      estimated_recovery_days: 1,
      cost_impact: 0,
      prerequisites: ['Stakeholder mapping', 'Communication plan', 'Regular updates'],
      implementation_steps: [
        'Map key stakeholders',
        'Develop communication strategy',
        'Implement regular updates',
        'Gather feedback'
      ],
      risks: ['Over-communication', 'Stakeholder fatigue', 'Information overload']
    });

    return suggestions;
  }

  // Helper methods
  private static identifyParallelExecutionOpportunities(
    dependencies: any[],
    phaseIds: number[]
  ): any[] {
    const opportunities: any[] = [];

    // Simple logic to identify phases that could be executed in parallel
    // This would be more sophisticated in a real implementation
    for (const phaseId of phaseIds) {
      const phaseDependencies = dependencies.filter(d => d.successor_phase_id === phaseId);
      if (phaseDependencies.length === 0) {
        opportunities.push({ phase_id: phaseId, parallelizable: true });
      }
    }

    return opportunities;
  }

  private static rankAndOptimizeSuggestions(
    suggestions: RecoverySuggestion[],
    warning: EnhancedWarning
  ): RecoverySuggestion[] {
    // Score and rank suggestions based on multiple criteria
    return suggestions
      .map(suggestion => ({
        ...suggestion,
        score: this.calculateSuggestionScore(suggestion, warning)
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5) // Return top 5 suggestions
      .map(({ score, ...suggestion }) => suggestion); // Remove score from final result
  }

  private static calculateSuggestionScore(
    suggestion: RecoverySuggestion,
    warning: EnhancedWarning
  ): number {
    let score = 0;

    // Success probability weight (30%)
    score += suggestion.success_probability * 0.3;

    // Recovery time weight (25%) - faster recovery is better
    const maxRecoveryDays = 30;
    score += (1 - Math.min(suggestion.estimated_recovery_days, maxRecoveryDays) / maxRecoveryDays) * 25;

    // Cost impact weight (20%) - lower cost is better, savings are even better
    if (suggestion.cost_impact <= 0) {
      score += 20; // Bonus for cost savings
    } else {
      const maxCost = 10000;
      score += (1 - Math.min(suggestion.cost_impact, maxCost) / maxCost) * 20;
    }

    // Effort required weight (15%) - lower effort is better
    const effortScores = { low: 15, medium: 10, high: 5 };
    score += effortScores[suggestion.effort_required] || 0;

    // Severity alignment weight (10%) - critical warnings need immediate action
    if (warning.severity === 'critical' && suggestion.estimated_recovery_days <= 3) {
      score += 10;
    }

    return Math.round(score);
  }
}