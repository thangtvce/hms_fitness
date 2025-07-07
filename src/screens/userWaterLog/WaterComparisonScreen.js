import React,{ useState,useEffect,useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Platform,
    ScrollView,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiUserWaterLogService } from 'services/apiUserWaterLogService';
import { useAuth } from 'context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { theme } from 'theme/color';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart,BarChart } from 'react-native-chart-kit';

const { width,height } = Dimensions.get('window');

const RECOMMENDED_DAILY_INTAKE = 2000;
const MINIMUM_DAILY_INTAKE = 1200;
const MAXIMUM_SAFE_INTAKE = 3500;

export default function WaterComparisonScreen({ navigation }) {
    const { user,authToken } = useAuth();
    const [loading,setLoading] = useState(true);
    const [refreshing,setRefreshing] = useState(false);
    const [availableDates,setAvailableDates] = useState([]);
    const [selectedDates,setSelectedDates] = useState([]);
    const [comparisonData,setComparisonData] = useState([]);
    const [chartData,setChartData] = useState(null);
    const [statistics,setStatistics] = useState({
        averageIntake: 0,
        highestIntake: 0,
        lowestIntake: 0,
        totalDays: 0,
        improvementTrend: 0
    });
    const [viewMode,setViewMode] = useState('line'); // 'line' or 'bar'
    const [animatedValue] = useState(new Animated.Value(0));

    // Safe navigation helper
    const safeGoBack = () => {
        try {
            if (navigation && typeof navigation.goBack === 'function') {
                navigation.goBack();
            } else if (navigation && typeof navigation.navigate === 'function') {
                navigation.navigate('WaterLog');
            } else {
            }
        } catch (error) {
        }
    };

    const fetchAvailableDates = async () => {
        try {
            setLoading(true);
            if (!user || !authToken) {
                return;
            }

            // Fetch last 30 days of data
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);

            const queryParams = {
                pageNumber: 1,
                pageSize: 1000,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                status: 'active',
            };

            if (typeof apiUserWaterLogService?.getMyWaterLogs !== 'function') {
                throw new Error('Water log service not available');
            }

            const response = await apiUserWaterLogService.getMyWaterLogs(queryParams);
            if (response?.statusCode === 200 && response?.data) {
                const logs = response.data.records || [];
                processAvailableDates(logs);
            }
        } catch (error) {
            Alert.alert('Error','Failed to load water log dates.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const processAvailableDates = (logs) => {
        // Group logs by date and calculate daily totals
        const dateGroups = {};

        logs.forEach(log => {
            const date = new Date(log.consumptionDate);
            const dateKey = date.toISOString().split('T')[0];

            if (!dateGroups[dateKey]) {
                dateGroups[dateKey] = {
                    date: dateKey,
                    displayDate: date.toLocaleDateString('en-US',{
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    }),
                    fullDate: date,
                    totalAmount: 0,
                    logCount: 0,
                    logs: []
                };
            }

            dateGroups[dateKey].totalAmount += log.amountMl || 0;
            dateGroups[dateKey].logCount += 1;
            dateGroups[dateKey].logs.push(log);
        });

        // Convert to array and sort by date (newest first)
        const datesArray = Object.values(dateGroups).sort(
            (a,b) => new Date(b.date) - new Date(a.date)
        );

        setAvailableDates(datesArray);

        // Auto-select last 7 days if available
        const autoSelected = datesArray.slice(0,Math.min(7,datesArray.length));
        setSelectedDates(autoSelected.map(d => d.date));
        updateComparisonData(autoSelected);
    };

    const toggleDateSelection = (dateKey) => {
        const newSelectedDates = selectedDates.includes(dateKey)
            ? selectedDates.filter(d => d !== dateKey)
            : [...selectedDates,dateKey];

        if (newSelectedDates.length > 10) {
            Alert.alert('Limit Reached','You can select maximum 10 dates for comparison.');
            return;
        }

        setSelectedDates(newSelectedDates);

        const selectedDateData = availableDates.filter(d =>
            newSelectedDates.includes(d.date)
        );
        updateComparisonData(selectedDateData);
    };

    const updateComparisonData = (selectedDateData) => {
        if (selectedDateData.length === 0) {
            setComparisonData([]);
            setChartData(null);
            setStatistics({
                averageIntake: 0,
                highestIntake: 0,
                lowestIntake: 0,
                totalDays: 0,
                improvementTrend: 0
            });
            return;
        }

        // Sort by date for proper chart display
        const sortedData = selectedDateData.sort(
            (a,b) => new Date(a.date) - new Date(b.date)
        );

        setComparisonData(sortedData);
        generateChartData(sortedData);
        calculateStatistics(sortedData);
    };

    const generateChartData = (data) => {
        if (data.length === 0) return;

        const labels = data.map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US',{ month: 'short',day: 'numeric' });
        });

        const amounts = data.map(d => d.totalAmount);

        const chartConfig = {
            labels,
            datasets: [
                {
                    data: amounts,
                    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                    strokeWidth: 3,
                }
            ]
        };

        setChartData(chartConfig);
    };

    const calculateStatistics = (data) => {
        if (data.length === 0) return;

        const amounts = data.map(d => d.totalAmount);
        const totalIntake = amounts.reduce((sum,amount) => sum + amount,0);
        const averageIntake = totalIntake / amounts.length;
        const highestIntake = Math.max(...amounts);
        const lowestIntake = Math.min(...amounts);

        // Calculate improvement trend (comparing first half vs second half)
        let improvementTrend = 0;
        if (amounts.length >= 4) {
            const midPoint = Math.floor(amounts.length / 2);
            const firstHalf = amounts.slice(0,midPoint);
            const secondHalf = amounts.slice(midPoint);

            const firstHalfAvg = firstHalf.reduce((sum,a) => sum + a,0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((sum,a) => sum + a,0) / secondHalf.length;

            improvementTrend = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
        }

        setStatistics({
            averageIntake: Math.round(averageIntake),
            highestIntake,
            lowestIntake,
            totalDays: data.length,
            improvementTrend: Math.round(improvementTrend * 10) / 10
        });
    };

    const clearAllSelections = () => {
        setSelectedDates([]);
        setComparisonData([]);
        setChartData(null);
        setStatistics({
            averageIntake: 0,
            highestIntake: 0,
            lowestIntake: 0,
            totalDays: 0,
            improvementTrend: 0
        });
    };

    const selectRecentDays = (days) => {
        const recentDates = availableDates.slice(0,Math.min(days,availableDates.length));
        setSelectedDates(recentDates.map(d => d.date));
        updateComparisonData(recentDates);
    };

    useEffect(() => {
        fetchAvailableDates();

        // Animate entrance
        Animated.timing(animatedValue,{
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    },[user,authToken]);

    useFocusEffect(
        useCallback(() => {
            fetchAvailableDates();
        },[])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchAvailableDates();
    };

    const getIntakeStatus = (amount) => {
        if (amount >= RECOMMENDED_DAILY_INTAKE) {
            return { color: '#10B981',status: 'Excellent',icon: 'checkmark-circle' };
        } else if (amount >= RECOMMENDED_DAILY_INTAKE * 0.7) {
            return { color: '#F59E0B',status: 'Good',icon: 'alert-circle' };
        } else if (amount >= MINIMUM_DAILY_INTAKE) {
            return { color: '#EF4444',status: 'Low',icon: 'warning' };
        } else {
            return { color: '#DC2626',status: 'Very Low',icon: 'close-circle' };
        }
    };

    const renderQuickSelectionButtons = () => (
        <View style={styles.quickSelectionContainer}>
            <Text style={styles.quickSelectionTitle}>Quick Selection</Text>
            <View style={styles.quickSelectionButtons}>
                <TouchableOpacity
                    style={styles.quickSelectionButton}
                    onPress={() => selectRecentDays(3)}
                >
                    <Text style={styles.quickSelectionButtonText}>Last 3 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.quickSelectionButton}
                    onPress={() => selectRecentDays(7)}
                >
                    <Text style={styles.quickSelectionButtonText}>Last 7 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.quickSelectionButton}
                    onPress={() => selectRecentDays(14)}
                >
                    <Text style={styles.quickSelectionButtonText}>Last 14 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.quickSelectionButton,styles.clearButton]}
                    onPress={clearAllSelections}
                >
                    <Text style={[styles.quickSelectionButtonText,styles.clearButtonText]}>Clear All</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderStatisticsCards = () => (
        <View style={styles.statisticsContainer}>
            <Text style={styles.statisticsTitle}>Comparison Statistics</Text>
            <View style={styles.statisticsGrid}>
                <View style={styles.statisticsCard}>
                    <Ionicons name="analytics" size={24} color="#2563EB" />
                    <Text style={styles.statisticsValue}>{statistics.averageIntake}</Text>
                    <Text style={styles.statisticsLabel}>Average (ml)</Text>
                </View>
                <View style={styles.statisticsCard}>
                    <Ionicons name="trending-up" size={24} color="#10B981" />
                    <Text style={styles.statisticsValue}>{statistics.highestIntake}</Text>
                    <Text style={styles.statisticsLabel}>Highest (ml)</Text>
                </View>
                <View style={styles.statisticsCard}>
                    <Ionicons name="trending-down" size={24} color="#EF4444" />
                    <Text style={styles.statisticsValue}>{statistics.lowestIntake}</Text>
                    <Text style={styles.statisticsLabel}>Lowest (ml)</Text>
                </View>
                <View style={styles.statisticsCard}>
                    <Ionicons
                        name={statistics.improvementTrend >= 0 ? "arrow-up" : "arrow-down"}
                        size={24}
                        color={statistics.improvementTrend >= 0 ? "#10B981" : "#EF4444"}
                    />
                    <Text style={[
                        styles.statisticsValue,
                        { color: statistics.improvementTrend >= 0 ? "#10B981" : "#EF4444" }
                    ]}>
                        {statistics.improvementTrend > 0 ? '+' : ''}{statistics.improvementTrend}%
                    </Text>
                    <Text style={styles.statisticsLabel}>Trend</Text>
                </View>
            </View>
        </View>
    );

    const renderChart = () => {
        if (!chartData || comparisonData.length === 0) {
            return (
                <View style={styles.chartContainer}>
                    <View style={styles.chartPlaceholder}>
                        <Ionicons name="bar-chart-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.chartPlaceholderText}>Select dates to view comparison chart</Text>
                    </View>
                </View>
            );
        }

        const chartConfig = {
            backgroundColor: '#FFFFFF',
            backgroundGradientFrom: '#FFFFFF',
            backgroundGradientTo: '#FFFFFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
            style: {
                borderRadius: 16,
            },
            propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#2563EB"
            },
            propsForBackgroundLines: {
                strokeDasharray: "",
                stroke: "#E2E8F0",
                strokeWidth: 1
            }
        };

        return (
            <View style={styles.chartContainer}>
                <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>Water Intake Comparison</Text>
                    <View style={styles.chartToggle}>
                        <TouchableOpacity
                            style={[styles.chartToggleButton,viewMode === 'line' && styles.chartToggleButtonActive]}
                            onPress={() => setViewMode('line')}
                        >
                            <Ionicons name="trending-up" size={16} color={viewMode === 'line' ? '#FFFFFF' : '#64748B'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.chartToggleButton,viewMode === 'bar' && styles.chartToggleButtonActive]}
                            onPress={() => setViewMode('bar')}
                        >
                            <Ionicons name="bar-chart" size={16} color={viewMode === 'bar' ? '#FFFFFF' : '#64748B'} />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {viewMode === 'line' ? (
                        <LineChart
                            data={chartData}
                            width={Math.max(width - 60,comparisonData.length * 60)}
                            height={220}
                            chartConfig={chartConfig}
                            bezier
                            style={styles.chart}
                            withInnerLines={true}
                            withOuterLines={true}
                            withVerticalLines={true}
                            withHorizontalLines={true}
                        />
                    ) : (
                        <BarChart
                            data={chartData}
                            width={Math.max(width - 60,comparisonData.length * 60)}
                            height={220}
                            chartConfig={chartConfig}
                            style={styles.chart}
                            withInnerLines={true}
                            showValuesOnTopOfBars={true}
                        />
                    )}
                </ScrollView>

                {/* Reference lines */}
                <View style={styles.referenceLines}>
                    <View style={styles.referenceLine}>
                        <View style={[styles.referenceLineIndicator,{ backgroundColor: '#10B981' }]} />
                        <Text style={styles.referenceLineText}>Recommended: {RECOMMENDED_DAILY_INTAKE}ml</Text>
                    </View>
                    <View style={styles.referenceLine}>
                        <View style={[styles.referenceLineIndicator,{ backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.referenceLineText}>Minimum: {MINIMUM_DAILY_INTAKE}ml</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderDateItem = ({ item }) => {
        const isSelected = selectedDates.includes(item.date);
        const intakeStatus = getIntakeStatus(item.totalAmount);

        return (
            <TouchableOpacity
                style={[styles.dateItem,isSelected && styles.dateItemSelected]}
                onPress={() => toggleDateSelection(item.date)}
                activeOpacity={0.7}
            >
                <View style={styles.dateItemHeader}>
                    <View style={styles.dateInfo}>
                        <Text style={[styles.dateText,isSelected && styles.dateTextSelected]}>
                            {item.displayDate}
                        </Text>
                        <Text style={[styles.dateSubtext,isSelected && styles.dateSubtextSelected]}>
                            {item.logCount} log{item.logCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                    <View style={styles.dateStatus}>
                        <Ionicons
                            name={intakeStatus.icon}
                            size={20}
                            color={isSelected ? '#FFFFFF' : intakeStatus.color}
                        />
                    </View>
                </View>

                <View style={styles.dateItemContent}>
                    <View style={styles.amountContainer}>
                        <Text style={[styles.amountValue,isSelected && styles.amountValueSelected]}>
                            {item.totalAmount}
                        </Text>
                        <Text style={[styles.amountUnit,isSelected && styles.amountUnitSelected]}>ml</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${Math.min((item.totalAmount / RECOMMENDED_DAILY_INTAKE) * 100,100)}%`,
                                        backgroundColor: isSelected ? '#FFFFFF' : intakeStatus.color
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[styles.progressText,isSelected && styles.progressTextSelected]}>
                            {Math.round((item.totalAmount / RECOMMENDED_DAILY_INTAKE) * 100)}%
                        </Text>
                    </View>
                </View>

                {isSelected && (
                    <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <DynamicStatusBar backgroundColor={theme.primaryColor} />
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text style={styles.loadingText}>Loading comparison data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={theme.primaryColor} />

            {/* Header */}
            <LinearGradient colors={['#4F46E5','#6366F1','#818CF8']} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity onPress={safeGoBack} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Water Intake Comparison</Text>
                        <Text style={styles.headerSubtitle}>
                            {selectedDates.length} day{selectedDates.length !== 1 ? 's' : ''} selected
                        </Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Text style={styles.selectionCount}>{selectedDates.length}/10</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#2563EB']}
                        tintColor="#2563EB"
                    />
                }
            >
                {/* Quick Selection */}
                {renderQuickSelectionButtons()}

                {/* Statistics */}
                {selectedDates.length > 0 && renderStatisticsCards()}

                {/* Chart */}
                {renderChart()}

                {/* Available Dates */}
                <View style={styles.datesSection}>
                    <Text style={styles.datesSectionTitle}>
                        Available Dates ({availableDates.length})
                    </Text>
                    <Text style={styles.datesSectionSubtitle}>
                        Tap to select dates for comparison
                    </Text>

                    {availableDates.length > 0 ? (
                        <FlatList
                            data={availableDates}
                            renderItem={renderDateItem}
                            keyExtractor={(item) => item.date}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.emptyState}>
                            <Ionicons name="calendar-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Data Available</Text>
                            <Text style={styles.emptyText}>
                                No water intake data found for the last 30 days
                            </Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.primaryColor,
    },
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    loadingContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#2563EB',
        fontWeight: '500',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 20 : 0,
        paddingBottom: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 2,
    },
    headerRight: {
        width: 40,
        alignItems: 'center',
    },
    selectionCount: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
    },
    quickSelectionContainer: {
        margin: 20,
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    quickSelectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    quickSelectionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    quickSelectionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    quickSelectionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    clearButton: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FECACA',
    },
    clearButtonText: {
        color: '#DC2626',
    },
    statisticsContainer: {
        margin: 20,
        marginTop: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    statisticsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 16,
    },
    statisticsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statisticsCard: {
        width: '48%',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    statisticsValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 8,
    },
    statisticsLabel: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4,
        textAlign: 'center',
    },
    chartContainer: {
        margin: 20,
        marginTop: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    chartToggle: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 8,
        padding: 2,
    },
    chartToggleButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    chartToggleButtonActive: {
        backgroundColor: '#2563EB',
    },
    chart: {
        marginVertical: 8,
        borderRadius: 16,
    },
    chartPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    chartPlaceholderText: {
        fontSize: 16,
        color: '#64748B',
        marginTop: 16,
        textAlign: 'center',
    },
    referenceLines: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    referenceLine: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    referenceLineIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    referenceLineText: {
        fontSize: 12,
        color: '#64748B',
    },
    datesSection: {
        margin: 20,
        marginTop: 0,
    },
    datesSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    datesSectionSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 16,
    },
    dateItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        position: 'relative',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    dateItemSelected: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    dateItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    dateInfo: {
        flex: 1,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    dateTextSelected: {
        color: '#FFFFFF',
    },
    dateSubtext: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    dateSubtextSelected: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    dateStatus: {
        marginLeft: 12,
    },
    dateItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    amountValue: {
        fontSize: 24,
        fontWeight: '700',
        color: '#2563EB',
    },
    amountValueSelected: {
        color: '#FFFFFF',
    },
    amountUnit: {
        fontSize: 14,
        color: '#64748B',
        marginLeft: 4,
    },
    amountUnitSelected: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    progressBarContainer: {
        flex: 1,
        marginLeft: 16,
        alignItems: 'flex-end',
    },
    progressBar: {
        width: 80,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    progressTextSelected: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    selectedIndicator: {
        position: 'absolute',
        top: 12,
        right: 12,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E293B',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 24,
    },
});