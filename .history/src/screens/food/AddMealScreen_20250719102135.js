
import React, { useLayoutEffect, useEffect, useState, useContext } from 'react';
import { showErrorFetchAPI, showSuccessMessage } from 'utils/toastUtil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { Feather } from '@expo/vector-icons';
import foodService from 'services/apiFoodService';
import Header from 'components/Header';
import { AuthContext } from 'context/AuthContext';

function AddMealScreen({ navigation, route }) {
  // Track which food row is showing the check animation
  const [checkAnimating, setCheckAnimating] = useState({});
  const { user } = useContext(AuthContext);

  const mealType = route?.params?.mealType || 'Meal';
  const [tab, setTab] = useState('Food');
  const [search, setSearch] = useState('');
  const [frequentFoods, setFrequentFoods] = useState([]);
  const [favoriteFoods, setFavoriteFoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFood, setSelectedFood] = useState(null);
  const [showFoodModal, setShowFoodModal] = useState(false);
  // State for saved foods modal
  const [showSavedFoodsModal, setShowSavedFoodsModal] = useState(false);
  const [savedFoods, setSavedFoods] = useState([]);
  const [editFood, setEditFood] = useState(null);
  const [editServing, setEditServing] = useState('1');
  const [editPortion, setEditPortion] = useState('1');
  const [editLoading, setEditLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: mealType });
  }, [navigation, mealType]);

  useEffect(() => {
    if (tab === 'Food') {
      setLoading(true);
      setError(null);
      foodService.getAllActiveFoods()
        .then((res) => {
          const foods = Array.isArray(res?.data?.foods) ? res.data.foods : [];
          setFrequentFoods(
            foods.map(f => ({
              foodId: f.foodId,
              name: f.foodName,
              kcal: f.calories,
              calories: f.calories,
              protein: f.protein ?? f.Protein ?? 0,
              carbs: f.carbs ?? f.Carbs ?? 0,
              fats: f.fats ?? f.Fats ?? 0,
              desc: f.description || '',
              image: f.image || '',
            }))
          );
        })
        .catch((e) => {
          setError('Failed to load foods');
        })
        .finally(() => setLoading(false));
    } else if (tab === 'Favorites') {
      setLoading(true);
      setError(null);
      AsyncStorage.getItem('favoriteFoods')
        .then((storedFavorites) => {
          let favs = [];
          if (storedFavorites) {
            try {
              favs = JSON.parse(storedFavorites);
            } catch {}
          }
          // Log the loaded favorite foods
          setFavoriteFoods(Array.isArray(favs) ? favs : []);
        })
        .catch(() => setFavoriteFoods([]))
        .finally(() => setLoading(false));
    }
  }, [tab]);

  let foodsToShow = [];
  if (tab === 'Food') {
    foodsToShow = frequentFoods.filter(f =>
      !search || f.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (tab === 'Favorites') {
    foodsToShow = favoriteFoods
      .map(fav => {
        // Handle both direct and nested foodDetails
        if (fav.foodDetails) {
          return {
            name: fav.foodDetails.foodName || fav.foodName || '',
            kcal: fav.foodDetails.calories || fav.calories || 0,
            foodId: fav.foodDetails.foodId || fav.foodId,
          };
        }
        return {
          name: fav.foodName || fav.name || '',
          kcal: fav.calories || 0,
          foodId: fav.foodId,
        };
      })
      .filter(f => !search || f.name.toLowerCase().includes(search.toLowerCase()));
  }

  return (
    <View style={styles.container}>
      <Header
        title={mealType}
        onBack={() => navigation.goBack()}
        showAvatar={false}
        rightActions={[
          {
            icon: 'more-horizontal',
            onPress: async () => {
              if (!user || !user.userId) return;
              const key = `userFoods_${user.userId}`;
              try {
                const existing = await AsyncStorage.getItem(key);
                let foods = [];
                if (existing) {
                  try { foods = JSON.parse(existing); } catch {}
                }
                setSavedFoods(Array.isArray(foods) ? foods : []);
                setShowSavedFoodsModal(true);
              } catch (e) {
                setSavedFoods([]);
                setShowSavedFoodsModal(true);
              }
            },
            color: '#64748B',
            backgroundColor: '#FFFFFF',
          },
        ]}
      />
      {/* Saved Foods Modal */}
      <Modal
        visible={showSavedFoodsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSavedFoodsModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, minWidth: 320, maxHeight: 480 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12 }}>Saved Foods</Text>
            <ScrollView style={{ maxHeight: 340 }}>
              {savedFoods.length === 0 && (
                <Text style={{ color: '#64748B', marginBottom: 12 }}>No foods saved.</Text>
              )}
              {savedFoods.map((food, idx) => (
                <View key={food.foodId ? `saved-${food.foodId}` : `${food.name}-${idx}`}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: '#1E293B' }}>{food.name}</Text>
                    <Text style={{ fontSize: 14, color: '#64748B' }}>{food.kcal} kcal</Text>
                  </View>
                  <TouchableOpacity
                    style={{ marginRight: 8, padding: 6, borderRadius: 8, backgroundColor: '#F1F5F9' }}
                  onPress={() => {
                    setEditFood({ ...food, idx });
                    setEditServing(food.servingSize ? String(food.servingSize) : '1');
                    setEditPortion(food.portionSize ? String(food.portionSize) : '1');
                  }}
                  >
                    <Feather name="edit" size={18} color="#0056d2" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ padding: 6, borderRadius: 8, backgroundColor: '#FEE2E2' }}
                    onPress={async () => {
                      if (!user || !user.userId) return;
                      const key = `userFoods_${user.userId}`;
                      let newFoods = savedFoods.filter((_, i) => i !== idx);
                      setSavedFoods(newFoods);
                      await AsyncStorage.setItem(key, JSON.stringify(newFoods));
                    }}
                  >
                    <Feather name="trash-2" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={{ backgroundColor: '#0056d2', borderRadius: 12, paddingVertical: 10, marginTop: 10 }}
              onPress={() => setShowSavedFoodsModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Food Modal */}
      <Modal
        visible={!!editFood}
        transparent
        animationType="fade"
        onRequestClose={() => setEditFood(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, minWidth: 280, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Chỉnh sửa khẩu phần</Text>
            {editFood && (
              <>
                <Text style={{ fontSize: 16, fontWeight: '500', marginBottom: 8 }}>{editFood.name}</Text>
                <Text style={{ fontSize: 14, color: '#64748B', marginBottom: 12 }}>{editFood.kcal} kcal</Text>
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <View style={{ marginRight: 12 }}>
                    <Text style={{ fontSize: 14, color: '#64748B' }}>Serving size</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 6, width: 60, textAlign: 'center', marginTop: 4 }}
                      keyboardType="numeric"
                      value={editServing}
                      onChangeText={setEditServing}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, color: '#64748B' }}>Portion size</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 6, width: 60, textAlign: 'center', marginTop: 4 }}
                      keyboardType="numeric"
                      value={editPortion}
                      onChangeText={setEditPortion}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#0056d2', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 32, marginTop: 8, minWidth: 120 }}
                  disabled={editLoading}
                  onPress={async () => {
                    setEditLoading(true);
                    try {
                      let updatedFoods = [...savedFoods];
                      const idx = editFood.idx;
                      const oldFood = updatedFoods[idx];
                      const serving = Number(editServing) || 1;
                      const portion = Number(editPortion) || 1;
                      let baseKcal = oldFood._baseKcal || oldFood.baseKcal || oldFood.kcal || 0;
                      if (!oldFood._baseKcal && oldFood.kcal) {
                        baseKcal = oldFood.kcal / ((oldFood.servingSize || 1) * (oldFood.portionSize || 1));
                      }
                      const newKcal = Math.round(baseKcal * serving * portion);
                      updatedFoods[idx] = {
                        ...oldFood,
                        servingSize: serving,
                        portionSize: portion,
                        kcal: newKcal,
                        _baseKcal: baseKcal,
                      };
                      setSavedFoods(updatedFoods);
                      if (user && user.userId) {
                        const key = `userFoods_${user.userId}`;
                        await AsyncStorage.setItem(key, JSON.stringify(updatedFoods));
                      }
                      setEditFood(null);
                    } catch (e) {
                      setEditFood(null);
                    } finally {
                      setEditLoading(false);
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>{editLoading ? 'Đang lưu...' : 'Lưu'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 8 }}
                  onPress={() => setEditFood(null)}
                >
                  <Text style={{ color: '#64748B', fontSize: 15 }}>Hủy</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      <View style={styles.searchBox}>
        <Feather name="search" size={20} color="#64748B" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Tìm món ăn...`}
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <View style={styles.tabSwitchRow}>
        <Text
          style={[styles.tabSwitch, tab === 'Food' && styles.tabSwitchActive]}
          onPress={() => setTab('Food')}
        >Food</Text>
        <Text
          style={[styles.tabSwitch, tab === 'Recent' && styles.tabSwitchActive]}
          onPress={() => setTab('Recent')}
        >Recent</Text>
        <Text
          style={[styles.tabSwitch, tab === 'Favorites' && styles.tabSwitchActive]}
          onPress={() => setTab('Favorites')}
        >Favorites</Text>
      </View>
      <ScrollView style={{ flex: 1 }}>
        {loading && (
          <View style={{ padding: 24 }}>
            <ActivityIndicator size="small" color="#0056d2" />
          </View>
        )}
        {error && (
          <View style={{ padding: 24 }}>
            <Text style={{ color: 'red' }}>{error}</Text>
          </View>
        )}
        {!loading && !error && foodsToShow.length === 0 && (
          <View style={{ padding: 24 }}>
            <Text style={{ color: '#64748B' }}>No foods found.</Text>
          </View>
        )}
        {!loading && !error && foodsToShow.map((item, idx) => {
          // Use foodId if available, else fallback to name+idx
          const key = item.foodId ? `food-${item.foodId}` : `${item.name}-${idx}`;
          const isAnimating = !!checkAnimating[key];
          return (
            <View key={key} style={styles.foodRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.foodName}>{item.name}</Text>
                {/* Only show kcal for favorites, skip desc if not available */}
              </View>
              <Text style={styles.foodKcal}>{item.kcal} kcal</Text>
              <View style={{ position: 'relative', width: 32, height: 32 }}>
                <TouchableOpacity
                  style={[styles.foodAddBtn, { position: 'absolute', left: 0, top: 0, zIndex: 2, opacity: isAnimating ? 0 : 1 }]}
                  disabled={isAnimating}
                  onPress={async () => {
                    // Save food to AsyncStorage under user-specific key
                    if (!user || !user.userId) return;
                    const keyStorage = `userFoods_${user.userId}`;
                    try {
                      const existing = await AsyncStorage.getItem(keyStorage);
                      let foods = [];
                      if (existing) {
                        try { foods = JSON.parse(existing); } catch {}
                      }
                      // Avoid duplicates by foodId if available, else by name
                      const exists = foods.some(f => (f.foodId && item.foodId && f.foodId === item.foodId) || (!f.foodId && f.name === item.name));
                      if (!exists) {
                        // Lưu đủ trường backend cần nếu có
                        let fullFood = { ...item };
                        // Lấy thêm các trường backend cần từ frequentFoods nếu có
                        const found = frequentFoods.find(f => f.name === item.name);
                        if (found) {
                          fullFood = {
                            ...fullFood,
                            foodId: found.foodId,
                            protein: found.protein,
                            carbs: found.carbs,
                            fats: found.fats,
                            calories: found.calories || found.kcal,
                            // các trường khác nếu có
                          };
                        }
                        // Nếu vẫn thiếu calories, lấy từ item.kcal
                        if (fullFood.calories === undefined && fullFood.kcal !== undefined) {
                          fullFood.calories = fullFood.kcal;
                        }
                        foods.push(fullFood);
                        await AsyncStorage.setItem(keyStorage, JSON.stringify(foods));
                      }
                      // Show check animation
                      setCheckAnimating(prev => ({ ...prev, [key]: true }));
                      setTimeout(() => {
                        setCheckAnimating(prev => ({ ...prev, [key]: false }));
                      }, 1500); // Show animation for 1.5 seconds
                    } catch (e) {}
                  }}
                >
                  <Feather name="plus" size={20} color="#0056d2" />
                </TouchableOpacity>
                {isAnimating && (
                  <LottieView
                    source={require('../../../assets/animation/CheckAnimation.json')}
                    autoPlay
                    loop={false}
                    style={{ width: 40, height: 40, position: 'absolute', left: -4, top: -4, zIndex: 3 }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
      <TouchableOpacity
        style={styles.doneBtn}
        onPress={async () => {
          if (!user || !user.userId) return;
          const key = `userFoods_${user.userId}`;
          try {
            const existing = await AsyncStorage.getItem(key);
            let foods = [];
            if (existing) {
              try { foods = JSON.parse(existing); } catch {}
            }
            if (!Array.isArray(foods) || foods.length === 0) {
              showErrorFetchAPI('No foods to submit!');
              return;
            }
            // Map foods to logDtos, cố gắng lấy foodId nếu chưa có
            const logDtos = foods
              .map(food => {
                let foodId = food.foodId;
                if (!foodId && food.name) {
                  // Tìm trong frequentFoods theo tên
                  const found = frequentFoods.find(f => f.name === food.name);
                  if (found && found.foodId) foodId = found.foodId;
                }
                if (!foodId) return null; // Bỏ qua món không có foodId
                return {
                  userId: user.userId,
                  foodId: foodId,
                  mealType: mealType,
                  portionSize: food.portionSize !== undefined ? food.portionSize : 1,
                  servingSize: food.servingSize !== undefined ? food.servingSize : 1,
                  calories: food.kcal !== undefined ? food.kcal : 0,
                  protein: food.protein !== undefined ? food.protein : 0,
                  carbs: food.carbs !== undefined ? food.carbs : 0,
                  fats: food.fats !== undefined ? food.fats : 0,
                  notes: food.notes && food.notes.toString().trim() !== '' ? food.notes : '',
                  satisfactionRating: food.satisfactionRating !== undefined ? food.satisfactionRating : 5,
                  consumptionDate: food.consumptionDate || (new Date()).toISOString().slice(0, 10),
                };
              })
              .filter(Boolean);
            if (logDtos.length === 0) {
              showErrorFetchAPI('No valid foods to submit!');
              return;
            }
            await foodService.createNutritionLogsBulk(logDtos, user.userId);
            await AsyncStorage.removeItem(key);
            setSavedFoods([]);
            showSuccessMessage('Submit successfully!');
          } catch (e) {
            showErrorFetchAPI(e);
          }
        }}
      >
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>

      {/* Food Info Modal */}
      <Modal
        visible={showFoodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFoodModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, minWidth: 260, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8 }}>{selectedFood?.name}</Text>
            <Text style={{ fontSize: 16, color: '#64748B', marginBottom: 16 }}>{selectedFood?.kcal} kcal</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#0056d2', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 32, marginTop: 8 }}
              onPress={() => setShowFoodModal(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#0056d2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  circleText: {
    color: '#0056d2',
    fontWeight: 'bold',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1E293B',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    marginHorizontal: 24,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
    marginTop: 110,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    flex: 1,
  },
  tabIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tabIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  tabLabel: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  tabSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 0,
    marginTop: 8,
  },
  tabSwitch: {
    fontSize: 15,
    color: '#64748B',
    paddingVertical: 8,
    flex: 1,
    textAlign: 'center',
    fontWeight: '500',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSwitchActive: {
    color: '#0056d2',
    borderBottomColor: '#0056d2',
    fontWeight: '700',
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  foodName: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  foodDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  foodKcal: {
    fontSize: 15,
    color: '#64748B',
    marginRight: 12,
    fontWeight: '500',
  },
  foodAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtn: {
    backgroundColor: '#0056d2',
    borderRadius: 20,
    margin: 24,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddMealScreen;
