"use client"

import { useState, useEffect, useRef } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Dimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import CustomRuler from "components/register/CustomRuler"
import { userService } from "services/apiUserService"
import { profileService } from "services/apiProfileService"

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
      const heightInM = Number.parseFloat(formData.height) / 100 // Convert cm to meters
      const weightInKg = Number.parseFloat(formData.weight)
      if (heightInM > 0 && weightInKg > 0) {
        const bmi = (weightInKg / (heightInM * heightInM)).toFixed(1)
        setCalculatedBMI(Number.parseFloat(bmi))
      }
    }
  }, [formData?.height, formData?.weight])

  // Calculate calorie goal based on user data
  const calculateCalorieGoal = () => {
    if (!formData?.height || !formData?.weight || !formData?.birthDate || !formData?.gender) {
      return 1500 // Default value
    }

    const age = calculateAge(formData?.birthDate || "")
    const heightInCm = Number.parseFloat(formData?.height || "")
    const weightInKg = Number.parseFloat(formData?.weight || "")
    const isMale = formData?.gender === "Male"

    // Harris-Benedict Equation
    let bmr
    if (isMale) {
      bmr = 88.362 + 13.397 * weightInKg + 4.799 * heightInCm - 5.677 * age
    } else {
      bmr = 447.593 + 9.247 * weightInKg + 3.098 * heightInCm - 4.33 * age
    }

    // Activity level multiplier
    const activityMultipliers = {
      Sedentary: 1.2,
      "Lightly Active": 1.375,
      "Moderately Active": 1.55,
      "Very Active": 1.725,
      "Extremely Active": 1.9,
    }

    const multiplier = activityMultipliers[formData?.activityLevel || ""] || 1.2
    let tdee = bmr * multiplier

    // Adjust based on fitness goal
    if (formData?.fitnessGoal === "Weight Loss") {
      tdee -= 500 // 500 calorie deficit
    } else if (formData?.fitnessGoal === "Muscle Gain") {
      tdee += 300 // 300 calorie surplus
    }

    return Math.round(tdee)
  }

  const handleCompleteProfile = async () => {
    setIsLoading(true)

    try {
      // Get user data from AsyncStorage
      const userData = await AsyncStorage.getItem("userData")
      const user = userData ? JSON.parse(userData) : null

      if (!user || !user.id) {
        throw new Error("User data not found")
      }

      const calorie = calculateCalorieGoal()
      setCalorieGoal(calorie)

      // Prepare profile data
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

      // Update user birth date
      const userUpdateData = {
        birthDate: formData?.birthDate.toISOString(),
      }

      // Call APIs
      await Promise.all([userService.updateUser(user.id, userUpdateData), profileService.registerProfile(profileData)])

      // Clear form data from storage
      await AsyncStorage.removeItem("profileFormData")
      await AsyncStorage.removeItem("profileCurrentStep")

      showSuccessMessage("Profile created successfully!")

      // Show loading screen first
      setTimeout(() => {
        setIsLoading(false)
        setShowRecommendations(true)
      }, 3000) // Show loading for 3 seconds
    } catch (error) {
      setIsLoading(false)
      console.error("Profile creation error:", error)
      showErrorFetchAPI(error?.message || "Failed to create profile. Please try again.")
    }
  }

  const handleStartApp = async () => {
    // Update user data to indicate profile is complete
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

    // Navigate to HomeScreen
    navigation.replace("HomeScreen")
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (showRecommendations) {
    return <RecommendationsScreen calorieGoal={calorieGoal} onStart={handleStartApp} formData={formData} />
  }

  switch (currentStep) {
    case 0:
      return <NameStep formData={formData} handleChange={handleChange} error={errors.firstName} />
    case 1:
      return <GoalsStep formData={formData} handleToggle={(goal) => handleToggle("goals", goal)} error={errors.goals} />
    case 2:
      return <BodyFatStep formData={formData} handleChange={handleChange} error={errors.bodyFatPercentage} />
    case 3:
      return (
        <ActivityLevelStep
          formData={formData}
          handleSelect={(level) => handleSelect("activityLevel", level)}
          error={errors.activityLevel}
        />
      )
    case 4:
      return (
        <DietaryPreferenceStep
          formData={formData}
          handleSelect={(preference) => handleSelect("dietaryPreference", preference)}
          error={errors.dietaryPreference}
        />
      )
    case 5:
      return (
        <FitnessGoalStep
          formData={formData}
          handleSelect={(goal) => handleSelect("fitnessGoal", goal)}
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
          errors={{ birthDate: errors.birthDate, gender: errors.gender }}
        />
      )
    case 10:
      return (
        <HeightStep formData={formData} handleChange={handleChange} handleSelect={handleSelect} error={errors.height} />
      )
    case 11:
      return (
        <WeightStep
          formData={formData}
          handleChange={handleChange}
          handleSelect={handleSelect}
          error={errors.weight}
          calculatedBMI={calculatedBMI}
          onComplete={handleCompleteProfile}
        />
      )
    default:
      return null
  }
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
          value={formData?.firstName || ""}
          onChangeText={(value) => {
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

// Step 2: Goals Selection
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
      <Text style={styles.stepDescription}>
        Hello {formData?.firstName || "there"}! Select up to three goals that are most important to you.
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
            style={[styles.optionButton, selectedGoals.includes(goal) ? styles.selectedOptionButton : {}]}
            onPress={() => handleToggle(goal)}
            accessibilityLabel={`${goal} option`}
            accessibilityState={{ selected: selectedGoals.includes(goal) }}
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

// Step 3: Body Fat Percentage
const BodyFatStep = ({ formData, handleChange, error }) => {
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
            style={[styles.unitInput, error ? styles.inputError : null]}
            value={formData?.bodyFatPercentage || ""}
            onChangeText={(value) => handleChange("bodyFatPercentage", value.replace(/[^0-9.]/g, ""))}
            placeholder="Enter your body fat percentage"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
            maxLength={5}
            accessibilityLabel="Body fat percentage input"
          />
          <View style={styles.unitToggle}>
            <View style={[styles.unitButton, { borderColor: "#0056d2" }, styles.unitButtonSelected]}>
              <Text style={[styles.unitButtonText, styles.unitButtonTextSelected]}>%</Text>
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
const ActivityLevelStep = ({ formData, handleSelect, error }) => {
  const activityLevels = [
    { value: "Sedentary", description: "Little or no exercise, desk job" },
    { value: "Lightly Active", description: "Light exercise 1-3 days/week" },
    { value: "Moderately Active", description: "Moderate exercise 3-5 days/week" },
    { value: "Very Active", description: "Hard exercise 6-7 days/week" },
    { value: "Extremely Active", description: "Very hard exercise, physical job or training twice a day" },
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
            style={[styles.optionButton, formData?.activityLevel === level.value ? styles.selectedOptionButton : {}]}
            onPress={() => handleSelect(level.value)}
            accessibilityLabel={`${level.value} option`}
            accessibilityState={{ selected: formData?.activityLevel === level.value }}
          >
            <View style={styles.activityLevelContent}>
              <Text
                style={[styles.optionText, formData?.activityLevel === level.value ? styles.selectedOptionText : {}]}
              >
                {level.value}
              </Text>
              <Text style={styles.activityLevelDescription}>{level.description}</Text>
            </View>
            <View style={formData?.activityLevel === level.value ? styles.checkedBox : styles.uncheckedBox}>
              {formData?.activityLevel === level.value && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
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
      {error ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
        </Text>
      ) : null}

      <View style={styles.dietaryPreferencesContainer}>
        {dietaryPreferences.map((preference) => {
          const selected = formData?.dietaryPreference === preference
          return (
            <TouchableOpacity
              key={preference}
              style={[
                styles.dietaryPreferenceButton,
                selected ? { borderColor: "#0056d2", borderWidth: 1, backgroundColor: "#EEF2FF" } : {},
              ]}
              onPress={() => handleSelect(preference)}
              accessibilityLabel={`${preference} option`}
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.dietaryPreferenceText,
                  selected ? { color: "#0056d2", fontFamily: "Inter_600SemiBold" } : {},
                ]}
              >
                {preference}
              </Text>
              {selected && (
                <Ionicons name="checkmark-circle" size={16} color="#0056d2" style={styles.dietaryPreferenceIcon} />
              )}
            </TouchableOpacity>
          )
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
      {error ? (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" /> {error}
        </Text>
      ) : null}

      <View style={styles.fitnessGoalsGrid}>
        {fitnessGoals.map((goal) => {
          const selected = formData?.fitnessGoal === goal.value
          return (
            <TouchableOpacity
              key={goal.value}
              style={[styles.fitnessGoalCard, selected ? { borderColor: "#0056d2", backgroundColor: "#0056d2" } : {}]}
              onPress={() => handleSelect(goal.value)}
              accessibilityLabel={`${goal.value} option`}
              accessibilityState={{ selected }}
            >
              <View
                style={[
                  styles.fitnessGoalIconContainer,
                  selected ? { backgroundColor: "#0056d2", borderColor: "#fff", borderWidth: 2 } : {},
                ]}
              >
                <Ionicons name={goal.icon} size={24} color={selected ? "#fff" : "#4F46E5"} />
              </View>
              <Text
                style={[styles.fitnessGoalText, selected ? { color: "#fff", fontFamily: "Inter_600SemiBold" } : {}]}
              >
                {goal.value}
              </Text>
            </TouchableOpacity>
          )
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
        We understand, {formData?.firstName || "there"}. A busy lifestyle can get in the way of achieving your health
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
        Great choices, {formData?.firstName || "there"}! Your selections will help us create a personalized health plan.
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
          <Text style={[styles.statNumber, { color: "#0056d2" }]}>87%</Text>
          <Text style={styles.statLabel}>of users report improved habits within 30 days</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: "#0056d2" }]}>92%</Text>
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

// Step 10: Personal Information
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
            formData?.birthDate ? styles.filledSelect : {},
            errors.birthDate ? styles.inputError : null,
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.selectContent}>
            <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <Text style={[styles.selectText, !formData?.birthDate && styles.placeholderText]}>
              {formData?.birthDate
                ? `${formatDate(formData?.birthDate)} (Age: ${calculateAge(formData?.birthDate)})`
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
            formData?.gender ? styles.filledSelect : {},
            errors.gender ? styles.inputError : null,
          ]}
          onPress={() => setShowGenderOptions(true)}
        >
          <View style={styles.selectContent}>
            <Ionicons name="person-circle-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <Text style={[styles.selectText, !formData?.gender && styles.placeholderText]}>
              {formData?.gender || "Select gender"}
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

// Step 11: Height Step with Custom Ruler
const HeightStep = ({ formData, handleChange, handleSelect, error }) => {
  const minHeight = 140
  const maxHeight = 220
  const initialHeight =
    formData?.height && !isNaN(Number(formData?.height)) ? Math.round(Number(formData?.height)) : 170
  const [heightValue, setHeightValue] = useState(initialHeight)
  const [heightUnit, setHeightUnit] = useState(formData?.heightUnit || "cm")

  useEffect(() => {
    if (formData?.height && !isNaN(Number(formData?.height))) {
      const parsed = Math.round(Number(formData?.height))
      if (parsed !== heightValue) setHeightValue(parsed)
    }
  }, [formData?.height])

  useEffect(() => {
    if (formData?.heightUnit && formData?.heightUnit !== heightUnit) {
      setHeightUnit(formData?.heightUnit)
    }
  }, [formData?.heightUnit])

  let displayText = `${heightValue} cm`
  if (heightUnit === "ft") {
    const totalInches = heightValue / 2.54
    const ft = Math.floor(totalInches / 12)
    const inch = Math.round(totalInches % 12)
    displayText = `${ft} ft ${inch} in`
  }

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Height</Text>
      <Text style={styles.stepDescription}>
        What's your height? This helps us calculate your BMI and personalize your fitness plan.
      </Text>

      <View style={styles.unitSelectorContainer}>
        <TouchableOpacity
          style={[
            styles.unitSelectorButton,
            heightUnit === "cm" ? styles.unitSelectorActive : styles.unitSelectorInactive,
          ]}
          onPress={() => {
            setHeightUnit("cm")
            handleSelect("heightUnit", "cm")
          }}
        >
          <Text style={heightUnit === "cm" ? styles.unitSelectorTextActive : styles.unitSelectorTextInactive}>cm</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.unitSelectorButton,
            heightUnit === "ft" ? styles.unitSelectorActive : styles.unitSelectorInactive,
          ]}
          onPress={() => {
            setHeightUnit("ft")
            handleSelect("heightUnit", "ft")
          }}
        >
          <Text style={heightUnit === "ft" ? styles.unitSelectorTextActive : styles.unitSelectorTextInactive}>
            ft/in
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ width: "100%", alignItems: "center", marginVertical: 24 }}>
        <CustomRuler
          min={minHeight}
          max={maxHeight}
          value={heightValue}
          onValueChange={(val) => {
            setHeightValue(val)
            handleChange("height", val.toString())
          }}
          unit={heightUnit}
          unitOptions={["cm", "ft"]}
          onUnitChange={(unit) => {
            setHeightUnit(unit)
            handleSelect("heightUnit", unit)
          }}
          majorStep={10}
          minorStep={1}
          indicatorColor="#10B981"
          indicatorWidth={2}
          indicatorHeight={80}
          style={{ marginBottom: 8 }}
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
  )
}

