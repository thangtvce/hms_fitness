import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { profileService } from "services/apiProfileService";
import { apiUserService } from "services/apiUserService";
import { useContext } from "react";
import { AuthContext } from "context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";

const screenDimensions = Dimensions.get("window");
const GENDER_OPTIONS = ["Male", "Female", "Other"];

export default function ProfileSteps({
  currentStep = 0,
  formData: _formData,
  handleChange: _handleChange,
  handleToggle: _handleToggle,
  handleSelect: _handleSelect,
  setShowDatePicker = () => {},
  setShowGenderOptions = () => {},
  formatDate = (date) => date?.toDateString() || "",
  calculateAge = () => 0,
  errors = {},
  navigation,
  onComplete = () => {},
}) {
  const [formData, setFormData] = useState(_formData || {});
  const [isLoading, setIsLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [calculatedBMI, setCalculatedBMI] = useState(null);
  const [calorieGoal, setCalorieGoal] = useState(null);
  const [step, setStep] = useState(0);
  const { user } = useContext(AuthContext);

  const handleChange = (key, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      console.log("[ProfileSteps] handleChange:", key, value, updated);
      return updated;
    });
  };

  const handleSelect = (key, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      console.log("[ProfileSteps] handleSelect:", key, value, updated);
      return updated;
    });
  };

  const handleToggle = (key, value) => {
    setFormData((prev) => {
      let updated;
      if (Array.isArray(prev[key])) {
        if (prev[key].includes(value)) {
          updated = { ...prev, [key]: prev[key].filter((v) => v !== value) };
        } else {
          updated = { ...prev, [key]: [...prev[key], value] };
        }
      } else {
        updated = { ...prev, [key]: [value] };
      }
      console.log("[ProfileSteps] handleToggle:", key, value, updated);
      return updated;
    });
  };

  useEffect(() => {
    console.log("userId", user?.userId);
    if (formData?.height && formData?.weight) {
      const heightInM = Number.parseFloat(formData.height) / 100;
      const weightInKg = Number.parseFloat(formData.weight);
      if (heightInM > 0 && weightInKg > 0) {
        const bmi = (weightInKg / (heightInM * heightInM)).toFixed(1);
        setCalculatedBMI(Number.parseFloat(bmi));
      }
    }
  }, [formData?.height, formData?.weight]);

  const calculateCalorieGoal = () => {
    if (!formData?.height || !formData?.weight || !formData?.age || !formData?.gender) {
      return 1500;
    }

    const age = Number.parseInt(formData?.age || "25");
    const heightInCm = Number.parseFloat(formData?.height || "");
    const weightInKg = Number.parseFloat(formData?.weight || "");
    const isMale = formData?.gender === "Male";

    let bmr;
    if (isMale) {
      bmr = 88.362 + 13.397 * weightInKg + 4.799 * heightInCm - 5.677 * age;
    } else {
      bmr = 447.593 + 9.247 * weightInKg + 3.098 * heightInCm - 4.33 * age;
    }

    const activityMultipliers = {
      Sedentary: 1.2,
      "Lightly Active": 1.375,
      "Moderately Active": 1.55,
      "Very Active": 1.725,
      "Extremely Active": 1.9,
    };

    const multiplier = activityMultipliers[formData?.activityLevel || ""] || 1.2;
    let tdee = bmr * multiplier;

    if (formData?.fitnessGoal === "Weight Loss") {
      tdee -= 500;
    } else if (formData?.fitnessGoal === "Muscle Gain") {
      tdee += 300;
    }

    return Math.round(tdee);
  };

  const handleCompleteProfile = async () => {
    const requiredFields = [
      "height",
      "weight",
      "age",
      "gender",
      "activityLevel",
      "dietaryPreference",
      "fitnessGoal",
      "goals",
      "bodyFatPercentage",
    ];
    const missingFields = requiredFields.filter((field) => !formData?.[field]);
    console.log("[COMPLETE PROFILE] formData:", formData);
    if (missingFields.length > 0) {
      showErrorFetchAPI(`Please provide all required information: ${missingFields.join(", ")}`);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let userId = user?.userId;
      if (!userId) {
        const userData = await AsyncStorage.getItem("userData");
        const parsedUser = userData ? JSON.parse(userData) : null;
        userId = parsedUser?.id || parsedUser?.userId;
        if (!userId) {
          throw new Error("User ID is unavailable. Please log in again.");
        }
      }

      const userResponse = await apiUserService.getUserById(userId);
      if (!userResponse || !userResponse.id) {
        throw new Error("User data not found.");
      }

      const birthDate = formData?.age
        ? new Date(new Date().getFullYear() - Number(formData?.age), 0, 1).toISOString().slice(0, 10)
        : undefined;
      const userDto = {
        gender: formData?.gender || "",
        birthDate: birthDate,
      };
      console.log("[COMPLETE PROFILE] updateUser payload:", userDto);
      await apiUserService.updateUser(userResponse.id, userDto);

      const calorie = calculateCalorieGoal();
      setCalorieGoal(calorie);

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
      };
      console.log("[COMPLETE PROFILE] profileData payload:", profileData);
      await profileService.registerProfile(profileData);

      await AsyncStorage.removeItem("profileFormData");
      await AsyncStorage.removeItem("profileCurrentStep");

      showSuccessMessage("Profile created successfully!");
      console.log("[COMPLETE PROFILE] API call completed successfully!");

      setTimeout(() => {
        setIsLoading(false);
        setShowRecommendations(true);
      }, 3000);
    } catch (error) {
      setIsLoading(false);
      console.error("Profile creation error:", error);
      showErrorFetchAPI(error?.message || "An unexpected error occurred during profile creation.");
    }
  };

  const handleStartApp = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      const user = userData ? JSON.parse(userData) : null;

      if (user) {
        user.hasProfile = true;
        await AsyncStorage.setItem("userData", JSON.stringify(user));
      }
    } catch (error) {
      console.error("Error updating user data:", error);
    }

    await AsyncStorage.removeItem("profileFormData");
    await AsyncStorage.removeItem("profileCurrentStep");
    navigation.replace("HomeScreen");
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (showRecommendations) {
    return <RecommendationsScreen calorieGoal={calorieGoal} onStart={handleStartApp} formData={formData} />;
  }

  const goNext = () => {
    if (step < 8) {
      setStep(step + 1);
    } else {
      handleCompleteProfile();
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const renderStep = () => {
    console.log("Current step:", step, "Form data:", formData);
    switch (step) {
      case 0:
        return (
          <ActivityLevelStep
            formData={formData}
            handleSelect={(level) => {
              handleSelect("activityLevel", level);
              goNext();
            }}
            error={errors.activityLevel}
          />
        );
      case 1:
        return (
          <AgeStep
            formData={formData}
            handleChange={(k, v) => {
              handleChange(k, v);
              goNext();
            }}
            error={errors.age}
          />
        );
      case 2:
        return (
          <GenderStep
            formData={formData}
            handleSelect={(gender) => {
              handleSelect("gender", gender);
              goNext();
            }}
            error={errors.gender}
          />
        );
      case 3:
        return (
          <WeightStep
            formData={formData}
            handleChange={handleChange}
            handleSelect={handleSelect}
            error={errors.weight}
            onContinue={goNext}
          />
        );
      case 4:
        return (
          <HeightStep
            formData={formData}
            handleChange={handleChange}
            handleSelect={handleSelect}
            error={errors.height}
            onContinue={goNext}
          />
        );
      case 5:
        return (
          <GoalsStep
            formData={formData}
            handleToggle={(goal) => handleToggle("goals", goal)}
            error={errors.goals}
            onContinue={goNext}
          />
        );
      case 6:
        return (
          <DietaryPreferenceStep
            formData={formData}
            handleSelect={(preference) => {
              handleSelect("dietaryPreference", preference);
              goNext();
            }}
            error={errors.dietaryPreference}
          />
        );
      case 7:
        return (
          <FitnessGoalStep
            formData={formData}
            handleSelect={(goal) => {
              handleSelect("fitnessGoal", goal);
              goNext();
            }}
            error={errors.fitnessGoal}
          />
        );
      case 8:
        return (
          <BodyFatStep
            formData={formData}
            handleChange={handleChange}
            error={errors.bodyFatPercentage}
            onComplete={handleCompleteProfile}
          />
        );
      default:
        return null;
    }
  };

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
  );
}

