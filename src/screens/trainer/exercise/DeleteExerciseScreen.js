import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const DeleteExerciseScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { exerciseId } = route.params;
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
  if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }
  }, [authLoading, user]);

  const handleDeleteExercise = async () => {
    try {
      setActionLoading(true);
      const response = await trainerService.deleteFitnessExercise(exerciseId);
      if (response.statusCode === 200) {
        Alert.alert('Success', 'Exercise deleted successfully.');
        navigation.goBack();
      } else {
        throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to delete exercise.'}`);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to delete exercise.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Exercise</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="trash-outline" size={32} color="#EF4444" />
        </View>
        <Text style={styles.title}>Delete Exercise</Text>
        <Text style={styles.message}>Are you sure you want to delete this exercise?</Text>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmButton} onPress={handleDeleteExercise} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmButtonText}>Delete</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginLeft: 16 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  iconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '600', color: '#1E293B', textAlign: 'center', marginBottom: 8 },
  message: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16 },
  cancelButton: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', flex: 1, marginRight: 8 },
  confirmButton: { backgroundColor: '#EF4444', padding: 12, borderRadius: 8, flex: 1, marginLeft: 8 },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#334155', textAlign: 'center' },
  confirmButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
});

export default DeleteExerciseScreen;