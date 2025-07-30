import ProgressComparisonDetailScreen from 'screens/progresscomparision/ProgressComparisonDetailScreen';
import ActiveStaticsScreen from 'screens/home/ActiveStaticsScreen';
import CaloriesLogStatisticsScreen from 'screens/food/CaloriesLogStatisticsScreen';
import WorkoutInProgressScreen from 'screens/workout/WorkoutInProgressScreen';
import ExercisesByCategoryScreen from 'screens/workout/ExercisesByCategoryScreen';
import NutrientLogStatisticsScreen from 'screens/food/NutrientLogStatisticsScreen';

// Trainer Workout Screens
import TrainerExerciseManagement from 'screens/trainer/exercise/TrainerExerciseManagement';
import ExerciseDetailScreen from 'screens/trainer/exercise/ExerciseDetailScreen';
import StreakCalendarScreen from 'screens/streak/StreakCalendarScreen';
import EditExerciseScreen from 'screens/trainer/exercise/EditExerciseScreen';
import DeleteExerciseScreen from 'screens/trainer/exercise/DeleteExerciseScreen';
import CreateExerciseScreen from 'screens/trainer/exercise/CreateExerciseScreen';

// Trainer Service Screens
import TrainerServiceManagement from 'screens/trainer/service/TrainerServiceManagement';
import TrainerPackageDetailScreen from 'screens/trainer/service/TrainerPackageDetailScreen';
import EditServicePackageScreen from 'screens/trainer/service/EditServicePackageScreen';
import CreateServicePackageScreen from 'screens/trainer/service/CreateServicePackageScreen';
import React, { useEffect, useRef } from 'react';
import AppIntroScreen from 'screens/AppIntroScreen';
import { NavigationContainer } from '@react-navigation/native'
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

