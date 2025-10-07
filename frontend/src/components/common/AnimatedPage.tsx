import React from 'react';
import { motion } from 'framer-motion';
import { Box } from '@mui/material';

interface AnimatedPageProps {
  children: React.ReactNode;
  delay?: number;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
  },
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'easeOut' as const,
  duration: 0.6,
};

const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={{
        ...pageTransition,
        delay,
      }}
      style={{ height: '100%' }}
    >
      <Box sx={{ height: '100%' }}>
        {children}
      </Box>
    </motion.div>
  );
};

export default AnimatedPage;