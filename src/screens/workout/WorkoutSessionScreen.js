"use client"

import { useState,useEffect,useRef } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Modal,
  TextInput,
  ScrollView,
  Image,
} from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import Header from "components/Header"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width,height } = Dimensions.get("window")

const WorkoutSessionScreen = () => {
  const navigation = useNavigation()
  const [scheduledExercises,setScheduledExercises] = useState([])
  const [filteredExercises,setFilteredExercises] = useState([])
  const [currentExerciseIndex,setCurrentExerciseIndex] = useState(-1)
  const [isPlaying,setIsPlaying] = useState(false)
  const [timer,setTimer] = useState(0)
  const [isWorkoutStarted,setIsWorkoutStarted] = useState(false)
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState(null)
  const [activeTab,setActiveTab] = useState("exercises")
  const [filterModalVisible,setFilterModalVisible] = useState(false)
  const [workoutStats,setWorkoutStats] = useState({
    totalCalories: 0,
    totalDuration: 0,
    exerciseCount: 0,
  })
  const [filters,setFilters] = useState({
    searchTerm: "",
    minCalories: "",
    maxCalories: "",
    gender: "",
    sortBy: "name",
    sortOrder: "asc",
  })

  const timerRef = useRef(null)
  const videoRef = useRef(null)
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const sessionStartTimeRef = useRef(null)

  // Get current day of month
  const getCurrentDay = () => {
    const today = new Date()
    return today.getDate()
  }

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
    ]).start()
    loadScheduledExercises()
    const unsubscribe = navigation.addListener("focus",() => {
      loadScheduledExercises()
    })
    return unsubscribe
  },[])

  useEffect(() => {
    if (isPlaying && isWorkoutStarted) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev + 1)
      },1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  },[isPlaying,isWorkoutStarted])

  useEffect(() => {
    applyFilters()
    calculateWorkoutStats()
  },[scheduledExercises,filters])

  const loadScheduledExercises = async () => {
    try {
      const storedExercises = await AsyncStorage.getItem("scheduledExercises")
      if (storedExercises) {
        const exercises = JSON.parse(storedExercises)
        console.log("Loaded scheduledExercises:",exercises)
        setScheduledExercises(exercises)
        setFilteredExercises(exercises)
      } else {
        console.log("No scheduledExercises found in AsyncStorage.")
      }
      setLoading(false)
    } catch (err) {
      setError("Failed to load scheduled exercises")
      setLoading(false)
      console.log("Error loading scheduledExercises:",err)
    }
  }

  const saveScheduledExercises = async (exercises) => {
    try {
      await AsyncStorage.setItem("scheduledExercises",JSON.stringify(exercises))
    } catch (err) {
      setError("Failed to save scheduled exercises")
    }
  }

  const applyFilters = () => {
    let filtered = [...scheduledExercises]
    if (filters.searchTerm) {
      filtered = filtered.filter((exercise) =>
        exercise.exerciseName.toLowerCase().includes(filters.searchTerm.toLowerCase()),
      )
    }
    if (filters.minCalories) {
      filtered = filtered.filter((exercise) => exercise.caloriesBurnedPerMin >= Number.parseInt(filters.minCalories))
    }
    if (filters.maxCalories) {
      filtered = filtered.filter((exercise) => exercise.caloriesBurnedPerMin <= Number.parseInt(filters.maxCalories))
    }
    if (filters.gender) {
      filtered = filtered.filter((exercise) => exercise.genderSpecific === filters.gender)
    }
    filtered.sort((a,b) => {
      let comparison = 0
      switch (filters.sortBy) {
        case "calories":
          comparison = a.caloriesBurnedPerMin - b.caloriesBurnedPerMin
          break
        case "duration":
          comparison = (a.duration || 0) - (b.duration || 0)
          break
        default:
          comparison = a.exerciseName.localeCompare(b.exerciseName)
      }
      return filters.sortOrder === "asc" ? comparison : -comparison
    })
    setFilteredExercises(filtered)
  }

  const calculateWorkoutStats = () => {
    const totalCalories = scheduledExercises.reduce((sum,ex) => sum + ex.caloriesBurnedPerMin * (ex.duration || 1),0)
    const totalDuration = scheduledExercises.reduce((sum,ex) => sum + (ex.duration || 1),0)
    const exerciseCount = scheduledExercises.length
    setWorkoutStats({ totalCalories,totalDuration,exerciseCount })
  }

  const removeExercise = (exerciseId) => {
    const updatedExercises = scheduledExercises.filter((ex) => ex.exerciseId !== exerciseId)
    setScheduledExercises(updatedExercises)
    saveScheduledExercises(updatedExercises)
    showSuccessMessage("Exercise removed from session!")
  }

  const startWorkout = async () => {
    if (scheduledExercises.length === 0) {
      showErrorFetchAPI("No exercises scheduled")
      return
    }
    const startTimeVN = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString()
    await AsyncStorage.setItem("workoutSessionStartTime",startTimeVN)
    await AsyncStorage.setItem(
      "userActivityStartTimes",
      JSON.stringify([{ exerciseId: scheduledExercises[0].exerciseId,startTime: startTimeVN }]),
    )
    navigation.navigate("WorkoutInProgressScreen",{
      scheduledExercises,
      startTime: startTimeVN,
    })
  }

  // Helper function to get exercise image
  const getExerciseImage = (exercise) => {
    if (exercise.mediaUrl) {
      // If it's a YouTube URL, get thumbnail
      if (exercise.mediaUrl.includes("youtube.com") || exercise.mediaUrl.includes("youtu.be")) {
        const videoId = getYouTubeVideoId(exercise.mediaUrl)
        if (videoId) {
          return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
        }
      }
      // If it's a direct video/image URL
      return exercise.mediaUrl
    }
    // Default placeholder
    return null
  }

  const getYouTubeVideoId = (url) => {
    if (!url) return null
    const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
    const match = url.match(regex)
    return match ? match[1] : null
  }

  const renderScheduledExerciseItem = ({ item,index }) => (
    <View style={styles.modernExerciseCard}>
      <View style={styles.exerciseImageContainer}>
        {getExerciseImage(item) ? (
          <Image source={{ uri: getExerciseImage(item) }} style={styles.exerciseImage} resizeMode="cover" />
        ) : (
          <View style={styles.exerciseImagePlaceholder}>
            <Ionicons name="fitness" size={32} color="#9CA3AF" />
          </View>
        )}
      </View>
      <View style={styles.exerciseContent}>
        <Text style={styles.modernExerciseName}>{item.exerciseName}</Text>
        <Text style={styles.exerciseCalories}>{item.caloriesBurnedPerMin} kcal</Text>
      </View>
      <TouchableOpacity style={styles.modernRemoveButton} onPress={() => removeExercise(item.exerciseId)}>
        <Ionicons name="close" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  )

  const renderFilterModal = () => (
    <Modal visible={filterModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Exercises</Text>
            <TouchableOpacity style={styles.filterCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Text style={{ fontSize: 20,color: "#64748B" }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Search Exercise</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Enter exercise name..."
                value={filters.searchTerm}
                onChangeText={(text) => setFilters((prev) => ({ ...prev,searchTerm: text }))}
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Calorie Range (per minute)</Text>
              <View style={styles.filterRow}>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Min Calories</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="0"
                    value={filters.minCalories}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev,minCalories: text }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.filterHalf}>
                  <Text style={styles.filterSubLabel}>Max Calories</Text>
                  <TextInput
                    style={styles.filterInput}
                    placeholder="50"
                    value={filters.maxCalories}
                    onChangeText={(text) => setFilters((prev) => ({ ...prev,maxCalories: text }))}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Gender Specific</Text>
              <View style={styles.genderButtons}>
                {["","Male","Female","Unisex"].map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      filters.gender === gender && { backgroundColor: "#0056d2",borderColor: "#0056d2" },
                    ]}
                    onPress={() => setFilters((prev) => ({ ...prev,gender }))}
                  >
                    <Text style={[styles.genderButtonText,filters.gender === gender && { color: "#fff" }]}>
                      {gender || "All"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.filterModalButtons}>
            <TouchableOpacity
              style={styles.filterResetButton}
              onPress={() =>
                setFilters({
                  searchTerm: "",
                  minCalories: "",
                  maxCalories: "",
                  gender: "",
                  sortBy: "name",
                  sortOrder: "asc",
                })
              }
            >
              <Text style={styles.filterResetText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={() => {
                applyFilters()
                setFilterModalVisible(false)
              }}
            >
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Loading />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      {/* Header */}
      <Header
        title="Workout Session"
        onBack={() => navigation.goBack()}
        rightActions={
          !isWorkoutStarted
            ? [
              {
                icon: "time-outline",
                onPress: () => navigation.navigate("WorkoutHistoryScreen"),
                color: "#3B82F6",
              },
            ]
            : []
        }
      />

      <Animated.View
        style={[
          styles.container,
          {
            marginTop: 65,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {!isWorkoutStarted ? (
          <ScrollView showsVerticalScrollIndicator={false} style={styles.mainContent}>
            {/* Hero Section with Background Image */}
            <View style={styles.heroSection}>
              <Image
                source={require('../../../assets/images/workout-hero.jpeg')}
                style={styles.heroImage}
                resizeMode="cover"
              />
              <View style={styles.heroOverlay}>
                <Text style={styles.dayTitle}>DAY {getCurrentDay()}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{Math.round(workoutStats.totalCalories)}</Text>
                    <Text style={styles.statLabel}>kcal</Text>
                    <Text style={styles.statSubLabel}>Calorie</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Exercises Section */}
            <View style={styles.exercisesSection}>
              <View style={styles.exercisesSectionHeader}>
                <Text style={styles.exercisesTitle}>{scheduledExercises.length} Exercises</Text>
                <TouchableOpacity style={styles.settingsButton} onPress={() => setFilterModalVisible(true)}>
                  <Ionicons name="options-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={filteredExercises}
                renderItem={renderScheduledExerciseItem}
                keyExtractor={(item) => item.exerciseId.toString()}
                contentContainerStyle={styles.exercisesList}
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="fitness" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No Exercises Found</Text>
                    <Text style={styles.emptyText}>
                      {scheduledExercises.length === 0
                        ? "Add exercises from the Workout screen to get started."
                        : "Try adjusting your filters to see more exercises."}
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyButton}
                      onPress={() =>
                        scheduledExercises.length === 0
                          ? navigation.navigate("WorkoutListScreen")
                          : setFilters({
                            searchTerm: "",
                            minCalories: "",
                            maxCalories: "",
                            gender: "",
                            sortBy: "name",
                            sortOrder: "asc",
                          })
                      }
                    >
                      <Text style={styles.emptyButtonText}>
                        {scheduledExercises.length === 0 ? "Add Exercises" : "Reset Filters"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
                showsVerticalScrollIndicator={false}
                scrollEnabled={false}
              />
            </View>

            {/* Start Button */}
            {scheduledExercises.length > 0 && (
              <View style={styles.bottomSection}>
                <TouchableOpacity style={styles.startButton} onPress={startWorkout}>
                  <Text style={styles.startButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        ) : null}

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null)
                loadScheduledExercises()
              }}
            >
              <Text style={styles.retryButtonText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
      {renderFilterModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -10,
  },
  mainContent: {
    flex: 1,
  },
  heroSection: {
    height: 280,
    position: "relative",
    marginBottom: 24,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  dayTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FFFFFF",
    marginBottom: 32,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "400",
  },
  exercisesSection: {
    paddingHorizontal: 24,
    flex: 1,
  },
  exercisesSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  exercisesTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  exercisesList: {
    paddingBottom: 20,
  },
  modernExerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  exerciseImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 16,
  },
  exerciseImage: {
    width: "100%",
    height: "100%",
  },
  exerciseImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  exerciseContent: {
    flex: 1,
  },
  modernExerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  exerciseCalories: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
  },
  modernRemoveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 40,
  },
  settingsButtonBottom: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    gap: 8,
  },
  settingsText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  startButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 25,
    minWidth: 120,
    alignItems: "center",
  },
  startButtonText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: "#0056d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorContainer: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    margin: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  filterCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  filterModalBody: {
    padding: 20,
    maxHeight: 400,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  filterSubLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterHalf: {
    flex: 1,
  },
  genderButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  genderButtonText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  filterModalButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  filterResetButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  filterResetText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  filterApplyButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#0056d2",
    alignItems: "center",
  },
  filterApplyText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default WorkoutSessionScreen
