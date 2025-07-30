import { useState,useEffect,useContext } from "react"
import { View,Text,TouchableOpacity,StyleSheet,Dimensions,ScrollView,TextInput } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation } from "@react-navigation/native"
import Icon from "react-native-vector-icons/MaterialIcons"
import IconFA from "react-native-vector-icons/FontAwesome5"
import IconMCI from "react-native-vector-icons/MaterialCommunityIcons"
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil"
import { profileService } from "services/apiProfileService"
import { apiUserService } from "services/apiUserService"
import { AuthContext } from "context/AuthContext"

const screenDimensions = Dimensions.get("window")

export default function ProfileSteps({
  currentStep = 0,
  formData: _formData,
  handleChange: _handleChange,
  handleToggle: _handleToggle,
  handleSelect: _handleSelect,
  setShowDatePicker = () => { },
  setShowGenderOptions = () => { },
  formatDate = (date) => date?.toDateString() || "",
  calculateAge = () => 0,
  errors = {},
  onComplete = () => { },
}) {
  const [formData,setFormData] = useState(_formData || {})
  const [isLoading,setIsLoading] = useState(false)
  const [showRecommendations,setShowRecommendations] = useState(false)
  const [calculatedBMI,setCalculatedBMI] = useState(null)
  const [calorieGoal,setCalorieGoal] = useState(null)
  const [step,setStep] = useState(currentStep || 0)
  const [validationErrors,setValidationErrors] = useState({})
  const { user } = useContext(AuthContext)
  const navigation = useNavigation()

  // Persist formData and step to AsyncStorage whenever they change
  const persistProfileState = async (nextFormData,nextStep) => {
    try {
      await AsyncStorage.setItem("profileFormData",JSON.stringify(nextFormData))
      await AsyncStorage.setItem("profileCurrentStep",String(nextStep))
    } catch (e) {
      console.warn("[ProfileSteps] Failed to persist state",e)
    }
  }

  const handleNavigation = (screen,params) => {
    navigation.navigate(screen,params)
  }

  const handleChange = (key,value) => {
    setFormData((prev) => {
      const updated = { ...prev,[key]: value }
      persistProfileState(updated,step)
      return updated
    })
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev,[key]: null }))
    }
  }

  const handleSelect = (key,value) => {
    setFormData((prev) => {
      const updated = { ...prev,[key]: value }
      persistProfileState(updated,step)
      return updated
    })
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev,[key]: null }))
    }
  }

  const handleToggle = (key,value) => {
    setFormData((prev) => {
      let updated
      if (Array.isArray(prev[key])) {
        if (prev[key].includes(value)) {
          updated = { ...prev,[key]: prev[key].filter((v) => v !== value) }
        } else {
          updated = { ...prev,[key]: [...prev[key],value] }
        }
      } else {
        updated = { ...prev,[key]: [value] }
      }
      persistProfileState(updated,step)
      console.log("[ProfileSteps] handleToggle:",key,value,updated)
      return updated
    })
    // Clear validation error when user toggles
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev,[key]: null }))
    }
  }

  useEffect(() => {
    console.log("userId",user?.userId)
    if (formData?.height && formData?.weight) {
      const heightInM = Number.parseFloat(formData.height) / 100
      const weightInKg = Number.parseFloat(formData.weight)
      if (heightInM > 0 && weightInKg > 0) {
        const bmi = (weightInKg / (heightInM * heightInM)).toFixed(1)
        setCalculatedBMI(Number.parseFloat(bmi))
      }
    }
  },[formData?.height,formData?.weight])

  const calculateCalorieGoal = () => {
    if (!formData?.height || !formData?.weight) {
      return 1500
    }
    // Use default values for age and gender since we removed those steps
    const age = 25 // Default age
    const heightInCm = Number.parseFloat(formData?.height || "")
    const weightInKg = Number.parseFloat(formData?.weight || "")
    const isMale = true // Default to male for calculation

    let bmr
    if (isMale) {
      bmr = 88.362 + 13.397 * weightInKg + 4.799 * heightInCm - 5.677 * age
    } else {
      bmr = 447.593 + 9.247 * weightInKg + 3.098 * heightInCm - 4.33 * age
    }

    const activityMultipliers = {
      Sedentary: 1.2,
      "Lightly Active": 1.375,
      "Moderately Active": 1.55,
      "Very Active": 1.725,
      "Extremely Active": 1.9,
    }

    const multiplier = activityMultipliers[formData?.activityLevel || ""] || 1.2
    let tdee = bmr * multiplier

    if (formData?.fitnessGoal === "Weight Loss") {
      tdee -= 500
    } else if (formData?.fitnessGoal === "Muscle Gain") {
      tdee += 300
    }

    return Math.round(tdee)
  }

  const validateCurrentStep = () => {
    const errors = {}
    switch (step) {
      case 0: // Height
        const height = Number.parseFloat(formData?.height)
        if (!formData?.height || isNaN(height) || height < 0.1 || height > 300) {
          errors.height = "Please enter a valid height between 0.1-300 cm"
        }
        break
      case 1: // Weight
        const weight = Number.parseFloat(formData?.weight)
        if (!formData?.weight || isNaN(weight) || weight < 0.1 || weight > 500) {
          errors.weight = "Please enter a valid weight between 0.1-500 kg"
        }
        break
      case 2: // Activity Level
        const validActivityLevels = [
          "Sedentary",
          "Lightly Active",
          "Moderately Active",
          "Very Active",
          "Extremely Active",
        ]
        if (!formData?.activityLevel || !validActivityLevels.includes(formData.activityLevel)) {
          errors.activityLevel = "Please select your activity level"
        }
        break
      case 3: // Fitness Goals
        const validFitnessGoals = [
          "Weight Loss",
          "Maintain",
          "Muscle Gain",
          "Improve Endurance",
          "Increase Strength",
          "Improve Flexibility",
        ]
        if (!formData?.fitnessGoal || !validFitnessGoals.includes(formData.fitnessGoal)) {
          errors.fitnessGoal = "Please select your primary fitness goal"
        }
        break
      case 4: // Health Goals
        if (!formData?.goals || !Array.isArray(formData.goals) || formData.goals.length === 0) {
          errors.goals = "Please select at least one health goal"
        }
        break
      case 5: // Dietary Preference
        const validDietaryPreferences = [
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
        if (!formData?.dietaryPreference || !validDietaryPreferences.includes(formData.dietaryPreference)) {
          errors.dietaryPreference = "Please select your dietary preference"
        }
        break
      case 6: // Body Fat
        const bodyFat = Number.parseFloat(formData?.bodyFatPercentage)
        if (
          !formData?.bodyFatPercentage ||
          formData.bodyFatPercentage.trim() === "" ||
          isNaN(bodyFat) ||
          bodyFat < 0 ||
          bodyFat > 100
        ) {
          errors.bodyFatPercentage = "Please enter a valid body fat percentage (0-100%)"
        }
        break
    }
    return errors
  }

  const handleCompleteProfile = async () => {
    console.log("handleCompleteProfile called",formData)
    const requiredFields = [
      { key: "height",label: "Height" },
      { key: "weight",label: "Weight" },
      { key: "activityLevel",label: "Activity Level" },
      { key: "dietaryPreference",label: "Dietary Preference" },
      { key: "fitnessGoal",label: "Fitness Goal" },
      { key: "goals",label: "Health Goals" },
      { key: "bodyFatPercentage",label: "Body Fat Percentage" },
    ]

    const missingFields = requiredFields.filter((field) => {
      const value = formData?.[field.key]
      if (field.key === "height") {
        const num = Number.parseFloat(value)
        return isNaN(num) || num < 0.1 || num > 300
      }
      if (field.key === "weight") {
        const num = Number.parseFloat(value)
        return isNaN(num) || num < 0.1 || num > 500
      }
      if (field.key === "bodyFatPercentage") {
        const num = Number.parseFloat(value)
        return isNaN(num) || num < 0 || num > 100
      }
      return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)
    })

    console.log("[COMPLETE PROFILE] formData:",formData)
    if (missingFields.length > 0) {
      const missingLabels = missingFields.map((f) => f.label).join(", ")
      showErrorMessage(`Please complete all required fields: ${missingLabels}`)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      let userId = null
      let debugUserId = null
      if (user && (user.id || user.userId)) {
        userId = user.id || user.userId
        debugUserId = `AuthContext: id=${user.id}, userId=${user.userId}`
      } else {
        const userData = await AsyncStorage.getItem("userData")
        const parsedUser = userData ? JSON.parse(userData) : null
        userId = parsedUser?.id || parsedUser?.userId
        debugUserId = `AsyncStorage: id=${parsedUser?.id}, userId=${parsedUser?.userId}`
      }

      console.log("[DEBUG] userId resolved:",userId,debugUserId)
      if (!userId) {
        throw new Error("User ID is unavailable. Please log in again.")
      }

      const calorie = calculateCalorieGoal()
      setCalorieGoal(calorie)

      const profileData = {
        userId: userId,
        height: Number.parseFloat(formData?.height || ""),
        weight: Number.parseFloat(formData?.weight || ""),
        bmi: calculatedBMI,
        bodyFatPercentage: Number.parseFloat(formData?.bodyFatPercentage || "") || null,
        activityLevel: formData?.activityLevel || "",
        dietaryPreference: formData?.dietaryPreference || "",
        fitnessGoal: formData?.fitnessGoal || "",
        goals: formData?.goals || [],
        calorieGoal: calorie,
      }


      await profileService.registerProfile(profileData)

      await AsyncStorage.removeItem("profileFormData")
      await AsyncStorage.removeItem("profileCurrentStep")

      showSuccessMessage("Profile created successfully!")
      console.log("[COMPLETE PROFILE] API call completed successfully!")

      setTimeout(() => {
        setIsLoading(false)
        setShowRecommendations(true)
      },3000)
    } catch (error) {
      setIsLoading(false)
      showErrorFetchAPI(err)
    }
  }

  const handleStartApp = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData")
      const user = userData ? JSON.parse(userData) : null
      if (user) {
        user.hasProfile = true
        await AsyncStorage.setItem("userData",JSON.stringify(user))
      }
      await AsyncStorage.removeItem("profileFormData")
      await AsyncStorage.removeItem("profileCurrentStep")
      handleNavigation("Main")
    } catch (error) {
      console.error("Error updating user data or navigating:",error)
    }
  }

  const goNext = () => {
    console.log("goNext called, step:",step)
    const stepErrors = validateCurrentStep()
    if (Object.keys(stepErrors).length > 0) {
      setValidationErrors(stepErrors)
      const errorMessage = Object.values(stepErrors)[0]
      showErrorMessage(errorMessage)
      return
    }

    // Clear any existing validation errors
    setValidationErrors({})
    if (step < 6) {
      setStep((prevStep) => {
        const nextStep = prevStep + 1
        persistProfileState(formData,nextStep)
        return nextStep
      })
    } else {
      handleCompleteProfile()
    }
  }

  const goPrev = () => {
    if (step > 0) {
      setValidationErrors({}) // Clear validation errors when going back
      setStep((prevStep) => {
        const nextStep = prevStep - 1
        persistProfileState(formData,nextStep)
        return nextStep
      })
    }
  }

  const renderStep = () => {
    console.log("Current step:",step,"Form data:",formData)
    switch (step) {
      case 0:
        return (
          <HeightStep
            formData={formData}
            handleChange={handleChange}
            handleSelect={handleSelect}
            error={validationErrors.height}
            onContinue={goNext}
          />
        )
      case 1:
        return (
          <WeightStep
            formData={formData}
            handleChange={handleChange}
            handleSelect={handleSelect}
            error={validationErrors.weight}
            onContinue={goNext}
          />
        )
      case 2:
        return (
          <ActivityLevelStep
            formData={formData}
            handleSelect={handleSelect}
            error={validationErrors.activityLevel}
            onContinue={goNext}
          />
        )
      case 3:
        return (
          <FitnessGoalStep
            formData={formData}
            handleSelect={handleSelect}
            error={validationErrors.fitnessGoal}
            onContinue={goNext}
          />
        )
      case 4:
        return (
          <GoalsStep
            formData={formData}
            handleToggle={handleToggle}
            error={validationErrors.goals}
            onContinue={goNext}
          />
        )
      case 5:
        return (
          <DietaryPreferenceStep
            formData={formData}
            handleSelect={handleSelect}
            error={validationErrors.dietaryPreference}
            onContinue={goNext}
          />
        )
      case 6:
        return (
          <BodyFatStep
            formData={formData}
            handleChange={handleChange}
            error={validationErrors.bodyFatPercentage}
            onComplete={goNext}
          />
        )
      default:
        return null
    }
  }

  // Restore step and formData from AsyncStorage on mount
  useEffect(() => {
    const restoreProfileState = async () => {
      try {
        const savedFormData = await AsyncStorage.getItem("profileFormData")
        const savedStep = await AsyncStorage.getItem("profileCurrentStep")
        if (savedFormData) {
          setFormData(JSON.parse(savedFormData))
        }
        if (savedStep && !isNaN(Number(savedStep))) {
          setStep(Number(savedStep))
        }
      } catch (e) {
        console.warn("[ProfileSteps] Failed to restore state",e)
      }
    }
    restoreProfileState()
  },[])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (showRecommendations) {
    return <RecommendationsScreen calorieGoal={calorieGoal} onStart={handleStartApp} formData={formData} />
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with back button */}
        <View style={styles.header}>
          {step > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={goPrev}>
              <Icon name="arrow-back" size={24} color="#0056d2" />
            </TouchableOpacity>
          )}
          <View style={styles.stepCounterContainer}>
            <Text style={styles.stepCounter}>{step + 1} of 7</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// Height Step
