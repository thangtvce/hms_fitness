import { useEffect,useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder";
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons";
import Header from "components/Header";
import { useNavigation } from "@react-navigation/native";
import { getExercisesByPlanId } from "services/apiWorkoutPlanService";
import { workoutService } from "services/apiWorkoutService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";

const { width: screenWidth } = Dimensions.get("window");

const DIFFICULTY_OPTIONS = [
  { label: "All Levels",value: "",color: "#64748B",icon: "list" },
  { label: "Beginner",value: "Beginner",color: "#10B981",icon: "leaf" },
  { label: "Intermediate",value: "Intermediate",color: "#F59E0B",icon: "flash" },
  { label: "Advanced",value: "Advanced",color: "#EF4444",icon: "flame" },
];

const MUSCLE_GROUP_OPTIONS = [
  { label: "All Groups",value: "",icon: "body" },
  { label: "Chest",value: "Chest",icon: "fitness" },
  { label: "Back",value: "Back",icon: "barbell" },
  { label: "Shoulders",value: "Shoulders",icon: "triangle" },
  { label: "Arms",value: "Arms",icon: "hand-left" },
  { label: "Legs",value: "Legs",icon: "walk" },
  { label: "Core",value: "Core",icon: "ellipse" },
  { label: "Cardio",value: "Cardio",icon: "heart" },
];

const SORT_OPTIONS = [
  { label: "Name A-Z",value: "name_asc",icon: "text" },
  { label: "Name Z-A",value: "name_desc",icon: "text" },
  { label: "Duration",value: "duration",icon: "time" },
  { label: "Difficulty",value: "difficulty",icon: "trending-up" },
];

const MAX_LINES = 4;

// Custom debounce hook
const useDebounce = (value,delay) => {
  const [debouncedValue,setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    },delay);

    return () => {
      clearTimeout(handler);
    };
  },[value,delay]);

  return debouncedValue;
};

function ExpandableText({ title,text }) {
  const [expanded,setExpanded] = useState(false);
  const isLong = text && text.length > 120;
  return (
    <View style={styles.modalDescription}>
      <Text style={styles.modalDescriptionTitle}>{title}</Text>
      <Text
        style={styles.modalDescriptionText}
        numberOfLines={expanded ? undefined : MAX_LINES}
      >
        {text}
      </Text>
      {isLong ? (
        <Text
          style={{ color: "#0056d2",fontWeight: "600",marginTop: 4 }}
          onPress={() => setExpanded((v) => !v)}
        >
          {expanded ? "Less" : "More"}
        </Text>
      ) : null}
    </View>
  );
}

