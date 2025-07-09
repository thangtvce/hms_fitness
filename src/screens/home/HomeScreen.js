import React, { useCallback, useMemo, useState, useEffect, useContext } from 'react';
import { LineChart } from 'react-native-chart-kit';
import { weightHistoryService } from 'services/apiWeightHistoryService';
import { ThemeContext } from 'components/theme/ThemeContext';
import { AuthContext } from 'context/AuthContext';
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
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import apiUserService from "services/apiUserService";
import { foodService } from "services/apiFoodService";
import { workoutService } from "services/apiWorkoutService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";
import { apiUserWaterLogService } from "services/apiUserWaterLogService";
import Header from "components/Header";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { useStepTracker } from "context/StepTrackerContext";

const { width } = Dimensions.get('window');
const SPACING = 20;
const screenWidth = Dimensions.get('window').width;

export default function HomeScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { colors, theme } = useContext(ThemeContext);
  const { steps, duration, isReady } = useStepTracker();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(30)).current;
  const [currentDate] = useState(new Date());
  const [activeIcon, setActiveIcon] = useState('Profile');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nutritionTarget, setNutritionTarget] = useState({
    calories: null,
    carbs: null,
    protein: null,
    fats: null,
  });
  const [waterData, setWaterData] = useState({ todayIntake: 0, weeklyAverage: 0 });
  const [weightHistory, setWeightHistory] = useState([]);
  const [weightStats, setWeightStats] = useState({ current: 0, lowest: 0, highest: 0, average: 0, change: 0 });
  const [weightTimeFrame, setWeightTimeFrame] = useState('3m');

  // StepCounter AsyncStorage values
  const [stepCounterData, setStepCounterData] = useState({ steps: 0, calories: 0, distance: 0, target: 10000 });

  // Helper to get today's key (same as StepCounterScreen)
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  // Load step/calo/distance from AsyncStorage (StepCounterScreen logic)
  useEffect(() => {
    const loadStepCounterData = async () => {
      try {
        const userId = user?.userId || 'unknown';
        const todayKey = `stepcounter_${userId}_${getTodayStr()}`;
        const data = await AsyncStorage.getItem(todayKey);
        if (data) {
          const parsed = JSON.parse(data);
          const steps = Number(parsed.steps) || 0;
          const duration = Number(parsed.duration) || 0;
          const target = Number(parsed.target) || 10000;
          // Calculate distance and calories as in StepCounterScreen
          const distance = (steps * 0.762) / 1000;
          let calPerStep = 0.04;
          if (user && user.gender) {
            if (user.gender.toLowerCase() === 'female' || user.gender.toLowerCase() === 'nữ') calPerStep = 0.03;
          }
          const calories = Math.round(steps * calPerStep);
          setStepCounterData({ steps, calories, distance, target });
        } else {
          setStepCounterData({ steps: 0, calories: 0, distance: 0, target: 10000 });
        }
      } catch {
        setStepCounterData({ steps: 0, calories: 0, distance: 0, target: 10000 });
      }
    };
    loadStepCounterData();
  }, [user]);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDayIndex = currentDate.getDay();

  // Format duration in hh:mm:ss
  const formatDuration = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s]
      .map((v) => v.toString().padStart(2, '0'))
      .join(':');
  };

  // Step Preview Section


  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: loading && !refreshing ? 'none' : 'flex' },
    });
  }, [loading, refreshing, navigation]);

  const trainerAds = [
    {
      id: 1,
      name: 'Sarah Johnson',
      specialty: 'Weight Loss & Nutrition',
      rating: 4.9,
      clients: 250,
      image: 'https://images.unsplash.com/photo-1594824804732-ca8db4394b12?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      badge: 'Top Rated',
      experience: '5+ years',
    },
    {
      id: 2,
      name: 'Mike Chen',
      specialty: 'Strength Training',
      rating: 4.8,
      clients: 180,
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      badge: 'Certified',
      experience: '7+ years',
    },
    {
      id: 3,
      name: 'Emma Davis',
      specialty: 'Yoga & Mindfulness',
      rating: 4.9,
      clients: 320,
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
      badge: 'Expert',
      experience: '6+ years',
    },
  ];

  const [currentTrainerIndex, setCurrentTrainerIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTrainerIndex((prev) => (prev + 1) % trainerAds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const defaultSummary = {
    nutritionSummary: {
      consumedCalories: 0,
      remainingCalories: 2200,
      totalCalories: 2200,
      macros: {
        carbs: { value: 0, target: nutritionTarget.carbs, unit: 'g', color: '#4F46E5' },
        protein: { value: 0, target: nutritionTarget.protein, unit: 'g', color: '#10B981' },
        fats: { value: 0, target: nutritionTarget.fats, unit: 'g', color: '#F59E0B' },
      },
    },
    activitySummary: { burnedCalories: 0, steps: 0, target: 10000 },
    mealPlans: [
      {
        plan_name: 'Balanced Diet',
        daily_calories: 2200,
        meal_frequency: 3,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      },
      {
        plan_name: 'High Protein',
        daily_calories: 2400,
        meal_frequency: 4,
        image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      },
    ],
    mealCalories: { Breakfast: 0, Lunch: 0, Dinner: 0, Other: 0 },
  };

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatLastLogin = (lastLogin) => {
    const date = new Date(lastLogin);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return date.toLocaleDateString();
  };

  const fetchUserData = async (isRefresh = false) => {
    if (!user || !user.userId) {
      setDashboardData({
        ...defaultSummary,
        user: { fullName: 'Unknown User', gender: 'N/A', birthDate: null, lastLogin: new Date() },
      });
      setWaterData({ todayIntake: 0, weeklyAverage: 0 });
      setWeightHistory([]);
      setWeightStats({ current: 0, lowest: 0, highest: 0, average: 0, change: 0 });
      setLoading(false);
      setRefreshing(false);
      const todayKey = dayjs(currentDate).format('YYYY-MM-DD');
      await AsyncStorage.setItem(
        `dailyStats_${todayKey}`,
        JSON.stringify({
          waterIntake: 0,
          caloriesRemaining: 0,
          macros: { carbs: 0, protein: 0, fats: 0 },
          weight: 0,
          steps: 0,
        })
      );
      return;
    }

    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      const userData = await apiUserService.getUserById(user.userId);
      const avatar = userData.data.avatar;
      if (avatar) await AsyncStorage.setItem('userAvatar', avatar);

      const startDate = dayjs(currentDate).format('YYYY-MM-DD');
      const endDate = dayjs(currentDate).format('YYYY-MM-DD');
      const startOfMonth = dayjs(currentDate).startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs(currentDate).endOf('month').format('YYYY-MM-DD');

      const nutritionResponse = await foodService.getMyNutritionLogs({
        pageNumber: 1,
        pageSize: 200,
        startDate: startOfMonth,
        endDate: endOfMonth,
      });

      const grouped = {};
      if (nutritionResponse.statusCode === 200 && Array.isArray(nutritionResponse.data.nutritionLogs)) {
        nutritionResponse.data.nutritionLogs.forEach((log) => {
          const date = dayjs(log.consumptionDate).format('YYYY-MM-DD');
          if (!grouped[date]) grouped[date] = [];
          grouped[date].push(log);
        });
      }

      const todayKey = dayjs(currentDate).format('YYYY-MM-DD');
      const todayLogs = grouped[todayKey] || [];

      let consumedCalories = 0;
      let carbs = 0;
      let protein = 0;
      let fats = 0;
      const mealCalories = { Breakfast: 0, Lunch: 0, Dinner: 0, Other: 0 };

      todayLogs.forEach((log) => {
        consumedCalories += log.calories || 0;
        carbs += log.carbs || 0;
        protein += log.protein || 0;
        fats += log.fats || 0;
        const mealType = ['Breakfast', 'Lunch', 'Dinner'].includes(log.mealType) ? log.mealType : 'Other';
        mealCalories[mealType] += log.calories || 0;
      });

      const activitiesResponse = await workoutService.getMyActivities({
        pageNumber: 1,
        pageSize: 50,
      });

      let burnedCalories = 0;
      let activitySteps = 0;

      if (Array.isArray(activitiesResponse)) {
        const todayActivities = activitiesResponse.filter((activity) =>
          dayjs(activity.recordedAt).isSame(currentDate, 'day'),
        );
        burnedCalories = todayActivities.reduce((sum, activity) => sum + (activity.caloriesBurned || 0), 0);
        activitySteps = todayActivities.reduce((sum, activity) => sum + (activity.steps || 0), 0);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);

      const waterResponse = await apiUserWaterLogService.getMyWaterLogs({
        startDate: weekAgo.toISOString().split('T')[0],
        endDate: tomorrow.toISOString().split('T')[0],
        pageSize: 100,
      });

      const waterLogs = waterResponse?.data?.records || waterResponse?.data || [];

      const todayTotal = waterLogs
        .filter((log) => {
          const d = new Date(log.consumptionDate);
          return d >= today && d < tomorrow;
        })
        .reduce((sum, log) => sum + (log.amountMl || 0), 0);

      const dailyTotals = Array(7).fill(0);
      for (let i = 0; i < 7; i++) {
        const day = new Date(weekAgo);
        day.setDate(weekAgo.getDate() + i);
        const nextDay = new Date(day);
        nextDay.setDate(day.getDate() + 1);

        dailyTotals[i] = waterLogs
          .filter((log) => {
            const d = new Date(log.consumptionDate);
            return d >= day && d < nextDay;
          })
          .reduce((sum, log) => sum + (log.amountMl || 0), 0);
      }

      const weeklyAverage = dailyTotals.reduce((a, b) => a + b, 0) / 7;
      setWaterData({ todayIntake: todayTotal, weeklyAverage });

      const weightResponse = await weightHistoryService.getMyWeightHistory({ pageNumber: 1, pageSize: 100 });
      let weightRecords = [];

      if (weightResponse.statusCode === 200 && weightResponse.data) {
        weightRecords = (weightResponse.data.records || []).sort(
          (a, b) => new Date(b.recordedAt) - new Date(a.recordedAt),
        );
        setWeightHistory(weightRecords);

        const weights = weightRecords.map((item) => item.weight);
        const current = weights[0] || 0;
        const lowest = weights.length > 0 ? Math.min(...weights) : 0;
        const highest = weights.length > 0 ? Math.max(...weights) : 0;
        const average = weights.length > 0 ? weights.reduce((sum, weight) => sum + weight, 0) / weights.length : 0;
        const change = weights.length > 1 ? current - weights[weights.length - 1] : 0;

        setWeightStats({
          current: Number.parseFloat(current.toFixed(1)),
          lowest: Number.parseFloat(lowest.toFixed(1)),
          highest: Number.parseFloat(highest.toFixed(1)),
          average: Number.parseFloat(average.toFixed(1)),
          change: Number.parseFloat(change.toFixed(1)),
        });
      }

      const totalCalories = userData.data.dailyCalorieGoal || defaultSummary.nutritionSummary.totalCalories;
      const netCalories = consumedCalories - burnedCalories;
      const remainingCalories = Math.max(totalCalories - netCalories, 0);

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
          steps: steps, // Use real-time steps from useStepTracker
        },
        mealPlans: defaultSummary.mealPlans,
        mealCalories,
      });

      const todayWeight = weightRecords && weightRecords.length > 0 ? weightRecords[0].weight : 0;
      const caloriesSummary = {
        remaining: Math.round(remainingCalories),
        consumed: Math.round(consumedCalories),
        burned: Math.round(burnedCalories),
        net: Math.round(consumedCalories - burnedCalories),
        target: Math.round(totalCalories),
        progressPercentage: totalCalories > 0 ? Math.min(((totalCalories - remainingCalories) / totalCalories) * 100, 100) : 0,
        consumedPercentage: totalCalories > 0 ? Math.min((consumedCalories / totalCalories) * 100, 100) : 0,
        burnedPercentage: totalCalories > 0 ? Math.min((burnedCalories / totalCalories) * 100, 100) : 0,
      };
      await AsyncStorage.setItem(
        `dailyStats_${todayKey}`,
        JSON.stringify({
          waterIntake: todayTotal,
          caloriesSummary,
          macros: { carbs: Math.round(carbs), protein: Math.round(protein), fats: Math.round(fats) },
          weight: todayWeight,
          steps: steps,
        })
      );
    } catch (err) {
      setError('Failed to load data. Please try again later.');
      setDashboardData({
        ...defaultSummary,
        user: user || { fullName: 'Unknown User', gender: 'N/A', birthDate: null, lastLogin: new Date() },
      });
      setWaterData({ todayIntake: 0, weeklyAverage: 0 });
      setWeightHistory([]);
      setWeightStats({ current: 0, lowest: 0, highest: 0, average: 0, change: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const checkAndSaveNutritionTarget = async (macros, calories, burnedCalories) => {
    try {
      const raw = await AsyncStorage.getItem('nutritionTarget');
      if (!raw) return;

      const target = JSON.parse(raw);
      const netCalories = Number(calories) - Number(burnedCalories);
      const completed =
        Number(macros.carbs) >= Number(target.carbs) &&
        Number(macros.protein) >= Number(target.protein) &&
        Number(macros.fats) >= Number(target.fats) &&
        netCalories >= Number(target.calories);

      const today = dayjs(currentDate).format('YYYY-MM-DD');
      let history = [];
      const rawHistory = await AsyncStorage.getItem('nutritionTargetHistory');
      if (rawHistory) history = JSON.parse(rawHistory);

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
        });
        await AsyncStorage.setItem('nutritionTargetHistory', JSON.stringify(history));
      }

      if (completed) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎉 Nutrition Target Achieved!',
            body: `You have met your daily nutrition target! Great job!`,
          },
          trigger: null,
        });
      }
    } catch (e) {
      // Handle error silently
    }
  };

  useEffect(() => {
    fetchUserData();
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
    ]).start();
  }, [user?.userId]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem('nutritionTarget');
          if (raw) {
            const target = JSON.parse(raw);
            setNutritionTarget({
              calories: isNaN(Number(target.calories)) ? null : Number(target.calories),
              carbs: isNaN(Number(target.carbs)) ? null : Number(target.carbs),
              protein: isNaN(Number(target.protein)) ? null : Number(target.protein),
              fats: isNaN(Number(target.fats)) ? null : Number(target.fats),
            });
          } else {
            setNutritionTarget({ calories: null, carbs: null, protein: null, fats: null });
          }
        } catch (e) {
          setNutritionTarget({ calories: null, carbs: null, protein: null, fats: null });
        }
      })();
    }, []),
  );

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
      );
    }
  }, [dashboardData]);

  const getGreeting = useCallback(() => {
    const hour = currentDate.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [currentDate]);

  const handleNavigation = useCallback(
    (route, params) => {
      if (route) {
        setActiveIcon(route);
        navigation.navigate(route, params);
      } else {
        Alert.alert('Coming Soon', 'This feature will be available soon!');
      }
    },
    [navigation],
  );

  const discoverItems = useMemo(
    () => [
      {
        title: 'Profile',
        icon: 'user',
        route: 'Profile',
        gradient: ['#4F46E5', '#6366F1'],
        badge: null,
      },
      {
        title: 'Workouts',
        icon: 'activity',
        route: 'Workouts',
        gradient: ['#F59E0B', '#FBBF24'],
        badge: null,
      },
      {
        title: 'Community',
        icon: 'users',
        route: 'Community',
        gradient: ['#10B981', '#34D399'],
        badge: 5,
      },
      {
        title: 'Food',
        icon: 'coffee',
        route: 'Food',
        gradient: ['#dd5bcd', '#818CF8'],
        badge: null,
      },
      {
        title: 'Health Consultation',
        icon: 'activity',
        route: 'HealthConsultationScreen',
        gradient: ['#0056d2', '#50a2ff'],
        badge: null,
      },
    ],
    [],
  );

  const renderDiscoverItem = (item, index) => {
    const isActive = activeIcon === item.title;
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
            { color: isActive ? colors.activeDiscoverTitle || '#4F46E5' : colors.discoverTitle || '#64748B' },
            isActive && styles.activeDiscoverTitle,
          ]}
        >
          {item.title}
        </Text>
        {isActive && (
          <View style={[styles.activeIndicator, { backgroundColor: colors.activeDiscoverTitle || '#4F46E5' }]} />
        )}
      </TouchableOpacity>
    );
  };

  const MacroProgress = ({ name, color, value, target, unit, textColor }) => {
    const percentage = target > 0 ? Math.min((value / target) * 100, 100) : 0;
    return (
      <View style={styles.macroItem}>
        <View style={styles.macroHeader}>
          <Text style={[styles.macroName, { color: textColor }]}>{name}</Text>
          <Text style={styles.macroValue}>
            <Text style={{ color, fontWeight: '700' }}>{value}</Text>
            <Text style={{ color: textColor, opacity: 0.7 }}>
              /{target} {unit}
            </Text>
          </Text>
        </View>
        <View style={[styles.progressBarContainer, { backgroundColor: theme === 'dark' ? '#374151' : '#E2E8F0' }]}>
          <LinearGradient
            colors={[color, color]}
            style={[styles.progressBar, { width: `${percentage}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      </View>
    );
  };

  const AIGoalPlanBanner = () => {
    return (
      <TouchableOpacity
        style={styles.aiGoalPlanBanner}
        onPress={() => handleNavigation('UserGoalPlansScreen')}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#0056d2', '#6366F1']}
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
    );
  };

  const CaloriesSummaryCard = () => {
    const targetCalories = nutritionTarget.calories ? Number(nutritionTarget.calories) : null;
    const consumed = dashboardData?.nutritionSummary?.consumedCalories || 0;
    const burned = dashboardData?.activitySummary?.burnedCalories || 0;
    const netCalories = consumed - burned;
    const remaining = targetCalories
      ? Math.max(targetCalories - netCalories, 0)
      : dashboardData?.nutritionSummary?.remainingCalories || 0;
    const total = targetCalories || dashboardData?.nutritionSummary?.totalCalories || 2200;

    const achievedCalories = total - remaining;
    const progressPercentage = total > 0 ? Math.min((achievedCalories / total) * 100, 100) : 0;
    const consumedPercentage = total > 0 ? Math.min((consumed / total) * 100, 100) : 0;
    const burnedPercentage = total > 0 ? Math.min((burned / total) * 100, 100) : 0;

    return (
      <View style={[styles.caloriesSummaryCard, { backgroundColor: colors.calorieCardBackground || '#FFFFFF' }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.sectionTitle || '#1E293B' }]}>Calories</Text>
        </View>
        <View style={styles.calorieMainDisplay}>
          <View style={styles.calorieMainInfo}>
            <Text
              style={[
                styles.calorieMainValue,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') },
              ]}
            >
              {remaining}
            </Text>
            <Text
              style={[
                styles.calorieMainLabel,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') },
              ]}
            >
              Remaining
            </Text>
            <Text
              style={{
                color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B'),
                fontSize: 12,
                marginTop: 2,
                opacity: 0.7,
              }}
            >
              {`Remaining = Target - Food + Exercise`}
            </Text>
          </View>
          <View style={styles.calorieProgressContainer}>
            <AnimatedCircularProgress
              size={100}
              width={6}
              fill={progressPercentage}
              tintColor={colors.primary || '#6366F1'}
              backgroundColor={theme === 'dark' ? '#374151' : '#E2E8F0'}
              rotation={0}
              lineCap="round"
              style={{ alignSelf: 'center' }}
            >
              {() => (
                <View style={styles.calorieProgressContent}>
                  <Text style={[styles.calorieProgressPercentage, { color: colors.primary || '#6366F1' }]}>
                    {Math.round(progressPercentage)}%
                  </Text>
                  <Text
                    style={[
                      styles.calorieProgressLabel,
                      { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#64748B') },
                    ]}
                  >
                    Complete
                  </Text>
                </View>
              )}
            </AnimatedCircularProgress>
          </View>
        </View>
        <View style={styles.calorieStatsGrid}>
          <View
            style={[
              styles.calorieStatCard,
              { backgroundColor: colors.statCardBackground || (theme === 'dark' ? '#18181B' : '#F3F4F6') },
            ]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === 'dark'
                      ? colors.statIconBackgroundLight || '#FFFFFF'
                      : colors.statIconBackground || '#EEF2FF',
                },
              ]}
            >
              <Feather
                name="trending-up"
                size={16}
                color={theme === 'dark' ? colors.primaryLight || '#A5B4FC' : colors.primary || '#6366F1'}
              />
            </View>
            <Text
              style={[
                styles.calorieStatValue,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') },
              ]}
            >
              {consumed}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B'), opacity: 0.7 },
              ]}
            >
              Food
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[
                  styles.calorieStatProgressFill,
                  { width: `${consumedPercentage}%`, backgroundColor: colors.primary || '#6366F1' },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              styles.calorieStatCard,
              { backgroundColor: colors.statCardBackground || (theme === 'dark' ? '#18181B' : '#F3F4F6') },
            ]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === 'dark'
                      ? colors.statIconBackgroundLight || '#FFFFFF'
                      : colors.statIconBackground || '#FEF2F2',
                },
              ]}
            >
              <Feather
                name="zap"
                size={16}
                color={theme === 'dark' ? colors.warningLight || '#FCA5A5' : colors.warning || '#EF4444'}
              />
            </View>
            <Text
              style={[
                styles.calorieStatValue,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') },
              ]}
            >
              {burned}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B'), opacity: 0.7 },
              ]}
            >
              Exercise
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[
                  styles.calorieStatProgressFill,
                  { width: `${burnedPercentage}%`, backgroundColor: colors.warning || '#EF4444' },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              styles.calorieStatCard,
              { backgroundColor: colors.statCardBackground || (theme === 'dark' ? '#18181B' : '#F3F4F6') },
            ]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === 'dark'
                      ? colors.statIconBackgroundLight || '#FFFFFF'
                      : colors.statIconBackground || '#F0FDF4',
                },
              ]}
            >
              <Feather
                name="activity"
                size={16}
                color={theme === 'dark' ? colors.successLight || '#6EE7B7' : colors.success || '#10B981'}
              />
            </View>
            <Text
              style={[
                styles.calorieStatValue,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') },
              ]}
            >
              {netCalories}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B'), opacity: 0.7 },
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
                    backgroundColor: colors.success || '#10B981',
                  },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              styles.calorieStatCard,
              { backgroundColor: colors.statCardBackground || (theme === 'dark' ? '#18181B' : '#F3F4F6') },
            ]}
          >
            <View
              style={[
                styles.calorieStatIcon,
                {
                  backgroundColor:
                    theme === 'dark'
                      ? colors.statIconBackgroundLight || '#FFFFFF'
                      : colors.statIconBackground || '#FFFBEB',
                },
              ]}
            >
              <Feather
                name="flag"
                size={16}
                color={theme === 'dark' ? colors.infoLight || '#FDE68A' : colors.info || '#F59E0B'}
              />
            </View>
            <Text
              style={[
                styles.calorieStatValue,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') },
              ]}
            >
              {targetCalories || total}
            </Text>
            <Text
              style={[
                styles.calorieStatLabel,
                { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B'), opacity: 0.7 },
              ]}
            >
              Target
            </Text>
            <View style={styles.calorieStatProgress}>
              <View
                style={[styles.calorieStatProgressFill, { width: '100%', backgroundColor: colors.info || '#F59E0B' }]}
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  const WaterIntakePreview = () => {
    const { colors, theme } = useContext(ThemeContext);
    const RECOMMENDED_DAILY_INTAKE = 2000;
    return (
      <View style={[styles.healthCard, { marginBottom: 30 }]}>
        <LinearGradient
          colors={theme === 'dark' ? ['#18181B', '#18181B'] : ['#FFFFFF', '#FFFFFF']}
          style={styles.healthCardGradient}
        >
          <View style={styles.healthCardHeader}>
            <Feather name="droplet" size={22} color={theme === 'dark' ? '#FFFFFF' : '#1E293B'} />
            <Text style={[styles.healthCardTitle, { color: theme === 'dark' ? '#FFFFFF' : '#1E293B' }]}>
              Today's Hydration
            </Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBackground, { backgroundColor: theme === 'dark' ? '#374151' : '#E2E8F0' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(waterData.todayIntake / RECOMMENDED_DAILY_INTAKE, 1) * 100}%`,
                    backgroundColor: colors.primary || '#0056d2',
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: theme === 'dark' ? '#FFFFFF' : '#1E293B' }]}>
              {waterData.todayIntake} / {RECOMMENDED_DAILY_INTAKE} ml
            </Text>
          </View>
          <View style={styles.healthStats}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme === 'dark' ? '#FFFFFF' : '#1E293B' }]}>
                {Math.round((waterData.todayIntake / RECOMMENDED_DAILY_INTAKE) * 100)}%
              </Text>
              <Text style={[styles.statLabel, { color: theme === 'dark' ? '#D1D5DB' : '#64748B' }]}>Daily Goal</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme === 'dark' ? '#374151' : '#E2E8F0' }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme === 'dark' ? '#FFFFFF' : '#1E293B' }]}>
                {Math.round(waterData.weeklyAverage)}
              </Text>
              <Text style={[styles.statLabel, { color: theme === 'dark' ? '#D1D5DB' : '#64748B' }]}>Weekly Avg</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  const TrainerBanner = () => {
    const currentTrainer = trainerAds[currentTrainerIndex];
    return (
      <TouchableOpacity
        style={[
          styles.trainerBanner,
          {
            backgroundColor: colors.trainerBannerBackground || colors.cardBackground || '#FFFFFF',
            shadowColor: colors.trainerBannerShadow || colors.shadow || '#000',
          },
        ]}
        onPress={() => Alert.alert('Trainer Profile', `Contact ${currentTrainer.name} for personalized training!`)}
        activeOpacity={0.9}
      >
        <View style={styles.trainerBannerGradient}>
          <View style={styles.trainerContent}>
            <View style={styles.trainerInfo}>
              <View
                style={[
                  styles.trainerBadge,
                  { backgroundColor: colors.trainerBadgeBackground || 'rgba(255,255,255,0.2)' },
                ]}
              >
                <Text style={[styles.trainerBadgeText, { color: colors.trainerBadgeText || '#FFFFFF' }]}>
                  {currentTrainer.badge}
                </Text>
              </View>
              <Text style={[styles.trainerName, { color: colors.trainerName || '#FFFFFF' }]}>
                {currentTrainer.name}
              </Text>
              <Text style={[styles.trainerSpecialty, { color: colors.trainerSpecialty || 'rgba(255,255,255,0.9)' }]}>
                {currentTrainer.specialty}
              </Text>
              <View style={styles.trainerStats}>
                <View style={styles.trainerStat}>
                  <Feather name="star" size={14} color="#FCD34D" />
                  <Text style={[styles.trainerStatText, { color: colors.trainerStatText || '#FFFFFF' }]}>
                    {currentTrainer.rating}
                  </Text>
                </View>
                <View style={styles.trainerStat}>
                  <Feather name="users" size={14} color={colors.trainerIcon || '#FFFFFF'} />
                  <Text style={[styles.trainerStatText, { color: colors.trainerStatText || '#FFFFFF' }]}>
                    {currentTrainer.clients}+ clients
                  </Text>
                </View>
                <View style={styles.trainerStat}>
                  <Feather name="award" size={14} color={colors.trainerIcon || '#FFFFFF'} />
                  <Text style={[styles.trainerStatText, { color: colors.trainerStatText || '#FFFFFF' }]}>
                    {currentTrainer.experience}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.contactButton, { backgroundColor: colors.trainerButtonBackground || '#FFFFFF' }]}
              >
                <Text style={[styles.contactButtonText, { color: colors.trainerButtonText || '#4F46E5' }]}>
                  Get Training Plan
                </Text>
                <Feather name="arrow-right" size={16} color={colors.trainerButtonText || '#4F46E5'} />
              </TouchableOpacity>
            </View>
            <View style={styles.trainerImageContainer}>
              <Image source={{ uri: currentTrainer.image }} style={styles.trainerImage} />
              <View style={styles.trainerImageOverlay}>
                <Feather name="play-circle" size={24} color={colors.trainerIcon || '#FFFFFF'} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const WeightStatsAndChart = () => {
    const { colors, theme } = useContext(ThemeContext);
    const timeFrameOptions = [
      { key: '7d', label: '7 Days' },
      { key: '30d', label: '30 Days' },
      { key: '3m', label: '3 Months' },
      { key: '6m', label: '6 Months' },
      { key: '12m', label: '12 Months' },
    ];

    const filterHistoryByTimeFrame = (data) => {
      const now = new Date();
      switch (weightTimeFrame) {
        case '7d':
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt);
            return now - itemDate <= 7 * 24 * 60 * 60 * 1000;
          });
        case '30d':
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt);
            return now - itemDate <= 30 * 24 * 60 * 60 * 1000;
          });
        case '3m':
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt);
            return now - itemDate <= 90 * 24 * 60 * 60 * 1000;
          });
        case '6m':
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt);
            return now - itemDate <= 180 * 24 * 60 * 60 * 1000;
          });
        case '12m':
          return data.filter((item) => {
            const itemDate = new Date(item.recordedAt);
            return now - itemDate <= 365 * 24 * 60 * 60 * 1000;
          });
        default:
          return data;
      }
    };

    const filteredHistory = filterHistoryByTimeFrame(weightHistory);

    const chartData = {
      labels: filteredHistory
        .slice(0, 10)
        .reverse()
        .map((item) => {
          const date = new Date(item.recordedAt);
          if (weightTimeFrame === '7d' || weightTimeFrame === '30d') {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          } else {
            return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
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
    };

    return (
      <View
        style={[
          styles.weightContainer,
          { backgroundColor: colors.cardBackground || (theme === 'dark' ? '#18181B' : '#FFFFFF') },
        ]}
      >
        <View style={[styles.weightStatsRow, { flexDirection: 'row', alignItems: 'center', marginBottom: 16 }]}>
          <Text
            style={[
              styles.sectionTitle,
              {
                color: colors.sectionTitle || '#1E293B',
                fontSize: 20,
                fontWeight: '700',
                letterSpacing: 0.2,
              },
            ]}
          >
            Weight
          </Text>
          <TouchableOpacity
            style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center' }}
            onPress={() => handleNavigation('WeightHistory')}
            activeOpacity={0.8}
          >
            <Feather name="plus-circle" size={32} color={colors.primary || '#0056d2'} />
          </TouchableOpacity>
        </View>
        <View style={[styles.weightChartContainer, { backgroundColor: theme === 'dark' ? '#18181B' : '#FFFFFF' }]}>
          {filteredHistory.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={chartData}
                width={Math.max(screenWidth - 64, chartData.labels.length * 60)}
                height={200}
                yAxisLabel=""
                yAxisSuffix=" kg"
                chartConfig={{
                  backgroundColor: theme === 'dark' ? '#18181B' : '#FFFFFF',
                  backgroundGradientFrom: theme === 'dark' ? '#18181B' : '#FFFFFF',
                  backgroundGradientTo: theme === 'dark' ? '#18181B' : '#FFFFFF',
                  decimalPlaces: 1,
                  color: (opacity = 1) => `#0056d2`,
                  labelColor: (opacity = 1) =>
                    theme === 'dark' ? `rgba(255, 255, 255, ${opacity})` : `rgba(31, 41, 55, ${opacity})`,
                  style: { borderRadius: 12 },
                  propsForDots: { r: '2.2', strokeWidth: '0.7', stroke: '#0056d2' },
                  propsForBackgroundLines: { strokeWidth: 0.5 },
                  propsForLabels: { fontSize: 10, fill: theme === 'dark' ? '#FFFFFF' : '#1F293B' },
                  strokeWidth: 1.5,
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
                  { color: colors.textSecondary || (theme === 'dark' ? '#D1D5DB' : '#6B7280') },
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
                    backgroundColor:
                      colors.cardBackground || (theme === 'dark' ? '#18181B' : '#F3F4F6'),
                    borderColor:
                      weightTimeFrame === option.key ? '#0056d2' : colors.border || '#E5E7EB',
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
                          ? colors.headerText || '#FFFFFF'
                          : colors.text || (theme === 'dark' ? '#D1D5DB' : '#4B5563'),
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
    );
  };

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }
    })();
  }, []);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient colors={['#0056d2', '#0056d2']} style={styles.loadingGradient}>
          <Image
            source={require('../../../assets/favicon.png')}
            style={styles.loadingImage}
            resizeMode="contain"
          />
          <ActivityIndicator size="large" color="#FFFFFF" style={styles.loadingIndicator} />
          <Text style={styles.loadingText}>Loading your health data...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background || '#F8FAFC' }]}>
        <Header
          title="HMS Fitness"
          showAvatar={true}
          rightActions={[
            {
              icon: 'notifications-outline',
              onPress: () => handleNavigation('Notifications'),
              color: colors.primary || '#0056d2',
              badge: 3,
            },
          ]}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error || '#EF4444' }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchUserData()}>
            <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.retryButtonGradient}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background || '#F8FAFC' }]}>
      <Header
        title="HMS Fitness"
        showAvatar={true}
        rightActions={[
          {
            icon: 'notifications-outline',
            onPress: () => handleNavigation('Notifications'),
            color: colors.primary || '#0056d2',
            badge: 3,
          },
        ]}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 80 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchUserData(true);
            }}
            colors={[colors.accent || '#6366F1']}
            tintColor={[colors.accent || '#6366F1']}
            progressBackgroundColor={colors.cardBackground || '#FFFFFF'}
          />
        }
      >
        {dashboardData && (
          <>
            <Animated.View
              style={[
                styles.welcomeStatsCard,
                {
                  backgroundColor: colors.calorieCardBackground || '#FFFFFF',
                  opacity: fadeAnim,
                  transform: [{ translateY: translateY }],
                },
              ]}
            >
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statIconBackground || '#F3F4F6' }]}>
                    <Feather name="activity" size={20} color={theme === 'dark' ? '#6366F1' : '#4F46E5'} />
                  </View>
                  <Text
                    style={[styles.statValue, { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') }]}
                  >
                    {stepCounterData.steps}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#64748B'), opacity: 0.7 }]}
                  >
                    Steps Today
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.cardBorder || colors.border || '#E2E8F0' }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statIconBackground || '#F3F4F6' }]}>
                    <Feather name="zap" size={20} color={theme === 'dark' ? '#FBBF24' : '#F59E0B'} />
                  </View>
                  <Text
                    style={[styles.statValue, { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') }]}
                  >
                    {stepCounterData.calories}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#64748B'), opacity: 0.7 }]}
                  >
                    Calories Burned
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: colors.cardBorder || colors.border || '#E2E8F0' }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statIconContainer, { backgroundColor: colors.statIconBackground || '#F3F4F6' }]}>
                    <Feather name="target" size={20} color={theme === 'dark' ? '#34D399' : '#10B981'} />
                  </View>
                  <Text
                    style={[styles.statValue, { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B') }]}
                  >
                    {stepCounterData.distance < 1 ? `${Math.round(stepCounterData.distance * 1000)} m` : `${stepCounterData.distance.toFixed(2)} km`}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#64748B'), opacity: 0.7 }]}
                  >
                    Distance
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <AIGoalPlanBanner />
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle || '#1E293B' }]}>Weekly Progress</Text>
                <TouchableOpacity onPress={() => handleNavigation('WeeklyProgressScreen')}>
                  <Text style={[styles.sectionAction, { color: colors.sectionAction || '#6366F1' }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.calendarCard,
                  {
                    backgroundColor: colors.calendarCardBackground || '#FFFFFF',
                    borderColor: colors.calendarCardBorder || '#E2E8F0',
                    shadowColor: colors.calendarCardShadow || '#000',
                  },
                ]}
              >
                {daysOfWeek.map((day, index) => {
                  const isActive = index === currentDayIndex;
                  const date = new Date();
                  date.setDate(currentDate.getDate() - (currentDayIndex - index));
                  return (
                    <View key={index} style={styles.dayColumn}>
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isActive
                              ? colors.activeDayText || '#4F46E5'
                              : colors.calendarDayText || colors.dayText || '#64748B',
                            fontWeight: isActive ? '700' : '600',
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
                              ? colors.activeDateCircle || '#4F46E5'
                              : colors.calendarDateCircle || colors.dateCircle || '#F1F5F9',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dateText,
                            {
                              color: isActive
                                ? colors.activeDateText || '#FFFFFF'
                                : colors.calendarDateText || colors.dateText || '#1E293B',
                              fontWeight: isActive ? '700' : '600',
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
                              ? colors.activeProgressIndicator || '#4F46E5'
                              : colors.calendarProgressIndicator || colors.progressIndicator || '#E2E8F0',
                          },
                        ]}
                      />
                    </View>
                  );
                })}
              </View>
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}></View>
         
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <CaloriesSummaryCard />
            </Animated.View>

            <Animated.View style={[styles.sectionWeight, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}></View>
              <WeightStatsAndChart />
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle || '#1E293B' }]}>Macros Breakdown</Text>
                <TouchableOpacity onPress={() => handleNavigation('WeeklyProgressScreen', { initialTab: 'Macros' })}>
                  <Text style={[styles.sectionAction, { color: colors.sectionAction || '#6366F1' }]}>Details</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.macrosCard, { backgroundColor: colors.calorieCardBackground || '#FFFFFF' }]}>
                {Object.entries(dashboardData.nutritionSummary.macros).map(([key, macro], index) => (
                  <MacroProgress
                    key={key}
                    name={key.charAt(0).toUpperCase() + key.slice(1)}
                    color={macro.color}
                    value={macro.value}
                    target={nutritionTarget[key] ?? 0}
                    unit={macro.unit}
                    textColor={colors.calorieCardText || (theme === 'dark' ? '#FFFFFF' : '#1E293B')}
                  />
                ))}
              </View>
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }] }]}>
              <View
                style={[
                  styles.trainerBanner,
                  { backgroundColor: colors.cardBackground || '#FFFFFF', shadowColor: colors.cardShadow || '#000' },
                ]}
              >
                <TrainerBanner />
              </View>
            </Animated.View>

            <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: translateY }], marginBottom: 80 }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.sectionTitle || '#1E293B' }]}>Discover</Text>
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
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  loadingIndicator: {
    marginBottom: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING,
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeStatsCard: {
    marginHorizontal: SPACING,
    marginTop: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    elevation: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  section: {
    paddingHorizontal: SPACING,
    marginTop: 12,
  },
  sectionWeight: {
    paddingHorizontal: SPACING,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiGoalPlanBanner: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#6366F1',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiGoalPlanBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiGoalPlanBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiGoalPlanBannerText: {
    flex: 1,
  },
  aiGoalPlanBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  aiGoalPlanBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  aiGoalPlanBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiGoalPlanBannerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aiGoalPlanBannerBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  caloriesSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    marginTop: -20,
  },
  calorieMainDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  calorieMainInfo: {
    flex: 1,
  },
  calorieMainValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  calorieMainLabel: {
    fontSize: 16,
  },
  calorieProgressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieProgressContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieProgressPercentage: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  calorieProgressLabel: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  calorieStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  calorieStatCard: {
    width: '48%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calorieStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  calorieStatValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  calorieStatLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  calorieStatProgress: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  calorieStatProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  trainerBanner: {
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    marginBottom: 8,
  },
  trainerBannerGradient: {
    padding: 20,
  },
  trainerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainerInfo: {
    flex: 1,
    marginRight: 16,
  },
  trainerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  trainerBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  trainerName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  trainerSpecialty: {
    fontSize: 14,
    marginBottom: 12,
  },
  trainerStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  trainerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  trainerStatText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  trainerImageContainer: {
    position: 'relative',
  },
  trainerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  trainerImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#0056d2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,86,210,0.1)',
  },
  dayColumn: {
    alignItems: 'center',
    flex: 1,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressIndicator: {
    width: 6,
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
  },
  macroValue: {
    fontSize: 14,
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
