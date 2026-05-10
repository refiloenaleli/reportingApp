import React, { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import InputField from '../components/InputField';
import CustomButton from '../components/CustomButton';
import { useAuth } from '../context/AuthContext';
import { colors, radius, shadows, spacing } from '../styles/theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
    } catch (error) {
      Alert.alert('Login failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandBlock}>
          <Image source={require('../../../assets/images/limkokwing logo.jpg')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.brandTitle}>Limkokwing Reports</Text>
          <Text style={styles.title}>Sign In</Text>
        </View>
        <View style={styles.card}>
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
          />
          <CustomButton title="Login" onPress={handleLogin} loading={loading} />
          <CustomButton
            title="Register"
            variant="accent"
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Register')}
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
  brandBlock: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: {
    width: 120,
    height: 72,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.darkText,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryGold,
    textAlign: 'center',
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
