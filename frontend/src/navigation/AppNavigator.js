import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../screens/Dashboard';
import LecturerDirectoryScreen from '../screens/LecturerDirectoryScreen';
import LecturerFormScreen from '../screens/LecturerFormScreen';
import LoginScreen from '../screens/LoginScreen';
import MonitoringScreen from '../screens/MonitoringScreen';
import ModuleFormScreen from '../screens/ModuleFormScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ReportFormScreen from '../screens/ReportFormScreen';
import ReportsListScreen from '../screens/ReportsListScreen';
import WorkspaceScreen from '../screens/WorkspaceScreen';
import { colors } from '../styles/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function createWorkspaceTabScreen(params) {
  return function WorkspaceTabScreen(props) {
    return (
      <WorkspaceScreen
        {...props}
        route={{
          ...props.route,
          params: {
            ...props.route?.params,
            ...params,
          },
        }}
      />
    );
  };
}

function createReportsTabScreen(params) {
  return function ReportsTabScreen(props) {
    return (
      <ReportsListScreen
        {...props}
        route={{
          ...props.route,
          params: {
            ...props.route?.params,
            ...params,
          },
        }}
      />
    );
  };
}

const StudentAttendanceTab = createWorkspaceTabScreen({
  moduleKey: 'attendance',
  title: 'My Attendance',
  allowCreate: true,
  createLabel: 'Register Attendance',
});

const StudentRatingsTab = createWorkspaceTabScreen({
  moduleKey: 'ratings',
  title: 'Ratings',
  allowCreate: true,
  editScope: 'own',
  deleteScope: 'own',
  createLabel: 'Rate Lecturer',
});

const StudentClassesTab = createWorkspaceTabScreen({
  moduleKey: 'classes',
  title: 'Class Schedule',
  allowCreate: false,
});

const LecturerScheduleTab = createWorkspaceTabScreen({
  moduleKey: 'lectures',
  title: 'Teaching Schedule',
  allowCreate: false,
});

const LecturerAttendanceTab = createWorkspaceTabScreen({
  moduleKey: 'attendance',
  title: 'Student Attendance',
  allowCreate: true,
  editScope: 'own',
  deleteScope: 'own',
  createLabel: 'Take Attendance',
});

const LecturerReportsTab = createReportsTabScreen({
  title: 'Lecture Reports',
});

const PrlReviewsTab = createReportsTabScreen({
  title: 'Review Queue',
});

const PrlCoursesTab = createWorkspaceTabScreen({
  moduleKey: 'courses',
  title: 'Courses',
  allowCreate: false,
});

const PrlClassesTab = createWorkspaceTabScreen({
  moduleKey: 'classes',
  title: 'Classes',
  allowCreate: false,
});

const PlCoursesTab = createWorkspaceTabScreen({
  moduleKey: 'courses',
  title: 'Course Setup',
  allowCreate: true,
  editScope: 'all',
  deleteScope: 'all',
  createLabel: 'Add Course',
});

const PlReportsTab = createReportsTabScreen({
  title: 'Faculty Reports',
});

