import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width } = Dimensions.get('window');

const EditServicePackageScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { packageId } = route.params;
  const [editPackage, setEditPackage] = useState({
    packageId: null,
    packageName: '',
    description: '',
    price: '',
    durationDays: '',
    status: 'active',
    trainerId: user?.userId || 0,
  });
  const [formErrors, setFormErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
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
    ]).start();
    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }

    if (!packageId) {
      Alert.alert('Error', 'Invalid package ID');
      navigation.goBack();
      return;
    }

    const fetchPackage = async () => {
      try {
        setFetchLoading(true);
        const response = await trainerService.getServicePackage({ PackageId: packageId, TrainerId: user.userId });
        if (response.statusCode === 200 && response.data?.packages?.length > 0) {
          const packageData = response.data.packages.find(pkg => pkg.packageId === packageId);
          if (packageData) {
            setEditPackage({
              packageId: packageData.packageId,
              packageName: packageData.packageName || '',
              description: packageData.description || '',
              price: packageData.price ? packageData.price.toString() : '',
              durationDays: packageData.durationDays ? packageData.durationDays.toString() : '',
              status: packageData.status || 'active',
              trainerId: user.userId,
            });
          } else {
            Alert.alert('Error', 'Package not found or you do not have permission to edit it.');
            navigation.goBack();
          }
        } else {
          Alert.alert('Error', 'Package not found or you do not have permission to edit it.');
          navigation.goBack();
        }
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to load package details.');
        navigation.goBack();
      } finally {
        setFetchLoading(false);
      }
    };

    fetchPackage();
  }, [authLoading, user, packageId, navigation]);

  const validatePackageForm = () => {
    const errors = {};
    if (!editPackage.packageName.trim()) {
      errors.packageName = 'Package name is required.';
    }
    if (!editPackage.price || isNaN(parseFloat(editPackage.price)) || parseFloat(editPackage.price) <= 0) {
      errors.price = 'Price must be a positive number.';
    }
    if (!editPackage.durationDays || isNaN(parseInt(editPackage.durationDays)) || parseInt(editPackage.durationDays) <= 0) {
      errors.durationDays = 'Duration must be a positive number of days.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setEditPackage(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleEditPackage = async () => {
    if (!validatePackageForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form.');
      return;
    }

    if (!editPackage.packageId || editPackage.packageId !== packageId) {
      Alert.alert('Error', 'Invalid package ID');
      return;
    }

    try {
      setActionLoading(true);
      const packageData = {
        packageId: editPackage.packageId,
        packageName: editPackage.packageName.trim(),
        description: editPackage.description.trim() || null,
        price: parseFloat(editPackage.price),
        durationDays: parseInt(editPackage.durationDays),
        status: editPackage.status,
        trainerId: user.userId,
      };
      const response = await trainerService.updateServicePackage(packageData.packageId, packageData);
      if (response.statusCode === 200) {
        Alert.alert('Success', 'Service package updated successfully.', [
          { text: 'OK', onPress: () => navigation.navigate('TrainerServiceManagement') },
        ]);
      } else {
        throw new Error(response.message || 'Failed to update package.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An error occurred while updating the package.');
    } finally {
      setActionLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading package details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Edit Service Package</Text>
            <Text style={styles.headerSubtitle}>Update your package details</Text>
          </View>
          <View style={styles.headerActionPlaceholder} />
        </View>
      </LinearGradient>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Package Name</Text>
            <View style={[styles.inputWrapper, formErrors.packageName && styles.inputError]}>
              <Ionicons name="pricetag-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={editPackage.packageName}
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
                style={[styles.input, styles.multilineInput]}
                value={editPackage.description}
                onChangeText={(text) => handleInputChange('description', text)}
                placeholder="Enter description"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Price ($)</Text>
            <View style={[styles.inputWrapper, formErrors.price && styles.inputError]}>
              <Ionicons name="cash-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={editPackage.price}
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
                value={editPackage.durationDays}
                onChangeText={(text) => handleInputChange('durationDays', text)}
                placeholder="Enter duration"
                keyboardType="numeric"
                placeholderTextColor="#94A3B8"
              />
            </View>
            {formErrors.durationDays && <Text style={styles.errorText}>{formErrors.durationDays}</Text>}
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.switchWrapper}>
              <Ionicons name="checkbox-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>{editPackage.status === 'active' ? 'Active' : 'Inactive'}</Text>
                <Switch
                  value={editPackage.status === 'active'}
                  onValueChange={(value) => handleInputChange('status', value ? 'active' : 'inactive')}
                  trackColor={{ false: '#EF4444', true: '#4F46E5' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#EF4444"
                />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.button, actionLoading && styles.buttonDisabled]}
            onPress={handleEditPackage}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Update Package</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  headerActionPlaceholder: {
    width: 40,
    height: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 15,
  },
  formContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginLeft: 12,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 14,
    paddingRight: 12,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    padding: 8,
  },
  switchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 12,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loaderText: {
    fontSize: 16,
    color: '#4F46E5',
    marginTop: 16,
    fontWeight: '500',
  },
});

export default EditServicePackageScreen;