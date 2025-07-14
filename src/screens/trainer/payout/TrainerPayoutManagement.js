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
    Image,
    RefreshControl,
} from 'react-native';
import { Ionicons,MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width } = Dimensions.get('window');

const TrainerPayoutManagement = () => {
    const { user,loading: authLoading } = useAuth();
    const navigation = useNavigation();
    const [allPayouts,setAllPayouts] = useState([]);
    const [displayedPayouts,setDisplayedPayouts] = useState([]);
    const [loading,setLoading] = useState(true);
    const [refreshing,setRefreshing] = useState(false);
    const [showFilterModal,setShowFilterModal] = useState(false);
    const [pageNumber,setPageNumber] = useState(1);
    const [pageSize,setPageSize] = useState(10);
    const [totalPages,setTotalPages] = useState(1);
    const [totalItems,setTotalItems] = useState(0);
    const [searchTerm,setSearchTerm] = useState('');
    const [hasMore,setHasMore] = useState(true);
    const [activeTab,setActiveTab] = useState('all');
    const [showStartDatePicker,setShowStartDatePicker] = useState(false);
    const [showEndDatePicker,setShowEndDatePicker] = useState(false);

    const [filters,setFilters] = useState({
        minAmount: '',
        maxAmount: '',
        status: 'all',
        startDate: null,
        endDate: null,
    });

    const [tempFilters,setTempFilters] = useState(filters);
    const [filterErrors,setFilterErrors] = useState({});

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const memoizedFilters = useMemo(() => filters,[
        filters.minAmount,
        filters.maxAmount,
        filters.status,
        filters.startDate,
        filters.endDate,
    ]);

    useEffect(() => {
        if (authLoading) return;
        fetchAllPayouts();
    },[authLoading,user,pageNumber,pageSize,searchTerm,memoizedFilters,activeTab]);

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
        if (filtersToValidate.minAmount && isNaN(parseFloat(filtersToValidate.minAmount))) {
            errors.minAmount = 'Minimum amount must be a valid number';
        }
        if (filtersToValidate.maxAmount && isNaN(parseFloat(filtersToValidate.maxAmount))) {
            errors.maxAmount = 'Maximum amount must be a valid number';
        }
        if (
            filtersToValidate.minAmount &&
            filtersToValidate.maxAmount &&
            parseFloat(filtersToValidate.minAmount) > parseFloat(filtersToValidate.maxAmount)
        ) {
            errors.amountRange = 'Minimum amount cannot exceed maximum amount';
        }
        if (
            filtersToValidate.startDate &&
            filtersToValidate.endDate &&
            filtersToValidate.startDate > filtersToValidate.endDate
        ) {
            errors.dateRange = 'Start date must be earlier than or equal to end date';
        }
        return errors;
    };

    const fetchAllPayouts = async () => {
        try {
            setLoading(true);
            const params = {
                PageNumber: pageNumber,
                PageSize: pageSize,
                TrainerId: user.userId,
                Status: activeTab === 'all' ? undefined : activeTab,
                MinAmount: filters.minAmount ? parseFloat(filters.minAmount) : undefined,
                MaxAmount: filters.maxAmount ? parseFloat(filters.maxAmount) : undefined,
                StartDate: filters.startDate ? filters.startDate.toISOString() : undefined,
                EndDate: filters.endDate ? filters.endDate.toISOString() : undefined,
                SearchTerm: searchTerm || undefined,
            };
            const response = await trainerService.getMyPayouts(user.userId,params);
            let payouts = [];
            if (response.statusCode === 200 && Array.isArray(response.data?.payouts)) {
                payouts = response.data.payouts.filter((payout) => payout.trainerId === user.userId);
                setAllPayouts((prev) => (pageNumber === 1 ? payouts : [...prev,...payouts]));
                setDisplayedPayouts((prev) => (pageNumber === 1 ? payouts : [...prev,...payouts]));
                setTotalItems(response.data.totalCount || payouts.length);
                setTotalPages(response.data.totalPages || Math.ceil(payouts.length / pageSize));
                setHasMore(pageNumber < (response.data.totalPages || Math.ceil(payouts.length / pageSize)));
            } else {
                setAllPayouts([]);
                setDisplayedPayouts([]);
                setTotalItems(0);
                setTotalPages(1);
                setHasMore(false);
            }
        } catch (error) {
            showErrorFetchAPI(error);
            setAllPayouts([]);
            setDisplayedPayouts([]);
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
        fetchAllPayouts();
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
        setPageNumber(1);
    };

    const loadMorePayouts = () => {
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
        setShowFilterModal(false);
    };

    const resetTempFilters = () => {
        const defaultFilters = {
            minAmount: '',
            maxAmount: '',
            status: 'all',
            startDate: null,
            endDate: null,
        };
        setTempFilters(defaultFilters);
        setFilterErrors({});
    };

    const clearFilters = () => {
        const defaultFilters = {
            minAmount: '',
            maxAmount: '',
            status: 'all',
            startDate: null,
            endDate: null,
        };
        setFilters(defaultFilters);
        setTempFilters(defaultFilters);
        setSearchTerm('');
        setPageNumber(1);
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

    const renderPayoutIcon = (paymentMethod) => {
        switch (paymentMethod.toLowerCase()) {
            case 'bank_transfer':
                return <Ionicons name="business" size={24} color="#0056D2" />;
            case 'card':
                return <Ionicons name="card" size={24} color="#F59E0B" />;
            default:
                return <MaterialCommunityIcons name="cash" size={24} color="#22C55E" />;
        }
    };

    const PayoutItem = ({ item }) => {
        const statusInfo =
            item.status === 'completed'
                ? { color: '#22C55E',bgColor: '#DCFCE7',text: 'Completed' }
                : { color: '#F59E0B',bgColor: '#FEF3C7',text: 'Pending' };
        const handlePress = () => {
            navigation.navigate('TrainerPayoutDetailScreen',{
                payoutId: item.payoutId,
            });
        };

        return (
            <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
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
                        <View style={styles.cardHeader}>
                            <View style={styles.headerLeft}>
                                <View style={styles.avatarContainer}>
                                    <View style={styles.iconContainer}>{renderPayoutIcon(item.paymentMethod)}</View>
                                </View>
                                <View style={styles.groupDetails}>
                                    <Text style={styles.groupName} numberOfLines={1}>
                                        Payout #{item.payoutId}
                                    </Text>
                                    <View style={styles.statsRow}>
                                        <View style={styles.memberStat}>
                                            <Ionicons name="cash" size={14} color="#22C55E" />
                                            <Text style={styles.memberCount}>${item.amount.toLocaleString()}</Text>
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
                            <Text style={styles.descriptionText} numberOfLines={2}>
                                {item.notes ? item.notes : 'No notes available'}
                            </Text>
                            <Text style={styles.transactionText}>Transaction: {item.transactionReference || 'N/A'}</Text>
                            <Text style={styles.dateText}>Date: {formatDisplayDate(item.payoutDate)}</Text>
                        </View>
                    </View>
                </Animated.View>
            </TouchableOpacity>
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
                <MaterialCommunityIcons name="cash" size={80} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No Payouts Found</Text>
            <Text style={styles.emptyText}>
                {searchTerm || filters.status !== 'all' || filters.startDate || filters.endDate
                    ? 'No payouts match your current filters. Try adjusting your search criteria.'
                    : 'No payout records available.'}
            </Text>
            {(searchTerm || filters.status !== 'all' || filters.startDate || filters.endDate) && (
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
                        <Text style={styles.modalTitle}>Filter Payouts</Text>
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
                            <Text style={styles.filterSectionTitle}>Amount Range</Text>
                            <View style={styles.dateRangeContainer}>
                                <TextInput
                                    style={[styles.dateButton,filterErrors.minAmount && styles.inputError]}
                                    placeholder="Min Amount"
                                    value={tempFilters.minAmount}
                                    onChangeText={(text) => setTempFilters({ ...tempFilters,minAmount: text })}
                                    keyboardType="numeric"
                                    placeholderTextColor="#94A3B8"
                                />
                                <Text style={styles.dateRangeSeparator}>to</Text>
                                <TextInput
                                    style={[styles.dateButton,filterErrors.maxAmount && styles.inputError]}
                                    placeholder="Max Amount"
                                    value={tempFilters.maxAmount}
                                    onChangeText={(text) => setTempFilters({ ...tempFilters,maxAmount: text })}
                                    keyboardType="numeric"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                            {filterErrors.amountRange && <Text style={styles.errorText}>{filterErrors.amountRange}</Text>}
                            {filterErrors.minAmount && <Text style={styles.errorText}>{filterErrors.minAmount}</Text>}
                            {filterErrors.maxAmount && <Text style={styles.errorText}>{filterErrors.maxAmount}</Text>}
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
            {showStartDatePicker && (
                <Modal visible={showStartDatePicker} transparent={true} animationType="fade">
                    <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                                <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
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
                                <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowStartDatePicker(false)}>
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
                                    <Ionicons name="close" size={24} color="#64748B" />
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
                                <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowEndDatePicker(false)}>
                                    <Text style={styles.datePickerConfirmText}>Confirm</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
            )}
        </Modal>
    );

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#0056D2" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Payout History</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                            <Ionicons name="options-outline" size={24} color="#0056D2" />
                            {(searchTerm || filters.status !== 'all' || filters.startDate || filters.endDate) && (
                                <View style={styles.filterBadge} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.statsButton}
                            onPress={() => navigation.navigate('TrainerPayoutStatistics')}
                        >
                            <Ionicons name="stats-chart-outline" size={24} color="#0056D2" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={[styles.tabItem,activeTab === 'all' && styles.tabItemActive]}
                    onPress={() => {
                        setActiveTab('all');
                        setPageNumber(1);
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText,activeTab === 'all' && styles.tabTextActive]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem,activeTab === 'completed' && styles.tabItemActive]}
                    onPress={() => {
                        setActiveTab('completed');
                        setPageNumber(1);
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText,activeTab === 'completed' && styles.tabTextActive]}>Completed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabItem,activeTab === 'pending' && styles.tabItemActive]}
                    onPress={() => {
                        setActiveTab('pending');
                        setPageNumber(1);
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText,activeTab === 'pending' && styles.tabTextActive]}>Pending</Text>
                </TouchableOpacity>
            </View>
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
                        placeholder="Search by transaction ID or notes..."
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
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0056D2" />
                    <Text style={styles.loadingText}>Loading payouts...</Text>
                </View>
            ) : (
                <FlatList
                    data={displayedPayouts}
                    onEndReached={loadMorePayouts}
                    onEndReachedThreshold={0.2}
                    keyExtractor={(item) => item.payoutId.toString()}
                    renderItem={PayoutItem}
                    ListEmptyComponent={renderEmpty}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0056D2']} tintColor="#0056D2" />
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 10 : 0,
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
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        gap: 6,
    },
    statsButtonText: {
        fontSize: 14,
        color: '#0056D2',
        fontWeight: '600',
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
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        marginBottom: 2,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabItemActive: {
        borderBottomColor: '#0056D2',
        backgroundColor: '#F1F5F9',
    },
    tabText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
    },
    tabTextActive: {
        color: '#0056D2',
        fontWeight: '700',
    },
    searchSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
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
        paddingBottom: 50,
        paddingTop: 20,
    },
    groupCard: {
        marginHorizontal: 20,
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
        position: 'relative',
        marginRight: 15,
    },
    iconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
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
    transactionText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    dateText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
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
    },
    filterModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        padding: 16,
        height: '60%',
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
        color: '#64748B',
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
        color: '#64748B',
        fontWeight: '500',
    },
    selectedStatusOptionText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    pageSizeOptions: {
        flexDirection: 'row',
        gap: 10,
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
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
    },
});

export default TrainerPayoutManagement;