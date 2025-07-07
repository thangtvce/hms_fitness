import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { useNavigation } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BarChart, PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

const TrainerServiceManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [allPackages, setAllPackages] = useState([]);
  const [displayedPackages, setDisplayedPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [selectedPackages, setSelectedPackages] = useState([]);
  const [filterErrors, setFilterErrors] = useState({});

  const [filters, setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minDays: '',
    maxDays: '',
    status: 'all',
    sortBy: 'packageId',
    sortDescending: true,
    startDate: null,
    endDate: null,
  });

  const [tempFilters, setTempFilters] = useState(filters);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
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
    fetchAllPackages();
  }, [authLoading, user]);

  const validateFilters = (filtersToValidate) => {
    const errors = {};
    if (filtersToValidate.minPrice && isNaN(parseFloat(filtersToValidate.minPrice))) {
      errors.minPrice = 'Minimum price must be a valid number';
    }
    if (filtersToValidate.maxPrice && isNaN(parseFloat(filtersToValidate.maxPrice))) {
      errors.maxPrice = 'Maximum price must be a valid number';
    }
    if (filtersToValidate.minDays && isNaN(parseInt(filtersToValidate.minDays))) {
      errors.minDays = 'Minimum days must be a valid number';
    }
    if (filtersToValidate.maxDays && isNaN(parseInt(filtersToValidate.maxDays))) {
      errors.maxDays = 'Maximum days must be a valid number';
    }
    if (filtersToValidate.minPrice && filtersToValidate.maxPrice && 
        parseFloat(filtersToValidate.minPrice) > parseFloat(filtersToValidate.maxPrice)) {
      errors.priceRange = 'Minimum price cannot exceed maximum price';
    }
    if (filtersToValidate.minDays && filtersToValidate.maxDays && 
        parseInt(filtersToValidate.minDays) > parseInt(filtersToValidate.maxDays)) {
      errors.daysRange = 'Minimum days cannot exceed maximum days';
    }
    return errors;
  };

  const fetchAllPackages = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        PageNumber: 1,
        PageSize: 1000,
        TrainerId: user.userId,
      };

      const response = await trainerService.getServicePackageByTrainerId(user.userId, params);
      let packages = [];
      if (response.statusCode === 200 && Array.isArray(response.data?.packages)) {
        packages = response.data.packages.filter(
          pkg => pkg.trainerId === user.userId
        );
      }

      setAllPackages(packages);
      applyFrontendFilters(packages);
      setTotalItems(packages.length);
      setTotalPages(Math.ceil(packages.length / pageSize));
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while loading service packages.');
      setAllPackages([]);
      setDisplayedPackages([]);
    } finally {
      setLoading(false);
    }
  }, [user, pageSize]);

  const applyFrontendFilters = useCallback((packages) => {
    let filteredPackages = [...packages];

    if (searchTerm) {
      filteredPackages = filteredPackages.filter(pkg =>
        pkg.packageName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.minPrice) {
      filteredPackages = filteredPackages.filter(pkg => pkg.price >= parseFloat(filters.minPrice));
    }
    if (filters.maxPrice) {
      filteredPackages = filteredPackages.filter(pkg => pkg.price <= parseFloat(filters.maxPrice));
    }
    if (filters.minDays) {
      filteredPackages = filteredPackages.filter(pkg => pkg.durationDays >= parseInt(filters.minDays));
    }
    if (filters.maxDays) {
      filteredPackages = filteredPackages.filter(pkg => pkg.durationDays <= parseInt(filters.maxDays));
    }
    if (filters.status !== 'all') {
      filteredPackages = filteredPackages.filter(pkg => pkg.status === filters.status);
    }
    if (filters.startDate) {
      filteredPackages = filteredPackages.filter(
        pkg => new Date(pkg.createdAt) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filteredPackages = filteredPackages.filter(
        pkg => new Date(pkg.createdAt) <= new Date(filters.endDate)
      );
    }

    const sortByMapping = {
      packageId: 'packageId',
      price: 'price',
      days: 'durationDays',
      created: 'createdAt',
    };
    filteredPackages.sort((a, b) => {
      const key = sortByMapping[filters.sortBy] || 'packageId';
      const valueA = a[key] ?? '';
      const valueB = b[key] ?? '';
      if (valueA < valueB) return filters.sortDescending ? 1 : -1;
      if (valueA > valueB) return filters.sortDescending ? -1 : 1;
      return 0;
    });

    if (activeTab === 'active') {
      filteredPackages = filteredPackages.filter(pkg => pkg.status === 'active');
    } else if (activeTab === 'inactive') {
      filteredPackages = filteredPackages.filter(pkg => pkg.status === 'inactive');
    }

    const startIndex = (pageNumber - 1) * pageSize;
    const paginatedPackages = filteredPackages.slice(startIndex, startIndex + pageSize);

    setDisplayedPackages(paginatedPackages);
    setTotalItems(filteredPackages.length);
    setTotalPages(Math.ceil(filteredPackages.length / pageSize));
    setHasMore(pageNumber < Math.ceil(filteredPackages.length / pageSize));
  }, [searchTerm, filters, activeTab, pageNumber, pageSize]);

  useEffect(() => {
    applyFrontendFilters(allPackages);
  }, [allPackages, searchTerm, filters, activeTab, pageNumber, pageSize]);

  const fetchStatistics = useCallback(async () => {
    try {
      const params = {
        StartDate: filters.startDate ? filters.startDate.toISOString() : undefined,
        EndDate: filters.endDate ? filters.endDate.toISOString() : undefined,
        TrainerId: user.userId,
      };
      const response = await trainerService.getServicePackageStatistics(params);
      if (response.statusCode === 200) {
        setStatistics(response.data);
        setShowStatsModal(true);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch statistics.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An error occurred while fetching statistics.');
    }
  }, [filters.startDate, filters.endDate, user.userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPageNumber(1);
    fetchAllPackages().finally(() => setRefreshing(false));
  }, [fetchAllPackages]);

  const handleSearch = useCallback((text) => {
    setSearchTerm(text);
    setPageNumber(1);
  }, []);

  const handleNextPage = useCallback(() => {
    if (hasMore && !loading) {
      setPageNumber(prev => prev + 1);
    }
  }, [hasMore, loading]);

  const handlePreviousPage = useCallback(() => {
    if (pageNumber > 1 && !loading) {
      setPageNumber(prev => prev - 1);
    }
  }, [pageNumber, loading]);

  const applyTempFilters = useCallback(() => {
    const errors = validateFilters(tempFilters);
    if (Object.keys(errors).length > 0) {
      setFilterErrors(errors);
      Alert.alert('Invalid Filters', 'Please correct the filter inputs.');
      return;
    }
    if (tempFilters.startDate && tempFilters.endDate && tempFilters.startDate > tempFilters.endDate) {
      setFilterErrors({ dateRange: 'Start date must be earlier than or equal to end date.' });
      Alert.alert('Invalid Date Range', 'Start date must be earlier than or equal to end date.');
      return;
    }
    setFilters(tempFilters);
    setFilterErrors({});
    setPageNumber(1);
    setShowFilterModal(false);
  }, [tempFilters]);

  const resetTempFilters = useCallback(() => {
    setTempFilters({
      minPrice: '',
      maxPrice: '',
      minDays: '',
      maxDays: '',
      status: 'all',
      sortBy: 'packageId',
      sortDescending: true,
      startDate: null,
      endDate: null,
    });
    setFilterErrors({});
  }, []);

  const clearFilters = useCallback(() => {
    const defaultFilters = {
      minPrice: '',
      maxPrice: '',
      minDays: '',
      maxDays: '',
      status: 'all',
      sortBy: 'packageId',
      sortDescending: true,
      startDate: null,
      endDate: null,
    };
    setFilters(defaultFilters);
    setTempFilters(defaultFilters);
    setSearchTerm('');
    setPageNumber(1);
    setFilterErrors({});
  }, []);

  const handleToggleStatusMultiple = async () => {
    if (selectedPackages.length === 0) {
      Alert.alert('Notice', 'Please select at least one package to toggle status.');
      return;
    }
    try {
      setLoading(true);
      const response = await Promise.all(
        selectedPackages.map(id => 
          trainerService.toggleServicePackageStatus(id, 'active')
        )
      );
      const failed = response.filter(r => r.statusCode !== 200);
      if (failed.length === 0) {
        Alert.alert('Success', `${selectedPackages.length} packages activated successfully.`);
        setSelectedPackages([]);
        fetchAllPackages();
      } else {
        Alert.alert('Error', 'Some packages failed to update.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An error occurred while toggling package status.');
    } finally {
      setLoading(false);
    }
  };

  const togglePackageSelection = (packageId) => {
    setSelectedPackages((prev) =>
      prev.includes(packageId)
        ? prev.filter((id) => id !== packageId)
        : [...prev, packageId]
    );
  };

  const getPackageIcon = useCallback((packageName) => {
    if (!packageName) return 'fitness';
    const name = packageName.toLowerCase();
    if (name.includes('yoga') || name.includes('meditation')) return 'yoga';
    if (name.includes('diet') || name.includes('nutrition')) return 'nutrition';
    if (name.includes('cardio') || name.includes('running')) return 'cardio';
    return 'fitness';
  }, []);

  const renderPackageIcon = useCallback((type) => {
    switch (type) {
      case 'yoga':
        return <MaterialCommunityIcons name="yoga" size={24} color="#10B981" />;
      case 'nutrition':
        return <Ionicons name="nutrition" size={24} color="#F59E0B" />;
      case 'cardio':
        return <Ionicons name="heart" size={24} color="#EF4444" />;
      default:
        return <MaterialCommunityIcons name="weight-lifter" size={24} color="#4F46E5" />;
    }
  }, []);

  const PackageItem = useCallback(({ item }) => {
    const packageType = getPackageIcon(item.packageName);
    const statusColor = item.status === 'active' ? '#10B981' : '#EF4444';

    const handleToggleStatus = async () => {
      try {
        const newStatus = item.status === 'active' ? 'inactive' : 'active';
        const response = await trainerService.toggleServicePackageStatus(item.packageId, newStatus);
        if (response.statusCode === 200) {
          Alert.alert('Success', `Package ${newStatus} successfully.`);
          fetchAllPackages();
        } else {
          Alert.alert('Error', response.message || 'Failed to toggle package status.');
        }
      } catch (error) {
        Alert.alert('Error', error.message || 'An error occurred while toggling the package status.');
      }
    };

    return (
      <Animated.View style={[styles.packageItem, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={styles.packageCard}
          onPress={() => navigation.navigate('ServicePackageDetail', { packageId: item.packageId })}
          activeOpacity={0.8}
          accessibilityLabel={`View details of ${item.packageName}`}
        >
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
            {activeTab === 'inactive' && (
              <TouchableOpacity
                style={styles.selectionCheckbox}
                onPress={() => togglePackageSelection(item.packageId)}
                accessibilityLabel={`Select ${item.packageName}`}
              >
                <Ionicons
                  name={selectedPackages.includes(item.packageId) ? 'checkbox' : 'square-outline'}
                  size={20}
                  color="#4F46E5"
                />
              </TouchableOpacity>
            )}
            <View style={styles.cardHeader}>
              {item.trainerAvatar ? (
                <Image
                  source={{ uri: item.trainerAvatar }}
                  style={styles.trainerAvatar}
                  accessibilityLabel="Trainer avatar"
                />
              ) : (
                <View style={styles.iconContainer}>{renderPackageIcon(packageType)}</View>
              )}
              <View style={styles.cardTitleContainer}>
                <Text style={styles.packageName}>{item.packageName || 'Service Package'}</Text>
                <Text style={styles.trainerName}>by You</Text>
                <Text style={styles.trainerEmail}>{item.trainerEmail || 'N/A'}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('EditServicePackage', { packageId: item.packageId })}
                disabled={loading}
                accessibilityLabel={`Edit ${item.packageName}`}
              >
                <Ionicons name="pencil" size={18} color="#4F46E5" />
              </TouchableOpacity>
              
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.packageDescription} numberOfLines={2}>
                {item.description ? item.description.replace(/<[^>]+>/g, '') : 'No description available'}
              </Text>
              <View style={styles.packageDetailsContainer}>
                <View style={styles.packageDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="pricetag-outline" size={14} color="#4F46E5" />
                  </View>
                  <Text style={styles.packageDetailText}>
                    {item.price ? `$${item.price.toLocaleString()}` : 'Contact'}
                  </Text>
                </View>
                <View style={styles.packageDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="calendar-outline" size={14} color="#10B981" />
                  </View>
                  <Text style={styles.packageDetailText}>{item.durationDays || 'N/A'} days</Text>
                </View>
                <View style={styles.packageDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#FFF7ED' }]}>
                    <Ionicons name="people-outline" size={14} color="#F59E0B" />
                  </View>
                  <Text style={styles.packageDetailText}>
                    {item.SubscriptionCount || 0} subscribers
                  </Text>
                </View>
              </View>
              <View style={styles.dateContainer}>
                <Text style={styles.dateText}>
                  Created: {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <Text style={styles.dateText}>
                  Updated: {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }, [fadeAnim, slideAnim, loading, navigation, getPackageIcon, renderPackageIcon, activeTab, selectedPackages]);

  const sortOptions = useMemo(() => [
    { label: 'Package ID', value: 'packageId', icon: 'key-outline' },
    { label: 'Price', value: 'price', icon: 'pricetag-outline' },
    { label: 'Duration', value: 'days', icon: 'calendar-outline' },
    { label: 'Created Date', value: 'created', icon: 'time-outline' },
  ], []);

  const pageSizeOptions = useMemo(() => [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
  ], []);

  const statusOptions = useMemo(() => [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Inactive', value: 'inactive' },
  ], []);

  const FilterModal = useCallback(() => (
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
          <View style={styles.dragHandle} />
          <View style={styles.filterHeader}>
            <Text style={styles.filterTitle}>Filter & Sort</Text>
            <TouchableOpacity
              onPress={() => {
                setShowFilterModal(false);
                setTempFilters(filters);
                setFilterErrors({});
              }}
              style={styles.closeButton}
              accessibilityLabel="Close filter modal"
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  style={[styles.rangeInput, filterErrors.minPrice && styles.inputError]}
                  placeholder="Min Price"
                  value={tempFilters.minPrice}
                  onChangeText={(text) => setTempFilters({ ...tempFilters, minPrice: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  accessibilityLabel="Minimum price"
                />
                <Text style={styles.rangeSeparator}>to</Text>
                <TextInput
                  style={[styles.rangeInput, filterErrors.maxPrice && styles.inputError]}
                  placeholder="Max Price"
                  value={tempFilters.maxPrice}
                  onChangeText={(text) => setTempFilters({ ...tempFilters, maxPrice: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  accessibilityLabel="Maximum price"
                />
              </View>
              {filterErrors.priceRange && <Text style={styles.errorText}>{filterErrors.priceRange}</Text>}
              {filterErrors.minPrice && <Text style={styles.errorText}>{filterErrors.minPrice}</Text>}
              {filterErrors.maxPrice && <Text style={styles.errorText}>{filterErrors.maxPrice}</Text>}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Duration (Days)</Text>
              <View style={styles.rangeInputContainer}>
                <TextInput
                  style={[styles.rangeInput, filterErrors.minDays && styles.inputError]}
                  placeholder="Min Days"
                  value={tempFilters.minDays}
                  onChangeText={(text) => setTempFilters({ ...tempFilters, minDays: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  accessibilityLabel="Minimum duration"
                />
                <Text style={styles.rangeSeparator}>to</Text>
                <TextInput
                  style={[styles.rangeInput, filterErrors.maxDays && styles.inputError]}
                  placeholder="Max Days"
                  value={tempFilters.maxDays}
                  onChangeText={(text) => setTempFilters({ ...tempFilters, maxDays: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                  accessibilityLabel="Maximum duration"
                />
              </View>
              {filterErrors.daysRange && <Text style={styles.errorText}>{filterErrors.daysRange}</Text>}
              {filterErrors.minDays && <Text style={styles.errorText}>{filterErrors.minDays}</Text>}
              {filterErrors.maxDays && <Text style={styles.errorText}>{filterErrors.maxDays}</Text>}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Date Range</Text>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={tempFilters.startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) =>
                    setTempFilters({ ...tempFilters, startDate: date || null })
                  }
                  style={styles.datePicker}
                  accessibilityLabel="Start date"
                />
                <Text style={styles.rangeSeparator}>to</Text>
                <DateTimePicker
                  value={tempFilters.endDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) =>
                    setTempFilters({ ...tempFilters, endDate: date || null })
                  }
                  style={styles.datePicker}
                  accessibilityLabel="End date"
                />
              </View>
              {filterErrors.dateRange && <Text style={styles.errorText}>{filterErrors.dateRange}</Text>}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.pickerWrapper}>
                <Ionicons name="checkbox-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <Picker
                  selectedValue={tempFilters.status}
                  onValueChange={(value) => setTempFilters({ ...tempFilters, status: value })}
                  style={styles.picker}
                  dropdownIconColor="#64748B"
                  accessibilityLabel="Filter by status"
                >
                  {statusOptions.map((option) => (
                    <Picker.Item key={option.value} label={option.label} value={option.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.sortOptionsGrid}>
                {sortOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.sortOptionCard, tempFilters.sortBy === option.value && styles.selectedSortCard]}
                    onPress={() => setTempFilters({ ...tempFilters, sortBy: option.value })}
                    accessibilityLabel={`Sort by ${option.label}`}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={tempFilters.sortBy === option.value ? '#4F46E5' : '#64748B'}
                    />
                    <Text
                      style={[styles.sortOptionText, tempFilters.sortBy === option.value && styles.selectedSortText]}
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
                  style={[styles.sortDirectionButton, !tempFilters.sortDescending && styles.selectedSortDirection]}
                  onPress={() => setTempFilters({ ...tempFilters, sortDescending: false })}
                  accessibilityLabel="Sort ascending"
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={!tempFilters.sortDescending ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[styles.sortDirectionText, !tempFilters.sortDescending && styles.selectedSortDirectionText]}
                  >
                    Ascending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortDirectionButton, tempFilters.sortDescending && styles.selectedSortDirection]}
                  onPress={() => setTempFilters({ ...tempFilters, sortDescending: true })}
                  accessibilityLabel="Sort descending"
                >
                  <Ionicons
                    name="arrow-down"
                    size={20}
                    color={tempFilters.sortDescending ? '#FFFFFF' : '#64748B'}
                  />
                  <Text
                    style={[styles.sortDirectionText, tempFilters.sortDescending && styles.selectedSortDirectionText]}
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
                    style={[styles.pageSizeCard, pageSize === option.value && styles.selectedPageSizeCard]}
                    onPress={() => setPageSize(option.value)}
                    accessibilityLabel={`Set ${option.label} items per page`}
                  >
                    <Text
                      style={[styles.pageSizeCardText, pageSize === option.value && styles.selectedPageSizeCardText]}
                    >
                      {option.label}
                    </Text>
                    <Text
                      style={[styles.pageSizeCardLabel, pageSize === option.value && styles.selectedPageSizeCardLabel]}
                    >
                      items
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={resetTempFilters}
              accessibilityLabel="Clear all filters"
            >
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={applyTempFilters}
              accessibilityLabel="Apply filters"
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  ), [tempFilters, filters, sortOptions, pageSizeOptions, statusOptions, applyTempFilters, resetTempFilters, filterErrors]);

  const StatsModal = useCallback(() => {
    if (!statistics) {
      return (
        <Modal
          visible={showStatsModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowStatsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.statsModalContent}>
              <View style={styles.dragHandle} />
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Package Statistics</Text>
                <TouchableOpacity
                  onPress={() => setShowStatsModal(false)}
                  style={styles.closeButton}
                  accessibilityLabel="Close statistics modal"
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.statsScrollView}>
                <Text style={styles.statsEmpty}>No statistics available.</Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      );
    }

    const packageDistributionData = {
      labels: ['Total', 'Active', 'Inactive'],
      datasets: [
        {
          data: [
            statistics.totalPackages || 0,
            statistics.activePackages || 0,
            statistics.inactivePackages || 0,
          ],
        },
      ],
    };

    const pieChartData = [
      {
        name: 'Active',
        population: statistics.activePackages || 0,
        color: '#10B981',
        legendFontColor: '#1E293B',
        legendFontSize: 14,
      },
      {
        name: 'Inactive',
        population: statistics.inactivePackages || 0,
        color: '#EF4444',
        legendFontColor: '#1E293B',
        legendFontSize: 14,
      },
    ].filter(item => item.population > 0);

    const chartConfig = {
      backgroundColor: '#FFFFFF',
      backgroundGradientFrom: '#FFFFFF',
      backgroundGradientTo: '#FFFFFF',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(30, 41, 59, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#4F46E5',
      },
      propsForLabels: {
        fontSize: 12,
        fontWeight: '500',
      },
    };

    return (
      <Modal
        visible={showStatsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.statsModalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Package Statistics</Text>
              <TouchableOpacity
                onPress={() => setShowStatsModal(false)}
                style={styles.closeButton}
                accessibilityLabel="Close statistics modal"
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.statsScrollView}>
              {packageDistributionData.datasets[0].data.every(val => val === 0) ? (
                <Text style={styles.statsEmpty}>No statistics data available to display.</Text>
              ) : (
                <>
                  <View style={styles.statsSection}>
                    <Text style={styles.statsSectionTitle}>Package Distribution</Text>
                    {packageDistributionData.datasets[0].data.every(val => val === 0) ? (
                      <Text style={styles.statsEmpty}>No package data to display.</Text>
                    ) : (
                      <BarChart
                        data={packageDistributionData}
                        width={width - 80}
                        height={220}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={chartConfig}
                        style={styles.chart}
                        showValuesOnTopOfBars
                        withInnerLines={false}
                        accessibilityLabel="Bar chart showing package distribution"
                      />
                    )}
                  </View>
                  <View style={styles.statsSection}>
                    <Text style={styles.statsSectionTitle}>Package Proportion</Text>
                    {pieChartData.length === 0 ? (
                      <Text style={styles.statsEmpty}>No package data to display.</Text>
                    ) : (
                      <PieChart
                        data={pieChartData}
                        width={width - 80}
                        height={220}
                        chartConfig={chartConfig}
                        accessor="population"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                        style={styles.chart}
                        accessibilityLabel="Pie chart showing active vs inactive packages"
                      />
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }, [statistics]);

  const EmptyList = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="fitness-outline" size={64} color="#CBD5E1" accessibilityLabel="No packages icon" />
      <Text style={styles.emptyTitle}>No Service Packages Found</Text>
      <Text style={styles.emptyText}>
        No packages match your current search and filter criteria. Try adjusting the filters or create a new package.
      </Text>
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateServicePackage')}
        accessibilityLabel="Create new package"
      >
        <Text style={styles.createButtonText}>Create Package</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.clearFiltersButton}
        onPress={clearFilters}
        accessibilityLabel="Clear all filters"
      >
        <Text style={styles.clearFiltersText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  ), [clearFilters, navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Service Package</Text>
            <Text style={styles.headerSubtitle}>Manage your service packages</Text>
          </View>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('CreateServicePackage')}
            accessibilityLabel="Create new package"
          >
            <Ionicons name="add-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.activeTab]}
          onPress={() => {
            setActiveTab('active');
            setPageNumber(1);
            setSelectedPackages([]);
            fetchAllPackages();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'inactive' && styles.activeTab]}
          onPress={() => {
            setActiveTab('inactive');
            setPageNumber(1);
            setSelectedPackages([]);
            fetchAllPackages();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'inactive' && styles.activeTabText]}>Inactive</Text>
        </TouchableOpacity>
        {/* <TouchableOpacity
          style={styles.statsButton}
          onPress={fetchStatistics}
          accessibilityLabel="View package statistics"
        >
          <Ionicons name="stats-chart-outline" size={20} color="#4F46E5" />
          <Text style={styles.statsButtonText}>Stats</Text>
        </TouchableOpacity> */}
      </View>

      {activeTab === 'inactive' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionBarButton, selectedPackages.length === 0 && styles.disabledActionBarButton]}
            onPress={handleToggleStatusMultiple}
            disabled={loading || selectedPackages.length === 0}
            accessibilityLabel="Activate selected packages"
          >
            <Text style={styles.actionBarButtonText}>
              Activate Selected ({selectedPackages.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your packages..."
            value={searchTerm}
            onChangeText={handleSearch}
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search packages"
          />
          {searchTerm ? (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={styles.clearSearchButton}
              accessibilityLabel="Clear search"
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.searchActions}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            accessibilityLabel="Open filter modal"
          >
            <Ionicons name="options-outline" size={20} color="#4F46E5" />
            <Text style={styles.filterButtonText}>Filter</Text>
          </TouchableOpacity>
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {totalItems} packages found • Page {pageNumber} of {totalPages}
            </Text>
          </View>
        </View>
      </Animated.View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading your packages...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedPackages}
          keyExtractor={(item) => item.packageId.toString()}
          renderItem={PackageItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyList}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          windowSize={21}
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
            accessibilityLabel="Previous page"
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.pageInfoContainer}>
            <Text style={styles.pageInfo}>Page {pageNumber} of {totalPages}</Text>
          </View>
          <TouchableOpacity
            style={[styles.paginationButton, pageNumber >= totalPages || loading ? styles.disabledButton : null]}
            onPress={handleNextPage}
            disabled={pageNumber >= totalPages || loading}
            accessibilityLabel="Next page"
          >
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      <FilterModal />
      <StatsModal />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
 
   inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 12,
  }, safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4F46E5',
  },
  tabText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 8,
  },
  statsButtonText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    marginLeft: 8,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  actionBarButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  disabledActionBarButton: {
    backgroundColor: '#CBD5E1',
  },
  actionBarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 12,
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
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsInfo: {
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    backgroundColor: '#F8FAFC',
  },
  packageItem: {
    marginBottom: 16,
  },
  packageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    position: 'relative',
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  trainerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  trainerName: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  trainerEmail: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '400',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginLeft: 8,
  },
  cardContent: {
    marginTop: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  packageDetailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  packageDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  packageDetailText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dateText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  loaderText: {
    fontSize: 16,
    color: '#4F46E5',
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
    color: '#4F46E5',
    marginLeft: 8,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  createButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paginationButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  pageInfoContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  pageInfo: {
    fontSize: 16,
    color: '#1E293B',
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    minHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  statsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
    paddingHorizontal: 20,
  },
  statsScrollView: {
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  rangeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  datePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    justifyContent: 'space-between',
  },
  datePicker: {
    flex: 1,
  },
  rangeInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rangeSeparator: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  sortOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sortOptionCard: {
    flex: 1,
    minWidth: '25%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedSortCard: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 8,
  },
  selectedSortText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  selectedSortDirection: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  sortDirectionText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  selectedSortDirectionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pageSizeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  pageSizeCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedPageSizeCard: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  pageSizeCardText: {
    fontSize: 18,
    color: '#1E293B',
    fontWeight: '700',
  },
  selectedPageSizeCardText: {
    color: '#FFFFFF',
  },
  pageSizeCardLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  selectedPageSizeCardLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  filterActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyFiltersText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  picker: {
    flex: 1,
    height: 50,
    color: '#1E293B',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  statsSection: {
    marginVertical: 16,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  statsEmpty: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default TrainerServiceManagement;