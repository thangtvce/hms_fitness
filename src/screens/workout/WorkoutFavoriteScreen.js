
import React,{ useEffect,useState } from 'react';
import { View,Text,FlatList,TouchableOpacity,Image,StyleSheet,Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Header from 'components/Header';
import Loading from 'components/Loading';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';

export default function WorkoutFavoriteScreen({ navigation }) {

  const [favorites,setFavorites] = useState([]);
  const [loading,setLoading] = useState(true);
  const [categories,setCategories] = useState({});

  // Toggle favorite
  const toggleFavorite = async (exercise) => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
      let favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
      const exists = favoriteList.some((ex) => ex.exerciseId === exercise.exerciseId);
      let updatedList;
      if (exists) {
        updatedList = favoriteList.filter((ex) => ex.exerciseId !== exercise.exerciseId);
        await AsyncStorage.setItem('favoriteExercises',JSON.stringify(updatedList));
        setFavorites((prev) => prev.filter((ex) => ex.exerciseId !== exercise.exerciseId));
        showSuccessMessage('Removed from favorite workouts successfully.');
      } else {
        updatedList = [...favoriteList,exercise];
        await AsyncStorage.setItem('favoriteExercises',JSON.stringify(updatedList));
        setFavorites(updatedList);
        showSuccessMessage('Added to favorite workouts successfully.');
      }
    } catch (error) {
      showErrorFetchAPI(error.message || 'Failed to update favorites. Please try again.');
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
        showErrorFetchAPI(error.message || 'Failed to load favorite workouts.');
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
        showErrorFetchAPI(error.message || 'Failed to load workout categories.');
      }
    };
    const unsubscribe = navigation?.addListener('focus',() => {
      loadFavorites();
      fetchCategories();
    });
    loadFavorites();
    fetchCategories();
    return unsubscribe;
  },[navigation]);

  const renderItem = ({ item }) => {
    const isFavorite = favorites.some((ex) => ex.exerciseId === item.exerciseId);
    const imageUrl = item.mediaUrl || item.imageUrl || `https://source.unsplash.com/400x250/?fitness,${item.exerciseName?.replace(/\s/g,'')}`;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ExerciseDetails',{ exercise: item })}
      >
        <View style={styles.cardHorizontal}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.imageHorizontal} />
          ) : (
            <View style={styles.imagePlaceholderHorizontal} />
          )}
          <View style={styles.infoContainerHorizontal}>
            <Text style={styles.nameHorizontal}>{item.exerciseName || 'Unknown Exercise'}</Text>
            <Text style={styles.descHorizontal} numberOfLines={2}>{item.description || 'No description available'}</Text>
            <Text style={styles.caloriesHorizontal}>Calories: {item.caloriesBurnedPerMin || '0'} cal/min</Text>
            <View style={styles.exerciseTagsHorizontal}>
              {item.genderSpecific && (
                <View style={styles.tagContainerHorizontal}>
                  <Ionicons
                    name={item.genderSpecific.toLowerCase() === 'female' ? 'female' : 'male'}
                    size={12}
                    color="#6366F1"
                  />
                  <Text style={styles.tagTextHorizontal}>{item.genderSpecific}</Text>
                </View>
              )}
              {item.difficultyLevel && (
                <View style={styles.tagContainerHorizontal}>
                  <Ionicons name="barbell-outline" size={12} color="#F59E0B" />
                  <Text style={styles.tagTextHorizontal}>{item.difficultyLevel}</Text>
                </View>
              )}
              {item.status && (
                <View style={styles.tagContainerHorizontal}>
                  <Ionicons name="checkmark-circle-outline" size={12} color="#10B981" />
                  <Text style={styles.tagTextHorizontal}>{item.status}</Text>
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.favoriteBtnHorizontal,
              isFavorite ? styles.favoriteBtnActiveHorizontal : styles.favoriteBtnInactiveHorizontal
            ]}
            onPress={() => toggleFavorite(item)}
            hitSlop={{ top: 10,bottom: 10,left: 10,right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={20}
              color={isFavorite ? '#fff' : '#EF4444'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <CommonSkeleton />
      ) : (
        <>
          <Header
            title="Favorite Workouts"
            onBack={() => navigation.goBack()}
            backgroundColor="#fff"
            titleStyle={{ color: '#0056d2',fontWeight: 'bold' }}
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
              keyExtractor={(item,index) => item.exerciseId ? `exercise-${item.exerciseId}` : `item-${index}`}
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

const { height,width } = Dimensions.get("window");
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  list: {
    padding: 16,
    paddingBottom: 24,
    marginTop: 60,
  },
  cardHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  imageHorizontal: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#e5e7eb',
  },
  imagePlaceholderHorizontal: {
    width: 64,
    height: 64,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#e5e7eb',
  },
  infoContainerHorizontal: {
    flex: 1,
    justifyContent: 'center',
  },
  nameHorizontal: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1E293B',
  },
  descHorizontal: {
    fontSize: 13,
    marginBottom: 4,
    color: '#64748B',
  },
  caloriesHorizontal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  exerciseTagsHorizontal: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagContainerHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  tagTextHorizontal: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  favoriteBtnHorizontal: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  favoriteBtnActiveHorizontal: {
    backgroundColor: '#EF4444',
  },
  favoriteBtnInactiveHorizontal: {
    backgroundColor: '#F1F5F9',
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
});
