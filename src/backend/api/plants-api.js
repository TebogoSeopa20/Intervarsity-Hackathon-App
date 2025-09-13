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

// Helper function to upload image to Supabase Storage
const uploadImageToStorage = async (file, fileName, folder = 'plants') => {
  try {
    const { data, error } = await supabase.storage
      .from('plant-images')
      .upload(`${folder}/${fileName}`, file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('plant-images')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

// Helper function to delete image from Supabase Storage
const deleteImageFromStorage = async (filePath) => {
  try {
    // Extract the path from the URL if a full URL is provided
    let path = filePath;
    if (filePath.includes('/plant-images/')) {
      path = filePath.split('/plant-images/')[1];
    }

    const { error } = await supabase.storage
      .from('plant-images')
      .remove([path]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting image:', error.message);
    return false;
  }
};

// GET all plants (with optional filters)
router.get('/plants', async (req, res) => {
  try {
    const { 
      verification_status, 
      cultural_group, 
      region, 
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = supabase
      .from('plants')
      .select('*', { count: 'exact' });

    // Apply filters
    if (verification_status) {
      query = query.eq('verification_status', verification_status);
    }

    if (cultural_group) {
      query = query.eq('cultural_group', cultural_group);
    }

    if (region) {
      query = query.contains('regions_found', [region]);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

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

// GET plant by ID
router.get('/plants/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('plants')
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
      return res.status(404).json({ error: 'Plant not found' });
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET plants by user ID
router.get('/users/:userId/plants', async (req, res) => {
  const { userId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  try {
    const { data, error, count } = await supabase
      .from('plants')
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

// POST create new plant with image upload
router.post('/plants', upload.fields([
  { name: 'main_image', maxCount: 1 },
  { name: 'additional_images', maxCount: 10 }
]), async (req, res) => {
  try {
    const plantData = req.body;
    const files = req.files;
    
    // Parse JSON fields if they are sent as strings
    if (plantData.local_names && typeof plantData.local_names === 'string') {
      plantData.local_names = JSON.parse(plantData.local_names);
    }
    
    if (plantData.traditional_uses && typeof plantData.traditional_uses === 'string') {
      plantData.traditional_uses = JSON.parse(plantData.traditional_uses);
    }
    
    if (plantData.regions_found && typeof plantData.regions_found === 'string') {
      plantData.regions_found = JSON.parse(plantData.regions_found);
    }

    // Upload main image if provided
    if (files && files.main_image) {
      const mainImageFile = files.main_image[0];
      const fileName = `main_${Date.now()}_${mainImageFile.originalname}`;
      plantData.photo_url = await uploadImageToStorage(mainImageFile, fileName);
    }

    // Upload additional images if provided
    if (files && files.additional_images) {
      plantData.additional_photos = [];
      
      for (let i = 0; i < files.additional_images.length; i++) {
        const additionalImageFile = files.additional_images[i];
        const fileName = `additional_${Date.now()}_${i}_${additionalImageFile.originalname}`;
        const imageUrl = await uploadImageToStorage(additionalImageFile, fileName);
        plantData.additional_photos.push(imageUrl);
      }
    }

    const { data, error } = await supabase
      .from('plants')
      .insert([plantData])
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update plant with optional image updates
router.put('/plants/:id', upload.fields([
  { name: 'main_image', maxCount: 1 },
  { name: 'additional_images', maxCount: 10 }
]), async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const files = req.files;

  try {
    // Parse JSON fields if they are sent as strings
    if (updates.local_names && typeof updates.local_names === 'string') {
      updates.local_names = JSON.parse(updates.local_names);
    }
    
    if (updates.traditional_uses && typeof updates.traditional_uses === 'string') {
      updates.traditional_uses = JSON.parse(updates.traditional_uses);
    }
    
    if (updates.regions_found && typeof updates.regions_found === 'string') {
      updates.regions_found = JSON.parse(updates.regions_found);
    }

    // Get current plant data to handle image deletions
    const { data: currentPlant, error: fetchError } = await supabase
      .from('plants')
      .select('photo_url, additional_photos')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Handle main image update
    if (files && files.main_image) {
      // Delete old main image if it exists
      if (currentPlant.photo_url) {
        await deleteImageFromStorage(currentPlant.photo_url);
      }
      
      // Upload new main image
      const mainImageFile = files.main_image[0];
      const fileName = `main_${Date.now()}_${mainImageFile.originalname}`;
      updates.photo_url = await uploadImageToStorage(mainImageFile, fileName);
    }

    // Handle additional images
    if (files && files.additional_images) {
      // Start with existing additional photos or empty array
      updates.additional_photos = currentPlant.additional_photos || [];
      
      // Add new additional images
      for (let i = 0; i < files.additional_images.length; i++) {
        const additionalImageFile = files.additional_images[i];
        const fileName = `additional_${Date.now()}_${i}_${additionalImageFile.originalname}`;
        const imageUrl = await uploadImageToStorage(additionalImageFile, fileName);
        updates.additional_photos.push(imageUrl);
      }
    }

    // Handle image deletions if requested
    if (updates.delete_images) {
      const imagesToDelete = JSON.parse(updates.delete_images);
      
      if (imagesToDelete.main && currentPlant.photo_url) {
        await deleteImageFromStorage(currentPlant.photo_url);
        updates.photo_url = null;
      }
      
      if (imagesToDelete.additional && currentPlant.additional_photos) {
        const updatedAdditionalPhotos = [];
        
        for (const url of currentPlant.additional_photos) {
          if (!imagesToDelete.additional.includes(url)) {
            updatedAdditionalPhotos.push(url);
          } else {
            await deleteImageFromStorage(url);
          }
        }
        
        updates.additional_photos = updatedAdditionalPhotos;
      }
      
      // Remove the delete_images field as it's not part of the table schema
      delete updates.delete_images;
    }

    const { data, error } = await supabase
      .from('plants')
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

// DELETE plant and associated images
router.delete('/plants/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // User ID for verification

  try {
    // First verify the user owns this plant or is moderator
    const { data: plant, error: fetchError } = await supabase
      .from('plants')
      .select('user_id, photo_url, additional_photos')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    if (!plant) {
      return res.status(404).json({ error: 'Plant not found' });
    }

    // Check if user is owner or moderator
    const { data: user } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user_id)
      .single();

    if (plant.user_id !== user_id && user?.role !== 'moderator') {
      return res.status(403).json({ error: 'Unauthorized to delete this plant' });
    }

    // Delete associated images from storage
    if (plant.photo_url) {
      await deleteImageFromStorage(plant.photo_url);
    }
    
    if (plant.additional_photos && plant.additional_photos.length > 0) {
      for (const imageUrl of plant.additional_photos) {
        await deleteImageFromStorage(imageUrl);
      }
    }

    // Delete plant record
    const { error } = await supabase
      .from('plants')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({ message: 'Plant and associated images deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET search plants
router.get('/search/plants', async (req, res) => {
  const { q, cultural_group, region, verification_status = 'verified' } = req.query;

  try {
    let query = supabase
      .from('plants')
      .select('*')
      .textSearch('search_vector', q, {
        type: 'websearch',
        config: 'english'
      });

    if (cultural_group) {
      query = query.eq('cultural_group', cultural_group);
    }

    if (region) {
      query = query.contains('regions_found', [region]);
    }

    if (verification_status) {
      query = query.eq('verification_status', verification_status);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update plant verification status (for moderators)
router.patch('/plants/:id/verification', async (req, res) => {
  const { id } = req.params;
  const { verification_status, verified_by, verification_notes } = req.body;

  try {
    const { data, error } = await supabase
      .from('plants')
      .update({
        verification_status,
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