const HeightStep = ({ formData,handleChange,handleSelect,error,onContinue }) => {
  const [selectedFeet,setSelectedFeet] = useState(5)
  const [selectedInches,setSelectedInches] = useState(5)
  const [selectedCm,setSelectedCm] = useState(formData?.height ? Number.parseInt(formData.height) : 170)
  const [unit,setUnit] = useState("CM")

  const feet = Array.from({ length: 5 },(_,i) => i + 3)
  const inches = Array.from({ length: 12 },(_,i) => i)
  const cms = Array.from({ length: 151 },(_,i) => i + 100)

  const handleHeightChange = () => {
    let heightInCm
    if (unit === "FT") {
      const totalInches = selectedFeet * 12 + selectedInches
      heightInCm = Math.round(totalInches * 2.54)
    } else {
      heightInCm = selectedCm
    }
    handleChange("height",heightInCm.toString())
    handleSelect("heightUnit",unit.toLowerCase())
  }

  const handleCmSelect = (cm) => {
    setSelectedCm(cm)
    handleChange("height",cm.toString())
    handleSelect("heightUnit","cm")
  }

  const handleFeetSelect = (foot) => {
    setSelectedFeet(foot)
    const totalInches = foot * 12 + selectedInches
    const heightInCm = Math.round(totalInches * 2.54)
    handleChange("height",heightInCm.toString())
    handleSelect("heightUnit","ft")
  }

  const handleInchesSelect = (inch) => {
    setSelectedInches(inch)
    const totalInches = selectedFeet * 12 + inch
    const heightInCm = Math.round(totalInches * 2.54)
    handleChange("height",heightInCm.toString())
    handleSelect("heightUnit","ft")
  }

  const handleContinue = () => {
    handleHeightChange()
    onContinue()
  }

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill,{ width: "14%" }]} />
      </View>

      <View style={styles.iconContainer}>
        <IconMCI name="human-male-height" size={48} color="#0056d2" />
      </View>

      <Text style={styles.stepTitle}>How tall are you?</Text>
      <Text style={styles.stepDescription}>
        Your height is essential for calculating BMI and determining your ideal calorie intake.
      </Text>

      <View style={styles.unitToggleContainer}>
        <TouchableOpacity
          style={[styles.unitToggle,unit === "CM" && styles.activeUnitToggle]}
          onPress={() => setUnit("CM")}
        >
          <Text style={[styles.unitToggleText,unit === "CM" && styles.activeUnitToggleText]}>CM</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pickerContainer}>
        <ScrollView
          style={styles.cmPicker}
          showsVerticalScrollIndicator={false}
          snapToInterval={60}
          decelerationRate="fast"
        >
          {cms.map((cm) => (
            <TouchableOpacity
              key={cm}
              style={[styles.heightItem,selectedCm === cm && styles.selectedHeightItem]}
              onPress={() => handleCmSelect(cm)}
            >
              <Text style={[styles.heightText,selectedCm === cm && styles.selectedHeightText]}>{cm}</Text>
              {selectedCm === cm && <Text style={styles.unitText}>cm</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  )
}

// Weight Step
const WeightStep = ({ formData,handleChange,handleSelect,error,onContinue }) => {
  const [selectedWeight,setSelectedWeight] = useState(formData?.weight ? Number.parseFloat(formData.weight) : 70)
  const [unit,setUnit] = useState("KG")

  const kgWeights = Array.from({ length: 271 },(_,i) => i + 30)
  const lbsWeights = Array.from({ length: 551 },(_,i) => i + 50)

  const handleWeightSelect = (weight) => {
    setSelectedWeight(weight)
    const weightInKg = unit === "LBS" ? (weight * 0.453592).toFixed(1) : weight.toString()
    handleChange("weight",weightInKg)
    handleSelect("weightUnit",unit.toLowerCase())
  }

  const handleContinue = () => {
    const weightInKg = unit === "LBS" ? (selectedWeight * 0.453592).toFixed(1) : selectedWeight.toString()
    handleChange("weight",weightInKg)
    handleSelect("weightUnit",unit.toLowerCase())
    onContinue()
  }

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill,{ width: "28%" }]} />
      </View>

      <View style={styles.iconContainer}>
        <IconMCI name="scale-bathroom" size={48} color="#0056d2" />
      </View>

      <Text style={styles.stepTitle}>What's your current weight?</Text>
      <Text style={styles.stepDescription}>
        Your current weight helps us create a personalized plan and track your progress effectively.
      </Text>

      <View style={styles.unitToggleContainer}>
        <TouchableOpacity
          style={[styles.unitToggle,unit === "KG" && styles.activeUnitToggle]}
          onPress={() => setUnit("KG")}
        >
          <Text style={[styles.unitToggleText,unit === "KG" && styles.activeUnitToggleText]}>KG</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pickerContainer}>
        <ScrollView
          style={styles.weightPicker}
          showsVerticalScrollIndicator={false}
          snapToInterval={60}
          decelerationRate="fast"
        >
          {(unit === "KG" ? kgWeights : lbsWeights).map((weight) => (
            <TouchableOpacity
              key={weight}
              style={[styles.weightItem,selectedWeight === weight && styles.selectedWeightItem]}
              onPress={() => handleWeightSelect(weight)}
            >
              <Text style={[styles.weightText,selectedWeight === weight && styles.selectedWeightText]}>{weight}</Text>
              {selectedWeight === weight && <Text style={styles.unitText}>{unit.toLowerCase()}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  )
}

// Activity Level Step
const ActivityLevelStep = ({ formData,handleSelect,error,onContinue }) => {
  const activityLevels = [
    {
      value: "Sedentary",
      description: "Little to no exercise, desk job",
      icon: "weekend",
    },
    {
      value: "Lightly Active",
      description: "Light exercise 1-3 days per week",
      icon: "directions-walk",
    },
    {
      value: "Moderately Active",
      description: "Moderate exercise 3-5 days per week",
      icon: "directions-bike",
    },
    {
      value: "Very Active",
      description: "Hard exercise 6-7 days per week",
      icon: "directions-run",
    },
    {
      value: "Extremely Active",
      description: "Very hard exercise, physical job",
      icon: "fitness-center",
    },
  ]

  const [selectedIndex,setSelectedIndex] = useState(
    formData?.activityLevel ? activityLevels.findIndex((level) => level.value === formData.activityLevel) : 1,
  )

  const handleActivitySelect = (index) => {
    setSelectedIndex(index)
    handleSelect("activityLevel",activityLevels[index].value)
  }

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill,{ width: "42%" }]} />
      </View>

      <View style={styles.iconContainer}>
        <IconFA name="running" size={48} color="#0056d2" />
      </View>

      <Text style={styles.stepTitle}>How active are you?</Text>
      <Text style={styles.stepDescription}>
        Your activity level helps us calculate your daily calorie needs and create a suitable fitness plan.
      </Text>

      <View style={styles.activityCardContainer}>
        <View style={styles.activityCard}>
          <View style={styles.activityIconContainer}>
            <Icon name={activityLevels[selectedIndex].icon} size={48} color="#0056d2" />
          </View>
          <Text style={styles.activityTitle}>{activityLevels[selectedIndex].value}</Text>
          <Text style={styles.activityDescription}>{activityLevels[selectedIndex].description}</Text>
        </View>
      </View>

      <View style={styles.sliderContainer}>
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => handleActivitySelect(Math.max(0,selectedIndex - 1))}
        >
          <Icon name="chevron-left" size={24} color="#0056d2" />
        </TouchableOpacity>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill,{ width: `${((selectedIndex + 1) / activityLevels.length) * 100}%` }]} />
          <View style={[styles.sliderThumb,{ left: `${(selectedIndex / (activityLevels.length - 1)) * 90}%` }]} />
        </View>
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => handleActivitySelect(Math.min(activityLevels.length - 1,selectedIndex + 1))}
        >
          <Icon name="chevron-right" size={24} color="#0056d2" />
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  )
}

