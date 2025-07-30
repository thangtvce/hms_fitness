import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Modal,
  PanResponder,
  Animated,
} from "react-native";
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "context/AuthContext";
import { profileService } from "services/apiProfileService";
import { bodyMeasurementService } from "services/apiBodyMeasurementService";
import { weightHistoryService } from "services/apiWeightHistoryService";
import { apiUserService } from "services/apiUserService";
import { theme } from "theme/color";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import FloatingMenuButton from "components/FloatingMenuButton";
import CheckInModal from "components/checkin/CheckInModel";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";

const { width, height: screenHeight } = Dimensions.get("window");

const calculateXPRequired = (level) => {
  return Math.floor(100 * Math.pow(1.2, level - 1));
};

const calculateLevelUp = (currentLevel, currentXP, xpToAdd) => {
  let newLevel = currentLevel;
  let newXP = currentXP + xpToAdd;
  while (true) {
    const xpRequired = calculateXPRequired(newLevel);
    if (newXP >= xpRequired) {
      newXP -= xpRequired;
      newLevel += 1;
    } else {
      break;
    }
  }
  return { newLevel, newXP };
};

const ImageZoomViewer = ({ visible, imageUri, onClose, showDeleteButton = false }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const [isZoomed, setIsZoomed] = useState(false);
  const [lastTap, setLastTap] = useState(null);

  const resetTransform = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    setIsZoomed(false);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (lastTap && now - lastTap < DOUBLE_PRESS_DELAY) {
      if (isZoomed) {
        resetTransform();
      } else {
        Animated.spring(scale, { toValue: 2, useNativeDriver: true }).start();
        setIsZoomed(true);
      }
    } else {
      setLastTap(now);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return isZoomed || Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        translateX.setOffset(translateX._value);
        translateY.setOffset(translateY._value);
        scale.setOffset(scale._value);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches.length === 2) {
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const distance = Math.sqrt(
            Math.pow(touch2.pageX - touch1.pageX, 2) + Math.pow(touch2.pageY - touch1.pageY, 2)
          );
          const newScale = Math.min(Math.max(distance / 200, 0.5), 5);
          scale.setValue(newScale);
          setIsZoomed(newScale > 1.1);
        } else if (isZoomed && evt.nativeEvent.touches.length === 1) {
          const maxTranslate = 100;
          translateX.setValue(Math.min(Math.max(gestureState.dx, -maxTranslate), maxTranslate));
          translateY.setValue(Math.min(Math.max(gestureState.dy, -maxTranslate), maxTranslate));
        }
      },
      onPanResponderRelease: () => {
        translateX.flattenOffset();
        translateY.flattenOffset();
        scale.flattenOffset();
        const currentScale = scale._value;
        if (currentScale < 1.1 && currentScale > 0.9) {
          resetTransform();
        }
      },
    })
  ).current;

  const handleClose = () => {
    resetTransform();
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" />
      <View style={zoomStyles.container}>
        <View style={zoomStyles.overlay}>
          <View style={zoomStyles.header}>
            <TouchableOpacity style={zoomStyles.headerButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={zoomStyles.headerTitle}>Profile Picture</Text>
          </View>
          <View style={zoomStyles.imageContainer}>
            <Animated.View
              style={[
                zoomStyles.imageWrapper,
                {
                  transform: [{ scale }, { translateX }, { translateY }],
                },
              ]}
              {...panResponder.panHandlers}
            >
              <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap} style={zoomStyles.imageTouchable}>
                <Image
                  source={{ uri: imageUri }}
                  style={zoomStyles.image}
                  resizeMode="contain"
                  onError={() => {
                    Alert.alert("Error", "Failed to load image");
                    handleClose();
                  }}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
          <View style={zoomStyles.footer}>
            <View style={zoomStyles.zoomInfo}>
              <Ionicons name="search-outline" size={16} color="#FFFFFF" />
              <Text style={zoomStyles.zoomText}>
                {isZoomed ? "Pinch to zoom • Double tap to reset" : "Pinch to zoom • Double tap to zoom in"}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const useProfileData = (user, authToken, authLoading, navigation) => {
  const [data, setData] = useState({
    userData: null,
    profile: null,
    bodyMeasurements: [],
    weightHistory: [],
  });
  const [loading, setLoading] = useState({
    userData: true,
    profile: true,
    bodyMeasurements: true,
    weightHistory: true,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchUserData = useCallback(
    async (abortController) => {
      try {
        if (!user || !user.userId || !authToken) return;
        setLoading((prev) => ({ ...prev, userData: true }));
        const userRes = await apiUserService.getUserById(user.userId, { signal: abortController.signal });
        if (userRes.statusCode === 200) {
          setData((prev) => ({ ...prev, userData: userRes.data }));
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          // Handle error silently
        }
      } finally {
        setLoading((prev) => ({ ...prev, userData: false }));
      }
    },
    [user, authToken]
  );

  const fetchProfile = useCallback(
    async (abortController) => {
      try {
        if (!user?.userId || !authToken) return;
        setLoading((prev) => ({ ...prev, profile: true }));
        const profileRes = await profileService.getLatestProfile(user.userId, { signal: abortController.signal });
        if (profileRes.statusCode === 200) {
          setData((prev) => ({ ...prev, profile: profileRes.data.profile }));
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          // Handle error silently
        }
      } finally {
        setLoading((prev) => ({ ...prev, profile: false }));
      }
    },
    [user, authToken]
  );

  const fetchBodyMeasurements = useCallback(
    async (abortController) => {
      try {
        if (!user?.userId || !authToken) return;
        setLoading((prev) => ({ ...prev, bodyMeasurements: true }));
        const measurementsRes = await bodyMeasurementService.getMyMeasurements(
          { pageNumber: 1, pageSize: 5 },
          { signal: abortController.signal }
        );
        if (measurementsRes.statusCode === 200) {
          setData((prev) => ({ ...prev, bodyMeasurements: measurementsRes.data.records || [] }));
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          // Handle error silently
        }
      } finally {
        setLoading((prev) => ({ ...prev, bodyMeasurements: false }));
      }
    },
    [user, authToken]
  );

  const fetchWeightHistory = useCallback(
    async (abortController) => {
      try {
        if (!user?.userId || !authToken) return;
        setLoading((prev) => ({ ...prev, weightHistory: true }));
        const weightRes = await weightHistoryService.getMyWeightHistory(
          { pageNumber: 1, pageSize: 5 },
          { signal: abortController.signal }
        );
        if (weightRes.statusCode === 200) {
          setData((prev) => ({ ...prev, weightHistory: weightRes.data.records || [] }));
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          // Handle error silently
        }
      } finally {
        setLoading((prev) => ({ ...prev, weightHistory: false }));
      }
    },
    [user, authToken]
  );

  const fetchAllData = useCallback(
    async (abortController) => {
      if (!authLoading && user?.userId && authToken) {
        await Promise.all([
          fetchUserData(abortController),
          fetchProfile(abortController),
          fetchBodyMeasurements(abortController),
          fetchWeightHistory(abortController),
        ]);
      }
    },
    [authLoading, user, authToken, navigation, fetchUserData, fetchProfile, fetchBodyMeasurements, fetchWeightHistory]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const abortController = new AbortController();
    fetchAllData(abortController).finally(() => setRefreshing(false));
    return () => abortController.abort();
  }, [fetchAllData]);

  useFocusEffect(
    useCallback(() => {
      const abortController = new AbortController();
      fetchAllData(abortController);
      return () => abortController.abort();
    }, [fetchAllData])
  );

  return { ...data, loading, refreshing, onRefresh };
};

const ProfileHeader = ({ userData, onEdit, onLayout, headerHeight, onAvatarPress, onTabPress }) => {
  const insets = useSafeAreaInsets();
  const userLevel = userData?.levelAccount || 1;
  const experience = userData?.experience || 0;
  const currentStreak = userData?.currentStreak || 0;
  const xpRequired = calculateXPRequired(userLevel);
  const progress = Math.min(100, (experience / xpRequired) * 100);
  // const insets = useSafeAreaInsets();

  const getStreakMessage = (streak) => {
    if (streak === 0) return "Start your journey!";
    if (streak === 1) return "1 day strong!";
    if (streak < 7) return `${streak} days strong!`;
    if (streak < 30) return `${streak} days - Amazing!`;
    if (streak < 100) return `${streak} days - Incredible!`;
    return `${streak} days - Legendary!`;
  };

  const getStreakEmoji = (streak) => {
    if (streak === 0) return "🌱";
    if (streak < 7) return "🔥";
    if (streak < 30) return "💪";
    if (streak < 100) return "🏆";
    return "👑";
  };

  const navigation = useRef(null);
  // Accept navigation as prop if not already
  if (!ProfileHeader.navigation && typeof globalThis.navigation !== 'undefined') {
    ProfileHeader.navigation = globalThis.navigation;
  }

  return (
    <View
      style={[
        styles.profileHeaderContainer,
        {
          height: headerHeight,
          paddingTop: insets.top + 10,
          backgroundColor: "#0056d2",
        },
      ]}
      onLayout={onLayout}
    >
      <View style={styles.profileHeader}>
        <View style={styles.profileHeaderContent}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {userData?.avatar ? (
                <TouchableOpacity onPress={onAvatarPress} activeOpacity={0.8}>
                  <Image source={{ uri: userData.avatar }} style={styles.profileAvatar} />
                </TouchableOpacity>
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : "U"}
                  </Text>
                </View>
              )}
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{userLevel}</Text>
              </View>
            </View>
          </View>

          {/* Profile Info Section */}
          <View style={styles.profileInfoSection}>
            <View style={styles.userInfoContainer}>
              <Text numberOfLines={1} style={styles.profileName}>
                {userData?.fullName || "User"}
              </Text>
              <Text numberOfLines={1} style={styles.profileEmail}>
                {userData?.email || "N/A"}
              </Text>
            </View>

            {/* XP Progress */}
            <View style={styles.xpContainer}>
              <View style={styles.xpHeader}>
                <Text style={styles.xpText}>
                  {experience}/{xpRequired} XP
                </Text>
                <Text style={styles.levelIndicator}>Level {userLevel}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
              </View>
            </View>

            {/* Streak Display */}
            <View style={styles.streakContainer}>
              <Text style={styles.streakEmoji}>{getStreakEmoji(currentStreak)}</Text>
              <Text style={styles.streakText}>{getStreakMessage(currentStreak)}</Text>
            </View>
          </View>

          {/* Edit Button */}
          <View style={styles.actionSection}>
            <TouchableOpacity onPress={onEdit} style={styles.editButton} activeOpacity={0.7}>
              <Ionicons name="pencil" size={16} color="#0056d2" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Tabs */}
        <View style={[styles.tabsContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 }]}> 
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Ionicons name="person" size={18} color="#FFFFFF" />
            <Text style={styles.activeTabText}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={onTabPress ? () => onTabPress('LeaderboardScreen') : undefined}
            disabled={!onTabPress}
          >
            <Ionicons name="trophy-outline" size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.tabText}>Leaderboard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={onTabPress ? () => onTabPress('WeeklyProgressScreen') : undefined}
            disabled={!onTabPress}
          >
            <Ionicons name="analytics-outline" size={18} color="rgba(255,255,255,0.6)" />
            <Text style={styles.tabText}>Progress</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const HealthSummaryCard = ({ profile, latestWeight, latestMeasurement, navigation, loading }) => {
  const bmi = useMemo(() => {
    if (profile?.height && profile?.weight) {
      const heightInMeters = profile.height / 100;
      return (profile.weight / (heightInMeters * heightInMeters)).toFixed(1);
    }
    return null;
  }, [profile]);

  const getBmiCategory = (bmiValue) => {
    if (!bmiValue) return { text: "N/A", color: "#64748B" };
    const value = Number.parseFloat(bmiValue);
    if (value < 18.5) return { text: "Underweight", color: "#FBBF24" };
    if (value < 25) return { text: "Normal", color: "#10B981" };
    if (value < 30) return { text: "Overweight", color: "#F59E0B" };
    return { text: "Obese", color: "#EF4444" };
  };

  const bmiCategory = getBmiCategory(bmi);

  const handleEditProfileMetric = () => {
    navigation.navigate("EditProfile", { profile });
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <View style={styles.healthSummaryCard}>
      <View style={styles.healthSummaryHeader}>
        <Text style={styles.healthSummaryTitle}>Health Summary</Text>
        <TouchableOpacity
          onPress={handleEditProfileMetric}
          style={[styles.editMetricButton, { backgroundColor: "#E6F0FA", flexDirection: "row", alignItems: "center" }]}
        >
          <Ionicons name="pencil" size={16} color="#0056d2" />
          <Text style={[styles.editMetricText, { color: "#0056d2", marginLeft: 4 }]}>Edit</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.lastUpdatedContainer}>
        <Ionicons name="time-outline" size={14} color="#64748B" />
        <Text style={styles.lastUpdatedText}>
          Updated {profile ? new Date(profile?.updatedAt).toLocaleDateString() : "N/A"}
        </Text>
      </View>
      <View style={styles.healthMetricsGrid}>
        <View style={styles.healthMetricItem}>
          <View style={[styles.metricIconContainer, { backgroundColor: "#EEF2FF" }]}>
            <Ionicons name="resize-outline" size={20} color="#0056d2" />
          </View>
          <Text style={styles.metricLabel}>Height</Text>
          <Text style={styles.metricValue}>{profile?.height ? `${profile.height} cm` : "N/A"}</Text>
        </View>
        <View style={styles.healthMetricItem}>
          <View style={[styles.metricIconContainer, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="scale-outline" size={20} color="#10B981" />
          </View>
          <Text style={styles.metricLabel}>Weight</Text>
          <Text style={styles.metricValue}>
            {latestWeight ? `${latestWeight.weight} kg` : profile?.weight ? `${profile.weight} kg` : "N/A"}
          </Text>
        </View>
        <View style={styles.healthMetricItem}>
          <View style={[styles.metricIconContainer, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="analytics-outline" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.metricLabel}>BMI</Text>
          <View style={styles.bmiContainer}>
            <Text style={styles.metricValue}>{bmi || "N/A"}</Text>
            {bmi && (
              <View style={[styles.bmiCategoryBadge, { backgroundColor: `${bmiCategory.color}20` }]}>
                <Text style={[styles.bmiCategoryText, { color: bmiCategory.color }]}>{bmiCategory.text}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.healthMetricItem}>
          <View style={[styles.metricIconContainer, { backgroundColor: "#FEF2F2" }]}>
            <Ionicons name="water-outline" size={20} color="#EF4444" />
          </View>
          <Text style={styles.metricLabel}>Body Fat</Text>
          <Text style={styles.metricValue}>
            {profile?.bodyFatPercentage
              ? `${profile.bodyFatPercentage}%`
              : latestMeasurement?.bodyFatPercentage
              ? `${latestMeasurement.bodyFatPercentage}%`
              : "N/A"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const SectionCard = ({ title, onAction, actionIcon, actionText, children, loading }) => {
  if (loading) {
    return (
      <View style={styles.sectionCard}>
        <View style={styles.skeletonCard} />
      </View>
    );
  }

  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onAction && (
          <TouchableOpacity onPress={onAction} style={[styles.actionButton, { backgroundColor: "#E6F0FA" }]}>
            {actionText ? (
              <Text style={[styles.actionButtonText, { color: "#0056d2" }]}>{actionText}</Text>
            ) : (
              <Ionicons name={actionIcon} size={18} color="#0056d2" />
            )}
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
};

const BodyMeasurementItem = ({ item }) => {
  const fields = [
    { key: "weight", label: "Weight", unit: "kg" },
    { key: "height", label: "Height", unit: "cm" },
    { key: "bodyFatPercentage", label: "Body Fat", unit: "%" },
    { key: "neckCm", label: "Neck", unit: "cm" },
    { key: "chestCm", label: "Chest", unit: "cm" },
    { key: "bicepCm", label: "Bicep", unit: "cm" },
    { key: "waistCm", label: "Waist", unit: "cm" },
    { key: "hipCm", label: "Hip", unit: "cm" },
    { key: "thighCm", label: "Thigh", unit: "cm" },
  ];

  return (
    <View style={styles.measurementItem}>
      <View style={styles.measurementHeader}>
        <View style={[styles.measurementDateContainer, { backgroundColor: "#E6F0FA" }]}>
          <Ionicons name="calendar-outline" size={16} color="#0056d2" />
          <Text style={[styles.measurementHeaderDate, { color: "#0056d2" }]}>
            {new Date(item.measurementDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
      </View>
      <View style={styles.measurementGrid}>
        {fields.map(
          ({ key, label, unit }) =>
            item[key] != null && (
              <View key={key} style={styles.measurementField}>
                <Text style={styles.measurementLabel}>{label}</Text>
                <Text style={styles.measurementValue}>
                  {item[key]}
                  {unit}
                </Text>
              </View>
            )
        )}
      </View>
    </View>
  );
};

const WeightHistoryItem = ({ item, previousWeight }) => {
  const weightChange = previousWeight ? (item.weight - previousWeight).toFixed(1) : null;
  const isGain = weightChange > 0;

  return (
    <View style={styles.weightHistoryItem}>
      <View style={styles.weightHistoryContent}>
        <View style={styles.weightIconContainer}>
          <Ionicons name="scale-outline" size={22} color="#0056d2" />
        </View>
        <View style={styles.weightInfoContainer}>
          <Text style={styles.weightHistoryText}>{item.weight} kg</Text>
          {weightChange && (
            <View style={[styles.weightChangeBadge, { backgroundColor: isGain ? "#FEF2F2" : "#F0FDF4" }]}>
              <Ionicons name={isGain ? "arrow-up" : "arrow-down"} size={12} color={isGain ? "#EF4444" : "#10B981"} />
              <Text style={[styles.weightChangeText, { color: isGain ? "#EF4444" : "#10B981" }]}>
                {Math.abs(weightChange)} kg
              </Text>
            </View>
          )}
          <View
            style={[
              styles.weightDateContainer,
              {
                backgroundColor: "#E6F0FA",
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 4,
                flexDirection: "row",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={14} color="#0056d2" />
            <Text style={[styles.weightHistoryDate, { color: "#0056d2", marginLeft: 4 }]}>
              {new Date(item.recordedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const HealthGoalsCard = ({ profile, navigation, loading }) => {
  const goals = [
    {
      id: "1",
      title: "Weight Goal",
      current: profile?.weight || 0,
      target: profile?.weightGoal || 0,
      unit: "kg",
      icon: "scale-outline",
      color: "#3B82F6",
      progress:
        profile?.weight && profile?.weightGoal
          ? Math.min(100, Math.max(0, (profile.weight / profile.weightGoal) * 100))
          : 0,
    },
    {
      id: "2",
      title: "Body Fat Goal",
      current: profile?.bodyFatPercentage || 0,
      target: profile?.bodyFatGoal || 0,
      unit: "%",
      icon: "water-outline",
      color: "#EF4444",
      progress:
        profile?.bodyFatPercentage && profile?.bodyFatGoal
          ? Math.min(100, Math.max(0, (profile.bodyFatPercentage / profile.bodyFatGoal) * 100))
          : 0,
    },
  ];

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <View style={styles.goalsCard}>
      <View style={styles.goalsHeader}>
        <Text style={styles.goalsTitle}>Health Goals</Text>
        <TouchableOpacity
          style={[styles.goalsEditButton, { backgroundColor: "#E6F0FA", flexDirection: "row", alignItems: "center" }]}
          onPress={() => navigation.navigate("EditProfile", { profile })}
        >
          <Ionicons name="pencil" size={16} color="#0056d2" />
          <Text style={[styles.goalsEditText, { color: "#0056d2", marginLeft: 4 }]}>Edit</Text>
        </TouchableOpacity>
      </View>
      {goals.map((goal) => (
        <View key={goal.id} style={styles.goalItem}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleContainer}>
              <Ionicons name={goal.icon} size={18} color="#0056d2" />
              <Text style={styles.goalTitle}>{goal.title}</Text>
            </View>
            <Text style={styles.goalProgress}>
              {goal.current} / {goal.target} {goal.unit}
            </Text>
          </View>
          <View style={styles.goalProgressBar}>
            <View style={[styles.goalProgressFill, { width: `${goal.progress}%`, backgroundColor: "#0056d2" }]} />
          </View>
        </View>
      ))}
    </View>
  );
};

const SkeletonLoader = () => (
  <View style={styles.loadingContainer}>
    <View style={styles.skeletonCard} />
  </View>
);

export default function ProfileScreen({ navigation }) {
  const { user, authToken, authLoading } = useAuth();
  const checkInModalRef = useRef(null);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  const handleOpenCheckIn = () => {
    if (checkInModalRef.current) {
      checkInModalRef.current.show();
    }
  };

  const { userData, profile, bodyMeasurements, weightHistory, loading, refreshing, onRefresh } = useProfileData(
    user,
    authToken,
    authLoading,
    navigation
  );

  const [headerHeight, setHeaderHeight] = useState(200);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const insets = useSafeAreaInsets();

  const handleEditProfile = () => navigation.navigate("EditUserScreen", { user: userData });
  const handleEditBody = () => navigation.navigate("EditProfile", { profile });
  const handleAddBodyMeasurement = () => navigation.navigate("AddBodyMeasurement");
  const handleAddWeightHistory = () => navigation.navigate("AddWeightHistory");
  const handleChangePassword = () => navigation.navigate("ChangePassword");

  // Tab navigation handlers
  const handleTabPress = (tab) => {
    if (tab === 'LeaderboardScreen') {
      navigation.navigate('LeaderboardScreen');
    } else if (tab === 'WeeklyProgressScreen') {
      navigation.navigate('WeeklyProgressScreen');
    }
  };

  const handleReset = () => {
    // Custom confirm dialog using toast (no Alert)
    // You may want to implement a custom modal for confirmation in the future
    showErrorFetchAPI("Reset confirmation is not implemented. Please use a custom modal if needed.");
    // Example for actual reset logic (uncomment and use a custom modal for confirmation):
    // try {
    //   await apiUserService.resetProgress(user.userId);
    //   showSuccessMessage("Your progress has been reset!");
    //   onRefresh();
    // } catch (error) {
    //   showErrorFetchAPI("Failed to reset progress. Please try again.");
    // }
  };

  useEffect(() => {
    const checkCheckInStatus = async () => {
      try {
        const lastDate = await AsyncStorage.getItem("lastCheckInDate");
        const today = new Date().toISOString().split("T")[0];
        setHasCheckedIn(lastDate === today);
      } catch (err) {}
    };
    checkCheckInStatus();
  }, []);

  const latestMeasurement = useMemo(() => {
    if (bodyMeasurements.length === 0) return null;
    return bodyMeasurements.reduce((latest, current) =>
      new Date(current.measurementDate).getTime() > new Date(latest.measurementDate).getTime() ? current : latest
    );
  }, [bodyMeasurements]);

  const latestWeight = useMemo(() => {
    if (weightHistory.length === 0) return null;
    return weightHistory.reduce((latest, current) =>
      new Date(current.recordedAt).getTime() > new Date(latest.recordedAt).getTime() ? current : latest
    );
  }, [weightHistory]);

  const previousWeight = useMemo(() => {
    if (weightHistory.length <= 1) return null;
    const sortedWeights = [...weightHistory].sort(
      (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
    );
    return sortedWeights[1]?.weight || null;
  }, [weightHistory]);

  const handleHeaderLayout = (event) => {
    // const { height } = event.nativeEvent.layout;
    // setHeaderHeight(height);
  };

  const handleAvatarPress = () => {
    if (userData?.avatar) {
      setShowImageViewer(true);
    }
  };

  useEffect(() => {}, [headerHeight]);

  // Show loading overlay if any main data is loading
  if (loading.userData || loading.profile || loading.bodyMeasurements || loading.weightHistory) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <ProfileHeader
        userData={userData}
        onEdit={handleEditProfile}
        onLayout={handleHeaderLayout}
        headerHeight={headerHeight}
        onAvatarPress={handleAvatarPress}
        onCheckIn={handleOpenCheckIn}
        onReset={handleReset}
        hasCheckedIn={hasCheckedIn}
        setHasCheckedIn={setHasCheckedIn}
        onTabPress={handleTabPress}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight || insets.top + 200 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} />}
      >
        <HealthSummaryCard
          profile={profile}
          navigation={navigation}
          latestWeight={latestWeight}
          latestMeasurement={latestMeasurement}
          loading={false}
          primaryColor="#0056d2"
        />
        <HealthGoalsCard profile={profile} navigation={navigation} loading={false} />
        <View style={styles.goalsCard}>
          <View style={styles.goalsHeader}>
            <Text style={styles.goalsTitle}>Body Metrics</Text>
            <TouchableOpacity
              style={[
                styles.goalsEditButton,
                { backgroundColor: "#E6F0FA", flexDirection: "row", alignItems: "center" },
              ]}
              onPress={handleEditBody}
            >
              <Ionicons name="pencil" size={16} color="#0056d2" />
              <Text style={[styles.goalsEditText, { color: "#0056d2", marginLeft: 4 }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.metricsGrid}>
            <View style={styles.metricRow}>
              <Text style={styles.metricRowLabel}>Activity Level</Text>
              <Text style={styles.metricRowValue}>{profile?.activityLevel || "Not set"}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricRowLabel}>Dietary Preference</Text>
              <Text style={styles.metricRowValue}>{profile?.dietaryPreference || "Not set"}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricRowLabel}>Fitness Goal</Text>
              <Text style={styles.metricRowValue}>{profile?.fitnessGoal || "Not set"}</Text>
            </View>
          </View>
        </View>
        <SectionCard
          title="Latest Body Measurement"
          onAction={handleAddBodyMeasurement}
          actionIcon="add"
          loading={false}
        >
          {latestMeasurement ? (
            <BodyMeasurementItem item={latestMeasurement} />
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="body-outline" size={40} color="#CBD5E1" />
              <Text style={styles.noDataText}>No body measurements available.</Text>
              <TouchableOpacity
                style={[styles.addFirstButton, { backgroundColor: "#E6F0FA" }]}
                onPress={handleAddBodyMeasurement}
              >
                <Text style={[styles.addFirstButtonText, { color: "#0056d2" }]}>Add Your First Measurement</Text>
              </TouchableOpacity>
            </View>
          )}
          {latestMeasurement && (
            <TouchableOpacity onPress={() => navigation.navigate("BodyMeasurements")} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Measurements</Text>
              <Ionicons name="chevron-forward" size={16} color="#0056d2" />
            </TouchableOpacity>
          )}
        </SectionCard>
        <SectionCard
          title="Latest Weight"
          onAction={handleAddWeightHistory}
          actionIcon="add"
          loading={false}
        >
          {latestWeight ? (
            <WeightHistoryItem item={latestWeight} previousWeight={previousWeight} />
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="scale-outline" size={40} color="#CBD5E1" />
              <Text style={styles.noDataText}>No weight history available.</Text>
              <TouchableOpacity
                style={[styles.addFirstButton, { backgroundColor: "#E6F0FA" }]}
                onPress={handleAddWeightHistory}
              >
                <Text style={[styles.addFirstButtonText, { color: "#0056d2" }]}>Add Your First Weight</Text>
              </TouchableOpacity>
            </View>
          )}
          {latestWeight && (
            <TouchableOpacity onPress={() => navigation.navigate("WeightHistory")} style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All Weight History</Text>
              <Ionicons name="chevron-forward" size={16} color="#0056d2" />
            </TouchableOpacity>
          )}
        </SectionCard>
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity onPress={handleChangePassword} style={styles.changePasswordButton}>
            <Ionicons name="lock-closed-outline" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("HealthConsultationScreen")} style={styles.insightsButton}>
            <Ionicons name="bulb-outline" size={18} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.actionButtonText}>Health Insights</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>
      {userData?.avatar && (
        <ImageZoomViewer
          visible={showImageViewer}
          imageUri={userData.avatar}
          onClose={() => setShowImageViewer(false)}
          showDeleteButton={false}
        />
      )}
      <FloatingMenuButton
        initialPosition={{ x: width - 70, y: screenHeight - 150 }}
        autoHide={true}
        navigation={navigation}
        autoHideDelay={4000}
      />
      <CheckInModal ref={checkInModalRef} setHasCheckedIn={setHasCheckedIn} />
    </SafeAreaView>
  );
}

// Zoom Viewer Styles
const zoomStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  imageWrapper: {
    width: width,
    height: screenHeight * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  imageTouchable: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: width - 40,
    height: width - 40,
    borderRadius: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  zoomInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  zoomText: {
    fontSize: 14,
    color: "#FFFFFF",
    marginLeft: 8,
    opacity: 0.8,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingBottom: 0,
  },
  profileHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "#0056d2",
  },
  profileHeader: {
    flex: 1,
    paddingBottom: 8,
  },
  profileHeaderContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 2,
    minHeight: 90,
  },
  avatarSection: {
    marginRight: 14,
    justifyContent: "flex-start",
  },
  avatarContainer: {
    position: "relative",
  },
  profileAvatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarFallback: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 2.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  levelBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  profileInfoSection: {
    flex: 1,
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  userInfoContainer: {
    marginBottom: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 1,
  },
  profileEmail: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  xpContainer: {
    marginBottom: 6,
  },
  xpHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  xpText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
  },
  levelIndicator: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  progressBarContainer: {
    width: "100%",
  },
  progressBar: {
    height: 3,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 1.5,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 1.5,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
    maxWidth: "90%",
  },
  streakEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  streakText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "600",
    flexShrink: 1,
  },
  actionSection: {
    justifyContent: "flex-start",
    paddingTop: 2,
    marginLeft: 8,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabsContainer: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
    marginTop: 4,
    minHeight: 56,
    backgroundColor: "#0056d2",
    alignItems: "center",
    paddingBottom: 0,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
    paddingVertical: 0,
    paddingBottom: 0,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#FFFFFF",
  },
  tabText: {
    color: "rgba(255, 255, 255, 0.6)",
    marginLeft: 4,
    fontSize: 15,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#FFFFFF",
    marginLeft: 4,
    fontSize: 15,
    fontWeight: "600",
  },
  healthSummaryCard: {
    marginHorizontal: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    padding: 16,
    zIndex: 10,
  },
  healthSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  healthSummaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  lastUpdatedContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "#64748B",
    marginLeft: 4,
  },
  healthMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  healthMetricItem: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  metricIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  bmiContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editMetricButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E6F0FA",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  editMetricText: {
    fontSize: 14,
    color: "#0056d2",
    marginLeft: 4,
    fontWeight: "600",
  },
  bmiCategoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  bmiCategoryText: {
    fontSize: 10,
    fontWeight: "600",
  },
  goalsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    padding: 16,
  },
  goalsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  goalsEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    backgroundColor: "#E6F0FA",
  },
  goalsEditText: {
    fontSize: 14,
    color: "#0056d2",
    fontWeight: "600",
  },
  goalItem: {
    marginBottom: 16,
  },
  goalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  goalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
    marginLeft: 6,
  },
  goalProgress: {
    fontSize: 14,
    color: "#64748B",
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
  },
  sectionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#0F172A",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#E6F0FA",
    justifyContent: "center",
    alignItems: "center",
  },
  actionButtonText: {
    fontSize: 12,
    color: "#0056d2",
    fontWeight: "600",
  },
  cardContent: {
    padding: 16,
  },
  metricsGrid: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    overflow: "hidden",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  metricRowLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  metricRowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  measurementItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
  },
  measurementHeader: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 12,
  },
  measurementDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  measurementHeaderDate: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
    marginLeft: 4,
  },
  measurementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  measurementField: {
    width: "48%",
    marginBottom: 12,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  measurementLabel: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  weightHistoryItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
  },
  weightHistoryContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  weightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  weightInfoContainer: {
    flex: 1,
  },
  weightHistoryText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  weightChangeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  weightChangeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 2,
  },
  weightDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  weightHistoryDate: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 4,
  },
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  noDataText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  addFirstButton: {
    backgroundColor: "#E6F0FA",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addFirstButtonText: {
    fontSize: 14,
    color: "#0056d2",
    fontWeight: "600",
  },
  viewAllButton: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 15,
    color: "#0056d2",
    fontWeight: "600",
    marginRight: 4,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    gap: 12,
  },
  changePasswordButton: {
    flex: 1,
    backgroundColor: "#0056d2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#0056d2",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  insightsButton: {
    flex: 1,
    backgroundColor: "#10B981",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: "#10B981",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  actionButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  bottomPadding: {
    height: 80,
  },
  loadingContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    padding: 16,
    height: 100,
  },
  skeletonCard: {
    width: "100%",
    height: 80,
    backgroundColor: "#E2E8F0",
    borderRadius: 16,
  },
});