// Step 12: Weight Step with Custom Ruler
const WeightStep = ({ formData, handleChange, handleSelect, error, calculatedBMI, onComplete }) => {
  const initialWeight = formData?.weight && !isNaN(Number(formData?.weight)) ? Math.round(Number(formData?.weight)) : 70
  const [weightValue, setWeightValue] = useState(initialWeight)
  const [weightUnit, setWeightUnit] = useState(formData?.weightUnit || "kg")

  useEffect(() => {
    if (formData?.weight && !isNaN(Number(formData?.weight))) {
      const parsed = Math.round(Number(formData?.weight))
      if (parsed !== weightValue) setWeightValue(parsed)
    }
  }, [formData?.weight])

  useEffect(() => {
    if (formData?.weightUnit && formData?.weightUnit !== weightUnit) {
      setWeightUnit(formData?.weightUnit)
    }
  }, [formData?.weightUnit])

  let displayText = `${weightValue} kg`
  if (weightUnit === "lb") {
    const lb = Math.round(weightValue * 2.20462)
    displayText = `${lb} lb`
  }

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: "Underweight", color: "#3B82F6" }
    if (bmi < 25) return { category: "Normal", color: "#10B981" }
    if (bmi < 30) return { category: "Overweight", color: "#F59E0B" }
    return { category: "Obese", color: "#EF4444" }
  }

  const bmiInfo = calculatedBMI ? getBMICategory(calculatedBMI) : null

  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Weight</Text>
      <Text style={styles.stepDescription}>
        What's your current weight? This helps us calculate your BMI and create personalized recommendations.
      </Text>

      <View style={styles.unitSelectorContainer}>
        <TouchableOpacity
          style={[
            styles.unitSelectorButton,
            weightUnit === "kg" ? styles.unitSelectorActive : styles.unitSelectorInactive,
          ]}
          onPress={() => {
            setWeightUnit("kg")
            handleSelect("weightUnit", "kg")
          }}
        >
          <Text style={weightUnit === "kg" ? styles.unitSelectorTextActive : styles.unitSelectorTextInactive}>kg</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.unitSelectorButton,
            weightUnit === "lb" ? styles.unitSelectorActive : styles.unitSelectorInactive,
          ]}
          onPress={() => {
            setWeightUnit("lb")
            handleSelect("weightUnit", "lb")
          }}
        >
          <Text style={weightUnit === "lb" ? styles.unitSelectorTextActive : styles.unitSelectorTextInactive}>lb</Text>
        </TouchableOpacity>
      </View>

      <View style={{ width: "100%", alignItems: "center", marginVertical: 24 }}>
        <CustomRuler
          type="weight"
          value={weightValue}
          onValueChange={(val) => {
            setWeightValue(val)
            handleChange("weight", val.toString())
          }}
          unit={weightUnit}
          unitOptions={["kg", "lb"]}
          onUnitChange={(unit) => {
            setWeightUnit(unit)
            handleSelect("weightUnit", unit)
          }}
          indicatorColor="#10B981"
          indicatorWidth={2}
          indicatorHeight={80}
          style={{ marginBottom: 8 }}
        />
        <Text style={{ fontSize: 32, fontWeight: "bold", color: "#0056d2", marginTop: 8 }}>{displayText}</Text>
      </View>

      {calculatedBMI && bmiInfo && (
        <View style={[styles.bmiContainer, { borderColor: bmiInfo.color }]}>
          <Text style={styles.bmiTitle}>Your BMI</Text>
          <Text style={[styles.bmiValue, { color: bmiInfo.color }]}>{calculatedBMI}</Text>
          <Text style={[styles.bmiCategory, { color: bmiInfo.color }]}>{bmiInfo.category}</Text>
        </View>
      )}

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
  )
}

