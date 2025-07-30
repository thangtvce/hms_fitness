import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  ImageBackground,
  StatusBar,
} from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { Ionicons } from "@expo/vector-icons"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { workoutService } from "services/apiWorkoutService"
import { useAuth } from "context/AuthContext"

const { width: screenWidth, height: screenHeight } = Dimensions.get("window")
const FALLBACK_IMAGE = require("../../../assets/images/workout-hero.jpeg")
const ITEMS_PER_PAGE = 8

const ExerciseImage = ({ uri, style }) => {
  const [error, setError] = useState(false)
  return (
    <Image
      source={(!error && uri) ? { uri } : FALLBACK_IMAGE}
      style={[styles.exerciseImage, style]}
      onError={() => setError(true)}
      resizeMode="cover"
    />
  )
}

const FilterChip = ({ label, isActive, onPress, icon }) => (
  <TouchableOpacity style={[styles.filterChip, isActive && styles.filterChipActive]} onPress={onPress}>
    {icon && <Ionicons name={icon} size={16} color={isActive ? "#fff" : "#64748B"} />}
    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{label}</Text>
  </TouchableOpacity>
)

const ExerciseDetailModal = ({ visible, exercise, onClose, onRemove }) => {
  if (!exercise) return null

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{exercise.exerciseName}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <ExerciseImage uri={exercise.mediaUrl} name={exercise.exerciseName} style={styles.modalImage} />

            <View style={styles.modalBody}>
              {exercise.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>{exercise.description}</Text>
                </View>
              )}

              <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="repeat" size={20} color="#10B981" />
                    <Text style={styles.statLabel}>Sets</Text>
                    <Text style={styles.statValue}>{exercise.sets || "N/A"}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="fitness" size={20} color="#3B82F6" />
                    <Text style={styles.statLabel}>Reps</Text>
                    <Text style={styles.statValue}>{exercise.reps || "N/A"}</Text>
                  </View>
                </View>
                <View style={styles.statRow}>
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={20} color="#F59E0B" />
                    <Text style={styles.statLabel}>Duration</Text>
                    <Text style={styles.statValue}>{exercise.durationMinutes || "N/A"}m</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="flame" size={20} color="#EF4444" />
                    <Text style={styles.statLabel}>Calories</Text>
                    <Text style={styles.statValue}>{exercise.calories || "N/A"}</Text>
                  </View>
                </View>
              </View>

              {exercise.notes && (
                <View style={styles.notesContainer}>
                  <Ionicons name="document-text" size={20} color="#F59E0B" />
                  <Text style={styles.notesText}>{exercise.notes}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => {
                  onRemove(exercise.exerciseId)
                  onClose()
                }}
              >
                <Ionicons name="trash" size={20} color="#fff" />
                <Text style={styles.removeButtonText}>Remove from session</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export default function WorkoutPlanExerciseSessionScreen() {
  const navigation = useNavigation()
  const { user } = useAuth()

  const [exercises, setExercises] = useState([])
  const [filteredExercises, setFilteredExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCalories, setTotalCalories] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal state
  const [selectedExercise, setSelectedExercise] = useState(null)
  const [modalVisible, setModalVisible] = useState(false)

  useEffect(() => {
    loadExercises()
  }, [])

  useFocusEffect(
    React.useCallback(() => {
      loadExercises()
    }, []),
  )

  useEffect(() => {
    const totalFilteredPages = Math.ceil(filteredExercises.length / ITEMS_PER_PAGE)
    setTotalPages(totalFilteredPages)
    if (currentPage > totalFilteredPages && totalFilteredPages > 0) {
      setCurrentPage(1)
    }
  }, [filteredExercises])

  const loadExercises = async () => {
    setLoading(true)
    try {
      const stored = await AsyncStorage.getItem("scheduledExercises")
      const arr = stored ? JSON.parse(stored) : []

      const detailed = await Promise.all(
        arr.map(async (ex) => {
          try {
            const detail = await workoutService.getExerciseById(ex.exerciseId)
            const calories =
              (detail.caloriesBurnedPerMin || 0) * (ex.durationMinutes || detail.durationMinutes || 0) * (ex.sets || 1)
            return {
              ...ex,
              ...detail,
              calories,
              category: detail.category || getExerciseCategory(detail.exerciseName || ex.exerciseName),
            }
          } catch {
            return {
              ...ex,
              category: getExerciseCategory(ex.exerciseName),
            }
          }
        }),
      )

      setExercises(detailed)
      setFilteredExercises(detailed)
      calculateTotals(detailed)
    } catch {
      setExercises([])
      setTotalCalories(0)
      setTotalDuration(0)
    } finally {
      setLoading(false)
    }
  }

  const getExerciseCategory = (exerciseName) => {
    const name = exerciseName?.toLowerCase() || ""
    if (name.includes("run") || name.includes("cardio") || name.includes("bike")) return "cardio"
    if (name.includes("stretch") || name.includes("yoga") || name.includes("flexibility")) return "flexibility"
    return "strength"
  }

  const calculateTotals = (exerciseList) => {
    let totalCalo = 0
    let totalDur = 0

    exerciseList.forEach((ex) => {
      const calo = Number(ex.calories)
      const dur = Number(ex.durationMinutes)
      if (!isNaN(calo) && calo > 0) totalCalo += calo
      if (!isNaN(dur) && dur > 0) totalDur += dur * (ex.sets || 1)
    })

    setTotalCalories(totalCalo)
    setTotalDuration(totalDur)
  }

  const removeExercise = async (exerciseId) => {
    const filtered = exercises.filter((ex) => ex.exerciseId !== exerciseId)
    await AsyncStorage.setItem("scheduledExercises", JSON.stringify(filtered))
    // Reload full data to ensure UI and pagination update correctly
    await loadExercises()
  }

  const clearAll = async () => {
    // No confirmation dialog, just clear and show success toast
    await AsyncStorage.removeItem("scheduledExercises")
    setExercises([])
    setFilteredExercises([])
    setTotalCalories(0)
    setTotalDuration(0)
    showSuccessMessage("All exercises removed from session!")
  }

  const handleStartSession = () => {
    if (!user?.userId) {
      showErrorFetchAPI("User information not found. Please log in again!")
      return
    }
    if (exercises.length === 0) {
      showErrorFetchAPI("Please add exercises to start!")
      return
    }
    navigation.navigate("WorkoutSessionActiveScreen", { exercises, userId: user.userId })
  }

  const handleExercisePress = (exercise) => {
    setSelectedExercise(exercise)
    setModalVisible(true)
  }

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    const endIndex = startIndex + ITEMS_PER_PAGE
    return filteredExercises.slice(startIndex, endIndex)
  }

  const renderExerciseItem = ({ item, index }) => (
    <View style={styles.exerciseCard}>
      <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} onPress={() => handleExercisePress(item)} activeOpacity={0.8}>
        <View style={styles.exerciseImageContainer}>
          <ExerciseImage uri={item.mediaUrl} name={item.exerciseName} style={styles.exerciseItemImage} />
        </View>

        <View style={styles.exerciseInfo}>
          <Text style={styles.exerciseName} numberOfLines={2}>
            {item.exerciseName?.toUpperCase() || "UNKNOWN EXERCISE"}
          </Text>

          <Text style={styles.exerciseDetail}>
            {item.durationMinutes
              ? `${item.durationMinutes} Min`
              : item.reps
                ? `x${item.reps}`
                : item.sets
                  ? `${item.sets} sets`
                  : "N/A"}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.exerciseRemoveButton}
        onPress={() => removeExercise(item.exerciseId)}
      >
        <Ionicons name="close" size={16} color="#666" />
      </TouchableOpacity>
    </View>
  )

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? "#CBD5E1" : "#64748B"} />
        </TouchableOpacity>

        <Text style={styles.pageInfo}>
          {currentPage} / {totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? "#CBD5E1" : "#64748B"} />
        </TouchableOpacity>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading />
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer}>
        {/* Hero Section with Background Image */}
        <View style={styles.heroSection}>
          <ImageBackground source={{ uri: "https://www.humangood.org/hs-fs/hubfs/AdobeStock_572805942.jpeg?width=6000&height=4000&name=AdobeStock_572805942.jpeg" }} style={styles.heroImage} resizeMode="cover">
            <SafeAreaView style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroButton}>
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </TouchableOpacity>

                <View style={styles.heroActions}>
                  <TouchableOpacity onPress={clearAll} style={styles.heroButton}>
                    <Ionicons name="trash-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </SafeAreaView>
          </ImageBackground>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {/* Day Title */}
          <Text style={styles.dayTitle}>DAY 1</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>{totalCalories} kcal</Text>
              <Text style={styles.statLabel}>Calorie</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>{totalDuration} Min</Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statColumn}>
              <Text style={styles.statValue}>Beginner</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
          </View>

          {/* Exercises Section */}
          <View style={styles.exercisesSection}>
            <Text style={styles.exercisesTitle}>{filteredExercises.length} Exercises</Text>

            {filteredExercises.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="barbell-outline" size={64} color="#C7D2FE" />
                <Text style={styles.emptyTitle}>
                  {exercises.length === 0 ? "No exercises yet" : "No exercises yet"}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {exercises.length === 0
                    ? "Please add exercises from the list to start the workout!"
                    : "Try adjusting your search keywords or filters"}
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={getPaginatedData()}
                  keyExtractor={(item) => item.exerciseId?.toString() || Math.random().toString()}
                  renderItem={renderExerciseItem}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
                />
                {renderPagination()}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Section with Settings and Start Button */}
      <SafeAreaView style={styles.bottomSection}>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={24} color="#666" />
          <Text style={styles.settingsText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.startButton, (!user?.userId || exercises.length === 0) && styles.startButtonDisabled]}
          onPress={handleStartSession}
          disabled={!user?.userId || exercises.length === 0}
        >
          <Text style={styles.startButtonText}>Start</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Exercise Detail Modal */}
      <ExerciseDetailModal
        visible={modalVisible}
        exercise={selectedExercise}
        onClose={() => setModalVisible(false)}
        onRemove={removeExercise}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flex: 1,
  },

  // Hero Section
  heroSection: {
    height: 300,
  },
  heroImage: {
    flex: 1,
    justifyContent: "flex-start",
  },
  heroContent: {
    flex: 1,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  heroButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(10px)",
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
  },

  // Content Section
  contentSection: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 120,
  },

  // Day Title
  dayTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#000",
    marginBottom: 32,
    letterSpacing: -2,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 40,
  },
  statColumn: {
    flex: 1,
    alignItems: "flex-start",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: "#999",
    fontWeight: "400",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E5E5",
    marginHorizontal: 20,
  },

  // Exercises Section
  exercisesSection: {
    flex: 1,
  },
  exercisesTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 24,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 16,
  },
  exerciseImageContainer: {
    marginRight: 16,
  },
  exerciseItemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#E5E5E5",
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  exerciseDetail: {
    fontSize: 16,
    color: "#666",
    fontWeight: "400",
  },
  exerciseRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
  },

  // Bottom Section
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16, // giảm padding ngang
    paddingVertical: 8, // giảm padding dọc cho nhỏ gọn
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12, // giảm gap
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 16, // giảm padding
    paddingVertical: 8, // giảm padding
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    minWidth: 80,
  },
  settingsText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginLeft: 8,
  },
  startButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24, // giảm padding
    paddingVertical: 10, // giảm padding
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#007AFF",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    minWidth: 100,
  },
  startButtonDisabled: {
    backgroundColor: "#CBD5E1",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },

  // Loading and Empty States
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
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
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
    fontWeight: "500",
  },

  // Pagination
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 20,
  },
  pageButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageInfo: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },

  // Modal Styles
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
    borderRadius: 20,
    width: screenWidth - 40,
    maxHeight: screenHeight * 0.8,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  modalImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#F1F5F9",
  },
  modalBody: {
    padding: 20,
  },
  descriptionContainer: {
    marginBottom: 20,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  statRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  notesContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  removeButton: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  exerciseImage: {
    backgroundColor: "#F1F5F9",
  },
})
