import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Picker,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';

const EditPlanExercise = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { planExerciseId } = route.params;
  const [form, setForm] = useState({
    planId: 0,
    exerciseId: '',
    sets: '',
    reps: '',
    durationMinutes: '',
    restTimeSeconds: '',
    notes: '',
  });
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
 if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }
    fetchExerciseDetails();
  }, [authLoading, user]);

  const fetchExerciseDetails = async () => {
    try {
      setLoading(true);
      const exerciseResponse = await trainerService.getPlanExerciseById(planExerciseId);
      if (exerciseResponse.statusCode === 200) {
        setForm({
          planId: exerciseResponse.data.planId,
          exerciseId: exerciseResponse.data.exerciseId.toString(),
          sets: exerciseResponse.data.sets.toString(),
          reps: exerciseResponse.data.reps.toString(),
          durationMinutes: exerciseResponse.data.durationMinutes?.toString() || '',
          restTimeSeconds: exerciseResponse.data.restTimeSeconds?.toString() || '',
          notes: exerciseResponse.data.notes || '',
        });
      } else {
        throw new Error(exerciseResponse.message || 'Failed to load exercise.');
      }

      const exercisesResponse = await trainerService.getFitnessExercisesByTrainer({
        PageNumber: 1,
        PageSize: 100,
      });
      if (exercisesResponse.statusCode === 200 && Array.isArray(exercisesResponse.data?.exercises)) {
        setExercises(exercisesResponse.data.exercises);
      } else {
        throw new Error(exercisesResponse.message || 'Failed to load exercises.');
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while loading exercise details.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.exerciseId) {
      Alert.alert('Validation Error', 'Please select an exercise.');
      return false;
    }
    if (!form.sets || isNaN(form.sets) || parseInt(form.sets) <= 0) {
      Alert.alert('Validation Error', 'Sets must be a positive number.');
      return false;
    }
    if (!form.reps || isNaN(form.reps) || parseInt(form.reps) <= 0) {
      Alert.alert('Validation Error', 'Reps must be a positive number.');
      return false;
    }
    if (form.durationMinutes && (isNaN(form.durationMinutes) || parseInt(form.durationMinutes) < 0)) {
      Alert.alert('Validation Error', 'Duration must be a non-negative number.');
      return false;
    }
    if (form.restTimeSeconds && (isNaN(form.restTimeSeconds) || parseInt(form.restTimeSeconds) < 0)) {
      Alert.alert('Validation Error', 'Rest time must be a non-negative number.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const exerciseData = {
        planId: parseInt(form.planId),
        exerciseId: parseInt(form.exerciseId),
        sets: parseInt(form.sets),
        reps: parseInt(form.reps),
        durationMinutes: form.durationMinutes ? parseInt(form.durationMinutes) : null,
        restTimeSeconds: form.restTimeSeconds ? parseInt(form.restTimeSeconds) : null,
        notes: form.notes || null,
      };
      const response = await trainerService.updatePlanExercise(planExerciseId, exerciseData);
      if (response.statusCode === 200) {
        Alert.alert('Success', 'Exercise updated successfully.');
        navigation.goBack();
      } else {
        throw new Error(response.message || 'Failed to update exercise.');
      }
    } catch (error) {
      console.error('Update Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while updating the exercise.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading exercise details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Edit Exercise</Text>
            <Text style={styles.headerSubtitle}>Update exercise details</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.contentContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Select Exercise</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={form.exerciseId}
              onValueChange={(value) => handleInputChange('exerciseId', value)}
              style={styles.picker}
            >
              {exercises.map((exercise) => (
                <Picker.Item
                  key={exercise.exerciseId}
                  label={exercise.exerciseName || `Exercise ${exercise.exerciseId}`}
                  value={exercise.exerciseId.toString()}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Sets</Text>
          <TextInput
            style={styles.input}
            value={form.sets}
            onChangeText={(value) => handleInputChange('sets', value)}
            placeholder="Enter number of sets"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Reps</Text>
          <TextInput
            style={styles.input}
            value={form.reps}
            onChangeText={(value) => handleInputChange('reps', value)}
            placeholder="Enter number of reps"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Duration (minutes, optional)</Text>
          <TextInput
            style={styles.input}
            value={form.durationMinutes}
            onChangeText={(value) => handleInputChange('durationMinutes', value)}
            placeholder="Enter duration in minutes"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Rest Time (seconds, optional)</Text>
          <TextInput
            style={styles.input}
            value={form.restTimeSeconds}
            onChangeText={(value) => handleInputChange('restTimeSeconds', value)}
            placeholder="Enter rest time in seconds"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            placeholder="Enter any notes"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.saveButton, submitting && styles.disabledButton]}
            onPress={handleSave}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.primaryColor },
  header: { paddingBottom: 16 },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  headerTextContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', textAlign: 'center', marginTop: 2 },
  contentContainer: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 8 },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 16,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  pickerContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#1E293B',
  },
  saveButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  disabledButton: { backgroundColor: '#CBD5E1' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loaderText: { fontSize: 16, color: '#4F46E5', marginTop: 16, fontWeight: '500' },
});

export default EditPlanExercise;