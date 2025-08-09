import { Router } from 'express';
import { storage } from '../../storage';
import { verifyToken, verifyAdmin } from '../../middleware/auth';
import { AuthenticatedRequest } from '../../types/auth';
import { logger } from '@platform/sdk';

const router = Router();

// Get all locations for organization
router.get('/', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    if (!organizationId) {
      return res.status(400).json({ message: 'Organization ID is required' });
    }

    const locations = await storage.getLocationsByOrganization(organizationId);
    res.json(locations);
  } catch (error: any) {
    logger.error('Error fetching locations:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch locations' });
  }
});

// Create new location
router.post('/', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const organizationId = req.user?.organization_id;
    const userId = req.user?.id;
    
    if (!organizationId || !userId) {
      return res.status(400).json({ message: 'Organization ID and User ID are required' });
    }

    const { name, address, timezone } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Location name is required' });
    }

    const locationData = {
      organization_id: organizationId,
      name: name.trim(),
      address: address?.trim() || null,
      timezone: timezone?.trim() || null,
      is_active: true,
      created_by: userId,
    };

    const newLocation = await storage.createLocation(locationData);
    logger.info(`Location created: ${newLocation.name} for org ${organizationId}`);
    
    res.json(newLocation);
  } catch (error: any) {
    logger.error('Error creating location:', error);
    res.status(500).json({ message: error.message || 'Failed to create location' });
  }
});

// Update location
router.put('/:id', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const locationId = parseInt(req.params.id);
    const { name, address, timezone, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Location name is required' });
    }

    const updateData = {
      name: name.trim(),
      address: address?.trim() || null,
      timezone: timezone?.trim() || null,
      is_active: is_active !== undefined ? is_active : true,
    };

    const updatedLocation = await storage.updateLocation(locationId, updateData);
    logger.info(`Location updated: ${updatedLocation.name}`);
    
    res.json(updatedLocation);
  } catch (error: any) {
    logger.error('Error updating location:', error);
    res.status(500).json({ message: error.message || 'Failed to update location' });
  }
});

// Delete location
router.delete('/:id', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const locationId = parseInt(req.params.id);
    
    await storage.deleteLocation(locationId);
    logger.info(`Location deleted: ${locationId}`);
    
    res.json({ message: 'Location deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting location:', error);
    res.status(500).json({ message: error.message || 'Failed to delete location' });
  }
});

// Get location by ID
router.get('/:id', verifyToken, verifyAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const locationId = parseInt(req.params.id);
    
    const location = await storage.getLocationById(locationId);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    
    res.json(location);
  } catch (error: any) {
    logger.error('Error fetching location:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch location' });
  }
});

export default router;