export async function registerDeviceForNotifications(profile) {
  void profile;
  return {
    success: false,
    message: 'Device push registration is disabled in Expo Go. Use a development build to enable FCM.',
  };
}
