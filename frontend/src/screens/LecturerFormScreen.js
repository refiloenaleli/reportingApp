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
import CustomButton from '../components/CustomButton';
import InputField from '../components/InputField';
import OptionSelector from '../components/OptionSelector';
import { FACULTIES, STREAMS } from '../constants/appData';
import { useAuth } from '../context/AuthContext';
import { createLecturerAccount } from '../services/users';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function LecturerFormScreen({ navigation }) {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    facultyName: profile?.facultyName || FACULTIES[0],
    streamName: profile?.streamName || STREAMS[0],
  });
  const [loading, setLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Missing details', 'Please complete the lecturer name, email, and password.');
      return;
    }

    try {
      setLoading(true);
      await createLecturerAccount(form);
      Alert.alert('Lecturer created', 'The new lecturer account is ready to be used.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not create lecturer', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Lecturer</Text>
        <View style={styles.card}>
          <InputField
            label="Lecturer Name"
            value={form.name}
            onChangeText={(value) => updateField('name', value)}
            placeholder="Full name"
            autoCapitalize="words"
          />
          <InputField
            label="Lecturer Email"
            value={form.email}
            onChangeText={(value) => updateField('email', value)}
            placeholder="lecturer@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Temporary Password"
            value={form.password}
            onChangeText={(value) => updateField('password', value)}
            placeholder="At least 6 characters"
            secureTextEntry
            autoCapitalize="none"
          />
          <OptionSelector
            label="Faculty"
            options={FACULTIES}
            value={form.facultyName}
            onChange={(value) => updateField('facultyName', value)}
          />
          <OptionSelector
            label="Stream"
            options={STREAMS}
            value={form.streamName}
            onChange={(value) => updateField('streamName', value)}
          />
          <CustomButton title="Create Lecturer Account" onPress={handleSubmit} loading={loading} />
          <CustomButton title="Back" variant="accent" style={styles.backButton} onPress={() => navigation.goBack()} />
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
    padding: spacing.xl,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.darkText,
  },
  card: {
    backgroundColor: colors.lightGray,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  backButton: {
    marginTop: 12,
  },
});
