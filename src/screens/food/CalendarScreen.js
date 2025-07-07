import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, ScrollView, Image, StyleSheet, Dimensions, FlatList, Modal } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { useNavigation, useRoute } from "@react-navigation/native"
import dayjs from "dayjs"
import Icon from "react-native-vector-icons/MaterialIcons"
import IconCommunity from "react-native-vector-icons/MaterialCommunityIcons"
import IconFeather from "react-native-vector-icons/Feather"
const { width } = Dimensions.get("window")
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"]
const CalendarScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { calendarData = [], onDateSelect } = route.params || {}
  const [selectedDate, setSelectedDate] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(dayjs())
  const [filterMode, setFilterMode] = useState("month") 
  const [selectedYear, setSelectedYear] = useState(dayjs().year())
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month())
  const [filterModalVisible, setFilterModalVisible] = useState(false)
  const generateCalendarDays = () => {
    const days = []
    let startDate, endDate, daysToGenerate
    switch (filterMode) {
      case "day":
        const today = dayjs()
        const todayStr = today.format("YYYY-MM-DD")
        const existingTodayData = calendarData.find((item) => item.date === todayStr)
        return [
          {
            date: todayStr,
            dayjs: today,
            calories: existingTodayData?.totalCalories || 0,
            foods: existingTodayData?.foods || [],
            meals: existingTodayData?.meals || { Breakfast: [], Lunch: [], Dinner: [] },
            hasData: !!existingTodayData,
          },
        ]
      case "month":
        startDate = dayjs().year(selectedYear).month(selectedMonth).startOf("month")
        endDate = dayjs().year(selectedYear).month(selectedMonth).endOf("month")
        daysToGenerate = endDate.diff(startDate, "day") + 1
        for (let i = 0; i < daysToGenerate; i++) {
          const date = startDate.add(i, "day")
          const dateStr = date.format("YYYY-MM-DD")
          const existingData = calendarData.find((item) => item.date === dateStr)
          days.push({
            date: dateStr,
            dayjs: date,
            calories: existingData?.totalCalories || 0,
            foods: existingData?.foods || [],
            meals: existingData?.meals || { Breakfast: [], Lunch: [], Dinner: [] },
            hasData: !!existingData,
          })
        }
        break
      case "year":
        for (let month = 0; month < 12; month++) {
          const monthStart = dayjs().year(selectedYear).month(month).startOf("month")
          const monthEnd = dayjs().year(selectedYear).month(month).endOf("month")
          let monthCalories = 0
          let monthFoods = []
          const monthMeals = { Breakfast: [], Lunch: [], Dinner: [] }
          let hasMonthData = false
          for (let day = monthStart; day.isBefore(monthEnd) || day.isSame(monthEnd); day = day.add(1, "day")) {
            const dayStr = day.format("YYYY-MM-DD")
            const dayData = calendarData.find((item) => item.date === dayStr)
            if (dayData) {
              hasMonthData = true
              monthCalories += dayData.totalCalories || 0
              monthFoods = [...monthFoods, ...dayData.foods]
              MEAL_TYPES.forEach((mealType) => {
                monthMeals[mealType] = [...monthMeals[mealType], ...(dayData.meals[mealType] || [])]
              })
            }
          }
          days.push({
            date: monthStart.format("YYYY-MM"),
            dayjs: monthStart,
            calories: monthCalories,
            foods: monthFoods,
            meals: monthMeals,
            hasData: hasMonthData,
            isMonthView: true,
          })
        }
        break
      default:
        for (let i = 0; i < 30; i++) {
          const date = dayjs().subtract(i, "day")
          const dateStr = date.format("YYYY-MM-DD")
          const existingData = calendarData.find((item) => item.date === dateStr)
          days.push({
            date: dateStr,
            dayjs: date,
            calories: existingData?.totalCalories || 0,
            foods: existingData?.foods || [],
            meals: existingData?.meals || { Breakfast: [], Lunch: [], Dinner: [] },
            hasData: !!existingData,
          })
        }
    }
    return days.sort((a, b) => dayjs(b.date).unix() - dayjs(a.date).unix())
  }
  const [calendarDays, setCalendarDays] = useState(generateCalendarDays())
  useEffect(() => {
    setCalendarDays(generateCalendarDays())
  }, [calendarData, currentMonth, filterMode, selectedMonth, selectedYear])
  const handleDatePress = (dayData) => {
    if (dayData.hasData) {
      setSelectedDate(dayData)
      setDetailModalVisible(true)
    } else {
      if (onDateSelect) {
        onDateSelect(dayData.date)
        navigation.goBack()
      }
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
  const navigateMonth = (direction) => {
    if (direction === "prev") {
      if (selectedMonth === 0) {
        setSelectedMonth(11)
        setSelectedYear(selectedYear - 1)
      } else {
        setSelectedMonth(selectedMonth - 1)
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0)
        setSelectedYear(selectedYear + 1)
      } else {
        setSelectedMonth(selectedMonth + 1)
      }
    }
  }
  const navigateYear = (direction) => {
    if (direction === "prev") {
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedYear(selectedYear + 1)
    }
  }
  const getHeaderTitle = () => {
    switch (filterMode) {
      case "day":
        return "Today"
      case "month":
        return dayjs().year(selectedYear).month(selectedMonth).format("MMMM YYYY")
      case "year":
        return selectedYear.toString()
      default:
        return "Last 30 Days"
    }
  }
  const getHeaderSubtitle = () => {
    switch (filterMode) {
      case "day":
        return dayjs().format("dddd, MMM DD, YYYY")
      case "month":
        const daysInMonth = dayjs().year(selectedYear).month(selectedMonth).daysInMonth()
        return `${daysInMonth} days`
      case "year":
        return "12 months overview"
      default:
        return "Recent activity"
    }
  }
  const renderCalendarDay = ({ item }) => {
    const isToday = item.dayjs.isSame(dayjs(), "day")
    const recentFoods = item.foods.slice(0, 2)
    const isCurrentMonth =
      item.isMonthView && item.dayjs.month() === dayjs().month() && item.dayjs.year() === dayjs().year()
    return (
      <TouchableOpacity
        style={[
          styles.calendarDay,
          isToday && styles.todayCalendarDay,
          isCurrentMonth && styles.currentMonthDay,
          !item.hasData && styles.emptyCalendarDay,
        ]}
        onPress={() => handleDatePress(item)}
      >
        <View style={styles.calendarDayHeader}>
          <Text
            style={[
              styles.calendarDayNumber,
              isToday && styles.todayText,
              isCurrentMonth && styles.currentMonthText,
              !item.hasData && styles.emptyDayText,
            ]}
          >
            {item.isMonthView ? item.dayjs.format("MMM") : item.dayjs.format("DD")}
          </Text>
          <Text
            style={[
              styles.calendarDayMonth,
              isToday && styles.todayText,
              isCurrentMonth && styles.currentMonthText,
              !item.hasData && styles.emptyDayText,
            ]}
          >
            {item.isMonthView ? item.dayjs.format("YYYY") : item.dayjs.format("MMM")}
          </Text>
        </View>

        <Text
          style={[
            styles.calendarDayName,
            isToday && styles.todayText,
            isCurrentMonth && styles.currentMonthText,
            !item.hasData && styles.emptyDayText,
          ]}
        >
          {item.isMonthView ? `${item.foods.length} foods` : item.dayjs.format("ddd")}
        </Text>

        {item.hasData ? (
          <>
            <View style={styles.caloriesContainer}>
              <IconCommunity name="fire" size={14} color="#FF6B35" />
              <Text style={styles.caloriesText}>{Math.round(item.calories)}</Text>
            </View>

            <View style={styles.foodPreview}>
              {recentFoods.map((food, idx) => (
                <Image
                  key={idx}
                  source={{ uri: food.image || food.imageUrl || "https://via.placeholder.com/24x24" }}
                  style={styles.foodPreviewImage}
                />
              ))}
              {item.foods.length > 2 && (
                <View style={styles.moreFoodsPreview}>
                  <Text style={styles.moreFoodsPreviewText}>+{item.foods.length - 2}</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.emptyDayContent}>
            <Icon name="add-circle-outline" size={24} color="#E5E7EB" />
            <Text style={styles.emptyDayLabel}>Add Food</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const renderDetailModal = () => (
    <Modal
      visible={detailModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setDetailModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.detailModalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Icon name="calendar-today" size={24} color="#4F46E5" />
              <Text style={styles.modalTitle}>{selectedDate ? selectedDate.dayjs.format("MMM DD, YYYY") : ""}</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDetailModalVisible(false)}>
              <Icon name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailModalBody} showsVerticalScrollIndicator={false}>
            {selectedDate && (
              <>
                <View style={styles.dayOverview}>
                  <View style={styles.overviewCard}>
                    <IconCommunity name="fire" size={32} color="#FF6B35" />
                    <Text style={styles.overviewValue}>{Math.round(selectedDate.calories)}</Text>
                    <Text style={styles.overviewLabel}>Total Calories</Text>
                  </View>
                  <View style={styles.overviewCard}>
                    <Icon name="restaurant" size={32} color="#4F46E5" />
                    <Text style={styles.overviewValue}>{selectedDate.foods.length}</Text>
                    <Text style={styles.overviewLabel}>Food Items</Text>
                  </View>
                </View>

                {MEAL_TYPES.map((mealType) => {
                  const mealFoods = selectedDate.meals[mealType] || []
                  if (mealFoods.length === 0) return null

                  return (
                    <View key={mealType} style={styles.detailMealSection}>
                      <View style={styles.detailMealHeader}>
                        <View style={[styles.mealIconContainer, { backgroundColor: getMealColor(mealType) }]}>
                          <Icon name={getMealIcon(mealType)} size={16} color="#fff" />
                        </View>
                        <Text style={styles.detailMealTitle}>{mealType}</Text>
                        <Text style={styles.detailMealCount}>({mealFoods.length} items)</Text>
                      </View>

                      {mealFoods.map((food, idx) => (
                        <View key={idx} style={styles.detailFoodItem}>
                          <Image
                            source={{ uri: food.image || food.imageUrl || "https://via.placeholder.com/50x50" }}
                            style={styles.detailFoodImage}
                          />
                          <View style={styles.detailFoodInfo}>
                            <Text style={styles.detailFoodName}>{food.foodName}</Text>
                            {food.quantity && food.quantity > 1 && (
                              <Text style={styles.detailQuantityText}>Quantity: {food.quantity}</Text>
                            )}
                            <View style={styles.detailNutritionRow}>
                              <View style={styles.detailNutritionItem}>
                                <IconCommunity name="fire" size={12} color="#FF6B35" />
                                <Text style={styles.detailNutritionText}>{Math.round(food.calories)}</Text>
                              </View>
                              <View style={styles.detailNutritionItem}>
                                <IconCommunity name="dumbbell" size={12} color="#4ECDC4" />
                                <Text style={styles.detailNutritionText}>{Math.round(food.protein)}g</Text>
                              </View>
                              <View style={styles.detailNutritionItem}>
                                <IconCommunity name="grain" size={12} color="#45B7D1" />
                                <Text style={styles.detailNutritionText}>{Math.round(food.carbs)}g</Text>
                              </View>
                              <View style={styles.detailNutritionItem}>
                                <IconCommunity name="oil" size={12} color="#96CEB4" />
                                <Text style={styles.detailNutritionText}>{Math.round(food.fats)}g</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )
                })}
              </>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.editDayButton}
              onPress={() => {
                if (selectedDate && onDateSelect) {
                  onDateSelect(selectedDate.date)
                  setDetailModalVisible(false)
                  navigation.goBack()
                }
              }}
            >
              <IconFeather name="edit-2" size={16} color="#fff" />
              <Text style={styles.editDayButtonText}>Edit This Day</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderFilterModal = () => (
    <Modal
      visible={filterModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Icon name="filter-list" size={24} color="#4F46E5" />
              <Text style={styles.modalTitle}>Filter Calendar</Text>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFilterModalVisible(false)}>
              <Icon name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.filterModalBody}>
            <Text style={styles.filterSectionTitle}>View Mode</Text>
            <View style={styles.filterModeButtons}>
              {[
                { key: "day", label: "Today", icon: "today" },
                { key: "month", label: "Month", icon: "calendar-view-month" },
                { key: "year", label: "Year", icon: "calendar-view-week" },
              ].map((mode) => (
                <TouchableOpacity
                  key={mode.key}
                  style={[styles.filterModeButton, filterMode === mode.key && styles.activeFilterMode]}
                  onPress={() => setFilterMode(mode.key)}
                >
                  <Icon name={mode.icon} size={20} color={filterMode === mode.key ? "#fff" : "#64748B"} />
                  <Text style={[styles.filterModeText, filterMode === mode.key && styles.activeFilterModeText]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {(filterMode === "month" || filterMode === "year") && (
              <>
                <Text style={styles.filterSectionTitle}>Year</Text>
                <View style={styles.yearSelector}>
                  <TouchableOpacity style={styles.yearButton} onPress={() => navigateYear("prev")}>
                    <Icon name="chevron-left" size={24} color="#4F46E5" />
                  </TouchableOpacity>
                  <Text style={styles.yearText}>{selectedYear}</Text>
                  <TouchableOpacity style={styles.yearButton} onPress={() => navigateYear("next")}>
                    <Icon name="chevron-right" size={24} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </>
            )}

            {filterMode === "month" && (
              <>
                <Text style={styles.filterSectionTitle}>Month</Text>
                <View style={styles.monthSelector}>
                  <TouchableOpacity style={styles.monthButton} onPress={() => navigateMonth("prev")}>
                    <Icon name="chevron-left" size={24} color="#4F46E5" />
                  </TouchableOpacity>
                  <Text style={styles.monthText}>{dayjs().month(selectedMonth).format("MMMM")}</Text>
                  <TouchableOpacity style={styles.monthButton} onPress={() => navigateMonth("next")}>
                    <Icon name="chevron-right" size={24} color="#4F46E5" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.filterModalFooter}>
            <TouchableOpacity style={styles.applyFilterButton} onPress={() => setFilterModalVisible(false)}>
              <Icon name="check" size={16} color="#fff" />
              <Text style={styles.applyFilterText}>Apply Filter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            {(filterMode === "month" || filterMode === "year") && (
              <TouchableOpacity
                style={styles.headerNavButton}
                onPress={() => (filterMode === "month" ? navigateMonth("prev") : navigateYear("prev"))}
              >
                <Icon name="chevron-left" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
              <Text style={styles.headerSubtitle}>{getHeaderSubtitle()}</Text>
            </View>
            {(filterMode === "month" || filterMode === "year") && (
              <TouchableOpacity
                style={styles.headerNavButton}
                onPress={() => (filterMode === "month" ? navigateMonth("next") : navigateYear("next"))}
              >
                <Icon name="chevron-right" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
          <Icon name="filter-list" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Calendar Grid */}
      <FlatList
        data={calendarDays}
        renderItem={renderCalendarDay}
        keyExtractor={(item) => item.date}
        numColumns={2}
        contentContainerStyle={styles.calendarGrid}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={styles.calendarRow}
      />

      {renderDetailModal()}
      {renderFilterModal()}
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
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
  },
  todayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  calendarGrid: {
    padding: 16,
    paddingBottom: 32,
  },
  calendarRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  calendarDay: {
    width: (width - 48) / 2,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 140,
  },
  todayCalendarDay: {
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  emptyCalendarDay: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  calendarDayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  calendarDayNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
  },
  calendarDayMonth: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  todayText: {
    color: "#4F46E5",
  },
  emptyDayText: {
    color: "#9CA3AF",
  },
  calendarDayName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 12,
  },
  caloriesContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B35",
    marginLeft: 4,
  },
  foodPreview: {
    flexDirection: "row",
    gap: 4,
  },
  foodPreviewImage: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  moreFoodsPreview: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  moreFoodsPreviewText: {
    fontSize: 8,
    fontWeight: "600",
    color: "#64748B",
  },
  emptyDayContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyDayLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  detailModalContent: {
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
  detailModalBody: {
    padding: 20,
    maxHeight: 400,
  },
  dayOverview: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  detailMealSection: {
    marginBottom: 24,
  },
  detailMealHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  mealIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  detailMealTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  detailMealCount: {
    fontSize: 14,
    color: "#64748B",
  },
  detailFoodItem: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  detailFoodImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
  },
  detailFoodInfo: {
    flex: 1,
  },
  detailFoodName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  detailQuantityText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  detailNutritionRow: {
    flexDirection: "row",
    gap: 8,
  },
  detailNutritionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailNutritionText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "500",
    marginLeft: 2,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  editDayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
  },
  editDayButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  currentMonthDay: {
    borderWidth: 2,
    borderColor: "#10B981",
  },
  currentMonthText: {
    color: "#10B981",
  },
  filterModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
  },
  filterModalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
    marginTop: 16,
  },
  filterModeButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  filterModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  activeFilterMode: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  filterModeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    marginLeft: 6,
  },
  activeFilterModeText: {
    color: "#fff",
  },
  yearSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 8,
  },
  yearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  yearText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    minWidth: 80,
    textAlign: "center",
  },
  monthSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 8,
  },
  monthButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  monthText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    minWidth: 120,
    textAlign: "center",
  },
  filterModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  applyFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    padding: 16,
    borderRadius: 12,
  },
  applyFilterText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
})

export default CalendarScreen
