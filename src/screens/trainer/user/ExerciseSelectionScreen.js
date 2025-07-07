import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { theme } from 'theme/color';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width: screenWidth } = Dimensions.get('window');

const ExerciseSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { planId, trainerId } = route.params || {};
  
  const [trainerExercises, setTrainerExercises] = useState([]);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [imageLoadingStates, setImageLoadingStates] = useState({});
  const [imageErrors, setImageErrors] = useState({});

  const categories = ['All', 'Cardio', 'Strength', 'Flexibility', 'Balance', 'Sports'];

  useEffect(() => {
    fetchTrainerExercises();
  }, []);

  useEffect(() => {
    filterExercises();
  }, [trainerExercises, searchQuery, selectedCategory]);

  const fetchTrainerExercises = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await trainerService.getFitnessExercisesByTrainer();
      const exercises = response?.data?.exercises || [];
      setTrainerExercises(exercises);
    } catch (error) {
      console.error('Fetch Trainer Exercises Error:', error);
      Alert.alert('Error', 'Failed to fetch trainer exercises.');
      setTrainerExercises([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterExercises = () => {
    let filtered = trainerExercises;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(exercise =>
        exercise.exerciseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category (if categories are available in your data)
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(exercise =>
        exercise.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    setFilteredExercises(filtered);
  };

  const onRefresh = () => {
    fetchTrainerExercises(true);
  };

  const handleImageLoadStart = (exerciseId) => {
    setImageLoadingStates(prev => ({ ...prev, [exerciseId]: true }));
  };

  const handleImageLoadEnd = (exerciseId) => {
    setImageLoadingStates(prev => ({ ...prev, [exerciseId]: false }));
  };

  const handleImageError = (exerciseId) => {
    setImageErrors(prev => ({ ...prev, [exerciseId]: true }));
    setImageLoadingStates(prev => ({ ...prev, [exerciseId]: false }));
  };

  const openExerciseDetails = (exercise) => {
    // Log thông tin chi tiết exercise khi ấn submit/chọn
    console.log('Selected Exercise Details:', {
      ...exercise,
      planId,
    });
    navigation.navigate('ExerciseDetailEntry', {
      exercise,
      planId,
    });
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.searchGradient}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search exercises..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
    </View>
  );

  const renderCategoryFilter = () => (
    <View style={styles.categoryContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === item && styles.categoryButtonActive
            ]}
            onPress={() => setSelectedCategory(item)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={selectedCategory === item ? ['#4F46E5', '#6366F1'] : ['#F1F5F9', '#E2E8F0']}
              style={styles.categoryGradient}
            >
              <Text style={[
                styles.categoryText,
                selectedCategory === item && styles.categoryTextActive
              ]}>
                {item}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.categoryList}
      />
    </View>
  );

  const renderMediaContent = (exercise) => {
    const hasImage = exercise.imageUrl && !imageErrors[exercise.exerciseId];
    const isImageLoading = imageLoadingStates[exercise.exerciseId];

    return (
      <View style={styles.mediaContainer}>
        {hasImage && (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: exercise.imageUrl }}
              style={styles.exerciseImage}
              onLoadStart={() => handleImageLoadStart(exercise.exerciseId)}
              onLoadEnd={() => handleImageLoadEnd(exercise.exerciseId)}
              onError={() => handleImageError(exercise.exerciseId)}
            />
            {isImageLoading && (
              <View style={styles.imageLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
              </View>
            )}
          </View>
        )}
        
        {!hasImage && (
          <View style={styles.mediaPlaceholder}>
            <LinearGradient
              colors={['#F1F5F9', '#E2E8F0']}
              style={styles.placeholderGradient}
            >
              <Ionicons name="fitness-outline" size={32} color="#94A3B8" />
              <Text style={styles.placeholderText}>No Media</Text>
            </LinearGradient>
          </View>
        )}
      </View>
    );
  };

  const renderExerciseCard = ({ item, index }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => openExerciseDetails(item)}
      activeOpacity={0.8}
    >
      <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.cardGradient}>
        <View style={styles.cardContent}>
          {renderMediaContent(item)}
          
          <View style={styles.textContainer}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {item.exerciseName || 'Unnamed Exercise'}
              </Text>
              <View style={styles.genderBadge}>
                <Ionicons 
                  name={item.genderSpecific === 'Male' ? 'man' : item.genderSpecific === 'Female' ? 'woman' : 'people'} 
                  size={12} 
                  color="#64748B" 
                />
                <Text style={styles.genderText}>{item.genderSpecific || 'All'}</Text>
              </View>
            </View>
            
            <View style={styles.exerciseDetails}>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="flame-outline" size={14} color="#F59E0B" />
                  <Text style={styles.detailValue}>{item.caloriesBurnedPerMin || 0}</Text>
                  <Text style={styles.detailLabel}>cal/min</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="grid-outline" size={14} color="#8B5CF6" />
                  <Text style={styles.detailValue}>ID: {item.exerciseId}</Text>
                </View>
              </View>
              
              {item.description && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionText} numberOfLines={2}>
                    {item.description}
                  </Text>
                </View>
              )}
              
              {item.trainerFullName && (
                <View style={styles.trainerInfo}>
                  <Ionicons name="person-outline" size={12} color="#64748B" />
                  <Text style={styles.trainerName}>{item.trainerFullName}</Text>
                </View>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.selectButton}
              onPress={() => openExerciseDetails(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.selectButtonText}>Select Exercise</Text>
              <Ionicons name="arrow-forward" size={14} color="#4F46E5" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.emptyStateGradient}>
        <Ionicons name="fitness-outline" size={64} color="#CBD5E1" />
        <Text style={styles.emptyStateTitle}>No Exercises Found</Text>
        <Text style={styles.emptyStateText}>
          {searchQuery || selectedCategory !== 'All' 
            ? 'Try adjusting your search or filter criteria'
            : 'No exercises available at the moment'
          }
        </Text>
        {(searchQuery || selectedCategory !== 'All') && (
          <TouchableOpacity 
            style={styles.clearFiltersButton}
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
          >
            <Text style={styles.clearFiltersText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <View style={styles.loaderContainer}>
          <LinearGradient colors={['#4F46E5', '#8B5CF6']} style={styles.loaderGradient}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loaderText}>Loading exercises...</Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerTitle}>Exercise Library</Text>
            <Text style={styles.headerSubtitle}>
              {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} available
            </Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {renderSearchBar()}
        {renderCategoryFilter()}
        
        <FlatList
          data={filteredExercises}
          keyExtractor={(item) => item.exerciseId?.toString() || item.id?.toString()}
          renderItem={renderExerciseCard}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4F46E5']}
              tintColor="#4F46E5"
            />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  header: {
    paddingVertical: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: { 
    flex: 1, 
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Search Bar Styles
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchGradient: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    marginLeft: 12,
  },
  
  // Category Filter Styles
  categoryContainer: {
    paddingBottom: 16,
  },
  categoryList: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  categoryGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  
  // List Content
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  
  // Card Styles
  card: {
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },
  cardGradient: { 
    padding: 20, 
    borderRadius: 20 
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  // Media Styles
  mediaContainer: {
    marginRight: 16,
    alignItems: 'center',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  exerciseImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 16,
  },
  mediaPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
  },
  placeholderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    fontWeight: '500',
  },
  
  // Text Container Styles
  textContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  exerciseHeader: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    lineHeight: 22,
  },
  genderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  genderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 4,
  },
  exerciseDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 2,
  },
  descriptionContainer: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  trainerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trainerName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 6,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  selectButtonText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  
  // Empty State Styles
  emptyStateContainer: {
    flex: 1,
    marginTop: 40,
  },
  emptyStateGradient: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    borderRadius: 20,
    marginHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Loader Styles
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loaderGradient: {
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 16,
    fontWeight: '600',
  },
});

export default ExerciseSelectionScreen;