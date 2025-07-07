import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { aiRecommentService } from "services/apiAIRecommentService";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "components/theme/ThemeContext"; 
import { useAuth } from "context/AuthContext"; 
import dayjs from "dayjs";

const UserGoalPlansScreen = () => {
  const navigation = useNavigation();
  const { user, loading: authLoading } = useAuth(); // Use AuthContext to get user and loading state
  const { colors, theme } = useContext(ThemeContext); // Use ThemeContext for consistent styling
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [goalPlans, setGoalPlans] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const userId = user?.userId; // Get userId from AuthContext

  const fetchGoalPlans = useCallback(
    async (page = 1, isRefresh = false) => {
      if (!userId) {
        setError("User is not authenticated. Please log in.");
        setLoading(false);
        return;
      }

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const response = await aiRecommentService.getUserGoalPlansByUser(userId, {
          pageNumber: page,
          pageSize: 10,
        });

        // The new API returns the data directly, not wrapped in a statusCode/data object
        if (response && Array.isArray(response.userGoalPlans)) {
          const newPlans = response.userGoalPlans;
          setGoalPlans((prev) => (page === 1 ? newPlans : [...prev, ...newPlans]));
          setTotalPages(response.totalPages || 1);
        } else {
          throw new Error("Failed to load user goal plans: Unexpected API response format.");
        }
      } catch (err) {
        const errorMessage =
          err.response?.data?.message || err.message || "Failed to load user goal plans.";
        setError(errorMessage);
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!authLoading && userId) {
      fetchGoalPlans(1);
    }
  }, [fetchGoalPlans, authLoading, userId]);

  const onRefresh = useCallback(() => {
    setPageNumber(1);
    fetchGoalPlans(1, true);
  }, [fetchGoalPlans]);

  const loadMore = () => {
    if (pageNumber < totalPages && !loading) {
      setPageNumber((prev) => prev + 1);
      fetchGoalPlans(pageNumber + 1);
    }
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format("MMMM D, YYYY");
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.headerText }]}>User Goal Plans</Text>
      </View>
      {authLoading || (loading && !refreshing) ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading goal plans...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : !userId ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            User is not authenticated. Please log in.
          </Text>
        </View>
      ) : goalPlans.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No goal plans found for this user.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {user ? (
            <View style={[styles.userInfoBox, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.userName, { color: colors.primary }]}>
                {user.fullName || "Unknown User"}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user.email || "No email provided"}
              </Text>
            </View>
          ) : (
            <View style={[styles.userInfoBox, { backgroundColor: colors.cardBackground }]}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                User information not available.
              </Text>
            </View>
          )}
          {goalPlans.map((plan, idx) => (
            <View
              key={plan.id || idx}
              style={[styles.planBox, { backgroundColor: colors.cardBackground }]}
            >
              <Text style={[styles.planTitle, { color: colors.primary }]}>Plan #{plan.id}</Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>Evaluation Summary:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>{plan.evaluationSummary}</Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>Health Concerns:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>{plan.healthConcerns}</Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>1 Month Exercise Schedule:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>
                {plan.oneMonthExerciseSchedule}
              </Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>1 Month Nutrition Targets:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>
                {plan.oneMonthNutritionTargets}
              </Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>1 Month Milestones:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>{plan.oneMonthMilestones}</Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>1 Month Advice:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>{plan.oneMonthAdvice}</Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>2 Month Exercise Schedule:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>
                {plan.twoMonthExerciseSchedule}
              </Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>2 Month Nutrition Targets:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>
                {plan.twoMonthNutritionTargets}
              </Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>2 Month Milestones:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>{plan.twoMonthMilestones}</Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>2 Month Advice:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>{plan.twoMonthAdvice}</Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>Recommendation Date:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>
                {formatDate(plan.recommendationDate)}
              </Text>
              <Text style={[styles.planLabel, { color: colors.accent }]}>Created At:</Text>
              <Text style={[styles.planValue, { color: colors.text }]}>
                {formatDate(plan.createdAt)}
              </Text>
            </View>
          ))}
          {pageNumber < totalPages && (
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: colors.primary }]}
              onPress={loadMore}
            >
              <Text style={[styles.loadMoreText, { color: colors.headerText }]}>Load More</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  emptyText: {
    fontSize: 15,
    textAlign: "center",
    marginTop: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  userInfoBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  planBox: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  planLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  planValue: {
    fontSize: 14,
    marginTop: 2,
  },
  loadMoreButton: {
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default UserGoalPlansScreen;