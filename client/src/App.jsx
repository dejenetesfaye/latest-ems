import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { CustomThemeProvider, useThemeToggle } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AppBar, Toolbar, Typography, Button, Box, ThemeProvider, createTheme, CssBaseline, IconButton } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

import Login from './pages/Login';
import SystemAdminDashboard from './pages/SystemAdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    ...(mode === 'dark' ? {
      background: {
        default: '#0A0A0A',
        paper: '#141414',
      },
      primary: {
        main: '#D4AF37',
        contrastText: '#000000',
      },
      text: {
        primary: '#EDEDED',
        secondary: '#A3A3A3',
      },
    } : {
      background: {
        default: '#F5F5F5',
        paper: '#FFFFFF',
      },
      primary: {
        main: '#B9992B', // Slightly darker gold for readability on white
        contrastText: '#FFFFFF',
      },
      text: {
        primary: '#1A1A1A',
        secondary: '#4A4A4A',
      },
    }),
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h4: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: mode === 'dark' ? '1px solid rgba(212, 175, 55, 0.15)' : '1px solid rgba(185, 153, 43, 0.2)',
          boxShadow: mode === 'dark' ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 12px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          backgroundColor: mode === 'dark' ? '#1C1C1C' : '#F0F0F0',
          borderBottom: mode === 'dark' ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid rgba(185, 153, 43, 0.3)',
        },
      },
    },
  },
});

const ROLE_LABELS = {
  systemadmin: 'System Admin',
  superadmin: 'Super Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
  client: 'Client',
};

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { mode, toggleMode } = useThemeToggle();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <AppBar position="static" elevation={0}
      sx={{ 
        background: mode === 'dark' ? 'rgba(10,10,10,0.95)' : 'rgba(255,255,255,0.95)', 
        backdropFilter: 'blur(10px)', 
        borderBottom: `1px solid ${mode === 'dark' ? 'rgba(212, 175, 55, 0.3)' : 'rgba(185, 153, 43, 0.3)'}` 
      }}>
      <Toolbar>
        <EventAvailableIcon color="primary" sx={{ mr: 1.5 }} />
        <Typography variant="h6" fontWeight="bold" color="primary" sx={{ flexGrow: 1, letterSpacing: 1 }}>
          EMS
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={toggleMode} color="inherit">
            {mode === 'dark' ? <Brightness7Icon color="primary" /> : <Brightness4Icon color="primary" />}
          </IconButton>
          <Box textAlign="right">
            <Typography variant="body2" fontWeight="bold" color="text.primary">{user.name}</Typography>
            <Typography variant="caption" color="primary">{ROLE_LABELS[user.role]}</Typography>
          </Box>
          <Button color="error" variant="outlined" size="small" startIcon={<LogoutIcon />}
            onClick={() => { logout(); navigate('/'); }}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

const AppContent = () => {
  const { mode } = useThemeToggle();
  const theme = getTheme(mode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SocketProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Login />} />

            <Route element={<ProtectedRoute allowedRoles={['systemadmin']} />}>
              <Route path="/systemadmin" element={<SystemAdminDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
              <Route path="/superadmin" element={<SuperAdminDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
              <Route path="/manager" element={<ManagerDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['client']} />}>
              <Route path="/client" element={<ClientDashboard />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['supervisor']} />}>
              <Route path="/supervisor" element={<SupervisorDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </SocketProvider>
    </ThemeProvider>
  );
};

function App() {
  return (
    <CustomThemeProvider>
      <AppContent />
    </CustomThemeProvider>
  );
}

export default App;
