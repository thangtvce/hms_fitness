import { useEffect,useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil";
import Loading from "components/Loading";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { healthyLogService } from "services/apiHealthyLogService";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "components/Header";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";

const { width,height } = Dimensions.get("window");

export default function HealthLogListScreen() {
  const navigation = useNavigation();
  const [logs,setLogs] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [showDeleteModal,setShowDeleteModal] = useState(false);
  const [selectedLog,setSelectedLog] = useState(null);
  const [page,setPage] = useState(1);
  const [totalPages,setTotalPages] = useState(1);
  const [selectedDate,setSelectedDate] = useState(new Date());
  const [showDatePickerModal,setShowDatePickerModal] = useState(false);
  const [isFilterActive,setIsFilterActive] = useState(true);

  useEffect(() => {
    fetchLogs(page);
  },[page,selectedDate,isFilterActive]);

  const fetchLogs = async (pageNumber = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { pageNumber,pageSize: 10 };
      if (isFilterActive) {
        const timezoneOffsetMs = new Date().getTimezoneOffset() * 60000; // Ví dụ: -420 phút → -25200000 ms
        const localStart = new Date(selectedDate);
        localStart.setHours(0,0,0,0);

        const localEnd = new Date(selectedDate);
        localEnd.setHours(23,59,59,999);

        const utcStart = new Date(localStart.getTime() - timezoneOffsetMs);
        const utcEnd = new Date(localEnd.getTime() - timezoneOffsetMs);

        params.startDate = utcStart.toISOString();
        params.endDate = utcEnd.toISOString();
      }

      const data = await healthyLogService.getMyHealthLogs(params);
      console.log(data.logs)
      setLogs(Array.isArray(data.logs || data.logs) ? (data.logs || data.Logs) : []);
      setTotalPages(data.totalPages || data.totalPages || 1);
    } catch (e) {
      showErrorFetchAPI(e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (logId) => {
    try {
      await healthyLogService.deleteHealthLog(logId);
      setShowDeleteModal(false);
      setSelectedLog(null);
      fetchLogs(page);
      showSuccessMessage("Health log deleted successfully");
    } catch (e) {
      showErrorFetchAPI(e);
    }
  };

  const handleDateChange = (event,date) => {
    setShowDatePickerModal(false);
    if (date) {
      setSelectedDate(date);
      setPage(1);
    }
  };

  const toggleDateFilter = () => {
    setIsFilterActive(!isFilterActive);
    setPage(1);
  };

  const resetToToday = () => {
    setSelectedDate(new Date());
    setIsFilterActive(true);
    setPage(1);
  };

  const getDateDisplayText = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate.toDateString() === today.toDateString()) {
      return "Today";
    } else if (selectedDate.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return selectedDate.toLocaleDateString("en-US",{
      month: "short",
      day: "numeric",
      year: selectedDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const getHealthStatus = (type,value) => {
    switch (type) {
      case "heartRate":
        if (value >= 60 && value <= 100) return { color: "#10B981",icon: "checkmark-circle" };
        if (value < 60) return { color: "#F59E0B",icon: "warning" };
        return { color: "#EF4444",icon: "alert-circle" };
      case "bloodOxygen":
        if (value >= 95) return { color: "#10B981",icon: "checkmark-circle" };
        if (value >= 90) return { color: "#F59E0B",icon: "warning" };
        return { color: "#EF4444",icon: "alert-circle" };
      case "sleep":
        if (value >= 7 && value <= 9) return { color: "#10B981",icon: "checkmark-circle" };
        if (value >= 6 && value < 7) return { color: "#F59E0B",icon: "warning" };
        return { color: "#EF4444",icon: "alert-circle" };
      default:
        return { color: "#6B7280",icon: "help-circle" };
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US",{ hour: "2-digit",minute: "2-digit",hour12: true });
  };

  const renderDateFilter = () => (
    <View style={styles.filterContainer}>
      <View style={styles.filterHeader}>
        <View style={styles.filterTitleContainer}>
          <Ionicons name="calendar-outline" size={20} color="#0056D2" />
          <Text style={styles.filterTitle}>Date Filter</Text>
        </View>
        <TouchableOpacity
          onPress={toggleDateFilter}
          style={[styles.filterToggle,isFilterActive && styles.filterToggleActive]}
          accessibilityLabel={isFilterActive ? "Turn off date filter" : "Turn on date filter"}
          accessibilityRole="button"
        >
          <Text style={[styles.filterToggleText,isFilterActive && styles.filterToggleTextActive]}>
            {isFilterActive ? "ON" : "OFF"}
          </Text>
        </TouchableOpacity>
      </View>
      {isFilterActive && (
        <View style={styles.dateControls}>
          <TouchableOpacity
            onPress={() => setShowDatePickerModal(true)}
            style={styles.dateSelector}
            accessibilityLabel="Select date"
            accessibilityRole="button"
          >
            <Ionicons name="calendar" size={18} color="#0056D2" />
            <Text style={styles.dateSelectorText}>{getDateDisplayText()}</Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={resetToToday}
            style={styles.todayButton}
            accessibilityLabel="Reset to today"
            accessibilityRole="button"
          >
            <Ionicons name="today" size={16} color="#10B981" />
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      )}
      {!isFilterActive && <Text style={styles.filterOffText}>Showing all health logs</Text>}
    </View>
  );

  const renderLogItem = ({ item,index }) => {
    const heartRateStatus = getHealthStatus("heartRate",item.heartRate);
    const oxygenStatus = getHealthStatus("bloodOxygen",item.bloodOxygenLevel);
    const sleepStatus = getHealthStatus("sleep",item.sleepDuration);

    return (
      <View style={[styles.logItem,{ marginTop: index === 0 ? 0 : 12 }]}>
        <View style={styles.logHeader}>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.logDate}>{formatDate(item.recordedAt)}</Text>
          </View>
          <View style={styles.logActions}>
            <TouchableOpacity
              onPress={() => navigation.navigate("HealthLogEditScreen",{ logId: item.logId })}
              style={[styles.actionBtn,styles.editBtn]}
              accessibilityLabel="Edit health log"
              accessibilityRole="button"
            >
              <Ionicons name="create-outline" size={18} color="#0056D2" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedLog(item);
                setShowDeleteModal(true);
              }}
              style={[styles.actionBtn,styles.deleteBtn]}
              accessibilityLabel="Delete health log"
              accessibilityRole="button"
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
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
    );
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          disabled={page === 1}
          onPress={() => setPage(page - 1)}
          style={[styles.paginationBtn,page === 1 && styles.paginationBtnDisabled]}
          accessibilityLabel="Previous page"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={20} color={page === 1 ? "#9CA3AF" : "#0056D2"} />
          <Text style={[styles.paginationText,page === 1 && styles.paginationTextDisabled]}>Previous</Text>
        </TouchableOpacity>
        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>
            {page} of {totalPages}
          </Text>
        </View>
        <TouchableOpacity
          disabled={page === totalPages}
          onPress={() => setPage(page + 1)}
          style={[styles.paginationBtn,page === totalPages && styles.paginationBtnDisabled]}
          accessibilityLabel="Next page"
          accessibilityRole="button"
        >
          <Text style={[styles.paginationText,page === totalPages && styles.paginationTextDisabled]}>Next</Text>
          <Ionicons name="chevron-forward" size={20} color={page === totalPages ? "#9CA3AF" : "#0056D2"} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>
        {isFilterActive ? `No Logs for ${getDateDisplayText()}` : "No Health Logs"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isFilterActive ? "Try another date or disable the filter" : "Start tracking your health data"}
      </Text>
      {isFilterActive ? (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={toggleDateFilter}
          accessibilityLabel="Show all logs"
          accessibilityRole="button"
        >
          <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Show All Logs</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate("HealthLogCreateScreen")}
          accessibilityLabel="Create new health log"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Create Log</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Failed to Load Logs</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => fetchLogs(page)}
        accessibilityLabel="Retry loading logs"
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={20} color="#0056D2" />
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <CommonSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Health Logs"
        subtitle={isFilterActive ? `${getDateDisplayText()}'s Health Data` : "Your Health History"}
        onBack={() => navigation.goBack()}
        rightActions={[{
          icon: "add",
          onPress: () => navigation.navigate("HealthLogCreateScreen"),
          color: "#0056D2",
          accessibilityLabel: "Create new health log",
          accessibilityRole: "button",
        }]}
        absolute
        backgroundColor="#FFFFFF"
        textColor="#1E293B"
      />
      <View style={styles.headerSpacer} />
      {renderDateFilter()}
      <View style={styles.content}>
        {error ? (
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
      <Modal
        visible={showDatePickerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowDatePickerModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.datePickerModal}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Select Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowDatePickerModal(false)}
                    style={styles.closeButton}
                    accessibilityLabel="Close date picker"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
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
                style={[styles.modalButton,styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
                accessibilityLabel="Cancel delete"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton,styles.deleteButton]}
                onPress={() => handleDelete(selectedLog?.logId)}
                accessibilityLabel="Confirm delete"
                accessibilityRole="button"
              >
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  headerSpacer: {
    height: 80,
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
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
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  filterToggle: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: "center",
  },
  filterToggleActive: {
    backgroundColor: "#0056D2",
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterToggleTextActive: {
    color: "#FFFFFF",
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
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "500",
  },
  todayButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: 20
  },
  listContainer: {
    paddingBottom: 80,
  },
  logItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  logActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  editBtn: {
    backgroundColor: "#EFF6FF",
  },
  deleteBtn: {
    backgroundColor: "#FEF2F2",
  },
  vitalSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
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
    gap: 6,
    marginBottom: 8,
  },
  vitalValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
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
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  wellnessValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  wellnessValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  wellnessSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  paginationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
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
    color: "#0056D2",
  },
  paginationTextDisabled: {
    color: "#9CA3AF",
  },
  pageIndicator: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  pageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    minHeight: height - 200,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056D2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    minHeight: height - 200,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EF4444",
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0056D2",
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0056D2",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 8,
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
    color: "#1E293B",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  datePickerModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 340,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  closeButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
});