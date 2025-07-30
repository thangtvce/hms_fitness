import React,{ useEffect,useState,useContext,useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Modal,
  ScrollView,
  RefreshControl,
} from "react-native";
import { PieChart,BarChart } from "react-native-chart-kit";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { AuthContext } from "context/AuthContext";
import { ThemeContext } from "components/theme/ThemeContext";
import { foodService } from "services/apiFoodService";
import Header from "components/Header";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder";
import { showErrorToast } from "utils/toastUtil";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

const { width: screenWidth } = Dimensions.get("window");

dayjs.extend(isoWeek);

const TABS = [
  { key: "daily",label: "Daily" },
  { key: "weekly",label: "Weekly" },
  { key: "monthly",label: "Monthly" },
];

const NUTRIENT_COLORS = {
  carbs: "#3CB371",
  protein: "#6A5ACD",
  fats: "#FF8C00",
};

const NutrientLogStatisticsScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState(null);
  const [tab,setTab] = useState("daily");
  const [stats,setStats] = useState({
    logsByDate: [],
    logsByWeek: [],
    logsByMonth: [],
    rawLogs: [],
  });
  const [showDetailModal,setShowDetailModal] = useState(false);
  const [selectedLog,setSelectedLog] = useState(null);
  const [selectedPeriodIndex,setSelectedPeriodIndex] = useState(0);

  const fetchStatistics = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await foodService.getMyNutritionLogs({ pageNumber: 1,pageSize: 100 });
      const logs = res.data?.nutritionLogs || [];

      const mappedLogs = logs.map((item) => ({
        id: item.id || item.consumptionDate + Date.now(),
        date: item.consumptionDate,
        carbs: item.carbs || 0,
        protein: item.protein || 0,
        fats: item.fats || 0,
        mealName: item.mealName || "Unnamed Meal",
      }));

      const logsByDateMap = new Map();
      mappedLogs.forEach((item) => {
        if (!logsByDateMap.has(item.date))
          logsByDateMap.set(item.date,{ date: item.date,carbs: 0,protein: 0,fats: 0 });
        const log = logsByDateMap.get(item.date);
        log.carbs += item.carbs;
        log.protein += item.protein;
        log.fats += item.fats;
      });
      const logsByDate = Array.from(logsByDateMap.values()).sort(
        (a,b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()
      );

      const weekMap = new Map();
      logsByDate.forEach((item) => {
        const date = dayjs(item.date);
        const weekNum = date.isoWeek();
        const year = date.year();
        const weekKey = `${year}-W${weekNum}`;
        if (!weekMap.has(weekKey))
          weekMap.set(weekKey,{ week: weekKey,carbs: 0,protein: 0,fats: 0 });
        const log = weekMap.get(weekKey);
        log.carbs += item.carbs;
        log.protein += item.protein;
        log.fats += item.fats;
      });
      const logsByWeek = Array.from(weekMap.values());

      const monthMap = new Map();
      logsByDate.forEach((item) => {
        const date = dayjs(item.date);
        const monthKey = date.format("YYYY-MM");
        if (!monthMap.has(monthKey))
          monthMap.set(monthKey,{ month: monthKey,carbs: 0,protein: 0,fats: 0 });
        const log = monthMap.get(monthKey);
        log.carbs += item.carbs;
        log.protein += item.protein;
        log.fats += item.fats;
      });
      const logsByMonth = Array.from(monthMap.values());

      setStats({
        logsByDate,
        logsByWeek,
        logsByMonth,
        rawLogs: mappedLogs.sort((a,b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf()),
      });
      setSelectedPeriodIndex(0); // Reset to first period when data is fetched
    } catch (err) {
      showErrorToast(err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  },[tab]);

  useFocusEffect(
    useCallback(() => {
      fetchStatistics(false);
    },[])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStatistics(false);
  },[]);

  const getCurrentData = () => {
    if (tab === "daily") return stats.logsByDate;
    if (tab === "weekly") return stats.logsByWeek;
    if (tab === "monthly") return stats.logsByMonth;
    return [];
  };

  const calculateStatsSummary = (period) => {
    if (!period) {
      return { totalCarbs: 0,totalProtein: 0,totalFats: 0 };
    }
    return {
      totalCarbs: Number.parseFloat(period.carbs.toFixed(1)),
      totalProtein: Number.parseFloat(period.protein.toFixed(1)),
      totalFats: Number.parseFloat(period.fats.toFixed(1)),
    };
  };

  const chartData = getCurrentData();
  const selectedPeriod = chartData[selectedPeriodIndex] || { carbs: 0,protein: 0,fats: 0 };
  const statsForTab = calculateStatsSummary(selectedPeriod);

  const getPeriodLabel = (item) => {
    if (tab === "daily") return dayjs(item.date).format("MMM DD, YYYY");
    if (tab === "weekly") {
      const [,week] = item.week.split("-W");
      return `Week ${week}`;
    }
    if (tab === "monthly") return dayjs(item.month).format("MMM YYYY");
    return "";
  };

  const total = selectedPeriod.carbs + selectedPeriod.protein + selectedPeriod.fats;
  const percent = (value) => (total > 0 ? Math.round((value / total) * 100) : 0);
  const format1 = (v) => Number(v).toFixed(1);
  const pieChartData = [
    {
      name: `Carbs (${percent(selectedPeriod.carbs)}%)`,
      population: Number(format1(selectedPeriod.carbs)),
      color: NUTRIENT_COLORS.carbs,
      legendFontColor: "#2C3E50",
      legendFontSize: 12,
    },
    {
      name: `Protein (${percent(selectedPeriod.protein)}%)`,
      population: Number(format1(selectedPeriod.protein)),
      color: NUTRIENT_COLORS.protein,
      legendFontColor: "#2C3E50",
      legendFontSize: 12,
    },
    {
      name: `Fats (${percent(selectedPeriod.fats)}%)`,
      population: Number(format1(selectedPeriod.fats)),
      color: NUTRIENT_COLORS.fats,
      legendFontColor: "#2C3E50",
      legendFontSize: 12,
    },
  ];

  const barChartData = {
    labels: chartData.slice(0,5).map((item) => getPeriodLabel(item)),
    datasets: [
      {
        data: chartData.slice(0,5).map((item) => item.carbs),
        color: () => NUTRIENT_COLORS.carbs,
        label: "Carbs",
      },
      {
        data: chartData.slice(0,5).map((item) => item.protein),
        color: () => NUTRIENT_COLORS.protein,
        label: "Protein",
      },
      {
        data: chartData.slice(0,5).map((item) => item.fats),
        color: () => NUTRIENT_COLORS.fats,
        label: "Fats",
      },
    ],
  };

  const handleViewDetails = useCallback((log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  },[]);

  const formatDateTime = (dateString) => {
    return dayjs(dateString).format("MMMM D, YYYY, h:mm A");
  };

  const renderDetailModal = () => {
    if (!selectedLog) return null;
    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View
          style={[styles.detailModalOverlay,{ backgroundColor: colors.overlay || "rgba(0, 0, 0, 0.5)" }]}
        >
          <View style={[styles.detailModal,{ backgroundColor: colors.cardBackground || "#FFFFFF" }]}>
            <LinearGradient
              colors={[colors.primary || "#0056D2",colors.primary + "CC" || "#0056D2CC"]}
              style={styles.detailModalHeader}
            >
              <View style={styles.detailIconContainer}>
                <Ionicons name="nutrition-outline" size={32} color="#0056D2" />
              </View>
              <Text style={styles.detailModalTitle}>Nutrition Log Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={24} color="#0056D2" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView
              style={styles.detailModalContent}
              contentContainerStyle={styles.detailModalContentContainer}
            >
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                  Meal Name
                </Text>
                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                  {selectedLog.mealName}
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                  Consumption Date
                </Text>
                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                  {formatDateTime(selectedLog.date)}
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                  Carbohydrates
                </Text>
                <Text style={[styles.detailText,{ color: NUTRIENT_COLORS.carbs }]}>
                  {format1(selectedLog.carbs)} g
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                  Protein
                </Text>
                <Text style={[styles.detailText,{ color: NUTRIENT_COLORS.protein }]}>
                  {format1(selectedLog.protein)} g
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                  Fats
                </Text>
                <Text style={[styles.detailText,{ color: NUTRIENT_COLORS.fats }]}>
                  {format1(selectedLog.fats)} g
                </Text>
              </View>
            </ScrollView>
            <View style={styles.detailModalActions}>
              <TouchableOpacity
                style={[styles.detailActionButton,{ backgroundColor: colors.border || "#F3F4F6" }]}
                onPress={() => setShowDetailModal(false)}
              >
                <Text
                  style={[styles.detailActionButtonText,{ color: colors.textSecondary || "#6B7280" }]}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.tabContainer}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab,tab === t.key && styles.tabActive]}
            onPress={() => {
              setTab(t.key);
              setSelectedPeriodIndex(0);
            }}
          >
            <Text style={[styles.tabLabel,tab === t.key && styles.tabLabelActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.periodSelector}>
        <Text style={styles.periodSelectorTitle}>Select Period</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chartData.map((item,index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.periodItem,
                selectedPeriodIndex === index && styles.periodItemActive,
              ]}
              onPress={() => setSelectedPeriodIndex(index)}
            >
              <Text
                style={[
                  styles.periodItemText,
                  selectedPeriodIndex === index && styles.periodItemTextActive,
                ]}
              >
                {getPeriodLabel(item)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.statsContainer}>
        <LinearGradient
          colors={[colors.primary || "#0056D2",colors.primary || "#0056D2"]}
          style={styles.statsGradient}
          start={{ x: 0,y: 0 }}
          end={{ x: 1,y: 1 }}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statNumber,{ color: "#FFFFFF" }]}>
              {statsForTab.totalCarbs} g
            </Text>
            <Text style={styles.statLabel}>Carbs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber,{ color: "#FFFFFF" }]}>
              {statsForTab.totalProtein} g
            </Text>
            <Text style={styles.statLabel}>Protein</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber,{ color: "#FFFFFF" }]}>
              {statsForTab.totalFats} g
            </Text>
            <Text style={styles.statLabel}>Fats</Text>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Nutrient Distribution</Text>
        <View style={styles.chartWrapper}>
          {pieChartData.every((data) => data.population === 0) ? (
            <View style={styles.emptyChartContainer}>
              <Text style={styles.emptyChartText}>
                No nutrient data to display for this period.
              </Text>
            </View>
          ) : (
            <PieChart
              data={pieChartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                backgroundColor: "#FFFFFF",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                decimalPlaces: 1,
              }}
              accessor={"population"}
              backgroundColor={"transparent"}
              paddingLeft={"15"}
              center={[10,0]}
              absolute
              style={{ borderRadius: 12 }}
            />
          )}
        </View>
      </View>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Nutrient Trends</Text>
        <View style={styles.chartWrapper}>
          {chartData.length === 0 ? (
            <View style={styles.emptyChartContainer}>
              <Text style={styles.emptyChartText}>No data available for trends.</Text>
            </View>
          ) : (
            <BarChart
              data={barChartData}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                backgroundColor: "#FFFFFF",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForLabels: {
                  fontSize: 10,
                },
              }}
              style={{ borderRadius: 12 }}
              yAxisLabel=""
              yAxisSuffix="g"
              showValuesOnTopOfBars={false}
            />
          )}
        </View>
      </View>
      <View style={styles.historyContainer}>
        <Text style={styles.historyTitle}>Recent History</Text>
        <View style={styles.historyWrapper}>
          <ScrollView
            style={styles.historyList}
            contentContainerStyle={styles.historyListContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {stats.rawLogs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
                <Text style={styles.emptySubtext}>
                  Start logging your meals to see statistics
                </Text>
              </View>
            ) : (
              stats.rawLogs.slice(0,20).map((item,index) => (
                <View
                  key={item.id + index}
                  style={[styles.historyItem,index === 0 && styles.historyItemFirst]}
                >
                  <View style={styles.historyItemLeft}>
                    <Text style={styles.historyDate}>
                      {dayjs(item.date).format("MMM DD, YYYY")}
                    </Text>
                    <Text style={styles.historyMeal}>{item.mealName}</Text>
                  </View>
                  <View style={styles.historyItemRight}>
                    <View style={styles.nutrientSummary}>
                      <Text style={[styles.historyNutrient,{ color: NUTRIENT_COLORS.carbs }]}>
                        C: {format1(item.carbs)}g
                      </Text>
                      <Text style={[styles.historyNutrient,{ color: NUTRIENT_COLORS.protein }]}>
                        P: {format1(item.protein)}g
                      </Text>
                      <Text style={[styles.historyNutrient,{ color: NUTRIENT_COLORS.fats }]}>
                        F: {format1(item.fats)}g
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewDetails(item)}
                    >
                      <Ionicons
                        name="eye-outline"
                        size={20}
                        color={colors.textSecondary || "#6B7280"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container,{ backgroundColor: colors.background || "#F8F9FA" }]}>
        <Header
          title="Nutrient Statistics"
          onBack={() => navigation && navigation.goBack()}
          backgroundColor={colors.headerBackground || "#FFFFFF"}
          textColor={colors.headerText || colors.primary || "#0056D2"}
        />
        <FlatList
          ListHeaderComponent={
            <View style={styles.contentWrapper}>
              <ShimmerPlaceholder style={{ height: 40,borderRadius: 8,marginBottom: 24,marginTop: 20 }} />
              <View style={{ flexDirection: "row",gap: 12,marginBottom: 24 }}>
                <ShimmerPlaceholder style={{ flex: 1,height: 36,borderRadius: 8 }} />
                <ShimmerPlaceholder style={{ flex: 1,height: 36,borderRadius: 8 }} />
                <ShimmerPlaceholder style={{ flex: 1,height: 36,borderRadius: 8 }} />
              </View>
              <View style={{ flexDirection: "row",gap: 12,marginBottom: 24 }}>
                <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 16 }} />
                <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 16 }} />
                <ShimmerPlaceholder style={{ flex: 1,height: 80,borderRadius: 16 }} />
              </View>
              <ShimmerPlaceholder style={{ height: 260,borderRadius: 16,marginBottom: 24 }} />
              <ShimmerPlaceholder style={{ height: 260,borderRadius: 16,marginBottom: 24 }} />
              <View style={styles.historyContainer}>
                <ShimmerPlaceholder style={{ height: 24,width: 150,borderRadius: 8,marginBottom: 16 }} />
                <ShimmerPlaceholder style={{ height: 60,borderRadius: 8,marginBottom: 12 }} />
                <ShimmerPlaceholder style={{ height: 60,borderRadius: 8,marginBottom: 12 }} />
                <ShimmerPlaceholder style={{ height: 60,borderRadius: 8 }} />
              </View>
            </View>
          }
          data={[]}
          renderItem={() => null}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary || "#0056D2"]}
              tintColor={colors.primary || "#0056D2"}
            />
          }
        />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container,{ backgroundColor: colors.background || "#F8F9FA" }]}>
        <Header
          title="Nutrient Statistics"
          onBack={() => navigation && navigation.goBack()}
          backgroundColor={colors.headerBackground || "#FFFFFF"}
          textColor={colors.headerText || colors.primary || "#0056D2"}
        />
        <View style={styles.centered}>
          <Text style={[styles.errorText,{ color: colors.error || "#E53E3E" }]}>
            Error: {error}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container,{ backgroundColor: colors.background || "#F8F9FA" }]}>
      <Header
        title="Nutrient Statistics"
        onBack={() => navigation && navigation.goBack()}
        backgroundColor={colors.headerBackground || "#FFFFFF"}
        textColor={colors.headerText || colors.primary || "#0056D2"}
      />
      <FlatList
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentWrapper}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary || "#0056D2"]}
            tintColor={colors.primary || "#0056D2"}
          />
        }
      />
      {renderDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#E53E3E",
    textAlign: "center",
  },
  contentWrapper: {
    paddingHorizontal: 16,
    paddingTop: 75,
    paddingBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
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
    backgroundColor: "#0056D2",
    borderWidth: 2,
    borderColor: "#0056D2",
    shadowColor: "#0056D2",
    shadowOffset: { width: 0,height: 2 },
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
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  periodSelector: {
    marginBottom: 12,
  },
  periodSelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  periodItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    marginRight: 8,
  },
  periodItemActive: {
    backgroundColor: "#0056D2",
  },
  periodItemText: {
    fontSize: 14,
    color: "#2C3E50",
  },
  periodItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  statsContainer: {
    marginHorizontal: 0,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsGradient: {
    flexDirection: "row",
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 16,
  },
  chartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 16,
    textAlign: "center",
  },
  chartWrapper: {
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
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginBottom: 20,
  },
  historyWrapper: {
    height: 300, // Fixed height for the history section
    overflow: "hidden", // Prevent overflow
  },
  historyList: {
    flex: 1, // Fill the wrapper
  },
  historyListContent: {
    paddingBottom: 16, // Add padding to avoid cutting off content
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
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
    color: "#2C3E50",
    marginBottom: 2,
  },
  historyMeal: {
    fontSize: 12,
    color: "#6B7280",
  },
  historyItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nutrientSummary: {
    alignItems: "flex-end",
  },
  historyNutrient: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionButton: {
    padding: 8,
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
  detailModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailModal: {
    width: screenWidth * 0.9,
    maxHeight: 700,
    minHeight: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  detailModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  detailIconContainer: {
    marginRight: 12,
  },
  detailModalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#0056D2",
  },
  closeButton: {
    padding: 8,
  },
  detailModalContent: {
    flex: 1,
  },
  detailModalContentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: "#1F2937",
    lineHeight: 24,
  },
  detailModalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  detailActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  detailActionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
});

export default NutrientLogStatisticsScreen;