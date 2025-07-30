
import { useEffect,useState,useContext } from "react"
import { View,Text,StyleSheet,FlatList,ActivityIndicator,TouchableOpacity,Dimensions } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { AuthContext } from "context/AuthContext"
import { foodService } from "services/apiFoodService"
import { BarChart } from "react-native-chart-kit"
import dayjs from "dayjs"
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder"
import isoWeek from "dayjs/plugin/isoWeek"
import Header from "components/Header"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"

dayjs.extend(isoWeek)

const { width: screenWidth } = Dimensions.get("window")

const TABS = [
  { key: "daily",label: "Daily" },
  { key: "weekly",label: "Weekly" },
  { key: "monthly",label: "Monthly" },
]

const CaloriesLogStatisticsScreen = () => {
  const navigation = useNavigation()
  const { user } = useContext(AuthContext)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState(null)
  const [tab,setTab] = useState("daily")
  const [stats,setStats] = useState({
    logsByDate: [],
    logsByWeek: [],
    logsByMonth: [],
    averageCalories: 0,
  })
  const [goalCalories,setGoalCalories] = useState(null)

  const fetchGoalCalories = async () => {
    try {
      const userId = user?.id || user?._id || user?.userId || null
      const key = userId ? `nutritionTarget_${userId}` : "nutritionTarget"
      const saved = await AsyncStorage.getItem(key)
      if (saved) {
        const target = JSON.parse(saved)
        setGoalCalories(target.calories)
      } else {
        setGoalCalories(null)
      }
    } catch (e) {
      setGoalCalories(null)
    }
  }

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true)
        setError(null)
        const res = await foodService.getMyNutritionLogStatistics()
        const logsByDate = res.data?.logsByDate || []

        const totalCalories = logsByDate.reduce((sum,item) => sum + item.totalCalories,0)

        const weekMap = {}
        logsByDate.forEach((item) => {
          const date = dayjs(item.date)
          const weekNum = date.isoWeek()
          const year = date.year()
          const weekKey = `${year}-W${weekNum}`
          if (!weekMap[weekKey]) weekMap[weekKey] = { week: weekKey,totalCalories: 0,count: 0 }
          weekMap[weekKey].totalCalories += item.totalCalories
          weekMap[weekKey].count += 1
        })
        const logsByWeek = Object.values(weekMap)

        const monthMap = {}
        logsByDate.forEach((item) => {
          const date = dayjs(item.date)
          const monthKey = date.format("YYYY-MM")
          if (!monthMap[monthKey]) monthMap[monthKey] = { month: monthKey,totalCalories: 0,count: 0 }
          monthMap[monthKey].totalCalories += item.totalCalories
          monthMap[monthKey].count += 1
        })
        const logsByMonth = Object.values(monthMap)

        const getAvg = (arr) =>
          arr.length === 0 ? 0 : Math.round(arr.reduce((sum,i) => sum + i.totalCalories,0) / arr.length)

        setStats({
          logsByDate,
          logsByWeek,
          logsByMonth,
          averageCalories:
            tab === "daily" ? getAvg(logsByDate) : tab === "weekly" ? getAvg(logsByWeek) : getAvg(logsByMonth),
        })
      } catch (err) {
        showErrorFetchAPI(err);
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
    fetchGoalCalories()

    const unsubscribe = navigation.addListener('focus',() => {
      fetchStatistics()
      fetchGoalCalories()
    })
    return unsubscribe
  },[navigation,tab])

  const getCurrentData = () => {
    if (tab === "daily") return stats.logsByDate
    if (tab === "weekly") return stats.logsByWeek
    if (tab === "monthly") return stats.logsByMonth
    return []
  }

  const chartData = getCurrentData()

  const getWeekLabel = (weekStr) => {
    const [year,week] = weekStr.split("-W")
    return `Week ${week}`
  }

  const getMonthLabel = (monthStr) => {
    return dayjs(monthStr).format("MMM YYYY")
  }

  const labels = chartData.map((item) => {
    if (tab === "daily") return dayjs(item.date).format("MM/DD")
    if (tab === "weekly") return getWeekLabel(item.week)
    return getMonthLabel(item.month)
  })

  const calories = chartData.map((item) => item.totalCalories)

  const getChartMaxValue = () => {
    const maxDataValue = calories.length > 0 ? Math.max(...calories) : 0
    if (goalCalories) {
      const maxValue = Math.max(goalCalories,maxDataValue)
      return Math.ceil(maxValue * 1.2)
    }
    return Math.ceil(maxDataValue * 1.2)
  }

  const chartMaxValue = getChartMaxValue()


  const getGoalLinePosition = () => {
    if (!goalCalories || chartMaxValue === 0) return null
    const chartHeight = 220; // Use the same height as BarChart
    return chartHeight - (goalCalories / chartMaxValue) * chartHeight;
  }

  const goalLinePosition = getGoalLinePosition()

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Calorie Statistics" onBack={() => navigation.goBack()} />
        {/* Tabs luôn hiển thị */}
        <View style={styles.contentWrapper}>
          <View style={styles.tabContainer}>
            {TABS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.tab,tab === t.key && styles.tabActive]}
                onPress={() => setTab(t.key)}
              >
                <Text style={[styles.tabLabel,tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ padding: 8 }}>
            {/* Shimmer cho Header */}
            {/* Shimmer cho Statistics Cards */}
            <View style={{ flexDirection: 'row',gap: 12,marginBottom: 24 }}>
              <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 16 }} />
              <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 16 }} />
            </View>
            {/* Shimmer cho Chart */}
            <ShimmerPlaceholder style={{ height: 260,borderRadius: 16,marginBottom: 24 }} />
            {/* Shimmer cho History Card */}
            <ShimmerPlaceholder style={{ height: 260,borderRadius: 16 }} />
          </View>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Calorie Statistics" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="Calorie Statistics" onBack={() => navigation.goBack()} />

      <View style={styles.contentWrapper}>
        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab,tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel,tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient colors={["#0056d2","#0056d2"]} style={styles.statCard}>
            <Text style={styles.statLabel}>Average Intake</Text>
            <Text style={styles.statValue}>{stats.averageCalories}</Text>
            <Text style={styles.statUnit}>kcal</Text>
          </LinearGradient>

          {goalCalories && (
            <LinearGradient colors={["#0056d2","#0056d2"]} style={styles.statCard}>
              <Text style={styles.statLabel}>Daily Goal</Text>
              <Text style={styles.statValue}>{goalCalories}</Text>
              <Text style={styles.statUnit}>kcal</Text>
            </LinearGradient>
          )}
        </View>

        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Calorie Intake Trends</Text>

          <View style={styles.chartWrapper}>
            <BarChart
              data={{
                labels: labels,
                datasets: [
                  {
                    data: calories.length > 0 ? calories : [0],
                    color: (opacity = 1) => `rgba(255, 107, 107, ${opacity})`,
                  },
                ],
              }}
              width={screenWidth - 32}
              height={220}
              yAxisLabel=""
              yAxisSuffix=""
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,

                style: {
                  borderRadius: 16,
                },
                propsForBackgroundLines: {
                  strokeDasharray: "5,5",
                  stroke: "#e3e3e3",
                  strokeWidth: 1,
                },
                propsForLabels: {
                  fontSize: 12,
                  fontWeight: "500",
                },
              }}
              style={styles.chart}
              fromZero={true}
              showValuesOnTopOfBars={true}
              yAxisInterval={1}
              segments={5}
              yMax={chartMaxValue}
            />
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent History</Text>
          <FlatList
            data={chartData.slice(0,10)} // Show only recent 10 entries
            keyExtractor={(item,idx) =>
              (tab === "daily" ? item.date : tab === "weekly" ? item.week : item.month) + idx
            }
            renderItem={({ item,index }) => (
              <View style={[styles.historyItem,index === 0 && styles.historyItemFirst]}>
                <View style={styles.historyItemLeft}>
                  <Text style={styles.historyDate}>
                    {tab === "daily"
                      ? dayjs(item.date).format("MMM DD, YYYY")
                      : tab === "weekly"
                        ? `${getWeekLabel(item.week)} - ${item.week.split("-")[0]}`
                        : getMonthLabel(item.month)}
                  </Text>
                  {goalCalories && (
                    <Text
                      style={[
                        styles.historyStatus,
                        item.totalCalories >= goalCalories ? styles.statusSuccess : styles.statusWarning,
                      ]}
                    >
                      {item.totalCalories >= goalCalories ? "Goal Achieved" : "Below Goal"}
                    </Text>
                  )}
                </View>
                <View style={styles.historyItemRight}>
                  <Text style={styles.historyCalories}>{item.totalCalories}</Text>
                  <Text style={styles.historyUnit}>kcal</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
                <Text style={styles.emptySubtext}>Start logging your meals to see statistics</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 120,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  errorText: {
    color: "#0056d2",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#0056d2",
    shadowColor: "#0056d2",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  tabLabelActive: {
    color: "#ffffff",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#ffffff",
    opacity: 0.9,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
  },
  statUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: "#ffffff",
    opacity: 0.8,
  },
  chartContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 16,
    textAlign: "center",
  },
  chartWrapper: {
    position: "relative",
    alignItems: "center",
  },
  chart: {
    borderRadius: 16,
  },
  goalLine: {
    position: "absolute",
    left: 50,
    right: 20,
    height: 2,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 10,
  },
  goalLineDash: {
    flex: 1,
    height: 2,
    backgroundColor: "#4ECDC4",
    opacity: 0.8,
  },
  goalLabelContainer: {
    backgroundColor: "#4ECDC4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  goalLabelText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#ffffff",
  },
  historyContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  historyItemFirst: {
    borderTopWidth: 0,
  },
  historyItemLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 2,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusSuccess: {
    color: "#27ae60",
  },
  statusWarning: {
    color: "#f39c12",
  },
  historyItemRight: {
    alignItems: "flex-end",
  },
  historyCalories: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0056d2",
  },
  historyUnit: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
})

export default CaloriesLogStatisticsScreen
