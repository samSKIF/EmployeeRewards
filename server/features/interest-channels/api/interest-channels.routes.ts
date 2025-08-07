// Interest Channels API Routes
// Defines all HTTP routes for interest channels management operations

import { Router } from 'express';
import { verifyToken, verifyAdmin } from '../../../middleware/auth';
import { InterestChannelsController } from './interest-channels.controller';

const router = Router();

/**
 * Interest Channels Management Routes
 * /api/interest-channels/*
 */

// Get all interest channels for organization
router.get('/', verifyToken, InterestChannelsController.getInterestChannels);

// Get interest channel by ID
router.get('/:id', verifyToken, InterestChannelsController.getInterestChannelById);

// Create new interest channel (authenticated users)
router.post('/', verifyToken, InterestChannelsController.createInterestChannel);

// Update interest channel (members with admin/moderator role)
router.patch('/:id', verifyToken, InterestChannelsController.updateInterestChannel);

/**
 * Channel Posts Routes
 * /api/interest-channels/:id/posts/*
 */

// Get channel posts
router.get('/:id/posts', verifyToken, InterestChannelsController.getChannelPosts);

// Create channel post
router.post('/posts', verifyToken, InterestChannelsController.createChannelPost);

// Toggle post pin status (admin/moderator only)
router.patch('/:channelId/posts/:postId/pin', verifyToken, InterestChannelsController.togglePostPin);

/**
 * Channel Membership Routes
 * /api/interest-channels/membership/*
 */

// Request to join channel
router.post('/join', verifyToken, InterestChannelsController.requestToJoinChannel);

// Process join request (approve/reject) - admin/moderator only
router.patch('/requests/:requestId', verifyToken, InterestChannelsController.processJoinRequest);

// Leave channel
router.delete('/:id/leave', verifyToken, InterestChannelsController.leaveChannel);

export default router;