function buildTabsForRole(role) {
  if (role === 'student') {
    return [
      { name: 'Home', title: 'Dashboard', component: Dashboard, icon: 'home' },
      { name: 'Attendance', title: 'Attendance', component: StudentAttendanceTab, icon: 'checkmark-circle' },
      { name: 'Monitoring', title: 'Monitoring', component: MonitoringScreen, icon: 'pulse' },
      { name: 'Ratings', title: 'Ratings', component: StudentRatingsTab, icon: 'star' },
      { name: 'Classes', title: 'Classes', component: StudentClassesTab, icon: 'school' },
    ];
  }

  if (role === 'lecturer') {
    return [
      { name: 'Home', title: 'Dashboard', component: Dashboard, icon: 'home' },
      { name: 'Classes', title: 'Classes', component: LecturerScheduleTab, icon: 'school' },
      { name: 'Reports', title: 'Reports', component: LecturerReportsTab, icon: 'document-text' },
      { name: 'Attendance', title: 'Attendance', component: LecturerAttendanceTab, icon: 'people' },
      { name: 'Monitoring', title: 'Monitoring', component: MonitoringScreen, icon: 'pulse' },
    ];
  }

  if (role === 'prl') {
    return [
      { name: 'Home', title: 'Dashboard', component: Dashboard, icon: 'home' },
      { name: 'Reviews', title: 'Reviews', component: PrlReviewsTab, icon: 'clipboard' },
      { name: 'Courses', title: 'Courses', component: PrlCoursesTab, icon: 'book' },
      { name: 'Classes', title: 'Classes', component: PrlClassesTab, icon: 'school' },
      { name: 'Monitoring', title: 'Monitoring', component: MonitoringScreen, icon: 'pulse' },
    ];
  }

  return [
    { name: 'Home', title: 'Dashboard', component: Dashboard, icon: 'home' },
    { name: 'Courses', title: 'Courses', component: PlCoursesTab, icon: 'book' },
    { name: 'Lecturers', title: 'Lecturers', component: LecturerDirectoryScreen, icon: 'people' },
    { name: 'Reports', title: 'Reports', component: PlReportsTab, icon: 'document-text' },
    { name: 'Monitoring', title: 'Monitoring', component: MonitoringScreen, icon: 'pulse' },
  ];
}

function HeaderActions({ navigation }) {
  return (
    <View style={styles.headerActions}>
      <Pressable style={styles.headerActionButton} onPress={() => navigation.navigate('Notifications')}>
        <Ionicons name="notifications-outline" size={22} color={colors.backgroundWhite} />
      </Pressable>
      <Pressable style={styles.headerActionButton} onPress={() => navigation.navigate('Profile')}>
        <Ionicons name="person-circle-outline" size={24} color={colors.backgroundWhite} />
      </Pressable>
    </View>
  );
}

function RoleTabs({ navigation }) {
  const { profile } = useAuth();
  const tabs = buildTabsForRole(profile?.role);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = tabs.find((item) => item.name === route.name);
        return {
          headerStyle: {
            backgroundColor: colors.primaryGold,
          },
          headerTintColor: colors.backgroundWhite,
          headerTitleStyle: {
            fontWeight: '800',
          },
          headerRight: () => <HeaderActions navigation={navigation} />,
          tabBarActiveTintColor: colors.primaryGoldDark,
          tabBarInactiveTintColor: colors.mutedText,
          tabBarShowLabel: true,
          tabBarLabelPosition: 'below-icon',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            marginBottom: 4,
          },
          tabBarIconStyle: {
            marginTop: 2,
          },
          tabBarStyle: {
            height: 74,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={tab?.icon || 'apps'} size={size} color={color} />
          ),
        };
      }}
    >
      {tabs.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={tab.component} options={{ title: tab.title }} />
      ))}
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={colors.primaryGold} />
      <Text style={styles.loadingText}>Loading application...</Text>
    </View>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primaryGold,
          },
          headerTintColor: colors.backgroundWhite,
          contentStyle: {
            backgroundColor: colors.backgroundWhite,
          },
          headerTitleStyle: {
            fontWeight: '800',
          },
        }}
      >
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={RoleTabs} options={{ headerShown: false }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <Stack.Screen name="ModuleForm" component={ModuleFormScreen} options={{ title: 'Save Record' }} />
            <Stack.Screen name="ReportForm" component={ReportFormScreen} options={{ title: 'Report' }} />
            <Stack.Screen name="LecturerForm" component={LecturerFormScreen} options={{ title: 'Create Lecturer' }} />
          </>
        ) : (
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{ title: 'Register' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundWhite,
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.darkText,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionButton: {
    paddingVertical: 4,
  },
});
