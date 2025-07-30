import React,{ useEffect,useState,useRef } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"
import Loading from "components/Loading"
import Header from "components/Header"
import { Ionicons } from "@expo/vector-icons"
import { healthyLogService } from "services/apiHealthyLogService"
import { useNavigation,useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton"

const { width,height } = Dimensions.get("window")

export default function HealthLogOverviewScreen() {
  const navigation = useNavigation()
  const [logs,setLogs] = useState([])
  const [stats,setStats] = useState(null)
  const [loading,setLoading] = useState(true)
  const [loadingStats,setLoadingStats] = useState(true)
  const [error,setError] = useState(null)
  const [showDeleteModal,setShowDeleteModal] = useState(false)
  const [selectedLog,setSelectedLog] = useState(null)


  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    fetchLogs()
    fetchStats()
    startAnimations()
  },[])

  useFocusEffect(
    React.useCallback(() => {
      fetchLogs()
      fetchStats()
    },[]),
  )

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim,{
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const fetchLogs = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await healthyLogService.getMyHealthLogs({ pageNumber: 1,pageSize: 5 })
      setLogs(data.logs || data.Logs || [])
    } catch (e) {
      showErrorFetchAPI(e);
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    setLoadingStats(true)
    try {
      const data = await healthyLogService.getMyHealthLogStatistics()
      setStats(data)
    } catch (e) {
      setStats(null);
      showErrorFetchAPI(e);
    } finally {
      setLoadingStats(false)
    }
  }

  const handleDelete = async (logId) => {
    try {
      await healthyLogService.deleteHealthLog(logId)
      setShowDeleteModal(false)
      setSelectedLog(null)
      fetchLogs()
      fetchStats()
      showSuccessMessage("Health log deleted successfully.")
    } catch (e) {
      showErrorFetchAPI(e)
    }
  }

  const renderHealthOverview = () => {
    if (loadingStats) {
      return (
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666" />
            <CommonSkeleton />
          </View>
        </View>
      )
    }

    if (!stats) {
      return (
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No Health Data</Text>
            <Text style={styles.noDataSubtext}>Start logging to see your health metrics</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("HealthLogCreateScreen")}>
              <Text style={styles.addButtonText}>Add First Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }

    const heartRate = Math.round(stats.averageHeartRate)
    const bloodOxygen = Math.round(stats.averageBloodOxygenLevel)
    const sleepDuration = stats.averageSleepDuration
    const stressLevel = 5

    return (
      <View style={styles.overviewContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <TouchableOpacity style={styles.addIconButton} onPress={() => navigation.navigate("HealthLogCreateScreen")}>
            <Ionicons name="add" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{heartRate}</Text>
            <Text style={styles.metricLabel}>Heart Rate (BPM)</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{bloodOxygen}%</Text>
            <Text style={styles.metricLabel}>Blood O₂</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{sleepDuration}h</Text>
            <Text style={styles.metricLabel}>Sleep</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stressLevel}/10</Text>
            <Text style={styles.metricLabel}>Stress</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderRecentLogs = () => (
    <View style={styles.logsContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Logs</Text>
        <TouchableOpacity onPress={() => navigation.navigate("HealthLogListScreen")}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#666" />
          <CommonSkeleton />
        </View>
      ) : logs.length > 0 ? (
        logs.slice(0,3).map((item,index) => (
          <View key={item.logId} style={styles.logCard}>
            <View style={styles.logHeader}>
              <View>
                <Text style={styles.logDate}>
                  {new Date(item.recordedAt).toLocaleDateString("en-US",{
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <Text style={styles.logTime}>
                  {new Date(item.recordedAt).toLocaleTimeString("en-US",{
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={styles.logActions}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("HealthLogEditScreen",{ logId: item.logId })}
                  style={styles.actionButton}
                >
                  <Ionicons name="pencil" size={16} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedLog(item)
                    setShowDeleteModal(true)
                  }}
                  style={styles.actionButton}
                >
                  <Ionicons name="trash" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.logMetrics}>
              <Text style={styles.logMetricText}>Heart: {item.heartRate} BPM</Text>
              <Text style={styles.logMetricText}>O₂: {item.bloodOxygenLevel}%</Text>
              <Text style={styles.logMetricText}>Sleep: {item.sleepDuration}h</Text>
              <Text style={styles.logMetricText}>Stress: {item.stressLevel || 5}/10</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No logs yet</Text>
          <Text style={styles.noDataSubtext}>Start tracking your health journey</Text>
        </View>
      )}
    </View>
  )

  if (loading && !logs.length) {
    return (
      <View style={styles.container}>
        <CommonSkeleton />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Health dashboard"
          showBack
          onBack={() => navigation.goBack()}
          rightButtonIcon="add"
          onRightButtonPress={() => navigation.navigate("HealthLogCreateScreen")}
          style={{ backgroundColor: "#FFFFFF" }}
        />

        <ScrollView style={[styles.scrollContainer]} showsVerticalScrollIndicator={false}>
          {renderHealthOverview()}
          {renderRecentLogs()}
        </ScrollView>

        <Modal visible={showDeleteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContainer,{ transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="trash" size={24} color="#EF4444" />
                </View>
                <Text style={styles.modalTitle}>Delete Health Log</Text>
                <Text style={styles.modalMessage}>
                  Are you sure you want to delete this health log? This action cannot be undone.
                </Text>
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowDeleteModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteModalButton} onPress={() => handleDelete(selectedLog?.logId)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    marginTop: 70
  },

  // Overview Section
  overviewContainer: {
    marginBottom: 24,
    paddingTop: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  addIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },

  // Metrics Grid
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },

  // Recent Logs Section
  logsContainer: {
    marginBottom: 30,
  },
  viewAllText: {
    color: "#007AFF",
    fontWeight: "500",
    fontSize: 14,
  },
  logCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logDate: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 2,
  },
  logTime: {
    fontSize: 12,
    color: "#666",
  },
  logActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  logMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  logMetricText: {
    fontSize: 12,
    color: "#666",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  // Loading & No Data
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 300,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    backgroundColor: "#FF3B30",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
})
