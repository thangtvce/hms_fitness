import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  ImageBackground,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { trainerService } from "services/apiTrainerService"; // Adjust path to your trainerService
import { useAuth } from "context/AuthContext";
import { Picker } from "@react-native-picker/picker";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const FALLBACK_IMAGE = "https://source.unsplash.com/400x250/?fitness,workout";
const ITEMS_PER_PAGE = 8;

const ExerciseImage = ({ uri, name, style }) => {
  const [error, setError] = useState(false);
  const fallbackUrl = FALLBACK_IMAGE + (name ? `,${encodeURIComponent(name)}` : "");
  return (
    <Image
      source={{ uri: !error && uri ? uri : fallbackUrl }}
      style={[styles.exerciseImage, style]}
      onError={() => setError(true)}
      resizeMode="cover"
    />
  );
};

const AddExerciseModal = ({ visible, onClose, onSave, availableExercises }) => {
  const [formData, setFormData] = useState({
    exerciseId: "",
    durationMinutes: "",
    sets: "",
    reps: "",
  });

  useEffect(() => {
    setFormData({
      exerciseId: "",
      durationMinutes: "",
      sets: "",
      reps: "",
    });
  }, [visible]);

  const handleSave = async () => {
    if (!formData.exerciseId || !formData.durationMinutes || !formData.sets || !formData.reps) {
      Alert.alert("Error", "All fields are required.");
      return;
    }

    try {
      const exerciseData = {
        exerciseId: parseInt(formData.exerciseId),
        durationMinutes: parseInt(formData.durationMinutes),
        sets: parseInt(formData.sets),
        reps: parseInt(formData.reps),
      };

      await onSave(exerciseData);
      onClose();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to add exercise.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>Exercise *</Text>
              <View style={styles.formInput}>
                <Picker
                  selectedValue={formData.exerciseId}
                  onValueChange={(value) => setFormData({ ...formData, exerciseId: value })}
                  style={{ width: "100%" }}
                >
                  <Picker.Item label="Select an exercise" value="" />
                  {availableExercises.map((exercise) => (
                    <Picker.Item
                      key={exercise.exerciseId}
                      label={exercise.exerciseName || `Exercise ${exercise.exerciseId}`}
                      value={exercise.exerciseId.toString()}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.formLabel}>Duration (minutes) *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.durationMinutes}
                onChangeText={(text) => setFormData({ ...formData, durationMinutes: text })}
                placeholder="Enter duration in minutes"
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Sets *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.sets}
                onChangeText={(text) => setFormData({ ...formData, sets: text })}
                placeholder="Enter number of sets"
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Reps *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.reps}
                onChangeText={(text) => setFormData({ ...formData, reps: text })}
                placeholder="Enter number of reps"
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Add Exercise</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function TrainerWorkoutPlanExercisesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuth();
  const trainerId = user?.userId;
  const userId = route?.params?.userId;
  const planId = route?.params?.planId;
  const planName = route?.params?.planName;

  const [exercises, setExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCalories, setTotalCalories] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    console.log("Route params:", { planId, userId, trainerId });
    if (!planId || !userId) {
      setError("Missing planId or userId");
      setLoading(false);
      return;
    }
    fetchExercises();
    fetchAvailableExercises();
  }, [planId, userId, trainerId]);

  useEffect(() => {
    const totalFilteredPages = Math.ceil(filteredExercises.length / ITEMS_PER_PAGE);
    setTotalPages(totalFilteredPages);
    if (currentPage > totalFilteredPages && totalFilteredPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredExercises]);

  const fetchExercises = async () => {
    setLoading(true);
    try {
      const response = await trainerService.getWorkoutPlanExercisesByPlanId(planId, {
        pageNumber: 1,
        pageSize: 50,
      });
      console.log("Workout Plan Exercises Response:", JSON.stringify(response, null, 2));
      const planExercises = response.data?.exercises || [];

      if (!planExercises.length) {
        setExercises([]);
        setFilteredExercises([]);
        setTotalCalories(0);
        setTotalDuration(0);
        setLoading(false);
        return;
      }

      const detailedExercises = await Promise.all(
        planExercises.map(async (ex) => {
          if (!trainerId) {
            // No trainerId, use basic exercise data
            return {
              ...ex,
              category: getExerciseCategory(ex.exerciseName),
              calories: 0,
              mediaUrl: null,
            };
          }

          try {
            const detail = await trainerService.getFitnessExerciseById(ex.exerciseId);
            console.log(`Exercise ${ex.exerciseId} details:`, JSON.stringify(detail.data, null, 2));
            const calories = (detail.data.caloriesBurnedPerMin || 0) * (ex.durationMinutes || detail.data.durationMinutes || 0) * (ex.sets || 1);
            return {
              ...ex,
              ...detail.data,
              calories,
              category: detail.data.category || getExerciseCategory(ex.exerciseName),
            };
          } catch (e) {
            console.error(`Error fetching exercise ${ex.exerciseId}:`, e);
            return {
              ...ex,
              category: getExerciseCategory(ex.exerciseName),
              calories: 0,
              mediaUrl: null,
            };
          }
        })
      );

      setExercises(detailedExercises);
      setFilteredExercises(detailedExercises);
      calculateTotals(detailedExercises);
    } catch (e) {
      console.error("Error fetching exercises:", e);
      setError(e.message || "Failed to load exercises. Some exercises may be restricted.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableExercises = async () => {
    try {
      // Fetch trainer-specific or system exercises based on trainerId
      const response = trainerId
        ? await trainerService.getFitnessExercisesByTrainer({ pageNumber: 1, pageSize: 100 })
        : await trainerService.getAllExerciseCategories({ pageNumber: 1, pageSize: 100 }); // Fallback to categories or system exercises
      console.log("Available Exercises Response:", JSON.stringify(response, null, 2));
      const exercises = trainerId ? response.data?.exercises || [] : response.data?.categories || [];
      setAvailableExercises(exercises);
    } catch (e) {
      console.error("Error fetching available exercises:", e);
      Alert.alert("Error", "Failed to load available exercises for adding.");
    }
  };

  const getExerciseCategory = (exerciseName) => {
    const name = exerciseName?.toLowerCase() || "";
    if (name.includes("run") || name.includes("cardio") || name.includes("bike")) return "cardio";
    if (name.includes("stretch") || name.includes("yoga") || name.includes("flexibility")) return "flexibility";
    return "strength";
  };

  const calculateTotals = (exerciseList) => {
    let totalCalo = 0;
    let totalDur = 0;

    exerciseList.forEach((ex) => {
      const calo = Number(ex.calories) || 0;
      const dur = Number(ex.durationMinutes) || 0;
      if (!isNaN(calo) && calo > 0) totalCalo += calo;
      if (!isNaN(dur) && dur > 0) totalDur += dur * (ex.sets || 1);
    });

    setTotalCalories(totalCalo);
    setTotalDuration(totalDur);
  };

  const handleAddExercise = async (exerciseData) => {
    try {
      const payload = {
        planId: parseInt(planId),
        exerciseId: exerciseData.exerciseId,
        durationMinutes: exerciseData.durationMinutes,
        sets: exerciseData.sets,
        reps: exerciseData.reps,
      };
      await trainerService.createWorkoutPlanExercise(payload);
      Alert.alert("Success", "Exercise added to plan!");
      fetchExercises();
    } catch (error) {
      console.error("Error adding exercise:", error);
      Alert.alert("Error", error.message || "Failed to add exercise.");
    }
  };

  const handleRemoveExercise = async (exerciseId) => {
    try {
      await trainerService.deleteWorkoutPlanExercise(exerciseId);
      Alert.alert("Success", "Exercise removed from plan!");
      fetchExercises();
    } catch (error) {
      console.error("Error removing exercise:", error);
      Alert.alert("Error", error.message || "Failed to remove exercise.");
    }
  };

  const getPaginatedData = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredExercises.slice(startIndex, endIndex);
  };

  const renderExerciseItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      activeOpacity={0.8}
    >
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
        {item.calories === 0 && (
          <Text style={styles.exerciseWarning}>Restricted exercise data</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.exerciseRemoveButton}
        onPress={(e) => {
          e.stopPropagation();
          Alert.alert(
            "Remove Exercise",
            "Are you sure you want to remove this exercise from the plan?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: () => handleRemoveExercise(item.exerciseId) },
            ]
          );
        }}
      >
        <Ionicons name="trash" size={16} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

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
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { fetchExercises(); fetchAvailableExercises(); }}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={{ uri: "https://www.humangood.org/hs-fs/hubfs/AdobeStock_572805942.jpeg?width=6000&height=4000&name=AdobeStock_572805942.jpeg" }}
        style={styles.heroImage}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.heroButton}>
              <Ionicons name="chevron-back" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>{planName || "Manage Exercises"}</Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <View style={styles.contentSection}>
        <View style={styles.statsRow}>
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{totalCalories} kcal</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{totalDuration} Min</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statColumn}>
            <Text style={styles.statValue}>{exercises.length}</Text>
            <Text style={styles.statLabel}>Exercises</Text>
          </View>
        </View>

        <View style={styles.exercisesSection}>
          <Text style={styles.exercisesTitle}>{filteredExercises.length} Exercises</Text>

          {filteredExercises.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={64} color="#C7D2FE" />
              <Text style={styles.emptyTitle}>Chưa có bài tập nào được thêm</Text>
              <Text style={styles.emptySubtitle}>Add exercises to this client's workout plan.</Text>
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

      <AddExerciseModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleAddExercise}
        availableExercises={availableExercises}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  heroImage: {
    height: 200,
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
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "center",
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
  contentSection: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
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
  exerciseWarning: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "400",
    marginTop: 4,
  },
  exerciseRemoveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E5E5",
    justifyContent: "center",
    alignItems: "center",
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
  modalBody: {
    padding: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 16,
    color: "#0F172A",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});