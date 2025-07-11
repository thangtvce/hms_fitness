import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
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
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { workoutService } from "services/apiWorkoutService";
import { aiRecommentService } from "services/apiAIRecommentService";
import { apiUserService } from "services/apiUserService";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { theme } from "theme/color";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "components/Header";

const { width, height } = Dimensions.get("window");

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Draft", value: "draft" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50];

const SORT_OPTIONS = [
  { label: "Name A-Z", value: "name", icon: "text-outline" },
  { label: "Difficulty (Easy → Hard)", value: "difficulty", icon: "trending-up-outline" },
  { label: "Calories (High → Low)", value: "calories-high", icon: "flame-outline" },
  { label: "Calories (Low → High)", value: "calories-low", icon: "flame-outline" },
  { label: "Male", value: "male", icon: "man-outline" },
  { label: "Female", value: "female", icon: "woman-outline" },
  { label: "Duration", value: "duration", icon: "time-outline" },
];

const LAYOUT_OPTIONS = [
  { columns: 1, icon: "list-outline", label: "1 column" },
  { columns: 2, icon: "grid-outline", label: "2 columns" },
  { columns: 3, icon: "apps-outline", label: "3 columns" },
  { columns: 4, icon: "keypad-outline", label: "4 columns" },
];

const WorkoutScreen = () => {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [aiItems, setAIItems] = useState([]);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryMap, setCategoryMap] = useState({});
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [layoutMode, setLayoutMode] = useState(1);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    pageNumber: 1,
    pageSize: 10,
    startDate: "",
    endDate: "",
    validPageSize: 10,
    searchTerm: "",
    status: "",
    categoryId: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    pageNumber: 1,
    pageSize: 10,
    startDate: "",
    endDate: "",
    validPageSize: 10,
    searchTerm: "",
    status: "",
    categoryId: "",
  });
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          setUserId(userObj?.userId || userObj?.id || null);
        }
      } catch (e) {}
    };
    loadUserId();
  }, []);

  const fetchAIRecommended = async () => {
    if (!userId) {
      return;
    }
    setAILoading(true);
    setAIError(null);
    try {
      const aiExercises = await aiRecommentService.getRecommendedExercisesByUser(userId);
      const items = Array.isArray(aiExercises?.recommendedExercises) ? aiExercises.recommendedExercises : [];
      setAIItems(items);
    } catch (e) {
      setAIError("Failed to load AI recommendations. Please try again.");
      setAIItems([]);
    } finally {
      setAILoading(false);
    }
  };

  useEffect(() => {
    fetchAIRecommended();
  }, [userId]);

  // Animation setup
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
  }, []);

  // Load favorites
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
        const favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
        setFavorites(favoriteList.map(item => item.exerciseId));
      } catch (error) {}
    };
    loadFavorites();
  }, []);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await workoutService.getAllCategories();
      const categoriesData = response || [];
      setCategories(categoriesData);
      const map = categoriesData.reduce((acc, category) => {
        acc[category.categoryId] = category.categoryName;
        return acc;
      }, {});
      setCategoryMap(map);
      return categoriesData;
    } catch (err) {
      return [];
    }
  };

  // Fetch exercises
  const fetchExercises = async (isRefresh = false, customParams = null, pageNumber = null) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const params = customParams || {};
      if (!customParams) {
        params.PageNumber = pageNumber || appliedFilters.pageNumber || currentPage;
        params.PageSize = appliedFilters.pageSize || 10;
        if (appliedSearchQuery.trim()) params.SearchTerm = appliedSearchQuery.trim();
        if (appliedFilters.searchTerm.trim()) params.SearchTerm = appliedFilters.searchTerm.trim();
        if (appliedFilters.status) params.Status = appliedFilters.status;
        if (appliedFilters.categoryId || selectedCategory) params.CategoryId = appliedFilters.categoryId || selectedCategory;
        if (appliedFilters.startDate) params.StartDate = appliedFilters.startDate;
        if (appliedFilters.endDate) params.EndDate = appliedFilters.endDate;
      }

      const response = await workoutService.getAllExercises(params);
      if (categories.length === 0) await fetchCategories();

      if (response && typeof response === "object") {
        let exercises = Array.isArray(response.exercises)
          ? response.exercises
          : Array.isArray(response.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : [];

        exercises = sortExercises(exercises, sortBy);

        if (response.pagination) {
          setCurrentPage(response.pagination.currentPage || params.PageNumber || 1);
          setTotalPages(response.pagination.totalPages || 1);
          setTotalItems(response.pagination.totalItems || exercises.length);
          setHasNextPage(response.pagination.hasNextPage || false);
          setHasPrevPage(response.pagination.hasPreviousPage || false);
        } else {
          const totalCount = response.totalCount || exercises.length;
          const pageSize = params.PageSize || 10;
          const currentPageNum = params.PageNumber || 1;
          setCurrentPage(currentPageNum);
          setTotalPages(Math.ceil(totalCount / pageSize));
          setTotalItems(totalCount);
          setHasNextPage(currentPageNum < Math.ceil(totalCount / pageSize));
          setHasPrevPage(currentPageNum > 1);
        }

        setItems([...exercises]);
      } else {
        setItems([]);
        setCurrentPage(1);
        setTotalPages(1);
        setTotalItems(0);
        setHasNextPage(false);
        setHasPrevPage(false);
      }
    } catch (err) {
      setError(err.message || "Failed to load exercises");
      setItems([]);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (exercise) => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
      let favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
      const isFavorited = favorites.includes(exercise.exerciseId);

      if (isFavorited) {
        favoriteList = favoriteList.filter((item) => item.exerciseId !== exercise.exerciseId);
        setFavorites(favorites.filter((id) => id !== exercise.exerciseId));
        await AsyncStorage.setItem('favoriteExercises', JSON.stringify(favoriteList));
        Alert.alert('Success', 'Removed from favorites successfully');
      } else {
        favoriteList.push(exercise);
        setFavorites([...favorites, exercise.exerciseId]);
        await AsyncStorage.setItem('favoriteExercises', JSON.stringify(favoriteList));
        Alert.alert('Success', 'Added to favorites successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    }
  };

  // Add to schedule
  const addToSchedule = async (exercise) => {
    try {
      const storedExercises = await AsyncStorage.getItem('scheduledExercises');
      let scheduledExercises = storedExercises ? JSON.parse(storedExercises) : [];

      if (scheduledExercises.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        Alert.alert('Info', `${exercise.exerciseName} is already in your schedule`);
        return;
      }

      const exerciseToSave = { ...exercise, mediaUrl: exercise.mediaUrl || '' };
      scheduledExercises.push(exerciseToSave);
      await AsyncStorage.setItem('scheduledExercises', JSON.stringify(scheduledExercises));
      Alert.alert('Success', `${exercise.exerciseName} added to your workout schedule`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add exercise to schedule. Please try again.');
    }
  };

  // Sort exercises
  const sortExercises = (exercises, sortType) => {
    const sorted = [...exercises];
    switch (sortType) {
      case "name":
        return sorted.sort((a, b) => (a.exerciseName || "").localeCompare(b.exerciseName || ""));
      case "difficulty":
        const difficultyOrder = { beginner: 1, easy: 1, intermediate: 2, medium: 2, advanced: 3, hard: 3 };
        return sorted.sort((a, b) => {
          const aLevel = difficultyOrder[a.difficultyLevel?.toLowerCase()] || difficultyOrder[a.difficulty?.toLowerCase()] || 2;
          const bLevel = difficultyOrder[b.difficultyLevel?.toLowerCase()] || difficultyOrder[b.difficulty?.toLowerCase()] || 2;
          return aLevel - bLevel;
        });
      case "calories-high":
        return sorted.sort((a, b) => (b.caloriesBurnedPerMin || 0) - (a.caloriesBurnedPerMin || 0));
      case "calories-low":
        return sorted.sort((a, b) => (a.caloriesBurnedPerMin || 0) - (b.caloriesBurnedPerMin || 0));
      case "male":
        return sorted.filter((ex) => ex.genderSpecific === "male" || ex.genderSpecific === "unisex" || !ex.genderSpecific);
      case "female":
        return sorted.filter((ex) => ex.genderSpecific === "female" || ex.genderSpecific === "unisex" || !ex.genderSpecific);
      case "duration":
        return sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0));
      default:
        return sorted;
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchExercises();
  }, []);

  // Fetch on category or sort change
  useEffect(() => {
    if (selectedCategory || sortBy !== "name") {
      const params = {
        PageNumber: 1,
        PageSize: appliedFilters.pageSize || 10,
      };
      if (selectedCategory) params.CategoryId = selectedCategory;
      fetchExercises(false, params, 1);
    }
  }, [selectedCategory, sortBy]);

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    fetchExercises(true, null, 1);
    fetchAIRecommended();
  };

  // Search handler
  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery);
    setCurrentPage(1);
    const searchParams = {
      PageNumber: 1,
      PageSize: appliedFilters.pageSize || 10,
    };
    if (searchQuery.trim()) searchParams.SearchTerm = searchQuery.trim();
    if (appliedFilters.status) searchParams.Status = appliedFilters.status;
    if (appliedFilters.categoryId || selectedCategory) searchParams.CategoryId = appliedFilters.categoryId || selectedCategory;
    if (appliedFilters.startDate) searchParams.StartDate = appliedFilters.startDate;
    if (appliedFilters.endDate) searchParams.EndDate = appliedFilters.endDate;
    fetchExercises(false, searchParams, 1);
  };

  // Apply filters
  const applyFilters = () => {
    setAppliedFilters({ ...filters });
    setShowFilters(false);
    setCurrentPage(1);
    const filterParams = {
      PageNumber: 1,
      PageSize: filters.pageSize || 10,
    };
    if (filters.searchTerm.trim()) filterParams.SearchTerm = filters.searchTerm.trim();
    if (filters.status) filterParams.Status = filters.status;
    if (filters.categoryId || selectedCategory) filterParams.CategoryId = filters.categoryId || selectedCategory;
    if (filters.startDate) filterParams.StartDate = filters.startDate;
    if (filters.endDate) filterParams.EndDate = filters.endDate;
    if (appliedSearchQuery.trim()) filterParams.SearchTerm = appliedSearchQuery.trim();
    fetchExercises(false, filterParams, 1);
  };

  // Reset filters
  const resetFilters = () => {
    const resetState = {
      pageNumber: 1,
      pageSize: 10,
      startDate: "",
      endDate: "",
      validPageSize: 10,
      searchTerm: "",
      status: "",
      categoryId: "",
    };
    setFilters(resetState);
    setAppliedFilters(resetState);
    setSearchQuery("");
    setAppliedSearchQuery("");
    setSelectedCategory("");
    setSortBy("name");
    setCurrentPage(1);
    setTimeout(() => fetchExercises(false, { PageNumber: 1, PageSize: 10 }, 1), 100);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setAppliedSearchQuery("");
    setCurrentPage(1);
    const filterParams = {
      PageNumber: 1,
      PageSize: appliedFilters.pageSize || 10,
    };
    if (appliedFilters.status) filterParams.Status = appliedFilters.status;
    if (appliedFilters.categoryId || selectedCategory) filterParams.CategoryId = appliedFilters.categoryId || selectedCategory;
    if (appliedFilters.startDate) filterParams.StartDate = appliedFilters.startDate;
    if (appliedFilters.endDate) filterParams.EndDate = appliedFilters.endDate;
    fetchExercises(false, filterParams, 1);
  };

  // Pagination handlers
  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages && pageNumber !== currentPage) {
      setCurrentPage(pageNumber);
      fetchExercises(false, null, pageNumber);
    }
  };

  const goToNextPage = () => {
    if (hasNextPage) goToPage(currentPage + 1);
  };

  const goToPrevPage = () => {
    if (hasPrevPage) goToPage(currentPage - 1);
  };

  // Get exercise image
  const getExerciseImage = (exerciseName) => {
    return `https://source.unsplash.com/400x250/?fitness,${exerciseName.replace(/\s/g, "")}`;
  };

  // Render category item
  const renderCategoryItem = ({ item }) => {
    const isSelected = selectedCategory === item.categoryId;
    return (
      <TouchableOpacity
        style={[styles.categoryCard, isSelected && styles.selectedCategoryCard]}
        onPress={() => {
          setSelectedCategory(isSelected ? "" : item.categoryId);
          setCurrentPage(1);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? ["#0056d2", "#4F46E5"] : ["#F8FAFC", "#F1F5F9"]}
          style={styles.categoryGradient}
        >
          <View style={styles.categoryIconContainer}>
            <Ionicons name="fitness-outline" size={20} color={isSelected ? "#FFFFFF" : "#0056d2"} />
          </View>
          <Text style={[styles.categoryName, { color: isSelected ? "#FFFFFF" : "#1E293B" }]}>
            {item.categoryName}
          </Text>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  // Render sort modal
  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sortModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort Exercises</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sortContent}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.sortOption, sortBy === option.value && styles.selectedSortOption]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortModal(false);
                }}
              >
                <View style={styles.sortOptionLeft}>
                  <View
                    style={[
                      styles.sortIconContainer,
                      { backgroundColor: sortBy === option.value ? "#EEF2FF" : "#F9FAFB" },
                    ]}
                  >
                    <Ionicons name={option.icon} size={18} color={sortBy === option.value ? "#0056d2" : "#6B7280"} />
                  </View>
                  <Text style={[styles.sortOptionText, sortBy === option.value && styles.selectedSortOptionText]}>
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.value && <Ionicons name="checkmark" size={18} color="#0056d2" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render pagination controls
  const renderPaginationControls = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Showing {(currentPage - 1) * appliedFilters.pageSize + 1}-
            {Math.min(currentPage * appliedFilters.pageSize, totalItems)} of {totalItems} exercises
          </Text>
        </View>
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.paginationButton, !hasPrevPage && styles.paginationButtonDisabled]}
            onPress={goToPrevPage}
            disabled={!hasPrevPage}
          >
            <Ionicons name="chevron-back" size={16} color={hasPrevPage ? "#0056d2" : "#9CA3AF"} />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumbersContainer}>
            {startPage > 1 && (
              <>
                <TouchableOpacity style={styles.pageNumberButton} onPress={() => goToPage(1)}>
                  <Text style={styles.pageNumberText}>1</Text>
                </TouchableOpacity>
                {startPage > 2 && (
                  <View style={styles.paginationEllipsisContainer}>
                    <Text style={styles.paginationEllipsis}>...</Text>
                  </View>
                )}
              </>
            )}
            {pageNumbers.map((pageNum) => (
              <TouchableOpacity
                key={pageNum}
                style={[styles.pageNumberButton, currentPage === pageNum && styles.pageNumberButtonActive]}
                onPress={() => goToPage(pageNum)}
              >
                <Text style={[styles.pageNumberText, currentPage === pageNum && styles.pageNumberTextActive]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            ))}
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <View style={styles.paginationEllipsisContainer}>
                    <Text style={styles.paginationEllipsis}>...</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.pageNumberButton} onPress={() => goToPage(totalPages)}>
                  <Text style={styles.pageNumberText}>{totalPages}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
          <TouchableOpacity
            style={[styles.paginationButton, !hasNextPage && styles.paginationButtonDisabled]}
            onPress={goToNextPage}
            disabled={!hasNextPage}
          >
            <Ionicons name="chevron-forward" size={16} color={hasNextPage ? "#0056d2" : "#9CA3AF"} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render filter modal
  const renderFilterModal = () => (
    <Modal visible={showFilters} transparent={true} animationType="slide" onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters & Search</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Search Term</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Enter search term..."
                value={filters.searchTerm}
                onChangeText={(value) => setFilters((prev) => ({ ...prev, searchTerm: value }))}
              />
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Items per page</Text>
              <View style={styles.pageSizeContainer}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.pageSizeButton, filters.pageSize === size && styles.selectedPageSize]}
                    onPress={() => setFilters((prev) => ({ ...prev, pageSize: size, validPageSize: size }))}
                  >
                    <Text style={[styles.pageSizeText, filters.pageSize === size && styles.selectedPageSizeText]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="DD-MM-YYYY"
                    value={filters.startDate}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev, startDate: value }))}
                  />
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="DD-MM-YYYY"
                    value={filters.endDate}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev, endDate: value }))}
                  />
                </View>
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[styles.filterOption, filters.status === status.value && styles.selectedOption]}
                  onPress={() => setFilters((prev) => ({ ...prev, status: status.value }))}
                >
                  <Text style={[styles.filterOptionText, filters.status === status.value && styles.selectedOptionText]}>
                    {status.label}
                  </Text>
                  {filters.status === status.value && <Ionicons name="checkmark" size={18} color="#0056d2" />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <TouchableOpacity
                style={[styles.filterOption, filters.categoryId === "" && styles.selectedOption]}
                onPress={() => setFilters((prev) => ({ ...prev, categoryId: "" }))}
              >
                <Text style={[styles.filterOptionText, filters.categoryId === "" && styles.selectedOptionText]}>
                  All Categories
                </Text>
                {filters.categoryId === "" && <Ionicons name="checkmark" size={18} color="#0056d2" />}
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[styles.filterOption, filters.categoryId === category.categoryId && styles.selectedOption]}
                  onPress={() => setFilters((prev) => ({ ...prev, categoryId: category.categoryId }))}
                >
                  <View style={styles.categoryOptionContent}>
                    <View style={styles.categoryIcon}>
                      <Ionicons name="fitness-outline" size={14} color="#0056d2" />
                    </View>
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.categoryId === category.categoryId && styles.selectedOptionText,
                      ]}
                    >
                      {category.categoryName}
                    </Text>
                  </View>
                  {filters.categoryId === category.categoryId && (
                    <Ionicons name="checkmark" size={18} color="#0056d2" />
                  )}
                </TouchableOpacity>
              ))}
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
  );

  // Render layout modal
  const renderLayoutModal = () => (
    <Modal
      visible={showLayoutModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLayoutModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.layoutModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Display Layout</Text>
            <TouchableOpacity onPress={() => setShowLayoutModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.layoutContent}>
            <Text style={styles.layoutDescription}>Select number of columns to display exercises</Text>
            <View style={styles.layoutGrid}>
              {LAYOUT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.columns}
                  style={[styles.layoutOption, layoutMode === option.columns && styles.selectedLayoutOption]}
                  onPress={() => {
                    setLayoutMode(option.columns);
                    setShowLayoutModal(false);
                  }}
                >
                  <View
                    style={[
                      styles.layoutIconContainer,
                      { backgroundColor: layoutMode === option.columns ? "#0056d2" : "#F9FAFB" },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={layoutMode === option.columns ? "#FFFFFF" : "#6B7280"}
                    />
                  </View>
                  <Text
                    style={[styles.layoutOptionText, layoutMode === option.columns && styles.selectedLayoutOptionText]}
                  >
                    {option.label}
                  </Text>
                  {layoutMode === option.columns && (
                    <View style={styles.layoutCheckmark}>
                      <Ionicons name="checkmark-circle" size={18} color="#0056d2" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderExerciseItem = ({ item, index, isAI = false }) => {
    const itemWidth = layoutMode === 1 ? "100%" : layoutMode === 2 ? "48%" : layoutMode === 3 ? "31%" : "23%";
    const imageHeight = layoutMode === 1 ? 160 : layoutMode === 2 ? 120 : layoutMode === 3 ? 100 : 80;
    const isFavorited = favorites.includes(item.exerciseId);

    return (
      <Animated.View
        style={[
          styles.exerciseItem,
          {
            width: itemWidth,
            marginRight: layoutMode > 1 ? "2%" : 0,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            ...(isAI ? [{ borderWidth: 2, borderColor: '#0056d2' }] : []),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("ExerciseDetails", { exercise: item })}
          activeOpacity={0.8}
          style={[styles.exerciseCard, isAI && { backgroundColor: '#F0F4FF' }]}
        >
          <View style={styles.exerciseImageContainer}>
            <Image
              source={{ uri: item.mediaUrl || getExerciseImage(item.exerciseName || "fitness") }}
              style={[styles.exerciseImage, { height: imageHeight }]}
              resizeMode="cover"
            />
            {isAI && (
              <View style={styles.aiRecommendBadge}>
                <Text style={styles.aiRecommendText}>AI Recommend</Text>
              </View>
            )}
            <LinearGradient
              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"]}
              style={styles.exerciseGradient}
            >
              <Text
                style={[styles.exerciseName, { fontSize: layoutMode > 2 ? 14 : 16 }]}
                numberOfLines={layoutMode > 2 ? 2 : 1}
              >
                {item.exerciseName || "Unknown Exercise"}
              </Text>
            </LinearGradient>
            {item.status && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: item.status === "active" ? "#10B981" : "#EF4444" },
                ]}
              >
                <Text style={[styles.statusText, { fontSize: layoutMode > 2 ? 9 : 11 }]}>{item.status}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.favoriteButton, { width: layoutMode > 2 ? 24 : 32, height: layoutMode > 2 ? 24 : 32 }]}
              onPress={() => toggleFavorite(item)}
            >
              <Ionicons
                name={isFavorited ? "heart" : "heart-outline"}
                size={layoutMode > 2 ? 14 : 18}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { width: layoutMode > 2 ? 24 : 32, height: layoutMode > 2 ? 24 : 32 }]}
              onPress={() => addToSchedule(item)}
            >
              <Ionicons name="add-circle" size={layoutMode > 2 ? 14 : 18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={[styles.exerciseContent, { padding: layoutMode > 2 ? 10 : 16 }]}>
            <Text
              style={[styles.exerciseDescription, { fontSize: layoutMode > 2 ? 11 : 13 }]}
              numberOfLines={layoutMode > 2 ? 1 : 2}
            >
              {item.description || "No description available"}
            </Text>
            <View style={[styles.exerciseDetailsContainer, { gap: layoutMode > 2 ? 6 : 10 }]}>
              <View style={styles.exerciseDetailItem}>
                <View
                  style={[
                    styles.detailIconContainer,
                    { backgroundColor: "#EEF2FF", width: layoutMode > 2 ? 18 : 22, height: layoutMode > 2 ? 18 : 22 },
                  ]}
                >
                  <Ionicons name="grid-outline" size={layoutMode > 2 ? 10 : 12} color="#0056d2" />
                </View>
                <Text style={[styles.exerciseDetailText, { fontSize: layoutMode > 2 ? 10 : 12 }]} numberOfLines={1}>
                  {categoryMap[item.categoryId] || `Category ${item.categoryId || "Unknown"}`}
                </Text>
              </View>
              {item.caloriesBurnedPerMin && (
                <View style={styles.exerciseDetailItem}>
                  <View
                    style={[
                      styles.detailIconContainer,
                      { backgroundColor: "#FEF2F2", width: layoutMode > 2 ? 18 : 22, height: layoutMode > 2 ? 18 : 22 },
                    ]}
                  >
                    <Ionicons name="flame-outline" size={layoutMode > 2 ? 10 : 12} color="#EF4444" />
                  </View>
                  <Text style={[styles.exerciseDetailText, { fontSize: layoutMode > 2 ? 10 : 12 }]}>
                    {item.caloriesBurnedPerMin} kcal/min
                  </Text>
                </View>
              )}
              {layoutMode <= 2 && item.genderSpecific && (
                <View style={styles.exerciseDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: "#F0FDF4" }]}>
                    <Ionicons name="person-outline" size={12} color="#10B981" />
                  </View>
                  <Text style={styles.exerciseDetailText}>
                    {item.genderSpecific === "male" ? "Male" : item.genderSpecific === "female" ? "Female" : "Unisex"}
                  </Text>
                </View>
              )}
              {layoutMode <= 2 && (item.difficultyLevel || item.difficulty) && (
                <View style={styles.exerciseDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: "#FFFBEB" }]}>
                    <Ionicons name="trending-up-outline" size={12} color="#F59E0B" />
                  </View>
                  <Text style={styles.exerciseDetailText}>{item.difficultyLevel || item.difficulty}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0056d2" />
          <Text style={styles.loadingText}>Loading fitness content...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <Header
        title="Fitness Hub"
        subtitle="Discover exercises & workouts"
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: 'options-outline',
            onPress: () => setShowFilters(true),
            color: '#0056d2',
          },
          {
            icon: 'heart-outline',
            onPress: () => navigation.navigate('WorkoutFavoriteScreen'),
            color: '#EF4444',
          },
          {
            icon: 'play-circle-outline',
            onPress: () => navigation.navigate('WorkoutSessionScreen'),
            color: '#0056d2',
          },
        ]}
        backgroundColor={theme.primaryColor}
        textColor={'#fff'}
        containerStyle={styles.header}
        backButtonColor={'#000'}
      />

      <Animated.View
        style={[styles.searchContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.layoutButton} onPress={() => setShowLayoutModal(true)}>
              <Ionicons
                name={LAYOUT_OPTIONS.find((opt) => opt.columns === layoutMode)?.icon || "grid-outline"}
                size={16}
                color="#0056d2"
              />
              <Text style={styles.layoutButtonText}>{layoutMode} col</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
              <Ionicons name="swap-vertical-outline" size={16} color="#0056d2" />
              <Text style={styles.sortButtonText}>Sort</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortButton} onPress={() => navigation.navigate('AIRecommendedScreen')}>
              <Ionicons name="sparkles-outline" size={16} color="#0056d2" />
              <Text style={styles.sortButtonText}>AI Recommend</Text>
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.categoryId.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {(appliedSearchQuery ||
        appliedFilters.status ||
        appliedFilters.categoryId ||
        selectedCategory ||
        appliedFilters.startDate ||
        appliedFilters.endDate ||
        sortBy !== "name") && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
            {appliedSearchQuery && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Search: {appliedSearchQuery}</Text>
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close" size={14} color="#0056d2" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCategory && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Category: {categoryMap[selectedCategory]}</Text>
              </View>
            )}
            {sortBy !== "name" && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Sort: {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
                </Text>
              </View>
            )}
            {appliedFilters.status && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Status: {appliedFilters.status}</Text>
              </View>
            )}
            {appliedFilters.pageSize !== 10 && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Per page: {appliedFilters.pageSize}</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.clearAllFiltersButton} onPress={resetFilters}>
            <Text style={styles.clearAllFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.contentContainer}>
        {error && !refreshing ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchExercises()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={items}
              renderItem={({ item, index }) => renderExerciseItem({ item, index, isAI: false })}
              keyExtractor={(item, index) => {
                return item.exerciseId ? `exercise-${item.exerciseId}` : `item-${index}`;
              }}
              numColumns={layoutMode}
              key={layoutMode}
              contentContainerStyle={[styles.listContainer, { minHeight: height - 400 }]}
              style={styles.flatListStyle}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#0056d2"]}
                  tintColor="#0056d2"
                />
              }
              showsVerticalScrollIndicator={false}
              bounces={true}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="barbell-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No exercises found</Text>
                    <Text style={styles.emptyText}>
                      {appliedSearchQuery || appliedFilters.status || appliedFilters.categoryId || selectedCategory
                        ? "No exercises match your search criteria."
                        : "Try refreshing or check your connection."}
                    </Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchExercises()}>
                      <Text style={styles.retryButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
            {renderPaginationControls()}
          </>
        )}
      </View>

      {renderFilterModal()}
      {renderSortModal()}
      {renderLayoutModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0056d2',
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  searchContainer: {
    backgroundColor: "#F8FAFC",
    marginTop: -8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#1E293B",
    paddingVertical: 14,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0056d2",
    alignItems: "center",
    justifyContent: "center",
  },
  categoriesSection: {
    backgroundColor: "#F8FAFC",
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  layoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  layoutButtonText: {
    fontSize: 11,
    color: "#0056d2",
    fontWeight: "600",
    marginLeft: 4,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sortButtonText: {
    fontSize: 12,
    color: "#0056d2",
    fontWeight: "600",
    marginLeft: 4,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    marginRight: 10,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedCategoryCard: {
    transform: [{ scale: 1.02 }],
  },
  categoryGradient: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: "center",
    position: "relative",
  },
  categoryIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  selectedIndicator: {
    position: "absolute",
    top: 6,
    right: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sortModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 8,
  },
  sortContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  selectedSortOption: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#0056d2",
  },
  sortOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sortOptionText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedSortOptionText: {
    color: "#0056d2",
    fontWeight: "600",
  },
  activeFiltersContainer: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  activeFiltersScroll: {
    flex: 1,
  },
  activeFilterChip: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeFilterText: {
    fontSize: 11,
    color: "#0056d2",
    fontWeight: "500",
  },
  clearAllFiltersButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearAllFiltersText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  flatListStyle: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  exerciseItem: {
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseImageContainer: {
    position: "relative",
  },
  exerciseImage: {
    width: "100%",
    height: 160,
  },
  aiRecommendBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#0056d2',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  aiRecommendText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  exerciseGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  favoriteButton: {
    position: "absolute",
    top: 12,
    right: 50,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseContent: {
    padding: 16,
  },
  exerciseDescription: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 12,
  },
  exerciseDetailsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  exerciseDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  exerciseDetailText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  paginationContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  paginationInfo: {
    alignItems: "center",
    marginBottom: 10,
  },
  paginationText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  paginationButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  paginationButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  pageNumbersContainer: {
    maxWidth: width * 0.6,
  },
  pageNumberButton: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pageNumberButtonActive: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  pageNumberText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  paginationEllipsisContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  paginationEllipsis: {
    fontSize: 13,
    color: "#9CA3AF",
    paddingHorizontal: 8,
    alignSelf: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    minHeight: height * 0.4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    fontSize: 16,
    color: "#0056d2",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: "#F9FAFB",
    minHeight: height * 0.6,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#0056d2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1F2937",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  selectedOption: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#0056d2",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedOptionText: {
    color: "#0056d2",
    fontWeight: "600",
  },
  categoryOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  pageSizeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pageSizeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 40,
    alignItems: "center",
  },
  selectedPageSize: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  pageSizeText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedPageSizeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0056d2",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  layoutModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.4,
  },
  layoutContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  layoutDescription: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  layoutGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 10,
  },
  layoutOption: {
    flex: 1,
    maxWidth: (width - 80) / 4,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  selectedLayoutOption: {
    backgroundColor: "#EEF2FF",
    borderColor: "#0056d2",
  },
  layoutIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  layoutOptionText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },
  selectedLayoutOptionText: {
    color: "#0056d2",
    fontWeight: "600",
  },
  layoutCheckmark: {
    position: "absolute",
    top: 4,
    right: 4,
  },
});

export default WorkoutScreen;