import React from "react";
import NameStep from "./NameStep";
import GoalsStep from "./GoalsStep";
import BodyFatStep from "./BodyFatStep";
import ActivityLevelStep from "./ActivityLevelStep";
import DietaryPreferenceStep from "./DietaryPreferenceStep";
import FitnessGoalStep from "./FitnessGoalStep";
import GoalsInfoStep from "./GoalsInfoStep";
import HabitsInfoStep from "./HabitsInfoStep";
import MealPlansInfoStep from "./MealPlansInfoStep";
import PersonalInfoStep from "./PersonalInfoStep";
import HeightStep from "./HeightStep";
import WeightStep from "./WeightStep";

export default function ProfileSteps({
  currentStep,
  formData,
  handleChange,
  handleToggle,
  handleSelect,
  setShowDatePicker,
  setShowGenderOptions,
  formatDate,
  calculateAge,
  errors,
}) {
  switch (currentStep) {
    case 0:
      return <NameStep formData={formData} handleChange={handleChange} error={errors.firstName} />;
    case 1:
      return (
        <GoalsStep formData={formData} handleToggle={(goal) => handleToggle("goals", goal)} error={errors.goals} />
      );
    case 2:
      return <BodyFatStep formData={formData} handleChange={handleChange} error={errors.bodyFatPercentage} />;
    case 3:
      return (
        <ActivityLevelStep
          formData={formData}
          handleSelect={(level) => handleSelect("activityLevel", level)}
          error={errors.activityLevel}
        />
      );
    case 4:
      return (
        <DietaryPreferenceStep
          formData={formData}
          handleSelect={(preference) => handleSelect("dietaryPreference", preference)}
          error={errors.dietaryPreference}
        />
      );
    case 5:
      return (
        <FitnessGoalStep
          formData={formData}
          handleSelect={(goal) => handleSelect("fitnessGoal", goal)}
          error={errors.fitnessGoal}
        />
      );
    case 6:
      return <GoalsInfoStep formData={formData} />;
    case 7:
      return <HabitsInfoStep formData={formData} />;
    case 8:
      return <MealPlansInfoStep formData={formData} />;
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
      );
    case 10:
      return (
        <HeightStep
          formData={formData}
          handleChange={handleChange}
          handleSelect={handleSelect}
          error={errors.height}
        />
      );
    case 11:
      return (
        <WeightStep
          formData={formData}
          handleChange={handleChange}
          handleSelect={handleSelect}
          error={errors.weight}
        />
      );
    default:
      return null;
  }
}
