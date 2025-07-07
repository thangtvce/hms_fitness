import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Video } from 'expo-av';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width } = Dimensions.get('window');

// Ultra Modern Color Palette (from TrainerExerciseManagement)
const COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#F1F5F9',
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  purple: '#8B5CF6',
  pink: '#EC4899',
  orange: '#F97316',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    white: '#FFFFFF',
    muted: '#64748B',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    card: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.6)',
  },
  border: '#E2E8F0',
  shadow: 'rgba(15, 23, 42, 0.08)',
  glassmorphism: 'rgba(255, 255, 255, 0.25)',
};

// Custom Button Component (from CreateExerciseScreen)
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

const ExerciseDetailScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { exerciseId } = route.params || {};
  const [detailExercise, setDetailExercise] = useState(null);
  const [categoryName, setCategoryName] = useState('Unknown');
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(true);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

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
  }, []);

  useEffect(() => {
    if (!exerciseId) {
      Alert.alert('Error', 'No exercise ID provided.');
      navigation.goBack();
      return;
    }
    if (authLoading) return;
    if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }
    fetchExercise();
  }, [authLoading, user, exerciseId, navigation]);

  const fetchExercise = async () => {
    try {
      setLoading(true);
      const response = await trainerService.getFitnessExerciseById(exerciseId);
      if (response.statusCode === 200 && response.data) {
        setDetailExercise(response.data);
        if (response.data.categoryId) {
          const categoryResponse = await trainerService.getExerciseCategoryById(response.data.categoryId);
          if (categoryResponse.statusCode === 200) {
            setCategoryName(categoryResponse.data.categoryName || 'Unknown');
          }
        }
      } else {
        Alert.alert('Error', 'Exercise not found.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching exercise:', error);
      Alert.alert('Error', error.message || 'Failed to load exercise.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExercise = useCallback(async () => {
    if (!exerciseId) return;
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this exercise?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const response = await trainerService.deleteFitnessExercise(exerciseId);
            if (response.statusCode === 200) {
              Alert.alert('Success', 'Exercise deleted successfully.', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('TrainerExerciseManagement'),
                },
              ]);
            } else {
              throw new Error(response.message || 'Failed to delete exercise.');
            }
          } catch (error) {
            console.error('Error deleting exercise:', error);
            Alert.alert('Error', error.message || 'Failed to delete exercise.');
          }
        },
      },
    ]);
  }, [exerciseId, navigation]);

  const handleEditExercise = useCallback(() => {
    navigation.navigate('EditExercise', { exerciseId: detailExercise.exerciseId });
  }, [detailExercise, navigation]);

  const openMediaModal = useCallback((mediaUrl, type) => {
    if (!mediaUrl) return;
    setSelectedMedia({ url: mediaUrl, type });
    setMediaModalVisible(true);
  }, []);

  const getStatusBadge = () => {
    const status = detailExercise.isPrivate ? 'Private' : 'Public';
    const badgeStyle = detailExercise.isPrivate
      ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: COLORS.danger }
      : { backgroundColor: 'rgba(34, 197, 94, 0.1)', color: COLORS.success };
    
    return (
      <View style={[styles.statusBadge, badgeStyle]}>
        <Feather name={detailExercise.isPrivate ? 'lock' : 'globe'} size={12} color={badgeStyle.color} />
        <Text style={[styles.statusText, { color: badgeStyle.color }]}>{status}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={COLORS.primary} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading exercise details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!detailExercise) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={COLORS.primary} />
      <LinearGradient 
        colors={[COLORS.primary, COLORS.primaryLight, COLORS.purple]} 
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={24} color={COLORS.text.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{detailExercise.exerciseName}</Text>
          <View style={styles.headerButtons}>
            <CustomButton
              title="Edit"
              onPress={handleEditExercise}
              variant="outline"
              size="small"
              icon="edit-2"
              style={styles.headerActionButton}
            />
            <CustomButton
              title="Delete"
              onPress={handleDeleteExercise}
              variant="danger"
              size="small"
              icon="trash-2"
              style={styles.headerActionButton}
            />
          </View>
        </View>
      </LinearGradient>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {(detailExercise.imageUrl || detailExercise.mediaUrl) && (
            <View style={styles.mediaContainer}>
              {detailExercise.imageUrl && (
                <TouchableOpacity
                  onPress={() => openMediaModal(detailExercise.imageUrl, 'image')}
                  style={styles.mediaWrapper}
                >
                  <LinearGradient
                    colors={[COLORS.background.card, COLORS.background.secondary]}
                    style={styles.mediaGradient}
                  >
                    <Image
                      source={{ uri: detailExercise.imageUrl }}
                      style={styles.exerciseMedia}
                      onLoadStart={() => setImageLoading(true)}
                      onLoadEnd={() => setImageLoading(false)}
                      onError={() => setImageLoading(false)}
                    />
                    {imageLoading && (
                      <View style={styles.mediaLoadingOverlay}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                      </View>
                    )}
                    <View style={styles.mediaOverlay}>
                      <Feather name="image" size={24} color={COLORS.text.white} />
                      <Text style={styles.mediaOverlayText}>View Image</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {detailExercise.mediaUrl && (
                <TouchableOpacity
                  onPress={() => openMediaModal(detailExercise.mediaUrl, 'video')}
                  style={styles.mediaWrapper}
                >
                  <LinearGradient
                    colors={[COLORS.background.card, COLORS.background.secondary]}
                    style={styles.mediaGradient}
                  >
                    <Video
                      source={{ uri: detailExercise.mediaUrl }}
                      style={styles.exerciseMedia}
                      useNativeControls={false}
                      resizeMode="cover"
                      shouldPlay={false}
                    />
                    <View style={styles.mediaLoadingOverlay}>
                      <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                    <View style={styles.mediaOverlay}>
                      <Feather name="play-circle" size={24} color={COLORS.text.white} />
                      <Text style={styles.mediaOverlayText}>View Video</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.exerciseTitle}>{detailExercise.exerciseName}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Feather name="grid" size={12} color={COLORS.primary} />
                <Text style={styles.badgeText}>{categoryName}</Text>
              </View>
              {getStatusBadge()}
            </View>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Feather name="flame" size={16} color={COLORS.warning} />
              <Text style={styles.statValue}>
                {detailExercise.caloriesBurnedPerMin ? `${detailExercise.caloriesBurnedPerMin} cal/min` : 'N/A'}
              </Text>
              <Text style={styles.statLabel}>Calories</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="users" size={16} color={COLORS.purple} />
              <Text style={styles.statValue}>{detailExercise.genderSpecific || 'Unisex'}</Text>
              <Text style={styles.statLabel}>Gender</Text>
            </View>
            <View style={styles.statCard}>
              <Feather name="grid" size={16} color={COLORS.accent} />
              <Text style={styles.statValue}>{categoryName}</Text>
              <Text style={styles.statLabel}>Category</Text>
            </View>
          </View>
          <View style={styles.descriptionCard}>
            <View style={styles.cardHeader}>
              <Feather name="file-text" size={20} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Description</Text>
            </View>
            <Text style={styles.descriptionText}>
              {detailExercise.description || 'No description available'}
            </Text>
          </View>
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Feather name="user" size={20} color={COLORS.accent} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Created by</Text>
                <Text style={styles.infoValue}>{detailExercise.trainerFullName || 'Unknown'}</Text>
              </View>
            </View>
            <View style={styles.infoCard}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Feather name="calendar" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>
                  {detailExercise.createdAt
                    ? new Date(detailExercise.createdAt).toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })
                    : 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.bottomSpacing} />
        </Animated.View>
      </ScrollView>
      <Modal
        visible={mediaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMediaModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedMedia?.type === 'image' ? (
              <Image source={{ uri: selectedMedia.url }} style={styles.modalMedia} />
            ) : (
              <Video
                source={{ uri: selectedMedia?.url }}
                style={styles.modalMedia}
                useNativeControls
                resizeMode="contain"
                shouldPlay={false}
              />
            )}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setMediaModalVisible(false)}
            >
              <Feather name="x" size={24} color={COLORS.text.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background.secondary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: COLORS.text.muted, fontWeight: '500' },
  header: { paddingVertical: 20, paddingHorizontal: 16 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    padding: 10,
    borderRadius: 25,
    backgroundColor: COLORS.glassmorphism,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text.white,
    flex: 1,
    marginHorizontal: 16,
  },
  headerButtons: { flexDirection: 'row', gap: 8 },
  headerActionButton: { paddingHorizontal: 8 },
  scrollView: { flex: 1 },
  contentContainer: { paddingBottom: 20 },
  mediaContainer: { margin: 16, flexDirection: 'row', gap: 12 },
  mediaWrapper: { flex: 1, borderRadius: 16, overflow: 'hidden', height: 150 },
  mediaGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  exerciseMedia: { width: '100%', height: '100%', resizeMode: 'cover' },
  mediaLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mediaOverlayText: { color: COLORS.text.white, fontSize: 14, fontWeight: '600' },
  titleContainer: { margin: 16, marginBottom: 8 },
  exerciseTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text.primary, marginBottom: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statsContainer: { flexDirection: 'row', margin: 16, gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.background.card,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  statLabel: { fontSize: 12, color: COLORS.text.muted, marginTop: 4, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: '700', color: COLORS.text.primary, marginTop: 4 },
  descriptionCard: {
    backgroundColor: COLORS.background.card,
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text.primary, marginLeft: 8 },
  descriptionText: { fontSize: 15, lineHeight: 22, color: COLORS.text.secondary, fontWeight: '400' },
  infoSection: { margin: 16 },
  infoCard: {
    backgroundColor: COLORS.background.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 13, color: COLORS.text.muted, fontWeight: '500' },
  infoValue: { fontSize: 16, color: COLORS.text.primary, fontWeight: '600' },
  bottomSpacing: { height: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.background.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.background.card,
    borderRadius: 16,
    width: width * 0.9,
    maxHeight: '80%',
    padding: 16,
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  modalMedia: { width: '100%', height: 300, borderRadius: 12 },
  modalCloseButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 8,
    backgroundColor: COLORS.background.card,
    borderRadius: 20,
  },
  customButton: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadow,
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
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  dangerButton: {
    backgroundColor: COLORS.danger,
  },
  primaryButtonText: {
    color: COLORS.text.white,
  },
  secondaryButtonText: {
    color: COLORS.text.primary,
  },
  outlineButtonText: {
    color: COLORS.primary,
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
    backgroundColor: COLORS.background.tertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ExerciseDetailScreen;