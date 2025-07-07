import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { theme } from "theme/color";
import dayjs from "dayjs";
import { foodService } from "services/apiFoodService";
import { workoutService } from "services/apiWorkoutService";

const { width } = Dimensions.get("window");
const SPACING = 16;

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Other"];

const NutritionDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const date = route?.params?.date;
  const [mealCalories, setMealCalories] = useState({});
  const [burnedCalories, setBurnedCalories] = useState(0);
  const [caloriesSummary, setCaloriesSummary] = useState(0);
  const [loading, setLoading] = useState(true);

  if (!date) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 16 }}>Không có dữ liệu ngày!</Text>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    const fetchNutrition = async () => {
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
        // Lấy calories burned từ workoutService (tính tổng theo ngày hiện tại)
        const activities = await workoutService.getMyActivities({ date });
        const totalCaloriesBurned = Array.isArray(activities)
          ? activities.filter(act => act.recordedAt && dayjs(act.recordedAt).format('YYYY-MM-DD') === dayjs(date).format('YYYY-MM-DD'))
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
  }, [date]);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Nutrition Details</Text>
            <Text style={styles.headerSubtitle}>{dayjs(date).format("MMMM DD, YYYY")}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Calories Summary */}
        {!loading && (
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#374151' }}>Calories Summary</Text>
            <Text style={{ fontSize: 32, fontWeight: 'bold', color: caloriesSummary >= 0 ? '#10B981' : '#EF4444', marginTop: 4 }}>
              {caloriesSummary > 0 ? '+' : ''}{caloriesSummary}
            </Text>
            <Text style={{ color: '#64748B', fontSize: 14, marginTop: 2 }}>
              (Calories eaten - Calories burned)
            </Text>
          </View>
        )}

        {loading ? (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#64748B', fontSize: 16 }}>Loading nutrition data...</Text>
          </View>
        ) : (
          <>
            {/* Meal Calories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calories by Meal</Text>
              <View style={styles.summaryContainer}>
                {MEAL_TYPES.map((mealType) => (
                  <View key={mealType} style={styles.summaryCard}>
                    <View style={[styles.mealIconContainer, { backgroundColor: getMealColor(mealType) }]}>
                      <Ionicons name={getMealIcon(mealType)} size={20} color="#FFFFFF" />
                    </View>
                    <Text style={styles.summaryValue}>{Math.round(mealCalories[mealType] || 0)}</Text>
                    <Text style={styles.summaryLabel}>{mealType}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Activity Calories */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calories Burned</Text>
              <View style={styles.summaryCard}>
                <View style={[styles.mealIconContainer, { backgroundColor: "#FF6B35" }]}>
                  <Ionicons name="flame" size={20} color="#FFFFFF" />
                </View>
                <Text style={styles.summaryValue}>{Math.round(burnedCalories || 0)}</Text>
                <Text style={styles.summaryLabel}>Activity</Text>
              </View>
            </View>
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
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
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
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
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
    color: "#1F2937",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
});

export default NutritionDetailsScreen;