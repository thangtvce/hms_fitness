import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
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
import DateTimePicker from "@react-native-community/datetimepicker";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;

const PlanEditModal = ({ visible, plan, onClose, onSave, onDelete, isNew, subscribedUsers }) => {
  const [formData, setFormData] = useState({
    planName: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(),
    frequencyPerWeek: "",
    durationMinutes: "",
    userId: "",
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    if (plan && !isNew) {
      setFormData({
        planName: plan.planName || "",
        description: plan.description || "",
        startDate: plan.startDate ? new Date(plan.startDate) : new Date(),
        endDate: plan.endDate ? new Date(plan.endDate) : new Date(),
        frequencyPerWeek: plan.frequencyPerWeek?.toString() || "",
        durationMinutes: plan.durationMinutes?.toString() || "",
        userId: plan.userId?.toString() || "",
      });
    } else {
      setFormData({
        planName: "",
        description: "",
        startDate: new Date(),
        endDate: new Date(),
        frequencyPerWeek: "",
        durationMinutes: "",
        userId: "",
      });
    }
  }, [plan, isNew]);

  const handleSave = async () => {
    if (!formData.planName || !formData.userId || !formData.frequencyPerWeek || !formData.durationMinutes) {
      Alert.alert("Error", "Plan name, user, frequency, and duration are required.");
      return;
    }

    try {
      const planData = {
        userId: parseInt(formData.userId),
        planName: formData.planName,
        description: formData.description || null,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        frequencyPerWeek: parseInt(formData.frequencyPerWeek),
        durationMinutes: parseInt(formData.durationMinutes),
        status: "active",
      };

      await onSave(planData, isNew);
      onClose();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to save workout plan.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isNew ? "Create Workout Plan" : "Edit Workout Plan"}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalBody}>
              <Text style={styles.formLabel}>Plan Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.planName}
                onChangeText={(text) => setFormData({ ...formData, planName: text })}
                placeholder="Enter plan name"
              />

              <Text style={styles.formLabel}>User *</Text>
              <View style={styles.formInput}>
                <Picker
                  selectedValue={formData.userId}
                  onValueChange={(value) => setFormData({ ...formData, userId: value })}
                  style={{ width: "100%" }}
                >
                  <Picker.Item label="Select a user" value="" />
                  {subscribedUsers.map((user) => (
                    <Picker.Item
                      key={user.userId}
                      label={user.userFullName || `User ${user.userId}`}
                      value={user.userId.toString()}
                    />
                  ))}
                </Picker>
              </View>

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, { height: 100 }]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter description"
                multiline
              />

              <Text style={styles.formLabel}>Start Date *</Text>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {formData.startDate.toLocaleDateString("en-US")}
                </Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={formData.startDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) setFormData({ ...formData, startDate: date });
                  }}
                />
              )}

              <Text style={styles.formLabel}>End Date *</Text>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {formData.endDate.toLocaleDateString("en-US")}
                </Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={formData.endDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) setFormData({ ...formData, endDate: date });
                  }}
                  minimumDate={formData.startDate}
                />
              )}

              <Text style={styles.formLabel}>Frequency Per Week *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.frequencyPerWeek}
                onChangeText={(text) => setFormData({ ...formData, frequencyPerWeek: text })}
                placeholder="Enter frequency (e.g., 7)"
                keyboardType="numeric"
              />

              <Text style={styles.formLabel}>Duration (minutes) *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.durationMinutes}
                onChangeText={(text) => setFormData({ ...formData, durationMinutes: text })}
                placeholder="Enter duration in minutes"
                keyboardType="numeric"
              />

              <View style={styles.modalActions}>
                {!isNew && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => {
                      Alert.alert(
                        "Delete Workout Plan",
                        "Are you sure you want to delete this workout plan?",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: () => onDelete(plan) },
                        ]
                      );
                    }}
                  >
                    <Ionicons name="trash" size={20} color="#fff" />
                    <Text style={styles.removeButtonText}>Delete Plan</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                  <Ionicons name="save" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export default function TrainerManageWorkoutPlanScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const trainerId = user?.userId;

  const [plans, setPlans] = useState([]);
  const [subscribedUsers, setSubscribedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isNewPlan, setIsNewPlan] = useState(false);

  useEffect(() => {
    if (trainerId) {
      fetchSubscribedUsers();
      fetchPlans();
    }
  }, [trainerId]);

  useEffect(() => {
    const totalFilteredPages = Math.ceil(plans.length / ITEMS_PER_PAGE);
    setTotalPages(totalFilteredPages);
    if (currentPage > totalFilteredPages && totalFilteredPages > 0) {
      setCurrentPage(1);
    }
  }, [plans]);

  const fetchSubscribedUsers = async () => {
    try {
      const response = await trainerService.getSubscriptionsByTrainerId(trainerId, { pageNumber: 1, pageSize: 100 });
      console.log("Subscribed Users Response:", response);
      const subscriptions = response.data?.subscriptions || [];
      const users = subscriptions.map((sub) => ({
        userId: sub.userId,
        userFullName: sub.userFullName || `User ${sub.userId}`,
      }));
      setSubscribedUsers(users);
    } catch (e) {
      console.error("Error fetching subscribed users:", e);
      setError(e.message || "Failed to load subscribed users");
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await trainerService.getWorkoutPlansByTrainerId(trainerId, {
        pageNumber: currentPage,
        pageSize: ITEMS_PER_PAGE,
      });
      console.log("Workout Plans Response:", response);
      const fetchedPlans = response.data?.plans || [];
      setPlans(fetchedPlans);
      setTotalPages(response.data?.totalPages || 1);
    } catch (e) {
      console.error("Error fetching plans:", e);
      setError(e.message || "Failed to load workout plans");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async (planData, isNew) => {
    try {
      if (isNew) {
        await trainerService.createWorkoutPlan(planData);
        Alert.alert("Success", "Workout plan created!");
      } else {
        await trainerService.updateWorkoutPlan(selectedPlan.planId, planData);
        Alert.alert("Success", "Workout plan updated!");
      }
      fetchPlans();
    } catch (error) {
      console.error("Error saving workout plan:", error);
      Alert.alert("Error", error.message || "Failed to save workout plan.");
    }
  };

  const handleDeletePlan = async (plan) => {
    try {
      await trainerService.deleteWorkoutPlan(plan.planId);
      Alert.alert("Success", "Workout plan deleted!");
      fetchPlans();
    } catch (error) {
      console.error("Error deleting workout plan:", error);
      Alert.alert("Error", error.message || "Failed to delete workout plan.");
    }
  };

  const renderPlanItem = ({ item }) => (
    <TouchableOpacity
      style={styles.planCard}
      onPress={() =>
        navigation.navigate("TrainerWorkoutPlanExerciseSessionScreen", {
          planId: item.planId,
          userId: item.userId,
          planName: item.planName,
        })
      }
      activeOpacity={0.8}
    >
      <View style={styles.planInfo}>
        <Text style={styles.planName}>{item.planName?.toUpperCase() || "UNKNOWN PLAN"}</Text>
        <Text style={styles.planDetail}>User: {item.userFullName || "N/A"}</Text>
        <Text style={styles.planDetail}>
          Start: {item.startDate ? new Date(item.startDate).toLocaleDateString("en-US") : "N/A"}
        </Text>
        <Text style={styles.planDetail}>
          End: {item.endDate ? new Date(item.endDate).toLocaleDateString("en-US") : "N/A"}
        </Text>
        <Text style={styles.planDetail}>Frequency: {item.frequencyPerWeek} times/week</Text>
        <Text style={styles.planDetail}>Status: {item.status || "N/A"}</Text>
        {item.description && (
          <Text style={styles.planDetail}>Description: {item.description}</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.editButton}
        onPress={(e) => {
          e.stopPropagation();
          setSelectedPlan(item);
          setIsNewPlan(false);
          setModalVisible(true);
        }}
      >
        <Ionicons name="pencil" size={16} color="#666" />
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
          <Text style={styles.loadingText}>Loading workout plans...</Text>
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
          <TouchableOpacity style={styles.retryButton} onPress={fetchPlans}>
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
            <Text style={styles.heroTitle}>Manage Workout Plans</Text>
            <TouchableOpacity
              style={styles.heroButton}
              onPress={() => {
                setSelectedPlan(null);
                setIsNewPlan(true);
                setModalVisible(true);
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>

      <View style={styles.contentSection}>
        <Text style={styles.sectionTitle}>{plans.length} Workout Plans</Text>

        {plans.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#C7D2FE" />
            <Text style={styles.emptyTitle}>No Workout Plans</Text>
            <Text style={styles.emptySubtitle}>Create a new workout plan for your clients.</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={plans}
              keyExtractor={(item) => item.planId?.toString() || Math.random().toString()}
              renderItem={renderPlanItem}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            />
            {renderPagination()}
          </>
        )}
      </View>

      <PlanEditModal
        visible={modalVisible}
        plan={selectedPlan}
        onClose={() => setModalVisible(false)}
        onSave={handleSavePlan}
        onDelete={handleDeletePlan}
        isNew={isNewPlan}
        subscribedUsers={subscribedUsers}
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
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000",
    marginBottom: 24,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    padding: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  planDetail: {
    fontSize: 14,
    color: "#666",
    fontWeight: "400",
    marginBottom: 4,
  },
  editButton: {
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
  dateText: {
    fontSize: 16,
    color: "#0F172A",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  removeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  removeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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