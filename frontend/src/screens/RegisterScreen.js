import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import InputField from '../components/InputField';
import CustomButton from '../components/CustomButton';
import OptionSelector from '../components/OptionSelector';
import { useAuth } from '../context/AuthContext';
import { FACULTIES, STREAMS } from '../constants/appData';
import { colors, radius, shadows, spacing } from '../styles/theme';

const roles = ['student', 'lecturer', 'prl', 'pl'];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    studentId: '',
    role: 'student',
    facultyName: FACULTIES[0],
    streamName: STREAMS[0],
  });
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleRegister = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Missing details', 'Please fill in all required details.');
      return;
    }

    try {
      setLoading(true);
      await register(form);
    } catch (error) {
      Alert.alert('Registration failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Register</Text>
        <View style={styles.card}>
          <InputField
            label="Full Name"
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Full name"
            autoCapitalize="words"
          />
          <InputField
            label="Email"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Password"
            value={form.password}
            onChangeText={(value) => updateField('password', value)}
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
          />
          {form.role === 'student' ? (
            <InputField
              label="Student ID"
              value={form.studentId}
              onChangeText={(value) => updateField('studentId', value)}
              placeholder="Student ID"
              autoCapitalize="characters"
            />
          ) : null}
          <OptionSelector label="Role" options={roles} value={form.role} onChange={(value) => updateField('role', value)} />
          <OptionSelector label="Faculty" options={FACULTIES} value={form.facultyName} onChange={(value) => updateField('facultyName', value)} />
          {['student', 'prl', 'lecturer'].includes(form.role) ? (
            <OptionSelector label="Stream" options={STREAMS} value={form.streamName || STREAMS[0]} onChange={(value) => updateField('streamName', value)} />
          ) : null}
          <CustomButton title="Create Account" onPress={handleRegister} loading={loading} />
          <CustomButton
            title="Back"
            variant="accent"
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundWhite,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primaryGold,
    textAlign: 'center',
    marginBottom: 18,
  },
  card: {
    backgroundColor: colors.lightGray,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  secondaryButton: {
    marginTop: 12,
  },
});
