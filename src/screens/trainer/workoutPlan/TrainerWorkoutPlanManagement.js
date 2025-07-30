import React,{ useState,useEffect,useRef,useMemo } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    TextInput,
    ActivityIndicator,
    Animated,
    Platform,
    Dimensions,
    Modal,
    ScrollView,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';
import Header from 'components/Header';

const { width } = Dimensions.get('window');

const TrainerWorkoutPlanManagement = () => {
    const { user,loading: authLoading } = useAuth();
    const navigation = useNavigation();
    const [allPlans,setAllPlans] = useState([]);
    const [displayedPlans,setDisplayedPlans] = useState([]);
    const [loading,setLoading] = useState(true);
    const [refreshing,setRefreshing] = useState(false);
    const [showFilterModal,setShowFilterModal] = useState(false);
    const [pageNumber,setPageNumber] = useState(1);
    const [pageSize,setPageSize] = useState(10);
    const [totalItems,setTotalItems] = useState(0);
    const [totalPages,setTotalPages] = useState(1);
    const [searchTerm,setSearchTerm] = useState('');
    const [hasMore,setHasMore] = useState(true);
    const [showStartDatePicker,setShowStartDatePicker] = useState(false);
    const [showEndDatePicker,setShowEndDatePicker] = useState(false);

    const [filters,setFilters] = useState({
        startDate: null,
        endDate: null,
    });

    const [tempFilters,setTempFilters] = useState(filters);
    const [filterErrors,setFilterErrors] = useState({});

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const memoizedFilters = useMemo(() => filters,[filters.startDate,filters.endDate]);

    useEffect(() => {
        if (authLoading) return;
        fetchAllPlans();
    },[authLoading,user,pageNumber,pageSize,searchTerm,memoizedFilters]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim,{
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim,{
                toValue: 1,
                tension: 120,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    },[]);

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

    const fetchAllPlans = async () => {
        try {
            setLoading(true);
            const params = {
                PageNumber: pageNumber,
                PageSize: pageSize,
                StartDate: filters.startDate ? filters.startDate.toISOString() : undefined,
                EndDate: filters.endDate ? filters.endDate.toISOString() : undefined,
                SearchTerm: searchTerm || undefined,
            };
            const response = await trainerService.getWorkoutPlansByTrainerId(user.userId,params);
            if (response.statusCode === 200 && Array.isArray(response.data)) {
                let newPlans = response.data.map((item,index) => ({
                    ...item,
                    _key: item.planId ? `plan-${item.planId}` : `plan-unknown-${Date.now()}-${index}`,
                }));
                if (pageNumber === 1) {
                    setAllPlans(newPlans);
                    setDisplayedPlans(newPlans);
                } else {
                    const existingIds = new Set(allPlans.map((p) => p.planId));
                    newPlans = newPlans.filter((p) => !existingIds.has(p.planId));
                    setAllPlans((prev) => [...prev,...newPlans]);
                    setDisplayedPlans((prev) => [...prev,...newPlans]);
                }
                setTotalItems(response.data.totalCount || newPlans.length);
                setTotalPages(response.data.totalPages || Math.ceil(response.data.totalCount / pageSize));
                setHasMore(newPlans.length === pageSize && pageNumber < response.data.totalPages);
            } else {
                setAllPlans([]);
                setDisplayedPlans([]);
                setTotalItems(0);
                setTotalPages(1);
                setHasMore(false);
            }
        } catch (error) {
            showErrorFetchAPI(error);
            setAllPlans([]);
            setDisplayedPlans([]);
            setTotalItems(0);
            setTotalPages(1);
            setHasMore(false);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        setPageNumber(1);
        setAllPlans([]);
        setDisplayedPlans([]);
        fetchAllPlans();
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
        setPageNumber(1);
        setAllPlans([]);
        setDisplayedPlans([]);
    };

    const loadMorePlans = () => {
        if (!loading && hasMore) {
            setPageNumber((prev) => prev + 1);
        }
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
        setPageNumber(1);
        setAllPlans([]);
        setDisplayedPlans([]);
        setShowFilterModal(false);
    };

    const resetTempFilters = () => {
        const defaultFilters = {
            startDate: null,
            endDate: null,
        };
        setTempFilters(defaultFilters);
        setFilterErrors({});
    };

    const clearFilters = () => {
        const defaultFilters = {
            startDate: null,
            endDate: null,
        };
        setFilters(defaultFilters);
        setTempFilters(defaultFilters);
        setSearchTerm('');
        setPageNumber(1);
        setAllPlans([]);
        setDisplayedPlans([]);
        setFilterErrors({});
    };

    const formatDisplayDate = (date) => {
        if (!date) return 'Select Date';
        return new Date(date).toLocaleDateString('en-US',{
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const handleStartDateConfirm = () => {
        setTempFilters((prev) => ({
            ...prev,
            startDate: tempFilters.startDate || new Date(),
        }));
        setShowStartDatePicker(false);
    };

    const handleEndDateConfirm = () => {
        setTempFilters((prev) => ({
            ...prev,
            endDate: tempFilters.endDate || new Date(),
        }));
        setShowEndDatePicker(false);
    };

    const PlanItem = ({ item }) => {
        const statusInfo = {
            active: { color: '#22C55E',bgColor: '#DCFCE7',text: 'Active' },
            inactive: { color: '#EF4444',bgColor: '#FEE2E2',text: 'Inactive' },
        }[item.status?.toLowerCase()] || { color: '#6B7280',bgColor: '#E5E7EB',text: item.status || 'Unknown' };

        const handlePress = () => {
            navigation.navigate('TrainerWorkoutPlanDetailScreen',{
                planId: item.planId,
            });
        };

        const handleAddExercise = () => {
            navigation.navigate('AddExerciseToPlanScreen',{ planId: item.planId });
        };

        return (
            <Animated.View
                style={[
                    styles.groupCard,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
                    },
                ]}
            >
                <View style={styles.cardContainer}>
                    <TouchableOpacity activeOpacity={0.9} onPress={handlePress} style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View style={styles.headerLeft}>
                                <View style={styles.avatarContainer}>
                                    <Ionicons name="fitness" size={24} color="#0056D2" />
                                </View>
                                <View style={styles.groupDetails}>
                                    <Text style={styles.groupName} numberOfLines={1}>
                                        {item.planName || 'Workout Plan'}
                                    </Text>
                                    <View style={styles.statsRow}>
                                        <View style={styles.memberStat}>
                                            <Ionicons name="person-outline" size={14} color="#6B7280" />
                                            <Text style={styles.memberCount} numberOfLines={1}>
                                                User: {item.userFullName || 'Unknown'}
                                            </Text>
                                        </View>
                                        <View style={styles.statusIndicator}>
                                            <View style={[styles.statusDot,{ backgroundColor: statusInfo.color }]} />
                                            <Text style={[styles.statusText,{ color: statusInfo.color }]}>{statusInfo.text}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                        <View style={styles.descriptionSection}>
                            <Text style={styles.descriptionText} numberOfLines={1}>
                                {item.description ? item.description.replace(/<[^>]+>/g,'') : 'No description available'}
                            </Text>
                            <Text style={styles.dateText}>Start: {formatDisplayDate(item.startDate)}</Text>
                            <Text style={styles.dateText}>End: {formatDisplayDate(item.endDate)}</Text>
                            <Text style={styles.dateText}>Frequency: {item.frequencyPerWeek || 'N/A'} days/week</Text>
                            <Text style={styles.dateText}>Duration: {item.durationMinutes || 'N/A'} minutes</Text>
                        </View>
                        <View style={styles.cardFooter}>
                            <View style={styles.categoryBadge}>
                                <Ionicons name="calendar" size={12} color="#FFFFFF" />
                                <Text style={styles.categoryText}>
                                    {item.startDate ? formatDisplayDate(item.startDate) : 'N/A'}
                                </Text>
                            </View>
                            <View style={styles.ownerActions}>
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => navigation.navigate('EditWorkoutPlanScreen',{ planId: item.planId })}
                                >
                                    <Ionicons name="pencil" size={16} color="#0056D2" />
                                    <Text style={styles.editBtnText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addExerciseButton} onPress={handleAddExercise}>
                        <Ionicons name="add-circle-outline" size={24} color="#0056D2" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    const renderEmpty = () => (
        <Animated.View
            style={[
                styles.emptyContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View style={styles.emptyIconContainer}>
                <Ionicons name="fitness-outline" size={80} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No Workout Plans Found</Text>
            <Text style={styles.emptyText}>
                {searchTerm || filters.startDate || filters.endDate
                    ? 'No plans match your current filters. Try adjusting your search criteria.'
                    : 'No workout plans available.'}
            </Text>
            {(searchTerm || filters.startDate || filters.endDate) && (
                <TouchableOpacity style={styles.emptyActionButton} onPress={clearFilters}>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyActionText}>Clear Filters</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );

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
                <Animated.View style={[styles.filterModalContent,{ transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Workout Plans</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowFilterModal(false);
                                setTempFilters(filters);
                                setFilterErrors({});
                            }}
                            style={styles.modalCloseBtn}
                        >
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Date Range</Text>
                            <View style={styles.dateRangeContainer}>
                                <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartDatePicker(true)}>
                                    <Ionicons name="calendar-outline" size={16} color="#0056D2" />
                                    <Text style={styles.dateButtonText}>{formatDisplayDate(tempFilters.startDate)}</Text>
                                </TouchableOpacity>
                                <Text style={styles.dateRangeSeparator}>to</Text>
                                <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndDatePicker(true)}>
                                    <Ionicons name="calendar-outline" size={16} color="#0056D2" />
                                    <Text style={styles.dateButtonText}>{formatDisplayDate(tempFilters.endDate)}</Text>
                                </TouchableOpacity>
                            </View>
                            {filterErrors.dateRange && <Text style={styles.errorText}>{filterErrors.dateRange}</Text>}
                        </View>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Items per Page</Text>
                            <View style={styles.pageSizeOptions}>
                                {[5,10,20,50].map((size) => (
                                    <TouchableOpacity
                                        key={size}
                                        style={[styles.pageSizeOption,pageSize === size && styles.selectedPageSizeOption]}
                                        onPress={() => {
                                            setPageSize(size);
                                            setPageNumber(1);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.pageSizeOptionText,
                                                pageSize === size && styles.selectedPageSizeOptionText,
                                            ]}
                                        >
                                            {size}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>
                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.resetButton} onPress={resetTempFilters}>
                            <Ionicons name="refresh" size={16} color="#64748B" />
                            <Text style={styles.resetButtonText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={applyTempFilters}>
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );

    const renderStartDatePickerModal = () => (
        <Modal visible={showStartDatePicker} transparent={true} animationType="fade">
            <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                        <Text style={styles.datePickerTitle}>Select Start Date</Text>
                        <TouchableOpacity onPress={handleStartDateConfirm}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <DateTimePicker
                        value={tempFilters.startDate || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event,selectedDate) => {
                            if (event.type === 'set' && selectedDate) {
                                setTempFilters({ ...tempFilters,startDate: selectedDate });
                            }
                        }}
                    />
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity
                            style={styles.datePickerConfirm}
                            onPress={handleStartDateConfirm}
                        >
                            <Text style={styles.datePickerConfirmText}>Confirm</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );

    const renderEndDatePickerModal = () => (
        <Modal visible={showEndDatePicker} transparent={true} animationType="fade">
            <View style={styles.datePickerOverlay}>
                <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerHeader}>
                        <Text style={styles.datePickerTitle}>Select End Date</Text>
                        <TouchableOpacity onPress={handleEndDateConfirm}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <DateTimePicker
                        value={tempFilters.endDate || new Date()}
                        mode="date"
                        display="spinner"
                        onChange={(event,selectedDate) => {
                            if (event.type === 'set' && selectedDate) {
                                setTempFilters({ ...tempFilters,endDate: selectedDate });
                            }
                        }}
                    />
                    {Platform.OS === 'ios' && (
                        <TouchableOpacity
                            style={styles.datePickerConfirm}
                            onPress={handleEndDateConfirm}
                        >
                            <Text style={styles.datePickerConfirmText}>Confirm</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <Header
                title="Workout Plans"
                onBack={() => navigation.navigate("Settings")}
                backIconColor="#0056D2"
                rightActions={[
                    {
                        icon: 'options-outline',
                        onPress: () => setShowFilterModal(true),
                        badge: filters.startDate || filters.endDate,
                        color: "#0056D2",
                    },
                    {
                        icon: 'stats-chart-outline',
                        onPress: () => navigation.navigate('TrainerWorkoutPlanStatisticsScreen'),
                        color: "#0056D2",
                    },
                ]}
            />

            <Animated.View
                style={[
                    styles.searchSection,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by plan name or user..."
                        value={searchTerm}
                        onChangeText={handleSearch}
                        placeholderTextColor="#94A3B8"
                    />
                    {searchTerm ? (
                        <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearch}>
                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </Animated.View>
            {loading && pageNumber === 1 ? (
                <CommonSkeleton />
            ) : (
                <FlatList
                    data={displayedPlans}
                    onEndReached={loadMorePlans}
                    onEndReachedThreshold={0.3}
                    keyExtractor={(item) => item._key}
                    renderItem={PlanItem}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#0056D2']}
                            tintColor="#0056D2"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        loading && pageNumber > 1 ? (
                            <View style={{ padding: 20,alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#0056D2" />
                            </View>
                        ) : null
                    }
                />
            )}
            {renderFilterModal()}
            {showStartDatePicker && renderStartDatePickerModal()}
            {showEndDatePicker && renderEndDatePickerModal()}
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
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 20,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1E293B',
    },
    filterButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    statsButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    filterBadge: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#F59E0B',
    },
    searchSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        marginTop: 70
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingHorizontal: 15,
        height: 48,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    clearSearch: {
        padding: 5,
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 50,
    },
    groupCard: {
        marginBottom: 15,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    groupDetails: {
        flex: 1,
    },
    groupName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    memberStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 1,
    },
    memberCount: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    descriptionSection: {
        marginBottom: 15,
    },
    descriptionText: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        marginBottom: 5,
    },
    dateText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0056D2',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 5,
    },
    categoryText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    ownerActions: {
        flexDirection: 'row',
        gap: 10,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    editBtnText: {
        fontSize: 12,
        color: '#0056D2',
        fontWeight: '600',
    },
    addExerciseButton: {
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
        color: '#0056D2',
        marginTop: 15,
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
        color: '#64748B',
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
        borderRadius: 25,
        gap: 10,
    },
    emptyActionText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        alignItems: 'stretch',
    },
    filterModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        width: '100%',
        height: '50%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CBD5E1',
        borderRadius: 2,
        alignSelf: 'center',
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
        color: '#64748B',
        fontWeight: '500',
    },
    pageSizeOptions: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    pageSizeOption: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minHeight: 50,
        justifyContent: 'center',
    },
    selectedPageSizeOption: {
        backgroundColor: '#0056D2',
        borderColor: '#0056D2',
    },
    pageSizeOptionText: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '700',
    },
    selectedPageSizeOptionText: {
        color: '#FFFFFF',
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
        color: '#64748B',
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

export default TrainerWorkoutPlanManagement;