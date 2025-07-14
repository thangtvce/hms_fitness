import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const CategoryDetailsScreen = ({ route, navigation }) => {
  const { category } = route.params;
  const [loading, setLoading] = useState(false);
  
  // This would normally come from an API call
  const [exercises, setExercises] = useState([
    {
      exerciseId: '1',
      exerciseName: 'Push-ups',
      description: 'A classic upper body exercise that targets the chest, shoulders, and triceps.',
      caloriesBurnedPerMin: 7,
      imageUrl: 'https://source.unsplash.com/300x200/?pushups'
    },
    {
      exerciseId: '2',
      exerciseName: 'Squats',
      description: 'A lower body compound exercise that targets the quadriceps, hamstrings, and glutes.',
      caloriesBurnedPerMin: 8,
      imageUrl: 'https://source.unsplash.com/300x200/?squats'
    },
    {
      exerciseId: '3',
      exerciseName: 'Plank',
      description: 'A core strengthening exercise that improves stability and posture.',
      caloriesBurnedPerMin: 5,
      imageUrl: 'https://source.unsplash.com/300x200/?plank'
    }
  ]);

  // Simulate loading exercises
  useEffect(() => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const renderExerciseItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.exerciseItem}
      onPress={() => navigation.navigate('ExerciseDetails', { exercise: item })}
      activeOpacity={0.8}
    >
      <Image 
        source={{ uri: item.imageUrl }}
        style={styles.exerciseImage}
        resizeMode="cover"
      />
      <View style={styles.exerciseContent}>
        <Text style={styles.exerciseName}>{item.exerciseName}</Text>
        <Text style={styles.exerciseDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.exerciseStats}>
          <Icon name="local-fire-department" size={16} color="#FF5252" />
          <Text style={styles.exerciseStatsText}>{item.caloriesBurnedPerMin} kcal/min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#4CAF50', '#2E7D32']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={styles.categoryIconContainer}>
              <Icon name="category" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.title}>{category.categoryName}</Text>
            <Text style={styles.subtitle}>Explore exercises in this category</Text>
          </View>
        </LinearGradient>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Category ID</Text>
              <Text style={styles.infoValue}>{category.categoryId}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Exercises</Text>
              <Text style={styles.infoValue}>{exercises.length}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.actionButton}>
            <LinearGradient
              colors={['#4CAF50', '#2E7D32']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <Icon name="favorite-border" size={20} color="#FFFFFF" />
              <Text style={styles.actionText}>Save Category</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Description Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="info" size={22} color="#4CAF50" />
            <Text style={styles.cardTitle}>About this Category</Text>
          </View>
          <Text style={styles.description}>
            {category.description || `The ${category.categoryName} category includes exercises that focus on specific muscle groups and movement patterns. These exercises are designed to improve strength, flexibility, and overall fitness.`}
          </Text>
        </View>

        {/* Exercises Section */}
        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exercises in this Category</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          <Loading visible={loading} />
          {!loading && (
            <FlatList
              data={exercises}
              keyExtractor={(item) => item.exerciseId}
              renderItem={renderExerciseItem}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Icon name="fitness-center" size={48} color="#BDBDBD" />
                  <Text style={styles.emptyText}>No exercises found in this category</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Tips Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="lightbulb" size={22} color="#4CAF50" />
            <Text style={styles.cardTitle}>Category Tips</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={18} color="#4CAF50" style={styles.tipIcon} />
            <Text style={styles.tipText}>Start with lighter weights and focus on form</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={18} color="#4CAF50" style={styles.tipIcon} />
            <Text style={styles.tipText}>Gradually increase intensity as you progress</Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="check-circle" size={18} color="#4CAF50" style={styles.tipIcon} />
            <Text style={styles.tipText}>Mix exercises from different categories for a balanced workout</Text>
          </View>
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
  headerGradient: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
  },
  actionButton: {
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
  exercisesSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#424242',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  exerciseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    height: 120,
  },
  exerciseImage: {
    width: 120,
    height: '100%',
  },
  exerciseContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#424242',
    marginBottom: 4,
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#757575',
    flex: 1,
  },
  exerciseStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  exerciseStatsText: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#4CAF50',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
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
  bottomSpacing: {
    height: 24,
  },
});

export default CategoryDetailsScreen;