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

const TrainerServiceManagement = () => {
  const { user,loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [allPackages,setAllPackages] = useState([]);
  const [displayedPackages,setDisplayedPackages] = useState([]);
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
  const [selectedPackages,setSelectedPackages] = useState([]);
  const [showStartDatePicker,setShowStartDatePicker] = useState(false);
  const [showEndDatePicker,setShowEndDatePicker] = useState(false);
  const [showConfirmModal,setShowConfirmModal] = useState(false);
  const [confirmMessage,setConfirmMessage] = useState('');
  const [confirmAction,setConfirmAction] = useState(null);

  const [filters,setFilters] = useState({
    minPrice: '',
    maxPrice: '',
    minDays: '',
    maxDays: '',
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
    filters.minPrice,
    filters.maxPrice,
    filters.minDays,
    filters.maxDays,
    filters.status,
    filters.startDate,
    filters.endDate,
  ]);

  useEffect(() => {
    if (authLoading) return;
    fetchAllPackages();
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
    if (
      filtersToValidate.minPrice &&
      filtersToValidate.maxPrice &&
      parseFloat(filtersToValidate.minPrice) > parseFloat(filtersToValidate.maxPrice)
    ) {
      errors.priceRange = 'Minimum price cannot exceed maximum price';
    }
    if (
      filtersToValidate.minDays &&
      filtersToValidate.maxDays &&
      parseInt(filtersToValidate.minDays) > parseInt(filtersToValidate.maxDays)
    ) {
      errors.daysRange = 'Minimum days cannot exceed maximum days';
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

  const fetchAllPackages = async () => {
    try {
      setLoading(true);
      const params = {
        PageNumber: pageNumber,
        PageSize: pageSize,
        TrainerId: user.userId,
        Status: activeTab === 'all' ? undefined : activeTab,
        MinPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
        MaxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
        MinDays: filters.minDays ? parseInt(filters.minDays) : undefined,
        MaxDays: filters.maxDays ? parseInt(filters.maxDays) : undefined,
        StartDate: filters.startDate ? filters.startDate.toISOString() : undefined,
        EndDate: filters.endDate ? filters.endDate.toISOString() : undefined,
        SearchTerm: searchTerm || undefined,
      };
      console.log('Fetching packages with params:',params);
      const response = await trainerService.getServicePackageByTrainerId(user.userId,params);
      let packages = [];
      if (response.statusCode === 200 && Array.isArray(response.data?.packages)) {
        packages = response.data.packages.filter((pkg) => pkg.trainerId === user.userId || pkg.trainerId === 0);
        setAllPackages((prev) => (pageNumber === 1 ? packages : [...prev,...packages]));
        setDisplayedPackages((prev) => (pageNumber === 1 ? packages : [...prev,...packages]));
        setTotalItems(response.data.totalCount || packages.length);
        setTotalPages(response.data.totalPages || Math.ceil(packages.length / pageSize));
        setHasMore(pageNumber < (response.data.totalPages || Math.ceil(packages.length / pageSize)));
      } else {
        setAllPackages([]);
        setDisplayedPackages([]);
        setTotalItems(0);
        setTotalPages(1);
        setHasMore(false);
      }
    } catch (error) {
      showErrorFetchAPI(error);
      setAllPackages([]);
      setDisplayedPackages([]);
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
    fetchAllPackages();
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    setPageNumber(1);
  };

  const loadMorePackages = () => {
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
      minPrice: '',
      maxPrice: '',
      minDays: '',
      maxDays: '',
      status: 'all',
      startDate: null,
      endDate: null,
    };
    setTempFilters(defaultFilters);
    setFilterErrors({});
  };

  const clearFilters = () => {
    const defaultFilters = {
      minPrice: '',
      maxPrice: '',
      minDays: '',
      maxDays: '',
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

  const handleToggleStatus = (packageId,currentStatus) => {
    console.log('handleToggleStatus called with packageId:',packageId,'currentStatus:',currentStatus);
    setConfirmMessage(`Are you sure you want to ${currentStatus === 'active' ? 'deactivate' : 'activate'} this package?`);
    setConfirmAction(() => async () => {
      try {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        const response = await trainerService.toggleServicePackageStatus(packageId,newStatus);
        if (response.statusCode === 200) {
          showSuccessMessage(`Package ${newStatus} successfully.`);
          setPageNumber(1);
          fetchAllPackages();
        } else {
          showErrorFetchAPI(new Error(response.message || 'Failed to toggle package status.'));
        }
      } catch (error) {
        showErrorFetchAPI(error);
      }
    });
    setShowConfirmModal(true);
    console.log('showConfirmModal set to true');
  };

  const handleToggleStatusMultiple = () => {
    if (selectedPackages.length === 0) {
      showErrorFetchAPI(new Error('Please select at least one package to toggle status.'));
      return;
    }
    console.log('handleToggleStatusMultiple called with selectedPackages:',selectedPackages);
    setConfirmMessage(`Are you sure you want to activate ${selectedPackages.length} package${selectedPackages.length > 1 ? 's' : ''}?`);
    setConfirmAction(() => async () => {
      try {
        setLoading(true);
        const response = await Promise.all(
          selectedPackages.map((id) => trainerService.toggleServicePackageStatus(id,'active'))
        );
        const failed = response.filter((r) => r.statusCode !== 200);
        if (failed.length === 0) {
          showSuccessMessage(`${selectedPackages.length} packages activated successfully.`);
          setSelectedPackages([]);
          setPageNumber(1);
          fetchAllPackages();
        } else {
          showErrorFetchAPI(new Error('Some packages failed to update.'));
        }
      } catch (error) {
        showErrorFetchAPI(error);
      } finally {
        setLoading(false);
      }
    });
    setShowConfirmModal(true);
    console.log('showConfirmModal set to true for multiple toggle');
  };

  const togglePackageSelection = (packageId) => {
    setSelectedPackages((prev) =>
      prev.includes(packageId) ? prev.filter((id) => id !== packageId) : [...prev,packageId]
    );
  };

  const getPackageIcon = (packageName) => {
    if (!packageName) return 'fitness';
    const name = packageName.toLowerCase();
    if (name.includes('yoga') || name.includes('meditation')) return 'yoga';
    if (name.includes('diet') || name.includes('nutrition')) return 'nutrition';
    if (name.includes('cardio') || name.includes('running')) return 'cardio';
    return 'fitness';
  };

  const renderPackageIcon = (type) => {
    switch (type) {
      case 'yoga':
        return <MaterialCommunityIcons name="yoga" size={24} color="#22C55E" />;
      case 'nutrition':
        return <Ionicons name="nutrition" size={24} color="#F59E0B" />;
      case 'cardio':
        return <Ionicons name="heart" size={24} color="#EF4444" />;
      default:
        return <MaterialCommunityIcons name="weight-lifter" size={24} color="#0056D2" />;
    }
  };

  const PackageItem = ({ item }) => {
    const packageType = getPackageIcon(item.packageName);
    const statusInfo = item.status === 'active' ? { color: '#22C55E',bgColor: '#DCFCE7',text: 'Active' } : { color: '#EF4444',bgColor: '#FEE2E2',text: 'Inactive' };

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
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('TrainerPackageDetailScreen',{ packageId: item.packageId })}
        >
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarContainer}>
                  {item.trainerAvatar ? (
                    <Image source={{ uri: item.trainerAvatar }} style={styles.groupAvatar} />
                  ) : (
                    <View style={styles.iconContainer}>{renderPackageIcon(packageType)}</View>
                  )}
                </View>
                <View style={styles.groupDetails}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {item.packageName || 'Service Package'}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.memberStat}>
                      <Ionicons name="pricetag" size={14} color="#22C55E" />
                      <Text style={styles.memberCount}>
                        {item.price ? `$${item.price.toLocaleString()}` : 'Contact'}
                      </Text>
                    </View>
                    <View style={styles.statusIndicator}>
                      <View style={[styles.statusDot,{ backgroundColor: statusInfo.color }]} />
                      <Text style={[styles.statusText,{ color: statusInfo.color }]}>
                        {statusInfo.text}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={[styles.joinBtn,{ backgroundColor: item.status === 'active' ? '#EF4444' : '#22C55E' }]}
                  onPress={() => handleToggleStatus(item.packageId,item.status)}
                >
                  <Ionicons
                    name={item.status === 'active' ? 'close' : 'checkmark'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.joinBtnText}>
                    {item.status === 'active' ? 'Deactivate' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionText} numberOfLines={2}>
                {item.description ? item.description.replace(/<[^>]+>/g,'') : 'No description available'}
              </Text>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.categoryBadge}>
                <Ionicons name="calendar" size={12} color="#FFFFFF" />
                <Text style={styles.categoryText}>{item.durationDays || 'N/A'} days</Text>
              </View>
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => navigation.navigate('EditServicePackage',{ packageId: item.packageId })}
                >
                  <Ionicons name="pencil" size={16} color="#0056D2" />
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCreatePackageHeader = () => (
    <Animated.View
      style={[
        styles.createGroupSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.createGroupCard}>
        <View style={styles.createGroupContent}>
          <View style={styles.createGroupLeft}>
            <View style={styles.createGroupIcon}>
              <Ionicons name="add-circle" size={32} color="#0056D2" />
            </View>
            <View style={styles.createGroupText}>
              <Text style={styles.createGroupTitle}>Create Package</Text>
              <Text style={styles.createGroupSubtitle}>Offer a new service package</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => navigation.navigate('CreateServicePackage')}
            activeOpacity={0.8}
          >
            <Text style={styles.createGroupButtonText}>Create</Text>
            <Ionicons name="arrow-forward" size={16} color="#0056D2" />
          </TouchableOpacity>
        </View>
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
        <MaterialCommunityIcons name="weight-lifter" size={80} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Service Packages Found</Text>
      <Text style={styles.emptyText}>
        {searchTerm || filters.status !== 'all' || filters.startDate || filters.endDate
          ? 'No packages match your current filters. Try adjusting your search criteria.'
          : 'Create a new service package to start offering your services!'}
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => {
          if (searchTerm || filters.status !== 'all' || filters.startDate || filters.endDate) {
            clearFilters();
          } else {
            navigation.navigate('CreateServicePackage');
          }
        }}
      >
        <Ionicons
          name={searchTerm || filters.status !== 'all' || filters.startDate || filters.endDate ? 'refresh' : 'add-circle'}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.emptyActionText}>
          {searchTerm || filters.status !== 'all' || filters.startDate || filters.endDate ? 'Clear Filters' : 'Create Package'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const formatDisplayDate = (date) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-US',{
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
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
        <Animated.View style={[styles.filterModalContent,{ transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Packages</Text>
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
              <Text style={styles.filterSectionTitle}>Price Range</Text>
              <View style={styles.dateRangeContainer}>
                <TextInput
                  style={[styles.dateButton,filterErrors.minPrice && styles.inputError]}
                  placeholder="Min Price"
                  value={tempFilters.minPrice}
                  onChangeText={(text) => setTempFilters({ ...tempFilters,minPrice: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.dateRangeSeparator}>to</Text>
                <TextInput
                  style={[styles.dateButton,filterErrors.maxPrice && styles.inputError]}
                  placeholder="Max Price"
                  value={tempFilters.maxPrice}
                  onChangeText={(text) => setTempFilters({ ...tempFilters,maxPrice: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {filterErrors.priceRange && <Text style={styles.errorText}>{filterErrors.priceRange}</Text>}
              {filterErrors.minPrice && <Text style={styles.errorText}>{filterErrors.minPrice}</Text>}
              {filterErrors.maxPrice && <Text style={styles.errorText}>{filterErrors.maxPrice}</Text>}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Duration (Days)</Text>
              <View style={styles.dateRangeContainer}>
                <TextInput
                  style={[styles.dateButton,filterErrors.minDays && styles.inputError]}
                  placeholder="Min Days"
                  value={tempFilters.minDays}
                  onChangeText={(text) => setTempFilters({ ...tempFilters,minDays: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.dateRangeSeparator}>to</Text>
                <TextInput
                  style={[styles.dateButton,filterErrors.maxDays && styles.inputError]}
                  placeholder="Max Days"
                  value={tempFilters.maxDays}
                  onChangeText={(text) => setTempFilters({ ...tempFilters,maxDays: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {filterErrors.daysRange && <Text style={styles.errorText}>{filterErrors.daysRange}</Text>}
              {filterErrors.minDays && <Text style={styles.errorText}>{filterErrors.minDays}</Text>}
              {filterErrors.maxDays && <Text style={styles.errorText}>{filterErrors.maxDays}</Text>}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.statusOptions}>
                {[
                  { key: 'all',label: 'All',icon: 'filter',color: '#0056D2' },
                  { key: 'active',label: 'Active',icon: 'checkmark-circle',color: '#22C55E' },
                  { key: 'inactive',label: 'Inactive',icon: 'close-circle',color: '#EF4444' },
                ].map((status) => (
                  <TouchableOpacity
                    key={status.key}
                    style={[
                      styles.statusOption,
                      tempFilters.status === status.key && styles.selectedStatusOption,
                    ]}
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
            <Text style={styles.headerTitle}>Service Packages</Text>
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options-outline" size={24} color="#0056D2" />
            {(searchTerm || filters.status !== 'all' || filters.startDate || filters.endDate) && (
              <View style={styles.filterBadge} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem,activeTab === 'all' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('all');
            setPageNumber(1);
            setSelectedPackages([]);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText,activeTab === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem,activeTab === 'active' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('active');
            setPageNumber(1);
            setSelectedPackages([]);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText,activeTab === 'active' && styles.tabTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem,activeTab === 'inactive' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('inactive');
            setPageNumber(1);
            setSelectedPackages([]);
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText,activeTab === 'inactive' && styles.tabTextActive]}>Inactive</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'inactive' && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionBarButton,selectedPackages.length === 0 && styles.disabledActionBarButton]}
            onPress={handleToggleStatusMultiple}
            disabled={selectedPackages.length === 0}
          >
            <Text style={styles.actionBarButtonText}>
              Activate Selected ({selectedPackages.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
            placeholder="Search service packages..."
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
          <Text style={styles.loadingText}>Loading packages...</Text>
        </View>
      ) : (
        <FlatList
          data={displayedPackages}
          onEndReached={loadMorePackages}
          onEndReachedThreshold={0.2}
          keyExtractor={(item) => item.packageId.toString()}
          renderItem={PackageItem}
          ListHeaderComponent={renderCreatePackageHeader}
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
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalContent}>
            <Text style={styles.confirmModalTitle}>Confirm Action</Text>
            <Text style={styles.confirmModalText}>{confirmMessage}</Text>
            <View style={styles.confirmModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={async () => {
                  await confirmAction();
                  setShowConfirmModal(false);
                }}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
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
  actionBar: {
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  actionBarButton: {
    backgroundColor: '#22C55E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledActionBarButton: {
    backgroundColor: '#CBD5E1',
  },
  actionBarButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
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
  createGroupSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  createGroupCard: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  createGroupContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  createGroupIcon: {
    marginRight: 15,
  },
  createGroupText: {
    flex: 1,
  },
  createGroupTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  createGroupSubtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  createGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  createGroupButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0056D2',
  },
  listContainer: {
    paddingBottom: 50,
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
  groupAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F1F5F9',
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
  headerRight: {
    marginLeft: 15,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  joinBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 15,
  },
  descriptionText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
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
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#0056D2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default TrainerServiceManagement;