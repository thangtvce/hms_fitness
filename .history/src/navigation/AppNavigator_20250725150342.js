import ProfileSteps from 'screens/register/ProfileSteps';
import ProgressComparisonDetailScreen from 'screens/progresscomparision/ProgressComparisonDetailScreen';
import ActiveStaticsScreen from 'screens/home/ActiveStaticsScreen';
import CaloriesLogStatisticsScreen from 'screens/food/CaloriesLogStatisticsScreen';
import WorkoutInProgressScreen from 'screens/workout/WorkoutInProgressScreen';
import ExercisesByCategoryScreen from 'screens/workout/ExercisesByCategoryScreen';
import NutrientLogStatisticsScreen from 'screens/food/NutrientLogStatisticsScreen';
import React,{ useEffect,useRef,useState } from 'react';

// Trainer Workout Screens
import TrainerExerciseManagement from 'screens/trainer/exercise/TrainerExerciseManagement';
import ExerciseDetailScreen from 'screens/trainer/exercise/ExerciseDetailScreen';
import StreakCalendarScreen from 'screens/streak/StreakCalendarScreen';
import EditExerciseScreen from 'screens/trainer/exercise/EditExerciseScreen';
import DeleteExerciseScreen from 'screens/trainer/exercise/DeleteExerciseScreen';
import CreateExerciseScreen from 'screens/trainer/exercise/CreateExerciseScreen';
import { NavigationContainer,useNavigation } from '@react-navigation/native'

