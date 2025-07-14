import { useState,useRef,useEffect,useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native"
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons"
import { authService } from "services/apiAuthService"
import { AuthContext,useAuth } from "context/AuthContext"
import { LinearGradient } from "expo-linear-gradient"
import { useFonts,Inter_400Regular,Inter_600SemiBold,Inter_700Bold } from "@expo-google-fonts/inter"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import Header from "components/Header"

export default function ChangePasswordScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [formData,setFormData] = useState({
    email: user?.email || "",
    otpCode: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [errors,setErrors] = useState({
    email: "",
    otpCode: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [otpRequested,setOtpRequested] = useState(false)
  const [isLoading,setIsLoading] = useState(false)
  const [showPassword,setShowPassword] = useState(false)
  const [showConfirmPassword,setShowConfirmPassword] = useState(false)
  const [otpTimer,setOtpTimer] = useState(0)

  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    let interval
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prevTimer) => prevTimer - 1)
      },1000)
    }
    return () => clearInterval(interval)
  },[otpTimer])

  useEffect(() => {
    if (otpRequested) {
      Animated.sequence([
        Animated.timing(fadeAnim,{
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim,{
          toValue: -50,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(fadeAnim,{
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim,{
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start()
    }
  },[otpRequested])

  if (!fontsLoaded || isLoading) {
    return <Loading />;
  }

  const validateEmail = (email) => {
    if (!email) {
      return "Email is required."
    }
    // RFC 5322 Official Standard regex for email validation (covers most cases)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegex.test(email)) {
      return "Invalid email format."
    }
    if (email.length > 255) {
      return "Email cannot exceed 255 characters."
    }
    return ""
  }

  const validateOtp = (otp) => {
    if (!otp) {
      return "OTP code is required."
    }
    if (!/^\d{6}$/.test(otp)) {
      return "OTP code must be exactly 6 digits."
    }
    return ""
  }

  const validatePassword = (password) => {
    if (!password) {
      return "New password is required."
    }
    if (password.length < 6) {
      return "New password must be at least 6 characters."
    }
    if (password.length > 100) {
      return "New password cannot exceed 100 characters."
    }
    return ""
  }

  const validateConfirmPassword = (confirmPassword) => {
    if (!confirmPassword) {
      return "Please confirm your password"
    }
    if (confirmPassword !== formData.newPassword) {
      return "Passwords do not match"
    }
    return ""
  }

  const handleChange = (field,value) => {
    setFormData((prev) => ({ ...prev,[field]: value }))

    if (errors[field]) {
      setErrors((prev) => ({ ...prev,[field]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {
      email: validateEmail(formData.email),
      otpCode: otpRequested ? validateOtp(formData.otpCode) : "",
      newPassword: otpRequested ? validatePassword(formData.newPassword) : "",
      confirmPassword: otpRequested ? validateConfirmPassword(formData.confirmPassword) : "",
    }

    setErrors(newErrors)

    if (otpRequested) {
      return !newErrors.email && !newErrors.otpCode && !newErrors.newPassword && !newErrors.confirmPassword
    } else {
      return !newErrors.email
    }
  }

  const handleRequestOtp = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await authService.forgotPassword({ email: formData.email })
      if (response.statusCode === 200) {
        setOtpRequested(true)
        setOtpTimer(900)
        showSuccessMessage("OTP sent to your email. Please check your inbox.")
      }
    } catch (error) {
      showErrorFetchAPI(error?.response?.data?.message || "Failed to request OTP. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await authService.resetPassword({
        email: formData.email,
        otpCode: formData.otpCode,
        newPassword: formData.newPassword,
      })
      if (response.statusCode === 200) {
        showSuccessMessage("Password changed successfully.");
        navigation.goBack();
      }
    } catch (error) {
      showErrorFetchAPI(error?.response?.data?.message || "Failed to change password. Please try again.");
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0,label: "None",color: "#94A3B8" }

    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1

    const strengthMap = [
      { label: "Weak",color: "#EF4444" },
      { label: "Fair",color: "#F59E0B" },
      { label: "Good",color: "#10B981" },
      { label: "Strong",color: "#10B981" },
      { label: "Very Strong",color: "#10B981" },
    ]

    return {
      strength: strength,
      label: strengthMap[strength].label,
      color: strengthMap[strength].color,
    }
  }

  const passwordStrength = getPasswordStrength(formData.newPassword)

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#0056d2" />
      <Header
        title="Change Password"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.container, { marginTop: 40 }]}> 
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={40} color="#0056d2" />
            </View>

            <Text style={styles.title}>Reset Your Password</Text>
            <Text style={styles.subtitle}>
              {otpRequested
                ? "Enter the OTP code sent to your email and create a new password"
                : "We'll send a verification code to your email to reset your password"}
            </Text>

            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputContainer,errors.email ? styles.inputError : null]}>
                  <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#94A3B8"
                    value={formData.email}
                    onChangeText={(text) => handleChange("email",text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    readOnly="true"
                    editable={!otpRequested}
                  />
                </View>
                {errors.email ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.email}
                  </Text>
                ) : null}
              </View>

              {otpRequested && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>OTP Code</Text>
                    <View style={[styles.inputContainer,errors.otpCode ? styles.inputError : null]}>
                    <Ionicons name="key-outline" size={20} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter OTP code"
                        placeholderTextColor="#94A3B8"
                        value={formData.otpCode}
                        onChangeText={(text) => handleChange("otpCode",text)}
                        keyboardType="number-pad"
                      />
                    </View>
                    {errors.otpCode ? (
                      <Text style={styles.errorMessage}>
                        <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.otpCode}
                      </Text>
                    ) : null}

                    <View style={styles.otpTimerContainer}>
                      {otpTimer > 0 ? (
                        <Text style={styles.otpTimerText}>Resend OTP in {otpTimer}s</Text>
                      ) : (
                        <TouchableOpacity
                          onPress={() => {
                            handleRequestOtp()
                          }}
                          disabled={isLoading}
                        >
                          <Text style={styles.resendOtpText}>Resend OTP</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={[styles.inputContainer,errors.newPassword ? styles.inputError : null]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#0056d2" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Create new password"
                        placeholderTextColor="#94A3B8"
                        value={formData.newPassword}
                        onChangeText={(text) => handleChange("newPassword",text)}
                        secureTextEntry={!showPassword}
                      />
                      <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    {errors.newPassword ? (
                      <Text style={styles.errorMessage}>
                        <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.newPassword}
                      </Text>
                    ) : null}

                    {formData.newPassword.length > 0 && (
                      <View style={styles.passwordStrengthContainer}>
                        <Text style={styles.passwordStrengthLabel}>Password strength:</Text>
                        <View style={styles.passwordStrengthBar}>
                          {[...Array(4)].map((_,index) => (
                            <View
                              key={index}
                              style={[
                                styles.passwordStrengthSegment,
                                {
                                  backgroundColor:
                                    index < passwordStrength.strength ? passwordStrength.color : "#E2E8F0",
                                },
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
                    <View style={[styles.inputContainer,errors.confirmPassword ? styles.inputError : null]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm new password"
                        placeholderTextColor="#94A3B8"
                        value={formData.confirmPassword}
                        onChangeText={(text) => handleChange("confirmPassword",text)}
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
                    {errors.confirmPassword ? (
                      <Text style={styles.errorMessage}>
                        <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.confirmPassword}
                      </Text>
                    ) : null}
                  </View>
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: '#0056d2' },
                  isLoading ? styles.submitButtonDisabled : null
                ]}
                onPress={otpRequested ? handleSubmit : handleRequestOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={otpRequested ? "checkmark-circle-outline" : "paper-plane-outline"}
                      size={20}
                      color="#FFFFFF"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.submitButtonText}>{otpRequested ? "Change Password" : "Request OTP"}</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.securityNoteContainer}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#0056d2" />
                <Text style={styles.securityNoteText}>
                  For your security, the password must be at least 6 characters long and include a mix of letters,
                  numbers, and symbols.
                </Text>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4F46E5",
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
    textAlign: "center",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    alignSelf: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#64748B",
    marginBottom: 32,
    textAlign: "center",
    lineHeight: 22,
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  eyeIcon: {
    padding: 8,
  },
  errorMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
  },
  otpTimerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  otpTimerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
  },
  resendOtpText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#4F46E5",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 12,
    height: 56,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  submitButtonDisabled: {
    backgroundColor: "#A5B4FC",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  securityNoteContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  securityNoteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  passwordStrengthContainer: {
    marginTop: 8,
    width: "100%",
  },
  passwordStrengthLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  passwordStrengthBar: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  passwordStrengthSegment: {
    flex: 1,
    height: "100%",
    marginRight: 2,
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
})
