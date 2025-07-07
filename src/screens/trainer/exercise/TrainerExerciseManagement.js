import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  StatusBar as RNStatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';

const { width, height } = Dimensions.get('window');

// Ultra Modern Color Palette
const COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#F1F5F9',
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F97316',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    white: '#FFFFFF',
    muted: '#64748B',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    card: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.6)',
  },
  border: '#E2E8F0',
  shadow: 'rgba(15, 23, 42, 0.08)',
  glassmorphism: 'rgba(255, 255, 255, 0.25)',
};

// Enhanced Exercise Icons with Modern Styling
const EXERCISE_ICONS = {
  yoga: { 
    component: MaterialCommunityIcons, 
    name: 'yoga', 
    color: COLORS.accent,
    gradient: ['#10B981', '#059669'],
    background: 'rgba(16, 185, 129, 0.1)'
  },
  cardio: { 
    component: Ionicons, 
    name: 'heart', 
    color: COLORS.danger,
    gradient: ['#EF4444', '#DC2626'],
    background: 'rgba(239, 68, 68, 0.1)'
  },
  dumbbell: { 
    component: MaterialCommunityIcons, 
    name: 'dumbbell', 
    color: COLORS.primary,
    gradient: ['#6366F1', '#4F46E5'],
    background: 'rgba(99, 102, 241, 0.1)'
  },
  fitness: { 
    component: MaterialCommunityIcons, 
    name: 'weight-lifter', 
    color: COLORS.purple,
    gradient: ['#8B5CF6', '#7C3AED'],
    background: 'rgba(139, 92, 246, 0.1)'
  },
};

// Modern Exercise Icon Component
const ExerciseIcon = React.memo(({ type, size = 28 }) => {
  const iconConfig = EXERCISE_ICONS[type] || EXERCISE_ICONS.fitness;
  const IconComponent = iconConfig.component;
  
  return (
    <View style={[styles.modernIconContainer, { backgroundColor: iconConfig.background }]}>
      <LinearGradient
        colors={iconConfig.gradient}
        style={styles.iconGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <IconComponent name={iconConfig.name} size={size} color={COLORS.text.white} />
      </LinearGradient>
    </View>
  );
});

// Modern Search Bar Component
const ModernSearchBar = React.memo(({ searchTerm, onSearch, onFilter, resultsCount, currentPage, totalPages }) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(focusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });

  return (
    <View style={styles.modernSearchContainer}>
      <Animated.View style={[styles.searchInputWrapper, { borderColor }]}>
        <View style={styles.searchIconContainer}>
          <Feather name="search" size={20} color={isFocused ? COLORS.primary : COLORS.text.tertiary} />
        </View>
        <TextInput
          style={styles.modernSearchInput}
          placeholder="Search your amazing exercises..."
          value={searchTerm}
          onChangeText={onSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          autoCapitalize="none"
          placeholderTextColor={COLORS.text.tertiary}
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => onSearch('')} style={styles.clearSearchButton}>
            <Ionicons name="close-circle" size={20} color={COLORS.text.tertiary} />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
      
      <View style={styles.searchActionsRow}>
        <TouchableOpacity style={styles.modernFilterButton} onPress={onFilter}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            style={styles.filterButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="sliders" size={18} color={COLORS.text.white} />
            <Text style={styles.filterButtonText}>Filter</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <View style={styles.resultsInfoCard}>
          <Text style={styles.resultsCount}>{resultsCount}</Text>
          <Text style={styles.resultsLabel}>exercises</Text>
          <View style={styles.pageDot} />
          <Text style={styles.pageInfo}>{currentPage}/{totalPages}</Text>
        </View>
      </View>
    </View>
  );
});

