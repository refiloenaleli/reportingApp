const {
  getUserNotifications,
  markNotificationRead,
  saveNotificationToken,
} = require('../services/notificationService');

async function registerToken(request, response) {
  try {
    const { token, tokenType, platform } = request.body || {};

    if (!token || !tokenType || !platform) {
      return response.status(400).json({
        message: 'Token, token type, and platform are required.',
      });
    }

    await saveNotificationToken({
      uid: request.user.uid,
      token,
      tokenType,
      platform,
      facultyName: request.user.facultyName,
      role: request.user.role,
    });

    return response.status(200).json({
      message: 'Notification token saved.',
    });
  } catch (error) {
    console.error('Register notification token error:', error);
    return response.status(500).json({
      message: error.message || 'Could not save notification token.',
    });
  }
}

async function listNotifications(request, response) {
  try {
    const notifications = await getUserNotifications(request.user.uid);

    return response.status(200).json({
      notifications,
    });
  } catch (error) {
    console.error('List notifications error:', error);
    return response.status(500).json({
      message: error.message || 'Could not load notifications.',
    });
  }
}

async function readNotification(request, response) {
  try {
    const updated = await markNotificationRead(request.params.id, request.user.uid);

    if (!updated) {
      return response.status(404).json({
        message: 'Notification not found.',
      });
    }

    return response.status(200).json({
      message: 'Notification marked as read.',
    });
  } catch (error) {
    console.error('Read notification error:', error);
    return response.status(500).json({
      message: error.message || 'Could not update notification.',
    });
  }
}

module.exports = {
  registerToken,
  listNotifications,
  readNotification,
};
