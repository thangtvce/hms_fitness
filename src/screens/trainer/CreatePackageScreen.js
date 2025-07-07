import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { trainerService } from 'services/apiTrainerService';
import { useAuth } from 'context/AuthContext';

const CreatePackageScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const packageId = route.params?.packageId; 
  const isEditMode = !!packageId;

  const [formData, setFormData] = useState({
    packageName: '',
    description: '',
    price: '',
    durationDays: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode) {
      const fetchPackage = async () => {
        try {
          setFetching(true);
          const response = await trainerService.getServicePackageById(packageId);
          if (response.statusCode === 200 && response.data) {
            setFormData({
              packageName: response.data.packageName || '',
              description: response.data.description || '',
              price: response.data.price?.toString() || '',
              durationDays: response.data.durationDays?.toString() || '',
            });
          } else {
            Alert.alert('Error', response.message || 'Failed to load package.');
            navigation.goBack();
          }
        } catch (error) {
          Alert.alert('Error', 'An error occurred while fetching the package.');
          navigation.goBack();
        } finally {
          setFetching(false);
        }
      };
      fetchPackage();
    }
  }, [packageId, navigation]);

  const validateForm = () => {
    if (!formData.packageName.trim()) {
      Alert.alert('Error', 'Package name is required.');
      return false;
    }
    if (!formData.description.trim()) {
      Alert.alert('Error', 'Description is required.');
      return false;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Price must be a positive number.');
      return false;
    }
    const durationDays = parseInt(formData.durationDays, 10);
    if (isNaN(durationDays) || durationDays <= 0) {
      Alert.alert('Error', 'Duration must be a positive integer.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!user?.trainerId) {
      Alert.alert('Error', 'Trainer ID not found. Please log in again.');
      return;
    }

    const payload = {
      trainerId: user.trainerId,
      packageName: formData.packageName.trim(),
      description: formData.description.trim(),
      price: parseFloat(formData.price),
      durationDays: parseInt(formData.durationDays, 10),
    };

    try {
      setLoading(true);
      let response;
      if (isEditMode) {
        response = await trainerService.updateServicePackage(packageId, payload);
      } else {
        response = await trainerService.createServicePackage(payload);
      }

      if (response.statusCode === 200) {
        Alert.alert(
          'Success',
          isEditMode ? 'Package updated successfully.' : 'Package created successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.message || 'Failed to save package.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while saving the package.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (fetching) {
    return (
      <View style={styles.loadingContainer}>
        <Feather name="refresh-cw" size={32} color="#2563EB" style={{ marginBottom: 10 }} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Package Name</Text>
        <TextInput
          style={styles.input}
          value={formData.packageName}
          onChangeText={(text) => handleChange('packageName', text)}
          placeholder="Enter package name"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={formData.description}
          onChangeText={(text) => handleChange('description', text)}
          placeholder="Enter description"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Price ($)</Text>
        <TextInput
          style={styles.input}
          value={formData.price}
          onChangeText={(text) => handleChange('price', text)}
          placeholder="Enter price"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Duration (Days)</Text>
        <TextInput
          style={styles.input}
          value={formData.durationDays}
          onChangeText={(text) => handleChange('durationDays', text)}
          placeholder="Enter duration in days"
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : isEditMode ? 'Update Package' : 'Create Package'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  disabledButton: {
    backgroundColor: '#93C5FD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
});

export default CreatePackageScreen;