// Fitness Goal Step
const FitnessGoalStep = ({ formData,handleSelect,error,onContinue }) => {
  const [selectedGoal,setSelectedGoal] = useState(formData?.fitnessGoal || "")
  const fitnessGoals = [
    { value: "Weight Loss",icon: "trending-down",description: "Lose weight and burn fat" },
    { value: "Maintain",icon: "trending-flat",description: "Maintain current weight" },
    { value: "Muscle Gain",icon: "trending-up",description: "Build muscle and gain weight" },
    { value: "Improve Endurance",icon: "directions-run",description: "Boost cardiovascular fitness" },
    { value: "Increase Strength",icon: "fitness-center",description: "Get stronger and more powerful" },
    { value: "Improve Flexibility",icon: "self-improvement",description: "Enhance mobility and flexibility" },
  ]

  const handleGoalSelect = (goal) => {
    setSelectedGoal(goal)
    handleSelect("fitnessGoal",goal)
  }

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill,{ width: "56%" }]} />
      </View>

      <View style={styles.iconContainer}>
        <Icon name="flag" size={48} color="#0056d2" />
      </View>

      <Text style={styles.stepTitle}>What's your primary fitness goal?</Text>
      <Text style={styles.stepDescription}>
        Choose your main objective to help us tailor your workout and nutrition plan.
      </Text>

      <View style={styles.verticalOptionsContainer}>
        {fitnessGoals.map((goal) => {
          const selected = selectedGoal === goal.value
          return (
            <TouchableOpacity
              key={goal.value}
              style={[styles.verticalOptionCard,selected && styles.selectedVerticalOptionCard]}
              onPress={() => handleGoalSelect(goal.value)}
            >
              <View style={styles.verticalOptionContent}>
                <Icon name={goal.icon} size={32} color={selected ? "#FFFFFF" : "#0056d2"} />
                <View style={styles.verticalOptionTextContainer}>
                  <Text style={[styles.verticalOptionTitle,selected && styles.selectedVerticalOptionTitle]}>
                    {goal.value}
                  </Text>
                  <Text
                    style={[styles.verticalOptionDescription,selected && styles.selectedVerticalOptionDescription]}
                  >
                    {goal.description}
                  </Text>
                </View>
              </View>
              {selected && <Icon name="check" size={24} color="#FFFFFF" />}
            </TouchableOpacity>
          )
        })}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.continueButton,!selectedGoal && styles.disabledButton]}
        onPress={onContinue}
        disabled={!selectedGoal}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  )
}

