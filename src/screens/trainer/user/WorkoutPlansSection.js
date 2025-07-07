import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  ActivityIndicator,
  Dimensions,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from 'context/AuthContext';
import { trainerService } from 'services/apiTrainerService';

const { width: screenWidth } = Dimensions.get('window');

const WorkoutPlansSection = ({ userId, subscriptions, trainerId }) => {
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user?.userId) {
      Alert.alert('Error', 'Trainer ID is not available.');
      return;
    }

    // Entrance animations
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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    fetchWorkoutPlans();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.95);
    };
  }, [user?.userId]);

  const fetchWorkoutPlans = async () => {
    setLoading(true);
    try {
      const queryParams = { pageNumber: 1, pageSize: 10 };
      const response = await trainerService.getWorkoutPlansByTrainerId(trainerId, queryParams);
      
      if (response?.data?.plans) {
        const filteredPlans = response.data.plans.filter(plan => plan.userId === userId);
        // Sort plans: Active first, then Inactive
        const sortedPlans = filteredPlans.sort((a, b) => {
          if (a.status.toLowerCase() === 'active' && b.status.toLowerCase() !== 'active') return -1;
          if (a.status.toLowerCase() !== 'active' && b.status.toLowerCase() === 'active') return 1;
          return 0;
        });
        setWorkoutPlans(sortedPlans);
      } else {
        throw new Error('No workout plans found.');
      }
    } catch (error) {
      console.error('Fetch Workout Plans Error:', error);
      const message = error.response?.data?.message || 'Failed to fetch workout plans.';
      Alert.alert('Error', message);
      setWorkoutPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = () => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    
    Animated.parallel([
      Animated.timing(expandAnim, {
        toValue,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue: expanded ? 0 : 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePlanPress = (plan) => {
    if (!plan?.planId || !userId || !user?.userId) {
      Alert.alert('Error', 'Invalid parameters for workout plan.');
      return;
    }
    
    navigation.navigate('WorkoutPlanDetails', {
      planId: plan.planId,
      userId,
      subscriptionId: subscriptions[0]?.subscriptionId,
      trainerId: user.userId,
    });
  };

  const handleCreatePlan = () => {
    if (!subscriptions.length) {
      Alert.alert('Error', 'No active subscriptions to create a workout plan.');
      return;
    }
    
    navigation.navigate('CreateWorkoutPlan', {
      userId,
      subscriptionId: subscriptions[0].subscriptionId,
      trainerId: user.userId,
    });
  };

  const handleEditPlan = (plan) => {
    if (!plan?.planId || !userId || !user?.userId) {
      Alert.alert('Error', 'Invalid parameters for editing workout plan.');
      return;
    }
    
    navigation.navigate('EditWorkoutPlan', {
      planId: plan.planId,
      userId,
      subscriptionId: subscriptions[0]?.subscriptionId,
      trainerId: user.userId,
      planData: plan,
    });
  };

  const handleToggleStatus = (plan, newValue) => {
    const newStatus = newValue ? 'Active' : 'Inactive';
    Alert.alert(
      'Confirm Status Change',
      `Are you sure you want to change this plan to ${newStatus}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              await trainerService.updateWorkoutPlan(plan.planId, {
                ...plan,
                status: newStatus,
              });
              Alert.alert('Success', `Workout plan status changed to ${newStatus}.`);
              await fetchWorkoutPlans(); // Refresh and re-sort the list
            } catch (error) {
              console.error('Update Workout Plan Status Error:', error);
              const message = error.message || 'Failed to update workout plan status.';
              Alert.alert('Error', message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderSectionHeader = () => (
    <TouchableOpacity
      style={[styles.sectionHeader, expanded && styles.sectionHeaderExpanded]}
      onPress={toggleSection}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={expanded ? ['#667EEA', '#764BA2'] : ['#FFFFFF', '#F8FAFC']}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.sectionHeaderLeft}>
          <View style={[styles.sectionIcon, expanded && styles.sectionIconExpanded]}>
            <LinearGradient
              colors={expanded ? ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)'] : ['#EEF2FF', '#E0E7FF']}
              style={styles.iconGradient}
            >
              <Ionicons
                name="barbell-outline"
                size={20}
                color={expanded ? '#FFFFFF' : '#6366F1'}
              />
            </LinearGradient>
          </View>
          <View style={styles.sectionTitleContainer}>
            <Text style={[styles.sectionTitle, expanded && styles.sectionTitleExpanded]}>
              Workout Plans
            </Text>
            <View style={styles.countContainer}>
              <View style={[styles.countBadge, expanded && styles.countBadgeExpanded]}>
                <Text style={[styles.sectionCount, expanded && styles.sectionCountExpanded]}>
                  {workoutPlans.length} {workoutPlans.length === 1 ? 'plan' : 'plans'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Animated.View
          style={{
            transform: [{
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              }),
            }],
          }}
        >
          <Ionicons
            name="chevron-down"
            size={20}
            color={expanded ? '#FFFFFF' : '#6366F1'}
          />
        </Animated.View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { bg: '#D1FAE5', dot: '#10B981', text: '#065F46' };
      case 'completed':
        return { bg: '#DBEAFE', dot: '#3B82F6', text: '#1E40AF' };
      case 'paused':
        return { bg: '#FEF3C7', dot: '#F59E0B', text: '#92400E' };
      case 'inactive':
        return { bg: '#E2E8F0', dot: '#64748B', text: '#475569' };
      default:
        return { bg: '#E2E8F0', dot: '#64748B', text: '#475569' };
    }
  };

  const renderWorkoutPlan = (plan, index) => {
    const statusColors = getStatusColor(plan.status);
    
    return (
      <Animated.View
        key={plan.planId}
        style={[
          styles.card,
          {
            opacity: expandAnim,
            transform: [
              {
                translateY: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
              {
                scale: expandAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => handlePlanPress(plan)}
          activeOpacity={0.9}
          style={styles.cardTouchable}
        >
          <LinearGradient 
            colors={['#FFFFFF', '#FAFBFC']} 
            style={styles.cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {plan.planName || 'Unnamed Plan'}
                </Text>
                <Switch
                  trackColor={{ false: '#E2E8F0', true: '#D1FAE5' }}
                  thumbColor={plan.status.toLowerCase() === 'active' ? '#10B981' : '#64748B'}
                  ios_backgroundColor="#E2E8F0"
                  onValueChange={(value) => handleToggleStatus(plan, value)}
                  value={plan.status.toLowerCase() === 'active'}
                  style={styles.statusSwitch}
                />
              </View>
              <View style={styles.planDetails}>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: statusColors.dot }]} />
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {plan.status || 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={14} color="#10B981" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>Start:</Text>
                  <Text style={styles.detailText}>
                    {plan.startDate ? new Date(plan.startDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="flag-outline" size={14} color="#EF4444" style={styles.detailIcon} />
                  <Text style={styles.detailLabel}>End:</Text>
                  <Text style={styles.detailText}>
                    {plan.endDate ? new Date(plan.endDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditPlan(plan)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#E0E7FF', '#C7D2FE']}
                    style={styles.actionButtonGradient}
                  >
                    <Ionicons name="pencil" size={14} color="#6366F1" />
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => handlePlanPress(plan)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#EEF2FF', '#E0E7FF']}
                    style={styles.actionButtonGradient}
                  >
                    <Text style={styles.actionButtonText}>View Details</Text>
                    <Ionicons name="arrow-forward" size={14} color="#6366F1" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCreateButton = () => (
    <TouchableOpacity
      style={styles.createButton}
      onPress={handleCreatePlan}
      activeOpacity={0.9}
    >
      <LinearGradient 
        colors={['#667EEA', '#764BA2']} 
        style={styles.createButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.createButtonContent}>
          <Ionicons name="add-circle" size={20} color="#FFFFFF" style={styles.createIcon} />
          <View style={styles.createTextContainer}>
            <Text style={styles.createButtonTitle}>Create New Workout Plan</Text>
            <Text style={styles.createButtonSubtitle}>Design a custom training program</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderNoSubscriptionCard = () => (
    <View style={styles.noSubscriptionCard}>
      <LinearGradient
        colors={['#FEF3C7', '#FDE68A']}
        style={styles.noSubscriptionGradient}
      >
        <Ionicons name="alert-circle-outline" size={24} color="#D97706" style={styles.warningIcon} />
        <View style={styles.noSubscriptionContent}>
          <Text style={styles.noSubscriptionTitle}>No Active Subscriptions</Text>
          <Text style={styles.noSubscriptionText}>
            An active subscription is required to create workout plans.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingTitle}>Loading Workout Plans</Text>
        <Text style={styles.loadingText}>Please wait...</Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateCard}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.emptyStateGradient}
      >
        <View style={styles.emptyIconContainer}>
          <LinearGradient
            colors={['#F1F5F9', '#E2E8F0']}
            style={styles.emptyIconGradient}
          >
            <Ionicons name="barbell-outline" size={40} color="#94A3B8" />
          </LinearGradient>
        </View>
        <Text style={styles.emptyStateTitle}>No Workout Plans Yet</Text>
        <Text style={styles.emptyStateText}>
          Create a workout plan to start designing custom training programs.
        </Text>
        {subscriptions.length > 0 && (
          <TouchableOpacity
            style={styles.emptyActionButton}
            onPress={handleCreatePlan}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyActionText}>Create First Plan</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

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
      {renderSectionHeader()}
      
      <Animated.View
        style={[
          styles.sectionContent,
          {
            maxHeight: expandAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 2000],
            }),
            opacity: expandAnim,
          },
        ]}
      >
        {subscriptions.length > 0 ? renderCreateButton() : renderNoSubscriptionCard()}
        {loading && renderLoadingState()}
        {!loading && workoutPlans.length > 0 && (
          <View style={styles.plansContainer}>
            {workoutPlans.map((plan, index) => renderWorkoutPlan(plan, index))}
          </View>
        )}
        {!loading && workoutPlans.length === 0 && renderEmptyState()}
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  iconGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  sectionTitleExpanded: {
    color: '#FFFFFF',
  },
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countBadgeExpanded: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sectionCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sectionCountExpanded: {
    color: 'rgba(255,255,255,0.9)',
  },
  sectionContent: {
    overflow: 'hidden',
  },
  createButton: {
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  createButtonGradient: {
    padding: 16,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createIcon: {
    marginRight: 12,
  },
  createTextContainer: {
    flex: 1,
  },
  createButtonTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 2,
  },
  createButtonSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  noSubscriptionCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  noSubscriptionGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 12,
  },
  noSubscriptionContent: {
    flex: 1,
  },
  noSubscriptionTitle: {
    fontSize: 15,
    color: '#92400E',
    fontWeight: '700',
    marginBottom: 2,
  },
  noSubscriptionText: {
    fontSize: 13,
    color: '#A16207',
    fontWeight: '500',
    lineHeight: 18,
  },
  loadingContainer: {
    paddingVertical: 32,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingTitle: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  plansContainer: {
    gap: 12,
  },
  card: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  cardTouchable: {
    borderRadius: 16,
  },
  cardGradient: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'column',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    lineHeight: 22,
  },
  statusSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  planDetails: {
    marginBottom: 12,
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 6,
    minWidth: 30,
  },
  detailText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    borderRadius: 10,
    overflow: 'hidden',
    flex: 1,
  },
  viewButton: {
    borderRadius: 10,
    overflow: 'hidden',
    flex: 1,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    color: '#6366F1',
    fontWeight: '600',
  },
  emptyStateCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  emptyStateGradient: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconContainer: {
    marginBottom: 16,
  },
  emptyIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyActionButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  emptyActionText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default WorkoutPlansSection;