import PrivacyPolicyScreen from "./PrivacyPolicyScreen"
import { useState,useEffect,useRef } from "react"
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StyleSheet,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Image,
  Modal,
  PanGestureHandler,
  GestureHandlerRootView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import TermsOfServiceScreen from "./TermsOfServiceScreen"
import { useFonts,Inter_400Regular,Inter_600SemiBold,Inter_700Bold } from "@expo-google-fonts/inter"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import AsyncStorage from "@react-native-async-storage/async-storage"
import DateTimePicker from "@react-native-community/datetimepicker"
import { authService } from "services/apiAuthService"
import apiProfileService from "services/apiProfileService"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width,height } = Dimensions.get("window")
const GENDER_OPTIONS = ["Male","Female","Other"]

export default function RegisterScreen({ mode = 'register', navigation: propNavigation }) {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [currentStep,setCurrentStep] = useState(0)
  const [isLoading,setIsLoading] = useState(false)
  const [formData,setFormData] = useState({
    firstName: "",
    goals: [],
    bodyFatPercentage: "",
    activityLevel: "",
    dietaryPreference: "",
    fitnessGoal: "",
    birthDate: new Date(2000,0,1),
    gender: "",
    height: "",
    heightUnit: "cm",
    weight: "",
    weightUnit: "kg",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })
  const [errors,setErrors] = useState({
    firstName: "",
    goals: "",
    bodyFatPercentage: "",
    activityLevel: "",
    dietaryPreference: "",
    fitnessGoal: "",
    birthDate: "",
    gender: "",
    height: "",
    weight: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  })
  const [showPassword,setShowPassword] = useState(false)
  const [showConfirmPassword,setShowConfirmPassword] = useState(false)
  const [stepHistory,setStepHistory] = useState([0])
  const [showDatePicker,setShowDatePicker] = useState(false)
  const [showGenderOptions,setShowGenderOptions] = useState(false)
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current
  const datePickerAnimation = useRef(new Animated.Value(0)).current
  const genderModalAnimation = useRef(new Animated.Value(0)).current
  const navigation = propNavigation || useNavigation()
  const scrollViewRef = useRef(null)
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedData = await AsyncStorage.getItem("registrationFormData")
        const savedStep = await AsyncStorage.getItem("registrationCurrentStep")
        if (savedData) {
          const parsedData = JSON.parse(savedData)
          if (parsedData.birthDate) {
            parsedData.birthDate = new Date(parsedData.birthDate)
          }
          setFormData(parsedData)
        }
        if (savedStep) {
          const step = Number.parseInt(savedStep)
          setCurrentStep(step)
          setStepHistory([...Array(step).keys(),step])
        }
      } catch (error) {
      }
    }
    loadSavedData()
  },[])

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem("registrationFormData",JSON.stringify(formData))
        await AsyncStorage.setItem("registrationCurrentStep",currentStep.toString())
      } catch (error) {
      }
    }
    saveData()
  },[formData,currentStep])

  useEffect(() => {
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
  },[currentStep])

  useEffect(() => {
    if (showDatePicker) {
      Animated.timing(datePickerAnimation,{
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(datePickerAnimation,{
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  },[showDatePicker])

  useEffect(() => {
    if (showGenderOptions) {
      Animated.timing(genderModalAnimation,{
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start()
    } else {
      Animated.timing(genderModalAnimation,{
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  },[showGenderOptions])

  if (!fontsLoaded) {
    return <Loading />;
  }

  const handleChange = (field,value) => {
    setFormData((prev) => ({ ...prev,[field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev,[field]: "" }))
    }
  }

  const handleToggle = (field,item) => {
    setFormData((prev) => {
      const currentItems = prev[field]
      const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems,item]
      return { ...prev,[field]: newItems }
    })
    if (errors[field]) {
      setErrors((prev) => ({ ...prev,[field]: "" }))
    }
  }

  const handleSelect = (field,value) => {
    setFormData((prev) => ({ ...prev,[field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev,[field]: "" }))
    }
  }

  const handleDateChange = (event,selectedDate) => {
    if (selectedDate) {
      setFormData((prev) => ({ ...prev,birthDate: selectedDate }))
      if (errors.birthDate) {
        setErrors((prev) => ({ ...prev,birthDate: "" }))
      }
    }
  }

  const handleGenderSelect = (gender) => {
    setFormData((prev) => ({ ...prev,gender }))
    setShowGenderOptions(false)
    if (errors.gender) {
      setErrors((prev) => ({ ...prev,gender: "" }))
    }
  }

  const formatDate = (date) => {
    if (!date) return ""
    const day = date.getDate().toString().padStart(2,"0")
    const month = (date.getMonth() + 1).toString().padStart(2,"0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const calculateAge = (birthDate) => {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const validateCurrentStep = () => {
    let isValid = true
    const newErrors = { ...errors }
    switch (currentStep) {
      case 12: // Account setup step
        // Username (email used as username)
        if (!formData.email) {
          newErrors.email = "Email is required."
          isValid = false;
        } else if (formData.email.length < 3 || formData.email.length > 50) {
          newErrors.email = "Username must be between 3 and 50 characters."
          isValid = false;
        }
        // Password
        if (!formData.password) {
          newErrors.password = "Password is required."
          isValid = false;
        } else if (formData.password.length < 6) {
          newErrors.password = "Password must be at least 6 characters."
          isValid = false;
        } else if (formData.password.length > 100) {
          newErrors.password = "Password cannot exceed 100 characters."
          isValid = false;
        }
        // Confirm password
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = "Please confirm your password."
          isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = "Passwords do not match."
          isValid = false;
        }
        // Phone
        if (!formData.phone) {
          newErrors.phone = "Phone number is required."
          isValid = false;
        } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
          newErrors.phone = "Phone number must be 10 digits."
          isValid = false;
        } else if (formData.phone.length > 15) {
          newErrors.phone = "Phone number cannot exceed 15 digits."
          isValid = false;
        }
        break;
      default:
        // Không validate các bước khác khi đăng ký user
        break;
    }
    setErrors(newErrors)
    return isValid
  }

  // Navigate to next step
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      const nextStep = currentStep + 1
      setCurrentStep(nextStep)
      setStepHistory([...stepHistory,nextStep])
      // Scroll to top when changing steps
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0,y: 0,animated: true })
      }
    }
  }

  // Navigate to previous step
  const handlePreviousStep = () => {
    if (currentStep > 0) {
      const newHistory = [...stepHistory]
      newHistory.pop()
      const prevStep = newHistory[newHistory.length - 1]
      setCurrentStep(prevStep)
      setStepHistory(newHistory)
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0,y: 0,animated: true })
      }
    } else {
      navigation.navigate("Login")
    }
  }

  const handleRegister = async () => {
    console.log('[DEBUG] handleRegister called');
    if (!validateCurrentStep()) {
console.log(`[VALIDATE] Step ${currentStep} - formData:`, formData);

if (!formData.firstName.trim()) {
  console.log('[VALIDATE] firstName is empty');
  newErrors.firstName = "Please enter your name";
  isValid = false;
}      return;
    }
    setIsLoading(true);
    try {
      const register = {
        username: formData.email,
        email: formData.email,
        fullName: formData.firstName,
        password: formData.password,
        phone: formData.phone,
      };
      console.log('[DEBUG] Register payload:', register);
      const dataRegister = await authService.register(register);
      console.log('[DEBUG] Register API response:', dataRegister);
      if (!dataRegister || dataRegister.statusCode !== 200) {
        console.log('[DEBUG] Register API error:', dataRegister);
        if (dataRegister?.statusCode === 400 && dataRegister.errors) {
          const errorMessages = Object.entries(dataRegister.errors)
            .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
            .join("\n");
          throw new Error(`Registration failed:\n${errorMessages}`);
        }
        throw new Error("Registration failed: Invalid user data returned.");
      }
      const heightInMeters = formData.height / 100;
      const weightInKg = formData.weight;
      const bmi = weightInKg / (heightInMeters * heightInMeters);
      const profile = {
        userId: dataRegister?.data?.userId,
        profileId: 0,
        height: Number.parseFloat(formData.height),
        weight: Number.parseFloat(formData.weight),
        bmi: Number(bmi.toFixed(2)),
        bodyFatPercentage: Number.parseFloat(formData.bodyFatPercentage) || 0,
        activityLevel: formData.activityLevel || "Moderate",
        dietaryPreference: formData.dietaryPreference || "Balanced",
        fitnessGoal: formData.fitnessGoal || "Maintain",
      };
      console.log('[DEBUG] Profile payload:', profile);
      const responseAddProfile = await apiProfileService.registerProfile(profile);
      console.log('[DEBUG] Profile API response:', responseAddProfile);
      if (!responseAddProfile || responseAddProfile.statusCode !== 201) {
        console.log('[DEBUG] Profile API error:', responseAddProfile);
        if (responseAddProfile?.statusCode === 400 && responseAddProfile.errors) {
          const errorMessages = Object.entries(responseAddProfile.errors)
            .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
            .join("\n");
          throw new Error(`Profile creation failed:\n${errorMessages}`);
        }
        throw new Error("Profile creation failed: Invalid response.");
      }
      await Promise.all([
        AsyncStorage.removeItem("registrationFormData"),
        AsyncStorage.removeItem("registrationCurrentStep"),
      ]);
      console.log('[DEBUG] Registration and profile creation successful');
      showSuccessMessage("Your account has been created successfully! Please check your email to verify your account.");
      navigation.replace("Login");
    } catch (error) {
      console.log('[DEBUG] Registration error:', error);
      let errorMessage = error?.message || "An unexpected error occurred. Please try again.";
      if (error.response?.data?.errors) {
        const serverErrors = error.response.data.errors;
        const newErrors = { ...errors };
        if (serverErrors.Email) newErrors.email = serverErrors.Email[0];
        if (serverErrors.Password) newErrors.password = serverErrors.Password[0];
        if (serverErrors.Phone) newErrors.phone = serverErrors.Phone[0];
        setErrors(newErrors);
        errorMessage = Object.entries(serverErrors)
          .map(([field, messages]) => `${field}: ${messages.join(", ")}`)
          .join("\n");
      } else if (error.message && (error.message.includes("Registration failed") || error.message.includes("Profile creation failed"))) {
        errorMessage = error.message;
      }
      showErrorFetchAPI(errorMessage || (typeof error === 'string' ? error : JSON.stringify(error)));
    } finally {
      setIsLoading(false);
      console.log('[DEBUG] handleRegister finished');
    }
  }

  // totalSteps for each mode
  const totalSteps = mode === 'register' ? 1 : 12
  const renderStepIndicators = () => {
    return (
      <View style={styles.stepIndicatorsContainer}>
        {Array.from({ length: totalSteps }).map((_,index) => (
          <View key={index} style={[styles.stepIndicator,index <= currentStep ? styles.activeStepIndicator : {}]} />
        ))}
      </View>
    )
  }

  const renderStepContent = () => {
    if (mode === 'register') {
      // Only show account setup step
      return (
        <AccountSetupStep
          formData={formData}
          handleChange={handleChange}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          showConfirmPassword={showConfirmPassword}
          setShowConfirmPassword={setShowConfirmPassword}
          errors={{
            email: errors.email,
            password: errors.password,
            confirmPassword: errors.confirmPassword,
            phone: errors.phone,
          }}
          onShowTerms={() => setShowTermsModal(true)}
          showPrivacyModal={showPrivacyModal}
          setShowPrivacyModal={setShowPrivacyModal}
        />
      )
    } else {
      // Profile creation steps (skip account setup)
      switch (currentStep) {
        case 0:
          return <NameStep formData={formData} handleChange={handleChange} error={errors.firstName} />
        case 1:
          return (
            <GoalsStep formData={formData} handleToggle={(goal) => handleToggle("goals",goal)} error={errors.goals} />
          )
        case 2:
          return <BodyFatStep formData={formData} handleChange={handleChange} error={errors.bodyFatPercentage} />
        case 3:
          return (
            <ActivityLevelStep
              formData={formData}
              handleSelect={(level) => handleSelect("activityLevel",level)}
              error={errors.activityLevel}
            />
          )
        case 4:
          return (
            <DietaryPreferenceStep
              formData={formData}
              handleSelect={(preference) => handleSelect("dietaryPreference",preference)}
              error={errors.dietaryPreference}
            />
          )
        case 5:
          return (
            <FitnessGoalStep
              formData={formData}
              handleSelect={(goal) => handleSelect("fitnessGoal",goal)}
              error={errors.fitnessGoal}
            />
          )
        case 6:
          return <GoalsInfoStep formData={formData} />
        case 7:
          return <HabitsInfoStep formData={formData} />
        case 8:
          return <MealPlansInfoStep formData={formData} />
        case 9:
          return (
            <PersonalInfoStep
              formData={formData}
              handleChange={handleChange}
              handleSelect={handleSelect}
              setShowDatePicker={setShowDatePicker}
              setShowGenderOptions={setShowGenderOptions}
              formatDate={formatDate}
              calculateAge={calculateAge}
              errors={{
                birthDate: errors.birthDate,
                gender: errors.gender,
              }}
            />
          )
        case 10:
          return (
            <HeightStep
              formData={formData}
              handleChange={handleChange}
              handleSelect={handleSelect}
              error={errors.height}
            />
          )
        case 11:
          return (
            <WeightStep
              formData={formData}
              handleChange={handleChange}
              handleSelect={handleSelect}
              error={errors.weight}
            />
          )
        default:
          return null
      }
    }
  }

  const getStepTitle = () => {
    if (mode === 'register') {
      return "Set Up Account"
    }
    const titles = [
      "Personal Information",
      "Your Goals",
      "Body Fat Percentage",
      "Activity Level",
      "Dietary Preference",
      "Fitness Goal",
      "Goals",
      "Habits",
      "Meal Plans",
      "Personal Information",
      "Height",
      "Weight",
    ]
    return titles[currentStep] || "Registration"
  }

  const isFinalStep = mode === 'register' || currentStep === totalSteps - 1

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
               {mode === 'register' ? 1 : currentStep + 1}/{totalSteps}
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
              <View style={[styles.progressBar,{ width: `${mode === 'register' ? 100 : ((currentStep + 1) / totalSteps) * 100}%` }]} />
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
            {mode !== 'register' && (
              <TouchableOpacity style={styles.prevButton} onPress={handlePreviousStep} accessibilityLabel="Previous step">
                <Ionicons name="arrow-back" size={24} color="#0056d2" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.nextButton}
              onPress={isFinalStep ? handleRegister : handleNextStep}
              disabled={isLoading}
              accessibilityLabel={isFinalStep ? "Register" : "Next step"}
            >
            <Text style={styles.nextButtonText}>{isFinalStep ? (isLoading ? "Registering..." : "Register") : "Next"}</Text>
            {!isFinalStep && <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={styles.nextIcon} />}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <TermsOfServiceScreen navigation={{ goBack: () => setShowTermsModal(false) }} />
      </Modal>
      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: datePickerAnimation,
              justifyContent: "center",
            },
          ]}
        >
          <TouchableOpacity style={styles.modalBackground} onPress={() => setShowDatePicker(false)} />
          <Animated.View
            style={[
              styles.modalContainer,
              styles.datePickerModalContainer,
              {
                transform: [
                  {
                    scale: datePickerAnimation.interpolate({
                      inputRange: [0,1],
                      outputRange: [0.8,1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Birth Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={formData.birthDate || new Date()}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900,0,1)}
                style={styles.datePicker}
              />
            </View>
            <View style={styles.datePickerActions}>
              <TouchableOpacity style={styles.datePickerCancelButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.datePickerConfirmButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.datePickerConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
      {/* Gender Options Modal */}
      <Modal
        visible={showGenderOptions}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowGenderOptions(false)}
      >
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: genderModalAnimation,
            },
          ]}
        >
          <TouchableOpacity style={styles.modalBackground} onPress={() => setShowGenderOptions(false)} />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  {
                    translateY: genderModalAnimation.interpolate({
                      inputRange: [0,1],
                      outputRange: [300,0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setShowGenderOptions(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {GENDER_OPTIONS.map((gender) => (
              <TouchableOpacity key={gender} style={styles.modalOption} onPress={() => handleGenderSelect(gender)}>
                <Text style={styles.modalOptionText}>{gender}</Text>
                {formData.gender === gender && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  )
}

// Step 1: Name Input
const NameStep = ({ formData,handleChange,error }) => {
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
            const filtered = value.replace(/[^a-zA-Z\sÀ-ỹà-ỹ]/g, "");
            handleChange("firstName", filtered);
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

// Step 2: Goals Selection
const GoalsStep = ({ formData,handleToggle,error }) => {
  const goalsOptions = [
    "Lose weight",
    "Maintain weight",
    "Gain weight",
    "Build muscle",
    "Improve diet",
    "Plan meals",
    "Manage stress",
    "Stay active",
  ]
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Health Goals</Text>
      <Text style={styles.stepDescription}>
        Hello {formData.firstName || "there"}! Select up to three goals that are most important to you.
      </Text>
      {error ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
        </Text>
      ) : null}
      <View style={styles.optionsContainer}>
        {goalsOptions.map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[styles.optionButton,formData.goals.includes(goal) ? styles.selectedOptionButton : {}]}
            onPress={() => handleToggle(goal)}
            accessibilityLabel={`${goal} option`}
            accessibilityState={{ selected: formData.goals.includes(goal) }}
          >
            <Text style={[styles.optionText,formData.goals.includes(goal) ? styles.selectedOptionText : {}]}>
              {goal}
            </Text>
            <View style={formData.goals.includes(goal) ? styles.checkedBox : styles.uncheckedBox}>
              {formData.goals.includes(goal) && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.selectionCountText}>{formData.goals.length}/3 goals selected</Text>
    </View>
  )
}

// Step 3: Body Fat Percentage
const BodyFatStep = ({ formData,handleChange,error }) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Body Fat Percentage</Text>
      <Text style={styles.stepDescription}>
        Enter your body fat percentage to help us personalize your fitness recommendations.
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Body Fat Percentage</Text>
        <View style={styles.unitInputContainer}>
          <TextInput
            style={[styles.unitInput,error ? styles.inputError : null]}
            value={formData.bodyFatPercentage}
            onChangeText={(value) => handleChange("bodyFatPercentage",value.replace(/[^0-9.]/g,""))}
            placeholder="Enter your body fat percentage"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            maxLength={5}
            accessibilityLabel="Body fat percentage input"
          />
          <View style={styles.unitToggle}>
            <View style={[styles.unitButton, { borderColor: '#0056d2' }, styles.unitButtonSelected]}>
              <Text style={[styles.unitButtonText,styles.unitButtonTextSelected]}>%</Text>
            </View>
          </View>
        </View>
        {error ? (
          <Text style={styles.errorText}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
          </Text>
        ) : null}
      </View>
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#4F46E5" />
        <Text style={styles.infoCardText}>
          If you don't know your exact body fat percentage, you can estimate it or use 15% for men and 25% for women as
          average values.
        </Text>
      </View>
      <View style={styles.bodyFatRangeContainer}>
        <Text style={styles.bodyFatRangeTitle}>Typical Body Fat Percentage Ranges:</Text>
        <View style={styles.bodyFatRangeItem}>
          <Text style={styles.bodyFatRangeLabel}>Essential fat:</Text>
          <Text style={styles.bodyFatRangeValue}>3-5% (men), 10-13% (women)</Text>
        </View>
        <View style={styles.bodyFatRangeItem}>
          <Text style={styles.bodyFatRangeLabel}>Athletes:</Text>
          <Text style={styles.bodyFatRangeValue}>6-13% (men), 14-20% (women)</Text>
        </View>
        <View style={styles.bodyFatRangeItem}>
          <Text style={styles.bodyFatRangeLabel}>Fitness:</Text>
          <Text style={styles.bodyFatRangeValue}>14-17% (men), 21-24% (women)</Text>
        </View>
        <View style={styles.bodyFatRangeItem}>
          <Text style={styles.bodyFatRangeLabel}>Average:</Text>
          <Text style={styles.bodyFatRangeValue}>18-24% (men), 25-31% (women)</Text>
        </View>
      </View>
    </View>
  )
}

// Step 4: Activity Level
const ActivityLevelStep = ({ formData,handleSelect,error }) => {
  const activityLevels = [
    { value: "Sedentary",description: "Little or no exercise, desk job" },
    { value: "Lightly Active",description: "Light exercise 1-3 days/week" },
    { value: "Moderately Active",description: "Moderate exercise 3-5 days/week" },
    { value: "Very Active",description: "Hard exercise 6-7 days/week" },
    { value: "Extremely Active",description: "Very hard exercise, physical job or training twice a day" },
  ]
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Activity Level</Text>
      <Text style={styles.stepDescription}>
        Select the option that best describes your typical weekly activity level.
      </Text>
      {error ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
        </Text>
      ) : null}
      <View style={styles.optionsContainer}>
        {activityLevels.map((level) => (
          <TouchableOpacity
            key={level.value}
            style={[styles.optionButton,formData.activityLevel === level.value ? styles.selectedOptionButton : {}]}
            onPress={() => handleSelect(level.value)}
            accessibilityLabel={`${level.value} option`}
            accessibilityState={{ selected: formData.activityLevel === level.value }}
          >
            <View style={styles.activityLevelContent}>
              <Text
                style={[styles.optionText,formData.activityLevel === level.value ? styles.selectedOptionText : {}]}
              >
                {level.value}
              </Text>
              <Text style={styles.activityLevelDescription}>{level.description}</Text>
            </View>
            <View style={formData.activityLevel === level.value ? styles.checkedBox : styles.uncheckedBox}>
              {formData.activityLevel === level.value && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.infoCard}>
        <Ionicons name="fitness-outline" size={20} color="#4F46E5" />
        <Text style={styles.infoCardText}>
          Your activity level helps us calculate your daily calorie needs and create appropriate fitness
          recommendations.
        </Text>
      </View>
    </View>
  )
}

// Step 5: Dietary Preference
const DietaryPreferenceStep = ({ formData,handleSelect,error }) => {
  const dietaryPreferences = [
    "Standard",
    "Vegetarian",
    "Vegan",
    "Pescatarian",
    "Paleo",
    "Keto",
    "Mediterranean",
    "Low-carb",
    "Gluten-free",
    "Dairy-free",
  ]
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Dietary Preference</Text>
      <Text style={styles.stepDescription}>
        Select the eating pattern that best describes your dietary preferences.
      </Text>
      {error ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
        </Text>
      ) : null}
      <View style={styles.dietaryPreferencesContainer}>
        {dietaryPreferences.map((preference) => {
          const selected = formData.dietaryPreference === preference;
          return (
            <TouchableOpacity
              key={preference}
              style={[
                styles.dietaryPreferenceButton,
                selected ? { borderColor: '#0056d2', borderWidth: 1, backgroundColor: '#EEF2FF' } : {},
              ]}
              onPress={() => handleSelect(preference)}
              accessibilityLabel={`${preference} option`}
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.dietaryPreferenceText,
                  selected ? { color: '#0056d2', fontFamily: 'Inter_600SemiBold' } : {},
                ]}
              >
                {preference}
              </Text>
              {selected && (
                <Ionicons name="checkmark-circle" size={16} color="#0056d2" style={styles.dietaryPreferenceIcon} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.infoCard}>
        <Ionicons name="nutrition-outline" size={20} color="#4F46E5" />
        <Text style={styles.infoCardText}>
          Your dietary preference helps us tailor nutrition recommendations and meal plans to your specific needs.
        </Text>
      </View>
    </View>
  )
}

// Step 6: Fitness Goal
const FitnessGoalStep = ({ formData,handleSelect,error }) => {
  const fitnessGoals = [
    { value: "Weight Loss",icon: "trending-down-outline" },
    { value: "Maintain",icon: "swap-horizontal-outline" },
    { value: "Muscle Gain",icon: "trending-up-outline" },
    { value: "Improve Endurance",icon: "pulse-outline" },
    { value: "Increase Strength",icon: "barbell-outline" },
    { value: "Improve Flexibility",icon: "body-outline" },
  ]
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Fitness Goal</Text>
      <Text style={styles.stepDescription}>What is your primary fitness goal?</Text>
      {error ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
        </Text>
      ) : null}
      <View style={styles.fitnessGoalsGrid}>
        {fitnessGoals.map((goal) => {
          const selected = formData.fitnessGoal === goal.value;
          return (
            <TouchableOpacity
              key={goal.value}
              style={[
                styles.fitnessGoalCard,
                selected ? { borderColor: '#0056d2', backgroundColor: '#0056d2' } : {},
              ]}
              onPress={() => handleSelect(goal.value)}
              accessibilityLabel={`${goal.value} option`}
              accessibilityState={{ selected }}
            >
              <View
                style={[
                  styles.fitnessGoalIconContainer,
                  selected
                    ? { backgroundColor: '#0056d2', borderColor: '#fff', borderWidth: 2 }
                    : {},
                ]}
              >
                <Ionicons
                  name={goal.icon}
                  size={24}
                  color={selected ? '#fff' : '#4F46E5'}
                />
              </View>
              <Text
                style={[
                  styles.fitnessGoalText,
                  selected ? { color: '#fff', fontFamily: 'Inter_600SemiBold' } : {},
                ]}
              >
                {goal.value}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.infoCard}>
        <Ionicons name="trophy-outline" size={20} color="#4F46E5" />
        <Text style={styles.infoCardText}>
          Your fitness goal will help us create a personalized plan to achieve your desired results.
        </Text>
      </View>
    </View>
  )
}

// Step 7: Goals Info
const GoalsInfoStep = ({ formData }) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Goals Matter</Text>
      <Text style={styles.stepDescription}>
        We understand, {formData.firstName || "there"}. A busy lifestyle can get in the way of achieving your health
        goals.
      </Text>
      <View style={styles.infoCardLarge}>
        <Ionicons name="trophy" size={40} color="#0056d2" style={styles.infoCardIcon} />
        <Text style={styles.infoCardTitle}>We've helped millions overcome obstacles</Text>
        <Text style={styles.infoCardDescription}>
          Our personalized approach has helped people just like you achieve their health goals despite busy schedules
          and other challenges.
        </Text>
      </View>
      <View style={styles.bulletPoints}>
        <View style={styles.bulletPoint}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.bulletText}>Personalized guidance</Text>
        </View>
        <View style={styles.bulletPoint}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.bulletText}>Realistic, achievable goals</Text>
        </View>
        <View style={styles.bulletPoint}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.bulletText}>Support when you need it</Text>
        </View>
      </View>
    </View>
  )
}

// Step 8: Habits Info
const HabitsInfoStep = ({ formData }) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Small Habits, Big Impact</Text>
      <Text style={styles.stepDescription}>
        Great choices, {formData.firstName || "there"}! Your selections will help us create a personalized health plan.
      </Text>
      <View style={styles.infoCardLarge}>
        <Ionicons name="fitness" size={40} color="#0056d2" style={styles.infoCardIcon} />
        <Text style={styles.infoCardTitle}>Building Sustainable Habits</Text>
        <Text style={styles.infoCardDescription}>
          We'll guide you to small wins that add up to big results over time. Our approach focuses on consistency rather
          than perfection.
        </Text>
      </View>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#0056d2' }]}>87%</Text>
          <Text style={styles.statLabel}>of users report improved habits within 30 days</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: '#0056d2' }]}>92%</Text>
          <Text style={styles.statLabel}>say our approach is easier to maintain long-term</Text>
        </View>
      </View>
    </View>
  )
}

