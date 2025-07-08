// Trainer Workout Screens
import TrainerWorkoutPlanManagement from 'screens/trainer/trainner_workout/TrainerWorkoutPlanManagement';
import TrainerWorkoutPlanExercisesScreen from 'screens/trainer/trainner_workout/TrainerWorkoutPlanExercisesScreen';
import TrainerWorkoutPlanExerciseSessionScreen from 'screens/trainer/trainner_workout/TrainerWorkoutPlanExerciseSessionScreen';
import EditWorkoutPlanScreen from 'screens/trainer/trainner_workout/EditWorkoutPlanScreen';
import EditWorkoutPlan from 'screens/trainer/trainner_workout/EditWorkoutPlan';
import EditPlanExercise from 'screens/trainer/trainner_workout/EditPlanExercise';
import CreateWorkoutPlanScreen from 'screens/trainer/trainner_workout/CreateWorkoutPlanScreen';
import CreateWorkoutPlan from 'screens/trainer/trainner_workout/CreateWorkoutPlan';
import CreatePlanExercise from 'screens/trainer/trainner_workout/CreatePlanExercise';
// Trainer Exercise Screens
import TrainerExerciseManagement from 'screens/trainer/exercise/TrainerExerciseManagement';
import ExerciseDetailScreen from 'screens/trainer/exercise/ExerciseDetailScreen';
import EditServicePackageScreen from 'screens/trainer/exercise/EditServicePackageScreen';
import EditExerciseScreen from 'screens/trainer/exercise/EditExerciseScreen';
import DeleteExerciseScreen from 'screens/trainer/exercise/DeleteExerciseScreen';
import CreateExerciseScreen from 'screens/trainer/exercise/CreateExerciseScreen';

// Trainer Service Screens
import TrainerServicePackageScreen from 'screens/trainer/service/TrainerServicePackageScreen';
import TrainerServiceManagement from 'screens/trainer/service/TrainerServiceManagement';
import TrainerPackageDetailScreen from 'screens/trainer/service/TrainerPackageDetailScreen';
import ServicePackageDetailScreen from 'screens/trainer/service/ServicePackageDetailScreen';
import DeleteServicePackageScreen from 'screens/trainer/service/DeleteServicePackageScreen';
import CreateServicePackageScreen from 'screens/trainer/service/CreateServicePackageScreen';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
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
import EditUserScreen from 'screens/profile/EditUserScreen';
import EditWeightScreen from 'screens/profile/weight/EditWeightScreen';
import FoodListScreen from 'screens/food/FoodListScreen';
import FoodDetailsScreen from 'screens/food/FoodDetailsScreen';
import WorkoutScreen from 'screens/workout/WorkoutScreen';
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
import WaterComparisonScreen from 'screens/userWaterLog/WaterComparisonScreen';
import AddWaterLogScreen from 'screens/userWaterLog/AddWaterLogScreen';
import EditWaterLogScreen from 'screens/userWaterLog/EditWaterLogScreen';
import UserPostsScreen from 'screens/community/UserPostsScreen';
import MyReportsScreen from 'screens/community/MyReportsScreen';
import FoodDailyLogScreen from 'screens/food/FoodDailyLogScreen';
import FoodLogHistoryScreen from 'screens/food/FoodLogHistoryScreen';
import DayDetailsScreen from 'screens/food/DayDetailsScreen';
import WorkoutHistoryScreen from 'screens/workout/WorkoutHistoryScreen';
import WorkoutSessionScreen from 'screens/workout/WorkoutSessionScreen';
import UserActivityScreen from 'screens/workout/UserActivityScreen';
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
import TrainerPaymentHistory from 'screens/trainer/TrainerPaymentHistory';
import WorkoutPlanDetailByTrainer from 'screens/trainer/WorkoutPlanDetailByTrainer';
import PaymentDetailsScreen from 'screens/trainer/PaymentDetailsScreen';
import CreatePackageScreen from 'screens/trainer/CreatePackageScreen';
import ProgressPhotoScreen from 'screens/trainer/ProgressPhotoScreen';
import SubscriptionScreen from 'screens/trainer/SubscriptionScreen';
import UserList from 'screens/trainer/user/UserList';

