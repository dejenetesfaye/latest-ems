import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { SocketContext } from '../context/SocketContext';
import {
  Container, Typography, Box, Card, CardContent, Grid, Button,
  CircularProgress, Alert, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Snackbar, AlertTitle
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const STATUS_COLOR = { 
  Pending: 'warning', Approved: 'info', Rejected: 'error', 
  Fulfilled: 'primary', Confirmed: 'success',
  Returning: 'secondary', Returned: 'info', Stocked: 'success'
};

const ManagerDashboard = () => {
  const socket = useContext(SocketContext);
  const [requests, setRequests] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });
  const [socketAlert, setSocketAlert] = useState({ show: false, message: '' });

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
    socket.on('request_created', () => fetchData());
    socket.on('request_updated', () => fetchData());
    socket.on('new_assignment', () => fetchData());
    socket.on('activity_update', () => fetchData());
    socket.on('inventory_alert', (data) => {
      setSocketAlert({ show: true, message: data.message });
      fetchData();
    });
    return () => {
      socket.off('request_created');
      socket.off('request_updated');
      socket.off('new_assignment');
      socket.off('activity_update');
      socket.off('inventory_alert');
    };
  }, [socket]);

  const handleStatus = async (id, status) => {
    try {
      await api.put(`/requests/${id}/status`, { status });
      setAlert({ show: true, message: `Request ${status}!`, severity: status === 'Approved' ? 'success' : 'error' });
      // We don't need to fetchData here immediately if the socket event triggers it, but it's safe to do so.
    } catch (err) {
      setAlert({ show: true, message: err.response?.data?.message || 'Error', severity: 'error' });
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'Pending');
  const returnedRequests = requests.filter(r => r.status === 'Returned');
  const otherRequests = requests.filter(r => !['Pending', 'Returned'].includes(r.status));

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Snackbar open={socketAlert.show} autoHideDuration={8000} onClose={() => setSocketAlert({ show: false, message: '' })} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity="warning" variant="filled" onClose={() => setSocketAlert({ show: false, message: '' })} sx={{ width: '100%', borderLeft: '4px solid #000' }}>
          <AlertTitle sx={{ fontWeight: 'bold' }}>Inventory Alert (Real-time)</AlertTitle>
          {socketAlert.message}
        </Alert>
      </Snackbar>

      <Typography variant="h4" fontWeight="bold" color="primary" mb={1}>Manager Dashboard</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>Review and approve client resource requests</Typography>

      {alert.show && <Alert severity={alert.severity} sx={{ mb: 3 }} onClose={() => setAlert({ ...alert, show: false })}>{alert.message}</Alert>}

      {/* My Events Summary */}
      {events.length > 0 && (
        <Box mb={5}>
          <Typography variant="h6" fontWeight="bold" mb={2}>My Assigned Events</Typography>
          <Grid container spacing={3}>
            {events.map(ev => (
              <Grid item xs={12} sm={6} md={4} key={ev._id}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" fontWeight="bold" color="primary">{ev.name}</Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>{ev.type} | {new Date(ev.date).toLocaleDateString()} - {ev.endDate ? new Date(ev.endDate).toLocaleDateString() : '?'}</Typography>
                    <Typography variant="body2">Client: {ev.clientId?.name || '—'}</Typography>
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
                    <Chip label={ev.status.toUpperCase()} size="small" sx={{ mt: 2, fontWeight: 'bold' }}
                      color={ev.status === 'Upcoming' ? 'warning' : ev.status === 'Ongoing' ? 'info' : ev.status === 'Terminated' ? 'error' : 'success'} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Pending Requests */}
      <Typography variant="h6" fontWeight="bold" mb={2}>
        Pending Requests
        {pendingRequests.length > 0 && <Chip label={pendingRequests.length} color="warning" size="small" sx={{ ml: 2 }} />}
      </Typography>

      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, mb: 5 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Client</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Category</TableCell>
              <TableCell>Qty</TableCell>
              <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Note</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress color="primary" /></TableCell></TableRow>
            ) : pendingRequests.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No pending requests.</TableCell></TableRow>
            ) : pendingRequests.map(req => (
              <TableRow key={req._id} hover>
                <TableCell>{req.eventId?.name}</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>{req.clientId?.name}</TableCell>
                <TableCell fontWeight="bold" color="primary.main">{req.resourceName}</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}><Chip label={req.resourceId?.category?.replace('_', ' ').toUpperCase()} size="small" variant="outlined" sx={{ color: 'text.secondary', borderColor: 'text.secondary' }}/></TableCell>
                <TableCell><Typography fontWeight="bold">{req.quantity}</Typography></TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{req.note || '—'}</TableCell>
                <TableCell align="right">
                  <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />}
                    sx={{ mr: 1 }} onClick={() => handleStatus(req._id, 'Approved')}>Approve</Button>
                  <Button size="small" variant="outlined" color="error" startIcon={<CancelIcon />}
                    onClick={() => handleStatus(req._id, 'Rejected')}>Reject</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Returned for Restock Section */}
      {returnedRequests.length > 0 && (
        <Box mb={5}>
          <Typography variant="h6" fontWeight="bold" mb={2} color="secondary">
            Verified Returns — Ready for Restock
            <Chip label={returnedRequests.length} color="secondary" size="small" sx={{ ml: 2 }} />
          </Typography>
          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2, border: '1px solid rgba(156, 39, 176, 0.2)' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'rgba(156, 39, 176, 0.05)' }}>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returnedRequests.map(req => (
                  <TableRow key={req._id} hover>
                    <TableCell>{req.eventId?.name}</TableCell>
                    <TableCell fontWeight="bold">{req.resourceName}</TableCell>
                    <TableCell><Typography fontWeight="bold" color="secondary">x{req.quantity}</Typography></TableCell>
                    <TableCell>{req.clientId?.name}</TableCell>
                    <TableCell align="right">
                      <Button variant="contained" color="secondary" size="small" onClick={() => handleStatus(req._id, 'Stocked')} startIcon={<CheckCircleIcon />}>
                        Confirm & Restock
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* All Request History */}
      {otherRequests.length > 0 && (
        <>
          <Typography variant="h6" fontWeight="bold" mb={2}>Request History</Typography>
          <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {otherRequests.map(req => (
                  <TableRow key={req._id} hover>
                    <TableCell>{req.eventId?.name}</TableCell>
                    <TableCell>{req.resourceName}</TableCell>
                    <TableCell>{req.resourceId?.category?.replace('_', ' ').toUpperCase()}</TableCell>
                    <TableCell>{req.quantity}</TableCell>
                    <TableCell><Chip label={req.status} size="small" color={STATUS_COLOR[req.status] || 'default'} sx={{fontWeight: 'bold'}} /></TableCell>
                    <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
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

export default ManagerDashboard;