// Step 9: Meal Plans Info
const MealPlansInfoStep = ({ formData }) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Kitchen, Your Rules</Text>
      <Text style={styles.stepDescription}>
        We can simplify your life with customized, flexible meal plans that fit your lifestyle.
      </Text>
      <View style={styles.infoCardLarge}>
        <Ionicons name="restaurant" size={40} color="#0056d2" style={styles.infoCardIcon} />
        <Text style={styles.infoCardTitle}>Personalized Meal Planning</Text>
        <Text style={styles.infoCardDescription}>
          Our meal plans adapt to your preferences, dietary needs, and schedule. You'll save time while eating
          healthier.
        </Text>
      </View>
      <View style={styles.featureGrid}>
        <View style={styles.featureItem}>
          <Ionicons name="time-outline" size={24} color="#0056d2" />
          <Text style={styles.featureText}>Save time planning</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="cash-outline" size={24} color="#0056d2" />
          <Text style={styles.featureText}>Reduce food waste</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="nutrition-outline" size={24} color="#0056d2" />
          <Text style={styles.featureText}>Balanced nutrition</Text>
        </View>
        <View style={styles.featureItem}>
          <Ionicons name="options-outline" size={24} color="#0056d2" />
          <Text style={styles.featureText}>Flexible options</Text>
        </View>
      </View>
    </View>
  )
}

