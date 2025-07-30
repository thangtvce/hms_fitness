import React,{ useState,useEffect,useCallback,useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
    Modal,
    ScrollView,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useAuth } from "context/AuthContext";
import { ThemeContext } from "components/theme/ThemeContext";
import { bodyMeasurementService } from "services/apiBodyMeasurementService";
import Header from "components/Header";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder";
import { showErrorFetchAPI,showErrorToast } from "utils/toastUtil";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

const { width: screenWidth } = Dimensions.get("window");

dayjs.extend(isoWeek);

const TABS = [
    { key: "daily",label: "Daily" },
    { key: "weekly",label: "Weekly" },
    { key: "monthly",label: "Monthly" },
];

const METRIC_COLORS = {
    weight: "#0056D2",
    bodyFat: "#38A169",
    waist: "#FF8C00",
};

const BodyMeasurementAnalystScreen = ({ navigation }) => {
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

    const fetchMeasurements = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setError(null);
            if (user && authToken) {
                const response = await bodyMeasurementService.getMyMeasurements({
                    pageNumber: 1,
                    pageSize: 100,
                });
                if (response.statusCode === 200 && response.data) {
                    const sortedRecords = (response.data.records || []).sort(
                        (a,b) => new Date(a.measurementDate) - new Date(b.measurementDate)
                    );

                    const today = dayjs().format("YYYY-MM-DD");
                    const logsByDateMap = new Map();
                    sortedRecords.forEach((item) => {
                        const date = item.measurementDate
                            ? dayjs(item.measurementDate).format("YYYY-MM-DD")
                            : "";
                        if (!logsByDateMap.has(date)) {
                            logsByDateMap.set(date,{ date,weight: 0,bodyFat: 0,waist: 0,count: 0,records: [] });
                        }
                        const log = logsByDateMap.get(date);
                        log.weight += item.weight || 0;
                        log.bodyFat += item.bodyFatPercentage || 0;
                        log.waist += item.waistCm || 0;
                        log.count += 1;
                        log.records.push(item);
                    });

                    const logsByDate = Array.from(logsByDateMap.values())
                        .map((item) => ({
                            date: item.date,
                            weight: item.date === today ? item.records[0]?.weight || 0 : Number.parseFloat((item.weight / item.count).toFixed(1)),
                            bodyFat: item.date === today ? item.records[0]?.bodyFatPercentage || 0 : Number.parseFloat((item.bodyFat / item.count).toFixed(1)),
                            waist: item.date === today ? item.records[0]?.waistCm || 0 : Number.parseFloat((item.waist / item.count).toFixed(1)),
                        }))
                        .sort((a,b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());

                    const weekMap = new Map();
                    logsByDate.forEach((item) => {
                        const date = dayjs(item.date);
                        const weekNum = date.isoWeek();
                        const year = date.year();
                        const weekKey = `${year}-W${weekNum}`;
                        if (!weekMap.has(weekKey)) {
                            weekMap.set(weekKey,{ week: weekKey,weight: 0,bodyFat: 0,waist: 0,count: 0 });
                        }
                        const log = weekMap.get(weekKey);
                        log.weight += item.weight;
                        log.bodyFat += item.bodyFat;
                        log.waist += item.waist;
                        log.count += 1;
                    });
                    const logsByWeek = Array.from(weekMap.values()).map((item) => ({
                        week: item.week,
                        weight: Number.parseFloat((item.weight / item.count).toFixed(1)),
                        bodyFat: Number.parseFloat((item.bodyFat / item.count).toFixed(1)),
                        waist: Number.parseFloat((item.waist / item.count).toFixed(1)),
                    }));

                    const monthMap = new Map();
                    logsByDate.forEach((item) => {
                        const date = dayjs(item.date);
                        const monthKey = date.format("YYYY-MM");
                        if (!monthMap.has(monthKey)) {
                            monthMap.set(monthKey,{ month: monthKey,weight: 0,bodyFat: 0,waist: 0,count: 0 });
                        }
                        const log = monthMap.get(monthKey);
                        log.weight += item.weight;
                        log.bodyFat += item.bodyFat;
                        log.waist += item.waist;
                        log.count += 1;
                    });
                    const logsByMonth = Array.from(monthMap.values()).map((item) => ({
                        month: item.month,
                        weight: Number.parseFloat((item.weight / item.count).toFixed(1)),
                        bodyFat: Number.parseFloat((item.bodyFat / item.count).toFixed(1)),
                        waist: Number.parseFloat((item.waist / item.count).toFixed(1)),
                    }));

                    setStats({ logsByDate,logsByWeek,logsByMonth });
                    setHistory(sortedRecords);
                }
            }
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMeasurements();
    },[user,authToken,tab]);

    useFocusEffect(
        useCallback(() => {
            fetchMeasurements(false);
        },[])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMeasurements(false);
    },[]);

    const getCurrentData = () => {
        if (tab === "daily") return stats.logsByDate.slice(0,7);
        if (tab === "weekly") return stats.logsByWeek.slice(0,7);
        if (tab === "monthly") return stats.logsByMonth.slice(0,7);
        return [];
    };

    const calculateStatsSummary = () => {
        const data = getCurrentData();
        if (!data || data.length === 0) {
            return { currentWeight: 0,avgBodyFat: 0,waistChange: 0 };
        }
        const weights = data.map((item) => item.weight || 0);
        const bodyFats = data.map((item) => item.bodyFat || 0);
        const waists = data.map((item) => item.waist || 0);
        const currentWeight = data[data.length - 1].weight;
        const avgBodyFat = bodyFats.reduce((sum,fat) => sum + fat,0) / bodyFats.length;
        const waistChange = waists.length > 1 ? waists[waists.length - 1] - waists[0] : 0;
        return {
            currentWeight: Number.parseFloat(currentWeight.toFixed(1)),
            avgBodyFat: Number.parseFloat(avgBodyFat.toFixed(1)),
            waistChange: Number.parseFloat(waistChange.toFixed(1)),
        };
    };

    const statsForFilter = calculateStatsSummary();
    const chartData = getCurrentData();

    const getWeekLabel = (weekStr) => {
        const [,week] = weekStr.split("-W");
        return `Week ${week}`;
    };

    const getMonthLabel = (monthStr) => {
        return dayjs(monthStr).format("MMM YYYY");
    };

    const barLabels = chartData.map((item) =>
        tab === "daily"
            ? dayjs(item.date).format("DD/MM")
            : tab === "weekly"
                ? getWeekLabel(item.week)
                : getMonthLabel(item.month)
    );
    const barData = {
        labels: barLabels,
        datasets: [
            {
                data: chartData.map((item) => item.weight),
                color: () => METRIC_COLORS.weight,
                label: "Weight (kg)",
            },
            {
                data: chartData.map((item) => item.bodyFat),
                color: () => METRIC_COLORS.bodyFat,
                label: "Body Fat (%)",
            },
            {
                data: chartData.map((item) => item.waist),
                color: () => METRIC_COLORS.waist,
                label: "Waist (cm)",
            },
        ],
    };

    const handleViewDetails = useCallback((record) => {
        setSelectedRecord(record);
        setShowDetailModal(true);
    },[]);

    const formatDateTime = (dateString) => {
        return dayjs(dateString).format("MMMM D, YYYY");
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
                            colors={[colors.primary || "#0056D2",colors.primary + "CC" || "#0056D2CC"]}
                            style={styles.detailModalHeader}
                        >
                            <View style={styles.detailIconContainer}>
                                <Ionicons name="body-outline" size={32} color="#0056D2" />
                            </View>
                            <Text style={styles.detailModalTitle}>Measurement Details</Text>
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
                                    Measurement Date
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {formatDateTime(selectedRecord.measurementDate)}
                                </Text>
                            </View>
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                                    Weight
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {selectedRecord.weight ? `${selectedRecord.weight.toFixed(1)} kg` : "N/A"}
                                </Text>
                            </View>
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                                    Body Fat Percentage
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {selectedRecord.bodyFatPercentage ? `${selectedRecord.bodyFatPercentage.toFixed(1)}%` : "N/A"}
                                </Text>
                            </View>
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                                    Chest
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {selectedRecord.chestCm ? `${selectedRecord.chestCm.toFixed(1)} cm` : "N/A"}
                                </Text>
                            </View>
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                                    Waist
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {selectedRecord.waistCm ? `${selectedRecord.waistCm.toFixed(1)} cm` : "N/A"}
                                </Text>
                            </View>
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                                    Hip
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {selectedRecord.hipCm ? `${selectedRecord.hipCm.toFixed(1)} cm` : "N/A"}
                                </Text>
                            </View>
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                                    Bicep
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {selectedRecord.bicepCm ? `${selectedRecord.bicepCm.toFixed(1)} cm` : "N/A"}
                                </Text>
                            </View>
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                                    Thigh
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {selectedRecord.thighCm ? `${selectedRecord.thighCm.toFixed(1)} cm` : "N/A"}
                                </Text>
                            </View>
                            <View style={styles.detailSection}>
                                <Text style={[styles.detailLabel,{ color: colors.textSecondary || "#6B7280" }]}>
                                    Neck
                                </Text>
                                <Text style={[styles.detailText,{ color: colors.text || "#1F2937" }]}>
                                    {selectedRecord.neckCm ? `${selectedRecord.neckCm.toFixed(1)} cm` : "N/A"}
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

    if (loading) {
        return (
            <SafeAreaView style={[styles.container,{ backgroundColor: colors.background || "#F8F9FA" }]}>
                <Header
                    title="Body Measurement"
                    onBack={() => navigation && navigation.goBack()}
                    backgroundColor={colors.headerBackground || "#FFFFFF"}
                    textColor={colors.headerText || colors.primary || "#0056D2"}
                />
                <View style={{ padding: 24 }}>
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
                    <ShimmerPlaceholder style={{ height: 260,borderRadius: 16 }} />
                </View>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.container,{ backgroundColor: colors.background || "#F8F9FA" }]}>
                <Header
                    title="Body Measurement Analyst"
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
                title="Body Measurement Analyst"
                onBack={() => navigation && navigation.goBack()}
                backgroundColor={colors.headerBackground || "#FFFFFF"}
                textColor={colors.headerText || colors.primary || "#0056D2"}
            />
            <View style={[styles.contentWrapper]}>
                <View style={styles.tabContainer}>
                    {TABS.map((t) => (
                        <TouchableOpacity
                            key={t.key}
                            style={[styles.tab,tab === t.key && styles.tabActive]}
                            onPress={() => setTab(t.key)}
                        >
                            <Text style={[styles.tabLabel,tab === t.key && styles.tabLabelActive]}>
                                {t.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={styles.statsContainer}>
                    <LinearGradient
                        colors={[colors.primary || "#0056D2",colors.primary || "#0056D2"]}
                        style={styles.statsGradient}
                        start={{ x: 0,y: 0 }}
                        end={{ x: 1,y: 1 }}
                    >
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{statsForFilter.currentWeight} kg</Text>
                            <Text style={styles.statLabel}>Current Weight</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{statsForFilter.avgBodyFat}%</Text>
                            <Text style={styles.statLabel}>Avg. Body Fat</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text
                                style={[
                                    styles.statNumber,
                                    statsForFilter.waistChange > 0
                                        ? styles.statValueUp
                                        : statsForFilter.waistChange < 0
                                            ? styles.statValueDown
                                            : null,
                                ]}
                            >
                                {statsForFilter.waistChange > 0 ? "+" : ""}
                                {statsForFilter.waistChange} cm
                            </Text>
                            <Text style={styles.statLabel}>Waist Change</Text>
                        </View>
                    </LinearGradient>
                </View>
                <View style={styles.chartContainer}>
                    <Text style={styles.chartTitle}>Measurement Trends</Text>
                    <View style={styles.chartWrapper}>
                        {barData.datasets[0].data.length === 0 ? (
                            <View style={styles.emptyChartContainer}>
                                <Text style={styles.emptyChartText}>
                                    No measurement data to display for this period.
                                </Text>
                            </View>
                        ) : (
                            <>
                                <BarChart
                                    data={barData}
                                    width={screenWidth - 32}
                                    height={220}
                                    chartConfig={{
                                        backgroundColor: "#FFFFFF",
                                        backgroundGradientFrom: "#FFFFFF",
                                        backgroundGradientTo: "#FFFFFF",
                                        color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                                        labelColor: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
                                        decimalPlaces: 1,
                                        barPercentage: 0.3,
                                        grouped: true,
                                    }}
                                    style={{ borderRadius: 12 }}
                                    fromZero
                                    showValuesOnTopOfBars
                                />
                                <View style={styles.legendContainer}>
                                    {barData.datasets.map((dataset,index) => (
                                        <View key={index} style={styles.legendItem}>
                                            <View
                                                style={[styles.legendColor,{ backgroundColor: dataset.color() }]}
                                            />
                                            <Text style={styles.legendText}>{dataset.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </View>
                </View>
                <View style={styles.historyContainer}>
                    <Text style={styles.historyTitle}>Recent Measurements</Text>
                    <FlatList
                        data={history.slice(0,10)}
                        keyExtractor={(item,idx) => item.measurementId + idx}
                        renderItem={({ item,index }) => (
                            <View style={[styles.historyItem,index === 0 && styles.historyItemFirst]}>
                                <View style={styles.historyItemLeft}>
                                    <Text style={styles.historyDate}>
                                        {dayjs(item.measurementDate).format("MMM DD, YYYY")}
                                    </Text>
                                </View>
                                <View style={styles.historyItemRight}>
                                    <View style={styles.measurementSummary}>
                                        <Text style={[styles.historyMetric,{ color: METRIC_COLORS.weight }]}>
                                            W: {item.weight ? item.weight.toFixed(1) : "N/A"} kg
                                        </Text>
                                        <Text style={[styles.historyMetric,{ color: METRIC_COLORS.bodyFat }]}>
                                            BF: {item.bodyFatPercentage ? item.bodyFatPercentage.toFixed(1) : "N/A"}%
                                        </Text>
                                        <Text style={[styles.historyMetric,{ color: METRIC_COLORS.waist }]}>
                                            Waist: {item.waistCm ? item.waistCm.toFixed(1) : "N/A"} cm
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
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No data available</Text>
                                <Text style={styles.emptySubtext}>
                                    Start logging your measurements to see statistics
                                </Text>
                            </View>
                        }
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={[colors.primary || "#0056D2"]}
                                tintColor={colors.primary || "#0056D2"}
                            />
                        }
                        showsVerticalScrollIndicator={false}
                    />
                </View>
            </View>
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
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 75,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 4,
        marginBottom: 7,
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
    statsContainer: {
        marginHorizontal: 16,
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
    legendContainer: {
        flexDirection: "row",
        justifyContent: "center",
        marginTop: 8,
        gap: 16,
    },
    legendItem: {
        flexDirection: "row",
        alignItems: "center",
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 2,
        marginRight: 4,
    },
    legendText: {
        fontSize: 12,
        color: "#2C3E50",
    },
    historyContainer: {
        flex: 1,
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
    measurementSummary: {
        alignItems: "flex-end",
    },
    historyMetric: {
        fontSize: 12,
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
        maxHeight: Dimensions.get("window").height * 0.8,
        minHeight: 550,
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

export default BodyMeasurementAnalystScreen;