// Ultra Modern Exercise Card Component
const ExerciseCard = React.memo(({ item, onPress, onEdit, onDelete, index, categories }) => {
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    const delay = index * 100;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getExerciseType = (exerciseName) => {
    if (!exerciseName) return 'fitness';
    const name = exerciseName.toLowerCase();
    if (name.includes('yoga') || name.includes('stretch')) return 'yoga';
    if (name.includes('cardio') || name.includes('run')) return 'cardio';
    if (name.includes('strength') || name.includes('weight')) return 'dumbbell';
    return 'fitness';
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.categoryId === categoryId);
    return category ? category.categoryName : 'Uncategorized';
  };

  const getStatusBadge = () => {
    const status = item.isPrivate ? 'Private' : 'Public';
    const badgeStyle = item.isPrivate
      ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: COLORS.danger }
      : { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: COLORS.success };
    
    return (
      <View style={[styles.statusBadge, badgeStyle]}>
        <Feather name={item.isPrivate ? 'lock' : 'globe'} size={12} color={badgeStyle.color} />
        <Text style={[styles.statusText, { color: badgeStyle.color }]}>{status}</Text>
      </View>
    );
  };

  const exerciseType = getExerciseType(item.exerciseName);

  return (
    <Animated.View
      style={[
        styles.exerciseCardContainer,
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
        style={styles.modernExerciseCard}
        onPress={onPress}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={[COLORS.background.card, COLORS.background.secondary]}
          style={styles.cardGradientBackground}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <ExerciseIcon type={exerciseType} size={32} />
            <View style={styles.cardTitleSection}>
              <Text style={styles.modernExerciseName} numberOfLines={1}>
                {item.exerciseName || 'Exercise'}
              </Text>
              <View style={styles.badgeRow}>
                <View style={styles.categoryBadge}>
                  <Feather name="grid" size={12} color={COLORS.primary} />
                  <Text style={styles.badgeText}>{getCategoryName(item.categoryId)}</Text>
                </View>
                {getStatusBadge()}
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionIconButton} onPress={onEdit}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.actionIconGradient}
                >
                  <Feather name="edit-2" size={16} color={COLORS.text.white} />
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconButton} onPress={onDelete}>
                <LinearGradient
                  colors={[COLORS.danger, '#DC2626']}
                  style={styles.actionIconGradient}
                >
                  <Feather name="trash-2" size={16} color={COLORS.text.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card Content */}
          <View style={styles.cardContent}>
            <Text style={styles.exerciseDescription} numberOfLines={2}>
              {item.description ? item.description.replace(/<[^>]+>/g, '') : 'No description available for this exercise.'}
            </Text>
            <View style={styles.exerciseDetails}>
              <View style={styles.detailItem}>
                <Feather name="users" size={14} color={COLORS.text.tertiary} />
                <Text style={styles.detailText}>{item.genderSpecific || 'Unisex'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Feather name="flame" size={14} color={COLORS.text.tertiary} />
                <Text style={styles.detailText}>
                  {item.caloriesBurnedPerMin ? `${item.caloriesBurnedPerMin} cal/min` : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Card Footer */}
          <View style={styles.cardFooter}>
            <View style={styles.exerciseStats}>
              <View style={styles.statItem}>
                <Feather name="clock" size={14} color={COLORS.text.tertiary} />
                <Text style={styles.statText}>Recently updated</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.viewDetailsButton}>
              <Text style={styles.viewDetailsText}>View Details</Text>
              <Feather name="arrow-right" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
});

// Modern Loading Component
const ModernLoader = React.memo(({ text = "Loading your exercises..." }) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const rotateAnimation = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );

    rotateAnimation.start();
    pulseAnimation.start();

    return () => {
      rotateAnimation.stop();
      pulseAnimation.stop();
    };
  }, []);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.modernLoaderContainer}>
      <Animated.View style={[styles.loaderIconContainer, { transform: [{ rotate }, { scale: pulseAnim }] }]}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight, COLORS.purple]}
          style={styles.loaderGradient}
        >
          <MaterialCommunityIcons name="dumbbell" size={40} color={COLORS.text.white} />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.modernLoaderText}>{text}</Text>
      <Text style={styles.loaderSubtext}>Preparing your fitness journey</Text>
    </View>
  );
});

