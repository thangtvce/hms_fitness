"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  ScrollView,
  Animated,
  Image,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import Header from "components/Header"
import Loading from "components/Loading"
import { showErrorFetchAPI } from "utils/toastUtil"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { workoutService } from "services/apiWorkoutService"
import { BarChart } from "react-native-chart-kit"
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
  const [refreshing, setRefreshing] = useState(false)
  const [fadeAnim] = useState(new Animated.Value(0))
  const [exerciseMap, setExerciseMap] = useState({})

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
      const activitiesResponse = await workoutService.getMyActivities({ pageNumber: 1, pageSize: 100 })
      const activities = activitiesResponse || []
      setHistoryActivities(Array.isArray(activities) ? activities : [])
      groupActivitiesByDate(Array.isArray(activities) ? activities : [])
      // Fetch exercise details for all unique exerciseIds
      const uniqueIds = [...new Set((activities || []).map(a => a.exerciseId).filter(Boolean))]
      const map = {}
      await Promise.all(uniqueIds.map(async (id) => {
        try {
          const ex = await workoutService.getExerciseById(id)
          map[id] = ex
        } catch {}
      }))
      setExerciseMap(map)
    } catch (err) {
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
          sessionCount: 0,
        }
      }
      grouped[date].activities.push(activity)
      grouped[date].totalCalories += activity.caloriesBurned || 0
      grouped[date].totalDuration += activity.durationMinutes || 0
      grouped[date].sessionCount += 1
    })

    // Sort by date (newest first)
    const sortedEntries = Object.entries(grouped).sort(([dateA], [dateB]) => {
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    setGroupedActivities(Object.fromEntries(sortedEntries))
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchActivities()
  }

  const getTotalStats = () => {
    const totalCalories = Object.values(groupedActivities).reduce((sum, day) => sum + day.totalCalories, 0)
    const totalDuration = Object.values(groupedActivities).reduce((sum, day) => sum + day.totalDuration, 0)
    const totalSessions = Object.values(groupedActivities).reduce((sum, day) => sum + day.sessionCount, 0)
    const totalDays = Object.keys(groupedActivities).length

    return { totalCalories, totalDuration, totalSessions, totalDays }
  }

  const getWeeklyChartData = () => {
    const last7Days = Object.entries(groupedActivities).slice(0, 7).reverse()

    if (last7Days.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      }
    }

    return {
      labels: last7Days.map(([date]) => {
        const d = new Date(date)
        return `${d.getDate()}/${d.getMonth() + 1}`
      }),
      datasets: [
        {
          data: last7Days.map(([, data]) => data.sessionCount),
        },
      ],
    }
  }

  const renderStatsOverview = () => {
    const stats = getTotalStats()

    return (
      <View style={styles.statsContainer}>
        <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.mainStatCard}>
          <View style={styles.mainStatContent}>
            <Text style={styles.mainStatValue}>{stats.totalSessions}</Text>
            <Text style={styles.mainStatLabel}>Total Workouts</Text>
          </View>
          <View style={styles.mainStatIcon}>
            <Ionicons name="fitness" size={32} color="rgba(255,255,255,0.8)" />
          </View>
        </LinearGradient>

        <View style={styles.subStatsRow}>
          <View style={styles.subStatCard}>
            <Text style={styles.subStatValue}>{Math.round(stats.totalCalories)}</Text>
            <Text style={styles.subStatLabel}>Calories</Text>
          </View>
          <View style={styles.subStatCard}>
            <Text style={styles.subStatValue}>{Math.round(stats.totalDuration)}</Text>
            <Text style={styles.subStatLabel}>Minutes</Text>
          </View>
          <View style={styles.subStatCard}>
            <Text style={styles.subStatValue}>{stats.totalDays}</Text>
            <Text style={styles.subStatLabel}>Active Days</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderChart = () => {
    const chartData = getWeeklyChartData()

    if (chartData.labels.length === 0) {
      return null
    }

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weekly Activity</Text>
        <BarChart
          data={chartData}
          width={width - 60}
          height={200}
          chartConfig={{
            backgroundColor: "#ffffff",
            backgroundGradientFrom: "#ffffff",
            backgroundGradientTo: "#ffffff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(55, 65, 81, ${opacity})`,
            style: { borderRadius: 16 },
            barPercentage: 0.7,
          }}
          style={styles.chart}
          showValuesOnTopOfBars={true}
          withInnerLines={false}
          fromZero={true}
        />
      </View>
    )
  }

  const renderDayItem = ({ item: [date, dayData] }) => {
    const dayDate = new Date(date)
    const isToday = dayDate.toDateString() === new Date().toDateString()
    const isYesterday = dayDate.toDateString() === new Date(Date.now() - 86400000).toDateString()

    let dayLabel = dayDate.toLocaleDateString("en", { weekday: "long" })
    if (isToday) dayLabel = "Today"
    if (isYesterday) dayLabel = "Yesterday"

    return (
      <TouchableOpacity style={styles.dayCard} activeOpacity={0.7}>
        <View style={styles.dayHeader}>
          <View style={styles.dayDateContainer}>
            <Text style={styles.dayNumber}>{dayDate.getDate()}</Text>
            <Text style={styles.dayMonth}>{dayDate.toLocaleDateString("en", { month: "short" })}</Text>
          </View>

          <View style={styles.dayInfo}>
            <Text style={styles.dayTitle}>{dayLabel}</Text>
            <Text style={styles.dayDate}>
              {dayDate.toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}
            </Text>

            <View style={styles.dayStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dayData.sessionCount}</Text>
                <Text style={styles.statText}>workouts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dayData.totalCalories}</Text>
                <Text style={styles.statText}>kcal</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dayData.totalDuration}</Text>
                <Text style={styles.statText}>min</Text>
              </View>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </View>

        <View style={styles.workoutsList}>
          {dayData.activities.map((activity, index) => {
            const ex = exerciseMap[activity.exerciseId] || {};
            return (
              <View key={activity.activityId} style={styles.workoutItem}>
                <View style={styles.workoutDot} />
                <View style={styles.workoutInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    {ex.imageUrl || ex.mediaUrl ? (
                      <Image source={{ uri: ex.imageUrl || ex.mediaUrl }} style={{ width: 32, height: 32, borderRadius: 6, marginRight: 8, backgroundColor: '#e5e7eb' }} />
                    ) : null}
                    <Text style={styles.workoutTitle}>
                      {ex.exerciseName || `${ACTIVITY_TYPE_MAP[activity.activityType] || "Exercise"} #${activity.exerciseId}`}
                    </Text>
                  </View>
                  <Text style={styles.workoutDetails}>
                    {activity.caloriesBurned} kcal • {activity.durationMinutes} s
                    {activity.steps > 0 && ` • ${activity.steps} steps`}
                  </Text>
                  <Text style={styles.workoutTime}>
                    {new Date(activity.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </TouchableOpacity>
    )
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#0056d2" />
        <View style={styles.loadingContainer}>
          <Loading />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0056d2" />
      <DynamicStatusBar backgroundColor="#0056d2" />

      <Header
        title="Activity History"
        subtitle="Track your fitness progress"
        onBack={() => navigation.goBack()}
        style={{ backgroundColor: "#0056d2" }}
      />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0056d2"]} />}
        >
          {renderStatsOverview()}
          {renderChart()}

          <View style={styles.activitiesSection}>
            <Text style={styles.sectionTitle}>Recent Activities</Text>

            {Object.keys(groupedActivities).length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="fitness-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Activities Yet</Text>
                <Text style={styles.emptyText}>Start working out to see your activities here!</Text>
              </View>
            ) : (
              <FlatList
                data={Object.entries(groupedActivities)}
                renderItem={renderDayItem}
                keyExtractor={([date]) => date}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0056d2",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  statsContainer: {
    padding: 20,
    paddingTop: 30,
  },
  mainStatCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  mainStatContent: {
    flex: 1,
  },
  mainStatValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  mainStatLabel: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  mainStatIcon: {
    opacity: 0.3,
  },
  subStatsRow: {
    flexDirection: "row",
    gap: 12,
  },
  subStatCard: {
    flex: 1,
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
  subStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0056d2",
    marginBottom: 4,
  },
  subStatLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    marginTop: 0,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  activitiesSection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  dayCard: {
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
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dayDateContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dayMonth: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dayInfo: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 8,
  },
  dayStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0056d2",
  },
  statText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  workoutsList: {
    gap: 12,
  },
  workoutItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  workoutDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0056d2",
    marginTop: 6,
    marginRight: 12,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  workoutDetails: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 2,
  },
  workoutTime: {
    fontSize: 11,
    color: "#9CA3AF",
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
    color: "#6B7280",
    textAlign: "center",
  },
})

export default UserActivityScreen
