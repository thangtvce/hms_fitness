import { useState, useContext } from "react"
import {
  Keyboard,
  TouchableWithoutFeedback,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  FlatList,
} from "react-native"
import { useNavigation } from "@react-navigation/native"

import { LinearGradient } from "expo-linear-gradient"
import ticketService from "services/apiTicketService"
import { AuthContext } from "context/AuthContext"
import { SafeAreaView } from "react-native-safe-area-context"
import Header from '../../components/Header';
import SelectModal from '../../components/SelectModal';

const categoryOptions = [
  { value: "Technical", label: "Technical Issue" },
  { value: "Billing", label: "Billing or Payment Issue" },
  { value: "WorkoutPlan", label: "Workout Plan Inquiry" },
  { value: "Account", label: "Account Problem" },
  { value: "MobileApp", label: "Mobile App Error" },
  { value: "FeatureRequest", label: "Feature Request" },
  { value: "Feedback", label: "General Feedback" },
  { value: "Other", label: "Other / Not Listed" },
]

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
]

const CreateTicketScreen = () => {
  const navigation = useNavigation()
  const { token } = useContext(AuthContext)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState("medium")
  const [category, setCategory] = useState("Technical")
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [showPriorityModal, setShowPriorityModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const validateForm = () => {
    const newErrors = {}

    // Title
    if (!title.trim()) {
      newErrors.title = "Title is required."
    } else if (title.length > 255) {
      newErrors.title = "Title cannot exceed 255 characters."
    }

    // Description
    if (!description.trim()) {
      newErrors.description = "Description is required."
    } else if (description.length > 1000) {
      newErrors.description = "Description cannot exceed 1000 characters."
    }

    // Priority
    const validPriorities = ["low", "medium", "high"]
    if (!priority) {
      newErrors.priority = "Priority is required."
    } else if (priority.length > 20) {
      newErrors.priority = "Priority cannot exceed 20 characters."
    } else if (!validPriorities.includes(priority.toLowerCase())) {
      newErrors.priority = `Priority must be one of: ${validPriorities.join(", ")}.`
    }

    // Status (always 'open' here, but validate length and value)
    const validStatuses = ["open", "inprogress", "resolved"]
    const status = "open"
    if (status && status.length > 20) {
      newErrors.status = "Status cannot exceed 20 characters."
    } else if (status && !validStatuses.includes(status.toLowerCase())) {
      newErrors.status = `Status must be one of: ${validStatuses.join(", ")}.`
    }

    // Category
    const validCategories = [
      "Technical",
      "Billing",
      "WorkoutPlan",
      "Account",
      "MobileApp",
      "FeatureRequest",
      "Feedback",
      "Other",
    ]
    if (category && !validCategories.includes(category)) {
      newErrors.category = `Category must be one of: ${validCategories.join(", ")}.`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      await ticketService.createTicket({
        title: title.trim(),
        description: description.trim(),
        priority: priority.toLowerCase(),
        status: "Open",
        category,
      })

      Alert.alert("Success", "Ticket created successfully!", [{ text: "OK", onPress: () => navigation.goBack() }])
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to create ticket")
    } finally {
      setLoading(false)
    }
  }

  const renderError = (field) => {
    if (errors[field]) {
      return <Text style={styles.errorText}>{errors[field]}</Text>
    }
    return null
  }

  // Use SelectModal component instead of custom renderSelectModal

  const getPriorityLabel = () => priorityOptions.find((opt) => opt.value === priority)?.label || "Select Priority"
  const getCategoryLabel = () => categoryOptions.find((opt) => opt.value === category)?.label || "Select Category"

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Create Support Ticket"
        onBack={() => navigation.goBack()}
        absolute
      />
      <View style={{ height: 90 }} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Title Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                value={title}
                onChangeText={setTitle}
                placeholder="Brief description of your issue"
                placeholderTextColor="#9CA3AF"
                maxLength={255}
              />
              <Text style={styles.charCount}>{title.length}/255</Text>
              {renderError("title")}
            </View>

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.textArea, errors.description && styles.inputError]}
                value={description}
                onChangeText={setDescription}
                placeholder="Please provide detailed information about your issue..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{description.length}/1000</Text>
              {renderError("description")}
            </View>

            {/* Priority Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Priority *</Text>
              <TouchableOpacity
                style={[styles.selectButton, errors.priority && styles.inputError]}
                onPress={() => setShowPriorityModal(true)}
              >
                <Text style={styles.selectButtonText}>{getPriorityLabel()}</Text>
                <Text style={styles.selectArrow}>▼</Text>
              </TouchableOpacity>
              <SelectModal
                visible={showPriorityModal}
                title="Select Priority"
                options={priorityOptions.map(opt => ({ label: opt.label, value: opt.value }))}
                selectedValue={priority}
                onSelect={val => setPriority(val)}
                onClose={() => setShowPriorityModal(false)}
              />
              {renderError("priority")}
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={[styles.selectButton, errors.category && styles.inputError]}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={styles.selectButtonText}>{getCategoryLabel()}</Text>
                <Text style={styles.selectArrow}>▼</Text>
              </TouchableOpacity>
              <SelectModal
                visible={showCategoryModal}
                title="Select Category"
                options={categoryOptions.map(opt => ({ label: opt.label, value: opt.value }))}
                selectedValue={category}
                onSelect={val => setCategory(val)}
                onClose={() => setShowCategoryModal(false)}
              />
              {renderError("category")}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: '#fff', borderWidth: 1, borderColor: '#111', shadowColor: 'transparent', elevation: 0 },
                loading && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#111" size="small" />
              ) : (
                <Text style={[styles.submitButtonText, { color: '#111' }]}>Submit Ticket</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Priority Modal & Category Modal now handled by SelectModal */}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#111827",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#111827",
    minHeight: 120,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  charCount: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
    marginTop: 4,
  },
  selectButton: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  selectArrow: {
    fontSize: 12,
    color: "#6B7280",
  },
  submitButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#111",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "transparent",
    elevation: 0,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#111",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxHeight: "60%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
    textAlign: "center",
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalOptionSelected: {
    backgroundColor: "#E5E7EB", // light gray
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  modalOptionTextSelected: {
    color: "#111827",
    fontWeight: "600",
  },
})

export default CreateTicketScreen
