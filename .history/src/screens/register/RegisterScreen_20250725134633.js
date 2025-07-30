
import PrivacyPolicyScreen from "./PrivacyPolicyScreen"
import { useState, useEffect, useRef } from "react"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import TermsOfServiceScreen from "./TermsOfServiceScreen"
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter"
import { useNavigation } from "@react-navigation/native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { authService } from "services/apiAuthService"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width, height } = Dimensions.get("window")

export default function RegisterScreen({ navigation: propNavigation, route }) {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    firstName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })

  const [errors, setErrors] = useState({
    firstName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const scrollViewRef = useRef(null)

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  const navigation = useNavigation()

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedData = await AsyncStorage.getItem("registrationFormData")
        const savedStep = await AsyncStorage.getItem("registrationCurrentStep")
        if (savedData) {
          const parsedData = JSON.parse(savedData)
          setFormData(parsedData)
        }
        if (savedStep) {
          const step = Number.parseInt(savedStep)
          setCurrentStep(step)
        }
      } catch (error) {
        console.log("Error loading saved data:", error)
      }
    }
    loadSavedData()
  }, [])

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem("registrationFormData", JSON.stringify(formData))
        await AsyncStorage.setItem("registrationCurrentStep", currentStep.toString())
      } catch (error) {
        console.log("Error saving data:", error)
      }
    }
    saveData()
  }, [formData, currentStep])

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start()
  }, [currentStep])

  if (!fontsLoaded) {
    return <Loading />
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const validateCurrentStep = () => {
    let isValid = true
    const newErrors = { ...errors }

    switch (currentStep) {
      case 0: // Name step
        if (!formData.firstName.trim()) {
          newErrors.firstName = "Please enter your name"
          isValid = false
        } else if (formData.firstName.length < 2) {
          newErrors.firstName = "Name must be at least 2 characters"
          isValid = false
        } else if (formData.firstName.length > 50) {
          newErrors.firstName = "Name cannot exceed 50 characters"
          isValid = false
        }
        break

      case 1: // Account setup step
        // Email validation
        if (!formData.email) {
          newErrors.email = "Email is required"
          isValid = false
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Please enter a valid email address"
          isValid = false
        }

        // Password validation
        if (!formData.password) {
          newErrors.password = "Password is required"
          isValid = false
        } else if (formData.password.length < 6) {
          newErrors.password = "Password must be at least 6 characters"
          isValid = false
        } else if (formData.password.length > 100) {
          newErrors.password = "Password cannot exceed 100 characters"
          isValid = false
        }

        // Confirm password validation
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = "Please confirm your password"
          isValid = false
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match"
          isValid = false
        }

        // Phone validation
        if (!formData.phone) {
          newErrors.phone = "Phone number is required"
          isValid = false
        } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
          newErrors.phone = "Phone number must be 10 digits"
          isValid = false
        }
        break

      default:
        break
    }

    setErrors(newErrors)
    return isValid
  }

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true })
      }
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1
      setCurrentStep(prevStep)
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: true })
      }
    } else {
      navigation.navigate("Login")
    }
  }

  const handleRegister = async () => {
    console.log("[DEBUG] handleRegister called")

    if (!validateCurrentStep()) {
      return
    }

    setIsLoading(true)

    try {
      const register = {
        username: formData.email,
        email: formData.email,
        fullName: formData.firstName || "User",
        password: formData.password,
        phone: formData.phone,
      }

      console.log("[DEBUG] Register payload:", register)
      const dataRegister = await authService.register(register)
      console.log("[DEBUG] Register API response:", dataRegister)

      if (!dataRegister || dataRegister.statusCode !== 200) {
        console.log("[DEBUG] Register API error:", dataRegister)
        if (dataRegister?.statusCode === 400 && dataRegister.errors) {
          const errorMessages = Object.entries(dataRegister.errors)
            .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
            .join("\n")
          throw new Error(`Registration failed:\n${errorMessages}`)
        }
        throw new Error("Registration failed: Invalid user data returned")
      }

      // Clear saved registration data
      await Promise.all([
        AsyncStorage.removeItem("registrationFormData"),
        AsyncStorage.removeItem("registrationCurrentStep"),
      ])

      console.log("[DEBUG] Registration successful")
      showSuccessMessage("Your account has been created successfully! Please check your email to verify your account.")
      navigation.replace("Login")
    } catch (error) {
      console.log("[DEBUG] Registration error:", error)
      let errorMessage = error?.message || "An unexpected error occurred. Please try again."

      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors
        const newErrors = { ...errors }
        if (serverErrors.Email) newErrors.email = serverErrors.Email[0]
        if (serverErrors.Password) newErrors.password = serverErrors.Password[0]
        if (serverErrors.Phone) newErrors.phone = serverErrors.Phone[0]
        setErrors(newErrors)
        errorMessage = Object.entries(serverErrors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("\n")
      }

      showErrorFetchAPI(errorMessage)
    } finally {
      setIsLoading(false)
      console.log("[DEBUG] handleRegister finished")
    }
  }

  const totalSteps = 2

  const renderStepIndicators = () => {
    return (
      <View style={styles.stepIndicatorsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View key={index} style={[styles.stepIndicator, index <= currentStep ? styles.activeStepIndicator : {}]} />
        ))}
      </View>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <NameStep formData={formData} handleChange={handleChange} error={errors.firstName} />
      case 1:
        return (
          <AccountSetupStep
            formData={formData}
            handleChange={handleChange}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            errors={errors}
            onShowTerms={() => setShowTermsModal(true)}
            showPrivacyModal={showPrivacyModal}
            setShowPrivacyModal={setShowPrivacyModal}
          />
        )
      default:
        return null
    }
  }

  const getStepTitle = () => {
    const titles = ["Welcome", "Create Account"]
    return titles[currentStep] || "Registration"
  }

  const isFinalStep = currentStep === totalSteps - 1

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={[styles.header, { backgroundColor: "#FFFFFF" }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handlePreviousStep} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: "#1E293B" }]}>{getStepTitle()}</Text>
          <View style={styles.stepCounter}>
            <Text style={[styles.stepCounterText, { color: "#1E293B" }]}>
              {currentStep + 1}/{totalSteps}
            </Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidingView}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${((currentStep + 1) / totalSteps) * 100}%` }]} />
            </View>
            {renderStepIndicators()}
          </View>

          <Animated.View
            style={[
              styles.stepContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {renderStepContent()}
          </Animated.View>

          <View style={styles.navigationButtons}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.prevButton}
                onPress={handlePreviousStep}
                accessibilityLabel="Previous step"
              >
                <Ionicons name="arrow-back" size={24} color="#0056d2" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.nextButton}
              onPress={isFinalStep ? handleRegister : handleNextStep}
              disabled={isLoading}
              accessibilityLabel={isFinalStep ? "Register" : "Next step"}
            >
              <Text style={styles.nextButtonText}>
                {isFinalStep ? (isLoading ? "Registering..." : "Register") : "Next"}
              </Text>
              {!isFinalStep && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.nextIcon} />}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Terms of Service Modal */}
      <Modal visible={showTermsModal} transparent animationType="slide" onRequestClose={() => setShowTermsModal(false)}>
        <TermsOfServiceScreen navigation={{ goBack: () => setShowTermsModal(false) }} />
      </Modal>
    </SafeAreaView>
  )
}

// Step 1: Name Input
const NameStep = ({ formData, handleChange, error }) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Welcome to HMS</Text>
      <Text style={styles.stepDescription}>Let's start by getting to know you. What's your name?</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Your Name</Text>
        <TextInput
          style={[styles.input, error ? styles.inputError : null]}
          value={formData.firstName}
          onChangeText={(value) => {
            // Only allow letters and spaces
            const filtered = value.replace(/[^a-zA-Z\sÀ-ỹà-ỹ]/g, "")
            handleChange("firstName", filtered)
          }}
          placeholder="Enter your name"
          placeholderTextColor="#94A3B8"
          maxLength={50}
          accessibilityLabel="Name input"
        />
        {error ? (
          <Text style={styles.errorText}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
          </Text>
        ) : null}
      </View>

      <Text style={styles.tipText}>This helps us personalize your experience throughout the app.</Text>
    </View>
  )
}

// Step 2: Account Setup
const AccountSetupStep = ({
  formData,
  handleChange,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  errors,
  onShowTerms,
  showPrivacyModal,
  setShowPrivacyModal,
}) => {
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "None", color: "#94A3B8" }

    let strength = 0
    if (password.length >= 8) strength += 1
    if (/[A-Z]/.test(password)) strength += 1
    if (/[0-9]/.test(password)) strength += 1
    if (/[^A-Za-z0-9]/.test(password)) strength += 1

    const strengthMap = [
      { label: "Weak", color: "#EF4444" },
      { label: "Fair", color: "#F59E0B" },
      { label: "Good", color: "#10B981" },
      { label: "Strong", color: "#10B981" },
      { label: "Very Strong", color: "#10B981" },
    ]

    return {
      strength: strength,
      label: strengthMap[strength].label,
      color: strengthMap[strength].color,
    }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <Text style={styles.stepDescription}>You're almost done! Set up your account to get started.</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <View style={[styles.iconInputContainer, errors.email ? styles.inputError : null]}>
          <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.iconInput}
            value={formData.email}
            onChangeText={(value) => handleChange("email", value)}
            placeholder="Enter your email"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel="Email input"
          />
        </View>
        {errors.email ? (
          <Text style={styles.errorText}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.email}
          </Text>
        ) : null}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <View style={[styles.iconInputContainer, errors.phone ? styles.inputError : null]}>
          <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.iconInput}
            value={formData.phone}
            onChangeText={(value) => handleChange("phone", value.replace(/[^0-9]/g, ""))}
            placeholder="Enter your phone number"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            maxLength={10}
            accessibilityLabel="Phone number input"
          />
        </View>
        {errors.phone ? (
          <Text style={styles.errorText}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.phone}
          </Text>
        ) : null}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={[styles.iconInputContainer, errors.password ? styles.inputError : null]}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.iconInput}
            value={formData.password}
            onChangeText={(value) => handleChange("password", value)}
            placeholder="Create a password"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            accessibilityLabel="Password input"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          >
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
        {errors.password ? (
          <Text style={styles.errorText}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.password}
          </Text>
        ) : null}

        {/* Password strength indicator */}
        {formData.password.length > 0 && (
          <View style={styles.passwordStrengthContainer}>
            <Text style={styles.passwordStrengthLabel}>Password strength:</Text>
            <View style={styles.passwordStrengthBar}>
              {[...Array(4)].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.passwordStrengthSegment,
                    {
                      backgroundColor: index < passwordStrength.strength ? passwordStrength.color : "#E2E8F0",
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
              {passwordStrength.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={[styles.iconInputContainer, errors.confirmPassword ? styles.inputError : null]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.iconInput}
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange("confirmPassword", value)}
            placeholder="Confirm your password"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showConfirmPassword}
            accessibilityLabel="Confirm password input"
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeIcon}
            accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
          >
            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
        {errors.confirmPassword ? (
          <Text style={styles.errorText}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.confirmPassword}
          </Text>
        ) : null}
      </View>

      <View style={styles.termsContainer}>
        <Ionicons name="information-circle" size={16} color="#0056d2" />
        <Text style={styles.termsText}>
          By registering, you agree to our{" "}
          <Text style={styles.termsLink} onPress={onShowTerms}>
            Terms of Service
          </Text>{" "}
          and{" "}
          <Text style={styles.termsLink} onPress={() => setShowPrivacyModal(true)}>
            Privacy Policy
          </Text>
        </Text>
      </View>

      <Modal
        visible={showPrivacyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <PrivacyPolicyScreen navigation={{ goBack: () => setShowPrivacyModal(false) }} />
      </Modal>
    </View>
  )
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    flex: 1,
    textAlign: "center",
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#FFFFFF",
  },
  stepCounter: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  stepCounterText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 16,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#0056d2",
    borderRadius: 4,
  },
  stepIndicatorsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  stepIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeStepIndicator: {
    backgroundColor: "#0056d2",
    width: 16,
    borderColor: "#0056d2",
    borderWidth: 2,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#64748B",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
    marginBottom: 10,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
  iconInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 56,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  inputIcon: {
    marginRight: 12,
  },
  iconInput: {
    flex: 1,
    height: "100%",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  eyeIcon: {
    padding: 8,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    paddingHorizontal: 8,
  },
  termsText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#64748B",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    fontFamily: "Inter_600SemiBold",
    color: "#0056d2",
    textDecorationLine: "underline",
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 24,
  },
  prevButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  nextButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0056d2",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  nextIcon: {
    marginLeft: 8,
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
