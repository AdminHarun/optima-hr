import React from 'react';
import { Box, Paper } from '@mui/material';
import MailSystem from '../components/admin/MailSystem';

function MailPage() {
  return (
    <Paper 
      sx={{ 
        height: 'calc(100vh - 112px)', // Header ve padding çıkarıldı
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 3
      }}
    >
      <MailSystem />
    </Paper>
  );
}

export default MailPage;