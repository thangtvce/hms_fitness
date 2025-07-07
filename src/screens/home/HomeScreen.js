"use client"

import React, { useCallback, useMemo, useState, useEffect, useContext } from "react"
import { LineChart } from "react-native-chart-kit"
import { weightHistoryService } from "services/apiWeightHistoryService"
import { ThemeContext } from "components/theme/ThemeContext"
import { AuthContext } from "context/AuthContext"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import apiUserService from "services/apiUserService"
import { foodService } from "services/apiFoodService"
import { workoutService } from "services/apiWorkoutService"
import AsyncStorage from "@react-native-async-storage/async-storage"
import dayjs from "dayjs"
import * as Notifications from "expo-notifications"
import { useFocusEffect } from "@react-navigation/native"
import { apiUserWaterLogService } from "services/apiUserWaterLogService"

const { width } = Dimensions.get("window")
const SPACING = 20
const screenWidth = Dimensions.get("window").width

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext)
  const { colors, theme } = useContext(ThemeContext)
  const fadeAnim = React.useRef(new Animated.Value(0)).current
  const translateY = React.useRef(new Animated.Value(30)).current
  const [currentDate] = useState(new Date())
  const [activeIcon, setActiveIcon] = useState("Profile")
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [nutritionTarget, setNutritionTarget] = useState({
    calories: null,
    carbs: null,
    protein: null,
    fats: null,
  })

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const currentDayIndex = currentDate.getDay()

  // Fake trainer data for advertisement banner
  const trainerAds = [
    {
      id: 1,
      name: "Sarah Johnson",
      specialty: "Weight Loss & Nutrition",
      rating: 4.9,
      clients: 250,
      image:
        "https://images.unsplash.com/photo-1594824804732-ca8db4394b12?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      badge: "Top Rated",
      experience: "5+ years",
    },
    {
      id: 2,
      name: "Mike Chen",
      specialty: "Strength Training",
      rating: 4.8,
      clients: 180,
      image:
        "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      badge: "Certified",
      experience: "7+ years",
    },
    {
      id: 3,
      name: "Emma Davis",
      specialty: "Yoga & Mindfulness",
      rating: 4.9,
      clients: 320,
      image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
      badge: "Expert",
      experience: "6+ years",
    },
  ]

  const [currentTrainerIndex, setCurrentTrainerIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTrainerIndex((prev) => (prev + 1) % trainerAds.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const defaultSummary = {
    nutritionSummary: {
      consumedCalories: 0,
      remainingCalories: 2200,
      totalCalories: 2200,
      macros: {
        carbs: { value: 0, target: nutritionTarget.carbs, unit: "g", color: "#4F46E5" },
        protein: { value: 0, target: nutritionTarget.protein, unit: "g", color: "#10B981" },
        fats: { value: 0, target: nutritionTarget.fats, unit: "g", color: "#F59E0B" },
      },
    },
    activitySummary: { burnedCalories: 0, steps: 0, target: 10000 },
    mealPlans: [
      {
        plan_name: "Balanced Diet",
        daily_calories: 2200,
        meal_frequency: 3,
        image:
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
      },
      {
        plan_name: "High Protein",
        daily_calories: 2400,
        meal_frequency: 4,
        image:
          "https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80",
      },
    ],
    mealCalories: { Breakfast: 0, Lunch: 0, Dinner: 0, Other: 0 },
  }

  const calculateAge = (birthDate) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatLastLogin = (lastLogin) => {
    const date = new Date(lastLogin)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    return date.toLocaleDateString()
  }

  const fetchUserData = async (isRefresh = false) => {
    if (!user || !user.userId) return
    if (!isRefresh) {
      setLoading(true)
    }
    setError(null)
    try {
      const userData = await apiUserService.getUserById(user.userId)
      const avatar = userData.data.avatar
      if (avatar) {
        await AsyncStorage.setItem("userAvatar", avatar)
      }

      const startDate = dayjs(currentDate).format("YYYY-MM-DD")
      const endDate = dayjs(currentDate).format("YYYY-MM-DD")
      const startOfMonth = dayjs(currentDate).startOf("month").format("YYYY-MM-DD")
      const endOfMonth = dayjs(currentDate).endOf("month").format("YYYY-MM-DD")

      const nutritionResponse = await foodService.getMyNutritionLogs({
        pageNumber: 1,
        pageSize: 200,
        startDate: startOfMonth,
        endDate: endOfMonth,
      })

      const grouped = {}
      if (nutritionResponse.statusCode === 200 && Array.isArray(nutritionResponse.data.nutritionLogs)) {
        nutritionResponse.data.nutritionLogs.forEach((log) => {
          const date = dayjs(log.consumptionDate).format("YYYY-MM-DD")
          if (!grouped[date]) grouped[date] = []
          grouped[date].push(log)
        })
      }

      const todayKey = dayjs(currentDate).format("YYYY-MM-DD")
      const todayLogs = grouped[todayKey] || []

      let consumedCalories = 0
      let carbs = 0
      let protein = 0
      let fats = 0
      const mealCalories = { Breakfast: 0, Lunch: 0, Dinner: 0, Other: 0 }

      todayLogs.forEach((log) => {
        consumedCalories += log.calories || 0
        carbs += log.carbs || 0
        protein += log.protein || 0
        fats += log.fats || 0
        const mealType = ["Breakfast", "Lunch", "Dinner"].includes(log.mealType) ? log.mealType : "Other"
        mealCalories[mealType] += log.calories || 0
      })

      const activitiesResponse = await workoutService.getMyActivities({
        pageNumber: 1,
        pageSize: 50,
      })

      let burnedCalories = 0
      let steps = 0
      if (Array.isArray(activitiesResponse)) {
        const todayActivities = activitiesResponse.filter((activity) =>
          dayjs(activity.recordedAt).isSame(currentDate, "day"),
        )
        burnedCalories = todayActivities.reduce((sum, activity) => sum + (activity.caloriesBurned || 0), 0)
        steps = todayActivities.reduce((sum, activity) => sum + (activity.steps || 0), 0)
      }

      const totalCalories = userData.data.dailyCalorieGoal || defaultSummary.nutritionSummary.totalCalories
      const netCalories = consumedCalories - burnedCalories
      const remainingCalories = Math.max(totalCalories - netCalories, 0)

      setDashboardData({
        user: userData.data,
        nutritionSummary: {
          consumedCalories: Math.round(consumedCalories),
          remainingCalories: Math.round(remainingCalories),
          totalCalories: Math.round(totalCalories),
          macros: {
            carbs: { ...defaultSummary.nutritionSummary.macros.carbs, value: Math.round(carbs) },
            protein: { ...defaultSummary.nutritionSummary.macros.protein, value: Math.round(protein) },
            fats: { ...defaultSummary.nutritionSummary.macros.fats, value: Math.round(fats) },
          },
        },
        activitySummary: {
          ...defaultSummary.activitySummary,
          burnedCalories: Math.round(burnedCalories),
          steps,
        },
        mealPlans: defaultSummary.mealPlans,
        mealCalories,
      })
    } catch (err) {
      setError("Failed to load data. Please try again later.")
      setDashboardData({
        ...defaultSummary,
        user: user || { fullName: "Unknown User", gender: "N/A", birthDate: null, lastLogin: new Date() },
      })
    } finally {
      if (!isRefresh) {
        setLoading(false)
      }
      if (isRefresh) {
        setRefreshing(false)
      }
    }
  }

  const checkAndSaveNutritionTarget = async (macros, calories, burnedCalories) => {
    try {
      const raw = await AsyncStorage.getItem("nutritionTarget")
      if (!raw) return
      const target = JSON.parse(raw)
      const netCalories = Number(calories) - Number(burnedCalories)
      const completed =
        Number(macros.carbs) >= Number(target.carbs) &&
        Number(macros.protein) >= Number(target.protein) &&
        Number(macros.fats) >= Number(target.fats) &&
        netCalories >= Number(target.calories)

      const today = dayjs(currentDate).format("YYYY-MM-DD")
      let history = []
      const rawHistory = await AsyncStorage.getItem("nutritionTargetHistory")
      if (rawHistory) history = JSON.parse(rawHistory)

      if (!history.find((h) => h.date === today)) {
        history.push({
          date: today,
          completed,
          carbs: macros.carbs,
          protein: macros.protein,
          fats: macros.fats,
          calories: calories,
          burnedCalories: burnedCalories,
          netCalories: netCalories,
          targetCarbs: target.carbs,
          targetProtein: target.protein,
          targetFats: target.fats,
          targetCalories: target.calories,
        })
        await AsyncStorage.setItem("nutritionTargetHistory", JSON.stringify(history))
      }

      if (completed) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "🎉 Nutrition Target Achieved!",
            body: `You have met your daily nutrition target! Great job!`,
          },
          trigger: null,
        })
      }
    } catch (e) {
      // Handle error silently
    }
  }

  useEffect(() => {
    fetchUserData()
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, translateY, user?.userId])

  useFocusEffect(
    useCallback(() => {
      ;(async () => {
        try {
          const raw = await AsyncStorage.getItem("nutritionTarget")
          if (raw) {
            const target = JSON.parse(raw)
            setNutritionTarget({
              calories: isNaN(Number(target.calories)) ? null : Number(target.calories),
              carbs: isNaN(Number(target.carbs)) ? null : Number(target.carbs),
              protein: isNaN(Number(target.protein)) ? null : Number(target.protein),
              fats: isNaN(Number(target.fats)) ? null : Number(target.fats),
            })
          } else {
            setNutritionTarget({ calories: null, carbs: null, protein: null, fats: null })
          }
        } catch (e) {
          setNutritionTarget({ calories: null, carbs: null, protein: null, fats: null })
        }
      })()
    }, []),
  )

  useEffect(() => {
    if (dashboardData) {
      checkAndSaveNutritionTarget(
        {
          carbs: dashboardData.nutritionSummary.macros.carbs.value,
          protein: dashboardData.nutritionSummary.macros.protein.value,
          fats: dashboardData.nutritionSummary.macros.fats.value,
        },
        dashboardData.nutritionSummary.consumedCalories,
        dashboardData.activitySummary.burnedCalories,
      )
    }
  }, [dashboardData])

  const getGreeting = useCallback(() => {
    const hour = currentDate.getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 17) return "Good Afternoon"
    return "Good Evening"
  }, [currentDate])

  const handleNavigation = useCallback(
    (route, params) => {
      if (route) {
        setActiveIcon(route)
        navigation.navigate(route, params)
      } else {
        Alert.alert("Coming Soon", "This feature will be available soon!")
      }
    },
    [navigation],
  )

  const discoverItems = useMemo(
    () => [
      {
        title: "Profile",
        icon: "user",
        route: "Profile",
        gradient: ["#4F46E5", "#6366F1"],
        badge: null,
      },
      {
        title: "Favorite Foods",
        icon: "heart",
        route: "FavoriteFoodScreen",
        gradient: ["#EC4899", "#F472B6"],
        badge: 3,
      },
      {
        title: "Workouts",
        icon: "activity",
        route: "Workouts",
        gradient: ["#F59E0B", "#FBBF24"],
        badge: null,
      },
      {
        title: "Community",
        icon: "users",
        route: "Community",
        gradient: ["#10B981", "#34D399"],
        badge: 5,
      },
      {
        title: "Food",
        icon: "coffee",
        route: "Food",
        gradient: ["#6366F1", "#818CF8"],
        badge: null,
      },
      {
        title: "Health Consultation",
        icon: "activity",
        route: "HealthConsultationScreen",
        gradient: ["#4F46E5", "#818CF8"],
        badge: null,
      },
    ],
    [],
  )

  const renderDiscoverItem = (item, index) => {
    const isActive = activeIcon === item.title
    return (
      <TouchableOpacity
        key={index}
        style={[styles.discoverItem, isActive && styles.activeDiscoverItem]}
        onPress={() => handleNavigation(item.route)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={item.gradient}
          style={styles.discoverIconContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name={item.icon} size={26} color="#FFFFFF" />
          {item.badge && (
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
        </LinearGradient>
        <Text
          style={[
            styles.discoverTitle,
            { color: isActive ? colors.activeDiscoverTitle : colors.discoverTitle },
            isActive && styles.activeDiscoverTitle,
          ]}
        >
          {item.title}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    )
  }

  const MacroProgress = ({ name, color, value, target, unit, textColor }) => {
    const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0
    return (
      <View style={styles.macroItem}>
        <View style={styles.macroHeader}>
          <Text style={[styles.macroName, { color: textColor }]}>{name}</Text>
          <Text style={styles.macroValue}>
            <Text style={{ color, fontWeight: "700" }}>{value}</Text>
            <Text style={{ color: textColor, opacity: 0.7 }}>
              /{target} {unit}
            </Text>
          </Text>
        </View>
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={[color, color]}
            style={[styles.progressBar, { width: `${percentage}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      </View>
    )
  }

  const AIGoalPlanBanner = () => {
    return (
      <TouchableOpacity
        style={styles.aiGoalPlanBanner}
        onPress={() => handleNavigation("UserGoalPlansScreen")}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={["#0056d2", "#6366F1"]}
          style={styles.aiGoalPlanBannerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.aiGoalPlanBannerContent}>
            <View style={styles.aiGoalPlanBannerLeft}>
              <View style={styles.aiGoalPlanBannerIcon}>
                <Feather name="zap" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.aiGoalPlanBannerText}>
                <Text style={styles.aiGoalPlanBannerTitle}>AI Goal Plan</Text>
                <Text style={styles.aiGoalPlanBannerSubtitle}>Get personalized fitness plan</Text>
              </View>
            </View>
            <View style={styles.aiGoalPlanBannerRight}>
              <View style={styles.aiGoalPlanBannerBadge}>
                <Text style={styles.aiGoalPlanBannerBadgeText}>NEW</Text>
              </View>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  const CaloriesSummaryCard = () => {
    const targetCalories = nutritionTarget.calories ? Number(nutritionTarget.calories) : null
    const consumed = dashboardData?.nutritionSummary?.consumedCalories || 0
    const burned = dashboardData?.activitySummary?.burnedCalories || 0
    const netCalories = consumed - burned
    const remaining = targetCalories
      ? Math.max(targetCalories - netCalories, 0)
      : dashboardData?.nutritionSummary?.remainingCalories || 0
    const total = targetCalories || dashboardData?.nutritionSummary?.totalCalories || 2200

    const consumedPercentage = total > 0 ? Math.min((consumed / total) * 100, 100) : 0
    const burnedPercentage = total > 0 ? Math.min((burned / total) * 100, 100) : 0

    return (
      <View style={[styles.caloriesSummaryCard, { backgroundColor: colors.calorieCardBackground }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Calories</Text>
          <TouchableOpacity
            onPress={() =>
              handleNavigation("NutritionDetailsScreen", {
                date: dayjs(currentDate).format("YYYY-MM-DD"),
                mealCalories: dashboardData.mealCalories,
                burnedCalories: dashboardData.activitySummary.burnedCalories,
              })
            }
          >
            <Text style={[styles.sectionAction, { color: colors.sectionAction }]}>View Details</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.calorieMainDisplay}>
          <View style={styles.calorieMainInfo}>
            <Text style={[styles.calorieMainValue, { color: colors.calorieCardText }]}>{remaining}</Text>
            <Text style={[styles.calorieMainLabel, { color: colors.calorieCardText }]}>Remaining</Text>
            <Text style={{ color: colors.calorieCardText, fontSize: 12, marginTop: 2, opacity: 0.7 }}>
              {`Remaining = Target - Food + Exercise`}
            </Text>
          </View>
          <View style={styles.calorieProgressRing}>
            <View
              style={[
                styles.calorieProgressTrack,
                { borderColor: colors.calorieCardText + "20", backgroundColor: colors.calorieCardBackground },
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
            style={[
              styles.calorieStatCard,
              { backgroundColor: colors.statCardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6") },
            ]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === "dark"
                      ? colors.statIconBackgroundLight || "#fff"
                      : colors.statIconBackground || "#EEF2FF",
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
              style={[
                styles.calorieStatValue,
                { color: colors.calorieCardText || (theme === "dark" ? "#fff" : "#18181B") },
              ]}
            >
              {consumed}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === "dark" ? "#fff" : "#18181B"), opacity: 0.7 },
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
            style={[
              styles.calorieStatCard,
              { backgroundColor: colors.statCardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6") },
            ]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === "dark"
                      ? colors.statIconBackgroundLight || "#fff"
                      : colors.statIconBackground || "#FEF2F2",
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
              style={[
                styles.calorieStatValue,
                { color: colors.calorieCardText || (theme === "dark" ? "#fff" : "#18181B") },
              ]}
            >
              {burned}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === "dark" ? "#fff" : "#18181B"), opacity: 0.7 },
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
            style={[
              styles.calorieStatCard,
              { backgroundColor: colors.statCardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6") },
            ]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === "dark"
                      ? colors.statIconBackgroundLight || "#fff"
                      : colors.statIconBackground || "#F0FDF4",
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
              style={[
                styles.calorieStatValue,
                { color: colors.calorieCardText || (theme === "dark" ? "#fff" : "#18181B") },
              ]}
            >
              {netCalories}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === "dark" ? "#fff" : "#18181B") },
              ]}
            >
              Net
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[
                  styles.calorieStatProgressFill,
                  {
                    width: `${Math.min(Math.abs(netCalories / total) * 100, 100)}%`,
                    backgroundColor: colors.success || "#10B981",
                  },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              styles.calorieStatCard,
              { backgroundColor: colors.statCardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6") },
            ]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === "dark"
                      ? colors.statIconBackgroundLight || "#fff"
                      : colors.statIconBackground || "#FFFBEB",
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
              style={[
                styles.calorieStatValue,
                { color: colors.calorieCardText || (theme === "dark" ? "#fff" : "#18181B") },
              ]}
            >
              {targetCalories || total}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === "dark" ? "#fff" : "#18181B") },
              ]}
            >
              Target
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[styles.calorieStatProgressFill, { width: "100%", backgroundColor: colors.info || "#F59E0B" }]}
              />
            </View>
          </View>
        </View>
      </View>
    )
  }

  const MealItem = ({ meal }) => {
    const { colors } = useContext(ThemeContext)
    return (
      <View
        style={[
          styles.mealCard,
          {
            backgroundColor: colors.mealCardBackground || colors.cardBackground,
            borderColor: colors.mealCardBorder || colors.border,
            shadowColor: colors.mealCardShadow || colors.shadow,
          },
        ]}
      >
        <Image source={{ uri: meal.image }} style={styles.mealImage} resizeMode="cover" />
        <View style={styles.mealContent}>
          <View style={styles.mealInfo}>
            <Text style={[styles.mealTitle, { color: colors.mealCardTitle || colors.text }]}>{meal.type}</Text>
            <Text style={[styles.mealSubtitle, { color: colors.mealCardSubtitle || colors.textSecondary }]}>
              {meal.recommended}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.mealAddButtonBackground || colors.primary }]}
            onPress={() => handleNavigation("Food")}
          >
            <View
              style={[styles.addButtonGradient, { backgroundColor: colors.mealAddButtonBackground || colors.primary }]}
            >
              <Feather name="plus" size={16} color={colors.mealAddButtonIcon || "#FFFFFF"} />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const WaterIntakePreview = () => {
    const { colors } = useContext(ThemeContext)
    const [todayIntake, setTodayIntake] = useState(0)
    const [weeklyAverage, setWeeklyAverage] = useState(0)
    const RECOMMENDED_DAILY_INTAKE = 2000
    const user = useContext(AuthContext)?.user

    useEffect(() => {
      const fetchWater = async () => {
        try {
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const tomorrow = new Date(today)
          tomorrow.setDate(today.getDate() + 1)
          const weekAgo = new Date(today)
          weekAgo.setDate(today.getDate() - 6)

          const res = await apiUserWaterLogService.getMyWaterLogs({
            startDate: weekAgo.toISOString().split("T")[0],
            endDate: tomorrow.toISOString().split("T")[0],
            pageSize: 100,
          })

          const logs = res?.data?.records || res?.data || []
          const todayTotal = logs
            .filter((log) => {
              const d = new Date(log.consumptionDate)
              return d >= today && d < tomorrow
            })
            .reduce((sum, log) => sum + (log.amountMl || 0), 0)

          setTodayIntake(todayTotal)

          const dailyTotals = Array(7).fill(0)
          for (let i = 0; i < 7; i++) {
            const day = new Date(weekAgo)
            day.setDate(weekAgo.getDate() + i)
            const nextDay = new Date(day)
            nextDay.setDate(day.getDate() + 1)

            dailyTotals[i] = logs
              .filter((log) => {
                const d = new Date(log.consumptionDate)
                return d >= day && d < nextDay
              })
              .reduce((sum, log) => sum + (log.amountMl || 0), 0)
          }

          setWeeklyAverage(dailyTotals.reduce((a, b) => a + b, 0) / 7)
        } catch (e) {
          setTodayIntake(0)
          setWeeklyAverage(0)
        }
      }

      fetchWater()
    }, [user])

    return (
      <View style={[styles.healthCard, { marginBottom: -30 }]}>
        <LinearGradient colors={["#ffffff", "#ffffff", "#ffffff"]} style={styles.healthCardGradient}>
          <View style={styles.healthCardHeader}>
            <Feather name="droplet" size={22} color="#fff" />
            <Text style={styles.healthCardTitle}>Today's Hydration</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(todayIntake / RECOMMENDED_DAILY_INTAKE, 1) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {todayIntake} / {RECOMMENDED_DAILY_INTAKE} ml
            </Text>
          </View>
          <View style={styles.healthStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round((todayIntake / RECOMMENDED_DAILY_INTAKE) * 100)}%</Text>
              <Text style={styles.statLabel}>Daily Goal</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Math.round(weeklyAverage)}</Text>
              <Text style={styles.statLabel}>Weekly Avg</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    )
  }

  const TrainerBanner = () => {
    const currentTrainer = trainerAds[currentTrainerIndex]
    return (
      <TouchableOpacity
        style={[
          styles.trainerBanner,
          {
            backgroundColor: colors.trainerBannerBackground || colors.cardBackground,
            shadowColor: colors.trainerBannerShadow || colors.shadow,
          },
        ]}
        onPress={() => Alert.alert("Trainer Profile", `Contact ${currentTrainer.name} for personalized training!`)}
        activeOpacity={0.9}
      >
        <View style={styles.trainerBannerGradient}>
          <View style={styles.trainerContent}>
            <View style={styles.trainerInfo}>
              <View
                style={[
                  styles.trainerBadge,
                  { backgroundColor: colors.trainerBadgeBackground || "rgba(255,255,255,0.2)" },
                ]}
              >
                <Text style={[styles.trainerBadgeText, { color: colors.trainerBadgeText || "#FFFFFF" }]}>
                  {currentTrainer.badge}
                </Text>
              </View>
              <Text style={[styles.trainerName, { color: colors.trainerName || "#FFFFFF" }]}>
                {currentTrainer.name}
              </Text>
              <Text style={[styles.trainerSpecialty, { color: colors.trainerSpecialty || "rgba(255,255,255,0.9)" }]}>
                {currentTrainer.specialty}
              </Text>
              <View style={styles.trainerStats}>
                <View style={styles.trainerStat}>
                  <Feather name="star" size={14} color="#FCD34D" />
                  <Text style={[styles.trainerStatText, { color: colors.trainerStatText || "#FFFFFF" }]}>
                    {currentTrainer.rating}
                  </Text>
                </View>
                <View style={styles.trainerStat}>
                  <Feather name="users" size={14} color={colors.trainerIcon || "#FFFFFF"} />
                  <Text style={[styles.trainerStatText, { color: colors.trainerStatText || "#FFFFFF" }]}>
                    {currentTrainer.clients}+ clients
                  </Text>
                </View>
                <View style={styles.trainerStat}>
                  <Feather name="award" size={14} color={colors.trainerIcon || "#FFFFFF"} />
                  <Text style={[styles.trainerStatText, { color: colors.trainerStatText || "#FFFFFF" }]}>
                    {currentTrainer.experience}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: colors.trainerButtonBackground || "#FFFFFF" }]}
              >
                <Text style={[styles.contactButtonText, { color: colors.trainerButtonText || "#4F46E5" }]}>
                  Get Training Plan
                </Text>
                <Feather name="arrow-right" size={16} color={colors.trainerButtonText || "#4F46E5"} />
              </TouchableOpacity>
            </View>
            <View style={styles.trainerImageContainer}>
              <Image source={{ uri: currentTrainer.image }} style={styles.trainerImage} />
              <View style={styles.trainerImageOverlay}>
                <Feather name="play-circle" size={24} color={colors.trainerIcon || "#FFFFFF"} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchUserData(true)
  }, [user?.userId])

  useEffect(() => {
    ;(async () => {
      const { status } = await Notifications.getPermissionsAsync()
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync()
      }
    })()
  }, [])

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading your health data...</Text>
        </LinearGradient>
      </View>
    )
  }

  if (error && !refreshing) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchUserData()}>
          <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.retryButtonGradient}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    )
  }

  function WeightStatsAndChart() {
    const { colors } = useContext(ThemeContext)
    const auth = useContext(AuthContext)
    const user = auth && auth.user
    const authToken = auth && auth.authToken
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)
    const [timeFrame, setTimeFrame] = useState("3m")
    const [stats, setStats] = useState({ current: 0, lowest: 0, highest: 0, average: 0, change: 0 })

    const timeFrameOptions = [
      { key: "7d", label: "7 Days" },
      { key: "30d", label: "30 Days" },
      { key: "3m", label: "3 Months" },
      { key: "6m", label: "6 Months" },
      { key: "12m", label: "12 Months" },
    ]

    const fetchWeightHistory = useCallback(async () => {
      try {
        setLoading(true)
        if (user && authToken) {
          const response = await weightHistoryService.getMyWeightHistory({ pageNumber: 1, pageSize: 100 })
          if (response.statusCode === 200 && response.data) {
            const sortedRecords = (response.data.records || []).sort(
              (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt),
            )
            setHistory(sortedRecords)
            calculateStats(sortedRecords)
          }
        }
      } catch (error) {
        Alert.alert("Error", "Failed to load weight history. Please try again later.")
      } finally {
        setLoading(false)
      }
    }, [user, authToken])

    const calculateStats = (data) => {
      if (!data || data.length === 0) {
        setStats({ current: 0, lowest: 0, highest: 0, average: 0, change: 0 })
        return
      }
      const weights = data.map((item) => item.weight)
      const current = data[0].weight
      const lowest = Math.min(...weights)
      const highest = Math.max(...weights)
      const average = weights.reduce((sum, weight) => sum + weight, 0) / weights.length
      const change = data.length > 1 ? current - data[data.length - 1].weight : 0

      setStats({
        current: Number.parseFloat(current.toFixed(1)),
        lowest: Number.parseFloat(lowest.toFixed(1)),
        highest: Number.parseFloat(highest.toFixed(1)),
        average: Number.parseFloat(average.toFixed(1)),
        change: Number.parseFloat(change.toFixed(1)),
      })
    }

    useEffect(() => {
      fetchWeightHistory()
    }, [fetchWeightHistory])

    const filterHistoryByTimeFrame = (data) => {
      const now = new Date()
      switch (timeFrame) {
        case "7d":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 7 * 24 * 60 * 60 * 1000
          })
        case "30d":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 30 * 24 * 60 * 60 * 1000
          })
        case "3m":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 90 * 24 * 60 * 60 * 1000
          })
        case "6m":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 180 * 24 * 60 * 60 * 1000
          })
        case "12m":
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt)
            return now - itemDate <= 365 * 24 * 60 * 60 * 1000
          })
        default:
          return data
      }
    }

    const filteredHistory = filterHistoryByTimeFrame(history)
    const chartData = {
      labels: filteredHistory
        .slice(0, 10)
        .reverse()
        .map((item) => {
          const date = new Date(item.recordedAt)
          if (timeFrame === "7d" || timeFrame === "30d") {
            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
          } else {
            return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
          }
        }),
      datasets: [
        {
          data:
            filteredHistory.length > 0
              ? filteredHistory
                  .slice(0, 10)
                  .reverse()
                  .map((item) => item.weight)
              : [0],
        },
      ],
    }

    if (loading) {
      return (
        <View style={styles.weightLoadingContainer}>
          <ActivityIndicator size="small" color="#4F46E5" />
          <Text style={[styles.weightLoadingText, { color: colors.text }]}>Loading weight data...</Text>
        </View>
      )
    }

    return (
      <View style={[styles.weightContainer, { backgroundColor: colors.cardBackground }]}>
        {/* Stats Row */}
        <View style={styles.weightStatsRow}>
          <View style={styles.weightStatItem}>
            <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>Current</Text>
            <Text style={[styles.weightStatValue, { color: colors.text }]}>{stats.current} kg</Text>
          </View>
          <View style={styles.weightStatItem}>
            <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>Average</Text>
            <Text style={[styles.weightStatValue, { color: colors.text }]}>{stats.average} kg</Text>
          </View>
          <View style={styles.weightStatItem}>
            <Text style={[styles.weightStatLabel, { color: colors.textSecondary }]}>Change</Text>
            <Text
              style={[
                styles.weightStatValue,
                {
                  color: stats.change > 0 ? "#E53E3E" : stats.change < 0 ? "#38A169" : colors.text,
                },
              ]}
            >
              {stats.change > 0 ? "+" : ""}
              {stats.change} kg
            </Text>
          </View>
        </View>

        {/* Chart Container */}
        <View style={styles.weightChartContainer}>
          {filteredHistory.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={chartData}
                width={Math.max(screenWidth - 64, chartData.labels.length * 60)}
                height={200}
                yAxisLabel=""
                yAxisSuffix=" kg"
                chartConfig={{
                  backgroundColor: "#FFFFFF",
                  backgroundGradientFrom: "#FFFFFF",
                  backgroundGradientTo: "#FFFFFF",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(79, 70, 229, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(31, 41, 55, ${opacity})`,
                  style: { borderRadius: 12 },
                  propsForDots: { r: "4", strokeWidth: "2", stroke: "#4F46E5" },
                  propsForLabels: { fontSize: 10 },
                }}
                bezier
                style={styles.weightChart}
              />
            </ScrollView>
          ) : (
            <View style={styles.weightNoDataContainer}>
              <Text style={[styles.weightNoDataText, { color: colors.textSecondary }]}>
                No weight data for this period
              </Text>
            </View>
          )}
        </View>

        {/* Time Frame Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeFrameScrollContainer}>
          <View style={styles.timeFrameContainer}>
            {timeFrameOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.timeFrameButton,
                  {
                    backgroundColor: timeFrame === option.key ? "#4F46E5" : colors.cardBackground || "#F3F4F6",
                    borderColor: timeFrame === option.key ? "#4F46E5" : colors.border || "#E5E7EB",
                  },
                ]}
                onPress={() => setTimeFrame(option.key)}
              >
                <Text
                  style={[
                    styles.timeFrameButtonText,
                    {
                      color: timeFrame === option.key ? "#fff" : colors.text || "#4B5563",
                    },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.headerBackground,
            shadowColor: colors.headerShadow,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          },
        ]}
      >
        <View style={{ position: "absolute", left: SPACING, zIndex: 2, bottom: 20 }}>
          <TouchableOpacity
            style={{ alignItems: "center", justifyContent: "center" }}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.8}
          >
            <View style={[styles.avatarContainer, { alignItems: "center", justifyContent: "center", marginRight: 0 }]}>
              <Image
                source={{
                  uri:
                    dashboardData?.user?.avatar ||
                    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
                }}
                style={[styles.avatar, { width: 50, height: 50, borderRadius: 25 }]}
              />
              <View style={[styles.onlineIndicator, { width: 14, height: 14, borderRadius: 7, bottom: 2, right: 2 }]} />
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: colors.headerText,
              letterSpacing: 1,
              textAlign: "center",
            }}
          >
            HMS Fitness
          </Text>
        </View>
        <View
          style={{
            position: "absolute",
            right: SPACING,
            zIndex: 2,
            flexDirection: "row",
            alignItems: "center",
            bottom: 20,
          }}
        >
          <TouchableOpacity style={styles.headerIconButton} onPress={() => handleNavigation("Notifications")}>
            <Feather name="bell" size={22} color={colors.headerText} />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
            progressBackgroundColor={colors.cardBackground}
          />
        }
      >
        {dashboardData && (
          <>
            <Animated.View
              style={[
                styles.welcomeStatsCard,
                {
                  backgroundColor: colors.calorieCardBackground,
                  opacity: fadeAnim,
                  transform: [{ translateY: translateY }],
                },
              ]}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statIconBackground }]}>
                    <Feather name="activity" size={20} color={theme === "dark" ? "#6366F1" : "#4F46E5"} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.calorieCardText }]}>
                    {dashboardData.activitySummary.steps}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.calorieCardText, opacity: 0.7 }]}>Steps Today</Text>
                </View>
                <View
                  style={[styles.statDivider, { backgroundColor: colors.cardBorder || colors.border || "#E2E8F0" }]}
                />
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statIconBackground }]}>
                    <Feather name="zap" size={20} color={theme === "dark" ? "#FBBF24" : "#F59E0B"} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.calorieCardText }]}>
                    {dashboardData.activitySummary.burnedCalories}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.calorieCardText, opacity: 0.7 }]}>
                    Calories Burned
                  </Text>
                </View>
                <View
                  style={[styles.statDivider, { backgroundColor: colors.cardBorder || colors.border || "#E2E8F0" }]}
                />
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statIconBackground }]}>
                    <Feather name="target" size={20} color={theme === "dark" ? "#34D399" : "#10B981"} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.calorieCardText }]}>
                    {Math.round((dashboardData.activitySummary.steps / dashboardData.activitySummary.target) * 100)}%
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.calorieCardText, opacity: 0.7 }]}>Goal Progress</Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <AIGoalPlanBanner />
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Weekly Progress</Text>
                <TouchableOpacity onPress={() => handleNavigation("Calendar")}>
                  <Text style={[styles.sectionAction, { color: colors.sectionAction }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.calendarCard,
                  {
                    backgroundColor: colors.calendarCardBackground,
                    borderColor: colors.calendarCardBorder,
                    shadowColor: colors.calendarCardShadow,
                  },
                ]}
              >
                {daysOfWeek.map((day, index) => {
                  const isActive = index === currentDayIndex
                  const date = new Date()
                  date.setDate(currentDate.getDate() - (currentDayIndex - index))
                  return (
                    <View key={index} style={styles.dayColumn}>
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isActive ? colors.activeDayText : colors.calendarDayText || colors.dayText,
                            fontWeight: isActive ? "700" : "600",
                          },
                        ]}
                      >
                        {day}
                      </Text>
                      <View
                        style={[
                          styles.dateCircle,
                          {
                            backgroundColor: isActive
                              ? colors.activeDateCircle
                              : colors.calendarDateCircle || colors.dateCircle,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateText,
                            {
                              color: isActive ? colors.activeDateText : colors.calendarDateText || colors.dateText,
                              fontWeight: isActive ? "700" : "600",
                            },
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.progressIndicator,
                          {
                            height: Math.random() * 40 + 15,
                            backgroundColor: isActive
                              ? colors.activeProgressIndicator
                              : colors.calendarProgressIndicator || colors.progressIndicator,
                          },
                        ]}
                      />
                    </View>
                  )
                })}
              </View>
            </Animated.View>

            <Animated.View
              style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }], marginBottom: 40 }]}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Water Intake</Text>
              </View>
              <WaterIntakePreview />
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <CaloriesSummaryCard />
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Macros Breakdown</Text>
                <TouchableOpacity onPress={() => handleNavigation("Macros")}>
                  <Text style={[styles.sectionAction, { color: colors.sectionAction }]}>Details</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.macrosCard, { backgroundColor: colors.calorieCardBackground }]}>
                {Object.entries(dashboardData.nutritionSummary.macros).map(([key, macro], index) => (
                  <MacroProgress
                    key={key}
                    name={key.charAt(0).toUpperCase() + key.slice(1)}
                    color={macro.color}
                    value={macro.value}
                    target={nutritionTarget[key] ?? 0}
                    unit={macro.unit}
                    textColor={colors.calorieCardText}
                  />
                ))}
              </View>
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Quick Access</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.discoverScroll}
                decelerationRate="fast"
              >
                {discoverItems.map((item, index) => renderDiscoverItem(item, index))}
              </ScrollView>
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View
                style={[
                  styles.trainerBanner,
                  { backgroundColor: colors.cardBackground, shadowColor: colors.cardShadow },
                ]}
              >
                <TrainerBanner />
              </View>
            </Animated.View>

            <Animated.View
              style={[styles.sectionWeight, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}
            >
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle }]}>Weight Statistics</Text>
              </View>
              <WeightStatsAndChart />
            </Animated.View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING,
    paddingTop: Platform.OS === "ios" ? 60 : 50,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#EF4444",
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  welcomeStatsCard: {
    marginHorizontal: SPACING,
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    padding: 24,
    elevation: 12,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 8,
  },
  section: {
    paddingHorizontal: SPACING,
    marginTop: 12,
  },
  sectionWeight: {
    paddingHorizontal: SPACING,
    marginTop: 12,
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: "600",
  },
  aiGoalPlanBanner: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    marginBottom: 8,
  },
  aiGoalPlanBannerGradient: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  aiGoalPlanBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  aiGoalPlanBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  aiGoalPlanBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  aiGoalPlanBannerText: {
    flex: 1,
  },
  aiGoalPlanBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  aiGoalPlanBannerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  aiGoalPlanBannerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  aiGoalPlanBannerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiGoalPlanBannerBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
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
    color: "#1E293B",
    marginBottom: 4,
  },
  calorieMainLabel: {
    fontSize: 16,
    color: "#64748B",
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
    borderColor: "#F1F5F9",
  },
  calorieProgressFill: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    borderColor: "#6366F1",
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
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
    backgroundColor: "#F8FAFC",
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
    color: "#1E293B",
    marginBottom: 4,
  },
  calorieStatLabel: {
    fontSize: 12,
    color: "#64748B",
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
  trainerBanner: {
    borderRadius: 24,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    marginBottom: 8,
  },
  trainerBannerGradient: {
    padding: 20,
  },
  trainerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  trainerInfo: {
    flex: 1,
    marginRight: 16,
  },
  trainerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  trainerBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  trainerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  trainerSpecialty: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 12,
  },
  trainerStats: {
    flexDirection: "row",
    marginBottom: 16,
  },
  trainerStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  trainerStatText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  contactButtonText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "600",
    marginRight: 8,
  },
  trainerImageContainer: {
    position: "relative",
  },
  trainerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  trainerImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: "#0056d2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,86,210,0.1)",
  },
  dayColumn: {
    alignItems: "center",
    flex: 1,
  },
  dayText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 12,
  },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },
  progressIndicator: {
    width: 6,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
  },
  macrosCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  macroItem: {
    marginBottom: 20,
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  macroName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  macroValue: {
    fontSize: 14,
    color: "#64748B",
    flexDirection: "row",
    alignItems: "center",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#E2E8F0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#6366F1",
  },
  discoverScroll: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  discoverItem: {
    alignItems: "center",
    marginRight: 24,
    width: 85,
    position: "relative",
  },
  activeDiscoverItem: {
    transform: [{ scale: 1.05 }],
  },
  discoverIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    elevation: 6,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  discoverTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },
  activeDiscoverTitle: {
    color: "#4F46E5",
    fontWeight: "700",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -6,
    width: 24,
    height: 4,
    backgroundColor: "#4F46E5",
    borderRadius: 2,
  },
  badgeContainer: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(79, 70, 229, 0.08)",
  },
  mealImage: {
    width: "100%",
    height: 140,
  },
  mealContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  mealInfo: {
    flex: 1,
    marginRight: 12,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  mealSubtitle: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
  },
  addButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  addButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  noDataText: {
    color: "#64748B",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING,
    backgroundColor: "#F8FAFC",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  retryButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  healthCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  healthCardGradient: {
    padding: 16,
  },
  healthCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  healthCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 8,
  },
  progressContainer: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBackground: {
    height: "100%",
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#6366F1",
  },
  progressText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
    textAlign: "center",
    marginTop: 4,
  },
  healthStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  // Weight Chart Styles
  weightContainer: {
    borderRadius: 20,
    marginHorizontal: 8,
    marginBottom: 24,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  weightLoadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  weightLoadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  weightStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  weightStatItem: {
    alignItems: "center",
    flex: 1,
  },
  weightStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  weightStatValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  weightChartContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  weightChart: {
    borderRadius: 12,
  },
  weightNoDataContainer: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  weightNoDataText: {
    fontSize: 14,
  },
  timeFrameScrollContainer: {
    marginTop: 8,
  },
  timeFrameContainer: {
    flexDirection: "row",
    paddingHorizontal: 4,
  },
  timeFrameButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  timeFrameButtonText: {
    fontSize: 13,
    fontWeight: "500",
  },
})
