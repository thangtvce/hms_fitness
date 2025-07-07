
import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Dimensions,
  Alert,
  Image,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import { useNavigation, useRoute } from "@react-navigation/native"
import { trainerService } from "services/apiTrainerService"
import { Video } from 'expo-av'
import { StatusBar } from "expo-status-bar"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"

const { width, height } = Dimensions.get("window")

const WorkoutPlanDetailByTrainer = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { planId } = route.params || {}

  const [loading, setLoading] = useState(true)
  const [planData, setPlanData] = useState(null)
  const [exercises, setExercises] = useState([])
  const [expandedExercise, setExpandedExercise] = useState(null)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current
  const headerAnim = useRef(new Animated.Value(-100)).current

  useEffect(() => {
    // Enhanced entrance animations
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start()

    return () => {
      fadeAnim.setValue(0)
      slideAnim.setValue(50)
      headerAnim.setValue(-100)
    }
  }, [])

  useEffect(() => {
    if (!planId) {
      Alert.alert("Error", "Workout plan ID not found.")
      navigation.goBack()
      return
    }
    fetchPlanData()
  }, [planId])

  const fetchPlanData = async () => {
    setLoading(true)
    try {
      const planResponse = await trainerService.getWorkoutPlanById(planId)
      const plan = planResponse.data || {}

      const exerciseResponse = await trainerService.getWorkoutPlanExercisesByPlanId(planId)
      const planExercises = exerciseResponse.data?.exercises || []

      setPlanData(plan)
      setExercises(planExercises)
    } catch (error) {
      console.error("Fetch Error:", error)
      Alert.alert("Error", error.message || "An error occurred while loading workout plan details.")
    } finally {
      setLoading(false)
    }
  }

  const toggleExerciseExpansion = (exerciseId) => {
    setExpandedExercise(expandedExercise === exerciseId ? null : exerciseId)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US")
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "active":
        return { bg: "#ECFDF5", text: "#059669", border: "#10B981" }
      case "completed":
        return { bg: "#EFF6FF", text: "#2563EB", border: "#3B82F6" }
      case "paused":
        return { bg: "#FEF3C7", text: "#D97706", border: "#F59E0B" }
      default:
        return { bg: "#F3F4F6", text: "#6B7280", border: "#9CA3AF" }
    }
  }

  const renderHeader = () => (
    <Animated.View style={[styles.headerContainer, { transform: [{ translateY: headerAnim }] }]}>
      <LinearGradient
        colors={["#667EEA", "#764BA2"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Plan Details</Text>
            <Text style={styles.headerSubtitle}>For Trainers</Text>
          </View>

          <TouchableOpacity style={styles.moreButton} activeOpacity={0.8}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  )

  const renderPlanOverview = () => {
    const statusStyle = getStatusColor(planData?.status)

    return (
      <Animated.View
        style={[
          styles.overviewCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.cardGradient}>
          <View style={styles.planHeader}>
            <View style={styles.planIconContainer}>
              <LinearGradient colors={["#667EEA", "#764BA2"]} style={styles.planIcon}>
                <Ionicons name="fitness" size={28} color="#FFFFFF" />
              </LinearGradient>
            </View>

            <View style={styles.planInfo}>
              <Text style={styles.planTitle}>{planData?.planName || "Unknown Plan"}</Text>
              <Text style={styles.planTrainer}>By {planData?.trainerFullName || "You"}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                <Text style={[styles.statusText, { color: statusStyle.text }]}>
                  {planData?.status || "Unknown"}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.planStats}>
            <View style={styles.statItem}>
              <Ionicons name="person" size={20} color="#667EEA" />
              <Text style={styles.statLabel}>Member</Text>
              <Text style={styles.statValue}>{planData?.userFullName || "Unknown"}</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="time" size={20} color="#667EEA" />
              <Text style={styles.statLabel}>Duration</Text>
              <Text style={styles.statValue}>{planData?.durationMinutes || 0} mins</Text>
            </View>

            <View style={styles.statItem}>
              <Ionicons name="repeat" size={20} color="#667EEA" />
              <Text style={styles.statLabel}>Frequency</Text>
              <Text style={styles.statValue}>{planData?.frequencyPerWeek || 0}x/week</Text>
            </View>
          </View>

          <View style={styles.planPeriod}>
            <View style={styles.periodItem}>
              <Text style={styles.periodLabel}>Start</Text>
              <Text style={styles.periodValue}>{formatDate(planData?.startDate)}</Text>
            </View>
            <View style={styles.periodDivider} />
            <View style={styles.periodItem}>
              <Text style={styles.periodLabel}>End</Text>
              <Text style={styles.periodValue}>{formatDate(planData?.endDate)}</Text>
            </View>
          </View>

          {planData?.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.descriptionText}>{planData.description}</Text>
            </View>
          )}
        </LinearGradient>
      </Animated.View>
    )
  }

  const renderExerciseCard = (exercise, index) => {
    const isExpanded = expandedExercise === exercise.exerciseId

    return (
      <Animated.View
        key={exercise.exerciseId || index}
        style={[
          styles.exerciseCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: Animated.add(slideAnim, new Animated.Value(index * 10)),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity onPress={() => toggleExerciseExpansion(exercise.exerciseId)} activeOpacity={0.9}>
          <LinearGradient colors={["#FFFFFF", "#FAFBFC"]} style={styles.exerciseGradient}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseIconContainer}>
                <Ionicons name="barbell" size={24} color="#667EEA" />
              </View>

              <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{exercise.exerciseName || "Unknown Exercise"}</Text>
                <View style={styles.exerciseQuickStats}>
                  <Text style={styles.quickStat}>{exercise.sets || 0} sets</Text>
                  <Text style={styles.quickStatDivider}>•</Text>
                  <Text style={styles.quickStat}>{exercise.reps || 0} reps</Text>
                  <Text style={styles.quickStatDivider}>•</Text>
                  <Text style={styles.quickStat}>{exercise.durationMinutes || 0} mins</Text>
                </View>
              </View>

              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: isExpanded ? "180deg" : "0deg",
                    },
                  ],
                }}
              >
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
              </Animated.View>
            </View>

            {isExpanded && (
              <View style={styles.exerciseDetails}>
                <View style={styles.detailsGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Sets</Text>
                    <Text style={styles.detailValue}>{exercise.sets || "N/A"}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Reps</Text>
                    <Text style={styles.detailValue}>{exercise.reps || "N/A"}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Rest Time</Text>
                    <Text style={styles.detailValue}>{exercise.restTimeSeconds || 0}s</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{exercise.durationMinutes || 0} mins</Text>
                  </View>
                </View>

                {exercise.notes && (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesText}>{exercise.notes}</Text>
                  </View>
                )}

                {exercise.imageUrl && (
                  <View style={styles.mediaContainer}>
                    <Text style={styles.mediaLabel}>Illustration Image</Text>
                    <Image source={{ uri: exercise.imageUrl }} style={styles.exerciseImage} resizeMode="cover" />
                  </View>
                )}

                {exercise.mediaUrl && (
                  <View style={styles.mediaContainer}>
                    <Text style={styles.mediaLabel}>Instructional Video</Text>
                    <Video
                      source={{ uri: exercise.mediaUrl }}
                      style={styles.exerciseVideo}
                      useNativeControls
                      resizeMode="contain"
                      shouldPlay={false}
                      isLooping={false}
                    />
                  </View>
                )}
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  const renderEmptyExercises = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="fitness-outline" size={64} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Exercises</Text>
      <Text style={styles.emptyText}>This workout plan has no exercises added yet.</Text>
    </View>
  )

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#667EEA" />
      <Text style={styles.loadingText}>Loading details...</Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <DynamicStatusBar backgroundColor="#667EEA" />
        {renderHeader()}
        {renderLoadingState()}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#667EEA" />
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {planData && renderPlanOverview()}

        <View style={styles.exercisesSection}>
          <Text style={styles.sectionTitle}>Exercises ({exercises.length})</Text>

          {exercises.length > 0
            ? exercises.map((exercise, index) => renderExerciseCard(exercise, index))
            : renderEmptyExercises()}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Header Styles
  headerContainer: {
    zIndex: 1000,
  },
  headerGradient: {
    paddingTop: Platform.OS === "ios" ? 0 : StatusBar.currentHeight || 0,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 2,
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Scroll View Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Plan Overview Styles
  overviewCard: {
    marginBottom: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 24,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  planIconContainer: {
    marginRight: 16,
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  planTrainer: {
    fontSize: 16,
    color: "#64748B",
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },

  // Plan Stats Styles
  planStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingVertical: 20,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },

  // Plan Period Styles
  planPeriod: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  periodItem: {
    flex: 1,
    alignItems: "center",
  },
  periodLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  periodValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
  },
  periodDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 16,
  },

  // Description Styles
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },

  // Exercises Section Styles
  exercisesSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
  },

  // Exercise Card Styles
  exerciseCard: {
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  exerciseGradient: {
    borderRadius: 16,
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  exerciseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  exerciseQuickStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickStat: {
    fontSize: 14,
    color: "#64748B",
  },
  quickStatDivider: {
    fontSize: 14,
    color: "#CBD5E1",
    marginHorizontal: 8,
  },

  // Exercise Details Styles
  exerciseDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  detailItem: {
    width: "50%",
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },

  // Notes Styles
  notesContainer: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#FEF7CD",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: "#78350F",
    lineHeight: 20,
  },

  // Media Styles
  mediaContainer: {
    marginBottom: 16,
  },
  mediaLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  exerciseImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  exerciseVideo: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },

  // Empty State Styles
  emptyContainer: {
    alignItems: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },

  // Loading State Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#667EEA",
    marginTop: 16,
    fontWeight: "500",
  },
})

export default WorkoutPlanDetailByTrainer