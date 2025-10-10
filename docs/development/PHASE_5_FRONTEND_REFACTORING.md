# Phase 5: Frontend Refactoring - ProjectDetailsPage

**Date:** October 10, 2025
**Status:** Phase 5a Complete (Custom Hooks) ✅
**Next:** Phase 5b (Component Extraction)

---

## 🎯 Objective

Refactor the massive **ProjectDetailsPage.tsx (2,851 lines)** into:
- ✅ Custom hooks for business logic (Phase 5a - COMPLETE)
- 🔄 Modular components for UI sections (Phase 5b - RECOMMENDED)
- 🔄 Simplified main page that orchestrates (Phase 5b - RECOMMENDED)

---

## ✅ Phase 5a: Custom Hooks (COMPLETED)

### Created Hooks

#### 1. **useProjectData** (79 lines)
**Location:** `frontend/src/hooks/projects/useProjectData.ts`

**Purpose:** Centralized data fetching and state management

**Features:**
- Fetches project, phases, work logs, and settings
- Calculates actual hours dynamically from work logs
- Handles loading and error states
- Provides refetch functionality

**Usage Example:**
```typescript
import { useProjectData } from '../hooks/projects';

const { project, phases, workLogs, settings, loading, error, refetch } = useProjectData(projectId);
```

---

#### 2. **useProjectSocket** (88 lines)
**Location:** `frontend/src/hooks/projects/useProjectSocket.ts`

**Purpose:** Real-time socket event handling

**Features:**
- Joins/leaves project room automatically
- Listens for early access events
- Triggers refetch on updates
- Handles notifications

**Usage Example:**
```typescript
import { useProjectSocket } from '../hooks/projects';

useProjectSocket({
  projectId: project?.id,
  onRefresh: refetch,
  onNotification: (message, severity) => {
    // Show notification
  }
});
```

---

#### 3. **useProjectTeam** (147 lines)
**Location:** `frontend/src/hooks/projects/useProjectTeam.ts`

**Purpose:** Team management and analytics

**Features:**
- Groups work logs by engineer
- Calculates productivity metrics
- Filters by phase and search term
- Sorts by hours, productivity, recent activity, or alphabetically
- Provides team analytics (top performer, velocity, etc.)

**Usage Example:**
```typescript
import { useProjectTeam } from '../hooks/projects';

const {
  teamMembers,
  teamAnalytics,
  sortBy,
  filterPhase,
  searchTerm,
  viewMode,
  setSortBy,
  setFilterPhase,
  setSearchTerm,
  setViewMode
} = useProjectTeam(workLogs);
```

**Team Member Interface:**
```typescript
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
  recentActivity: number; // Last 7 days
}
```

**Team Analytics Interface:**
```typescript
interface TeamAnalytics {
  totalProductivity: number;
  averageHoursPerDay: number;
  topPerformer: TeamMember | null;
  teamVelocity: number;
}
```

---

#### 4. **useProjectEarlyAccess** (104 lines)
**Location:** `frontend/src/hooks/projects/useProjectEarlyAccess.ts`

**Purpose:** Early access feature management

**Features:**
- Status color helpers
- Checks if phase can start with early access
- Checks if early access is available
- Grant/revoke early access API calls
- Start phase with early access
- Display status formatting

**Usage Example:**
```typescript
import { useProjectEarlyAccess } from '../hooks/projects';

const {
  getEarlyAccessStatusColor,
  canStartWithEarlyAccess,
  isEarlyAccessAvailable,
  getPhaseDisplayStatus,
  grantEarlyAccess,
  revokeEarlyAccess,
  startPhaseWithEarlyAccess
} = useProjectEarlyAccess(refetch);
```

---

## 🔄 Phase 5b: Component Extraction (RECOMMENDED)

### Recommended Components to Extract

#### 1. **ProjectHeader** (~150 lines)
**Location:** `frontend/src/components/projects/details/ProjectHeader.tsx`

**Responsibilities:**
- Project title and status badge
- Back button navigation
- Action buttons (Edit, Delete, Archive, Export)
- Breadcrumb navigation

---

#### 2. **ProjectStats** (~200 lines)
**Location:** `frontend/src/components/projects/details/ProjectStats.tsx`

**Responsibilities:**
- Statistics cards (hours, budget, progress, team size)
- Progress bars
- Budget utilization indicators
- Trend indicators

---

#### 3. **ProjectPhasesList** (~300 lines)
**Location:** `frontend/src/components/projects/details/ProjectPhasesList.tsx`

**Responsibilities:**
- Phase accordion list
- Phase status badges
- Phase action menu
- Early access indicators
- Progress tracking

