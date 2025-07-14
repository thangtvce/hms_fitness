import React,{ useState,useEffect,useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Image,
  Animated,
} from 'react-native';
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { useFonts,Inter_400Regular,Inter_600SemiBold,Inter_700Bold } from '@expo-google-fonts/inter';
import { Ionicons } from '@expo/vector-icons';
import apiAuthService from 'services/apiAuthService';
import { useNavigation,useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '../../components/Header';

const { width,height } = Dimensions.get('window');

export default function ForgetPassword() {
  const [email,setEmail] = useState('');
  const [otpCode,setOtpCode] = useState('');
  const [newPassword,setNewPassword] = useState('');
  const [confirmPassword,setConfirmPassword] = useState('');
  const [passwordError,setPasswordError] = useState('');
  const [otpError,setOtpError] = useState('');
  const [confirmPasswordError,setConfirmPasswordError] = useState('');
  const [isLoading,setIsLoading] = useState(false);
  const [showPassword,setShowPassword] = useState(false);
  const [showConfirmPassword,setShowConfirmPassword] = useState(false);
  const [isPasswordFocused,setIsPasswordFocused] = useState(false);

  const navigation = useNavigation();
  const route = useRoute();
  const scrollViewRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (route.params?.email) {
      setEmail(route.params.email);
    }

    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  },[route.params?.email,fadeAnim,slideAnim]);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  const validateEmail = (text) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!text) {
      return 'Email is required.';
    }
    if (!emailRegex.test(text)) {
      return 'Invalid email format.';
    }
    return '';
  };

  const validateOtp = (text) => {
    if (!text) {
      return 'OTP code is required';
    }
    if (text.length < 4) {
      return 'OTP code must be at least 4 digits';
    }
    return '';
  };

  const validatePassword = (text) => {
    if (!text) {
      return 'Password is required';
    }
    if (text.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (text.length > 255) {
      return 'Password must not exceed 255 characters';
    }
    return '';
  };

  const validateConfirmPassword = (text) => {
    if (!text) {
      return 'Please confirm your password';
    }
    if (text !== newPassword) {
      return 'Passwords do not match';
    }
    return '';
  };

  const handleOtpChange = (text) => {
    const sanitizedText = text.replace(/[^0-9]/g,'');

    if (sanitizedText.length <= 50) {
      setOtpCode(sanitizedText);
      setOtpError(validateOtp(sanitizedText));
    }
  };

  const handleNewPasswordChange = (text) => {
    if (text.length <= 255) {
      setNewPassword(text);
      setPasswordError(validatePassword(text));
      if (confirmPassword) {
        setConfirmPasswordError(validateConfirmPassword(confirmPassword));
      }
    }
  };

  const handleConfirmPasswordChange = (text) => {
    if (text.length <= 255) {
      setConfirmPassword(text);
      setConfirmPasswordError(validateConfirmPassword(text));
    }
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0,label: 'None',color: '#94A3B8' };

    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    const strengthMap = [
      { label: 'Weak',color: '#EF4444' },
      { label: 'Fair',color: '#F59E0B' },
      { label: 'Good',color: '#10B981' },
      { label: 'Strong',color: '#10B981' },
      { label: 'Very Strong',color: '#10B981' }
    ];

    return {
      strength: strength,
      label: strengthMap[strength].label,
      color: strengthMap[strength].color
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleResetPassword = async () => {
    try {
      // Validate email (even if not editable, for safety)
      const emailValidation = validateEmail(email);
      const otpValidation = validateOtp(otpCode);
      const passwordValidation = validatePassword(newPassword);
      const confirmPasswordValidation = validateConfirmPassword(confirmPassword);

      if (emailValidation) {
        showErrorFetchAPI(emailValidation);
        return;
      }

      setOtpError(otpValidation);
      setPasswordError(passwordValidation);
      setConfirmPasswordError(confirmPasswordValidation);

      if (otpValidation || passwordValidation || confirmPasswordValidation) {
        const firstError = otpValidation || passwordValidation || confirmPasswordValidation;
        showErrorFetchAPI(firstError);
        return;
      }

      setIsLoading(true);

      const response = await apiAuthService.resetPassword({
        email,
        otpCode,
        newPassword
      });

      if (response && response.message) {
        showSuccessMessage('Your password has been reset successfully.');
        navigation.replace('Login');
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {

      let errorMessage = 'Failed to reset password. Please try again.';

      if (error.response?.data) {
        const errorData = error.response.data;

        if (errorData.errors) {
          const errors = errorData.errors;

          if (errors.NewPassword && errors.NewPassword.length > 0) {
            setPasswordError(errors.NewPassword[0]);
            errorMessage = errors.NewPassword[0];
          } else if (errors.OtpCode && errors.OtpCode.length > 0) {
            setOtpError(errors.OtpCode[0]);
            errorMessage = errors.OtpCode[0];
          } else if (errors.Email && errors.Email.length > 0) {
            errorMessage = errors.Email[0];
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      showErrorFetchAPI(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    navigation.navigate('Otp');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <Header
        title="Reset Password"
        onBack={handleBack}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View style={styles.contentContainerFull}>
            <Animated.View
              style={[
                styles.formCardFull,
                { opacity: fadeAnim,transform: [{ translateY: slideAnim }] }
              ]}
            >
              <View style={styles.formHeader}>
                <Text style={styles.formSubtitle}>
                  Enter the verification code sent to your email and create a new password
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input,{ color: '#64748B' }]}
                    value={email}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <View style={[
                  styles.inputContainer,
                  otpError ? styles.inputError : null
                ]}>
                  <Ionicons name="key-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter verification code"
                    placeholderTextColor="#94A3B8"
                    value={otpCode}
                    onChangeText={handleOtpChange}
                    maxLength={50}
                    keyboardType="numeric"
                  />
                </View>
                {otpError ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {otpError}
                  </Text>
                ) : null}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>New Password</Text>
                <View style={[
                  styles.inputContainer,
                  passwordError ? styles.inputError : null,
                  isPasswordFocused ? styles.inputFocused : null
                ]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor="#94A3B8"
                    value={newPassword}
                    onChangeText={handleNewPasswordChange}
                    maxLength={255}
                    secureTextEntry={!showPassword}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
                {passwordError ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {passwordError}
                  </Text>
                ) : null}

                {newPassword.length > 0 && (
                  <View style={styles.passwordStrengthContainer}>
                    <Text style={styles.passwordStrengthLabel}>Password strength:</Text>
                    <View style={styles.passwordStrengthBar}>
                      {[...Array(4)].map((_,index) => (
                        <View
                          key={index}
                          style={[
                            styles.passwordStrengthSegment,
                            {
                              backgroundColor: index < passwordStrength.strength
                                ? passwordStrength.color
                                : '#E2E8F0'
                            }
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[styles.passwordStrengthText,{ color: passwordStrength.color }]}>
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View style={[
                  styles.inputContainer,
                  confirmPasswordError ? styles.inputError : null
                ]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={handleConfirmPasswordChange}
                    maxLength={255}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
                {confirmPasswordError ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {confirmPasswordError}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isLoading}
                style={styles.submitButton}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                    <Text style={styles.submitButtonText}>Reset Password</Text>
                  </>
                )}
              </TouchableOpacity>

        
            </Animated.View>

    
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginRight: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: '100%',
  },
  contentContainerFull: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 0,
    paddingBottom: 24,
    backgroundColor: "#fff",
    marginTop: 50,
  },
  formCardFull: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 0,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 8,
  },
  formSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputFocused: {
    borderColor: '#4F46E5',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#0F172A',
  },
  eyeIcon: {
    padding: 8,
  },
  errorMessage: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
  },
  passwordStrengthContainer: {
    marginTop: 8,
  },
  passwordStrengthLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  passwordStrengthBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  passwordStrengthSegment: {
    flex: 1,
    height: '100%',
    marginRight: 2,
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0056d2',
    borderRadius: 12,
    height: 56,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#0056d2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  securityTipContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  securityTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  securityTipTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#4F46E5',
    marginLeft: 8,
  },
  securityTipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  healthTipContainer: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#10B981',
    marginLeft: 8,
  },
  tipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
});