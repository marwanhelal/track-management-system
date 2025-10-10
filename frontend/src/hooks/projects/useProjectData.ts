import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { Project, ProjectPhase, WorkLog } from '../../types';

interface UseProjectDataResult {
  project: Project | null;
  phases: ProjectPhase[];
  workLogs: WorkLog[];
  settings: any;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useProjectData = (projectId: string | undefined): UseProjectDataResult => {
  const [project, setProject] = useState<Project | null>(null);
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjectDetails = useCallback(async () => {
    if (!projectId || projectId === 'undefined' || isNaN(parseInt(projectId))) {
      setLoading(false);
      setError('Invalid project ID. Please check the URL and try again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.getProject(parseInt(projectId));

      if (response.success && response.data) {
        const { project, phases, workLogs, settings } = response.data;

        // Calculate dynamic actual hours from work logs
        const totalActualHours = (workLogs || []).reduce((sum: number, log: any) => {
          return sum + parseFloat(log.hours?.toString() || '0');
        }, 0);

        // Update project with calculated actual hours
        const updatedProject = {
          ...project,
          actual_hours: parseFloat(totalActualHours.toFixed(1))
        };

        setProject(updatedProject);
        setPhases(phases || []);
        setWorkLogs(workLogs || []);
        setSettings(settings || {});
      } else {
        setError(response.error || 'Failed to fetch project details');
      }
    } catch (err) {
      setError('Failed to fetch project details');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
    }
  }, [projectId, fetchProjectDetails]);

  return {
    project,
    phases,
    workLogs,
    settings,
    loading,
    error,
    refetch: fetchProjectDetails
  };
};
