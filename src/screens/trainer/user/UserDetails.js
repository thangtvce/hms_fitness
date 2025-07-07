import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from 'context/AuthContext';
import { trainerService } from 'services/apiTrainerService';
import { apiUserService } from 'services/apiUserService';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WorkoutPlansSection from './WorkoutPlansSection';

const { width: screenWidth } = Dimensions.get('window');

const UserDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId } = route.params;
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);
  const [progressPhotos, setProgressPhotos] = useState([]);
  const [bodyMeasurements, setBodyMeasurements] = useState([]);
  const [fitnessGoals, setFitnessGoals] = useState([]);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    subscriptions: false,
    weightHistory: false,
    progressPhotos: false,
    bodyMeasurements: false,
    fitnessGoals: false,
    sessionLogs: false,
    activityStats: false,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!userId) {
      Alert.alert('Error', 'Missing user ID.');
      navigation.goBack();
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    fetchUserData();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    };
  }, [userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const isAdmin = user?.roles?.includes('Admin');
      const fetchFitnessGoals = isAdmin;

      const subscriptionsResponse = await trainerService.getSubscriptionsByUserId(userId).catch(() => ({
        data: { subscriptions: [] },
      }));

      const isAssignedTrainer = subscriptionsResponse.data.subscriptions.some(
        (sub) => sub.trainerId === user?.userId
      );

      const promises = [
        apiUserService.getUserProfile(userId).catch((error) => {
          return null;
        }),
        Promise.resolve(subscriptionsResponse),
        trainerService.getWeightHistoryByUserId(userId)
          .then((res) => {
            console.log('Weight History (raw):', JSON.stringify(res?.data, null, 2));
            return res;
          })
          .catch((err) => {
            console.log('Weight History (error):', err);
            return { data: { weightHistory: [] } };
          }),
        trainerService.getProgressPhotos({ userId })
          .then((res) => {
            console.log('Progress Photos (raw):', JSON.stringify(res?.data, null, 2));
            return res;
          })
          .catch((err) => {
            console.log('Progress Photos (error):', err);
            return { data: { photos: [] } };
          }),
        trainerService.getBodyMeasurementByUserId(userId)
          .then((res) => {
            console.log('Body Measurements (raw):', JSON.stringify(res?.data, null, 2));
            return res;
          })
          .catch((err) => {
            console.log('Body Measurements (error):', err);
            return { data: { measurements: [] } };
          }),
        fetchFitnessGoals && isAssignedTrainer
          ? apiUserService.getUserFitnessGoals(userId).catch((error) => {
              if (error.status === 403) {
                console.warn('Permission denied for fitness goals:', error.message);
                return { data: { goals: [] } };
              }
              throw error;
            })
          : Promise.resolve({ data: { goals: [] } }),
        trainerService.getWorkoutSessionLogsByUserId(userId).catch(() => ({ data: { logs: [] } })),
        trainerService.getUserActivityStatistics(userId).catch(() => null),
      ];

      const [
        profileResponse,
        weightHistoryResponse,
        progressPhotosResponse,
        bodyMeasurementsResponse,
        fitnessGoalsResponse,
        sessionLogsResponse,
        activityStatsResponse,
      ] = await Promise.all(promises);

      setUserProfile(
        profileResponse?.data?.data ||
        profileResponse?.data ||
        null
      );
      setWeightHistory(weightHistoryResponse.data.weightHistory || []);
      setProgressPhotos(progressPhotosResponse.data.photos || []);
      setBodyMeasurements(bodyMeasurementsResponse.data.measurements || []);
      setFitnessGoals(fitnessGoalsResponse.data.goals || []);
      setSessionLogs(sessionLogsResponse.data.logs || []);
      setActivityStats(activityStatsResponse?.data?.data || null);
    } catch (error) {
      console.error('Fetch User Data Error:', JSON.stringify(error, null, 2));
      if (error.status === 401 && error.message.includes('Failed to refresh token')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log in again.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              },
            },
          ]
        );
      } else if (error.status === 403) {
        Alert.alert('Permission Denied', 'You do not have permission to view some user data.');
      } else {
        Alert.alert('Error', 'Failed to load user details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const renderSectionHeader = (title, section, count = 0, icon = 'list-outline') => (
    <TouchableOpacity
      style={[styles.sectionHeader, expandedSections[section] && styles.sectionHeaderExpanded]}
      onPress={() => toggleSection(section)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionIcon, expandedSections[section] && styles.sectionIconExpanded]}>
          <Ionicons 
            name={icon} 
            size={22} 
            color={expandedSections[section] ? '#FFFFFF' : '#4F46E5'} 
          />
        </View>
        <View style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, expandedSections[section] && styles.sectionTitleExpanded]}>
            {title}
          </Text>
          <Text style={[styles.sectionCount, expandedSections[section] && styles.sectionCountExpanded]}>
            {count} {count === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>
      <Ionicons
        name={expandedSections[section] ? 'chevron-up' : 'chevron-down'}
        size={24}
        color={expandedSections[section] ? '#FFFFFF' : '#4F46E5'}
      />
    </TouchableOpacity>
  );

  const renderProfile = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.profileHeaderContainer}>
        <View style={styles.profileIconWrapper}>
          <Ionicons name="person" size={24} color="#4F46E5" />
        </View>
        <Text style={styles.profileSectionTitle}>User Profile</Text>
      </View>
      
      {userProfile ? (
        <View style={styles.profileCard}>
          <LinearGradient 
            colors={['#4F46E5', '#6366F1', '#8B5CF6']} 
            style={styles.profileGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={['#FFFFFF', '#F8FAFC']}
                  style={styles.avatar}
                >
                  <Ionicons name="person" size={28} color="#4F46E5" />
                </LinearGradient>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{userProfile.fullName || 'Unknown User'}</Text>
                <Text style={styles.userEmail}>{userProfile.email || 'N/A'}</Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>{userProfile.status || 'Active'}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
          
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="call-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{userProfile.phone || 'N/A'}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={16} color="#64748B" />
                <Text style={styles.detailLabel}>Joined</Text>
                <Text style={styles.detailValue}>
                  {userProfile.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>
            
            {userProfile.profile && (
              <View style={styles.physicalStats}>
                <Text style={styles.statsTitle}>Physical Information</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Ionicons name="resize-outline" size={20} color="#4F46E5" />
                    <Text style={styles.statLabel}>Height</Text>
                    <Text style={styles.statValue}>{userProfile.profile.height || 'N/A'} cm</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Ionicons name="fitness-outline" size={20} color="#4F46E5" />
                    <Text style={styles.statLabel}>Weight</Text>
                    <Text style={styles.statValue}>{userProfile.profile.weight || 'N/A'} kg</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Ionicons name="analytics-outline" size={20} color="#4F46E5" />
                    <Text style={styles.statLabel}>BMI</Text>
                    <Text style={styles.statValue}>{userProfile.profile.bmi || 'N/A'}</Text>
                  </View>
                </View>
                
                <View style={styles.additionalInfo}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Body Fat</Text>
                    <Text style={styles.infoValue}>{userProfile.profile.bodyFatPercentage || 'N/A'}%</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Activity Level</Text>
                    <Text style={styles.infoValue}>{userProfile.profile.activityLevel || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Diet Preference</Text>
                    <Text style={styles.infoValue}>{userProfile.profile.dietaryPreference || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Fitness Goal</Text>
                    <Text style={styles.infoValue}>{userProfile.profile.fitnessGoal || 'N/A'}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.emptyStateCard}>
          <Ionicons name="person-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No profile data available.</Text>
        </View>
      )}
    </Animated.View>
  );


  const renderWeightHistory = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {renderSectionHeader('Weight History', 'weightHistory', weightHistory.length, 'trending-up-outline')}
      {expandedSections.weightHistory && (
        <View style={styles.sectionContent}>
          {weightHistory.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {weightHistory.map((record, index) => (
                <View key={index} style={styles.weightCard}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.weightGradient}>
                    <Ionicons name="fitness" size={24} color="#FFFFFF" />
                    <Text style={styles.weightValue}>{record.weight} kg</Text>
                    <Text style={styles.weightDate}>
                      {record.recordedDate ? new Date(record.recordedDate).toLocaleDateString() : 'N/A'}
                    </Text>
                  </LinearGradient>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="trending-up-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No weight history found.</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );

  const renderProgressPhotos = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {renderSectionHeader('Progress Photos', 'progressPhotos', progressPhotos.length, 'camera-outline')}
      {expandedSections.progressPhotos && (
        <View style={styles.sectionContent}>
          {progressPhotos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {progressPhotos.map((photo, index) => (
                <TouchableOpacity key={index} style={styles.photoCard} activeOpacity={0.8}>
                  <Image
                    source={{ uri: photo.photoUrl }}
                    style={styles.photo}
                    resizeMode="cover"
                    onError={() => console.warn(`Failed to load image: ${photo.photoUrl}`)}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)']}
                    style={styles.photoOverlay}
                  >
                    <Text style={styles.photoDate}>
                      {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString() : 'N/A'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="camera-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No progress photos found.</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );

  const renderBodyMeasurements = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {renderSectionHeader('Body Measurements', 'bodyMeasurements', bodyMeasurements.length, 'resize-outline')}
      {expandedSections.bodyMeasurements && (
        <View style={styles.sectionContent}>
          {bodyMeasurements.length > 0 ? (
            bodyMeasurements.map((measurement, index) => (
              <View key={index} style={styles.card}>
                <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
                  <View style={styles.measurementHeader}>
                    <View style={styles.measurementIcon}>
                      <Ionicons name="resize" size={20} color="#8B5CF6" />
                    </View>
                    <Text style={styles.cardTitle}>Body Measurement</Text>
                  </View>
                  
                  <View style={styles.measurementGrid}>
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>Height</Text>
                      <Text style={styles.measurementValue}>{measurement.height || 'N/A'} cm</Text>
                    </View>
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>Waist</Text>
                      <Text style={styles.measurementValue}>{measurement.waist || 'N/A'} cm</Text>
                    </View>
                    <View style={styles.measurementItem}>
                      <Text style={styles.measurementLabel}>Chest</Text>
                      <Text style={styles.measurementValue}>{measurement.chest || 'N/A'} cm</Text>
                    </View>
                  </View>
                  
                  <View style={styles.measurementFooter}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <Text style={styles.measurementDate}>
                      Recorded: {measurement.recordedDate ? new Date(measurement.recordedDate).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="resize-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No body measurements found.</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );

  const renderFitnessGoals = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {renderSectionHeader('Fitness Goals', 'fitnessGoals', fitnessGoals.length, 'trophy-outline')}
      {expandedSections.fitnessGoals && (
        <View style={styles.sectionContent}>
          {fitnessGoals.length > 0 ? (
            fitnessGoals.map((goal, index) => (
              <View key={index} style={styles.card}>
                <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
                  <View style={styles.goalHeader}>
                    <View style={styles.goalIcon}>
                      <Ionicons name="trophy" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.goalInfo}>
                      <Text style={styles.cardTitle}>{goal.goalType || 'Unnamed Goal'}</Text>
                      <Text style={styles.goalTarget}>Target: {goal.targetValue || 'N/A'}</Text>
                    </View>
                    <View style={styles.goalStatusBadge}>
                      <Text style={styles.goalStatusText}>{goal.status || 'N/A'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.goalFooter}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text style={styles.goalDeadline}>
                      Deadline: {goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'N/A'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="trophy-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>
                {user?.roles?.includes('Admin') ? 'No fitness goals found.' : 'Fitness goals not accessible.'}
              </Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );

  const renderSessionLogs = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {renderSectionHeader('Workout Session Logs', 'sessionLogs', sessionLogs.length, 'barbell-outline')}
      {expandedSections.sessionLogs && (
        <View style={styles.sectionContent}>
          {sessionLogs.length > 0 ? (
            sessionLogs.map((log, index) => (
              <View key={index} style={styles.card}>
                <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionIcon}>
                      <Ionicons name="barbell" size={20} color="#8B5CF6" />
                    </View>
                    <View style={styles.sessionInfo}>
                      <Text style={styles.cardTitle}>Workout Session</Text>
                      <Text style={styles.sessionDate}>
                        {log.sessionDate ? new Date(log.sessionDate).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.sessionStats}>
                    <View style={styles.sessionStat}>
                      <Ionicons name="timer-outline" size={16} color="#64748B" />
                      <Text style={styles.sessionStatLabel}>Duration</Text>
                      <Text style={styles.sessionStatValue}>{log.durationMinutes || 'N/A'} min</Text>
                    </View>
                    <View style={styles.sessionStat}>
                      <Ionicons name="flame-outline" size={16} color="#64748B" />
                      <Text style={styles.sessionStatLabel}>Calories</Text>
                      <Text style={styles.sessionStatValue}>{log.caloriesBurned || 'N/A'} kcal</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            ))
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="barbell-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No session logs found.</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );

  const renderActivityStats = () => (
    <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {renderSectionHeader('Activity Statistics', 'activityStats', activityStats ? 1 : 0, 'stats-chart-outline')}
      {expandedSections.activityStats && (
        <View style={styles.sectionContent}>
          {activityStats ? (
            <View style={styles.statsCard}>
              <LinearGradient colors={['#4F46E5', '#8B5CF6']} style={styles.statsGradient}>
                <View style={styles.statsHeader}>
                  <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
                  <Text style={styles.statsTitle}>Activity Overview</Text>
                </View>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{activityStats.totalSessions || '0'}</Text>
                    <Text style={styles.statLabel}>Total Sessions</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{activityStats.totalCaloriesBurned || '0'}</Text>
                    <Text style={styles.statLabel}>Calories Burned</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{activityStats.avgSessionDuration || '0'}</Text>
                    <Text style={styles.statLabel}>Avg Duration (min)</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
          ) : (
            <View style={styles.emptyStateCard}>
              <Ionicons name="stats-chart-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No activity statistics available.</Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <View style={styles.loaderContainer}>
          <LinearGradient colors={['#4F46E5', '#8B5CF6']} style={styles.loaderGradient}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loaderText}>Loading user details...</Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>User Management</Text>
            <Text style={styles.headerSubtitle}>Manage workout plans & user information</Text>
          </View>
          <View style={styles.headerActionButtonPlaceholder} />
        </View>
      </LinearGradient>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderProfile()}
        {console.log('UserDetails -> userId:', userId, 'subscriptions:', subscriptions, 'trainerId:', user.userId)}
        <WorkoutPlansSection userId={userId} subscriptions={subscriptions} trainerId={user.userId} />
        {renderWeightHistory()}
        {renderProgressPhotos()}
        {renderBodyMeasurements()}
        {renderFitnessGoals()}
        {renderSessionLogs()}
        {renderActivityStats()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { 
    flex: 1, 
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 2,
  },
  headerActionButtonPlaceholder: { 
    width: 44 
  },
  scrollContent: {
    padding: 20,
    backgroundColor: '#F8FAFC',
    paddingBottom: 100,
  },
  section: { 
    marginBottom: 24 
  },
  
  // Section Header Styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 12,
  },
  sectionHeaderExpanded: {
    backgroundColor: '#4F46E5',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionIconExpanded: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  sectionTitleExpanded: {
    color: '#FFFFFF',
  },
  sectionCount: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  sectionCountExpanded: {
    color: 'rgba(255,255,255,0.8)',
  },
  sectionContent: { 
    marginTop: 12 
  },
  
  // Profile Styles
  profileHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  profileSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  profileCard: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  profileGradient: {
    borderRadius: 20,
    padding: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  profileDetails: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailItem: {
    alignItems: 'center',
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  physicalStats: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  additionalInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  
  // Card Styles
  card: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: { 
    padding: 20, 
    borderRadius: 16 
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  cardContent: { 
    marginBottom: 16 
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 8,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Weight History Styles
  horizontalScroll: {
    paddingVertical: 8,
  },
  weightCard: {
    width: 120,
    height: 120,
    marginRight: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  weightGradient: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  weightValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  weightDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Progress Photos Styles
  photoCard: {
    width: 160,
    height: 200,
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  photoDate: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Measurement Styles
  measurementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  measurementIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  measurementGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  measurementItem: {
    alignItems: 'center',
    flex: 1,
  },
  measurementLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  measurementFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
  },
  measurementDate: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  
  // Goal Styles
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  goalInfo: {
    flex: 1,
  },
  goalTarget: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  goalStatusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  goalStatusText: {
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
  },
  goalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalDeadline: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
  },
  
  // Session Styles
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  sessionStat: {
    alignItems: 'center',
    flex: 1,
  },
  sessionStatLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 2,
  },
  sessionStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  
  // Stats Card Styles
  statsCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  statsGradient: {
    borderRadius: 16,
    padding: 24,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  
  // Empty State Styles
  emptyStateCard: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '500',
  },
  
  // Loader Styles
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '600',
  },
});

export default UserDetails;