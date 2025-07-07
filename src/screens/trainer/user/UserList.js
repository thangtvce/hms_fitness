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

const { width, height } = Dimensions.get('window');

const UserList = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [servicePackages, setServicePackages] = useState([]);
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
    packageId: '',
    sortBy: 'userFullName',
    sortDescending: false,
  });
  const [tempFilters, setTempFilters] = useState(filters);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('Trainer') && !user?.roles?.includes('Admin')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers or admins.');
      navigation.goBack();
      return;
    }
    fetchServicePackages();
    fetchUsers(pageNumber);
  }, [authLoading, user, pageNumber, pageSize, searchTerm, filters]);

  const fetchServicePackages = async () => {
    try {
      const response = await trainerService.getAllActiveServicePackage();
      if (response.statusCode === 200 && response.data?.packages) {
        setServicePackages(response.data.packages);
      } else {
        setServicePackages([]);
        console.warn('No active service packages found.');
      }
    } catch (error) {
      console.error('Fetch Packages Error:', error);
      setServicePackages([]);
      Alert.alert('Error', 'Failed to load service packages.');
    }
  };

  const fetchUsers = async (page = 1, refresh = false) => {
    try {
      setLoading(true);
      if (refresh) setRefreshing(true);
      
      const queryParams = {
        PageNumber: page,
        PageSize: pageSize,
        SearchTerm: searchTerm || undefined,
        Status: 'completed',
        ...(filters.packageId && !isNaN(parseInt(filters.packageId)) && { PackageId: parseInt(filters.packageId) }),
        SortBy: filters.sortBy,
        SortDescending: filters.sortDescending,
      };

      const response = await trainerService.getSubscriptionsByTrainerId(user.userId, queryParams);
      
      if (response.statusCode !== 200 || !Array.isArray(response.data?.subscriptions)) {
        throw new Error('Failed to fetch subscriptions');
      }

      // Map users with robust handling of subscriptions
      const userMap = new Map();
      response.data.subscriptions.forEach(sub => {
        if (sub.userId && sub.status?.toLowerCase() === 'completed') {
          if (!userMap.has(sub.userId)) {
            userMap.set(sub.userId, {
              userId: sub.userId,
              fullName: sub.userFullName || 'Unknown User',
              email: sub.userEmail || 'N/A',
              subscriptions: [],
            });
          }
          userMap.get(sub.userId).subscriptions.push({
            packageName: sub.packageName || 'Unknown Package',
            subscriptionStatus: sub.status || 'completed',
            subscriptionId: sub.subscriptionId,
            startDate: sub.startDate ? new Date(sub.startDate).toISOString() : null,
            endDate: sub.endDate ? new Date(sub.endDate).toISOString() : null,
            packageId: sub.packageId,
          });
        }
      });

      // Enhanced user mapping with package details
      const mappedUsersPromise = Promise.all(
        Array.from(userMap.values())
          .filter(user => user.subscriptions.length > 0)
          .map(async user => {
            const latestSubscription = user.subscriptions.reduce((latest, sub) => {
              if (!latest || (sub.startDate && new Date(sub.startDate) > new Date(latest.startDate))) {
                return sub;
              }
              return latest;
            }, user.subscriptions[0]);

            let subscriptionId = latestSubscription?.subscriptionId;
            const responseSubscription = await trainerService.getSubscriptions(subscriptionId);
            let packageName = responseSubscription?.packageName;
            let packageId = responseSubscription?.packageId;

            // Enhanced package ID retrieval
            if ((!packageId || packageId === null) && latestSubscription?.subscriptionId) {
              try {
                const subDetail = await trainerService.getSubscriptions(latestSubscription.subscriptionId);
                let foundSub = null;
                if (subDetail && subDetail.data && Array.isArray(subDetail.data.subscriptions)) {
                  foundSub = subDetail.data.subscriptions.find(s => s.subscriptionId === latestSubscription.subscriptionId);
                } else if (subDetail && subDetail.data && subDetail.data.subscriptionId === latestSubscription.subscriptionId) {
                  foundSub = subDetail.data;
                }
                if (foundSub && foundSub.packageId) {
                  packageId = foundSub.packageId;
                }
              } catch (e) {
                console.warn('Could not retrieve packageId');
              }
            }

            // Enhanced package name retrieval
            if ((!packageName || packageName === 'Unknown Package') && packageId) {
              try {
                const pkgResp = await trainerService.getServicePackageById(packageId);
                if (pkgResp.statusCode === 200 && pkgResp.data?.packageName) {
                  packageName = pkgResp.data.packageName;
                } else {
                  packageName = 'Unknown Package';
                }
              } catch (e) {
                packageName = 'Unknown Package';
              }
            }

            return {
              ...user,
              packageName: packageName || 'Unknown Package',
              subscriptionStatus: latestSubscription?.subscriptionStatus || 'completed',
              subscriptionId: latestSubscription?.subscriptionId,
              startDate: latestSubscription?.startDate,
              endDate: latestSubscription?.endDate,
            };
          })
      );

      const mappedUsers = await mappedUsersPromise;
      
      if (mappedUsers.length === 0) {
        console.warn('No users found! API subscriptions:', response.data.subscriptions);
      }

      setUsers(mappedUsers);
      setTotalPages(response.data.totalPages || 1);
      setTotalItems(mappedUsers.length);
      setHasMore(page < (response.data.totalPages || 1));
    } catch (error) {
      console.error('Fetch Users Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while loading users.');
      setUsers([]);
      setTotalPages(1);
      setTotalItems(0);
      setHasMore(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  const onRefresh = () => {
    setPageNumber(1);
    fetchUsers(1, true);
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
      packageId: '',
      sortBy: 'userFullName',
      sortDescending: false,
    };
    setTempFilters(defaultFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      packageId: '',
      sortBy: 'userFullName',
      sortDescending: false,
    };
    setFilters(defaultFilters);
    setTempFilters(defaultFilters);
    setSearchTerm('');
    setPageNumber(1);
  };

  const createWorkoutPlan = async (userId, subscriptionId) => {
    navigation.navigate('CreateWorkoutPlan', { userId, subscriptionId });
  };

  const renderUser = ({ item, index }) => (
    <Animated.View
      style={[
        styles.userItem,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.userCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('UserDetails', { userId: item.userId })}
      >
        <LinearGradient 
          colors={['#FFFFFF', '#F8FAFC']} 
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Enhanced Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#667EEA', '#764BA2']}
                style={styles.avatarGradient}
              >
                <Text style={styles.avatarText}>
                  {item.fullName.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.fullName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Active</Text>
            </View>
          </View>

          {/* Enhanced Card Content */}
          <View style={styles.cardContent}>
            <View style={styles.packageInfo}>
              <View style={styles.packageIconContainer}>
                <Ionicons name="cube-outline" size={16} color="#6366F1" />
              </View>
              <Text style={styles.packageName} numberOfLines={1}>
                {item.packageName}
              </Text>
            </View>

            <View style={styles.dateRange}>
              <View style={styles.dateItem}>
                <Ionicons name="play-circle-outline" size={14} color="#10B981" />
                <Text style={styles.dateText}>
                  {formatDate(item.startDate)}
                </Text>
              </View>
              <View style={styles.dateSeparator} />
              <View style={styles.dateItem}>
                <Ionicons name="stop-circle-outline" size={14} color="#EF4444" />
                <Text style={styles.dateText}>
                  {formatDate(item.endDate)}
                </Text>
              </View>
            </View>

            {/* Enhanced Action Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => createWorkoutPlan(item.userId, item.subscriptionId)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="fitness-outline" size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Create Workout Plan</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const packageOptions = servicePackages.length > 0
    ? [
        { label: 'All Packages', value: '' },
        ...servicePackages.map(pkg => ({ 
          label: pkg.packageName, 
          value: pkg.packageId.toString() 
        })),
      ]
    : [{ label: 'No Packages Available', value: '' }];

  const sortOptions = [
    { label: 'User Name', value: 'userFullName', icon: 'person-outline' },
    { label: 'Package Name', value: 'packageName', icon: 'cube-outline' },
    { label: 'Start Date', value: 'startDate', icon: 'calendar-outline' },
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
        <Animated.View 
          style={[
            styles.filterModalContent,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.modalHandle} />
          
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter & Sort</Text>
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

          <ScrollView 
            style={styles.filterScrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {/* Service Package Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Service Package</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScrollContent}
              >
                {packageOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterChip,
                      tempFilters.packageId === option.value && styles.selectedFilterChip,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, packageId: option.value })}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        tempFilters.packageId === option.value && styles.selectedFilterChipText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortGrid}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortCard,
                      tempFilters.sortBy === option.value && styles.selectedSortCard,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, sortBy: option.value })}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={tempFilters.sortBy === option.value ? '#FFFFFF' : '#6366F1'}
                    />
                    <Text
                      style={[
                        styles.sortCardText,
                        tempFilters.sortBy === option.value && styles.selectedSortCardText,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Direction */}
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
                    size={18}
                    color={!tempFilters.sortDescending ? '#FFFFFF' : '#6366F1'}
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
                    size={18}
                    color={tempFilters.sortDescending ? '#FFFFFF' : '#6366F1'}
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

            {/* Page Size */}
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
                        styles.pageSizeNumber,
                        pageSize === option.value && styles.selectedPageSizeNumber,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[
                        styles.pageSizeLabel,
                        pageSize === option.value && styles.selectedPageSizeLabel,
                      ]}
                    >
                      Items
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Filter Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={styles.resetButton} 
              onPress={resetTempFilters}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.applyButton} 
              onPress={applyTempFilters}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.applyButtonGradient}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="people-outline" size={80} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Students Found</Text>
      <Text style={styles.emptyText}>
        No students with completed subscriptions match your current search or filter criteria. 
        Try adjusting the filters or search terms.
      </Text>
      <TouchableOpacity style={styles.emptyActionButton} onPress={clearFilters}>
        <Text style={styles.emptyActionText}>Clear All Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <LinearGradient 
      colors={['#667EEA', '#764BA2']} 
      style={styles.header}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.headerContent}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Student Management</Text>
          <Text style={styles.headerSubtitle}>
            Manage students with completed subscriptions
          </Text>
        </View>
        <View style={styles.headerStats}>
          <Text style={styles.statsNumber}>{totalItems}</Text>
          <Text style={styles.statsLabel}>Students</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderSearchAndFilter = () => (
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
        <Ionicons name="search-outline" size={20} color="#6366F1" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students by name or email..."
          value={searchTerm}
          onChangeText={handleSearch}
          autoCapitalize="none"
          placeholderTextColor="#94A3B8"
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.searchActions}>
        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons name="options-outline" size={18} color="#FFFFFF" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
        
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            Page {pageNumber} of {totalPages}
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderPagination = () => {
    if (totalItems === 0) return null;
    
    return (
      <Animated.View 
        style={[
          styles.paginationContainer,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.paginationButton,
            pageNumber <= 1 || loading ? styles.disabledPaginationButton : null
          ]}
          onPress={handlePreviousPage}
          disabled={pageNumber <= 1 || loading}
        >
          <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        <View style={styles.pageInfoContainer}>
          <Text style={styles.pageInfo}>
            {pageNumber} / {totalPages}
          </Text>
          <Text style={styles.pageSubInfo}>
            {totalItems} total students
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.paginationButton,
            pageNumber >= totalPages || loading ? styles.disabledPaginationButton : null
          ]}
          onPress={handleNextPage}
          disabled={pageNumber >= totalPages || loading}
        >
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#667EEA" />
      
      {renderHeader()}
      {renderSearchAndFilter()}

      {loading && pageNumber === 1 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loaderText}>Loading students...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => (item.userId ? item.userId.toString() : Math.random().toString())}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading && pageNumber > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.footerLoaderText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}

      {renderPagination()}
      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  headerStats: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  statsNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },

  // Search Container Styles
  searchContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 16,
  },
  clearSearchButton: {
    padding: 4,
  },
  searchActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsInfo: {
    alignItems: 'flex-end',
  },
  resultsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // List Content Styles
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },
  userItem: {
    marginBottom: 16,
  },
  userCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 20,
  },

  // Enhanced Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },

  // Enhanced Card Content
  cardContent: {
    gap: 12,
  },
  packageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  packageIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 6,
  },
  dateSeparator: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },

  // Enhanced Action Button
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Loading States
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderText: {
    fontSize: 16,
    color: '#6366F1',
    marginTop: 16,
    fontWeight: '500',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerLoaderText: {
    fontSize: 14,
    color: '#6366F1',
    marginLeft: 8,
    fontWeight: '500',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyActionText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Pagination Styles
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  paginationButton: {
    backgroundColor: '#6366F1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledPaginationButton: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  pageInfoContainer: {
    alignItems: 'center',
  },
  pageInfo: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '700',
  },
  pageSubInfo: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#FFFFFF',
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  filterScrollView: {
    flex: 1,
  },
  filterScrollContent: {
    padding: 20,
  },

  // Filter Section Styles
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },

  // Filter Chips (Horizontal Scroll)
  horizontalScrollContent: {
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedFilterChip: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  selectedFilterChipText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Sort Grid
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sortCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedSortCard: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  sortCardText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  selectedSortCardText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Sort Direction
  sortDirectionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sortDirectionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedSortDirection: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  sortDirectionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
  },
  selectedSortDirectionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Page Size Grid
  pageSizeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  pageSizeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedPageSizeCard: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  pageSizeNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  selectedPageSizeNumber: {
    color: '#FFFFFF',
  },
  pageSizeLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  selectedPageSizeLabel: {
    color: 'rgba(255,255,255,0.8)',
  },

  // Filter Actions
  filterActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  applyButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  applyButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default UserList;