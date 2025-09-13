// appointments-api.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false
  }
});

// GET all appointments (with optional filters)
router.get('/appointments', async (req, res) => {
  try {
    const { 
      user_id, 
      status, 
      appointment_type, 
      start_date, 
      end_date,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      `, { count: 'exact' });

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (appointment_type) {
      query = query.eq('appointment_type', appointment_type);
    }

    // Date range filter
    if (start_date) {
      query = query.gte('start_time', start_date);
    }

    if (end_date) {
      query = query.lte('end_time', end_date);
    }

    // Apply pagination and ordering
    query = query
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.status(200).json({
      data,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET appointment by ID
router.get('/appointments/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url,
          cultural_affiliation
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET appointments by user ID
router.get('/users/:userId/appointments', async (req, res) => {
  const { userId } = req.params;
  const { 
    status, 
    upcoming = true,
    limit = 20, 
    offset = 0 
  } = req.query;

  try {
    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    // Filter for upcoming or past appointments
    if (upcoming === 'true') {
      query = query.gte('start_time', new Date().toISOString());
    } else if (upcoming === 'false') {
      query = query.lt('start_time', new Date().toISOString());
    }

    const { data, error, count } = await query
      .order('start_time', { ascending: upcoming === 'true' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.status(200).json({
      data,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new appointment
router.post('/appointments', async (req, res) => {
  try {
    const appointmentData = req.body;

    // Validate required fields
    if (!appointmentData.user_id || !appointmentData.title || 
        !appointmentData.start_time || !appointmentData.end_time) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, title, start_time, end_time' 
      });
    }

    // Validate time consistency
    if (new Date(appointmentData.start_time) >= new Date(appointmentData.end_time)) {
      return res.status(400).json({ 
        error: 'Start time must be before end time' 
      });
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointmentData,
        status: appointmentData.status || 'scheduled'
      }])
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update appointment
router.put('/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Check if appointment exists
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Validate time consistency if times are being updated
    if (updates.start_time && updates.end_time) {
      if (new Date(updates.start_time) >= new Date(updates.end_time)) {
        return res.status(400).json({ 
          error: 'Start time must be before end time' 
        });
      }
    } else if (updates.start_time && existingAppointment.end_time) {
      if (new Date(updates.start_time) >= new Date(existingAppointment.end_time)) {
        return res.status(400).json({ 
          error: 'Start time must be before end time' 
        });
      }
    } else if (updates.end_time && existingAppointment.start_time) {
      if (new Date(existingAppointment.start_time) >= new Date(updates.end_time)) {
        return res.status(400).json({ 
          error: 'Start time must be before end time' 
        });
      }
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          email,
          phone,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE appointment
router.delete('/appointments/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // User ID for verification

  try {
    // First verify the user owns this appointment or is moderator
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if user is owner or moderator
    const { data: user } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (appointment.user_id !== user_id && user?.role !== 'moderator') {
      return res.status(403).json({ error: 'Unauthorized to delete this appointment' });
    }

    // Delete appointment record
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update appointment status
router.patch('/appointments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: scheduled, confirmed, cancelled, completed' 
      });
    }

    const { data, error } = await supabase
      .from('appointments')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user's upcoming appointments
router.get('/users/:userId/appointments/upcoming', async (req, res) => {
  const { userId } = req.params;
  const { limit = 10 } = req.query;

  try {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(parseInt(limit));

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET availability check (check for conflicting appointments)
router.get('/availability', async (req, res) => {
  const { user_id, start_time, end_time, exclude_appointment_id } = req.query;

  try {
    if (!user_id || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'Missing required parameters: user_id, start_time, end_time' 
      });
    }

    let query = supabase
      .from('appointments')
      .select('id, title, start_time, end_time')
      .eq('user_id', user_id)
      .in('status', ['scheduled', 'confirmed'])
      .or(`start_time.lte.${end_time},end_time.gte.${start_time}`);

    // Exclude current appointment when checking for updates
    if (exclude_appointment_id) {
      query = query.neq('id', exclude_appointment_id);
    }

    const { data, error } = await query;

    if (error) throw error;

    const isAvailable = data.length === 0;
    
    res.status(200).json({
      available: isAvailable,
      conflicting_appointments: data
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;