import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { apiReminderService } from 'services/apiReminderService';

const TYPE_CONFIG = {
  drink: {
    icon: 'water',
    color: '#222',
    gradient: ['#fff', '#fff'],
    label: 'Water Reminder',
    bgColor: '#fff',
  },
  meal: {
    icon: 'restaurant',
    color: '#222',
    gradient: ['#fff', '#fff'],
    label: 'Meal Reminder',
    bgColor: '#fff',
  },
  exercise: {
    icon: 'fitness',
    color: '#222',
    gradient: ['#fff', '#fff'],
    label: 'Exercise Reminder',
    bgColor: '#fff',
  },
  sleep: {
    icon: 'moon',
    color: '#222',
    gradient: ['#fff', '#fff'],
    label: 'Sleep Reminder',
    bgColor: '#fff',
  },
};

export default function ReminderPlanDetailScreen({ route }) {
  const { planId } = route.params;
  const navigation = useNavigation();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiReminderService.getReminderPlanById(planId);
      setPlan(res?.data || null);
    } catch (err) {
      setError(err.message || 'Failed to load plan details');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    if (!plan) return;
    
    setUpdating(true);
    try {
      const updatedPlan = { ...plan, isActive: !plan.isActive };
      await apiReminderService.updateReminderPlan(plan.planId, updatedPlan);
      setPlan(updatedPlan);
      
      Alert.alert(
        'Success',
        `Reminder ${updatedPlan.isActive ? 'enabled' : 'disabled'} successfully!`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to update reminder. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditReminderPlanScreen', { planId: plan.planId });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiReminderService.deleteReminderPlan(plan.planId);
              Alert.alert('Success', 'Reminder deleted successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete reminder. Please try again.');
            }
          }
        }
      ]
    );
  };

  const getTypeConfig = (type) => {
    return TYPE_CONFIG[type] || {
      icon: 'notifications',
      color: '#6B7280',
      gradient: ['#6B7280', '#9CA3AF'],
      label: 'Reminder',
      bgColor: '#F9FAFB',
    };
  };

  const formatDaysOfWeek = (daysString) => {
    if (!daysString) return 'Not specified';
    
    const days = daysString.split(',').map(day => day.trim());
    const dayNames = {
      'Mon': 'Monday',
      'Tue': 'Tuesday', 
      'Wed': 'Wednesday',
      'Thu': 'Thursday',
      'Fri': 'Friday',
      'Sat': 'Saturday',
      'Sun': 'Sunday'
    };
    
    return days.map(day => dayNames[day] || day).join(', ');
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Not specified';
    
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const renderHeader = () => {
    if (!plan) return null;
    const typeConfig = getTypeConfig(plan.type);
    return (
      <SafeAreaView edges={['top']}>
        <View style={[styles.headerGradient, { backgroundColor: '#FFFFFF' }]}> 
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#222" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: '#1F2937' }]}>Reminder Details</Text>
              <Text style={[styles.headerSubtitle, { color: '#64748B' }]}>{typeConfig.label}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
            >
              <Ionicons name="create" size={20} color="#222" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  };

  const renderReminderCard = () => {
    if (!plan) return null;
    const typeConfig = getTypeConfig(plan.type);
    return (
      <View style={styles.reminderCard}>
        <View style={[styles.reminderCardHeader, { backgroundColor: '#fff' }]}> 
          <View style={styles.reminderIconContainer}>
            <Ionicons name={typeConfig.icon} size={32} color="#222" />
          </View>
          <View style={styles.reminderHeaderInfo}>
            <Text style={[styles.reminderTitle, { color: '#222' }]}>{plan.title}</Text>
            <Text style={[styles.reminderSubtitle, { color: '#222' }]}>{typeConfig.label}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[ 
              styles.statusBadge,
              { backgroundColor: plan.isActive ? '#10B981' : '#EF4444' }
            ]}>
              <Text style={styles.statusText}>
                {plan.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderDetailSection = (title, children) => (
    <View style={styles.detailSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderDetailItem = (icon, label, value, color = '#1F2937') => (
    <View style={styles.detailItem}>
      <View style={styles.detailItemLeft}>
        <View style={[styles.detailIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value || 'Not specified'}</Text>
    </View>
  );

  const renderToggleSection = () => (
    <View style={styles.toggleSection}>
      <View style={styles.toggleContainer}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>Enable Reminder</Text>
          <Text style={styles.toggleDescription}>
            {plan.isActive 
              ? 'This reminder is currently active and will send notifications'
              : 'This reminder is disabled and will not send notifications'
            }
          </Text>
        </View>
        <Switch
          value={plan.isActive}
          onValueChange={handleToggleActive}
          disabled={updating}
          trackColor={{ false: '#E5E7EB', true: '#10B981' }}
          thumbColor={plan.isActive ? '#FFFFFF' : '#F3F4F6'}
          ios_backgroundColor="#E5E7EB"
          style={styles.toggle}
        />
      </View>
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={styles.editActionButton}
        onPress={handleEdit}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4F46E5', '#6366F1']}
          style={styles.editActionButtonGradient}
        >
          <Ionicons name="create" size={20} color="#FFFFFF" />
          <Text style={styles.editActionButtonText}>Edit Reminder</Text>
        </LinearGradient>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.deleteActionButton}
        onPress={handleDelete}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={20} color="#EF4444" />
        <Text style={styles.deleteActionButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading reminder details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchPlan}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons name="document-outline" size={64} color="#CBD5E1" />
          <Text style={styles.errorTitle}>Reminder Not Found</Text>
          <Text style={styles.errorText}>The reminder you're looking for doesn't exist.</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const typeConfig = getTypeConfig(plan.type);

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderReminderCard()}
        
        {renderDetailSection('Schedule Information', (
          <>
            {renderDetailItem('time', 'Time', formatTime(plan.time), typeConfig.color)}
            {renderDetailItem('repeat', 'Frequency', plan.frequency, typeConfig.color)}
            {renderDetailItem('calendar', 'Days of Week', formatDaysOfWeek(plan.daysOfWeek), typeConfig.color)}
          </>
        ))}
        
        {plan.amount && renderDetailSection('Amount/Duration', (
          renderDetailItem('speedometer', 'Amount', plan.amount, typeConfig.color)
        ))}
        
        {plan.notes && renderDetailSection('Additional Notes', (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{plan.notes}</Text>
          </View>
        ))}
        
        {renderToggleSection()}
        {renderActionButtons()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  reminderCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  reminderCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  reminderIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reminderHeaderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reminderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionContent: {
    padding: 20,
    paddingTop: 0,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'right',
    flex: 1,
  },
  notesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  toggleSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  toggle: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editActionButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  editActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  editActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FEE2E2',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  deleteActionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});