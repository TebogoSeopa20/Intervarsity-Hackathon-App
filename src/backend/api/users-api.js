// users-api.js
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

// GET all users (with optional filters)
router.get('/users', async (req, res) => {
  try {
    const { 
      role, 
      is_verified, 
      cultural_affiliation,
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' });

    // Apply filters
    if (role) {
      query = query.eq('role', role);
    }

    if (is_verified !== undefined) {
      query = query.eq('is_verified', is_verified === 'true');
    }

    if (cultural_affiliation) {
      query = query.eq('cultural_affiliation', cultural_affiliation);
    }

    // Apply pagination and ordering
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

// GET user by ID
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET user by email
router.get('/users/email/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET users by role
router.get('/users/role/:role', async (req, res) => {
  const { role } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('role', role)
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

// PATCH update user profile
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
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

// PATCH update user verification status
router.patch('/users/:id/verification', async (req, res) => {
  const { id } = req.params;
  const { is_verified } = req.body;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_verified,
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

// GET user statistics
router.get('/users-stats', async (req, res) => {
  try {
    // Get total users
    const { count: totalUsers, error: totalError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) throw totalError;

    // Get users by role
    const { count: seekers, error: seekersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'seeker');
    
    if (seekersError) throw seekersError;

    const { count: contributors, error: contributorsError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'contributor');
    
    if (contributorsError) throw contributorsError;

    const { count: moderators, error: moderatorsError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'moderator');
    
    if (moderatorsError) throw moderatorsError;

    // Get verified users count
    const { count: verifiedUsers, error: verifiedError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', true);
    
    if (verifiedError) throw verifiedError;

    res.status(200).json({
      total_users: totalUsers,
      by_role: {
        seekers,
        contributors,
        moderators
      },
      verified_users: verifiedUsers
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET users by cultural affiliation
router.get('/users/cultural/:affiliation', async (req, res) => {
  const { affiliation } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .eq('cultural_affiliation', affiliation)
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