import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { useNavigation } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const TrainerPaymentHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    status: '',
    sortBy: 'paymentDate',
    sortDescending: true,
  });

  const [tempFilters, setTempFilters] = useState(filters);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
  Alert.alert('Access Denied', 'This page is only accessible to trainers.');
  navigation.goBack();
  return;
}
    clearFilters();
  }, [authLoading, user]);

  useEffect(() => {
    if (authLoading || !user?.userId) return;
    fetchPayments(pageNumber);
  }, [pageNumber, pageSize, searchTerm, filters, authLoading, user]);

 const fetchPayments = async (page = 1, refresh = false) => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    console.log('JWT Token:', token);
    setLoading(true);
    if (refresh) setRefreshing(true);

    const queryParams = {
      PageNumber: page,
      PageSize: pageSize,
      SearchTerm: searchTerm || undefined,
      StartDate: filters.startDate || undefined,
      EndDate: filters.endDate || undefined,
      MinAmount: filters.minAmount || undefined,
      MaxAmount: filters.maxAmount || undefined,
      Status: filters.status || undefined,
      SortBy: filters.sortBy,
      SortDescending: filters.sortDescending,
    };

    const response = await trainerService.getSubscriptionsByTrainerId(user.userId, queryParams);
    console.log('API Response:', JSON.stringify(response, null, 2));

    if (response.statusCode === 200 && Array.isArray(response.data?.subscriptions)) {
      // Map subscription data to match the expected payment structure
      const mappedPayments = response.data.subscriptions.map(subscription => ({
        paymentId: subscription.subscriptionId.toString(), // Use subscriptionId as paymentId
        userFullName: subscription.userFullName || 'Unknown User',
        packageName: subscription.packageName || 'Unknown Package',
        amount: subscription.packagePrice || 0, // Use packagePrice as amount
        paymentDate: subscription.startDate || new Date().toISOString(), // Use startDate as paymentDate
        transactionReference: 'N/A', // No transactionReference in API, so default to 'N/A'
        status: subscription.status || 'Unknown',
      }));

      setPayments(mappedPayments);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(response.data.totalCount || mappedPayments.length);
      setHasMore(page < (response.data.totalPages || 1));
    } else {
      Alert.alert('Notice', response.message || 'No payment history available.');
      setPayments([]);
      setTotalPages(1);
      setTotalItems(0);
      setHasMore(false);
    }
  } catch (error) {
    console.error('Fetch Error:', error);
    const errorMessage = error.message || error.data?.message || 'An error occurred while loading payment history.';
    Alert.alert('Error', errorMessage);
    setPayments([]);
    setTotalPages(1);
    setTotalItems(0);
    setHasMore(false);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
  const onRefresh = () => {
    setPageNumber(1);
    fetchPayments(1, true);
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    setPageNumber(1);
  };

  const handleNextPage = () => {
    if (hasMore && !loading) {
      setPageNumber(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (pageNumber > 1 && !loading) {
      setPageNumber(prev => prev - 1);
    }
  };

  const applyTempFilters = () => {
    setFilters(tempFilters);
    setPageNumber(1);
    setShowFilterModal(false);
  };

  const resetTempFilters = () => {
    const defaultFilters = {
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      status: '',
      sortBy: 'paymentDate',
      sortDescending: true,
    };
    setTempFilters(defaultFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      status: '',
      sortBy: 'paymentDate',
      sortDescending: true,
    };
    setFilters(defaultFilters);
    setTempFilters(defaultFilters);
    setSearchTerm('');
    setPageNumber(1);
    console.log('Filters Cleared:', defaultFilters);
  };

  const getPaymentIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Ionicons name="checkmark-circle" size={24} color="#10B981" />;
      case 'pending':
        return <Ionicons name="hourglass" size={24} color="#F59E0B" />;
      case 'canceled':
        return <Ionicons name="close-circle" size={24} color="#EF4444" />;
      default:
        return <Ionicons name="wallet" size={24} color="#4F46E5" />;
    }
  };

  const renderPayment = ({ item }) => {
    console.log('Payment Item:', item);
    return (
      <Animated.View
        style={[
          styles.paymentItem,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 30],
                  outputRange: [0, 30],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.paymentCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('PaymentDetails', { paymentId: item.paymentId })}
        >
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>{getPaymentIcon(item.status)}</View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.paymentUser}>{item.userFullName}</Text>
                <Text style={styles.paymentPackage}>{item.packageName}</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.paymentDetailsContainer}>
                <View style={styles.paymentDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="pricetag-outline" size={14} color="#4F46E5" />
                  </View>
                  <Text style={styles.paymentDetailText}>${item.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.paymentDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="calendar-outline" size={14} color="#10B981" />
                  </View>
                  <Text style={styles.paymentDetailText}>
                    {new Date(item.paymentDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.paymentDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="receipt-outline" size={14} color="#EF4444" />
                  </View>
                  <Text style={styles.paymentDetailText}>{item.transactionReference}</Text>
                </View>
              </View>
              <View style={styles.paymentStatus}>
                <Text
                  style={[
                    styles.paymentStatusText,
                    item.status?.toLowerCase() === 'paid' && styles.paidStatus,
                    item.status?.toLowerCase() === 'pending' && styles.pendingStatus,
                    item.status?.toLowerCase() === 'canceled' && styles.canceledStatus,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Paid', value: 'paid' },
    { label: 'Pending', value: 'pending' },
    { label: 'Canceled', value: 'canceled' },
  ];

  const sortOptions = [
    { label: 'Payment Date', value: 'paymentDate', icon: 'calendar-outline' },
    { label: 'Amount', value: 'amount', icon: 'pricetag-outline' },
    { label: 'User Name', value: 'userFullName', icon: 'person-outline' },
    { label: 'Package Name', value: 'packageName', icon: 'briefcase-outline' },
  ];

  const pageSizeOptions = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
  ];

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setShowFilterModal(false);
        setTempFilters(filters);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.dragHandle} />
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter & Sort Payments</Text>
            <TouchableOpacity
              onPress={() => {
                setShowFilterModal(false);
                setTempFilters(filters);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Start Date (YYYY-MM-DD)"
                  value={tempFilters.startDate}
                  onChangeText={(text) => setTempFilters({ ...tempFilters, startDate: text })}
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.rangeSeparator}>to</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="End Date (YYYY-MM-DD)"
                  value={tempFilters.endDate}
                  onChangeText={(text) => setTempFilters({ ...tempFilters, endDate: text })}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Amount Range</Text>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Min Amount"
                  value={tempFilters.minAmount}
                  onChangeText={(text) => setTempFilters({ ...tempFilters, minAmount: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.rangeSeparator}>to</Text>
                <TextInput
                  style={styles.rangeInput}
                  placeholder="Max Amount"
                  value={tempFilters.maxAmount}
                  onChangeText={(text) => setTempFilters({ ...tempFilters, maxAmount: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Payment Status</Text>
              <View style={styles.sortOptionsGrid}>
                {statusOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOptionCard,
                      tempFilters.status === option.value && styles.selectedSortCard,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, status: option.value })}
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        tempFilters.status === option.value && styles.selectedSortText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortOptionsGrid}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOptionCard,
                      tempFilters.sortBy === option.value && styles.selectedSortCard,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, sortBy: option.value })}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={tempFilters.sortBy === option.value ? '#4F46E5' : '#64748B'}
                    />
                    <Text
                      style={[
                        styles.sortOptionText,
                        tempFilters.sortBy === option.value && styles.selectedSortText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort Order</Text>
              <View style={styles.sortDirectionContainer}>
                <TouchableOpacity
                  style={[
                    styles.sortDirectionButton,
                    !tempFilters.sortDescending && styles.selectedSortDirection,
                  ]}
                  onPress={() => setTempFilters({ ...tempFilters, sortDescending: false })}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={!tempFilters.sortDescending ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.sortDirectionText,
                      !tempFilters.sortDescending && styles.selectedSortDirectionText,
                    ]}
                  >
                    Ascending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortDirectionButton,
                    tempFilters.sortDescending && styles.selectedSortDirection,
                  ]}
                  onPress={() => setTempFilters({ ...tempFilters, sortDescending: true })}
                >
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={tempFilters.sortDescending ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.sortDirectionText,
                      tempFilters.sortDescending && styles.selectedSortDirectionText,
                    ]}
                  >
                    Descending
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Items per Page</Text>
              <View style={styles.pageSizeGrid}>
                {pageSizeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pageSizeCard,
                      pageSize === option.value && styles.selectedPageSizeCard,
                    ]}
                    onPress={() => setPageSize(option.value)}
                  >
                    <Text
                      style={[
                        styles.pageSizeCardText,
                        pageSize === option.value && styles.selectedPageSizeCardText,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.pageSizeCardLabel,
                        pageSize === option.value && styles.selectedPageSizeCardLabel,
                      ]}
                    >
                      Items
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={resetTempFilters}>
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFiltersButton} onPress={applyTempFilters}>
              <Text style={styles.applyFiltersText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="wallet-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Payments Found</Text>
      <Text style={styles.emptyText}>
        No payments match your current search and filter criteria. Try adjusting the filters.
      </Text>
      <TouchableOpacity style={styles.clearFilters} onPress={clearFilters}>
        <Text style={styles.clearFiltersText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Payment History</Text>
            <Text style={styles.headerSubtitle}>View payments for your packages</Text>
          </View>
          <View style={styles.headerActionButtonPlaceholder} />
        </View>
      </LinearGradient>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by user, package, or transaction..."
            value={searchTerm}
            onChangeText={handleSearch}
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />
          {searchTerm && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.searchActions}>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="filter-outline" size={20} color="#4F46E5" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {`${totalItems} payments found • Page ${pageNumber} of ${totalPages}`}
            </Text>
          </View>
        </View>
      </Animated.View>
      {loading && pageNumber === 1 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading payment history...</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.paymentId.toString()}
          renderItem={renderPayment}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading && pageNumber > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.footerLoaderText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}
      {totalItems > 0 && (
        <Animated.View style={[styles.paginationContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[styles.paginationButton, pageNumber <= 1 || loading ? styles.disabledButton : null]}
            onPress={handlePreviousPage}
            disabled={pageNumber <= 1 || loading}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.pageInfoContainer}>
            <Text style={styles.pageInfo}>Page {pageNumber} of ${totalPages}</Text>
          </View>
          <TouchableOpacity
            style={[styles.paginationButton, pageNumber >= totalPages || loading ? styles.disabledButton : null]}
            onPress={handleNextPage}
            disabled={pageNumber >= totalPages || loading}
          >
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.primaryColor },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', textAlign: 'center', marginTop: 2, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  headerActionButtonPlaceholder: { width: 40 },
  searchContainer: { backgroundColor: '#F8FAFC', marginTop: 15, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 24, paddingHorizontal: 16, paddingBottom: 16 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1E293B', paddingVertical: 16 },
  clearSearchButton: { padding: 4 },
  searchActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#4F46E5' },
  filterButtonText: { fontSize: 14, color: '#4F46E5', fontWeight: '500', marginLeft: 8 },
  resultsInfo: { alignItems: 'center' },
  resultsText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 100, backgroundColor: '#F8FAFC' },
  paymentItem: { marginBottom: 20 },
  paymentCard: { borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  cardGradient: { padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  cardTitleContainer: { flex: 1 },
  paymentUser: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  paymentPackage: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  cardContent: { marginTop: 8 },
  paymentDetailsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  paymentDetailItem: { flexDirection: 'row', alignItems: 'center' },
  detailIconContainer: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  paymentDetailText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  paymentStatus: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  paymentStatusText: { fontSize: 13, fontWeight: '600' },
  paidStatus: { color: '#10B981', backgroundColor: '#F0FDF4' },
  pendingStatus: { color: '#F59E0B', backgroundColor: '#FEFCE8' },
  canceledStatus: { color: '#EF4444', backgroundColor: '#FEF2F2' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F8FAFC' },
  loaderText: { fontSize: 16, color: '#4F46E5', marginTop: 16, fontWeight: '500' },
  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  footerLoaderText: { fontSize: 14, color: '#4F46E5', marginLeft: 8, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F8FAFC' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  clearFiltersButton: { backgroundColor: '#F1F5F9', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  clearFiltersText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },
  paginationContainer: { position: 'absolute', bottom: 20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  paginationButton: { backgroundColor: '#4F46E5', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  disabledButton: { backgroundColor: '#CBD5E1', shadowOpacity: 0, elevation: 0 },
  pageInfoContainer: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  pageInfo: { fontSize: 16, color: '#1E293B', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', alignItems: 'stretch' },
  filterModalContent: { backgroundColor: '#FFFFFF', height: '85%', minHeight: '50%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
  dragHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 8 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 10 },
  filterTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  closeButton: { padding: 4 },
  filterScrollView: { flex: 1, paddingHorizontal: 16 },
  filterSection: { marginVertical: 16 },
  filterSectionTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 12 },
  rangeInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rangeInput: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  rangeSeparator: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  sortOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sortOptionCard: { flex: 1, minWidth: '25%', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  selectedSortCard: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
  sortOptionText: { fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: 4 },
  selectedSortText: { color: '#4F46E5', fontWeight: '600' },
  sortDirectionContainer: { flexDirection: 'row', gap: 12 },
  sortDirectionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  selectedSortDirection: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  sortDirectionText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  selectedSortDirectionText: { color: '#FFFFFF', fontWeight: '600' },
  pageSizeGrid: { flexDirection: 'row', gap: 12 },
  pageSizeCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  selectedPageSizeCard: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  pageSizeCardText: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  selectedPageSizeCardText: { color: '#FFFFFF' },
  pageSizeCardLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  selectedPageSizeCardLabel: { color: 'rgba(255,255,255,0.8)' },
  filterActions: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 20, gap: 12 },
  clearFiltersButton: { flex: 1, backgroundColor: '#F1F5F9', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  clearFiltersText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },
  applyFiltersButton: { flex: 1, backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  applyFiltersText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});

export default TrainerPaymentHistory;