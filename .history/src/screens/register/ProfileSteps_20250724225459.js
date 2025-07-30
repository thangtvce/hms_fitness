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
  const [step, setStep] = useState(currentStep || 0);
  const [validationErrors, setValidationErrors] = useState({});
  const { user } = useContext(AuthContext);

  // Persist formData and step to AsyncStorage whenever they change
  const persistProfileState = async (nextFormData, nextStep) => {
    try {
      await AsyncStorage.setItem("profileFormData", JSON.stringify(nextFormData));
      await AsyncStorage.setItem("profileCurrentStep", String(nextStep));
    } catch (e) {
      console.warn("[ProfileSteps] Failed to persist state", e);
    }
  };

  const handleChange = (key, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      persistProfileState(updated, step);
      console.log("[ProfileSteps] handleChange:", key, value, updated);
      return updated;
    });
    // Clear validation error when user starts typing
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleSelect = (key, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      persistProfileState(updated, step);
      console.log("[ProfileSteps] handleSelect:", key, value, updated);
      return updated;
    });
    // Clear validation error when user selects
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: null }));
    }
  };

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear validation error immediately if value is valid (not empty string/null/undefined)
    if (validationErrors[key]) {
      if (value !== undefined && value !== null && value !== "") {
        setValidationErrors((prev) => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleSelect = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Clear validation error immediately if value is valid (not empty string/null/undefined)
    if (validationErrors[key]) {
      if (value !== undefined && value !== null && value !== "") {
        setValidationErrors((prev) => {
          const { [key]: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  const handleToggle = (key, value) => {
    setFormData((prev) => {
      let updated;
      if (Array.isArray(prev[key])) {
        if (prev[key].includes(value)) {
          updated = prev[key].filter((v) => v !== value);
        } else {
          updated = [...prev[key], value];
        }
      } else {
        updated = [value];
      }
      return { ...prev, [key]: updated };
    });
    // Clear validation error if at least one value is selected
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    }
  };
    if (validationErrors[key]) {
      setValidationErrors(prev => ({ ...prev, [key]: null }));
    }
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

  const validateStep = (stepNumber) => {
    const errors = {};

    // Helper to check for empty/invalid values (treat empty string as invalid)
    const isEmpty = (val) => val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);

    switch (stepNumber) {
      case 0: // Age
        if (isEmpty(formData.age)) errors.age = "Please select your age.";
        break;
      case 1: // Gender
        if (isEmpty(formData.gender)) errors.gender = "Please select your gender.";
        break;
      case 2: // Height
        if (isEmpty(formData.height)) errors.height = "Please enter your height.";
        break;
      case 3: // Weight
        if (isEmpty(formData.weight)) errors.weight = "Please enter your weight.";
        break;
      case 4: // Activity Level
        if (isEmpty(formData.activityLevel)) errors.activityLevel = "Please select your activity level.";
        break;
      case 5: // Fitness Goal
        if (isEmpty(formData.fitnessGoal)) errors.fitnessGoal = "Please select your fitness goal.";
        break;
      case 6: // Goals
        if (isEmpty(formData.goals)) errors.goals = "Please select at least one health goal.";
        break;
      case 7: // Dietary Preference
        if (isEmpty(formData.dietaryPreference)) errors.dietaryPreference = "Please select your dietary preference.";
        break;
      case 8: // Body Fat Percentage
        if (isEmpty(formData.bodyFatPercentage)) errors.bodyFatPercentage = "Please enter your body fat percentage.";
        break;
      default:
        break;
    }
    return errors;
  };
// Removed duplicate/old validateStep block left after patch

  const handleCompleteProfile = async () => {
    const requiredFields = [
      { key: "height", label: "Height" },
      { key: "weight", label: "Weight" },
      { key: "age", label: "Age" },
      { key: "gender", label: "Gender" },
      { key: "activityLevel", label: "Activity Level" },
      { key: "dietaryPreference", label: "Dietary Preference" },
      { key: "fitnessGoal", label: "Fitness Goal" },
      { key: "goals", label: "Health Goals" },
      { key: "bodyFatPercentage", label: "Body Fat Percentage" },
    ];

    const missingFields = requiredFields.filter((field) => !formData?.[field.key]);
    console.log("[COMPLETE PROFILE] formData:", formData);

    if (missingFields.length > 0) {
      const missingLabels = missingFields.map((f) => f.label).join(", ");
      showErrorFetchAPI(`Please complete all required fields: ${missingLabels}`);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Try to get userId from AuthContext, then AsyncStorage, then fail
      let userId = null;
      let debugUserId = null;
      if (user && (user.id || user.userId)) {
        userId = user.id || user.userId;
        debugUserId = `AuthContext: id=${user.id}, userId=${user.userId}`;
      } else {
        const userData = await AsyncStorage.getItem("userData");
        const parsedUser = userData ? JSON.parse(userData) : null;
        userId = parsedUser?.id || parsedUser?.userId;
        debugUserId = `AsyncStorage: id=${parsedUser?.id}, userId=${parsedUser?.userId}`;
      }

      console.log("[DEBUG] userId resolved:", userId, debugUserId);

      if (!userId) {
        throw new Error("User ID is unavailable. Please log in again.");
      }

      const userResponse = await apiUserService.getUserById(userId);
      console.log("[DEBUG] userResponse:", userResponse);

      const userData = userResponse && userResponse.data ? userResponse.data : null;
      if (!userData || !userData.userId) {
        throw new Error("User data not found.");
      }

      // Get required fields from userData
      const fullName = userData.fullName || userData.FullName || "";
      const email = userData.email || userData.Email || "";
      const phone = userData.phone || userData.Phone || "";

      // Check required fields
      const missingUserFields = [];
      if (!fullName) missingUserFields.push("Full Name");
      if (!email) missingUserFields.push("Email");
      if (!phone) missingUserFields.push("Phone Number");

      if (missingUserFields.length > 0) {
        setIsLoading(false);
        showErrorFetchAPI(`Your account is missing required information: ${missingUserFields.join(", ")}. Please update your profile first.`);
        return;
      }

      const birthDate = formData?.age
        ? new Date(new Date().getFullYear() - Number(formData?.age), 0, 1).toISOString().slice(0, 10)
        : undefined;

      // Ensure gender is in correct format
      let genderValue = formData?.gender || "";
      if (genderValue) {
        if (["Male", "Female", "Other"].includes(genderValue)) {
          // ok
        } else {
          genderValue = "Other";
        }
      }

      // Format birthDate as YYYY-MM-DD string or null
      let birthDateStr = null;
      if (formData.birthDate instanceof Date) {
        birthDateStr = formData.birthDate.toISOString().split('T')[0];
      } else if (typeof formData.birthDate === 'string' && formData.birthDate.length >= 10) {
        birthDateStr = formData.birthDate.slice(0, 10);
      } else if (birthDate) {
        birthDateStr = String(birthDate);
      }

      const userDto = {
        userId: formData.userId || userId,
        fullName: formData.fullName || userData.fullName || userData.FullName || "",
        email: formData.email || userData.email || userData.Email || "",
        phone: formData.phone || userData.phone || userData.Phone || "",
        avatar: formData.avatar || null,
        gender: formData.gender,
        birthDate: birthDateStr,
      };

      console.log("[COMPLETE PROFILE] updateUser payload:", userDto);

      try {
        const response = await apiUserService.updateUser(userDto.userId, userDto);
      } catch (err) {
        setIsLoading(false);
        if (err.response) {
          console.error("Update user error: status=", err.response.status, "data=", err.response.data);
        } else {
          console.error("Update user error:", err);
        }
        if (err.response && err.response.data) {
          const data = err.response.data;
          if (data.message) {
            showErrorFetchAPI("[UpdateUser] " + data.message);
          } else if (Array.isArray(data.errors)) {
            showErrorFetchAPI("[UpdateUser] " + data.errors.join("; "));
          } else if (typeof data.errors === "object" && data.errors !== null) {
            const allErrors = Object.values(data.errors).flat().join("; ");
            showErrorFetchAPI("[UpdateUser] " + allErrors);
          } else {
            showErrorFetchAPI("[UpdateUser] " + JSON.stringify(data));
          }
        } else if (err.message) {
          showErrorFetchAPI("[UpdateUser] " + err.message);
        } else {
          showErrorFetchAPI("[UpdateUser] Unknown error");
        }
        return;
      }

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
      if (error.response && error.response.data && error.response.data.message) {
        showErrorFetchAPI(error.response.data.message);
      } else if (error.message) {
        showErrorFetchAPI(error.message);
      } else {
        showErrorFetchAPI("An unexpected error occurred during profile creation.");
      }
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
    const stepErrors = validateStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setValidationErrors(stepErrors);
      const errorMessage = Object.values(stepErrors)[0];
      showErrorFetchAPI(errorMessage);
      return;
    }

    if (step < 8) {
      setStep((prevStep) => {
        const nextStep = prevStep + 1;
        persistProfileState(formData, nextStep);
        return nextStep;
      });
    } else {
      handleCompleteProfile();
    }
  };

  const goPrev = () => {
    if (step > 0) {
      setStep((prevStep) => {
        const nextStep = prevStep - 1;
        persistProfileState(formData, nextStep);
        return nextStep;
      });
    }
  };

  const renderStep = () => {
    console.log("Current step:", step, "Form data:", formData);
    switch (step) {
      case 0:
        return (
          <AgeStep
            formData={formData}
            handleChange={(k, v) => {
              handleChange(k, v);
            }}
            error={validationErrors.age}
            onContinue={goNext}
          />
        );
      case 1:
        return (
          <GenderStep
            formData={formData}
            handleSelect={(gender) => {
              handleSelect("gender", gender);
            }}
            error={validationErrors.gender}
            onContinue={goNext}
          />
        );
      case 2:
        return (
          <HeightStep
            formData={formData}
            handleChange={handleChange}
            handleSelect={handleSelect}
            error={validationErrors.height}
            onContinue={goNext}
          />
        );
      case 3:
        return (
          <WeightStep
            formData={formData}
            handleChange={handleChange}
            handleSelect={handleSelect}
            error={validationErrors.weight}
            onContinue={goNext}
          />
        );
      case 4:
        return (
          <ActivityLevelStep
            formData={formData}
            handleSelect={(level) => {
              handleSelect("activityLevel", level);
            }}
            error={validationErrors.activityLevel}
            onContinue={goNext}
          />
        );
      case 5:
        return (
          <FitnessGoalStep
            formData={formData}
            handleSelect={(goal) => {
              handleSelect("fitnessGoal", goal);
            }}
            error={validationErrors.fitnessGoal}
            onContinue={goNext}
          />
        );
      case 6:
        return (
          <GoalsStep
            formData={formData}
            handleToggle={(goal) => handleToggle("goals", goal)}
            error={validationErrors.goals}
            onContinue={goNext}
          />
        );
      case 7:
        return (
          <DietaryPreferenceStep
            formData={formData}
            handleSelect={(preference) => {
              handleSelect("dietaryPreference", preference);
            }}
            error={validationErrors.dietaryPreference}
            onContinue={goNext}
          />
        );
      case 8:
        return (
          <BodyFatStep
            formData={formData}
            handleChange={handleChange}
            error={validationErrors.bodyFatPercentage}
            onComplete={handleCompleteProfile}
          />
        );
      default:
        return null;
    }
  };

  // Restore step and formData from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const savedFormData = await AsyncStorage.getItem("profileFormData");
        const savedStep = await AsyncStorage.getItem("profileCurrentStep");
        if (savedFormData) {
          setFormData(JSON.parse(savedFormData));
        }
        if (savedStep && !isNaN(Number(savedStep))) {
          setStep(Number(savedStep));
        }
      } catch (e) {
        console.warn("[ProfileSteps] Failed to restore state", e);
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header with back button */}
        <View style={styles.header}>
          {step > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={goPrev}>
              <Ionicons name="chevron-back" size={24} color="#0056d2" />
            </TouchableOpacity>
          )}
          <Text style={styles.stepCounter}>{step + 1} of 9</Text>
        </View>
        
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        >
          {renderStep()}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
// End of ProfileSteps component

// Age Step
const AgeStep = ({ formData, handleChange, error, onContinue }) => {
  const [selectedAge, setSelectedAge] = useState(formData?.age ? parseInt(formData.age) : 25);
  const ages = Array.from({ length: 85 }, (_, i) => i + 16);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "11%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>How old are you?</Text>
      <Text style={styles.stepDescription}>
        Your age helps us calculate your personalized health metrics and recommendations.
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
              {selectedAge === age && <Text style={styles.yearsText}>years old</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity 
        style={styles.continueButton} 
        onPress={() => {
          handleChange("age", selectedAge.toString());
          onContinue();
        }}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Gender Step
const GenderStep = ({ formData, handleSelect, error, onContinue }) => {
  const [selectedGender, setSelectedGender] = useState(formData?.gender || "");
  const genders = [
    { value: "Male", emoji: "👨", color: "#0056d2" },
    { value: "Female", emoji: "👩", color: "#0056d2" },
    { value: "Other", emoji: "👤", color: "#0056d2" },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "22%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>What's your gender?</Text>
      <Text style={styles.stepDescription}>
        This information helps us provide more accurate health calculations and recommendations.
      </Text>

      <View style={styles.genderContainer}>
        {genders.map((gender) => (
          <TouchableOpacity
            key={gender.value}
            style={[
              styles.genderOption,
              selectedGender === gender.value && styles.selectedGenderOption
            ]}
            onPress={() => setSelectedGender(gender.value)}
          >
            <Text style={styles.genderEmoji}>{gender.emoji}</Text>
            <Text style={[
              styles.genderText,
              selectedGender === gender.value && styles.selectedGenderText
            ]}>
              {gender.value}
            </Text>
            {selectedGender === gender.value && (
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" style={styles.genderCheck} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity 
        style={[styles.continueButton, !selectedGender && styles.disabledButton]} 
        onPress={() => {
          if (selectedGender) {
            handleSelect(selectedGender);
            onContinue();
          }
        }}
        disabled={!selectedGender}
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
  const [selectedCm, setSelectedCm] = useState(formData?.height ? parseInt(formData.height) : 170);
  const [unit, setUnit] = useState("CM");

  const feet = Array.from({ length: 5 }, (_, i) => i + 3);
  const inches = Array.from({ length: 12 }, (_, i) => i);
  const cms = Array.from({ length: 151 }, (_, i) => i + 100);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "33%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>How tall are you?</Text>
      <Text style={styles.stepDescription}>
        Your height is essential for calculating BMI and determining your ideal calorie intake.
      </Text>

      <View style={styles.unitToggleContainer}>
        <TouchableOpacity
          style={[styles.unitToggle, unit === "FT" && styles.activeUnitToggle]}
          onPress={() => setUnit("FT")}
        >
          <Text style={[styles.unitToggleText, unit === "FT" && styles.activeUnitToggleText]}>FT/IN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitToggle, unit === "CM" && styles.activeUnitToggle]}
          onPress={() => setUnit("CM")}
        >
          <Text style={[styles.unitToggleText, unit === "CM" && styles.activeUnitToggleText]}>CM</Text>
        </TouchableOpacity>
      </View>

      {unit === "FT" ? (
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
                    <Text style={[styles.heightText, selectedFeet === foot && styles.selectedHeightText]}>
                      {foot}'
                    </Text>
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
      ) : (
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
                style={[styles.heightItem, selectedCm === cm && styles.selectedHeightItem]}
                onPress={() => setSelectedCm(cm)}
              >
                <Text style={[styles.heightText, selectedCm === cm && styles.selectedHeightText]}>{cm}</Text>
                {selectedCm === cm && <Text style={styles.unitText}>cm</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => {
          let heightInCm;
          if (unit === "FT") {
            const totalInches = selectedFeet * 12 + selectedInches;
            heightInCm = Math.round(totalInches * 2.54);
          } else {
            heightInCm = selectedCm;
          }
          handleChange("height", heightInCm.toString());
          handleSelect("heightUnit", unit.toLowerCase());
          onContinue();
        }}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Weight Step
const WeightStep = ({ formData, handleChange, handleSelect, error, onContinue }) => {
  const [selectedWeight, setSelectedWeight] = useState(formData?.weight ? parseFloat(formData.weight) : 70);
  const [unit, setUnit] = useState("KG");
  
  const kgWeights = Array.from({ length: 271 }, (_, i) => i + 30);
  const lbsWeights = Array.from({ length: 551 }, (_, i) => i + 50);

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "44%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>What's your current weight?</Text>
      <Text style={styles.stepDescription}>
        Your current weight helps us create a personalized plan and track your progress effectively.
      </Text>

      <View style={styles.unitToggleContainer}>
        <TouchableOpacity
          style={[styles.unitToggle, unit === "KG" && styles.activeUnitToggle]}
          onPress={() => setUnit("KG")}
        >
          <Text style={[styles.unitToggleText, unit === "KG" && styles.activeUnitToggleText]}>KG</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.unitToggle, unit === "LBS" && styles.activeUnitToggle]}
          onPress={() => setUnit("LBS")}
        >
          <Text style={[styles.unitToggleText, unit === "LBS" && styles.activeUnitToggleText]}>LBS</Text>
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
              style={[styles.weightItem, selectedWeight === weight && styles.selectedWeightItem]}
              onPress={() => setSelectedWeight(weight)}
            >
              <Text style={[styles.weightText, selectedWeight === weight && styles.selectedWeightText]}>
                {weight}
              </Text>
              {selectedWeight === weight && <Text style={styles.unitText}>{unit.toLowerCase()}</Text>}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

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

// Activity Level Step
const ActivityLevelStep = ({ formData, handleSelect, error, onContinue }) => {
  const activityLevels = [
    {
      value: "Sedentary",
      description: "Little to no exercise, desk job",
      icon: "bed-outline",
      emoji: "🛋️",
    },
    {
      value: "Lightly Active",
      description: "Light exercise 1-3 days per week",
      icon: "walk-outline",
      emoji: "🚶",
    },
    {
      value: "Moderately Active",
      description: "Moderate exercise 3-5 days per week",
      icon: "bicycle-outline",
      emoji: "🚴",
    },
    {
      value: "Very Active",
      description: "Hard exercise 6-7 days per week",
      icon: "fitness-outline",
      emoji: "🏃",
    },
    {
      value: "Extremely Active",
      description: "Very hard exercise, physical job",
      icon: "barbell-outline",
      emoji: "🏋️",
    },
  ];

  const [selectedIndex, setSelectedIndex] = useState(
    formData?.activityLevel ? activityLevels.findIndex(level => level.value === formData.activityLevel) : 1
  );

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "55%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>How active are you?</Text>
      <Text style={styles.stepDescription}>
        Your activity level helps us calculate your daily calorie needs and create a suitable fitness plan.
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
          <Ionicons name="chevron-back" size={20} color="#0056d2" />
        </TouchableOpacity>
        
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${((selectedIndex + 1) / activityLevels.length) * 100}%` }]} />
          <View style={[styles.sliderThumb, { left: `${(selectedIndex / (activityLevels.length - 1)) * 90}%` }]} />
        </View>
        
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={() => setSelectedIndex(Math.min(activityLevels.length - 1, selectedIndex + 1))}
        >
          <Ionicons name="chevron-forward" size={20} color="#0056d2" />
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => {
          handleSelect(activityLevels[selectedIndex].value);
          onContinue();
        }}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Fitness Goal Step
const FitnessGoalStep = ({ formData, handleSelect, error, onContinue }) => {
  const [selectedGoal, setSelectedGoal] = useState(formData?.fitnessGoal || "");
  
  const fitnessGoals = [
    { value: "Weight Loss", icon: "trending-down-outline", description: "Lose weight and burn fat" },
    { value: "Maintain", icon: "pause-outline", description: "Maintain current weight" },
    { value: "Muscle Gain", icon: "trending-up-outline", description: "Build muscle and gain weight" },
    { value: "Improve Endurance", icon: "pulse-outline", description: "Boost cardiovascular fitness" },
    { value: "Increase Strength", icon: "barbell-outline", description: "Get stronger and more powerful" },
    { value: "Improve Flexibility", icon: "body-outline", description: "Enhance mobility and flexibility" },
  ];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "66%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>What's your primary fitness goal?</Text>
      <Text style={styles.stepDescription}>
        Choose your main objective to help us tailor your workout and nutrition plan.
      </Text>

      <View style={styles.fitnessGoalsGrid}>
        {fitnessGoals.map((goal) => {
          const selected = selectedGoal === goal.value;
          return (
            <TouchableOpacity
              key={goal.value}
              style={[
                styles.fitnessGoalCard,
                selected && styles.selectedFitnessGoalCard
              ]}
              onPress={() => setSelectedGoal(goal.value)}
            >
              <View style={[
                styles.fitnessGoalIconContainer,
                selected && styles.selectedFitnessGoalIconContainer
              ]}>
                <Ionicons name={goal.icon} size={24} color={selected ? "#fff" : "#0056d2"} />
              </View>
              <Text style={[
                styles.fitnessGoalText,
                selected && styles.selectedFitnessGoalText
              ]}>
                {goal.value}
              </Text>
              <Text style={[
                styles.fitnessGoalDescription,
                selected && styles.selectedFitnessGoalDescription
              ]}>
                {goal.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.continueButton, !selectedGoal && styles.disabledButton]}
        onPress={() => {
          if (selectedGoal) {
            handleSelect(selectedGoal);
            onContinue();
          }
        }}
        disabled={!selectedGoal}
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
    "Better sleep",
    "Increase energy",
  ];

  const selectedGoals = formData?.goals || [];

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "77%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>What are your health goals?</Text>
      <Text style={styles.stepDescription}>
        Select up to 3 goals that are most important to you right now.
      </Text>

      <View style={styles.optionsContainer}>
        {goalsOptions.map((goal) => (
          <TouchableOpacity
            key={goal}
            style={[
              styles.optionButton,
              selectedGoals.includes(goal) && styles.selectedOptionButton
            ]}
            onPress={() => {
              if (selectedGoals.includes(goal) || selectedGoals.length < 3) {
                handleToggle(goal);
              }
            }}
            disabled={!selectedGoals.includes(goal) && selectedGoals.length >= 3}
          >
            <Text style={[
              styles.optionText,
              selectedGoals.includes(goal) && styles.selectedOptionText
            ]}>
              {goal}
            </Text>
            <View style={selectedGoals.includes(goal) ? styles.checkedBox : styles.uncheckedBox}>
              {selectedGoals.includes(goal) && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.selectionCountText}>{selectedGoals.length}/3 goals selected</Text>
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.continueButton, selectedGoals.length === 0 && styles.disabledButton]}
        onPress={onContinue}
        disabled={selectedGoals.length === 0}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Dietary Preference Step
const DietaryPreferenceStep = ({ formData, handleSelect, error, onContinue }) => {
  const [selectedPreference, setSelectedPreference] = useState(formData?.dietaryPreference || "");
  
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
        <View style={[styles.progressFill, { width: "88%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>What's your dietary preference?</Text>
      <Text style={styles.stepDescription}>
        This helps us recommend meals and recipes that fit your lifestyle and preferences.
      </Text>

      <View style={styles.dietaryPreferencesContainer}>
        {dietaryPreferences.map((preference) => {
          const selected = selectedPreference === preference;
          return (
            <TouchableOpacity
              key={preference}
              style={[
                styles.dietaryPreferenceButton,
                selected && styles.selectedDietaryPreferenceButton
              ]}
              onPress={() => setSelectedPreference(preference)}
            >
              <Text style={[
                styles.dietaryPreferenceText,
                selected && styles.selectedDietaryPreferenceText
              ]}>
                {preference}
              </Text>
              {selected && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.continueButton, !selectedPreference && styles.disabledButton]}
        onPress={() => {
          if (selectedPreference) {
            handleSelect(selectedPreference);
            onContinue();
          }
        }}
        disabled={!selectedPreference}
      >
        <Text style={styles.continueButtonText}>CONTINUE</Text>
      </TouchableOpacity>
    </View>
  );
};

// Body Fat Step
const BodyFatStep = ({ formData, handleChange, error, onComplete }) => {
  const [bodyFat, setBodyFat] = useState(formData?.bodyFatPercentage ? String(formData.bodyFatPercentage) : "");

  return (
    <View style={styles.stepContainer}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "100%" }]} />
      </View>
      
      <Text style={styles.stepTitle}>What's your body fat percentage?</Text>
      <Text style={styles.stepDescription}>
        This helps us provide more accurate fitness recommendations. If you're unsure, you can estimate based on the ranges below.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Body Fat Percentage</Text>
        <View style={styles.bodyFatInputContainer}>
          <TextInput
            style={styles.bodyFatInput}
            value={bodyFat}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9.]/g, "");
              setBodyFat(cleaned);
              handleChange("bodyFatPercentage", cleaned);
            }}
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

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[styles.continueButton, !bodyFat && styles.disabledButton]}
        onPress={() => {
          const value = parseFloat(bodyFat);
          if (isNaN(value) || value < 3 || value > 60) {
            showErrorFetchAPI("Please enter a valid body fat percentage (3-60%)");
            return;
          }
          onComplete();
        }}
        disabled={!bodyFat}
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
    "Analyzing your profile data",
    "Calculating your metabolic rate",
    "Selecting personalized recommendations",
    "Creating your custom health plan",
    "Finalizing your dashboard",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingIconContainer}>
        <View style={styles.loadingIcon}>
          <Ionicons name="fitness" size={40} color="#FFFFFF" />
        </View>
      </View>
      
      <Text style={styles.loadingTitle}>Creating your{"\n"}personalized health plan</Text>
      
      <View style={styles.loadingStepsContainer}>
        {loadingSteps.map((step, index) => (
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
                <Ionicons name="checkmark-circle" size={20} color="#0056d2" />
              ) : (
                <View style={styles.loadingStepDot} />
              )}
              <Text style={[
                styles.loadingStepText,
                { color: index <= currentStep ? "#0056d2" : "#94A3B8" }
              ]}>
                {step}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// Recommendations Screen
const RecommendationsScreen = ({ calorieGoal, onStart, formData }) => {
  const getCalorieRange = (calorie) => {
    const min = Math.round(calorie * 0.9);
    const max = Math.round(calorie * 1.1);
    return `${min} - ${max}`;
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: "Underweight", color: "#FF9800" };
    if (bmi < 25) return { category: "Normal", color: "#4CAF50" };
    if (bmi < 30) return { category: "Overweight", color: "#FF9800" };
    return { category: "Obese", color: "#F44336" };
  };

  const bmi = formData?.height && formData?.weight ? 
    (parseFloat(formData.weight) / Math.pow(parseFloat(formData.height) / 100, 2)).toFixed(1) : null;
  
  const bmiInfo = bmi ? getBMICategory(parseFloat(bmi)) : null;

  return (
    <View style={styles.recommendationsContainer}>
      <View style={styles.recommendationsHeader}>
        <Ionicons name="checkmark-circle" size={60} color="#FFFFFF" />
        <Text style={styles.recommendationsTitle}>All Set!</Text>
        <Text style={styles.recommendationsDescription}>
          Your personalized health plan is ready. We've analyzed your information to create recommendations tailored specifically for you.
        </Text>
      </View>

      <View style={styles.recommendationsContent}>
        <View style={styles.recommendationsGrid}>
          {/* Calorie Goal Card */}
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationCardHeader}>
              <Ionicons name="flame" size={24} color="#0056d2" />
              <Text style={styles.recommendationCardTitle}>Daily Calories</Text>
            </View>
            <Text style={styles.recommendationCardValue}>{getCalorieRange(calorieGoal || 1500)}</Text>
            <Text style={styles.recommendationCardUnit}>kcal per day</Text>
          </View>

          {/* BMI Card */}
          {bmi && (
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationCardHeader}>
                <Ionicons name="analytics" size={24} color="#0056d2" />
                <Text style={styles.recommendationCardTitle}>BMI</Text>
              </View>
              <Text style={styles.recommendationCardValue}>{bmi}</Text>
              <Text style={[styles.recommendationCardUnit, { color: bmiInfo.color }]}>
                {bmiInfo.category}
              </Text>
            </View>
          )}

          {/* Activity Level Card */}
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationCardHeader}>
              <Ionicons name="fitness" size={24} color="#0056d2" />
              <Text style={styles.recommendationCardTitle}>Activity Level</Text>
            </View>
            <Text style={styles.recommendationCardValue}>{formData?.activityLevel || "Moderate"}</Text>
            <Text style={styles.recommendationCardUnit}>Current level</Text>
          </View>

          {/* Goal Card */}
          <View style={styles.recommendationCard}>
            <View style={styles.recommendationCardHeader}>
              <Ionicons name="trophy" size={24} color="#0056d2" />
              <Text style={styles.recommendationCardTitle}>Primary Goal</Text>
            </View>
            <Text style={styles.recommendationCardValue}>{formData?.fitnessGoal || "Maintain"}</Text>
            <Text style={styles.recommendationCardUnit}>Focus area</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.startButton} onPress={onStart}>
          <Text style={styles.startButtonText}>START MY HEALTH JOURNEY</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  stepCounter: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  stepContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    marginBottom: 40,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0056d2",
    borderRadius: 3,
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
    paddingHorizontal: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  continueButton: {
    backgroundColor: "#0056d2",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  
  // Age Step Styles
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
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
  },
  ageText: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  selectedAgeText: {
    fontSize: 32,
    color: "#0056d2",
    fontWeight: "600",
  },
  yearsText: {
    fontSize: 16,
    color: "#0056d2",
    marginTop: 4,
  },

  // Gender Step Styles
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
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  selectedGenderOption: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  genderEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  genderText: {
    fontSize: 18,
    color: "#1F2937",
    flex: 1,
    fontWeight: "500",
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
    backgroundColor: "#0056d2",
  },
  unitToggleText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  activeUnitToggleText: {
    color: "#FFFFFF",
  },

  // Height Step Styles
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
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
  },
  heightText: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  selectedHeightText: {
    fontSize: 32,
    color: "#0056d2",
    fontWeight: "600",
  },
  cmPicker: {
    flex: 1,
  },
  unitText: {
    fontSize: 16,
    color: "#0056d2",
    marginTop: 4,
  },

  // Weight Step Styles
  weightPicker: {
    flex: 1,
  },
  weightItem: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedWeightItem: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
  },
  weightText: {
    fontSize: 24,
    color: "#9CA3AF",
  },
  selectedWeightText: {
    fontSize: 32,
    color: "#0056d2",
    fontWeight: "600",
  },

  // Activity Level Styles
  activityCardContainer: {
    width: "100%",
    marginBottom: 40,
  },
  activityCard: {
    backgroundColor: "#E3F2FD",
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
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    backgroundColor: "#0056d2",
    borderRadius: 2,
  },
  sliderThumb: {
    position: "absolute",
    top: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0056d2",
  },

  // Fitness Goals Styles
  fitnessGoalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 40,
  },
  fitnessGoalCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  selectedFitnessGoalCard: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  fitnessGoalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  selectedFitnessGoalIconContainer: {
    backgroundColor: "#FFFFFF",
  },
  fitnessGoalText: {
    fontSize: 16,
    color: "#334155",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 4,
  },
  selectedFitnessGoalText: {
    color: "#FFFFFF",
  },
  fitnessGoalDescription: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  selectedFitnessGoalDescription: {
    color: "#E3F2FD",
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
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  selectedOptionButton: {
    backgroundColor: "#E3F2FD",
    borderColor: "#0056d2",
  },
  optionText: {
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
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
    marginBottom: 20,
    textAlign: "center",
  },

  // Dietary Preferences Styles
  dietaryPreferencesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
    marginBottom: 40,
  },
  dietaryPreferenceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    margin: 6,
    minWidth: "45%",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  selectedDietaryPreferenceButton: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  dietaryPreferenceText: {
    fontSize: 14,
    color: "#334155",
    textAlign: "center",
    fontWeight: "500",
  },
  selectedDietaryPreferenceText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Body Fat Input Styles
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
    borderWidth: 2,
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
    borderWidth: 1,
    borderColor: "#E2E8F0",
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

  // Loading Screen Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 40,
  },
  loadingIconContainer: {
    marginBottom: 60,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
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
  },
  loadingStepContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingStepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#CBD5E1",
  },
  loadingStepText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },

  // Recommendations Screen Styles
  recommendationsContainer: {
    flex: 1,
    backgroundColor: "#0056d2",
  },
  recommendationsHeader: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationsTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 20,
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
  recommendationsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  recommendationCard: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    marginLeft: 8,
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