// Activity Level Step
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
  ];

  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "11%" }]} />
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
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => setSelectedIndex(Math.max(0, selectedIndex - 1))}
        >
          <Text style={styles.sliderButtonText}>−</Text>
        </TouchableOpacity>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${((selectedIndex + 1) / activityLevels.length) * 100}%` }]} />
          <View style={[styles.sliderThumb, { left: `${(selectedIndex / (activityLevels.length - 1)) * 90}%` }]} />
        </View>
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => setSelectedIndex(Math.min(activityLevels.length - 1, selectedIndex + 1))}
        >
          <Text style={styles.sliderButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => handleSelect(activityLevels[selectedIndex].value)}
      >
        <Text style={styles.continueButtonText}>CREATE MY PLAN</Text>
      </TouchableOpacity>
    </View>
  );
};

// Age Step
const AgeStep = ({ formData, handleChange, error }) => {
  const [selectedAge, setSelectedAge] = useState(22);
  const ages = Array.from({ length: 80 }, (_, i) => i + 16);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "22%" }]} />
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
  );
};

// Gender Step
const GenderStep = ({ formData, handleSelect, error }) => {
  const [selectedGender, setSelectedGender] = useState("Female");
  const genders = [
    { value: "Female", emoji: "👩", color: "#10B981" },
    { value: "Male", emoji: "👨", color: "#6B7280" },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "33%" }]} />
      </View>
      <Text style={styles.stepTitle}>What's your gender?</Text>
      <Text style={styles.stepDescription}>
        To create your personalized plan, we need to take your gender into account.
      </Text>
      <View style

={styles.genderContainer}>
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
  );
};

// Weight Step
const WeightStep = ({ formData, handleChange, handleSelect, error, onContinue }) => {
  const [selectedWeight, setSelectedWeight] = useState(132);
  const [

unit, setUnit] = useState("LBS");
  const weights = Array.from({ length: 300 }, (_, i) => i + 80);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "44%" }]} />
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
          const weightInKg = unit === "LBS" ? (selectedWeight * 0.453592).toFixed(1) : selectedWeight.toString();
          handleChange("weight", weightInKg);
          handleSelect("weightUnit", unit.toLowerCase());
          onContinue();
        }}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Height Step
const HeightStep = ({ formData, handleChange, handleSelect, error, onContinue }) => {
  const [selectedFeet, setSelectedFeet] = useState(5);
  const [selectedInches, setSelectedInches] = useState(5);
  const [unit, setUnit] = useState("FT");
  const feet = Array.from({ length: 5 }, (_, i) => i + 3);
  const inches = Array.from({ length: 12 }, (_, i) => i);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "55%" }]} />
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
        <View style={styles.heightRow}>
          <View style={styles.heightColumn}>
            <Text style={styles.heightColumnTitle}>Feet</Text>
            <ScrollView style={styles.heightPicker} showsVerticalScrollIndicator={false}>
              {feet.map((foot) => (
                <TouchableOpacity
                  key={foot}
                  style={[styles.heightItem, selectedFeet === foot && styles.selectedHeightItem]}
                  onPress={() => setSelectedFeet(foot)}
                >
                  <Text style={[styles.heightText, selectedFeet === foot && styles.selectedHeightText]}>{foot}'</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={styles.heightColumn}>
            <Text style={styles.heightColumnTitle}>Inches</Text>
            <ScrollView style={styles.heightPicker} showsVerticalScrollIndicator={false}>
              {inches.map((inch) => (
                <TouchableOpacity
                  key={inch}
                  style={[styles.heightItem, selectedInches === inch && styles.selectedHeightItem]}
                  onPress={() => setSelectedInches(inch)}
                >
                  <Text style={[styles.heightText, selectedInches === inch && styles.selectedHeightText]}>
                    {inch}''
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => {
          const totalInches = selectedFeet * 12 + selectedInches;
          const cm = Math.round(totalInches * 2.54);
          handleChange("height", cm.toString());
          handleSelect("heightUnit", unit.toLowerCase());
          onContinue();
        }}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Goals Step
const GoalsStep = ({ formData, handleToggle, error, onContinue }) => {
  const goalsOptions = [
    "Lose weight",
    "Maintain weight",
    "Gain weight",
    "Build muscle",
    "Improve diet",
    "Plan meals",
    "Manage stress",
    "Stay active",
  ];
  const selectedGoals = formData?.goals || [];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "66%" }]} />
      </View>
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
      <TouchableOpacity style={styles.continueButton} onPress={onContinue}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Dietary Preference Step
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
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "77%" }]} />
      </View>
      <Text style={styles.stepTitle}>Dietary Preference</Text>
      <Text style={styles.stepDescription}>
        Select the eating pattern that best describes your dietary preferences.
      </Text>
      <View style={styles.dietaryPreferencesContainer}>
        {dietaryPreferences.map((preference) => {
          const selected = formData?.dietaryPreference === preference;
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
          );
        })}
      </View>
      <TouchableOpacity style={styles.continueButton} onPress={() => handleSelect(formData?.dietaryPreference)}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Fitness Goal Step
const FitnessGoalStep = ({ formData, handleSelect, error }) => {
  const fitnessGoals = [
    { value: "Weight Loss", icon: "trending-down-outline" },
    { value: "Maintain", icon: "swap-horizontal-outline" },
    { value: "Muscle Gain", icon: "trending-up-outline" },
    { value: "Improve Endurance", icon: "pulse-outline" },
    { value: "Increase Strength", icon: "barbell-outline" },
    { value: "Improve Flexibility", icon: "body-outline" },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "88%" }]} />
      </View>
      <Text style={styles.stepTitle}>Fitness Goal</Text>
      <Text style={styles.stepDescription}>What is your primary fitness goal?</Text>
      <View style={styles.fitnessGoalsGrid}>
        {fitnessGoals.map((goal) => {
          const selected = formData?.fitnessGoal === goal.value;
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
          );
        })}
      </View>
      <TouchableOpacity style={styles.continueButton} onPress={() => handleSelect(formData?.fitnessGoal)}>
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Body Fat Step
const BodyFatStep = ({ formData, handleChange, error, onComplete }) => {
  const [bodyFat, setBodyFat] = useState("15");

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "100%" }]} />
      </View>
      <Text style={styles.stepTitle}>Body Fat Percentage</Text>
      <Text style={styles.stepDescription}>
        Enter your body fat percentage to help us personalize your fitness recommendations.
      </Text>
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Body Fat Percentage</Text>
        <View style={styles.bodyFatInputContainer}>
          <TextInput
            style={styles.bodyFatInput}
            value={bodyFat}
            onChangeText={setBodyFat}
            placeholder="15"
            keyboardType="numeric"
            maxLength={5}
          />
          <Text style={styles.percentSymbol}>%</Text>
        </View>
      </View>
      <View style={styles.bodyFatInfo}>
        <Text style={styles.bodyFatInfoTitle}>Typical Body Fat Ranges:</Text>
        <Text style={styles.bodyFatInfoText}>• Essential: 3-5% (men), 10-13% (women)</Text>
        <Text style={styles.bodyFatInfoText}>• Athletes: 6-13% (men), 14-20% (women)</Text>
        <Text style={styles.bodyFatInfoText}>• Fitness: 14-17% (men), 21-24% (women)</Text>
        <Text style={styles.bodyFatInfoText}>• Average: 18-24% (men), 25-31% (women)</Text>
      </View>
      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => {
          handleChange("bodyFatPercentage", bodyFat);
          onComplete();
        }}
      >
        <Text style={styles.continueButtonText}>COMPLETE PROFILE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Loading Screen
const LoadingScreen = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const loadingSteps = [
    "Analyzing your profile",
    "Estimating your metabolic age",
    "Selecting suitable recipes",
    "Adapting plan to your schedule",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 750);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingIcon}>
        <View style={[styles.leafIcon, { backgroundColor: "#10B981" }]} />
      </View>
      <Text style={styles.loadingTitle}>Preparing your{"\n"}customized plan</Text>
      <View style={styles.loadingStepsContainer}>
        {loadingSteps.map((step, index) => (
          <View
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
          </View>
        ))}
      </View>
    </View>
  );
};

// Recommendations Screen
const RecommendationsScreen = ({ calorieGoal, onStart, formData }) => {
  const getCalorieRange = 

(calorie) => {
    const min = Math.round(calorie * 0.9);
    const max = Math.round(calorie * 1.1);
    return `${min} - ${max}`;
  };

  return (
    <View style={styles.recommendationsContainer}>
      <View style={styles.recommendationsHeader}>
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
  );
};

// Styles (unchanged)
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
  activityCardContainer: {
    width: "100 marginBottom: 40,
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
    частности

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
  heightPickerContainer: {
    height: 300,
    width: "100%",
    marginBottom: 40,
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
    color: "#6B7280",
    marginBottom: 10,
  },
  heightPicker: {
    flex: 1,
    width: "100%",
  },
  heightItem: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
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
  inputContainer: {
    width: "100%",
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  bodyFatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    height: 56,
  },
  bodyFatInput: {
    flex: 1,
    fontSize: 18,
    color: "#1F2937",
  },
  percentSymbol: {
    fontSize: 18,
    color: "#6B7280",
    fontWeight: "600",
  },
  bodyFatInfo: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    width: "100%",
  },
  bodyFatInfoTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  bodyFatInfoText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
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
    marginBottom: 20,
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
    fontSize: 28,
    fontWeight: "700",
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
    fontSize: 16,
    textAlign: "center",
  },
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
  recommendationsTitle: {
    fontSize: 36,
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
    minHeight: Dimensions.get("window")?.height * 0.6,
  },
  calorieGoalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 12,
  },
  calorieGoalDescription: {
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
  },
  calorieValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  calorieUnit: {
    fontSize: 16,
    fontWeight: "600",
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
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },
});