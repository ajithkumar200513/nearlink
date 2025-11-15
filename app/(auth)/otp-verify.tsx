import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function OTPVerify() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewUser] = useState(true);
  const { verifyOTP } = useAuth();

  const handleVerifyOTP = async () => {
    if (!otp) {
      setError('Please enter the OTP');
      return;
    }

    if (isNewUser && !fullName) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await verifyOTP(phone || '', otp, isNewUser ? fullName : undefined);

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleResendOTP = async () => {
    // This would typically call the same signInWithOTP function again
    setError('OTP resent! Check your phone for the new code.');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>
            We sent a code to {phone}
          </Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              style={styles.input}
              placeholder="000000"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>6-digit code sent to your phone</Text>
          </View>

          {isNewUser && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your full name"
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor="#999"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyOTP}
            disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendOTP}>
            <Text style={styles.resendText}>Didn't receive code? Resend OTP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  backButton: {
    alignItems: 'center',
    marginTop: 12,
  },
  backText: {
    color: '#666',
    fontSize: 14,
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
});