// Goals Step
const GoalsStep = ({ formData,handleToggle,error,onContinue }) => {
  const goalsOptions = [
    { text: "Lose weight",icon: "trending-down" },
    { text: "Maintain weight",icon: "trending-flat" },
    { text: "Gain weight",icon: "trending-up" },
    { text: "Build muscle",icon: "fitness-center" },
    { text: "Improve diet",icon: "restaurant" },
    { text: "Plan meals",icon: "event-note" },
    { text: "Manage stress",icon: "spa" },
    { text: "Stay active",icon: "directions-run" },
    { text: "Better sleep",icon: "bedtime" },
    { text: "Increase energy",icon: "flash-on" },
  ]

  const selectedGoals = formData?.goals || []

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill,{ width: "70%" }]} />
      </View>

      <View style={styles.iconContainer}>
        <Icon name="track-changes" size={48} color="#0056d2" />
      </View>

      <Text style={styles.stepTitle}>What are your health goals?</Text>
      <Text style={styles.stepDescription}>Select up to 3 goals that are most important to you right now.</Text>

      <View style={styles.optionsContainer}>
        {goalsOptions.map((goal) => (
          <TouchableOpacity
            key={goal.text}
            style={[styles.optionButton,selectedGoals.includes(goal.text) && styles.selectedOptionButton]}
            onPress={() => {
              if (selectedGoals.includes(goal.text) || selectedGoals.length < 3) {
                handleToggle("goals",goal.text)
              }
            }}
            disabled={!selectedGoals.includes(goal.text) && selectedGoals.length >= 3}
          >
            <View style={styles.optionContent}>
              <Icon name={goal.icon} size={24} color={selectedGoals.includes(goal.text) ? "#0056d2" : "#9CA3AF"} />
              <Text style={[styles.optionText,selectedGoals.includes(goal.text) && styles.selectedOptionText]}>
                {goal.text}
              </Text>
            </View>
            <View style={selectedGoals.includes(goal.text) ? styles.checkedBox : styles.uncheckedBox}>
              {selectedGoals.includes(goal.text) && <Icon name="check" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.selectionCountText}>{selectedGoals.length}/3 goals selected</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.continueButton,selectedGoals.length === 0 && styles.disabledButton]}
        onPress={onContinue}
        disabled={selectedGoals.length === 0}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  )
}

