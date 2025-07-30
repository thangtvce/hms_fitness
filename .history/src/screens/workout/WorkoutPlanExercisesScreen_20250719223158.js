
import { useEffect, useState } from "react"
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
  StatusBar,
} from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { Ionicons } from "@expo/vector-icons"
import Header from "components/Header"
import { useNavigation } from "@react-navigation/native"
import { getExercisesByPlanId } from "services/apiWorkoutPlanService"
import { workoutService } from "services/apiWorkoutService"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaView } from "react-native-safe-area-context"

const { width: screenWidth } = Dimensions.get("window")

const DIFFICULTY_OPTIONS = [
  { label: "All Levels", value: "", color: "#64748B", icon: "list" },
  { label: "Beginner", value: "Beginner", color: "#10B981", icon: "leaf" },
  { label: "Intermediate", value: "Intermediate", color: "#F59E0B", icon: "flash" },
  { label: "Advanced", value: "Advanced", color: "#EF4444", icon: "flame" },
]

const MUSCLE_GROUP_OPTIONS = [
  { label: "All Groups", value: "", icon: "body" },
  { label: "Chest", value: "Chest", icon: "fitness" },
  { label: "Back", value: "Back", icon: "barbell" },
  { label: "Shoulders", value: "Shoulders", icon: "triangle" },
  { label: "Arms", value: "Arms", icon: "hand-left" },
  { label: "Legs", value: "Legs", icon: "walk" },
  { label: "Core", value: "Core", icon: "ellipse" },
  { label: "Cardio", value: "Cardio", icon: "heart" },
]

const SORT_OPTIONS = [
  { label: "Name A-Z", value: "name_asc", icon: "text" },
  { label: "Name Z-A", value: "name_desc", icon: "text" },
  { label: "Duration", value: "duration", icon: "time" },
  { label: "Difficulty", value: "difficulty", icon: "trending-up" },
]

const ExerciseImage = ({ uri, name, style }) => {
  const [error, setError] = useState(false)
  // Đường dẫn ảnh fallback nội bộ
  const fallbackLocal = require("../../../assets/images/workout-hero.jpeg")

  return (
    <Image
      source={(!error && uri) ? { uri } : fallbackLocal}
      style={style}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  )
}

const FilterChip = ({ label, isActive, onPress, icon, color }) => (
  <TouchableOpacity
    style={[styles.filterChip, isActive && { backgroundColor: color || "#4F46E5", borderColor: color || "#4F46E5" }]}
    onPress={onPress}
  >
    {icon && <Ionicons name={icon} size={16} color={isActive ? "#fff" : color || "#64748B"} />}
    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
)

