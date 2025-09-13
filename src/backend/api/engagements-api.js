// engagements-api.js
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');

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

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to upload media to Supabase Storage
const uploadMediaToStorage = async (file, fileName, folder = 'engagements') => {
  try {
    const { data, error } = await supabase.storage
      .from('engagement-media')
      .upload(`${folder}/${fileName}`, file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('engagement-media')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    throw new Error(`Failed to upload media: ${error.message}`);
  }
};

// GET all engagements (with optional filters)
router.get('/engagements', async (req, res) => {
  try {
    const { 
      user_id, 
      engagement_type, 
      tags, 
      sort_by = 'created_at',
      sort_order = 'desc',
      limit = 20, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('engagements')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          cultural_affiliation
        ),
        user_has_liked:engagement_likes!left (
          id
        ).filter(user_id.eq.${req.query.current_user_id || null})
      `, { count: 'exact' });

    // Apply filters
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (engagement_type) {
      query = query.eq('engagement_type', engagement_type);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = query.contains('tags', tagArray);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'like_count', 'comment_count', 'view_count'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? { ascending: true } : { ascending: false };

    const { data, error, count } = await query
      .order(sortField, sortDirection)
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Transform data to include user_has_liked boolean
    const transformedData = data.map(engagement => ({
      ...engagement,
      user_has_liked: engagement.user_has_liked.length > 0
    }));

    res.status(200).json({
      data: transformedData,
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

// GET engagement by ID
router.get('/engagements/:id', async (req, res) => {
  const { id } = req.params;
  const { current_user_id } = req.query;

  try {
    const { data, error } = await supabase
      .from('engagements')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          cultural_affiliation
        ),
        user_has_liked:engagement_likes!left (
          id
        ).filter(user_id.eq.${current_user_id || null})
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    // Record view (if user is authenticated)
    if (current_user_id) {
      await supabase
        .from('engagement_views')
        .insert([{
          engagement_id: id,
          user_id: current_user_id
        }])
        .onConflict('(engagement_id, user_id)')
        .ignore();
    }

    const transformedData = {
      ...data,
      user_has_liked: data.user_has_liked.length > 0
    };

    res.status(200).json(transformedData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new engagement with media upload
router.post('/engagements', upload.array('media', 10), async (req, res) => {
  try {
    const engagementData = req.body;
    const files = req.files;

    // Parse array fields if they are sent as strings
    if (engagementData.tags && typeof engagementData.tags === 'string') {
      engagementData.tags = JSON.parse(engagementData.tags);
    }

    // Upload media files if provided
    if (files && files.length > 0) {
      engagementData.media_urls = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `media_${Date.now()}_${i}_${file.originalname}`;
        const mediaUrl = await uploadMediaToStorage(file, fileName);
        engagementData.media_urls.push(mediaUrl);
      }
    }

    const { data, error } = await supabase
      .from('engagements')
      .insert([engagementData])
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url,
          cultural_affiliation
        )
      `)
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update engagement
router.put('/engagements/:id', upload.array('media', 10), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const files = req.files;

  try {
    // Get current engagement data
    const { data: currentEngagement, error: fetchError } = await supabase
      .from('engagements')
      .select('media_urls')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Parse array fields if they are sent as strings
    if (updates.tags && typeof updates.tags === 'string') {
      updates.tags = JSON.parse(updates.tags);
    }

    // Handle media updates
    if (files && files.length > 0) {
      updates.media_urls = currentEngagement.media_urls || [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = `media_${Date.now()}_${i}_${file.originalname}`;
        const mediaUrl = await uploadMediaToStorage(file, fileName);
        updates.media_urls.push(mediaUrl);
      }
    }

    const { data, error } = await supabase
      .from('engagements')
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
          avatar_url,
          cultural_affiliation
        )
      `)
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE engagement
router.delete('/engagements/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;

  try {
    // Verify ownership or moderator role
    const { data: engagement, error: fetchError } = await supabase
      .from('engagements')
      .select('user_id, media_urls')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!engagement) {
      return res.status(404).json({ error: 'Engagement not found' });
    }

    const { data: user } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (engagement.user_id !== user_id && user?.role !== 'moderator') {
      return res.status(403).json({ error: 'Unauthorized to delete this engagement' });
    }

    // Delete engagement (cascade will handle comments, likes, and views)
    const { error } = await supabase
      .from('engagements')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Engagement deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST like/unlike engagement
router.post('/engagements/:id/like', async (req, res) => {
  const { id } = req.params;
  const { user_id, action = 'like' } = req.body;

  try {
    if (action === 'like') {
      const { data, error } = await supabase
        .from('engagement_likes')
        .insert([{ user_id, engagement_id: id }])
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ liked: true, like: data });
    } else {
      const { error } = await supabase
        .from('engagement_likes')
        .delete()
        .eq('user_id', user_id)
        .eq('engagement_id', id);

      if (error) throw error;
      res.status(200).json({ liked: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET comments for engagement
router.get('/engagements/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('engagement_comments')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        ),
        replies:engagement_comments!parent_comment_id (
          id,
          content,
          created_at,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        )
      `, { count: 'exact' })
      .eq('engagement_id', id)
      .is('parent_comment_id', null)
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

// POST create comment
router.post('/engagements/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { user_id, content, parent_comment_id } = req.body;

  try {
    const { data, error } = await supabase
      .from('engagement_comments')
      .insert([{
        engagement_id: id,
        user_id,
        content,
        parent_comment_id: parent_comment_id || null
      }])
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
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

// GET search engagements
router.get('/search/engagements', async (req, res) => {
  const { q, tags, engagement_type } = req.query;

  try {
    let query = supabase
      .from('engagements')
      .select(`
        *,
        profiles:user_id (
          id,
          full_name,
          avatar_url
        )
      `);

    if (q) {
      query = query.textSearch('content', q, {
        type: 'websearch',
        config: 'english'
      });
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query = query.overlaps('tags', tagArray);
    }

    if (engagement_type) {
      query = query.eq('engagement_type', engagement_type);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;