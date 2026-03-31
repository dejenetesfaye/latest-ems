import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Container, Typography, Box, Card, CardContent, Grid, Button, 
  CircularProgress, Alert, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, TextField 
} from '@mui/material';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import SendIcon from '@mui/icons-material/Send';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const BrideDashboard = () => {
  const [eventData, setEventData] = useState(null);
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Request Form
  const [requestForm, setRequestForm] = useState({ resourceName: '', quantity: 1, note: '' });
  const [reqLoading, setReqLoading] = useState(false);
  const [alert, setAlert] = useState({ show: false, message: '', severity: 'success' });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Get events assigned to bride
      const res = await api.get('/events');
      if (res.data.length > 0) {
        const currentEvent = res.data[0];
        setEventData(currentEvent);

        // Fetch Resources for this event
        const resData = await api.get(`/events/${currentEvent._id}/resources`);
        setResources(resData.data);

        // Fetch Requests
        const reqData = await api.get('/requests');
        setRequests(reqData.data);
      }
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!eventData) return;
    setReqLoading(true);
    try {
      await api.post('/requests', {
        eventId: eventData._id,
        ...requestForm
      });
      setAlert({ show: true, message: 'Request sent successfully!', severity: 'success' });
      setRequestForm({ resourceName: '', quantity: 1, note: '' });
      fetchData(); // Refresh requests list
    } catch (error) {
      setAlert({ show: true, message: error.response?.data?.message || 'Error executing request', severity: 'error' });
    }
    setReqLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'warning';
      case 'Approved': return 'info';
      case 'Rejected': return 'error';
      case 'Fulfilled': return 'primary';
      case 'Confirmed': return 'success';
      default: return 'default';
    }
  };

  if (loading) {
     return <Box display="flex" justifyContent="center" mt={10}><CircularProgress /></Box>;
  }

  if (!eventData) {
     return (
       <Container>
         <Alert severity="info" sx={{ mt: 5 }}>You have no events assigned yet. Please contact your manager.</Alert>
       </Container>
     );
  }

  // Prep Chart Data
  const pieData = resources.map(r => ({ name: r.name, value: r.totalCost }));

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            {eventData.name}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Your Event Dashboard | Manager: {eventData.managerId?.name}
          </Typography>
        </Box>
        <Typography variant="h5" color="secondary" fontWeight="bold">
          Total Cost: ${eventData.totalCost}
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* Charts Section */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" mb={2}>Cost Breakdown</Typography>
              {resources.length === 0 ? (
                <Typography color="text.secondary">No resources allocated yet.</Typography>
              ) : (
                <Box height={300}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `$${value}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Send Request Form */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" mb={2}>Make a Resource Request</Typography>
              {alert.show && (
                <Alert severity={alert.severity} sx={{ mb: 2 }} onClose={() => setAlert({ ...alert, show: false })}>
                  {alert.message}
                </Alert>
              )}
              <form onSubmit={handleSendRequest}>
                <Grid container spacing={2}>
                  <Grid item xs={8}>
                    <TextField 
                      fullWidth label="What do you need? (e.g., More Plates)" size="small" required
                      value={requestForm.resourceName} onChange={(e) => setRequestForm({...requestForm, resourceName: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <TextField 
                      fullWidth label="Quantity" type="number" size="small" inputProps={{ min: 1 }} required
                      value={requestForm.quantity} onChange={(e) => setRequestForm({...requestForm, quantity: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField 
                      fullWidth label="Optional Note" size="small" multiline rows={2}
                      value={requestForm.note} onChange={(e) => setRequestForm({...requestForm, note: e.target.value})}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button 
                      variant="contained" color="primary" type="submit" 
                      endIcon={!reqLoading && <SendIcon />} disabled={reqLoading}
                    >
                      {reqLoading ? <CircularProgress size={24} color="inherit" /> : 'Send Request to Manager'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Requests Status Timeline */}
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight="bold" mt={2} mb={2}>
            Your Request Timeline
          </Typography>
          <TableContainer component={Paper} elevation={2}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f3f4f6' }}>
                <TableRow>
                  <TableCell>Resource</TableCell>
                  <TableCell>Qty</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                      No requests made.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req._id}>
                      <TableCell fontWeight="bold">{req.resourceName}</TableCell>
                      <TableCell>{req.quantity}</TableCell>
                      <TableCell>{req.note}</TableCell>
                      <TableCell>
                        <Chip label={req.status} color={getStatusColor(req.status)} size="small" />
                      </TableCell>
                      <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Container>
  );
};

export default BrideDashboard;
