"use client"

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
  Alert,
  Animated,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { workoutService } from "services/apiWorkoutService"
import { LineChart } from "react-native-chart-kit"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")

const ACTIVITY_TYPE_MAP = {
  1: "Exercise",
}

const WorkoutHistoryScreen = () => {
  const navigation = useNavigation()
  const [historySessions, setHistorySessions] = useState([])
  const [historyActivities, setHistoryActivities] = useState([])
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
  const [activeTab, setActiveTab] = useState("sessions")
  const [fadeAnim] = useState(new Animated.Value(0))

  // Filter states
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
    fetchHistory()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [historySessions, filters])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const sessionsResponse = await workoutService.getMyWorkoutSessions({ pageNumber: 1, pageSize: 50 })
      const activitiesResponse = await workoutService.getMyActivities({ pageNumber: 1, pageSize: 100 })


      const sessions = sessionsResponse || []
      const activities = activitiesResponse || []



      setHistorySessions(Array.isArray(sessions) ? sessions : [])
      setHistoryActivities(Array.isArray(activities) ? activities : [])
      setError(null)
    } catch (err) {
      setError(err.message || "Failed to fetch workout history")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

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

  const toggleSession = (sessionId) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }))
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
      Alert.alert("Success", "Activity updated successfully")
      setEditModalVisible(false)
      fetchHistory() 
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update activity")
    }
  }

  const handleDeleteActivity = async (activityId) => {
    Alert.alert("Delete Activity", "Are you sure you want to delete this activity?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await workoutService.deleteActivity(activityId)
            Alert.alert("Success", "Activity deleted successfully")
            fetchHistory() 
          } catch (err) {
            Alert.alert("Error", err.message || "Failed to delete activity")
          }
        },
      },
    ])
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

    return {
      totalSessions,
      totalCalories,
      totalDuration,
      avgCaloriesPerSession,
      avgDurationPerSession,
    }
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

  const renderStatsCards = () => {
    const stats = getWorkoutStats()

    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.sessionsCard]}>
          <Ionicons name="fitness" size={24} color="#4F46E5" />
          <Text style={[styles.statValue, { color: "#4F46E5" }]}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </View>

        <View style={[styles.statCard, styles.caloriesCard]}>
          <Ionicons name="flame" size={24} color="#FF6B35" />
          <Text style={[styles.statValue, { color: "#FF6B35" }]}>{Math.round(stats.totalCalories)}</Text>
          <Text style={styles.statLabel}>Total Calories</Text>
        </View>

        <View style={[styles.statCard, styles.durationCard]}>
          <Ionicons name="time" size={24} color="#10B981" />
          <Text style={[styles.statValue, { color: "#10B981" }]}>{Math.round(stats.totalDuration)}</Text>
          <Text style={styles.statLabel}>Total Minutes</Text>
        </View>

        <View style={[styles.statCard, styles.avgCard]}>
          <Ionicons name="trending-up" size={24} color="#8B5CF6" />
          <Text style={[styles.statValue, { color: "#8B5CF6" }]}>{Math.round(stats.avgCaloriesPerSession)}</Text>
          <Text style={styles.statLabel}>Avg Calories</Text>
        </View>
      </View>
    )
  }

  const renderChart = () => {
    if (historySessions.length === 0) return null

    const last7Sessions = historySessions.slice(-7).reverse()
    const data = {
      labels: last7Sessions.map((session) => {
        const date = new Date(session.startTime)
        return `${date.getMonth() + 1}/${date.getDate()}`
      }),
      datasets: [
        {
          data: last7Sessions.map((session) => session.totalCaloriesBurned),
          color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>📈 Recent Workout Performance</Text>
        <LineChart
          data={data}
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
    )
  }

  const renderHistorySessionItem = ({ item, index }) => {
    const isExpanded = expandedSessions[item.sessionId]
    const sessionActivities = historyActivities.filter((activity) => activity.sessionId === item.sessionId)
    const sessionDate = new Date(item.startTime)

    return (
      <View style={styles.sessionCard}>
        <TouchableOpacity onPress={() => toggleSession(item.sessionId)} style={styles.sessionHeader}>
          <View style={styles.sessionDateContainer}>
            <Text style={styles.sessionDay}>{sessionDate.getDate()}</Text>
            <Text style={styles.sessionMonth}>{sessionDate.toLocaleDateString("en", { month: "short" })}</Text>
          </View>

          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>Workout Session #{index + 1}</Text>
            <Text style={styles.sessionDate}>{sessionDate.toLocaleDateString("en", { weekday: "long" })}</Text>
            <View style={styles.sessionStats}>
              <View style={styles.sessionStat}>
                <Ionicons name="flame" size={14} color="#FF6B35" />
                <Text style={styles.sessionStatText}>{item.totalCaloriesBurned} kcal</Text>
              </View>
              <View style={styles.sessionStat}>
                <Ionicons name="time" size={14} color="#10B981" />
                <Text style={styles.sessionStatText}>{item.totalDurationMinutes} min</Text>
              </View>
              <View style={styles.sessionStat}>
                <Ionicons name="fitness" size={14} color="#8B5CF6" />
                <Text style={styles.sessionStatText}>{sessionActivities.length} exercises</Text>
              </View>
            </View>
          </View>

          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#4F46E5" />
        </TouchableOpacity>

        {item.notes && (
          <View style={styles.sessionNotes}>
            <Ionicons name="document-text" size={14} color="#64748B" />
            <Text style={styles.sessionNotesText}>{item.notes}</Text>
          </View>
        )}

        {isExpanded && sessionActivities.length > 0 && (
          <View style={styles.activitiesContainer}>
            <Text style={styles.activitiesTitle}> Exercise Activities</Text>
            {sessionActivities.map((activity, activityIndex) => (
              <View key={activity.activityId} style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View style={styles.activityNumber}>
                    <Text style={styles.activityNumberText}>{activityIndex + 1}</Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>Exercise #{activity.exerciseId}</Text>
                    <Text style={styles.activityType}>
                      {ACTIVITY_TYPE_MAP[activity.activityType] || `Type ${activity.activityType}`}
                    </Text>
                    <View style={styles.activityStats}>
                      <View style={styles.activityStat}>
                        <Ionicons name="flame" size={12} color="#FF6B35" />
                        <Text style={styles.activityStatText}>{activity.caloriesBurned} kcal</Text>
                      </View>
                      <View style={styles.activityStat}>
                        <Ionicons name="time" size={12} color="#10B981" />
                        <Text style={styles.activityStatText}>{activity.durationMinutes} min</Text>
                      </View>
                      {activity.steps > 0 && (
                        <View style={styles.activityStat}>
                          <Ionicons name="footsteps" size={12} color="#3B82F6" />
                          <Text style={styles.activityStatText}>{activity.steps} steps</Text>
                        </View>
                      )}
                      {activity.distanceKm > 0 && (
                        <View style={styles.activityStat}>
                          <Ionicons name="location" size={12} color="#F59E0B" />
                          <Text style={styles.activityStatText}>{activity.distanceKm} km</Text>
                        </View>
                      )}
                    </View>
                    {activity.heartRate > 0 && (
                      <View style={styles.activityExtra}>
                        <Ionicons name="heart" size={12} color="#EF4444" />
                        <Text style={styles.activityExtraText}>Heart Rate: {activity.heartRate} bpm</Text>
                      </View>
                    )}
                    <View style={styles.activityExtra}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={styles.activityExtraText}>Status: {activity.goalStatus}</Text>
                    </View>
                    <Text style={styles.activityTime}>{new Date(activity.recordedAt).toLocaleTimeString()}</Text>
                  </View>
                  <View style={styles.activityActions}>
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
              </View>
            ))}
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
            <Text style={styles.filterModalTitle}>🔍 Filter Workout History</Text>
            <TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>🔍 Search Notes</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Search in workout notes..."
                value={filters.searchTerm}
                onChangeText={(text) => setFilters((prev) => ({ ...prev, searchTerm: text }))}
                placeholderTextColor="#9CA3AF"
              />
            </View>

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
              <Text style={styles.filterLabel}>⏱️ Duration Range (minutes)</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Min Duration</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="0"
                    value={filters.minDuration}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev, minDuration: text }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Max Duration</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="120"
                    value={filters.maxDuration}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev, maxDuration: text }))}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingTitle}>Loading Workout History</Text>
          <Text style={styles.loadingText}>Please wait a moment...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      {/* Header */}
      <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Workout History</Text>
            <Text style={styles.headerSubtitle}>Track your fitness journey</Text>
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="options" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton("overview", "Overview", "analytics")}
        {renderTabButton("sessions", "Sessions", "list")}
      </View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
              <Text style={styles.retryButtonText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === "overview" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderStatsCards()}
            {renderChart()}

            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>📊 Quick Stats</Text>
              <View style={styles.quickStatsCard}>
                <Text style={styles.quickStatsText}>
                  You've completed{" "}
                  <Text style={styles.quickStatsHighlight}>{historySessions.length} workout sessions</Text> and burned a
                  total of{" "}
                  <Text style={styles.quickStatsHighlight}>{Math.round(getWorkoutStats().totalCalories)} calories</Text>
                  .
                </Text>
                <Text style={styles.quickStatsText}>
                  Your average session burns{" "}
                  <Text style={styles.quickStatsHighlight}>
                    {Math.round(getWorkoutStats().avgCaloriesPerSession)} calories
                  </Text>{" "}
                  and lasts{" "}
                  <Text style={styles.quickStatsHighlight}>
                    {Math.round(getWorkoutStats().avgDurationPerSession)} minutes
                  </Text>
                  .
                </Text>
              </View>
            </View>
          </ScrollView>
        )}

        {activeTab === "sessions" && (
          <View style={styles.sessionsTab}>
            <View style={styles.sessionsHeader}>
              <Text style={styles.sectionTitle}>
                🏋️ Workout Sessions ({filteredSessions.length}/{historySessions.length})
              </Text>
            </View>

            <FlatList
              data={filteredSessions}
              renderItem={renderHistorySessionItem}
              keyExtractor={(item) => item.sessionId.toString()}
              contentContainerStyle={styles.listContainer}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />}
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
    backgroundColor: "#4F46E5",
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
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
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionsCard: {
    backgroundColor: "#EEF2FF",
  },
  caloriesCard: {
    backgroundColor: "#FFF7ED",
  },
  durationCard: {
    backgroundColor: "#F0FDF4",
  },
  avgCard: {
    backgroundColor: "#F5F3FF",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
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
  overviewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  quickStatsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickStatsText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 12,
  },
  quickStatsHighlight: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  sessionsTab: {
    flex: 1,
  },
  sessionsHeader: {
    marginBottom: 16,
  },
  sessionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionDateContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  sessionDay: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  sessionMonth: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  sessionDate: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  sessionStats: {
    flexDirection: "row",
    gap: 12,
  },
  sessionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionStatText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  sessionNotes: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  sessionNotesText: {
    fontSize: 12,
    color: "#64748B",
    flex: 1,
  },
  activitiesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  activitiesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  activityNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityNumberText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 2,
  },
  activityType: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  activityStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  activityStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  activityStatText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  activityExtra: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 2,
  },
  activityExtraText: {
    fontSize: 11,
    color: "#64748B",
  },
  activityTime: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 4,
  },
  activityActions: {
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
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#4F46E5",
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
    alignItems: "center",
    padding: 16,
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

export default WorkoutHistoryScreen