import AIRecommendedScreen from 'screens/workout/AIRecommendedScreen';
import UserGoalPlansScreen from 'screens/profile/UserGoalPlansScreen';
import WeeklyProgressScreen from 'screens/home/WeeklyProgressScreen';



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
      initialRouteName={user ? 'Main' : 'Login'}
      screenOptions={{ headerShown: false }}
    >
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
      <Stack.Screen name="EditUserScreen" component={EditUserScreen} />
      <Stack.Screen name="EditWeight" component={EditWeightScreen} />
      <Stack.Screen name="Food" component={FoodListScreen} />
      <Stack.Screen name="FoodDetails" component={FoodDetailsScreen} />
      <Stack.Screen name="Workouts" component={WorkoutScreen} />
      <Stack.Screen name="CategoryDetails" component={CategoryDetailsScreen} />
      <Stack.Screen name="ExerciseDetails" component={ExerciseDetailsScreen} />

    {/* Ticket System Screens */}
    <Stack.Screen name="TicketList" component={TicketListScreen} options={{ title: 'My Tickets' }} />
    <Stack.Screen name="CreateTicket" component={CreateTicketScreen} options={{ title: 'Create Ticket' }} />
    <Stack.Screen name="TicketDetail" component={TicketDetailScreen} options={{ title: 'Ticket Detail' }} />
      <Stack.Screen name="Notifications" component={NotificationScreen} />
      <Stack.Screen name="StepCounter" component={StepCounterScreen} />
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
      <Stack.Screen name="WaterComparison" component={WaterComparisonScreen} />
      <Stack.Screen name="AddWaterLogScreen" component={AddWaterLogScreen} />
      <Stack.Screen name="EditWaterLogScreen" component={EditWaterLogScreen} />
      <Stack.Screen name="UserPostsScreen" component={UserPostsScreen} />
      <Stack.Screen name="MyReportsScreen" component={MyReportsScreen} />
      <Stack.Screen name="FoodDailyLogScreen" component={FoodDailyLogScreen} />
      <Stack.Screen name="FoodLogHistoryScreen" component={FoodLogHistoryScreen} />
      <Stack.Screen name="WorkoutHistoryScreen" component={WorkoutHistoryScreen} />
      <Stack.Screen name="WorkoutSessionScreen" component={WorkoutSessionScreen} />
      <Stack.Screen name="UserActivityScreen" component={UserActivityScreen} />
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

    {/* Trainer Feature Screens */}
    <Stack.Screen name="TrainerDashboard" component={TrainerDashboard} options={{ title: 'Trainer Dashboard' }} />
    <Stack.Screen name="TrainerPaymentHistory" component={TrainerPaymentHistory} options={{ title: 'Payment History' }} />
    <Stack.Screen name="WorkoutPlanDetailByTrainer" component={WorkoutPlanDetailByTrainer} options={{ title: 'Workout Plan Detail' }} />
    <Stack.Screen name="PaymentDetailsScreen" component={PaymentDetailsScreen} options={{ title: 'Payment Details' }} />
    <Stack.Screen name="CreatePackageScreen" component={CreatePackageScreen} options={{ title: 'Create/Edit Package' }} />
    <Stack.Screen name="ProgressPhotoScreen" component={ProgressPhotoScreen} options={{ title: 'Progress Photos' }} />
    <Stack.Screen name="SubscriptionScreen" component={SubscriptionScreen} options={{ title: 'Subscriptions' }} />

    {/* Trainer Exercise Screens */}
    <Stack.Screen name="TrainerExerciseManagement" component={TrainerExerciseManagement} options={{ title: 'Exercise Management' }} />
    <Stack.Screen name="ExerciseDetailScreen" component={ExerciseDetailScreen} options={{ title: 'Exercise Detail' }} />
    <Stack.Screen name="EditServicePackageScreen" component={EditServicePackageScreen} options={{ title: 'Edit Service Package' }} />
    <Stack.Screen name="EditExerciseScreen" component={EditExerciseScreen} options={{ title: 'Edit Exercise' }} />
    <Stack.Screen name="DeleteExerciseScreen" component={DeleteExerciseScreen} options={{ title: 'Delete Exercise' }} />
    <Stack.Screen name="CreateExerciseScreen" component={CreateExerciseScreen} options={{ title: 'Create Exercise' }} />

    {/* Trainer Service Screens */}
    <Stack.Screen name="TrainerServicePackageScreen" component={TrainerServicePackageScreen} options={{ title: 'Service Packages' }} />
    <Stack.Screen name="TrainerServiceManagement" component={TrainerServiceManagement} options={{ title: 'Service Management' }} />
    <Stack.Screen name="TrainerPackageDetailScreen" component={TrainerPackageDetailScreen} options={{ title: 'Package Detail' }} />
    <Stack.Screen name="ServicePackageDetailScreen" component={ServicePackageDetailScreen} options={{ title: 'Service Package Detail' }} />
    <Stack.Screen name="DeleteServicePackageScreen" component={DeleteServicePackageScreen} options={{ title: 'Delete Service Package' }} />
    <Stack.Screen name="CreateServicePackageScreen" component={CreateServicePackageScreen} options={{ title: 'Create Service Package' }} />

    {/* Trainer Workout Screens */}
    <Stack.Screen name="TrainerWorkoutPlanManagement" component={TrainerWorkoutPlanManagement} options={{ title: 'Workout Plan Management' }} />
    <Stack.Screen name="TrainerWorkoutPlanExercisesScreen" component={TrainerWorkoutPlanExercisesScreen} options={{ title: 'Workout Plan Exercises' }} />
    <Stack.Screen name="TrainerWorkoutPlanExerciseSessionScreen" component={TrainerWorkoutPlanExerciseSessionScreen} options={{ title: 'Workout Plan Exercise Session' }} />
    <Stack.Screen name="EditWorkoutPlanScreen" component={EditWorkoutPlanScreen} options={{ title: 'Edit Workout Plan' }} />
    <Stack.Screen name="EditWorkoutPlan" component={EditWorkoutPlan} options={{ title: 'Edit Workout Plan' }} />
    <Stack.Screen name="EditPlanExercise" component={EditPlanExercise} options={{ title: 'Edit Plan Exercise' }} />
    <Stack.Screen name="CreateWorkoutPlanScreen" component={CreateWorkoutPlanScreen} options={{ title: 'Create Workout Plan' }} />
    <Stack.Screen name="CreateWorkoutPlan" component={CreateWorkoutPlan} options={{ title: 'Create Workout Plan' }} />
    <Stack.Screen name="CreatePlanExercise" component={CreatePlanExercise} options={{ title: 'Create Plan Exercise' }} />
    <Stack.Screen name="UserList" component={UserList} options={{ title: 'User List' }} />

    <Stack.Screen name="AIRecommendedScreen" component={AIRecommendedScreen} options={{ headerShown: false }} />
    <Stack.Screen name="UserGoalPlansScreen" component={UserGoalPlansScreen} options={{ title: 'User Goal Plans' }} />
    <Stack.Screen name="WeeklyProgressScreen" component={WeeklyProgressScreen} options={{ title: 'Weekly Progress' }} />


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