"use client"

import { useState, useEffect } from "react"
import { Alert } from "react-native"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions,
  ScrollView,
  Animated,
  Image,
} from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { useNavigation } from "@react-navigation/native"
import Header from "components/Header"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { workoutService } from "services/apiWorkoutService"
import { LineChart } from "react-native-chart-kit"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"

const { width } = Dimensions.get("window")

const ACTIVITY_TYPE_MAP = {
  1: "Exercise",
}

const WorkoutHistoryScreen = () => {
  const [historySessions, setHistorySessions] = useState([])
  const [filteredSessions, setFilteredSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedSessions, setExpandedSessions] = useState({})
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const [currentActivity, setCurrentActivity] = useState(null)
  const [editCalories, setEditCalories] = useState("")
  const [editDuration, setEditDuration] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [fadeAnim] = useState(new Animated.Value(0))

  const navigation = useNavigation()

  const handlePressActivity = async (activity) => {
    try {
      if (activity && activity.exerciseId) {
        const exercise = await workoutService.getExerciseById(activity.exerciseId)
        if (exercise) {
          const merged = { ...exercise, ...activity }
          navigation.navigate("ExerciseDetails", { exercise: merged })
        } else {
          Alert.alert("Exercise Not Found", "Could not fetch exercise details.")
        }
      } else {
        console.warn("handlePressActivity called with invalid activity:", activity)
        Alert.alert("Invalid Activity", "Cannot open details: activity is invalid. See console for details.")
      }
    } catch (err) {
      console.error("Error in handlePressActivity:", err, activity)
      Alert.alert("Error", "An error occurred in handlePressActivity. See console for details.")
    }
  }

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    minCalories: "",
    maxCalories: "",
    minDuration: "",
    maxDuration: "",
    searchTerm: "",
    sortBy: "date",
    sortOrder: "desc",
  })

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const sessionsResponse = await workoutService.getMyWorkoutSessions({ pageNumber: 1, pageSize: 200 })
      let sessions = []
      if (sessionsResponse && sessionsResponse.data && Array.isArray(sessionsResponse.data.sessions)) {
        sessions = sessionsResponse.data.sessions
      } else if (Array.isArray(sessionsResponse)) {
        sessions = sessionsResponse
      }
      setHistorySessions(sessions.reverse())
      setError(null)
    } catch (err) {
      setError(err || "Failed to fetch workout sessions")
      showErrorFetchAPI(err || "Failed to fetch workout sessions")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    applyFilters()
  }, [historySessions, filters])

  const fetchHistory = fetchSessions

  const applyFilters = () => {
    let filtered = [...historySessions]
    if (filters.startDate) {
      filtered = filtered.filter((session) => new Date(session.startTime) >= new Date(filters.startDate))
    }
    if (filters.endDate) {
      filtered = filtered.filter((session) => new Date(session.startTime) <= new Date(filters.endDate))
    }
    if (filters.minCalories) {
      filtered = filtered.filter((session) => session.totalCaloriesBurned >= Number.parseInt(filters.minCalories))
    }
    if (filters.maxCalories) {
      filtered = filtered.filter((session) => session.totalCaloriesBurned <= Number.parseInt(filters.maxCalories))
    }
    if (filters.minDuration) {
      filtered = filtered.filter((session) => session.totalDurationMinutes >= Number.parseInt(filters.minDuration))
    }
    if (filters.maxDuration) {
      filtered = filtered.filter((session) => session.totalDurationMinutes <= Number.parseInt(filters.maxDuration))
    }
    if (filters.searchTerm) {
      filtered = filtered.filter((session) => session.notes?.toLowerCase().includes(filters.searchTerm.toLowerCase()))
    }
    filtered.sort((a, b) => {
      let comparison = 0
      switch (filters.sortBy) {
        case "calories":
          comparison = a.totalCaloriesBurned - b.totalCaloriesBurned
          break
        case "duration":
          comparison = a.totalDurationMinutes - b.totalDurationMinutes
          break
        default:
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      }
      return filters.sortOrder === "asc" ? comparison : -comparison
    })
    setFilteredSessions(filtered)
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchHistory()
  }

  const toggleSession = async (sessionId) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }))

    if (!expandedSessions[sessionId]) {
      const sessionIdx = historySessions.findIndex((s) => s.sessionId === sessionId)
      if (sessionIdx === -1) return
      const session = historySessions[sessionIdx]
      if (!session || !Array.isArray(session.userActivities)) return

      const sessionsCopy = [...historySessions]
      let updated = false

      for (let i = 0; i < session.userActivities.length; i++) {
        const act = session.userActivities[i]
        if (act && act.exerciseId && (!act.exerciseName || !act.exerciseImage)) {
          try {
            const exercise = await workoutService.getExerciseById(act.exerciseId)
            if (exercise) {
              session.userActivities[i] = {
                ...act,
                exerciseName: exercise.exerciseName || act.exerciseName,
                exerciseImage: exercise.imageUrl || exercise.image || null,
              }
              updated = true
            }
          } catch (e) {
            // Ignore errors
          }
        }
      }

      if (updated) {
        sessionsCopy[sessionIdx] = { ...session }
        setHistorySessions(sessionsCopy)
      }
    }
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
      showSuccessMessage("Activity updated successfully!")
      setEditModalVisible(false)
      fetchHistory()
    } catch (err) {
      showErrorFetchAPI(err || "Failed to update activity")
    }
  }

  const handleDeleteActivity = async (activityId) => {
    try {
      await workoutService.deleteActivity(activityId)
      showSuccessMessage("Activity deleted successfully!")
      fetchHistory()
    } catch (err) {
      showErrorFetchAPI(err || "Failed to delete activity")
    }
  }

  const resetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      minCalories: "",
      maxCalories: "",
      minDuration: "",
      maxDuration: "",
      searchTerm: "",
      sortBy: "date",
      sortOrder: "desc",
    })
  }

  const getWorkoutStats = () => {
    const totalSessions = historySessions.length
    const totalCalories = historySessions.reduce((sum, session) => sum + session.totalCaloriesBurned, 0)
    const totalDuration = historySessions.reduce((sum, session) => sum + session.totalDurationMinutes, 0)
    const avgCaloriesPerSession = totalSessions > 0 ? totalCalories / totalSessions : 0
    const avgDurationPerSession = totalSessions > 0 ? totalDuration / totalSessions : 0

    // Calculate total exercises
    const totalExercises = historySessions.reduce((sum, session) => {
      return sum + (Array.isArray(session.userActivities) ? session.userActivities.length : 0)
    }, 0)

    // Calculate daily stats
    const dailyStats = {}
    historySessions.forEach((session) => {
      const date = new Date(session.startTime).toDateString()
      if (!dailyStats[date]) {
        dailyStats[date] = {
          sessions: 0,
          exercises: 0,
          calories: 0,
          duration: 0,
        }
      }
      dailyStats[date].sessions += 1
      dailyStats[date].exercises += Array.isArray(session.userActivities) ? session.userActivities.length : 0
      dailyStats[date].calories += session.totalCaloriesBurned
      dailyStats[date].duration += session.totalDurationMinutes
    })

    const avgExercisesPerDay =
      Object.keys(dailyStats).length > 0
        ? Object.values(dailyStats).reduce((sum, day) => sum + day.exercises, 0) / Object.keys(dailyStats).length
        : 0

    const avgCaloriesPerDay =
      Object.keys(dailyStats).length > 0
        ? Object.values(dailyStats).reduce((sum, day) => sum + day.calories, 0) / Object.keys(dailyStats).length
        : 0

    const avgDurationPerDay =
      Object.keys(dailyStats).length > 0
        ? Object.values(dailyStats).reduce((sum, day) => sum + day.duration, 0) / Object.keys(dailyStats).length
        : 0

    return {
      totalSessions,
      totalCalories,
      totalDuration,
      totalExercises,
      avgCaloriesPerSession,
      avgDurationPerSession,
      avgExercisesPerDay,
      avgCaloriesPerDay,
      avgDurationPerDay,
      dailyStats,
      activeDays: Object.keys(dailyStats).length,
    }
  }

  const renderTabButton = (tabName, title, icon) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
    >
      <Ionicons name={icon} size={16} color={activeTab === tabName ? "#007AFF" : "#8E8E93"} />
      <Text style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  )

  const renderStatsCards = () => {
    const stats = getWorkoutStats()
    return (
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(stats.totalCalories)}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{Math.round(stats.totalDuration / 60)}</Text>
            <Text style={styles.statLabel}>Minutes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalExercises}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        <View style={styles.avgStatsCard}>
          <Text style={styles.avgStatsTitle}>Daily Average</Text>
          <View style={styles.avgStatsRow}>
            <View style={styles.avgStat}>
              <Text style={styles.avgStatValue}>{Math.round(stats.avgExercisesPerDay)}</Text>
              <Text style={styles.avgStatLabel}>exercises</Text>
            </View>
            <View style={styles.avgStat}>
              <Text style={styles.avgStatValue}>{Math.round(stats.avgCaloriesPerDay)}</Text>
              <Text style={styles.avgStatLabel}>calories</Text>
            </View>
            <View style={styles.avgStat}>
              <Text style={styles.avgStatValue}>{Math.round(stats.avgDurationPerDay / 60)}</Text>
              <Text style={styles.avgStatLabel}>minutes</Text>
            </View>
          </View>
        </View>
      </View>
    )
  }

  const renderChart = () => {
    if (historySessions.length === 0) return null

    const last7Sessions = historySessions.slice(-7)
    const caloriesData = {
      labels: last7Sessions.map((session) => {
        const date = new Date(session.startTime)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      datasets: [
        {
          data: last7Sessions.map((session) => session.totalCaloriesBurned),
          color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }

    // Exercise count chart data
    const exerciseData = {
      labels: last7Sessions.map((session) => {
        const date = new Date(session.startTime)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      datasets: [
        {
          data: last7Sessions.map((session) => {
            const activities = Array.isArray(session.userActivities) ? session.userActivities : []
            return activities.length
          }),
          color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }

    // Duration chart data
    const durationData = {
      labels: last7Sessions.map((session) => {
        const date = new Date(session.startTime)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      datasets: [
        {
          data: last7Sessions.map((session) => Math.round(session.totalDurationMinutes / 60)),
          color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    }

    const chartConfig = {
      backgroundColor: "#ffffff",
      backgroundGradientFrom: "#ffffff",
      backgroundGradientTo: "#ffffff",
      decimalPlaces: 0,
      labelColor: (opacity = 1) => `rgba(142, 142, 147, ${opacity})`,
      style: { borderRadius: 0 },
      propsForBackgroundLines: {
        strokeDasharray: "",
        stroke: "#F2F2F7",
        strokeWidth: 1,
      },
      withShadow: false,
    }

    return (
      <View style={styles.chartsContainer}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Calories Burned</Text>
          <LineChart
            data={caloriesData}
            width={width - 40}
            height={160}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#007AFF",
                fill: "#ffffff",
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Total Exercises</Text>
          <LineChart
            data={exerciseData}
            width={width - 40}
            height={160}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#34C759",
                fill: "#ffffff",
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Workout Duration (Minutes)</Text>
          <LineChart
            data={durationData}
            width={width - 40}
            height={160}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(255, 149, 0, ${opacity})`,
              propsForDots: {
                r: "4",
                strokeWidth: "2",
                stroke: "#FF9500",
                fill: "#ffffff",
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      </View>
    )
  }

  const renderHistorySessionItem = ({ item, index }) => {
    const isExpanded = expandedSessions[item.sessionId]
    const sessionDate = new Date(item.startTime)
    const activities = Array.isArray(item.userActivities) ? item.userActivities : []

    return (
      <View style={styles.sessionCard}>
        <TouchableOpacity onPress={() => toggleSession(item.sessionId)} style={styles.sessionHeader}>
          <View style={styles.sessionDateContainer}>
            <Text style={styles.sessionDay}>{sessionDate.getDate()}</Text>
            <Text style={styles.sessionMonth}>{sessionDate.toLocaleDateString("en", { month: "short" })}</Text>
          </View>

          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Workout Session</Text>
            <Text style={styles.sessionDate}>
              {sessionDate.toLocaleDateString("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
            <View style={styles.sessionStats}>
              <Text style={styles.sessionStat}>{item.totalCaloriesBurned} cal</Text>
              <Text style={styles.sessionStat}>•</Text>
              <Text style={styles.sessionStat}>{Math.round(item.totalDurationMinutes / 60)} min</Text>
              <Text style={styles.sessionStat}>•</Text>
              <Text style={styles.sessionStat}>{activities.length} exercises</Text>
            </View>
          </View>

          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#C7C7CC" />
        </TouchableOpacity>

        {item.notes && (
          <View style={styles.sessionNotes}>
            <Text style={styles.sessionNotesText}>{item.notes}</Text>
          </View>
        )}

        {isExpanded && (
          <View style={styles.activitiesContainer}>
            {activities && Array.isArray(activities) && activities.length === 0 ? (
              <View style={styles.noActivitiesContainer}>
                <Text style={styles.noActivitiesText}>No exercises found</Text>
              </View>
            ) : (
              <View style={styles.activitiesList}>
                {activities &&
                  Array.isArray(activities) &&
                  activities.map((act, idx) => {
                    if (!act || typeof act !== "object" || !("exerciseId" in act) || !act.exerciseId) return null
                    return (
                      <TouchableOpacity
                        key={act && act.activityId ? act.activityId : `activity-${idx}`}
                        style={styles.activityCard}
                        onPress={() => handlePressActivity(act)}
                      >
                        <View style={styles.activityImageContainer}>
                          {act.exerciseImage ? (
                            <Image
                              source={{ uri: act.exerciseImage }}
                              style={styles.activityImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.activityImagePlaceholder}>
                              <Ionicons name="fitness" size={16} color="#C7C7CC" />
                            </View>
                          )}
                        </View>

                        <View style={styles.activityContent}>
                          <Text style={styles.activityName}>{act.exerciseName || "Exercise"}</Text>
                          <Text style={styles.activityStats}>
                            {act.caloriesBurned} cal • {act.durationMinutes} sec
                          </Text>
                        </View>

                        <View style={styles.activityActions}>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation()
                              openEditModal(act)
                            }}
                          >
                            <Ionicons name="pencil" size={14} color="#007AFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionButton}
                            onPress={(e) => {
                              e.stopPropagation()
                              Alert.alert("Delete Activity", "Are you sure you want to delete this activity?", [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Delete",
                                  style: "destructive",
                                  onPress: () => handleDeleteActivity(act.activityId),
                                },
                              ])
                            }}
                          >
                            <Ionicons name="trash" size={14} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    )
                  })}
              </View>
            )}
          </View>
        )}
      </View>
    )
  }
r
  const renderFilterModal = () => (
    <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter</Text>
            <TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={styles.filterCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Search</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Search in notes..."
                value={filters.searchTerm}
                onChangeText={(text) => setFilters((prev) => ({ ...prev, searchTerm: text }))}
                placeholderTextColor="#C7C7CC"
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Calories</Text>
              <View style={styles.filterRow}>
                <TextInput
                  style={[styles.filterInput, styles.filterInputHalf]}
                  placeholder="Min"
                  value={filters.minCalories}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev, minCalories: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#C7C7CC"
                />
                <TextInput
                  style={[styles.filterInput, styles.filterInputHalf]}
                  placeholder="Max"
                  value={filters.maxCalories}
                  onChangeText={(text) => setFilters((prev) => ({ ...prev, maxCalories: text }))}
                  keyboardType="numeric"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>
          </ScrollView>
          <View style={styles.filterModalButtons}>
            <TouchableOpacity style={styles.filterResetButton} onPress={resetFilters}>
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={() => {
                applyFilters()
                setFilterModalVisible(false)
              }}
            >
              <Text style={styles.filterApplyText}>Apply</Text>
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
            <Text style={styles.editModalTitle}>Edit Activity</Text>
            <TouchableOpacity style={styles.editCloseButton} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.editCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.editModalBody}>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Calories</Text>
              <TextInput
                style={styles.editInput}
                value={editCalories}
                onChangeText={setEditCalories}
                placeholder="Enter calories"
                keyboardType="numeric"
                placeholderTextColor="#C7C7CC"
              />
            </View>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Duration (seconds)</Text>
              <TextInput
                style={styles.editInput}
                value={editDuration}
                onChangeText={setEditDuration}
                placeholder="Enter duration"
                keyboardType="numeric"
                placeholderTextColor="#C7C7CC"
              />
            </View>
          </View>
          <View style={styles.editModalButtons}>
            <TouchableOpacity style={styles.editSaveButton} onPress={handleEditActivity}>
              <Text style={styles.editSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
        <Loading />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <DynamicStatusBar backgroundColor="#007AFF" />

      <Header
        title="Workout History"
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: "options",
            onPress: () => setFilterModalVisible(true),
            color: "#FFFFFF",
          },
        ]}
        style={{ backgroundColor: "#007AFF" }}
      />

      <View style={[styles.tabContainer, { marginTop: 55 }]}>
        {renderTabButton("overview", "Overview", "analytics")}
        {renderTabButton("sessions", "Sessions", "list")}
      </View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "overview" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderStatsCards()}
            {renderChart()}
          </ScrollView>
        )}

        {activeTab === "sessions" && (
          <View style={styles.sessionsTab}>
            <FlatList
              data={filteredSessions}
              renderItem={renderHistorySessionItem}
              keyExtractor={(item) => item.sessionId.toString()}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#007AFF"]} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="fitness" size={48} color="#C7C7CC" />
                  <Text style={styles.emptyTitle}>No Workouts</Text>
                  <Text style={styles.emptyText}>
                    {historySessions.length === 0
                      ? "Start working out to see your history"
                      : "No sessions match your filters"}
                  </Text>
                  {historySessions.length > 0 && (
                    <TouchableOpacity style={styles.emptyButton} onPress={resetFilters}>
                      <Text style={styles.emptyButtonText}>Reset Filters</Text>
                    </TouchableOpacity>
                  )}
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
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
    backgroundColor: "#007AFF",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#C7C7CC",
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "400",
  },
  activeTabText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },

  // Stats
  statsContainer: {
    padding: 16,
    gap: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    fontWeight: "400",
  },
  avgStatsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
  },
  avgStatsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  avgStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  avgStat: {
    alignItems: "center",
  },
  avgStatValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 4,
  },
  avgStatLabel: {
    fontSize: 11,
    color: "#8E8E93",
  },

  // Chart
  chartsContainer: {
    gap: 16,
    marginBottom: 16,
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  chart: {
    borderRadius: 0,
  },

  // Sessions
  sessionsTab: {
    flex: 1,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  sessionDateContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sessionDay: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  sessionMonth: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 13,
    color: "#8E8E93",
    marginBottom: 4,
  },
  sessionStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionStat: {
    fontSize: 12,
    color: "#8E8E93",
  },
  sessionNotes: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sessionNotesText: {
    fontSize: 13,
    color: "#8E8E93",
    fontStyle: "italic",
  },

  // Activities
  activitiesContainer: {
    borderTopWidth: 0.5,
    borderTopColor: "#C7C7CC",
    paddingTop: 12,
  },
  activitiesList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  activityImageContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 12,
  },
  activityImage: {
    width: "100%",
    height: "100%",
  },
  activityImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 2,
  },
  activityStats: {
    fontSize: 12,
    color: "#8E8E93",
  },
  activityActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F2F2F7",
    justifyContent: "center",
    alignItems: "center",
  },
  noActivitiesContainer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  noActivitiesText: {
    fontSize: 14,
    color: "#8E8E93",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
  },

  // Error
  errorContainer: {
    backgroundColor: "#FFEBEE",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: "#D32F2F",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },

  listContainer: {
    paddingTop: 8,
    paddingBottom: 20,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: "80%",
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#C7C7CC",
  },
  filterModalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  filterCloseButton: {
    padding: 4,
  },
  filterCloseText: {
    fontSize: 17,
    color: "#007AFF",
    fontWeight: "400",
  },
  filterModalBody: {
    padding: 16,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "400",
    color: "#000000",
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#C7C7CC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#000000",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterInputHalf: {
    flex: 1,
  },
  filterModalButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#C7C7CC",
  },
  filterResetButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F2F2F7",
    alignItems: "center",
  },
  filterResetText: {
    fontSize: 16,
    color: "#8E8E93",
    fontWeight: "400",
  },
  filterApplyButton: {
    flex: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  filterApplyText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  // Edit modal
  editModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: "60%",
  },
  editModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#C7C7CC",
  },
  editModalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  editCloseButton: {
    padding: 4,
  },
  editCloseText: {
    fontSize: 17,
    color: "#8E8E93",
    fontWeight: "400",
  },
  editModalBody: {
    padding: 16,
  },
  editGroup: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: "400",
    color: "#000000",
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: "#C7C7CC",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#000000",
  },
  editModalButtons: {
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#C7C7CC",
  },
  editSaveButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  editSaveText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default WorkoutHistoryScreen
