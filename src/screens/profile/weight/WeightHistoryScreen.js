import { useState, useEffect, useCallback } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Platform,
  Modal,
  ScrollView,
} from "react-native"
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons"
import { weightHistoryService } from "services/apiWeightHistoryService"
import { useAuth } from "context/AuthContext"
import { LineChart } from "react-native-chart-kit"
import { useFocusEffect } from "@react-navigation/native"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import Header from "components/Header"
import { useContext } from "react"
import { ThemeContext } from "components/theme/ThemeContext"
import { theme } from "theme/color"
import { SafeAreaView } from "react-native-safe-area-context"

const screenWidth = Dimensions.get("window").width

// Warning thresholds for weight changes
const WEIGHT_WARNING_THRESHOLDS = {
    moderate: 1.5, // kg per week
    severe: 3.0, // kg per week
}

export default function WeightHistoryScreen({ navigation }) {
    const { user,authToken } = useAuth()
    const { colors } = useContext(ThemeContext)
    const [history,setHistory] = useState([])
    const [loading,setLoading] = useState(true)
    const [refreshing,setRefreshing] = useState(false)
    const [timeFrame, setTimeFrame] = useState("all")
    const timeFrameOptions = [
      { key: "all", label: "All" },
      { key: "7days", label: "7D" },
      { key: "1m", label: "1M" },
      { key: "3m", label: "3M" },
      { key: "6m", label: "6M" },
      { key: "1y", label: "1Y" },
    ]
    const [warningModalVisible,setWarningModalVisible] = useState(false)
    const [selectedWarning,setSelectedWarning] = useState(null)
    const [stats,setStats] = useState({
        current: 0,
        lowest: 0,
        highest: 0,
        average: 0,
        change: 0,
    })
    // ...existing code...

    const fetchWeightHistory = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true)
            if (user && authToken) {
                const response = await weightHistoryService.getMyWeightHistory({ pageNumber: 1, pageSize: 100 })
                if (response.statusCode === 200 && response.data) {
                    const sortedRecords = (response.data.records || []).sort(
                        (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt),
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
            setStats({
                current: 0,
                lowest: 0,
                highest: 0,
                average: 0,
                change: 0,
            })
            return
        }

        const weights = data.map((item) => item.weight)
        const current = data[0].weight
        const lowest = Math.min(...weights)
        const highest = Math.max(...weights)
        const average = weights.reduce((sum,weight) => sum + weight,0) / weights.length
        const change = data.length > 1 ? current - data[data.length - 1].weight : 0

        setStats({
            current: Number.parseFloat(current.toFixed(1)),
            lowest: Number.parseFloat(lowest.toFixed(1)),
            highest: Number.parseFloat(highest.toFixed(1)),
            average: Number.parseFloat(average.toFixed(1)),
            change: Number.parseFloat(change.toFixed(1)),
        })
    }

    useEffect(() => {
        fetchWeightHistory()
    },[user,authToken])

    useFocusEffect(
        useCallback(() => {
            fetchWeightHistory()
        },[]),
    )

    const onRefresh = () => {
        setRefreshing(true)
        fetchWeightHistory(false)
    }

    const handleDelete = async (historyId) => {
        // For now, delete directly without confirm dialog (custom modal can be added if needed)
        try {
            const response = await weightHistoryService.deleteWeightHistory(historyId)
            if (response.statusCode === 200) {
                await fetchWeightHistory()
                showSuccessMessage("Weight entry deleted successfully.")
            }
        } catch (error) {
            showErrorFetchAPI(error)
        }
    }

    const handleEdit = (item) => {
        if (!user || !user.userId) {
            showErrorFetchAPI("User information not found.");
            return;
        }
        navigation.navigate("EditWeightScreen",{
            historyId: item.historyId,
            weight: item.weight,
            recordedAt: item.recordedAt,
            userId: user.userId,
        })
    }

    const handleAddWeight = () => {
        navigation.navigate("AddWeightHistory")
    }

    const filterHistoryByTimeFrame = (data) => {
      const now = new Date()
      switch (timeFrame) {
        case "7days":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 7 * 24 * 60 * 60 * 1000
          })
        case "1m":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 30 * 24 * 60 * 60 * 1000
          })
        case "3m":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 90 * 24 * 60 * 60 * 1000
          })
        case "6m":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 180 * 24 * 60 * 60 * 1000
          })
        case "1y":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 365 * 24 * 60 * 60 * 1000
          })
        case "all":
        default:
          return data
      }
    }

    const getDaysBetweenDates = (date1,date2) => {
        const diffTime = Math.abs(new Date(date1) - new Date(date2))
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    const getWeightWarning = (currentItem,previousItem) => {
        if (!previousItem) return null

        // Ensure we're comparing the correct chronological order
        // currentItem should be the more recent date, previousItem should be the older date
        const currentDate = new Date(currentItem.recordedAt)
        const previousDate = new Date(previousItem.recordedAt)

        // If currentItem is actually older than previousItem, swap them
        let laterItem = currentItem
        let earlierItem = previousItem

        if (currentDate < previousDate) {
            laterItem = previousItem
            earlierItem = currentItem
        }

        const daysBetween = getDaysBetweenDates(laterItem.recordedAt,earlierItem.recordedAt)
        if (daysBetween === 0) return null

        const weightChange = Math.abs(laterItem.weight - earlierItem.weight)
        const weeklyChange = (weightChange / daysBetween) * 7

        if (weeklyChange >= WEIGHT_WARNING_THRESHOLDS.severe) {
            return {
                level: "severe",
                weeklyRate: weeklyChange.toFixed(1),
                change: weightChange.toFixed(1),
                isIncrease: laterItem.weight > earlierItem.weight,
                daysBetween,
                currentWeight: laterItem.weight,
                previousWeight: earlierItem.weight,
                currentDate: laterItem.recordedAt,
                previousDate: earlierItem.recordedAt,
            }
        } else if (weeklyChange >= WEIGHT_WARNING_THRESHOLDS.moderate) {
            return {
                level: "moderate",
                weeklyRate: weeklyChange.toFixed(1),
                change: weightChange.toFixed(1),
                isIncrease: laterItem.weight > earlierItem.weight,
                daysBetween,
                currentWeight: laterItem.weight,
                previousWeight: earlierItem.weight,
                currentDate: laterItem.recordedAt,
                previousDate: earlierItem.recordedAt,
            }
        }

        return null
    }

    const showWarningModal = (warning) => {
        setSelectedWarning(warning)
        setWarningModalVisible(true)
    }

    const renderWarningModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={warningModalVisible}
            onRequestClose={() => setWarningModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Ionicons name="warning" size={24} color="#F59E0B" />
                        <Text style={styles.modalTitle}>Weight Change Alert</Text>
                        <TouchableOpacity onPress={() => setWarningModalVisible(false)} style={styles.modalCloseButton}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalBody}>
                        {selectedWarning && (
                            <>
                                <View
                                    style={[
                                        styles.warningCard,
                                        selectedWarning.level === "severe" ? styles.severeWarningCard : styles.moderateWarningCard,
                                    ]}
                                >
                                    <View style={styles.warningHeader}>
                                        <Text style={styles.warningTitle}>
                                            {selectedWarning.level === "severe" ? "HIGH ALERT" : "MODERATE WARNING"}
                                        </Text>
                                        <View
                                            style={[
                                                styles.warningBadge,
                                                selectedWarning.level === "severe" ? styles.severeBadge : styles.moderateBadge,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.warningBadgeText,
                                                    selectedWarning.level === "severe" ? styles.severeBadgeText : styles.moderateBadgeText,
                                                ]}
                                            >
                                                {selectedWarning.level === "severe" ? "SEVERE" : "MODERATE"}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={styles.weightChangeDetails}>
                                        <View style={styles.weightComparisonRow}>
                                            <View style={styles.weightComparisonItem}>
                                                <Text style={styles.weightComparisonLabel}>Previous</Text>
                                                <Text style={styles.weightComparisonValue}>{selectedWarning.previousWeight} kg</Text>
                                                <Text style={styles.weightComparisonDate}>
                                                    {new Date(selectedWarning.previousDate).toLocaleDateString("en-US",{
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </Text>
                                            </View>

                                            <View style={styles.arrowContainer}>
                                                <Ionicons
                                                    name={selectedWarning.isIncrease ? "arrow-forward-up" : "arrow-forward-down"}
                                                    size={24}
                                                    color={selectedWarning.isIncrease ? "#DC2626" : "#059669"}
                                                />
                                            </View>

                                            <View style={styles.weightComparisonItem}>
                                                <Text style={styles.weightComparisonLabel}>Current</Text>
                                                <Text style={styles.weightComparisonValue}>{selectedWarning.currentWeight} kg</Text>
                                                <Text style={styles.weightComparisonDate}>
                                                    {new Date(selectedWarning.currentDate).toLocaleDateString("en-US",{
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.changeMetrics}>
                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Total Change</Text>
                                                <Text
                                                    style={[
                                                        styles.metricValue,
                                                        selectedWarning.isIncrease ? styles.increaseText : styles.decreaseText,
                                                    ]}
                                                >
                                                    {selectedWarning.isIncrease ? "+" : "-"}
                                                    {selectedWarning.change} kg
                                                </Text>
                                            </View>

                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Weekly Rate</Text>
                                                <Text
                                                    style={[
                                                        styles.metricValue,
                                                        selectedWarning.isIncrease ? styles.increaseText : styles.decreaseText,
                                                    ]}
                                                >
                                                    ~{selectedWarning.weeklyRate} kg/week
                                                </Text>
                                            </View>

                                            <View style={styles.metricItem}>
                                                <Text style={styles.metricLabel}>Time Period</Text>
                                                <Text style={styles.metricValue}>{selectedWarning.daysBetween} days</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.adviceSection}>
                                    <Text style={styles.adviceTitle}>Health Recommendations</Text>

                                    {selectedWarning.level === "severe" ? (
                                        <View style={styles.adviceContent}>
                                            <Text style={styles.adviceText}>
                                                <Text style={styles.adviceEmphasis}>Immediate attention recommended:</Text>
                                                {"\n"}• This rapid weight change may indicate underlying health issues
                                                {"\n"}• Consider consulting with a healthcare professional
                                                {"\n"}• Review recent changes in diet, medication, or health status
                                                {"\n"}• Monitor for other symptoms or changes in well-being
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={styles.adviceContent}>
                                            <Text style={styles.adviceText}>
                                                <Text style={styles.adviceEmphasis}>Monitor closely:</Text>
                                                {"\n"}• Track your weight more frequently for the next few weeks
                                                {"\n"}• Review recent changes in diet, exercise, or lifestyle
                                                {"\n"}• Consider factors like water retention, stress, or sleep changes
                                                {"\n"}• Consult a healthcare provider if the trend continues
                                            </Text>
                                        </View>
                                    )}

                                    <View style={styles.generalTips}>
                                        <Text style={styles.tipsTitle}>General Tips:</Text>
                                        <Text style={styles.tipsText}>
                                            • Weigh yourself at the same time of day for consistency
                                            {"\n"}• Consider weekly averages rather than daily fluctuations
                                            {"\n"}• Factors like hydration, meals, and clothing can affect readings
                                            {"\n"}• Focus on long-term trends rather than short-term changes
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    )

    const renderItem = ({ item,index }) => {
        const date = new Date(item.recordedAt)
        const formattedDate = date.toLocaleDateString("en-US",{
            month: "short",
            day: "numeric",
            year: "numeric",
        })

        // Calculate weight change from previous entry
        const prevItem = history[index + 1]
        const weightChange = prevItem ? (item.weight - prevItem.weight).toFixed(1) : null
        const isWeightUp = weightChange > 0
        const isWeightDown = weightChange < 0

        // Check for warnings
        const warning = getWeightWarning(item,prevItem)

        return (
            <View
                style={[
                    styles.listItem,
                    warning?.level === "severe" && styles.severeWarningItem,
                    warning?.level === "moderate" && styles.moderateWarningItem,
                ]}
            >
                <View style={styles.itemContent}>
                    <View style={styles.dateWeightContainer}>
                        <Text style={styles.dateText}>{formattedDate}</Text>
                        <Text style={styles.weightText}>{item.weight} kg</Text>
                    </View>

                    <View style={styles.middleSection}>
                        {weightChange !== null && (
                            <View
                                style={[
                                    styles.changeContainer,
                                    isWeightUp ? styles.weightUp : isWeightDown ? styles.weightDown : styles.weightSame,
                                ]}
                            >
                                <Ionicons
                                    name={isWeightUp ? "arrow-up" : isWeightDown ? "arrow-down" : "remove"}
                                    size={14}
                                    color={isWeightUp ? "#E53E3E" : isWeightDown ? "#38A169" : "#718096"}
                                />
                                <Text
                                    style={[
                                        styles.changeText,
                                        isWeightUp ? styles.changeTextUp : isWeightDown ? styles.changeTextDown : styles.changeTextSame,
                                    ]}
                                >
                                    {Math.abs(weightChange)} kg
                                </Text>
                            </View>
                        )}

                        {warning && (
                            <TouchableOpacity
                                style={[
                                    styles.warningButton,
                                    warning.level === "severe" ? styles.severeWarningButton : styles.moderateWarningButton,
                                ]}
                                onPress={() => showWarningModal(warning)}
                            >
                                <Ionicons name="warning" size={16} color={warning.level === "severe" ? "#DC2626" : "#F59E0B"} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                            <Ionicons name="create-outline" size={22} color={colors.primary || "#0056d2"} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(item.historyId)} style={styles.actionButton}>
                            <Ionicons name="trash-outline" size={22} color="#E53E3E" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        )
    }

    const filteredHistory = filterHistoryByTimeFrame(history)

    const chartData = {
      labels: filteredHistory
        .slice(0, 10)
        .reverse()
        .map((item) => new Date(item.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })),
      datasets: [
        {
          data:
            filteredHistory.length > 0
              ? filteredHistory
                  .slice(0, 10)
                  .reverse()
                  .map((item) => item.weight)
              : [0],
        },
      ],
    }

    if (loading && !refreshing) {
        return <Loading />;
    }

    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Weight History"
          onBack={() => navigation.goBack()}
          rightActions={[{
            icon: "add",
            onPress: handleAddWeight,
            color: colors.primary || "#0056d2",
          }]}
          backgroundColor={colors.headerBackground || "#FFFFFF"}
          textColor={colors.headerText || colors.primary || "#0056d2"}
        />
        <View style={[styles.container, { paddingTop: 80 }]}> 
          <FlatList
                    data={filteredHistory}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.historyId.toString()}
                    contentContainerStyle={styles.flatListContent}
                    ListHeaderComponent={
                        <>
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
                                        style={[
                                            styles.statValue,
                                            stats.change > 0 ? styles.statValueUp : stats.change < 0 ? styles.statValueDown : null,
                                        ]}
                                    >
                                        {stats.change > 0 ? "+" : ""}
                                        {stats.change} kg
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.chartContainer}>
                                {filteredHistory.length > 0 ? (
                                  <LineChart
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
                                      propsForDots: {
                                        r: "3",
                                        strokeWidth: "1",
                                        stroke: "#0056d2",
                                      },
                                      propsForLabels: {
                                        fontSize: 10,
                                      },
                                      strokeWidth: 1.5,
                                    }}
                                    bezier
                                    style={[styles.chart, { marginRight: 0 }]}
                                  />
                                ) : (
                                    <View style={styles.noChartDataContainer}>
                                        <Ionicons name="analytics-outline" size={48} color="#CBD5E1" />
                                        <Text style={styles.noChartDataText}>No data available for this period</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.filterContainer}>
                              {timeFrameOptions.map((option) => (
                                <TouchableOpacity
                                  key={option.key}
                                  style={[styles.filterButton, timeFrame === option.key && styles.filterButtonActive]}
                                  onPress={() => setTimeFrame(option.key)}
                                >
                                  <Text style={[styles.filterButtonText, timeFrame === option.key && styles.filterButtonTextActive]}>
                                    {option.label}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>

                            {filteredHistory.length > 0 ? <Text style={styles.historyTitle}>Weight Entries</Text> : null}
                        </>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="scale-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Weight Data</Text>
                            <Text style={styles.emptyText}>
                                Start tracking your weight progress by adding your first weight entry.
                            </Text>
                            <TouchableOpacity onPress={handleAddWeight} style={styles.emptyButton}>
                                <Text style={styles.emptyButtonText}>Add Weight</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary || "#0056d2"]}
                            tintColor={colors.primary || "#0056d2"}
                        />
                    }
                />
                {renderWarningModal()}
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
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: "500",
    },
    // header styles removed (now using Header.js)
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
                shadowOffset: { width: 0,height: 1 },
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
                shadowOffset: { width: 0,height: 2 },
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
    historyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
        marginHorizontal: 16,
        marginTop: 8,
        marginBottom: 8,
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
                shadowOffset: { width: 0,height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    moderateWarningItem: {
        borderLeftWidth: 4,
        borderLeftColor: "#F59E0B",
        backgroundColor: "#FFFBEB",
    },
    severeWarningItem: {
        borderLeftWidth: 4,
        borderLeftColor: "#DC2626",
        backgroundColor: "#FEF2F2",
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
    middleSection: {
        flexDirection: "row",
        alignItems: "center",
        marginRight: 12,
    },
    changeContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    weightUp: {
        backgroundColor: "#FEE2E2",
    },
    weightDown: {
        backgroundColor: "#DCFCE7",
    },
    weightSame: {
        backgroundColor: "#F3F4F6",
    },
    changeText: {
        fontSize: 12,
        fontWeight: "600",
        marginLeft: 2,
    },
    changeTextUp: {
        color: "#E53E3E",
    },
    changeTextDown: {
        color: "#38A169",
    },
    changeTextSame: {
        color: "#718096",
    },
    warningButton: {
        padding: 6,
        borderRadius: 6,
    },
    moderateWarningButton: {
        backgroundColor: "#FEF3C7",
    },
    severeWarningButton: {
        backgroundColor: "#FECACA",
    },
    actions: {
        flexDirection: "row",
    },
    actionButton: {
        padding: 8,
        marginLeft: 4,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        marginTop: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 24,
    },
    emptyButton: {
        backgroundColor: "#0056d2",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        width: "100%",
        maxHeight: "80%",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1E293B",
        marginLeft: 12,
        flex: 1,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
    warningCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
    },
    moderateWarningCard: {
        backgroundColor: "#FFFBEB",
        borderColor: "#F59E0B",
    },
    severeWarningCard: {
        backgroundColor: "#FEF2F2",
        borderColor: "#DC2626",
    },
    warningHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    warningTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
    },
    warningBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    moderateBadge: {
        backgroundColor: "#F59E0B",
    },
    severeBadge: {
        backgroundColor: "#DC2626",
    },
    warningBadgeText: {
        fontSize: 12,
        fontWeight: "600",
    },
    moderateBadgeText: {
        color: "#FFFFFF",
    },
    severeBadgeText: {
        color: "#FFFFFF",
    },
    weightChangeDetails: {
        marginTop: 8,
    },
    weightComparisonRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    weightComparisonItem: {
        alignItems: "center",
        flex: 1,
    },
    weightComparisonLabel: {
        fontSize: 12,
        color: "#64748B",
        marginBottom: 4,
    },
    weightComparisonValue: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 2,
    },
    weightComparisonDate: {
        fontSize: 12,
        color: "#64748B",
    },
    arrowContainer: {
        paddingHorizontal: 16,
    },
    changeMetrics: {
        flexDirection: "row",
        justifyContent: "space-between",
        backgroundColor: "#F8FAFC",
        borderRadius: 8,
        padding: 12,
    },
    metricItem: {
        alignItems: "center",
        flex: 1,
    },
    metricLabel: {
        fontSize: 12,
        color: "#64748B",
        marginBottom: 4,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B",
    },
    increaseText: {
        color: "#DC2626",
    },
    decreaseText: {
        color: "#059669",
    },
    adviceSection: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 16,
    },
    adviceTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 12,
    },
    adviceContent: {
        marginBottom: 16,
    },
    adviceText: {
        fontSize: 14,
        color: "#374151",
        lineHeight: 20,
    },
    adviceEmphasis: {
        fontWeight: "600",
        color: "#1E293B",
    },
    generalTips: {
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 16,
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 8,
    },
    tipsText: {
        fontSize: 14,
        color: "#64748B",
        lineHeight: 20,
    },
})
