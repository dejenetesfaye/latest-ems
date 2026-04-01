import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';
import {
  Container, Typography, Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Card, CardContent, Grid,
  IconButton, CircularProgress, Alert, Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const SupervisorDashboard = () => {
  const socket = useContext(SocketContext);
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqRes, evtRes] = await Promise.all([api.get('/requests'), api.get('/events')]);
      setRequests(reqRes.data);
      setEvents(evtRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('request_updated', () => fetchData());
    socket.on('request_created', () => fetchData());
    socket.on('new_assignment', () => fetchData());
    socket.on('activity_update', () => fetchData());
    return () => {
      socket.off('request_updated');
      socket.off('request_created');
      socket.off('new_assignment');
      socket.off('activity_update');
    };
  }, [socket]);

  const handleFulfill = async (id) => {
    try {
      await api.put(`/requests/${id}/status`, { status: 'Fulfilled' });
      setAlert({ show: true, message: 'Resource marked as successfully Fulfilled!', severity: 'success' });
      fetchData();
    } catch (err) {
      setAlert({ show: true, message: err.response?.data?.message || 'Error', severity: 'error' });
    }
  };

  const approved = requests.filter(r => r.status === 'Approved');
  const history = requests.filter(r => ['Fulfilled', 'Confirmed'].includes(r.status));
  const getColor = (status) => ({ Approved: 'info', Fulfilled: 'primary', Confirmed: 'success' }[status] || 'default');

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" fontWeight="bold" color="primary" mb={1}>Supervisor Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>Ensure delivery of all approved resources</Typography>

      {alert.show && <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert({ ...alert, show: false })}>{alert.message}</Alert>}

      {/* My Assigned Events */}
      {events.length > 0 && (
        <Box mb={5}>
          <Typography variant="h6" fontWeight="bold" mb={2}>My Assigned Events</Typography>
          <Grid container spacing={3}>
            {events.map(ev => (
              <Grid item xs={12} sm={6} md={4} key={ev._id}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" color="primary">{ev.name}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {ev.type} | {new Date(ev.date).toLocaleDateString()}{ev.endDate ? ` – ${new Date(ev.endDate).toLocaleDateString()}` : ''}
                    </Typography>
                    <Typography variant="body2" mb={1}>Manager: {ev.managerId?.name || '—'}</Typography>
                    {Array.isArray(ev.initialRequirements) && ev.initialRequirements.length > 0 && (
                      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(212,175,55,0.03)', borderRadius: 1.5, border: '1px dashed #D4AF37' }}>
                        <Typography variant="caption" fontWeight="bold" color="primary" display="block" mb={0.5}>Initial Scope / Requirements:</Typography>
                        <Table size="small">
                          <TableBody>
                            {ev.initialRequirements.map((r, i) => (
                              <TableRow key={i} sx={{ '& td': { border: 0, p: 0.2 } }}>
                                <TableCell><Typography variant="caption" fontWeight="medium">{r.name}</Typography></TableCell>
                                <TableCell align="right"><Typography variant="caption" fontWeight="bold">x{r.quantity}</Typography></TableCell>
                                <TableCell align="right"><Chip label={r.category?.replace('_', ' ')} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem', color: 'text.secondary' }} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    )}
                    <Chip
                      label={ev.status.toUpperCase()} size="small" sx={{ mt: 2, fontWeight: 'bold' }}
                      color={ev.status === 'Upcoming' ? 'warning' : ev.status === 'Ongoing' ? 'info' : ev.status === 'Terminated' ? 'error' : 'success'}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Typography variant="h6" fontWeight="bold" mb={2}>
        Approved Requests — Action Required
        {approved.length > 0 && <Chip label={approved.length} color="info" size="small" sx={{ ml: 2 }} />}
      </Typography>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, mb: 5 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Mark Fulfilled</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress color="primary" /></TableCell></TableRow>
            ) : approved.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No pending tasks right now.</TableCell></TableRow>
            ) : approved.map(req => (
              <TableRow key={req._id} hover>
                <TableCell>{req.eventId?.name}</TableCell>
                <TableCell>{req.clientId?.name}</TableCell>
                <TableCell fontWeight="bold" color="primary.main">{req.resourceName}</TableCell>
                <TableCell><Chip label={req.resourceId?.category?.replace('_', ' ').toUpperCase()} size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'text.secondary' }}/></TableCell>
                <TableCell><Typography fontWeight="bold">{req.quantity}</Typography></TableCell>
                <TableCell><Chip label={req.status} size="small" color={getColor(req.status)} sx={{ fontWeight: 'bold' }}/></TableCell>
                <TableCell align="right">
                  <Tooltip title="Mark resource as successfully delivered/fulfilled">
                    <IconButton color="primary" onClick={() => handleFulfill(req._id)}>
                      <CheckCircleIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {history.length > 0 && (
        <>
          <Typography variant="h6" fontWeight="bold" mb={2}>Fulfillment History</Typography>
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map(req => (
                  <TableRow key={req._id} hover>
                    <TableCell>{req.eventId?.name}</TableCell>
                    <TableCell>{req.resourceName}</TableCell>
                    <TableCell>{req.resourceId?.category?.replace('_', ' ').toUpperCase()}</TableCell>
                    <TableCell>{req.quantity}</TableCell>
                    <TableCell><Chip label={req.status} size="small" color={getColor(req.status)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Container>
  );
};

export default SupervisorDashboard;
