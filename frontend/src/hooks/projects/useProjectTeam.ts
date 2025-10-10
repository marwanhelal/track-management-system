import { useState, useMemo } from 'react';
import { WorkLog } from '../../types';

interface TeamMember {
  id: number;
  name: string;
  totalHours: number;
  entries: number;
  phases: string[];
  workingDays: number;
  lastActivity: string;
  avgHoursPerEntry: number;
  productivity: number;
  recentActivity: number;
}

interface TeamAnalytics {
  totalProductivity: number;
  averageHoursPerDay: number;
  topPerformer: TeamMember | null;
  teamVelocity: number;
}

interface UseProjectTeamResult {
  teamMembers: TeamMember[];
  teamAnalytics: TeamAnalytics;
  sortBy: 'hours' | 'productivity' | 'recent' | 'alphabetical';
  filterPhase: string;
  searchTerm: string;
  viewMode: 'cards' | 'table' | 'analytics';
  selectedMember: TeamMember | null;
  setSortBy: (sortBy: 'hours' | 'productivity' | 'recent' | 'alphabetical') => void;
  setFilterPhase: (phase: string) => void;
  setSearchTerm: (term: string) => void;
  setViewMode: (mode: 'cards' | 'table' | 'analytics') => void;
  setSelectedMember: (member: TeamMember | null) => void;
}

export const useProjectTeam = (workLogs: WorkLog[]): UseProjectTeamResult => {
  const [sortBy, setSortBy] = useState<'hours' | 'productivity' | 'recent' | 'alphabetical'>('hours');
  const [filterPhase, setFilterPhase] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'analytics'>('cards');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const teamMembers = useMemo(() => {
    // Group work logs by engineer
    const teamStats = workLogs.reduce((acc, log) => {
      const engineerId = log.engineer_id;
      if (!acc[engineerId]) {
        acc[engineerId] = {
          id: engineerId,
          name: log.engineer_name,
          totalHours: 0,
          entries: 0,
          phases: new Set<string>(),
          dates: new Set<string>(),
          lastActivity: '',
          avgHoursPerEntry: 0,
          productivity: 0,
          recentActivity: 0,
          workingDays: 0
        };
      }
      acc[engineerId].totalHours += parseFloat(log.hours?.toString() || '0');
      acc[engineerId].entries += 1;
      acc[engineerId].phases.add(log.phase_name);
      acc[engineerId].dates.add(log.date);

      // Track latest activity
      if (!acc[engineerId].lastActivity || log.date > acc[engineerId].lastActivity) {
        acc[engineerId].lastActivity = log.date;
      }

      return acc;
    }, {} as Record<string, any>);

    // Calculate metrics for each team member
    Object.values(teamStats).forEach((member: any) => {
      member.avgHoursPerEntry = member.entries > 0 ? member.totalHours / member.entries : 0;
      member.phases = Array.from(member.phases);
      member.workingDays = member.dates.size;
      member.productivity = member.workingDays > 0 ? member.totalHours / member.workingDays : 0;

      // Calculate recent activity (last 7 days)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 7);
      member.recentActivity = workLogs
        .filter(log => log.engineer_id === member.id && new Date(log.date) >= recentDate)
        .reduce((sum, log) => sum + parseFloat(log.hours?.toString() || '0'), 0);
    });

    let members: TeamMember[] = Object.values(teamStats);

    // Apply filters
    if (filterPhase) {
      members = members.filter(member => member.phases.includes(filterPhase));
    }

    if (searchTerm) {
      members = members.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'hours':
        members.sort((a, b) => b.totalHours - a.totalHours);
        break;
      case 'productivity':
        members.sort((a, b) => b.productivity - a.productivity);
        break;
      case 'recent':
        members.sort((a, b) => b.recentActivity - a.recentActivity);
        break;
      case 'alphabetical':
        members.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return members;
  }, [workLogs, sortBy, filterPhase, searchTerm]);

  const teamAnalytics = useMemo((): TeamAnalytics => {
    const totalHours = teamMembers.reduce((sum, member) => sum + member.totalHours, 0);
    const totalDays = new Set(workLogs.map(log => log.date)).size;

    return {
      totalProductivity: totalHours / Math.max(teamMembers.length, 1),
      averageHoursPerDay: totalDays > 0 ? totalHours / totalDays : 0,
      topPerformer: teamMembers[0] || null,
      teamVelocity: teamMembers.reduce((sum, member) => sum + member.productivity, 0) / Math.max(teamMembers.length, 1)
    };
  }, [teamMembers, workLogs]);

  return {
    teamMembers,
    teamAnalytics,
    sortBy,
    filterPhase,
    searchTerm,
    viewMode,
    selectedMember,
    setSortBy,
    setFilterPhase,
    setSearchTerm,
    setViewMode,
    setSelectedMember
  };
};
