// seeker-reports-api.js
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

// GET all seeker reports (with optional filters)
router.get('/seeker-reports', async (req, res) => {
  try {
    const { 
      user_id, 
      status, 
      reason, 
      product_barcode,
      shop_name,
      start_date, 
      end_date,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('seeker_reports')
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

    if (reason) {
      query = query.eq('reason', reason);
    }

    if (product_barcode) {
      query = query.eq('product_barcode', product_barcode);
    }

    if (shop_name) {
      query = query.ilike('shop_name', `%${shop_name}%`);
    }

    // Date range filter
    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
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

// GET seeker report by ID
router.get('/seeker-reports/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('seeker_reports')
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
      .eq('report_id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET seeker reports by user ID
router.get('/users/:userId/seeker-reports', async (req, res) => {
  const { userId } = req.params;
  const { 
    status, 
    limit = 20, 
    offset = 0 
  } = req.query;

  try {
    let query = supabase
      .from('seeker_reports')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
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

// POST create new seeker report
router.post('/seeker-reports', async (req, res) => {
  try {
    const reportData = req.body;

    // Validate required fields
    if (!reportData.user_id || !reportData.product_name || 
        !reportData.shop_name || !reportData.reason || !reportData.description) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, product_name, shop_name, reason, description' 
      });
    }

    // Validate reason
    const validReasons = ['EXPIRED', 'FAKE', 'MISLABELLED', 'MADE_ME_SICK', 'UNUSUAL_TASTE'];
    if (!validReasons.includes(reportData.reason)) {
      return res.status(400).json({ 
        error: 'Invalid reason. Must be one of: EXPIRED, FAKE, MISLABELLED, MADE_ME_SICK, UNUSUAL_TASTE' 
      });
    }

    const { data, error } = await supabase
      .from('seeker_reports')
      .insert([{
        ...reportData,
        status: reportData.status || 'PENDING_REVIEW'
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

// PUT update seeker report
router.put('/seeker-reports/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Check if report exists
    const { data: existingReport, error: fetchError } = await supabase
      .from('seeker_reports')
      .select('*')
      .eq('report_id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Validate reason if being updated
    if (updates.reason) {
      const validReasons = ['EXPIRED', 'FAKE', 'MISLABELLED', 'MADE_ME_SICK', 'UNUSUAL_TASTE'];
      if (!validReasons.includes(updates.reason)) {
        return res.status(400).json({ 
          error: 'Invalid reason. Must be one of: EXPIRED, FAKE, MISLABELLED, MADE_ME_SICK, UNUSUAL_TASTE' 
        });
      }
    }

    const { data, error } = await supabase
      .from('seeker_reports')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('report_id', id)
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

// DELETE seeker report
router.delete('/seeker-reports/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // User ID for verification

  try {
    // First verify the user owns this report or is moderator
    const { data: report, error: fetchError } = await supabase
      .from('seeker_reports')
      .select('user_id')
      .eq('report_id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check if user is owner or moderator
    const { data: user } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (report.user_id !== user_id && user?.role !== 'moderator') {
      return res.status(403).json({ error: 'Unauthorized to delete this report' });
    }

    // Delete report record
    const { error } = await supabase
      .from('seeker_reports')
      .delete()
      .eq('report_id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update seeker report status
router.patch('/seeker-reports/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Validate status
    const validStatuses = ['PENDING_REVIEW', 'UNDER_INVESTIGATION', 'RESOLVED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: PENDING_REVIEW, UNDER_INVESTIGATION, RESOLVED' 
      });
    }

    const { data, error } = await supabase
      .from('seeker_reports')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('report_id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET reports by barcode
router.get('/seeker-reports/barcode/:barcode', async (req, res) => {
  const { barcode } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('seeker_reports')
      .select('*', { count: 'exact' })
      .eq('product_barcode', barcode)
      .order('created_at', { ascending: false })
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

module.exports = router;