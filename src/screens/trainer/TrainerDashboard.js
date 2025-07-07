"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  RefreshControl,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import { useAuth } from "context/AuthContext"
import { StatusBar } from "expo-status-bar"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { useNavigation } from "@react-navigation/native"
import { trainerService } from "services/apiTrainerService"
import { LineChart, ProgressChart } from "react-native-chart-kit"

const { width, height } = Dimensions.get("window")

const TrainerDashboard = () => {
  const { user, loading: authLoading } = useAuth()
  const navigation = useNavigation()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dashboardData, setDashboardData] = useState({
    activeSubscriptions: 0,
    totalPackages: 0,
    totalExercises: 0,
    recentWorkoutPlans: [],
    trainerRatings: { averageRating: 0, totalReviews: 0 },
    unreadNotifications: [],
  })

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const headerAnim = useRef(new Animated.Value(-100)).current

  useEffect(() => {
    // Enhanced entrance animations
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    return () => {
      fadeAnim.setValue(0)
      slideAnim.setValue(50)
      headerAnim.setValue(-100)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user?.roles?.includes("Trainer") && !user?.roles?.includes("Admin")) {
      Alert.alert("Access Denied", "This page is for trainers only.")
      navigation.goBack()
      return
    }
    fetchDashboardData()
  }, [authLoading, user])

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const trainerId = user?.userId
      if (!trainerId) throw new Error("Trainer ID not found.")

      const queryParams = { PageNumber: 1, PageSize: 10 }

      // Fetch all data in parallel
      const [subscriptionResponse, packageResponse, exerciseResponse, workoutPlanResponse, ratingsResponse] =
        await Promise.all([
          trainerService.getSubscriptionsByTrainerId(trainerId, queryParams),
          trainerService.getServicePackageByTrainerId(trainerId, queryParams),
          trainerService.getFitnessExercisesByTrainer(queryParams),
          trainerService.getWorkoutPlansByTrainerId(trainerId, queryParams),
          trainerService.getTrainerRatings(trainerId, queryParams),
        ])

      setDashboardData({
        activeSubscriptions: subscriptionResponse.data?.totalCount || 0,
        totalPackages: packageResponse.data?.totalCount || 0,
        totalExercises: exerciseResponse.data?.totalCount || 0,
        recentWorkoutPlans: workoutPlanResponse.data?.plans || [],
        trainerRatings: {
          averageRating: ratingsResponse.data?.averageRating || 0,
          totalReviews: ratingsResponse.data?.totalCount || 0,
        },
        unreadNotifications: [], // Placeholder
      })
    } catch (error) {
      console.error("Fetch Error:", error)
      Alert.alert("Error", error.message || "An error occurred while loading dashboard data.")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = () => {
    fetchDashboardData(true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US")
  }

  const getStatusStyle = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return { bg: "#ECFDF5", text: "#059669", icon: "checkmark-circle" }
      case "completed":
        return { bg: "#EFF6FF", text: "#2563EB", icon: "checkmark-done-circle" }
      case "paused":
        return { bg: "#FEF3C7", text: "#D97706", icon: "pause-circle" }
      default:
        return { bg: "#F3F4F6", text: "#6B7280", icon: "help-circle" }
    }
  }

  const renderHeader = () => (
    <Animated.View style={[styles.headerContainer, { transform: [{ translateY: headerAnim }] }]}>
      <LinearGradient
        colors={["#667EEA", "#764BA2"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {user?.fullName || "Trainer"}</Text>
          </View>

          <TouchableOpacity style={styles.notificationButton} activeOpacity={0.8}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            {dashboardData.unreadNotifications.length > 0 && <View style={styles.notificationBadge} />}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  )

  const renderQuickActions = () => (
    <Animated.View
      style={[
        styles.quickActionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("TrainerServiceManagement")}
        >
          <LinearGradient colors={["#667EEA", "#764BA2"]} style={styles.quickActionGradient}>
            <Ionicons name="add-circle" size={32} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Create Plan</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("TrainerExerciseManagement")}
        >
          <LinearGradient colors={["#F093FB", "#F5576C"]} style={styles.quickActionGradient}>
            <Ionicons name="fitness" size={32} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Add Exercise</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("UserList")}
        >
          <LinearGradient colors={["#4FACFE", "#00F2FE"]} style={styles.quickActionGradient}>
            <Ionicons name="people" size={32} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Manage Members</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.quickActionCard} activeOpacity={0.8}>
          <LinearGradient colors={["#43E97B", "#38F9D7"]} style={styles.quickActionGradient}>
            <Ionicons name="stats-chart" size={32} color="#FFFFFF" />
            <Text style={styles.quickActionText}>Reports</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )

  const renderStatsOverview = () => (
    <Animated.View
      style={[
        styles.statsOverviewContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Stats Overview</Text>

      <View style={styles.mainStatsGrid}>
        <View style={styles.mainStatCard}>
          <LinearGradient colors={["#667EEA", "#764BA2"]} style={styles.mainStatGradient}>
            <View style={styles.mainStatIcon}>
              <Ionicons name="people" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.mainStatInfo}>
              <Text style={styles.mainStatValue}>{dashboardData.activeSubscriptions}</Text>
              <Text style={styles.mainStatLabel}>Active Members</Text>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.mainStatCard}>
          <LinearGradient colors={["#F093FB", "#F5576C"]} style={styles.mainStatGradient}>
            <View style={styles.mainStatIcon}>
              <Ionicons name="star" size={32} color="#FFFFFF" />
            </View>
            <View style={styles.mainStatInfo}>
              <Text style={styles.mainStatValue}>{dashboardData.trainerRatings.averageRating.toFixed(1)}</Text>
              <Text style={styles.mainStatLabel}>Average Rating</Text>
              <Text style={styles.mainStatSubtext}>({dashboardData.trainerRatings.totalReviews} reviews)</Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      <View style={styles.secondaryStatsGrid}>
        <View style={styles.secondaryStatCard}>
          <View style={styles.secondaryStatIcon}>
            <Ionicons name="briefcase" size={24} color="#4FACFE" />
          </View>
          <Text style={styles.secondaryStatValue}>{dashboardData.totalPackages}</Text>
          <Text style={styles.secondaryStatLabel}>Service Packages</Text>
        </View>

        <View style={styles.secondaryStatCard}>
          <View style={styles.secondaryStatIcon}>
            <Ionicons name="barbell" size={24} color="#43E97B" />
          </View>
          <Text style={styles.secondaryStatValue}>{dashboardData.totalExercises}</Text>
          <Text style={styles.secondaryStatLabel}>Exercises</Text>
        </View>

        <View style={styles.secondaryStatCard}>
          <View style={styles.secondaryStatIcon}>
            <Ionicons name="calendar" size={24} color="#F5576C" />
          </View>
          <Text style={styles.secondaryStatValue}>{dashboardData.recentWorkoutPlans.length}</Text>
          <Text style={styles.secondaryStatLabel}>Plans</Text>
        </View>
      </View>
    </Animated.View>
  )

  const renderPerformanceChart = () => {
    const progressData = {
      labels: ["Members", "Ratings", "Plans"],
      data: [
        dashboardData.activeSubscriptions / 50, // Normalize to 0-1
        dashboardData.trainerRatings.averageRating / 5,
        dashboardData.recentWorkoutPlans.length / 10,
      ],
    }

    const lineChartData = {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [
        {
          data: [20, 45, 28, 80, 99, 43, dashboardData.activeSubscriptions],
          color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    }

    return (
      <Animated.View
        style={[
          styles.chartContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>This Week's Performance</Text>

        <View style={styles.chartCard}>
          <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.chartGradient}>
            <LineChart
              data={lineChartData}
              width={width - 64}
              height={200}
              chartConfig={{
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
                strokeWidth: 3,
                barPercentage: 0.5,
                decimalPlaces: 0,
              }}
              bezier
              style={styles.chart}
              withHorizontalLabels={false}
              withVerticalLabels={true}
              withDots={true}
              withShadow={false}
            />
          </LinearGradient>
        </View>

        <View style={styles.progressChartContainer}>
          <Text style={styles.progressChartTitle}>Goal Progress</Text>
          <ProgressChart
            data={progressData}
            width={width - 64}
            height={120}
            strokeWidth={8}
            radius={32}
            chartConfig={{
              backgroundGradientFrom: "#FFFFFF",
              backgroundGradientTo: "#FFFFFF",
              color: (opacity = 1) => `rgba(102, 126, 234, ${opacity})`,
            }}
            hideLegend={false}
          />
        </View>
      </Animated.View>
    )
  }

  const renderRecentWorkoutPlans = () => (
    <Animated.View
      style={[
        styles.workoutPlansContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Plans</Text>
        <TouchableOpacity style={styles.seeAllButton} activeOpacity={0.8}>
          <Text style={styles.seeAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={16} color="#667EEA" />
        </TouchableOpacity>
      </View>

      {dashboardData.recentWorkoutPlans.length > 0 ? (
        dashboardData.recentWorkoutPlans.slice(0, 3).map((plan, index) => {
          const statusStyle = getStatusStyle(plan.status)
          return (
            <TouchableOpacity
              key={plan.planId || index}
              style={styles.workoutPlanCard}
              onPress={() => navigation.navigate("WorkoutPlanDetailByTrainer", { planId: plan.planId })}
              activeOpacity={0.9}
            >
              <LinearGradient colors={["#FFFFFF", "#FAFBFC"]} style={styles.workoutPlanGradient}>
                <View style={styles.workoutPlanHeader}>
                  <View style={styles.workoutPlanIcon}>
                    <Ionicons name="fitness" size={24} color="#667EEA" />
                  </View>
                  <View style={styles.workoutPlanInfo}>
                    <Text style={styles.workoutPlanTitle}>{plan.planName}</Text>
                    <Text style={styles.workoutPlanUser}>{plan.userFullName || "Unknown"}</Text>
                  </View>
                  <View style={[styles.workoutPlanStatus, { backgroundColor: statusStyle.bg }]}>
                    <Ionicons name={statusStyle.icon} size={16} color={statusStyle.text} />
                  </View>
                </View>

                <View style={styles.workoutPlanDetails}>
                  <View style={styles.workoutPlanDetail}>
                    <Ionicons name="time" size={16} color="#64748B" />
                    <Text style={styles.workoutPlanDetailText}>{plan.durationMinutes} mins</Text>
                  </View>
                  <View style={styles.workoutPlanDetail}>
                    <Ionicons name="repeat" size={16} color="#64748B" />
                    <Text style={styles.workoutPlanDetailText}>{plan.frequencyPerWeek}x/week</Text>
                  </View>
                  <View style={styles.workoutPlanDetail}>
                    <Ionicons name="calendar" size={16} color="#64748B" />
                    <Text style={styles.workoutPlanDetailText}>{formatDate(plan.startDate)}</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )
        })
      ) : (
        <View style={styles.emptyWorkoutPlans}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="fitness-outline" size={48} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>No Workout Plans Yet</Text>
          <Text style={styles.emptyText}>Create the first workout plan for your members</Text>
          <TouchableOpacity
            style={styles.createPlanButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate("TrainerServiceManagement")}
          >
            <LinearGradient colors={["#667EEA", "#764BA2"]} style={styles.createPlanGradient}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.createPlanText}>Create Plan</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  )

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#667EEA" />
      <Text style={styles.loadingText}>Loading data...</Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <DynamicStatusBar backgroundColor="#667EEA" />
        {renderHeader()}
        {renderLoadingState()}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#667EEA" />
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#667EEA"]} />}
        bounces={true}
      >
        {renderQuickActions()}
        {renderStatsOverview()}
        {renderPerformanceChart()}
        {renderRecentWorkoutPlans()}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Header Styles
  headerContainer: {
    zIndex: 1000,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 24,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F5576C",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  // Scroll View Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Section Styles
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667EEA",
    marginRight: 4,
  },

  // Quick Actions Styles
  quickActionsContainer: {
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: (width - 52) / 2,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  quickActionGradient: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginTop: 8,
    textAlign: "center",
  },

  // Stats Overview Styles
  statsOverviewContainer: {
    marginBottom: 32,
  },
  mainStatsGrid: {
    gap: 16,
    marginBottom: 16,
  },
  mainStatCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  mainStatGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
  },
  mainStatIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  mainStatInfo: {
    flex: 1,
  },
  mainStatValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  mainStatLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
  },
  mainStatSubtext: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },

  secondaryStatsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryStatCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  secondaryStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  secondaryStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  secondaryStatLabel: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },

  // Chart Styles
  chartContainer: {
    marginBottom: 32,
  },
  chartCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    marginBottom: 16,
  },
  chartGradient: {
    padding: 16,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  progressChartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  progressChartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
    textAlign: "center",
  },

  // Workout Plans Styles
  workoutPlansContainer: {
    marginBottom: 32,
  },
  workoutPlanCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  workoutPlanGradient: {
    padding: 20,
  },
  workoutPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  workoutPlanIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  workoutPlanInfo: {
    flex: 1,
  },
  workoutPlanTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  workoutPlanUser: {
    fontSize: 14,
    color: "#64748B",
  },
  workoutPlanStatus: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  workoutPlanDetails: {
    flexDirection: "row",
    gap: 16,
  },
  workoutPlanDetail: {
    flexDirection: "row",
    alignItems: "center",
  },
  workoutPlanDetailText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 6,
  },

  // Empty States
  emptyWorkoutPlans: {
    alignItems: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  createPlanButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  createPlanGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createPlanText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#667EEA",
    marginTop: 16,
    fontWeight: "500",
  },
})

export default TrainerDashboard