// Dietary Preference Step
const DietaryPreferenceStep = ({ formData,handleSelect,error,onContinue }) => {
  const [selectedPreference,setSelectedPreference] = useState(formData?.dietaryPreference || "")
  const dietaryPreferences = [
    { text: "Standard",icon: "restaurant" },
    { text: "Vegetarian",icon: "eco" },
    { text: "Vegan",icon: "nature" },
    { text: "Pescatarian",icon: "set-meal" },
    { text: "Paleo",icon: "outdoor-grill" },
    { text: "Keto",icon: "local-fire-department" },
    { text: "Mediterranean",icon: "waves" },
    { text: "Low-carb",icon: "remove" },
    { text: "Gluten-free",icon: "no-meals" },
    { text: "Dairy-free",icon: "block" },
  ]

  const handlePreferenceSelect = (preference) => {
    setSelectedPreference(preference)
    handleSelect("dietaryPreference",preference)
  }

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill,{ width: "84%" }]} />
      </View>

      <View style={styles.iconContainer}>
        <Icon name="restaurant-menu" size={48} color="#0056d2" />
      </View>

      <Text style={styles.stepTitle}>What's your dietary preference?</Text>
      <Text style={styles.stepDescription}>
        This helps us recommend meals and recipes that fit your lifestyle and preferences.
      </Text>

      <View style={styles.verticalOptionsContainer}>
        {dietaryPreferences.map((preference) => {
          const selected = selectedPreference === preference.text
          return (
            <TouchableOpacity
              key={preference.text}
              style={[styles.verticalOptionCard,selected && styles.selectedVerticalOptionCard]}
              onPress={() => handlePreferenceSelect(preference.text)}
            >
              <View style={styles.verticalOptionContent}>
                <Icon name={preference.icon} size={32} color={selected ? "#FFFFFF" : "#0056d2"} />
                <Text style={[styles.verticalOptionTitle,selected && styles.selectedVerticalOptionTitle]}>
                  {preference.text}
                </Text>
              </View>
              {selected && <Icon name="check" size={24} color="#FFFFFF" />}
            </TouchableOpacity>
          )
        })}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.continueButton,!selectedPreference && styles.disabledButton]}
        onPress={onContinue}
        disabled={!selectedPreference}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
        <Icon name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  )
}

