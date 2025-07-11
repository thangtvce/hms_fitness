import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image,
  TouchableOpacity,
  Alert 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ExerciseDetailsScreen = ({ route, navigation }) => {
  const { exercise } = route.params;
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    const fetchCategoryName = async () => {
      if (typeof exercise.categoryId === 'number') {
        try {
          // Giả sử workoutService.getCategoryById đã có
          const workoutService = require('services/apiWorkoutService').default;
          const data = await workoutService.getCategoryById(exercise.categoryId);
          setCategoryName(data?.categoryName || exercise.categoryId);
        } catch (error) {
          setCategoryName('N/A');
        }
      } else {
        setCategoryName(exercise.categoryId ?? 'N/A');
      }
    };
    fetchCategoryName();
  }, [exercise.categoryId]);

  const getExerciseImage = (exerciseName) => {
    return `https://source.unsplash.com/600x400/?fitness,${exerciseName.replace(/\s/g, '')}`;
  };

  const handleAddToWorkout = async () => {
    try {
      const storedExercises = await AsyncStorage.getItem('scheduledExercises');
      let scheduledExercises = storedExercises ? JSON.parse(storedExercises) : [];
      if (scheduledExercises.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        Alert.alert('Info', `${exercise.exerciseName} is already in your workout schedule`);
        return;
      }
      const exerciseToSave = {
        ...exercise,
        mediaUrl: exercise.mediaUrl || '',
      };
      scheduledExercises.push(exerciseToSave);
      await AsyncStorage.setItem('scheduledExercises', JSON.stringify(scheduledExercises));
      Alert.alert('Success', `${exercise.exerciseName} added to your workout schedule`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add exercise to schedule. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: getExerciseImage(exercise.exerciseName) }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.imageGradient}
          >
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>{exercise.exerciseName}</Text>
          </LinearGradient>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Icon name="local-fire-department" size={24} color="#FF5252" />
            <Text style={styles.statValue}>{exercise.caloriesBurnedPerMin}</Text>
            <Text style={styles.statLabel}>kcal/min</Text>
          </View>
          
          {exercise.genderSpecific && (
            <View style={styles.statItem}>
              <Icon name="person" size={24} color="#6C63FF" />
              <Text style={styles.statValue}>{exercise.genderSpecific}</Text>
              <Text style={styles.statLabel}>Gender</Text>
            </View>
          )}
          
          <View style={styles.statItem}>
            <Icon name="calendar-today" size={24} color="#4CAF50" />
            <Text style={styles.statValue}>
              {new Date(exercise.createdAt).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
            <Text style={styles.statLabel}>Added</Text>
          </View>
        </View>

        {/* Description Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="description" size={22} color="#6C63FF" />
            <Text style={styles.cardTitle}>Description</Text>
          </View>
          <Text style={styles.description}>
            {exercise.description || 'No description available for this exercise. Try checking the category details for more information about similar exercises.'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="category" size={22} color="#6C63FF" />
            <Text style={styles.cardTitle}>Category</Text>
          </View>
          <TouchableOpacity 
            style={styles.categoryButton}
            onPress={() => navigation.navigate('ExercisesByCategoryScreen', { categoryId: exercise.categoryId, categoryName: categoryName })}
          >
            <LinearGradient
              colors={['#6C63FF', '#4834DF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.categoryGradient}
            >
              <Text style={styles.categoryText}>{categoryName || 'Đang tải...'}</Text>
              <Icon name="chevron-right" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Tips Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="lightbulb" size={22} color="#6C63FF" />
            <Text style={styles.cardTitle}>Tips</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={18} color="#4CAF50" style={styles.tipIcon} />
            <Text style={styles.tipText}>Maintain proper form to prevent injuries</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={18} color="#4CAF50" style={styles.tipIcon} />
            <Text style={styles.tipText}>Stay hydrated during your workout</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={18} color="#4CAF50" style={styles.tipIcon} />
            <Text style={styles.tipText}>Track your progress to stay motivated</Text>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={['#6C63FF', '#4834DF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Icon name="favorite-border" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Save</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleAddToWorkout}>
            <LinearGradient
              colors={['#FF5252', '#D32F2F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Icon name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Add to Workout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  imageContainer: {
    height: 300,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -30,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#424242',
  },
  categoryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIcon: {
    marginRight: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#424242',
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 24,
  },
});

export default ExerciseDetailsScreen;