import React, { useState } from 'react';
import { Box, CssBaseline, ThemeProvider, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import CompanyShowcase from '../components/common/CompanyShowcase';
import { professionalTheme, animationVariants, transitionConfig } from '../styles/theme';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <ThemeProvider theme={professionalTheme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', overflow: 'hidden' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Left side - Company Showcase */}
          <Grid item xs={12} md={7} lg={8}>
            <motion.div
              initial={animationVariants.fadeInLeft.initial}
              animate={animationVariants.fadeInLeft.animate}
              transition={transitionConfig}
              style={{ height: '100%' }}
            >
              <CompanyShowcase />
            </motion.div>
          </Grid>

          {/* Right side - Login/Register Form */}
          <Grid item xs={12} md={5} lg={4}>
            <motion.div
              initial={animationVariants.fadeInRight.initial}
              animate={animationVariants.fadeInRight.animate}
              transition={{
                ...transitionConfig,
                delay: 0.3,
              }}
              style={{ height: '100%' }}
            >
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)',
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23e2e8f0" fill-opacity="0.3"%3E%3Ccircle cx="30" cy="30" r="1.5"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
                  },
                }}
              >
                {isLogin ? (
                  <LoginForm onSwitchToRegister={() => setIsLogin(false)} />
                ) : (
                  <RegisterForm onSwitchToLogin={() => setIsLogin(true)} />
                )}
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
};

export default AuthPage;