const ExerciseDetailModal = ({ visible, exercise, onClose, onAddToSession }) => {
  if (!exercise) return null

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalContent, { height: '70%', width: '100%', borderRadius: 24 }]}> 
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header Image */}
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

            {/* Content */}
            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>{exercise.exerciseName}</Text>

              {exercise.muscleGroup && (
                <View style={styles.modalMuscleGroup}>
                  <Ionicons name="body" size={16} color="#4F46E5" />
                  <Text style={styles.modalMuscleGroupText}>{exercise.muscleGroup}</Text>
                </View>
              )}

              {exercise.description && (
                <View style={styles.modalDescription}>
                  <Text style={styles.modalDescriptionTitle}>Description</Text>
                  <Text style={styles.modalDescriptionText}>{exercise.description}</Text>
                </View>
              )}

              {/* Stats Grid */}
              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStatCard}>
                  <View style={[styles.modalStatIcon, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="repeat" size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.modalStatValue}>{exercise.sets || "N/A"}</Text>
                  <Text style={styles.modalStatLabel}>Sets</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <View style={[styles.modalStatIcon, { backgroundColor: "#DBEAFE" }]}>
                    <Ionicons name="fitness" size={20} color="#3B82F6" />
                  </View>
                  <Text style={styles.modalStatValue}>{exercise.reps || "N/A"}</Text>
                  <Text style={styles.modalStatLabel}>Reps</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <View style={[styles.modalStatIcon, { backgroundColor: "#D1FAE5" }]}>
                    <Ionicons name="time" size={20} color="#10B981" />
                  </View>
                  <Text style={styles.modalStatValue}>
                    {exercise.durationMinutes ? `${exercise.durationMinutes}m` : "N/A"}
                  </Text>
                  <Text style={styles.modalStatLabel}>Duration</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <View style={[styles.modalStatIcon, { backgroundColor: "#F3E8FF" }]}>
                    <Ionicons name="pause" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={styles.modalStatValue}>
                    {exercise.restTimeSeconds ? `${exercise.restTimeSeconds}s` : "N/A"}
                  </Text>
                  <Text style={styles.modalStatLabel}>Rest</Text>
                </View>
              </View>

              {exercise.notes && (
                <View style={styles.modalNotes}>
                  <Ionicons name="document-text" size={20} color="#F59E0B" />
                  <Text style={styles.modalNotesText}>{exercise.notes}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.modalAddButton, { backgroundColor: '#0056d2' }]}
                onPress={() => {
                  onAddToSession(exercise)
                  onClose()
                }}
              >
                <Ionicons name="add-circle" size={24} color="#fff" />
                <Text style={styles.modalAddButtonText}>Add to Workout</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export default function WorkoutPlanExercisesScreen({ route }) {
  const navigation = useNavigation()
  const planId = route?.params?.planId
  const planName = route?.params?.planName

  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Pagination states
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("")
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("")
  const [sortBy, setSortBy] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  // Modal states
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [sessionCount, setSessionCount] = useState(0)

  useEffect(() => {
    if (planId) {
      fetchExercises()
    }
    loadSessionCount()
  }, [planId, page, pageSize, searchTerm, selectedDifficulty, selectedMuscleGroup, sortBy])

  const loadSessionCount = async () => {
    try {
      const stored = await AsyncStorage.getItem("scheduledExercises")
      const arr = stored ? JSON.parse(stored) : []
      setSessionCount(arr.length)
    } catch {}
  }

  const fetchExercises = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
      setPage(1)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const params = {
        pageNumber: isRefresh ? 1 : page,
        pageSize: pageSize,
      }

      if (searchTerm.trim()) params.searchTerm = searchTerm.trim()
      if (selectedDifficulty) params.difficulty = selectedDifficulty
      if (selectedMuscleGroup) params.muscleGroup = selectedMuscleGroup
      if (sortBy) params.sortBy = sortBy

      const res = await getExercisesByPlanId(planId, params)
      const planExercises = res?.data?.exercises || []
      setTotalPages(res?.data?.totalPages || 1)

      const detailedExercises = await Promise.all(
        planExercises.map(async (ex) => {
          try {
            const detail = await workoutService.getExerciseById(ex.exerciseId)
            return { ...detail, ...ex, mediaUrl: detail.mediaUrl || ex.mediaUrl }
          } catch (e) {
            return { ...ex }
          }
        }),
      )
      setExercises(detailedExercises)
    } catch (e) {
      setError(e?.message || "Failed to load exercises")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchExercises(true)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedDifficulty("")
    setSelectedMuscleGroup("")
    setSortBy("")
    setPage(1)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (selectedDifficulty) count++
    if (selectedMuscleGroup) count++
    if (sortBy) count++
    return count
  }

  const addToSession = async (exercise) => {
    try {
      const stored = await AsyncStorage.getItem("scheduledExercises")
      const arr = stored ? JSON.parse(stored) : []
      if (arr.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        showErrorFetchAPI("Exercise already added to workout!")
        return
      }
      arr.push(exercise)
      await AsyncStorage.setItem("scheduledExercises", JSON.stringify(arr))
      setSessionCount(arr.length)
      showSuccessMessage("Added to workout!")
    } catch (error) {
      showErrorFetchAPI("Error adding to workout!", error)
      throw error
    }
  }

  const renderFilterModal = () => (
    <Modal visible={showFilters} transparent animationType="slide">
      <View style={styles.filterModalOverlay}>
        <TouchableOpacity style={styles.filterModalBackdrop} onPress={() => setShowFilters(false)} />
        <View style={styles.filterModalContent}>
          {/* Header */}
          <View style={styles.filterModalHeader}>
            <View style={styles.filterModalHeaderLeft}>
              <View style={styles.filterModalIcon}>
                <Ionicons name="options" size={24} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.filterModalTitle}>Filter & Sort</Text>
                <Text style={styles.filterModalSubtitle}>Customize your exercise view</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.filterModalClose} onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            {/* Difficulty Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Difficulty Level</Text>
              <View style={styles.filterChipsContainer}>
                {DIFFICULTY_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    color={option.color}
                    isActive={selectedDifficulty === option.value}
                    onPress={() => setSelectedDifficulty(option.value)}
                  />
                ))}
              </View>
            </View>

            {/* Muscle Group Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Muscle Groups</Text>
              <View style={styles.filterChipsContainer}>
                {MUSCLE_GROUP_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    isActive={selectedMuscleGroup === option.value}
                    onPress={() => setSelectedMuscleGroup(option.value)}
                  />
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sort By</Text>
              <View style={styles.filterChipsContainer}>
                {SORT_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    icon={option.icon}
                    isActive={sortBy === option.value}
                    onPress={() => setSortBy(option.value)}
                  />
                ))}
              </View>
            </View>

            {/* Items per page */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Items per Page</Text>
              <View style={styles.pageSizeContainer}>
                {[5, 10, 20, 50].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.pageSizeButton, pageSize === size && styles.pageSizeButtonActive]}
                    onPress={() => {
                      setPageSize(size)
                      setPage(1)
                    }}
                  >
                    <Text style={[styles.pageSizeButtonText, pageSize === size && styles.pageSizeButtonTextActive]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.filterModalActions}>
            <TouchableOpacity style={styles.filterClearButton} onPress={clearFilters}>
              <Ionicons name="refresh" size={20} color="#64748B" />
              <Text style={styles.filterClearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterApplyButton} onPress={() => setShowFilters(false)}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.filterApplyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderExerciseCard = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.exerciseCard, { marginBottom: 16 }]}
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
                e.stopPropagation()
                addToSession(item)
              }}
            >
              <Ionicons name="add" size={22} color="#0056d2" />
            </TouchableOpacity>
          </View>
          {/* Thông tin: sets, reps */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
            {item.kcal && (
              <Text style={{ fontSize: 13, color: '#666', marginRight: 10 }}>{item.kcal} kcal</Text>
            )}
            {item.sets !== undefined && (
              <Text style={{ fontSize: 13, color: '#666', marginRight: 10 }}>Sets: {item.sets}</Text>
            )}
            {item.reps !== undefined && (
              <Text style={{ fontSize: 13, color: '#666', marginRight: 10 }}>Reps: {item.reps}</Text>
            )}
          </View>
          {/* duration và rest cùng hàng riêng */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            {item.durationMinutes !== undefined && (
              <Text style={{ fontSize: 13, color: '#666', marginRight: 10 }}>Duration: {item.durationMinutes}m</Text>
            )}
            {item.restTimeSeconds !== undefined && (
              <Text style={{ fontSize: 13, color: '#666' }}>Rest: {item.restTimeSeconds}s</Text>
            )}
          </View>
        </View>
      </View>
      {/* Hàng cuối: trái là ngày tạo, phải là note */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginTop: 2, marginRight: 16, marginBottom: 2 }}>
        <Text style={{ fontSize: 13, color: '#888' }}>
          {item.createdAt ? `Created by: ${new Date(item.createdAt).toLocaleDateString('vi-VN')}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          disabled={page === 1}
          onPress={() => setPage(page - 1)}
          style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
        >
          <Ionicons name="chevron-back" size={20} color={page === 1 ? "#CBD5E1" : "#4F46E5"} />
          <Text style={[styles.paginationButtonText, page === 1 && styles.paginationButtonTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        <View style={styles.paginationInfo}>
          <Text style={styles.paginationInfoText}>
            Page {page} of {totalPages}
          </Text>
          <Text style={styles.paginationInfoSubtext}>{exercises.length} exercises</Text>
        </View>

        <TouchableOpacity
          disabled={page === totalPages}
          onPress={() => setPage(page + 1)}
          style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
        >
          <Text style={[styles.paginationButtonText, page === totalPages && styles.paginationButtonTextDisabled]}>
            Next
          </Text>
          <Ionicons name="chevron-forward" size={20} color={page === totalPages ? "#CBD5E1" : "#4F46E5"} />
        </TouchableOpacity>
      </View>
    )
  }

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
  )

  const renderErrorState = () => (
    <View style={styles.errorState}>
      <View style={styles.errorStateIcon}>
        <Ionicons name="alert-circle-outline" size={64} color="#FCA5A5" />
      </View>
      <Text style={styles.errorStateTitle}>Unable to Load Exercises</Text>
      <Text style={styles.errorStateSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.errorStateButton} onPress={() => fetchExercises()}>
        <Ionicons name="refresh" size={20} color="#EF4444" />
        <Text style={styles.errorStateButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <Header
        title={planName || "Workout Plan"}
        onBack={() => navigation.goBack()}
        backgroundColor="#fff"
        rightActions={[
          {
            icon: (
              <View style={[styles.headerButton, sessionCount > 0 && styles.headerButtonActive]}> 
                <Ionicons name="play" size={20} color={sessionCount > 0 ? "#fff" : "#4F46E5"} />
                {sessionCount > 0 && (
                  <View style={styles.headerButtonBadge}>
                    <Text style={styles.headerButtonBadgeText}>{sessionCount}</Text>
                  </View>
                )}
              </View>
            ),
            onPress: () => navigation.navigate("WorkoutPlanExerciseSessionScreen"),
          },
        ]}
      />

      {/* Search Bar */}
      <View style={[styles.searchContainer, { marginTop: 50 }]}> 
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text)
              setPage(1)
            }}
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
            <View style={styles.filterButtonBadge}>
              <Text style={styles.filterButtonBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
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

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <Loading />
        ) : error ? (
          renderErrorState()
        ) : exercises.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <FlatList
              data={exercises}
              keyExtractor={(item) => item.planExerciseId?.toString() || item.exerciseId?.toString()}
              renderItem={renderExerciseCard}
              contentContainerStyle={styles.exercisesList}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
            {renderPagination()}
          </>
        )}
      </View>

      {/* Modals */}
      {renderFilterModal()}
      <ExerciseDetailModal
        visible={!!selectedExercise}
        exercise={selectedExercise}
        onClose={() => setSelectedExercise(null)}
        onAddToSession={addToSession}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Header
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
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  headerButton: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 12,
    position: "relative",
  },
  headerButtonActive: {
    backgroundColor: "#4F46E5",
  },
  headerButtonBadge: {
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
  headerButtonBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  // Search
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
  filterButtonBadge: {
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
  filterButtonBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  // Active Filters
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

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  exercisesList: {
    paddingBottom: 20,
  },

  // Exercise Card
  exerciseCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
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
  exerciseCardFavorite: {
    padding: 4,
  },
  exerciseCardDifficulty: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  exerciseCardDifficultyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
  },
  exerciseCardMuscleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exerciseCardMuscleGroupText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "600",
  },
  exerciseCardStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  exerciseCardStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exerciseCardStatText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  exerciseCardAddButton: {
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  exerciseCardAddButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // Pagination
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 4,
  },
  paginationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  paginationButtonDisabled: {
    backgroundColor: "#F8FAFC",
    shadowOpacity: 0,
    elevation: 0,
  },
  paginationButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4F46E5",
  },
  paginationButtonTextDisabled: {
    color: "#CBD5E1",
  },
  paginationInfo: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  paginationInfoText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  paginationInfoSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },

  // States
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

  // Filter Modal
  filterModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  filterModalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  filterModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterModalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  filterModalIcon: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 8,
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  filterModalSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  filterModalClose: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 8,
  },
  filterModalBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  filterSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 16,
  },
  filterChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  filterChipText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  pageSizeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  pageSizeButton: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 60,
    alignItems: "center",
  },
  pageSizeButtonActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  pageSizeButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  pageSizeButtonTextActive: {
    color: "#fff",
  },
  filterModalActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  filterClearButton: {
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
  filterClearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  filterApplyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  filterApplyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },

  // Exercise Detail Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
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
    width: '100%',
    height: '70%',
    maxHeight: '70%',
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
    marginBottom: 24,
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
  modalStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  modalStatCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  modalStatIcon: {
    borderRadius: 12,
    padding: 8,
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalStatLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  modalNotes: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  modalNotesText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
    fontWeight: "500",
  },
  modalAddButton: {
    // backgroundColor sẽ override bằng inline style
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
})
