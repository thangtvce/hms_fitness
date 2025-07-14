"use client"

import { useEffect, useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
} from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation, useRoute } from "@react-navigation/native"
import { getExercisesByPlanId } from "services/apiWorkoutPlanService"
import { workoutService } from "services/apiWorkoutService"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"

const DIFFICULTY_OPTIONS = [
  { label: "All Levels", value: "", color: "#6B7280" },
  { label: "Beginner", value: "Beginner", color: "#10B981" },
  { label: "Intermediate", value: "Intermediate", color: "#F59E0B" },
  { label: "Advanced", value: "Advanced", color: "#EF4444" },
]

const MUSCLE_GROUP_OPTIONS = [
  { label: "All Groups", value: "" },
  { label: "Chest", value: "Chest" },
  { label: "Back", value: "Back" },
  { label: "Shoulders", value: "Shoulders" },
  { label: "Arms", value: "Arms" },
  { label: "Legs", value: "Legs" },
  { label: "Core", value: "Core" },
  { label: "Cardio", value: "Cardio" },
]

export default function WorkoutPlanExercisesDetailScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const planId = route?.params?.planId
  const planName = route?.params?.planName
  const exerciseId = route?.params?.exerciseId

  const [exercises, setExercises] = useState([])
  const [filteredExercises, setFilteredExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [sessionCount, setSessionCount] = useState(0)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("")
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (planId) {
      fetchExercisesDetail()
    }
    loadSessionCount()
  }, [planId])

  useEffect(() => {
    filterExercises()
  }, [exercises, searchTerm, selectedDifficulty, selectedMuscleGroup])

  const fetchExercisesDetail = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Get exercises from plan
      const res = await getExercisesByPlanId(planId, { pageNumber: 1, pageSize: 50 })
      let planExercises = res?.data?.exercises || []

      // If exerciseId is provided, filter to that specific exercise
      if (exerciseId) {
        planExercises = planExercises.filter((e) => e.exerciseId === exerciseId)
      }

      const exerciseIds = planExercises.map((e) => e.exerciseId)
      if (exerciseIds.length === 0) {
        setExercises([])
        setLoading(false)
        return
      }

      // 2. Always fetch each exercise by ID for accurate mediaUrl/details
      const detailList = await Promise.all(
        exerciseIds.map(async (id) => {
          try {
            const detail = await workoutService.getExerciseById(id)
            return detail || null
          } catch {
            return null
          }
        }),
      )

      // 3. Merge plan exercise data with detailed exercise data
      const detailWithPlan = detailList
        .map((ex, idx) => {
          if (!ex) return null
          const planEx = planExercises.find((p) => p.exerciseId === ex.exerciseId)
          return {
            ...ex,
            ...planEx,
            mediaUrl:
              ex.mediaUrl ||
              `https://source.unsplash.com/400x250/?fitness,${ex.exerciseName || "workout"}`,
          }
        })
        .filter(Boolean)

      setExercises(detailWithPlan)
    } catch (e) {
      setError(e?.message || "Failed to load exercises")
    } finally {
      setLoading(false)
    }
  }

  const loadSessionCount = async () => {
    try {
      const storedExercises = await AsyncStorage.getItem("scheduledExercises")
      const scheduledExercises = storedExercises ? JSON.parse(storedExercises) : []
      setSessionCount(scheduledExercises.length)
    } catch (e) {
    }
  }

  const filterExercises = () => {
    let filtered = exercises

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(
        (exercise) =>
          exercise.exerciseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exercise.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by difficulty
    if (selectedDifficulty) {
      filtered = filtered.filter((exercise) => exercise.difficulty === selectedDifficulty)
    }

    // Filter by muscle group
    if (selectedMuscleGroup) {
      filtered = filtered.filter((exercise) => exercise.muscleGroup === selectedMuscleGroup)
    }

    setFilteredExercises(filtered)
  }

  const addToSession = async (exercise) => {
    try {
      const storedExercises = await AsyncStorage.getItem("scheduledExercises")
      const scheduledExercises = storedExercises ? JSON.parse(storedExercises) : []

      // Check for duplicates
      if (scheduledExercises.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        showErrorFetchAPI(`${exercise.exerciseName} is already in your workout session!`)
        return
      }

      // Ensure mediaUrl is always present
      const exerciseToSave = {
        ...exercise,
        mediaUrl: exercise.mediaUrl || "",
      }

      scheduledExercises.push(exerciseToSave)
      await AsyncStorage.setItem("scheduledExercises", JSON.stringify(scheduledExercises))
      setSessionCount(scheduledExercises.length)

      showSuccessMessage(`${exercise.exerciseName} added to workout session!`)
    } catch (e) {
      showErrorFetchAPI("Unable to add to workout session.")
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedDifficulty("")
    setSelectedMuscleGroup("")
  }

  const getDifficultyColor = (difficulty) => {
    const option = DIFFICULTY_OPTIONS.find((opt) => opt.value.toLowerCase() === difficulty?.toLowerCase())
    return option ? option.color : "#6B7280"
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (selectedDifficulty) count++
    if (selectedMuscleGroup) count++
    return count
  }

  const formatDuration = (minutes) => {
    if (!minutes) return "N/A"
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  const formatRestTime = (seconds) => {
    if (!seconds) return "N/A"
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }

  const renderFilterModal = () => (
    <Modal visible={showFilters} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          {/* Modal Header */}
          <View style={styles.filterHeader}>
            <View style={styles.filterHeaderLeft}>
              <View style={styles.filterIconContainer}>
                <Ionicons name="options" size={24} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.filterTitle}>Exercise Filters</Text>
                <Text style={styles.filterSubtitle}>Refine your exercise selection</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            {/* Difficulty Filter */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="trending-up" size={20} color="#4F46E5" />
                <Text style={styles.filterLabel}>Difficulty Level</Text>
              </View>
              <View style={styles.optionsGrid}>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      selectedDifficulty === option.value && styles.optionButtonSelected,
                      { borderColor: option.color },
                    ]}
                    onPress={() => setSelectedDifficulty(option.value)}
                  >
                    <View style={[styles.optionDot, { backgroundColor: option.color }]} />
                    <Text style={[styles.optionText, selectedDifficulty === option.value && styles.optionTextSelected]}>
                      {option.label}
                    </Text>
                    {selectedDifficulty === option.value && <Ionicons name="checkmark" size={16} color="#4F46E5" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Muscle Group Filter */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="body" size={20} color="#4F46E5" />
                <Text style={styles.filterLabel}>Muscle Groups</Text>
              </View>
              <View style={styles.muscleGrid}>
                {MUSCLE_GROUP_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.muscleOption, selectedMuscleGroup === option.value && styles.muscleOptionSelected]}
                    onPress={() => setSelectedMuscleGroup(option.value)}
                  >
                    <Text
                      style={[
                        styles.muscleOptionText,
                        selectedMuscleGroup === option.value && styles.muscleOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Filter Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="refresh" size={20} color="#6B7280" />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  // Helper component for robust image fallback
  const FALLBACK_IMAGE = "https://source.unsplash.com/400x250/?fitness,workout"

  // Helper component for robust image fallback
  const ExerciseImage = ({ uri, name }) => {
    const [error, setError] = useState(false)
    const fallbackUrl = FALLBACK_IMAGE + (name ? `,${encodeURIComponent(name)}` : "")
    return (
      <Image
        source={{ uri: !error && uri ? uri : fallbackUrl }}
        style={styles.exerciseImage}
        onError={() => setError(true)}
        resizeMode="cover"
      />
    )
  }

  const renderExerciseItem = ({ item, index }) => (
    <View style={[styles.exerciseCard, { marginTop: index === 0 ? 0 : 20 }]}>
      {/* Exercise Image with fallback */}
      <View style={styles.imageContainer}>
        <ExerciseImage uri={item.mediaUrl} name={item.exerciseName} />
        {item.difficulty && (
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        )}
      </View>

      {/* Exercise Content */}
      <View style={styles.exerciseContent}>
        <View style={styles.exerciseHeader}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {item.exerciseName}
          </Text>
          {item.muscleGroup && (
            <View style={styles.muscleGroupBadge}>
              <Text style={styles.muscleGroupText}>{item.muscleGroup}</Text>
            </View>
          )}
        </View>

        <Text style={styles.exerciseDescription} numberOfLines={3}>
          {item.description || "No description available"}
        </Text>

        {/* Exercise Stats */}
        <View style={styles.exerciseStats}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="repeat" size={16} color="#10B981" />
              <Text style={styles.statLabel}>Sets</Text>
              <Text style={styles.statValue}>{item.sets || "N/A"}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="fitness" size={16} color="#3B82F6" />
              <Text style={styles.statLabel}>Reps</Text>
              <Text style={styles.statValue}>{item.reps || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Ionicons name="time" size={16} color="#F59E0B" />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{formatDuration(item.durationMinutes)}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="pause" size={16} color="#8B5CF6" />
              <Text style={styles.statLabel}>Rest</Text>
              <Text style={styles.statValue}>{formatRestTime(item.restTimeSeconds)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text" size={16} color="#6B7280" />
            <Text style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}

        {/* Add to Session Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => addToSession(item)}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add to Workout Session</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  // Robust image fallback for single exercise detail
  const ExerciseDetailCard = ({ item }) => {
    const [imgError, setImgError] = useState(false)
    const fallbackUrl = `https://source.unsplash.com/400x250/?fitness,${item.exerciseName || "workout"}`
    return (
      <View style={[styles.exerciseCard, { marginTop: 0 }]}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: !imgError ? item.mediaUrl : fallbackUrl }}
            style={styles.exerciseImage}
            onError={() => setImgError(true)}
          />
          {item.difficulty && (
            <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
              <Text style={styles.difficultyText}>{item.difficulty}</Text>
            </View>
          )}
        </View>
        <View style={styles.exerciseContent}>
          <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName} numberOfLines={2}>
              {item.exerciseName}
            </Text>
            {item.muscleGroup && (
              <View style={styles.muscleGroupBadge}>
                <Text style={styles.muscleGroupText}>{item.muscleGroup}</Text>
              </View>
            )}
          </View>
          <Text style={styles.exerciseDescription} numberOfLines={3}>
            {item.description || "No description available"}
          </Text>
          <View style={styles.exerciseStats}>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Ionicons name="repeat" size={16} color="#10B981" />
                <Text style={styles.statLabel}>Sets</Text>
                <Text style={styles.statValue}>{item.sets || "N/A"}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="fitness" size={16} color="#3B82F6" />
                <Text style={styles.statLabel}>Reps</Text>
                <Text style={styles.statValue}>{item.reps || "N/A"}</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color="#F59E0B" />
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{formatDuration(item.durationMinutes)}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="pause" size={16} color="#8B5CF6" />
                <Text style={styles.statLabel}>Rest</Text>
                <Text style={styles.statValue}>{formatRestTime(item.restTimeSeconds)}</Text>
              </View>
            </View>
          </View>
          {item.notes && (
            <View style={styles.notesContainer}>
              <Ionicons name="document-text" size={16} color="#6B7280" />
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.addButton} onPress={() => addToSession(item)}>
            <Ionicons name="add-circle" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add to Workout Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="barbell-outline" size={64} color="#C7D2FE" />
      </View>
      <Text style={styles.emptyTitle}>No Exercises Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchTerm || selectedDifficulty || selectedMuscleGroup
          ? "Try adjusting your search or filters"
          : "This workout plan doesn't have any exercises yet"}
      </Text>
      {(searchTerm || selectedDifficulty || selectedMuscleGroup) && (
        <TouchableOpacity style={styles.emptyActionButton} onPress={clearFilters}>
          <Ionicons name="refresh" size={20} color="#4F46E5" />
          <Text style={styles.emptyActionText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FCA5A5" />
      </View>
      <Text style={styles.errorTitle}>Unable to Load Exercises</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchExercisesDetail}>
        <Ionicons name="refresh" size={20} color="#4F46E5" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exerciseId ? "Exercise Details" : planName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {exerciseId ? "Detailed exercise information" : "Workout plan exercises"}
          </Text>
        </View>
        <TouchableOpacity style={styles.sessionButton} onPress={() => navigation.navigate("WorkoutSessionScreen")}>
          <Ionicons name="play-circle" size={24} color="#4F46E5" />
          {sessionCount > 0 && (
            <View style={styles.sessionBadge}>
              <Text style={styles.sessionBadgeText}>{sessionCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search and Filter Bar */}
      {!exerciseId && (
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterButton, getActiveFiltersCount() > 0 && styles.filterButtonActive]}
            onPress={() => setShowFilters(true)}
          >
            <Ionicons name="options" size={20} color={getActiveFiltersCount() > 0 ? "#fff" : "#4F46E5"} />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Active Filters */}
      {!exerciseId && (selectedDifficulty || selectedMuscleGroup) && (
        <View style={styles.activeFilters}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContainer}
          >
            {selectedDifficulty && (
              <View style={[styles.filterChip, { borderColor: getDifficultyColor(selectedDifficulty) }]}>
                <View style={[styles.chipDot, { backgroundColor: getDifficultyColor(selectedDifficulty) }]} />
                <Text style={styles.filterChipText}>{selectedDifficulty}</Text>
                <TouchableOpacity onPress={() => setSelectedDifficulty("")}>
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {selectedMuscleGroup && (
              <View style={styles.filterChip}>
                <Ionicons name="body" size={14} color="#4F46E5" />
                <Text style={styles.filterChipText}>{selectedMuscleGroup}</Text>
                <TouchableOpacity onPress={() => setSelectedMuscleGroup("")}>
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <Loading />
        ) : error ? (
          renderErrorState()
        ) : exercises.length === 1 && exerciseId ? (
          // Single exercise detail view
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            <ExerciseDetailCard item={exercises[0]} />
          </ScrollView>
        ) : filteredExercises.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.exerciseId?.toString() || Math.random().toString()}
            renderItem={renderExerciseItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Filter Modal */}
      {renderFilterModal()}

      {/* Floating Action Button for Workout Session */}
      <TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate("WorkoutSessionScreen")}>
        <Ionicons name="play" size={24} color="#fff" />
        {sessionCount > 0 && (
          <View style={styles.floatingBadge}>
            <Text style={styles.floatingBadgeText}>{sessionCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  sessionButton: {
    position: "relative",
    padding: 8,
  },
  sessionBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
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
  filterButton: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#4F46E5",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  activeFilters: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterChipsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  listContainer: {
    paddingBottom: 100,
  },
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  imageContainer: {
    position: "relative",
  },
  exerciseImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#F1F5F9",
  },
  difficultyBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exerciseContent: {
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  exerciseName: {
    flex: 1,
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 28,
    marginRight: 12,
  },
  muscleGroupBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  muscleGroupText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  exerciseDescription: {
    fontSize: 16,
    color: "#64748B",
    lineHeight: 24,
    marginBottom: 20,
    fontWeight: "500",
  },
  exerciseStats: {
    gap: 12,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "700",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
    fontWeight: "500",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  floatingButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#4F46E5",
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  floatingBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  floatingBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    backgroundColor: "#EEF2FF",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: "500",
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: "500",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#4F46E5",
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  filterIconContainer: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 8,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  filterSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  closeButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 8,
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  optionsGrid: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  optionButtonSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  optionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: "#475569",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  muscleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  muscleOption: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  muscleOptionSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  muscleOptionText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  muscleOptionTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  clearButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  applyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
})
