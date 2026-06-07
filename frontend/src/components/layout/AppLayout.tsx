import React, { useState, useEffect } from 'react';
import {
  AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem,
  ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
  Avatar, Menu, MenuItem, Divider, Badge, Tooltip, Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Assignment,
  AccessTime,
  People,
  AccountCircle,
  Logout,
  Settings,
  Psychology,
  TaskAlt,
  Groups,
  ViewKanban,
  CalendarMonth,
  BarChart,
  NotificationsNone,
  FiberManualRecord,
  SupervisorAccount,
  Description,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { companyAssets } from '../../assets/config';
import apiService from '../../services/api';

const drawerWidth = 248;

interface AppLayoutProps {
  children: React.ReactNode;
}

// Role label shown in the appbar
const ROLE_LABELS: Record<string, string> = {
  supervisor: 'Supervisor Dashboard',
  administrator: 'Administrator Dashboard',
  team_leader: 'Team Leader Dashboard',
  engineer: 'Engineer Dashboard',
};

// Role badge colors
const ROLE_CHIP_COLORS: Record<string, string> = {
  supervisor: '#1e3a8a',
  administrator: '#7c3aed',
  team_leader: '#0891b2',
  engineer: '#059669',
};

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isSupervisor, isAdministrator, isTeamLeader, isEngineer } = useAuth();
  const { connected } = useSocket();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeBriefingCount, setActiveBriefingCount] = useState(0);

  // Fetch unread notification count periodically
  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const res = await apiService.getUnreadNotificationCount();
        if (res.success) setUnreadCount(res.data?.count ?? 0);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch active briefing count for TL badge
  useEffect(() => {
    if (!user || !isTeamLeader) return;
    const fetchBriefings = async () => {
      try {
        const res = await apiService.getBriefings({ status: 'active' });
        setActiveBriefingCount(res.data?.briefings?.length ?? 0);
      } catch {}
    };
    fetchBriefings();
    const interval = setInterval(fetchBriefings, 120000);
    return () => clearInterval(interval);
  }, [user, isTeamLeader]);

  const handleNotifOpen = async (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
    try {
      const res = await apiService.getMyNotifications(10);
      if (res.success) {
        setNotifications(res.data?.notifications || []);
        setUnreadCount(0);
        await apiService.markAllNotificationsRead();
      }
    } catch {}
  };

  // ─── Navigation items per role ──────────────────────────────

  const supervisorNav: any[] = [
    { text: 'Dashboard',         icon: <Dashboard />,          path: '/dashboard' },
    { text: 'Projects',          icon: <Assignment />,         path: '/projects' },
    { text: 'Task Board',        icon: <ViewKanban />,         path: '/task-board' },
    { text: 'Team Management',   icon: <People />,             path: '/team' },
    { text: 'Project Briefings', icon: <Description />,        path: '/briefings' },
    { text: 'Engineer Activity', icon: <BarChart />,           path: '/engineer-activity' },
    { text: 'Smart Warnings',    icon: <Psychology />,         path: '/smart-warnings' },
  ];

  const teamLeaderNav: any[] = [
    { text: 'Dashboard',         icon: <Dashboard />,     path: '/dashboard' },
    { text: 'My Team',           icon: <Groups />,        path: '/my-team' },
    { text: 'Task Board',        icon: <ViewKanban />,    path: '/task-board' },
    { text: 'My Calendar',       icon: <CalendarMonth />, path: '/my-calendar' },
    { text: 'Projects',          icon: <Assignment />,    path: '/projects' },
    { text: 'Briefings',         icon: <Description />,   path: '/briefings' },
    { text: 'Time Tracking',     icon: <AccessTime />,    path: '/time-tracking' },
    { text: 'My Work Logs',      icon: <AccessTime />,    path: '/my-work-logs' },
  ];

  const engineerNav = [
    { text: 'Dashboard',       icon: <Dashboard />,      path: '/dashboard' },
    { text: 'My Tasks',        icon: <TaskAlt />,         path: '/my-tasks' },
    { text: 'My Calendar',     icon: <CalendarMonth />,  path: '/my-calendar' },
    { text: 'My Performance',  icon: <BarChart />,        path: '/my-performance' },
    { text: 'Projects',        icon: <Assignment />,      path: '/projects' },
    { text: 'Time Tracking',   icon: <AccessTime />,      path: '/time-tracking' },
    { text: 'My Work Logs',    icon: <AccessTime />,      path: '/my-work-logs' },
  ];

  const administratorNav = [
    { text: 'Dashboard',         icon: <Dashboard />,  path: '/dashboard' },
    { text: 'Projects',          icon: <Assignment />, path: '/projects' },
    { text: 'Engineer Activity', icon: <BarChart />,   path: '/engineer-activity' },
  ];

  const navItems = isSupervisor
    ? supervisorNav
    : isTeamLeader
    ? teamLeaderNav
    : isEngineer
    ? engineerNav
    : administratorNav;

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo area */}
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2, px: 2 }}>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.4 }}>
          <Box
            component="img"
            src={companyAssets.logo.main}
            alt="Logo"
            sx={{ width: 52, height: 52, borderRadius: 1, objectFit: 'contain', bgcolor: 'white', p: 0.5,
              boxShadow: '0 4px 8px rgba(30,58,138,0.25)' }}
          />
        </motion.div>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2,
            background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
            backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {companyAssets.company.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', letterSpacing: '0.04em' }}>
            {companyAssets.company.tagline}
          </Typography>
        </Box>
      </Toolbar>

      {/* Role chip */}
      <Box sx={{ px: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Chip
          size="small"
          label={
            user?.role === 'team_leader' ? 'Team Leader'
            : user?.role === 'supervisor' ? 'Supervisor'
            : user?.role?.charAt(0).toUpperCase() + (user?.role?.slice(1) || '')
          }
          sx={{ bgcolor: ROLE_CHIP_COLORS[user?.role || 'engineer'], color: 'white', fontWeight: 600,
            fontSize: '0.7rem', height: 22, alignSelf: 'flex-start' }}
        />
        {user?.role === 'supervisor' && (user as any)?.supervisor_type && (
          <Chip
            size="small"
            label={(user as any).supervisor_type === 'visualization' ? 'Visualization' : 'Working'}
            sx={{
              bgcolor: (user as any).supervisor_type === 'visualization' ? '#0284c7' : '#0d9488',
              color: 'white', fontWeight: 600, fontSize: '0.65rem', height: 19, alignSelf: 'flex-start',
            }}
          />
        )}
      </Box>

      <Divider />

      {/* Nav items */}
      <List sx={{ px: 1, pt: 1, flexGrow: 1, overflowY: 'auto' }}>
        {navItems.map((item: any, index: number) => {
          if (item.section) {
            return (
              <Box key={item.section} sx={{ px: 1.5, pt: index === 0 ? 0.5 : 1.5, pb: 0.5 }}>
                <Typography variant="caption" sx={{
                  fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.6rem',
                  textTransform: 'uppercase', color: 'text.disabled',
                }}>
                  {item.section}
                </Typography>
              </Box>
            );
          }
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <motion.div key={item.text} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => { navigate(item.path); if (mobileOpen) setMobileOpen(false); }}
                  sx={{
                    borderRadius: 2, py: 1.1,
                    '&.Mui-selected': { bgcolor: 'primary.main', color: 'white',
                      '&:hover': { bgcolor: 'primary.dark' },
                      '& .MuiListItemIcon-root': { color: 'white' } },
                    '&:hover': { bgcolor: 'primary.light', color: 'white',
                      '& .MuiListItemIcon-root': { color: 'white' } },
                    transition: 'all 0.18s ease',
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38, transition: 'color 0.18s ease' }}>
                    {item.path === '/briefings' && isTeamLeader && activeBriefingCount > 0
                      ? <Badge badgeContent={activeBriefingCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', height: 16, minWidth: 16 } }}>{item.icon}</Badge>
                      : item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text}
                    sx={{ '& .MuiTypography-root': {
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.875rem',
                    }}}
                  />
                </ListItemButton>
              </ListItem>
            </motion.div>
          );
        })}
      </List>

      {/* User card at bottom of drawer */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontWeight: 700, fontSize: '0.9rem' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {user?.email}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

      <AppBar position="fixed" sx={(theme) => ({
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg,#1e293b,#334155)'
          : 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      })}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}>
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 600, fontSize: '1rem' }}>
            {user?.role === 'supervisor' && (user as any)?.supervisor_type
              ? `${(user as any).supervisor_type === 'visualization' ? 'Visualization' : 'Working'} Supervisor Dashboard`
              : ROLE_LABELS[user?.role || 'engineer']}
          </Typography>

          {/* Connection indicator */}
          <Tooltip title={connected ? 'Connected' : 'Disconnected'}>
            <FiberManualRecord sx={{ fontSize: 12, color: connected ? '#4ade80' : '#f87171', mr: 1 }} />
          </Tooltip>

          {/* Notifications bell */}
          <IconButton color="inherit" onClick={handleNotifOpen} sx={{ mr: 1 }}>
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <NotificationsNone />
            </Badge>
          </IconButton>

          {/* Notification dropdown */}
          <Menu anchorEl={notifAnchorEl} open={Boolean(notifAnchorEl)} onClose={() => setNotifAnchorEl(null)}
            PaperProps={{ sx: { width: 360, maxHeight: 480, borderRadius: 2,
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)' } }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
            </Box>
            {notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">No notifications</Typography>
              </Box>
            ) : (
              notifications.map((notif: any) => (
                <MenuItem key={notif.id}
                  onClick={() => {
                    setNotifAnchorEl(null);
                    if (notif.reference_type === 'task_assignment' && notif.reference_id) {
                      navigate(`/tasks/${notif.reference_id}`);
                    }
                  }}
                  sx={{ py: 1.5, px: 2, borderBottom: '1px solid', borderColor: 'divider',
                    bgcolor: notif.is_read ? 'transparent' : 'action.hover',
                    whiteSpace: 'normal', alignItems: 'flex-start', gap: 1 }}>
                  <Box>
                    <Typography variant="body2" fontWeight={notif.is_read ? 400 : 600}>
                      {notif.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                      {notif.message.slice(0, 80)}{notif.message.length > 80 ? '…' : ''}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.25 }}>
                      {new Date(notif.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
            )}
          </Menu>

          {/* User avatar menu */}
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="inherit">
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '0.85rem' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            PaperProps={{ sx: { borderRadius: 2, minWidth: 200 } }}>
            <MenuItem disabled sx={{ py: 1.5 }}>
              <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
              <Box>
                <Typography variant="body2" fontWeight={600}>{user?.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.role === 'team_leader' ? 'Team Leader' : user?.role?.charAt(0).toUpperCase() + (user?.role?.slice(1) || '')}
                </Typography>
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setAnchorEl(null); navigate('/settings'); }} sx={{ py: 1.5 }}>
              <ListItemIcon><Settings fontSize="small" /></ListItemIcon>Settings
            </MenuItem>
            <MenuItem onClick={async () => { setAnchorEl(null); await logout(); navigate('/login'); }} sx={{ py: 1.5 }}>
              <ListItemIcon><Logout fontSize="small" /></ListItemIcon>Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' } }}>
          {drawer}
        </Drawer>
        <Drawer variant="permanent"
          sx={(theme) => ({ display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(180deg,#1e293b,#0f172a)'
                : 'linear-gradient(180deg,#f8fafc,#e2e8f0)',
              borderRight: theme.palette.mode === 'dark'
                ? '1px solid rgba(148,163,184,0.1)'
                : '1px solid rgba(0,0,0,0.1)' } })} open>
          {drawer}
        </Drawer>
      </Box>

      {/* Main content */}
      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Toolbar />
        <Box sx={{ flexGrow: 1, p: 3 }}>
          {children}
        </Box>
        <Box component="footer" sx={(theme) => ({
          mt: 'auto', py: 2, px: 3,
          borderTop: '1px solid', borderColor: 'divider',
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg,#1e293b,#0f172a)'
            : 'linear-gradient(135deg,#f8fafc,#e2e8f0)',
        })}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Typography variant="body2" fontWeight={600} color="primary.main">
              {companyAssets.company.name} · {companyAssets.company.tagline}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              CEO: {companyAssets.company.ceo} · Dev: {companyAssets.company.developer}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