const ExerciseImage = ({ uri,name,style }) => {
  const [error,setError] = useState(false);
  const fallbackLocal = require("../../../assets/images/workout-hero.jpeg");

  return (
    <Image
      source={(!error && uri) ? { uri } : fallbackLocal}
      style={style}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
};

const FilterChip = ({ label,isActive,onPress,icon,color }) => (
  <TouchableOpacity
    style={[styles.filterChip,isActive && { backgroundColor: color || "#4F46E5",borderColor: color || "#4F46E5" }]}
    onPress={onPress}
  >
    {icon && <Ionicons name={icon} size={16} color={isActive ? "#fff" : color || "#64748B"} />}
    <Text style={[styles.filterChipText,isActive && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const ExerciseDetailModal = ({ visible,exercise,onClose,onAddToSession }) => {
  if (!exercise) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent,{ width: "100%",borderRadius: 24,position: "absolute",bottom: 0,left: 0,right: 0,maxHeight: "90%" }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 90,flexGrow: 1 }}>
            <View style={styles.modalImageContainer}>
              <ExerciseImage uri={exercise.mediaUrl} name={exercise.exerciseName} style={styles.modalImage} />
              <View style={styles.modalImageOverlay}>
                <TouchableOpacity style={styles.modalCloseButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                {exercise.difficulty && (
                  <View
                    style={[
                      styles.modalDifficultyBadge,
                      {
                        backgroundColor:
                          DIFFICULTY_OPTIONS.find((opt) => opt.value === exercise.difficulty)?.color || "#64748B",
                      },
                    ]}
                  >
                    <Text style={styles.modalDifficultyText}>{exercise.difficulty}</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={[styles.modalBody,{ paddingTop: 16 }]}>
              <Text style={styles.modalTitle}>{exercise.exerciseName}</Text>
              {exercise.muscleGroup && (
                <View style={styles.modalMuscleGroup}>
                  <Ionicons name="body" size={16} color="#4F46E5" />
                  <Text style={styles.modalMuscleGroupText}>{exercise.muscleGroup}</Text>
                </View>
              )}
              {exercise.description && (
                <ExpandableText title="Description" text={exercise.description} />
              )}
              {exercise.notes && (
                <ExpandableText title="Note" text={exercise.notes} />
              )}
            </View>
          </ScrollView>
          <View style={{ position: "absolute",left: 0,right: 0,bottom: 0,padding: 16,backgroundColor: "transparent" }}>
            <TouchableOpacity
              style={[styles.modalAddButton,{ backgroundColor: "#0056d2" }]}
              onPress={() => {
                onAddToSession(exercise);
                onClose();
              }}
            >
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.modalAddButtonText}>Add to Workout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function WorkoutPlanExercisesScreen({ route }) {
  const navigation = useNavigation();
  const planId = route?.params?.planId;
  const planName = route?.params?.planName;

  const [exercises,setExercises] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [refreshing,setRefreshing] = useState(false);
  const [page,setPage] = useState(1);
  const [totalPages,setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  const [isLoadingMore,setIsLoadingMore] = useState(false);
  const [searchTerm,setSearchTerm] = useState("");
  const [selectedDifficulty,setSelectedDifficulty] = useState("");
  const [selectedMuscleGroup,setSelectedMuscleGroup] = useState("");
  const [sortBy,setSortBy] = useState("");
  const [showFilters,setShowFilters] = useState(false);
  const [selectedExercise,setSelectedExercise] = useState(null);
  const [sessionCount,setSessionCount] = useState(0);
  const [lastFetchParams,setLastFetchParams] = useState(null);

  const debouncedSearchTerm = useDebounce(searchTerm,500);

  useEffect(() => {
    if (planId) {
      const params = {
        searchTerm: debouncedSearchTerm.trim(),
        difficulty: selectedDifficulty,
        muscleGroup: selectedMuscleGroup,
        sortBy: sortBy,
        pageNumber: 1,
      };

      // Only fetch if parameters have changed
      if (
        JSON.stringify(params) !== JSON.stringify(lastFetchParams) ||
        exercises.length === 0
      ) {
        setPage(1);
        setExercises([]);
        fetchExercises(true,params);
      }
    }
    loadSessionCount();
  },[planId,debouncedSearchTerm,selectedDifficulty,selectedMuscleGroup,sortBy]);

  const loadSessionCount = async () => {
    try {
      const stored = await AsyncStorage.getItem("scheduledExercisesWorkout");
      const arr = stored ? JSON.parse(stored) : [];
      setSessionCount(arr.length);
    } catch { }
  };

  const fetchExercises = async (isRefresh = false,params = {}) => {
    if (isRefresh) {
      setRefreshing(true);
      setPage(1);
      setExercises([]);
    } else if (isLoadingMore || page > totalPages) {
      return;
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const fetchParams = {
        pageNumber: isRefresh ? 1 : page,
        pageSize: pageSize,
        ...params,
      };

      // Skip fetch if parameters are identical to the last fetch
      if (!isRefresh && JSON.stringify(fetchParams) === JSON.stringify(lastFetchParams)) {
        setIsLoadingMore(false);
        return;
      }

      setLastFetchParams(fetchParams);

      const res = await getExercisesByPlanId(planId,fetchParams);
      const planExercises = res?.data?.exercises || [];
      setTotalPages(res?.data?.totalPages || 1);

      const detailedExercises = await Promise.all(
        planExercises.map(async (ex) => {
          try {
            const detail = await workoutService.getExerciseById(ex.exerciseId);
            return { ...detail,...ex,mediaUrl: detail.mediaUrl || ex.mediaUrl };
          } catch (e) {
            return { ...ex };
          }
        })
      );

      // Prevent duplicates by filtering out exercises already in the list
      setExercises((prev) => {
        const existingIds = new Set(prev.map((ex) => ex.exerciseId));
        const newExercises = detailedExercises.filter((ex) => !existingIds.has(ex.exerciseId));
        return isRefresh ? newExercises : [...prev,...newExercises];
      });

      if (!isRefresh && detailedExercises.length > 0) setPage(page + 1);
    } catch (e) {
      setError(e?.message || "Failed to load exercises");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = () => {
    fetchExercises(true);
  };

  const handleLoadMore = () => {
    if (!loading && !isLoadingMore && page <= totalPages) {
      fetchExercises(false,{
        searchTerm: debouncedSearchTerm.trim(),
        difficulty: selectedDifficulty,
        muscleGroup: selectedMuscleGroup,
        sortBy: sortBy,
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedDifficulty("");
    setSelectedMuscleGroup("");
    setSortBy("");
    setPage(1);
    setExercises([]);
    setLastFetchParams(null);
    fetchExercises(true);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedDifficulty) count++;
    if (selectedMuscleGroup) count++;
    if (sortBy) count++;
    return count;
  };

  const addToSession = async (exercise) => {
    try {
      const stored = await AsyncStorage.getItem("scheduledExercisesWorkout");
      const arr = stored ? JSON.parse(stored) : [];
      if (arr.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        showErrorFetchAPI("This exercise has already been added.");
        return;
      }
      arr.push(exercise);
      await AsyncStorage.setItem("scheduledExercisesWorkout",JSON.stringify(arr));
      setSessionCount(arr.length);
      showSuccessMessage("Added to workout!");
    } catch (error) {
      showErrorFetchAPI("Error adding to workout!",error);
      throw error;
    }
  };

  const renderExerciseCard = ({ item,index }) => (
    <TouchableOpacity
      style={[styles.exerciseCard,{ marginBottom: 16 }]}
      onPress={() => setSelectedExercise(item)}
      activeOpacity={0.8}
    >
      <View style={styles.exerciseCardHeader}>
        <ExerciseImage uri={item.mediaUrl} name={item.exerciseName} style={styles.exerciseCardImage} />
        <View style={styles.exerciseCardInfo}>
          <View style={styles.exerciseCardTitleRow}>
            <Text style={styles.exerciseCardTitle} numberOfLines={2}>
              {item.exerciseName}
            </Text>
            <TouchableOpacity
              style={styles.exerciseCardAddIcon}
              onPress={(e) => {
                e.stopPropagation();
                addToSession(item);
              }}
            >
              <Ionicons name="add" size={22} color="#0056d2" />
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row",flexWrap: "wrap",alignItems: "center",marginTop: 4 }}>
            {item.kcal && (
              <Text style={{ fontSize: 13,color: "#666",marginRight: 10 }}>{item.kcal} kcal</Text>
            )}
            {item.sets !== undefined && (
              <Text style={{ fontSize: 13,color: "#666",marginRight: 10 }}>Sets: {item.sets}</Text>
            )}
            {item.reps !== undefined && (
              <Text style={{ fontSize: 13,color: "#666",marginRight: 10 }}>Reps: {item.reps}</Text>
            )}
          </View>
          <View style={{ flexDirection: "row",alignItems: "center",marginTop: 2 }}>
            {item.durationMinutes !== undefined && (
              <Text style={{ fontSize: 13,color: "#666",marginRight: 10 }}>Duration: {item.durationMinutes}m</Text>
            )}
            {item.restTimeSeconds !== undefined && (
              <Text style={styles.exerciseCardStatText}>Rest: {item.restTimeSeconds}s</Text>
            )}
          </View>
        </View>
      </View>
      <View style={{ flexDirection: "row",justifyContent: "flex-start",alignItems: "center",marginTop: 2,marginRight: 16,marginBottom: 2 }}>
        <Text style={{ fontSize: 13,color: "#888" }}>
          {item.createdAt ? `Created by: ${new Date(item.createdAt).toLocaleDateString("vi-VN")}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name="barbell-outline" size={64} color="#C7D2FE" />
      </View>
      <Text style={styles.emptyStateTitle}>No Exercises Found</Text>
      <Text style={styles.emptyStateSubtitle}>
        {searchTerm || selectedDifficulty || selectedMuscleGroup
          ? "Try adjusting your search or filters"
          : "This workout plan doesn't have any exercises yet"}
      </Text>
      {(searchTerm || selectedDifficulty || selectedMuscleGroup) && (
        <TouchableOpacity style={styles.emptyStateButton} onPress={clearFilters}>
          <Ionicons name="refresh" size={20} color="#4F46E5" />
          <Text style={styles.emptyStateButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <View style={styles.errorStateIcon}>
        <Ionicons name="alert-circle-outline" size={64} color="#FCA5A5" />
      </View>
      <Text style={styles.errorStateTitle}>Unable to Load Exercises</Text>
      <Text style={styles.errorStateSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.errorStateButton} onPress={() => fetchExercises(true)}>
        <Ionicons name="refresh" size={20} color="#EF4444" />
        <Text style={styles.errorStateButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <CommonSkeleton />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header
        title={planName || "Workout Plan"}
        onBack={() => navigation.goBack()}
        backgroundColor="#fff"
        rightActions={[
          {
            icon: (
              <View style={{ backgroundColor: "#0056d2",borderRadius: 8,padding: 8 }}>
                <Ionicons name="play" size={20} color="#fff" />
              </View>
            ),
            onPress: () => navigation.navigate("WorkoutPlanExerciseSessionScreen"),
          },
        ]}
      />
      <View style={[styles.searchContainer,{ marginTop: 70 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={(text) => setSearchTerm(text)}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => clearFilters()}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {(selectedDifficulty || selectedMuscleGroup || sortBy) && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
            {selectedDifficulty && (
              <View
                style={[
                  styles.activeFilterChip,
                  {
                    backgroundColor:
                      DIFFICULTY_OPTIONS.find((opt) => opt.value === selectedDifficulty)?.color || "#4F46E5",
                  },
                ]}
              >
                <Text style={styles.activeFilterChipText}>{selectedDifficulty}</Text>
                <TouchableOpacity onPress={() => setSelectedDifficulty("")}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {selectedMuscleGroup && (
              <View style={styles.activeFilterChip}>
                <Ionicons name="body" size={14} color="#fff" />
                <Text style={styles.activeFilterChipText}>{selectedMuscleGroup}</Text>
                <TouchableOpacity onPress={() => setSelectedMuscleGroup("")}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            {sortBy && (
              <View style={styles.activeFilterChip}>
                <Ionicons name="swap-vertical" size={14} color="#fff" />
                <Text style={styles.activeFilterChipText}>
                  {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
                </Text>
                <TouchableOpacity onPress={() => setSortBy("")}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      <View style={styles.content}>
        {loading ? (
          <CommonSkeleton />
        ) : error ? (
          renderErrorState()
        ) : exercises.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={exercises}
            keyExtractor={(item,index) => `${item.planExerciseId || item.exerciseId}-${index}`}
            renderItem={renderExerciseCard}
            contentContainerStyle={styles.exercisesList}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
          />
        )}
      </View>
      <ExerciseDetailModal
        visible={!!selectedExercise}
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onAddToSession={addToSession}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
  },
  activeFiltersContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  activeFilters: {
    paddingHorizontal: 20,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    gap: 6,
  },
  activeFilterChipText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  exercisesList: {
    paddingBottom: 20,
  },
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  exerciseCardHeader: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 16,
  },
  exerciseCardImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  exerciseCardInfo: {
    flex: 1,
  },
  exerciseCardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  exerciseCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
    marginRight: 8,
    lineHeight: 24,
  },
  exerciseCardAddIcon: {
    padding: 4,
  },
  exerciseCardStatText: {
    fontSize: 13,
    color: "#666",
    marginRight: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    backgroundColor: "#EEF2FF",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: "500",
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  emptyStateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorStateIcon: {
    backgroundColor: "#FEF2F2",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  errorStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 8,
    textAlign: "center",
  },
  errorStateSubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: "500",
  },
  errorStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: 8,
  },
  errorStateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "100%",
    maxHeight: "90%",
    overflow: "hidden",
  },
  modalImageContainer: {
    position: "relative",
  },
  modalImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#F1F5F9",
  },
  modalImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "space-between",
    padding: 20,
  },
  modalCloseButton: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    padding: 8,
  },
  modalDifficultyBadge: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalDifficultyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
  },
  modalBody: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 12,
  },
  modalMuscleGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 6,
  },
  modalMuscleGroupText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "600",
  },
  modalDescription: {
    marginBottom: 10,
  },
  modalDescriptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  modalDescriptionText: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
    fontWeight: "500",
  },
  modalAddButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  modalAddButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
});