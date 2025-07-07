"use client"

import { useEffect, useState, useContext } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useNavigation, useRoute } from "@react-navigation/native"
import DateTimePicker from "@react-native-community/datetimepicker"
import { apiReminderService } from "services/apiReminderService"
import { AuthContext } from "context/AuthContext"

const { width } = Dimensions.get("window")

const TYPE_OPTIONS = [
  {
    label: "Drink Water",
    value: "drink",
    icon: "water",
    color: "#06B6D4",
    gradient: ["#06B6D4", "#0EA5E9"],
    description: "Stay hydrated throughout the day",
  },
  {
    label: "Meal Time",
    value: "meal",
    icon: "restaurant",
    color: "#F59E0B",
    gradient: ["#F59E0B", "#EAB308"],
    description: "Never miss your meals",
  },
  {
    label: "Exercise",
    value: "exercise",
    icon: "fitness",
    color: "#10B981",
    gradient: ["#10B981", "#059669"],
    description: "Keep your body active",
  },
  {
    label: "Sleep Time",
    value: "sleep",
    icon: "moon",
    color: "#8B5CF6",
    gradient: ["#8B5CF6", "#7C3AED"],
    description: "Get quality rest",
  },
]

const FREQUENCY_OPTIONS = [
  {
    label: "Daily",
    value: "Daily",
    icon: "today",
    description: "Every day",
    color: "#10B981",
  },
  {
    label: "Weekly",
    value: "Weekly",
    icon: "calendar",
    description: "Specific days of the week",
    color: "#06B6D4",
  },
  {
    label: "Monthly",
    value: "Monthly",
    icon: "calendar-outline",
    description: "Once a month",
    color: "#8B5CF6",
  },
]

const DAYS_OF_WEEK = [
  { label: "Mon", value: "Mon", full: "Monday", color: "#EF4444" },
  { label: "Tue", value: "Tue", full: "Tuesday", color: "#F59E0B" },
  { label: "Wed", value: "Wed", full: "Wednesday", color: "#10B981" },
  { label: "Thu", value: "Thu", full: "Thursday", color: "#06B6D4" },
  { label: "Fri", value: "Fri", full: "Friday", color: "#8B5CF6" },
  { label: "Sat", value: "Sat", full: "Saturday", color: "#EC4899" },
  { label: "Sun", value: "Sun", full: "Sunday", color: "#F97316" },
]

const QUICK_AMOUNTS = {
  drink: ["250ml", "500ml", "750ml", "1L"],
  meal: ["Breakfast", "Lunch", "Dinner", "Snack"],
  exercise: ["15 min", "30 min", "45 min", "1 hour"],
  sleep: ["7 hours", "8 hours", "9 hours", "Custom"],
}

