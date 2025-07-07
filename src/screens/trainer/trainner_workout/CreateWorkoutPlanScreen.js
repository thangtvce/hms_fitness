"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { trainerService } from "services/apiTrainerService";
import { useAuth } from "context/AuthContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ClientItem = ({ client, onSelect }) => (
  <TouchableOpacity style={styles.clientOption} onPress={() => onSelect(client)}>
    <Text style={styles.clientOptionText}>{client.userFullName || "Unknown User"}</Text>
    <Text style={styles.clientOptionDetail}>
      Package: {client.packageName || "N/A"} • Active: {client.isActive ? "Yes" : "No"}
    </Text>
  </TouchableOpacity>
);

const ExerciseItem = ({ exercise, onRemove, onEdit }) => (
  <View style={styles.exerciseCard}>
    <View style={styles.exerciseInfo}>
      <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
      <Text style={styles.exerciseDetail}>
        Sets: {exercise.sets} • Reps: {exercise.reps} • Duration: {exercise.durationMinutes} min
      </Text>
    </View>
    <View style={styles.exerciseActions}>
      <TouchableOpacity onPress={onEdit}>
        <Ionicons name="pencil" size={20} color="#4F46E5" />
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove}>
        <Ionicons name="trash" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  </View>
);

const SelectClientModal = ({ visible, onClose, clients, onSelect }) => (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Client</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={clients}
          keyExtractor={(item) => item.subscriptionId.toString()}
          renderItem={({ item }) => <ClientItem client={item} onSelect={onSelect} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No clients found.</Text>}
          style={styles.modalList}
        />
      </View>
    </View>
  </Modal>
);

const AddExerciseModal = ({ visible, onClose, exercises, onAdd }) => {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [duration, setDuration] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredExercises = exercises.filter((ex) =>
    ex.exerciseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAdd = () => {
    if (!selectedExercise || !sets || !reps || !duration) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
    if (isNaN(sets) || isNaN(reps) || isNaN(duration)) {
      Alert.alert("Error", "Sets, reps, and duration must be valid numbers.");
      return;
    }
    onAdd({
      exerciseId: selectedExercise.exerciseId,
      exerciseName: selectedExercise.exerciseName,
      sets: parseInt(sets),
      reps: parseInt(reps),
      durationMinutes: parseInt(duration),
    });
    setSelectedExercise(null);
    setSets("");
    setReps("");
    setDuration("");
    setSearchTerm("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.exerciseId.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.exerciseOption,
                  selectedExercise?.exerciseId === item.exerciseId && styles.exerciseOptionSelected,
                ]}
                onPress={() => setSelectedExercise(item)}
              >
                <Text style={styles.exerciseOptionText}>{item.exerciseName}</Text>
              </TouchableOpacity>
            )}
            style={styles.modalList}
          />
          {selectedExercise && (
            <View style={styles.exerciseForm}>
              <TextInput
                style={styles.input}
                placeholder="Sets (e.g., 3)"
                value={sets}
                onChangeText={setSets}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Reps (e.g., 10)"
                value={reps}
                onChangeText={setReps}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Duration (minutes, e.g., 5)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
                <Text style={styles.addButtonText}>Add to Plan</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

    </Modal>
  );
};

