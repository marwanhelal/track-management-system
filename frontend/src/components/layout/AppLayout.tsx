import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Button,
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
  Business,
  Psychology,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { companyAssets } from '../../assets/config';

const drawerWidth = 240;

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isSupervisor, isAdministrator } = useAuth();
  const { connected } = useSocket();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSettings = () => {
    handleClose();
    navigate('/settings');
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
    navigate('/login'); // Ensure navigation to login page after logout
  };


  const menuItems = [
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      roles: ['supervisor', 'engineer', 'administrator'],
    },
    {
      text: 'Projects',
      icon: <Assignment />,
      path: '/projects',
      roles: ['supervisor', 'administrator'],
    },
    {
      text: '🧠 Smart Warnings',
      icon: <Psychology />,
      path: '/smart-warnings',
      roles: ['supervisor', 'engineer', 'administrator'],
    },
    {
      text: 'Engineer Activity',
      icon: <People />,
      path: '/engineer-activity',
      roles: ['supervisor', 'administrator'],
    },
    {
      text: 'Time Tracking',
      icon: <AccessTime />,
      path: '/time-tracking',
      roles: ['engineer'],
    },
    {
      text: 'My Work Logs',
      icon: <AccessTime />,
      path: '/my-work-logs',
      roles: ['engineer'],
    },
    {
      text: 'Team Management',
      icon: <People />,
      path: '/team',
      roles: ['supervisor'],
    },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    item.roles.includes(user?.role || '')
  );

  const drawer = (
    <div>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <Box
            component="img"
            src={companyAssets.logo.main}
            alt="Company Logo"
            sx={{
              width: 60,
              height: 60,
              borderRadius: 1,
              boxShadow: '0 4px 8px rgba(30, 58, 138, 0.3)',
              objectFit: 'contain',
              backgroundColor: 'white',
              padding: 0.5,
            }}
          />
        </motion.div>
        <Box>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '1.1rem',
            }}
          >
            {companyAssets.company.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem',
              letterSpacing: '0.05em',
            }}
          >
            {companyAssets.company.tagline}
          </Typography>
        </Box>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1 }}>
        {filteredMenuItems.map((item, index) => (
          <motion.div
            key={item.text}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen) setMobileOpen(false);
                }}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'white',
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    transition: 'color 0.2s ease-in-out',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  sx={{
                    '& .MuiTypography-root': {
                      fontWeight: location.pathname === item.path ? 600 : 500,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          </motion.div>
        ))}
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />

        <AppBar
          position="fixed"
          sx={(theme) => ({
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
              : 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          })}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Box
                component="img"
                src={companyAssets.logo.main}
                alt="Company Logo"
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 1,
                  objectFit: 'contain',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  padding: 0.5,
                  display: { xs: 'none', sm: 'flex' },
                }}
              />
              <Typography variant="h6" noWrap component="div">
                {isSupervisor ? 'Supervisor Dashboard' : isAdministrator ? 'Administrator Dashboard' : 'Engineer Dashboard'}
              </Typography>
            </Box>


            {/* User Menu */}
            <div>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                >
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                sx={{
                  '& .MuiPaper-root': {
                    borderRadius: 2,
                    minWidth: 200,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  },
                }}
              >
                <MenuItem disabled sx={{ py: 2 }}>
                  <ListItemIcon>
                    <AccountCircle fontSize="small" />
                  </ListItemIcon>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {user?.name || 'User'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : 'Unknown'}
                    </Typography>
                  </Box>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleSettings} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  Settings
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>

            </div>
          </Toolbar>
        </AppBar>

        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true,
            }}
            sx={(theme) => ({
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                  : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
              },
            })}
          >
            {drawer}
          </Drawer>
          <Drawer
            variant="permanent"
            sx={(theme) => ({
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)'
                  : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
                borderRight: theme.palette.mode === 'dark'
                  ? '1px solid rgba(148, 163, 184, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.12)',
              },
            })}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100vh',
          }}
        >
          <Toolbar />
          <Box sx={{ flexGrow: 1, p: 3 }}>
            {children}
          </Box>

          {/* Executive Footer */}
          <Box
            component="footer"
            sx={(theme) => ({
              mt: 'auto',
              py: 2,
              px: 3,
              borderTop: theme.palette.mode === 'dark'
                ? '1px solid rgba(148, 163, 184, 0.1)'
                : '1px solid rgba(0, 0, 0, 0.12)',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            })}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box
                    component="img"
                    src={companyAssets.logo.main}
                    alt="Company Logo"
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1,
                      objectFit: 'contain',
                      backgroundColor: 'white',
                      padding: 0.3,
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    {companyAssets.company.name} {companyAssets.company.tagline}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    CEO: {companyAssets.company.ceo}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                    Lead Developer: {companyAssets.company.developer}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </Box>
        </Box>
      </Box>
  );
};

export default AppLayout;