---

#### 4. **ProjectTeamView** (~600 lines)
**Location:** `frontend/src/components/projects/details/ProjectTeamView/`

**Sub-components:**
- `index.tsx` - Main orchestrator
- `TeamCardsView.tsx` - Card grid layout
- `TeamTableView.tsx` - Table layout
- `TeamAnalyticsView.tsx` - Analytics dashboard
- `TeamFilters.tsx` - Sort/filter/search controls

**Responsibilities:**
- View mode switcher (cards/table/analytics)
- Filtering and sorting controls
- Team member display
- Performance indicators

---

#### 5. **ProjectWorkLogsView** (~200 lines)
**Location:** `frontend/src/components/projects/details/ProjectWorkLogsView.tsx`

**Responsibilities:**
- Work logs table
- Pagination
- Date filtering
- Engineer filtering

---

#### 6. **ProjectSettingsPanel** (~300 lines)
**Location:** `frontend/src/components/projects/details/ProjectSettingsPanel.tsx`

**Responsibilities:**
- Project settings form
- Phase management
- Auto-advance settings
- Timeline mismatch tolerance

---

## 📝 Refactored Page Structure (Example)

After component extraction, the main page would look like:

```typescript
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Tabs, Tab, CircularProgress, Alert } from '@mui/material';
import {
  useProjectData,
  useProjectSocket,
  useProjectTeam,
  useProjectEarlyAccess
} from '../hooks/projects';
import ProjectHeader from '../components/projects/details/ProjectHeader';
import ProjectStats from '../components/projects/details/ProjectStats';
import ProjectPhasesList from '../components/projects/details/ProjectPhasesList';
import ProjectTeamView from '../components/projects/details/ProjectTeamView';
import ProjectWorkLogsView from '../components/projects/details/ProjectWorkLogsView';
import ProjectSettingsPanel from '../components/projects/details/ProjectSettingsPanel';

const ProjectDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });

  // Custom hooks
  const { project, phases, workLogs, settings, loading, error, refetch } = useProjectData(id);

  useProjectSocket({
    projectId: project?.id,
    onRefresh: refetch,
    onNotification: (message, severity) => {
      setNotification({ open: true, message, severity });
    }
  });

  const teamHook = useProjectTeam(workLogs);
  const earlyAccessHook = useProjectEarlyAccess(refetch);

  // Loading and error states
  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!project) return <Alert severity="warning">Project not found</Alert>;

  return (
    <Box>
      <ProjectHeader
        project={project}
        onEdit={() => {/* ... */}}
        onDelete={() => {/* ... */}}
        onArchive={() => {/* ... */}}
        onExport={() => {/* ... */}}
      />

      <ProjectStats
        project={project}
        phases={phases}
        workLogs={workLogs}
      />

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
        <Tab label="Overview" />
        <Tab label="Team" />
        <Tab label="Work Logs" />
        <Tab label="Settings" />
      </Tabs>

      {activeTab === 0 && (
        <ProjectPhasesList
          phases={phases}
          project={project}
          earlyAccessHook={earlyAccessHook}
          onRefresh={refetch}
        />
      )}

      {activeTab === 1 && (
        <ProjectTeamView {...teamHook} phases={phases} />
      )}

      {activeTab === 2 && (
        <ProjectWorkLogsView workLogs={workLogs} phases={phases} />
      )}

      {activeTab === 3 && (
        <ProjectSettingsPanel
          project={project}
          settings={settings}
          onUpdate={refetch}
        />
      )}

      {/* Snackbar for notifications */}
    </Box>
  );
};

export default ProjectDetailsPage;
```

**Result:** Main page reduced from **2,851 lines → ~150 lines**

---

## 📊 Metrics & Impact

### Before Refactoring
- ProjectDetailsPage.tsx: **2,851 lines**
- Business logic: **Mixed with UI code**
- Reusability: **Low** (everything coupled)
- Testability: **Difficult** (complex integration tests needed)
- Maintainability: **Poor** (hard to find specific logic)

### After Phase 5a (Hooks Only)
- ProjectDetailsPage.tsx: **2,851 lines** (unchanged yet)
- Custom hooks: **4 files, 418 lines total**
- Business logic: **Separated into hooks**
- Reusability: **High** (hooks can be used anywhere)
- Testability: **Easier** (can test hooks independently)
- Maintainability: **Better** (logic centralized)

