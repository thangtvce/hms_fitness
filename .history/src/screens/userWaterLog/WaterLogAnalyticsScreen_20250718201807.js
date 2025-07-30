import { useEffect, useState, useContext } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "context/AuthContext";
import { apiUserWaterLogService } from "services/apiUserWaterLogService";
import { BarChart } from "react-native-chart-kit";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import Header from "components/Header";
import { LinearGradient } from "expo-linear-gradient";

dayjs.extend(isoWeek);

const { width: screenWidth } = Dimensions.get("window");

const TABS = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];



const WaterLogAnalyticsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("daily");
  const [stats, setStats] = useState({
    logsByDate: [],
    logsByWeek: [],
    logsByMonth: [],
    averageAmount: 0,
  });
  const [goalAmount, setGoalAmount] = useState(null);

  // Fetch water target from AsyncStorage
  const fetchGoalAmount = async () => {
    try {
      const userId = user?.id || user?._id || user?.userId || null;
      const key = userId ? `waterTarget_${userId}` : "waterTarget";
      const saved = await AsyncStorage.getItem(key);
      if (saved) {
        setGoalAmount(Number(saved));
      } else {
        setGoalAmount(null);
      }
    } catch (e) {
      setGoalAmount(null);
    }
  };

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        setError(null);
        // Fetch all logs
        const res = await apiUserWaterLogService.getMyWaterLogs({ pageNumber: 1, pageSize: 5000, status: "active" });
        const logs = res.data?.records || [];

        // Group by day
        const dayMap = {};
        logs.forEach((item) => {
          const date = dayjs(item.consumptionDate).format("YYYY-MM-DD");
          if (!dayMap[date]) dayMap[date] = { date, totalAmount: 0, count: 0 };
          dayMap[date].totalAmount += item.amountMl || 0;
          dayMap[date].count += 1;
        });
        const logsByDate = Object.values(dayMap).sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix());

        // Group by week
        const weekMap = {};
        logs.forEach((item) => {
          const date = dayjs(item.consumptionDate);
          const weekNum = date.isoWeek();
          const year = date.year();
          const weekKey = `${year}-W${weekNum}`;
          if (!weekMap[weekKey]) weekMap[weekKey] = { week: weekKey, totalAmount: 0, count: 0 };
          weekMap[weekKey].totalAmount += item.amountMl || 0;
          weekMap[weekKey].count += 1;
        });
        const logsByWeek = Object.values(weekMap).sort((a, b) => a.week.localeCompare(b.week));

        // Group by month
        const monthMap = {};
        logs.forEach((item) => {
          const date = dayjs(item.consumptionDate);
          const monthKey = date.format("YYYY-MM");
          if (!monthMap[monthKey]) monthMap[monthKey] = { month: monthKey, totalAmount: 0, count: 0 };
          monthMap[monthKey].totalAmount += item.amountMl || 0;
          monthMap[monthKey].count += 1;
        });
        const logsByMonth = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

        // Calculate average
        const getAvg = (arr) => arr.length === 0 ? 0 : Math.round(arr.reduce((sum, i) => sum + i.totalAmount, 0) / arr.length);

        setStats({
          logsByDate,
          logsByWeek,
          logsByMonth,
          averageAmount: tab === "daily" ? getAvg(logsByDate) : tab === "weekly" ? getAvg(logsByWeek) : getAvg(logsByMonth),
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
    fetchGoalAmount();
  }, [tab, user]);

  const getCurrentData = () => {
    if (tab === "daily") return stats.logsByDate.slice(0, 7).reverse();
    if (tab === "weekly") return stats.logsByWeek;
    if (tab === "monthly") return stats.logsByMonth;
    return [];
  };

  const chartData = getCurrentData();

  const getWeekLabel = (weekStr) => {
    const [year, week] = weekStr.split("-W");
    return `Week ${week}`;
  };

  const getMonthLabel = (monthStr) => {
    return dayjs(monthStr).format("MMM YYYY");
  };

  const labels = chartData.map((item) => {
    if (tab === "daily") return dayjs(item.date).format("MM/DD");
    if (tab === "weekly") return getWeekLabel(item.week);
    return getMonthLabel(item.month);
  });

  const amounts = chartData.map((item) => item.totalAmount);

  const getChartMaxValue = () => {
    const maxDataValue = amounts.length > 0 ? Math.max(...amounts) : 0;
    if (goalAmount) {
      const maxValue = Math.max(goalAmount, maxDataValue);
      return Math.ceil(maxValue * 1.2);
    }
    return Math.ceil(maxDataValue * 1.2);
  };

  const chartMaxValue = getChartMaxValue();

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Water Analytics" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Water Analytics" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Water Analytics" onBack={() => navigation.goBack()} />

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

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <LinearGradient colors={["#2563EB", "#2563EB"]} style={styles.statCard}>
            <Text style={styles.statLabel}>Average Intake</Text>
            <Text style={styles.statValue}>{stats.averageAmount}</Text>
            <Text style={styles.statUnit}>ml</Text>
          </LinearGradient>

          {goalAmount && (
            <LinearGradient colors={["#2563EB", "#2563EB"]} style={styles.statCard}>
              <Text style={styles.statLabel}>Daily Goal</Text>
              <Text style={styles.statValue}>{goalAmount}</Text>
              <Text style={styles.statUnit}>ml</Text>
            </LinearGradient>
          )}
        </View>

        {/* Chart Section */}
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Water Intake Trends</Text>

          <View style={styles.chartWrapper}>
            <BarChart
              data={{
                labels: labels,
                datasets: [
                  {
                    data: amounts.length > 0 ? amounts : [0],
                    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
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
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
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
          <Text style={styles.historyTitle}>Recent Water Logs</Text>
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
                  {goalAmount && (
                    <Text
                      style={[
                        styles.historyStatus,
                        item.totalAmount >= goalAmount ? styles.statusSuccess : styles.statusWarning,
                      ]}
                    >
                      {item.totalAmount >= goalAmount ? "Goal Achieved" : "Below Goal"}
                    </Text>
                  )}
                </View>
                <View style={styles.historyItemRight}>
                  <Text style={styles.historyCalories}>{item.totalAmount}</Text>
                  <Text style={styles.historyUnit}>ml</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
                <Text style={styles.emptySubtext}>Start logging your water intake to see statistics</Text>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </View>
  );
};

export default WaterLogAnalyticsScreen;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  scrollContainer: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: 32,
  },

  // Search Bar
  searchBarContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  
  searchToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  
  searchToggleText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
  
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2563EB",
    gap: 8,
  },
  
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    paddingVertical: 4,
  },

  // Sections
  chartSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    paddingBottom: 16,
  },
  
  logsSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 8,
    paddingBottom: 16,
  },
  
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  // Filter Tabs
  filterTabs: {
    paddingVertical: 12,
  },
  
  filterTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    gap: 8,
  },
  
  filterTab: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    minWidth: 0,
    alignItems: "center",
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  
  filterTabActive: {
    backgroundColor: "#2563EB",
  },
  
  filterTabText: {
    color: "#64748B",
    fontWeight: "600",
    fontSize: 14,
  },
  
  filterTabTextActive: {
    color: "#FFFFFF",
  },

  // Custom Date
  customDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  
  datePickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  
  datePickerText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "500",
  },

  // Statistics
  statisticsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  
  statCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2563EB",
  },
  
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },

  // Chart
  chartContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  
  chart: {
    borderRadius: 16,
  },
  
  chartLoadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  
  noChartData: {
    alignItems: "center",
    paddingVertical: 60,
  },
  
  noChartText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 8,
  },

  // Logs
  logsContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  logCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  
  dateTimeContainer: {
    flex: 1,
  },
  
  logDate: {
    fontSize: 16,
    color: "#2563EB",
    fontWeight: "700",
  },
  
  logTime: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  
  amountDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  
  amountValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
  },
  
  notesSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    gap: 8,
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
  },
  
  notesText: {
    color: "#64748B",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  
  loadingText: {
    color: "#64748B",
    fontSize: 14,
  },
  
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563EB",
    marginTop: 16,
    textAlign: "center",
  },
  
  emptyText: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },

  // Date Picker Modal
  datePickerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  datePickerModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    minWidth: 320,
    maxWidth: '90%',
  },
  
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 16,
  },
  
  cancelButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 16,
  },
  
  confirmButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});