import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeContext } from "components/theme/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { foodService } from "services/apiFoodService";
import { workoutService } from "services/apiWorkoutService";
import Header from "components/Header";

const { width } = Dimensions.get("window");
const SPACING = 16;

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Other"];

const NutritionDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors, theme } = useContext(ThemeContext);
  const { date, mealCalories: routeMealCalories, burnedCalories: routeBurnedCalories } = route?.params || {};
  const [mealCalories, setMealCalories] = useState(routeMealCalories || {});
  const [burnedCalories, setBurnedCalories] = useState(routeBurnedCalories || 0);
  const [caloriesSummary, setCaloriesSummary] = useState(0);
  const [nutritionTarget, setNutritionTarget] = useState({
    calories: null,
    carbs: null,
    protein: null,
    fats: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNutritionTarget = async () => {
      try {
        const raw = await AsyncStorage.getItem("nutritionTarget");
        if (raw) {
          const target = JSON.parse(raw);
          setNutritionTarget({
            calories: isNaN(Number(target.calories)) ? null : Number(target.calories),
            carbs: isNaN(Number(target.carbs)) ? null : Number(target.carbs),
            protein: isNaN(Number(target.protein)) ? null : Number(target.protein),
            fats: isNaN(Number(target.fats)) ? null : Number(target.fats),
          });
        }
      } catch (e) {
        setNutritionTarget({ calories: null, carbs: null, protein: null, fats: null });
      }
    };
    loadNutritionTarget();
  }, []);

  useEffect(() => {
    const fetchNutrition = async () => {
      if (routeMealCalories && routeBurnedCalories) {
        // Use route params if provided
        const totalCaloriesEaten = Object.values(routeMealCalories).reduce((sum, val) => sum + (val || 0), 0);
        setCaloriesSummary(totalCaloriesEaten - routeBurnedCalories);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Lấy log dinh dưỡng
        const res = await foodService.getMyNutritionLogs({ date });
        const logs = res?.data?.nutritionLogs || [];
        const mealCaloriesObj = {};
        let totalCaloriesEaten = 0;
        logs.forEach((log) => {
          const meal = log.mealType || "Other";
          if (!mealCaloriesObj[meal]) mealCaloriesObj[meal] = 0;
          mealCaloriesObj[meal] += log.calories || 0;
          totalCaloriesEaten += log.calories || 0;
        });
        setMealCalories(mealCaloriesObj);
        // Lấy calories burned từ workoutService
        const activities = await workoutService.getMyActivities({ date });
        const totalCaloriesBurned = Array.isArray(activities)
          ? activities
              .filter((act) => act.recordedAt && dayjs(act.recordedAt).format("YYYY-MM-DD") === dayjs(date).format("YYYY-MM-DD"))
              .reduce((sum, act) => sum + (act.caloriesBurned || 0), 0)
          : 0;
        setBurnedCalories(totalCaloriesBurned);
        setCaloriesSummary(totalCaloriesEaten - totalCaloriesBurned);
      } catch (e) {
        setMealCalories({});
        setBurnedCalories(0);
        setCaloriesSummary(0);
      } finally {
        setLoading(false);
      }
    };
    fetchNutrition();
  }, [date, routeMealCalories, routeBurnedCalories]);

  const getMealIcon = (meal) => {
    switch (meal) {
      case "Breakfast":
        return "wb-sunny";
      case "Lunch":
        return "wb-sunny";
      case "Dinner":
        return "brightness-3";
      default:
        return "restaurant";
    }
  };

  const getMealColor = (meal) => {
    switch (meal) {
      case "Breakfast":
        return "#FF9500";
      case "Lunch":
        return "#007AFF";
      case "Dinner":
        return "#5856D6";
      default:
        return "#8E8E93";
    }
  };

  const CaloriesSummaryCard = () => {
    const targetCalories = nutritionTarget.calories ? Number(nutritionTarget.calories) : null;
    const consumed = Object.values(mealCalories).reduce((sum, val) => sum + (val || 0), 0);
    const burned = burnedCalories || 0;
    const netCalories = consumed - burned;
    const remaining = targetCalories ? Math.max(targetCalories - netCalories, 0) : 2200 - netCalories;
    const total = targetCalories || 2200;
    const consumedPercentage = total > 0 ? Math.min((consumed / total) * 100, 100) : 0;
    const burnedPercentage = total > 0 ? Math.min((burned / total) * 100, 100) : 0;

    return (
      <View style={[styles.caloriesSummaryCard, { backgroundColor: colors.calorieCardBackground || "#FFFFFF" }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle || "#1E293B" }]}>Calories</Text>
          
        </View>
        <View style={styles.calorieMainDisplay}>
          <View style={styles.calorieMainInfo}>
            <Text
              style={[styles.calorieMainValue, { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B") }]}
            >
              {remaining}
            </Text>
            <Text style={[styles.calorieMainLabel, { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B") }]}>
              Remaining
            </Text>
            <Text
              style={{
                color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B"),
                fontSize: 12,
                marginTop: 2,
                opacity: 0.7,
              }}
            >
              Remaining = Target - Food + Exercise
            </Text>
          </View>
          <View style={styles.calorieProgressRing}>
            <View
              style={[
                styles.calorieProgressTrack,
                {
                  borderColor: (colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B")) + "20",
                  backgroundColor: colors.calorieCardBackground || "#FFFFFF",
                },
              ]}
            >
              <View
                style={[
                  styles.calorieProgressFill,
                  {
                    borderColor: colors.primary || "#6366F1",
                    borderTopColor: "transparent",
                    borderRightColor: "transparent",
                    borderBottomColor: "transparent",
                    transform: [{ rotate: `${Math.min(consumedPercentage * 3.6, 360)}deg` }],
                  },
                ]}
              />
            </View>
            <View style={styles.calorieProgressCenter}>
              <Feather name="target" size={24} color={colors.primary || "#6366F1"} />
            </View>
          </View>
        </View>
        <View style={styles.calorieStatsGrid}>
          <View
            style={[styles.calorieStatCard, { backgroundColor: colors.statCardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6") }]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === "dark" ? colors.statIconBackgroundLight || "#FFFFFF" : colors.statIconBackground || "#EEF2FF",
                },
              ]}
            >
              <Feather
                name="trending-up"
                size={16}
                color={theme === "dark" ? colors.primaryLight || "#A5B4FC" : colors.primary || "#6366F1"}
              />
            </View>
            <Text
              style={[styles.calorieStatValue, { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B") }]}
            >
              {consumed}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B"), opacity: 0.7 },
              ]}
            >
              Food
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[
                  styles.calorieStatProgressFill,
                  { width: `${consumedPercentage}%`, backgroundColor: colors.primary || "#6366F1" },
                ]}
              />
            </View>
          </View>
          <View
            style={[styles.calorieStatCard, { backgroundColor: colors.statCardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6") }]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === "dark" ? colors.statIconBackgroundLight || "#FFFFFF" : colors.statIconBackground || "#FEF2F2",
                },
              ]}
            >
              <Feather
                name="zap"
                size={16}
                color={theme === "dark" ? colors.warningLight || "#FCA5A5" : colors.warning || "#EF4444"}
              />
            </View>
            <Text
              style={[styles.calorieStatValue, { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B") }]}
            >
              {burned}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B"), opacity: 0.7 },
              ]}
            >
              Exercise
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[
                  styles.calorieStatProgressFill,
                  { width: `${burnedPercentage}%`, backgroundColor: colors.warning || "#EF4444" },
                ]}
              />
            </View>
          </View>
          <View
            style={[styles.calorieStatCard, { backgroundColor: colors.statCardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6") }]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === "dark" ? colors.statIconBackgroundLight || "#FFFFFF" : colors.statIconBackground || "#F0FDF4",
                },
              ]}
            >
              <Feather
                name="activity"
                size={16}
                color={theme === "dark" ? colors.successLight || "#6EE7B7" : colors.success || "#10B981"}
              />
            </View>
            <Text
              style={[styles.calorieStatValue, { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B") }]}
            >
              {netCalories}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B"), opacity: 0.7 },
              ]}
            >
              Net
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[
                  styles.calorieStatProgressFill,
                  { width: `${Math.min(Math.abs(netCalories / total) * 100, 100)}%`, backgroundColor: colors.success || "#10B981" },
                ]}
              />
            </View>
          </View>
          <View
            style={[styles.calorieStatCard, { backgroundColor: colors.statCardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6") }]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === "dark" ? colors.statIconBackgroundLight || "#FFFFFF" : colors.statIconBackground || "#FFFBEB",
                },
              ]}
            >
              <Feather
                name="flag"
                size={16}
                color={theme === "dark" ? colors.infoLight || "#FDE68A" : colors.info || "#F59E0B"}
              />
            </View>
            <Text
              style={[styles.calorieStatValue, { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B") }]}
            >
              {total}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B"), opacity: 0.7 },
              ]}
            >
              Target
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[
                  styles.calorieStatProgressFill,
                  { width: "100%", backgroundColor: colors.info || "#F59E0B" },
                ]}
              />
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.createTargetButton, { backgroundColor: colors.accent || "#0056d2" }]}
          onPress={() => navigation.navigate("CreateTargetScreen")}
        >
          <Ionicons name="add" size={20} color={colors.textFilter || "#FFFFFF"} />
          <Text style={[styles.createTargetButtonText, { color: colors.textFilter || "#FFFFFF" }]}>Create Target</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!date) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background || "#F8FAFC" }]}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor={colors.headerBackground || "#fff"} />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: colors.error || "#EF4444", fontSize: 16 }}>Không có dữ liệu ngày!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background || "#F8FAFC" }]}>
      <StatusBar style={theme === "dark" ? "light" : "dark"} backgroundColor={colors.headerBackground || "#fff"} />
      <Header
        title="Nutrition Details"
        onBack={() => navigation.goBack()}
        showAvatar={false}
        rightActions={[]}
      />
      <View style={styles.subtitleContainer}>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary || "#64748B" }]}>
          {dayjs(date).format("MMMM DD, YYYY")}
        </Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calories Summary */}
        {!loading && <CaloriesSummaryCard />}

        {loading ? (
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ color: colors.textSecondary || "#64748B", fontSize: 16 }}>
              Loading nutrition data...
            </Text>
          </View>
        ) : (
          <>
        
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  subtitleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: "600",
  },
  caloriesSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    marginBottom: 24,
  },
  calorieMainDisplay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  calorieMainInfo: {
    flex: 1,
  },
  calorieMainValue: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  calorieMainLabel: {
    fontSize: 16,
  },
  calorieProgressRing: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  calorieProgressTrack: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
  },
  calorieProgressFill: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
  },
  calorieProgressCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  calorieStatsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  calorieStatCard: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  calorieStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  calorieStatValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  calorieStatLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  calorieStatProgress: {
    width: "100%",
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    overflow: "hidden",
  },
  calorieStatProgressFill: {
    height: "100%",
    borderRadius: 2,
  },
  summaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  mealIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F293B",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  createTargetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  createTargetButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default NutritionDetailsScreen;