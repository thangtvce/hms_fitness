import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useAuth } from "context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import trainerService from "services/apiTrainerService";
import DateTimePicker from "@react-native-community/datetimepicker";
import RNModal from "react-native-modal";
import Header from 'components/Header';

const TrainerApplicationScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    userId: user?.userId || "",
    fullName: user?.fullName || "",
    email: user?.email || "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    bio: "",
    experienceYears: "",
    specialties: "",
    certifications: "",
    profileImageUrl: "",
    cvFileUrl: "",
    socialLinks: "",
    status: "pending",
    notes: "",
    userFullName: user?.fullName || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(form.dateOfBirth ? new Date(form.dateOfBirth) : new Date());
  const [showGenderPicker, setShowGenderPicker] = useState(false);

  const genderOptions = [
    { label: "Male", value: "Male" },
    { label: "Female", value: "Female" },
    { label: "Other", value: "Other" },
    { label: "Prefer not to say", value: "Prefer not to say" },
  ];

  // Use useCallback to prevent re-renders that cause keyboard to close
  const handleChange = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);


  // Open date picker modal
  const openDatePicker = () => {
    setTempDate(form.dateOfBirth ? new Date(form.dateOfBirth) : new Date());
    setShowDatePicker(true);
  };

  // Confirm date selection
  const confirmDate = () => {
    handleChange("dateOfBirth", tempDate.toISOString().split("T")[0]);
    setShowDatePicker(false);
  };

  // Cancel date selection
  const cancelDate = () => {
    setShowDatePicker(false);
  };

  const handleGenderSelect = useCallback((gender) => {
    handleChange("gender", gender);
    setShowGenderPicker(false);
  }, [handleChange]);

  // Validate form fields based on backend DTO
  const validateForm = () => {
    if (!user?.userId || isNaN(user.userId) || user.userId <= 0) {
      return "UserId is required and must be a positive integer.";
    }
    if (!form.fullName || form.fullName.length < 2 || form.fullName.length > 100) {
      return "Full name must be between 2 and 100 characters.";
    }
    if (!form.email) return "Email is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return "Invalid email format.";
    if (form.email.length > 100) return "Email cannot exceed 100 characters.";
    if (!form.phoneNumber) return "Phone number is required.";
    if (form.phoneNumber.length > 20) return "Phone number cannot exceed 20 characters.";
    if (!/^\+?[0-9\-\s()]{7,20}$/.test(form.phoneNumber)) return "Invalid phone number format.";
    if (!form.dateOfBirth) return "Date of birth is required.";
    if (form.gender && form.gender.length > 10) return "Gender cannot exceed 10 characters.";
    if (form.bio && form.bio.length > 2000) return "Bio cannot exceed 2000 characters.";
    if (form.experienceYears === "" || form.experienceYears === null || form.experienceYears === undefined) return "Years of experience is required.";
    if (isNaN(form.experienceYears) || Number(form.experienceYears) < 0 || Number(form.experienceYears) > 100) return "Years of experience must be between 0 and 100.";
    if (form.specialties && form.specialties.length > 2000) return "Specialties cannot exceed 2000 characters.";
    if (form.certifications && form.certifications.length > 1500) return "Certifications cannot exceed 1500 characters.";
    if (form.profileImageUrl && form.profileImageUrl.length > 255) return "Profile image URL cannot exceed 255 characters.";
    if (form.cvFileUrl && form.cvFileUrl.length > 500) return "CV file URL cannot exceed 500 characters.";
    if (form.socialLinks && form.socialLinks.length > 700) return "Social links cannot exceed 700 characters.";
    if (!form.status || form.status.length > 20) return "Status is required and cannot exceed 20 characters.";
    if (form.notes && form.notes.length > 3000) return "Notes cannot exceed 3000 characters.";
    return null;
  };

  const handleSubmit = async () => {
    const errorMsg = validateForm();
    if (errorMsg) {
      Alert.alert("Validation Error", errorMsg);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        experienceYears: Number(form.experienceYears),
        userId: user?.userId,
        userFullName: user?.fullName,
        submittedAt: new Date().toISOString(),
      };
      const res = await trainerService.submitTrainerApplication(payload);
      if (res.statusCode === 201) {
        Alert.alert("Success", "Your application has been submitted!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Error", res.message || "Submission failed.");
      }
    } catch (error) {
      Alert.alert("Error", error?.message || "Submission failed.");
    }
    setSubmitting(false);
  };
  const InputField = ({ 
    label, 
    value, 
    placeholder, 
    icon, 
    required = false, 
    multiline = false,
    keyboardType = "default",
    numberOfLines = 1,
    editable = true,
    fieldKey
  }) => {
    // Always ensure value is a string
    let safeValue = value;
    if (safeValue === null || safeValue === undefined) safeValue = "";
    if (fieldKey === "experienceYears") {
      safeValue = safeValue.toString();
    }
    // Local state for input value
    const [inputValue, setInputValue] = React.useState(safeValue);
    // Sync with parent value (when form reset)
    React.useEffect(() => {
      setInputValue(safeValue);
    }, [safeValue]);
    // Handler for blur: update parent form
    const handleBlur = () => {
      if (fieldKey === "experienceYears") {
        handleChange(fieldKey, inputValue.replace(/[^0-9]/g, ""));
      } else {
        handleChange(fieldKey, inputValue);
      }
    };
    return (
      <View style={styles.inputContainer}>
        <View style={styles.labelContainer}>
          <Ionicons name={icon} size={20} color="#0056d2" style={styles.labelIcon} />
          <Text style={styles.inputLabel}>
            {label} {required && <Text style={styles.required}>*</Text>}
          </Text>
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.textInput,
              multiline && styles.multilineInput,
              !editable && styles.disabledInput
            ]}
            value={inputValue}
            onChangeText={text => setInputValue(text)}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline={multiline}
            numberOfLines={numberOfLines}
            keyboardType={keyboardType}
            textAlignVertical={multiline ? "top" : "center"}
            editable={editable}
          />
        </View>
      </View>
    );
  };

  const SelectField = ({ label, value, onPress, placeholder, icon, required = false }) => (
    <View style={styles.inputContainer}>
      <View style={styles.labelContainer}>
        <Ionicons name={icon} size={20} color="#0056d2" style={styles.labelIcon} />
        <Text style={styles.inputLabel}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      </View>
      <TouchableOpacity style={styles.selectWrapper} onPress={onPress}>
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#0056d2" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Trainer Application"
        onBack={() => navigation.goBack()}
        absolute
      />
      <View style={{ height: 90 }} />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <LinearGradient
          colors={["#0056d2", "#0056d2"]}
          style={styles.heroSection}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="fitness" size={48} color="#ffffff" />
          <Text style={styles.heroTitle}>Become a Trainer</Text>
          <Text style={styles.heroSubtitle}>
            Join our community and inspire others to achieve their fitness goals
          </Text>
        </LinearGradient>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* Personal Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={24} color="#0056d2" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <InputField
              label="Full Name"
              value={form.fullName ?? ""}
              placeholder="Enter your full name"
              icon="person-outline"
              required
              fieldKey="fullName"
            />

            <InputField
              label="Email Address"
              value={form.email ?? ""}
              placeholder="your.email@example.com"
              icon="mail-outline"
              keyboardType="email-address"
              required
              fieldKey="email"
            />

            <InputField
              label="Phone Number"
              value={form.phoneNumber ?? ""}
              placeholder="+1 (555) 123-4567"
              icon="call-outline"
              keyboardType="phone-pad"
              required
              fieldKey="phoneNumber"
            />

            <SelectField
              label="Date of Birth"
              value={form.dateOfBirth}
              onPress={openDatePicker}
              placeholder="Select your date of birth"
              icon="calendar-outline"
              required
            />

            <SelectField
              label="Gender"
              value={form.gender}
              onPress={() => setShowGenderPicker(true)}
              placeholder="Select your gender"
              icon="male-female-outline"
            />
          </View>

          {/* Professional Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase" size={24} color="#0056d2" />
              <Text style={styles.sectionTitle}>Professional Information</Text>
            </View>

            <InputField
              label="Years of Experience"
              value={form.experienceYears === null || form.experienceYears === undefined ? "" : String(form.experienceYears)}
              placeholder="e.g., 5"
              icon="time-outline"
              keyboardType="numeric"
              required
              fieldKey="experienceYears"
            />

            <InputField
              label="Bio"
              value={form.bio ?? ""}
              placeholder="Tell us about yourself and your fitness journey..."
              icon="document-text-outline"
              multiline
              numberOfLines={4}
              fieldKey="bio"
            />

            <InputField
              label="Specialties"
              value={form.specialties ?? ""}
              placeholder="Weight Training, Yoga, Cardio, Nutrition..."
              icon="barbell-outline"
              multiline
              numberOfLines={3}
              fieldKey="specialties"
            />

            <InputField
              label="Certifications"
              value={form.certifications ?? ""}
              placeholder="List your certifications and qualifications..."
              icon="ribbon-outline"
              multiline
              numberOfLines={3}
              fieldKey="certifications"
            />
          </View>

          {/* Additional Information */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="add-circle" size={24} color="#0056d2" />
              <Text style={styles.sectionTitle}>Additional Information</Text>
            </View>

            <InputField
              label="Profile Image URL"
              value={form.profileImageUrl ?? ""}
              placeholder="https://example.com/your-photo.jpg"
              icon="image-outline"
              fieldKey="profileImageUrl"
            />

            <InputField
              label="CV/Resume URL"
              value={form.cvFileUrl ?? ""}
              placeholder="https://example.com/your-cv.pdf"
              icon="document-outline"
              fieldKey="cvFileUrl"
            />

            <InputField
              label="Social Media Links"
              value={form.socialLinks ?? ""}
              placeholder="Instagram, LinkedIn, YouTube links..."
              icon="share-social-outline"
              multiline
              numberOfLines={2}
              fieldKey="socialLinks"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
              { backgroundColor: submitting ? '#9CA3AF' : '#0056d2' }
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <View style={styles.submitGradient}>
              <Ionicons
                name={submitting ? 'hourglass-outline' : 'checkmark-circle-outline'}
                size={24}
                color="#FFFFFF"
                style={styles.submitIcon}
              />
              <Text style={styles.submitText}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal with Confirm/Cancel */}
      <RNModal
        isVisible={showDatePicker}
        onBackdropPress={cancelDate}
        onBackButtonPress={cancelDate}
        useNativeDriver
        hideModalContentWhileAnimating
        style={{ justifyContent: 'center', alignItems: 'center' }}
      >
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, width: 320, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#6366F1', marginBottom: 16 }}>Select Date of Birth</Text>
          <DateTimePicker
            value={tempDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              if (date) setTempDate(date);
            }}
            maximumDate={new Date()}
            style={{ width: 250 }}
          />
          <View style={{ flexDirection: 'row', marginTop: 24, gap: 16 }}>
            <TouchableOpacity
              onPress={cancelDate}
              style={{
                flex: 1,
                backgroundColor: '#e5e9f2',
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center',
                marginRight: 8,
              }}
            >
              <Text style={{ color: '#222', fontWeight: '600', fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmDate}
              style={{
                flex: 1,
                backgroundColor: '#6366F1',
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center',
                marginLeft: 8,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </RNModal>

      {/* Gender Picker Modal */}
      <Modal
        visible={showGenderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenderPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Gender</Text>
              <TouchableOpacity onPress={() => setShowGenderPicker(false)}>
                <Ionicons name="close" size={24} color="#0056d2" />
              </TouchableOpacity>
            </View>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.modalOption,
                  form.gender === option.value && styles.modalOptionSelected
                ]}
                onPress={() => handleGenderSelect(option.value)}
              >
                <Text style={[
                  styles.modalOptionText,
                  form.gender === option.value && styles.modalOptionTextSelected
                ]}>
                  {option.label}
                </Text>
                {form.gender === option.value && (
                <Ionicons name="checkmark" size={20} color="#0056d2" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#E0E7FF",
    textAlign: "center",
    lineHeight: 24,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  labelIcon: {
    marginRight: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  required: {
    color: "#EF4444",
  },
  inputWrapper: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textInput: {
    padding: 16,
    fontSize: 12,
    color: "#1F2937",
    minHeight: 50,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  disabledInput: {
    backgroundColor: "#F3F4F6",
    color: "#9CA3AF",
  },
  selectWrapper: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 50,
  },
  selectText: {
    fontSize: 12,
    color: "#1F2937",
  },
  selectPlaceholder: {
    color: "#9CA3AF",
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 20,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitIcon: {
    marginRight: 12,
  },
  submitText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionSelected: {
    backgroundColor: "#EEF2FF",
  },
  modalOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  modalOptionTextSelected: {
    color: "#6366F1",
    fontWeight: "600",
  },
});

export default TrainerApplicationScreen;