// Step 10: Personal Information (Birth Date & Gender only)
const PersonalInfoStep = ({
  formData,
  handleChange,
  handleSelect,
  setShowDatePicker,
  setShowGenderOptions,
  formatDate,
  calculateAge,
  errors,
}) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Personal Information</Text>
      <Text style={styles.stepDescription}>
        This helps us personalize your experience and calculate your nutritional needs.
      </Text>
      {/* Birth Date Selection */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Birth Date</Text>
        <TouchableOpacity
          style={[
            styles.selectContainer,
            formData.birthDate ? styles.filledSelect : {},
            errors.birthDate ? styles.inputError : null,
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.selectContent}>
            <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <Text style={[styles.selectText,!formData.birthDate && styles.placeholderText]}>
              {formData.birthDate
                ? `${formatDate(formData.birthDate)} (Age: ${calculateAge(formData.birthDate)})`
                : "Select birth date"}
            </Text>
          </View>
          <Ionicons name="calendar" size={20} color="#64748B" />
        </TouchableOpacity>
        {errors.birthDate ? (
          <Text style={styles.errorText}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.birthDate}
          </Text>
        ) : null}
      </View>
      {/* Gender Selection */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Gender</Text>
        <TouchableOpacity
          style={[
            styles.selectContainer,
            formData.gender ? styles.filledSelect : {},
            errors.gender ? styles.inputError : null,
          ]}
          onPress={() => setShowGenderOptions(true)}
        >
          <View style={styles.selectContent}>
            <Ionicons name="person-circle-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <Text style={[styles.selectText,!formData.gender && styles.placeholderText]}>
              {formData.gender || "Select gender"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>
        {errors.gender ? (
          <Text style={styles.errorText}>
            <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.gender}
          </Text>
        ) : null}
      </View>
      <View style={styles.infoCard}>
        <Ionicons name="shield-checkmark-outline" size={20} color="#4F46E5" />
        <Text style={styles.infoCardText}>
          Your information is secure and will only be used to personalize your experience.
        </Text>
      </View>
    </View>
  )
}

