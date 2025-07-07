import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const CreateServicePackageScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [newPackage, setNewPackage] = useState({
    packageName: '',
    description: '',
    price: '',
    durationDays: '',
    status: 'active',
    trainerId: user?.userId || 0,
  });
  const [formErrors, setFormErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }
  }, [authLoading, user]);

  const validatePackageForm = () => {
    const errors = {};
    if (!newPackage.packageName.trim()) {
      errors.packageName = 'Package name is required.';
    }
    if (!newPackage.price || isNaN(parseFloat(newPackage.price)) || parseFloat(newPackage.price) <= 0) {
      errors.price = 'Price must be a positive number.';
    }
    if (!newPackage.durationDays || isNaN(parseInt(newPackage.durationDays)) || parseInt(newPackage.durationDays) <= 0) {
      errors.durationDays = 'Duration must be a positive number of days.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setNewPackage(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCreatePackage = async () => {
    if (!validatePackageForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form.');
      return;
    }
    try {
      setActionLoading(true);
      const packageData = {
        ...newPackage,
        price: parseFloat(newPackage.price),
        durationDays: parseInt(newPackage.durationDays),
        trainerId: user.userId,
      };
      const response = await trainerService.createServicePackage(packageData);
      if (response.statusCode === 201) {
        Alert.alert('Success', 'Service package created successfully.', [
          { text: 'OK', onPress: () => navigation.navigate('TrainerServiceManagement') },
        ]);
      } else {
        throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to create package.'}`);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create package.');
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
        <Text style={styles.headerTitle}>Create Service Package</Text>
      </View>
      <ScrollView style={styles.content}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Package Name</Text>
          <View style={[styles.inputWrapper, formErrors.packageName && styles.inputError]}>
            <Ionicons name="pricetag-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={newPackage.packageName}
              onChangeText={(text) => handleInputChange('packageName', text)}
              placeholder="Enter package name"
              placeholderTextColor="#94A3B8"
            />
          </View>
          {formErrors.packageName && <Text style={styles.errorText}>{formErrors.packageName}</Text>}
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Description</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="document-text-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={newPackage.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Enter description"
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Price ($)</Text>
          <View style={[styles.inputWrapper, formErrors.price && styles.inputError]}>
            <Ionicons name="cash-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={newPackage.price}
              onChangeText={(text) => handleInputChange('price', text)}
              placeholder="Enter price"
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
            />
          </View>
          {formErrors.price && <Text style={styles.errorText}>{formErrors.price}</Text>}
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Duration (Days)</Text>
          <View style={[styles.inputWrapper, formErrors.durationDays && styles.inputError]}>
            <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={newPackage.durationDays}
              onChangeText={(text) => handleInputChange('durationDays', text)}
              placeholder="Enter duration"
              keyboardType="numeric"
              placeholderTextColor="#94A3B8"
            />
          </View>
          {formErrors.durationDays && <Text style={styles.errorText}>{formErrors.durationDays}</Text>}
        </View>
      </ScrollView>
      <TouchableOpacity style={[styles.button, actionLoading && styles.buttonDisabled]} onPress={handleCreatePackage} disabled={actionLoading}>
        {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonText}>Create Package</Text>}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { padding: 16, backgroundColor: '#4F46E5', flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginLeft: 16 },
  content: { padding: 16 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8, color: '#1E293B' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputError: { borderColor: '#EF4444' },
  inputIcon: { marginLeft: 12, marginRight: 8 },
  input: { flex: 1, padding: 12, fontSize: 16, color: '#1E293B' },
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 12 },
  button: { backgroundColor: '#4F46E5', padding: 12, borderRadius: 8, alignItems: 'center', margin: 16 },
  buttonDisabled: { backgroundColor: '#CBD5E1' },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});

export default CreateServicePackageScreen;