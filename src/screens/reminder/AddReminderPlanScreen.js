import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { apiReminderService } from 'services/apiReminderService';
import { useAuth } from 'context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const REMINDER_TYPES = [
  { 
    label: 'Drink Water', 
    value: 'drink', 
    icon: 'water',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0EA5E9'],
    description: 'Stay hydrated throughout the day'
  },
  { 
    label: 'Meal Time', 
    value: 'meal', 
    icon: 'restaurant',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#EAB308'],
    description: 'Never miss your meals'
  },
  { 
    label: 'Exercise', 
    value: 'exercise', 
    icon: 'fitness',
    color: '#10B981',
    gradient: ['#10B981', '#059669'],
    description: 'Keep your body active'
  },
  { 
    label: 'Sleep Time', 
    value: 'sleep', 
    icon: 'moon',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED'],
    description: 'Get quality rest'
  },
];

const FREQUENCIES = [
  { label: 'Daily', value: 'Daily', icon: 'today' },
  { label: 'Weekly', value: 'Weekly', icon: 'calendar' },
  { label: 'Monthly', value: 'Monthly', icon: 'calendar-outline' },
];

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 'Mon', fullName: 'Monday' },
  { label: 'Tue', value: 'Tue', fullName: 'Tuesday' },
  { label: 'Wed', value: 'Wed', fullName: 'Wednesday' },
  { label: 'Thu', value: 'Thu', fullName: 'Thursday' },
  { label: 'Fri', value: 'Fri', fullName: 'Friday' },
  { label: 'Sat', value: 'Sat', fullName: 'Saturday' },
  { label: 'Sun', value: 'Sun', fullName: 'Sunday' },
];

const QUICK_AMOUNTS = {
  drink: ['250ml', '500ml', '750ml', '1L'],
  meal: ['Breakfast', 'Lunch', 'Dinner', 'Snack'],
  exercise: ['15 min', '30 min', '45 min', '1 hour'],
  sleep: ['7 hours', '8 hours', '9 hours', 'Custom'],
};

