import React,{ useState,useRef,useEffect,useContext } from "react"
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
  Modal,
} from "react-native"
import Loading from "components/Loading";
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons"
import { profileService } from "services/apiProfileService"
import { useAuth } from "context/AuthContext"
import { useFonts,Inter_400Regular,Inter_600SemiBold,Inter_700Bold } from "@expo-google-fonts/inter"
import Header from "components/Header"
import { ThemeContext } from "components/theme/ThemeContext"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar";

const ACTIVITY_LEVELS = ["Sedentary","Lightly Active","Moderately Active","Very Active","Extremely Active"]

const DIETARY_PREFERENCES = [
  "No Preference",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Keto",
  "Paleo",
  "Low Carb",
  "Low Fat",
]

const FITNESS_GOALS = [
  "Weight Loss",
  "Muscle Gain",
  "Maintenance",
  "Improve Fitness",
  "Improve Health",
  "Athletic Performance",
]

export default function EditProfileScreen({ navigation,route }) {
  const { user } = useAuth()
  const { colors } = useContext(ThemeContext)
  const initialProfile = route.params?.profile || {}

  const [formData,setFormData] = useState({
    height: initialProfile.height?.toString() || "",
    weight: initialProfile.weight?.toString() || "",
    bodyFatPercentage: initialProfile.bodyFatPercentage?.toString() || "",
    activityLevel: initialProfile.activityLevel || "",
    dietaryPreference: initialProfile.dietaryPreference || "",
    fitnessGoal: initialProfile.fitnessGoal || "",
  })

  const [activeField,setActiveField] = useState(null)
  const [showActivityOptions,setShowActivityOptions] = useState(false)
  const [showDietaryOptions,setShowDietaryOptions] = useState(false)
  const [showGoalOptions,setShowGoalOptions] = useState(false)
  const [isLoading,setIsLoading] = useState(false)
  const [errors,setErrors] = useState({
    height: "",
    weight: "",
    bodyFatPercentage: "",
  })

  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  })

  useEffect(() => {
    if (formData.height && formData.weight) {
      const heightInMeters = Number.parseFloat(formData.height) / 100
      const weightInKg = Number.parseFloat(formData.weight)
      const bmi = weightInKg / (heightInMeters * heightInMeters)
      setBmiValue(bmi.toFixed(1))
    } else {
      setBmiValue(null)
    }
  },[formData.height,formData.weight])

  const [bmiValue,setBmiValue] = useState(null)

  const getBmiCategory = (bmi) => {
    if (!bmi) return { text: "N/A",color: "#64748B" }

    const value = Number.parseFloat(bmi)
    if (value < 18.5) return { text: "Underweight",color: "#FBBF24" }
    if (value < 25) return { text: "Normal",color: "#10B981" }
    if (value < 30) return { text: "Overweight",color: "#F59E0B" }
    return { text: "Obese",color: "#EF4444" }
  }

  const bmiCategory = getBmiCategory(bmiValue)

  if (!fontsLoaded || isLoading) {
    return <Loading />;
  }

  const validateForm = () => {
    const newErrors = {
      height: "",
      weight: "",
      bodyFatPercentage: "",
      activityLevel: "",
      dietaryPreference: "",
      fitnessGoal: "",
    }

    let isValid = true

    // Height: [Range(0.1, 300)]
    if (formData.height) {
      const height = Number.parseFloat(formData.height)
      if (isNaN(height) || height < 0.1 || height > 300) {
        newErrors.height = "Height must be between 0.1 and 300 cm."
        isValid = false
      }
    }

    // Weight: [Range(0.1, 500)]
    if (formData.weight) {
      const weight = Number.parseFloat(formData.weight)
      if (isNaN(weight) || weight < 0.1 || weight > 500) {
        newErrors.weight = "Weight must be between 0.1 and 500 kg."
        isValid = false
      }
    }

    // BMI: [Range(0, 100)] (calculated, not user input, but validate if present)
    if (bmiValue) {
      const bmi = Number.parseFloat(bmiValue)
      if (isNaN(bmi) || bmi < 0 || bmi > 100) {
        // Not shown in UI, but could be used for debugging
        // newErrors.bmi = "BMI must be between 0 and 100."
        isValid = false
      }
    }

    // Body Fat: [Range(0, 100)]
    if (formData.bodyFatPercentage) {
      const bodyFat = Number.parseFloat(formData.bodyFatPercentage)
      if (isNaN(bodyFat) || bodyFat < 0 || bodyFat > 100) {
        newErrors.bodyFatPercentage = "Body fat percentage must be between 0 and 100%."
        isValid = false
      }
    }

    // Activity Level: [StringLength(50)]
    if (formData.activityLevel && formData.activityLevel.length > 50) {
      newErrors.activityLevel = "Activity level cannot exceed 50 characters."
      isValid = false
    }

    // Dietary Preference: [StringLength(255)]
    if (formData.dietaryPreference && formData.dietaryPreference.length > 255) {
      newErrors.dietaryPreference = "Dietary preference cannot exceed 255 characters."
      isValid = false
    }

    // Fitness Goal: [StringLength(255)]
    if (formData.fitnessGoal && formData.fitnessGoal.length > 255) {
      newErrors.fitnessGoal = "Fitness goal cannot exceed 255 characters."
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await profileService.updateProfile(user.userId,{
        ...formData,
        userId: user.userId,
        height: formData.height ? Number.parseFloat(formData.height) : null,
        weight: formData.weight ? Number.parseFloat(formData.weight) : null,
        bodyFatPercentage: formData.bodyFatPercentage ? Number.parseFloat(formData.bodyFatPercentage) : null,
      });

      if (response.statusCode === 200) {
        showSuccessMessage("Profile updated successfully.");
        navigation.goBack();
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setIsLoading(false);
    }
  }

  const selectOption = (field,value) => {
    setFormData({ ...formData,[field]: value })
    setShowActivityOptions(false)
    setShowDietaryOptions(false)
    setShowGoalOptions(false)

    // Animate selection
    Animated.sequence([
      Animated.timing(fadeAnim,{
        toValue: 0.5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const renderOptionsList = (options,field) => {
    return (
      <Animated.View
        style={[
          styles.optionsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView style={styles.optionsList} nestedScrollEnabled={true}>
          {options.map((option,index) => (
            <TouchableOpacity
              key={index}
              style={[styles.optionItem,formData[field] === option && styles.selectedOption]}
              onPress={() => selectOption(field,option)}
            >
              <Text style={[styles.optionText,formData[field] === option && styles.selectedOptionText]}>{option}</Text>
              {formData[field] === option && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    )
  }


  return (
    <SafeAreaView style={[styles.safeArea,{ backgroundColor: colors.background || '#fff' }]}>
      <Header
        title="Edit Profile"
        canGoBack
        onBack={() => navigation.goBack()}
        rightActions={[]}
      />

      <KeyboardAvoidingView
        style={[styles.container,{ backgroundColor: colors.backgroundCard || '#F8FAFC',marginTop: 70 }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formSection}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="body-outline" size={24} color={colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Body Metrics</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="resize-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.label}>Height</Text>
              </View>
              <View style={[styles.inputContainer,activeField === "height" && styles.activeInput]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter height"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formData.height}
                  onChangeText={(text) => {
                    setFormData({ ...formData,height: text })
                    if (errors.height) setErrors({ ...errors,height: "" })
                  }}
                  onFocus={() => setActiveField("height")}
                  onBlur={() => setActiveField(null)}
                />
                <Text style={styles.inputSuffix}>cm</Text>
              </View>
              {errors.height ? (
                <Text style={styles.errorMessage}>
                  <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.height}
                </Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="scale-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.label}>Weight</Text>
              </View>
              <View style={[styles.inputContainer,activeField === "weight" && styles.activeInput]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter weight"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formData.weight}
                  onChangeText={(text) => {
                    setFormData({ ...formData,weight: text })
                    if (errors.weight) setErrors({ ...errors,weight: "" })
                  }}
                  onFocus={() => setActiveField("weight")}
                  onBlur={() => setActiveField(null)}
                />
                <Text style={styles.inputSuffix}>kg</Text>
              </View>
              {errors.weight ? (
                <Text style={styles.errorMessage}>
                  <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.weight}
                </Text>
              ) : null}
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="water-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.label}>Body Fat</Text>
              </View>
              <View style={[styles.inputContainer,activeField === "bodyFat" && styles.activeInput]}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter body fat"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={formData.bodyFatPercentage}
                  onChangeText={(text) => {
                    setFormData({ ...formData,bodyFatPercentage: text })
                    if (errors.bodyFatPercentage) setErrors({ ...errors,bodyFatPercentage: "" })
                  }}
                  onFocus={() => setActiveField("bodyFat")}
                  onBlur={() => setActiveField(null)}
                />
                <Text style={styles.inputSuffix}>%</Text>
              </View>
              {errors.bodyFatPercentage ? (
                <Text style={styles.errorMessage}>
                  <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {errors.bodyFatPercentage}
                </Text>
              ) : null}
            </View>

            {bmiValue && (
              <View style={styles.bmiContainer}>
                <View style={styles.bmiHeader}>
                  <Ionicons name="analytics-outline" size={20} color={colors.primary} />
                  <Text style={styles.bmiTitle}>BMI Calculation</Text>
                </View>
                <View style={styles.bmiContent}>
                  <View style={styles.bmiValueContainer}>
                    <Text style={styles.bmiValue}>{bmiValue}</Text>
                    <View style={[styles.bmiCategoryBadge,{ backgroundColor: `${bmiCategory.color}20` }]}>
                      <Text style={[styles.bmiCategoryText,{ color: bmiCategory.color }]}>{bmiCategory.text}</Text>
                    </View>
                  </View>
                  <Text style={styles.bmiDescription}>
                    BMI is calculated based on your height and weight. It's a general indicator of healthy weight range.
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.formSection}>
            <View style={styles.sectionHeaderContainer}>
              <Ionicons name="fitness-outline" size={24} color={colors.primary} style={styles.sectionIcon} />
              <Text style={styles.sectionTitle}>Fitness Profile</Text>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="walk-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.label}>Activity Level</Text>
              </View>
              <TouchableOpacity
                style={[styles.selectContainer,formData.activityLevel ? styles.filledSelect : {}]}
                onPress={() => setShowActivityOptions(true)}
              >
                <Text style={[styles.selectText,!formData.activityLevel && styles.placeholderText]}>
                  {formData.activityLevel || "Select activity level"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>
              {/* Custom Select Modal for Activity Level */}
              <Modal
                visible={showActivityOptions}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowActivityOptions(false)}
              >
                <Animated.View style={styles.modalOverlay}>
                  <TouchableOpacity style={styles.modalBackground} onPress={() => setShowActivityOptions(false)} />
                  <Animated.View style={[styles.modalContainer,{ transform: [{ translateY: showActivityOptions ? 0 : 300 }] }]}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Activity Level</Text>
                      <TouchableOpacity onPress={() => setShowActivityOptions(false)}>
                        <Ionicons name="close" size={24} color={colors.textSecondary || "#64748B"} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 320 }}>
                      {ACTIVITY_LEVELS.map((option,idx) => (
                        <React.Fragment key={option}>
                          <TouchableOpacity style={styles.modalOption} onPress={() => { setFormData({ ...formData,activityLevel: option }); setShowActivityOptions(false); }}>
                            <Text style={[styles.modalOptionText,{ color: colors.primary }]}>{option}</Text>
                            {formData.activityLevel === option && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                          </TouchableOpacity>
                          {idx !== ACTIVITY_LEVELS.length - 1 && <View style={styles.modalDivider} />}
                        </React.Fragment>
                      ))}
                    </ScrollView>
                  </Animated.View>
                </Animated.View>
              </Modal>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="restaurant-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.label}>Diet Preference</Text>
              </View>
              <TouchableOpacity
                style={[styles.selectContainer,formData.dietaryPreference ? styles.filledSelect : {}]}
                onPress={() => setShowDietaryOptions(true)}
              >
                <Text style={[styles.selectText,!formData.dietaryPreference && styles.placeholderText]}>
                  {formData.dietaryPreference || "Select diet preference"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>
              {/* Custom Select Modal for Diet Preference */}
              <Modal
                visible={showDietaryOptions}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowDietaryOptions(false)}
              >
                <Animated.View style={styles.modalOverlay}>
                  <TouchableOpacity style={styles.modalBackground} onPress={() => setShowDietaryOptions(false)} />
                  <Animated.View style={[styles.modalContainer,{ transform: [{ translateY: showDietaryOptions ? 0 : 300 }] }]}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Diet Preference</Text>
                      <TouchableOpacity onPress={() => setShowDietaryOptions(false)}>
                        <Ionicons name="close" size={24} color={colors.textSecondary || "#64748B"} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 320 }}>
                      {DIETARY_PREFERENCES.map((option,idx) => (
                        <React.Fragment key={option}>
                          <TouchableOpacity style={styles.modalOption} onPress={() => { setFormData({ ...formData,dietaryPreference: option }); setShowDietaryOptions(false); }}>
                            <Text style={[styles.modalOptionText,{ color: colors.primary }]}>{option}</Text>
                            {formData.dietaryPreference === option && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                          </TouchableOpacity>
                          {idx !== DIETARY_PREFERENCES.length - 1 && <View style={styles.modalDivider} />}
                        </React.Fragment>
                      ))}
                    </ScrollView>
                  </Animated.View>
                </Animated.View>
              </Modal>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="trophy-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <Text style={styles.label}>Fitness Goal</Text>
              </View>
              <TouchableOpacity
                style={[styles.selectContainer,formData.fitnessGoal ? styles.filledSelect : {}]}
                onPress={() => setShowGoalOptions(true)}
              >
                <Text style={[styles.selectText,!formData.fitnessGoal && styles.placeholderText]}>
                  {formData.fitnessGoal || "Select fitness goal"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#64748B" />
              </TouchableOpacity>
              {/* Custom Select Modal for Fitness Goal */}
              <Modal
                visible={showGoalOptions}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowGoalOptions(false)}
              >
                <Animated.View style={styles.modalOverlay}>
                  <TouchableOpacity style={styles.modalBackground} onPress={() => setShowGoalOptions(false)} />
                  <Animated.View style={[styles.modalContainer,{ transform: [{ translateY: showGoalOptions ? 0 : 300 }] }]}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>Select Fitness Goal</Text>
                      <TouchableOpacity onPress={() => setShowGoalOptions(false)}>
                        <Ionicons name="close" size={24} color={colors.textSecondary || "#64748B"} />
                      </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 320 }}>
                      {FITNESS_GOALS.map((option,idx) => (
                        <React.Fragment key={option}>
                          <TouchableOpacity style={styles.modalOption} onPress={() => { setFormData({ ...formData,fitnessGoal: option }); setShowGoalOptions(false); }}>
                            <Text style={[styles.modalOptionText,{ color: colors.primary }]}>{option}</Text>
                            {formData.fitnessGoal === option && <Ionicons name="checkmark" size={20} color={colors.primary} />}
                          </TouchableOpacity>
                          {idx !== FITNESS_GOALS.length - 1 && <View style={styles.modalDivider} />}
                        </React.Fragment>
                      ))}
                    </ScrollView>
                  </Animated.View>
                </Animated.View>
              </Modal>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.submitButton,{ backgroundColor: '#0056d2' },isLoading ? styles.submitButtonDisabled : null]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.submitButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.tipContainer}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.tipText}>
              Keeping your profile up to date helps us provide more accurate health recommendations and tracking.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingBottom: 40,
  },
  formSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionIcon: {
    marginRight: 10,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#1E293B",
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    height: 56,
  },
  activeInput: {
    borderColor: "#4F46E5",
    borderWidth: 2,
    backgroundColor: "#F8FAFC",
  },
  input: {
    flex: 1,
    height: 56,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#0F172A",
  },
  inputSuffix: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#64748B",
    marginLeft: 4,
  },
  errorMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#EF4444",
    marginTop: 6,
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
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    marginTop: 4,
    maxHeight: 200,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  optionsList: {
    padding: 8,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedOption: {
    backgroundColor: "#EEF2FF",
  },
  optionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#334155",
  },
  selectedOptionText: {
    fontFamily: "Inter_600SemiBold",
    color: "#4F46E5",
  },
  buttonIcon: {
    marginRight: 8,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
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
  submitButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  bmiContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0056D2",
  },
  bmiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  bmiTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 8,
  },
  bmiContent: {
    flexDirection: "column",
  },
  bmiValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  bmiValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#0F172A",
    marginRight: 12,
  },
  bmiCategoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bmiCategoryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  bmiDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
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
    paddingBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0,height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#1E293B",
  },
  modalOption: {
    paddingVertical: 15,
    // paddingHorizontal: 16, // Remove default horizontal padding
    paddingLeft: 0, // Remove left padding
    paddingRight: 16, // Keep right padding for icon
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 16,
    marginRight: 16,
  },
  modalOptionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "#334155",
  },
})
