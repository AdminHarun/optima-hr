/**
 * Screen Share Routes
 * Task 2.3: Screen Share & Co-browsing
 *
 * Endpoints:
 * - POST /api/screen-share/start - Start a screen share session
 * - POST /api/screen-share/end/:sessionId - End a screen share session
 * - POST /api/screen-share/join/:sessionId - Join as viewer
 * - POST /api/screen-share/leave/:sessionId - Leave as viewer
 * - GET /api/screen-share/active - Get active session for channel/room
 * - POST /api/screen-share/signal/:sessionId - WebRTC signaling
 * - POST /api/screen-share/request-control/:sessionId - Request remote control
 * - POST /api/screen-share/grant-control/:sessionId - Grant remote control
 * - POST /api/screen-share/revoke-control/:sessionId - Revoke remote control
 * - GET /api/screen-share/history - Get session history
 */

const express = require('express');
const router = express.Router();
const screenShareService = require('../services/ScreenShareService');
const { Employee } = require('../models/associations');

// Site code helper
const getSiteCode = (req) => req.headers['x-site-id'] || 'FXB';

// Employee ID helper
const getEmployeeId = (req) => {
  return req.session?.employeeId || req.headers['x-employee-id'] || 1;
};

// Get employee name helper
const getEmployeeName = async (employeeId) => {
  try {
    const employee = await Employee.findByPk(employeeId, {
      attributes: ['first_name', 'last_name']
    });
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
};

/**
 * POST /api/screen-share/start
 * Start a screen share session
 */
router.post('/start', async (req, res) => {
  try {
    const { channelId, roomId, shareType = 'screen', allowControl = false } = req.body;
    const employeeId = getEmployeeId(req);
    const siteCode = getSiteCode(req);

    if (!channelId && !roomId) {
      return res.status(400).json({ error: 'channelId or roomId is required' });
    }

    const employeeName = await getEmployeeName(employeeId);

    const session = await screenShareService.startSession({
      sharerType: 'employee',
      sharerId: employeeId,
      sharerName: employeeName,
      channelId: channelId ? parseInt(channelId) : null,
      roomId: roomId ? parseInt(roomId) : null,
      shareType,
      allowControl,
      siteCode
    });

    res.status(201).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('Error starting screen share:', error);
    res.status(500).json({ error: error.message || 'Failed to start screen share' });
  }
});

/**
 * POST /api/screen-share/end/:sessionId
 * End a screen share session
 */
router.post('/end/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const employeeId = getEmployeeId(req);
    const employeeName = await getEmployeeName(employeeId);

    await screenShareService.endSession(sessionId, {
      type: 'employee',
      id: employeeId,
      name: employeeName
    });

    res.json({
      success: true,
      message: 'Screen share ended'
    });
  } catch (error) {
    console.error('Error ending screen share:', error);
    res.status(500).json({ error: error.message || 'Failed to end screen share' });
  }
});

/**
 * POST /api/screen-share/join/:sessionId
 * Join a screen share session as viewer
 */
router.post('/join/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const employeeId = getEmployeeId(req);
    const employeeName = await getEmployeeName(employeeId);

    const result = await screenShareService.addViewer(
      sessionId,
      'employee',
      employeeId,
      employeeName
    );

    res.json({
      success: true,
      viewerCount: result.viewerCount
    });
  } catch (error) {
    console.error('Error joining screen share:', error);
    res.status(500).json({ error: error.message || 'Failed to join screen share' });
  }
});

/**
 * POST /api/screen-share/leave/:sessionId
 * Leave a screen share session
 */
router.post('/leave/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const employeeId = getEmployeeId(req);

    const result = await screenShareService.removeViewer(
      sessionId,
      'employee',
      employeeId
    );

    res.json({
      success: true,
      viewerCount: result?.viewerCount || 0
    });
  } catch (error) {
    console.error('Error leaving screen share:', error);
    res.status(500).json({ error: error.message || 'Failed to leave screen share' });
  }
});

