import React,{ useState,useEffect,useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Dimensions,
  Animated,
  Platform,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { showErrorFetchAPI,showErrorMessage,showInfoMessage,showSuccessMessage } from "utils/toastUtil";
import { Ionicons,Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "theme/color";
import { StatusBar } from "expo-status-bar";
import Header from "components/Header";
import workoutService from "services/apiWorkoutService";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";
import SafeImage from "screens/food/SafeImage";

const { width,height } = Dimensions.get("window");
const SPACING = 20;

const CATEGORIES_COLORS = {
  1: ["#4F46E5","#818CF8"],
  2: ["#10B981","#34D399"],
  3: ["#F59E0B","#FBBF24"],
  4: ["#EF4444","#F87171"],
  5: ["#8B5CF6","#A78BFA"],
  6: ["#EC4899","#F472B6"],
  7: ["#06B6D4","#22D3EE"],
  8: ["#0EA5E9","#38BDF8"],
  default: ["#6B7280","#9CA3AF"],
};

const WorkoutAIRecommendBanner = ({ navigation }) => {
  return (
    <TouchableOpacity
      style={styles.aiRecommendBanner}
      onPress={() => navigation.navigate('AIRecommendedScreen')}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={["#0056d2","#6366F1"]}
        style={styles.aiRecommendBannerGradient}
        start={{ x: 0,y: 0 }}
        end={{ x: 1,y: 0 }}
      >
        <View style={styles.aiRecommendBannerContent}>
          <View style={styles.aiRecommendBannerLeft}>
            <View style={styles.aiRecommendBannerIcon}>
              <Feather name="cpu" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.aiRecommendBannerText}>
              <Text style={styles.aiRecommendBannerTitle}>Workout AI Recommend</Text>
              <Text style={styles.aiRecommendBannerSubtitle}>Get personalized workout plans</Text>
            </View>
          </View>
          <View style={styles.aiRecommendBannerRight}>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function WorkoutListScreen() {
  const navigation = useNavigation();
  const [showFilter,setShowFilter] = useState(false);
  const [exercises,setExercises] = useState([]);
  const [loading,setLoading] = useState(true);
  const [loadingMore,setLoadingMore] = useState(false);
  const [error,setError] = useState(null);
  const [categories,setCategories] = useState({});
  const [favorites,setFavorites] = useState([]);
  const [refreshing,setRefreshing] = useState(false);
  const [selectedCategory,setSelectedCategory] = useState(null);
  const [categoryList,setCategoryList] = useState([]);
  const [hasMore,setHasMore] = useState(true);
  const [filters,setFilters] = useState({
    PageNumber: 1,
    PageSize: 20,
    StartDate: '',
    EndDate: '',
    ValidPageSize: 20,
    SearchTerm: '',
    Status: '',
  });

  const [filterDraft,setFilterDraft] = useState({
    PageNumber: 1,
    PageSize: 20,
    StartDate: '',
    EndDate: '',
    ValidPageSize: 20,
    SearchTerm: '',
    Status: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    ]).start();
  },[]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
        const favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
        setFavorites(favoriteList.map(item => item.exerciseId));
      } catch (error) {
      }
      fetchCategories();
      fetchExercises(true);
    };

    const unsubscribe = navigation.addListener('focus',loadAll);
    loadAll();

    return unsubscribe;
  },[navigation]);

  const fetchCategories = async () => {
    try {
      const queryParams = {
        PageNumber: 1,
        PageSize: 1000,
      };
      const apiCategories = await workoutService.getAllCategories(queryParams);
      if (Array.isArray(apiCategories)) {
        setCategoryList(apiCategories);
        const categoriesObj = {};
        apiCategories.forEach(cat => {
          categoriesObj[cat.categoryId] = cat.categoryName;
        });
        setCategories(categoriesObj);
      } else {
        setCategoryList([]);
        setCategories({});
      }
    } catch (error) {
      showErrorFetchAPI(error);
      setCategoryList([]);
      setCategories({});
    }
  };

  const toggleFavorite = async (exercise) => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
      let favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
      const exists = favoriteList.some((ex) => ex.exerciseId === exercise.exerciseId);
      let updatedList;

      if (exists) {
        updatedList = favoriteList.filter((ex) => ex.exerciseId !== exercise.exerciseId);
      } else {
        updatedList = [...favoriteList,exercise];
      }

      await AsyncStorage.setItem('favoriteExercises',JSON.stringify(updatedList));
      setFavorites(updatedList.map(item => item.exerciseId));

      showInfoMessage(exists ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      showErrorFetchAPI(error);
    }
  };

  const addToSchedule = async (exercise) => {
    try {
      const storedExercises = await AsyncStorage.getItem('scheduledExercises');
      let scheduledExercises = storedExercises ? JSON.parse(storedExercises) : [];
      if (scheduledExercises.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        showErrorMessage(`${exercise.exerciseName} is already in your schedule`);
        return;
      }
      const exerciseToSave = { ...exercise,mediaUrl: exercise.mediaUrl || '' };
      scheduledExercises.push(exerciseToSave);
      await AsyncStorage.setItem('scheduledExercises',JSON.stringify(scheduledExercises));
      showSuccessMessage(`${exercise.exerciseName} added to your workout schedule`);
    } catch (error) {
      showErrorFetchAPI(error);
    }
  };

  const fetchExercises = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setExercises([]);
      setFilters(prev => ({ ...prev,PageNumber: 1 }));
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      let response;
      if (selectedCategory && selectedCategory > 0) {
        response = await workoutService.getExercisesByCategory(selectedCategory,filters);
      } else {
        response = await workoutService.getAllExercises(filters);
      }
      let newExercises = [];
      if (Array.isArray(response)) {
        newExercises = response;
      } else if (response && Array.isArray(response.exercises)) {
        newExercises = response.exercises;
      }
      setExercises(prev => {
        const allExercises = isInitial ? newExercises : [...prev,...newExercises];

        const uniqueExercisesMap = new Map();
        allExercises.forEach(ex => {
          if (ex.exerciseId) uniqueExercisesMap.set(ex.exerciseId,ex);
        });

        return Array.from(uniqueExercisesMap.values());
      });

      setHasMore(newExercises.length === filters.PageSize);
      if (!isInitial) {
        setFilters(prev => ({ ...prev,PageNumber: prev.PageNumber + 1 }));
      }
    } catch (err) {
      showErrorFetchAPI(err);
      setError(err.message || 'An error occurred while fetching exercises');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExercises(true).then(() => setRefreshing(false));
  };

  const loadMoreExercises = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchExercises();
    }
  };

  const filterByCategory = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    setExercises([]);
    setFilters(prev => ({ ...prev,PageNumber: 1 }));
  };

  useEffect(() => {
    if (showFilter) {
      setFilterDraft(filters);
    }
  },[showFilter]);

  const applyFilters = () => {
    setFilters(filterDraft);
    setShowFilter(false);
    setExercises([]);
    fetchExercises(true);
  };

  const resetFilters = () => {
    const resetState = {
      PageNumber: 1,
      PageSize: 20,
      StartDate: '',
      EndDate: '',
      ValidPageSize: 20,
      SearchTerm: '',
      Status: '',
    };
    setFilterDraft(resetState);
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1,backgroundColor: '#fff',justifyContent: 'center',alignItems: 'center',position: 'absolute',width: '100%',height: '100%',zIndex: 999 }}>
          <CommonSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Header
          title="Workout Library"
          onBack={() => navigation.goBack()}
          backgroundColor="#fff"
          titleStyle={{ color: "#0056d2",fontWeight: "bold" }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchExercises(true)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <Header
        title="Workout Library"
        onBack={() => navigation.goBack()}
        backgroundColor="#fff"
        titleStyle={{ color: "#0056d2",fontWeight: "bold" }}
        rightActions={[
          {
            icon: 'options-outline',
            onPress: () => setShowFilter(true),
            color: '#0056d2',
          },
          {
            icon: 'heart-outline',
            onPress: () => navigation.navigate('WorkoutFavoriteScreen'),
            color: '#EF4444',
          },
        ]}
      />
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
            placeholder="Search exercises..."
            value={filters.SearchTerm}
            onChangeText={(text) => setFilters(prev => ({ ...prev,SearchTerm: text }))}
            returnKeyType="search"
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />
          {filters.SearchTerm ? (
            <TouchableOpacity
              onPress={() => setFilters(prev => ({ ...prev,SearchTerm: '' }))}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>

      <Animated.View
        style={[
          styles.sectionContainer,
          { opacity: fadeAnim,transform: [{ translateY: slideAnim }] },
        ]}
      >
        <WorkoutAIRecommendBanner navigation={navigation} />
      </Animated.View>

      {categoryList.length > 0 && (
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {categoryList.map((category) => {
              const isSelected = selectedCategory === category.categoryId;
              return (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipSelected,
                  ]}
                  onPress={() => filterByCategory(category.categoryId)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {category.categoryName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
      <FlatList
        data={exercises}
        keyExtractor={(item,index) => `${item.exerciseId}-${index}`}
        renderItem={({ item }) => {
          const isFavorite = favorites.includes(item.exerciseId);
          const categoryId = item.categoryId || 'default';
          const colors = CATEGORIES_COLORS[categoryId] || CATEGORIES_COLORS.default;
          return (
            <Animated.View
              style={[
                styles.exerciseCardContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ExerciseDetails',{ exercise: item })}
                style={styles.exerciseCard}
              >
                <View style={styles.exerciseImageContainer}>
                  <SafeImage
                    imageUrl={item.imageUrl}
                    style={[styles.exerciseImage]}
                    fallbackSource={require('../../../assets/images/default-exercise.png')}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0)','rgba(0,0,0,0.7)']}
                    style={styles.imageGradient}
                  >
                    <View style={styles.exerciseCardFooter}>
                      <View style={styles.exerciseStats}>
                        <View style={styles.statItem}>
                          <Ionicons name="flame-outline" size={14} color="#FFFFFF" />
                          <Text style={styles.statText}>
                            {item.caloriesBurnedPerMin || '0'} cal/min
                          </Text>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                  <LinearGradient
                    colors={["#4A90E2","#0056D2","#4A90E2"]}
                    start={{ x: 0,y: 0 }}
                    end={{ x: 1,y: 0 }}
                    style={styles.categoryBadge}
                  >
                    <Text style={styles.categoryBadgeText}>
                      {(item.categoryName || 'General')}
                    </Text>
                  </LinearGradient>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton,isFavorite && styles.favoriteButton]}
                      onPress={() => toggleFavorite(item)}
                    >
                      <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={20}
                        color={isFavorite ? "#FFFFFF" : "#FFFFFF"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => addToSchedule(item)}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.exerciseContent}>
                  <Text style={styles.exerciseName}>
                    {item.exerciseName || 'Unknown Exercise'}
                  </Text>
                  <Text style={styles.exerciseDescription} numberOfLines={2}>
                    {item.description || 'No description available'}
                  </Text>
                  <View style={styles.exerciseTags}>
                    {item.genderSpecific && (
                      <View style={styles.tagContainer}>
                        <Ionicons
                          name={item.genderSpecific.toLowerCase() === 'female' ? 'female' : 'male'}
                          size={12}
                          color="#6366F1"
                        />
                        <Text style={styles.tagText}>{item.genderSpecific}</Text>
                      </View>
                    )}
                    {item.difficultyLevel && (
                      <View style={styles.tagContainer}>
                        <Ionicons name="barbell-outline" size={12} color="#F59E0B" />
                        <Text style={styles.tagText}>{item.difficultyLevel}</Text>
                      </View>
                    )}
                    {item.status && (
                      <View style={styles.tagContainer}>
                        <Ionicons name="checkmark-circle-outline" size={12} color="#10B981" />
                        <Text style={styles.tagText}>{item.status}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        contentContainerStyle={styles.exerciseList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#0056d2"]}
            tintColor="#0056d2"
          />
        }
        onEndReached={loadMoreExercises}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMoreContainer}>
              <CommonSkeleton />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No exercises found</Text>
            <Text style={styles.emptyText}>
              Try adjusting your filters or search terms
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fabPlay}
        onPress={() => navigation.navigate('WorkoutSessionScreen')}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={32} color="#fff" />
      </TouchableOpacity>
      <Modal
        visible={showFilter}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Exercises</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterContent}>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Search Term</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Enter search term..."
                  value={filterDraft.SearchTerm}
                  onChangeText={(value) => setFilterDraft(prev => ({ ...prev,SearchTerm: value }))}
                />
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Status</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Enter status (e.g., active, draft)..."
                  value={filterDraft.Status}
                  onChangeText={(value) => setFilterDraft(prev => ({ ...prev,Status: value }))}
                />
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Date Range</Text>
                <View style={styles.dateRow}>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      value={filterDraft.StartDate}
                      onChangeText={(value) => setFilterDraft(prev => ({ ...prev,StartDate: value }))}
                    />
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>End Date</Text>
                    <TextInput
                      style={styles.dateInput}
                      placeholder="YYYY-MM-DD"
                      value={filterDraft.EndDate}
                      onChangeText={(value) => setFilterDraft(prev => ({ ...prev,EndEnd: value }))}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Pagination</Text>
                <View style={styles.paginationRow}>
                  <View style={styles.paginationInputContainer}>
                    <Text style={styles.paginationLabel}>Page</Text>
                    <TextInput
                      style={styles.paginationInput}
                      placeholder="1"
                      value={filterDraft.PageNumber.toString()}
                      onChangeText={(value) => setFilterDraft(prev => ({ ...prev,PageNumber: parseInt(value) || 1 }))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.paginationInputContainer}>
                    <Text style={styles.paginationLabel}>Page Size</Text>
                    <TextInput
                      style={styles.paginationInput}
                      placeholder="20"
                      value={filterDraft.PageSize.toString()}
                      onChangeText={(value) => setFilterDraft(prev => ({ ...prev,PageSize: parseInt(value) || 20 }))}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.paginationInputContainer}>
                    <Text style={styles.paginationLabel}>Valid Size</Text>
                    <TextInput
                      style={styles.paginationInput}
                      placeholder="20"
                      value={filterDraft.ValidPageSize.toString()}
                      onChangeText={(value) => setFilterDraft(prev => ({ ...prev,ValidPageSize: parseInt(value) || 20 }))}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#0056d2",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#F8FAFC",
  },
  errorText: {
    marginTop: 16,
    marginBottom: 24,
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#0056d2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
    marginTop: 65
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
  },
  clearButton: {
    padding: 4,
  },
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: SPACING,
  },
  categoriesSection: {
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#F8FAFC",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  categoryChip: {
    marginRight: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#0056d2',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 4,
    shadowColor: 'transparent',
  },
  categoryChipSelected: {
    backgroundColor: '#0056d2',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0056d2',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  exerciseList: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  exerciseCardContainer: {
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  exerciseImageContainer: {
    position: "relative",
    height: 180,
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  imageGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    justifyContent: "flex-end",
  },
  exerciseCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  exerciseStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  categoryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  actionButtons: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  favoriteButton: {
    backgroundColor: "#EF4444",
  },
  exerciseContent: {
    padding: 16,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  exerciseDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 12,
  },
  exerciseTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tagContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  filterContent: {
    padding: 24,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  filterInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  paginationInputContainer: {
    flex: 1,
  },
  paginationLabel: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 8,
  },
  paginationInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  applyButton: {
    flex: 2,
    backgroundColor: "#0056d2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  fabPlay: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    width: 55,
    height: 55,
    borderRadius: 24,
    backgroundColor: '#0056d2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 100,
  },
  aiRecommendBanner: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiRecommendBannerGradient: {
    padding: SPACING,
  },
  aiRecommendBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aiRecommendBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiRecommendBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING / 2,
  },
  aiRecommendBannerText: {},
  aiRecommendBannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  aiRecommendBannerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  aiRecommendBannerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});