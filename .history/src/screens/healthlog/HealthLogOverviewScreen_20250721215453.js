
import React, { useEffect, useState, useRef } from "react"
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
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import Loading from "components/Loading"
import Header from "components/Header"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { healthyLogService } from "services/apiHealthyLogService"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { SafeAreaView } from "react-native-safe-area-context"
import { LinearGradient } from "expo-linear-gradient"

const { width, height } = Dimensions.get("window")

export default function HealthLogOverviewScreen() {
  const navigation = useNavigation()
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    fetchLogs()
    fetchStats()
    startAnimations()
  }, [])

  // Refetch logs and stats when screen is focused (after add/edit)
  useFocusEffect(
    React.useCallback(() => {
      fetchLogs()
      fetchStats()
    }, []),
  )

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
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
      const data = await healthyLogService.getMyHealthLogs({ pageNumber: 1, pageSize: 5 })
      setLogs(data.logs || data.Logs || [])
    } catch (e) {
      setError(e.message || "Error loading health logs")
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
      setStats(null)
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
      showErrorFetchAPI(e.message || "Unable to delete health log.")
    }
  }

  const getHealthStatus = (type, value) => {
    switch (type) {
      case "heartRate":
        if (value >= 60 && value <= 100)
          return { status: "Normal", color: "#0056d2", bgColor: "#E3F2FD", textColor: "#0056d2", alert: false }
        if (value < 60)
          return { status: "Low", color: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", alert: true }
        return { status: "High", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#DC2626", alert: true }
      case "bloodOxygen":
        if (value >= 95)
          return { status: "Normal", color: "#0056d2", bgColor: "#E3F2FD", textColor: "#0056d2", alert: false }
        if (value >= 90)
          return { status: "Low", color: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", alert: true }
        return { status: "Critical", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#DC2626", alert: true }
      case "sleep":
        if (value >= 7 && value <= 9)
          return { status: "Optimal", color: "#0056d2", bgColor: "#E3F2FD", textColor: "#0056d2", alert: false }
        if (value >= 6 && value < 7)
          return { status: "Low", color: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", alert: true }
        return { status: "Poor", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#DC2626", alert: true }
      case "stress":
        if (value <= 3)
          return { status: "Low", color: "#0056d2", bgColor: "#E3F2FD", textColor: "#0056d2", alert: false }
        if (value <= 6)
          return { status: "Moderate", color: "#F59E0B", bgColor: "#FEF3C7", textColor: "#92400E", alert: true }
        return { status: "High", color: "#EF4444", bgColor: "#FEE2E2", textColor: "#DC2626", alert: true }
      default:
        return { status: "Unknown", color: "#6B7280", bgColor: "#F3F4F6", textColor: "#374151", alert: false }
    }
  }

  const renderHealthOverview = () => {
    if (loadingStats) {
      return (
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0056d2" />
            <Text style={styles.loadingText}>Loading health data...</Text>
          </View>
        </View>
      )
    }

    if (!stats) {
      return (
        <View style={styles.overviewContainer}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <View style={styles.noDataContainer}>
            <MaterialCommunityIcons name="heart-pulse" size={64} color="#CBD5E1" />
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
    const stressLevel = 5 // Default stress level

    const heartHealth = getHealthStatus("heartRate", heartRate)
    const oxygenHealth = getHealthStatus("bloodOxygen", bloodOxygen)
    const sleepHealth = getHealthStatus("sleep", sleepDuration)
    const stressHealth = getHealthStatus("stress", stressLevel)

    return (
      <Animated.View
        style={[
          styles.overviewContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Health Overview</Text>
          <TouchableOpacity style={styles.addIconButton} onPress={() => navigation.navigate("HealthLogCreateScreen")}>
            <Ionicons name="add" size={20} color="#0056d2" />
          </TouchableOpacity>
        </View>

        <View style={styles.metricsGrid}>
          {/* Heart Rate */}
          <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.mainMetricCard}>
            <View style={styles.metricIcon}>
              <Ionicons name="heart" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.metricContent}>
              <Text style={styles.metricValue}>{heartRate}</Text>
              <Text style={styles.metricUnit}>BPM</Text>
              <Text style={styles.metricLabel}>Heart Rate</Text>
              <Text style={styles.metricStatus}>{heartHealth.status}</Text>
            </View>
            {heartHealth.alert && <View style={styles.alertDot} />}
          </LinearGradient>

          {/* Sub metrics */}
          <View style={styles.subMetricsRow}>
            <View style={[styles.subMetricCard, { backgroundColor: oxygenHealth.bgColor }]}>
              <View style={[styles.subMetricIcon, { backgroundColor: oxygenHealth.color }]}>
                <MaterialCommunityIcons name="lungs" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.subMetricValue, { color: oxygenHealth.textColor }]}>{bloodOxygen}%</Text>
              <Text style={styles.subMetricLabel}>Blood O₂</Text>
              {oxygenHealth.alert && <View style={styles.subAlertDot} />}
            </View>

            <View style={[styles.subMetricCard, { backgroundColor: sleepHealth.bgColor }]}>
              <View style={[styles.subMetricIcon, { backgroundColor: sleepHealth.color }]}>
                <Ionicons name="bed" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.subMetricValue, { color: sleepHealth.textColor }]}>{sleepDuration}h</Text>
              <Text style={styles.subMetricLabel}>Sleep</Text>
              {sleepHealth.alert && <View style={styles.subAlertDot} />}
            </View>

            <View style={[styles.subMetricCard, { backgroundColor: stressHealth.bgColor }]}>
              <View style={[styles.subMetricIcon, { backgroundColor: stressHealth.color }]}>
                <MaterialCommunityIcons name="brain" size={16} color="#FFFFFF" />
              </View>
              <Text style={[styles.subMetricValue, { color: stressHealth.textColor }]}>{stressLevel}/10</Text>
              <Text style={styles.subMetricLabel}>Stress</Text>
              {stressHealth.alert && <View style={styles.subAlertDot} />}
            </View>
          </View>
        </View>
      </Animated.View>
    )
  }

  const renderRecentLogs = () => (
    <Animated.View
      style={[
        styles.logsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Logs</Text>
        <TouchableOpacity onPress={() => navigation.navigate("HealthLogListScreen")}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#0056d2" />
          <Text style={styles.loadingText}>Loading logs...</Text>
        </View>
      ) : logs.length > 0 ? (
        logs.slice(0, 3).map((item, index) => (
          <View key={item.logId} style={styles.logCard}>
            <View style={styles.logHeader}>
              <View style={styles.logDateContainer}>
                <Text style={styles.logDate}>
                  {new Date(item.recordedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <Text style={styles.logTime}>
                  {new Date(item.recordedAt).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <View style={styles.logActions}>
                <TouchableOpacity
                  onPress={() => navigation.navigate("HealthLogEditScreen", { logId: item.logId })}
                  style={styles.editButton}
                >
                  <Ionicons name="pencil" size={16} color="#0056d2" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedLog(item)
                    setShowDeleteModal(true)
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.logMetrics}>
              <View style={styles.logMetric}>
                <View style={styles.logMetricIcon}>
                  <Ionicons name="heart" size={12} color="#EF4444" />
                </View>
                <Text style={styles.logMetricText}>{item.heartRate} BPM</Text>
              </View>
              <View style={styles.logMetric}>
                <View style={styles.logMetricIcon}>
                  <MaterialCommunityIcons name="lungs" size={12} color="#0056d2" />
                </View>
                <Text style={styles.logMetricText}>{item.bloodOxygenLevel}%</Text>
              </View>
              <View style={styles.logMetric}>
                <View style={styles.logMetricIcon}>
                  <Ionicons name="bed" size={12} color="#8B5CF6" />
                </View>
                <Text style={styles.logMetricText}>{item.sleepDuration}h</Text>
              </View>
              <View style={styles.logMetric}>
                <View style={styles.logMetricIcon}>
                  <MaterialCommunityIcons name="brain" size={12} color="#F59E0B" />
                </View>
                <Text style={styles.logMetricText}>{item.stressLevel || 5}/10</Text>
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.noDataContainer}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#CBD5E1" />
          <Text style={styles.noDataText}>No logs yet</Text>
          <Text style={styles.noDataSubtext}>Start tracking your health journey</Text>
        </View>
      )}
    </Animated.View>
  )

  if (loading && !logs.length) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <Loading backgroundColor="rgba(255,255,255,0.9)" text="Loading health overview..." />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Health Dashboard"
          subtitle="Track your wellness journey"
          showBack
          onBack={() => navigation.goBack()}
          rightButtonIcon="add"
          onRightButtonPress={() => navigation.navigate("HealthLogCreateScreen")}
          style={{ backgroundColor: "#0056d2" }}
        />

        <ScrollView style={[styles.scrollContainer, { marginTop: 50 }]} showsVerticalScrollIndicator={false}>
          {renderHealthOverview()}
          {renderRecentLogs()}
        </ScrollView>

        <Modal visible={showDeleteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Animated.View style={[styles.modalContainer, { transform: [{ scale: scaleAnim }] }]}>
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
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },

  // Overview Section
  overviewContainer: {
    marginBottom: 24,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  addIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },

  // Metrics Grid
  metricsGrid: {
    gap: 16,
  },
  mainMetricCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    position: "relative",
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginBottom: 4,
  },
  metricStatus: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  alertDot: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  // Sub Metrics
  subMetricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  subMetricCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  subMetricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  subMetricValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  subMetricLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },
  subAlertDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },

  // Recent Logs Section
  logsContainer: {
    marginBottom: 30,
  },
  viewAllText: {
    color: "#0056d2",
    fontWeight: "600",
    fontSize: 14,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logDateContainer: {
    flex: 1,
  },
  logDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  logTime: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  logActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  logMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  logMetric: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: "22%",
  },
  logMetricIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  logMetricText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Loading & No Data
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 12,
    fontWeight: "500",
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: "#0056d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  deleteModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#EF4444",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})
