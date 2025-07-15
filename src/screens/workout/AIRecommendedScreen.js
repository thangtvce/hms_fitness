import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  RefreshControl,
} from 'react-native';
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { aiRecommentService } from 'services/apiAIRecommentService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from 'theme/color';
import { SafeAreaView } from 'react-native-safe-area-context';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import Header from 'components/Header'; // Import the Header component

const { width, height } = Dimensions.get('window');

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

const AIRecommendedScreen = () => {
  const navigation = useNavigation();
  const [aiItems, setAIItems] = useState([]);
  const [aiLoading, setAILoading] = useState(false);
  const [aiError, setAIError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("");
  const [showSortModal, setShowSortModal] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [layoutMode, setLayoutMode] = useState(1); // Default to 1 column when entering the screen
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [userId, setUserId] = useState(null);

  // Load userId from AsyncStorage
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          setUserId(userObj?.userId || userObj?.id || null);
        }
      } catch (e) { }
    };
    loadUserId();
  }, []);

  // Fetch AI recommended exercises
  const fetchAIRecommended = async () => {
    if (!userId) {
      setAILoading(false);
      setAIError('User not logged in.');
      return;
    }
    setAILoading(true);
    setAIError(null);
    try {
      const aiExercises = await aiRecommentService.getRecommendedExercisesByUser(userId);
      const items = Array.isArray(aiExercises?.recommendedExercises) ? aiExercises.recommendedExercises : [];
      setAIItems(items);
    } catch (e) {
      setAIError('Failed to load AI recommendations. Please try again.');
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
      } catch (error) { }
    };
    loadFavorites();
  }, []);

  // Refresh handler
  const onRefresh = () => {
    setRefreshing(true);
    fetchAIRecommended().finally(() => setRefreshing(false));
  };

  // Search handler
  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setAppliedSearchQuery("");
  };

  // Sort logic
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
        showSuccessMessage('Removed from favorites successfully');
      } else {
        favoriteList.push(exercise);
        setFavorites([...favorites, exercise.exerciseId]);
        await AsyncStorage.setItem('favoriteExercises', JSON.stringify(favoriteList));
        showSuccessMessage('Added to favorites successfully');
      }
    } catch (error) {
      showErrorFetchAPI('Failed to update favorites. Please try again.');
    }
  };

  // Add to schedule
  const addToSchedule = async (exercise) => {
    try {
      const storedExercises = await AsyncStorage.getItem('scheduledExercises');
      let scheduledExercises = storedExercises ? JSON.parse(storedExercises) : [];
      if (scheduledExercises.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        showErrorFetchAPI(`${exercise.exerciseName} is already in your schedule`);
        return;
      }
      const exerciseToSave = { ...exercise, mediaUrl: exercise.mediaUrl || '' };
      scheduledExercises.push(exerciseToSave);
      await AsyncStorage.setItem('scheduledExercises', JSON.stringify(scheduledExercises));
      showSuccessMessage(`${exercise.exerciseName} added to your workout schedule`);
    } catch (error) {
      showErrorFetchAPI('Failed to add exercise to schedule. Please try again.');
    }
  };

  // Get exercise image
  const getExerciseImage = (exerciseName) => {
    return `https://source.unsplash.com/400x250/?fitness,${exerciseName.replace(/\s/g, '')}`;
  };

  // Get package icon
  const getPackageIcon = (exerciseName) => {
    if (!exerciseName) return "fitness";
    const name = exerciseName.toLowerCase();
    if (name.includes("yoga")) return "yoga";
    if (name.includes("diet") || name.includes("nutrition")) return "nutrition";
    if (name.includes("cardio")) return "cardio";
    return "fitness";
  };

  // Render package icon
  const renderPackageIcon = (type) => {
    const iconProps = { size: 18 };
    switch (type) {
      case "yoga":
        return <MaterialCommunityIcons name="yoga" color="#10B981" {...iconProps} />;
      case "nutrition":
        return <Ionicons name="nutrition" color="#F59E0B" {...iconProps} />;
      case "cardio":
        return <Ionicons name="heart" color="#EF4444" {...iconProps} />;
      default:
        return <MaterialCommunityIcons name="dumbbell" color="#6366F1" {...iconProps} />;
    }
  };

  // Filter and sort aiItems
  const filteredItems = aiItems.filter(item => {
    if (!appliedSearchQuery.trim()) return true;
    const search = appliedSearchQuery.trim().toLowerCase();
    return (
      (item.exerciseName && item.exerciseName.toLowerCase().includes(search)) ||
      (item.description && item.description.toLowerCase().includes(search))
    );
  });
  const sortedItems = sortExercises(filteredItems, sortBy);

  // Render exercise item
  const renderExerciseItem = ({ item, index }) => {
    // Debug log for exerciseId and item
    console.log('Render Exercise Item:', { exerciseId: item.exerciseId, item });
    const itemWidth = layoutMode === 1 ? "100%" : layoutMode === 2 ? "48%" : layoutMode === 3 ? "31%" : "23%";
    const imageHeight = layoutMode === 1 ? 180 : layoutMode === 2 ? 140 : layoutMode === 3 ? 120 : 100;
    const isFavorited = favorites.includes(item.exerciseId);
    const packageType = getPackageIcon(item.exerciseName);

    // Lấy thông tin ưu tiên từ exerciseDetails nếu có
    const details = item.exerciseDetails || {};
    const exerciseName = details.exerciseName || item.exerciseName || 'Unknown Exercise';
    const description = details.description || item.description || 'No description available';
    // Ưu tiên details.imageUrl, sau đó đến item.imageUrl, cuối cùng là ảnh mặc định
    let imageUrl = details.imageUrl;
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      imageUrl = item.imageUrl;
    }
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      imageUrl = getExerciseImage(exerciseName);
    }
    const mediaUrl = details.mediaUrl || item.mediaUrl;
    const type = details.type || item.type || 'Fitness';
    const difficultyLevel = details.difficultyLevel || item.difficultyLevel || details.difficulty || item.difficulty;

    return (
      <Animated.View
        style={[
          styles.exerciseItem,
          {
            width: itemWidth,
            marginRight: (index + 1) % layoutMode !== 0 ? "4%" : 0,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate('ExerciseDetails', { exercise: { ...item, ...details } })}
          activeOpacity={0.8}
          style={styles.exerciseCard}
        >
          <View style={styles.exerciseImageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={[styles.exerciseImage, { height: imageHeight }]}
              resizeMode="cover"
              onError={e => {
                console.log('Image load error:', { imageUrl, exerciseId: item.exerciseId, error: e.nativeEvent });
                // Optionally, you can set a fallback image here if needed
              }}
            />
            {/* AI Recommend Badge */}
            <LinearGradient
              colors={["#0056d2", "#296fd1ff"]}
              style={styles.aiBadge}
            >
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              <Text style={styles.aiBadgeText}>AI RECOMMEND</Text>
            </LinearGradient>

            {/* Favorite Button */}
            <TouchableOpacity
              style={[styles.favoriteButton, {
                width: layoutMode > 2 ? 28 : 36,
                height: layoutMode > 2 ? 28 : 36
              }]}
              onPress={() => toggleFavorite(item)}
            >
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={layoutMode > 2 ? 16 : 20}
                color="#FFFFFF"
              />
            </TouchableOpacity>
            {/* Add Button */}
            <TouchableOpacity
              style={[styles.addButton, {
                width: layoutMode > 2 ? 28 : 36,
                height: layoutMode > 2 ? 28 : 36
              }]}
              onPress={() => addToSchedule(item)}
            >
              <Ionicons name="add-circle" size={layoutMode > 2 ? 16 : 20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={[styles.exerciseContent, { padding: layoutMode > 2 ? 12 : 16 }]}> 
            <Text
              style={[styles.exerciseName, { fontSize: layoutMode > 2 ? 16 : 18 }]}
              numberOfLines={layoutMode > 2 ? 2 : 1}
            >
              {exerciseName}
            </Text>
            <Text
              style={[styles.exerciseDescription, { fontSize: layoutMode > 2 ? 12 : 14 }]}
              numberOfLines={layoutMode > 2 ? 2 : 2}
            >
              {description}
            </Text>

            <View style={[styles.exerciseDetailsContainer, { gap: layoutMode > 2 ? 8 : 12 }]}> 
              <View style={styles.exerciseDetailItem}>
                <View style={[styles.detailIconContainer, { backgroundColor: '#EEF2FF' }]}> 
                  <Ionicons name="grid-outline" size={layoutMode > 2 ? 12 : 14} color="#6366F1" />
                </View>
                <Text style={[styles.exerciseDetailText, { fontSize: layoutMode > 2 ? 11 : 13 }]} numberOfLines={1}>
                  {type}
                </Text>
              </View>
              {item.durationMinutes && (
                <View style={styles.exerciseDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#FEF2F2' }]}> 
                    <Ionicons name="time-outline" size={layoutMode > 2 ? 12 : 14} color="#EF4444" />
                  </View>
                  <Text style={[styles.exerciseDetailText, { fontSize: layoutMode > 2 ? 11 : 13 }]}>
                    {item.durationMinutes} min
                  </Text>
                </View>
              )}
              {item.sets && (
                <View style={styles.exerciseDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#FFFBEB' }]}> 
                    <Ionicons name="repeat-outline" size={layoutMode > 2 ? 12 : 14} color="#F59E0B" />
                  </View>
                  <Text style={[styles.exerciseDetailText, { fontSize: layoutMode > 2 ? 11 : 13 }]}>
                    {item.sets} sets
                  </Text>
                </View>
              )}
              {item.reps && (
                <View style={styles.exerciseDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#F0FDF4' }]}> 
                    <Ionicons name="barbell-outline" size={layoutMode > 2 ? 12 : 14} color="#10B981" />
                  </View>
                  <Text style={[styles.exerciseDetailText, { fontSize: layoutMode > 2 ? 11 : 13 }]}>
                    {item.reps} reps
                  </Text>
                </View>
              )}
              {difficultyLevel && (
                <View style={styles.exerciseDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#E0E7FF' }]}> 
                    <Ionicons name="trending-up-outline" size={layoutMode > 2 ? 12 : 14} color="#6366F1" />
                  </View>
                  <Text style={[styles.exerciseDetailText, { fontSize: layoutMode > 2 ? 11 : 13 }]}>
                    {difficultyLevel}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
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
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
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
                    <Ionicons name={option.icon} size={20} color={sortBy === option.value ? "#6366F1" : "#6B7280"} />
                  </View>
                  <Text style={[styles.sortOptionText, sortBy === option.value && styles.selectedSortOptionText]}>
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.value && <Ionicons name="checkmark" size={20} color="#6366F1" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
                      { backgroundColor: layoutMode === option.columns ? "#6366F1" : "#F9FAFB" },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
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
                      <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
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

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={["#6366F1", "#8B5CF6"]}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="sparkles-outline" size={48} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>No AI Recommendations</Text>
      <Text style={styles.emptyText}>
        We're still learning about your preferences. Try completing more workouts to get personalized recommendations.
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('WorkoutListScreen')}
      >
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="fitness-outline" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Explore Workouts</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      {/* Header */}
     <Header
        title="AI Recommendations"
        onBack={() => navigation.goBack()}
        titleStyle={{
          fontSize: 22,
          fontWeight: "bold",
          color: "#FFFFFF",
          textAlign: "center",
          letterSpacing: 0.5,
        }}
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          elevation: 2,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        }}
        rightActions={[
         
          {
            icon: LAYOUT_OPTIONS.find((opt) => opt.columns === layoutMode)?.icon || "grid-outline",
            onPress: () => setShowLayoutModal(true),
            color: "#000000ff",
          },
          {
            icon: "heart-outline",
            onPress: () => navigation.navigate('WorkoutFavoriteScreen'),
            color: "#000000ff",
          },
          {
            icon: "play-circle-outline",
            onPress: () => navigation.navigate('WorkoutSessionScreen'),
            color: "#000000ff",
          },
        ]}
      />
      {/* Search Bar */}
      <Animated.View
        style={[styles.searchContainer, { marginTop: 50, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search AI recommendations..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {aiLoading ? null :
          aiError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorText}>{aiError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchAIRecommended}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : sortedItems.length > 0 ? (
            <FlatList
              data={sortedItems}
              renderItem={renderExerciseItem}
              keyExtractor={(item, index) =>
                item.exerciseId ? `ai-exercise-${item.exerciseId}` : `ai-item-${index}`
              }
              numColumns={layoutMode}
              key={layoutMode}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#6366F1"]}
                  tintColor="#6366F1"
                />
              }
            />
          ) : renderEmpty()
        }
      </View>

      {renderSortModal()}
      {renderLayoutModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  // Header styles removed as Header component is used
  searchContainer: {
    backgroundColor: "#F8FAFC",
    marginTop: 0, // Adjusted margin top
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
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
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
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
    color: "#1E293B",
    paddingVertical: 16,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#0056d2",
    alignItems: "center",
    justifyContent: "center",
  },
  // Stats container removed as per user request
  contentContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  exerciseItem: {
    marginBottom: 20,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16, // Slightly smaller border radius for consistency
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, // Reduced shadow for a lighter feel
    shadowOpacity: 0.1,
    shadowRadius: 4, // Reduced shadow radius
    elevation: 3, // Reduced elevation
    borderWidth: 1, // Thinner border
    borderColor: '#E2E8F0', // Softer border color
  },
  exerciseImageContainer: {
    position: 'relative',
  },
  exerciseImage: {
    width: '100%',
    height: 180,
  },
  aiBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 1, // Ensure it's above the image
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Type badge removed, as AI badge is sufficient for primary identification
  exerciseGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  exerciseName: {
    fontSize: 18, // Slightly smaller font size for better fit
    fontWeight: '700',
    color: '#1E293B', // Changed to a darker text color for content
  },
  favoriteButton: {
    position: 'absolute',
    top: 12, // Positioned at top right
    right: 56, // Space for add button
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Subtle background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  addButton: {
    position: 'absolute',
    top: 12, // Positioned at top right
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Subtle background
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  exerciseContent: {
    padding: 16, // Consistent padding
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12, // Added margin bottom
  },
  exerciseDetailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // Reduced gap for tighter layout
  },
  exerciseDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9', // Light background for detail chips
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailIconContainer: {
    width: 20, // Smaller icon container
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6, // Reduced margin
  },
  exerciseDetailText: {
    fontSize: 12, // Smaller font size
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    minHeight: height * 0.5,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: '#F9FAFB',
    minHeight: height * 0.6,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sortModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.6,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sortContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedSortOption: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedSortOptionText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  layoutModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.4,
  },
  layoutContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  layoutDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  layoutGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 12,
  },
  layoutOption: {
    flex: 1,
    maxWidth: (width - 80) / 4,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedLayoutOption: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  layoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  layoutOptionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  selectedLayoutOptionText: {
    color: '#6366F1',
    fontWeight: '600',
  },
  layoutCheckmark: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
});

export default AIRecommendedScreen;