function RootNavigator() {
  const { user,loading: authLoading } = useAuth();
const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // ✅ Lắng nghe push notification khi app đang mở
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Nhận được thông báo:',notification);
      // Bạn có thể xử lý state hoặc UI nếu muốn
    });

    // ✅ Xử lý khi user nhấn vào notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📲 User nhấn vào thông báo:',response);
      // Có thể điều hướng tuỳ theo nội dung response.notification.request.content.data
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
  if (authLoading) {
    return (
      <View style={{ flex: 1,justifyContent: 'center',alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={user ? 'Main' : 'AppIntroScreen'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="AppIntroScreen" component={AppIntroScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
      <Stack.Screen name="Main" component={BottomTabNavigator} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="ThemeSettingsScreen" component={ThemeSettingsScreen} options={{ title: 'Cài đặt giao diện' }} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="ForgetPassword" component={ForgetPassword} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="AddBodyMeasurement" component={AddBodyMeasurementScreen} />
      <Stack.Screen name="AddWeightHistory" component={AddWeightHistoryScreen} />
      <Stack.Screen name="EditWeightScreen" component={EditWeightScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="BodyMeasurements" component={BodyMeasurementsScreen} />
      <Stack.Screen name="EditBodyMeasurement" component={EditBodyMeasurementScreen} />
      <Stack.Screen name="WeightHistory" component={WeightHistoryScreen} />
      <Stack.Screen name="WeightAnalystScreen" component={WeightAnalystScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditUserScreen" component={EditUserScreen} />
      <Stack.Screen name="EditWeight" component={EditWeightScreen} />
      <Stack.Screen name="Food" component={FoodListScreen} />
      <Stack.Screen name="FoodDetails" component={FoodDetailsScreen} />
    <Stack.Screen name="AddFoodScreen" component={AddFoodScreen} options={{ presentation: 'transparentModal', headerShown: false }} />
    <Stack.Screen name="AddMealScreen" component={AddMealScreen} options={{ presentation: 'transparentModal', headerShown: false }} />
      <Stack.Screen name="ActiveStaticsScreen" component={ActiveStaticsScreen} />
      <Stack.Screen name="WorkoutListScreen" component={WorkoutListScreen} options={{ title: 'Workout List' }} />
      <Stack.Screen name="CategoryDetails" component={CategoryDetailsScreen} />
      <Stack.Screen name="ExerciseDetails" component={ExerciseDetailsScreen} />
      <Stack.Screen name="ExerciseDetailsScreen" component={ExerciseDetailsScreen} options={{ title: 'Exercise Details' }} />
      <Stack.Screen name="ExercisesByCategoryScreen" component={ExercisesByCategoryScreen} options={{ title: 'Exercises By Category' }} />
      <Stack.Screen name="StreakCalendar" component={StreakCalendarScreen} options={{ headerShown: false }} />

    {/* Ticket System Screens */}
    <Stack.Screen name="TicketList" component={TicketListScreen} options={{ title: 'My Tickets' }} />
    <Stack.Screen name="CreateTicket" component={CreateTicketScreen} options={{ title: 'Create Ticket' }} />
    <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Ticket Detail' }} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="StepCounter" component={StepCounterScreen} />
      <Stack.Screen name="CaloriesLogStatisticsScreen" component={CaloriesLogStatisticsScreen} options={{ title: 'Thống kê calo theo ngày' }} />
      <Stack.Screen name="NutrientLogStatistics" component={NutrientLogStatisticsScreen} />
      <Stack.Screen name="FoodScannerScreen" component={FoodScannerScreen} />
      <Stack.Screen name="ServicePackage" component={ServicePackageScreen} />
      <Stack.Screen name="PackageDetail" component={PackageDetailScreen} />
      <Stack.Screen name="SavedPackagesScreen" component={SavedPackagesScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="QRPaymentScreen" component={QRPaymentScreen} options={{
        gestureEnabled: false,
        headerShown: false
      }} />
      <Stack.Screen name="PaymentSuccessScreen" component={PaymentSuccessScreen} options={{
        gestureEnabled: false,
        headerShown: false
      }} />
      <Stack.Screen name="PaymentCancelled" component={PaymentCancelledScreen} options={{
        gestureEnabled: false,
        headerShown: false
      }} />
      <Stack.Screen name="MySubscriptionScreen" component={MySubscriptionScreen} />
      <Stack.Screen name="SubscriptionDetail" component={SubscriptionDetailScreen} />
      <Stack.Screen name="ActiveGroups" component={ActiveGroupsScreen} />
      <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
      <Stack.Screen name="MyGroupDetailScreen" component={MyGroupDetailScreen} />
      <Stack.Screen name="CreateGroupScreen" component={CreateGroupScreen} />
      <Stack.Screen name="EditGroupScreen" component={EditGroupScreen} />
      <Stack.Screen name="CreatePostScreen" component={CreatePostScreen} />
      <Stack.Screen name="EditPostScreen" component={EditPostScreen} />
      <Stack.Screen name="PostDetailScreen" component={PostDetailScreen} />
      <Stack.Screen name="LeaderboardScreen" component={LeaderboardScreen} />
      <Stack.Screen name="FavoriteFoodScreen" component={FavoriteFoodsScreen} />
      <Stack.Screen name="WorkoutFavoriteScreen" component={WorkoutFavoriteScreen} />
      <Stack.Screen name="UserWaterLog" component={UserWaterLogScreen} />
      <Stack.Screen name="SetWaterTarget" component={SetWaterTargetScreen} options={{ title: 'Set Water Target' }} />
      <Stack.Screen name="WaterComparison" component={WaterComparisonScreen} />
      <Stack.Screen name="AddWaterLogScreen" component={AddWaterLogScreen} />
      <Stack.Screen name="EditWaterLogScreen" component={EditWaterLogScreen} />
      <Stack.Screen name="WaterLogAnalyticsScreen" component={WaterLogAnalyticsScreen} />
      <Stack.Screen name="UserPostsScreen" component={UserPostsScreen} />
      <Stack.Screen name="MyReportsScreen" component={MyReportsScreen} />
      <Stack.Screen name="FoodDailyLogScreen" component={FoodDailyLogScreen} />
      <Stack.Screen name="FoodLogHistoryScreen" component={FoodLogHistoryScreen} />
      <Stack.Screen name="TopFoodsByMeal" component={TopFoodsByMealScreen} />
      <Stack.Screen name="ExportHistory" component={ExportHistoryScreen} />
      <Stack.Screen name="Trends" component={TrendsScreen} />
      <Stack.Screen name="WorkoutHistoryScreen" component={WorkoutHistoryScreen} />
      <Stack.Screen name="WorkoutSessionScreen" component={WorkoutSessionScreen} />
      <Stack.Screen name="WorkoutInProgressScreen" component={WorkoutInProgressScreen} />
      <Stack.Screen name="HealthConsultationScreen" component={HealthConsultationScreen} />
      <Stack.Screen name="CalendarScreen" component={CalendarScreen} />
      <Stack.Screen name="DayDetailsScreen" component={DayDetailsScreen} />
      <Stack.Screen name="NutritionDetailsScreen" component={NutritionDetailsScreen} />
      <Stack.Screen name="WorkoutPlanListScreen" component={WorkoutPlanListScreen} />
      <Stack.Screen name="WorkoutPlanExercisesScreen" component={WorkoutPlanExercisesScreen} />
      <Stack.Screen name="WorkoutPlanExercisesDetailScreen" component={WorkoutPlanExercisesDetailScreen} />
      <Stack.Screen name="HealthLogOverviewScreen" component={HealthLogOverviewScreen} />
      <Stack.Screen name="HealthLogListScreen" component={HealthLogListScreen} />
      <Stack.Screen name="HealthLogCreateScreen" component={HealthLogCreateScreen} />
      <Stack.Screen name="HealthLogEditScreen" component={HealthLogEditScreen} />
      <Stack.Screen name="RateTrainerScreen" component={RateTrainerScreen} options={{ title: 'Đánh giá HLV' }} />
      <Stack.Screen name="WorkoutPlanExerciseSessionScreen" component={WorkoutPlanExerciseSessionScreen} />
      <Stack.Screen name="WorkoutSessionActiveScreen" component={WorkoutSessionActiveScreen} />
      <Stack.Screen name="MyGroupsScreen" component={MyGroupsScreen} options={{ title: 'My Groups' }} />
      <Stack.Screen name="PendingMembersScreen" component={PendingMembersScreen} options={{ title: 'Pending Members' }} />
      <Stack.Screen name="ActiveMembersScreen" component={ActiveMembersScreen} options={{ title: 'Active Members' }} />
      <Stack.Screen name="NutritionTargetScreen" component={NutritionTargetScreen} options={{ title: 'Set Nutrition Target' }} />
      <Stack.Screen name="NutritionTargetHistoryScreen" component={NutritionTargetHistoryScreen} options={{ title: 'Nutrition Target History' }} />
          <Stack.Screen name="HomeScreen" component={HomeScreen}  />
      <Stack.Screen name="AddReminderPlanScreen" component={AddReminderPlanScreen} options={{ title: 'Add Reminder Plan' }} />
      <Stack.Screen name="ReminderPlanListScreen" component={ReminderPlanListScreen} options={{ title: 'Reminder Plans' }} />
      <Stack.Screen name="ReminderPlanDetailScreen" component={ReminderPlanDetailScreen} options={{ title: 'Reminder Plan Detail' }} />
      <Stack.Screen name="EditReminderPlanScreen" component={EditReminderPlanScreen} options={{ title: 'Edit Reminder Plan' }} />
          <Stack.Screen name="TrainerDetailScreen" component={TrainerDetailScreen}  />
      <Stack.Screen name="TrainerApplicationScreen" component={TrainerApplicationScreen} options={{ title: 'Trainer Application' }} />
      <Stack.Screen name="TrainerApplicationListScreen" component={TrainerApplicationListScreen} options={{ title: 'My Trainer Applications' }} />
    <Stack.Screen name="VideoCallSupport" component={VideoCallSupport} options={{ headerShown: false }} />
        <Stack.Screen name="IncomingCallScreen" component={IncomingCallScreen} options={{ headerShown: false }} />
    <Stack.Screen name="TrainerMain" component={BottomTabNavigator} />

          {/* Trainer Feature Screens */}
          <Stack.Screen name="TrainerDashboard" component={TrainerDashboard} options={{ title: 'Trainer Dashboard' }} />
          <Stack.Screen name="TrainerPayoutManagement" component={TrainerPayoutManagement} options={{ title: 'Payment History' }} />
          <Stack.Screen name="TrainerPayoutDetail" component={TrainerPayoutDetailScreen} options={{ title: 'Payment Detail History' }} />
          <Stack.Screen name="TrainerPayoutStatistics" component={TrainerPayoutStatisticsScreen} options={{ title: 'Payment statistics' }} />
          { /* Trainer Rating Screens */}
          <Stack.Screen name="TrainerRatingDetailScreen" component={TrainerRatingDetailScreen} options={{ title: 'Trainer rating Management' }} />
          <Stack.Screen name="TrainerRatingStatisticsScreen" component={TrainerRatingStatisticsScreen} options={{ title: 'Trainer Rating statistics' }} />
          { /* Trainer User Screens */}
          <Stack.Screen name="TrainerUserManagementScreen" component={TrainerUserManagementScreen} options={{ title: 'Trainer user Management' }} />
          <Stack.Screen name="TraineeDetailScreen" component={TraineeDetailScreen} options={{ title: 'Trainee detail screen' }} />
          { /* Trainer Subscription Screens */}
          <Stack.Screen name="TrainerSubscriptionManagement" component={TrainerSubscriptionManagement} options={{ title: 'Trainer Subscription Management' }} />
          <Stack.Screen name="TrainerSubscriptionStatisticsScreen" component={TrainerSubscriptionStatisticsScreen} options={{ title: 'Trainer Subscription statistics' }} />
          <Stack.Screen name="TrainerSubscriptionDetailScreen" component={TrainerSubscriptionDetailScreen} options={{ title: 'Trainer Subscription detail' }} />
          {/* Trainer Exercise Screens */}
          <Stack.Screen name="TrainerExerciseManagement" component={TrainerExerciseManagement} options={{ title: 'Exercise Management' }} />
          <Stack.Screen name="ExerciseDetailScreen" component={ExerciseDetailScreen} options={{ title: 'Exercise Detail' }} />
          <Stack.Screen name="EditExerciseScreen" component={EditExerciseScreen} options={{ title: 'Edit Exercise' }} />
          <Stack.Screen name="DeleteExerciseScreen" component={DeleteExerciseScreen} options={{ title: 'Delete Exercise' }} />
          <Stack.Screen name="CreateExerciseScreen" component={CreateExerciseScreen} options={{ title: 'Create Exercise' }} />
          { /* Trainer Workout plan */}
          <Stack.Screen name="AddWorkoutPlanScreen" component={AddWorkoutPlanScreen} options={{ title: 'Create Workout Plan' }} />
          <Stack.Screen name="EditWorkoutPlanScreen" component={EditWorkoutPlanScreen} options={{ title: 'Edit Workout Plan' }} />
          <Stack.Screen name="TrainerWorkoutPlanManagement" component={TrainerWorkoutPlanManagement} options={{ title: 'Trainer workout management' }} />
          <Stack.Screen name="AddExerciseToPlanScreen" component={AddExerciseToPlanScreen} options={{ title: 'Trainer workout plan add exercise management' }} />
          <Stack.Screen name="EditExerciseToPlanScreen" component={EditExerciseToPlanScreen} options={{ title: 'Trainer workout plan edit exercise management' }} />
          <Stack.Screen name="TrainerWorkoutPlanStatisticsScreen" component={TrainerWorkoutPlanStatisticsScreen} options={{ title: 'Trainer workout statistic management' }} />
          {/* Trainer Service Screens */}
          <Stack.Screen name="TrainerServiceManagement" component={TrainerServiceManagement} options={{ title: 'Service Management' }} />
          <Stack.Screen name="TrainerPackageDetailScreen" component={TrainerPackageDetailScreen} options={{ title: 'Package Detail' }} />
          <Stack.Screen name="CreateServicePackage" component={CreateServicePackageScreen} options={{ title: 'Create Service Package' }} />
          <Stack.Screen name="EditServicePackage" component={EditServicePackageScreen} options={{ title: 'Edit Service Package' }} />
      <Stack.Screen name="ProgressComparisonDetailScreen" component={ProgressComparisonDetailScreen} options={{ title: 'Progress Comparison Detail' }} />

    <Stack.Screen name="AIRecommendedScreen" component={AIRecommendedScreen} options={{ headerShown: false }} />
    <Stack.Screen name="AIRecommendedFoodScreen" component={AIRecommendedFoodScreen} options={{ title: 'AI Recommended Food' }} />
    <Stack.Screen name="UserGoalPlansScreen" component={UserGoalPlansScreen} options={{ title: 'User Goal Plans' }} />
    <Stack.Screen name="WeeklyProgressScreen" component={WeeklyProgressScreen} options={{ title: 'Weekly Progress' }} />
      <Stack.Screen name="BanMembersScreen" component={BanMembersScreen} options={{ title: 'Ban Members' }} />
      <Stack.Screen name="ProgressComparisonScreen" component={ProgressComparisonScreen} options={{ title: 'Progress Comparison' }} />
      <Stack.Screen name="EditProgressComparisonScreen" component={EditProgressComparisonScreen} options={{ title: 'Edit Progress Comparison' }} />
      <Stack.Screen name="AnalysisScreen" component={AnalysisScreen}  />


    </Stack.Navigator>
  );
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