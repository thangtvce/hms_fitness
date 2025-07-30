import React,{ useState,useRef,useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Animated,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Dimensions,
  TouchableWithoutFeedback,
  PanResponder,
  FlatList,
  Keyboard,
} from 'react-native';
import { useNavigation,useRoute } from '@react-navigation/native';
import { useAuth } from 'context/AuthContext';
import { trainerService } from 'services/apiTrainerService';
import { apiUploadImageCloudService } from 'services/apiUploadImageCloudService';
import { apiUploadVideoCloudService } from 'services/apiUploadVideoCloudService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { showErrorFetchAPI,showSuccessMessage,showErrorMessage } from 'utils/toastUtil';
import { Video } from 'expo-av';
import YoutubePlayer from 'react-native-youtube-iframe';
import Header from 'components/Header';

const { width,height } = Dimensions.get('window');
const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/bmp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4','video/quicktime','video/x-msvideo','video/x-matroska','video/webm'];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const GENDER_OPTIONS = ['Male','Female','Other'];
const DEFAULT_IMAGE_BACKGROUND = 'https://via.placeholder.com/600x400.png?text=Image+Placeholder';
const DEFAULT_VIDEO_BACKGROUND = 'https://via.placeholder.com/600x400.png?text=Video+Placeholder';

