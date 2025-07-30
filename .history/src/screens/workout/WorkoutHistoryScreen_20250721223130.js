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
import { theme } from "theme/color"
import { workoutService } from "services/apiWorkoutService"
import { LineChart, BarChart } from "react-native-chart-kit"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

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
      <Ionicons name={icon} size={16} color={activeTab === tabName ? "#0056d2" : "#64748B"} />
      <Text style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  )

  const renderStatsCards = () => {
    const stats = getWorkoutStats()
    return (
      <View style={styles.statsContainer}>
        <LinearGradient colors={["#0056d2", "#003d99"]} style={[styles.statCard, styles.primaryCard]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="fitness" size={24} color="#FFFFFF" />
          </View>
          <Text style={[styles.statValue, styles.primaryText]}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </LinearGradient>

        <LinearGradient colors={["#FF6B35", "#E55A2B"]} style={[styles.statCard, styles.caloriesCard]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="flame" size={24} color="#FFFFFF" />
          </View>
          <Text style={[styles.statValue, styles.whiteText]}>{Math.round(stats.totalCalories)}</Text>
          <Text style={[styles.statLabel, styles.whiteText]}>Total Calories</Text>
        </LinearGradient>

        <LinearGradient colors={["#10B981", "#059669"]} style={[styles.statCard, styles.timeCard]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="time" size={24} color="#FFFFFF" />
          </View>
          <Text style={[styles.statValue, styles.whiteText]}>{Math.round(stats.totalDuration / 60)} min</Text>
          <Text style={[styles.statLabel, styles.whiteText]}>Total Time</Text>
        </LinearGradient>

        <LinearGradient colors={["#8B5CF6", "#7C3AED"]} style={[styles.statCard, styles.exerciseCard]}>
          <View style={styles.statIconContainer}>
            <MaterialCommunityIcons name="dumbbell" size={24} color="#FFFFFF" />
          </View>
          <Text style={[styles.statValue, styles.whiteText]}>{stats.totalExercises}</Text>
          <Text style={[styles.statLabel, styles.whiteText]}>Total Exercises</Text>
        </LinearGradient>

        {/* Daily Averages */}
        <View style={[styles.statCard, styles.avgCard]}>
          <View style={styles.avgStatRow}>
            <Ionicons name="trending-up" size={16} color="#0056d2" />
            <Text style={styles.avgStatText}>{Math.round(stats.avgExercisesPerDay)} exercises/day</Text>
          </View>
          <View style={styles.avgStatRow}>
            <Ionicons name="flame" size={16} color="#FF6B35" />
            <Text style={styles.avgStatText}>{Math.round(stats.avgCaloriesPerDay)} kcal/day</Text>
          </View>
          <View style={styles.avgStatRow}>
            <Ionicons name="time" size={16} color="#10B981" />
            <Text style={styles.avgStatText}>{Math.round(stats.avgDurationPerDay / 60)} min/day</Text>
          </View>
        </View>

        <View style={[styles.statCard, styles.activeDaysCard]}>
          <View style={styles.statIconContainer}>
            <Ionicons name="calendar" size={24} color="#0056d2" />
          </View>
          <Text style={[styles.statValue, { color: "#0056d2" }]}>{stats.activeDays}</Text>
          <Text style={styles.statLabel}>Active Days</Text>
        </View>
      </View>
    )
  }

  const renderChart = () => {
    if (historySessions.length === 0) return null

    const last7Sessions = historySessions.slice(-7)
    const data = {
      labels: last7Sessions.map((session) => {
        const date = new Date(session.startTime)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      datasets: [
        {
          data: last7Sessions.map((session) => session.totalCaloriesBurned),
          color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    }

    // Daily exercises chart
    const stats = getWorkoutStats()
    const dailyData = Object.entries(stats.dailyStats)
      .slice(-7)
      .map(([date, data]) => ({
        date: new Date(date).getDate(),
        exercises: data.exercises,
        calories: data.calories,
      }))

    const exerciseChartData = {
      labels: dailyData.map((d) => d.date.toString()),
      datasets: [
        {
          data: dailyData.map((d) => d.exercises),
        },
      ],
    }

    return (
      <View style={styles.chartsContainer}>
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Calories Burned (Last 7 Sessions)</Text>
          <LineChart
            data={data}
            width={width - 60}
            height={200}
            chartConfig={{
              backgroundColor: "#ffffff",
              backgroundGradientFrom: "#ffffff",
              backgroundGradientTo: "#ffffff",
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#0056d2",
                fill: "#ffffff",
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>

        {dailyData.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Daily Exercises (Last 7 Days)</Text>
            <BarChart
              data={exerciseChartData}
              width={width - 60}
              height={200}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                barPercentage: 0.7,
              }}
              style={styles.chart}
              showValuesOnTopOfBars
            />
          </View>
        )}
      </View>
    )
  }

  const renderHistorySessionItem = ({ item, index }) => {
    const isExpanded = expandedSessions[item.sessionId]
    const sessionDate = new Date(item.startTime)
    const activities = Array.isArray(item.userActivities) ? item.userActivities : []

    return (
      <View style={styles.modernSessionCard}>
        <TouchableOpacity onPress={() => toggleSession(item.sessionId)} style={styles.sessionHeader}>
          <LinearGradient colors={["#0056d2", "#003d99"]} style={styles.sessionDateContainer}>
            <Text style={styles.sessionDay}>{sessionDate.getDate()}</Text>
            <Text style={styles.sessionMonth}>{sessionDate.toLocaleDateString("en", { month: "short" })}</Text>
          </LinearGradient>

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
              <View style={styles.sessionStat}>
                <Ionicons name="flame" size={14} color="#FF6B35" />
                <Text style={styles.sessionStatText}>{item.totalCaloriesBurned} kcal</Text>
              </View>
              <View style={styles.sessionStat}>
                <Ionicons name="time" size={14} color="#10B981" />
                <Text style={styles.sessionStatText}>{Math.round(item.totalDurationMinutes / 60)} min</Text>
              </View>
              <View style={styles.sessionStat}>
                <MaterialCommunityIcons name="dumbbell" size={14} color="#8B5CF6" />
                <Text style={styles.sessionStatText}>{activities.length} exercises</Text>
              </View>
            </View>
          </View>

          <View style={styles.expandIcon}>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {item.notes && (
          <View style={styles.sessionNotes}>
            <Ionicons name="document-text" size={14} color="#6B7280" />
            <Text style={styles.sessionNotesText}>{item.notes}</Text>
          </View>
        )}

        {isExpanded && (
          <View style={styles.activitiesContainer}>
            <View style={styles.activitiesHeader}>
              <Text style={styles.activitiesTitle}>Exercises ({activities.length})</Text>
            </View>

            {activities && Array.isArray(activities) && activities.length === 0 ? (
              <View style={styles.noActivitiesContainer}>
                <Ionicons name="fitness" size={32} color="#D1D5DB" />
                <Text style={styles.noActivitiesText}>No exercises found for this session</Text>
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
                        style={styles.modernActivityCard}
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
                              <Ionicons name="fitness" size={20} color="#9CA3AF" />
                            </View>
                          )}
                        </View>

                        <View style={styles.activityContent}>
                          <Text style={styles.activityName}>{act.exerciseName || "Exercise"}</Text>
                          <View style={styles.activityMetrics}>
                            <View style={styles.activityMetric}>
                              <Ionicons name="flame" size={12} color="#FF6B35" />
                              <Text style={styles.activityMetricText}>{act.caloriesBurned} kcal</Text>
                            </View>
                            <View style={styles.activityMetric}>
                              <Ionicons name="time" size={12} color="#10B981" />
                              <Text style={styles.activityMetricText}>{Math.round(act.durationMinutes / 60)} min</Text>
                            </View>
                          </View>
                          <Text style={styles.activityTime}>
                            {act.recordedAt
                              ? new Date(act.recordedAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </Text>
                        </View>

                        <View style={styles.activityActions}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={(e) => {
                              e.stopPropagation()
                              openEditModal(act)
                            }}
                          >
                            <Ionicons name="pencil" size={14} color="#0056d2" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
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
                            <Ionicons name="trash" size={14} color="#EF4444" />
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

  const renderFilterModal = () => (
    <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Workout History</Text>
            <TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Search Notes</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Search in workout notes..."
                value={filters.searchTerm}
                onChangeText={(text) => setFilters((prev) => ({ ...prev, searchTerm: text }))}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Date Range</Text>
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
              <Text style={styles.filterLabel}>Calorie Range</Text>
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
            <Text style={styles.editModalTitle}>Edit Activity</Text>
            <TouchableOpacity style={styles.editCloseButton} onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.editModalBody}>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}>Calories Burned</Text>
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
              <Text style={styles.editLabel}>Duration (seconds)</Text>
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
              <Text style={styles.editSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0056d2" />
        <Loading />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0056d2" />
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      <Header
        title="Workout History"
        subtitle="Track your fitness journey"
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: "options",
            onPress: () => setFilterModalVisible(true),
            color: "#FFFFFF",
          },
        ]}
        style={{ backgroundColor: "#0056d2" }}
      />

      <View style={[styles.tabContainer, { marginTop: 55 }]}>
        {renderTabButton("overview", "Overview", "analytics")}
        {renderTabButton("sessions", "Sessions", "list")}
      </View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color="#EF4444" />
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
            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>Workout Summary</Text>
              <View style={styles.summaryCard}>
                <LinearGradient colors={["#0056d2", "#003d99"]} style={styles.summaryGradient}>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryText}>
                      You've completed{" "}
                      <Text style={styles.summaryHighlight}>{historySessions.length} workout sessions</Text> and burned
                      a total of{" "}
                      <Text style={styles.summaryHighlight}>
                        {Math.round(getWorkoutStats().totalCalories)} calories
                      </Text>
                      .
                    </Text>
                    <Text style={styles.summaryText}>
                      Your average session burns{" "}
                      <Text style={styles.summaryHighlight}>
                        {Math.round(getWorkoutStats().avgCaloriesPerSession)} calories
                      </Text>{" "}
                      and includes{" "}
                      <Text style={styles.summaryHighlight}>
                        {Math.round(getWorkoutStats().avgExercisesPerDay)} exercises
                      </Text>{" "}
                      per day.
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
          </ScrollView>
        )}

        {activeTab === "sessions" && (
          <View style={styles.sessionsTab}>
            <View style={styles.sessionsHeader}>
              <Text style={styles.sectionTitle}>
                Workout Sessions ({filteredSessions.length}/{historySessions.length})
              </Text>
            </View>
            <FlatList
              data={filteredSessions}
              renderItem={renderHistorySessionItem}
              keyExtractor={(item) => item.sessionId.toString()}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0056d2"]} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="fitness" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>No Workout Sessions Found</Text>
                  <Text style={styles.emptyText}>
                    {historySessions.length === 0
                      ? "Start working out to see your history here!"
                      : "Try adjusting your filters to see more sessions."}
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
    backgroundColor: "#0056d2",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    borderBottomColor: "#0056d2",
  },
  tabText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#0056d2",
    fontWeight: "700",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -10,
    padding: 20,
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
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  primaryCard: {
    minWidth: "100%",
  },
  caloriesCard: {
    minWidth: "45%",
  },
  timeCard: {
    minWidth: "45%",
  },
  exerciseCard: {
    minWidth: "45%",
  },
  avgCard: {
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    gap: 8,
  },
  activeDaysCard: {
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4,
  },
  primaryText: {
    color: "#FFFFFF",
  },
  whiteText: {
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    opacity: 0.9,
  },
  avgStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avgStatText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  chartsContainer: {
    gap: 20,
    marginBottom: 24,
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
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
  overviewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryGradient: {
    padding: 24,
  },
  summaryContent: {
    gap: 12,
  },
  summaryText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 20,
  },
  summaryHighlight: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sessionsTab: {
    flex: 1,
  },
  sessionsHeader: {
    marginBottom: 16,
  },
  modernSessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  sessionDateContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  sessionDay: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  sessionMonth: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  sessionStats: {
    flexDirection: "row",
    gap: 16,
  },
  sessionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionStatText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  expandIcon: {
    marginLeft: 8,
  },
  sessionNotes: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  sessionNotesText: {
    fontSize: 13,
    color: "#6B7280",
    flex: 1,
  },
  activitiesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  activitiesHeader: {
    marginBottom: 12,
  },
  activitiesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  activitiesList: {
    gap: 12,
  },
  modernActivityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activityImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
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
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  activityMetrics: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  activityMetric: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  activityMetricText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  activityTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  activityActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
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
  noActivitiesContainer: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  noActivitiesText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
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
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#0056d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FEE2E2",
    borderRadius: 16,
    marginBottom: 16,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    flex: 1,
  },
  retryButton: {
    backgroundColor: "#EF4444",
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
  // Modal styles
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
  filterInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterHalf: {
    flex: 1,
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
    backgroundColor: "#0056d2",
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
    backgroundColor: "#0056d2",
    alignItems: "center",
  },
  editSaveText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default WorkoutHistoryScreen
