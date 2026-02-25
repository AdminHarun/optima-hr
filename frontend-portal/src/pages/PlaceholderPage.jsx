import React from 'react';
import { Box, Typography, Card, CardContent, Alert } from '@mui/material';
import { Construction as ConstructionIcon } from '@mui/icons-material';

export default function PlaceholderPage({ title, description }) {
  return (
    <Box>
      <Typography variant="h4" sx={{ color: '#f1f5f9', fontWeight: 700, mb: 1 }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
        {description}
      </Typography>
      <Card>
        <CardContent sx={{ p: 6, textAlign: 'center' }}>
          <ConstructionIcon sx={{ fontSize: 64, color: '#334155', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#64748b', mb: 1 }}>
            Yapım Aşamasında
          </Typography>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Bu modül Faz 2'de tamamlanacak
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
