import React,{ useState,useEffect,useCallback,useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  RefreshControl,
  Modal,
} from "react-native";
import { showErrorFetchAPI } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons";
import { weightHistoryService } from "services/apiWeightHistoryService";
import { useAuth } from "context/AuthContext";
import { BarChart } from "react-native-chart-kit";
import { useFocusEffect } from "@react-navigation/native";
import Header from "components/Header";
import { ThemeContext } from "components/theme/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";

const { width: screenWidth } = Dimensions.get("window");

dayjs.extend(isoWeek);

const TABS = [
  { key: "daily",label: "Daily" },
  { key: "weekly",label: "Weekly" },
  { key: "monthly",label: "Monthly" },
];

const WeightAnalystScreen = ({ navigation }) => {
  const { user,authToken } = useAuth();
  const { colors } = useContext(ThemeContext);
  const [history,setHistory] = useState([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState(null);
  const [tab,setTab] = useState("daily");
  const [stats,setStats] = useState({
    logsByDate: [],
    logsByWeek: [],
    logsByMonth: [],
  });
  const [showDetailModal,setShowDetailModal] = useState(false);
  const [selectedRecord,setSelectedRecord] = useState(null);
  const [selectedPeriodIndex,setSelectedPeriodIndex] = useState(0);

  const fetchWeightHistory = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      if (user && authToken) {
        const response = await weightHistoryService.getMyWeightHistory({
          pageNumber: 1,
          pageSize: 100,
        });
        if (response.statusCode === 200 && response.data) {
          const sortedRecords = (response.data.records || []).sort(
            (a,b) => new Date(a.recordedAt) - new Date(b.recordedAt)
          );
          const logsByDateMap = {};
          sortedRecords.forEach((item) => {
            const date = item.recordedAt
              ? dayjs(item.recordedAt).format("YYYY-MM-DD")
              : "";
            if (!logsByDateMap[date])
              logsByDateMap[date] = { date,weight: 0,count: 0 };
            logsByDateMap[date].weight += item.weight;
            logsByDateMap[date].count += 1;
          });
          const logsByDate = Object.values(logsByDateMap)
            .map((item) => ({
              date: item.date,
              weight: Number.parseFloat((item.weight / item.count).toFixed(1)),
            }))
            .sort((a,b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
          const weekMap = {};
          logsByDate.forEach((item) => {
            const date = dayjs(item.date);
            const weekNum = date.isoWeek();
            const year = date.year();
            const weekKey = `${year}-W${weekNum}`;
            if (!weekMap[weekKey])
              weekMap[weekKey] = { week: weekKey,weight: 0,count: 0 };
            weekMap[weekKey].weight += item.weight;
            weekMap[weekKey].count += 1;
          });
          const logsByWeek = Object.values(weekMap).map((item) => ({
            week: item.week,
            weight: Number.parseFloat((item.weight / item.count).toFixed(1)),
          }));
          const monthMap = {};
          logsByDate.forEach((item) => {
            const date = dayjs(item.date);
            const monthKey = date.format("YYYY-MM");
            if (!monthMap[monthKey])
              monthMap[monthKey] = { month: monthKey,weight: 0,count: 0 };
            monthMap[monthKey].weight += item.weight;
            monthMap[monthKey].count += 1;
          });
          const logsByMonth = Object.values(monthMap).map((item) => ({
            month: item.month,
            weight: Number.parseFloat((item.weight / item.count).toFixed(1)),
          }));
          setStats({ logsByDate,logsByWeek,logsByMonth });
          setHistory(sortedRecords);
          setSelectedPeriodIndex(0); // Reset to first period when data is fetched
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
      setError(error.message || "Failed to fetch data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeightHistory();
  },[user,authToken,tab]);

  useFocusEffect(
    useCallback(() => {
      fetchWeightHistory(false);
    },[])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWeightHistory(false);
  },[]);

  const getCurrentData = () => {
    if (tab === "daily") return stats.logsByDate;
    if (tab === "weekly") return stats.logsByWeek;
    if (tab === "monthly") return stats.logsByMonth;
    return [];
  };

  const calculateStatsSummary = (period) => {
    if (!period) {
      return { current: 0,average: 0,change: 0 };
    }
    const data = getCurrentData();
    const weights = data.map((item) => item.weight || 0);
    const average = weights.length > 0 ? weights.reduce((sum,weight) => sum + weight,0) / weights.length : 0;
    const change = data.length > 1 ? period.weight - data[0].weight : 0;
    return {
      current: Number.parseFloat(period.weight.toFixed(1)),
      average: Number.parseFloat(average.toFixed(1)),
      change: Number.parseFloat(change.toFixed(1)),
    };
  };

  const chartData = getCurrentData();
  const selectedPeriod = chartData[selectedPeriodIndex] || { weight: 0 };
  const statsForFilter = calculateStatsSummary(selectedPeriod);

  const getPeriodLabel = (item) => {
    if (tab === "daily") return dayjs(item.date).format("MMM DD, YYYY");
    if (tab === "weekly") {
      const [,week] = item.week.split("-W");
      return `Week ${week}`;
    }
    if (tab === "monthly") return dayjs(item.month).format("MMM YYYY");
    return "";
  };

  const barLabels = chartData.slice(0,5).map((item) =>
    tab === "daily"
      ? dayjs(item.date).format("DD/MM")
      : tab === "weekly"
        ? getPeriodLabel(item).replace("Week ","W")
        : dayjs(item.month).format("MMM YY")
  );
  const barValues = chartData.slice(0,5).map((item) => item.weight);

  const handleViewDetails = useCallback((record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  },[]);

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US",{
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const renderDetailModal = () => {
    if (!selectedRecord) return null;
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
              colors={[colors.primary || "#0056d2",colors.primary + "CC" || "#0056d2CC"]}
              style={styles.detailModalHeader}
            >
              <View style={styles.detailIconContainer}>
                <Ionicons name="scale-outline" size={32} color="#0056d2" />
              </View>
              <Text style={styles.detailModalTitle}>Weight Record Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={24} color="#0056d2" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView
              style={styles.detailModalContent}
              contentContainerStyle={styles.detailModalContentContainer}
            >
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                  Weight
                </Text>
                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                  {selectedRecord.weight} kg
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                  Recorded At
                </Text>
                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                  {formatDateTime(selectedRecord.recordedAt)}
                </Text>
              </View>
              {selectedRecord.notes && (
                <View style={styles.detailSection}>
                  <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                    Notes
                  </Text>
                  <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                    {selectedRecord.notes}
                  </Text>
                </View>
              )}
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

  const renderContent = () => (
    <View style={styles.contentWrapper}>
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
          colors={[colors.primary || "#0056d2",colors.primary || "#0056d2"]}
          style={styles.statsGradient}
          start={{ x: 0,y: 0 }}
          end={{ x: 1,y: 1 }}
        >
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statsForFilter.current} kg</Text>
            <Text style={styles.statLabel}>Current</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statsForFilter.average} kg</Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statNumber,
                statsForFilter.change > 0
                  ? styles.statValueUp
                  : statsForFilter.change < 0
                    ? styles.statValueDown
                    : null,
              ]}
            >
              {statsForFilter.change > 0 ? "+" : ""}
              {statsForFilter.change} kg
            </Text>
            <Text style={styles.statLabel}>Change</Text>
          </View>
        </LinearGradient>
      </View>
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Weight Progress</Text>
        <View style={styles.chartWrapper}>
          {barValues.length === 0 ? (
            <View style={styles.emptyChartContainer}>
              <Text style={styles.emptyChartText}>
                No weight data to display for this period.
              </Text>
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
                backgroundColor: "#FFFFFF",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                decimalPlaces: 1,
              }}
              style={{ borderRadius: 12 }}
              fromZero
              showValuesOnTopOfBars
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
            {history.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No data available</Text>
                <Text style={styles.emptySubtext}>
                  Start logging your weight to see statistics
                </Text>
              </View>
            ) : (
              history.slice(0,10).map((item,index) => (
                <View
                  key={item.historyId + index}
                  style={[styles.historyItem,index === 0 && styles.historyItemFirst]}
                >
                  <View style={styles.historyItemLeft}>
                    <Text style={styles.historyDate}>
                      {dayjs(item.recordedAt).format("MMM DD, YYYY")}
                    </Text>
                  </View>
                  <View style={styles.historyItemRight}>
                    <Text style={styles.historyWeight}>{item.weight} kg</Text>
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
          title="Weight Analyst"
          onBack={() => navigation && navigation.goBack && navigation.goBack()}
          backgroundColor={colors.headerBackground || "#FFFFFF"}
          textColor={colors.headerText || colors.primary || "#0056d2"}
        />
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.contentWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary || "#0056d2"]}
              tintColor={colors.primary || "#0056d2"}
            />
          }
        >
          <ShimmerPlaceholder style={{ height: 40,borderRadius: 8,marginBottom: 24 }} />
          <ShimmerPlaceholder style={{ height: 40,borderRadius: 8,marginBottom: 24 }} />
          <View style={{ flexDirection: "row",gap: 12,marginBottom: 24 }}>
            <ShimmerPlaceholder style={{ flex: 1,height: 36,borderRadius: 8 }} />
            <ShimmerPlaceholder style={{ flex: 1,height: 36,borderRadius: 8 }} />
            <ShimmerPlaceholder style={{ flex: 1,height: 36,borderRadius: 8 }} />
          </View>
          <ShimmerPlaceholder style={{ height: 260,borderRadius: 16,marginBottom: 24 }} />
          <View style={styles.historyContainer}>
            <ShimmerPlaceholder style={{ height: 24,width: 150,borderRadius: 8,marginBottom: 16 }} />
            <ShimmerPlaceholder style={{ height: 60,borderRadius: 8,marginBottom: 12 }} />
            <ShimmerPlaceholder style={{ height: 60,borderRadius: 8,marginBottom: 12 }} />
            <ShimmerPlaceholder style={{ height: 60,borderRadius: 8 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container,{ backgroundColor: colors.background || "#F8F9FA" }]}>
        <Header
          title="Weight Analyst"
          onBack={() => navigation && navigation.goBack && navigation.goBack()}
          backgroundColor={colors.headerBackground || "#FFFFFF"}
          textColor={colors.headerText || colors.primary || "#0056d2"}
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
        title="Weight Analyst"
        onBack={() => navigation && navigation.goBack && navigation.goBack()}
        backgroundColor={colors.headerBackground || "#FFFFFF"}
        textColor={colors.headerText || colors.primary || "#0056d2"}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentWrapper}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary || "#0056d2"]}
            tintColor={colors.primary || "#0056d2"}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
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
    paddingTop: 37,
    paddingBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
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
    backgroundColor: "#0056d2",
    borderWidth: 2,
    borderColor: "#0056d2",
    shadowColor: "#0056d2",
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
    marginBottom: 20,
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
    backgroundColor: "#0056d2",
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
  statValueUp: {
    color: "#E53E3E",
  },
  statValueDown: {
    color: "#38A169",
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
    height: 300,
    overflow: "hidden",
  },
  historyList: {
    flex: 1,
  },
  historyListContent: {
    paddingBottom: 16,
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
  historyItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  historyWeight: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
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
    height: "50%",
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
    color: "#0056d2",
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

export default WeightAnalystScreen;