// Loading Screen Component
const LoadingScreen = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const fadeAnim = useRef(new Animated.Value(1)).current

  const loadingSteps = [
    "Analyzing your profile",
    "Estimating your metabolic age",
    "Selecting suitable recipes",
    "Adapting plan to your schedule",
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < loadingSteps.length - 1) {
          return prev + 1
        }
        return prev
      })
    }, 750)

    return () => clearInterval(interval)
  }, [])

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingIcon}>
        <View style={[styles.leafIcon, { backgroundColor: "#10B981" }]} />
      </View>

      <Text style={styles.loadingTitle}>Preparing your{"\n"}customized plan</Text>

      <View style={styles.loadingStepsContainer}>
        {loadingSteps.map((step, index) => (
          <Animated.View
            key={index}
            style={[
              styles.loadingStep,
              {
                opacity: index <= currentStep ? 1 : 0.3,
                backgroundColor: index <= currentStep ? "#F0F9FF" : "#F8FAFC",
              },
            ]}
          >
            <Text style={[styles.loadingStepText, { color: index <= currentStep ? "#1E293B" : "#94A3B8" }]}>
              {step}
            </Text>
          </Animated.View>
        ))}
      </View>
    </View>
  )
}

// Recommendations Screen Component
const RecommendationsScreen = ({ calorieGoal, onStart, formData }) => {
  const screenHeight = Dimensions.get("window")?.height || 667

  const getCalorieRange = (calorie) => {
    const min = Math.round(calorie * 0.9)
    const max = Math.round(calorie * 1.1)
    return `${min} - ${max}`
  }

  return (
    <View style={styles.recommendationsContainer}>
      {/* Background Image */}
      <View style={styles.recommendationsHeader}>
        <View style={styles.foodImageContainer}>
          {/* Placeholder for food image */}
          <View style={styles.foodImagePlaceholder} />
        </View>

        <View style={styles.leafIconSmall}>
          <View style={[styles.leafIcon, { backgroundColor: "#FFFFFF", width: 40, height: 40 }]} />
        </View>

        <Text style={styles.recommendationsTitle}>Here you go!</Text>
        <Text style={styles.recommendationsDescription}>
          Start your personalized nutrition plan today. It's created with your measurements and needs in mind and is
          tailored to your goal
        </Text>
      </View>

      <View style={styles.recommendationsContent}>
        <Text style={styles.calorieGoalTitle}>My personal calories goal</Text>
        <Text style={styles.calorieGoalDescription}>
          The meal plan is based on your perfect macronutrient ratio and daily calorie goal designed by our
          nutritionists.
        </Text>

        <View style={styles.calorieCircleContainer}>
          <View style={styles.calorieCircle}>
            <Text style={styles.calorieValue}>{getCalorieRange(calorieGoal || 1500)}</Text>
            <Text style={styles.calorieUnit}>kcal</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.startButton} onPress={onStart}>
          <Text style={styles.startButtonText}>LET'S STAY IN SHAPE!</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

// Styles
const styles = StyleSheet.create({
  stepContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  stepTitle: {
    fontFamily: "Inter_700Bold", // Nếu chưa load font Inter thì sẽ dùng fontWeight
    fontWeight: "700",
    fontSize: 24,
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
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
  inputIcon: {
    marginRight: 12,
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
  activityLevelContent: {
    flex: 1,
  },
  activityLevelDescription: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
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
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
  dietaryPreferenceIcon: {
    marginLeft: 6,
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
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
  },
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
  unitSelectorTextActive: {
    color: "#1E293B",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  unitSelectorTextInactive: {
    color: "#94A3B8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  bmiContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    alignItems: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bmiTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#64748B",
    marginBottom: 8,
  },
  bmiValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    marginBottom: 4,
  },
  bmiCategory: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 40,
  },
  loadingIcon: {
    marginBottom: 60,
  },
  leafIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    transform: [{ rotate: "45deg" }],
  },
  loadingTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 60,
    lineHeight: 36,
  },
  loadingStepsContainer: {
    width: "100%",
    alignItems: "center",
  },
  loadingStep: {
    width: "100%",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  loadingStepText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
  },
  // Recommendations Screen Styles
  recommendationsContainer: {
    flex: 1,
    backgroundColor: "#10B981",
  },
  recommendationsHeader: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  foodImageContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 200,
    height: 200,
  },
  foodImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 100,
  },
  leafIconSmall: {
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 36,
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
  },
  recommendationsDescription: {
    fontFamily: "Inter_400Regular",
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
    minHeight: Dimensions.get("window")?.height * 0.6,
  },
  calorieGoalTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 12,
  },
  calorieGoalDescription: {
    fontFamily: "Inter_400Regular",
    fontWeight: "400",
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  calorieCircleContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  calorieCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 8,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  calorieValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    color: "#1E293B",
    textAlign: "center",
  },
  calorieUnit: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#64748B",
    marginTop: 4,
  },
  startButton: {
    backgroundColor: "#10B981",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  startButtonText: {
    fontFamily: "Inter_700Bold",
    fontWeight: "700",
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
})
