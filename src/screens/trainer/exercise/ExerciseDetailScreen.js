import React,{ useState,useEffect,useRef,useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Image,
  Dimensions,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons,MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import YoutubePlayer from 'react-native-youtube-iframe';
import { Video } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';
import Header from 'components/Header';
import RenderHTML from 'react-native-render-html';

const { width,height } = Dimensions.get('window');

const ExerciseDetailScreen = () => {
  const { user,loading: authLoading } = useContext(AuthContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { exerciseId } = route.params || {};
  const [exerciseData,setExerciseData] = useState(null);
  const [categories,setCategories] = useState([]);
  const [loading,setLoading] = useState(true);
  const [showConfirmModal,setShowConfirmModal] = useState(false);
  const [confirmMessage,setConfirmMessage] = useState('');
  const [confirmAction,setConfirmAction] = useState(null);
  const [showImagePreview,setShowImagePreview] = useState(false);
  const [showVideoModal,setShowVideoModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    if (authLoading) return;

    if (!exerciseId) {
      showErrorFetchAPI(new Error('Invalid exercise ID'));
      navigation.goBack();
      return;
    }

    const fetchExerciseDetails = async () => {
      try {
        setLoading(true);
        const response = await trainerService.getFitnessExerciseById(exerciseId);
        if (response.statusCode === 200 && response.data) {
          if (response.data.trainerId === user.userId || response.data.trainerId === null) {
            setExerciseData(response.data);
            await fetchCategories();
            startAnimations();
          } else {
            showErrorFetchAPI(new Error('You do not have permission to view this exercise.'));
            navigation.goBack();
          }
        } else {
          showErrorFetchAPI(new Error('Exercise not found.'));
          navigation.goBack();
        }
      } catch (error) {
        showErrorFetchAPI(error);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchExerciseDetails();
  },[authLoading,user,exerciseId,navigation]);

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

  const startAnimations = () => {
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
  };

  const handleEdit = () => {
    navigation.navigate('EditExerciseScreen',{ exerciseId });
  };

  const handleDelete = () => {
    setConfirmMessage('Are you sure you want to delete this exercise? This action cannot be undone.');
    setConfirmAction(() => async () => {
      try {
        const response = await trainerService.deleteFitnessExercise(exerciseId);
        if (response.statusCode === 200) {
          showSuccessMessage('Exercise deleted successfully.');
          navigation.navigate('TrainerExerciseManagement');
        } else {
          showErrorFetchAPI(new Error(response.message || 'Failed to delete exercise.'));
        }
      } catch (error) {
        showErrorFetchAPI(error);
      }
    });
    setShowConfirmModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '0001-01-01T00:00:00') return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US',{
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown';
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.categoryId === categoryId);
    return category ? category.categoryName : 'Unknown';
  };

  const getExerciseIcon = (exerciseName) => {
    if (!exerciseName) return 'fitness';
    const name = exerciseName.toLowerCase();
    if (name.includes('yoga') || name.includes('meditation')) return 'yoga';
    if (name.includes('diet') || name.includes('nutrition')) return 'nutrition';
    if (name.includes('cardio') || name.includes('running')) return 'cardio';
    return 'fitness';
  };

  const renderExerciseIcon = (type) => {
    const iconProps = { size: 32,style: styles.icon };
    switch (type) {
      case 'yoga':
        return <MaterialCommunityIcons name="yoga" color="#22C55E" {...iconProps} />;
      case 'nutrition':
        return <Ionicons name="nutrition" color="#F59E0B" {...iconProps} />;
      case 'cardio':
        return <Ionicons name="heart" color="#EF4444" {...iconProps} />;
      default:
        return <MaterialCommunityIcons name="weight-lifter" color="#0056D2" {...iconProps} />;
    }
  };

  const getYouTubeVideoId = (url) => {
    const match = url?.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return match ? match[1] : null;
  };

  const renderLoadingScreen = () => (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#F8FAFC" />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0056D2" />
        <CommonSkeleton />
      </View>
    </SafeAreaView>
  );

  const renderMediaSection = () => (
    <Animated.View
      style={[
        styles.imageSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => setShowImagePreview(true)}
        accessibilityLabel="Preview Exercise Image"
      >
        <Image
          source={{
            uri: exerciseData?.imageUrl || 'https://static.ladipage.net/5cf71dc895e50d03de993a28/untitled-1-01-20240406073058-6op7o.png',
          }}
          style={styles.imagePreview}
        />
        <View style={styles.imageLabel}>
          <Ionicons name="image" size={14} color="#FFFFFF" />
          <Text style={styles.imageLabelText}>Exercise Image</Text>
        </View>
      </TouchableOpacity>
      {exerciseData?.mediaUrl && (
        <TouchableOpacity
          style={styles.videoContainer}
          onPress={() => setShowVideoModal(true)}
          accessibilityLabel="Play Exercise Video"
        >
          <Image
            source={{
              uri: exerciseData.mediaUrl.includes('youtube.com') || exerciseData.mediaUrl.includes('youtu.be')
                ? `https://img.youtube.com/vi/${getYouTubeVideoId(exerciseData.mediaUrl)}/hqdefault.jpg`
                : exerciseData.imageUrl || 'https://static.ladipage.net/5cf71dc895e50d03de993a28/untitled-1-01-20240406073058-6op7o.png',
            }}
            style={styles.videoPreview}
          />
          <View style={styles.videoLabel}>
            <Ionicons name="videocam" size={14} color="#FFFFFF" />
            <Text style={styles.imageLabelText}>Exercise Video</Text>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  const renderImagePreviewModal = () => (
    <Modal
      visible={showImagePreview}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowImagePreview(false)}
    >
      <View style={styles.imagePreviewModalOverlay}>
        <Animated.View style={[styles.imagePreviewModalContent,{ transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowImagePreview(false)}
            accessibilityLabel="Close Image Preview"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Image
            source={{
              uri: exerciseData?.imageUrl || 'https://static.ladipage.net/5cf71dc895e50d03de993a28/untitled-1-01-20240406073058-6op7o.png',
            }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </Modal>
  );

  const renderVideoModal = () => (
    <Modal
      visible={showVideoModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowVideoModal(false)}
    >
      <View style={styles.videoModalOverlay}>
        <Animated.View style={[styles.videoModalContent,{ transform: [{ scale: scaleAnim }] }]}>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowVideoModal(false)}
            accessibilityLabel="Close Video Player"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {exerciseData?.mediaUrl && (
            exerciseData.mediaUrl.includes('youtube.com') || exerciseData.mediaUrl.includes('youtu.be') ? (
              <YoutubePlayer
                height={height * 0.5}
                width={width * 0.9}
                videoId={getYouTubeVideoId(exerciseData.mediaUrl)}
                play={true}
                webViewStyle={styles.youtubePlayer}
              />
            ) : (
              <Video
                source={{ uri: exerciseData.mediaUrl }}
                style={styles.videoPlayer}
                controls={true}
                resizeMode="contain"
                useNativeControls
              />
            )
          )}
        </Animated.View>
      </View>
    </Modal>
  );

  const renderExerciseInfo = () => (
    <Animated.View
      style={[
        styles.infoSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.infoContainer}>
        <Text style={styles.exerciseName}>{exerciseData?.exerciseName || 'Unknown Exercise'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="flame-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>
              {exerciseData?.caloriesBurnedPerMin ? `${exerciseData.caloriesBurnedPerMin} cal/min` : 'N/A'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>Created {formatDate(exerciseData?.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="person-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>By {exerciseData?.trainerFullName || 'Unknown'}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="list-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>{getCategoryName(exerciseData?.categoryId)}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="male-female-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>{exerciseData?.genderSpecific || 'N/A'}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name={exerciseData?.isPrivate === 0 ? 'globe-outline' : 'lock-closed-outline'} size={16} color="#0056D2" />
            <Text style={styles.statText}>{exerciseData?.isPrivate === 0 ? 'Public' : 'Private'}</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge,{ backgroundColor: exerciseData?.isPrivate === 0 ? '#DCFCE7' : '#FEE2E2' }]}>
            <Ionicons
              name={exerciseData?.isPrivate === 0 ? 'globe-outline' : 'lock-closed-outline'}
              size={14}
              color={exerciseData?.isPrivate === 0 ? '#22C55E' : '#EF4444'}
            />
            <Text style={[styles.statusText,{ color: exerciseData?.isPrivate === 0 ? '#22C55E' : '#EF4444' }]}>
              {exerciseData?.isPrivate === 0 ? 'Public' : 'Private'}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderDescription = () => (
    <Animated.View
      style={[
        styles.descriptionSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Ionicons name="document-text-outline" size={20} color="#0056D2" />
            <Text style={styles.fieldLabel}>Description</Text>
          </View>
        </View>
        {exerciseData?.description ? (
          <View style={styles.descriptionContainer}>
            <RenderHTML
              source={{
                html:
                  exerciseData.description || "N/A"
              }}
              tagsStyles={{
                p: {
                  fontSize: 14,
                  color: "#64748B",
                  margin: 0,
                  lineHeight: 20,
                  fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
                },
              }}
            />
          </View>
        ) : (
          <View style={styles.noDescriptionContainer}>
            <Text style={styles.noDescriptionText}>No description available.</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderActionButtons = () => (
    <Animated.View
      style={[
        styles.actionSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.editButton} onPress={handleEdit} accessibilityLabel="Edit Exercise">
        <Ionicons name="pencil" size={20} color="#FFFFFF" />
        <Text style={styles.editButtonText}>Edit Exercise</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} accessibilityLabel="Delete Exercise">
        <Ionicons name="trash" size={20} color="#FFFFFF" />
        <Text style={styles.deleteButtonText}>Delete Exercise</Text>
      </TouchableOpacity>
    </Animated.View >
  );

  const renderConfirmModal = () => (
    <Modal
      visible={showConfirmModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.confirmModalTitle}>Confirm Action</Text>
          <Text style={styles.confirmModalText}>{confirmMessage}</Text>
          <View style={styles.confirmModalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfirmModal(false)}
              accessibilityLabel="Cancel Action"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={async () => {
                await confirmAction();
                setShowConfirmModal(false);
              }}
              accessibilityLabel="Confirm Action"
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading || !exerciseData) return renderLoadingScreen();

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#F8FAFC" />
      <Header
        title={`#EXERCISE${exerciseData?.exerciseId || 'Exercise'}`}
        onBack={() => navigation.goBack()}
        backIconColor="#0056D2"
        rightActions={[
          {
            icon: "pencil-outline",
            onPress: handleEdit,
            color: "#0056D2",
            accessibilityLabel: "Edit Exercise",
          },
        ]}
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderMediaSection()}
        {renderExerciseInfo()}
        {renderDescription()}
        {renderActionButtons()}
      </ScrollView>
      {renderConfirmModal()}
      {renderImagePreviewModal()}
      {renderVideoModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
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
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    marginTop: 60
  },
  scrollContent: {
    padding: 20,
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
  imageSection: {
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  videoContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  videoPreview: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  imageLabel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoLabel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imageLabelText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  imagePreviewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewModalContent: {
    width: width * 0.9,
    height: height * 0.7,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  fullImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: width * 0.9,
    height: height * 0.5,
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  youtubePlayer: {
    width: '100%',
    height: '100%',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  infoSection: {
    marginBottom: 24,
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 0,
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
  fieldLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 5,
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  richEditor: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
  },
  noDescriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noDescriptionText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actionSection: {
    gap: 12,
    marginBottom: 40,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0056D2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#0056D2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  icon: {
    marginBottom: 8,
  },
});

export default ExerciseDetailScreen;