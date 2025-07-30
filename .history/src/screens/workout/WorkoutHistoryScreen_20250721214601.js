
  

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
import { LineChart } from "react-native-chart-kit"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

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
  const [activeTab, setActiveTab] = useState("sessions")
  const [fadeAnim] = useState(new Animated.Value(0))
const navigation = useNavigation();
  // Đảm bảo callback luôn nhận đúng activity object
  const handlePressActivity = (activity) => {
    try {
      if (activity && activity.exerciseId) {
        navigation.navigate('ExerciseDetailsScreen', { exerciseId: activity.exerciseId, activity });
      } else {
        console.warn('handlePressActivity called with invalid activity:', activity);
        Alert.alert('Invalid Activity', 'Cannot open details: activity is invalid. See console for details.');
      }
    } catch (err) {
      console.error('Error in handlePressActivity:', err, activity);
      Alert.alert('Error', 'An error occurred in handlePressActivity. See console for details.');
    }
  };
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
    }).start();
    fetchSessions();
  }, []);

  // Chỉ lấy session thôi
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const sessionsResponse = await workoutService.getMyWorkoutSessions({ pageNumber: 1, pageSize: 200 });
      let sessions = [];
      if (sessionsResponse && sessionsResponse.data && Array.isArray(sessionsResponse.data.sessions)) {
        sessions = sessionsResponse.data.sessions;
      } else if (Array.isArray(sessionsResponse)) {
        sessions = sessionsResponse;
      }
      setHistorySessions(sessions.reverse());
      setError(null);
    } catch (err) {
      setError(err || "Failed to fetch workout sessions");
      showErrorFetchAPI(err || "Failed to fetch workout sessions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [historySessions, filters]);

  const fetchHistory = fetchSessions;

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

  // Khi expand session, fetch tên bài tập cho từng activity nếu chưa có
  const toggleSession = async (sessionId) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));

    // Nếu vừa expand (mở rộng)
    if (!expandedSessions[sessionId]) {
      // Tìm session
      const sessionIdx = historySessions.findIndex(s => s.sessionId === sessionId);
      if (sessionIdx === -1) return;
      const session = historySessions[sessionIdx];
      if (!session || !Array.isArray(session.userActivities)) return;

      // Copy sessions để cập nhật state
      const sessionsCopy = [...historySessions];
      let updated = false;
      // Duyệt từng activity, nếu chưa có exerciseName hoặc exerciseImage thì fetch
      for (let i = 0; i < session.userActivities.length; i++) {
        const act = session.userActivities[i];
        if (act && act.exerciseId && (!act.exerciseName || !act.exerciseImage)) {
          try {
            const exercise = await workoutService.getExerciseById(act.exerciseId);
            if (exercise) {
              session.userActivities[i] = {
                ...act,
                exerciseName: exercise.exerciseName || act.exerciseName,
                exerciseImage: exercise.imageUrl || exercise.image || null,
              };
              updated = true;
            }
          } catch (e) {
            // Bỏ qua nếu lỗi
          }
        }
      }
      if (updated) {
        sessionsCopy[sessionIdx] = { ...session };
        setHistorySessions(sessionsCopy);
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
      <Text style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>{title}</Text>
    </TouchableOpacity>
  )

  const renderStatsCards = () => {
    const stats = getWorkoutStats();
    return (
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Text style={[styles.statValue, styles.primaryText]}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Total Sessions</Text>
        </View>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Text style={[styles.statValue, styles.primaryText]}>{Math.round(stats.totalCalories)}</Text>
          <Text style={styles.statLabel}>Total Calories</Text>
        </View>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Text style={[styles.statValue, styles.primaryText]}>{Math.round(stats.totalDuration)}</Text>
          <Text style={styles.statLabel}>Total Minutes</Text>
        </View>
        <View style={[styles.statCard, styles.primaryCard]}>
          <Text style={[styles.statValue, styles.primaryText]}>{Math.round(stats.avgCaloriesPerSession)}</Text>
          <Text style={styles.statLabel}>Avg Calories</Text>
        </View>
      </View>
    );
  };

  const renderChart = () => {
    if (historySessions.length === 0) return null;
    // Lấy 7 session cuối cùng, giữ nguyên thứ tự từ cũ đến mới
    const last7Sessions = historySessions.slice(-7);
    const data = {
      labels: last7Sessions.map((session) => {
        const date = new Date(session.startTime);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [
        {
          data: last7Sessions.map((session) => session.totalCaloriesBurned),
          color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Recent Workout Performance</Text>
        <LineChart
          data={data}
          width={width - 40}
          height={220}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
            style: { borderRadius: 16 },
            propsForDots: {
              r: "8",
              strokeWidth: "3",
              stroke: "#0056d2",
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
    );
  };

  const renderHistorySessionItem = ({ item, index }) => {
    const isExpanded = expandedSessions[item.sessionId];
    const sessionDate = new Date(item.startTime);
    const activities = Array.isArray(item.userActivities) ? item.userActivities : [];
    // Log activities array for debugging
    return (
      <View style={styles.sessionCardPrimary}>
        <TouchableOpacity onPress={() => toggleSession(item.sessionId)} style={styles.sessionHeaderPrimary}>
          <View style={styles.sessionDateContainerPrimary}>
            <Text style={styles.sessionDayPrimary}>{sessionDate.getDate()}</Text>
            <Text style={styles.sessionMonthPrimary}>{sessionDate.toLocaleDateString("en", { month: "short" })}</Text>
          </View>
          <View style={styles.sessionInfoPrimary}>
            <Text style={styles.sessionTitlePrimary}>Workout Session #{index + 1}</Text>
            <Text style={styles.sessionDatePrimary}>{sessionDate.toLocaleDateString("en", { weekday: "long" })}</Text>
            <View style={styles.sessionStatsPrimary}>
              <View style={styles.sessionStatPrimary}>
                <Text style={styles.sessionStatTextPrimary}>{item.totalCaloriesBurned} kcal</Text>
              </View>
              <View style={styles.sessionStatPrimary}>
                <Text style={styles.sessionStatTextPrimary}>{item.totalDurationMinutes} sec</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        {item.notes && (
          <View style={styles.sessionNotesPrimary}>
            <Text style={styles.sessionNotesTextPrimary}>{item.notes}</Text>
          </View>
        )}
        {isExpanded && (
          <View style={styles.activitiesContainer}>
            <Text style={styles.activitiesTitle}>Activities</Text>
            {activities && Array.isArray(activities) && activities.length === 0 ? (
              <Text style={{ color: '#64748B', fontSize: 13 }}>No activities found for this session.</Text>
            ) : (
              activities && Array.isArray(activities) && activities.map((act, idx) => {
                console.log('Activity in map:', idx, act);
                if (!act || typeof act !== 'object' || !('exerciseId' in act) || !act.exerciseId) return null;
                return (
                  <TouchableOpacity
                    key={act && act.activityId ? act.activityId : `activity-${idx}`}
                    style={styles.activityCard}
                    onPress={() => handlePressActivity(act)}
                  >
                    <View style={styles.activityHeader}>
                      <View style={styles.activityNumber}><Text style={styles.activityNumberText}>{idx + 1}</Text></View>
                      <View style={styles.activityInfo}>
                        {/* Hiển thị hình ảnh bài tập nếu có */}
                        {act.exerciseImage ? (
                          <View style={{ marginBottom: 6 }}>
                            <Image source={{ uri: act.exerciseImage }} style={{ width: 60, height: 60, borderRadius: 8, marginBottom: 4 }} resizeMode="cover" />
                          </View>
                        ) : null}
                        <Text style={styles.activityName}>{act.exerciseName || 'Exercise'}</Text>
                        <Text style={styles.activityType}>{ACTIVITY_TYPE_MAP[act.activityType] || 'Activity'}</Text>
                        <View style={styles.activityStats}>
                          <View style={styles.activityStat}><Text style={styles.activityStatText}>{act.caloriesBurned} kcal</Text></View>
                          <View style={styles.activityStat}><Text style={styles.activityStatText}>{act.durationMinutes} sec</Text></View>
                          {act.steps ? <View style={styles.activityStat}><Text style={styles.activityStatText}>{act.steps} steps</Text></View> : null}
                          {act.distanceKm ? <View style={styles.activityStat}><Text style={styles.activityStatText}>{act.distanceKm} km</Text></View> : null}
                        </View>
                        <Text style={styles.activityTime}>{act.recordedAt ? new Date(act.recordedAt).toLocaleString() : ''}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}> Filter Workout History</Text>
            <TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={{ fontSize: 18, color: "#64748B" }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}> Search Notes</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Search in workout notes..."
                value={filters.searchTerm}
                onChangeText={(text) => setFilters((prev) => ({ ...prev, searchTerm: text }))}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}> Date Range</Text>
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
              <Text style={styles.filterLabel}> Calorie Range</Text>
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
              <Text style={styles.filterLabel}> Duration Range (minutes)</Text>
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
              <Text style={styles.filterLabel}> Sort Options</Text>
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
            <Text style={styles.editModalTitle}> Edit Activity</Text>
            <TouchableOpacity style={styles.editCloseButton} onPress={() => setEditModalVisible(false)}>
              <Text style={{ fontSize: 18, color: "#64748B" }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.editModalBody}>
            <View style={styles.editGroup}>
              <Text style={styles.editLabel}> Calories Burned</Text>
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
              <Text style={styles.editLabel}> Duration (minutes)</Text>
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
              <Text style={styles.editSaveText}> Save Changes</Text>
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
        title="Workout History"
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: "options",
            onPress: () => setFilterModalVisible(true),
            color: "#0056d2",
          },
        ]}
    
      />

      {/* Tabs */}
      <View style={[styles.tabContainer, { marginTop: 55 }]}> 
        {renderTabButton("overview", "Overview", "analytics")}
        {renderTabButton("sessions", "Sessions", "list")}
      </View>

      <Animated.View style={[styles.container, { opacity: fadeAnim, marginTop: 30 }]}> 
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
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
              <Text style={styles.sectionTitle}> Quick Stats</Text>
              <View style={styles.quickStatsCard}>
                <Text style={styles.quickStatsText}>
                  You've completed{" "}
                <Text style={styles.primaryText}>{historySessions.length} workout sessions</Text> and burned a
                total of <Text style={styles.primaryText}>{Math.round(getWorkoutStats().totalCalories)} calories</Text>.
              </Text>
              <Text style={styles.quickStatsText}>
                Your average session burns <Text style={styles.primaryText}>{Math.round(getWorkoutStats().avgCaloriesPerSession)} calories</Text> and lasts <Text style={styles.primaryText}>{Math.round(getWorkoutStats().avgDurationPerSession)} minutes</Text>.
              </Text>
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
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
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
    backgroundColor: "#FFFFFF",
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
    borderBottomColor: "#0056d2",
  },
  tabText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#0056d2",
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
  primaryCard: {
    backgroundColor: "#e6f0fa",
  },
  primaryText: {
    color: "#0056d2",
    fontWeight: "700",
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
  sessionCardPrimary: {
    backgroundColor: "#e6f0fa",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#0056d2",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  sessionHeaderPrimary: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sessionDateContainerPrimary: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 18,
    borderWidth: 2,
    borderColor: "#fff",
  },
  sessionDayPrimary: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
  },
  sessionMonthPrimary: {
    fontSize: 11,
    color: "#e6f0fa",
    textTransform: "uppercase",
    fontWeight: "700",
    textAlign: "center",
  },
  sessionInfoPrimary: {
    flex: 1,
  },
  sessionTitlePrimary: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0056d2",
    marginBottom: 2,
  },
  sessionDatePrimary: {
    fontSize: 13,
    color: "#0056d2",
    marginBottom: 8,
    fontWeight: "500",
  },
  sessionStatsPrimary: {
    flexDirection: "row",
    gap: 16,
    marginTop: 2,
  },
  sessionStatPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#e6f0fa",
  },
  sessionStatTextPrimary: {
    fontSize: 13,
    color: "#0056d2",
    fontWeight: "700",
  },
  sessionNotesPrimary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#0056d2",
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionNotesTextPrimary: {
    fontSize: 13,
    color: "#0056d2",
    fontWeight: "600",
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
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  activeSortButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
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
