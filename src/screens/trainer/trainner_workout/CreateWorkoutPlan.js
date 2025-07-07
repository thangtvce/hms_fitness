import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const CreateWorkoutPlan = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { userId, subscriptionId } = route.params;
  
  const [formData, setFormData] = useState({
    userId: userId || '',
    trainerId: user?.userId || '',
    subscriptionId: subscriptionId || '',
    planName: '',
    description: '',
    startDate: new Date(),
    endDate: (() => {
      const end = new Date();
      end.setDate(end.getDate() + 30);
      return end;
    })(),
    frequencyPerWeek: '',
    durationMinutes: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [datePickerType, setDatePickerType] = useState('start'); // 'start' or 'end'
  const [tempDate, setTempDate] = useState(new Date());
  const [focusedInput, setFocusedInput] = useState(null);
  
  // Enhanced animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Enhanced entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.95);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('Trainer') && !user?.roles?.includes('Admin')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers or admins.');
      navigation.goBack();
      return;
    }

    setFormData((prev) => ({
      ...prev,
      userId: userId || '',
      trainerId: user?.userId || '',
      subscriptionId: subscriptionId || '',
    }));
  }, [authLoading, user, userId, subscriptionId]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.planName.trim()) {
      Alert.alert('Validation Error', 'Plan name is required.');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Validation Error', 'Description is required.');
      return false;
    }
    if (!formData.frequencyPerWeek || formData.frequencyPerWeek < 1 || formData.frequencyPerWeek > 7) {
      Alert.alert('Validation Error', 'Frequency per week must be between 1 and 7.');
      return false;
    }
    if (!formData.durationMinutes || formData.durationMinutes < 1) {
      Alert.alert('Validation Error', 'Duration in minutes must be a positive number.');
      return false;
    }
    if (formData.startDate >= formData.endDate) {
      Alert.alert('Validation Error', 'End date must be after start date.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        userId: parseInt(formData.userId),
        trainerId: parseInt(formData.trainerId),
        subscriptionId: parseInt(formData.subscriptionId),
        planName: formData.planName,
        description: formData.description,
        startDate: formData.startDate.toISOString().split('T')[0],
        endDate: formData.endDate.toISOString().split('T')[0],
        frequencyPerWeek: parseInt(formData.frequencyPerWeek),
        durationMinutes: parseInt(formData.durationMinutes),
      };

      const response = await trainerService.createWorkoutPlan(payload);
      if (response.statusCode === 200 || response.statusCode === 201) {
        Alert.alert('Success', 'Workout plan created successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error('Failed to create workout plan.');
      }
    } catch (error) {
      console.error('Create Workout Plan Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while creating the workout plan.');
    } finally {
      setLoading(false);
    }
  };

  const openDatePicker = (type) => {
    setDatePickerType(type);
    setTempDate(type === 'start' ? formData.startDate : formData.endDate);
    setShowDateModal(true);
    
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDatePicker = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowDateModal(false);
    });
  };

  const confirmDateSelection = () => {
    if (datePickerType === 'start') {
      handleInputChange('startDate', tempDate);
      // Auto-adjust end date if it's before the new start date
      if (tempDate >= formData.endDate) {
        const newEndDate = new Date(tempDate);
        newEndDate.setDate(newEndDate.getDate() + 30);
        handleInputChange('endDate', newEndDate);
      }
    } else {
      handleInputChange('endDate', tempDate);
    }
    closeDatePicker();
  };

  const formatDate = (date) => {
    if (!date) return 'Select Date';
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: '2-digit', 
      year: 'numeric' 
    });
  };

  const formatDateShort = (date) => {
    if (!date) return 'Select';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit'
    });
  };

  const getDaysDifference = () => {
    const diffTime = Math.abs(formData.endDate - formData.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getFrequencyOptions = () => [
    { value: '1', label: '1x per week', icon: 'calendar-outline' },
    { value: '2', label: '2x per week', icon: 'calendar-outline' },
    { value: '3', label: '3x per week', icon: 'calendar-outline' },
    { value: '4', label: '4x per week', icon: 'calendar-outline' },
    { value: '5', label: '5x per week', icon: 'calendar-outline' },
    { value: '6', label: '6x per week', icon: 'calendar-outline' },
    { value: '7', label: 'Daily', icon: 'calendar' },
  ];

  const getDurationOptions = () => [
    { value: '30', label: '30 minutes', icon: 'time-outline' },
    { value: '45', label: '45 minutes', icon: 'time-outline' },
    { value: '60', label: '1 hour', icon: 'time-outline' },
    { value: '90', label: '1.5 hours', icon: 'time-outline' },
    { value: '120', label: '2 hours', icon: 'time-outline' },
  ];

  const renderHeader = () => (
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
          <Text style={styles.headerTitle}>Create Workout Plan</Text>
          <Text style={styles.headerSubtitle}>Design a personalized training program</Text>
        </View>
        <View style={styles.headerActionButtonPlaceholder} />
      </View>
    </LinearGradient>
  );

  const renderModernDatePicker = () => (
    <Modal
      visible={showDateModal}
      transparent
      animationType="none"
      onRequestClose={closeDatePicker}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.dateModalContainer,
            {
              opacity: modalAnim,
              transform: [
                {
                  scale: modalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.dateModalContent}
          >
            <View style={styles.dateModalHeader}>
              <Text style={styles.dateModalTitle}>
                Select {datePickerType === 'start' ? 'Start' : 'End'} Date
              </Text>
              <TouchableOpacity onPress={closeDatePicker} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTempDate(selectedDate);
                  }
                }}
                minimumDate={datePickerType === 'start' ? new Date() : formData.startDate}
                style={styles.datePicker}
              />
            </View>

            <View style={styles.dateModalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeDatePicker}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmDateSelection}
              >
                <LinearGradient
                  colors={['#667EEA', '#764BA2']}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );

  const renderInput = (label, value, onChangeText, placeholder, options = {}) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputWrapper,
        focusedInput === label && styles.inputWrapperFocused
      ]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocusedInput(label)}
          onBlur={() => setFocusedInput(null)}
          placeholderTextColor="#94A3B8"
          {...options}
        />
      </View>
    </View>
  );

  const renderDateSelector = (label, date, onPress, type) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => onPress(type)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.dateSelectorGradient}
        >
          <View style={styles.dateSelectorLeft}>
            <View style={styles.dateIconContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6366F1" />
            </View>
            <View style={styles.dateTextContainer}>
              <Text style={styles.dateText}>{formatDate(date)}</Text>
              <Text style={styles.dateSubText}>
                {type === 'start' ? 'Training begins' : 'Training ends'}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderQuickOptions = (label, options, selectedValue, onSelect) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickOptionsContainer}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.quickOption,
              selectedValue === option.value && styles.quickOptionSelected
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedValue === option.value 
                ? ['#667EEA', '#764BA2'] 
                : ['#F8FAFC', '#F1F5F9']
              }
              style={styles.quickOptionGradient}
            >
              <Ionicons 
                name={option.icon} 
                size={18} 
                color={selectedValue === option.value ? '#FFFFFF' : '#6366F1'} 
              />
              <Text style={[
                styles.quickOptionText,
                selectedValue === option.value && styles.quickOptionTextSelected
              ]}>
                {option.label}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPlanSummary = () => (
    <View style={styles.summaryCard}>
      <LinearGradient
        colors={['#EEF2FF', '#E0E7FF']}
        style={styles.summaryGradient}
      >
        <View style={styles.summaryHeader}>
          <Ionicons name="information-circle-outline" size={24} color="#6366F1" />
          <Text style={styles.summaryTitle}>Plan Summary</Text>
        </View>
        <View style={styles.summaryContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration:</Text>
            <Text style={styles.summaryValue}>{getDaysDifference()} days</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Sessions:</Text>
            <Text style={styles.summaryValue}>
              {formData.frequencyPerWeek ? 
                Math.ceil((getDaysDifference() / 7) * parseInt(formData.frequencyPerWeek)) : 
                'N/A'
              }
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Hours:</Text>
            <Text style={styles.summaryValue}>
              {formData.durationMinutes && formData.frequencyPerWeek ? 
                Math.ceil(((getDaysDifference() / 7) * parseInt(formData.frequencyPerWeek) * parseInt(formData.durationMinutes)) / 60) : 
                'N/A'
              } hours
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#667EEA" />
      {renderHeader()}
      
      <Animated.View
        style={[
          styles.formContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ],
          },
        ]}
      >
        <ScrollView 
          contentContainerStyle={styles.formContent} 
          showsVerticalScrollIndicator={false}
        >
          {renderInput(
            'Plan Name',
            formData.planName,
            (text) => handleInputChange('planName', text),
            'Enter a descriptive plan name'
          )}

          {renderInput(
            'Description',
            formData.description,
            (text) => handleInputChange('description', text),
            'Describe the goals and focus of this plan',
            { multiline: true, numberOfLines: 4, style: styles.textArea }
          )}

          {renderDateSelector(
            'Start Date',
            formData.startDate,
            openDatePicker,
            'start'
          )}

          {renderDateSelector(
            'End Date',
            formData.endDate,
            openDatePicker,
            'end'
          )}

          {renderQuickOptions(
            'Training Frequency',
            getFrequencyOptions(),
            formData.frequencyPerWeek,
            (value) => handleInputChange('frequencyPerWeek', value)
          )}

          {renderQuickOptions(
            'Session Duration',
            getDurationOptions(),
            formData.durationMinutes,
            (value) => handleInputChange('durationMinutes', value)
          )}

          {(formData.frequencyPerWeek && formData.durationMinutes) && renderPlanSummary()}

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={loading ? ['#CBD5E1', '#CBD5E1'] : ['#667EEA', '#764BA2']}
              style={styles.submitButtonGradient}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Creating Plan...</Text>
                </View>
              ) : (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Create Workout Plan</Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {renderModernDatePicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  
  // Header Styles
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
    marginHorizontal: 16,
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
    marginTop: 4,
  },
  headerActionButtonPlaceholder: { 
    width: 44 
  },

  // Form Container
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginTop: -10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  formContent: {
    paddingBottom: 120,
  },

  // Input Styles
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  inputWrapper: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOpacity: 0.2,
  },
  input: {
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // Modern Date Selector
  dateSelector: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  dateSelectorGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  dateSubText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },

  // Quick Options
  quickOptionsContainer: {
    paddingRight: 20,
  },
  quickOption: {
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickOptionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 120,
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  quickOptionTextSelected: {
    color: '#FFFFFF',
  },

  // Summary Card
  summaryCard: {
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 12,
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '700',
  },

  // Submit Button
  submitButton: {
    borderRadius: 16,
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
    marginTop: 20,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 12,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },

  // Modern Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  dateModalContent: {
    padding: 24,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  dateModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  dateModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default CreateWorkoutPlan;