### After Phase 5b (Full Refactor - RECOMMENDED)
- ProjectDetailsPage.tsx: **~150 lines** (95% reduction!)
- Custom hooks: **4 files, 418 lines**
- Components: **6-8 files, ~1,800 lines**
- Total lines: **~2,368 lines** (vs 2,851, more organized)
- Reusability: **Very High** (both hooks and components reusable)
- Testability: **Excellent** (can test each piece)
- Maintainability: **Excellent** (clear structure)

---

## 🎯 Benefits Achieved (Phase 5a)

✅ **Separation of Concerns:** Business logic extracted from UI
✅ **Reusability:** Hooks can be used in other components
✅ **Testability:** Hooks can be tested independently
✅ **Readability:** Cleaner, more focused hook code
✅ **Type Safety:** Full TypeScript support maintained
✅ **State Management:** Centralized in hooks

---

## 🚀 Next Steps (Phase 5b - Optional)

### 1. Extract Components (8-10 files)
- Create component files listed above
- Move UI code from ProjectDetailsPage
- Use the custom hooks in components
- Maintain prop interfaces for type safety

### 2. Refactor Main Page
- Import and use new components
- Keep orchestration logic only
- Remove redundant state management
- Simplify event handlers

### 3. Test Everything
- Test each hook independently
- Test each component in isolation
- Test integrated page functionality
- Verify socket events still work

### 4. Update Documentation
- Document component hierarchy
- Add prop interface documentation
- Update developer guide
- Create Storybook stories (optional)

---

## 💡 Usage Guidelines

### When to Use These Hooks

#### useProjectData
```typescript
// Use when you need:
// - Project details
// - Phases list
// - Work logs
// - Automatic refetching

const { project, phases, workLogs, refetch } = useProjectData(projectId);
```

#### useProjectSocket
```typescript
// Use when you need:
// - Real-time updates
// - Early access notifications
// - Automatic data refresh on events

useProjectSocket({
  projectId: project?.id,
  onRefresh: refetch,
  onNotification: showSnackbar
});
```

#### useProjectTeam
```typescript
// Use when you need:
// - Team statistics
// - Filtered/sorted team members
// - Team analytics
// - Performance metrics

const { teamMembers, teamAnalytics, setSortBy } = useProjectTeam(workLogs);
```

#### useProjectEarlyAccess
```typescript
// Use when you need:
// - Early access status helpers
// - Grant/revoke early access
// - Phase start with early access
// - Display formatting

const { grantEarlyAccess, canStartWithEarlyAccess } = useProjectEarlyAccess(refetch);
```

---

## 🔧 Technical Implementation Notes

### Hook Dependencies
- All hooks use React hooks (useState, useEffect, useCallback, useMemo)
- Hooks follow React hooks rules (no conditional calls)
- Proper cleanup in useEffect return functions
- Memoized calculations to prevent unnecessary re-renders

### API Integration
- Uses existing `apiService` from services/api.ts
- Error handling in hooks
- Loading states managed
- Success/error callbacks

### Type Safety
- Full TypeScript support
- Interfaces exported from hooks
- Type inference where possible
- No `any` types except for backward compatibility

---

## 📚 Related Files

### Custom Hooks
- `frontend/src/hooks/projects/useProjectData.ts`
- `frontend/src/hooks/projects/useProjectSocket.ts`
- `frontend/src/hooks/projects/useProjectTeam.ts`
- `frontend/src/hooks/projects/useProjectEarlyAccess.ts`
- `frontend/src/hooks/projects/index.ts`

### Original File
- `frontend/src/pages/ProjectDetailsPage.tsx` (2,851 lines)

### Existing Components (Already Extracted)
- `frontend/src/components/projects/ExportDialog.tsx`
- `frontend/src/components/projects/EditProjectDialog.tsx`
- `frontend/src/components/projects/AddPhaseDialog.tsx`
- `frontend/src/components/projects/PhaseActionMenu.tsx`
- `frontend/src/components/progress/PhaseProgressSummary.tsx`
- `frontend/src/components/common/ConfirmationDialog.tsx`
- `frontend/src/components/phases/EditPhaseDatesDialog.tsx`

---

## 🎉 Conclusion

**Phase 5a has successfully extracted business logic** from ProjectDetailsPage into 4 reusable custom hooks. This provides:

- ✅ Immediate improvement in code organization
- ✅ Foundation for further component extraction
- ✅ Reusable logic for other pages/features
- ✅ Easier testing and maintenance

**Phase 5b (component extraction)** is recommended but not critical. The hooks alone provide significant value and can be used immediately to clean up the ProjectDetailsPage or create new project-related features.

---

**Generated with Claude Code**
**Date:** October 10, 2025
**Engineer:** Marwan Helal