/**
 * GET /api/screen-share/active
 * Get active screen share session for channel/room
 */
router.get('/active', async (req, res) => {
  try {
    const { channelId, roomId } = req.query;

    if (!channelId && !roomId) {
      return res.status(400).json({ error: 'channelId or roomId is required' });
    }

    const session = await screenShareService.getActiveSession(
      channelId ? parseInt(channelId) : null,
      roomId ? parseInt(roomId) : null
    );

    res.json({
      active: !!session,
      session: session ? {
        sessionId: session.session_id,
        sharer: {
          type: session.sharer_type,
          id: session.sharer_id,
          name: session.sharer_name
        },
        shareType: session.share_type,
        allowControl: session.allow_control,
        startedAt: session.started_at
      } : null
    });
  } catch (error) {
    console.error('Error getting active session:', error);
    res.status(500).json({ error: 'Failed to get active session' });
  }
});

/**
 * POST /api/screen-share/signal/:sessionId
 * WebRTC signaling for screen share
 */
router.post('/signal/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { signal } = req.body;
    const employeeId = getEmployeeId(req);
    const employeeName = await getEmployeeName(employeeId);

    screenShareService.handleSignaling(sessionId, {
      type: 'employee',
      id: employeeId,
      name: employeeName
    }, signal);

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling signal:', error);
    res.status(500).json({ error: 'Failed to handle signal' });
  }
});

/**
 * POST /api/screen-share/request-control/:sessionId
 * Request remote control
 */
router.post('/request-control/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const employeeId = getEmployeeId(req);
    const employeeName = await getEmployeeName(employeeId);

    await screenShareService.requestControl(
      sessionId,
      'employee',
      employeeId,
      employeeName
    );

    res.json({
      success: true,
      message: 'Control request sent'
    });
  } catch (error) {
    console.error('Error requesting control:', error);
    res.status(500).json({ error: error.message || 'Failed to request control' });
  }
});

/**
 * POST /api/screen-share/grant-control/:sessionId
 * Grant remote control to a user
 */
router.post('/grant-control/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { userId, userType = 'employee' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    screenShareService.grantControl(sessionId, userType, parseInt(userId));

    res.json({
      success: true,
      message: 'Control granted'
    });
  } catch (error) {
    console.error('Error granting control:', error);
    res.status(500).json({ error: 'Failed to grant control' });
  }
});

/**
 * POST /api/screen-share/revoke-control/:sessionId
 * Revoke remote control
 */
router.post('/revoke-control/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    screenShareService.revokeControl(sessionId);

    res.json({
      success: true,
      message: 'Control revoked'
    });
  } catch (error) {
    console.error('Error revoking control:', error);
    res.status(500).json({ error: 'Failed to revoke control' });
  }
});

/**
 * POST /api/screen-share/remote-input/:sessionId
 * Send remote input (mouse/keyboard)
 */
router.post('/remote-input/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { input } = req.body;

    screenShareService.sendRemoteInput(sessionId, input);

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending remote input:', error);
    res.status(500).json({ error: 'Failed to send remote input' });
  }
});

/**
 * GET /api/screen-share/history
 * Get screen share session history
 */
router.get('/history', async (req, res) => {
  try {
    const { channelId, roomId, limit = 20 } = req.query;

    if (!channelId && !roomId) {
      return res.status(400).json({ error: 'channelId or roomId is required' });
    }

    const history = await screenShareService.getSessionHistory(
      channelId ? parseInt(channelId) : null,
      roomId ? parseInt(roomId) : null,
      parseInt(limit)
    );

    res.json({
      sessions: history.map(s => ({
        sessionId: s.session_id,
        sharer: {
          type: s.sharer_type,
          id: s.sharer_id,
          name: s.sharer_name
        },
        shareType: s.share_type,
        status: s.status,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        durationSeconds: s.duration_seconds
      }))
    });
  } catch (error) {
    console.error('Error getting session history:', error);
    res.status(500).json({ error: 'Failed to get session history' });
  }
});

module.exports = router;
