import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Image,
  Dimensions,
  Animated,
  Platform,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "theme/color";
import { StatusBar } from "expo-status-bar";
import Header from "components/Header";
import workoutService from "services/apiWorkoutService";

const { width, height } = Dimensions.get("window");



export default function WorkoutListScreen() {
  const [showFilter, setShowFilter] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState({}); // { [id]: name }
  const [favorites, setFavorites] = useState([]); // array of exerciseId
  const [filters, setFilters] = useState({
    PageNumber: 1,
    PageSize: 20,
    StartDate: '',
    EndDate: '',
    ValidPageSize: 20,
    SearchTerm: '',
    Status: '',
  });
  // State tạm cho modal filter
  const [filterDraft, setFilterDraft] = useState({
    PageNumber: 1,
    PageSize: 20,
    StartDate: '',
    EndDate: '',
    ValidPageSize: 20,
    SearchTerm: '',
    Status: '',
  });
  const navigation = useNavigation();

  // Load favorites from AsyncStorage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
        const favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
        setFavorites(favoriteList.map(item => item.exerciseId));
      } catch (error) {}
    };
    loadFavorites();
  }, []);

  // Thêm vào danh sách yêu thích
  const toggleFavorite = async (exercise) => {
    try {
      const storedFavorites = await AsyncStorage.getItem('favoriteExercises');
      let favoriteList = storedFavorites ? JSON.parse(storedFavorites) : [];
      const exists = favoriteList.some((ex) => ex.exerciseId === exercise.exerciseId);
      let updatedList;
      if (exists) {
        updatedList = favoriteList.filter((ex) => ex.exerciseId !== exercise.exerciseId);
      } else {
        updatedList = [...favoriteList, exercise];
      }
      await AsyncStorage.setItem('favoriteExercises', JSON.stringify(updatedList));
      setFavorites(updatedList.map(item => item.exerciseId));
      Alert.alert('Success', exists ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorites.');
    }
  };

  // Thêm vào workout session
  const addToSchedule = async (exercise) => {
    try {
      const storedExercises = await AsyncStorage.getItem('scheduledExercises');
      let scheduledExercises = storedExercises ? JSON.parse(storedExercises) : [];
      if (scheduledExercises.some((ex) => ex.exerciseId === exercise.exerciseId)) {
        Alert.alert('Info', `${exercise.exerciseName} is already in your schedule`);
        return;
      }
      const exerciseToSave = { ...exercise, mediaUrl: exercise.mediaUrl || '' };
      scheduledExercises.push(exerciseToSave);
      await AsyncStorage.setItem('scheduledExercises', JSON.stringify(scheduledExercises));
      Alert.alert('Success', `${exercise.exerciseName} added to your workout schedule`);
    } catch (error) {
      Alert.alert('Error', 'Failed to add exercise to schedule. Please try again.');
    }
  };

  // Hàm lấy tên category theo id
  const getCategoryName = async (id) => {
    if (!id || id <= 0 || categories[id]) return;
    try {
      // Giả sử workoutService.getCategoryById đã có như bạn gửi
      const data = await workoutService.getCategoryById(id);
      setCategories(prev => ({ ...prev, [id]: data?.categoryName || id }));
    } catch (error) {
      setCategories(prev => ({ ...prev, [id]: 'N/A' }));
    }
  };

  // Fetch exercises with filters
  const fetchExercises = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await workoutService.getAllExercises({
        PageNumber: filters.PageNumber,
        PageSize: filters.PageSize,
        StartDate: filters.StartDate,
        EndDate: filters.EndDate,
        ValidPageSize: filters.ValidPageSize,
        SearchTerm: filters.SearchTerm,
        Status: filters.Status,
      });
      if (Array.isArray(response)) {
        setExercises(response);
      } else if (response && Array.isArray(response.exercises)) {
        setExercises(response.exercises);
      } else {
        setExercises([]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch exercises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [filters]);

  // Khi mở modal, đồng bộ filterDraft với filters
  useEffect(() => {
    if (showFilter) {
      setFilterDraft(filters);
    }
  }, [showFilter]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0056d2" />
        <Text style={{ marginTop: 16 }}>Loading exercises...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 12, backgroundColor: '#0056d2', borderRadius: 8 }}>
          <Text style={{ color: '#fff' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <Header title="Workout List" onBack={() => navigation.goBack()} />
      {/* Nút menu filter */}
      <View style={{ marginTop: 50, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => setShowFilter(true)} style={{ padding: 8 }}>
          <Ionicons name="menu" size={32} color="#0056d2" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginLeft: 8 }}>Bộ lọc</Text>
      </View>
      {/* Modal bộ lọc */}
      <Modal visible={showFilter} animationType="slide" transparent={true} onRequestClose={() => setShowFilter(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.2)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', backgroundColor: '#fff', borderRadius: 16, padding: 16 }}>
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
                style={{ backgroundColor: '#0056d2', padding: 10, borderRadius: 8, flex: 1, marginRight: 8, alignItems: 'center' }}
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
          </View>
        </View>
      </Modal>
      {/* Danh sách bài tập */}
      <FlatList
        data={exercises}
        keyExtractor={(item, index) => item.exerciseId ? `exercise-${item.exerciseId}` : `item-${index}`}
        renderItem={({ item }) => {
          // ...existing code...
          if (typeof item.categoryId === 'number' && !categories[item.categoryId]) {
            getCategoryName(item.categoryId);
          }
          const isFavorite = favorites.includes(item.exerciseId);
          return (
            <View style={{ backgroundColor: '#fff', margin: 10, borderRadius: 12, padding: 16, elevation: 2, flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: item.mediaUrl || item.imageUrl || `https://source.unsplash.com/400x250/?fitness,${item.exerciseName?.replace(/\s/g, "")}` }}
                style={{ width: 80, height: 80, borderRadius: 10, marginRight: 16 }}
                resizeMode="cover"
              />
              {/* Vùng thông tin, bấm vào sẽ vào chi tiết */}
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('ExerciseDetails', { exercise: item })}
              >
                <View>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0056d2' }}>{item.exerciseName || 'Unknown Exercise'}</Text>
                  <Text style={{ fontSize: 13, color: '#64748B', marginTop: 4 }} numberOfLines={2}>{item.description || 'No description available'}</Text>
                  <Text style={{ fontSize: 12, color: '#10B981', marginTop: 4 }}>{item.status || ''}</Text>
                  <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>Calories: {item.caloriesBurnedPerMin ?? 'N/A'}</Text>
                  <Text style={{ fontSize: 12, color: '#6366F1', marginTop: 2 }}>Gender: {item.genderSpecific ?? 'N/A'}</Text>
                  <Text style={{ fontSize: 12, color: '#F59E0B', marginTop: 2 }}>
                    Category: {
                      typeof item.categoryId === 'number'
                        ? (categories[item.categoryId] || 'Đang tải...')
                        : (item.categoryId ?? 'N/A')
                    }
                  </Text>
                  {/* Trainer info hidden as requested */}
                </View>
              </TouchableOpacity>
              {/* Nút yêu thích và nút thêm vào workout session */}
              <View style={{ flexDirection: 'column', alignItems: 'center', marginLeft: 8 }}>
                <TouchableOpacity onPress={() => toggleFavorite(item)} style={{ padding: 6 }}>
                  <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={24} color={isFavorite ? '#EF4444' : '#64748B'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => addToSchedule(item)} style={{ padding: 6, marginTop: 8 }}>
                  <Ionicons name="add-circle-outline" size={24} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 40 }}>No exercises found.</Text>}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