const BodyFatStep = ({ formData,handleChange,error,onComplete }) => {
  const [bodyFat,setBodyFat] = useState(formData?.bodyFatPercentage ? String(formData.bodyFatPercentage) : "")

  const handleBodyFatChange = (text) => {
    const cleaned = text.replace(/[^0-9.]/g,"")
    setBodyFat(cleaned)
    handleChange("bodyFatPercentage",cleaned)
  }

  const handleComplete = () => {
    const value = Number.parseFloat(bodyFat);

    if (!bodyFat || bodyFat.trim() === "") {
      showErrorMessage("Please enter your body fat percentage");
      return;
    }

    if (isNaN(value) || value <= 0 || value >= 100) {
      showErrorMessage("Please enter a valid body fat percentage (between 0 and 100)");
      return;
    }

    onComplete();
  };


  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill,{ width: "100%" }]} />
      </View>

      <View style={styles.iconContainer}>
        <IconMCI name="chart-donut" size={48} color="#0056d2" />
      </View>

      <Text style={styles.stepTitle}>What's your body fat percentage?</Text>
      <Text style={styles.stepDescription}>
        This helps us provide more accurate fitness recommendations. If you're unsure, you can estimate based on the
        ranges below.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Body Fat Percentage</Text>
        <View style={styles.bodyFatInputContainer}>
          <TextInput
            style={styles.bodyFatInput}
            value={bodyFat}
            onChangeText={handleBodyFatChange}
            placeholder="15"
            keyboardType="numeric"
            maxLength={5}
            placeholderTextColor="#9CA3AF"
          />
          <Text style={styles.percentSymbol}>%</Text>
        </View>
      </View>

      <View style={styles.bodyFatInfo}>
        <Text style={styles.bodyFatInfoTitle}>Typical Body Fat Ranges:</Text>
        <Text style={styles.bodyFatInfoText}>• Unknown: Enter 0%</Text>
        <Text style={styles.bodyFatInfoText}>• Essential: 3-5% (men), 10-13% (women)</Text>
        <Text style={styles.bodyFatInfoText}>• Athletes: 6-13% (men), 14-20% (women)</Text>
        <Text style={styles.bodyFatInfoText}>• Fitness: 14-17% (men), 21-24% (women)</Text>
        <Text style={styles.bodyFatInfoText}>• Average: 18-24% (men), 25-31% (women)</Text>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.continueButton,(!bodyFat || bodyFat.trim() === "") && styles.disabledButton]}
        onPress={handleComplete}
        disabled={!bodyFat || bodyFat.trim() === ""}
      >
        <Text style={styles.continueButtonText}>COMPLETE PROFILE</Text>
        <Icon name="check" size={20} color="#FFFFFF" style={styles.buttonIcon} />
      </TouchableOpacity>
    </View>
  )
}

