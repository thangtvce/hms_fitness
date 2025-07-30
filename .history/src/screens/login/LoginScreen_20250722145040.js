import { useState,useContext,useEffect,useRef } from "react"
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
  Image,
  Dimensions,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native"
import { useFonts,Inter_400Regular,Inter_600SemiBold,Inter_700Bold } from "@expo-google-fonts/inter"
import { Ionicons } from "@expo/vector-icons"
import FontAwesome from "react-native-vector-icons/FontAwesome"
import apiAuthService from "services/apiAuthService"
import { useNavigation } from "@react-navigation/native"
import { AuthContext } from "context/AuthContext"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import * as Google from "expo-auth-session/providers/google"
import * as Facebook from "expo-auth-session/providers/facebook"
import * as WebBrowser from "expo-web-browser"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { showErrorFetchAPI } from "utils/toastUtil"

WebBrowser.maybeCompleteAuthSession()

const { width,height } = Dimensions.get("window")

const GOOGLE_CLIENT_ID = "1005255181896-g20la8a1fi78eg52sch8r1q60kmigt5s.apps.googleusercontent.com"
const FACEBOOK_APP_ID = "1669047477285810"

export default function LoginScreen() {
  const [email,setEmail] = useState("")
  const [password,setPassword] = useState("")
  const [isLoading,setIsLoading] = useState(false)
  const [emailError,setEmailError] = useState("")
  const [passwordError,setPasswordError] = useState("")
  const [showPassword,setShowPassword] = useState(false)
  const [keyboardVisible,setKeyboardVisible] = useState(false)
  const navigation = useNavigation()
  const { setAuthToken,setUser,hasRole } = useContext(AuthContext)
  const scrollViewRef = useRef(null)

  const logoOpacity = new Animated.Value(1)
  const formTranslateY = new Animated.Value(0)

  const [googleRequest,googleResponse,googlePromptAsync] = Google.useAuthRequest({
    expoClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
  })

  const [fbRequest,fbResponse,fbPromptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  })

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const { authentication } = googleResponse
      if (authentication?.accessToken) {
        handleGoogleLogin(authentication.accessToken)
      }
    }
  },[googleResponse])

  useEffect(() => {
    if (fbResponse?.type === "success") {
      const { authentication } = fbResponse
      if (authentication?.accessToken) {
        handleFacebookLogin(authentication.accessToken)
      }
    }
  },[fbResponse])

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow",() => {
      setKeyboardVisible(true)
      Animated.parallel([
        Animated.timing(logoOpacity,{
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY,{
          toValue: -50,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    })

    const keyboardDidHideListener = Keyboard.addListener("keyboardDidHide",() => {
      setKeyboardVisible(false)
      Animated.parallel([
        Animated.timing(logoOpacity,{
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(formTranslateY,{
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    })

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  },[])

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  const validateEmail = (text) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!text) {
      return "Email is required."
    }
    if (text.length > 255) {
      return "Email cannot exceed 255 characters."
    }
    if (!emailRegex.test(text)) {
      return "Invalid email format."
    }
    return ""
  }

  const validatePassword = (text) => {
    if (!text) {
      return "Password is required."
    }
    if (text.length < 6) {
      return "Password must be at least 6 characters."
    }
    if (text.length > 100) {
      return "Password cannot exceed 100 characters."
    }
    return ""
  }

  const handleEmailChange = (text) => {
    setEmail(text)
    setEmailError(validateEmail(text))
  }

  const handlePasswordChange = (text) => {
    setPassword(text)
    setPasswordError(validatePassword(text))
  }

  const showErrorAlert = (message) => {
  }

  const handleLogin = async () => {
    const emailValid = validateEmail(email)
    const passwordValid = validatePassword(password)

    if (emailValid) {
      setEmailError(emailValid)
      showErrorAlert(emailValid)
      return
    }

    if (passwordValid) {
      setPasswordError(passwordValid)
      showErrorAlert(passwordValid)
      return
    }

    setIsLoading(true)

    try {
      const response = await apiAuthService.login({ email,password })
      if (response.statusCode !== 200 || !response.data) {
        throw new Error(response.message || "Login failed")
      }

      const { accessToken,refreshToken,userId,username,roles,isProfileCompleted } = response.data;
      console.log('[LOGIN] IsProfileCompleted:', IsProfileCompleted, 'userId:', userId);

      if (!accessToken || !userId || !username || !Array.isArray(roles)) {
        throw new Error("Invalid login response data")
      }

      await AsyncStorage.setItem("refreshToken",refreshToken)
      const userData = { userId,username,roles }
      setAuthToken(accessToken)
      setUser(userData)

      if (IsProfileCompleted === false) {
        navigation.replace("RegisterScreen", { step: 2 });
      } else {
        const targetScreen = hasRole("Trainer") ? "AdminDashboard" : "Main"
        navigation.replace(targetScreen)
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = () => {
    navigation.navigate("Otp")
  }

  const handleGoogleLogin = async (token) => {
    setIsLoading(true)
    try {
      const response = await apiAuthService.googleLogin({ token })

      if (response.statusCode !== 200 || !response.data) {
        throw new Error(response.message || "Google login failed")
      }

      const { accessToken,refreshToken,userId,username,roles } = response.data

      if (!accessToken || !userId || !username || !Array.isArray(roles)) {
        throw new Error("Invalid Google login response data")
      }

      await AsyncStorage.setItem("refreshToken",refreshToken)
      const userData = { userId,username,roles }
      setAuthToken(accessToken)
      setUser(userData)

      const targetScreen = hasRole("Admin") ? "AdminDashboard" : "Main"
      navigation.replace(targetScreen)
    } catch (error) {
      showErrorAlert(error.message || "Failed to login with Google")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFacebookLogin = async (token) => {
    setIsLoading(true)
    try {
      // Call your API with the Facebook token
      const response = await apiAuthService.facebookLogin({ token })

      if (response.statusCode !== 200 || !response.data) {
        throw new Error(response.message || "Facebook login failed")
      }

      const { accessToken,refreshToken,userId,username,roles } = response.data

      if (!accessToken || !userId || !username || !Array.isArray(roles)) {
        throw new Error("Invalid Facebook login response data")
      }

      await AsyncStorage.setItem("refreshToken",refreshToken)
      const userData = { userId,username,roles }
      setAuthToken(accessToken)
      setUser(userData)

      const targetScreen = hasRole("Admin") ? "AdminDashboard" : "Main"
      navigation.replace(targetScreen)
    } catch (error) {
      showErrorAlert(error.message || "Failed to login with Facebook")
    } finally {
      setIsLoading(false)
    }
  }

  const isLoginDisabled = isLoading || emailError !== "" || passwordError !== ""

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" translucent={true} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.innerContainer}>
            

            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.formOuterContainer}
            >
              <Animated.View style={[styles.formContainer,{ transform: [{ translateY: formTranslateY }] }]}>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.subtitleText}>Sign in to continue your health journey</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
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

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={[styles.inputContainer,passwordError ? styles.inputError : null]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#94A3B8"
                      value={password}
                      onChangeText={handlePasswordChange}
                      maxLength={255}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>
                  {passwordError ? (
                    <Text style={styles.errorMessage}>
                      <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {passwordError}
                    </Text>
                  ) : null}
                </View>

                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordContainer}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoginDisabled}
                  style={[styles.loginButton,isLoginDisabled ? styles.loginButtonDisabled : null]}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    </>
                  )}
                </TouchableOpacity>

                <View style={styles.separatorContainer}>
                  <View style={styles.separatorLine} />
                  <Text style={styles.separatorText}>Or continue with</Text>
                  <View style={styles.separatorLine} />
                </View>

                <View style={styles.socialContainer}>
                  <TouchableOpacity
                    onPress={() => googlePromptAsync()}
                    disabled={isLoading}
                    style={styles.socialButton}
                  >
                    <FontAwesome name="google" size={20} color="#DB4437" />
                    <Text style={styles.socialButtonText}>Google</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => fbPromptAsync()} disabled={isLoading} style={styles.socialButton}>
                    <FontAwesome name="facebook" size={20} color="#1877F2" />
                    <Text style={styles.socialButtonText}>Facebook</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.registerContainer}>
                  <Text style={styles.registerPrompt}>Don't have an account?</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("RegisterScreen")}>
                    <Text style={styles.registerLink}>Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </SafeAreaView>
  )
}


const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0056d2",
  },
  headerContainer: {
    height: height * 0.4,
    width: "100%",
  },
  headerBackground: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  headerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: StatusBar.currentHeight || 0,
  },
  headerContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoSection: {
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 4,
    textAlign: "center",
  },
  appTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  formOuterContainer: {
    flex: 1,
    width: "100%",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    marginTop: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  signInTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#1E293B",
    marginBottom: 4,
  },
  signInSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#374151",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 15,
    color: "#1E293B",
  },
  eyeIcon: {
    padding: 8,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingLeft: 4,
  },
  errorMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#EF4444",
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginBottom: 24,
    marginTop: 4,
  },
  forgotPasswordText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#0056d2",
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0056d2",
    borderRadius: 12,
    height: 56,
    marginBottom: 24,
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
  loginButtonDisabled: {
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
  loginButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  signInButtonText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
   separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  separatorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
    marginHorizontal: 12,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#64748B",
    marginHorizontal: 16,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    height: 48,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  registerPrompt: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
  },
  registerLink: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#0056d2",
  },
   welcomeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
   subtitleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#64748B",
    marginBottom: 24,
        textAlign: "center",

  },
})