// Enhanced Empty State Component
const EmptyState = React.memo(({ onCreateExercise, onClearFilters }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounceAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimation.start();
    return () => bounceAnimation.stop();
  }, []);

  return (
    <View style={styles.modernEmptyContainer}>
      <Animated.View style={[styles.emptyIconContainer, { transform: [{ translateY: bounceAnim }] }]}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          style={styles.emptyIconGradient}
        >
          <MaterialCommunityIcons name="dumbbell" size={60} color={COLORS.text.white} />
        </LinearGradient>
      </Animated.View>
      <Text style={styles.modernEmptyTitle}>No Exercises Found</Text>
      <Text style={styles.modernEmptyText}>
        Ready to create your first amazing exercise? Let's build something incredible together!
      </Text>
      <View style={styles.emptyActions}>
        <TouchableOpacity style={styles.primaryActionButton} onPress={onCreateExercise}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight]}
            style={styles.primaryButtonGradient}
          >
            <Feather name="plus" size={20} color={COLORS.text.white} />
            <Text style={styles.primaryButtonText}>Create Exercise</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryActionButton} onPress={onClearFilters}>
          <Text style={styles.secondaryButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// Main Component
const TrainerExerciseManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [exercises, setExercises] = useState([]);
  const [categories, setCategories] = useState([]);
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
    sortBy: 'exerciseId',
    sortDescending: true,
  });

  const [tempFilters, setTempFilters] = useState(filters);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    fetchCategories();
  }, [authLoading, user, navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchExercises(pageNumber);
    }, [pageNumber, searchTerm, filters, pageSize])
  );

  const fetchCategories = async () => {
    try {
      const response = await trainerService.getAllExerciseCategories();
      if (response.statusCode === 200 && response.data?.categories) {
        setCategories(response.data.categories);
      } else {
        console.error('Failed to load categories:', response.message);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchExercises = async (page = 1, refresh = false) => {
    try {
      setLoading(true);
      if (refresh) setRefreshing(true);

      const response = await trainerService.getFitnessExercisesByTrainer({
        PageNumber: page,
        PageSize: pageSize,
        SearchTerm: searchTerm || undefined,
        TrainerId: user.userId,
        SortBy: filters.sortBy,
        SortDescending: filters.sortDescending,
      });

      if (response.statusCode === 200 && Array.isArray(response.data?.exercises)) {
        const trainerExercises = response.data.exercises.filter(ex => ex.trainerId === user.userId);
        setExercises(trainerExercises);
        setTotalPages(response.data.totalPages || 1);
        setTotalItems(response.data.totalCount || 0);
        setHasMore(page < (response.data.totalPages || 1));
      } else {
        Alert.alert('Notice', response.message || 'Unable to load exercises.');
        setExercises([]);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while loading exercises.');
      setExercises([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setPageNumber(1);
    fetchExercises(1, true);
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
    fetchExercises(1);
  };

  const resetTempFilters = () => {
    const defaultFilters = {
      sortBy: 'exerciseId',
      sortDescending: true,
    };
    setTempFilters(defaultFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      sortBy: 'exerciseId',
      sortDescending: true,
    };
    setFilters(defaultFilters);
    setTempFilters(defaultFilters);
    setSearchTerm('');
    setPageNumber(1);
    fetchExercises(1);
  };

  const sortOptions = [
    { label: 'Exercise ID', value: 'exerciseId', icon: 'key' },
    { label: 'Name', value: 'name', icon: 'type' },
    { label: 'Created Date', value: 'created', icon: 'clock' },
  ];

  const pageSizeOptions = [
    { label: '5', value: 5 },
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
  ];

  const renderFilterModal = () => {
    return (
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowFilterModal(false);
          setTempFilters(filters);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modernFilterModal}>
            <View style={styles.modalHandle} />
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowFilterModal(false);
                  setTempFilters(filters);
                }}
                style={styles.modalCloseButton}
              >
                <Feather name="x" size={24} color={COLORS.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Sort Options */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Sort By</Text>
                <View style={styles.optionsGrid}>
                  {sortOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionCard,
                        tempFilters.sortBy === option.value && styles.selectedOptionCard,
                      ]}
                      onPress={() => setTempFilters({ ...tempFilters, sortBy: option.value })}
                    >
                      <View style={[
                        styles.optionIconContainer,
                        tempFilters.sortBy === option.value && styles.selectedOptionIcon
                      ]}>
                        <Feather
                          name={option.icon}
                          size={20}
                          color={tempFilters.sortBy === option.value ? COLORS.text.white : COLORS.text.tertiary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          tempFilters.sortBy === option.value && styles.selectedOptionText,
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
                <Text style={styles.sectionTitle}>Sort Order</Text>
                <View style={styles.directionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      !tempFilters.sortDescending && styles.selectedDirectionButton,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, sortDescending: false })}
                  >
                    <Feather
                      name="arrow-up"
                      size={18}
                      color={!tempFilters.sortDescending ? COLORS.text.white : COLORS.text.tertiary}
                    />
                    <Text
                      style={[
                        styles.directionText,
                        !tempFilters.sortDescending && styles.selectedDirectionText,
                      ]}
                    >
                      Ascending
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.directionButton,
                      tempFilters.sortDescending && styles.selectedDirectionButton,
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, sortDescending: true })}
                  >
                    <Feather
                      name="arrow-down"
                      size={18}
                      color={tempFilters.sortDescending ? COLORS.text.white : COLORS.text.tertiary}
                    />
                    <Text
                      style={[
                        styles.directionText,
                        tempFilters.sortDescending && styles.selectedDirectionText,
                      ]}
                    >
                      Descending
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Items per Page */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Items per Page</Text>
                <View style={styles.pageSizeGrid}>
                  {pageSizeOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pageSizeOption,
                        pageSize === option.value && styles.selectedPageSize,
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
                        items
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetTempFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyTempFilters}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryLight]}
                  style={styles.applyButtonGradient}
                >
                  <Text style={styles.applyButtonText}>Apply Filters</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderExercise = ({ item, index }) => (
    <ExerciseCard
      item={item}
      index={index}
      categories={categories}
      onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.exerciseId })}
      onEdit={() => navigation.navigate('EditExercise', { exerciseId: item.exerciseId })}
      onDelete={() => navigation.navigate('DeleteExercise', { exerciseId: item.exerciseId })}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={COLORS.primary} />
      
      {/* Ultra Modern Header */}
      <View style={styles.headerContainer}>
        <LinearGradient 
          colors={[COLORS.primary, COLORS.primaryLight, COLORS.purple]} 
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.modernBackButton} onPress={() => navigation.goBack()}>
              <Feather name="arrow-left" size={24} color={COLORS.text.white} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.modernHeaderTitle}>Exercise Hub</Text>
              <Text style={styles.modernHeaderSubtitle}>Manage your fitness empire</Text>
            </View>
            
            <TouchableOpacity
              style={styles.modernAddButton}
              onPress={() => navigation.navigate('CreateExercise')}
            >
              <LinearGradient
                colors={[COLORS.glassmorphism, 'rgba(255, 255, 255, 0.1)']}
                style={styles.addButtonGradient}
              >
                <Feather name="plus" size={24} color={COLORS.text.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Modern Search Section */}
      <Animated.View
        style={[
          styles.searchSection,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ModernSearchBar
          searchTerm={searchTerm}
          onSearch={handleSearch}
          onFilter={() => setShowFilterModal(true)}
          resultsCount={totalItems}
          currentPage={pageNumber}
          totalPages={totalPages}
        />
      </Animated.View>

      {/* Content Area */}
      {loading && pageNumber === 1 ? (
        <ModernLoader />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.exerciseId.toString()}
          renderItem={renderExercise}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState
              onCreateExercise={() => navigation.navigate('CreateExercise')}
              onClearFilters={clearFilters}
            />
          }
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading && pageNumber > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.footerLoaderText}>Loading more exercises...</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Modern Pagination */}
      {totalItems > 0 && (
        <Animated.View style={[styles.paginationContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={[COLORS.background.card, COLORS.background.secondary]}
            style={styles.paginationGradient}
          >
            <TouchableOpacity
              style={[styles.paginationButton, pageNumber <= 1 && styles.disabledPaginationButton]}
              onPress={handlePreviousPage}
              disabled={pageNumber <= 1 || loading}
            >
              <Feather name="chevron-left" size={20} color={pageNumber <= 1 ? COLORS.text.tertiary : COLORS.primary} />
            </TouchableOpacity>
            
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>Page {pageNumber} of {totalPages}</Text>
            </View>
            
            <TouchableOpacity
              style={[styles.paginationButton, pageNumber >= totalPages && styles.disabledPaginationButton]}
              onPress={handleNextPage}
              disabled={pageNumber >= totalPages || loading}
            >
              <Feather name="chevron-right" size={20} color={pageNumber >= totalPages ? COLORS.text.tertiary : COLORS.primary} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}

      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight + 10 : 10,
    paddingBottom: 25,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  modernBackButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.glassmorphism,
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(20px)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modernHeaderTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text.white,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modernHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  modernAddButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    backgroundColor: COLORS.background.secondary,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  modernSearchContainer: {
    gap: 15,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
    paddingHorizontal: 20,
    borderWidth: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  searchIconContainer: {
    marginRight: 15,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    paddingVertical: 18,
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: 5,
  },
  searchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernFilterButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  filterButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 16,
    color: COLORS.text.white,
    fontWeight: '600',
  },
  resultsInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  resultsCount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  resultsLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  pageDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.text.tertiary,
  },
  pageInfo: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  exerciseCardContainer: {
    marginBottom: 20,
  },
  modernExerciseCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
  cardGradientBackground: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modernIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
  },
  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitleSection: {
    flex: 1,
  },
  modernExerciseName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    marginBottom: 16,
  },
  exerciseDescription: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 12,
  },
  exerciseDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    fontWeight: '500',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewDetailsText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modernLoaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loaderIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    marginBottom: 24,
  },
  loaderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernLoaderText: {
    fontSize: 20,
    color: COLORS.text.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  loaderSubtext: {
    fontSize: 16,
    color: COLORS.text.tertiary,
    textAlign: 'center',
    fontWeight: '500',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  footerLoaderText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modernEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: 32,
  },
  emptyIconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernEmptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.primary,
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  modernEmptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '500',
  },
  emptyActions: {
    width: '100%',
    gap: 16,
  },
  primaryActionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    color: COLORS.text.white,
    fontWeight: '700',
  },
  secondaryActionButton: {
    backgroundColor: COLORS.background.card,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
  },
  paginationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  paginationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledPaginationButton: {
    backgroundColor: COLORS.background.tertiary,
    opacity: 0.5,
  },
  paginationInfo: {
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'flex-end',
  },
  modernFilterModal: {
    backgroundColor: COLORS.background.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    minHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHandle: {
    width: 48,
    height: 4,
    backgroundColor: COLORS.text.tertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  filterSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  optionCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOptionCard: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedOptionIcon: {
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedOptionText: {
    color: COLORS.text.white,
    fontWeight: '700',
  },
  directionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  directionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedDirectionButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  directionText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },
  selectedDirectionText: {
    color: COLORS.text.white,
    fontWeight: '700',
  },
  pageSizeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  pageSizeOption: {
    flex: 1,
    backgroundColor: COLORS.background.tertiary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPageSize: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryLight,
  },
  pageSizeNumber: {
    fontSize: 20,
    color: COLORS.text.primary,
    fontWeight: '800',
    marginBottom: 4,
  },
  selectedPageSizeNumber: {
    color: COLORS.text.white,
  },
  pageSizeLabel: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
  selectedPageSizeLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  resetButton: {
    flex: 1,
    backgroundColor: COLORS.background.tertiary,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  resetButtonText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: '700',
  },
  applyButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  applyButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: COLORS.text.white,
    fontWeight: '700',
  },
});

export default TrainerExerciseManagement;