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

const { width } = Dimensions.get('window');

const TrainerSubscriptionManagement = () => {
    const { user,loading: authLoading } = useAuth();
    const navigation = useNavigation();
    const [allSubscriptions,setAllSubscriptions] = useState([]);
    const [displayedSubscriptions,setDisplayedSubscriptions] = useState([]);
    const [averageRating,setAverageRating] = useState(null);
    const [packages,setPackages] = useState([]);
    const [loading,setLoading] = useState(true);
    const [refreshing,setRefreshing] = useState(false);
    const [showFilterModal,setShowFilterModal] = useState(false);
    const [showPackageModal,setShowPackageModal] = useState(false);
    const [pageNumber,setPageNumber] = useState(1);
    const [pageSize,setPageSize] = useState(10);
    const [totalPages,setTotalPages] = useState(1);
    const [totalItems,setTotalItems] = useState(0);
    const [searchTerm,setSearchTerm] = useState('');
    const [hasMore,setHasMore] = useState(true);
    const [showStartDatePicker,setShowStartDatePicker] = useState(false);
    const [showEndDatePicker,setShowEndDatePicker] = useState(false);

    const [filters,setFilters] = useState({
        packageId: null,
        startDate: null,
        endDate: null,
    });

    const [tempFilters,setTempFilters] = useState(filters);
    const [filterErrors,setFilterErrors] = useState({});

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const memoizedFilters = useMemo(() => filters,[
        filters.packageId,
        filters.startDate,
        filters.endDate,
    ]);

    useEffect(() => {
        if (authLoading) return;
        fetchAllSubscriptions();
        fetchAverageRating();
        fetchPackages();
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

    const fetchAverageRating = async () => {
        try {
            const response = await trainerService.getTrainerAverageRating(user.userId);
            if (response.statusCode === 200 && response.data) {
                setAverageRating(response.data);
            } else {
                setAverageRating(null);
            }
        } catch (error) {
            showErrorFetchAPI(error);
            setAverageRating(null);
        }
    };

    const fetchPackages = async () => {
        try {
            const response = await trainerService.getServicePackageByTrainerId(user.userId);
            if (response.statusCode === 200 && Array.isArray(response.data?.packages)) {
                setPackages(response.data.packages);
            } else {
                setPackages([]);
            }
        } catch (error) {
            showErrorFetchAPI(error);
            setPackages([]);
        }
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

    const fetchAllSubscriptions = async () => {
        try {
            setLoading(true);
            const params = {
                PageNumber: pageNumber,
                PageSize: pageSize,
                TrainerId: user.userId,
                PackageId: filters.packageId || undefined,
                StartDate: filters.startDate ? filters.startDate.toISOString() : undefined,
                EndDate: filters.endDate ? filters.endDate.toISOString() : undefined,
                SearchTerm: searchTerm || undefined,
            };
            const response = filters.packageId
                ? await trainerService.getSubscriptionByPackageId(filters.packageId,params)
                : await trainerService.getMySubscription(user.userId,params);
            if (response.statusCode === 200 && Array.isArray(response.data?.subscriptions)) {
                let fetchedSubscriptions = response.data.subscriptions.filter(
                    (s) => s.trainerId === user.userId
                );
                const timestamp = Date.now();
                const preparedSubscriptions = fetchedSubscriptions.map((item,index) => ({
                    ...item,
                    _key: item.subscriptionId
                        ? `sub-${item.subscriptionId}`
                        : `sub-unknown-${timestamp}-${index}`,
                }));

                let updatedAllSubscriptions =
                    pageNumber === 1 ? preparedSubscriptions : [...allSubscriptions,...preparedSubscriptions];

                const uniqueById = (items) => {
                    const seen = new Set();
                    return items.filter((item) => {
                        if (seen.has(item.subscriptionId)) return false;
                        seen.add(item.subscriptionId);
                        return true;
                    });
                };

                updatedAllSubscriptions = uniqueById(updatedAllSubscriptions);

                setAllSubscriptions(updatedAllSubscriptions);
                setDisplayedSubscriptions(updatedAllSubscriptions);

                const currentTotalItems = response.data.totalCount || updatedAllSubscriptions.length;
                setTotalItems(currentTotalItems);

                const calculatedTotalPages =
                    response.data.totalPages || Math.ceil(currentTotalItems / pageSize);
                setTotalPages(calculatedTotalPages);
                setHasMore(pageNumber < calculatedTotalPages);
            } else {
                setAllSubscriptions([]);
                setDisplayedSubscriptions([]);
                setTotalItems(0);
                setTotalPages(1);
                setHasMore(false);
            }
        } catch (error) {
            showErrorFetchAPI(error);
            setAllSubscriptions([]);
            setDisplayedSubscriptions([]);
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
        setAllSubscriptions([]);
        setDisplayedSubscriptions([]);
        fetchAllSubscriptions();
        fetchAverageRating();
    };

    const handleSearch = (text) => {
        setSearchTerm(text);
        setPageNumber(1);
        setAllSubscriptions([]);
        setDisplayedSubscriptions([]);
    };

    const loadMoreSubscriptions = () => {
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
        setAllSubscriptions([]);
        setDisplayedSubscriptions([]);
        setShowFilterModal(false);
    };

    const resetTempFilters = () => {
        const defaultFilters = {
            packageId: null,
            startDate: null,
            endDate: null,
        };
        setTempFilters(defaultFilters);
        setFilterErrors({});
    };

    const clearFilters = () => {
        const defaultFilters = {
            packageId: null,
            startDate: null,
            endDate: null,
        };
        setFilters(defaultFilters);
        setTempFilters(defaultFilters);
        setSearchTerm('');
        setPageNumber(1);
        setAllSubscriptions([]);
        setDisplayedSubscriptions([]);
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

    const renderRatingStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= rating ? 'star' : 'star-outline'}
                    size={16}
                    color={i <= rating ? '#F59E0B' : '#CBD5E1'}
                />
            );
        }
        return <View style={styles.starContainer}>{stars}</View>;
    };

    const SubscriptionItem = ({ item }) => {
        const statusInfo = {
            paid: { color: '#22C55E',bgColor: '#DCFCE7',text: 'Paid' },
            systempaid: { color: '#22C55E',bgColor: '#DCFCE7',text: 'System Paid' },
            pending: { color: '#F59E0B',bgColor: '#FEF3C7',text: 'Pending' },
            canceled: { color: '#EF4444',bgColor: '#FEE2E2',text: 'Canceled' },
            active: { color: '#22C55E',bgColor: '#DCFCE7',text: 'Active' },
        }[item.status?.toLowerCase()] || { color: '#6B7280',bgColor: '#E5E7EB',text: item.status || 'Unknown' };

        const handlePress = () => {
            navigation.navigate('TrainerSubscriptionDetailScreen',{
                subscriptionId: item.subscriptionId,
            });
        };

        const handleAddWorkoutPlan = () => {
            navigation.navigate('AddWorkoutPlanScreen',{
                subscriptionId: item.subscriptionId,
                userId: item.userId,
                trainerId: item.trainerId,
            });
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
                                    <Ionicons name="person" size={24} color="#0056D2" />
                                </View>
                                <View style={styles.groupDetails}>
                                    <Text style={styles.groupName} numberOfLines={1}>
                                        Subscription #{item.subscriptionId}
                                    </Text>
                                    <View style={styles.statsRow}>
                                        <View style={styles.memberStat}>
                                            <Ionicons name="person-outline" size={14} color="#6B7280" />
                                            <Text style={styles.memberCount} numberOfLines={1}>
                                                {item.userFullName || 'Unknown'}
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
                                Package: {item.packageName || item.packageId || 'N/A'}
                            </Text>
                            <Text style={styles.transactionText} numberOfLines={1}>
                                User: {item.userEmail || 'N/A'}
                            </Text>
                            <Text style={styles.dateText}>Start: {formatDisplayDate(item.startDate)}</Text>
                            <Text style={styles.dateText}>End: {formatDisplayDate(item.endDate)}</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addWorkoutPlanButton} onPress={handleAddWorkoutPlan}>
                        <Ionicons name="add-circle-outline" size={24} color="#0056D2" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    const renderAverageRating = () => (
        <Animated.View
            style={[
                styles.ratingSection,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.ratingContainer}>
                <View style={styles.fieldHeader}>
                    <View style={styles.fieldLabelContainer}>
                        <Ionicons name="star-outline" size={20} color="#0056D2" />
                        <Text style={styles.fieldLabel}>Trainer Rating</Text>
                    </View>
                </View>
                {averageRating ? (
                    <View style={styles.ratingContent}>
                        {renderRatingStars(averageRating.averageRating)}
                        <Text style={styles.ratingText}>
                            {averageRating.averageRating.toFixed(1)} ({averageRating.reviewCount}{' '}
                            {averageRating.reviewCount === 1 ? 'review' : 'reviews'})
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.noRatingText}>No ratings available</Text>
                )}
            </View>
        </Animated.View>
    );

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
                <Ionicons name="calendar-outline" size={80} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No Subscriptions Found</Text>
            <Text style={styles.emptyText}>
                {searchTerm || filters.packageId || filters.startDate || filters.endDate
                    ? 'No subscriptions match your current filters. Try adjusting your search criteria.'
                    : 'No subscription records available.'}
            </Text>
            {(searchTerm || filters.packageId || filters.startDate || filters.endDate) && (
                <TouchableOpacity style={styles.emptyActionButton} onPress={clearFilters}>
                    <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyActionText}>Clear Filters</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );

    const renderPackageModal = () => (
        <Modal
            visible={showPackageModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowPackageModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.packageModalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Package</Text>
                        <TouchableOpacity onPress={() => setShowPackageModal(false)} style={styles.modalCloseBtn}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <TouchableOpacity
                            style={styles.packageOption}
                            onPress={() => {
                                setTempFilters({ ...tempFilters,packageId: null });
                                setShowPackageModal(false);
                            }}
                        >
                            <Text style={styles.packageOptionText}>All Packages</Text>
                        </TouchableOpacity>
                        {packages.map((pkg) => (
                            <TouchableOpacity
                                key={pkg.packageId}
                                style={styles.packageOption}
                                onPress={() => {
                                    setTempFilters({ ...tempFilters,packageId: pkg.packageId });
                                    setShowPackageModal(false);
                                }}
                            >
                                <Text style={styles.packageOptionText}>
                                    {pkg.packageName} ({pkg.subscriptionCount || 0} subscriptions)
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderStartDatePickerModal = () => (
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
    );

    const renderEndDatePickerModal = () => (
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
            <View style={styles.bottomSheetOverlay}>
                <Animated.View style={[styles.filterModalContent,{ transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter Subscriptions</Text>
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

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#0056D2" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Subscription History</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                            <Ionicons name="options-outline" size={24} color="#0056D2" />
                            {(filters.startDate || filters.endDate || filters.packageId) && <View style={styles.filterBadge} />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.statsButton}
                            onPress={() => navigation.navigate('TrainerSubscriptionStatisticsScreen')}
                        >
                            <Ionicons name="stats-chart-outline" size={24} color="#0056D2" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            {renderAverageRating()}
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
                    <TouchableOpacity
                        style={styles.packageButton}
                        onPress={() => setShowPackageModal(true)}
                    >
                        <Ionicons name="pricetag-outline" size={20} color="#64748B" />
                        {filters.packageId && (
                            <View style={styles.filterBadge} />
                        )}
                    </TouchableOpacity>
                    <View style={styles.searchInputContainer}>
                        <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by user name or email..."
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
                </View>
            </Animated.View>
            {loading && pageNumber === 1 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0056D2" />
                    <Text style={styles.loadingText}>Loading subscriptions...</Text>
                </View>
            ) : (
                <FlatList
                    data={displayedSubscriptions}
                    onEndReached={loadMoreSubscriptions}
                    onEndReachedThreshold={0.3}
                    keyExtractor={(item) => item._key}
                    renderItem={SubscriptionItem}
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
            {renderPackageModal()}
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
    ratingSection: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    ratingContainer: {
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
    ratingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    starContainer: {
        flexDirection: 'row',
        gap: 2,
    },
    ratingText: {
        fontSize: 16,
        color: '#1E293B',
        fontWeight: '500',
    },
    noRatingText: {
        fontSize: 16,
        color: '#64748B',
        fontStyle: 'italic',
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
        gap: 10,
    },
    packageButton: {
        padding: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    searchInputContainer: {
        flex: 1,
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
    addWorkoutPlanButton: {
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomSheetOverlay: {
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
    packageModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        width: '90%',
        maxHeight: '50%',
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
    packageOption: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    packageOptionText: {
        fontSize: 16,
        color: '#1E293B',
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
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CBD5E1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 10,
    },
});

export default TrainerSubscriptionManagement;