export default function CreateWorkoutPlanScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [planName, setPlanName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [clients, setClients] = useState([]);
  const [availableExercises, setAvailableExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);

  useEffect(() => {
    if (user?.trainerId) {
      loadData();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user?.trainerId) {
        loadData();
      }
    }, [user])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const clientResponse = await trainerService.getSubscriptionsByTrainerId(user.trainerId, {
        pageNumber: 1,
        pageSize: 50,
      });
      setClients(clientResponse.data?.Subscriptions || []);

      const exerciseResponse = await trainerService.getFitnessExercisesByTrainer({
        pageNumber: 1,
        pageSize: 100,
      });
      setAvailableExercises(exerciseResponse.data?.Exercises || []);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = (exercise) => {
    setExercises([...exercises, exercise]);
    setExerciseModalVisible(false);
  };

  const handleRemoveExercise = (exerciseId) => {
    setExercises(exercises.filter((ex) => ex.exerciseId !== exerciseId));
  };

  const handleEditExercise = (exercise) => {
    setExercises(exercises.filter((ex) => ex.exerciseId !== exercise.exerciseId));
    setExerciseModalVisible(true);
  };

  const handleSavePlan = async () => {
    if (!planName || !selectedClient || exercises.length === 0) {
      Alert.alert("Error", "Please provide a plan name, select a client, and add at least one exercise.");
      return;
    }
    if (isNaN(duration) || duration <= 0) {
      Alert.alert("Error", "Please enter a valid duration.");
      return;
    }

    setLoading(true);
    try {
      const planData = {
        trainerId: user.trainerId,
        planName,
        description,
        totalDuration: parseInt(duration),
      };
      const planResponse = await trainerService.createWorkoutPlan(planData);
      const planId = planResponse.data?.planId;

      if (planId) {
        await Promise.all(
          exercises.map((exercise) =>
            trainerService.createPlanExercise({
              workoutPlanId: planId,
              exerciseId: exercise.exerciseId,
              sets: exercise.sets,
              reps: exercise.reps,
              durationMinutes: exercise.durationMinutes,
            })
          )
        );

        await trainerService.assignWorkoutPlanToUser({
          planId,
          userId: selectedClient.userId,
        });

        Alert.alert("Success", "Workout plan created and assigned successfully!");
        navigation.goBack();
      }
    } catch (error) {
      console.error("Error creating workout plan:", error);
      Alert.alert("Error", "Failed to create workout plan. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#4F46E5", "#6366F1", "#818CF8"]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Workout Plan</Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Plan Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Plan Name"
          value={planName}
          onChangeText={setPlanName}
        />
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Description"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <TextInput
          style={styles.input}
          placeholder="Duration (minutes)"
          value={duration}
          onChangeText={setDuration}
          keyboardType="numeric"
        />

        <Text style={styles.sectionTitle}>Assign Client</Text>
        <TouchableOpacity
          style={styles.clientSelector}
          onPress={() => setClientModalVisible(true)}
        >
          <Text style={styles.clientSelectorText}>
            {selectedClient ? selectedClient.userFullName : "Select a client"}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#64748B" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Exercises</Text>
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.exerciseId.toString()}
          renderItem={({ item }) => (
            <ExerciseItem
              exercise={item}
              onRemove={() => handleRemoveExercise(item.exerciseId)}
              onEdit={() => handleEditExercise(item)}
            />
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No exercises added.</Text>}
          style={styles.exerciseList}
        />
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setExerciseModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={handleSavePlan}>
          <Text style={styles.saveButtonText}>Save Workout Plan</Text>
        </TouchableOpacity>
      </View>

      <SelectClientModal
        visible={clientModalVisible}
        onClose={() => setClientModalVisible(false)}
        clients={clients}
        onSelect={(client) => {
          setSelectedClient(client);
          setClientModalVisible(false);
        }}
      />

      <AddExerciseModal
        visible={exerciseModalVisible}
        onClose={() => setExerciseModalVisible(false)}
        exercises={availableExercises}
        onAdd={handleAddExercise}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    fontSize: 16,
    marginBottom: 12,
  },
  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },
  clientSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  clientSelectorText: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  exerciseList: {
    flexGrow: 0,
    marginBottom: 12,
  },
  exerciseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  exerciseDetail: {
    fontSize: 12,
    color: "#64748B",
  },
  exerciseActions: {
    flexDirection: "row",
    gap: 12,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: screenWidth - 40,
    maxHeight: screenHeight * 0.8,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalList: {
    maxHeight: screenHeight * 0.5,
  },
  clientOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  clientOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  clientOptionDetail: {
    fontSize: 12,
    color: "#64748B",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  exerciseOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  exerciseOptionSelected: {
    backgroundColor: "#F0FDF4",
  },
  exerciseOptionText: {
    fontSize: 16,
    color: "#1F2937",
  },
  exerciseForm: {
    marginTop: 16,
  },
  addButton: {
    backgroundColor: "#4F46E5",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 8,
  },
});