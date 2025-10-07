import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { glassMorphismStyles, animationVariants } from '../../styles/theme';
import { companyAssets } from '../../assets/config';

interface ShowcaseItem {
  id: number;
  title: string;
  description: string;
  image: string;
  category: string;
}

// Use your configured project assets
const showcaseItems: ShowcaseItem[] = companyAssets.projects;

const CompanyShowcase: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % showcaseItems.length);
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  const currentItem = showcaseItems[currentIndex];

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      }}
    >
      {/* Animated Background Shapes */}
      <motion.div
        style={{
          position: 'absolute',
          top: '10%',
          left: '10%',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.1)',
        }}
        animate={{
          y: [0, -30, 0],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      <motion.div
        style={{
          position: 'absolute',
          top: '60%',
          right: '15%',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
        }}
        animate={{
          y: [0, 40, 0],
          x: [0, -20, 0],
          rotate: [0, -180, -360],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Company Branding */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
        style={{ marginBottom: '3rem', textAlign: 'center' }}
      >
        <Typography
          variant="h2"
          sx={{
            color: 'white',
            fontWeight: 700,
            fontSize: { xs: '2rem', md: '3rem' },
            mb: 1,
            textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
          }}
        >
          {companyAssets.company.name}
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 300,
            letterSpacing: '0.1em',
          }}
        >
          {companyAssets.company.tagline}
        </Typography>
      </motion.div>

      {/* Showcase Content */}
      <Box sx={{ width: '100%', maxWidth: '500px', px: 3 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.5, ease: [0.6, -0.05, 0.01, 0.99] }}
          >
            <Paper
              elevation={0}
              sx={{
                ...glassMorphismStyles,
                p: 4,
                textAlign: 'center',
                minHeight: '400px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Box
                component="img"
                src={currentItem.image}
                alt={currentItem.title}
                sx={{
                  width: '100%',
                  height: '240px',
                  objectFit: 'cover',
                  borderRadius: 2,
                  mb: 3,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
              />

              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                {currentItem.category}
              </Typography>

              <Typography
                variant="h5"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  mb: 2,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                }}
              >
                {currentItem.title}
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  lineHeight: 1.6,
                }}
              >
                {currentItem.description}
              </Typography>
            </Paper>
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* Progress Indicators */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          mt: 4,
        }}
      >
        {showcaseItems.map((_, index) => (
          <Box
            key={index}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: index === currentIndex ? 'white' : 'rgba(255, 255, 255, 0.3)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </Box>

      {/* Executive Credits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'block',
            mb: 0.5,
          }}
        >
          CEO: {companyAssets.company.ceo}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(255, 255, 255, 0.7)',
            display: 'block',
          }}
        >
          Lead Developer: {companyAssets.company.developer}
        </Typography>
      </motion.div>
    </Box>
  );
};

export default CompanyShowcase;