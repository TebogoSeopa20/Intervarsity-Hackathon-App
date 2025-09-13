// contributor-reports-api.js
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

// GET all contributor reports (with optional filters)
router.get('/contributor-reports', async (req, res) => {
  try {
    const { 
      user_id, 
      status, 
      reason, 
      batch_number,
      distributor_name,
      start_date, 
      end_date,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('contributor_reports')
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

    if (batch_number) {
      query = query.ilike('batch_number', `%${batch_number}%`);
    }

    if (distributor_name) {
      query = query.ilike('distributor_name', `%${distributor_name}%`);
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

// GET contributor report by ID
router.get('/contributor-reports/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('contributor_reports')
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

// GET contributor reports by user ID
router.get('/users/:userId/contributor-reports', async (req, res) => {
  const { userId } = req.params;
  const { 
    status, 
    limit = 20, 
    offset = 0 
  } = req.query;

  try {
    let query = supabase
      .from('contributor_reports')
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

// GET contributor reports by business ID
router.get('/business/:businessId/contributor-reports', async (req, res) => {
  const { businessId } = req.params;
  const { 
    status, 
    limit = 20, 
    offset = 0 
  } = req.query;

  try {
    let query = supabase
      .from('contributor_reports')
      .select('*', { count: 'exact' })
      .eq('business_id', businessId);

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

// POST create new contributor report
router.post('/contributor-reports', async (req, res) => {
  try {
    const reportData = req.body;

    // Validate required fields
    if (!reportData.user_id || !reportData.business_id || !reportData.product_name || 
        !reportData.distributor_name || !reportData.batch_number || !reportData.reason || 
        !reportData.description) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, business_id, product_name, distributor_name, batch_number, reason, description' 
      });
    }

    // Validate reason
    const validReasons = ['SUSPICIOUS_BATCH', 'KNOWINGLY_SOLD_FAKE', 'POOR_CONDITION', 
                         'MISSING_BARCODES', 'EXPIRED_GOODS', 'DAMAGED_GOODS'];
    if (!validReasons.includes(reportData.reason)) {
      return res.status(400).json({ 
        error: 'Invalid reason. Must be one of: SUSPICIOUS_BATCH, KNOWINGLY_SOLD_FAKE, POOR_CONDITION, MISSING_BARCODES, EXPIRED_GOODS, DAMAGED_GOODS' 
      });
    }

    const { data, error } = await supabase
      .from('contributor_reports')
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

// PUT update contributor report
router.put('/contributor-reports/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Check if report exists
    const { data: existingReport, error: fetchError } = await supabase
      .from('contributor_reports')
      .select('*')
      .eq('report_id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Validate reason if being updated
    if (updates.reason) {
      const validReasons = ['SUSPICIOUS_BATCH', 'KNOWINGLY_SOLD_FAKE', 'POOR_CONDITION', 
                           'MISSING_BARCODES', 'EXPIRED_GOODS', 'DAMAGED_GOODS'];
      if (!validReasons.includes(updates.reason)) {
        return res.status(400).json({ 
          error: 'Invalid reason. Must be one of: SUSPICIOUS_BATCH, KNOWINGLY_SOLD_FAKE, POOR_CONDITION, MISSING_BARCODES, EXPIRED_GOODS, DAMAGED_GOODS' 
        });
      }
    }

    const { data, error } = await supabase
      .from('contributor_reports')
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

// DELETE contributor report
router.delete('/contributor-reports/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // User ID for verification

  try {
    // First verify the user owns this report or is moderator
    const { data: report, error: fetchError } = await supabase
      .from('contributor_reports')
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
      .from('contributor_reports')
      .delete()
      .eq('report_id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update contributor report status
router.patch('/contributor-reports/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    // Validate status
    const validStatuses = ['PENDING_REVIEW', 'AWAITING_DISTRIBUTOR_RESPONSE', 'RESOLVED', 'UNDER_INVESTIGATION'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: PENDING_REVIEW, AWAITING_DISTRIBUTOR_RESPONSE, RESOLVED, UNDER_INVESTIGATION' 
      });
    }

    const { data, error } = await supabase
      .from('contributor_reports')
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

// GET reports by batch number
router.get('/contributor-reports/batch/:batchNumber', async (req, res) => {
  const { batchNumber } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('contributor_reports')
      .select('*', { count: 'exact' })
      .ilike('batch_number', `%${batchNumber}%`)
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

// GET reports by distributor
router.get('/contributor-reports/distributor/:distributorName', async (req, res) => {
  const { distributorName } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('contributor_reports')
      .select('*', { count: 'exact' })
      .ilike('distributor_name', `%${distributorName}%`)
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