export default function EditReminderPlanScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { user } = useContext(AuthContext)
  const userId = user?.userId
  const { planId } = route.params || {}

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false)

  const [plan, setPlan] = useState({
    title: "",
    type: "drink",
    time: "08:00",
    frequency: "Daily",
    amount: "",
    daysOfWeek: "",
    notes: "",
    isActive: true,
  })

  const [pendingFrequency, setPendingFrequency] = useState(plan.frequency)

  useEffect(() => {
    if (planId) {
      fetchPlan()
    }
  }, [planId])

  const fetchPlan = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await apiReminderService.getReminderPlanById(planId)
      const planData = res.data || res

      // Ensure frequency is one of the allowed values
      let validFrequency = planData.frequency
      if (!["Daily", "Weekly", "Monthly"].includes(validFrequency)) {
        validFrequency = "Daily"
      }

      setPlan({
        ...planData,
        frequency: validFrequency,
        daysOfWeek: planData.daysOfWeek || "",
        notes: planData.notes || "",
        amount: planData.amount || "",
      })
      setPendingFrequency(validFrequency)
    } catch (err) {
      setError("Failed to load reminder plan")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!plan.title?.trim()) {
      Alert.alert("Validation Error", "Please enter a title for your reminder")
      return
    }
    if (!plan.time) {
      Alert.alert("Validation Error", "Please select a time for your reminder")
      return
    }
    if (plan.frequency === "Weekly" && !plan.daysOfWeek) {
      Alert.alert("Validation Error", "Please select at least one day for weekly reminders")
      return
    }

    setSaving(true)
    try {
      await apiReminderService.updateReminderPlan(plan.planId, plan)
      Alert.alert("Success", "Reminder updated successfully!", [{ text: "OK", onPress: () => navigation.goBack() }])
    } catch (err) {
      Alert.alert("Error", "Failed to update reminder. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleTimeChange = (event, selectedDate) => {
    setShowTimePicker(false)
    if (selectedDate) {
      const h = selectedDate.getHours().toString().padStart(2, "0")
      const m = selectedDate.getMinutes().toString().padStart(2, "0")
      const s = selectedDate.getSeconds().toString().padStart(2, "0")
      setPlan((prev) => ({ ...prev, time: `${h}:${m}:${s}` }))
    }
  }

  const handleDayToggle = (day) => {
    // Allow day selection for Weekly and for Daily if daysOfWeek is not empty (custom days)
    if (plan.frequency !== "Weekly" && plan.frequency !== "Daily") return

    // Only allow valid days
    const validDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    if (!validDays.includes(day)) return

    const currentDays = plan.daysOfWeek ? plan.daysOfWeek.split(",").map((d) => d.trim()) : []
    let updatedDays = []
    if (currentDays.includes(day)) {
      updatedDays = currentDays.filter((d) => d !== day)
    } else {
      updatedDays = [...currentDays, day]
    }
    setPlan((prev) => ({ ...prev, daysOfWeek: updatedDays.join(", ") }))
  }

  const getSelectedDays = () => {
    return plan.daysOfWeek ? plan.daysOfWeek.split(",").map((d) => d.trim()) : []
  }

  const getTypeConfig = (type) => {
    return TYPE_OPTIONS.find((option) => option.value === type) || TYPE_OPTIONS[0]
  }

  const getFrequencyConfig = (frequency) => {
    return FREQUENCY_OPTIONS.find((option) => option.value === frequency) || FREQUENCY_OPTIONS[0]
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#1F2937" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Edit Reminder</Text>
      <TouchableOpacity
        style={[styles.saveHeaderButton, saving && styles.saveHeaderButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#06B6D4" />
        ) : (
          <Ionicons name="checkmark" size={20} color="#06B6D4" />
        )}
      </TouchableOpacity>
    </View>
  )

  const renderSelectedType = () => {
    const selectedType = getTypeConfig(plan.type)

    return (
      <View style={styles.selectedTypeContainer}>
        <Text style={styles.sectionTitle}>Reminder Type</Text>
        <View style={styles.selectedTypeCard}>
          <LinearGradient colors={selectedType.gradient} style={styles.selectedTypeIcon}>
            <Ionicons name={selectedType.icon} size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.selectedTypeInfo}>
            <Text style={styles.selectedTypeLabel}>{selectedType.label}</Text>
            <Text style={styles.selectedTypeDesc}>{selectedType.description}</Text>
          </View>
          <View style={styles.typeLockedBadge}>
            <Ionicons name="lock-closed" size={16} color="#6B7280" />
          </View>
        </View>
        <Text style={styles.typeLockedText}>Reminder type cannot be changed after creation</Text>
      </View>
    )
  }

  const renderFrequencyPicker = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFrequencyPicker}
      onRequestClose={() => setShowFrequencyPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.frequencyPickerModal}>
          <View style={styles.frequencyPickerHeader}>
            <TouchableOpacity
              onPress={() => {
                setPendingFrequency(plan.frequency)
                setShowFrequencyPicker(false)
              }}
            >
              <Text style={styles.frequencyPickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.frequencyPickerTitle}>Select Frequency</Text>
            <TouchableOpacity
              onPress={() => {
                let newDays = plan.daysOfWeek
                if (pendingFrequency === "Daily" || pendingFrequency === "Monthly") {
                  newDays = ""
                }
                setPlan((prev) => ({
                  ...prev,
                  frequency: pendingFrequency,
                  daysOfWeek: newDays,
                }))
                setShowFrequencyPicker(false)
              }}
            >
              <Text style={styles.frequencyPickerDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.frequencyPickerContent}>
            {FREQUENCY_OPTIONS.map((freq) => (
              <TouchableOpacity
                key={freq.value}
                style={[
                  styles.frequencyOptionCard,
                  pendingFrequency === freq.value && styles.frequencyOptionCardSelected,
                ]}
                onPress={() => setPendingFrequency(freq.value)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={pendingFrequency === freq.value ? [freq.color, freq.color + "20"] : ["#FFFFFF", "#F8FAFC"]}
                  style={styles.frequencyOptionGradient}
                >
                  <View style={styles.frequencyOptionContent}>
                    <View
                      style={[
                        styles.frequencyIconContainer,
                        {
                          backgroundColor:
                            pendingFrequency === freq.value ? "rgba(255,255,255,0.2)" : freq.color + "15",
                        },
                      ]}
                    >
                      <Ionicons
                        name={freq.icon}
                        size={24}
                        color={pendingFrequency === freq.value ? "#FFFFFF" : freq.color}
                      />
                    </View>
                    <View style={styles.frequencyTextContainer}>
                      <Text
                        style={[
                          styles.frequencyOptionText,
                          pendingFrequency === freq.value && styles.frequencyOptionTextSelected,
                        ]}
                      >
                        {freq.label}
                      </Text>
                      <Text
                        style={[
                          styles.frequencyOptionDescription,
                          pendingFrequency === freq.value && styles.frequencyOptionDescriptionSelected,
                        ]}
                      >
                        {freq.description}
                      </Text>
                    </View>
                  </View>
                  {pendingFrequency === freq.value && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderDaySelection = () => {
    // Allow day selection for Weekly and for Daily if daysOfWeek is not empty (custom days)
    if (plan.frequency !== "Weekly" && plan.frequency !== "Daily") return null

    const selectedDays = getSelectedDays()

    return (
      <View style={styles.formGroup}>
        <Text style={styles.label}>Select Days of Week</Text>
        <Text style={styles.daySelectionSubtitle}>Choose which days you want to be reminded</Text>

        <View style={styles.daysContainer}>
          {DAYS_OF_WEEK.map((day, index) => {
            const isSelected = selectedDays.includes(day.value)
            return (
              <TouchableOpacity
                key={day.value}
                style={[styles.dayCard, isSelected && [styles.dayCardSelected, { borderColor: day.color }]]}
                onPress={() => handleDayToggle(day.value)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={isSelected ? [day.color, day.color + "20"] : ["#FFFFFF", "#F8FAFC"]}
                  style={styles.dayCardGradient}
                >
                  <View
                    style={[
                      styles.dayIconContainer,
                      {
                        backgroundColor: isSelected ? "rgba(255,255,255,0.2)" : day.color + "15",
                      },
                    ]}
                  >
                    <Text style={[styles.dayShortText, { color: isSelected ? "#FFFFFF" : day.color }]}>
                      {day.label}
                    </Text>
                  </View>
                  <Text style={[styles.dayFullText, { color: isSelected ? "#FFFFFF" : "#1F2937" }]}>{day.full}</Text>
                  {isSelected && (
                    <View style={styles.dayCheckmark}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )
          })}
        </View>

        <View style={styles.selectedDaysInfo}>
          <Text style={styles.selectedDaysLabel}>Selected Days:</Text>
          <Text style={styles.selectedDaysText}>
            {selectedDays.length > 0
              ? selectedDays.map((d) => DAYS_OF_WEEK.find((dayObj) => dayObj.value === d)?.full || d).join(", ")
              : "No days selected"}
          </Text>
        </View>

        {selectedDays.length === 0 && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={16} color="#EF4444" />
            <Text style={styles.warningText}>Please select at least one day</Text>
          </View>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#06B6D4" />
          <Text style={styles.loadingText}>Loading reminder...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPlan}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const typeConfig = getTypeConfig(plan.type)
  const frequencyConfig = getFrequencyConfig(plan.frequency)

  return (
    <View style={styles.container}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderSelectedType()}

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Reminder Title</Text>
            <TextInput
              style={styles.modernInput}
              value={plan.title}
              onChangeText={(text) => setPlan((prev) => ({ ...prev, title: text }))}
              placeholder="Enter reminder title"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
            />
          </View>

          {QUICK_AMOUNTS[plan.type] && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount/Duration</Text>
              <View style={styles.quickAmountGrid}>
                {QUICK_AMOUNTS[plan.type].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.quickAmountChip, plan.amount === amount && styles.quickAmountChipSelected]}
                    onPress={() => setPlan((prev) => ({ ...prev, amount: amount }))}
                  >
                    <Text style={[styles.quickAmountText, plan.amount === amount && styles.quickAmountTextSelected]}>
                      {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.modernInput, { marginTop: 8 }]}
                value={plan.amount}
                onChangeText={(text) => setPlan((prev) => ({ ...prev, amount: text }))}
                placeholder="Or enter custom amount"
                placeholderTextColor="#9CA3AF"
                maxLength={50}
              />
            </View>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Schedule Settings</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity style={styles.timeInput} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={20} color={typeConfig.color} />
              <Text style={styles.timeText}>{plan.time ? plan.time.slice(0, 5) : "Select time"}</Text>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={plan.time ? new Date(`1970-01-01T${plan.time}`) : new Date()}
                mode="time"
                is24Hour={true}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleTimeChange}
              />
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Frequency</Text>
            <TouchableOpacity
              style={styles.frequencyInput}
              onPress={() => {
                setPendingFrequency(plan.frequency)
                setShowFrequencyPicker(true)
              }}
            >
              <View style={styles.frequencyInputContent}>
                <View style={[styles.frequencyInputIcon, { backgroundColor: frequencyConfig.color + "15" }]}>
                  <Ionicons name={frequencyConfig.icon} size={20} color={frequencyConfig.color} />
                </View>
                <View style={styles.frequencyInputText}>
                  <Text style={styles.frequencyInputLabel}>{plan.frequency}</Text>
                  <Text style={styles.frequencyInputDescription}>{frequencyConfig.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {renderDaySelection()}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Additional Settings</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.modernInput, styles.notesInput]}
              value={plan.notes}
              onChangeText={(text) => setPlan((prev) => ({ ...prev, notes: text }))}
              placeholder="Add any additional notes..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.activeToggle}>
            <View>
              <Text style={styles.label}>Enable Reminder</Text>
              <Text style={styles.toggleDescription}>Turn on to activate this reminder</Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, plan.isActive && styles.toggleActive]}
              onPress={() => setPlan((prev) => ({ ...prev, isActive: !prev.isActive }))}
            >
              <View style={[styles.toggleThumb, plan.isActive && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <LinearGradient colors={["#06B6D4", "#0EA5E9"]} style={styles.saveButtonGradient}>
            {saving ? (
              <View style={styles.savingContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Updating...</Text>
              </View>
            ) : (
              <View style={styles.saveContent}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Update Reminder</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {renderFrequencyPicker()}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  saveHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  saveHeaderButtonDisabled: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  selectedTypeContainer: {
    marginBottom: 24,
  },
  selectedTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  selectedTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  selectedTypeInfo: {
    flex: 1,
  },
  selectedTypeLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  selectedTypeDesc: {
    fontSize: 14,
    color: "#6B7280",
  },
  typeLockedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  typeLockedText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    fontStyle: "italic",
  },
  formSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  modernInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#1F2937",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  timeInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  timeText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
    flex: 1,
    marginLeft: 12,
  },
  frequencyInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  frequencyInputContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  frequencyInputIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  frequencyInputText: {
    flex: 1,
  },
  frequencyInputLabel: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
  },
  frequencyInputDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  quickAmountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  quickAmountChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickAmountChipSelected: {
    backgroundColor: "#06B6D4",
    borderColor: "#06B6D4",
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  quickAmountTextSelected: {
    color: "#FFFFFF",
  },
  daySelectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  daysContainer: {
    gap: 12,
  },
  dayCard: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  dayCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  dayCardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  dayIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  dayShortText: {
    fontSize: 14,
    fontWeight: "700",
  },
  dayFullText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  dayCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDaysInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
  },
  selectedDaysLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
  },
  selectedDaysText: {
    fontSize: 14,
    color: "#6B7280",
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: "#EF4444",
    marginLeft: 6,
    fontStyle: "italic",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  activeToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  toggleDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: "#06B6D4",
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  saveButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#06B6D4",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: "center",
  },
  saveContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  savingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  frequencyPickerModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxHeight: "70%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  frequencyPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  frequencyPickerCancel: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  frequencyPickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  frequencyPickerDone: {
    fontSize: 16,
    color: "#06B6D4",
    fontWeight: "700",
  },
  frequencyPickerContent: {
    padding: 20,
  },
  frequencyOptionCard: {
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  frequencyOptionCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  frequencyOptionGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  frequencyOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  frequencyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  frequencyTextContainer: {
    flex: 1,
  },
  frequencyOptionText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "600",
    marginBottom: 4,
  },
  frequencyOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  frequencyOptionDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  frequencyOptionDescriptionSelected: {
    color: "rgba(255,255,255,0.8)",
  },
  checkmarkContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#06B6D4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
})
