import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Image,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { useNavigation } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import * as ImagePicker from 'expo-image-picker';
import { apiUploadVideoCloudService } from 'services/apiUploadVideoCloudService';

const { width } = Dimensions.get('window');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

// Custom Button Component
const CustomButton = ({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium', 
  disabled = false, 
  loading = false, 
  icon, 
  style,
  ...props 
}) => {
  const getButtonStyle = () => {
    const baseStyle = [styles.customButton];
    switch (variant) {
      case 'primary': baseStyle.push(styles.primaryButton); break;
      case 'secondary': baseStyle.push(styles.secondaryButton); break;
      case 'outline': baseStyle.push(styles.outlineButton); break;
      case 'ghost': baseStyle.push(styles.ghostButton); break;
      case 'danger': baseStyle.push(styles.dangerButton); break;
    }
    switch (size) {
      case 'small': baseStyle.push(styles.smallButton); break;
      case 'large': baseStyle.push(styles.largeButton); break;
      default: baseStyle.push(styles.mediumButton);
    }
    if (disabled) baseStyle.push(styles.disabledButton);
    if (style) baseStyle.push(style);
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.customButtonText];
    switch (variant) {
      case 'primary':
      case 'danger': baseStyle.push(styles.primaryButtonText); break;
      case 'secondary': baseStyle.push(styles.secondaryButtonText); break;
      case 'outline':
      case 'ghost': baseStyle.push(styles.outlineButtonText); break;
    }
    switch (size) {
      case 'small': baseStyle.push(styles.smallButtonText); break;
      case 'large': baseStyle.push(styles.largeButtonText); break;
    }
    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <View style={styles.buttonContent}>
          <ActivityIndicator 
            size="small" 
            color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#4F46E5'} 
          />
          <Text style={[getTextStyle(), { marginLeft: 8 }]}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.buttonContent}>
          {icon && (
            <Ionicons 
              name={icon} 
              size={size === 'small' ? 16 : size === 'large' ? 24 : 20} 
              color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : '#4F46E5'} 
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Custom Select Component
const CustomSelect = ({ 
  label, 
  value, 
  onSelect, 
  options, 
  placeholder = "Select an option", 
  error, 
  required = false,
  icon = "chevron-down"
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    const selected = options.find(option => option.value === value);
    setSelectedOption(selected);
  }, [value, options]);

  const handleSelect = (option) => {
    setSelectedOption(option);
    onSelect(option.value);
    setIsVisible(false);
  };

  return (
    <View style={styles.inputCard}>
      <View style={styles.labelContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        {required && <Text style={styles.requiredAsterisk}>*</Text>}
      </View>
      
      <TouchableOpacity
        style={[styles.selectButton, error && styles.inputError]}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.selectButtonText, 
          !selectedOption && styles.selectPlaceholder
        ]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons 
          name={icon} 
          size={20} 
          color={error ? '#EF4444' : '#64748B'} 
        />
      </TouchableOpacity>
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity 
                onPress={() => setIsVisible(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={options}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === value && styles.selectedOption
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[
                    styles.optionText,
                    item.value === value && styles.selectedOptionText
                  ]}>
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={20} color="#4F46E5" />
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Toggle Button Group Component
const ToggleButtonGroup = ({ 
  options, 
  selectedValue, 
  onSelect, 
  label, 
  style 
}) => {
  return (
    <View style={[styles.inputCard, style]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.toggleContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.toggleButton,
              selectedValue === option.value && styles.toggleButtonActive,
              index === 0 && styles.toggleButtonFirst,
              index === options.length - 1 && styles.toggleButtonLast
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.8}
          >
            {option.icon && (
              <Ionicons 
                name={option.icon} 
                size={18} 
                color={selectedValue === option.value ? '#FFFFFF' : '#64748B'} 
              />
            )}
            <Text style={[
              styles.toggleButtonText,
              selectedValue === option.value && styles.toggleButtonTextActive
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Enhanced Input Component
const CustomInput = ({ 
  label, 
  value, 
  onChangeText, 
  placeholder, 
  error, 
  multiline = false, 
  keyboardType = 'default',
  required = false,
  leftIcon,
  rightIcon,
  onRightIconPress,
  ...props 
}) => (
  <View style={styles.inputCard}>
    <View style={styles.labelContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      {required && <Text style={styles.requiredAsterisk}>*</Text>}
    </View>
    <View style={[styles.inputContainer, error && styles.inputError]}>
      {leftIcon && (
        <Ionicons name={leftIcon} size={20} color="#64748B" style={styles.inputIcon} />
      )}
      <TextInput
        style={[
          styles.input, 
          multiline && styles.multilineInput,
          leftIcon && styles.inputWithLeftIcon,
          rightIcon && styles.inputWithRightIcon
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
      {rightIcon && (
        <TouchableOpacity onPress={onRightIconPress} style={styles.rightIconContainer}>
          <Ionicons name={rightIcon} size={20} color="#64748B" />
        </TouchableOpacity>
      )}
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// Media Upload Component
const MediaUploadSection = ({ 
  useMediaUpload, 
  setUseMediaUpload, 
  mediaUri, 
  onPickMedia, 
  mediaUrl, 
  onChangeMediaUrl, 
  actionLoading, 
  error, 
  setMediaUri, 
  isImage = true 
}) => {
  const mediaSourceOptions = [
    { label: 'Upload', value: true, icon: 'cloud-upload-outline' },
    { label: 'URL', value: false, icon: 'link-outline' }
  ];

  return (
    <>
      <ToggleButtonGroup
        label={`${isImage ? 'Image' : 'Video'} Source`}
        options={mediaSourceOptions}
        selectedValue={useMediaUpload}
        onSelect={setUseMediaUpload}
      />

      {useMediaUpload ? (
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{isImage ? 'Upload Image' : 'Upload Video'}</Text>
          <CustomButton
            title={mediaUri ? `Change ${isImage ? 'Image' : 'Video'}` : `Select ${isImage ? 'Image' : 'Video'}`}
            onPress={onPickMedia}
            variant="outline"
            icon={isImage ? 'camera-outline' : 'videocam-outline'}
            loading={actionLoading}
            style={{ marginTop: 8 }}
          />
          {mediaUri && (
            <View style={styles.mediaPreviewContainer}>
              {isImage ? (
                <Image source={{ uri: mediaUri }} style={styles.mediaPreview} />
              ) : (
                <Video
                  source={{ uri: mediaUri }}
                  style={styles.mediaPreview}
                  useNativeControls
                  resizeMode="cover"
                  shouldPlay={false}
                />
              )}
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setMediaUri(null)}
              >
                <Ionicons name="close-circle" size={24} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <CustomInput
          label={`${isImage ? 'Image' : 'Video'} URL`}
          value={mediaUrl}
          onChangeText={onChangeMediaUrl}
          placeholder={isImage ? 'https://example.com/image.jpg' : 'https://www.youtube.com/watch?v=... or https://example.com/video.mp4'}
          error={error}
          autoCapitalize="none"
          autoCorrect={false}
          leftIcon="link-outline"
        />
      )}
    </>
  );
};

const CreateExerciseScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const [newExercise, setNewExercise] = useState({
    exerciseName: '',
    description: '',
    categoryId: null,
    genderSpecific: 'Unisex',
    imageUrl: '',
    mediaUrl: '',
    caloriesBurnedPerMin: '',
    isPrivate: 0,
  });
  const [categories, setCategories] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [useImageUpload, setUseImageUpload] = useState(true);
  const [useVideoUpload, setUseVideoUpload] = useState(true);
  const [formErrors, setFormErrors] = useState({});
  const [actionLoading, setActionLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const genderOptions = useMemo(() => [
    { label: 'Unisex', value: 'Unisex' },
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' }
  ], []);

  const visibilityOptions = useMemo(() => [
    { label: 'Public', value: 0 },
    { label: 'Private', value: 1 }
  ], []);

  const categoryOptions = useMemo(() => [
    { label: 'Select Category', value: null },
    ...categories.map(category => ({
      label: category.categoryName,
      value: category.categoryId
    }))
  ], [categories]);

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
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }
    fetchCategories();
  }, [authLoading, user, fetchCategories]);

  const pickMedia = useCallback(async (isImage = true) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Please allow access to your media library.');
      return;
    }
    
    setActionLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: isImage ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        aspect: isImage ? [16, 9] : undefined,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const mimeType = selectedAsset.mimeType || (isImage ? `image/${selectedAsset.uri.split('.').pop().toLowerCase()}` : `video/${selectedAsset.uri.split('.').pop().toLowerCase()}`);
        
        const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
        const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
        
        console.log(`Selected ${isImage ? 'image' : 'video'}:`, { uri: selectedAsset.uri, mimeType, fileSize: selectedAsset.fileSize });
        
        if (!allowedTypes.includes(mimeType)) {
          Alert.alert('Error', `Only ${allowedTypes.join(', ')} ${isImage ? 'images' : 'videos'} are allowed.`);
          return;
        }
        
        if (selectedAsset.fileSize && selectedAsset.fileSize > maxSize) {
          Alert.alert('Error', `${isImage ? 'Image' : 'Video'} size exceeds ${isImage ? '5MB' : '100MB'} limit.`);
          return;
        }
        
        if (isImage) {
          setImageUri(selectedAsset.uri);
        } else {
          setVideoUri(selectedAsset.uri);
        }
      }
    } catch (error) {
      console.error(`Error picking ${isImage ? 'image' : 'video'}:`, error);
      Alert.alert('Error', `Failed to pick ${isImage ? 'image' : 'video'}. Please try again.`);
    } finally {
      setActionLoading(false);
    }
  }, []);

  const uploadMedia = useCallback(async (uri, isImage = true) => {
    if (!uri || typeof uri !== 'string') {
      Alert.alert('Error', `No valid ${isImage ? 'image' : 'video'} selected for upload.`);
      return null;
    }
    
    try {
      const formData = new FormData();
      const uriParts = uri.split('.');
      const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
      const mimeType = isImage 
        ? `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
        : `video/${fileExtension === 'mov' ? 'quicktime' : fileExtension}`;
      
      const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
      
      if (!allowedTypes.includes(mimeType)) {
        Alert.alert('Error', `Only ${allowedTypes.join(', ')} ${isImage ? 'images' : 'videos'} are allowed.`);
        return null;
      }
      
      const file = {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: `${isImage ? 'image' : 'video'}_${Date.now()}.${fileExtension}`,
        type: mimeType,
      };
      
      console.log(`Preparing to upload ${isImage ? 'image' : 'video'}:`, file);
      
      formData.append('file', file);
      
      console.log('FormData content:', formData);
      
      const response = isImage
        ? await trainerService.uploadMedia(formData)
        : await apiUploadVideoCloudService.uploadVideo(formData);
      
      console.log(`Upload ${isImage ? 'image' : 'video'} response:`, response);
      
      if (response.statusCode === 200 && response.data?.mediaUrl) {
        return response.data.mediaUrl;
      } else if (!isImage && !response.isError && response.videoUrl) {
        return response.videoUrl;
      }
      
      throw new Error(response.message || `Failed to upload ${isImage ? 'image' : 'video'}.`);
    } catch (error) {
      console.error(`Error uploading ${isImage ? 'image' : 'video'}:`, error);
      Alert.alert('Error', error.message || `Failed to upload ${isImage ? 'image' : 'video'}.`);
      return null;
    }
  }, []);

  const validateMediaUrl = (url, isImage = true) => {
    if (isImage) {
      const imageUrlPattern = /^(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp))$/i;
      return url && imageUrlPattern.test(url);
    } else {
      const videoUrlPattern = /^(https?:\/\/)(www\.youtube\.com\/watch\?v=|youtu\.be\/|.*\.(?:mp4|mov|avi|mkv|webm))/i;
      return url && videoUrlPattern.test(url);
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      setActionLoading(true);
      const response = await trainerService.getAllExerciseCategories();
      console.log('Categories response:', response);
      if (response.statusCode === 200 && response.data?.categories) {
        setCategories(response.data.categories);
      } else {
        Alert.alert('Error', response.message || 'Unable to load categories.');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      Alert.alert('Error', error.message || 'Failed to load categories.');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const resetFormAndReload = useCallback(() => {
    setNewExercise({
      exerciseName: '',
      description: '',
      categoryId: null,
      genderSpecific: 'Unisex',
      imageUrl: '',
      mediaUrl: '',
      caloriesBurnedPerMin: '',
      isPrivate: 0,
    });
    setImageUri(null);
    setVideoUri(null);
    setUseImageUpload(true);
    setUseVideoUpload(true);
    setFormErrors({});
    fetchCategories();
  }, [fetchCategories]);

  const validateExerciseForm = () => {
    const errors = {};
    
    if (!newExercise.exerciseName.trim()) {
      errors.exerciseName = 'Exercise name is required.';
    } else if (newExercise.exerciseName.trim().length < 3) {
      errors.exerciseName = 'Exercise name must be at least 3 characters long.';
    }
    
    if (!newExercise.categoryId) {
      errors.categoryId = 'Category is required.';
    }
    
    if (!newExercise.genderSpecific) {
      errors.genderSpecific = 'Gender specification is required.';
    }
    
    if (newExercise.imageUrl && !validateMediaUrl(newExercise.imageUrl, true)) {
      errors.imageUrl = 'Invalid image URL.';
    }
    
    if (newExercise.mediaUrl && !validateMediaUrl(newExercise.mediaUrl, false)) {
      errors.mediaUrl = 'Invalid video URL. Please use a YouTube link or a valid video URL.';
    }
    
    if (newExercise.caloriesBurnedPerMin && isNaN(parseFloat(newExercise.caloriesBurnedPerMin))) {
      errors.caloriesBurnedPerMin = 'Please enter a valid number.';
    } else if (parseFloat(newExercise.caloriesBurnedPerMin) < 0) {
      errors.caloriesBurnedPerMin = 'Calories burned cannot be negative.';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateExercise = useCallback(async () => {
    if (!validateExerciseForm()) {
      Alert.alert('Validation Error', 'Please correct the errors in the form.');
      return;
    }
    
    try {
      setActionLoading(true);
      let imageUrl = newExercise.imageUrl;
      let mediaUrl = newExercise.mediaUrl;
      
      if (useImageUpload && imageUri) {
        imageUrl = await uploadMedia(imageUri, true);
        if (!imageUrl) return;
      } else if (!useImageUpload && newExercise.imageUrl && !validateMediaUrl(newExercise.imageUrl, true)) {
        Alert.alert('Validation Error', 'Please enter a valid image URL.');
        return;
      }
      
      if (useVideoUpload && videoUri) {
        mediaUrl = await uploadMedia(videoUri, false);
        if (!mediaUrl) return;
      } else if (!useVideoUpload && newExercise.mediaUrl && !validateMediaUrl(newExercise.mediaUrl, false)) {
        Alert.alert('Validation Error', 'Please enter a valid video URL (e.g., YouTube or direct video link).');
        return;
      }
      
      const exerciseData = {
        exerciseName: newExercise.exerciseName.trim(),
        description: newExercise.description.trim(),
        categoryId: newExercise.categoryId,
        genderSpecific: newExercise.genderSpecific,
        imageUrl: imageUrl || null,
        mediaUrl: mediaUrl || null,
        caloriesBurnedPerMin: parseFloat(newExercise.caloriesBurnedPerMin) || 0,
        trainerId: user.userId,
        isPrivate: newExercise.isPrivate,
      };
      
      console.log('Creating exercise with data:', exerciseData);
      const response = await trainerService.createFitnessExercise(exerciseData);
      console.log('Create exercise response:', response);
      
      if (response.statusCode === 201) {
        Alert.alert('Success', 'Exercise created successfully.', [
          {
            text: 'OK',
            onPress: () => {
              resetFormAndReload();
              navigation.navigate('TrainerExerciseManagement');
            }
          }
        ]);
      } else {
        throw new Error(response.message || 'Failed to create exercise.');
      }
    } catch (error) {
      console.error('Error creating exercise:', error);
      let errorMessage = 'Failed to create exercise.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes('entity changes')) {
        errorMessage = 'Unable to save exercise. Please check your input data and try again.';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, [newExercise, imageUri, videoUri, useImageUpload, useVideoUpload, user, resetFormAndReload, navigation]);

  const updateExerciseField = (field, value) => {
    setNewExercise(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      
      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Create Exercise</Text>
            <Text style={styles.headerSubtitle}>Add a new exercise to your collection</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.formContainer, 
              { 
                opacity: fadeAnim, 
                transform: [{ translateY: slideAnim }] 
              }
            ]}
          >
            <CustomInput
              label="Exercise Name"
              value={newExercise.exerciseName}
              onChangeText={(text) => updateExerciseField('exerciseName', text)}
              placeholder="Enter exercise name"
              error={formErrors.exerciseName}
              required
              leftIcon="fitness-outline"
            />

            <CustomInput
              label="Description"
              value={newExercise.description}
              onChangeText={(text) => updateExerciseField('description', text)}
              placeholder="Describe the exercise..."
              multiline
              leftIcon="document-text-outline"
            />

            <CustomSelect
              label="Category"
              value={newExercise.categoryId}
              onSelect={(value) => updateExerciseField('categoryId', value)}
              options={categoryOptions}
              error={formErrors.categoryId}
              required
              icon="grid-outline"
            />

            <CustomSelect
              label="Gender Specification"
              value={newExercise.genderSpecific}
              onSelect={(value) => updateExerciseField('genderSpecific', value)}
              options={genderOptions}
              error={formErrors.genderSpecific}
              required
              icon="people-outline"
            />

            <CustomInput
              label="Calories Burned Per Minute"
              value={newExercise.caloriesBurnedPerMin}
              onChangeText={(text) => updateExerciseField('caloriesBurnedPerMin', text)}
              placeholder="0"
              keyboardType="numeric"
              error={formErrors.caloriesBurnedPerMin}
              leftIcon="flame-outline"
            />

            <CustomSelect
              label="Visibility"
              value={newExercise.isPrivate}
              onSelect={(value) => updateExerciseField('isPrivate', value)}
              options={visibilityOptions}
              icon="eye-outline"
            />

            <MediaUploadSection
              useMediaUpload={useImageUpload}
              setUseMediaUpload={setUseImageUpload}
              mediaUri={imageUri}
              onPickMedia={() => pickMedia(true)}
              mediaUrl={newExercise.imageUrl}
              onChangeMediaUrl={(text) => updateExerciseField('imageUrl', text)}
              actionLoading={actionLoading}
              error={formErrors.imageUrl}
              setMediaUri={setImageUri}
              isImage={true}
            />

            <MediaUploadSection
              useMediaUpload={useVideoUpload}
              setUseMediaUpload={setUseVideoUpload}
              mediaUri={videoUri}
              onPickMedia={() => pickMedia(false)}
              mediaUrl={newExercise.mediaUrl}
              onChangeMediaUrl={(text) => updateExerciseField('mediaUrl', text)}
              actionLoading={actionLoading}
              error={formErrors.mediaUrl}
              setMediaUri={setVideoUri}
              isImage={false}
            />
          </Animated.View>
        </ScrollView>

        <Animated.View style={[styles.buttonContainer, { opacity: fadeAnim }]}>
          <View style={styles.actionButtonsContainer}>
            <CustomButton
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="ghost"
              size="medium"
              style={styles.cancelButton}
            />
            <CustomButton
              title="Create Exercise"
              onPress={handleCreateExercise}
              variant="primary"
              size="medium"
              loading={actionLoading}
              icon="add-circle-outline"
              style={styles.createButton}
            />
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerRight: {
    width: 44,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  formContainer: {
    paddingBottom: 24,
  },
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  requiredAsterisk: {
    color: '#EF4444',
    fontSize: 16,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 50,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  inputIcon: {
    marginLeft: 16,
  },
  rightIconContainer: {
    padding: 16,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  customButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customButtonText: {
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#4F46E5',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#1E293B',
  },
  outlineButtonText: {
    color: '#4F46E5',
  },
  smallButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  mediumButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  largeButton: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  smallButtonText: {
    fontSize: 14,
  },
  largeButtonText: {
    fontSize: 18,
  },
  disabledButton: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 50,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#1E293B',
  },
  selectPlaceholder: {
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalCloseButton: {
    padding: 4,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedOption: {
    backgroundColor: '#F0F9FF',
  },
  optionText: {
    fontSize: 16,
    color: '#1E293B',
  },
  selectedOptionText: {
    color: '#4F46E5',
    fontWeight: '600',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonFirst: {
    marginRight: 2,
  },
  toggleButtonLast: {
    marginLeft: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  mediaPreviewContainer: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  mediaPreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  createButton: {
    flex: 2,
  },
});

export default CreateExerciseScreen;