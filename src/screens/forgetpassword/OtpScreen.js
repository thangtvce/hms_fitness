"use client"

import { useState,useEffect,useRef } from "react"
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
  Image,
  Animated,
  ImageBackground,
} from "react-native"
import { useFonts,Inter_400Regular,Inter_600SemiBold,Inter_700Bold } from "@expo-google-fonts/inter"
import { Ionicons } from "@expo/vector-icons"
import apiAuthService from "services/apiAuthService"
import { useNavigation,useRoute } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import Header from "components/Header"

const { width,height } = Dimensions.get("window")

export default function OtpScreen() {
  const [email,setEmail] = useState("")
  const [isLoading,setIsLoading] = useState(false)
  const [emailError,setEmailError] = useState("")
  const navigation = useNavigation()
  const route = useRoute()
  const scrollViewRef = useRef(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    if (route.params?.email) {
      setEmail(route.params.email)
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
    ]).start()
  },[route.params?.email,fadeAnim,slideAnim])

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  const validateEmail = (text) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    if (!text) {
      return "Email is required"
    }
    if (text.length > 255) {
      return "Email must not exceed 255 characters"
    }
    if (!emailRegex.test(text)) {
      return "Please enter a valid email address"
    }
    return ""
  }

  const handleEmailChange = (text) => {
    setEmail(text)
    setEmailError(validateEmail(text))
  }

  const handleSendOtp = async () => {
    try {
      const emailValidationError = validateEmail(email)
      if (emailValidationError) {
        setEmailError(emailValidationError)
        Alert.alert("Validation Error",emailValidationError)
        return
      }

      setIsLoading(true)
      const response = await apiAuthService.forgotPassword({ email })

      if (response && response.message) {
        Alert.alert("Success",response.message || "Reset code sent successfully. Please check your email.")
        navigation.navigate("ForgetPassword",{ email })
      } else {
        throw new Error("Invalid response from server")
      }
    } catch (error) {

      let errorMessage = "An error occurred. Please try again."

      if (error.response?.data) {
        const errorData = error.response.data

        if (errorData.errors && errorData.errors.Email && errorData.errors.Email.length > 0) {
          errorMessage = errorData.errors.Email[0]
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      Alert.alert("Error",errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    navigation.navigate("Login")
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <Header
        title="Password Recovery"
        onBack={handleBack}
      />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <View style={{ flex: 1, backgroundColor: '#fff', marginTop: 50, width: '100%' }}> 
            {/* Illustration removed as requested */}

            <Animated.View style={[styles.formCard,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.formHeader}>
                <Text style={styles.formSubtitle}>
                  Enter your email address and we'll send you a code to reset your password
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={[styles.inputContainer,emailError ? styles.inputError : null]}>
                  <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={handleEmailChange}
                    maxLength={255}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {emailError ? (
                  <Text style={styles.errorMessage}>
                    <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {emailError}
                  </Text>
                ) : null}
              </View>

              <TouchableOpacity onPress={handleSendOtp} disabled={isLoading} style={styles.submitButton}>
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                    <Text style={styles.submitButtonText}>Send Reset Code</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinks}>
                <TouchableOpacity onPress={() => navigation.navigate("Register")} style={styles.footerLink}>
                  <Text style={{ color: '#222', fontSize: 14, fontFamily: 'Inter_400Regular' }}>
                    Don’t have an account?{' '}
<Text style={{ fontFamily: 'Inter_600SemiBold', textDecorationLine: 'underline', color: '#0056d2' }}>Sign up now</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Health Tip removed as requested */}
          </View>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundPattern: {
    flex: 1,
    width: "100%",
    height: "100%"
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#4F46E5",
  },
  headerGradient: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
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
    marginRight: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    width: "100%",
  },
  contentContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 24,
    backgroundColor: "#fff",
  },
  illustrationContainer: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 16,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  formCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  formTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#1E293B",
    marginTop: 12,
    marginBottom: 8,
  },
  formSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
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
    fontSize: 14,
    color: "#0F172A",
  },
  errorMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0056d2",
    borderRadius: 12,
    height: 56,
    marginTop: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#0056d2",
        shadowOffset: { width: 0,height: 4 },
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
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerLinkText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#4F46E5",
    marginHorizontal: 4,
  },

  healthTipContainer: {
    width: "100%",
    backgroundColor: "rgba(240, 253, 244, 0.95)",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tipTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#10B981",
    marginLeft: 8,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
  },
})
