
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Header from 'components/Header';
import Loading from 'components/Loading';
import { showErrorFetchAPI, showSuccessMessage } from 'utils/toastUtil';

export default function WorkoutFavoriteScreen({ navigation }) {

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState({});

  // Toggle favorite
  const toggleFavorite = async (exercise) => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
      let favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
      const exists = favoriteList.some((ex) => ex.exerciseId === exercise.exerciseId);
      let updatedList;
      if (exists) {
        updatedList = favoriteList.filter((ex) => ex.exerciseId !== exercise.exerciseId);
        await AsyncStorage.setItem('favoriteExercises', JSON.stringify(updatedList));
        setFavorites((prev) => prev.filter((ex) => ex.exerciseId !== exercise.exerciseId));
        showSuccessMessage('Removed from favorite workouts successfully.');
      } else {
        updatedList = [...favoriteList, exercise];
        await AsyncStorage.setItem('favoriteExercises', JSON.stringify(updatedList));
        setFavorites(updatedList);
        showSuccessMessage('Added to favorite workouts successfully.');
      }
    } catch (error) {
      showErrorFetchAPI('Failed to update favorites.');
    }
  };

  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      try {
        const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
        const favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
        setFavorites(favoriteList);
      } catch (error) {
        setFavorites([]);
        showErrorFetchAPI('Failed to load favorite workouts.');
      } finally {
        setLoading(false);
      }
    };
    const fetchCategories = async () => {
      try {
        // Use the same API as WorkoutListScreen
        const workoutService = require('services/apiWorkoutService').default;
        const apiCategories = await workoutService.getAllCategories();
        if (Array.isArray(apiCategories)) {
          const categoriesObj = {};
          apiCategories.forEach(cat => {
            categoriesObj[cat.categoryId] = cat.categoryName;
          });
          setCategories(categoriesObj);
        }
      } catch {
        showErrorFetchAPI('Failed to load categories.');
      }
    };
    const unsubscribe = navigation?.addListener('focus', () => {
      loadFavorites();
      fetchCategories();
    });
    loadFavorites();
    fetchCategories();
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => {
    const categoryId = item.categoryId || 'default';
    const isFavorite = favorites.some((ex) => ex.exerciseId === item.exerciseId);
    return (
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <TouchableOpacity
            style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
            onPress={() => toggleFavorite(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={22}
              color={isFavorite ? '#fff' : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ExerciseDetails', { exercise: item })}
          >
            <Image
              source={{
                uri: item.mediaUrl || item.imageUrl || `https://source.unsplash.com/400x250/?fitness,${item.exerciseName?.replace(/\s/g, '')}`
              }}
              style={styles.image}
              resizeMode="cover"
            />
            {/* Category Badge */}
            <LinearGradient
              colors={['#0056d2', '#0056d2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.categoryBadge}
            >
              <Text style={styles.categoryBadgeText}>
                {typeof item.categoryId === 'number'
                  ? (categories[item.categoryId] || 'Loading...')
                  : (item.categoryId || 'General')}
              </Text>
            </LinearGradient>
            {/* Calories */}
            <View style={styles.caloriesBadge}>
              <Ionicons name="flame-outline" size={14} color="#fff" />
              <Text style={styles.caloriesText}>{item.caloriesBurnedPerMin || '0'} cal/min</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{item.exerciseName || 'Unknown Exercise'}</Text>
          <Text style={styles.desc} numberOfLines={2}>{item.description || 'No description available'}</Text>
          <View style={styles.exerciseTags}>
            {item.genderSpecific && (
              <View style={styles.tagContainer}>
                <Ionicons
                  name={item.genderSpecific.toLowerCase() === 'female' ? 'female' : 'male'}
                  size={12}
                  color="#6366F1"
                />
                <Text style={styles.tagText}>{item.genderSpecific}</Text>
              </View>
            )}
            {item.difficultyLevel && (
              <View style={styles.tagContainer}>
                <Ionicons name="barbell-outline" size={12} color="#F59E0B" />
                <Text style={styles.tagText}>{item.difficultyLevel}</Text>
              </View>
            )}
            {item.status && (
              <View style={styles.tagContainer}>
                <Ionicons name="checkmark-circle-outline" size={12} color="#10B981" />
                <Text style={styles.tagText}>{item.status}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };
 

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: 'absolute', width: '100%', height: '100%', zIndex: 999 }}>
          <Loading />
        </View>
      ) : (
        <>
          <Header
            title="Favorite Workouts"
            onBack={() => navigation.goBack()}
            backgroundColor="#fff"
            titleStyle={{ color: '#0056d2', fontWeight: 'bold' }}
          />
          {favorites.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No favorite workouts</Text>
              <Text style={styles.emptyText}>You haven't added any workouts to your favorites yet.</Text>
            </View>
          ) : (
            <FlatList
              data={favorites}
              keyExtractor={(item, index) => item.exerciseId ? `exercise-${item.exerciseId}` : `item-${index}`}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    paddingBottom: 24,
    marginTop: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    height: 160,
    width: '100%',
    backgroundColor: '#E5E7EB',
    position: 'relative',
    justifyContent: 'flex-end',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  caloriesBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    zIndex: 2,
  },
  caloriesText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  desc: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 10,
  },
  exerciseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
   favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  favoriteButtonActive: {
    backgroundColor: '#EF4444',
  },
});
