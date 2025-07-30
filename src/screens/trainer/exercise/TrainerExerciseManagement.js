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
import { StatusBar } from 'expo-status-bar';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';
import Header from 'components/Header';

const { width } = Dimensions.get('window');

const TrainerExerciseManagement = () => {
  const { user,loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [allExercises,setAllExercises] = useState([]);
  const [displayedExercises,setDisplayedExercises] = useState([]);
  const [categories,setCategories] = useState([]);
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
  const [selectedExercises,setSelectedExercises] = useState([]);
  const [showStartDatePicker,setShowStartDatePicker] = useState(false);
  const [showEndDatePicker,setShowEndDatePicker] = useState(false);
  const [showConfirmModal,setShowConfirmModal] = useState(false);
  const [confirmMessage,setConfirmMessage] = useState('');
  const [confirmAction,setConfirmAction] = useState(null);

  const [filters,setFilters] = useState({
    minCalories: '',
    maxCalories: '',
    isPrivate: 'all',
    category: 'all',
    startDate: null,
    endDate: null,
  });

  const [tempFilters,setTempFilters] = useState(filters);
  const [filterErrors,setFilterErrors] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  const memoizedFilters = useMemo(() => filters,[
    filters.minCalories,
    filters.maxCalories,
    filters.isPrivate,
    filters.category,
    filters.startDate,
    filters.endDate,
  ]);

  useEffect(() => {
    if (authLoading) return;
    fetchCategories();
    fetchAllExercises();
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
    if (filtersToValidate.minCalories && isNaN(parseFloat(filtersToValidate.minCalories))) {
      errors.minCalories = 'Minimum calories must be a valid number';
    }
    if (filtersToValidate.maxCalories && isNaN(parseFloat(filtersToValidate.maxCalories))) {
      errors.maxCalories = 'Maximum calories must be a valid number';
    }
    if (
      filtersToValidate.minCalories &&
      filtersToValidate.maxCalories &&
      parseFloat(filtersToValidate.minCalories) > parseFloat(filtersToValidate.maxCalories)
    ) {
      errors.caloriesRange = 'Minimum calories cannot exceed maximum calories';
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

  const fetchCategories = async () => {
    try {
      const response = await trainerService.getExerciseCategory();
      if (response.statusCode === 200 && Array.isArray(response.data?.categories)) {
        setCategories(response.data.categories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      showErrorFetchAPI(error);
      setCategories([]);
    }
  };

  const fetchAllExercises = async () => {
    try {
      setLoading(true);
      const params = {
        PageNumber: pageNumber,
        PageSize: pageSize,
        ValidPageSize: 10,
        SearchTerm: searchTerm || undefined,
        Status: activeTab === 'all' ? undefined : activeTab === 'public' ? "public" : "private",
        Category: filters.category === 'all' ? undefined : filters.category,
        StartDate: filters.startDate ? filters.startDate.toISOString() : undefined,
        EndDate: filters.endDate ? filters.endDate.toISOString() : undefined,
        MinCaloriesBurnedPerMin: filters.minCalories ? parseFloat(filters.minCalories) : undefined,
        MaxCaloriesBurnedPerMin: filters.maxCalories ? parseFloat(filters.maxCalories) : undefined,
      };
      const response = await trainerService.getExerciseByTrainerId(params);
      let exercises = [];
      if (response.statusCode === 200 && Array.isArray(response.data?.exercises)) {
        exercises = response.data.exercises.filter((ex) => ex.trainerId === user.userId || ex.trainerId === null);
        setAllExercises((prev) => (pageNumber === 1 ? exercises : [...prev,...exercises]));
        setDisplayedExercises((prev) => (pageNumber === 1 ? exercises : [...prev,...exercises]));
        setTotalItems(response.data.totalCount || exercises.length);
        setTotalPages(response.data.totalPages || Math.ceil(exercises.length / pageSize));
        setHasMore(pageNumber < (response.data.totalPages || Math.ceil(exercises.length / pageSize)));
      } else {
        setAllExercises([]);
        setDisplayedExercises([]);
        setTotalItems(0);
        setTotalPages(1);
        setHasMore(false);
      }
    } catch (error) {
      showErrorFetchAPI(error);
      setAllExercises([]);
      setDisplayedExercises([]);
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
    fetchAllExercises();
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    setPageNumber(1);
  };

  const loadMoreExercises = () => {
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
      minCalories: '',
      maxCalories: '',
      isPrivate: 'all',
      category: 'all',
      startDate: null,
      endDate: null,
    };
    setTempFilters(defaultFilters);
    setFilterErrors({});
  };

  const clearFilters = () => {
    const defaultFilters = {
      minCalories: '',
      maxCalories: '',
      isPrivate: 'all',
      category: 'all',
      startDate: null,
      endDate: null,
    };
    setFilters(defaultFilters);
    setTempFilters(defaultFilters);
    setSearchTerm('');
    setPageNumber(1);
    setFilterErrors({});
  };

  const handleToggleStatus = (exercise,currentIsPrivate) => {
    setConfirmMessage(`Are you sure you want to make this exercise ${currentIsPrivate === 0 ? 'private' : 'public'}?`);
    setConfirmAction(() => async () => {
      try {
        const newIsPrivate = currentIsPrivate === 0 ? 1 : 0;
        exercise.isPrivate = newIsPrivate;
        console.log(exercise)
        const response = await trainerService.updateFitnessExercise(exercise.exerciseId,exercise);
        if (response.statusCode === 200) {
          showSuccessMessage(`Exercise made ${newIsPrivate === 0 ? 'public' : 'private'} successfully.`);
          setPageNumber(1);
          fetchAllExercises();
        } else {
          showErrorFetchAPI(new Error(response.message || 'Failed to toggle exercise privacy.'));
        }
      } catch (error) {
        showErrorFetchAPI(error);
      }
    });
    setShowConfirmModal(true);
  };

  const handleToggleStatusMultiple = () => {
    if (selectedExercises.length === 0) {
      showErrorFetchAPI(new Error('Please select at least one exercise to toggle privacy.'));
      return;
    }
    setConfirmMessage(`Are you sure you want to make ${selectedExercises.length} exercise${selectedExercises.length > 1 ? 's' : ''} public?`);
    setConfirmAction(() => async () => {
      try {
        setLoading(true);
        const response = await Promise.all(
          selectedExercises.map((id) => trainerService.toggleExerciseStatus(id,0))
        );
        const failed = response.filter((r) => r.statusCode !== 200);
        if (failed.length === 0) {
          showSuccessMessage(`${selectedExercises.length} exercises made public successfully.`);
          setSelectedExercises([]);
          setPageNumber(1);
          fetchAllExercises();
        } else {
          showErrorFetchAPI(new Error('Some exercises failed to update.'));
        }
      } catch (error) {
        showErrorFetchAPI(error);
      } finally {
        setLoading(false);
      }
    });
    setShowConfirmModal(true);
  };

  const toggleExerciseSelection = (exerciseId) => {
    setSelectedExercises((prev) =>
      prev.includes(exerciseId) ? prev.filter((id) => id !== exerciseId) : [...prev,exerciseId]
    );
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.categoryId === categoryId);
    return category ? category.categoryName : 'Unknown';
  };

  const getExerciseIcon = (exerciseName) => {
    if (!exerciseName) return 'fitness';
    const name = exerciseName.toLowerCase();
    if (name.includes('yoga') || name.includes('meditation')) return 'yoga';
    if (name.includes('diet') || name.includes('nutrition')) return 'nutrition';
    if (name.includes('cardio') || name.includes('running')) return 'cardio';
    return 'fitness';
  };

  const renderExerciseIcon = (type) => {
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

  const ExerciseItem = ({ item }) => {
    const exerciseType = getExerciseIcon(item.exerciseName);
    const privacyInfo = item.isPrivate === 0 ? { color: '#22C55E',bgColor: '#DCFCE7',text: 'Public' } : { color: '#EF4444',bgColor: '#FEE2E2',text: 'Private' };

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
          onPress={() => navigation.navigate('ExerciseDetailScreen',{ exerciseId: item.exerciseId })}
        >
          <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarContainer}>
                  {item.imageUrl ? (
                    <Image source={{ uri: item.imageUrl }} style={styles.groupAvatar} />
                  ) : (
                    <View style={styles.iconContainer}>{renderExerciseIcon(exerciseType)}</View>
                  )}
                </View>
                <View style={styles.groupDetails}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {item.exerciseName || 'Exercise'}
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.memberStat}>
                      <Ionicons name="flame" size={14} color="#22C55E" />
                      <Text style={styles.memberCount}>
                        {item.caloriesBurnedPerMin ? `${item.caloriesBurnedPerMin} cal/min` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.statusIndicator}>
                      <View style={[styles.statusDot,{ backgroundColor: privacyInfo.color }]} />
                      <Text style={[styles.statusText,{ color: privacyInfo.color }]}>
                        {privacyInfo.text}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={[styles.joinBtn,{ backgroundColor: item.isPrivate === 0 ? '#EF4444' : '#22C55E' }]}
                  onPress={() => handleToggleStatus(item,item.isPrivate)}
                >
                  <Ionicons
                    name={item.isPrivate === 0 ? 'lock-closed-outline' : 'globe-outline'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.joinBtnText}>
                    {item.isPrivate === 0 ? 'Make Private' : 'Make Public'}
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
                <Ionicons name="list-outline" size={12} color="#FFFFFF" />
                <Text style={styles.categoryText}>{getCategoryName(item.categoryId)}</Text>
              </View>
              <View style={styles.ownerActions}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => navigation.navigate('EditExerciseScreen',{ exerciseId: item.exerciseId })}
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

  const renderCreateExerciseHeader = () => (
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
              <Text style={styles.createGroupTitle}>Create Exercise</Text>
              <Text style={styles.createGroupSubtitle}>Add a new fitness exercise</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createGroupButton}
            onPress={() => navigation.navigate('CreateExerciseScreen')}
            activeOpacity={0.8}
            accessibilityLabel="Create New Exercise"
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
      <Text style={styles.emptyTitle}>No Exercises Found</Text>
      <Text style={styles.emptyText}>
        {searchTerm || filters.isPrivate !== 'all' || filters.category !== 'all' || filters.startDate || filters.endDate
          ? 'No exercises match your current filters. Try adjusting your search criteria.'
          : 'Create a new exercise to start offering your fitness content!'}
      </Text>
      <TouchableOpacity
        style={styles.emptyActionButton}
        onPress={() => {
          if (searchTerm || filters.isPrivate !== 'all' || filters.category !== 'all' || filters.startDate || filters.endDate) {
            clearFilters();
          } else {
            navigation.navigate('CreateExerciseScreen');
          }
        }}
        accessibilityLabel={searchTerm || filters.isPrivate !== 'all' || filters.category !== 'all' || filters.startDate || filters.endDate ? 'Clear Filters' : 'Create Exercise'}
      >
        <Ionicons
          name={searchTerm || filters.isPrivate !== 'all' || filters.category !== 'all' || filters.startDate || filters.endDate ? 'refresh' : 'add-circle'}
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.emptyActionText}>
          {searchTerm || filters.isPrivate !== 'all' || filters.category !== 'all' || filters.startDate || filters.endDate ? 'Clear Filters' : 'Create Exercise'}
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
            <Text style={styles.modalTitle}>Filter Exercises</Text>
            <TouchableOpacity
              onPress={() => {
                setShowFilterModal(false);
                setTempFilters(filters);
                setFilterErrors({});
              }}
              style={styles.modalCloseBtn}
              accessibilityLabel="Close Filter Modal"
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
              <Text style={styles.filterSectionTitle}>Calories Burned (per min)</Text>
              <View style={styles.dateRangeContainer}>
                <TextInput
                  style={[styles.dateButton,filterErrors.minCalories && styles.inputError]}
                  placeholder="Min Calories"
                  value={tempFilters.minCalories}
                  onChangeText={(text) => setTempFilters({ ...tempFilters,minCalories: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.dateRangeSeparator}>to</Text>
                <TextInput
                  style={[styles.dateButton,filterErrors.maxCalories && styles.inputError]}
                  placeholder="Max Calories"
                  value={tempFilters.maxCalories}
                  onChangeText={(text) => setTempFilters({ ...tempFilters,maxCalories: text })}
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {filterErrors.caloriesRange && <Text style={styles.errorText}>{filterErrors.caloriesRange}</Text>}
              {filterErrors.minCalories && <Text style={styles.errorText}>{filterErrors.minCalories}</Text>}
              {filterErrors.maxCalories && <Text style={styles.errorText}>{filterErrors.maxCalories}</Text>}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Category</Text>
              <View style={styles.statusOptions}>
                {[{ categoryId: 'all',categoryName: 'All' },...categories].map((category) => (
                  <TouchableOpacity
                    key={category.categoryId}
                    style={[
                      styles.statusOption,
                      tempFilters.category === category.categoryId && styles.selectedStatusOption,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters,category: category.categoryId })}
                  >
                    <Ionicons
                      name="list-outline"
                      size={18}
                      color={tempFilters.category === category.categoryId ? '#FFFFFF' : '#0056D2'}
                    />
                    <Text
                      style={[
                        styles.statusOptionText,
                        tempFilters.category === category.categoryId && styles.selectedStatusOptionText,
                      ]}
                    >
                      {category.categoryName}
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
            <TouchableOpacity style={styles.resetButton} onPress={resetTempFilters} accessibilityLabel="Reset Filters">
              <Ionicons name="refresh" size={16} color="#64748B" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyTempFilters} accessibilityLabel="Apply Filters">
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
                <TouchableOpacity onPress={() => setShowStartDatePicker(false)} accessibilityLabel="Close Date Picker">
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
                <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowStartDatePicker(false)} accessibilityLabel="Confirm Date">
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
                <TouchableOpacity onPress={() => setShowEndDatePicker(false)} accessibilityLabel="Close Date Picker">
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
                <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowEndDatePicker(false)} accessibilityLabel="Confirm Date">
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
      <Header
        title="Fitness Exercises"
        onBack={() => navigation.goBack()}
        backIconColor="#0056D2"
        rightActions={[
          {
            icon: "options-outline",
            onPress: () => setShowFilterModal(true),
            color: "#0056D2",
            accessibilityLabel: "Open Filters",
            showBadge: searchTerm || filters.isPrivate !== 'all' || filters.category !== 'all' || filters.startDate || filters.endDate,
          }
        ]}
      />

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem,activeTab === 'all' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('all');
            setPageNumber(1);
            setSelectedExercises([]);
          }}
          activeOpacity={0.8}
          accessibilityLabel="Show All Exercises"
        >
          <Text style={[styles.tabText,activeTab === 'all' && styles.tabTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem,activeTab === 'public' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('public');
            setPageNumber(1);
            setSelectedExercises([]);
          }}
          activeOpacity={0.8}
          accessibilityLabel="Show Public Exercises"
        >
          <Text style={[styles.tabText,activeTab === 'public' && styles.tabTextActive]}>Public</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem,activeTab === 'private' && styles.tabItemActive]}
          onPress={() => {
            setActiveTab('private');
            setPageNumber(1);
            setSelectedExercises([]);
          }}
          activeOpacity={0.8}
          accessibilityLabel="Show Private Exercises"
        >
          <Text style={[styles.tabText,activeTab === 'private' && styles.tabTextActive]}>Private</Text>
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
            placeholder="Search exercises..."
            value={searchTerm}
            onChangeText={handleSearch}
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search Exercises"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearch} accessibilityLabel="Clear Search">
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
      {loading && pageNumber === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0056D2" />
          <CommonSkeleton />
        </View>
      ) : (
        <FlatList
          data={displayedExercises}
          onEndReached={loadMoreExercises}
          onEndReachedThreshold={0.2}
          keyExtractor={(item) => item.exerciseId.toString()}
          renderItem={ExerciseItem}
          ListHeaderComponent={renderCreateExerciseHeader}
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
                accessibilityLabel="Cancel Action"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={async () => {
                  await confirmAction();
                  setShowConfirmModal(false);
                }}
                accessibilityLabel="Confirm Action"
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
    marginTop: 70
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

export default TrainerExerciseManagement;