// Step 11: Height Step with Custom Slider
import CustomRuler from "components/register/CustomRuler";

const HeightStep = ({ formData, handleChange, handleSelect, error }) => {
  const minHeight = 140;
  const maxHeight = 220;
  const initialHeight = formData.height && !isNaN(Number(formData.height)) ? Math.round(Number(formData.height)) : 170;
  const [heightValue, setHeightValue] = useState(initialHeight);
  const [heightUnit, setHeightUnit] = useState(formData.heightUnit || "cm");

  // Sync formData.height if it changes externally (e.g. from saved state)
  useEffect(() => {
    if (formData.height && !isNaN(Number(formData.height))) {
      const parsed = Math.round(Number(formData.height));
      if (parsed !== heightValue) setHeightValue(parsed);
    }
  }, [formData.height]);

  useEffect(() => {
    if (formData.heightUnit && formData.heightUnit !== heightUnit) {
      setHeightUnit(formData.heightUnit);
    }
  }, [formData.heightUnit]);

  // Hiển thị giá trị theo đơn vị
  let displayValue = heightValue;
  let displayText = `${heightValue} cm`;
  if (heightUnit === 'ft') {
    const totalInches = heightValue / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inch = Math.round(totalInches % 12);
    displayText = `${ft} ft ${inch} in`;
  }

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Height</Text>
      <Text style={styles.stepDescription}>
        What's your height? This helps us calculate your BMI and personalize your fitness plan.
      </Text>
      <View style={styles.unitSelectorContainer}>
        <TouchableOpacity
          style={[styles.unitSelectorButton, heightUnit === "cm" ? styles.unitSelectorActive : styles.unitSelectorInactive]}
          onPress={() => {
            setHeightUnit("cm");
            handleSelect("heightUnit", "cm");
          }}
        >
          <Text style={heightUnit === "cm" ? styles.unitSelectorTextActive : styles.unitSelectorTextInactive}>cm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitSelectorButton, heightUnit === "ft" ? styles.unitSelectorActive : styles.unitSelectorInactive]}
          onPress={() => {
            setHeightUnit("ft");
            handleSelect("heightUnit", "ft");
          }}
        >
          <Text style={heightUnit === "ft" ? styles.unitSelectorTextActive : styles.unitSelectorTextInactive}>ft/in</Text>
        </TouchableOpacity>
      </View>
      <View style={{ width: '100%', alignItems: 'center', marginVertical: 24 }}>
        <CustomRuler
          min={minHeight}
          max={maxHeight}
          value={heightValue}
          onValueChange={(val) => {
            setHeightValue(val);
            handleChange("height", val.toString());
          }}
          unit={heightUnit}
          unitOptions={['cm', 'ft']}
          onUnitChange={(unit) => {
            setHeightUnit(unit);
            handleSelect("heightUnit", unit);
          }}
          majorStep={10}
          minorStep={1}
          indicatorColor="#10B981"
          indicatorWidth={2}
          indicatorHeight={80}
          style={{ marginBottom: 8 }}
          renderLabel={(value) => {
            if (heightUnit === 'ft') {
              const totalInches = value * 12;
              const ft = Math.floor(value);
              const inch = Math.round((value - ft) * 12);
              return (
                <Text style={{
                  fontSize: 10,
                  color: '#0056d2',
                  fontWeight: '600',
                  textAlign: 'center',
                  marginTop: 0,
                  minWidth: 32,
                  overflow: 'visible',
                }} numberOfLines={1}>{ft}ft{inch > 0 ? ` ${inch}in` : ''}</Text>
              );
            }
            let display = String(value);
            if (display.endsWith('.0'))
              display = display.slice(0, -2);
            return (
              <Text style={{
                fontSize: 10,
                color: '#0056d2',
                fontWeight: '600',
                textAlign: 'center',
                marginTop: 0,
                minWidth: 32,
                overflow: 'visible',
              }} numberOfLines={1}>{display}</Text>
            );
          }}
        />
        <Text style={{ fontSize: 32, fontWeight: "bold", color: "#0056d2", marginTop: 8 }}>{displayText}</Text>
      </View>
      {error ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
        </Text>
      ) : null}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#4F46E5" />
        <Text style={styles.infoCardText}>
          Your height is used to calculate your BMI and determine appropriate fitness recommendations.
        </Text>
      </View>
    </View>
  );
};

