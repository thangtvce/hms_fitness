
import { useEffect, useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { healthyLogService } from "services/apiHealthyLogService"
import { useNavigation } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import Header from "components/Header"

export default function HealthLogListScreen() {
  const navigation = useNavigation()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Date filtering states
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [isFilterActive, setIsFilterActive] = useState(true) // Default to today's filter

  useEffect(() => {
    fetchLogs(page)
  }, [page, selectedDate, isFilterActive])

  const fetchLogs = async (pageNumber = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = { pageNumber, pageSize: 10 }

      // Add date filter if active
      if (isFilterActive) {
        const startOfDay = new Date(selectedDate)
        startOfDay.setHours(0, 0, 0, 0)

        const endOfDay = new Date(selectedDate)
        endOfDay.setHours(23, 59, 59, 999)

        params.startDate = startOfDay.toISOString()
        params.endDate = endOfDay.toISOString()
      }

      const data = await healthyLogService.getMyHealthLogs(params)
      setLogs(data.logs || data.Logs || [])
      setTotalPages(data.totalPages || data.TotalPages || 1)
    } catch (e) {
      setError(e.message || "Error loading health logs")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (logId) => {
    try {
      await healthyLogService.deleteHealthLog(logId)
      setShowDeleteModal(false)
      setSelectedLog(null)
      fetchLogs(page)
      Alert.alert("Success", "Health log deleted successfully.")
    } catch (e) {
      Alert.alert("Error", e.message || "Unable to delete health log.")
    }
  }

  const handleDateChange = (event, date) => {
    setShowDatePicker(false)
    if (date) {
      setSelectedDate(date)
      setPage(1) // Reset to first page when date changes
    }
  }

  const toggleDateFilter = () => {
    setIsFilterActive(!isFilterActive)
    setPage(1) // Reset to first page when toggling filter
  }

  const resetToToday = () => {
    setSelectedDate(new Date())
    setIsFilterActive(true)
    setPage(1)
  }

  const getDateDisplayText = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (selectedDate.toDateString() === today.toDateString()) {
      return "Today"
    } else if (selectedDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return selectedDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: selectedDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      })
    }
  }

  const getHealthStatus = (type, value) => {
    switch (type) {
      case "heartRate":
        if (value >= 60 && value <= 100) return { color: "#10B981", icon: "checkmark-circle" }
        if (value < 60) return { color: "#F59E0B", icon: "warning" }
        return { color: "#EF4444", icon: "alert-circle" }

      case "bloodOxygen":
        if (value >= 95) return { color: "#10B981", icon: "checkmark-circle" }
        if (value >= 90) return { color: "#F59E0B", icon: "warning" }
        return { color: "#EF4444", icon: "alert-circle" }

      case "sleep":
        if (value >= 7 && value <= 9) return { color: "#10B981", icon: "checkmark-circle" }
        if (value >= 6 && value < 7) return { color: "#F59E0B", icon: "warning" }
        return { color: "#EF4444", icon: "alert-circle" }

      default:
        return { color: "#6B7280", icon: "help-circle" }
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
  }

  const renderDateFilter = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterHeader}>
        <View style={styles.filterTitleContainer}>
          <Ionicons name="calendar-outline" size={20} color="#0056d2" />
          <Text style={styles.filterTitle}>Date Filter</Text>
        </View>
        <TouchableOpacity
          onPress={toggleDateFilter}
          style={[styles.filterToggle, isFilterActive && styles.filterToggleActive]}
        >
          <Text style={[styles.filterToggleText, isFilterActive && styles.filterToggleTextActive]}>
            {isFilterActive ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>

      {isFilterActive && (
        <View style={styles.dateControls}>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateSelector}>
            <Ionicons name="calendar" size={18} color="#0056d2" />
            <Text style={styles.dateSelectorText}>{getDateDisplayText()}</Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>

          <TouchableOpacity onPress={resetToToday} style={styles.todayButton}>
            <Ionicons name="today" size={16} color="#10B981" />
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isFilterActive && <Text style={styles.filterOffText}>Showing all health logs</Text>}
    </View>
  )

  const renderLogItem = ({ item, index }) => {
    const heartRateStatus = getHealthStatus("heartRate", item.heartRate)
    const oxygenStatus = getHealthStatus("bloodOxygen", item.bloodOxygenLevel)
    const sleepStatus = getHealthStatus("sleep", item.sleepDuration)

    return (
      <View style={[styles.logItem, { marginTop: index === 0 ? 0 : 12 }]}>
        {/* Header */}
        <View style={styles.logHeader}>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.logDate}>{formatDate(item.recordedAt)}</Text>
          </View>
          <View style={styles.logActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate("HealthLogEditScreen", { logId: item.logId })}
              style={[styles.actionBtn, styles.editBtn]}
            >
              <Ionicons name="create-outline" size={18} color="#4F46E5" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedLog(item)
                setShowDeleteModal(true)
              }}
              style={[styles.actionBtn, styles.deleteBtn]}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Vital Signs */}
        <View style={styles.vitalSection}>
          <Text style={styles.sectionTitle}>Vital Signs</Text>
          <View style={styles.vitalGrid}>
            <View style={styles.vitalItem}>
              <View style={styles.vitalHeader}>
                <Ionicons name="heart" size={20} color="#EF4444" />
                <Ionicons name={heartRateStatus.icon} size={14} color={heartRateStatus.color} />
              </View>
              <Text style={styles.vitalValue}>{item.heartRate}</Text>
              <Text style={styles.vitalUnit}>bpm</Text>
            </View>

            <View style={styles.vitalItem}>
              <View style={styles.vitalHeader}>
                <Ionicons name="water" size={20} color="#3B82F6" />
                <Ionicons name={oxygenStatus.icon} size={14} color={oxygenStatus.color} />
              </View>
              <Text style={styles.vitalValue}>{item.bloodOxygenLevel}</Text>
              <Text style={styles.vitalUnit}>%</Text>
            </View>

            <View style={styles.vitalItem}>
              <View style={styles.vitalHeader}>
                <Ionicons name="fitness" size={20} color="#10B981" />
              </View>
              <Text style={styles.vitalValue}>{item.bloodPressure}</Text>
              <Text style={styles.vitalUnit}>mmHg</Text>
            </View>
          </View>
        </View>

        {/* Wellness Metrics */}
        <View style={styles.wellnessSection}>
          <Text style={styles.sectionTitle}>Wellness</Text>
          <View style={styles.wellnessGrid}>
            <View style={styles.wellnessItem}>
              <Ionicons name="bed" size={18} color="#8B5CF6" />
              <View style={styles.wellnessContent}>
                <Text style={styles.wellnessLabel}>Sleep</Text>
                <View style={styles.wellnessValueRow}>
                  <Text style={styles.wellnessValue}>{item.sleepDuration}h</Text>
                  <Ionicons name={sleepStatus.icon} size={12} color={sleepStatus.color} />
                </View>
                <Text style={styles.wellnessSubtext}>Quality: {item.sleepQuality}</Text>
              </View>
            </View>

            <View style={styles.wellnessItem}>
              <Ionicons name="thunderstorm" size={18} color="#F59E0B" />
              <View style={styles.wellnessContent}>
                <Text style={styles.wellnessLabel}>Stress</Text>
                <Text style={styles.wellnessValue}>{item.stressLevel}</Text>
              </View>
            </View>

            <View style={styles.wellnessItem}>
              <Ionicons name="happy" size={18} color="#EC4899" />
              <View style={styles.wellnessContent}>
                <Text style={styles.wellnessLabel}>Mood</Text>
                <Text style={styles.wellnessValue}>{item.mood}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          disabled={page === 1}
          onPress={() => setPage(page - 1)}
          style={[styles.paginationBtn, page === 1 && styles.paginationBtnDisabled]}
        >
          <Ionicons name="chevron-back" size={20} color={page === 1 ? "#9CA3AF" : "#4F46E5"} />
          <Text style={[styles.paginationText, page === 1 && styles.paginationTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>
            {page} of {totalPages}
          </Text>
        </View>

        <TouchableOpacity
          disabled={page === totalPages}
          onPress={() => setPage(page + 1)}
          style={[styles.paginationBtn, page === totalPages && styles.paginationBtnDisabled]}
        >
          <Text style={[styles.paginationText, page === totalPages && styles.paginationTextDisabled]}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={page === totalPages ? "#9CA3AF" : "#4F46E5"} />
        </TouchableOpacity>
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>
        {isFilterActive ? `No Health Logs for ${getDateDisplayText()}` : "No Health Logs Yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isFilterActive
          ? "Try selecting a different date or turn off the date filter"
          : "Start tracking your health by creating your first log"}
      </Text>
      {isFilterActive ? (
        <TouchableOpacity style={styles.emptyButton} onPress={toggleDateFilter}>
          <Ionicons name="calendar-outline" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Show All Logs</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate("HealthLogCreateScreen")}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Create First Log</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Unable to Load Logs</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchLogs(page)}>
        <Ionicons name="refresh" size={20} color="#4F46E5" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Unified Header with rightActions for + button */}
      <Header
        title="Health Logs"
        subtitle={isFilterActive ? `${getDateDisplayText()}'s health data` : "Your complete health history"}
        onBack={() => navigation.goBack()}
        rightActions={[{
          icon: "add",
          onPress: () => navigation.navigate("HealthLogCreateScreen"),
          color: "#0056d2"
        }]}
        absolute
        backgroundColor="#fff"
        textColor="#1F2937"
      />
      {/* Push content below header */}
      <View style={{ height: 90 }} />

      {/* Date Filter */}
      {renderDateFilter()}

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading health logs...</Text>
          </View>
        ) : error ? (
          renderErrorState()
        ) : logs.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <FlatList
              data={logs}
              keyExtractor={(item) => item.logId?.toString()}
              renderItem={renderLogItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
            {renderPagination()}
          </>
        )}
      </View>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Ionicons name="trash" size={32} color="#EF4444" />
              <Text style={styles.modalTitle}>Delete Health Log</Text>
              <Text style={styles.modalMessage}>
                Are you sure you want to delete this health log? This action cannot be undone.
              </Text>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={() => handleDelete(selectedLog?.logId)}
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  // Header styles are now handled by the shared Header component
  filterContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  filterTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  filterToggle: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: "center",
  },
  filterToggleActive: {
    backgroundColor: "#0056d2",
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterToggleTextActive: {
    color: "#fff",
  },
  dateControls: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  dateSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  filterOffText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  logItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  logActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "#EEF2FF",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
  },
  vitalSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16, // Đề mục lớn: 16
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
  },
  vitalGrid: {
    flexDirection: "row",
    gap: 12,
  },
  vitalItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  vitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  vitalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
  },
  vitalUnit: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  wellnessSection: {
    marginBottom: 8,
  },
  wellnessGrid: {
    gap: 8,
  },
  wellnessItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  wellnessContent: {
    flex: 1,
  },
  wellnessLabel: {
    fontSize: 14, // Label nhỏ: 14
    color: "#6B7280",
    marginBottom: 2,
  },
  wellnessValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  wellnessValue: {
    fontSize: 12, // Giá trị/Value: 12
    fontWeight: "600",
    color: "#1F2937",
  },
  wellnessSubtext: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 4,
  },
  paginationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  paginationBtnDisabled: {
    backgroundColor: "#F3F4F6",
    shadowOpacity: 0,
    elevation: 0,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  paginationTextDisabled: {
    color: "#9CA3AF",
  },
  pageIndicator: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#EF4444",
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4F46E5",
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
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
    padding: 24,
    width: "100%",
    maxWidth: 340,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 12,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
})
