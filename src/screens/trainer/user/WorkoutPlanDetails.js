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
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Video } from 'expo-av';
import { trainerService } from 'services/apiTrainerService';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width: screenWidth } = Dimensions.get('window');

const WorkoutPlanDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { planId, userId, subscriptionId, trainerId } = route.params || {};
  
  const [loading, setLoading] = useState(true);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [exerciseMedia, setExerciseMedia] = useState({});
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [videoStates, setVideoStates] = useState({});
  
  const maxRetries = 2;
  
  // Enhanced animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const headerAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (!planId || !userId || !trainerId) {
      setError('Missing required parameters: Plan ID, User ID, or Trainer ID.');
      setLoading(false);
      return;
    }

    // Enhanced entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.timing(slideAnim, { 
        toValue: 0, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.timing(scaleAnim, { 
        toValue: 1, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.timing(headerAnim, { 
        toValue: 0, 
        duration: 600, 
        useNativeDriver: true 
      }),
    ]).start();

    fetchWorkoutPlanData();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.95);
      headerAnim.setValue(-100);
    };
  }, [planId, userId, trainerId, retryCount]);

  const fetchWorkoutPlanData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching workout plan with planId:', planId);
      
      const [planResponse, exercisesResponse] = await Promise.all([
        trainerService.getWorkoutPlanById(planId),
        trainerService.getWorkoutPlanExercisesByPlanId(planId).catch((err) => {
          console.warn('Failed to fetch exercises:', err.message);
          return { data: { exercises: [] } };
        }),
      ]);

      console.log('Workout Plan Response:', JSON.stringify(planResponse, null, 2));
      console.log('Exercises Response:', JSON.stringify(exercisesResponse, null, 2));

      if (!planResponse?.data) {
        throw new Error('Invalid workout plan response: No data property found.');
      }

      const planData = planResponse.data;
      if (!planData.planId) {
        throw new Error('Invalid workout plan response: Missing plan details.');
      }

      setWorkoutPlan(planData);
      const exercisesData = exercisesResponse.data.exercises || [];
      setExercises(exercisesData);

      // Fetch media for exercises
      const mediaPromises = exercisesData.map(async (exercise) => {
        try {
          const exerciseDetails = await trainerService.getFitnessExerciseById(exercise.exerciseId);
          return {
            exerciseId: exercise.exerciseId,
            imageUrl: exerciseDetails.data?.imageUrl || null,
            videoUrl: exerciseDetails.data?.videoUrl || null,
          };
        } catch (err) {
          console.warn(`Failed to fetch media for exercise ${exercise.exerciseId}:`, err.message);
          return { exerciseId: exercise.exerciseId, imageUrl: null, videoUrl: null };
        }
      });

      const mediaResults = await Promise.all(mediaPromises);
      const mediaMap = mediaResults.reduce((acc, media) => {
        acc[media.exerciseId] = { imageUrl: media.imageUrl, videoUrl: media.videoUrl };
        return acc;
      }, {});

      setExerciseMedia(mediaMap);
    } catch (err) {
      console.error('Fetch Workout Plan Data Error:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
        status: err.response?.status,
        planId,
      });

      let errorMessage = 'Unable to load workout plan details.';
      if (err.response?.status === 404) {
        errorMessage = 'Workout plan not found. It may have been deleted or the ID is incorrect.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.message.includes('Invalid workout plan response')) {
        errorMessage = 'Unexpected response from server. Please try again or contact support.';
      }

      setError(errorMessage);
      if (retryCount < maxRetries && err.response?.status !== 404) {
        console.log(`Retrying fetch (attempt ${retryCount + 2}/${maxRetries + 1})...`);
        setTimeout(() => setRetryCount(retryCount + 1), 2000);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExercise = async (planExerciseId) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to remove this exercise from the workout plan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await trainerService.deleteWorkoutPlanExercise(planExerciseId);
              setExercises(exercises.filter((ex) => ex.planExerciseId !== planExerciseId));
              Alert.alert('Success', 'Exercise removed successfully.');
            } catch (err) {
              console.error('Delete Exercise Error:', err);
              Alert.alert('Error', err.message || 'Failed to remove exercise.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const toggleExerciseDetails = (planExerciseId) => {
    setExpandedExercise(expandedExercise === planExerciseId ? null : planExerciseId);
  };

  const handleImageLoadStart = (exerciseId) => {
    setImageLoadingStates(prev => ({ ...prev, [exerciseId]: true }));
  };

  const handleImageLoadEnd = (exerciseId) => {
    setImageLoadingStates(prev => ({ ...prev, [exerciseId]: false }));
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' };
      case 'completed':
        return { bg: '#EFF6FF', text: '#1E40AF', dot: '#3B82F6' };
      case 'paused':
        return { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' };
      default:
        return { bg: '#F1F5F9', text: '#475569', dot: '#64748B' };
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const renderHeader = () => (
    <Animated.View 
      style={[
        styles.headerContainer,
        { transform: [{ translateY: headerAnim }] }
      ]}
    >
      <LinearGradient 
        colors={['#667EEA', '#764BA2']} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Workout Plan Details</Text>
            <Text style={styles.headerSubtitle}>
              {workoutPlan?.planName || 'Loading...'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.headerActionButton}
            onPress={() => navigation.navigate('ExerciseSelection', { planId, trainerId })}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderWorkoutPlan = () => {
    const statusColors = getStatusColor(workoutPlan?.status);
    
    return (
      <Animated.View 
        style={[
          styles.section, 
          { 
            opacity: fadeAnim, 
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ] 
          }
        ]}
      >
        {error ? (
          <View style={styles.errorCard}>
            <LinearGradient
              colors={['#FEF2F2', '#FECACA']}
              style={styles.errorGradient}
            >
              <View style={styles.errorIconContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
              </View>
              <Text style={styles.errorTitle}>Unable to Load Plan</Text>
              <Text style={styles.errorText}>{error}</Text>
              <View style={styles.errorActions}>
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={fetchWorkoutPlanData}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.backActionButton} 
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.backActionText}>Go Back</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        ) : workoutPlan ? (
          <View style={styles.planCard}>
            <LinearGradient 
              colors={['#FFFFFF', '#F8FAFC']} 
              style={styles.planCardGradient}
            >
              <View style={styles.planHeader}>
                <View style={styles.planIconContainer}>
                  <LinearGradient
                    colors={['#667EEA', '#764BA2']}
                    style={styles.planIconGradient}
                  >
                    <Ionicons name="barbell-outline" size={28} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <View style={styles.planTitleContainer}>
                  <Text style={styles.planTitle}>
                    {workoutPlan.planName || 'Unnamed Plan'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColors.dot }]} />
                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                      {workoutPlan.status || 'N/A'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.planDetails}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="document-text-outline" size={16} color="#6366F1" />
                  </View>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>
                    {workoutPlan.description || 'No description provided'}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="time-outline" size={16} color="#10B981" />
                  </View>
                  <Text style={styles.detailLabel}>Duration:</Text>
                  <Text style={styles.detailValue}>
                    {formatDuration(workoutPlan.durationMinutes)}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {workoutPlan.createdAt 
                      ? new Date(workoutPlan.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'
                    }
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No workout plan data available.</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderExerciseMedia = (exercise) => {
    const media = exerciseMedia[exercise.exerciseId];
    const isImageLoading = imageLoadingStates[exercise.exerciseId];
    
    return (
      <View style={styles.mediaSection}>
        {media?.imageUrl && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: media.imageUrl }}
              style={styles.exerciseImage}
              onLoadStart={() => handleImageLoadStart(exercise.exerciseId)}
              onLoadEnd={() => handleImageLoadEnd(exercise.exerciseId)}
              resizeMode="cover"
            />
            {isImageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color="#6366F1" />
              </View>
            )}
            <View style={styles.imageOverlay}>
              <Ionicons name="image-outline" size={16} color="#FFFFFF" />
            </View>
          </View>
        )}
        
        {media?.videoUrl && (
          <View style={styles.videoContainer}>
            <Video
              source={{ uri: media.videoUrl }}
              style={styles.exerciseVideo}
              useNativeControls
              resizeMode="contain"
              isLooping
            />
          </View>
        )}
        
        {!media?.imageUrl && !media?.videoUrl && (
          <View style={styles.noMediaContainer}>
            <LinearGradient
              colors={['#F1F5F9', '#E2E8F0']}
              style={styles.noMediaGradient}
            >
              <Ionicons name="fitness-outline" size={32} color="#94A3B8" />
              <Text style={styles.noMediaText}>No media available</Text>
            </LinearGradient>
          </View>
        )}
      </View>
    );
  };

  const renderExercises = () => (
    <Animated.View 
      style={[
        styles.section, 
        { 
          opacity: fadeAnim, 
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim }
          ] 
        }
      ]}
    >
      <View style={styles.exercisesHeader}>
        <View style={styles.exercisesHeaderLeft}>
          <View style={styles.exercisesIconContainer}>
            <Ionicons name="fitness-outline" size={24} color="#6366F1" />
          </View>
          <View>
            <Text style={styles.exercisesTitle}>Exercises</Text>
            <Text style={styles.exercisesCount}>
              {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => navigation.navigate('ExerciseSelection', { planId, trainerId })}
        >
          <LinearGradient
            colors={['#667EEA', '#764BA2']}
            style={styles.addExerciseGradient}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.exercisesList}>
        {exercises.length > 0 ? (
          exercises.map((exercise, index) => (
            <View key={exercise.planExerciseId || index} style={styles.exerciseCard}>
              <LinearGradient 
                colors={['#FFFFFF', '#FAFBFC']} 
                style={styles.exerciseCardGradient}
              >
                <TouchableOpacity 
                  onPress={() => toggleExerciseDetails(exercise.planExerciseId)}
                  style={styles.exerciseHeader}
                >
                  <View style={styles.exerciseHeaderLeft}>
                    <View style={styles.exerciseNumber}>
                      <Text style={styles.exerciseNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>
                        {exercise.exerciseName || 'Unnamed Exercise'}
                      </Text>
                      <View style={styles.exerciseStats}>
                        <View style={styles.statItem}>
                          <Ionicons name="repeat-outline" size={14} color="#10B981" />
                          <Text style={styles.statText}>{exercise.sets || 0} sets</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="fitness-outline" size={14} color="#3B82F6" />
                          <Text style={styles.statText}>{exercise.reps || 0} reps</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Ionicons name="time-outline" size={14} color="#F59E0B" />
                          <Text style={styles.statText}>{exercise.restTimeSeconds || 0}s rest</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Animated.View
                    style={{
                      transform: [{
                        rotate: expandedExercise === exercise.planExerciseId ? '180deg' : '0deg'
                      }]
                    }}
                  >
                    <Ionicons name="chevron-down" size={20} color="#6366F1" />
                  </Animated.View>
                </TouchableOpacity>

                {expandedExercise === exercise.planExerciseId && (
                  <View style={styles.exerciseDetails}>
                    <View style={styles.exerciseDetailsContent}>
                      <View style={styles.detailsGrid}>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailItemLabel}>Duration</Text>
                          <Text style={styles.detailItemValue}>
                            {formatDuration(exercise.durationMinutes)}
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <Text style={styles.detailItemLabel}>Exercise ID</Text>
                          <Text style={styles.detailItemValue}>
                            #{exercise.exerciseId || 'N/A'}
                          </Text>
                        </View>
                      </View>
                      
                      {exercise.notes && (
                        <View style={styles.notesSection}>
                          <Text style={styles.notesLabel}>Notes:</Text>
                          <Text style={styles.notesText}>{exercise.notes}</Text>
                        </View>
                      )}
                      
                      {renderExerciseMedia(exercise)}
                    </View>
                    
                    <View style={styles.exerciseActions}>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteExercise(exercise.planExerciseId)}
                      >
                        <LinearGradient
                          colors={['#FEE2E2', '#FECACA']}
                          style={styles.deleteButtonGradient}
                        >
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                          <Text style={styles.deleteButtonText}>Remove</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </LinearGradient>
            </View>
          ))
        ) : (
          <View style={styles.emptyExercisesCard}>
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFC']}
              style={styles.emptyExercisesGradient}
            >
              <View style={styles.emptyExercisesIconContainer}>
                <LinearGradient
                  colors={['#F1F5F9', '#E2E8F0']}
                  style={styles.emptyExercisesIconGradient}
                >
                  <Ionicons name="fitness-outline" size={48} color="#94A3B8" />
                </LinearGradient>
              </View>
              <Text style={styles.emptyExercisesTitle}>No Exercises Added</Text>
              <Text style={styles.emptyExercisesText}>
                Start building this workout plan by adding exercises.
              </Text>
              <TouchableOpacity
                style={styles.addFirstExerciseButton}
                onPress={() => navigation.navigate('ExerciseSelection', { planId, trainerId })}
              >
                <Text style={styles.addFirstExerciseText}>Add First Exercise</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      </View>
    </Animated.View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor="#667EEA" />
        <View style={styles.loaderContainer}>
          <View style={styles.loaderContent}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loaderTitle}>Loading Workout Plan</Text>
            <Text style={styles.loaderText}>Please wait while we fetch the details...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#667EEA" />
      {renderHeader()}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderWorkoutPlan()}
        {!error && renderExercises()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  
  // Header Styles
  headerContainer: {
    zIndex: 1000,
  },
  header: {
    paddingVertical: 20,
    paddingTop: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textAlign: 'center',
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll Content
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },

  // Section Styles
  section: { 
    marginBottom: 24 
  },

  // Plan Card Styles
  planCard: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
    overflow: 'hidden',
  },
  planCardGradient: { 
    padding: 24,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  planIconContainer: {
    marginRight: 16,
  },
  planIconGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planTitleContainer: {
    flex: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  planDetails: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
    lineHeight: 20,
  },

  // Error Card Styles
  errorCard: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  errorGradient: {
    alignItems: 'center',
    padding: 32,
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#991B1B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  backActionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  backActionText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
  },

  // Exercises Section
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  exercisesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exercisesIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exercisesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  exercisesCount: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  addExerciseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addExerciseGradient: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Exercise Card Styles
  exercisesList: {
    gap: 16,
  },
  exerciseCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  exerciseCardGradient: {
    padding: 20,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  exerciseNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exerciseNumberText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 4,
  },

  // Exercise Details
  exerciseDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  exerciseDetailsContent: {
    marginBottom: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
  },
  detailItemLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  detailItemValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  notesSection: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  notesLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 20,
  },

  // Media Styles
  mediaSection: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  exerciseImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 6,
  },
  videoContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  exerciseVideo: {
    width: '100%',
    height: 200,
  },
  noMediaContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  noMediaGradient: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMediaText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 8,
  },

  // Exercise Actions
  exerciseActions: {
    alignItems: 'flex-end',
  },
  deleteButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Empty States
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyExercisesCard: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  emptyExercisesGradient: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  emptyExercisesIconContainer: {
    marginBottom: 20,
  },
  emptyExercisesIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyExercisesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyExercisesText: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  addFirstExerciseButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addFirstExerciseText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Loading Styles
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loaderContent: {
    alignItems: 'center',
    padding: 40,
  },
  loaderTitle: {
    fontSize: 20,
    color: '#1E293B',
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
  },
  loaderText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
});

export default WorkoutPlanDetails;