// Step 12: Weight Step with Custom Slider

const WeightStep = ({ formData, handleChange, handleSelect, error }) => {
  const initialWeight = formData.weight && !isNaN(Number(formData.weight)) ? Math.round(Number(formData.weight)) : 70;
  const [weightValue, setWeightValue] = useState(initialWeight);
  const [weightUnit, setWeightUnit] = useState(formData.weightUnit || "kg");

  // Sync formData.weight if it changes externally (e.g. from saved state)
  useEffect(() => {
    if (formData.weight && !isNaN(Number(formData.weight))) {
      const parsed = Math.round(Number(formData.weight));
      if (parsed !== weightValue) setWeightValue(parsed);
    }
  }, [formData.weight]);

  useEffect(() => {
    if (formData.weightUnit && formData.weightUnit !== weightUnit) {
      setWeightUnit(formData.weightUnit);
    }
  }, [formData.weightUnit]);

  // Hiển thị giá trị theo đơn vị
  let displayValue = weightValue;
  let displayText = `${weightValue} kg`;
  if (weightUnit === 'lb') {
    const lb = Math.round(weightValue * 2.20462);
    displayText = `${lb} lb`;
  }

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Weight</Text>
      <Text style={styles.stepDescription}>
        What's your current weight? This helps us calculate your BMI and create personalized recommendations.
      </Text>
      <View style={styles.unitSelectorContainer}>
        <TouchableOpacity
          style={[styles.unitSelectorButton, weightUnit === "kg" ? styles.unitSelectorActive : styles.unitSelectorInactive]}
          onPress={() => {
            setWeightUnit("kg");
            handleSelect("weightUnit", "kg");
          }}
        >
          <Text style={weightUnit === "kg" ? styles.unitSelectorTextActive : styles.unitSelectorTextInactive}>kg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitSelectorButton, weightUnit === "lb" ? styles.unitSelectorActive : styles.unitSelectorInactive]}
          onPress={() => {
            setWeightUnit("lb");
            handleSelect("weightUnit", "lb");
          }}
        >
          <Text style={weightUnit === "lb" ? styles.unitSelectorTextActive : styles.unitSelectorTextInactive}>lb</Text>
        </TouchableOpacity>
      </View>
      <View style={{ width: '100%', alignItems: 'center', marginVertical: 24 }}>
        <CustomRuler
          type="weight"
          value={weightValue}
          onValueChange={(val) => {
            setWeightValue(val);
            handleChange("weight", val.toString());
          }}
          unit={weightUnit}
          unitOptions={['kg', 'lb']}
          onUnitChange={(unit) => {
            setWeightUnit(unit);
            handleSelect("weightUnit", unit);
          }}
          indicatorColor="#10B981"
          indicatorWidth={2}
          indicatorHeight={80}
          style={{ marginBottom: 8 }}
          renderLabel={(value) => {
            if (weightUnit === 'lb') {
              const lb = Math.round(value * 2.20462);
              return (
                <Text style={{
                  fontSize: 10,
                  color: '#0056d2',
                  fontWeight: '600',
                  textAlign: 'center',
                  marginTop: 0,
                  minWidth: 32,
                  overflow: 'visible',
                }} numberOfLines={1}>{lb} lb</Text>
              );
            }
            let display = String(value);
            if (display.endsWith('.0'))
              display = display.slice(0, -2);
            return (
              <Text style={{
                fontSize: 10,
                color: '#0056d2',
                fontWeight: '600',
                textAlign: 'center',
                marginTop: 0,
                minWidth: 32,
                overflow: 'visible',
              }} numberOfLines={1}>{display}</Text>
            );
          }}
        />
        <Text style={{ fontSize: 32, fontWeight: "bold", color: "#0056d2", marginTop: 8 }}>{displayText}</Text>
      </View>
      {error ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
        </Text>
      ) : null}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color="#4F46E5" />
        <Text style={styles.infoCardText}>
          Your weight helps us calculate your BMI and determine appropriate calorie and fitness recommendations.
        </Text>
      </View>
    </View>
  );
};

