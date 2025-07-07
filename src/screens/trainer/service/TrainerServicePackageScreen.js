import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  Animated,
  Platform,
  Dimensions,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import HTML from 'react-native-render-html';
import * as ImagePicker from 'expo-image-picker';
import { trainerService } from 'services/apiTrainerService';
import { useAuth } from 'context/AuthContext';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'];

const TrainerServicePackageScreen = ({ navigation }) => {
  const { user, loading: authLoading } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddPackageModal, setShowAddPackageModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExerciseSelectionModal, setShowExerciseSelectionModal] = useState(false);
  const [showCreateExerciseModal, setShowCreateExerciseModal] = useState(false);
  const [showUpdateExerciseModal, setShowUpdateExerciseModal] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [fitnessExercises, setFitnessExercises] = useState([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState(null);
  const [mediaUri, setMediaUri] = useState(null);

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasMore, setHasMore] = useState(true);

  const [newPackage, setNewPackage] = useState({
    packageName: '',
    description: '',
    price: '',
    durationDays: '',
    status: 'active',
    trainerId: user?.userId || 0,
  });

  const [newExercise, setNewExercise] = useState({
    exerciseName: '',
    description: '',
    categoryId: null,
    genderSpecific: 'Unisex',
    mediaUrl: '',
    caloriesBurnedPerMin: 0,
  });

  const [updateExercise, setUpdateExercise] = useState({
    exerciseName: '',
    description: '',
    categoryId: null,
    genderSpecific: '',
    mediaUrl: '',
    caloriesBurnedPerMin: 0,
  });

  const [formErrors, setFormErrors] = useState({
    packageName: '',
    price: '',
    durationDays: '',
    exerciseName: '',
    categoryId: '',
    genderSpecific: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (authLoading) return;
     if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }
    console.log('User Data:', { userId: user?.userId, roles: user?.roles });
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    };
  }, [authLoading, user]);

  const fetchPackages = async (page = 1, refresh = false) => {
    try {
      setLoading(true);
      if (!user?.userId || user.userId <= 0) {
        throw new Error('Invalid Trainer ID. Please log in again.');
      }
      const queryParams = {
        PageNumber: page,
        PageSize: pageSize,
        SearchTerm: searchTerm || undefined,
        TrainerId: user.userId,
      };
      console.log('Fetch Packages URL:', `/ServicePackage?${new URLSearchParams(queryParams).toString()}`);
      const response = await trainerService.getServicePackage(queryParams);
      console.log('Fetch Packages Response:', response);
      if (response.statusCode === 200 && response.data) {
        if (Array.isArray(response.data.packages)) {
          const userPackages = response.data.packages.filter((pkg) => pkg.trainerId === user.userId);
          setPackages(userPackages);
          setTotalPages(response.data.totalPages || 1);
          setTotalItems(response.data.totalCount || userPackages.length);
          setHasMore(page < (response.data.totalPages || 1));
        } else {
          Alert.alert('Notice', 'Invalid service package data received from server.');
          setPackages([]);
        }
      } else {
        const errorMessage = response.message || 'Unable to load service packages.';
        console.log('Fetch Packages Error:', { statusCode: response.statusCode, message: errorMessage });
        Alert.alert('Error', `Error ${response.statusCode}: ${errorMessage}`);
        setPackages([]);
      }
    } catch (error) {
      const errorMessage = error.message || 'An error occurred while loading your service packages.';
      console.error('Fetch Packages Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
      setPackages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setActionLoading(true);
      console.log('Fetch Categories URL:', '/ExerciseCategory/all-active-categories');
      const response = await trainerService.getAllExerciseCategories();
      console.log('Fetch Categories Response:', response);
      if (response.statusCode === 200 && response.data?.categories) {
        setCategories(response.data.categories);
      } else {
        const errorMessage = response.message || 'Unable to load exercise categories.';
        console.log('Fetch Categories Error:', { statusCode: response.statusCode, message: errorMessage });
        Alert.alert('Error', `Error ${response.statusCode}: ${errorMessage}`);
        setCategories([]);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to load exercise categories.';
      console.error('Fetch Categories Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const fetchFitnessExercises = async (categoryId) => {
    try {
      setActionLoading(true);
      const queryParams = { CategoryId: categoryId };
      console.log('Fetch Fitness Exercises URL:', `/FitnessExercise?${new URLSearchParams(queryParams).toString()}`);
      const response = await trainerService.getFitnessExercisesByCategory(categoryId);
      console.log('Fetch Fitness Exercises Response:', response);
      if (response.statusCode === 200 && response.data?.exercises) {
        setFitnessExercises(response.data.exercises);
      } else {
        const errorMessage = response.message || 'No exercises found for this category.';
        console.log('Fetch Fitness Exercises Error:', { statusCode: response.statusCode, message: errorMessage });
        Alert.alert('Error', `Error ${response.statusCode}: ${errorMessage}`);
        setFitnessExercises([]);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to load exercises.';
      console.error('Fetch Fitness Exercises Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user?.roles?.includes('Trainer') || !user?.userId) return;
    fetchPackages(pageNumber);
  }, [pageNumber, pageSize, searchTerm, authLoading, user]);

  const onRefresh = () => {
    setPageNumber(1);
    setRefreshing(true);
    fetchPackages(1, true);
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
    setPageNumber(1);
  };

  const handleNextPage = () => {
    if (hasMore && !loading) setPageNumber((prev) => prev + 1);
  };

  const handlePreviousPage = () => {
    if (pageNumber > 1 && !loading) setPageNumber((prev) => prev - 1);
  };

  const validatePackageForm = () => {
    const errors = {};
    if (!newPackage.packageName.trim()) errors.packageName = 'Package name is required.';
    if (!newPackage.price || isNaN(parseFloat(newPackage.price)) || parseFloat(newPackage.price) <= 0)
      errors.price = 'Price must be a positive number.';
    if (!newPackage.durationDays || isNaN(parseInt(newPackage.durationDays)) || parseInt(newPackage.durationDays) <= 0)
      errors.durationDays = 'Duration must be a positive number of days.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateExerciseForm = (exercise) => {
    const errors = {};
    if (!exercise.categoryId) errors.categoryId = 'Category is required.';
    if (!exercise.exerciseName.trim()) errors.exerciseName = 'Exercise name is required.';
    else if (exercise.exerciseName.length < 3) errors.exerciseName = 'Exercise name must be at least 3 characters long.';
    else if (!/^[a-zA-Z0-9\s]+$/.test(exercise.exerciseName))
      errors.exerciseName = 'Exercise name can only contain letters, numbers, and spaces.';
    if (!exercise.genderSpecific) errors.genderSpecific = 'Gender specification is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreatePackage = async () => {
    try {
      setActionLoading(true);
      if (!validatePackageForm()) {
        Alert.alert('Validation Error', 'Please correct the errors in the form.');
        return;
      }
      if (!user?.userId || user.userId <= 0) {
        throw new Error('Invalid Trainer ID. Please log in again.');
      }
      const packageData = {
        ...newPackage,
        price: parseFloat(newPackage.price),
        durationDays: parseInt(newPackage.durationDays),
        trainerId: user.userId,
      };
      console.log('Create Package Data:', packageData);
      const response = await trainerService.createServicePackage(packageData);
      console.log('Create Package Response:', response);
      if (response.statusCode === 201) {
        Alert.alert('Success', 'Service package created successfully.');
        setShowAddPackageModal(false);
        setNewPackage({
          packageName: '',
          description: '',
          price: '',
          durationDays: '',
          status: 'active',
          trainerId: user.userId,
        });
        setFormErrors({});
        fetchPackages(1);
      } else {
        throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to create service package.'}`);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to create service package.';
      console.error('Create Package Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

 const pickMedia = async () => {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Please allow access to your media library.');
    return;
  }
  setActionLoading(true);
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      const mimeType = selectedAsset.mimeType || `image/${selectedAsset.uri.split('.').pop().toLowerCase()}`;
      if (!ALLOWED_TYPES.includes(mimeType)) {
        Alert.alert('Error', `Only ${ALLOWED_TYPES.join(', ')} images are allowed.`);
        return;
      }
      setMediaUri(selectedAsset.uri);
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to pick image. Please try again.');
    console.error('Pick Media Error:', error);
  } finally {
    setActionLoading(false);
  }
};

  const uploadMedia = async () => {
    if (!mediaUri) return null;
    try {
      setActionLoading(true);
      const formData = new FormData();
      const uriParts = mediaUri.split('.');
      const fileType = uriParts[uriParts.length - 1].toLowerCase();
      const mimeType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;
      if (!ALLOWED_TYPES.includes(mimeType)) {
        Alert.alert('Error', `Only ${ALLOWED_TYPES.join(', ')} images are allowed.`);
        return null;
      }
      formData.append('file', {
        uri: mediaUri,
        name: `media_${Date.now()}.${fileType}`,
        type: mimeType,
      });
      console.log('Upload Media FormData:', formData._parts);
      const response = await trainerService.uploadMedia(formData);
      console.log('Upload Media Response:', response);
      if (response.statusCode === 200 && response.data?.mediaUrl) {
        return response.data.mediaUrl;
      }
      throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to upload media.'}`);
    } catch (error) {
      const errorMessage = error.message || 'Failed to upload media.';
      console.error('Upload Media Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const openAddExerciseModal = async (packageId) => {
    try {
      setActionLoading(true);
      setSelectedPackageId(packageId);
      await fetchCategories();
      setShowCategoryModal(true);
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch categories.';
      console.error('Open Add Exercise Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectCategory = async (categoryId) => {
    try {
      setActionLoading(true);
      setSelectedCategoryId(categoryId);
      setNewExercise({ ...newExercise, categoryId });
      await fetchFitnessExercises(categoryId);
      setShowCategoryModal(false);
      setShowExerciseSelectionModal(true);
    } catch (error) {
      const errorMessage = error.message || 'Failed to load exercises for category.';
      console.error('Select Category Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectExercise = (exercise) => {
    if (exercise) {
      setSelectedExerciseId(exercise.exerciseId);
      Alert.alert('Success', 'Exercise selected. You can assign it to a workout plan later in the package details.');
      setShowExerciseSelectionModal(false);
    } else {
      setShowExerciseSelectionModal(false);
      setShowCreateExerciseModal(true);
    }
  };

 const handleCreateExercise = async () => {
  try {
    setActionLoading(true);
    if (!validateExerciseForm(newExercise)) {
      Alert.alert('Validation Error', 'Please correct the errors in the form.');
      return;
    }
    if (!user?.userId || user.userId <= 0) {
      throw new Error('Invalid Trainer ID. Please log in again.');
    }
    let mediaUrl = null;
    if (mediaUri) {
      mediaUrl = await uploadMedia();
      if (!mediaUrl) {
        Alert.alert('Error', 'Failed to upload media. Please try again.');
        return;
      }
    }
    const exerciseData = {
      exerciseName: newExercise.exerciseName,
      description: newExercise.description,
      categoryId: selectedCategoryId,
      genderSpecific: newExercise.genderSpecific,
      mediaUrl: mediaUrl || null,
      caloriesBurnedPerMin: parseFloat(newExercise.caloriesBurnedPerMin) || 0,
      trainerId: user.userId,
      createdAt: new Date().toISOString(),
    };
    console.log('Sending exercise data:', exerciseData);
    const response = await trainerService.createFitnessExercise(exerciseData);
    console.log('Received response:', response);
    if (response.statusCode === 201 && response.data?.exerciseId) {
      if (!response.data.trainerId) {
        console.warn('Warning: trainerId not included in response');
      }
      Alert.alert('Success', 'Exercise created successfully. You can assign it to a workout plan later in the package details.');
      setShowCreateExerciseModal(false);
      setNewExercise({
        exerciseName: '',
        description: '',
        categoryId: null,
        genderSpecific: 'Unisex',
        mediaUrl: '',
        caloriesBurnedPerMin: 0,
      });
      setMediaUri(null);
      setFormErrors({});
      setSelectedPackageId(null);
    } else {
      throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to create exercise.'}`);
    }
  } catch (error) {
    const errorMessage = error.message || 'Failed to create exercise.';
    console.error('Create Exercise Error:', { message: errorMessage, status: error.status });
    Alert.alert('Error', errorMessage);
  } finally {
    setActionLoading(false);
  }
};
  const handleUpdateExercise = async () => {
    try {
      setActionLoading(true);
      if (!validateExerciseForm(updateExercise)) {
        Alert.alert('Validation Error', 'Please correct the errors in the form.');
        return;
      }
      if (!selectedExerciseId) {
        Alert.alert('Error', 'No exercise selected for update.');
        return;
      }
      let mediaUrl = updateExercise.mediaUrl;
      if (mediaUri && mediaUri !== selectedExercise.mediaUrl) {
        mediaUrl = await uploadMedia();
        if (!mediaUrl) return;
      }
      const exerciseData = {
        exerciseId: selectedExerciseId,
        exerciseName: updateExercise.exerciseName,
        description: updateExercise.description,
        categoryId: selectedCategoryId,
        genderSpecific: updateExercise.genderSpecific,
        mediaUrl: mediaUrl || null,
        caloriesBurnedPerMin: parseFloat(updateExercise.caloriesBurnedPerMin) || 0,
        trainerId: user.userId,
        createdAt: selectedExercise.createdAt,
      };
      console.log('Update Exercise Data:', exerciseData);
      const response = await trainerService.updateFitnessExercise(exerciseData);
      console.log('Update Exercise Response:', response);
      if (response.statusCode === 200) {
        Alert.alert('Success', 'Exercise updated successfully.');
        setShowUpdateExerciseModal(false);
        setUpdateExercise({
          exerciseName: '',
          description: '',
          categoryId: null,
          genderSpecific: '',
          mediaUrl: '',
          caloriesBurnedPerMin: 0,
        });
        setMediaUri(null);
        setSelectedExerciseId(null);
        setFormErrors({});
        await fetchFitnessExercises(selectedCategoryId);
      } else {
        throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to update exercise.'}`);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to update exercise.';
      console.error('Update Exercise Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePackage = async () => {
    try {
      setActionLoading(true);
      console.log('Delete Package ID:', selectedPackageId);
      const response = await trainerService.deleteServicePackage(selectedPackageId);
      console.log('Delete Package Response:', response);
      if (response.statusCode === 200) {
        Alert.alert('Success', 'Service package deleted successfully.');
        setShowDeleteModal(false);
        fetchPackages(1);
      } else {
        throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to delete service package.'}`);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to delete service package.';
      console.error('Delete Package Error:', { message: errorMessage, status: error.status });
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const getPackageIcon = (packageName) => {
    if (!packageName) return 'fitness';
    const name = packageName.toLowerCase();
    if (name.includes('yoga') || name.includes('meditation')) return 'yoga';
    else if (name.includes('diet') || name.includes('nutrition')) return 'nutrition';
    else if (name.includes('cardio') || name.includes('running')) return 'cardio';
    else return 'fitness';
  };

  const renderPackageIcon = (type) => {
    switch (type) {
      case 'yoga':
        return <MaterialCommunityIcons name="yoga" size={24} color="#10B981" />;
      case 'nutrition':
        return <Ionicons name="nutrition" size={24} color="#F59E0B" />;
      case 'cardio':
        return <Ionicons name="heart" size={24} color="#EF4444" />;
      default:
        return <MaterialCommunityIcons name="weight-lifter" size={24} color="#4F46E5" />;
    }
  };

  const renderPackage = ({ item }) => {
    const packageType = getPackageIcon(item.packageName);
    return (
      <Animated.View
        style={[styles.packageItem, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        <TouchableOpacity
          style={styles.packageCard}
          onPress={() => navigation.navigate('TrainerPackageDetail', { package: item })}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>{renderPackageIcon(packageType)}</View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.packageName}>{item.packageName || 'Service Package'}</Text>
                <Text style={styles.trainerName}>by {item.trainerFullName || 'You'}</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => openAddExerciseModal(item.packageId)}
                  disabled={actionLoading}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#4F46E5" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    setSelectedPackageId(item.packageId);
                    setShowDeleteModal(true);
                  }}
                  disabled={actionLoading}
                >
                  <Feather name="trash-2" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.cardContent}>
              {item.description && (
                <View style={styles.descriptionContainer}>
                  <HTML
                    source={{ html: item.description }}
                    contentWidth={width - 72}
                    baseStyle={styles.packageDescription}
                    tagsStyles={{
                      p: { margin: 0, padding: 0 },
                      strong: { fontWeight: '700' },
                      em: { fontStyle: 'italic' },
                      ul: { marginVertical: 4, paddingLeft: 20 },
                      ol: { marginVertical: 4, paddingLeft: 20 },
                      li: { marginBottom: 4 },
                      div: { margin: 0, padding: 0 },
                      span: { margin: 0, padding: 0 },
                      a: { color: '#4F46E5', textDecorationLine: 'underline' },
                    }}
                    defaultTextProps={{ numberOfLines: 2, ellipsizeMode: 'tail' }}
                    renderersProps={{ TText: { numberOfLines: 2, ellipsizeMode: 'tail' } }}
                    onHTMLParsingError={() => (
                      <Text style={styles.packageDescription} numberOfLines={2}>
                        {item.description.replace(/<[^>]+>/g, '')}
                      </Text>
                    )}
                  />
                </View>
              )}
              <View style={styles.packageDetailsContainer}>
                <View style={styles.packageDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="pricetag-outline" size={14} color="#4F46E5" />
                  </View>
                  <Text style={styles.packageDetailText}>
                    {item.price ? `$${item.price.toLocaleString()}` : 'Contact'}
                  </Text>
                </View>
                <View style={styles.packageDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="calendar-outline" size={14} color="#10B981" />
                  </View>
                  <Text style={styles.packageDetailText}>{item.durationDays || 'N/A'} days</Text>
                </View>
                <View style={styles.packageDetailItem}>
                  <View style={[styles.detailIconContainer, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="fitness-outline" size={14} color="#EF4444" />
                  </View>
                  <Text style={styles.packageDetailText}>
                    {packageType === 'yoga' ? 'Yoga' : packageType === 'nutrition' ? 'Nutrition' : packageType === 'cardio' ? 'Cardio' : 'Fitness'}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderCategoryModal = () => (
    <Modal visible={showCategoryModal} transparent={true} animationType="slide" onRequestClose={() => setShowCategoryModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.dragHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Exercise Category</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            {actionLoading ? (
              <ActivityIndicator size="large" color="#4F46E5" style={styles.loadingIndicator} />
            ) : categories.length > 0 ? (
              categories.map((category) => (
                <TouchableOpacity
                  key={category.categoryId}
                  style={styles.categoryItem}
                  onPress={() => handleSelectCategory(category.categoryId)}
                  disabled={actionLoading}
                >
                  <Text style={styles.categoryName}>{category.categoryName}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.noCategoriesText}>No categories available.</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderExerciseSelectionModal = () => (
  <Modal
    visible={showExerciseSelectionModal}
    transparent={true}
    animationType="slide"
    onRequestClose={() => setShowExerciseSelectionModal(false)}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.dragHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Select Exercise</Text>
          <TouchableOpacity
            onPress={() => setShowExerciseSelectionModal(false)}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScrollView}>
          {actionLoading ? (
            <ActivityIndicator size="large" color="#4F46E5" style={styles.loadingIndicator} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.exerciseItem}
                onPress={() => handleSelectExercise(null)}
                disabled={actionLoading}
              >
                <Text style={styles.exerciseName}>Create New Exercise</Text>
              </TouchableOpacity>
              {fitnessExercises.length > 0 ? (
                fitnessExercises.map((exercise) => (
                  <View key={exercise.exerciseId} style={styles.exerciseItem}>
                    <TouchableOpacity
                      onPress={() => handleSelectExercise(exercise)}
                      disabled={actionLoading}
                    >
                      <View style={styles.exerciseContent}>
                        {exercise.mediaUrl ? (
                          <View style={styles.exerciseMediaContainer}>
                            <Image
                              source={{ uri: exercise.mediaUrl }}
                              style={styles.exerciseMedia}
                              resizeMode="cover"
                              onError={() => console.warn(`Failed to load image for ${exercise.exerciseName}`)}
                            />
                          </View>
                        ) : (
                          <View style={styles.exerciseMediaPlaceholder}>
                            <Ionicons name="image-outline" size={40} color="#CBD5E1" />
                          </View>
                        )}
                        <View style={styles.exerciseTextContainer}>
                          <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                          <Text style={styles.exerciseDescription}>
                            {exercise.description || 'No description available'}
                          </Text>
                          <Text style={styles.exerciseGender}>
                            Gender: {exercise.genderSpecific || 'Unisex'}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.updateButton}
                      onPress={() => {
                        setSelectedExercise(exercise);
                        setSelectedExerciseId(exercise.exerciseId);
                        setUpdateExercise({
                          exerciseName: exercise.exerciseName || '',
                          description: exercise.description || '',
                          categoryId: selectedCategoryId,
                          genderSpecific: exercise.genderSpecific || 'Unisex',
                          mediaUrl: exercise.mediaUrl || '',
                          caloriesBurnedPerMin: exercise.caloriesBurnedPerMin || 0,
                        });
                        setMediaUri(exercise?.mediaUrl || null);
                        setShowExerciseSelectionModal(false);
                        setShowUpdateExerciseModal(true);
                      }}
                      disabled={actionLoading}
                    >
                      <Ionicons name="pencil" size={18} color="#4F46E5" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.noExercisesText}>No exercises available for this category.</Text>
              )}
            </>
          )}
        </ScrollView>
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={() => setShowExerciseSelectionModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

  const renderAddPackageModal = () => (
    <Modal
      visible={showAddPackageModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowAddPackageModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.dragHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Service Package</Text>
            <TouchableOpacity onPress={() => setShowAddPackageModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.inputLabel}>Package Name</Text>
            <TextInput
              style={[styles.input, formErrors.packageName && styles.inputError]}
              value={newPackage.packageName}
              onChangeText={(text) => {
                setNewPackage({ ...newPackage, packageName: text });
                setFormErrors({ ...formErrors, packageName: '' });
              }}
              placeholder="Enter package name"
              placeholderTextColor="#94A3B8"
            />
            {formErrors.packageName && <Text style={styles.errorText}>{formErrors.packageName}</Text>}
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              value={newPackage.description}
              onChangeText={(text) => setNewPackage({ ...newPackage, description: text })}
              placeholder="Enter description"
              placeholderTextColor="#94A3B8"
              multiline
            />
            <Text style={styles.inputLabel}>Price ($)</Text>
            <TextInput
              style={[styles.input, formErrors.price && styles.inputError]}
              value={newPackage.price}
              onChangeText={(text) => {
                setNewPackage({ ...newPackage, price: text });
                setFormErrors({ ...formErrors, price: '' });
              }}
              placeholder="Enter price"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
            {formErrors.price && <Text style={styles.errorText}>{formErrors.price}</Text>}
            <Text style={styles.inputLabel}>Duration (Days)</Text>
            <TextInput
              style={[styles.input, formErrors.durationDays && styles.inputError]}
              value={newPackage.durationDays}
              onChangeText={(text) => {
                setNewPackage({ ...newPackage, durationDays: text });
                setFormErrors({ ...formErrors, durationDays: '' });
              }}
              placeholder="Enter duration in days"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
            {formErrors.durationDays && <Text style={styles.errorText}>{formErrors.durationDays}</Text>}
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, actionLoading && styles.disabledButton]}
              onPress={handleCreatePackage}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalButtonText}>Create Package</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

 const renderCreateExerciseModal = () => (
  <Modal
    visible={showCreateExerciseModal}
    transparent={true}
    animationType="slide"
    onRequestClose={() => {
      setShowCreateExerciseModal(false);
      setMediaUri(null);
    }}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.dragHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Create New Exercise</Text>
          <TouchableOpacity
            onPress={() => {
              setShowCreateExerciseModal(false);
              setMediaUri(null);
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScrollView}>
          <Text style={styles.inputLabel}>Exercise Name</Text>
          <TextInput
            style={[styles.input, formErrors.exerciseName && styles.inputError]}
            value={newExercise.exerciseName}
            onChangeText={(text) => {
              setNewExercise({ ...newExercise, exerciseName: text });
              setFormErrors({ ...formErrors, exerciseName: '' });
            }}
            placeholder="Enter exercise name (min 3 chars)"
            placeholderTextColor="#94A3B8"
          />
          {formErrors.exerciseName && <Text style={styles.errorText}>{formErrors.exerciseName}</Text>}
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            value={newExercise.description}
            onChangeText={(text) => setNewExercise({ ...newExercise, description: text })}
            placeholder="Enter description"
            placeholderTextColor="#94A3B8"
            multiline
          />
          <Text style={styles.inputLabel}>Gender Specification</Text>
          <Picker
            selectedValue={newExercise.genderSpecific}
            onValueChange={(value) => {
              setNewExercise({ ...newExercise, genderSpecific: value });
              setFormErrors({ ...formErrors, genderSpecific: '' });
            }}
            style={[styles.picker, formErrors.genderSpecific && styles.inputError]}
          >
            <Picker.Item label="Unisex" value="Unisex" />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
          {formErrors.genderSpecific && <Text style={styles.errorText}>{formErrors.genderSpecific}</Text>}
          <Text style={styles.inputLabel}>Calories Burned Per Minute (Optional)</Text>
          <TextInput
            style={styles.input}
            value={newExercise.caloriesBurnedPerMin.toString()}
            onChangeText={(text) => setNewExercise({ ...newExercise, caloriesBurnedPerMin: text })}
            placeholder="Enter calories burned per minute"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
          <Text style={styles.inputLabel}>Media (Optional)</Text>
          <View style={styles.mediaContainer}>
            <TouchableOpacity
              style={[styles.mediaButton, actionLoading && styles.disabledButton]}
              onPress={pickMedia}
              disabled={actionLoading}
            >
              <Text style={styles.mediaButtonText}>
                {mediaUri ? 'Change Image' : 'Select Image'}
              </Text>
            </TouchableOpacity>
            {mediaUri && (
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => {
                  Alert.alert(
                    'Remove Image',
                    'Are you sure you want to remove this image?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', onPress: () => setMediaUri(null), style: 'destructive' },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
          {mediaUri ? (
            <View style={styles.mediaPreviewContainer}>
              <Image
                source={{ uri: mediaUri }}
                style={styles.mediaPreview}
                resizeMode="cover"
                onError={() => {
                  Alert.alert('Error', 'Failed to load image. Please try another one.');
                  setMediaUri(null);
                }}
              />
            </View>
          ) : (
            <Text style={styles.noMediaText}>No image selected</Text>
          )}
          {actionLoading && <ActivityIndicator size="small" color="#4F46E5" style={styles.loadingIndicator} />}
        </ScrollView>
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, actionLoading && styles.disabledButton]}
            onPress={handleCreateExercise}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modalButtonText}>Create Exercise</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

  const renderUpdateExerciseModal = () => (
  <Modal
    visible={showUpdateExerciseModal}
    transparent={true}
    animationType="slide"
    onRequestClose={() => {
      setShowUpdateExerciseModal(false);
      setMediaUri(null);
    }}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.dragHandle} />
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Update Exercise</Text>
          <TouchableOpacity
            onPress={() => {
              setShowUpdateExerciseModal(false);
              setMediaUri(null);
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalScrollView}>
          <Text style={styles.inputLabel}>Exercise Name</Text>
          <TextInput
            style={[styles.input, formErrors.exerciseName && styles.inputError]}
            value={updateExercise.exerciseName}
            onChangeText={(text) => {
              setUpdateExercise({ ...updateExercise, exerciseName: text });
              setFormErrors({ ...formErrors, exerciseName: '' });
            }}
            placeholder="Enter exercise name (min 3 chars)"
            placeholderTextColor="#94A3B8"
          />
          {formErrors.exerciseName && <Text style={styles.errorText}>{formErrors.exerciseName}</Text>}
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            value={updateExercise.description}
            onChangeText={(text) => setUpdateExercise({ ...updateExercise, description: text })}
            placeholder="Enter description"
            placeholderTextColor="#94A3B8"
            multiline
          />
          <Text style={styles.inputLabel}>Gender Specification</Text>
          <Picker
            selectedValue={updateExercise.genderSpecific}
            onValueChange={(value) => {
              setUpdateExercise({ ...updateExercise, genderSpecific: value });
              setFormErrors({ ...formErrors, genderSpecific: '' });
            }}
            style={[styles.picker, formErrors.genderSpecific && styles.inputError]}
          >
            <Picker.Item label="Unisex" value="Unisex" />
            <Picker.Item label="Male" value="Male" />
            <Picker.Item label="Female" value="Female" />
            <Picker.Item label="Other" value="Other" />
          </Picker>
          {formErrors.genderSpecific && <Text style={styles.errorText}>{formErrors.genderSpecific}</Text>}
          <Text style={styles.inputLabel}>Calories Burned Per Minute (Optional)</Text>
          <TextInput
            style={styles.input}
            value={updateExercise.caloriesBurnedPerMin.toString()}
            onChangeText={(text) => setUpdateExercise({ ...updateExercise, caloriesBurnedPerMin: text })}
            placeholder="Enter calories burned per minute"
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
          <Text style={styles.inputLabel}>Media (Optional)</Text>
          <View style={styles.mediaContainer}>
            <TouchableOpacity
              style={[styles.mediaButton, actionLoading && styles.disabledButton]}
              onPress={pickMedia}
              disabled={actionLoading}
            >
              <Text style={styles.mediaButtonText}>
                {mediaUri ? 'Change Image' : 'Select Image'}
              </Text>
            </TouchableOpacity>
            {mediaUri && (
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => {
                  Alert.alert(
                    'Remove Image',
                    'Are you sure you want to remove this image?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', onPress: () => setMediaUri(null), style: 'destructive' },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
          {mediaUri ? (
            <View style={styles.mediaPreviewContainer}>
              <Image
                source={{ uri: mediaUri }}
                style={styles.mediaPreview}
                resizeMode="cover"
                onError={() => {
                  Alert.alert('Error', 'Failed to load image. Please try another one.');
                  setMediaUri(null);
                }}
              />
            </View>
          ) : (
            <Text style={styles.noMediaText}>No image selected</Text>
          )}
          {actionLoading && <ActivityIndicator size="small" color="#4F46E5" style={styles.loadingIndicator} />}
        </ScrollView>
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalButton, actionLoading && styles.disabledButton]}
            onPress={handleUpdateExercise}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.modalButtonText}>Update Exercise</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

  const renderDeleteModal = () => (
    <Modal visible={showDeleteModal} transparent={true} animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.deleteModalContent}>
          <View style={styles.modalIconContainer}>
            <Feather name="trash-2" size={32} color="#EF4444" />
          </View>
          <Text style={styles.modalTitle}>Delete Service Package</Text>
          <Text style={styles.modalMessage}>Are you sure you want to delete this service package?</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowDeleteModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton, actionLoading && styles.disabledButton]}
              onPress={handleDeletePackage}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="fitness-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Service Packages Found</Text>
      <Text style={styles.emptyText}>Create a new service package to get started.</Text>
      <TouchableOpacity style={styles.clearFiltersButton} onPress={() => setShowAddPackageModal(true)}>
        <Text style={styles.clearFiltersText}>Add Package</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>My Service Packages</Text>
            <Text style={styles.headerSubtitle}>Manage your fitness packages</Text>
          </View>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => setShowAddPackageModal(true)}>
            <Ionicons name="add-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.View style={[styles.searchContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your packages..."
            value={searchTerm}
            onChangeText={handleSearch}
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />
          {searchTerm && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {totalItems} packages found • Page {pageNumber} of {totalPages}
          </Text>
        </View>
      </Animated.View>

      {loading && pageNumber === 1 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading your service packages...</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.packageId.toString()}
          renderItem={renderPackage}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading && pageNumber > 1 ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.footerLoaderText}>Loading more...</Text>
              </View>
            ) : null
          }
        />
      )}

      {totalItems > 0 && (
        <Animated.View style={[styles.paginationContainer, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={[styles.paginationButton, pageNumber <= 1 || loading ? styles.disabledButton : null]}
            onPress={handlePreviousPage}
            disabled={pageNumber <= 1 || loading}
          >
            <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.pageInfoContainer}>
            <Text style={styles.pageInfo}>Page {pageNumber} of {totalPages}</Text>
          </View>
          <TouchableOpacity
            style={[styles.paginationButton, pageNumber >= totalPages || loading ? styles.disabledButton : null]}
            onPress={handleNextPage}
            disabled={pageNumber >= totalPages || loading}
          >
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {renderAddPackageModal()}
      {renderCategoryModal()}
      {renderExerciseSelectionModal()}
      {renderCreateExerciseModal()}
      {renderUpdateExerciseModal()}
      {renderDeleteModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.primaryColor },
  header: { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, paddingBottom: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  headerTextContainer: { flex: 1, alignItems: 'center' },
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
  headerActionButton: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.2)' },
  searchContainer: {
    backgroundColor: '#F8FAFC',
    marginTop: 15,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#1E293B', paddingVertical: 16 },
  clearSearchButton: { padding: 4 },
  resultsInfo: { alignItems: 'center' },
  resultsText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  listContent: { padding: 16, paddingBottom: 100, backgroundColor: '#fff' },
  packageItem: { marginBottom: 20 },
  packageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: { padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitleContainer: { flex: 1 },
  packageName: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  trainerName: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 8, borderRadius: 20, backgroundColor: '#FEE2E2' },
  cardContent: { marginTop: 8 },
  packageDescription: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 16 },
  descriptionContainer: { maxHeight: 40, overflow: 'hidden' },
  packageDetailsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  packageDetailItem: { flexDirection: 'row', alignItems: 'center' },
  detailIconContainer: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  packageDetailText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F8FAFC' },
  loaderText: { fontSize: 16, color: '#4F46E5', marginTop: 16, fontWeight: '500' },
  footerLoader: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20 },
  footerLoaderText: { fontSize: 14, color: '#4F46E5', marginLeft: 8, fontWeight: '500' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#F8FAFC' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  paginationContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    backgroundColor: '#FFFFFF',
    opacity: 0.4,
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 5,
    paddingHorizontal: 5,
    borderRadius: 10,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: { backgroundColor: '#CBD5E1', shadowOpacity: 0, elevation: 0 },
  pageInfoContainer: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  pageInfo: { fontSize: 16, color: '#1E293B', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end', alignItems: 'stretch' },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
    minHeight: '50%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    width: '85%',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  closeButton: { padding: 4 },
  modalScrollView: { flex: 1, paddingHorizontal: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { fontSize: 14, color: '#EF4444', marginBottom: 8 },
  picker: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  categoryItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  categoryName: { fontSize: 16, color: '#1E293B' },
  noCategoriesText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginVertical: 16 },
  exerciseItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  exerciseDescription: { fontSize: 14, color: '#64748B', marginTop: 4 },
  exerciseGender: { fontSize: 14, color: '#64748B', marginTop: 4 },
  exerciseMedia: { width: 100, height: 100, borderRadius: 8, marginTop: 8 },
  updateButton: { padding: 8 },
  noExercisesText: { fontSize: 16, color: '#64748B', textAlign: 'center', marginVertical: 16 },
  mediaButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  mediaButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  mediaPreview: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  modalActions: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  modalButton: { flex: 1, backgroundColor: '#4F46E5', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mediaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  mediaButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  mediaButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  removeMediaButton: {
    padding: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
  },
  mediaPreviewContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mediaPreview: {
    width: '100%',
    height: 200,
  },
  noMediaText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  exerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseMediaContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exerciseMedia: {
    width: '100%',
    height: '100%',
  },
  exerciseMediaPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exerciseTextContainer: {
    flex: 1,
  },
  modalMessage: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  cancelButton: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  confirmButton: { backgroundColor: '#EF4444' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#334155' },
  confirmButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  dragHandle: { width: 40, height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, alignSelf: 'center', marginTop: 8, marginBottom: 8 },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  clearFiltersText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },
  loadingIndicator: { marginVertical: 20 },
});

export default TrainerServicePackageScreen;