// Trainer Service Screens
import TrainerServiceManagement from 'screens/trainer/service/TrainerServiceManagement';
import TrainerPackageDetailScreen from 'screens/trainer/service/TrainerPackageDetailScreen';
import EditServicePackageScreen from 'screens/trainer/service/EditServicePackageScreen';
import CreateServicePackageScreen from 'screens/trainer/service/CreateServicePackageScreen';
import AppIntroScreen from 'screens/AppIntroScreen';
import { createStackNavigator } from '@react-navigation/stack';
import { View,ActivityIndicator } from 'react-native';
import { AuthProvider,useAuth } from 'context/AuthContext';
import LoginScreen from 'screens/login/LoginScreen';
import RegisterScreen from 'screens/register/RegisterScreen';
import BottomTabNavigator from 'navigation/BottomTabNavigator';
import OtpScreen from 'screens/forgetpassword/OtpScreen';
import ForgetPassword from 'screens/forgetpassword/ForgetPassword';
import SettingsScreen from 'screens/setting/SettingsScreen';
import ThemeSettingsScreen from 'screens/setting/ThemeSettingsScreen';
import ProfileScreen from 'screens/profile/ProfileScreen';
import EditProfileScreen from 'screens/profile/EditProfileScreen';
import AddBodyMeasurementScreen from 'screens/profile/bodymeasurement/AddBodyMeasurementScreen';
import AddWeightHistoryScreen from 'screens/profile/weight/AddWeightHistoryScreen';
import ChangePasswordScreen from 'screens/profile/ChangePasswordScreen';
import BodyMeasurementsScreen from 'screens/profile/bodymeasurement/BodyMeasurementsScreen';
import WeightHistoryScreen from 'screens/profile/weight/WeightHistoryScreen';
import WeightAnalystScreen from 'screens/profile/weight/WeightAnalystScreen';
import EditUserScreen from 'screens/profile/EditUserScreen';
import EditWeightScreen from 'screens/profile/weight/EditWeightScreen';
import FoodListScreen from 'screens/food/FoodListScreen';
import FoodDetailsScreen from 'screens/food/FoodDetailsScreen';
import AddFoodScreen from 'screens/food/AddFoodScreen';
import AddMealScreen from 'screens/food/AddMealScreen';
import WorkoutListScreen from 'screens/workout/WorkoutListScreen';
import CategoryDetailsScreen from 'screens/workout/CategoryDetailsScreen';
import ExerciseDetailsScreen from 'screens/workout/ExerciseDetailsScreen';
import NotificationScreen from 'screens/notification/NotificationScreen';
import StepCounterScreen from 'screens/stepcounter/StepCounterScreen';
import FoodScannerScreen from 'screens/food/FoodScannerScreen';
import ServicePackageScreen from 'screens/servicePackage/ServicePackageScreen';
import PackageDetailScreen from 'screens/servicePackage/PackageDetailScreen';
import PaymentScreen from 'screens/servicePackage/PaymentScreen';
import QRPaymentScreen from 'screens/payment/QRPaymentScreen';
import PaymentSuccessScreen from 'screens/servicePackage/PaymentSuccessScreen';
import PaymentCancelledScreen from 'screens/servicePackage/PaymentCancelledScreen';
import MySubscriptionScreen from 'screens/subscription/MySubscriptionScreen';
import SubscriptionDetailScreen from 'screens/subscription/SubscriptionDetailScreen';
import ActiveGroupsScreen from 'screens/community/ActiveGroupsScreen';
import GroupDetailsScreen from 'screens/community/GroupDetailsScreen';
import CreatePostScreen from 'screens/community/CreatePostScreen';
import EditPostScreen from 'screens/community/EditPostScreen';
import PostDetailScreen from 'screens/community/PostDetailScreen';
import EditBodyMeasurementScreen from 'screens/profile/bodymeasurement/EditBodyMeasurementScreen';
import LeaderboardScreen from 'screens/leaderboard/LeaderboardScreen';
import SavedPackagesScreen from 'screens/servicePackage/SavedPackagesScreen';
import FavoriteFoodsScreen from 'screens/food/FavoriteFoodsScreen';
import WorkoutFavoriteScreen from 'screens/workout/WorkoutFavoriteScreen';
import UserWaterLogScreen from 'screens/userWaterLog/UserWaterLogScreen';
import SetWaterTargetScreen from 'screens/userWaterLog/SetWaterTargetScreen';
import WaterComparisonScreen from 'screens/userWaterLog/WaterComparisonScreen';
import AddWaterLogScreen from 'screens/userWaterLog/AddWaterLogScreen';
import EditWaterLogScreen from 'screens/userWaterLog/EditWaterLogScreen';
import WaterLogAnalyticsScreen from 'screens/userWaterLog/WaterLogAnalyticsScreen';
import UserPostsScreen from 'screens/community/UserPostsScreen';
import MyReportsScreen from 'screens/community/MyReportsScreen';
import FoodDailyLogScreen from 'screens/food/FoodDailyLogScreen';
import FoodLogHistoryScreen from 'screens/food/FoodLogHistoryScreen';
import TopFoodsByMealScreen from 'screens/food/TopFoodsByMealScreen';
import ExportHistoryScreen from 'screens/food/ExportHistoryScreen';
import TrendsScreen from 'screens/food/TrendsScreen';
import DayDetailsScreen from 'screens/food/DayDetailsScreen';
import WorkoutHistoryScreen from 'screens/workout/WorkoutHistoryScreen';
import WorkoutSessionScreen from 'screens/workout/WorkoutSessionScreen';
import HealthConsultationScreen from 'screens/healthconsultation/HealthConsultationScreen';
import CalendarScreen from 'screens/food/CalendarScreen';
import NutritionDetailsScreen from 'screens/home/NutritionDetailsScreen';
import WorkoutPlanListScreen from 'screens/workout/WorkoutPlanListScreen';
import WorkoutPlanExercisesScreen from 'screens/workout/WorkoutPlanExercisesScreen';
import WorkoutPlanExercisesDetailScreen from 'screens/workout/WorkoutPlanExercisesDetailScreen';
import HealthLogOverviewScreen from 'screens/healthlog/HealthLogOverviewScreen';
import HealthLogListScreen from 'screens/healthlog/HealthLogListScreen';
import HealthLogCreateScreen from 'screens/healthlog/HealthLogCreateScreen';
import HealthLogEditScreen from 'screens/healthlog/HealthLogEditScreen';
import RateTrainerScreen from 'screens/workout/RateTrainerScreen';
import WorkoutPlanExerciseSessionScreen from 'screens/workout/WorkoutPlanExerciseSessionScreen';
import WorkoutSessionActiveScreen from 'screens/workout/WorkoutSessionActiveScreen';
import CreateGroupScreen from 'screens/community/CreateGroupScreen';
import EditGroupScreen from 'screens/community/EditGroupScreen';
import MyGroupDetailScreen from 'screens/community/MyGroupDetailScreen';
import MyGroupsScreen from 'screens/community/MyGroupsScreen';
import PendingMembersScreen from 'screens/community/PendingMembersScreen';
import ActiveMembersScreen from 'screens/community/ActiveMembersScreen';
import NutritionTargetScreen from 'screens/home/NutritionTargetScreen';
import NutritionTargetHistoryScreen from 'screens/home/NutritionTargetHistoryScreen';
import HomeScreen from 'screens/home/HomeScreen';
import { TicketListScreen, CreateTicketScreen, TicketDetailScreen } from 'screens/ticket';
import { registerForPushNotificationsAsync } from 'utils/notification';
import * as Notifications from 'expo-notifications';
import AddReminderPlanScreen from 'screens/reminder/AddReminderPlanScreen';
import ReminderPlanListScreen from 'screens/reminder/ReminderPlanListScreen';
import ReminderPlanDetailScreen from 'screens/reminder/ReminderPlanDetailScreen';
import EditReminderPlanScreen from 'screens/reminder/EditReminderPlanScreen';

