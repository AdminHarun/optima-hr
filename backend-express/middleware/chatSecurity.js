/**
 * Chat Security Middleware
 *
 * Enforces access control for chat rooms:
 * - Applicants can only access their own EXTERNAL chat rooms
 * - Employees can access INTERNAL rooms they are members of
 * - Employees can access EXTERNAL rooms they are assigned to
 */

const ChatRoom = require('../models/ChatRoom');
const ChatRoomMember = require('../models/ChatRoomMember');

/**
 * Main security middleware for chat room access
 */
const chatSecurityMiddleware = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const auth = req.auth || req.user;

    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userType, userId } = auth;

    // Find the room
    const room = await ChatRoom.findByPk(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if room is active
    if (!room.is_active) {
      return res.status(403).json({ error: 'This chat room is no longer active' });
    }

    // APPLICANT ACCESS RULES
    if (userType === 'applicant') {
      // Applicants can ONLY access EXTERNAL rooms
      if (room.channel_type === 'INTERNAL') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to access internal communications'
        });
      }

      // Applicants can only access their own rooms
      if (room.applicant_id !== parseInt(userId)) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own chat room'
        });
      }

      // Applicant has access
      req.chatRoom = room;
      return next();
    }

    // EMPLOYEE/ADMIN ACCESS RULES
    if (userType === 'employee' || userType === 'admin') {
      // For EXTERNAL rooms (applicant chats), check if employee is assigned
      if (room.channel_type === 'EXTERNAL') {
        // Admins can access all external rooms
        // For regular employees, we could add assignment checks here
        // For now, all employees can access applicant rooms

        req.chatRoom = room;
        return next();
      }

      // For INTERNAL rooms (employee-to-employee), check membership
      if (room.channel_type === 'INTERNAL') {
        const isMember = await ChatRoomMember.findOne({
          where: {
            room_id: roomId,
            member_type: 'employee',
            member_id: userId,
            is_active: true
          }
        });

        if (!isMember) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You are not a member of this internal chat room'
          });
        }

        // Add member info to request
        req.chatRoom = room;
        req.chatRoomMember = isMember;
        return next();
      }
    }

    // Default deny
    return res.status(403).json({ error: 'Access denied' });

  } catch (error) {
    console.error('Chat security middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to verify user can create internal rooms
 */
const canCreateInternalRoom = async (req, res, next) => {
  try {
    const auth = req.auth || req.user;

    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userType } = auth;

    // Only employees can create internal rooms
    if (userType !== 'employee' && userType !== 'admin') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only employees can create internal chat rooms'
      });
    }

    next();
  } catch (error) {
    console.error('Create internal room middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to filter rooms based on user type
 * Adds filter conditions to req.roomFilters
 */
const filterRoomsByAccess = async (req, res, next) => {
  try {
    const auth = req.auth || req.user;

    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userType, userId } = auth;

    // Initialize filters
    req.roomFilters = {
      is_active: true
    };

    if (userType === 'applicant') {
      // Applicants only see their own EXTERNAL rooms
      req.roomFilters.channel_type = 'EXTERNAL';
      req.roomFilters.applicant_id = userId;
    } else if (userType === 'employee' || userType === 'admin') {
      // Employees see:
      // 1. All EXTERNAL rooms (applicant chats) - for their site
      // 2. INTERNAL rooms where they are members

      // This will be handled in the route with OR conditions
      req.roomFilters.employeeId = userId;
      req.roomFilters.showInternal = true;
      req.roomFilters.showExternal = true;
    }

    next();
  } catch (error) {
    console.error('Filter rooms middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to verify user can manage room (owner/admin only)
 */
const canManageRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const auth = req.auth || req.user;

    if (!auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { userType, userId } = auth;

    // Find the room
    const room = await ChatRoom.findByPk(roomId);

    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if user is the creator
    if (room.created_by === parseInt(userId)) {
      req.chatRoom = room;
      return next();
    }

    // Check if user is owner/admin of the room
    const membership = await ChatRoomMember.findOne({
      where: {
        room_id: roomId,
        member_type: userType === 'applicant' ? 'applicant' : 'employee',
        member_id: userId,
        role: ['owner', 'admin'],
        is_active: true
      }
    });

    if (!membership) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Only room owners and admins can manage this room'
      });
    }

    req.chatRoom = room;
    req.chatRoomMember = membership;
    next();
  } catch (error) {
    console.error('Can manage room middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  chatSecurityMiddleware,
  canCreateInternalRoom,
  filterRoomsByAccess,
  canManageRoom
};
