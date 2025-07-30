
import { useState, useEffect } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions,
  ScrollView,
  Animated,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Header from "components/Header"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { workoutService } from "services/apiWorkoutService"
import { LineChart } from "react-native-chart-kit"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"

const { width } = Dimensions.get("window")

const ACTIVITY_TYPE_MAP = {
  1: "Exercise",
}

const UserActivityScreen = () => {
  const navigation = useNavigation()
  const [historyActivities, setHistoryActivities] = useState([])
  const [groupedActivities, setGroupedActivities] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [currentActivity, setCurrentActivity] = useState(null)
  const [editCalories, setEditCalories] = useState("")
  const [editDuration, setEditDuration] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [fadeAnim] = useState(new Animated.Value(0))

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    minCalories: "",
    maxCalories: "",
    activityType: "",
    sortBy: "date",
    sortOrder: "desc",
  })

  useEffect(() => {
    fetchActivities()
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const activitiesResponse = await workoutService.getMyActivities({ pageNumber: 1, pageSize: 50 })
      const activities = activitiesResponse || []
      setHistoryActivities(Array.isArray(activities) ? activities : [])
      groupActivitiesByDate(Array.isArray(activities) ? activities : [])
      setError(null)
    } catch (err) {
      setError(err.message || "Failed to fetch user activities")
      showErrorFetchAPI(err.message || "Failed to fetch user activities")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const groupActivitiesByDate = (activities) => {
    const grouped = {}
    activities.forEach((activity) => {
      const date = new Date(activity.recordedAt).toDateString()
      if (!grouped[date]) {
        grouped[date] = {
          date: date,
          activities: [],
          totalCalories: 0,
          totalDuration: 0,
          totalSteps: 0,
          totalDistance: 0,
          sessionCount: 0,
        }
      }
      grouped[date].activities.push(activity)
      grouped[date].totalCalories += activity.caloriesBurned || 0
      grouped[date].totalDuration += activity.durationMinutes || 0
      grouped[date].totalSteps += activity.steps || 0
      grouped[date].totalDistance += activity.distanceKm || 0
      grouped[date].sessionCount += 1
    })

    // Apply filters
    let filteredGrouped = { ...grouped }
    if (filters.startDate) {
      const startDate = new Date(filters.startDate)
      filteredGrouped = Object.fromEntries(
        Object.entries(filteredGrouped).filter(([date]) => new Date(date) >= startDate),
      )
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      filteredGrouped = Object.fromEntries(
        Object.entries(filteredGrouped).filter(([date]) => new Date(date) <= endDate),
      )
    }
    if (filters.minCalories) {
      filteredGrouped = Object.fromEntries(
        Object.entries(filteredGrouped).filter(
          ([, data]) => data.totalCalories >= Number.parseInt(filters.minCalories),
        ),
      )
    }
    if (filters.maxCalories) {
      filteredGrouped = Object.fromEntries(
        Object.entries(filteredGrouped).filter(
          ([, data]) => data.totalCalories <= Number.parseInt(filters.maxCalories),
        ),
      )
    }

    // Sort
    const sortedEntries = Object.entries(filteredGrouped).sort(([dateA, dataA], [dateB, dataB]) => {
      let comparison = 0
      switch (filters.sortBy) {
        case "calories":
          comparison = dataA.totalCalories - dataB.totalCalories
          break
        case "duration":
          comparison = dataA.totalDuration - dataB.totalDuration
          break
        default:
          comparison = new Date(dateA).getTime() - new Date(dateB).getTime()
      }
      return filters.sortOrder === "asc" ? comparison : -comparison
    })

    setGroupedActivities(Object.fromEntries(sortedEntries))
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchActivities()
  }

  const openEditModal = (activity) => {
    setCurrentActivity(activity)
    setEditCalories(activity.caloriesBurned.toString())
    setEditDuration(activity.durationMinutes.toString())
    setEditModalVisible(true)
  }

  const handleEditActivity = async () => {
    if (!currentActivity) return
    try {
      const updatedActivity = {
        UserId: currentActivity.userId,
        ActivityType: currentActivity.activityType,
        exerciseId: currentActivity.exerciseId,
        sessionId: currentActivity.sessionId,
        steps: currentActivity.steps,
        distanceKm: currentActivity.distanceKm,
        CaloriesBurned: Number.parseFloat(editCalories) || 0,
        DurationMinutes: Number.parseInt(editDuration, 10) || 1,
        heartRate: currentActivity.heartRate,
        location: currentActivity.location,
        goalStatus: currentActivity.goalStatus,
        isSummary: currentActivity.isSummary,
        recordedAt: currentActivity.recordedAt,
      }

      await workoutService.updateActivity(currentActivity.activityId, updatedActivity)
      setEditModalVisible(false)
      showSuccessMessage("Activity updated successfully!")
      fetchActivities()
    } catch (err) {
      showErrorFetchAPI(err.message || "Failed to update activity")
    }
  }

  const handleDeleteActivity = async (activityId) => {
    try {
      await workoutService.deleteActivity(activityId)
      showSuccessMessage("Activity deleted successfully!")
      fetchActivities()
    } catch (err) {
      showErrorFetchAPI(err.message || "Failed to delete activity")
    }
  }

  const applyFilters = () => {
    groupActivitiesByDate(historyActivities)
    setFilterModalVisible(false)
  }

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      minCalories: "",
      maxCalories: "",
      activityType: "",
      sortBy: "date",
      sortOrder: "desc",
    })
    groupActivitiesByDate(historyActivities)
  }

  const getWeeklyData = () => {
    const last7Days = Object.entries(groupedActivities).slice(0, 7).reverse()
    return {
      labels: last7Days.map(([date]) => {
        const d = new Date(date)
        return `${d.getMonth() + 1}/${d.getDate()}`
      }),
      datasets: [
        {
          data: last7Days.map(([, data]) => data.totalCalories),
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    }
  }

  const getTotalStats = () => {
    const totalCalories = Object.values(groupedActivities).reduce((sum, day) => sum + day.totalCalories, 0)
    const totalDuration = Object.values(groupedActivities).reduce((sum, day) => sum + day.totalDuration, 0)
    const totalSessions = Object.values(groupedActivities).reduce((sum, day) => sum + day.sessionCount, 0)
    const avgCaloriesPerDay = totalCalories / Math.max(Object.keys(groupedActivities).length, 1)

    return { totalCalories, totalDuration, totalSessions, avgCaloriesPerDay }
  }

  const renderTabButton = (tabName, title, icon) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
    >
      <Ionicons name={icon} size={16} color={activeTab === tabName ? "#4F46E5" : "#64748B"} />
      <Text style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  )

  const renderOverviewTab = () => {
    const stats = getTotalStats()
    const weeklyData = getWeeklyData()

    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, styles.primaryCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="flame" size={24} color="#FF6B35" />
            </View>
            <Text style={[styles.statValue, { color: "#FF6B35" }]}>{Math.round(stats.totalCalories)}</Text>
            <Text style={styles.statLabel}>Total Calories</Text>
          </View>

          <View style={[styles.statCard, styles.secondaryCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time" size={24} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: "#10B981" }]}>{Math.round(stats.totalDuration)}</Text>
            <Text style={styles.statLabel}>Total Minutes</Text>
          </View>

          <View style={[styles.statCard, styles.tertiaryCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="fitness" size={24} color="#8B5CF6" />
            </View>
            <Text style={[styles.statValue, { color: "#8B5CF6" }]}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Total Sessions</Text>
          </View>

          <View style={[styles.statCard, styles.quaternaryCard]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="trending-up" size={24} color="#F59E0B" />
            </View>
            <Text style={[styles.statValue, { color: "#F59E0B" }]}>{Math.round(stats.avgCaloriesPerDay)}</Text>
            <Text style={styles.statLabel}>Avg/Day</Text>
          </View>
        </View>

        {/* Weekly Chart */}
        {weeklyData.labels.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>📈 Weekly Calories Burned</Text>
            <LineChart
              data={weeklyData}
              width={width - 40}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: "8",
                  strokeWidth: "3",
                  stroke: "#4F46E5",
                  fill: "#ffffff",
                },
                propsForBackgroundLines: {
                  strokeDasharray: "",
                  stroke: "#E5E7EB",
                  strokeWidth: 1,
                },
              }}
              bezier
              style={styles.chart}
              withShadow={false}
              withInnerLines={true}
              withOuterLines={true}
            />
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>🏃‍♂️ Recent Activity</Text>
          {Object.entries(groupedActivities)
            .slice(0, 3)
            .map(([date, dayData]) => (
              <TouchableOpacity key={date} style={styles.recentActivityCard}>
                <View style={styles.recentDateContainer}>
                  <Text style={styles.recentDay}>{new Date(date).getDate()}</Text>
                  <Text style={styles.recentMonth}>{new Date(date).toLocaleDateString("en", { month: "short" })}</Text>
                </View>
                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle}>{new Date(date).toLocaleDateString("en", { weekday: "long" })}</Text>
                  <Text style={styles.recentStats}>
                     {dayData.totalCalories} kcal •  {dayData.totalDuration} min •  {dayData.sessionCount} sessions
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
              </TouchableOpacity>
            ))}
        </View>
      </ScrollView>
    )
  }

  const renderDailyActivityItem = ({ item: [date, dayData] }) => (
    <View style={styles.dailyActivityCard}>
      <View style={styles.dailyHeader}>
        <View style={styles.dailyDateContainer}>
          <Text style={styles.dailyDay}>{new Date(date).getDate()}</Text>
          <Text style={styles.dailyMonth}>{new Date(date).toLocaleDateString("en", { month: "short" })}</Text>
        </View>
        <View style={styles.dailyInfo}>
          <Text style={styles.dailyTitle}>
            {new Date(date).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
          </Text>
          <View style={styles.dailyStatsRow}>
            <View style={styles.dailyStatItem}>
              <Ionicons name="flame" size={16} color="#FF6B35" />
              <Text style={styles.dailyStatText}>{dayData.totalCalories} kcal</Text>
            </View>
            <View style={styles.dailyStatItem}>
              <Ionicons name="time" size={16} color="#10B981" />
              <Text style={styles.dailyStatText}>{dayData.totalDuration} min</Text>
            </View>
            <View style={styles.dailyStatItem}>
              <Ionicons name="fitness" size={16} color="#8B5CF6" />
              <Text style={styles.dailyStatText}>{dayData.sessionCount} sessions</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sessionsContainer}>
        {dayData.activities.map((activity, index) => (
          <View key={activity.activityId} style={styles.sessionItem}>
            <View style={styles.sessionDot} />
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionTitle}>
                {ACTIVITY_TYPE_MAP[activity.activityType] || "Exercise"} #{activity.exerciseId}
              </Text>
              <Text style={styles.sessionDetails}>
                🔥 {activity.caloriesBurned} kcal • ⏱️ {activity.durationMinutes} min
                {activity.steps > 0 && ` • 👣 ${activity.steps} steps`}
                {activity.distanceKm > 0 && ` • 📏 ${activity.distanceKm} km`}
              </Text>
              <Text style={styles.sessionTime}>{new Date(activity.recordedAt).toLocaleTimeString()}</Text>
            </View>
            <View style={styles.sessionActions}>
              <TouchableOpacity style={styles.editActionButton} onPress={() => openEditModal(activity)}>
                <Ionicons name="create-outline" size={16} color="#10B981" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteActionButton}
                onPress={() => handleDeleteActivity(activity.activityId)}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  )

  const renderFilterModal = () => (
    <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>🔍 Advanced Filters</Text>
            <TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>📅 Date Range</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Start Date</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="YYYY-MM-DD"
                    value={filters.startDate}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev, startDate: text }))}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>End Date</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="YYYY-MM-DD"
                    value={filters.endDate}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev, endDate: text }))}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>🔥 Calorie Range</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Min Calories</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="0"
                    value={filters.minCalories}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev, minCalories: text }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Max Calories</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="1000"
                    value={filters.maxCalories}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev, maxCalories: text }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>📊 Sort Options</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Sort By</Text>
                  <View style={styles.sortButtons}>
                    {[
                      { key: "date", label: "Date" },
                      { key: "calories", label: "Calories" },
                      { key: "duration", label: "Duration" },
                    ].map((sort) => (
                      <TouchableOpacity
                        key={sort.key}
                        style={[styles.sortButton, filters.sortBy === sort.key && styles.activeSortButton]}
                        onPress={() => setFilters((prev) => ({ ...prev, sortBy: sort.key }))}
                      >
                        <Text
                          style={[styles.sortButtonText, filters.sortBy === sort.key && styles.activeSortButtonText]}
                        >
                          {sort.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Order</Text>
                  <View style={styles.sortButtons}>
                    {[
                      { key: "desc", label: "Desc" },
                      { key: "asc", label: "Asc" },
                    ].map((order) => (
                      <TouchableOpacity
                        key={order.key}
                        style={[styles.sortButton, filters.sortOrder === order.key && styles.activeSortButton]}
                        onPress={() => setFilters((prev) => ({ ...prev, sortOrder: order.key }))}
                      >
                        <Text
                          style={[
                            styles.sortButtonText,
                            filters.sortOrder === order.key && styles.activeSortButtonText,
                          ]}
                        >
                          {order.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterModalButtons}>
            <TouchableOpacity style={styles.filterResetButton} onPress={resetFilters}>
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterApplyButton} onPress={applyFilters}>
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderEditModal = () => (
    <Modal visible={editModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.editModalContent}>
          <View style={styles.editModalHeader}>
            <Text style={styles.editModalTitle}>✏️ Edit Activity</Text>
            <TouchableOpacity style={styles.editCloseButton} onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.editModalBody}>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>🔥 Calories Burned</Text>
              <TextInput
                style={styles.editInput}
                value={editCalories}
                onChangeText={setEditCalories}
                placeholder="Enter calories"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>⏱️ Duration (minutes)</Text>
              <TextInput
                style={styles.editInput}
                value={editDuration}
                onChangeText={setEditDuration}
                placeholder="Enter duration"
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View style={styles.editModalButtons}>
            <TouchableOpacity style={styles.editCancelButton} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editSaveButton} onPress={handleEditActivity}>
              <Text style={styles.editSaveText}>💾 Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: 'absolute', width: '100%', height: '100%', zIndex: 999 }}>
          <Loading />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      {/* Header */}
      <Header
        title="Activity Tracker"
        subtitle="Track your fitness journey"
        onBack={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity style={{ marginRight: 8 }} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options" size={24} color="#4F46E5" />
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton("overview", "Overview", "analytics")}
        {renderTabButton("daily", "Daily", "calendar")}
      </View>

      {/* Content */}
      <Animated.View style={[styles.container, { opacity: fadeAnim, marginTop: 50 }]}> 
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchActivities}>
              <Text style={styles.retryButtonText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "overview" && renderOverviewTab()}

        {activeTab === "daily" && (
          <FlatList
            data={Object.entries(groupedActivities)}
            renderItem={renderDailyActivityItem}
            keyExtractor={([date]) => date}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="fitness" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Activities Found</Text>
                <Text style={styles.emptyText}>Start working out to see your activities here!</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>

      {renderFilterModal()}
      {renderEditModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  // ...existing code...
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    gap: 6,
  },
  activeTab: {
    borderBottomColor: "#4F46E5",
  },
  tabText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -10,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    gap: 16,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryCard: {
    backgroundColor: "#FFF7ED",
  },
  secondaryCard: {
    backgroundColor: "#F0FDF4",
  },
  tertiaryCard: {
    backgroundColor: "#F5F3FF",
  },
  quaternaryCard: {
    backgroundColor: "#FFFBEB",
  },
  statIconContainer: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  recentContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  recentActivityCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recentDateContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  recentDay: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  recentMonth: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  recentStats: {
    fontSize: 12,
    color: "#64748B",
  },
  dailyActivityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  dailyHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dailyDateContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  dailyDay: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  dailyMonth: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  dailyInfo: {
    flex: 1,
  },
  dailyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  dailyStatsRow: {
    flexDirection: "row",
    gap: 16,
  },
  dailyStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dailyStatText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  sessionsContainer: {
    gap: 12,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingLeft: 16,
  },
  sessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
    marginTop: 8,
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  sessionDetails: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 2,
  },
  sessionTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  sessionActions: {
    flexDirection: "row",
    gap: 8,
  },
  editActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  errorContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  filterCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalBody: {
    padding: 20,
    maxHeight: 400,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  filterSubLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterHalf: {
    flex: 1,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  sortButtons: {
    flexDirection: "row",
    gap: 6,
  },
  sortButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
  },
  activeSortButton: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  activeSortButtonText: {
    color: "#FFFFFF",
  },
  filterModalButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  filterResetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  filterResetText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  filterApplyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
  },
  filterApplyText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  editModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  editCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  editModalBody: {
    padding: 20,
  },
  editGroup: {
    marginBottom: 20,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  editModalButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  editCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  editCancelText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  editSaveButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
  },
  editSaveText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default UserActivityScreen