const LoadingScreen = () => {
  const [currentStep,setCurrentStep] = useState(0)
  const loadingSteps = [
    "Analyzing your profile data",
    "Calculating your metabolic rate",
    "Selecting personalized recommendations",
    "Creating your custom health plan",
    "Finalizing your dashboard",
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev))
    },600)
    return () => clearInterval(interval)
  },[])

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingIconContainer}>
        <View style={styles.loadingIcon}>
          <IconFA name="dumbbell" size={48} color="#FFFFFF" />
        </View>
      </View>
      <Text style={styles.loadingTitle}>Creating your{"\n"}personalized health plan</Text>
      <View style={styles.loadingStepsContainer}>
        {loadingSteps.map((step,index) => (
          <View
            key={index}
            style={[
              styles.loadingStep,
              {
                opacity: index <= currentStep ? 1 : 0.3,
                backgroundColor: index <= currentStep ? "#E3F2FD" : "#F8FAFC",
              },
            ]}
          >
            <View style={styles.loadingStepContent}>
              {index <= currentStep ? (
                <Icon name="check-circle" size={24} color="#0056d2" />
              ) : (
                <View style={styles.loadingStepDot} />
              )}
              <Text style={[styles.loadingStepText,{ color: index <= currentStep ? "#0056d2" : "#94A3B8" }]}>
                {step}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}
const RecommendationsScreen = ({ calorieGoal,onStart,formData }) => {
  const getCalorieRange = (calorie) => {
    const min = Math.round(calorie * 0.9)
    const max = Math.round(calorie * 1.1)
    return `${min} - ${max}`
  }

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: "Underweight",color: "#F59E0B" }
    if (bmi < 25) return { category: "Normal",color: "#10B981" }
    if (bmi < 30) return { category: "Overweight",color: "#F97316" }
    return { category: "Obese",color: "#EF4444" }
  }

  const bmi =
    formData?.height && formData?.weight
      ? (Number.parseFloat(formData.weight) / Math.pow(Number.parseFloat(formData.height) / 100,2)).toFixed(1)
      : null
  const bmiInfo = bmi ? getBMICategory(Number.parseFloat(bmi)) : null

  return (
    <View style={styles.recommendationsContainer}>
      <View style={styles.recommendationsHeader}>
        <View style={styles.successIconContainer}>
          <Icon name="check-circle" size={80} color="#FFFFFF" />
        </View>
        <Text style={styles.recommendationsTitle}>Done Set!</Text>
      </View>

      <View style={styles.recommendationsContent}>
        <View style={styles.recommendationsVerticalGrid}>
          {/* Calorie Goal Card */}
          <View style={styles.recommendationVerticalCard}>
            <View style={styles.recommendationCardHeader}>
              <Icon name="local-fire-department" size={32} color="#F97316" />
              <Text style={styles.recommendationCardTitle}>Daily Calories</Text>
            </View>
            <Text style={styles.recommendationCardValue}>{getCalorieRange(calorieGoal || 1500)}</Text>
            <Text style={styles.recommendationCardUnit}>kcal per day</Text>
          </View>

          {/* BMI Card */}
          {bmi && (
            <View style={styles.recommendationVerticalCard}>
              <View style={styles.recommendationCardHeader}>
                <IconMCI name="chart-line" size={32} color="#0056d2" />
                <Text style={styles.recommendationCardTitle}>BMI</Text>
              </View>
              <Text style={styles.recommendationCardValue}>{bmi}</Text>
              <Text style={[styles.recommendationCardUnit,{ color: bmiInfo.color }]}>{bmiInfo.category}</Text>
            </View>
          )}

          {/* Activity Level Card */}
          <View style={styles.recommendationVerticalCard}>
            <View style={styles.recommendationCardHeader}>
              <IconFA name="running" size={28} color="#10B981" />
              <Text style={styles.recommendationCardTitle}>Activity Level</Text>
            </View>
            <Text style={styles.recommendationCardValue}>{formData?.activityLevel || "Moderate"}</Text>
            <Text style={styles.recommendationCardUnit}>Current level</Text>
          </View>

          {/* Goal Card */}
          <View style={styles.recommendationVerticalCard}>
            <View style={styles.recommendationCardHeader}>
              <Icon name="emoji-events" size={32} color="#F59E0B" />
              <Text style={styles.recommendationCardTitle}>Primary Goal</Text>
            </View>
            <Text style={styles.recommendationCardValue}>{formData?.fitnessGoal || "Maintain"}</Text>
            <Text style={styles.recommendationCardUnit}>Focus area</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.startButton} onPress={onStart}>
          <Text style={styles.startButtonText}>START MY HEALTH JOURNEY</Text>
          <Icon name="arrow-forward" size={24} color="#FFFFFF" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCounterContainer: {
    flex: 1,
    alignItems: "flex-end"
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  stepContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 24,
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    marginBottom: 32,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0056d2",
    borderRadius: 4,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#0056d2",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 36,
  },
  stepDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  continueButton: {
    backgroundColor: "#0056d2",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0,height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: "#94A3B8",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  buttonIcon: {
    marginLeft: 8,
  },

  // Picker Styles
  pickerContainer: {
    height: 320,
    width: "100%",
    marginBottom: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cmPicker: {
    flex: 1,
    paddingVertical: 16,
  },
  heightItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 12,
  },
  selectedHeightItem: {
    height: 70,
    backgroundColor: "#E3F2FD",
  },
  heightText: {
    fontSize: 24,
    color: "#94A3B8",
    fontWeight: "500",
  },
  selectedHeightText: {
    fontSize: 32,
    color: "#0056d2",
    fontWeight: "700",
  },
  unitText: {
    fontSize: 14,
    color: "#0056d2",
    marginTop: 4,
    fontWeight: "500",
  },

  // Unit Toggle Styles
  unitToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unitToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  activeUnitToggle: {
    backgroundColor: "#0056d2",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  unitToggleText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  activeUnitToggleText: {
    color: "#FFFFFF",
  },

  // Height Step Styles
  heightPickerContainer: {
    height: 320,
    width: "100%",
    marginBottom: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    padding: 16,
  },
  heightRow: {
    flexDirection: "row",
    flex: 1,
  },
  heightColumn: {
    flex: 1,
    alignItems: "center",
  },
  heightColumnTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 16,
  },
  heightPicker: {
    flex: 1,
    width: "100%",
  },

  // Weight Step Styles
  weightPicker: {
    flex: 1,
    paddingVertical: 16,
  },
  weightItem: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 16,
    borderRadius: 12,
  },
  selectedWeightItem: {
    height: 70,
    backgroundColor: "#E3F2FD",
  },
  weightText: {
    fontSize: 24,
    color: "#94A3B8",
    fontWeight: "500",
  },
  selectedWeightText: {
    fontSize: 32,
    color: "#0056d2",
    fontWeight: "700",
  },

  // Activity Level Styles
  activityCardContainer: {
    width: "100%",
    marginBottom: 32,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    minHeight: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#E3F2FD",
  },
  activityIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  activityTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  activityDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 32,
  },
  sliderButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
    borderRadius: 3,
    position: "relative",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#0056d2",
    borderRadius: 3,
  },
  sliderThumb: {
    position: "absolute",
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0056d2",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },

  // Vertical Options Styles
  verticalOptionsContainer: {
    width: "100%",
    marginBottom: 32,
  },
  verticalOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedVerticalOptionCard: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  verticalOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  verticalOptionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  verticalOptionTitle: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
    marginBottom: 4,
  },
  selectedVerticalOptionTitle: {
    color: "#FFFFFF",
  },
  verticalOptionDescription: {
    fontSize: 14,
    color: "#64748B",
  },
  selectedVerticalOptionDescription: {
    color: "#E0E7FF",
  },

  // Goals Step Styles
  optionsContainer: {
    width: "100%",
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOptionButton: {
    backgroundColor: "#E3F2FD",
    borderColor: "#0056d2",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
    marginLeft: 12,
  },
  selectedOptionText: {
    fontWeight: "600",
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
    borderWidth: 2,
    borderColor: "#CBD5E1",
    borderRadius: 12,
  },
  selectionCountText: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
    fontWeight: "500",
  },

  // Body Fat Input Styles
  inputContainer: {
    width: "100%",
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  bodyFatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    paddingHorizontal: 20,
    height: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bodyFatInput: {
    flex: 1,
    fontSize: 18,
    color: "#1E293B",
    fontWeight: "500",
  },
  percentSymbol: {
    fontSize: 18,
    color: "#64748B",
    fontWeight: "600",
  },
  bodyFatInfo: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bodyFatInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  bodyFatInfoText: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 6,
    lineHeight: 20,
  },

  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 32,
  },
  loadingIconContainer: {
    marginBottom: 48,
  },
  loadingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0,height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 36,
  },
  loadingStepsContainer: {
    width: "100%",
    alignItems: "center",
  },
  loadingStep: {
    width: "100%",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
  },
  loadingStepContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingStepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#CBD5E1",
  },
  loadingStepText: {
    fontSize: 16,
    marginLeft: 16,
    fontWeight: "500",
  },

  recommendationsContainer: {
    flex: 1,
    backgroundColor: "#0056d2",
  },
  recommendationsHeader: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  successIconContainer: {
    marginBottom: 0,
  },
  recommendationsTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  recommendationsDescription: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    opacity: 0.9,
  },
  recommendationsContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    minHeight: screenDimensions.height * 0.6,
  },
  recommendationsVerticalGrid: {
    width: "100%",
    marginBottom: 32,
  },
  recommendationVerticalCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  recommendationCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginLeft: 12,
  },
  recommendationCardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  recommendationCardUnit: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  startButton: {
    backgroundColor: "#0056d2",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0,height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
})