import TrainerDashboard from 'screens/trainer/TrainerDashboard';
import TrainerDetailScreen from 'screens/trainer/TrainerDetailScreen';
import TrainerApplicationScreen from 'screens/trainer/TrainerApplicationScreen';
import TrainerApplicationListScreen from 'screens/trainer/TrainerApplicationListScreen';
import TrainerPayoutManagement from 'screens/trainer/payout/TrainerPayoutManagement';
import TrainerPayoutDetailScreen from 'screens/trainer/payout/TrainerPayoutDetailScreen';
import TrainerPayoutStatisticsScreen from 'screens/trainer/payout/TrainerPayoutStatisticsScreen';
import TrainerRatingDetailScreen from 'screens/trainer/rating/TrainerRatingDetailScreen';
import TrainerRatingStatisticsScreen from 'screens/trainer/rating/TrainerRatingStatisticsScreen';
import TrainerSubscriptionManagement from 'screens/trainer/subscription/TrainerSubscriptionManagement';
import TrainerSubscriptionStatisticsScreen from 'screens/trainer/subscription/TrainerSubscriptionStatisticsScreen';
import TrainerSubscriptionDetailScreen from 'screens/trainer/subscription/TrainerSubscriptionDetailScreen';
import TrainerWorkoutPlanManagement from 'screens/trainer/workoutPlan/TrainerWorkoutPlanManagement';
import UserList from 'screens/trainer/user/UserList';
import TrainerUserManagementScreen from 'screens/trainer/user/TrainerUserManagementScreen';
import TraineeDetailScreen from 'screens/trainer/user/TraineeDetailScreen';
import AddWorkoutPlanScreen from 'screens/trainer/workoutPlan/AddWorkoutPlanScreen';
import EditWorkoutPlanScreen from 'screens/trainer/workoutPlan/EditWorkoutPlanScreen';
import TrainerWorkoutPlanStatisticsScreen from 'screens/trainer/workoutPlan/TrainerWorkoutPlanStatisticsScreen';
import AIRecommendedScreen from 'screens/workout/AIRecommendedScreen';
import AIRecommendedFoodScreen from 'screens/food/AIRecommendedFoodScreen';
import UserGoalPlansScreen from 'screens/profile/UserGoalPlansScreen';
import WeeklyProgressScreen from 'screens/home/WeeklyProgressScreen';
import AnalysisScreen from 'screens/home/AnalysisScreen';

import BanMembersScreen from 'screens/community/BanMembersScreen';
import AddExerciseToPlanScreen from 'screens/trainer/exercisePlan/AddExerciseToPlanScreen';
import EditExerciseToPlanScreen from 'screens/trainer/exercisePlan/EditExerciseToPlanScreen';
import ProgressComparisonScreen from 'screens/progresscomparision/ProgressComparisonScreen';
import EditProgressComparisonScreen from 'screens/progresscomparision/EditProgressComparisonScreen';
import VideoCallSupport from 'screens/chatsupport/VideoCallSupport';
import IncomingCallNotification from 'components/calling/IncomingCallNotification';
import IncomingCallScreen from 'screens/chatsupport/IncomingCallScreen';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});


