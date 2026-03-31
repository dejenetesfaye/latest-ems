import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Container, Typography, Box, Card, CardContent, TextField, Button,
  Grid, Alert, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, IconButton, CircularProgress, Chip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupsIcon from '@mui/icons-material/Groups';
import BusinessIcon from '@mui/icons-material/Business';

const SystemAdminDashboard = () => {
  const [superAdmins, setSuperAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  const [form, setForm] = useState({ name: '', username: '', password: '' });

  const fetchSuperAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/superadmins');
      setSuperAdmins(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSuperAdmins(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    try {
      await api.post('/auth/register', { ...form, role: 'superadmin' });
      setAlert({ show: true, message: 'Super Admin (Event Organizer) created!', severity: 'success' });
      setForm({ name: '', username: '', password: '' });
      fetchSuperAdmins();
    } catch (err) {
      setAlert({ show: true, message: err.response?.data?.message || 'Error creating super admin', severity: 'error' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this Super Admin and all their data?')) return;
    try {
      await api.delete(`/users/${id}`);
      fetchSuperAdmins();
    } catch (err) {
      setAlert({ show: true, message: 'Error deleting user', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" gap={2} mb={4}>
        <BusinessIcon color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">System Admin</Typography>
          <Typography variant="body2" color="text.secondary">Manage all event organizer accounts</Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Summary */}
        <Grid item xs={12}>
          <Card elevation={2} sx={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)', color: 'white', borderRadius: 3 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
              <GroupsIcon sx={{ fontSize: 48, opacity: 0.8 }} />
              <Box>
                <Typography variant="h3" fontWeight="bold">{superAdmins.length}</Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>Active Event Organizers</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Create Form */}
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderRadius: 2, height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" mb={2} gap={1}>
                <PersonAddIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">Add Event Organizer</Typography>
              </Box>
              {alert.show && (
                <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert({ ...alert, show: false })}>
                  {alert.message}
                </Alert>
              )}
              <form onSubmit={handleCreate}>
                <TextField fullWidth label="Organization Name" margin="normal" size="small" required
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                <TextField fullWidth label="Username" margin="normal" size="small" required
                  value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                <TextField fullWidth label="Password" type="password" margin="normal" size="small" required
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <Button fullWidth variant="contained" type="submit" sx={{ mt: 2 }} disabled={submitLoading}>
                  {submitLoading ? <CircularProgress size={24} color="inherit" /> : 'Create Organizer'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Super Admins Table */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" fontWeight="bold" mb={2}>All Event Organizers</Typography>
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f3f4f6' }}>
                <TableRow>
                  <TableCell><strong>Organization</strong></TableCell>
                  <TableCell><strong>Username</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                  <TableCell align="right"><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
                ) : superAdmins.length === 0 ? (
                  <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>No organizers yet.</TableCell></TableRow>
                ) : superAdmins.map(sa => (
                  <TableRow key={sa._id} hover>
                    <TableCell><strong>{sa.name}</strong></TableCell>
                    <TableCell><Chip label={sa.username} size="small" variant="outlined" /></TableCell>
                    <TableCell>{new Date(sa.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell align="right">
                      <IconButton color="error" onClick={() => handleDelete(sa._id)}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Container>
  );
};

export default SystemAdminDashboard;