export default function AddReminderPlanScreen({ navigation, route }) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    userId: '',
    title: '',
    type: '',
    amount: '',
    time: '',
    frequency: 'Daily',
    daysOfWeek: '',
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    if (user && user.userId) {
      setForm((prev) => ({ ...prev, userId: user.userId.toString() }));
    }
  }, [user]);

  const [errors, setErrors] = useState({});
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const h = selectedDate.getHours().toString().padStart(2, '0');
      const m = selectedDate.getMinutes().toString().padStart(2, '0');
      const s = selectedDate.getSeconds().toString().padStart(2, '0');
      handleChange('time', `${h}:${m}:${s}`);
    }
  };

  const handleToggleDay = (day) => {
    let days = form.daysOfWeek ? form.daysOfWeek.split(',') : [];
    if (days.includes(day)) {
      days = days.filter((d) => d !== day);
    } else {
      days.push(day);
    }
    handleChange('daysOfWeek', days.join(','));
  };

  const handleTypeSelect = (type) => {
    handleChange('type', type);
    // Auto-generate title based on type
    const typeData = REMINDER_TYPES.find(t => t.value === type);
    if (typeData && !form.title) {
      handleChange('title', typeData.label);
    }
    setCurrentStep(2);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.userId || isNaN(Number(form.userId)) || Number(form.userId) <= 0) {
      newErrors.userId = 'User ID is required and must be a positive integer.';
    }
    if (!form.title || form.title.length > 255) {
      newErrors.title = 'Title is required and must not exceed 255 characters.';
    }
    if (!form.type) {
      newErrors.type = 'Please select a reminder type.';
    }
    if (!form.time) {
      newErrors.time = 'Time is required.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const payload = {
        ...form,
        userId: Number(form.userId),
        isActive: !!form.isActive,
      };
      await apiReminderService.addReminderPlan(payload);
      Alert.alert('Success', 'Reminder plan created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.message) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to create reminder plan.');
      }
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            currentStep >= step && styles.stepCircleActive,
            currentStep > step && styles.stepCircleCompleted
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            ) : (
              <Text style={[
                styles.stepNumber,
                currentStep >= step && styles.stepNumberActive
              ]}>{step}</Text>
            )}
          </View>
          {step < 3 && (
            <View style={[
              styles.stepLine,
              currentStep > step && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderTypeSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What would you like to be reminded about?</Text>
      <Text style={styles.stepSubtitle}>Choose the type of reminder you want to create</Text>
      
      <View style={styles.typeGrid}>
        {REMINDER_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeCard,
              form.type === type.value && styles.typeCardSelected
            ]}
            onPress={() => handleTypeSelect(type.value)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={form.type === type.value ? type.gradient : ['#FFFFFF', '#F8FAFC']}
              style={styles.typeCardGradient}
            >
              <View style={[
                styles.typeIconContainer,
                { backgroundColor: form.type === type.value ? 'rgba(255,255,255,0.2)' : `${type.color}15` }
              ]}>
                <Ionicons 
                  name={type.icon} 
                  size={32} 
                  color={form.type === type.value ? '#FFFFFF' : type.color} 
                />
              </View>
              <Text style={[
                styles.typeLabel,
                { color: form.type === type.value ? '#FFFFFF' : '#1F2937' }
              ]}>
                {type.label}
              </Text>
              <Text style={[
                styles.typeDescription,
                { color: form.type === type.value ? 'rgba(255,255,255,0.8)' : '#6B7280' }
              ]}>
                {type.description}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDetailsForm = () => {
    const selectedType = REMINDER_TYPES.find(t => t.value === form.type);
    
    return (
      <View style={styles.stepContent}>
        <View style={styles.selectedTypeHeader}>
          <LinearGradient colors={selectedType.gradient} style={styles.selectedTypeIcon}>
            <Ionicons name={selectedType.icon} size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={styles.selectedTypeInfo}>
            <Text style={styles.selectedTypeLabel}>{selectedType.label}</Text>
            <Text style={styles.selectedTypeDesc}>{selectedType.description}</Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Reminder Details</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={[styles.modernInput, errors.title && styles.inputError]}
              value={form.title}
              onChangeText={(v) => handleChange('title', v)}
              placeholder={`${selectedType.label} reminder`}
              maxLength={255}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {QUICK_AMOUNTS[form.type] && (
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount/Duration</Text>
              <View style={styles.quickAmountGrid}>
                {QUICK_AMOUNTS[form.type].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.quickAmountChip,
                      form.amount === amount && styles.quickAmountChipSelected
                    ]}
                    onPress={() => handleChange('amount', amount)}
                  >
                    <Text style={[
                      styles.quickAmountText,
                      form.amount === amount && styles.quickAmountTextSelected
                    ]}>
                      {amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.modernInput, { marginTop: 8 }]}
                value={form.amount}
                onChangeText={(v) => handleChange('amount', v)}
                placeholder="Or enter custom amount"
                maxLength={100}
              />
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={[styles.modernInput, styles.timeInput]}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={[
                styles.timeText,
                { color: form.time ? '#1F2937' : '#9CA3AF' }
              ]}>
                {form.time ? form.time.slice(0, 5) : 'Select time'}
              </Text>
            </TouchableOpacity>
            {showTimePicker && (
              <DateTimePicker
                value={form.time ? new Date(`1970-01-01T${form.time}`) : new Date()}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
              />
            )}
            {errors.time && <Text style={styles.errorText}>{errors.time}</Text>}
          </View>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(1)}
          >
            <Ionicons name="arrow-back" size={20} color="#6B7280" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setCurrentStep(3)}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderScheduleSettings = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>When should we remind you?</Text>
      <Text style={styles.stepSubtitle}>Set up your reminder schedule</Text>

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Frequency</Text>
        <View style={styles.frequencyGrid}>
          {FREQUENCIES.map((freq) => (
            <TouchableOpacity
              key={freq.value}
              style={[
                styles.frequencyCard,
                form.frequency === freq.value && styles.frequencyCardSelected
              ]}
              onPress={() => handleChange('frequency', freq.value)}
            >
              <Ionicons 
                name={freq.icon} 
                size={24} 
                color={form.frequency === freq.value ? '#06B6D4' : '#6B7280'} 
              />
              <Text style={[
                styles.frequencyText,
                form.frequency === freq.value && styles.frequencyTextSelected
              ]}>
                {freq.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {(form.frequency === 'Weekly' || form.frequency === 'Daily') && (
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Days of Week</Text>
          <View style={styles.daysGrid}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                key={day.value}
                style={[
                  styles.dayChip,
                  form.daysOfWeek.split(',').includes(day.value) && styles.dayChipSelected
                ]}
                onPress={() => handleToggleDay(day.value)}
              >
                <Text style={[
                  styles.dayText,
                  form.daysOfWeek.split(',').includes(day.value) && styles.dayTextSelected
                ]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.formSection}>
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <TextInput
          style={[styles.modernInput, styles.notesInput]}
          value={form.notes}
          onChangeText={(v) => handleChange('notes', v)}
          placeholder="Add any additional notes or instructions..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formSection}>
        <View style={styles.activeToggle}>
          <View>
            <Text style={styles.sectionTitle}>Enable Reminder</Text>
            <Text style={styles.toggleDescription}>Turn on to activate this reminder</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, form.isActive && styles.toggleActive]}
            onPress={() => handleChange('isActive', !form.isActive)}
          >
            <View style={[styles.toggleThumb, form.isActive && styles.toggleThumbActive]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.navigationButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setCurrentStep(2)}
        >
          <Ionicons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleSubmit}
        >
          <LinearGradient colors={['#06B6D4', '#0EA5E9']} style={styles.createButtonGradient}>
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Create Reminder</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Reminder</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderStepIndicator()}

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {currentStep === 1 && renderTypeSelection()}
        {currentStep === 2 && renderDetailsForm()}
        {currentStep === 3 && renderScheduleSettings()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop:50,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#06B6D4',
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#10B981',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  typeGrid: {
    gap: 16,
  },
  typeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  typeCardSelected: {
    transform: [{ scale: 1.02 }],
  },
  typeCardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  typeDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectedTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  selectedTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedTypeInfo: {
    flex: 1,
  },
  selectedTypeLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedTypeDesc: {
    fontSize: 14,
    color: '#6B7280',
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modernInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 8,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    fontSize: 16,
    flex: 1,
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  quickAmountChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickAmountChipSelected: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  quickAmountTextSelected: {
    color: '#FFFFFF',
  },
  frequencyGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  frequencyCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  frequencyCardSelected: {
    borderColor: '#06B6D4',
    backgroundColor: '#F0F9FF',
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  frequencyTextSelected: {
    color: '#06B6D4',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipSelected: {
    backgroundColor: '#06B6D4',
    borderColor: '#06B6D4',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  activeToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  toggleDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#06B6D4',
  },
  toggleThumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#06B6D4',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#06B6D4',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});