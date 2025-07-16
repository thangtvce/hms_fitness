import React, { useEffect, useState, useContext } from "react"
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native"
import { BarChart } from "react-native-chart-kit"
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"
import Header from "components/Header"
import { theme } from "theme/color"
import { workoutService } from "services/apiWorkoutService"
import { AuthContext } from "context/AuthContext"

const { width: screenWidth } = Dimensions.get("window")

dayjs.extend(isoWeek)

const TABS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
]

const ActiveStaticsScreen = () => {
  const { user } = useContext(AuthContext)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState("daily")
  const [stats, setStats] = useState({
    logsByDate: [],
    logsByWeek: [],
    logsByMonth: [],
  })

  const fetchStatistics = async () => {
    try {
      setLoading(true)
      setError(null)
      const sessions = await workoutService.getMyWorkoutSessions({ pageNumber: 1, pageSize: 100 })
      // sessions is array of session objects
      const mappedLogs = sessions.map((item) => ({
        date: item.startTime ? dayjs(item.startTime).format("YYYY-MM-DD") : "",
        calories: item.totalCaloriesBurned || 0,
      }))
      // Group by date
      const logsByDateMap = {}
      mappedLogs.forEach((item) => {
        if (!logsByDateMap[item.date]) logsByDateMap[item.date] = { date: item.date, calories: 0 }
        logsByDateMap[item.date].calories += item.calories
      })
      const logsByDate = Object.values(logsByDateMap).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      // Group by week
      const weekMap = {}
      logsByDate.forEach((item) => {
        const date = dayjs(item.date)
        const weekNum = date.isoWeek()
        const year = date.year()
        const weekKey = `${year}-W${weekNum}`
        if (!weekMap[weekKey]) weekMap[weekKey] = { week: weekKey, calories: 0 }
        weekMap[weekKey].calories += item.calories
      })
      const logsByWeek = Object.values(weekMap)
      // Group by month
      const monthMap = {}
      logsByDate.forEach((item) => {
        const date = dayjs(item.date)
        const monthKey = date.format("YYYY-MM")
        if (!monthMap[monthKey]) monthMap[monthKey] = { month: monthKey, calories: 0 }
        monthMap[monthKey].calories += item.calories
      })
      const logsByMonth = Object.values(monthMap)
      setStats({ logsByDate, logsByWeek, logsByMonth })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [tab])

  const getCurrentData = () => {
    if (tab === "daily") return stats.logsByDate
    if (tab === "weekly") return stats.logsByWeek
    if (tab === "monthly") return stats.logsByMonth
    return []
  }

  const chartData = getCurrentData()

  const getWeekLabel = (weekStr) => {
    const [year, week] = weekStr.split("-W")
    return `Week ${week}`
  }

  const getMonthLabel = (monthStr) => {
    return dayjs(monthStr).format("MMM YYYY")
  }

  // BarChart data
  const barLabels = chartData.map((item) =>
    tab === "daily"
      ? dayjs(item.date).format("DD/MM")
      : tab === "weekly"
      ? getWeekLabel(item.week)
      : getMonthLabel(item.month)
  )
  const barValues = chartData.map((item) => item.calories)

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Active Statistics" onBack={() => {}} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Active Statistics" onBack={() => {}} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="Active Statistics" onBack={() => {}} />
      <View style={styles.contentWrapper}>
        {/* Tab Selection */}
        <View style={styles.tabContainer}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tab, tab === t.key && styles.tabActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Calories Burned</Text>
          <View style={styles.chartWrapper}>
            {barValues.length === 0 ? (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyChartText}>No workout data to display for this period.</Text>
              </View>
            ) : (
              <BarChart
                data={{
                  labels: barLabels,
                  datasets: [{ data: barValues }],
                }}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  color: (opacity = 1) => `rgba(32, 178, 170, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                  decimalPlaces: 0,
                }}
                style={{ borderRadius: 12 }}
                fromZero
                showValuesOnTopOfBars
              />
            )}
          </View>
        </View>
        {/* History Section */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent History</Text>
          <FlatList
            data={stats.logsByDate.slice(0, 10)}
            keyExtractor={(item, idx) => item.date + idx}
            renderItem={({ item, index }) => (
              <View style={[styles.historyItem, index === 0 && styles.historyItemFirst]}>
                <View style={styles.historyItemLeft}>
                  <Text style={styles.historyDate}>{dayjs(item.date).format("MMM DD, YYYY")}</Text>
                </View>
                <View style={styles.historyItemRight}>
                  <Text style={styles.historyNutrient}>{item.calories} Kcal</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
                <Text style={styles.emptySubtext}>Start logging your workouts to see statistics</Text>
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
    color: theme.primaryColor,
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 100,
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
    borderColor: theme.primaryColor,
    borderWidth: 2,
    shadowColor: theme.primaryColor,
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
    color: theme.primaryColor,
    fontWeight: "bold",
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
  emptyChartContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyChartText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
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
  historyItemRight: {
    alignItems: "flex-end",
  },
  historyNutrient: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50 ",
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

export default ActiveStaticsScreen
