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

// GET all cultural practices (with optional filters)
router.get('/cultural-practices', async (req, res) => {
  try {
    const { 
      type, 
      cultural_group, 
      verification_status,
      cultural_sensitivity_level = 'public',
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('cultural_practices')
      .select('*', { count: 'exact' })
      .eq('cultural_sensitivity_level', cultural_sensitivity_level);

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    if (cultural_group) {
      query = query.eq('cultural_group', cultural_group);
    }

    if (verification_status) {
      query = query.eq('verification_status', verification_status);
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

// GET cultural practice by ID
router.get('/cultural-practices/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('cultural_practices')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          cultural_affiliation
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Cultural practice not found' });
    }

    // Check cultural sensitivity
    if (data.cultural_sensitivity_level !== 'public') {
      // Verify user has access (simplified - you might want to add proper auth checks)
      const userCulturalGroup = req.headers['x-cultural-group']; // Example header
      if (userCulturalGroup !== data.cultural_group) {
        return res.status(403).json({ error: 'Access restricted to cultural members' });
      }
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET cultural practices by user ID
router.get('/users/:userId/cultural-practices', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('cultural_practices')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
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

// POST create new cultural practice
router.post('/cultural-practices', async (req, res) => {
  const practiceData = req.body;

  try {
    const { data, error } = await supabase
      .from('cultural_practices')
      .insert([practiceData])
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update cultural practice
router.put('/cultural-practices/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
      .from('cultural_practices')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        last_updated_by: updates.user_id
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

// DELETE cultural practice
router.delete('/cultural-practices/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  try {
    // Verify ownership or moderator role
    const { data: practice, error: fetchError } = await supabase
      .from('cultural_practices')
      .select('user_id, cultural_sensitivity_level')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!practice) {
      return res.status(404).json({ error: 'Cultural practice not found' });
    }

    const { data: user } = await supabase
      .from('profiles')
      .select('role, cultural_affiliation')
      .eq('id', user_id)
      .single();

    const isOwner = practice.user_id === user_id;
    const isModerator = user?.role === 'moderator';
    const isCulturalMember = user?.cultural_affiliation === practice.cultural_group;

    if (!isOwner && !isModerator && !isCulturalMember) {
      return res.status(403).json({ error: 'Unauthorized to delete this cultural practice' });
    }

    const { error } = await supabase
      .from('cultural_practices')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Cultural practice deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET search cultural practices
router.get('/search/cultural-practices', async (req, res) => {
  const { q, type, cultural_group, time_of_year } = req.query;

  try {
    let query = supabase
      .from('cultural_practices')
      .select('*')
      .eq('verification_status', 'verified')
      .eq('cultural_sensitivity_level', 'public');

    if (q) {
      query = query.textSearch('search_vector', q, {
        type: 'websearch',
        config: 'english'
      });
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (cultural_group) {
      query = query.eq('cultural_group', cultural_group);
    }

    if (time_of_year) {
      query = query.ilike('time_of_year', `%${time_of_year}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET cultural practices by type and group
router.get('/cultural-practices/group/:culturalGroup/type/:type', async (req, res) => {
  const { culturalGroup, type } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('cultural_practices')
      .select('*', { count: 'exact' })
      .eq('cultural_group', culturalGroup)
      .eq('type', type)
      .eq('verification_status', 'verified')
      .eq('cultural_sensitivity_level', 'public')
      .order('title')
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

// PATCH update cultural practice verification status
router.patch('/cultural-practices/:id/verification', async (req, res) => {
  const { id } = req.params;
  const { verification_status, cultural_sensitivity_level, verified_by, verification_notes } = req.body;

  try {
    const { data, error } = await supabase
      .from('cultural_practices')
      .update({
        verification_status,
        cultural_sensitivity_level,
        verified_by,
        verification_notes,
        verified_at: new Date().toISOString()
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

module.exports = router;