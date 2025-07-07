"use client"

import { useEffect, useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { healthyLogService } from "services/apiHealthyLogService"
import { useNavigation, useRoute } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"

const MOOD_OPTIONS = [
  { label: "Select your mood", value: "" },
  { label: "Happy", value: "Happy" },
  { label: "Neutral", value: "Neutral" },
  { label: "Sad", value: "Sad" },
  { label: "Stressed", value: "Stressed" },
  { label: "Relaxed", value: "Relaxed" },
]

const SLEEP_QUALITY_OPTIONS = [
  { label: "Select sleep quality", value: "" },
  { label: "Excellent", value: "Excellent" },
  { label: "Good", value: "Good" },
  { label: "Average", value: "Average" },
  { label: "Poor", value: "Poor" },
]

const STRESS_LEVEL_OPTIONS = [
  { label: "Select stress level", value: "" },
  { label: "Low", value: "Low" },
  { label: "Medium", value: "Medium" },
  { label: "High", value: "High" },
]

export default function HealthLogEditScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const logId = route?.params?.logId

  const [form, setForm] = useState({
    bloodPressure: "",
    heartRate: "",
    bloodOxygenLevel: "",
    sleepDuration: "",
    sleepQuality: "",
    stressLevel: "",
    mood: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [currentField, setCurrentField] = useState("")
  const [currentOptions, setCurrentOptions] = useState([])

  useEffect(() => {
    fetchLog()
  }, [logId])

  const fetchLog = async () => {
    setLoading(true)
    try {
      const log = await healthyLogService.getHealthLogById(logId)
      setForm({
        bloodPressure: log.bloodPressure || "",
        heartRate: log.heartRate?.toString() || "",
        bloodOxygenLevel: log.bloodOxygenLevel?.toString() || "",
        sleepDuration: log.sleepDuration?.toString() || "",
        sleepQuality: log.sleepQuality || "",
        stressLevel: log.stressLevel || "",
        mood: log.mood || "",
      })
    } catch (e) {
      Alert.alert("Error", e.message || "Unable to load health log.")
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (key, value) => {
    setForm({ ...form, [key]: value })
    // Clear error when user starts typing
    if (errors[key]) {
      setErrors({ ...errors, [key]: null })
    }
  }

  // Validate blood pressure format systolic/diastolic
  const isValidBloodPressure = (bp) => {
    if (!bp) return true
    if (bp.length > 20) return false
    return /^\d{1,3}\/\d{1,3}$/.test(bp)
  }

  const validateForm = () => {
    const newErrors = {}

    // Check if at least one field is filled
    const hasData = Object.values(form).some((value) => value !== "")
    if (!hasData) {
      Alert.alert("Validation Error", "Please enter at least one health metric!")
      return false
    }

    // BloodPressure: max 20 chars, format systolic/diastolic
    if (form.bloodPressure) {
      if (form.bloodPressure.length > 20) {
        newErrors.bloodPressure = "BloodPressure cannot exceed 20 characters."
      } else if (!/^\d{1,3}\/\d{1,3}$/.test(form.bloodPressure)) {
        newErrors.bloodPressure = "BloodPressure must be in format 'systolic/diastolic' (e.g., '120/80')."
      }
    }

    // HeartRate: 30-200
    if (form.heartRate) {
      const hr = Number(form.heartRate)
      if (isNaN(hr) || hr < 30 || hr > 200) {
        newErrors.heartRate = "HeartRate must be between 30 and 200 bpm."
      }
    }

    // BloodOxygenLevel: 0-100
    if (form.bloodOxygenLevel) {
      const oxygen = Number(form.bloodOxygenLevel)
      if (isNaN(oxygen) || oxygen < 0 || oxygen > 100) {
        newErrors.bloodOxygenLevel = "BloodOxygenLevel must be between 0 and 100."
      }
    }

    // SleepDuration: 0-24
    if (form.sleepDuration) {
      const sleep = Number(form.sleepDuration)
      if (isNaN(sleep) || sleep < 0 || sleep > 24) {
        newErrors.sleepDuration = "SleepDuration must be between 0 and 24 hours."
      }
    }

    // SleepQuality: max 50 chars, must be Good, Average, or Poor
    if (form.sleepQuality) {
      if (form.sleepQuality.length > 50) {
        newErrors.sleepQuality = "SleepQuality cannot exceed 50 characters."
      } else if (!/^(Good|Average|Poor)$/.test(form.sleepQuality)) {
        newErrors.sleepQuality = "SleepQuality must be 'Good', 'Average', or 'Poor'."
      }
    }

    // StressLevel: max 50 chars, must be Low, Medium, or High
    if (form.stressLevel) {
      if (form.stressLevel.length > 50) {
        newErrors.stressLevel = "StressLevel cannot exceed 50 characters."
      } else if (!/^(Low|Medium|High)$/.test(form.stressLevel)) {
        newErrors.stressLevel = "StressLevel must be 'Low', 'Medium', or 'High'."
      }
    }

    // Mood: max 50 chars, must be Happy, Neutral, Sad, Stressed, or Relaxed
    if (form.mood) {
      if (form.mood.length > 50) {
        newErrors.mood = "Mood cannot exceed 50 characters."
      } else if (!/^(Happy|Neutral|Sad|Stressed|Relaxed)$/.test(form.mood)) {
        newErrors.mood = "Mood must be 'Happy', 'Neutral', 'Sad', 'Stressed', or 'Relaxed'."
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setSaving(true)
    try {
      const userId = await getUserId()
      const logDto = {
        userId,
        bloodPressure: form.bloodPressure || undefined,
        heartRate: form.heartRate ? Number(form.heartRate) : undefined,
        bloodOxygenLevel: form.bloodOxygenLevel ? Number(form.bloodOxygenLevel) : undefined,
        sleepDuration: form.sleepDuration ? Number(form.sleepDuration) : undefined,
        sleepQuality: form.sleepQuality || undefined,
        stressLevel: form.stressLevel || undefined,
        mood: form.mood || undefined,
        recordedAt: new Date().toISOString(),
      }

      await healthyLogService.updateHealthLog(logId, logDto)

      Alert.alert("Success", "Health log updated successfully!", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ])
    } catch (e) {
      if (e.errors) {
        const messages = Object.entries(e.errors)
          .map(([k, v]) => `• ${v.join(", ")}`)
          .join("\n")
        Alert.alert("Validation Error", messages)
      } else {
        Alert.alert("Error", e.message || "Unable to update health log.")
      }
    } finally {
      setSaving(false)
    }
  }

  // Get userId from AsyncStorage
  const getUserId = async () => {
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default
      const userStr = await AsyncStorage.getItem("user")
      if (userStr) {
        const user = JSON.parse(userStr)
        return user.userId || user.id
      }
    } catch (error) {
    }
    return undefined
  }

  const getHealthStatus = (type, value) => {
    if (!value) return null

    switch (type) {
      case "heartRate":
        const hr = Number(value)
        if (hr >= 60 && hr <= 100) return { color: "#10B981", icon: "checkmark-circle", text: "Normal" }
        if (hr < 60) return { color: "#F59E0B", icon: "warning", text: "Low" }
        return { color: "#EF4444", icon: "alert-circle", text: "High" }

      case "bloodOxygen":
        const oxygen = Number(value)
        if (oxygen >= 95) return { color: "#10B981", icon: "checkmark-circle", text: "Normal" }
        if (oxygen >= 90) return { color: "#F59E0B", icon: "warning", text: "Low" }
        return { color: "#EF4444", icon: "alert-circle", text: "Critical" }

      case "sleep":
        const sleep = Number(value)
        if (sleep >= 7 && sleep <= 9) return { color: "#10B981", icon: "checkmark-circle", text: "Optimal" }
        if (sleep >= 6) return { color: "#F59E0B", icon: "warning", text: "Insufficient" }
        return { color: "#EF4444", icon: "alert-circle", text: "Poor" }

      default:
        return null
    }
  }

  const openPicker = (field, options) => {
    setCurrentField(field)
    setCurrentOptions(options)
    setModalVisible(true)
  }

  const selectOption = (value) => {
    handleChange(currentField, value)
    setModalVisible(false)
  }

  const renderInputField = (key, placeholder, icon, keyboardType = "default", unit = "", healthType = null) => {
    const status = healthType ? getHealthStatus(healthType, form[key]) : null
    return (
      <View style={styles.inputContainer}>
        <View style={styles.inputHeader}>
          <View style={styles.inputLabelContainer}>
            <Ionicons name={icon} size={20} color="#4F46E5" />
            <Text style={styles.inputLabel}>{placeholder}</Text>
          </View>
          {status && (
            <View style={styles.statusContainer}>
              <Ionicons name={status.icon} size={16} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
            </View>
          )}
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={[styles.input, errors[key] && styles.inputError]}
            placeholder={`Enter ${placeholder.toLowerCase()}${unit ? ` (${unit})` : ""}`}
            placeholderTextColor="#9CA3AF"
            value={form[key]}
            onChangeText={(v) => handleChange(key, v)}
            keyboardType={keyboardType}
          />
          {unit && <Text style={styles.unitText}>{unit}</Text>}
        </View>
        {errors[key] && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{errors[key]}</Text>
          </View>
        )}
      </View>
    )
  }

  const renderCustomPicker = (key, options, label, icon) => {
    const selectedOption = options.find((opt) => opt.value === form[key])
    const displayText = selectedOption ? selectedOption.label : options[0].label
    const isSelected = form[key] !== ""

    return (
      <View style={styles.inputContainer}>
        <View style={styles.inputLabelContainer}>
          <Ionicons name={icon} size={20} color="#4F46E5" />
          <Text style={styles.inputLabel}>{label}</Text>
        </View>
        <TouchableOpacity
          style={[styles.customPickerButton, errors[key] && styles.inputError]}
          onPress={() => openPicker(key, options)}
        >
          <Text style={[styles.customPickerText, !isSelected && styles.customPickerPlaceholder]}>{displayText}</Text>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
        {errors[key] && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={styles.errorText}>{errors[key]}</Text>
          </View>
        )}
      </View>
    )
  }

  const renderPickerModal = () => (
    <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Option</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={currentOptions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.optionItem, form[currentField] === item.value && styles.selectedOption]}
                onPress={() => selectOption(item.value)}
              >
                <Text style={[styles.optionText, form[currentField] === item.value && styles.selectedOptionText]}>
                  {item.label}
                </Text>
                {form[currentField] === item.value && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading health log...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Edit Health Log</Text>
            <Text style={styles.headerSubtitle}>Update your wellness data</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Vital Signs Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={24} color="#EF4444" />
              <Text style={styles.sectionTitle}>Vital Signs</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Monitor your essential health metrics</Text>
            {renderInputField("bloodPressure", "Blood Pressure", "fitness", "default", "mmHg")}
            {renderInputField("heartRate", "Heart Rate", "heart", "numeric", "bpm", "heartRate")}
            {renderInputField("bloodOxygenLevel", "Blood Oxygen", "water", "numeric", "%", "bloodOxygen")}
          </View>

          {/* Sleep & Wellness Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bed" size={24} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Sleep & Wellness</Text>
            </View>
            <Text style={styles.sectionSubtitle}>Track your rest and mental well-being</Text>
            {renderInputField("sleepDuration", "Sleep Duration", "moon", "numeric", "hours", "sleep")}
            {renderCustomPicker("sleepQuality", SLEEP_QUALITY_OPTIONS, "Sleep Quality", "bed")}
            {renderCustomPicker("stressLevel", STRESS_LEVEL_OPTIONS, "Stress Level", "pulse")}
            {renderCustomPicker("mood", MOOD_OPTIONS, "Current Mood", "happy")}
          </View>

          {/* Health Tips */}
          <View style={styles.tipsContainer}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.tipsTitle}>Health Tips</Text>
            </View>
            <Text style={styles.tipsText}>
              • Normal heart rate: 60-100 bpm{"\n"}• Healthy blood oxygen: 95-100%{"\n"}• Recommended sleep: 7-9 hours
              {"\n"}• Blood pressure format: 120/80
            </Text>
          </View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="sync" size={20} color="#fff" />
                <Text style={styles.submitText}>Updating...</Text>
              </View>
            ) : (
              <View style={styles.submitContent}>
                <Ionicons name="save" size={20} color="#fff" />
                <Text style={styles.submitText}>Update Health Log</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {renderPickerModal()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: "#1F2937",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  unitText: {
    fontSize: 14,
    color: "#6B7280",
    paddingRight: 16,
    fontWeight: "500",
  },
  customPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    minHeight: 56,
  },
  customPickerText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
  },
  customPickerPlaceholder: {
    color: "#9CA3AF",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    flex: 1,
  },
  tipsContainer: {
    backgroundColor: "#FFFBEB",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400E",
  },
  tipsText: {
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  submitContainer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },
  submitContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
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
    fontWeight: "bold",
    color: "#1F2937",
  },
  modalCloseButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  selectedOption: {
    backgroundColor: "#EEF2FF",
  },
  optionText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
  },
  selectedOptionText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
})
