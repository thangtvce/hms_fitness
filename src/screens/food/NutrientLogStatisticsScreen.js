
import React, { useEffect, useState, useContext, useCallback } from "react"
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native"
import { PieChart } from "react-native-chart-kit" 
import dayjs from "dayjs"
import isoWeek from "dayjs/plugin/isoWeek"
import { AuthContext } from "context/AuthContext"
import { foodService } from "services/apiFoodService"
import Header from "components/Header"

// Mock useNavigation hook
const useNavigation = () => ({
  goBack: () => console.log("Go back"),
  addListener: (event, callback) => {
    // Simulate focus event for useEffect
    if (event === "focus") {
      callback()
    }
    return () => {} // Return an unsubscribe function
  },
})

dayjs.extend(isoWeek)
const { width: screenWidth } = Dimensions.get("window")

const TABS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
]

const NUTRIENT_COLORS = {
  carbs: "#3CB371", // Medium Sea Green
  protein: "#6A5ACD", // Slate Blue
  fats: "#FF8C00", // Dark Orange
}

const NutrientLogStatisticsScreen = () => {
  const navigation = useNavigation()
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
      const res = await foodService.getMyNutritionLogs({ pageNumber: 1, pageSize: 100 })
      const logs = res.data?.nutritionLogs || []

      const mappedLogs = logs.map((item) => ({
        date: item.consumptionDate,
        carbs: item.carbs,
        protein: item.protein,
        fats: item.fats,
      }))

      const logsByDateMap = {}
      mappedLogs.forEach((item) => {
        if (!logsByDateMap[item.date]) logsByDateMap[item.date] = { date: item.date, carbs: 0, protein: 0, fats: 0 }
        logsByDateMap[item.date].carbs += item.carbs
        logsByDateMap[item.date].protein += item.protein
        logsByDateMap[item.date].fats += item.fats
      })
      const logsByDate = Object.values(logsByDateMap).sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())

      const weekMap = {}
      logsByDate.forEach((item) => {
        const date = dayjs(item.date)
        const weekNum = date.isoWeek()
        const year = date.year()
        const weekKey = `${year}-W${weekNum}`
        if (!weekMap[weekKey]) weekMap[weekKey] = { week: weekKey, carbs: 0, protein: 0, fats: 0 }
        weekMap[weekKey].carbs += item.carbs
        weekMap[weekKey].protein += item.protein
        weekMap[weekKey].fats += item.fats
      })
      const logsByWeek = Object.values(weekMap)

      const monthMap = {}
      logsByDate.forEach((item) => {
        const date = dayjs(item.date)
        const monthKey = date.format("YYYY-MM")
        if (!monthMap[monthKey]) monthMap[monthKey] = { month: monthKey, carbs: 0, protein: 0, fats: 0 }
        monthMap[monthKey].carbs += item.carbs
        monthMap[monthKey].protein += item.protein
        monthMap[monthKey].fats += item.fats
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
    // Log chartData and totals for debugging
    const currentData = getCurrentData()
    const totalCarbs = currentData.reduce((sum, item) => sum + item.carbs, 0)
    const totalProtein = currentData.reduce((sum, item) => sum + item.protein, 0)
    const totalFats = currentData.reduce((sum, item) => sum + item.fats, 0)
    console.log(`Tab: ${tab}`)
    console.log('chartData:', currentData)
    console.log('Total Carbs:', totalCarbs)
    console.log('Total Protein:', totalProtein)
    console.log('Total Fats:', totalFats)
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

  // PieChart for the currently selected period only
  const selectedPeriod = chartData[0] || { carbs: 0, protein: 0, fats: 0 }
  const total = selectedPeriod.carbs + selectedPeriod.protein + selectedPeriod.fats
  const percent = (value) => total > 0 ? Math.round((value / total) * 100) : 0
  const pieChartData = [
    {
      name: `Carbs (${percent(selectedPeriod.carbs)}%)`,
      population: selectedPeriod.carbs,
      color: NUTRIENT_COLORS.carbs,
      legendFontColor: "#7F7F7F",
      legendFontSize: 12,
    },
    {
      name: `Protein (${percent(selectedPeriod.protein)}%)`,
      population: selectedPeriod.protein,
      color: NUTRIENT_COLORS.protein,
      legendFontColor: "#7F7F7F",
      legendFontSize: 12,
    },
    {
      name: `Fats (${percent(selectedPeriod.fats)}%)`,
      population: selectedPeriod.fats,
      color: NUTRIENT_COLORS.fats,
      legendFontColor: "#7F7F7F",
      legendFontSize: 12,
    },
  ]

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Nutrient Statistics" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Nutrient Statistics" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Header title="Nutrient Statistics" onBack={() => navigation.goBack()} />
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
          <Text style={styles.chartTitle}>Nutrient Distribution</Text>
          <View style={styles.chartWrapper}>
            {pieChartData.every((data) => data.population === 0) ? (
              <View style={styles.emptyChartContainer}>
                <Text style={styles.emptyChartText}>No nutrient data to display for this period.</Text>
              </View>
            ) : (
              <PieChart
                data={pieChartData}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  color: (opacity = 1) => `rgba(60, 60, 60, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(60, 60, 60, ${opacity})`,
                  decimalPlaces: 0,
                }}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                center={[10, 0]} // Adjust center to make space for legend
                absolute // Show absolute values in legend
              />
            )}
          </View>
        </View>

        {/* History Section */}
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent History</Text>
          <FlatList
            data={chartData.slice(0, 10)}
            keyExtractor={(item, idx) =>
              (tab === "daily" ? item.date : tab === "weekly" ? item.week : item.month) + idx
            }
            renderItem={({ item, index }) => (
              <View style={[styles.historyItem, index === 0 && styles.historyItemFirst]}>
                <View style={styles.historyItemLeft}>
                  <Text style={styles.historyDate}>
                    {tab === "daily"
                      ? dayjs(item.date).format("MMM DD, YYYY")
                      : tab === "weekly"
                        ? `${getWeekLabel(item.week)} - ${item.week.split("-")[0]}`
                        : getMonthLabel(item.month)}
                  </Text>
                </View>
                <View style={styles.historyItemRight}>
                  <Text style={[styles.historyNutrient, { color: NUTRIENT_COLORS.carbs }]}>Carbs: {item.carbs}</Text>
                  <Text style={[styles.historyNutrient, { color: NUTRIENT_COLORS.protein }]}>
                    Protein: {item.protein}
                  </Text>
                  <Text style={[styles.historyNutrient, { color: NUTRIENT_COLORS.fats }]}>Fats: {item.fats}</Text>
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
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 90, // Increased height for better spacing
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "flex-end", // Align items to the bottom
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10, // Padding at the bottom
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    padding: 8,
    marginBottom: -5, // Adjust to align with title
  },
  backButtonText: {
    fontSize: 24,
    color: "#FF6B6B",
    fontWeight: "bold",
  },
  backButtonPlaceholder: {
    width: 40, // To balance the back button on the left
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 0, // Align with the bottom of the header
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 100, // Adjusted to account for the fixed header
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
    color: "#FF6B6B",
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
    backgroundColor: "#FF6B6B",
    shadowColor: "#FF6B6B",
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
    // Color is applied inline based on NUTRIENT_COLORS
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

export default NutrientLogStatisticsScreen
