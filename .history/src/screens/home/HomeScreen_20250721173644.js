"use client"
import HeaderHome from "../../components/HeaderHome"
import React, { useCallback, useState, useEffect, useContext, useRef, useMemo } from "react"
import { useFocusEffect } from "@react-navigation/native"
import Loading from "components/Loading"
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
  RefreshControl,
} from "react-native"
import { Feather } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import apiUserService from "services/apiUserService"
import { foodService } from "services/apiFoodService"
import { workoutService } from "services/apiWorkoutService"
import dayjs from "dayjs"
import * as Notifications from "expo-notifications"
import { apiUserWaterLogService } from "services/apiUserWaterLogService"
import { AnimatedCircularProgress } from "react-native-circular-progress"
import { useStepTracker } from "context/StepTrackerContext"
import AsyncStorage from "@react-native-async-storage/async-storage"

const { width } = Dimensions.get("window")
const SPACING = 20
const screenWidth = Dimensions.get("window").width

// Define a modern shadow style
const MODERN_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 5,
}

export default function HomeScreen({ navigation }) {
  const [waterTarget, setWaterTarget] = useState(null)
  // Debug: log waterTarget whenever it changes
  useEffect(() => {}, [waterTarget])
  const { user } = useContext(AuthContext)

  // Load water target from AsyncStorage
  useEffect(() => {
    const loadTarget = async () => {
      if (!user?.userId) return
      try {
        const key = `user_water_target_${user.userId}`
        const data = await AsyncStorage.getItem(key)
        if (data) {
          setWaterTarget(JSON.parse(data))
        } else {
          setWaterTarget(null)
        }
      } catch (e) {
        setWaterTarget(null)
      }
    }
    loadTarget()
  }, [user?.userId])

  const { colors, theme } = useContext(ThemeContext)
  const { steps, duration, isReady } = useStepTracker()
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
  const [waterData, setWaterData] = useState({ todayIntake: 0, weeklyAverage: 0 })
  const [weightHistory, setWeightHistory] = useState([])
  const [weightStats, setWeightStats] = useState({ current: 0, lowest: 0, highest: 0, average: 0, change: 0 })
  const [weightTimeFrame, setWeightTimeFrame] = useState("3m")

  // StepCounter AsyncStorage values
  const [stepCounterData, setStepCounterData] = useState({ steps: 0, calories: 0, distance: 0, target: 10000 })

  // Helper to get today's key (same as StepCounterScreen)
  const getTodayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`
  }

  // Load step/calo/distance from AsyncStorage (StepCounterScreen logic)
  useEffect(() => {
    const loadStepCounterData = async () => {
      try {
        const userId = user?.userId || "unknown"
        const todayKey = `stepcounter_${userId}_${getTodayStr()}`
        const data = await AsyncStorage.getItem(todayKey)
        if (data) {
          const parsed = JSON.parse(data)
          const steps = Number(parsed.steps) || 0
          const duration = Number(parsed.duration) || 0
          const target = Number(parsed.target) || 10000
          // Calculate distance and calories as in StepCounterScreen
          const distance = (steps * 0.762) / 1000
          let calPerStep = 0.04
          if (user && user.gender) {
            if (user.gender.toLowerCase() === "female" || user.gender.toLowerCase() === "nữ") calPerStep = 0.03
          }
          const calories = Math.round(steps * calPerStep)
          setStepCounterData({ steps, calories, distance, target })
        } else {
          setStepCounterData({ steps: 0, calories: 0, distance: 0, target: 10000 })
        }
      } catch {
        setStepCounterData({ steps: 0, calories: 0, distance: 0, target: 10000 })
      }
    }
    loadStepCounterData()
  }, [user])

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const currentDayIndex = currentDate.getDay()

  // Format duration in hh:mm:ss
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return [h, m, s].map((v) => v.toString().padStart(2, "0")).join(":")
  }

  // Step Preview Section
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: loading && !refreshing ? "none" : "flex" },
    })
  }, [loading, refreshing, navigation])

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
    if (!user || !user.userId) {
      setDashboardData({
        ...defaultSummary,
        user: { fullName: "Unknown User", gender: "N/A", birthDate: null, lastLogin: new Date() },
      })
      setWaterData({ todayIntake: 0, weeklyAverage: 0 })
      setWeightHistory([])
      setWeightStats({ current: 0, lowest: 0, highest: 0, average: 0, change: 0 })
      setLoading(false)
      setRefreshing(false)
      const todayKey = dayjs(currentDate).format("YYYY-MM-DD")
      await AsyncStorage.setItem(
        `dailyStats_${todayKey}`,
        JSON.stringify({
          waterIntake: 0,
          caloriesRemaining: 0,
          macros: { carbs: 0, protein: 0, fats: 0 },
          weight: 0,
          steps: 0,
        }),
      )
      return
    }

    if (!isRefresh) setLoading(true)
    setError(null)

    try {
      // Always get the latest step data from AsyncStorage (StepCounter)
      let latestStepData = { steps: 0, calories: 0, distance: 0, target: 10000 }
      try {
        const userId = user?.userId || "unknown"
        const todayKey = `stepcounter_${userId}_${dayjs(currentDate).format("YYYY-MM-DD")}`
        const data = await AsyncStorage.getItem(todayKey)
        if (data) {
          const parsed = JSON.parse(data)
          const steps = Number(parsed.steps) || 0
          const duration = Number(parsed.duration) || 0
          const target = Number(parsed.target) || 10000
          const distance = (steps * 0.762) / 1000
          let calPerStep = 0.04
          if (user && user.gender) {
            if (user.gender.toLowerCase() === "female" || user.gender.toLowerCase() === "nữ") calPerStep = 0.03
          }
          const calories = Math.round(steps * calPerStep)
          latestStepData = { steps, calories, distance, target }
        }
      } catch {}
      setStepCounterData(latestStepData)

      const userData = await apiUserService.getUserById(user.userId)
      const avatar = userData.data.avatar
      if (avatar) await AsyncStorage.setItem("userAvatar", avatar)

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
      let activitySteps = 0
      if (Array.isArray(activitiesResponse)) {
        const todayActivities = activitiesResponse.filter((activity) =>
          dayjs(activity.recordedAt).isSame(currentDate, "day"),
        )
        burnedCalories = todayActivities.reduce((sum, activity) => sum + (activity.caloriesBurned || 0), 0)
        activitySteps = todayActivities.reduce((sum, activity) => sum + (activity.steps || 0), 0)
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const weekAgo = new Date(today)
      weekAgo.setDate(today.getDate() - 6)

      const waterResponse = await apiUserWaterLogService.getMyWaterLogs({
        startDate: weekAgo.toISOString().split("T")[0],
        endDate: tomorrow.toISOString().split("T")[0],
        pageSize: 100,
      })

      const waterLogs = waterResponse?.data?.records || waterResponse?.data || []
      const todayTotal = waterLogs
        .filter((log) => {
          const d = new Date(log.consumptionDate)
          return d >= today && d < tomorrow
        })
        .reduce((sum, log) => sum + (log.amountMl || 0), 0)

      const dailyTotals = Array(7).fill(0)
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekAgo)
        day.setDate(weekAgo.getDate() + i)
        const nextDay = new Date(day)
        nextDay.setDate(day.getDate() + 1)
        dailyTotals[i] = waterLogs
          .filter((log) => {
            const d = new Date(log.consumptionDate)
            return d >= day && d < nextDay
          })
          .reduce((sum, log) => sum + (log.amountMl || 0), 0)
      }
      const weeklyAverage = dailyTotals.reduce((a, b) => a + b, 0) / 7
      setWaterData({ todayIntake: todayTotal, weeklyAverage })

      const weightResponse = await weightHistoryService.getMyWeightHistory({ pageNumber: 1, pageSize: 100 })
      let weightRecords = []
      if (weightResponse.statusCode === 200 && weightResponse.data) {
        weightRecords = (weightResponse.data.records || []).sort(
          (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt),
        )
        setWeightHistory(weightRecords)
        const weights = weightRecords.map((item) => item.weight)
        const current = weights[0] || 0
        const lowest = weights.length > 0 ? Math.min(...weights) : 0
        const highest = weights.length > 0 ? Math.max(...weights) : 0
        const average = weights.length > 0 ? weights.reduce((sum, weight) => sum + weight, 0) / weights.length : 0
        const change = weights.length > 1 ? current - weights[weights.length - 1] : 0
        setWeightStats({
          current: Number.parseFloat(current.toFixed(1)),
          lowest: Number.parseFloat(lowest.toFixed(1)),
          highest: Number.parseFloat(highest.toFixed(1)),
          average: Number.parseFloat(average.toFixed(1)),
          change: Number.parseFloat(change.toFixed(1)),
        })
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
          steps: latestStepData.steps, // Use latest step from StepCounter
        },
        mealPlans: defaultSummary.mealPlans,
        mealCalories,
        nutritionLogsToday: todayLogs, // Pass today's logs for NutritionSection
      })

      const todayWeight = weightRecords && weightRecords.length > 0 ? weightRecords[0].weight : 0
      const caloriesSummary = {
        remaining: Math.round(remainingCalories),
        consumed: Math.round(consumedCalories),
        burned: Math.round(burnedCalories),
        net: Math.round(consumedCalories - burnedCalories),
        target: Math.round(totalCalories),
        progressPercentage:
          totalCalories > 0 ? Math.min(((totalCalories - remainingCalories) / totalCalories) * 100, 100) : 0,
        consumedPercentage: totalCalories > 0 ? Math.min((consumedCalories / totalCalories) * 100, 100) : 0,
        burnedPercentage: totalCalories > 0 ? Math.min((burnedCalories / totalCalories) * 100, 100) : 0,
      }

      await AsyncStorage.setItem(
        `dailyStats_${todayKey}`,
        JSON.stringify({
          waterIntake: todayTotal,
          caloriesSummary,
          macros: { carbs: Math.round(carbs), protein: Math.round(protein), fats: Math.round(fats) },
          weight: todayWeight,
          steps: latestStepData.steps,
        }),
      )
    } catch (err) {
      setError("Failed to load data. Please try again later.")
      setDashboardData({
        ...defaultSummary,
        user: user || { fullName: "Unknown User", gender: "N/A", birthDate: null, lastLogin: new Date() },
      })
      setWaterData({ todayIntake: 0, weeklyAverage: 0 })
      setWeightHistory([])
      setWeightStats({ current: 0, lowest: 0, highest: 0, average: 0, change: 0 })
    } finally {
      setLoading(false)
      setRefreshing(false)
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

  // Luôn fetch lại dữ liệu mỗi lần vào màn HomeScreen
  useFocusEffect(
    useCallback(() => {
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
    }, [user?.userId]),
  )

  // Helper to get userId-based key (same as NutritionTargetScreen)
  const getUserId = () => {
    if (user && typeof user === "object") {
      return user.id || user._id || user.userId || ""
    }
    return ""
  }

  const getStorageKey = () => {
    const userId = getUserId()
    return userId ? `nutritionTarget_${userId}` : "nutritionTarget"
  }

  const getTodayKey = () => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    const dd = String(today.getDate()).padStart(2, "0")
    const userId = getUserId()
    return userId ? `nutritionTarget_${userId}_${yyyy}-${mm}-${dd}` : `nutritionTarget_${yyyy}-${mm}-${dd}`
  }

  useFocusEffect(
    useCallback(() => {
      ;(async () => {
        try {
          const raw = await AsyncStorage.getItem(getStorageKey())
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
    }, [user?.userId]),
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

  // Foods state for Discover replacement
  const [foodImages, setFoodImages] = useState([])
  const [foodLoading, setFoodLoading] = useState(false)
  const [foodError, setFoodError] = useState("")

  // Auto-scrolling for food carousel
  const scrollViewRef1 = useRef(null)
  const scrollViewRef2 = useRef(null)
  const scrollX1 = useRef(new Animated.Value(0)).current
  const scrollX2 = useRef(new Animated.Value(0)).current

  // Placeholder data for foodImages if API is slow or fails
  const staticFoodImages = [
    { foodId: "f1", image: "/placeholder.svg?height=100&width=100" },
    { foodId: "f2", image: "/placeholder.svg?height=100&width=100" },
    { foodId: "f3", image: "/placeholder.svg?height=100&width=100" },
    { foodId: "f4", image: "/placeholder.svg?height=100&width=100" },
    { foodId: "f5", image: "/placeholder.svg?height=100&width=100" },
    { foodId: "f6", image: "/placeholder.svg?height=100&width=100" },
    { foodId: "f7", image: "/placeholder.svg?height=100&width=100" },
  ]

  useEffect(() => {
    setFoodImages(staticFoodImages) // Initialize with static placeholders

    const fetchFoods = async () => {
      setFoodLoading(true)
      setFoodError("")
      try {
        const res = await foodService.getAllActiveFoods({ pageNumber: 1, pageSize: 12 })
        if (res?.data?.foods && res.data.foods.length > 0) {
          setFoodImages(res.data.foods)
        } else {
          setFoodImages(staticFoodImages) // Fallback to static placeholders if no data
        }
      } catch (e) {
        setFoodError("Could not load foods")
        setFoodImages(staticFoodImages) // Fallback to static placeholders on error
      } finally {
        setFoodLoading(false)
      }
    }
    fetchFoods()
  }, [])

  // Prepare data for two rows, duplicating for infinite scroll effect
  const foodImagesRow1 = useMemo(() => {
    if (foodImages.length === 0) return []
    // Duplicate the array multiple times to ensure smooth looping
    return [...foodImages, ...foodImages, ...foodImages]
  }, [foodImages])

  const foodImagesRow2 = useMemo(() => {
    if (foodImages.length === 0) return []
    // Duplicate the array multiple times to ensure smooth looping (same as row 1)
    return [...foodImages, ...foodImages, ...foodImages]
  }, [foodImages])

  // Auto-scrolling logic for row 1
  useEffect(() => {
    if (foodImagesRow1.length === 0) return

    const itemWidth = styles.foodCarouselItem.width + styles.foodCarouselItem.marginRight
    const totalWidth = itemWidth * foodImages.length // Width of one full set of original images

    const scrollInterval1 = setInterval(() => {
      scrollX1.setValue(scrollX1._value + 1) // Increment by a small value for smooth animation
      if (scrollX1._value >= totalWidth) {
        // If scrolled past one full set, reset without animation
        scrollX1.setValue(scrollX1._value - totalWidth)
        if (scrollViewRef1.current) {
          scrollViewRef1.current.scrollTo({ x: scrollX1._value, animated: false })
        }
      } else {
        if (scrollViewRef1.current) {
          scrollViewRef1.current.scrollTo({ x: scrollX1._value, animated: false })
        }
      }
    }, 40) // Slower scroll (higher value = slower)

    return () => clearInterval(scrollInterval1)
  }, [foodImagesRow1.length])

  // Auto-scrolling logic for row 2 (scrolling in the same direction and speed as row 1)
  useEffect(() => {
    if (foodImagesRow2.length === 0) return

    const itemWidth = styles.foodCarouselItem.width + styles.foodCarouselItem.marginRight
    const totalWidth = itemWidth * foodImages.length // Width of one full set of original images

    // Start row 2 at 0, same as row 1
    scrollX2.setValue(0)

    const scrollInterval2 = setInterval(() => {
      scrollX2.setValue(scrollX2._value + 1) // Increment by a small value for smooth animation
      if (scrollX2._value >= totalWidth) {
        // If scrolled past one full set, reset without animation
        scrollX2.setValue(scrollX2._value - totalWidth)
        if (scrollViewRef2.current) {
          scrollViewRef2.current.scrollTo({ x: scrollX2._value, animated: false })
        }
      } else {
        if (scrollViewRef2.current) {
          scrollViewRef2.current.scrollTo({ x: scrollX2._value, animated: false })
        }
      }
    }, 40) // Match the speed of row 1

    return () => clearInterval(scrollInterval2)
  }, [foodImagesRow2.length])

  // Track image load errors for food images
  const [foodImageErrors, setFoodImageErrors] = useState({})

  // Render food image carousel item with unique key for duplicated arrays
  const renderFoodImageItem = (food, idx) => {
    const foodKey = food.foodId + '-' + idx
    const imgError = foodImageErrors[foodKey] || false
    return (
      <TouchableOpacity key={foodKey} style={styles.foodCarouselItem} activeOpacity={0.8}>
        <Image
          source={imgError ? require("../../../assets/images/food.png") : { uri: food.image }}
          style={styles.foodImage}
          resizeMode="cover"
          onError={() => {
            setFoodImageErrors(prev => ({ ...prev, [foodKey]: true }))
          }}
        />
      </TouchableOpacity>
    )
  }

  const MacroProgress = ({ name, color, value, target, unit, textColor }) => {
    const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0
    return (
      <View style={styles.macroItem}>
        {/* Đưa tên macro lên trên thanh, giá trị xuống dưới */}
        <Text style={[styles.macroName, { color: textColor, textAlign: "center", marginBottom: 2 }]}>{name}</Text>
        <View
          style={[
            styles.progressBarContainer,
            { backgroundColor: theme === "dark" ? "#374151" : "#E2E8F0", alignSelf: "center", width: "80%" },
          ]}
        >
          <LinearGradient
            colors={[color, color]}
            style={[styles.progressBar, { width: `${percentage}%`, minWidth: 8, maxWidth: "100%" }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        {/* Center macro value below the progress bar */}
        <View style={{ width: "80%", alignSelf: "center", alignItems: "center", marginTop: 2 }}>
          <Text style={[styles.macroValue, { textAlign: "center" }]}>
            <Text style={{ color, fontWeight: "700" }}>{value}</Text>
            <Text style={{ color: textColor, opacity: 0.7 }}>
              /{target} {unit}
            </Text>
          </Text>
        </View>
      </View>
    )
  }

  const AIGoalPlanBanner = () => {
    return (
      <TouchableOpacity
        style={[styles.aiGoalPlanBanner, MODERN_SHADOW]}
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

  // Combined Calories and Macros Card
  const NutritionSummaryCard = () => {
    const targetCalories = nutritionTarget.calories ? Number(nutritionTarget.calories) : null
    const consumed = dashboardData?.nutritionSummary?.consumedCalories || 0
    const burned = dashboardData?.activitySummary?.burnedCalories || 0
    const netCalories = consumed - burned
    const remaining = targetCalories
      ? Math.max(targetCalories - netCalories, 0)
      : dashboardData?.nutritionSummary?.remainingCalories || 0
    const total = targetCalories || dashboardData?.nutritionSummary?.totalCalories || 2200
    const achievedCalories = total - remaining
    const progressPercentage = total > 0 ? Math.min((achievedCalories / total) * 100, 100) : 0

    return (
      <View
        style={[
          styles.nutritionSummaryCard,
          { backgroundColor: colors.calorieCardBackground || "#FFFFFF" },
          MODERN_SHADOW,
        ]}
      >
        {/* Calories Section */}
        <View style={styles.caloriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.sectionTitle || "#1E293B" }]}>Nutrition Overview</Text>
            <TouchableOpacity onPress={() => handleNavigation("WeeklyProgressScreen")}>
              <Text style={[styles.sectionAction, { color: colors.sectionAction || "#6366F1" }]}>Details</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calorieMainDisplay}>
            <View style={styles.calorieMainInfo}>
              <Text
                style={[
                  styles.calorieMainValue,
                  { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B") },
                ]}
              >
                {remaining}
              </Text>
              <Text
                style={[
                  styles.calorieMainLabel,
                  { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B") },
                ]}
              >
                Calories Remaining
              </Text>
              <Text
                style={{
                  color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B"),
                  fontSize: 11,
                  marginTop: 2,
                }}
              >
                Target - Food + Exercise
              </Text>
            </View>
            <View style={styles.calorieProgressContainer}>
              <AnimatedCircularProgress
                size={90}
                width={5}
                fill={progressPercentage}
                tintColor={colors.primary || "#6366F1"}
                backgroundColor={theme === "dark" ? "#374151" : "#E2E8F0"}
                rotation={0}
                lineCap="round"
                style={{ alignSelf: "center" }}
              >
                {() => (
                  <View style={styles.calorieProgressContent}>
                    <Text style={[styles.calorieProgressPercentage, { color: colors.primary || "#6366F1" }]}>
                      {Math.round(progressPercentage)}%
                    </Text>
                    <Text
                      style={[
                        styles.calorieProgressLabel,
                        { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#64748B") },
                      ]}
                    >
                      Goal
                    </Text>
                  </View>
                )}
              </AnimatedCircularProgress>
            </View>
          </View>
          {/* Compact Calorie Stats */}
          <View style={styles.compactStatsRow}>
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatValue, { color: colors.primary || "#6366F1" }]}>{consumed}</Text>
              <Text
                style={[
                  styles.compactStatLabel,
                  { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#64748B") },
                ]}
              >
                Food
              </Text>
            </View>
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatValue, { color: colors.warning || "#EF4444" }]}>{burned}</Text>
              <Text
                style={[
                  styles.compactStatLabel,
                  { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#64748B") },
                ]}
              >
                Exercise
              </Text>
            </View>
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatValue, { color: colors.success || "#10B981" }]}>{netCalories}</Text>
              <Text
                style={[
                  styles.compactStatLabel,
                  { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#64748B") },
                ]}
              >
                Net
              </Text>
            </View>
            <View style={styles.compactStatItem}>
              <Text style={[styles.compactStatValue, { color: colors.info || "#F59E0B" }]}>
                {targetCalories || total}
              </Text>
              <Text
                style={[
                  styles.compactStatLabel,
                  { color: colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#64748B") },
                ]}
              >
                Target
              </Text>
            </View>
          </View>
        </View>
        {/* Divider */}
        <View style={[styles.nutritionDivider, { backgroundColor: theme === "dark" ? "#374151" : "#E2E8F0" }]} />
        {/* Macros Section */}
        <View style={styles.macrosSection}>
          <Text style={[styles.macrosSectionTitle, { color: colors.sectionTitle || "#1E293B" }]}>Macros Breakdown</Text>
          <View style={styles.macrosGrid}>
            {Object.entries(dashboardData?.nutritionSummary?.macros || {}).map(([key, macro], index) => (
              <MacroProgress
                key={key}
                name={key.charAt(0).toUpperCase() + key.slice(1)}
                color={macro.color}
                value={macro.value}
                target={nutritionTarget[key] ?? 0}
                unit={macro.unit}
                textColor={colors.calorieCardText || (theme === "dark" ? "#FFFFFF" : "#1E293B")}
              />
            ))}
          </View>
        </View>
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
            backgroundColor: colors.trainerBannerBackground || colors.cardBackground || "#FFFFFF",
          },
          MODERN_SHADOW,
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

  const WeightStatsAndChart = () => {
    const { colors, theme } = useContext(ThemeContext)
    const timeFrameOptions = [
      { key: "7d", label: "7 Days" },
      { key: "30d", label: "30 Days" },
      { key: "3m", label: "3 Months" },
      { key: "6m", label: "6 Months" },
      { key: "12m", label: "12 Months" },
    ]

    const filterHistoryByTimeFrame = (data) => {
      const now = new Date()
      switch (weightTimeFrame) {
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

    const filteredHistory = filterHistoryByTimeFrame(weightHistory)

    const chartData = {
      labels: filteredHistory
        .slice(0, 10)
        .reverse()
        .map((item) => {
          const date = new Date(item.recordedAt)
          if (weightTimeFrame === "7d" || weightTimeFrame === "30d") {
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

    return (
      <View
        style={[
          styles.weightContainer,
          { backgroundColor: colors.cardBackground || (theme === "dark" ? "#18181B" : "#FFFFFF") },
          MODERN_SHADOW,
        ]}
      >
        <View style={[styles.weightStatsRow, { flexDirection: "row", alignItems: "center", marginBottom: 16 }]}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.sectionTitle || "#1E293B",
                fontSize: 20,
                fontWeight: "700",
                letterSpacing: 0.2,
              },
            ]}
          >
            Weight
          </Text>
          <TouchableOpacity
            style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center" }}
            onPress={() => handleNavigation("WeightHistory")}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={32} color={colors.primary || "#0056d2"} />
          </TouchableOpacity>
        </View>
        <View style={[styles.weightChartContainer, { backgroundColor: theme === "dark" ? "#18181B" : "#FFFFFF" }]}>
          {filteredHistory.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={chartData}
                width={Math.max(screenWidth - 64, chartData.labels.length * 60)}
                height={200}
                yAxisLabel=""
                yAxisSuffix=" kg"
                chartConfig={{
                  backgroundColor: theme === "dark" ? "#18181B" : "#FFFFFF",
                  backgroundGradientFrom: theme === "dark" ? "#18181B" : "#FFFFFF",
                  backgroundGradientTo: theme === "dark" ? "#18181B" : "#FFFFFF",
                  decimalPlaces: 1,
                  color: (opacity = 1) => `#0056d2`,
                  labelColor: (opacity = 1) =>
                    theme === "dark" ? `rgba(255, 255, 255, ${opacity})` : `rgba(31, 41, 55, ${opacity})`,
                  style: { borderRadius: 12 },
                  propsForDots: { r: "2.2", strokeWidth: "0.7", stroke: "#0056d2" },
                  propsForBackgroundLines: { strokeWidth: 0.5 },
                  propsForLabels: { fontSize: 10, fill: theme === "dark" ? "#FFFFFF" : "#1F293B" },
                }}
                bezier
                style={styles.weightChart}
              />
            </ScrollView>
          ) : (
            <View style={styles.weightNoDataContainer}>
              <Text
                style={[
                  styles.weightNoDataText,
                  { color: colors.textSecondary || (theme === "dark" ? "#D1D5DB" : "#6B7280") },
                ]}
              >
                No weight data for this period
              </Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeFrameScrollContainer}>
          <View style={styles.timeFrameContainer}>
            {timeFrameOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.timeFrameButton,
                  {
                    backgroundColor: colors.cardBackground || (theme === "dark" ? "#18181B" : "#F3F4F6"),
                    borderColor: weightTimeFrame === option.key ? "#0056d2" : colors.border || "#E5E7EB",
                    borderWidth: weightTimeFrame === option.key ? 1.2 : 0.7,
                  },
                ]}
                onPress={() => setWeightTimeFrame(option.key)}
              >
                <Text
                  style={[
                    styles.timeFrameButtonText,
                    {
                      color:
                        weightTimeFrame === option.key
                          ? colors.headerText || "#FFFFFF"
                          : colors.text || (theme === "dark" ? "#D1D5DB" : "#4B5563"),
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

  // New Nutrition Section Component with Enhanced Visual Progress
  const NutritionSection = () => {
    // Lấy nutritionLogs của ngày hiện tại từ dashboardData (đã fetch ở fetchUserData)
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    // Giả sử dashboardData.nutritionLogsToday đã được set ở fetchUserData, nếu chưa thì lấy từ dashboardData.nutritionLogs và filter theo ngày
    const nutritionLogsToday = dashboardData?.nutritionLogsToday || []

    // Tính tổng calories cho từng mealType
    const mealTypes = ["Breakfast", "Lunch", "Dinner"]
    const mealCalories = {
      Breakfast: 0,
      Lunch: 0,
      Dinner: 0,
      Other: 0,
    }
    nutritionLogsToday.forEach((log) => {
      const type = mealTypes.includes(log.mealType) ? log.mealType : "Other"
      mealCalories[type] += log.calories || 0
    })

    const totalCalories = nutritionTarget?.calories || dashboardData?.nutritionSummary?.totalCalories || 2200

    const mealData = [
      {
        name: "Breakfast",
        icon: "☕",
        calories: mealCalories.Breakfast,
        target: Math.round(totalCalories * 0.25),
        isActive: mealCalories.Breakfast > 0,
        color: "#FF6B6B", // Red-orange for breakfast
      },
      {
        name: "Lunch",
        icon: "🍽️",
        calories: mealCalories.Lunch,
        target: Math.round(totalCalories * 0.4),
        isActive: mealCalories.Lunch > 0,
        subtitle: "점심, 저녁 준비중",
        color: "#4ECDC4", // Teal for lunch
      },
      {
        name: "Dinner",
        icon: "🍽️",
        calories: mealCalories.Dinner,
        target: Math.round(totalCalories * 0.3),
        isActive: mealCalories.Dinner > 0,
        color: "#45B7D1", // Blue for dinner
      },
      {
        name: "Snacks",
        icon: "🍪",
        calories: mealCalories.Other,
        target: Math.round(totalCalories * 0.05),
        isActive: mealCalories.Other > 0,
        color: "#96CEB4", // Green for snacks
      },
    ]

    // Helper function to get progress status
    const getProgressStatus = (calories, target) => {
      const percentage = target > 0 ? (calories / target) * 100 : 0
      if (percentage >= 100) return "completed"
      if (percentage >= 75) return "high"
      if (percentage >= 50) return "medium"
      if (percentage > 0) return "low"
      return "none"
    }

    // Helper function to get status color
    const getStatusColor = (status) => {
      switch (status) {
        case "completed":
          return "#10B981" // Green
        case "high":
          return "#F59E0B" // Orange
        case "medium":
          return "#3B82F6" // Blue
        case "low":
          return "#8B5CF6" // Purple
        default:
          return "#E5E7EB" // Gray
      }
    }

    return (
      <View style={[styles.nutritionSection, { backgroundColor: colors.cardBackground || "#FFFFFF" }, MODERN_SHADOW]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle || "#1E293B" }]}>Nutrition</Text>
          <TouchableOpacity onPress={() => handleNavigation("Food")}>
            <Text style={[styles.sectionAction, { color: colors.sectionAction || "#6366F1" }]}>More</Text>
          </TouchableOpacity>
        </View>
        {mealData.map((meal, index) => {
          const progressPercentage = meal.target > 0 ? Math.min((meal.calories / meal.target) * 100, 100) : 0
          const status = getProgressStatus(meal.calories, meal.target)
          const statusColor = getStatusColor(status)
          const isLastItem = index === mealData.length - 1
          return (
            <View key={index} style={[styles.mealItem, isLastItem && styles.mealItemLast]}>
              <View style={[styles.mealIconContainer, { backgroundColor: `${meal.color}20` }]}>
                <Text style={styles.mealIcon}>{meal.icon}</Text>
              </View>
              <View style={styles.mealInfo}>
                <View style={styles.mealHeader}>
                  <Text style={[styles.mealName, { color: colors.text || "#1E293B" }]}>{meal.name}</Text>
                  <Text style={[styles.mealPercentage, { color: statusColor }]}>{Math.round(progressPercentage)}%</Text>
                </View>
                <Text style={[styles.mealCalories, { color: colors.textSecondary || "#64748B" }]}>
                  {meal.calories} / {meal.target} kcal
                </Text>
                {meal.subtitle && (
                  <Text style={[styles.mealSubtitle, { color: colors.textSecondary || "#64748B" }]}>
                    {meal.subtitle}
                  </Text>
                )}
                {/* Progress Bar */}
                <View style={styles.mealProgressContainer}>
                  <View
                    style={[
                      styles.mealProgressBackground,
                      { backgroundColor: theme === "dark" ? "#374151" : "#F3F4F6" },
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.mealProgressFill,
                        {
                          width: `${progressPercentage}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>
                </View>
                {/* Status Indicator */}
                <View style={styles.mealStatusContainer}>
                  <View style={[styles.mealStatusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.mealStatusText, { color: colors.textSecondary || "#64748B" }]}>
                    {status === "completed"
                      ? "Goal reached!"
                      : status === "high"
                        ? "Almost there"
                        : status === "medium"
                          ? "Good progress"
                          : status === "low"
                            ? "Getting started"
                            : "Not started"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.addMealButton,
                  {
                    backgroundColor: meal.isActive ? colors.primary || "#0056d2" : colors.border || "#E5E7EB",
                    transform: [{ scale: meal.isActive ? 1.05 : 1 }],
                  },
                ]}
                onPress={() => handleNavigation("AddMealScreen", { mealType: meal.name })}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={20} color={meal.isActive ? "#FFFFFF" : colors.textSecondary || "#9CA3AF"} />
              </TouchableOpacity>
            </View>
          )
        })}
      </View>
    )
  }

  useEffect(() => {
    ;(async () => {
      const { status } = await Notifications.getPermissionsAsync()
      if (status !== "granted") {
        await Notifications.requestPermissionsAsync()
      }
    })()
  }, [])

  if (loading && !refreshing) {
    return <Loading backgroundColor="#FFFFFF" logoSize={250} />
  }

  if (error && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || "#F8FAFC" }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error || "#EF4444" }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchUserData()}>
            <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background || "#F8FAFC" }]}>
      <HeaderHome
        weekday={new Date().toLocaleDateString("en-US", { weekday: "long" })}
        streak={dashboardData?.user?.currentStreak}
        level={dashboardData?.user?.levelAccount}
        streakFireSource={
          dashboardData?.user?.currentStreak < 20
            ? require("../../../assets/animation/FireStreakOrange.json")
            : require("../../../assets/animation/StreakFire.json")
        }
        onPressAnalysis={() => handleNavigation("AnalysisScreen")}
        onPressNotifications={() => handleNavigation("Notifications")}
        colors={colors}
        SPACING={SPACING}
        notificationBadge={3}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 10 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchUserData(true)
            }}
            colors={[colors.accent || "#6366F1"]}
            tintColor={[colors.accent || "#6366F1"]}
            progressBackgroundColor={colors.cardBackground || "#FFFFFF"}
          />
        }
      >
        {dashboardData && (
          <>
            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <AIGoalPlanBanner />
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle || "#1E293B" }]}>Weekly Progress</Text>
                <TouchableOpacity onPress={() => handleNavigation("WeeklyProgressScreen")}>
                  <Text style={[styles.sectionAction, { color: colors.sectionAction || "#6366F1" }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.calendarCard,
                  {
                    backgroundColor: colors.calendarCardBackground || "#FFFFFF",
                    borderColor: colors.calendarCardBorder || "#E2E8F0",
                  },
                  MODERN_SHADOW, // Apply modern shadow
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
                            color: isActive
                              ? colors.activeDayText || "#4F46E5"
                              : colors.calendarDayText || colors.dayText || "#64748B",
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
                              ? colors.activeDateCircle || "#4F46E5"
                              : colors.calendarDateCircle || colors.dateCircle || "#F1F5F9",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateText,
                            {
                              color: isActive
                                ? colors.activeDateText || "#FFFFFF"
                                : colors.calendarDateText || colors.dateText || "#1E293B",
                              fontWeight: isActive ? "700" : "600",
                            },
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </Animated.View>

            {/* Combined Nutrition Summary Card */}
            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <NutritionSummaryCard />
            </Animated.View>

            {/* New Nutrition Section */}
            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <NutritionSection />
            </Animated.View>

            <Animated.View
              style={[styles.sectionWeight, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}
            >
              <WeightStatsAndChart />
            </Animated.View>

            {/* Activities Section Header - moved below Weight */}
            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle || "#1E293B" }]}>Steps</Text>
                <TouchableOpacity onPress={() => handleNavigation("StepCounter")}>
                  <Text style={[styles.sectionAction, { color: colors.sectionAction || "#6366F1" }]}>More</Text>
                </TouchableOpacity>
              </View>
              {/* Activities Card (Steps, Distance, Calories) */}
              <Animated.View
                style={[
                  styles.activitiesCard,
                  {
                    backgroundColor: "#f8a23aff", // Orange color from image
                    opacity: fadeAnim,
                    transform: [{ translateY: translateY }],
                  },
                  MODERN_SHADOW, // Apply modern shadow
                ]}
              >
                <Text style={styles.activitiesStepsValue}>{stepCounterData.steps.toLocaleString("en-US")} steps</Text>
                <Text style={styles.activitiesSubText}>
                  {stepCounterData.distance < 1
                    ? `${Math.round(stepCounterData.distance * 1000)} m`
                    : `${stepCounterData.distance.toFixed(2)} km`}
                  , {stepCounterData.calories} kcal
                </Text>
                <View style={styles.activitiesProgressBarContainer}>
                  <View
                    style={[
                      styles.activitiesProgressBarFill,
                      {
                        width: `${Math.min((stepCounterData.steps / stepCounterData.target) * 100, 100)}%`,
                      },
                    ]}
                  />
                </View>
              </Animated.View>
            </Animated.View>

            {/* TrainerBanner removed as requested */}

            {/* Food Images section replaces Discover */}
            <Animated.View
              style={[
                // Remove horizontal padding for overflow effect
                { marginBottom: 100, marginTop: 50, opacity: fadeAnim, transform: [{ translateY: translateY }] },
              ]}
            >

              {foodLoading ? (
                <Text style={{ textAlign: "center", marginVertical: 20 }}>Loading...</Text>
              ) : foodError ? (
                <Text style={{ textAlign: "center", color: "#EF4444", marginVertical: 20 }}>{foodError}</Text>
              ) : (
                <View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    ref={scrollViewRef1}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingLeft: 0, paddingRight: 0 }}
                  >
                    {foodImagesRow1.map((food, idx) => renderFoodImageItem(food, idx))}
                  </ScrollView>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    ref={scrollViewRef2}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingLeft: 0, paddingRight: 0, marginTop: SPACING / 2 }}
                  >
                    {foodImagesRow2.map((food, idx) => renderFoodImageItem(food, idx))}
                  </ScrollView>
                </View>
              )}

              {/* Stick to your diet plan section */}
              <View style={[styles.dietPlanSection, { paddingHorizontal: SPACING }]}> 
                <Text style={[styles.dietPlanTitle, { color: colors.sectionTitle || "#1E293B" }]}> 
Discover nutritious foods                </Text>
                <Text style={[styles.dietPlanSubtitle, { color:  "#bfbfc0ff" }]}> 
    Browse foods picked by GetFit to support your health and goals.
                </Text>
                <TouchableOpacity
                  style={styles.viewMealPlansButton}
                  onPress={() => handleNavigation("Food")}
                >
                  <Text style={[styles.viewMealPlansButtonText, { color:  "#0056d2" }]}> 
                    Explore foods <Feather name="arrow-right" size={14} color={ "#0056d2"} />
                  </Text>
                </TouchableOpacity>
              </View>
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
  },
  scrollContent: {
    paddingBottom: 30,
  },
  section: {
    marginBottom: SPACING,
    paddingHorizontal: SPACING,
  },
  sectionWeight: {
    marginBottom: SPACING,
    paddingHorizontal: SPACING,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING / 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  sectionAction: {
    color: "#6366F1",
    fontSize: 14,
  },
  calendarCard: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: SPACING / 2,
    borderRadius: 12,
    borderWidth: 1,
    // Shadow applied via MODERN_SHADOW
  },
  dayColumn: {
    alignItems: "center",
  },
  dayText: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  dateCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressIndicator: {
    width: 6,
    borderRadius: 3,
  },
  // NEW: Activities Card styles
  activitiesCard: {
    padding: SPACING,
    borderRadius: 12,
    // Shadow applied via MODERN_SHADOW
    alignItems: "center", // Center content horizontally
  },
  activitiesStepsValue: {
    fontSize: 24, // Adjusted from 28 - 4
    fontWeight: "bold",
    color: "#FFFFFF", // White text
    marginBottom: 4,
  },
  activitiesSubText: {
    fontSize: 14, // Adjusted from 16 - 2
    color: "rgba(255, 255, 255, 0.9)", // Slightly transparent white
    marginBottom: SPACING,
  },
  activitiesProgressBarContainer: {
    width: "100%",
    height: 12,
    backgroundColor: "#E67E22", // Darker orange background for the track
    borderRadius: 6,
    overflow: "hidden",
  },
  activitiesProgressBarFill: {
    height: "100%",
    backgroundColor: "#FFFFFF", // White fill for the progress
    borderRadius: 6,
  },
  // NEW: Food Carousel styles
  foodCarouselContainer: {
    paddingVertical: SPACING / 2,
    // Remove horizontal padding for overflow effect
    paddingLeft: 0,
    paddingRight: 0,
  },
  foodCarouselItem: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING * 2, // More horizontal spacing
    marginVertical: SPACING * 0.5, // Add vertical spacing
    backgroundColor: "#F3F4F6",
    ...MODERN_SHADOW,
    overflow: "hidden",
    marginLeft: 0,
  },
  foodImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#F3F4F6",
  },

  // NEW: Diet Plan Section styles
  dietPlanSection: {
    marginTop: SPACING * 1.5, // More space above this section
    alignItems: "center",
    // paddingHorizontal: SPACING, // Already handled by parent section
  },
  dietPlanTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: SPACING / 4,
    textAlign: "center",
  },
  dietPlanSubtitle: {
    fontSize: 16,
    color: "#64748B", // Default text secondary color
    textAlign: "center",
    marginBottom: SPACING,
    lineHeight: 20,
  },
  viewMealPlansButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    // No background color, just text color
  },
  viewMealPlansButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 4,
  },

  macroItem: {
    flex: 1,
    marginBottom: SPACING / 2,
  },
  macroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  macroName: {
    fontSize: 14,
    fontWeight: "500",
  },
  macroValue: {
    fontSize: 12,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  aiGoalPlanBanner: {
    borderRadius: 12,
    overflow: "hidden",
    // Shadow applied via MODERN_SHADOW
  },
  aiGoalPlanBannerGradient: {
    padding: SPACING,
  },
  aiGoalPlanBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aiGoalPlanBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiGoalPlanBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING / 2,
  },
  aiGoalPlanBannerText: {},
  aiGoalPlanBannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  aiGoalPlanBannerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  aiGoalPlanBannerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiGoalPlanBannerBadge: {
    backgroundColor: "#FCD34D",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: SPACING / 2,
  },
  aiGoalPlanBannerBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1E293B",
  },
  nutritionSummaryCard: {
    borderRadius: 12,
    padding: SPACING,
    // Shadow applied via MODERN_SHADOW
  },
  caloriesSection: {
    marginBottom: SPACING / 2,
  },
  calorieMainDisplay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING / 2,
  },
  calorieMainInfo: {
    flex: 1,
    marginRight: SPACING / 2,
  },
  calorieMainValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  calorieMainLabel: {
    fontSize: 14,
    opacity: 0.8,
  },
  calorieProgressContainer: {
    width: 90,
    height: 90,
  },
  calorieProgressContent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  calorieProgressPercentage: {
    fontSize: 16,
    fontWeight: "bold",
  },
  calorieProgressLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  compactStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  compactStatItem: {
    alignItems: "center",
  },
  compactStatValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  compactStatLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  nutritionDivider: {
    height: 1,
    marginVertical: SPACING / 2,
  },
  macrosSection: {},
  macrosSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: SPACING / 2,
  },
  macrosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  healthCard: {
    borderRadius: 12,
    overflow: "hidden",
    // Shadow applied via MODERN_SHADOW
  },
  healthCardGradient: {
    padding: SPACING,
  },
  healthCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING / 2,
  },
  healthCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: SPACING / 4,
  },
  progressContainer: {
    marginBottom: SPACING / 2,
  },
  progressBackground: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
  },
  progressText: {
    fontSize: 12,
    marginTop: SPACING / 4,
  },
  healthStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trainerBanner: {
    borderRadius: 12,
    overflow: "hidden",
    // Shadow applied via MODERN_SHADOW
  },
  trainerBannerGradient: {
    padding: SPACING,
  },
  trainerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trainerInfo: {
    flex: 1,
    marginRight: SPACING / 2,
  },
  trainerBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: SPACING / 4,
  },
  trainerBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  trainerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: SPACING / 8,
  },
  trainerSpecialty: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: SPACING / 4,
  },
  trainerStats: {
    flexDirection: "row",
    marginBottom: SPACING / 2,
  },
  trainerStat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING / 2,
  },
  trainerStatText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginLeft: SPACING / 8,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING / 2,
    paddingVertical: SPACING / 4,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: SPACING / 8,
  },
  trainerImageContainer: {
    position: "relative",
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
  },
  trainerImage: {
    width: "100%",
    height: "100%",
  },
  trainerImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  weightContainer: {
    borderRadius: 12,
    padding: SPACING,
    // Shadow applied via MODERN_SHADOW
  },
  weightStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING / 2,
  },
  weightChartContainer: {
    borderRadius: 12,
    paddingVertical: SPACING / 2,
    marginBottom: SPACING / 2,
  },
  weightChart: {
    marginRight: -SPACING,
  },
  weightNoDataContainer: {
    paddingVertical: SPACING,
    alignItems: "center",
  },
  weightNoDataText: {
    fontSize: 14,
    opacity: 0.8,
  },
  timeFrameScrollContainer: {
    marginBottom: SPACING / 2,
  },
  timeFrameContainer: {
    flexDirection: "row",
  },
  timeFrameButton: {
    paddingHorizontal: SPACING / 2,
    paddingVertical: SPACING / 4,
    borderRadius: 8,
    marginRight: SPACING / 4,
  },
  timeFrameButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Enhanced Nutrition Section Styles
  nutritionSection: {
    borderRadius: 12,
    padding: SPACING,
    // Shadow applied via MODERN_SHADOW
  },
  mealItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  mealItemLast: {
    borderBottomWidth: 0,
  },
  mealIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  mealIcon: {
    fontSize: 24,
  },
  mealInfo: {
    flex: 1,
    marginRight: 12,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
  },
  mealPercentage: {
    fontSize: 14,
    fontWeight: "700",
  },
  mealCalories: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  mealSubtitle: {
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 8,
  },
  mealProgressContainer: {
    marginBottom: 8,
  },
  mealProgressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  mealProgressFill: {
    height: "100%",
    borderRadius: 3,
    minWidth: 4,
  },
  mealStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  mealStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  addMealButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 8,
    overflow: "hidden",
  },
  retryButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
})
