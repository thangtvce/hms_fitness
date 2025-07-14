import React,{ useState,useEffect,useRef,useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Platform,
    Dimensions,
    ScrollView,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI } from 'utils/toastUtil';
import { PieChart,BarChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width } = Dimensions.get('window');

const TrainerPayoutStatisticsScreen = () => {
    const { user,loading: authLoading } = useContext(AuthContext);
    const navigation = useNavigation();
    const [statistics,setStatistics] = useState(null);
    const [loading,setLoading] = useState(true);
    const [showFilterModal,setShowFilterModal] = useState(false);
    const [showStartDatePicker,setShowStartDatePicker] = useState(false);
    const [showEndDatePicker,setShowEndDatePicker] = useState(false);
    const [filters,setFilters] = useState({
        startDate: null,
        endDate: null,
        status: 'all',
    });
    const [tempFilters,setTempFilters] = useState(filters);
    const [filterErrors,setFilterErrors] = useState({});

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        if (authLoading) return;

        const fetchStatistics = async () => {
            try {
                setLoading(true);
                const params = {
                    StartDate: filters.startDate ? filters.startDate.toISOString() : undefined,
                    EndDate: filters.endDate ? filters.endDate.toISOString() : undefined,
                    Status: filters.status === 'all' ? undefined : filters.status,
                };
                const response = await trainerService.getMyPayoutsStatistics(user.userId,params);
                if (response.statusCode === 200 && response.data) {
                    setStatistics(response.data);
                    startAnimations();
                } else {
                    showErrorFetchAPI(new Error('Statistics not found.'));
                    setStatistics(null);
                }
            } catch (error) {
                showErrorFetchAPI(error);
                setStatistics(null);
            } finally {
                setLoading(false);
            }
        };

        fetchStatistics();
    },[authLoading,user,filters]);

    const startAnimations = () => {
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim,{
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const validateFilters = (filtersToValidate) => {
        const errors = {};
        if (
            filtersToValidate.startDate &&
            filtersToValidate.endDate &&
            filtersToValidate.startDate > filtersToValidate.endDate
        ) {
            errors.dateRange = 'Start date must be earlier than or equal to end date';
        }
        return errors;
    };

    const applyTempFilters = () => {
        const errors = validateFilters(tempFilters);
        if (Object.keys(errors).length > 0) {
            setFilterErrors(errors);
            showErrorFetchAPI(new Error('Please correct the filter inputs.'));
            return;
        }
        setFilters(tempFilters);
        setFilterErrors({});
        setShowFilterModal(false);
    };

    const resetTempFilters = () => {
        const defaultFilters = {
            startDate: null,
            endDate: null,
            status: 'all',
        };
        setTempFilters(defaultFilters);
        setFilterErrors({});
    };

    const formatDate = (date) => {
        if (!date) return 'Select Date';
        return date.toLocaleDateString('en-US',{
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const renderLoadingScreen = () => (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0056D2" />
                <Text style={styles.loadingText}>Loading statistics...</Text>
            </View>
        </SafeAreaView>
    );

    const renderEmptyState = () => (
        <Animated.View
            style={[
                styles.emptyContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.emptyIconContainer}>
                <Ionicons name="stats-chart-outline" size={80} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No Statistics Available</Text>
            <Text style={styles.emptyText}>
                {filters.startDate || filters.endDate || filters.status !== 'all'
                    ? 'No statistics match your current filters. Try adjusting your criteria.'
                    : 'No payout statistics found.'}
            </Text>
            {(filters.startDate || filters.endDate || filters.status !== 'all') && (
                <TouchableOpacity
                    style={styles.emptyActionButton}
                    onPress={() => setFilters({ startDate: null,endDate: null,status: 'all' })}
                >
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyActionText}>Clear Filters</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );

    const renderSummary = () => (
        <Animated.View
            style={[
                styles.summarySection,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.fieldContainer}>
                <View style={styles.fieldHeader}>
                    <View style={styles.fieldLabelContainer}>
                        <Ionicons name="stats-chart-outline" size={20} color="#0056D2" />
                        <Text style={styles.fieldLabel}>Summary</Text>
                    </View>
                </View>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statCardLabel}>Total Payouts</Text>
                        <Text style={styles.statCardValue}>{statistics?.totalPayouts || 0}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statCardLabel}>Total Amount</Text>
                        <Text style={styles.statCardValue}>
                            ${statistics?.totalPayoutAmount ? statistics.totalPayoutAmount.toLocaleString() : '0'}
                        </Text>
                    </View>
                    {statistics?.payoutsByTrainer?.[0] && (
                        <View style={styles.statCard}>
                            <Text style={styles.statCardLabel}>Average Amount</Text>
                            <Text style={styles.statCardValue}>
                                ${statistics.payoutsByTrainer[0].averageAmount.toLocaleString()}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Animated.View>
    );

    const renderStatusChart = () => {
        const pieData = statistics?.payoutsByStatus?.map((item) => ({
            name: item.status.charAt(0).toUpperCase() + item.status.slice(1),
            value: item.count,
            color: item.status === 'completed' ? '#22C55E' : '#F59E0B',
        })) || [];

        if (pieData.length === 0) return null;

        return (
            <Animated.View
                style={[
                    styles.chartSection,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <View style={styles.fieldContainer}>
                    <View style={styles.fieldHeader}>
                        <View style={styles.fieldLabelContainer}>
                            <Ionicons name="pie-chart-outline" size={20} color="#0056D2" />
                            <Text style={styles.fieldLabel}>Payouts by Status</Text>
                        </View>
                    </View>
                    <View style={styles.chartContainer}>
                        <PieChart
                            data={pieData}
                            width={width - 40}
                            height={220}
                            chartConfig={{
                                backgroundColor: '#FFFFFF',
                                backgroundGradientFrom: '#FFFFFF',
                                backgroundGradientTo: '#FFFFFF',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                            }}
                            accessor="value"
                            backgroundColor="transparent"
                            paddingLeft="15"
                            center={[10,0]}
                            absolute
                        />
                    </View>
                </View>
            </Animated.View>
        );
    };

    const renderDateChart = () => {
        const barData = {
            labels: statistics?.payoutsByCreationDate?.map((item) => `${item.month}/${item.year % 100}`) || [],
            datasets: [
                {
                    data: statistics?.payoutsByCreationDate?.map((item) => item.count) || [],
                },
            ],
        };

        if (barData.labels.length === 0) return null;

        return (
            <Animated.View
                style={[
                    styles.chartSection,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <View style={styles.fieldContainer}>
                    <View style={styles.fieldHeader}>
                        <View style={styles.fieldLabelContainer}>
                            <Ionicons name="bar-chart-outline" size={20} color="#0056D2" />
                            <Text style={styles.fieldLabel}>Payouts by Creation Date</Text>
                        </View>
                    </View>
                    <View style={styles.chartContainer}>
                        <BarChart
                            data={barData}
                            width={width - 40}
                            height={220}
                            yAxisLabel=""
                            chartConfig={{
                                backgroundColor: '#FFFFFF',
                                backgroundGradientFrom: '#FFFFFF',
                                backgroundGradientTo: '#FFFFFF',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(0, 86, 210, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
                                style: {
                                    borderRadius: 12,
                                },
                                propsForDots: {
                                    r: '6',
                                    strokeWidth: '2',
                                    stroke: '#0056D2',
                                },
                            }}
                            style={{ borderRadius: 12 }}
                        />
                    </View>
                </View>
            </Animated.View>
        );
    };

    const renderFilterModal = () => (
        <Modal
            visible={showFilterModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => {
                setShowFilterModal(false);
                setTempFilters(filters);
                setFilterErrors({});
            }}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.filterModalContent}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Statistics</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowFilterModal(false);
                                setTempFilters(filters);
                                setFilterErrors({});
                            }}
                            style={styles.modalCloseBtn}
                        >
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Date Range</Text>
                            <View style={styles.dateRangeContainer}>
                                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                                    <Ionicons name="calendar-outline" size={16} color="#0056D2" />
                                    <Text style={styles.dateButtonText}>{formatDate(tempFilters.startDate)}</Text>
                                </TouchableOpacity>
                                <Text style={styles.dateRangeSeparator}>to</Text>
                                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                                    <Ionicons name="calendar-outline" size={16} color="#0056D2" />
                                    <Text style={styles.dateButtonText}>{formatDate(tempFilters.endDate)}</Text>
                                </TouchableOpacity>
                            </View>
                            {filterErrors.dateRange && <Text style={styles.errorText}>{filterErrors.dateRange}</Text>}
                        </View>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Status</Text>
                            <View style={styles.statusOptions}>
                                {[
                                    { key: 'all',label: 'All',icon: 'filter',color: '#0056D2' },
                                    { key: 'completed',label: 'Completed',icon: 'checkmark-circle',color: '#22C55E' },
                                    { key: 'pending',label: 'Pending',icon: 'hourglass',color: '#F59E0B' },
                                ].map((status) => (
                                    <TouchableOpacity
                                        key={status.key}
                                        style={[styles.statusOption,tempFilters.status === status.key && styles.selectedStatusOption]}
                                        onPress={() => setTempFilters({ ...tempFilters,status: status.key })}
                                    >
                                        <Ionicons
                                            name={status.icon}
                                            size={18}
                                            color={tempFilters.status === status.key ? '#FFFFFF' : status.color}
                                        />
                                        <Text
                                            style={[
                                                styles.statusOptionText,
                                                tempFilters.status === status.key && styles.selectedStatusOptionText,
                                            ]}
                                        >
                                            {status.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.resetButton} onPress={resetTempFilters}>
                            <Ionicons name="refresh" size={16} color="#6B7280" />
                            <Text style={styles.resetButtonText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={applyTempFilters}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            {showStartDatePicker && (
                <Modal visible={showStartDatePicker} transparent={true} animationType="fade">
                    <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempFilters.startDate || new Date()}
                                mode="date"
                                display="spinner"
                                onChange={(event,selectedDate) => {
                                    if (selectedDate) {
                                        setTempFilters({ ...tempFilters,startDate: selectedDate });
                                    }
                                    if (Platform.OS === 'android') setShowStartDatePicker(false);
                                }}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerConfirm}
                                    onPress={() => setShowStartDatePicker(false)}
                                >
                                    <Text style={styles.datePickerConfirmText}>Confirm</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
            )}
            {showEndDatePicker && (
                <Modal visible={showEndDatePicker} transparent={true} animationType="fade">
                    <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>Select End Date</Text>
                                <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                                    <Ionicons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempFilters.endDate || new Date()}
                                mode="date"
                                display="spinner"
                                onChange={(event,selectedDate) => {
                                    if (selectedDate) {
                                        setTempFilters({ ...tempFilters,endDate: selectedDate });
                                    }
                                    if (Platform.OS === 'android') setShowEndDatePicker(false);
                                }}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerConfirm}
                                    onPress={() => setShowEndDatePicker(false)}
                                >
                                    <Text style={styles.datePickerConfirmText}>Confirm</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
            )}
        </Modal>
    );

    if (loading) return renderLoadingScreen();

    if (!statistics) return renderEmptyState();

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#0056D2" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Payout Statistics</Text>
                    </View>
                    <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                        <Ionicons name="options-outline" size={24} color="#0056D2" />
                        {(filters.startDate || filters.endDate || filters.status !== 'all') && (
                            <View style={styles.filterBadge} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderSummary()}
                {renderStatusChart()}
                {renderDateChart()}
            </ScrollView>
            {renderFilterModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 10 : 10,
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    filterButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    filterBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
        fontWeight: '500',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 10,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
    },
    emptyActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#22C55E',
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 12,
        gap: 10,
    },
    emptyActionText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    summarySection: {
        marginBottom: 24,
    },
    fieldContainer: {
        marginBottom: 0,
    },
    fieldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    fieldLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fieldLabel: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 5,
    },
    statsGrid: {
        gap: 12,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    statCardLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    statCardValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1E293B',
    },
    chartSection: {
        marginBottom: 24,
    },
    chartContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    filterModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        height: '50%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CBD5E1',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
    },
    modalCloseBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        flex: 1,
        paddingHorizontal: 20,
    },
    filterSection: {
        marginVertical: 15,
    },
    filterSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    dateRangeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    dateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    dateButtonText: {
        fontSize: 14,
        color: '#1E293B',
        flex: 1,
    },
    dateRangeSeparator: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    statusOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    statusOption: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10,
    },
    selectedStatusOption: {
        backgroundColor: '#0056D2',
        borderColor: '#0056D2',
    },
    statusOptionText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    selectedStatusOptionText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        gap: 12,
    },
    resetButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F1F5F9',
        paddingVertical: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    resetButtonText: {
        fontSize: 16,
        color: '#6B7280',
        fontWeight: '600',
    },
    applyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0056D2',
        paddingVertical: 15,
        borderRadius: 12,
        gap: 8,
    },
    applyButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    datePickerContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 350,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    datePickerConfirm: {
        backgroundColor: '#0056D2',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 20,
    },
    datePickerConfirmText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
    },
});

export default TrainerPayoutStatisticsScreen;