import { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Dimensions,
  Switch,
} from "react-native";
import ShimmerPlaceholder from "components/ShimmerPlaceholder";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { aiRecommentService } from "services/apiAIRecommentService";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemeContext } from "components/theme/ThemeContext";
import { useAuth } from "context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import Header from "components/Header";
import dayjs from "dayjs";

const { height } = Dimensions.get("window");

const UserGoalPlansScreen = () => {
  const navigation = useNavigation();
  const { user, loading: authLoading } = useAuth();
  const { colors, theme } = useContext(ThemeContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [goalPlans, setGoalPlans] = useState([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const [filters, setFilters] = useState({
    sortBy: "createdAt",
    sortDescending: true,
  });
  const [tempFilters, setTempFilters] = useState(filters);

  const userId = user?.userId;

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
          sortBy: filters.sortBy,
          sortDescending: filters.sortDescending,
        });
        if (response && Array.isArray(response.userGoalPlans)) {
          const newPlans = response.userGoalPlans;
          setGoalPlans((prev) => (page === 1 ? newPlans : [...prev, ...newPlans]));
          setTotalPages(response.totalPages || 1);
        } else {
          throw new Error("Failed to load user goal plans: Unexpected API response format.");
        }
      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || "Failed to load user goal plans.";
        setError(errorMessage);
        showErrorFetchAPI(errorMessage);
      } finally {
        setLoading(false);
        if (isRefresh) setRefreshing(false);
      }
    },
    [userId, filters],
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

  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
    setPageNumber(1);
    fetchGoalPlans(1);
  };

  const resetFilters = () => {
    setTempFilters({
      sortBy: "createdAt",
      sortDescending: true,
    });
  };

  const formatDate = (dateString) => {
    return dayjs(dateString).format("MMM D, YYYY");
  };

  const getStatusColor = (plan) => {
    const now = dayjs();
    const created = dayjs(plan.createdAt);
    const daysDiff = now.diff(created, "days");

    if (daysDiff <= 7) return "#10B981"; // Green for new
    if (daysDiff <= 30) return "#F59E0B"; // Orange for recent
    return "#6B7280"; // Gray for old
  };

  const getStatusText = (plan) => {
    const now = dayjs();
    const created = dayjs(plan.createdAt);
    const daysDiff = now.diff(created, "days");

    if (daysDiff <= 7) return "New";
    if (daysDiff <= 30) return "Recent";
    return "Archived";
  };

  const renderPlanCard = (plan, idx) => {
    const isExpanded = expandedPlan === plan.id;
    const statusColor = getStatusColor(plan);
    const statusText = getStatusText(plan);

    return (
      <View key={plan.id || idx} style={[styles.planCard, { backgroundColor: colors.cardBackground }]}>
        {/* Card Header */}
        <LinearGradient
          colors={theme === "dark" ? ["#1E293B", "#334155"] : ["#0056d2", "#0056d2"]}
          style={styles.planHeader}
        >
          <View style={styles.planHeaderContent}>
            <View style={styles.planHeaderLeft}>
              <View style={styles.planIconContainer}>
                <Feather name="target" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.planTitle}>AI Goal Plan #{plan.id}</Text>
                <Text style={styles.planDate}>{formatDate(plan.createdAt)}</Text>
              </View>
            </View>
            <View style={styles.planHeaderRight}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setExpandedPlan(isExpanded ? null : plan.id)}
              >
                <Feather name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Summary */}
        <View style={styles.planSummary}>
          <Text style={[styles.summaryTitle, { color: colors.text }]}>Evaluation Summary</Text>
          <Text
            style={[styles.summaryText, { color: colors.textSecondary }]}
            numberOfLines={isExpanded ? undefined : 3}
          >
            {plan.evaluationSummary}
          </Text>
        </View>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Health Concerns */}
            <View style={styles.sectionContainer}>
              <View style={styles.sectionHeader}>
                <Feather name="alert-circle" size={16} color="#EF4444" />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Health Concerns</Text>
              </View>
              <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{plan.healthConcerns}</Text>
            </View>

            {/* Month Plans */}
            <View style={styles.monthPlansContainer}>
              {/* Month 1 */}
              <View style={[styles.monthCard, { backgroundColor: colors.background }]}>
                <View style={styles.monthHeader}>
                  <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.monthBadge}>
                    <Text style={styles.monthBadgeText}>Month 1</Text>
                  </LinearGradient>
                </View>

                <View style={styles.monthContent}>
                  <View style={styles.monthSection}>
                    <View style={styles.monthSectionHeader}>
                      <Feather name="activity" size={14} color="#10B981" />
                      <Text style={[styles.monthSectionTitle, { color: colors.text }]}>Exercise Schedule</Text>
                    </View>
                    <Text style={[styles.monthSectionText, { color: colors.textSecondary }]}>
                      {plan.oneMonthExerciseSchedule}
                    </Text>
                  </View>

                  <View style={styles.monthSection}>
                    <View style={styles.monthSectionHeader}>
                      <Feather name="coffee" size={14} color="#10B981" />
                      <Text style={[styles.monthSectionTitle, { color: colors.text }]}>Nutrition Targets</Text>
                    </View>
                    <Text style={[styles.monthSectionText, { color: colors.textSecondary }]}>
                      {plan.oneMonthNutritionTargets}
                    </Text>
                  </View>

                  <View style={styles.monthSection}>
                    <View style={styles.monthSectionHeader}>
                      <Feather name="flag" size={14} color="#10B981" />
                      <Text style={[styles.monthSectionTitle, { color: colors.text }]}>Milestones</Text>
                    </View>
                    <Text style={[styles.monthSectionText, { color: colors.textSecondary }]}>
                      {plan.oneMonthMilestones}
                    </Text>
                  </View>

                  <View style={styles.monthSection}>
                    <View style={styles.monthSectionHeader}>
                      <Feather name="lightbulb" size={14} color="#10B981" />
                      <Text style={[styles.monthSectionTitle, { color: colors.text }]}>Advice</Text>
                    </View>
                    <Text style={[styles.monthSectionText, { color: colors.textSecondary }]}>
                      {plan.oneMonthAdvice}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Month 2 */}
              <View style={[styles.monthCard, { backgroundColor: colors.background }]}>
                <View style={styles.monthHeader}>
                  <LinearGradient colors={["#0056d2", "#0056d2"]} style={styles.monthBadge}>
                    <Text style={styles.monthBadgeText}>Month 2</Text>
                  </LinearGradient>
                </View>

                <View style={styles.monthContent}>
                  <View style={styles.monthSection}>
                    <View style={styles.monthSectionHeader}>
                      <Feather name="activity" size={14} color="#F59E0B" />
                      <Text style={[styles.monthSectionTitle, { color: colors.text }]}>Exercise Schedule</Text>
                    </View>
                    <Text style={[styles.monthSectionText, { color: colors.textSecondary }]}>
                      {plan.twoMonthExerciseSchedule}
                    </Text>
                  </View>

                  <View style={styles.monthSection}>
                    <View style={styles.monthSectionHeader}>
                      <Feather name="coffee" size={14} color="#F59E0B" />
                      <Text style={[styles.monthSectionTitle, { color: colors.text }]}>Nutrition Targets</Text>
                    </View>
                    <Text style={[styles.monthSectionText, { color: colors.textSecondary }]}>
                      {plan.twoMonthNutritionTargets}
                    </Text>
                  </View>

                  <View style={styles.monthSection}>
                    <View style={styles.monthSectionHeader}>
                      <Feather name="flag" size={14} color="#F59E0B" />
                      <Text style={[styles.monthSectionTitle, { color: colors.text }]}>Milestones</Text>
                    </View>
                    <Text style={[styles.monthSectionText, { color: colors.textSecondary }]}>
                      {plan.twoMonthMilestones}
                    </Text>
                  </View>

                  <View style={styles.monthSection}>
                    <View style={styles.monthSectionHeader}>
                      <Feather name="lightbulb" size={14} color="#F59E0B" />
                      <Text style={[styles.monthSectionTitle, { color: colors.text }]}>Advice</Text>
                    </View>
                    <Text style={[styles.monthSectionText, { color: colors.textSecondary }]}>
                      {plan.twoMonthAdvice}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Recommendation Date */}
            <View style={styles.metaInfo}>
              <View style={styles.metaItem}>
                <Feather name="calendar" size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  Recommended: {formatDate(plan.recommendationDate)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal visible={showFilters} transparent={true} animationType="slide" onRequestClose={() => setShowFilters(false)}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay || "rgba(0, 0, 0, 0.5)" }]}>
        <View style={[styles.filterModal, { backgroundColor: colors.cardBackground || "#FFFFFF" }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border || "#F3F4F6" }]}>
            <Text style={[styles.modalTitle, { color: colors.text || "#0056d2" }]}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary || "#0056d2"} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text || "#374151" }]}>Sort By</Text>
              {[
                { label: "Date Created", value: "createdAt" },
                { label: "Recommendation Date", value: "recommendationDate" },
              ].map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    { backgroundColor: colors.background },
                    tempFilters.sortBy === option.value && [
                      styles.selectedOption,
                      { backgroundColor: colors.accent ? `${colors.accent}20` : "#e6f0fa", borderColor: colors.accent || "#0056d2" },
                    ],
                  ]}
                  onPress={() => setTempFilters((prev) => ({ ...prev, sortBy: option.value }))}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      { color: colors.textSecondary },
                      tempFilters.sortBy === option.value && [
                        styles.selectedOptionText,
                        { color: colors.accent || "#0056d2" },
                      ],
                    ]}
                  >
                    {option.label}
                  </Text>
                  {tempFilters.sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color={colors.accent || "#0056d2"} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterSection}>
              <View style={styles.switchRow}>
                <Text style={[styles.filterLabel, { color: colors.text || "#374151" }]}>Descending Order</Text>
                <Switch
                  value={tempFilters.sortDescending}
                  onValueChange={(value) => setTempFilters((prev) => ({ ...prev, sortDescending: value }))}
                  trackColor={{ false: colors.border || "#E5E7EB", true: colors.accent || "#0056d2" }}
                  thumbColor={colors.cardBackground || "#FFFFFF"}
                />
              </View>
            </View>
          </ScrollView>
          <View style={[styles.modalActions, { borderTopColor: colors.border || "#F3F4F6" }]}>
            <TouchableOpacity
              style={[styles.resetButton, { backgroundColor: colors.border || "#F3F4F6" }]}
              onPress={resetFilters}
            >
              <Text style={[styles.resetButtonText, { color: colors.textSecondary || "#6B7280" }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.accent || "#0056d2" }]}
              onPress={applyFilters}
            >
              <Text style={[styles.applyButtonText, { color: colors.textFilter || "#FFFFFF" }]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <LinearGradient
        colors={theme === "dark" ? ["#1E293B", "#334155"] : ["#F8FAFC", "#E2E8F0"]}
        style={styles.emptyStateContainer}
      >
        <View style={styles.emptyIconContainer}>
          <Feather name="target" size={48} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Goal Plans Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Your AI-generated fitness plans will appear here once created.
        </Text>
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: colors.accent }]}
          onPress={() => navigation.navigate("AIRecommendedScreen")}
        >
          <Feather name="plus" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create New Plan</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );


  // Always render header, only shimmer the content
  if (authLoading) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background || "#F9FAFB" }]}> 
      <Header
        title="AI Goal Plans"
        onBack={() => navigation.goBack()}
        rightActions={[{ icon: "options-outline", onPress: () => setShowFilters(true), color: colors.primary }]}
      />


      {(loading && !refreshing) ? (
        <View style={{flex: 1, padding: 24, justifyContent: 'flex-start'}}>
          <ShimmerPlaceholder style={{height: 180, borderRadius: 16, marginBottom: 16 , marginTop:50,}} />

        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error || "#EF4444"} />
          <Text style={[styles.errorText, { color: colors.error || "#EF4444" }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.accent || "#0056d2" }]}
            onPress={() => fetchGoalPlans(1)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !userId ? (
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={48} color={colors.error || "#EF4444"} />
          <Text style={[styles.errorText, { color: colors.error || "#EF4444" }]}> 
            Please log in to view your goal plans.
          </Text>
        </View>
      ) : goalPlans.length === 0 ? (
        renderEmptyState()
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingTop: 80 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary || "#0056d2"]}
              tintColor={colors.primary || "#0056d2"}
            />
          }
        >
          {goalPlans.map((plan, idx) => renderPlanCard(plan, idx))}

          {pageNumber < totalPages && (
            <TouchableOpacity
              style={[styles.loadMoreButton, { backgroundColor: colors.primary || "#0056d2" }]}
              onPress={loadMore}
            >
              <Feather name="chevron-down" size={20} color="#FFFFFF" />
              <Text style={[styles.loadMoreText, { color: colors.headerText || "#FFFFFF" }]}>Load More</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {renderFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    fontWeight: "500",
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
    fontWeight: "500",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  planCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  planHeader: {
    padding: 20,
  },
  planHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  planIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  planDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  planHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  expandButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  planSummary: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 20,
  },
  expandedContent: {
    padding: 20,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  monthPlansContainer: {
    gap: 16,
    marginBottom: 24,
  },
  monthCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  monthHeader: {
    padding: 16,
    alignItems: "flex-start",
  },
  monthBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  monthBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  monthContent: {
    padding: 16,
    paddingTop: 0,
  },
  monthSection: {
    marginBottom: 16,
  },
  monthSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  monthSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  monthSectionText: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaInfo: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 12,
    marginLeft: 8,
  },
  loadMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    padding: 32,
  },
  emptyStateContainer: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 300,

  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  selectedOption: {
    backgroundColor: "#e6f0fa",
    borderWidth: 1,
    borderColor: "#0056d2",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedOptionText: {
    color: "#0056d2",
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#0056d2",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

export default UserGoalPlansScreen;