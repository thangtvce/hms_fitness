"use client"

import { useEffect, useState } from "react"
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  Animated,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { useNavigation } from "@react-navigation/native"
import dayjs from "dayjs"

// Icon imports - using react-native-vector-icons
import Icon from "react-native-vector-icons/MaterialIcons"
import IconCommunity from "react-native-vector-icons/MaterialCommunityIcons"
import IconFeather from "react-native-vector-icons/Feather"

import { getFoodLogByDate, clearFoodLogByDate, addFoodToLog } from "utils/foodLogStorage"
import apiUserService from "services/apiUserService"
import AsyncStorage from '@react-native-async-storage/async-storage';
import { foodService } from "services/apiFoodService"
import { useAuth } from "context/AuthContext"

const { width } = Dimensions.get("window")
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"]

const sumNutrition = (foods) => {
  return foods.reduce(
    (acc, food) => {
      acc.calories += food.calories || 0
      acc.protein += food.protein || 0
      acc.carbs += food.carbs || 0
      acc.fats += food.fats || 0
      return acc
    },
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  )
}

const FoodDailyLogScreen = () => {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"))
  const [log, setLog] = useState({ Breakfast: [], Lunch: [], Dinner: [] })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("daily")
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingFood, setEditingFood] = useState(null)
  const [calendarData, setCalendarData] = useState([])
  const [selectedHistoryDate, setSelectedHistoryDate] = useState(null)
  const [historyDetailModal, setHistoryDetailModal] = useState(false)
  const [expandedMeals, setExpandedMeals] = useState({})
  const [fadeAnim] = useState(new Animated.Value(0))
  const { user, loading: authLoading } = useAuth()
  const navigation = useNavigation()

  // Filter states
  const [filters, setFilters] = useState({
    pageNumber: 1,
    pageSize: 10,
    startDate: "",
    endDate: "",
    searchTerm: "",
    mealType: "",
  })

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start()
  }, [])

  const loadLog = async () => {
    try {
      const data = await getFoodLogByDate(date)
      setLog(data)
    } catch (error) {
      Alert.alert("Error", "Unable to load food log: " + error.message)
    }
  }

  const loadCalendarData = async () => {
    try {
      const response = await foodService.getMyNutritionLogs({
        pageNumber: filters.pageNumber || 1,
        pageSize: filters.pageSize || 30,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        searchTerm: filters.searchTerm || undefined,
        mealType: filters.mealType || undefined,
      })

      if (response.statusCode === 200) {
        const logs = response.data.nutritionLogs || []
        const grouped = {}
        logs.forEach((log) => {
          if (!grouped[log.consumptionDate]) {
            grouped[log.consumptionDate] = {
              Breakfast: [],
              Lunch: [],
              Dinner: [],
            }
          }
          const mealType = log.mealType || "Breakfast"
          // Ensure the mealType array exists, even for unexpected types
          if (!grouped[log.consumptionDate][mealType]) {
            grouped[log.consumptionDate][mealType] = []
          }
          grouped[log.consumptionDate][mealType].push({
            foodName: log.foodName,
            calories: log.calories,
            protein: log.protein,
            carbs: log.carbs,
            fats: log.fats,
            image: log.foodImage,
            quantity: log.quantity || 1,
          })
        })

        const calendarData = Object.keys(grouped)
          .map((date) => {
            const allFoods = [...grouped[date].Breakfast, ...grouped[date].Lunch, ...grouped[date].Dinner]
            return {
              date,
              meals: grouped[date],
              foods: allFoods,
              totalCalories: sumNutrition(allFoods).calories,
            }
          })
          .sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix())
        setCalendarData(calendarData)
      } else {
        setCalendarData([])
        Alert.alert("Error", response.message || "Unable to load calendar data.")
      }
    } catch (error) {
      setCalendarData([])
      Alert.alert("Error", "Unable to load calendar data: " + error.message)
    }
  }

  useEffect(() => {
    if (!authLoading && user) {
      loadLog()
      loadCalendarData()
    }
  }, [date, authLoading, user, filters])

  const handleSaveToServer = async () => {
    setLoading(true)
    try {
      const userId = user?.userId
      if (!userId) {
        throw new Error("User not logged in.")
      }

      const foodsToSave = []
      MEAL_TYPES.forEach((mealType) => {
        log[mealType].forEach((food) => {
          // Đảm bảo các trường là số và không undefined/null
          const foodToPush = {
            ...food,
            userId: userId,
            mealType,
            consumptionDate: date,
            image: food.image || food.imageUrl,
            calories: Number(food.calories) || 0,
            protein: Number(food.protein) || 0,
            carbs: Number(food.carbs) || 0,
            fats: Number(food.fats) || 0,
            quantity: Number(food.quantity) || 1,
          };
          // Xóa các trường undefined/null
          Object.keys(foodToPush).forEach(key => {
            if (foodToPush[key] === undefined || foodToPush[key] === null) {
              delete foodToPush[key];
            }
          });
          foodsToSave.push(foodToPush);
        })
      })

      if (foodsToSave.length === 0) {
        Alert.alert("Notice", "No food items to save.")
        setLoading(false)
        return
      }

      const res = await foodService.createNutritionLogsBulk(foodsToSave, userId)
      if (res.statusCode === 201) {
        // Check-in logic: only check-in once per day
        try {
          const today = new Date();
          const year = today.getFullYear();
          const month = String(today.getMonth() + 1).padStart(2, '0');
          const day = String(today.getDate()).padStart(2, '0');
          const todayKey = `@Checkin_${year}-${month}-${day}`;
          const alreadyCheckedIn = await AsyncStorage.getItem(todayKey);
          if (!alreadyCheckedIn) {
            await apiUserService.checkInUser('checkin');
            await AsyncStorage.setItem(todayKey, '1');
          }
        } catch (e) {
          // Silent fail for check-in, do not block log
        }
        Alert.alert("Success", "Food log saved to server!")
        await clearFoodLogByDate(date)
        loadLog()
        loadCalendarData()
      } else {
        Alert.alert("Error", res.message || "Unable to save food log.")
      }
    } catch (e) {
      Alert.alert("Error", e.message || "Unable to save food log.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteFoodLog = async (mealType, idx) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this food item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const updatedLog = { ...log }
            updatedLog[mealType] = updatedLog[mealType].filter((_, i) => i !== idx)
            setLog(updatedLog)
            await clearFoodLogByDate(date)
            await addFoodToLog(date, mealType, updatedLog[mealType])
          } catch (error) {
            Alert.alert("Error", "Unable to delete food item: " + error.message)
          }
        },
      },
    ])
  }

  const handleEditFood = (food, mealType, index) => {
    setEditingFood({
      food: { ...food, quantity: food.quantity || 1 },
      mealType,
      index,
    })
    setEditModalVisible(true)
  }

  const handleSaveEdit = async () => {
    if (!editingFood) return

    try {
      const updatedLog = { ...log }
      const updatedFood = {
        ...editingFood.food,
        calories: (editingFood.food.calories / (editingFood.food.originalQuantity || 1)) * editingFood.food.quantity,
        protein: (editingFood.food.protein / (editingFood.food.originalQuantity || 1)) * editingFood.food.quantity,
        carbs: (editingFood.food.carbs / (editingFood.food.originalQuantity || 1)) * editingFood.food.quantity,
        fats: (editingFood.food.fats / (editingFood.food.originalQuantity || 1)) * editingFood.food.quantity,
      }

      updatedLog[editingFood.mealType][editingFood.index] = updatedFood
      setLog(updatedLog)

      await clearFoodLogByDate(date)
      await addFoodToLog(date, editingFood.mealType, updatedLog[editingFood.mealType])

      setEditModalVisible(false)
      setEditingFood(null)
      Alert.alert("Success", "Food quantity updated!")
    } catch (error) {
      Alert.alert("Error", "Unable to update food item: " + error.message)
    }
  }

  const handleAddFood = (mealType) => {
    navigation.navigate("Food", { mealType, date })
  }

  const handleViewHistoryDetail = (historyItem) => {
    setSelectedHistoryDate(historyItem)
    setHistoryDetailModal(true)
  }

  const handleOpenCalendar = () => {
    navigation.navigate("CalendarScreen", {
      calendarData,
      onDateSelect: (selectedDate) => {
        setDate(selectedDate)
        setActiveTab("daily")
      },
    })
  }

  const toggleMealExpansion = (mealType) => {
    setExpandedMeals((prev) => ({
      ...prev,
      [mealType]: !prev[mealType],
    }))
  }

  const getMealIcon = (meal) => {
    switch (meal) {
      case "Breakfast":
        return "wb-sunny"
      case "Lunch":
        return "wb-sunny"
      case "Dinner":
        return "brightness-3"
      default:
        return "restaurant"
    }
  }

  const getMealColor = (meal) => {
    switch (meal) {
      case "Breakfast":
        return "#FF9500"
      case "Lunch":
        return "#007AFF"
      case "Dinner":
        return "#5856D6"
      default:
        return "#8E8E93"
    }
  }

  const renderTabButton = (tabName, title, iconName, iconFamily = "MaterialIcons") => {
    const IconComponent =
      iconFamily === "MaterialCommunityIcons" ? IconCommunity : iconFamily === "Feather" ? IconFeather : Icon

    return (
      <TouchableOpacity
        style={[styles.tabButton, activeTab === tabName && styles.activeTab]}
        onPress={() => setActiveTab(tabName)}
      >
        <IconComponent name={iconName} size={20} color={activeTab === tabName ? "#4F46E5" : "#64748B"} />
        <Text style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>{title}</Text>
      </TouchableOpacity>
    )
  }

  const renderNutritionSummary = () => {
    const totalNutrition = sumNutrition([...log.Breakfast, ...log.Lunch, ...log.Dinner])

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeader}>
          <Icon name="analytics" size={24} color="#4F46E5" />
          <Text style={styles.summaryTitle}>Daily Nutrition Overview</Text>
        </View>
        <View style={styles.nutritionGrid}>
          <View style={[styles.nutritionCard, styles.caloriesCard]}>
            <IconCommunity name="fire" size={24} color="#FF6B35" />
            <Text style={[styles.nutritionValue, { color: "#FF6B35" }]}>{Math.round(totalNutrition.calories)}</Text>
            <Text style={styles.nutritionLabel}>Calories</Text>
          </View>
          <View style={[styles.nutritionCard, styles.proteinCard]}>
            <IconCommunity name="dumbbell" size={24} color="#4ECDC4" />
            <Text style={[styles.nutritionValue, { color: "#4ECDC4" }]}>{Math.round(totalNutrition.protein)}g</Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={[styles.nutritionCard, styles.carbsCard]}>
            <IconCommunity name="grain" size={24} color="#45B7D1" />
            <Text style={[styles.nutritionValue, { color: "#45B7D1" }]}>{Math.round(totalNutrition.carbs)}g</Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
          <View style={[styles.nutritionCard, styles.fatsCard]}>
            <IconCommunity name="oil" size={24} color="#96CEB4" />
            <Text style={[styles.nutritionValue, { color: "#96CEB4" }]}>{Math.round(totalNutrition.fats)}g</Text>
            <Text style={styles.nutritionLabel}>Fats</Text>
          </View>
        </View>
      </View>
    )
  }

  const renderFoodItem = (food, mealType, index) => (
    <View key={index} style={styles.foodItem}>
      <View style={styles.foodImageContainer}>
        <Image
          source={{ uri: food.image || food.imageUrl || "https://via.placeholder.com/60x60" }}
          style={styles.foodImage}
        />
        <View style={styles.caloriesBadge}>
          <Text style={styles.caloriesBadgeText}>{Math.round(food.calories) || 0}</Text>
        </View>
      </View>
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{food.foodName}</Text>
        {food.quantity && food.quantity > 1 && <Text style={styles.quantityText}>Quantity: {food.quantity}</Text>}
        <View style={styles.nutritionRow}>
          <View style={styles.nutritionBadge}>
            <IconCommunity name="dumbbell" size={10} color="#4ECDC4" />
            <Text style={styles.nutritionBadgeText}>{Math.round(food.protein) || 0}g</Text>
          </View>
          <View style={styles.nutritionBadge}>
            <IconCommunity name="grain" size={10} color="#45B7D1" />
            <Text style={styles.nutritionBadgeText}>{Math.round(food.carbs) || 0}g</Text>
          </View>
          <View style={styles.nutritionBadge}>
            <IconCommunity name="oil" size={10} color="#96CEB4" />
            <Text style={styles.nutritionBadgeText}>{Math.round(food.fats) || 0}g</Text>
          </View>
        </View>
      </View>
      <View style={styles.foodActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => handleEditFood(food, mealType, index)}>
          <IconFeather name="edit-2" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteFoodLog(mealType, index)}>
          <IconFeather name="trash-2" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  )

  const renderMealSection = (meal) => {
    const foods = log[meal] || []
    const sum = sumNutrition(foods)
    const mealColor = getMealColor(meal)
    const isExpanded = expandedMeals[meal] || foods.length <= 3
    const displayFoods = isExpanded ? foods : foods.slice(0, 3)

    return (
      <View key={meal} style={styles.mealSection}>
        <View style={[styles.mealHeader, { backgroundColor: mealColor + "15" }]}>
          <View style={styles.mealTitleContainer}>
            <View style={[styles.mealIconContainer, { backgroundColor: mealColor }]}>
              <Icon name={getMealIcon(meal)} size={20} color="#fff" />
            </View>
            <Text style={styles.mealTitle}>{meal}</Text>
            {foods.length > 0 && <Text style={styles.mealCount}>({foods.length})</Text>}
          </View>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: mealColor }]}
            onPress={() => handleAddFood(meal)}
          >
            <Icon name="add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>Add Food</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mealContent}>
          {foods.length === 0 ? (
            <View style={styles.emptyMealState}>
              <Icon name="restaurant" size={48} color="#E5E7EB" />
              <Text style={styles.emptyMealTitle}>No food logged yet</Text>
              <Text style={styles.emptyMealText}>Tap "Add Food" to start tracking your {meal.toLowerCase()}</Text>
            </View>
          ) : (
            <>
              {displayFoods.map((food, idx) => renderFoodItem(food, meal, idx))}

              {foods.length > 3 && (
                <TouchableOpacity style={styles.showMoreButton} onPress={() => toggleMealExpansion(meal)}>
                  <Text style={styles.showMoreText}>
                    {isExpanded ? `Show Less` : `Show ${foods.length - 3} More Items`}
                  </Text>
                  <Icon name={isExpanded ? "expand-less" : "expand-more"} size={20} color="#4F46E5" />
                </TouchableOpacity>
              )}

              <View style={[styles.mealSummary, { borderLeftColor: mealColor }]}>
                <Text style={styles.mealSummaryTitle}>Meal Total</Text>
                <View style={styles.mealSummaryRow}>
                  <View style={styles.mealSummaryItem}>
                    <IconCommunity name="fire" size={14} color="#FF6B35" />
                    <Text style={styles.mealSummaryText}>{Math.round(sum.calories)} kcal</Text>
                  </View>
                  <View style={styles.mealSummaryItem}>
                    <IconCommunity name="dumbbell" size={14} color="#4ECDC4" />
                    <Text style={styles.mealSummaryText}>{Math.round(sum.protein)}g</Text>
                  </View>
                  <View style={styles.mealSummaryItem}>
                    <IconCommunity name="grain" size={14} color="#45B7D1" />
                    <Text style={styles.mealSummaryText}>{Math.round(sum.carbs)}g</Text>
                  </View>
                  <View style={styles.mealSummaryItem}>
                    <IconCommunity name="oil" size={14} color="#96CEB4" />
                    <Text style={styles.mealSummaryText}>{Math.round(sum.fats)}g</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    )
  }

  const renderCalendarItem = ({ item }) => (
    <TouchableOpacity style={styles.calendarItem} onPress={() => handleViewHistoryDetail(item)}>
      <View style={styles.calendarHeader}>
        <View style={styles.calendarDateContainer}>
          <Text style={styles.calendarDay}>{dayjs(item.date).format("DD")}</Text>
          <Text style={styles.calendarMonth}>{dayjs(item.date).format("MMM")}</Text>
        </View>
        <View style={styles.calendarInfo}>
          <Text style={styles.calendarDate}>{dayjs(item.date).format("dddd, MMM DD")}</Text>
          <View style={styles.calendarCaloriesContainer}>
            <IconCommunity name="fire" size={16} color="#FF6B35" />
            <Text style={styles.calendarCalories}>{Math.round(item.totalCalories)} kcal</Text>
          </View>
        </View>
        <IconFeather name="chevron-right" size={20} color="#9CA3AF" />
      </View>
      <View style={styles.calendarFoods}>
        {item.foods.slice(0, 2).map((food, idx) => (
          <View key={idx} style={styles.calendarFoodItem}>
            <Image
              source={{ uri: food.image || food.imageUrl || "https://via.placeholder.com/40x40" }}
              style={styles.calendarFoodImage}
            />
          </View>
        ))}
        {item.foods.length > 2 && (
          <View style={styles.moreFoodsIndicator}>
            <Text style={styles.moreFoodsText}>+{item.foods.length - 2}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  const renderHistoryDetailModal = () => (
    <Modal
      visible={historyDetailModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setHistoryDetailModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.historyModalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.historyModalTitleContainer}>
              <Icon name="history" size={24} color="#4F46E5" />
              <Text style={styles.modalTitle}>
                {selectedHistoryDate ? dayjs(selectedHistoryDate.date).format("MMM DD, YYYY") : ""}
              </Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setHistoryDetailModal(false)}>
              <Icon name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.historyModalBody} showsVerticalScrollIndicator={false}>
            {selectedHistoryDate &&
              MEAL_TYPES.map((mealType) => {
                const mealFoods = selectedHistoryDate.meals[mealType] || []
                if (mealFoods.length === 0) return null

                return (
                  <View key={mealType} style={styles.historyMealSection}>
                    <View style={styles.historyMealHeader}>
                      <View style={[styles.mealIconContainer, { backgroundColor: getMealColor(mealType) }]}>
                        <Icon name={getMealIcon(mealType)} size={16} color="#fff" />
                      </View>
                      <Text style={styles.historyMealTitle}>{mealType}</Text>
                    </View>
                    {mealFoods.map((food, idx) => (
                      <View key={idx} style={styles.historyFoodItem}>
                        <Image
                          source={{ uri: food.image || food.imageUrl || "https://via.placeholder.com/50x50" }}
                          style={styles.historyFoodImage}
                        />
                        <View style={styles.historyFoodInfo}>
                          <Text style={styles.historyFoodName}>{food.foodName}</Text>
                          {food.quantity && food.quantity > 1 && (
                            <Text style={styles.historyQuantityText}>Qty: {food.quantity}</Text>
                          )}
                          <View style={styles.historyNutritionRow}>
                            <View style={styles.historyNutritionItem}>
                              <IconCommunity name="fire" size={12} color="#FF6B35" />
                              <Text style={styles.historyNutritionText}>{Math.round(food.calories)}</Text>
                            </View>
                            <View style={styles.historyNutritionItem}>
                              <IconCommunity name="dumbbell" size={12} color="#4ECDC4" />
                              <Text style={styles.historyNutritionText}>{Math.round(food.protein)}g</Text>
                            </View>
                            <View style={styles.historyNutritionItem}>
                              <IconCommunity name="grain" size={12} color="#45B7D1" />
                              <Text style={styles.historyNutritionText}>{Math.round(food.carbs)}g</Text>
                            </View>
                            <View style={styles.historyNutritionItem}>
                              <IconCommunity name="oil" size={12} color="#96CEB4" />
                              <Text style={styles.historyNutritionText}>{Math.round(food.fats)}g</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )
              })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  const renderFiltersTab = () => (
    <ScrollView style={styles.filtersContainer} showsVerticalScrollIndicator={false}>
      <View style={styles.filtersHeader}>
        <Icon name="filter-list" size={24} color="#4F46E5" />
        <Text style={styles.filtersTitle}>Advanced Filters</Text>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.filterGroup}>
          <View style={styles.filterLabelContainer}>
            <Icon name="search" size={16} color="#64748B" />
            <Text style={styles.filterLabel}>Search Food</Text>
          </View>
          <TextInput
            style={styles.filterInput}
            placeholder="Enter food name..."
            value={filters.searchTerm}
            onChangeText={(text) => setFilters((prev) => ({ ...prev, searchTerm: text }))}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.filterRow}>
          <View style={styles.filterHalf}>
            <View style={styles.filterLabelContainer}>
              <Icon name="date-range" size={16} color="#64748B" />
              <Text style={styles.filterLabel}>Start Date</Text>
            </View>
            <TextInput
              style={styles.filterInput}
              placeholder="YYYY-MM-DD"
              value={filters.startDate}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, startDate: text }))}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <View style={styles.filterHalf}>
            <View style={styles.filterLabelContainer}>
              <Icon name="date-range" size={16} color="#64748B" />
              <Text style={styles.filterLabel}>End Date</Text>
            </View>
            <TextInput
              style={styles.filterInput}
              placeholder="YYYY-MM-DD"
              value={filters.endDate}
              onChangeText={(text) => setFilters((prev) => ({ ...prev, endDate: text }))}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.filterGroup}>
          <View style={styles.filterLabelContainer}>
            <Icon name="restaurant" size={16} color="#64748B" />
            <Text style={styles.filterLabel}>Meal Type</Text>
          </View>
          <View style={styles.mealTypeButtons}>
            {["", ...MEAL_TYPES].map((mealType) => (
              <TouchableOpacity
                key={mealType}
                style={[styles.mealTypeButton, filters.mealType === mealType && styles.activeMealType]}
                onPress={() => setFilters((prev) => ({ ...prev, mealType }))}
              >
                <Text style={[styles.mealTypeButtonText, filters.mealType === mealType && styles.activeMealTypeText]}>
                  {mealType || "All"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.applyFiltersButton} onPress={loadCalendarData}>
          <Icon name="check" size={18} color="#fff" />
          <Text style={styles.applyFiltersText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setEditModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <IconFeather name="edit-2" size={20} color="#4F46E5" />
              <Text style={styles.modalTitle}>Edit Quantity</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditModalVisible(false)}>
              <Icon name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {editingFood && (
              <>
                <View style={styles.foodPreview}>
                  <Image
                    source={{
                      uri: editingFood.food.image || editingFood.food.imageUrl || "https://via.placeholder.com/80x80",
                    }}
                    style={styles.previewImage}
                  />
                  <Text style={styles.previewFoodName}>{editingFood.food.foodName}</Text>
                </View>

                <View style={styles.quantityContainer}>
                  <Text style={styles.quantityLabel}>Quantity</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const newQuantity = Math.max(0.5, (editingFood.food.quantity || 1) - 0.5)
                        setEditingFood((prev) => ({
                          ...prev,
                          food: { ...prev.food, quantity: newQuantity },
                        }))
                      }}
                    >
                      <Icon name="remove" size={20} color="#4F46E5" />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.quantityInput}
                      value={editingFood.food.quantity?.toString() || "1"}
                      onChangeText={(text) => {
                        const quantity = Number.parseFloat(text) || 1
                        setEditingFood((prev) => ({
                          ...prev,
                          food: { ...prev.food, quantity },
                        }))
                      }}
                      keyboardType="numeric"
                      textAlign="center"
                    />

                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const newQuantity = (editingFood.food.quantity || 1) + 0.5
                        setEditingFood((prev) => ({
                          ...prev,
                          food: { ...prev.food, quantity: newQuantity },
                        }))
                      }}
                    >
                      <Icon name="add" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.nutritionPreview}>
                  <Text style={styles.nutritionPreviewTitle}>Nutrition per serving:</Text>
                  <View style={styles.nutritionPreviewGrid}>
                    <View style={styles.nutritionPreviewItem}>
                      <IconCommunity name="fire" size={16} color="#FF6B35" />
                      <Text style={styles.nutritionPreviewText}>
                        {Math.round((editingFood.food.calories || 0) * (editingFood.food.quantity || 1))} cal
                      </Text>
                    </View>
                    <View style={styles.nutritionPreviewItem}>
                      <IconCommunity name="dumbbell" size={16} color="#4ECDC4" />
                      <Text style={styles.nutritionPreviewText}>
                        {Math.round((editingFood.food.protein || 0) * (editingFood.food.quantity || 1))}g
                      </Text>
                    </View>
                    <View style={styles.nutritionPreviewItem}>
                      <IconCommunity name="grain" size={16} color="#45B7D1" />
                      <Text style={styles.nutritionPreviewText}>
                        {Math.round((editingFood.food.carbs || 0) * (editingFood.food.quantity || 1))}g
                      </Text>
                    </View>
                    <View style={styles.nutritionPreviewItem}>
                      <IconCommunity name="oil" size={16} color="#96CEB4" />
                      <Text style={styles.nutritionPreviewText}>
                        {Math.round((editingFood.food.fats || 0) * (editingFood.food.quantity || 1))}g
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveEdit}>
              <Icon name="save" size={16} color="#fff" />
              <Text style={styles.modalSaveText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  if (authLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        <View style={styles.loadingContent}>
          <Icon name="hourglass-empty" size={48} color="#4F46E5" />
          <Text style={styles.loadingTitle}>Loading User Information</Text>
          <Text style={styles.loadingText}>Please wait a moment...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
        <View style={styles.loadingContent}>
          <Icon name="lock" size={48} color="#4F46E5" />
          <Text style={styles.loadingTitle}>Authentication Required</Text>
          <Text style={styles.loadingText}>Please log in to view your food diary.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Daily Food Log</Text>
          <Text style={styles.headerDate}>{dayjs(date).format("dddd, MMM DD, YYYY")}</Text>
        </View>
        <TouchableOpacity style={styles.calendarButton} onPress={handleOpenCalendar}>
          <Icon name="today" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {renderTabButton("daily", "Daily", "today")}
        {renderTabButton("calendar", "History", "history")}
        {renderTabButton("filters", "Filters", "filter-list")}
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {activeTab === "daily" && (
          <ScrollView showsVerticalScrollIndicator={false}>
            {renderNutritionSummary()}
            {MEAL_TYPES.map((meal) => renderMealSection(meal))}
            <TouchableOpacity
              style={[styles.saveButton, { opacity: loading ? 0.6 : 1 }]}
              onPress={handleSaveToServer}
              disabled={loading}
            >
              <Icon name={loading ? "hourglass-empty" : "cloud-upload"} size={18} color="#fff" />
              <Text style={styles.saveButtonText}>{loading ? "Saving..." : "Save to Server"}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {activeTab === "calendar" && (
          <FlatList
            data={calendarData}
            renderItem={renderCalendarItem}
            keyExtractor={(item) => item.date}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.calendarList}
          />
        )}

        {activeTab === "filters" && renderFiltersTab()}
      </Animated.View>

      {renderEditModal()}
      {renderHistoryDetailModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#4F46E5",
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#4F46E5",
  },
  tabText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 4,
  },
  activeTabText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  loadingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  summaryContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 8,
    color: "#1F2937",
  },
  nutritionGrid: {
    flexDirection: "row",
    gap: 12,
  },
  nutritionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  caloriesCard: {
    backgroundColor: "#FFF7ED",
  },
  proteinCard: {
    backgroundColor: "#F0FDFA",
  },
  carbsCard: {
    backgroundColor: "#EFF6FF",
  },
  fatsCard: {
    backgroundColor: "#F0FDF4",
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  mealSection: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  mealTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mealTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  mealCount: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  mealContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyMealState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyMealTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyMealText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  foodItem: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  foodImageContainer: {
    position: "relative",
    marginRight: 12,
  },
  foodImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  caloriesBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  caloriesBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  quantityText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 6,
  },
  nutritionRow: {
    flexDirection: "row",
    gap: 6,
  },
  nutritionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nutritionBadgeText: {
    fontSize: 10,
    color: "#374151",
    fontWeight: "500",
    marginLeft: 2,
  },
  foodActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  showMoreText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
    marginRight: 4,
  },
  mealSummary: {
    backgroundColor: "#EEF2FF",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    borderLeftWidth: 4,
  },
  mealSummaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 8,
    textAlign: "center",
  },
  mealSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  mealSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealSummaryText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
    marginLeft: 4,
  },
  calendarList: {
    paddingBottom: 20,
  },
  calendarItem: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  calendarDateContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4F46E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  calendarDay: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  calendarMonth: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  calendarInfo: {
    flex: 1,
  },
  calendarDate: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  calendarCaloriesContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  calendarCalories: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "500",
    marginLeft: 4,
  },
  calendarFoods: {
    flexDirection: "row",
    gap: 8,
  },
  calendarFoodItem: {
    borderRadius: 8,
    overflow: "hidden",
  },
  calendarFoodImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  moreFoodsIndicator: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  moreFoodsText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  filtersContainer: {
    flex: 1,
  },
  filtersHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  filtersTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginLeft: 8,
    color: "#1F2937",
  },
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    color: "#374151",
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  filterHalf: {
    flex: 1,
  },
  mealTypeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  mealTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  activeMealType: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  mealTypeButtonText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  activeMealTypeText: {
    color: "#fff",
  },
  applyFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  applyFiltersText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  historyModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyModalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginLeft: 8,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 20,
  },
  historyModalBody: {
    padding: 20,
    maxHeight: 500,
  },
  foodPreview: {
    alignItems: "center",
    marginBottom: 24,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 12,
  },
  previewFoodName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
  },
  quantityContainer: {
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
    textAlign: "center",
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityInput: {
    width: 80,
    height: 44,
    borderWidth: 2,
    borderColor: "#4F46E5",
    borderRadius: 12,
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  nutritionPreview: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  nutritionPreviewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 12,
    textAlign: "center",
  },
  nutritionPreviewGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  nutritionPreviewItem: {
    alignItems: "center",
    gap: 4,
  },
  nutritionPreviewText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1F2937",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  modalCancelText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
  },
  modalSaveText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
  historyMealSection: {
    marginBottom: 20,
  },
  historyMealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  historyMealTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 8,
  },
  historyFoodItem: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  historyFoodImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
  },
  historyFoodInfo: {
    flex: 1,
  },
  historyFoodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  historyQuantityText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  historyNutritionRow: {
    flexDirection: "row",
    gap: 8,
  },
  historyNutritionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyNutritionText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
    marginLeft: 2,
  },
})

export default FoodDailyLogScreen