const Stack = createStackNavigator();

import AsyncStorage from '@react-native-async-storage/async-storage';
function RootNavigator() {
const { user,loading: authLoading } = useAuth();
  const notificationListener = useRef();
  const responseListener = useRef();
  const [incomingCall,setIncomingCall] = useState(null);
  const navigation = useNavigation();
  const [acceptedCallRoomId,setAcceptedCallRoomId] = useState(null);


  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      console.log('🔔 Nhận được thông báo:',data);

      if (data.type === 'call-incoming' && data.roomId) {
        setIncomingCall({
          roomId: data.roomId,
          callerName: data.callerName || 'Người gọi không xác định',
        });
      }
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const type = data.type;

      switch (type) {
        case 'call-incoming':
          if (data.roomId) {
            navigation.navigate('IncomingCallScreen',{ roomId: data.roomId,callerName: data.callerId });
          }
          break;

        case 'subscription-review':
          if (data.subscriptionId) {
            navigation.navigate('SubscriptionNeedToReview',{ subscriptionId: data.subscriptionId });
          }
          break;
        case 'reminder':
          navigation.navigate("AnalysisScreen");
          break;
        case 'payment-update':
        case 'payment-reminder':
        case 'payment-canceled':
          navigation.navigate("MySubscriptionScreen");
          break;
        case 'group_join_success':
          if (data.groupId) {
            navigation.navigate("GroupDetails",{ groupId: data.groupId })
          }
          break;
        case 'group_join_request':
        case 'group_joined':
          if (data.groupId) {
            navigation.navigate("ActiveMembersScreen",{ groupId: data.groupId })

          }
          break;
        default:
          navigation.navigate("Notifications");
          break;
      }
    });


    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  },[]);

  useEffect(() => {
    if (user?.userId) {
      registerForPushNotificationsAsync(
        (token) => {
        },
        user.userId
      );
    }
  },[user]);

  useEffect(() => {
    if (acceptedCallRoomId) {
      navigation.navigate('VideoCallSupport',{ roomId: acceptedCallRoomId });
      setAcceptedCallRoomId(null);
    }
  },[acceptedCallRoomId,navigation]);
  const [profileCheck, setProfileCheck] = useState({ checked: false, needProfile: false, step: 0, formData: {} });

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        setProfileCheck({ checked: true, needProfile: false, step: 0, formData: {} });
        return;
      }
      // Kiểm tra trạng thái profile (hasProfile hoặc gọi API nếu cần)
      let hasProfile = false;
      if (user.hasProfile !== undefined) {
        hasProfile = user.hasProfile;
      } else if (user.isProfileCompleted !== undefined) {
        hasProfile = user.isProfileCompleted;
      } else {
        // Nếu không có trường này, luôn yêu cầu tạo profile (hoặc gọi API kiểm tra)
        hasProfile = false;
      }
      if (!hasProfile) {
        // Lấy step và formData từ AsyncStorage nếu có
        let savedStep = 0;
        let savedFormData = {};
        try {
          const formDataStr = await AsyncStorage.getItem("profileFormData");
          const stepStr = await AsyncStorage.getItem("profileCurrentStep");
          if (formDataStr) savedFormData = JSON.parse(formDataStr);
          if (stepStr && !isNaN(Number(stepStr))) savedStep = Number(stepStr);
        } catch (e) {}
        setProfileCheck({ checked: true, needProfile: true, step: savedStep, formData: savedFormData });
      } else {
        setProfileCheck({ checked: true, needProfile: false, step: 0, formData: {} });
      }
    };
    checkProfile();
  }, [user]);

  if (authLoading || !profileCheck.checked) {
    return (
      <View style={{ flex: 1,justifyContent: 'center',alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Nếu user đã login nhưng chưa hoàn thành profile, chỉ cho vào ProfileSteps
  if (user && profileCheck.needProfile) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ProfileSteps">
          {props => <ProfileSteps {...props} currentStep={profileCheck.step} formData={profileCheck.formData} />}
        </Stack.Screen>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      </Stack.Navigator>
    );
}

}

export default function AppNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}