const EditExerciseScreen = () => {
  const { user,loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { exerciseId } = route.params;

  const [exerciseData,setExerciseData] = useState({
    exerciseName: '',
    description: '',
    categoryId: null,
    genderSpecific: null,
    caloriesBurnedPerMin: '',
    imageUrl: '',
    mediaUrl: '',
    isPrivate: 0,
    trainerId: user?.userId || 0,
  });
  const [categories,setCategories] = useState([]);
  const [errors,setErrors] = useState({});
  const [touched,setTouched] = useState({});
  const [updating,setUpdating] = useState(false);
  const [showImageOptions,setShowImageOptions] = useState(false);
  const [showVideoOptions,setShowVideoOptions] = useState(false);
  const [showImageUrlInput,setShowImageUrlInput] = useState(false);
  const [showVideoUrlInput,setShowVideoUrlInput] = useState(false);
  const [showCategoryModal,setShowCategoryModal] = useState(false);
  const [showGenderModal,setShowGenderModal] = useState(false);
  const [showVideoPreview,setShowVideoPreview] = useState(false);
  const [imageUrl,setImageUrl] = useState('');
  const [videoUrl,setVideoUrl] = useState('');
  const [urlError,setUrlError] = useState('');
  const [mediaUploading,setMediaUploading] = useState(false);
  const [thumbnail,setThumbnail] = useState('');
  const [videoThumbnail,setVideoThumbnail] = useState('');
  const [cloudImageUrl,setCloudImageUrl] = useState('');
  const [cloudVideoUrl,setCloudVideoUrl] = useState('');
  const [keyboardHeight,setKeyboardHeight] = useState(0);
  const [isKeyboardVisible,setIsKeyboardVisible] = useState(false);
  const [currentInputFocused,setCurrentInputFocused] = useState(null);
  const [loadingData,setLoadingData] = useState(true);
  const [editorHtml,setEditorHtml] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const webViewRef = useRef(null);
  const scrollViewRef = useRef(null);
  const containerRef = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: () => {
        if (isKeyboardVisible && !currentInputFocused) {
          Keyboard.dismiss();
        }
      },
    })
  ).current;

  const generateCkEditorHtml = (initialData) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://cdn.ckeditor.com/ckeditor5/39.0.0/classic/ckeditor.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        }
        #editor-container {
          width: 100%;
          box-sizing: border-box;
        }
        .ck-editor__top {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #F9FAFB;
          border-bottom: 1px solid #E5E7EB;
        }
        .ck-editor__editable {
          min-height: 140px;
          padding: 16px;
          background: #FFFFFF;
        }
        .ck-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          font-size: 16px;
          color: #000000;
        }
      </style>
    </head>
    <body>
      <div id="editor-container">
        <div id="editor"></div>
      </div>
      <script>
        ClassicEditor
          .create( document.querySelector( '#editor' ), {
            toolbar: {
              items: [
                'undo', 'redo',
                '|',
                'bold', 'italic', 'underline',
                '|',
                'bulletedList', 'numberedList',
                '|',
                'sourceEditing'
              ]
            },
            language: 'en',
            initialData: '${(initialData || "").replace(/'/g,"\\'")}'
          } )
          .then( editor => {
            editor.model.document.on( 'change:data', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'content', data: editor.getData() }));
            } );
          } )
          .catch( error => {
            console.error( error );
          } );
      </script>
    </body>
    </html>
  `;

  useEffect(() => {
    if (authLoading || !user?.userId) return;
    fetchCategories();
    fetchExerciseData();
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim,{
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  },[authLoading,user?.userId]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow',(e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide',() => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
      setCurrentInputFocused(null);
    });
    const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow',(e) => {
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });
    const keyboardWillHideListener = Keyboard.addListener('keyboardWillHide',() => {
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  },[]);

  const fetchCategories = async () => {
    try {
      const response = await trainerService.getExerciseCategory();
      if (response.statusCode === 200 && Array.isArray(response.data?.categories)) {
        setCategories(response.data.categories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      showErrorFetchAPI(error);
      setCategories([]);
    }
  };

  const fetchExerciseData = async () => {
    try {
      const response = await trainerService.getFitnessExerciseById(exerciseId);
      if (response.statusCode === 200 && response.data) {
        const exercise = response.data;
        setExerciseData({
          exerciseName: exercise.exerciseName || '',
          description: exercise.description || '',
          categoryId: exercise.categoryId || null,
          genderSpecific: exercise.genderSpecific || null,
          caloriesBurnedPerMin: exercise.caloriesBurnedPerMin ? String(exercise.caloriesBurnedPerMin) : '',
          imageUrl: exercise.imageUrl || '',
          mediaUrl: exercise.mediaUrl || '',
          isPrivate: exercise.isPrivate || 0,
          trainerId: user.userId || exercise.trainerId || 0,
        });
        setThumbnail(exercise.imageUrl || '');
        setCloudImageUrl(exercise.imageUrl || '');
        setVideoThumbnail(exercise.mediaUrl && isValidYouTubeUrl(exercise.mediaUrl) ? getYouTubeThumbnail(exercise.mediaUrl) : exercise.mediaUrl || '');
        setCloudVideoUrl(exercise.mediaUrl || '');
        setEditorHtml(generateCkEditorHtml(exercise.description));
      } else {
        throw new Error('Failed to fetch exercise data.');
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!exerciseData.exerciseName.trim()) {
      errors.exerciseName = 'Exercise name is required.';
    } else if (exerciseData.exerciseName.length < 3 || exerciseData.exerciseName.length > 255) {
      errors.exerciseName = 'Exercise name must be between 3 and 255 characters.';
    }
    if (exerciseData.description && exerciseData.description.replace(/<[^>]*>/g,'').length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }
    if (!exerciseData.categoryId) {
      errors.categoryId = 'Category is required.';
    }
    if (exerciseData.genderSpecific && !GENDER_OPTIONS.includes(exerciseData.genderSpecific)) {
      errors.genderSpecific = 'Gender must be Male, Female, or Other.';
    }
    if (
      exerciseData.caloriesBurnedPerMin &&
      (isNaN(parseFloat(exerciseData.caloriesBurnedPerMin)) || parseFloat(exerciseData.caloriesBurnedPerMin) < 0)
    ) {
      errors.caloriesBurnedPerMin = 'Calories burned per minute must be a non-negative number.';
    }
    if (exerciseData.mediaUrl && exerciseData.mediaUrl.length > 1000) {
      errors.mediaUrl = 'Media URL cannot exceed 1000 characters.';
    }
    if (exerciseData.isPrivate !== 0 && exerciseData.isPrivate !== 1) {
      errors.isPrivate = 'Privacy must be 0 (public) or 1 (private).';
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field,value) => {
    setExerciseData((prev) => ({ ...prev,[field]: value }));
    if (touched[field]) {
      setErrors((prev) => ({ ...prev,[field]: null }));
    }
  };

  const handleInputBlur = (field) => {
    setTouched((prev) => ({ ...prev,[field]: true }));
    setCurrentInputFocused(null);
    validateForm();
  };

  const handleInputFocus = (field) => {
    setCurrentInputFocused(field);
  };

  const createFormDataFromBase64 = (base64String,fileName = `media-${Date.now()}.jpg`) => {
    const formData = new FormData();
    const mimeTypeMatch = base64String.match(/^data:(image\/[a-z]+);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    const cleanedBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/,'');
    formData.append('file',{
      uri: `data:${mimeType};base64,${cleanedBase64}`,
      type: mimeType,
      name: fileName,
    });
    return formData;
  };

  const createVideoFormData = (uri,fileName = `video-${Date.now()}.mp4`,type = 'video/mp4') => {
    const formData = new FormData();
    formData.append('file',{
      uri,
      type,
      name: fileName,
    });
    return formData;
  };

  const isValidUrl = (url) => {
    const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;
    return urlRegex.test(url);
  };

  const isValidYouTubeUrl = (url) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/|.+\?v=)?([^&=%?]{11})/;
    return youtubeRegex.test(url);
  };

  const getYouTubeVideoId = (url) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return videoIdMatch ? videoIdMatch[1] : null;
  };

  const checkImageUrl = async (url) => {
    try {
      const response = await fetch(url,{ method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      return response.ok && contentType?.startsWith('image/');
    } catch (error) {
      return false;
    }
  };

  const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To select images, please grant access to your photo library in your device settings.',
          [
            { text: 'Cancel',style: 'cancel' },
            { text: 'Open Settings',onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setMediaUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16,9],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.base64) {
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
          setThumbnail(base64Image);
          setCloudImageUrl('');
          handleInputChange('imageUrl',base64Image);
        } else {
          setThumbnail(selectedAsset.uri);
          setCloudImageUrl('');
          handleInputChange('imageUrl',selectedAsset.uri);
          showErrorMessage('Base64 not available. Using local URI, which may not persist.');
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setMediaUploading(false);
      setShowImageOptions(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To take photos, please grant access to your camera in your device settings.',
          [
            { text: 'Cancel',style: 'cancel' },
            { text: 'Open Settings',onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setMediaUploading(true);
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16,9],
        quality: 0.8,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset.base64) {
          const base64Image = `data:image/jpeg;base64,${selectedAsset.base64}`;
          setThumbnail(base64Image);
          setCloudImageUrl('');
          handleInputChange('imageUrl',base64Image);
        } else {
          setThumbnail(selectedAsset.uri);
          setCloudImageUrl('');
          handleInputChange('imageUrl',selectedAsset.uri);
          showErrorMessage('Base64 not available. Using local URI, which may not persist.');
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setMediaUploading(false);
      setShowImageOptions(false);
    }
  };

  const handleImageUrl = () => {
    setShowImageOptions(false);
    setShowImageUrlInput(true);
    setImageUrl('');
    setUrlError('');
  };

  const confirmImageUrl = async () => {
    if (!imageUrl.trim()) {
      setUrlError('Please enter an image URL.');
      return;
    }
    if (!isValidUrl(imageUrl)) {
      setUrlError('Please enter a valid URL starting with http:// or https://.');
      return;
    }
    setMediaUploading(true);
    const isImageReachable = await checkImageUrl(imageUrl);
    setMediaUploading(false);
    if (!isImageReachable) {
      setUrlError('The URL does not point to a valid image or is unreachable.');
      return;
    }
    setThumbnail(imageUrl);
    setCloudImageUrl(imageUrl);
    handleInputChange('imageUrl',imageUrl);
    setShowImageUrlInput(false);
    setImageUrl('');
    setUrlError('');
  };

  const handlePickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'To select videos, please grant access to your photo library in your device settings.',
          [
            { text: 'Cancel',style: 'cancel' },
            { text: 'Open Settings',onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setMediaUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (ALLOWED_VIDEO_TYPES.includes(selectedAsset.type)) {
          if (selectedAsset.fileSize && selectedAsset.fileSize > MAX_VIDEO_SIZE) {
            showErrorMessage(`Video size exceeds ${MAX_VIDEO_SIZE / (1024 * 1024)}MB limit.`);
            setMediaUploading(false);
            return;
          }
          setVideoThumbnail(selectedAsset.uri);
          setCloudVideoUrl('');
          handleInputChange('mediaUrl',selectedAsset.uri);
        } else {
          showErrorMessage(`Invalid video type. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`);
        }
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setMediaUploading(false);
      setShowVideoOptions(false);
    }
  };

  const handleVideoUrl = () => {
    setShowVideoOptions(false);
    setShowVideoUrlInput(true);
    setVideoUrl('');
    setUrlError('');
  };

  const confirmVideoUrl = () => {
    if (!videoUrl.trim()) {
      setUrlError('Please enter a YouTube URL.');
      return;
    }
    if (!isValidYouTubeUrl(videoUrl)) {
      setUrlError('Please enter a valid YouTube URL.');
      return;
    }
    const thumbnailUrl = getYouTubeThumbnail(videoUrl);
    setVideoThumbnail(thumbnailUrl);
    setCloudVideoUrl(videoUrl);
    handleInputChange('mediaUrl',videoUrl);
    setShowVideoUrlInput(false);
    setVideoUrl('');
    setUrlError('');
  };

  const cancelMediaUrlInput = () => {
    setShowImageUrlInput(false);
    setShowVideoUrlInput(false);
    setImageUrl('');
    setVideoUrl('');
    setUrlError('');
  };

  const handleRemoveImage = () => {
    Alert.alert('Remove Image','Are you sure you want to remove this image?',[
      { text: 'Cancel',style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setThumbnail('');
          setCloudImageUrl('');
          handleInputChange('imageUrl','');
        },
      },
    ]);
  };

  const handleRemoveVideo = () => {
    Alert.alert('Remove Video','Are you sure you want to remove this video?',[
      { text: 'Cancel',style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setVideoThumbnail('');
          setCloudVideoUrl('');
          handleInputChange('mediaUrl','');
        },
      },
    ]);
  };

  const handlePreviewVideo = () => {
    if (exerciseData.mediaUrl) {
      setShowVideoPreview(true);
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) {
      showErrorMessage('Please fix the errors before updating the exercise.');
      return;
    }

    setUpdating(true);
    let finalImageUrl = cloudImageUrl || exerciseData.imageUrl;
    let finalVideoUrl = cloudVideoUrl || exerciseData.mediaUrl;

    try {
      if (thumbnail && thumbnail.startsWith('data:image') && !cloudImageUrl) {
        const formData = createFormDataFromBase64(thumbnail);
        const uploadResult = await apiUploadImageCloudService.uploadImage(formData);
        if (!uploadResult.isError && uploadResult.imageUrl) {
          finalImageUrl = uploadResult.imageUrl;
          setCloudImageUrl(uploadResult.imageUrl);
        } else {
          showErrorMessage('Image upload failed. Please try selecting the image again.');
          setUpdating(false);
          return;
        }
      }

      if (videoThumbnail && !videoThumbnail.startsWith('http') && !cloudVideoUrl) {
        const formData = createVideoFormData(videoThumbnail);
        const uploadResult = await apiUploadVideoCloudService.uploadVideo(formData);
        if (!uploadResult.isError && uploadResult.videoUrl) {
          finalVideoUrl = uploadResult.videoUrl;
          setCloudVideoUrl(uploadResult.videoUrl);
        } else {
          showErrorMessage('Video upload failed. Please try selecting the video again.');
          setUpdating(false);
          return;
        }
      }

      const payload = {
        exerciseId: exerciseId,
        exerciseName: exerciseData.exerciseName,
        description: exerciseData.description || null,
        categoryId: exerciseData.categoryId ? parseInt(exerciseData.categoryId) : null,
        genderSpecific: exerciseData.genderSpecific || null,
        caloriesBurnedPerMin: exerciseData.caloriesBurnedPerMin ? parseFloat(exerciseData.caloriesBurnedPerMin) : null,
        imageUrl: finalImageUrl || null,
        mediaUrl: finalVideoUrl || null,
        isPrivate: exerciseData.isPrivate,
        trainerId: user.userId,
      };

      if (payload.imageUrl && payload.imageUrl.length > 1000) {
        showErrorMessage('Image URL cannot exceed 1000 characters.');
        setUpdating(false);
        return;
      }

      const response = await trainerService.updateFitnessExercise(exerciseId,payload);
      if (response.statusCode === 200) {
        showSuccessMessage('Exercise updated successfully!');
        setTimeout(() => {
          navigation.navigate('TrainerExerciseManagement');
        },1000);
      } else {
        throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to update exercise.'}`);
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setUpdating(false);
    }
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
    setCurrentInputFocused(null);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.categoryId === categoryId);
    return category ? category.categoryName : 'Select Category';
  };

  const renderImageSection = () => (
    <Animated.View
      style={[
        styles.imageSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {thumbnail ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: thumbnail }} style={styles.imagePreview} resizeMode="cover" />
          <LinearGradient colors={['transparent','rgba(0,0,0,0.3)']} style={styles.imageOverlay} />
          <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
            <View style={styles.removeImageButtonInner}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editImageButton} onPress={() => setShowImageOptions(true)}>
            <View style={styles.editImageButtonInner}>
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.imageLabel}>
            <Ionicons name="image" size={14} color="#FFFFFF" />
            <Text style={styles.imageLabelText}>Exercise Image</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addImageContainer} onPress={() => setShowImageOptions(true)}>
          <Image source={{ uri: DEFAULT_IMAGE_BACKGROUND }} style={styles.imagePreview} resizeMode="cover" />
          <LinearGradient colors={['transparent','rgba(0,0,0,0.3)']} style={styles.imageOverlay} />
          <View style={styles.addImageContent}>
            <View style={styles.addImageIcon}>
              <Ionicons name="camera-outline" size={32} color="#0056D2" />
            </View>
            <Text style={styles.addImageTitle}>Add Exercise Image</Text>
            <Text style={styles.addImageSubtitle}>Make your exercise stand out with an image</Text>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderVideoSection = () => (
    <Animated.View
      style={[
        styles.imageSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {videoThumbnail ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: videoThumbnail }} style={styles.imagePreview} resizeMode="cover" />
          <LinearGradient colors={['transparent','rgba(0,0,0,0.3)']} style={styles.imageOverlay} />
          <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveVideo}>
            <View style={styles.removeImageButtonInner}>
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editImageButton} onPress={() => setShowVideoOptions(true)}>
            <View style={styles.editImageButtonInner}>
              <Ionicons name="pencil" size={16} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playVideoButton} onPress={handlePreviewVideo}>
            <View style={styles.playVideoButtonInner}>
              <Ionicons name="play" size={24} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <View style={styles.imageLabel}>
            <Ionicons name="videocam" size={14} color="#FFFFFF" />
            <Text style={styles.imageLabelText}>Exercise Video</Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addImageContainer} onPress={() => setShowVideoOptions(true)}>
          <Image source={{ uri: DEFAULT_VIDEO_BACKGROUND }} style={styles.imagePreview} resizeMode="cover" />
          <LinearGradient colors={['transparent','rgba(0,0,0,0.3)']} style={styles.imageOverlay} />
          <View style={styles.addImageContent}>
            <View style={styles.addImageIcon}>
              <Ionicons name="videocam-outline" size={32} color="#0056D2" />
            </View>
            <Text style={styles.addImageTitle}>Add Exercise Video</Text>
            <Text style={styles.addImageSubtitle}>Add a video or YouTube link</Text>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderVideoPreviewModal = () => (
    <Modal
      visible={showVideoPreview}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowVideoPreview(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowVideoPreview(false)}>
        <View style={styles.videoPreviewModalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.videoPreviewContainer}>
              <TouchableOpacity
                style={styles.videoPreviewCloseButton}
                onPress={() => setShowVideoPreview(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              {isValidYouTubeUrl(exerciseData.mediaUrl) ? (
                <YoutubePlayer
                  height={height * 0.6}
                  width={width * 0.9}
                  videoId={getYouTubeVideoId(exerciseData.mediaUrl)}
                  play={false}
                  onError={() => {
                    showErrorMessage('Failed to load YouTube video.');
                    setShowVideoPreview(false);
                  }}
                />
              ) : (
                <Video
                  source={{ uri: exerciseData.mediaUrl }}
                  style={styles.videoPlayer}
                  useNativeControls
                  resizeMode="contain"
                  onError={(error) => {
                    showErrorMessage('Failed to load video.');
                    setShowVideoPreview(false);
                  }}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderFormField = (label,value,onChangeText,onBlur,placeholder,multiline = false,icon,keyboardType = 'default') => {
    let maxLength = label === 'Exercise Name' ? 255 : label === 'Description' ? 500 : null;
    return (
      <Animated.View
        style={[
          styles.fieldContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            {icon && <Ionicons name={icon} size={16} color="#0056D2" style={styles.fieldIcon} />}
            <Text style={styles.fieldLabel}>{label}</Text>
          </View>
          {maxLength && (
            <Text style={styles.fieldCounter}>
              {value.length}/{maxLength}
            </Text>
          )}
        </View>
        <View style={[styles.inputContainer,errors[onBlur.split('.')[1]] && styles.inputError]}>
          <TextInput
            style={[styles.input,multiline && styles.multilineInput]}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={onChangeText}
            onFocus={() => handleInputFocus(onBlur.split('.')[1])}
            onBlur={() => handleInputBlur(onBlur.split('.')[1])}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            maxLength={maxLength}
            keyboardType={keyboardType}
          />
        </View>
        {errors[onBlur.split('.')[1]] && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errors[onBlur.split('.')[1]]}</Text>
          </View>
        )}
      </Animated.View>
    );
  };

  const renderRichEditor = () => (
    <Animated.View
      style={[
        styles.fieldContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldHeader}>
        <View style={styles.fieldLabelContainer}>
          <Ionicons name="document-text-outline" size={16} color="#0056D2" style={styles.fieldIcon} />
          <Text style={styles.fieldLabel}>Description</Text>
        </View>
        <Text style={styles.fieldCounter}>
          {exerciseData.description.replace(/<[^>]*>/g,'').length}/500
        </Text>
      </View>
      <View style={[styles.richEditorContainer,errors.description && styles.inputError]}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: editorHtml }}
          style={styles.richEditor}
          onMessage={(event) => {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'content') {
              handleInputChange('description',message.data);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          scalesPageToFit={false}
          automaticallyAdjustContentInsets={false}
          contentInset={{ top: 0,left: 0,bottom: 0,right: 0 }}
        />
      </View>
      {errors.description && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{errors.description}</Text>
        </View>
      )}
    </Animated.View>
  );

  const renderCategorySelector = () => (
    <Animated.View
      style={[
        styles.fieldContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldHeader}>
        <View style={styles.fieldLabelContainer}>
          <Ionicons name="list-outline" size={16} color="#0056D2" style={styles.fieldIcon} />
          <Text style={styles.fieldLabel}>Category</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.inputContainer,errors.categoryId && styles.inputError]}
        onPress={() => setShowCategoryModal(true)}
      >
        <Text style={styles.input}>{getCategoryName(exerciseData.categoryId)}</Text>
        <Ionicons name="chevron-down" size={20} color="#6B7280" style={styles.dropdownIcon} />
      </TouchableOpacity>
      {errors.categoryId && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{errors.categoryId}</Text>
        </View>
      )}
    </Animated.View>
  );

  const renderGenderSelector = () => (
    <Animated.View
      style={[
        styles.fieldContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldHeader}>
        <View style={styles.fieldLabelContainer}>
          <Ionicons name="person-outline" size={16} color="#0056D2" style={styles.fieldIcon} />
          <Text style={styles.fieldLabel}>Gender Specific</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.inputContainer,errors.genderSpecific && styles.inputError]}
        onPress={() => setShowGenderModal(true)}
      >
        <Text style={styles.input}>{exerciseData.genderSpecific || 'Select Gender'}</Text>
        <Ionicons name="chevron-down" size={20} color="#6B7280" style={styles.dropdownIcon} />
      </TouchableOpacity>
      {errors.genderSpecific && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{errors.genderSpecific}</Text>
        </View>
      )}
    </Animated.View>
  );

  const renderPrivacySelector = () => (
    <Animated.View
      style={[
        styles.privacySection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldHeader}>
        <View style={styles.fieldLabelContainer}>
          <Ionicons name="shield-outline" size={16} color="#0056D2" style={styles.fieldIcon} />
          <Text style={styles.fieldLabel}>Privacy Setting</Text>
        </View>
      </View>
      <View style={styles.privacyOptions}>
        <TouchableOpacity
          style={[styles.privacyOption,exerciseData.isPrivate === 0 && styles.privacyOptionActive]}
          onPress={() => handleInputChange('isPrivate',0)}
        >
          <View style={styles.privacyOptionHeader}>
            <Ionicons name="globe-outline" size={20} color={exerciseData.isPrivate === 0 ? '#FFFFFF' : '#0056D2'} />
            <Text style={[styles.privacyOptionTitle,exerciseData.isPrivate === 0 && styles.privacyOptionTitleActive]}>
              Public
            </Text>
          </View>
          <Text style={[styles.privacyOptionDesc,exerciseData.isPrivate === 0 && styles.privacyOptionDescActive]}>
            Anyone can access this exercise
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.privacyOption,exerciseData.isPrivate === 1 && styles.privacyOptionActive]}
          onPress={() => handleInputChange('isPrivate',1)}
        >
          <View style={styles.privacyOptionHeader}>
            <Ionicons name="lock-closed-outline" size={20} color={exerciseData.isPrivate === 1 ? '#FFFFFF' : '#0056D2'} />
            <Text style={[styles.privacyOptionTitle,exerciseData.isPrivate === 1 && styles.privacyOptionTitleActive]}>
              Private
            </Text>
          </View>
          <Text style={[styles.privacyOptionDesc,exerciseData.isPrivate === 1 && styles.privacyOptionDescActive]}>
            Only approved users can access
          </Text>
        </TouchableOpacity>
      </View>
      {errors.isPrivate && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.errorText}>{errors.isPrivate}</Text>
        </View>
      )}
    </Animated.View>
  );

  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowCategoryModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowCategoryModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.dropdownModal,{ transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity onPress={() => setShowCategoryModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <FlatList
                data={categories}
                keyExtractor={(item) => item.categoryId.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleInputChange('categoryId',item.categoryId);
                      setShowCategoryModal(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item.categoryName}</Text>
                  </TouchableOpacity>
                )}
                style={styles.dropdownList}
              />
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderGenderModal = () => (
    <Modal
      visible={showGenderModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowGenderModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.dropdownModal,{ transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Gender</Text>
                <TouchableOpacity onPress={() => setShowGenderModal(false)} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.dropdownList}>
                {GENDER_OPTIONS.map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleInputChange('genderSpecific',gender);
                      setShowGenderModal(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{gender}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderMediaOptionsModal = (isImage) => (
    <Modal
      visible={isImage ? showImageOptions : showVideoOptions}
      transparent={true}
      animationType="slide"
      onRequestClose={() => (isImage ? setShowImageOptions(false) : setShowVideoOptions(false))}
    >
      <TouchableWithoutFeedback onPress={() => (isImage ? setShowImageOptions(false) : setShowVideoOptions(false))}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.imageOptionsModal,{ transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isImage ? 'Add Image' : 'Add Video'}</Text>
                <TouchableOpacity
                  onPress={() => (isImage ? setShowImageOptions(false) : setShowVideoOptions(false))}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.imageOptionsContainer}>
                {isImage ? (
                  <>
                    <TouchableOpacity style={styles.imageOption} onPress={handleTakePhoto} disabled={mediaUploading}>
                      <LinearGradient colors={['#0056D2','#0041A3']} style={styles.imageOptionGradient}>
                        <Ionicons name="camera" size={28} color="#FFFFFF" />
                      </LinearGradient>
                      <View style={styles.imageOptionContent}>
                        <Text style={styles.imageOptionTitle}>Take Photo</Text>
                        <Text style={styles.imageOptionSubtitle}>Use your camera</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageOption} onPress={handlePickImage} disabled={mediaUploading}>
                      <LinearGradient colors={['#10B981','#059669']} style={styles.imageOptionGradient}>
                        <Ionicons name="images" size={28} color="#FFFFFF" />
                      </LinearGradient>
                      <View style={styles.imageOptionContent}>
                        <Text style={styles.imageOptionTitle}>Choose from Gallery</Text>
                        <Text style={styles.imageOptionSubtitle}>Select existing photo</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageOption} onPress={handleImageUrl} disabled={mediaUploading}>
                      <LinearGradient colors={['#F59E0B','#D97706']} style={styles.imageOptionGradient}>
                        <Ionicons name="link" size={28} color="#FFFFFF" />
                      </LinearGradient>
                      <View style={styles.imageOptionContent}>
                        <Text style={styles.imageOptionTitle}>Enter URL</Text>
                        <Text style={styles.imageOptionSubtitle}>Paste image link</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.imageOption} onPress={handlePickVideo} disabled={mediaUploading}>
                      <LinearGradient colors={['#10B981','#059669']} style={styles.imageOptionGradient}>
                        <Ionicons name="videocam" size={28} color="#FFFFFF" />
                      </LinearGradient>
                      <View style={styles.imageOptionContent}>
                        <Text style={styles.imageOptionTitle}>Choose from Gallery</Text>
                        <Text style={styles.imageOptionSubtitle}>Select existing video</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageOption} onPress={handleVideoUrl} disabled={mediaUploading}>
                      <LinearGradient colors={['#F59E0B','#D97706']} style={styles.imageOptionGradient}>
                        <Ionicons name="link" size={28} color="#FFFFFF" />
                      </LinearGradient>
                      <View style={styles.imageOptionContent}>
                        <Text style={styles.imageOptionTitle}>Enter YouTube URL</Text>
                        <Text style={styles.imageOptionSubtitle}>Paste YouTube video link</Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
              {mediaUploading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0056D2" />
                  <Text style={styles.loadingText}>Processing {isImage ? 'image' : 'video'}...</Text>
                </View>
              )}
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderUrlInputModal = (isImage) => (
    <Modal
      visible={isImage ? showImageUrlInput : showVideoUrlInput}
      transparent={true}
      animationType="slide"
      onRequestClose={cancelMediaUrlInput}
    >
      <TouchableWithoutFeedback onPress={cancelMediaUrlInput}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.urlInputModal,{ transform: [{ scale: scaleAnim }] }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isImage ? 'Enter Image URL' : 'Enter YouTube URL'}</Text>
                <TouchableOpacity onPress={cancelMediaUrlInput} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <View style={styles.urlInputContainer}>
                <TextInput
                  style={[styles.urlInput,urlError && styles.urlInputError]}
                  placeholder={isImage ? 'https://example.com/image.jpg' : 'https://youtube.com/watch?v=...'}
                  placeholderTextColor="#9CA3AF"
                  value={isImage ? imageUrl : videoUrl}
                  onChangeText={(text) => {
                    if (isImage) setImageUrl(text);
                    else setVideoUrl(text);
                    setUrlError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="url"
                  returnKeyType="done"
                  onSubmitEditing={isImage ? confirmImageUrl : confirmVideoUrl}
                  autoFocus={true}
                />
                {urlError && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.errorText}>{urlError}</Text>
                  </View>
                )}
              </View>
              <View style={styles.urlModalButtons}>
                <TouchableOpacity style={styles.urlCancelButton} onPress={cancelMediaUrlInput}>
                  <Text style={styles.urlCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.urlConfirmButton}
                  onPress={isImage ? confirmImageUrl : confirmVideoUrl}
                  disabled={mediaUploading}
                >
                  {mediaUploading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.urlConfirmButtonText}>Confirm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Edit Exercise"
        subtitle="Update your fitness exercise"
        onBack={() => navigation.goBack()}
        backIconColor="#0056D2"
      />

      <View style={styles.mainContainer} ref={containerRef} {...panResponder.panHandlers}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollContainer}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: isKeyboardVisible ? keyboardHeight + 50 : 50,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <TouchableWithoutFeedback>
              <View style={styles.formContent}>
                {renderImageSection()}
                {renderVideoSection()}
                {renderFormField(
                  'Exercise Name',
                  exerciseData.exerciseName,
                  (text) => handleInputChange('exerciseName',text),
                  'field.exerciseName',
                  'Enter exercise name...',
                  false,
                  'barbell-outline'
                )}
                {loadingData ? (
                  <ActivityIndicator size="large" color="#0056D2" />
                ) : (
                  renderRichEditor()
                )}
                {renderCategorySelector()}
                {renderGenderSelector()}
                {renderFormField(
                  'Calories Burned (per min)',
                  exerciseData.caloriesBurnedPerMin,
                  (text) => handleInputChange('caloriesBurnedPerMin',text),
                  'field.caloriesBurnedPerMin',
                  'Enter calories burned per minute',
                  false,
                  'flame-outline',
                  'numeric'
                )}
                {renderPrivacySelector()}
                <Animated.View
                  style={[
                    styles.createButtonContainer,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.createButton,(updating || mediaUploading) && styles.createButtonDisabled]}
                    onPress={handleUpdate}
                    disabled={updating || mediaUploading}
                    accessibilityLabel="Update Exercise"
                  >
                    <LinearGradient colors={['#0056D2','#0041A3']} style={styles.createButtonGradient}>
                      {updating || mediaUploading ? (
                        <View style={styles.createButtonLoading}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                          <Text style={styles.createButtonText}>
                            {mediaUploading ? 'Uploading Media...' : 'Updating Exercise...'}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.createButtonContent}>
                          <Ionicons name="save" size={20} color="#FFFFFF" />
                          <Text style={styles.createButtonText}>Update Exercise</Text>
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      {isKeyboardVisible && (
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <View style={styles.keyboardDismissOverlay} pointerEvents="box-none" />
        </TouchableWithoutFeedback>
      )}
      {renderMediaOptionsModal(true)}
      {renderMediaOptionsModal(false)}
      {renderUrlInputModal(true)}
      {renderUrlInputModal(false)}
      {renderCategoryModal()}
      {renderGenderModal()}
      {renderVideoPreviewModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    accessibilityLabel: 'Go Back',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  mainContainer: {
    flex: 1,
    marginTop: 60
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  formContent: {
    flex: 1,
  },
  keyboardDismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  imageSection: {
    marginBottom: 32,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  imagePreview: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  removeImageButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    accessibilityLabel: 'Remove Image',
  },
  removeImageButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  editImageButton: {
    position: 'absolute',
    top: 16,
    right: 60,
    accessibilityLabel: 'Edit Image',
  },
  editImageButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 86, 210, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playVideoButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 },{ translateY: -30 }],
    accessibilityLabel: 'Play Video',
  },
  playVideoButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 86, 210, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  imageLabel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageLabelText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  addImageContainer: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  addImageContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  addImageIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  addImageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  addImageSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  fieldContainer: {
    marginBottom: 28,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldIcon: {
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
  },
  fieldCounter: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  inputContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  multilineInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  richEditorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  richEditor: {
    height: 180,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  privacySection: {
    marginBottom: 28,
  },
  privacyOptions: {
    gap: 16,
  },
  privacyOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  privacyOptionActive: {
    borderColor: '#0056D2',
    backgroundColor: '#0056D2',
  },
  privacyOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  privacyOptionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 12,
  },
  privacyOptionTitleActive: {
    color: '#FFFFFF',
  },
  privacyOptionDesc: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  privacyOptionDescActive: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  createButtonContainer: {
    marginTop: 24,
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  videoPreviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewContainer: {
    width: '90%',
    height: '60%',
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoPreviewCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  imageOptionsModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '75%',
  },
  dropdownModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    accessibilityLabel: 'Close Modal',
  },
  imageOptionsContainer: {
    padding: 24,
    gap: 20,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageOptionGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  imageOptionContent: {
    flex: 1,
  },
  imageOptionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  imageOptionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  dropdownList: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  dropdownItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  urlInputModal: {
    position: 'absolute',
    top: '20%',
    left: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '60%',
  },
  urlInputContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  urlInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginTop: 10,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  urlModalButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 16,
  },
  urlCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    accessibilityLabel: 'Cancel URL Input',
  },
  urlCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  urlConfirmButton: {
    flex: 1,
    backgroundColor: '#0056D2',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    accessibilityLabel: 'Confirm URL',
  },
  urlConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  urlInputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  dropdownIcon: {
    marginRight: 16,
  },
});

export default EditExerciseScreen;