// Step 13: Account Setup
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
  const passwordStrength = getPasswordStrength(formData.password)
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Your Account</Text>
      <Text style={styles.stepDescription}>You're almost done! Set up your account to save your progress.</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <View style={[styles.iconInputContainer,errors.email ? styles.inputError : null]}>
          <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.iconInput}
            value={formData.email}
            onChangeText={(value) => handleChange("email",value)}
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
      {/* Phone number field moved above password fields */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <View style={[styles.iconInputContainer,errors.phone ? styles.inputError : null]}>
          <Ionicons name="call-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.iconInput}
            value={formData.phone}
            onChangeText={(value) => handleChange("phone",value.replace(/[^0-9]/g,""))}
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
        <View style={[styles.iconInputContainer,errors.password ? styles.inputError : null]}>
          <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.iconInput}
            value={formData.password}
            onChangeText={(value) => handleChange("password",value)}
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
              {[...Array(4)].map((_,index) => (
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
            <Text style={[styles.passwordStrengthText,{ color: passwordStrength.color }]}>
              {passwordStrength.label}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={[styles.iconInputContainer,errors.confirmPassword ? styles.inputError : null]}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#64748B" style={styles.inputIcon} />
          <TextInput
            style={styles.iconInput}
            value={formData.confirmPassword}
            onChangeText={(value) => handleChange("confirmPassword",value)}
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
          By registering, you agree to our{' '}
          <Text style={styles.termsLink} onPress={onShowTerms}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink} onPress={() => setShowPrivacyModal(true)}>Privacy Policy</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
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
  activeStepIndicatorText: {
    color: "#0056d2",
    fontFamily: "Inter_600SemiBold",
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  stepIcon: {
    width: 80,
    height: 80,
    marginBottom: 16,
    borderRadius: 40,
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
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    height: 56,
  },
  selectContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  filledSelect: {
    borderColor: "#A5B4FC",
    backgroundColor: "#F5F7FF",
  },
  selectText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  placeholderText: {
    color: "#94A3B8",
  },
  optionsContainer: {
    width: "100%",
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
  },
  selectedOptionButton: {
    backgroundColor: "#EEF2FF",
    borderColor: "#0056d2",
    borderBottomColor: "#0056d2",
    borderWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 2,
    marginBlock: 2,
  },
  optionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  selectedOptionText: {
    fontFamily: "Inter_600SemiBold",
    color: "#0056d2",
  },
  checkedBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
  },
  uncheckedBox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
  },
  selectionCountText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#334155",
    alignSelf: "flex-start",
    marginBottom: 12,
    marginTop: 16,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    width: "100%",
  },
  tagButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  selectedTagButton: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#4F46E5",
  },
  tagText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
  },
  selectedTagText: {
    color: "#4F46E5",
    fontFamily: "Inter_600SemiBold",
  },
  tagIcon: {
    marginLeft: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: "100%",
  },
  infoCardText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  infoCardLarge: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 24,
    marginVertical: 16,
    width: "100%",
    borderLeftWidth: 4,
    borderLeftColor: "#4F46E5",
  },
  infoCardIcon: {
    marginBottom: 16,
  },
  infoCardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  infoCardDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
    lineHeight: 20,
  },
  bulletPoints: {
    width: "100%",
    marginTop: 16,
  },
  bulletPoint: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  bulletText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#334155",
    marginLeft: 12,
  },
  statsContainer: {
    width: "100%",
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#4F46E5",
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#334155",
    textAlign: "center",
  },
  featureGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  featureItem: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  featureText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    marginLeft: 8,
  },
  unitInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  unitInput: {
    flex: 1,
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
  unitToggle: {
    flexDirection: "row",
    marginLeft: 8,
  },
  unitButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    marginLeft: 4,
    backgroundColor: "#FFFFFF",
  },
  unitButtonSelected: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  unitButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#64748B",
  },
  unitButtonTextSelected: {
    color: "#4F46E5",
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
    shadowOffset: { width: 0,height: 4 },
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
  // Body Fat Percentage styles
  bodyFatRangeContainer: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  bodyFatRangeTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
    marginBottom: 12,
  },
  bodyFatRangeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  bodyFatRangeLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
  },
  bodyFatRangeValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
  },
  // Activity Level styles
  activityLevelContent: {
    flex: 1,
  },
  activityLevelDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  // Dietary Preference styles
  dietaryPreferencesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    marginBottom: 16,
  },
  dietaryPreferenceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    margin: 6,
    minWidth: "45%",
  },
  selectedDietaryPreference: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#4F46E5",
  },
  dietaryPreferenceText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
  selectedDietaryPreferenceText: {
    color: "#4F46E5",
    fontFamily: "Inter_600SemiBold",
  },
  dietaryPreferenceIcon: {
    marginLeft: 6,
  },
  // Fitness Goal styles
  fitnessGoalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  fitnessGoalCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedFitnessGoalCard: {
    borderColor: "#4F46E5",
    backgroundColor: "#EEF2FF",
  },
  fitnessGoalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedFitnessGoalIconContainer: {
    backgroundColor: "#4F46E5",
  },
  fitnessGoalText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
  selectedFitnessGoalText: {
    color: "#4F46E5",
  },
  // Custom Slider Styles
  unitSelectorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 40,
    backgroundColor: "#F1F5F9",
    borderRadius: 25,
    padding: 4,
    width: 200,
    alignSelf: "center",
  },
  unitSelectorButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  unitSelectorActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unitSelectorInactive: {
    backgroundColor: "transparent",
  },
  unitSelectorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  unitSelectorTextActive: {
    color: "#1E293B",
  },
  unitSelectorTextInactive: {
    color: "#94A3B8",
  },
  sliderContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 40,
  },
  sliderTrack: {
    width: width - 80,
    height: 80,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    position: "relative",
    justifyContent: "center",
  },
  rulerContainer: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  rulerMark: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  rulerLine: {
    width: 2,
    height: 20,
    backgroundColor: "#CBD5E1",
    marginBottom: 8,
  },
  rulerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#64748B",
  },
  sliderThumb: {
    position: "absolute",
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  sliderThumbInner: {
    width: 24,
    height: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  currentValueContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  currentValueText: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    color: "#10B981",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  datePickerModalContainer: {
    borderRadius: 24,
    marginHorizontal: 20,
    maxWidth: 400,
    width: "90%",
    alignSelf: "center",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#1E293B",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalOptionText: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
    color: "#334155",
  },
  datePickerContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  datePicker: {
    width: "100%",
    height: 200,
  },
  datePickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  datePickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  datePickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
    alignItems: "center",
  },
  datePickerCancelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#64748B",
  },
  datePickerConfirmText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
})
