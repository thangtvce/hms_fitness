import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { theme } from 'theme/color';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const ExerciseDetailEntryScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { exercise, planId } = route.params || {};

  const [exerciseDetails, setExerciseDetails] = useState({
    sets: exercise.sets?.toString() || '',
    reps: exercise.reps?.toString() || '',
    durationMinutes: exercise.durationMinutes?.toString() || '',
    restTimeSeconds: exercise.restSeconds?.toString() || '',
    notes: exercise.instructions || '',
  });

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const inputRefs = useRef({});

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleInputFocus = (inputKey) => {
    setTimeout(() => {
      inputRefs.current[inputKey]?.measureLayout(
        scrollViewRef.current,
        (x, y, width, height) => {
          const screenHeight = Dimensions.get('window').height;
          const keyboardHeight = Platform.OS === 'ios' ? 350 : 300;
          const availableHeight = screenHeight - keyboardHeight - 100;

          scrollViewRef.current?.scrollTo({
            y: Math.max(0, y - availableHeight * 0.3),
            animated: true,
          });
        },
        () => {
          console.warn('Failed to measure layout for input:', inputKey);
        }
      );
    }, 100);
  };

  const validateInputs = () => {
    const errors = [];

    const sets = parseInt(exerciseDetails.sets, 10);
    const reps = parseInt(exerciseDetails.reps, 10);
    const durationMinutes = parseInt(exerciseDetails.durationMinutes, 10);
    const restTimeSeconds = parseInt(exerciseDetails.restTimeSeconds, 10);
    const planIdNum = parseInt(planId, 10);
    const exerciseIdNum = parseInt(exercise.exerciseId, 10);

    if (!planIdNum || planIdNum <= 0) {
      errors.push('Invalid plan ID.');
    }

    if (!exerciseIdNum || exerciseIdNum <= 0) {
      errors.push('Invalid exercise ID.');
    }

    if (!exerciseDetails.sets || isNaN(sets) || sets <= 0) {
      errors.push('Sets must be a positive number.');
    } else if (sets > 100) {
      errors.push('Sets cannot exceed 100.');
    }

    if (!exerciseDetails.reps || isNaN(reps) || reps <= 0) {
      errors.push('Reps must be a positive number.');
    } else if (reps > 100) {
      errors.push('Reps cannot exceed 100.');
    }

    if (!exerciseDetails.durationMinutes || isNaN(durationMinutes) || durationMinutes <= 0) {
      errors.push('Duration (Minutes) must be a positive number.');
    } else if (durationMinutes > 1440) {
      errors.push('Duration cannot exceed 1440 minutes (24 hours).');
    }

    if (!exerciseDetails.restTimeSeconds || isNaN(restTimeSeconds) || restTimeSeconds < 0) {
      errors.push('Rest Seconds must be a non-negative number.');
    } else if (restTimeSeconds > 3600) {
      errors.push('Rest Seconds cannot exceed 3600 seconds (1 hour).');
    }

    if (exerciseDetails.notes && exerciseDetails.notes.length > 200) {
      errors.push('Notes cannot exceed 200 characters.');
    }

    if (exerciseDetails.notes && !/^[a-zA-Z0-9\s]*$/.test(exerciseDetails.notes)) {
      errors.push('Notes can only contain alphanumeric characters and spaces.');
    }

    return errors;
  };

  const handleSaveExerciseDetails = async () => {
    const validationErrors = validateInputs();
    if (validationErrors.length > 0) {
      Alert.alert('Validation Error', validationErrors.join('\n'));
      return;
    }

    const payload = {
      planExerciseId: 0,
      planId: parseInt(planId, 10),
      exerciseId: parseInt(exercise.exerciseId, 10),
      sets: parseInt(exerciseDetails.sets, 10),
      reps: parseInt(exerciseDetails.reps, 10),
      durationMinutes: parseInt(exerciseDetails.durationMinutes, 10),
      restTimeSeconds: parseInt(exerciseDetails.restTimeSeconds, 10),
      notes: exerciseDetails.notes || 'Follow trainer instructions',
    };

    console.log('Sending Exercise Details Payload:', JSON.stringify(payload, null, 2));

    try {
      const existingExercises = await trainerService.getWorkoutPlanExercisesByPlanId(planId);
      const exists = existingExercises.data.exercises.some(ex => ex.exerciseId === exercise.exerciseId);
      if (exists) {
        Alert.alert('Error', 'Exercise already exists in this workout plan.');
        return;
      }

      const response = await trainerService.addExerciseToWorkoutPlan(planId, payload);
      console.log('API Response:', response);
      Alert.alert('Success', 'Exercise added to workout plan.');
      setExerciseDetails({ sets: '', reps: '', durationMinutes: '', restTimeSeconds: '', notes: '' });
      navigation.goBack();
    } catch (error) {
      console.error('Add Exercise Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        headers: error.response?.headers,
      });
      const errorMessage =
        error.response?.data?.message ||
        'Failed to add exercise. Please ensure the exercise is not already in the plan and try again.';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleCancel = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Exercise Details</Text>
            <Text style={styles.headerSubtitle}>
              {exercise ? exercise.exerciseName : 'Details'}
            </Text>
          </View>
          <View style={styles.headerActionButtonPlaceholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.container}>
            <View style={[
              styles.fixedButtonContainer,
              isKeyboardVisible && styles.fixedButtonContainerKeyboard
            ]}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Ionicons name="close" size={20} color="#4F46E5" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.submitButton]}
                onPress={handleSaveExerciseDetails}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Submit</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingTop: 80 }
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.cardWrapper}>
                <LinearGradient colors={["#FFFFFF", "#F8FAFC"]} style={styles.cardGradient}>
                  {[
                    { label: 'Sets', key: 'sets', type: 'numeric' },
                    { label: 'Reps', key: 'reps', type: 'numeric' },
                    { label: 'Duration (Minutes)', key: 'durationMinutes', type: 'numeric' },
                    { label: 'Rest Seconds', key: 'restTimeSeconds', type: 'numeric' },
                    { label: 'Notes', key: 'notes', type: 'default', multiline: true },
                  ].map((field) => (
                    <View style={styles.inputContainer} key={field.key}>
                      <Text style={styles.inputLabel}>{field.label}</Text>
                      <TextInput
                        ref={(ref) => (inputRefs.current[field.key] = ref)}
                        style={[
                          styles.input,
                          field.multiline && { height: 100, textAlignVertical: 'top' },
                        ]}
                        value={exerciseDetails[field.key]}
                        onChangeText={(text) =>
                          setExerciseDetails((prev) => ({
                            ...prev,
                            [field.key]: text,
                          }))
                        }
                        keyboardType={field.type}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        returnKeyType={field.multiline ? 'default' : 'done'}
                        multiline={field.multiline}
                        onFocus={() => handleInputFocus(field.key)}
                        onSubmitEditing={field.multiline ? undefined : Keyboard.dismiss}
                      />
                    </View>
                  ))}
                </LinearGradient>
              </View>

              {isKeyboardVisible && (
                <TouchableOpacity
                  style={styles.closeKeyboardButton}
                  onPress={Keyboard.dismiss}
                >
                  <Ionicons name="chevron-down" size={20} color="#4F46E5" />
                  <Text style={styles.closeKeyboardText}>Close Keyboard</Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 100 }} />
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: theme.primaryColor 
  },
  header: {
    paddingVertical: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTextContainer: { 
    flex: 1, 
    alignItems: 'center' 
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  headerActionButtonPlaceholder: { 
    width: 40 
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  fixedButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  fixedButtonContainerKeyboard: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    paddingBottom: 120,
  },
  cardWrapper: {
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#FFFFFF',
  },
  closeKeyboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
  },
  closeKeyboardText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    marginLeft: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#4F46E5',
  },
  submitButton: {
    backgroundColor: '#4F46E5',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ExerciseDetailEntryScreen;