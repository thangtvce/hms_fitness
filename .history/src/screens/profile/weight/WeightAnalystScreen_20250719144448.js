import { useState, useEffect, useCallback, useContext } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Platform,
} from "react-native"
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons"
import { weightHistoryService } from "services/apiWeightHistoryService"
import { useAuth } from "context/AuthContext"
import { BarChart } from "react-native-chart-kit"
import { useFocusEffect } from "@react-navigation/native"
import Header from "components/Header"
import { ThemeContext } from "components/theme/ThemeContext"
import { SafeAreaView } from "react-native-safe-area-context"

const screenWidth = Dimensions.get("window").width

const FILTER_OPTIONS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
]

export default function WeightAnalystScreen({ navigation }) {
  const { user, authToken } = useAuth()
  const { colors } = useContext(ThemeContext)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState("daily")
  const [stats, setStats] = useState({
    current: 0,
    average: 0,
    change: 0,
  })

  const fetchWeightHistory = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      if (user && authToken) {
        const response = await weightHistoryService.getMyWeightHistory({ pageNumber: 1, pageSize: 100 })
        if (response.statusCode === 200 && response.data) {
          const sortedRecords = (response.data.records || []).sort(
            (a, b) => new Date(a.recordedAt) - new Date(b.recordedAt),
          )
          setHistory(sortedRecords)
          calculateStats(sortedRecords)
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      setStats({ current: 0, average: 0, change: 0 })
      return
    }
    const weights = data.map((item) => item.weight)
    const current = data[data.length - 1].weight
    const average = weights.reduce((sum, weight) => sum + weight, 0) / weights.length
    const change = data.length > 1 ? current - data[0].weight : 0
    setStats({
      current: Number.parseFloat(current.toFixed(1)),
      average: Number.parseFloat(average.toFixed(1)),
      change: Number.parseFloat(change.toFixed(1)),
    })
  }

  useEffect(() => {
    fetchWeightHistory()
  }, [user, authToken])

  useFocusEffect(
    useCallback(() => {
      fetchWeightHistory()
    }, [])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchWeightHistory(false)
  }

  // Group data for chart
  const groupData = (data) => {
    if (filter === "daily") {
      // Each entry is a bar
      return data.map(item => ({
        label: new Date(item.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: item.weight
      }))
    } else if (filter === "weekly") {
      // Group by week number
      const weekMap = {}
      data.forEach(item => {
        const d = new Date(item.recordedAt)
        const year = d.getFullYear()
        const week = getWeekNumber(d)
        const key = `${year}-W${week}`
        if (!weekMap[key]) weekMap[key] = []
        weekMap[key].push(item.weight)
      })
      return Object.entries(weekMap).map(([key, arr]) => ({
        label: key,
        value: arr.reduce((a, b) => a + b, 0) / arr.length
      }))
    } else if (filter === "monthly") {
      // Group by month
      const monthMap = {}
      data.forEach(item => {
        const d = new Date(item.recordedAt)
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`
        if (!monthMap[key]) monthMap[key] = []
        monthMap[key].push(item.weight)
      })
      return Object.entries(monthMap).map(([key, arr]) => ({
        label: key,
        value: arr.reduce((a, b) => a + b, 0) / arr.length
      }))
    }
    return []
  }

  // Helper: get ISO week number
  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7))
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1))
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7)
    return weekNo
  }

  const chartDataArr = groupData(history)
  const chartData = {
    labels: chartDataArr.map(d => d.label).slice(-10),
    datasets: [
      {
        data: chartDataArr.map(d => d.value).slice(-10),
      },
    ],
  }

  if (loading && !refreshing) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Weight Analyst"
        onBack={() => navigation.goBack()}
        backgroundColor={colors.headerBackground || "#FFFFFF"}
        textColor={colors.headerText || colors.primary || "#0056d2"}
      />
      <View style={[styles.container, { paddingTop: 80 }]}> 
        {/* Stats section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={styles.statValue}>{stats.current} kg</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>{stats.average} kg</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Change</Text>
            <Text
              style={[styles.statValue, stats.change > 0 ? styles.statValueUp : stats.change < 0 ? styles.statValueDown : null]}
            >
              {stats.change > 0 ? "+" : ""}{stats.change} kg
            </Text>
          </View>
        </View>
        <View style={styles.filterContainer}>
          {FILTER_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.filterButton, filter === option.key && styles.filterButtonActive]}
              onPress={() => setFilter(option.key)}
            >
              <Text style={[styles.filterButtonText, filter === option.key && styles.filterButtonTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chartContainer}>
          {chartData.labels.length > 0 ? (
            <BarChart
              data={chartData}
              width={screenWidth - 48}
              height={220}
              yAxisLabel=""
              yAxisSuffix=" kg"
              chartConfig={{
                backgroundColor: "#FFFFFF",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 1,
                color: (opacity = 1) => `#0056d2`,
                labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 10,
                },
                barPercentage: 0.6,
              }}
              style={styles.chart}
            />
          ) : (
            <View style={styles.noChartDataContainer}>
              <Ionicons name="analytics-outline" size={48} color="#CBD5E1" />
              <Text style={styles.noChartDataText}>No data available for this period</Text>
            </View>
          )}
        </View>
        <FlatList
          data={history.slice().reverse()}
          keyExtractor={(item) => item.historyId.toString()}
          renderItem={({ item }) => {
            const date = new Date(item.recordedAt)
            const formattedDate = date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
            return (
              <View style={styles.listItem}>
                <View style={styles.itemContent}>
                  <View style={styles.dateWeightContainer}>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                    <Text style={styles.weightText}>{item.weight} kg</Text>
                  </View>
                </View>
              </View>
            )
          }}
          contentContainerStyle={styles.flatListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary || "#0056d2"]}
              tintColor={colors.primary || "#0056d2"}
            />
          }
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginHorizontal: 4,
  },
  filterButtonActive: {
    backgroundColor: "#0056d2",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#4B5563",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  statValueUp: {
    color: "#E53E3E",
  },
  statValueDown: {
    color: "#38A169",
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  chart: {
    borderRadius: 16,
  },
  noChartDataContainer: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
  },
  noChartDataText: {
    marginTop: 12,
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
  },
  flatListContent: {
    paddingBottom: 24,
  },
  listItem: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  itemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  dateWeightContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  weightText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
})
