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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';

const EditWorkoutPlan = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { planId } = route.params;
  const [form, setForm] = useState({
    planId: 0,
    userId: 0,
    trainerId: user?.userId || 0,
    planName: '',
    description: '',
    startDate: '',
    endDate: '',
    frequencyPerWeek: '',
    durationMinutes: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
   if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }
    fetchPlanDetails();
  }, [authLoading, user]);

  const fetchPlanDetails = async () => {
    try {
      setLoading(true);
      const response = await trainerService.getWorkoutPlanById(planId);
      if (response.statusCode === 200) {
        setForm({
          planId: response.data.planId,
          userId: response.data.userId,
          trainerId: response.data.trainerId,
          planName: response.data.planName,
          description: response.data.description || '',
          startDate: response.data.startDate,
          endDate: response.data.endDate,
          frequencyPerWeek: response.data.frequencyPerWeek.toString(),
          durationMinutes: response.data.durationMinutes.toString(),
          status: response.data.status,
        });
      } else {
        throw new Error(response.message || 'Failed to load plan.');
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while loading plan details.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!form.planName.trim()) {
      Alert.alert('Validation Error', 'Plan name is required.');
      return false;
    }
    if (!form.startDate || !form.endDate) {
      Alert.alert('Validation Error', 'Start and end dates are required.');
      return false;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      Alert.alert('Validation Error', 'Start date must be earlier than or equal to end date.');
      return false;
    }
    if (!form.frequencyPerWeek || isNaN(form.frequencyPerWeek) || parseInt(form.frequencyPerWeek) <= 0) {
      Alert.alert('Validation Error', 'Frequency per week must be a positive number.');
      return false;
    }
    if (!form.durationMinutes || isNaN(form.durationMinutes) || parseInt(form.durationMinutes) <= 0) {
      Alert.alert('Validation Error', 'Duration in minutes must be a positive number.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const planData = {
        planId: form.planId,
        userId: form.userId,
        trainerId: form.trainerId,
        planName: form.planName,
        description: form.description,
        startDate: form.startDate,
        endDate: form.endDate,
        frequencyPerWeek: parseInt(form.frequencyPerWeek),
        durationMinutes: parseInt(form.durationMinutes),
        status: form.status,
      };
      const response = await trainerService.updateWorkoutPlan(planId, planData);
      if (response.statusCode === 200) {
        Alert.alert('Success', 'Workout plan updated successfully.');
        navigation.goBack();
      } else {
        throw new Error(response.message || 'Failed to update plan.');
      }
    } catch (error) {
      console.error('Update Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while updating the plan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading plan details...</Text>
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
            <Text style={styles.headerTitle}>Edit Workout Plan</Text>
            <Text style={styles.headerSubtitle}>Update plan details</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.contentContainer}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>Plan Name</Text>
          <TextInput
            style={styles.input}
            value={form.planName}
            onChangeText={(value) => handleInputChange('planName', value)}
            placeholder="Enter plan name"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(value) => handleInputChange('description', value)}
            placeholder="Enter description"
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Start Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={form.startDate}
            onChangeText={(value) => handleInputChange('startDate', value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>End Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={form.endDate}
            onChangeText={(value) => handleInputChange('endDate', value)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Frequency (days/week)</Text>
          <TextInput
            style={styles.input}
            value={form.frequencyPerWeek}
            onChangeText={(value) => handleInputChange('frequencyPerWeek', value)}
            placeholder="Enter frequency per week"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Duration (minutes/session)</Text>
          <TextInput
            style={styles.input}
            value={form.durationMinutes}
            onChangeText={(value) => handleInputChange('durationMinutes', value)}
            placeholder="Enter duration in minutes"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />

          <Text style={styles.label}>Status</Text>
          <View style={styles.statusContainer}>
            {['active', 'inactive'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  form.status === status && styles.selectedStatusButton,
                ]}
                onPress={() => handleInputChange('status', status)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    form.status === status && styles.selectedStatusButtonText,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
  statusContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  selectedStatusButton: { backgroundColor: '#4F46E5' },
  statusButtonText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  selectedStatusButtonText: { color: '#FFFFFF', fontWeight: '600' },
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

export default EditWorkoutPlan;