"use client"

import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { userService } from "services/apiUserService"
import { profileService } from "services/apiProfileService"
import { SafeAreaView } from "react-native-safe-area-context"

const screenDimensions = Dimensions.get("window")
const GENDER_OPTIONS = ["Male", "Female", "Other"]

export default function ProfileSteps({
  currentStep = 0,
  formData = {},
  handleChange = () => {},
  handleToggle = () => {},
  handleSelect = () => {},
  setShowDatePicker = () => {},
  setShowGenderOptions = () => {},
  formatDate = (date) => date?.toDateString() || "",
  calculateAge = () => 0,
  errors = {},
  navigation,
  onComplete = () => {},
}) {
  const [isLoading, setIsLoading] = useState(false)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [calculatedBMI, setCalculatedBMI] = useState(null)
  const [calorieGoal, setCalorieGoal] = useState(null)

  // Calculate BMI when height and weight change
  useEffect(() => {
    if (formData?.height && formData?.weight) {
      const heightInM = Number.parseFloat(formData.height) / 100
      const weightInKg = Number.parseFloat(formData.weight)
      if (heightInM > 0 && weightInKg > 0) {
        const bmi = (weightInKg / (heightInM * heightInM)).toFixed(1)
        setCalculatedBMI(Number.parseFloat(bmi))
      }
    }
  }, [formData?.height, formData?.weight])

  const calculateCalorieGoal = () => {
    if (!formData?.height || !formData?.weight || !formData?.birthDate || !formData?.gender) {
      return 1500
    }

    const age = calculateAge(formData?.birthDate || "")
    const heightInCm = Number.parseFloat(formData?.height || "")
    const weightInKg = Number.parseFloat(formData?.weight || "")
    const isMale = formData?.gender === "Male"

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

  const handleCompleteProfile = async () => {
    setIsLoading(true)
    try {
      const userData = await AsyncStorage.getItem("userData")
      const user = userData ? JSON.parse(userData) : null

      if (!user || !user.id) {
        throw new Error("User data not found")
      }

      const calorie = calculateCalorieGoal()
      setCalorieGoal(calorie)

      const profileData = {
        userId: user.id,
        height: Number.parseFloat(formData?.height || ""),
        weight: Number.parseFloat(formData?.weight || ""),
        bmi: calculatedBMI,
        bodyFatPercentage: Number.parseFloat(formData?.bodyFatPercentage || "") || null,
        activityLevel: formData?.activityLevel || "",
        dietaryPreference: formData?.dietaryPreference || "",
        fitnessGoal: formData?.fitnessGoal || "",
        goals: formData?.goals || "",
        birthDate: formData?.birthDate.toISOString(),
        gender: formData?.gender || "",
        calorieGoal: calorie,
      }

      const userUpdateData = {
        birthDate: formData?.birthDate.toISOString(),
      }

      await Promise.all([userService.updateUser(user.id, userUpdateData), profileService.registerProfile(profileData)])

      await AsyncStorage.removeItem("profileFormData")
      await AsyncStorage.removeItem("profileCurrentStep")

      showSuccessMessage("Profile created successfully!")

      setTimeout(() => {
        setIsLoading(false)
        setShowRecommendations(true)
      }, 3000)
    } catch (error) {
      setIsLoading(false)
      console.error("Profile creation error:", error)
      showErrorFetchAPI(error?.message || "Failed to create profile. Please try again.")
    }
  }

  const handleStartApp = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData")
      const user = userData ? JSON.parse(userData) : null

      if (user) {
        user.hasProfile = true
        await AsyncStorage.setItem("userData", JSON.stringify(user))
      }
    } catch (error) {
      console.error("Error updating user data:", error)
    }

    await AsyncStorage.removeItem("profileFormData")
    await AsyncStorage.removeItem("profileCurrentStep")
    navigation.replace("HomeScreen")
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (showRecommendations) {
    return <RecommendationsScreen calorieGoal={calorieGoal} onStart={handleStartApp} formData={formData} />
  }

  const [step, setStep] = useState(currentStep)
  useEffect(() => { setStep(currentStep) }, [currentStep])
  const goNext = () => setStep((prev) => prev + 1)
  const goPrev = () => setStep((prev) => Math.max(0, prev - 1))

  const renderStep = () => {
    switch (step) {
      case 0:
        return <AgeStep formData={formData} handleChange={(k, v) => { handleChange(k, v); goNext(); }} error={errors.age} />
      case 1:
        return (
          <HeightStep
            formData={formData}
            handleChange={(k, v) => { handleChange(k, v); }}
            handleSelect={(k, v) => { handleSelect(k, v); }}
            error={errors.height}
            onContinue={goNext}
          />
        )
      case 2:
        return (
          <WeightStep
            formData={formData}
            handleChange={(k, v) => { handleChange(k, v); }}
            handleSelect={(k, v) => { handleSelect(k, v); }}
            error={errors.weight}
            onContinue={goNext}
          />
        )
      case 3:
        return (
          <GenderStep
            formData={formData}
            handleSelect={(gender) => { handleSelect("gender", gender); goNext(); }}
            error={errors.gender}
          />
        )
      case 4:
        return (
          <ActivityLevelStep
            formData={formData}
            handleSelect={(level) => { handleSelect("activityLevel", level); goNext(); }}
            error={errors.activityLevel}
          />
        )
      case 5:
        return (
          <GoalsStep formData={formData} handleToggle={(goal) => { handleToggle(goal); }} error={errors.goals} onContinue={goNext} />
        )
      case 6:
        return (
          <DietaryPreferenceStep
            formData={formData}
            handleSelect={(preference) => { handleSelect("dietaryPreference", preference); goNext(); }}
            error={errors.dietaryPreference}
          />
        )
      case 7:
        return (
          <FitnessGoalStep
            formData={formData}
            handleSelect={(goal) => { handleSelect("fitnessGoal", goal); goNext(); }}
            error={errors.fitnessGoal}
          />
        )
      case 8:
        return <BodyFatStep formData={formData} handleChange={(k, v) => { handleChange(k, v); goNext(); }} error={errors.bodyFatPercentage} />
      case 9:
        return (
          <WeightStep
            formData={formData}
            handleChange={(k, v) => { handleChange(k, v); }}
            handleSelect={(k, v) => { handleSelect(k, v); }}
            error={errors.weight}
            calculatedBMI={calculatedBMI}
            onComplete={handleCompleteProfile}
          />
        )
      default:
        return null
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

// Step 1: Activity Level with Card Design
const ActivityLevelStep = ({ formData, handleSelect, error }) => {
  const activityLevels = [
    {
      value: "Sedentary",
      description: "desk or remote job, activities of daily living only",
      icon: "bed-outline",
      emoji: "🛏️",
    },
    {
      value: "Lightly Active",
      description: "light exercise 1-3 days/week",
      icon: "walk-outline",
      emoji: "🚶",
    },
    {
      value: "Moderately Active",
      description: "moderate exercise 3-5 days/week",
      icon: "bicycle-outline",
      emoji: "🚴",
    },
    {
      value: "Very Active",
      description: "hard exercise 6-7 days/week",
      icon: "fitness-outline",
      emoji: "🏃",
    },
    {
      value: "Extremely Active",
      description: "very hard exercise, physical job",
      icon: "barbell-outline",
      emoji: "🏋️",
    },
  ]

  const [selectedIndex, setSelectedIndex] = useState(0)
  // Sound effect for slider
  const playSliderSound = () => {
    try {
      const audio = new window.Audio(require("assets/sounds/snap1.wav"))
      audio.play()
    } catch (e) {}
  }

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "20%" }]} />
      </View>

      <Text style={styles.stepTitle}>How active are you?</Text>
      <Text style={styles.stepDescription}>
        We'd like to create your personalized plan with your activity level in mind
      </Text>

      <View style={styles.activityCardContainer}>
        <View style={styles.activityCard}>
          <View style={styles.activityIconContainer}>
            <Text style={styles.activityEmoji}>{activityLevels[selectedIndex].emoji}</Text>
          </View>
          <Text style={styles.activityTitle}>{activityLevels[selectedIndex].value}</Text>
          <Text style={styles.activityDescription}>{activityLevels[selectedIndex].description}</Text>
        </View>
      </View>

      <View style={styles.sliderContainer}>
        <TouchableOpacity style={styles.sliderButton} onPress={() => { setSelectedIndex(Math.max(0, selectedIndex - 1)); playSliderSound(); }}>
          <Text style={styles.sliderButtonText}>−</Text>
        </TouchableOpacity>

        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${((selectedIndex + 1) / activityLevels.length) * 100}%` }]} />
          <View style={[styles.sliderThumb, { left: `${(selectedIndex / (activityLevels.length - 1)) * 90}%` }]} />
        </View>

        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => { setSelectedIndex(Math.min(activityLevels.length - 1, selectedIndex + 1)); playSliderSound(); }}
        >
          <Text style={styles.sliderButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={() => handleSelect(activityLevels[selectedIndex].value)}>
        <Text style={styles.continueButtonText}>CREATE MY PLAN</Text>
      </TouchableOpacity>
    </View>
  )
}

// Step 2: Age Picker
const AgeStep = ({ formData, handleChange, error }) => {
  const [selectedAge, setSelectedAge] = useState(22)
  const ages = Array.from({ length: 80 }, (_, i) => i + 16) // Ages 16-95

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "40%" }]} />
      </View>

      <Text style={styles.stepTitle}>How old are you?</Text>
      <Text style={styles.stepDescription}>
        Your age is important for accurate calculations.{"\n"}This info will remain private
      </Text>

      <View style={styles.pickerContainer}>
        <ScrollView
          style={styles.agePicker}
          showsVerticalScrollIndicator={false}
          snapToInterval={60}
          decelerationRate="fast"
        >
          {ages.map((age) => (
            <TouchableOpacity
              key={age}
              style={[styles.ageItem, selectedAge === age && styles.selectedAgeItem]}
              onPress={() => setSelectedAge(age)}
            >
              <Text style={[styles.ageText, selectedAge === age && styles.selectedAgeText]}>{age}</Text>
              {selectedAge === age && <Text style={styles.yearsText}>years</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={() => handleChange("age", selectedAge.toString())}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  )
}

// Step 3: Gender Selection
const GenderStep = ({ formData, handleSelect, error }) => {
  const [selectedGender, setSelectedGender] = useState("Female")

  const genders = [
    { value: "Female", emoji: "👩", color: "#10B981" },
    { value: "Male", emoji: "👨", color: "#6B7280" },
  ]

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "60%" }]} />
      </View>

      <Text style={styles.stepTitle}>What's your gender?</Text>
      <Text style={styles.stepDescription}>
        To create your personalized plan, we need to take your gender into account.
      </Text>

      <View style={styles.genderContainer}>
        {genders.map((gender) => (
          <TouchableOpacity
            key={gender.value}
            style={[styles.genderOption, selectedGender === gender.value && styles.selectedGenderOption]}
            onPress={() => setSelectedGender(gender.value)}
          >
            <Text style={styles.genderEmoji}>{gender.emoji}</Text>
            <Text style={[styles.genderText, selectedGender === gender.value && styles.selectedGenderText]}>
              {gender.value}
            </Text>
            {selectedGender === gender.value && (
              <Ionicons name="checkmark" size={24} color="#FFFFFF" style={styles.genderCheck} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.continueButton} onPress={() => handleSelect(selectedGender)}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  )
}

// Step 4: Weight Picker
const WeightStep = ({ formData, handleChange, handleSelect, error, calculatedBMI, onComplete }) => {
  const [selectedWeight, setSelectedWeight] = useState(132)
  const [unit, setUnit] = useState("LBS")

  const weights = Array.from({ length: 300 }, (_, i) => i + 80) // 80-380 lbs or equivalent kg

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "80%" }]} />
      </View>

      <Text style={styles.stepTitle}>What's your weight?</Text>
      <Text style={styles.stepDescription}>
        Using your current weight as a starting point helps us create your personalized plan
      </Text>

      <View style={styles.unitToggleContainer}>
        <TouchableOpacity
          style={[styles.unitToggle, unit === "LBS" && styles.activeUnitToggle]}
          onPress={() => setUnit("LBS")}
        >
          <Text style={[styles.unitToggleText, unit === "LBS" && styles.activeUnitToggleText]}>LBS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitToggle, unit === "KG" && styles.activeUnitToggle]}
          onPress={() => setUnit("KG")}
        >
          <Text style={[styles.unitToggleText, unit === "KG" && styles.activeUnitToggleText]}>KG</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pickerContainer}>
        <ScrollView
          style={styles.weightPicker}
          showsVerticalScrollIndicator={false}
          snapToInterval={60}
          decelerationRate="fast"
        >
          {weights.map((weight) => (
            <TouchableOpacity
              key={weight}
              style={[styles.weightItem, selectedWeight === weight && styles.selectedWeightItem]}
              onPress={() => setSelectedWeight(weight)}
            >
              <Text style={[styles.weightText, selectedWeight === weight && styles.selectedWeightText]}>{weight}</Text>
              {selectedWeight === weight && <Text style={styles.unitText}>{unit.toLowerCase()}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => {
          handleChange("weight", selectedWeight.toString())
          handleSelect("weightUnit", unit.toLowerCase())
        }}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  )
}

// Step 5: Height Picker
const HeightStep = ({ formData, handleChange, handleSelect, error }) => {
  const [selectedFeet, setSelectedFeet] = useState(5)
  const [selectedInches, setSelectedInches] = useState(5)
  const [unit, setUnit] = useState("FT")

  const feet = Array.from({ length: 5 }, (_, i) => i + 3) // 3-7 feet
  const inches = Array.from({ length: 12 }, (_, i) => i) // 0-11 inches

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "100%" }]} />
      </View>

      <Text style={styles.stepTitle}>How tall are you?</Text>
      <Text style={styles.stepDescription}>
        This is also needed for calculating your perfect calorie intake and macros
      </Text>

      <View style={styles.unitToggleContainer}>
        <TouchableOpacity
          style={[styles.unitToggle, unit === "FT" && styles.activeUnitToggle]}
          onPress={() => setUnit("FT")}
        >
          <Text style={[styles.unitToggleText, unit === "FT" && styles.activeUnitToggleText]}>FT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitToggle, unit === "CM" && styles.activeUnitToggle]}
          onPress={() => setUnit("CM")}
        >
          <Text style={[styles.unitToggleText, unit === "CM" && styles.activeUnitToggleText]}>CM</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heightPickerContainer}>
        <ScrollView
          style={styles.heightPicker}
          showsVerticalScrollIndicator={false}
          snapToInterval={80}
          decelerationRate="fast"
        >
          {feet.map((foot) => (
            <View key={foot} style={styles.heightRow}>
              <TouchableOpacity
                style={[styles.heightItem, selectedFeet === foot && styles.selectedHeightItem]}
                onPress={() => setSelectedFeet(foot)}
              >
                <Text style={[styles.heightText, selectedFeet === foot && styles.selectedHeightText]}>{foot}'</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heightItem, selectedFeet === foot && styles.selectedHeightItem]}
                onPress={() => setSelectedInches(selectedInches)}
              >
                <Text style={[styles.heightText, selectedFeet === foot && styles.selectedHeightText]}>
                  {selectedInches}''
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => {
          const totalInches = selectedFeet * 12 + selectedInches
          const cm = Math.round(totalInches * 2.54)
          handleChange("height", cm.toString())
          handleSelect("heightUnit", unit.toLowerCase())
        }}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  )
}

// Keep other existing steps (Goals, Dietary, Fitness, BodyFat) with minimal changes
const GoalsStep = ({ formData, handleToggle, error }) => {
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
  const selectedGoals = formData?.goals || []

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Health Goals</Text>
      <Text style={styles.stepDescription}>Select up to three goals that are most important to you.</Text>
      <View style={styles.optionsContainer}>
        {goalsOptions.map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[styles.optionButton, selectedGoals.includes(goal) ? styles.selectedOptionButton : {}]}
            onPress={() => handleToggle(goal)}
          >
            <Text style={[styles.optionText, selectedGoals.includes(goal) ? styles.selectedOptionText : {}]}>
              {goal}
            </Text>
            <View style={selectedGoals.includes(goal) ? styles.checkedBox : styles.uncheckedBox}>
              {selectedGoals.includes(goal) && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.selectionCountText}>{selectedGoals.length}/3 goals selected</Text>
    </View>
  )
}

const DietaryPreferenceStep = ({ formData, handleSelect, error }) => {
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
      <View style={styles.dietaryPreferencesContainer}>
        {dietaryPreferences.map((preference) => {
          const selected = formData?.dietaryPreference === preference
          return (
            <TouchableOpacity
              key={preference}
              style={[
                styles.dietaryPreferenceButton,
                selected ? { borderColor: "#10B981", borderWidth: 1, backgroundColor: "#EEF2FF" } : {},
              ]}
              onPress={() => handleSelect(preference)}
            >
              <Text style={[styles.dietaryPreferenceText, selected ? { color: "#10B981", fontWeight: "600" } : {}]}>
                {preference}
              </Text>
              {selected && <Ionicons name="checkmark-circle" size={16} color="#10B981" />}
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const FitnessGoalStep = ({ formData, handleSelect, error }) => {
  const fitnessGoals = [
    { value: "Weight Loss", icon: "trending-down-outline" },
    { value: "Maintain", icon: "swap-horizontal-outline" },
    { value: "Muscle Gain", icon: "trending-up-outline" },
    { value: "Improve Endurance", icon: "pulse-outline" },
    { value: "Increase Strength", icon: "barbell-outline" },
    { value: "Improve Flexibility", icon: "body-outline" },
  ]

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Fitness Goal</Text>
      <Text style={styles.stepDescription}>What is your primary fitness goal?</Text>
      <View style={styles.fitnessGoalsGrid}>
        {fitnessGoals.map((goal) => {
          const selected = formData?.fitnessGoal === goal.value
          return (
            <TouchableOpacity
              key={goal.value}
              style={[styles.fitnessGoalCard, selected ? { borderColor: "#10B981", backgroundColor: "#10B981" } : {}]}
              onPress={() => handleSelect(goal.value)}
            >
              <View
                style={[
                  styles.fitnessGoalIconContainer,
                  selected ? { backgroundColor: "#10B981", borderColor: "#fff", borderWidth: 2 } : {},
                ]}
              >
                <Ionicons name={goal.icon} size={24} color={selected ? "#fff" : "#4F46E5"} />
              </View>
              <Text style={[styles.fitnessGoalText, selected ? { color: "#fff", fontWeight: "600" } : {}]}>
                {goal.value}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

const BodyFatStep = ({ formData, handleChange, error }) => {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Body Fat Percentage</Text>
      <Text style={styles.stepDescription}>
        Enter your body fat percentage to help us personalize your fitness recommendations.
      </Text>
      {/* Add body fat input implementation */}
    </View>
  )
}

// Loading and Recommendations screens remain the same
const LoadingScreen = () => {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>Preparing your customized plan</Text>
    </View>
  )
}

const RecommendationsScreen = ({ calorieGoal, onStart, formData }) => {
  return (
    <View style={styles.recommendationsContainer}>
      <Text style={styles.recommendationsTitle}>Here you go!</Text>
      <TouchableOpacity style={styles.startButton} onPress={onStart}>
        <Text style={styles.startButtonText}>LET'S STAY IN SHAPE!</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  progressBar: {
    width: "100%",
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginBottom: 40,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  // Activity Level Styles
  activityCardContainer: {
    width: "100%",
    marginBottom: 40,
  },
  activityCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
    minHeight: 200,
  },
  activityIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  activityEmoji: {
    fontSize: 40,
  },
  activityTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  activityDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 40,
  },
  sliderButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  sliderButtonText: {
    fontSize: 24,
    color: "#6B7280",
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 20,
    borderRadius: 2,
    position: "relative",
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#10B981",
  },
  // Age Picker Styles
  pickerContainer: {
    height: 300,
    width: "100%",
    marginBottom: 40,
  },
  agePicker: {
    flex: 1,
  },
  ageItem: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedAgeItem: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
  },
  ageText: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  selectedAgeText: {
    fontSize: 32,
    color: "#10B981",
    fontWeight: "600",
  },
  yearsText: {
    fontSize: 16,
    color: "#10B981",
    marginTop: 4,
  },
  // Gender Styles
  genderContainer: {
    width: "100%",
    marginBottom: 40,
  },
  genderOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectedGenderOption: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  genderEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  genderText: {
    fontSize: 18,
    color: "#1F2937",
    flex: 1,
  },
  selectedGenderText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  genderCheck: {
    marginLeft: "auto",
  },
  // Unit Toggle Styles
  unitToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 25,
    padding: 4,
    marginBottom: 40,
  },
  unitToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: "center",
  },
  activeUnitToggle: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  unitToggleText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  activeUnitToggleText: {
    color: "#1F2937",
  },
  // Weight/Height Picker Styles
  weightPicker: {
    flex: 1,
  },
  weightItem: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedWeightItem: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
  },
  weightText: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  selectedWeightText: {
    fontSize: 32,
    color: "#10B981",
    fontWeight: "600",
  },
  unitText: {
    fontSize: 16,
    color: "#10B981",
    marginTop: 4,
  },
  // Height Picker Styles
  heightPickerContainer: {
    height: 300,
    width: "100%",
    marginBottom: 40,
  },
  heightPicker: {
    flex: 1,
  },
  heightRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  heightItem: {
    width: 80,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  selectedHeightItem: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
  },
  heightText: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  selectedHeightText: {
    fontSize: 32,
    color: "#10B981",
    fontWeight: "600",
  },
  // Continue Button
  continueButton: {
    backgroundColor: "#10B981",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  // Other existing styles for goals, dietary, fitness goal steps
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
    borderColor: "#10B981",
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
    color: "#0F172A",
  },
  selectedOptionText: {
    fontWeight: "600",
    color: "#10B981",
  },
  checkedBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#10B981",
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
    fontSize: 14,
    color: "#64748B",
    marginTop: 8,
  },
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
  dietaryPreferenceText: {
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
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
  fitnessGoalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  fitnessGoalText: {
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  recommendationsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#10B981",
    padding: 20,
  },
  recommendationsTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  startButtonText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
})
