import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
  Button
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { ChecklistInstanceSubsection } from '../../types';
import ChecklistItem from './ChecklistItem';

interface ChecklistSubsectionProps {
  subsection: ChecklistInstanceSubsection & { items?: any[] };
  onUpdate: () => void;
  onAddCustomItem?: (subsectionId: number) => void;
}

const ChecklistSubsection: React.FC<ChecklistSubsectionProps> = ({ subsection, onUpdate, onAddCustomItem }) => {
  const items = subsection.items || [];

  // Calculate progress
  const totalItems = items.length;
  const level1Completed = items.filter(item => item.approval_level_1).length;
  const level2Completed = items.filter(item => item.approval_level_2).length;
  const level3Completed = items.filter(item => item.approval_level_3).length;
  const level4Completed = items.filter(item => item.approval_level_4).length;

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, flexGrow: 1 }}>
            {subsection.name_ar}
            {subsection.is_custom && (
              <Chip label="Custom" size="small" color="info" sx={{ ml: 1, height: 20 }} />
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
            <Chip
              label={`L1: ${level1Completed}/${totalItems}`}
              size="small"
              color={level1Completed === totalItems ? 'success' : 'default'}
            />
            <Chip
              label={`L2: ${level2Completed}/${totalItems}`}
              size="small"
              color={level2Completed === totalItems ? 'success' : 'default'}
            />
            <Chip
              label={`L3: ${level3Completed}/${totalItems}`}
              size="small"
              color={level3Completed === totalItems ? 'success' : 'default'}
            />
            <Chip
              label={`L4: ${level4Completed}/${totalItems}`}
              size="small"
              color={level4Completed === totalItems ? 'success' : 'default'}
            />
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {items.length > 0 ? (
          <Box>
            {items.map((item) => (
              <ChecklistItem key={item.id} item={item} onUpdate={onUpdate} />
            ))}
            {onAddCustomItem && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onAddCustomItem(subsection.id)}
                sx={{ mt: 2 }}
              >
                Add Custom Item
              </Button>
            )}
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No items in this subsection
            </Typography>
            {onAddCustomItem && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => onAddCustomItem(subsection.id)}
              >
                Add Custom Item
              </Button>
            )}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default ChecklistSubsection;
