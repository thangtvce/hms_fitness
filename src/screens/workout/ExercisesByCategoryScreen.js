import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, TextInput, Modal, ScrollView } from 'react-native';
import Loading from 'components/Loading';
import { showErrorFetchAPI, showSuccessMessage } from 'utils/toastUtil';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import workoutService from 'services/apiWorkoutService';
import Header from 'components/Header';

const ExercisesByCategoryScreen = ({ route, navigation }) => {
  const { categoryId, categoryName } = route.params;
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({
    PageNumber: 1,
    PageSize: 20,
    StartDate: '',
    EndDate: '',
    ValidPageSize: 20,
    SearchTerm: '',
    Status: '',
  });
  const [filterDraft, setFilterDraft] = useState({
    PageNumber: 1,
    PageSize: 20,
    StartDate: '',
    EndDate: '',
    ValidPageSize: 20,
    SearchTerm: '',
    Status: '',
  });

  useEffect(() => {
    const fetchExercises = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await workoutService.getExercisesByCategory(categoryId, filters);
        setExercises(data.exercises || []);
      } catch (err) {
        setError(err.message || 'Failed to fetch exercises');
        showErrorFetchAPI(err.message || 'Failed to fetch exercises');
      } finally {
        setLoading(false);
      }
    };
    fetchExercises();
  }, [categoryId, filters]);

  useEffect(() => {
    if (showFilter) setFilterDraft(filters);
  }, [showFilter]);

  const renderExerciseItem = ({ item }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => navigation.navigate('ExerciseDetails', { exercise: item })}
      activeOpacity={0.8}
    >
      <Image
        source={{ uri: item.imageUrl || item.mediaUrl || `https://source.unsplash.com/300x200/?fitness,${item.exerciseName?.replace(/\s/g, '')}` }}
        style={styles.exerciseImage}
        resizeMode="cover"
      />
      <View style={styles.exerciseContent}>
        <Text style={styles.exerciseName}>{item.exerciseName}</Text>
        <Text style={styles.exerciseDescription} numberOfLines={2}>{item.description}</Text>
        <View style={styles.exerciseStats}>
          <Icon name="local-fire-department" size={16} color="#FF5252" />
          <Text style={styles.exerciseStatsText}>{item.caloriesBurnedPerMin} kcal/min</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: 'absolute', width: '100%', height: '100%', zIndex: 999 }}>
          <Loading />
        </View>
      ) : (
        <>
          <Header
            title={categoryName || `Category ${categoryId}`}
            onBack={() => navigation.goBack()}
            rightActions={[
              {
                icon: 'options-outline',
                onPress: () => setShowFilter(true),
                color: '#1E293B',
                iconSet: 'MaterialIcons',
              },
            ]}
          />
          <View style={{ marginTop: 55 }}>
            {/* Modal bộ lọc */}
            <Modal
              visible={showFilter}
              animationType="slide"
              transparent={true}
              onRequestClose={() => setShowFilter(false)}
            >
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 16, padding: 16 }}>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' }}>Bộ lọc bài tập</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <TextInput
                          placeholder="Search..."
                          value={filterDraft.SearchTerm}
                          onChangeText={text => setFilterDraft(f => ({ ...f, SearchTerm: text }))}
                          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8 }}
                        />
                      </View>
                      <View style={{ width: 100 }}>
                        <TextInput
                          placeholder="Status"
                          value={filterDraft.Status}
                          onChangeText={text => setFilterDraft(f => ({ ...f, Status: text }))}
                          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8 }}
                        />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <TextInput
                          placeholder="Start Date (yyyy-mm-dd)"
                          value={filterDraft.StartDate}
                          onChangeText={text => setFilterDraft(f => ({ ...f, StartDate: text }))}
                          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8 }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          placeholder="End Date (yyyy-mm-dd)"
                          value={filterDraft.EndDate}
                          onChangeText={text => setFilterDraft(f => ({ ...f, EndDate: text }))}
                          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8 }}
                        />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <TextInput
                          placeholder="Page Number"
                          value={filterDraft.PageNumber.toString()}
                          keyboardType="numeric"
                          onChangeText={text => setFilterDraft(f => ({ ...f, PageNumber: parseInt(text) || 1 }))}
                          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8 }}
                        />
                      </View>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <TextInput
                          placeholder="Page Size"
                          value={filterDraft.PageSize.toString()}
                          keyboardType="numeric"
                          onChangeText={text => setFilterDraft(f => ({ ...f, PageSize: parseInt(text) || 20 }))}
                          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8 }}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <TextInput
                          placeholder="Valid Page Size"
                          value={filterDraft.ValidPageSize.toString()}
                          keyboardType="numeric"
                          onChangeText={text => setFilterDraft(f => ({ ...f, ValidPageSize: parseInt(text) || 20 }))}
                          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 8 }}
                        />
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                      <TouchableOpacity
                        style={{ backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' }}
                        onPress={() => { setFilters(filterDraft); setShowFilter(false); }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Lọc</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ backgroundColor: '#eee', padding: 10, borderRadius: 8, flex: 1, marginLeft: 8, alignItems: 'center' }}
                        onPress={() => setShowFilter(false)}
                      >
                        <Text style={{ color: '#333', fontWeight: 'bold' }}>Đóng</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </View>
            </Modal>
            {/* Danh sách bài tập */}
            {error ? (
              <View style={styles.loadingContainer}>
                <Text style={{ color: 'red' }}>{error}</Text>
              </View>
            ) : (
              <FlatList
                data={exercises}
                keyExtractor={item => item.exerciseId?.toString()}
                renderItem={renderExerciseItem}
                contentContainerStyle={{ padding: 16 }}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>No exercises found.</Text>}
              />
            )}
          </View>
        </>
      )}
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
    paddingBottom: 32,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
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
});

export default ExercisesByCategoryScreen;
