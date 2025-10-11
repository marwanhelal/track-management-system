import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  Avatar,
} from '@mui/material';
import { LockOutlined, Business } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoginInput } from '../../types';
import { glassMorphismStyles, animationVariants, transitionConfig, scaleTransition } from '../../styles/theme';
import { companyAssets } from '../../assets/config';

const LoginForm = () => {
  const { login, loading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginInput>({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (error) {
      clearError();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(formData);
    if (success) {
      // Redirect to dashboard after successful login
      navigate('/dashboard');
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <motion.div
        initial={animationVariants.fadeInUp.initial}
        animate={animationVariants.fadeInUp.animate}
        transition={transitionConfig}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 4,
          }}
        >
          {/* Company Logo */}
          <motion.div
            initial={animationVariants.scale.initial}
            animate={animationVariants.scale.animate}
            transition={{ ...scaleTransition, delay: 0.2 }}
          >
            <Box
              component="img"
              src={companyAssets.logo.main}
              alt="Company Logo"
              sx={{
                width: 120,
                height: 120,
                mb: 3,
                borderRadius: 2,
                boxShadow: '0 8px 32px rgba(30, 58, 138, 0.3)',
                objectFit: 'contain',
                backgroundColor: 'white',
                padding: 1,
              }}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            style={{ textAlign: 'center', marginBottom: '2rem' }}
          >
            <Typography
              component="h1"
              variant="h3"
              sx={{
                fontWeight: 700,
                color: 'primary.main',
                mb: 1,
                background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {companyAssets.company.name}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: 'text.secondary',
                fontWeight: 300,
                letterSpacing: '0.05em',
              }}
            >
              {companyAssets.company.tagline}
            </Typography>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{ width: '100%' }}
          >
            <Paper
              elevation={0}
              sx={{
                ...glassMorphismStyles,
                padding: 4,
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <Typography
                component="h2"
                variant="h5"
                sx={{
                  textAlign: 'center',
                  mb: 3,
                  fontWeight: 600,
                  color: 'primary.main',
                }}
              >
                Welcome Back
              </Typography>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                </motion.div>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          transition: 'transform 0.2s ease',
                        },
                      },
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                >
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          transition: 'transform 0.2s ease',
                        },
                      },
                    }}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                >
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{
                      mt: 3,
                      mb: 2,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 10px 25px rgba(30, 58, 138, 0.3)',
                      },
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <CircularProgress size={24} sx={{ color: 'white' }} />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </motion.div>
              </Box>
            </Paper>
          </motion.div>

          {/* Executive Credits */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            style={{ marginTop: '2rem', textAlign: 'center' }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
              CEO: {companyAssets.company.ceo}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Lead Developer: {companyAssets.company.developer}
            </Typography>
          </motion.div>
        </Box>
      </motion.div>
    </Container>
  );
};

export default LoginForm;