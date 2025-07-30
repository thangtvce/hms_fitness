import React,{ useLayoutEffect,useEffect,useState,useContext } from 'react';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View,Text,TouchableOpacity,TextInput,ScrollView,StyleSheet,ActivityIndicator,Modal } from 'react-native';
import LottieView from 'lottie-react-native';
import { Feather } from '@expo/vector-icons';
import foodService from 'services/apiFoodService';
import Header from 'components/Header';
import { useRef } from 'react';
import { AuthContext } from 'context/AuthContext';
import FoodDetailsOverlay from 'components/food/FoodDetailsOverlay';
import SavedFoodsModal from 'components/SavedFoodsModal';
import { handleDailyCheckin } from 'utils/checkin';

function AddMealScreen({ navigation,route }) {
  // Track which food row is showing the check animation
  const [checkAnimating,setCheckAnimating] = useState({});
  const { user } = useContext(AuthContext);

  const mealType = route?.params?.mealType || 'Meal';
  const [tab,setTab] = useState('Food');
  const [search,setSearch] = useState('');
  const [frequentFoods,setFrequentFoods] = useState([]);
  const [recentFoods,setRecentFoods] = useState([]);
  const [favoriteFoods,setFavoriteFoods] = useState([]);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState(null);
  const [selectedFood,setSelectedFood] = useState(null);
  const [showFoodModal,setShowFoodModal] = useState(false);
  // State for saved foods modal
  const [showSavedFoodsModal,setShowSavedFoodsModal] = useState(false);
  const [savedFoods,setSavedFoods] = useState([]);
  // For badge animation
  const badgeRef = useRef();
  const [editFood,setEditFood] = useState(null);
  const [editServing,setEditServing] = useState('1');
  const [editPortion,setEditPortion] = useState('1');
  const [editLoading,setEditLoading] = useState(false);
  const [badgeLoading,setBadgeLoading] = useState(false);
  const [showFoodOverlay,setShowFoodOverlay] = useState(false);
  const [foodOverlayData,setFoodOverlayData] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: mealType });
  },[navigation,mealType]);

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
          showErrorFetchAPI(e);
        })
        .finally(() => setLoading(false));
    } else if (tab === 'Recent') {
      setLoading(true);
      setError(null);
      foodService.getMyNutritionLogs({ pageNumber: 1,pageSize: 30 })
        .then((res) => {
          const logs = Array.isArray(res?.data?.nutritionLogs) ? res.data.nutritionLogs : [];
          setRecentFoods(
            logs.map(log => ({
              logId: log.logId, // Include logId for unique key
              foodId: log.foodId,
              name: log.foodName,
              kcal: log.calories,
              calories: log.calories,
              protein: log.protein ?? 0,
              carbs: log.carbs ?? 0,
              fats: log.fats ?? 0,
              desc: log.foodDescription || '',
              image: log.foodImage || '',
            }))
          );
        })
        .catch((e) => {
          setError('Failed to load recent foods');
          showErrorFetchAPI(e);
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
            } catch { }
          }
          setFavoriteFoods(Array.isArray(favs) ? favs : []);
        })
        .catch(() => setFavoriteFoods([]))
        .finally(() => setLoading(false));
    }
  },[tab]);

  let foodsToShow = [];
  if (tab === 'Food') {
    foodsToShow = frequentFoods.filter(f =>
      !search || f.name.toLowerCase().includes(search.toLowerCase())
    );
  } else if (tab === 'Recent') {
    foodsToShow = recentFoods.filter(f =>
      !search || f.name.toLowerCase().includes(search.toLowerCase())
    );
  } else if (tab === 'Favorites') {
    foodsToShow = favoriteFoods
      .map(fav => {
        if (fav.foodDetails) {
          return {
            name: fav.foodDetails.foodName || fav.foodName || '',
            kcal: fav.foodDetails.calories || fav.calories || 0,
            foodId: fav.foodDetails.foodId || fav.foodId,
            protein: fav.foodDetails.protein || 0,
            carbs: fav.foodDetails.carbs || 0,
            fats: fav.foodDetails.fats || 0,
            desc: fav.foodDetails.description || '',
            image: fav.foodDetails.image || '',
          };
        }
        return {
          name: fav.foodName || fav.name || '',
          kcal: fav.calories || 0,
          foodId: fav.foodId,
          protein: fav.protein || 0,
          carbs: fav.carbs || 0,
          fats: fav.fats || 0,
          desc: fav.description || '',
          image: fav.image || '',
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
            icon: (
              <View style={{
                minWidth: 24,
                height: 24,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
                overflow: 'visible',
              }}>
                {badgeLoading ? (
                  <LottieView
                    source={require('../../../assets/animation/SpiralLoadingAnimation.json')}
                    autoPlay
                    loop
                    style={{ width: 80,height: 80,position: 'absolute',left: -28,top: -28,zIndex: 3 }}
                  />
                ) : (
                  <Text style={{ color: '#0056d2',fontSize: 18,fontWeight: 'bold' }}>{savedFoods.length > 0 ? savedFoods.length : 0}</Text>
                )}
              </View>
            ),
            onPress: async () => {
              if (!user || !user.userId) return;
              const key = `userFoods_${user.userId}`;
              try {
                const existing = await AsyncStorage.getItem(key);
                let foods = [];
                if (existing) {
                  try { foods = JSON.parse(existing); } catch { }
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
      <SavedFoodsModal
        visible={showSavedFoodsModal}
        savedFoods={savedFoods}
        onClose={() => setShowSavedFoodsModal(false)}
        onUpdateFood={async (updatedFoods) => {
          setSavedFoods(updatedFoods);
          if (user && user.userId) {
            const key = `userFoods_${user.userId}`;
            await AsyncStorage.setItem(key,JSON.stringify(updatedFoods));
          }
        }}
        onDelete={async (idx) => {
          if (!user || !user.userId) return;
          const key = `userFoods_${user.userId}`;
          let newFoods = savedFoods.filter((_,i) => i !== idx);
          setSavedFoods(newFoods);
          await AsyncStorage.setItem(key,JSON.stringify(newFoods));
        }}
      />

      {/* Edit Food Modal */}
      <Modal
        visible={!!editFood}
        transparent
        animationType="fade"
        onRequestClose={() => setEditFood(null)}
      >
        <View style={{ flex: 1,backgroundColor: 'rgba(0,0,0,0.3)',justifyContent: 'center',alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff',borderRadius: 16,padding: 24,minWidth: 280,alignItems: 'center' }}>
            <Text style={{ fontSize: 18,fontWeight: 'bold',marginBottom: 8 }}>Edit portion</Text>
            {editFood && (
              <>
                <Text style={{ fontSize: 16,fontWeight: '500',marginBottom: 8 }}>{editFood.name}</Text>
                <Text style={{ fontSize: 14,color: '#64748B',marginBottom: 12 }}>{editFood.kcal} kcal</Text>
                <View style={{ flexDirection: 'row',marginBottom: 10 }}>
                  <View style={{ marginRight: 12 }}>
                    <Text style={{ fontSize: 14,color: '#64748B' }}>Serving size</Text>
                    <TextInput
                      style={{ borderWidth: 1,borderColor: '#E5E7EB',borderRadius: 8,padding: 6,width: 60,textAlign: 'center',marginTop: 4 }}
                      keyboardType="numeric"
                      value={editServing}
                      onChangeText={setEditServing}
                    />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14,color: '#64748B' }}>Portion size</Text>
                    <TextInput
                      style={{ borderWidth: 1,borderColor: '#E5E7EB',borderRadius: 8,padding: 6,width: 60,textAlign: 'center',marginTop: 4 }}
                      keyboardType="numeric"
                      value={editPortion}
                      onChangeText={setEditPortion}
                    />
                  </View>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#0056d2',borderRadius: 12,paddingVertical: 10,paddingHorizontal: 32,marginTop: 8,minWidth: 120 }}
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
                        await AsyncStorage.setItem(key,JSON.stringify(updatedFoods));
                      }
                      setEditFood(null);
                    } catch (e) {
                      setEditFood(null);
                      showErrorFetchAPI(e);
                    } finally {
                      setEditLoading(false);
                    }
                  }}
                >
                  <Text style={{ color: '#fff',fontWeight: 'bold',fontSize: 16,textAlign: 'center' }}>{editLoading ? 'Đang lưu...' : 'Lưu'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ marginTop: 8 }}
                  onPress={() => setEditFood(null)}
                >
                  <Text style={{ color: '#64748B',fontSize: 15 }}>Hủy</Text>
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
          placeholder={`Search for meal...`}
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <View style={styles.tabSwitchRow}>
        <Text
          style={[styles.tabSwitch,tab === 'Food' && styles.tabSwitchActive]}
          onPress={() => setTab('Food')}
        >Food</Text>
        <Text
          style={[styles.tabSwitch,tab === 'Recent' && styles.tabSwitchActive]}
          onPress={() => setTab('Recent')}
        >Recent</Text>
        <Text
          style={[styles.tabSwitch,tab === 'Favorites' && styles.tabSwitchActive]}
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
        {!loading && !error && foodsToShow.map((item,idx) => {
          // Use logId for Recent tab to ensure unique keys
          const key = tab === 'Recent' && item.logId ? `log-${item.logId}-food-${item.foodId}` : item.foodId ? `food-${item.foodId}` : `${item.name}-${idx}`;
          const isAnimating = !!checkAnimating[key];
          return (
            <View key={key} style={styles.foodRow}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => { setFoodOverlayData(item); setShowFoodOverlay(true); }}>
                <Text style={styles.foodName}>{item.name}</Text>
              </TouchableOpacity>
              <Text style={styles.foodKcal}>
                {item.kcal} kcal
              </Text>
              <View style={{ position: 'relative',width: 32,height: 32 }}>
                <TouchableOpacity
                  style={[styles.foodAddBtn,{ position: 'absolute',left: 0,top: 0,zIndex: 2,opacity: isAnimating ? 0 : 1 }]}
                  disabled={isAnimating}
                  onPress={async () => {
                    if (!user || !user.userId) return;
                    const keyStorage = `userFoods_${user.userId}`;
                    try {
                      const existing = await AsyncStorage.getItem(keyStorage);
                      let foods = [];
                      if (existing) {
                        try { foods = JSON.parse(existing); } catch { }
                      }
                      const idx = foods.findIndex(f => (f.foodId && item.foodId && f.foodId === item.foodId) || (!f.foodId && f.name === item.name));
                      if (idx === -1) {
                        let fullFood = { ...item,servingSize: 1,portionSize: 1 };
                        if (tab === 'Recent' || tab === 'Food') {
                          const found = (tab === 'Recent' ? recentFoods : frequentFoods).find(f => f.name === item.name);
                          if (found) {
                            fullFood = {
                              ...fullFood,
                              foodId: found.foodId,
                              protein: found.protein,
                              carbs: found.carbs,
                              fats: found.fats,
                              calories: found.calories || found.kcal,
                              desc: found.desc,
                              image: found.image,
                            };
                          }
                        }
                        if (fullFood.calories === undefined && fullFood.kcal !== undefined) {
                          fullFood.calories = fullFood.kcal;
                        }
                        foods.push(fullFood);
                        setBadgeLoading(true);
                        setTimeout(() => {
                          setSavedFoods([...foods]);
                          setBadgeLoading(false);
                          AsyncStorage.setItem(keyStorage,JSON.stringify(foods));
                        },800);
                      } else {
                        let updated = [...foods];
                        let old = updated[idx];
                        let portion = (old.portionSize || 1) + 1;
                        let serving = old.servingSize || 1;
                        let baseKcal = old._baseKcal || old.baseKcal || old.kcal || 0;
                        if (!old._baseKcal && old.kcal) {
                          baseKcal = old.kcal / ((old.servingSize || 1) * (old.portionSize || 1));
                        }
                        const newKcal = Math.round(baseKcal * serving * portion);
                        updated[idx] = {
                          ...old,
                          portionSize: portion,
                          kcal: newKcal,
                          _baseKcal: baseKcal,
                        };
                        setBadgeLoading(true);
                        setTimeout(() => {
                          setSavedFoods(updated);
                          setBadgeLoading(false);
                          AsyncStorage.setItem(keyStorage,JSON.stringify(updated));
                        },800);
                      }
                      setCheckAnimating(prev => ({ ...prev,[key]: true }));
                      setTimeout(() => {
                        setCheckAnimating(prev => ({ ...prev,[key]: false }));
                      },1500);
                    } catch (e) {
                      showErrorFetchAPI(e);
                    }
                  }}
                >
                  <Feather name="plus" size={20} color="#0056d2" />
                </TouchableOpacity>
                {isAnimating && (
                  <LottieView
                    source={require('../../../assets/animation/CheckAnimation.json')}
                    autoPlay
                    loop={false}
                    style={{ width: 48,height: 48,position: 'absolute',left: -8,top: -8,zIndex: 3 }}
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
              try { foods = JSON.parse(existing); } catch { }
            }
            if (!Array.isArray(foods) || foods.length === 0) {
              showErrorFetchAPI('No foods to submit!');
              return;
            }
            const logDtos = foods
              .map(food => {
                let foodId = food.foodId;
                if (!foodId && food.name) {
                  const found = [...frequentFoods,...recentFoods].find(f => f.name === food.name);
                  if (found && found.foodId) foodId = found.foodId;
                }
                if (!foodId) return null;
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
                  consumptionDate: food.consumptionDate || (new Date()).toISOString().slice(0,10),
                };
              })
              .filter(Boolean);
            if (logDtos.length === 0) {
              showErrorFetchAPI('No valid foods to submit!');
              return;
            }
            await foodService.createNutritionLogsBulk(logDtos,user.userId);
            await AsyncStorage.removeItem(key);
            setSavedFoods([]);
            showSuccessMessage('Submit successfully!');
            try {
              if (user?.userId) {
                await handleDailyCheckin(user.userId,"meal_log");
              }
            } catch (e) {
              console.log(e);
            }
          } catch (e) {
            showErrorFetchAPI(e);
          }
        }}
      >
        <Text style={styles.doneBtnText}>Log Now</Text>
      </TouchableOpacity>

      {/* Food Info Modal */}
      <Modal
        visible={showFoodModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFoodModal(false)}
      >
        <View style={{ flex: 1,backgroundColor: 'rgba(0,0,0,0.3)',justifyContent: 'center',alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff',borderRadius: 16,padding: 24,minWidth: 260,alignItems: 'center' }}>
            <Text style={{ fontSize: 20,fontWeight: 'bold',marginBottom: 8 }}>{selectedFood?.name}</Text>
            <Text style={{ fontSize: 16,color: '#64748B',marginBottom: 16 }}>{selectedFood?.kcal} kcal</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#0056d2',borderRadius: 12,paddingVertical: 10,paddingHorizontal: 32,marginTop: 8 }}
              onPress={() => setShowFoodModal(false)}
            >
              <Text style={{ color: '#fff',fontWeight: 'bold',fontSize: 16 }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FoodDetailsOverlay
        food={showFoodOverlay ? foodOverlayData : null}
        onClose={() => setShowFoodOverlay(false)}
        onAdd={async () => {
          if (!user || !user.userId || !foodOverlayData) return;
          const keyStorage = `userFoods_${user.userId}`;
          try {
            const existing = await AsyncStorage.getItem(keyStorage);
            let foods = [];
            if (existing) {
              try { foods = JSON.parse(existing); } catch { }
            }
            const exists = foods.some(f => (f.foodId && foodOverlayData.foodId && f.foodId === foodOverlayData.foodId) || (!f.foodId && f.name === foodOverlayData.name));
            if (!exists) {
              let fullFood = { ...foodOverlayData,servingSize: 1,portionSize: 1 };
              const found = [...frequentFoods,...recentFoods].find(f => f.name === foodOverlayData.name);
              if (found) {
                fullFood = {
                  ...fullFood,
                  foodId: found.foodId,
                  protein: found.protein,
                  carbs: found.carbs,
                  fats: found.fats,
                  calories: found.calories || found.kcal,
                  desc: found.desc,
                  image: found.image,
                };
              }
              if (fullFood.calories === undefined && fullFood.kcal !== undefined) {
                fullFood.calories = fullFood.kcal;
              }
              foods.push(fullFood);
              setBadgeLoading(true);
              setTimeout(() => {
                setSavedFoods([...foods]);
                setBadgeLoading(false);
                AsyncStorage.setItem(keyStorage,JSON.stringify(foods));
              },800);
            }
            setShowFoodOverlay(false);
            showSuccessMessage('Added to meal!');
          } catch (e) { showErrorFetchAPI(e); }
        }}
      />
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    marginHorizontal: 24,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 10,
    marginTop: 125,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
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