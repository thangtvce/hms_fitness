import { useState, useEffect, useRef } from "react"
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
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { foodService } from "services/apiFoodService"
import { LinearGradient } from "expo-linear-gradient"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { addFoodToLog } from "utils/foodLogStorage"
import dayjs from "dayjs"

const { width, height } = Dimensions.get("window")

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Draft", value: "draft" },
]

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 50]

const SORT_OPTIONS = [
  { label: "Name A-Z", value: "name", icon: "text-outline" },
  { label: "Calories (High → Low)", value: "calories-high", icon: "flame-outline" },
  { label: "Calories (Low → High)", value: "calories-low", icon: "flame-outline" },
  { label: "Protein (High → Low)", value: "protein-high", icon: "fitness-outline" },
  { label: "Carbs (High → Low)", value: "carbs-high", icon: "nutrition-outline" },
  { label: "Fats (High → Low)", value: "fats-high", icon: "water-outline" },
]

const LAYOUT_OPTIONS = [
  { columns: 1, icon: "list-outline", label: "1 column" },
  { columns: 2, icon: "grid-outline", label: "2 columns" },
  { columns: 3, icon: "apps-outline", label: "3 columns" },
  { columns: 4, icon: "keypad-outline", label: "4 columns" },
]

const MIN_SERVING = 1
const MAX_SERVING = 2000
const MIN_PORTION = 1
const MAX_PORTION = 10

const FoodListScreen = () => {
  const navigation = useNavigation()
  const [foods, setFoods] = useState([])
  const [categories, setCategories] = useState([])
  const [categoryMap, setCategoryMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [showSortModal, setShowSortModal] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("")
  const [sortBy, setSortBy] = useState("name")
  const [layoutMode, setLayoutMode] = useState(1)
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [selectedFoods, setSelectedFoods] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [hasPrevPage, setHasPrevPage] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState({
    pageNumber: 1,
    pageSize: 10,
    startDate: "",
    endDate: "",
    validPageSize: 10,
    searchTerm: "",
    status: "",
    categoryId: "",
    minCalories: "",
    maxCalories: "",
  })
  const [appliedFilters, setAppliedFilters] = useState({
    pageNumber: 1,
    pageSize: 10,
    startDate: "",
    endDate: "",
    validPageSize: 10,
    searchTerm: "",
    status: "",
    categoryId: "",
    minCalories: "",
    maxCalories: "",
  })
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  // State for custom input modal
  const [inputModalVisible, setInputModalVisible] = useState(false)
  const [inputValues, setInputValues] = useState({ portionSize: "1", servingSize: "1" })
  const [pendingAddFood, setPendingAddFood] = useState(null)

  // Animation for modal
  const modalScale = useRef(new Animated.Value(0)).current
  const modalOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  // Modal animation effect
  useEffect(() => {
    if (inputModalVisible) {
      Animated.parallel([
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      Animated.parallel([
        Animated.timing(modalScale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()
    }
  }, [inputModalVisible])

  const fetchCategories = async () => {
    try {
      const response = await foodService.getAllActiveCategories({ pageNumber: 1, pageSize: 100 })
      if (response.statusCode === 200) {
        const categoriesData = response.data.categories || []
        setCategories(categoriesData)
        const map = categoriesData.reduce((acc, category) => {
          acc[category.categoryId] = category.categoryName
          return acc
        }, {})
        setCategoryMap(map)
        return categoriesData
      } else {
        return []
      }
    } catch (err) {
      return []
    }
  }

  const fetchFoods = async (isRefresh = false, customParams = null, pageNumber = null) => {
    if (!isRefresh) setLoading(true)
    setError(null)
    try {
      const params = customParams || {}
      if (!customParams) {
        params.pageNumber = pageNumber || appliedFilters.pageNumber || currentPage
        params.pageSize = appliedFilters.pageSize || 10
        if (appliedSearchQuery.trim()) params.searchTerm = appliedSearchQuery.trim()
        if (appliedFilters.searchTerm.trim()) params.searchTerm = appliedFilters.searchTerm.trim()
        if (appliedFilters.status) params.status = appliedFilters.status
        if (appliedFilters.categoryId || selectedCategory)
          params.categoryId = appliedFilters.categoryId || selectedCategory
        if (appliedFilters.startDate) params.startDate = appliedFilters.startDate
        if (appliedFilters.endDate) params.endDate = appliedFilters.endDate
        if (appliedFilters.minCalories) params.minCalories = appliedFilters.minCalories
        if (appliedFilters.maxCalories) params.maxCalories = appliedFilters.maxCalories
      }
      const response = await foodService.getAllActiveFoods(params)
      if (categories.length === 0) await fetchCategories()
      if (response && response.statusCode === 200) {
        let foodsData = Array.isArray(response.data.foods)
          ? response.data.foods
          : Array.isArray(response.data)
            ? response.data
            : []
        foodsData = sortFoods(foodsData, sortBy)
        if (response.data.pagination) {
          setCurrentPage(response.data.pagination.currentPage || params.pageNumber || 1)
          setTotalPages(response.data.pagination.totalPages || 1)
          setTotalItems(response.data.pagination.totalItems || foodsData.length)
          setHasNextPage(response.data.pagination.hasNextPage || false)
          setHasPrevPage(response.data.pagination.hasPreviousPage || false)
        } else {
          const totalCount = response.data.totalCount || foodsData.length
          const pageSize = params.pageSize || 10
          const currentPageNum = params.pageNumber || 1
          setCurrentPage(currentPageNum)
          setTotalPages(Math.ceil(totalCount / pageSize))
          setTotalItems(totalCount)
          setHasNextPage(currentPageNum < Math.ceil(totalCount / pageSize))
          setHasPrevPage(currentPageNum > 1)
        }
        setFoods([...foodsData])
      } else {
        setFoods([])
        setCurrentPage(1)
        setTotalPages(1)
        setTotalItems(0)
        setHasNextPage(false)
        setHasPrevPage(false)
      }
    } catch (err) {
      setError(err.message || "Failed to load foods")
      setFoods([])
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }

  const sortFoods = (foods, sortType) => {
    const sorted = [...foods]
    switch (sortType) {
      case "name":
        return sorted.sort((a, b) => (a.foodName || "").localeCompare(b.foodName || ""))
      case "calories-high":
        return sorted.sort((a, b) => (b.calories || 0) - (a.calories || 0))
      case "calories-low":
        return sorted.sort((a, b) => (a.calories || 0) - (b.calories || 0))
      case "protein-high":
        return sorted.sort((a, b) => (b.protein || 0) - (a.protein || 0))
      case "carbs-high":
        return sorted.sort((a, b) => (b.carbs || 0) - (a.carbs || 0))
      case "fats-high":
        return sorted.sort((a, b) => (b.fats || 0) - (a.fats || 0))
      default:
        return sorted
    }
  }

  useEffect(() => {
    fetchFoods()
  }, [])

  useEffect(() => {
    if (selectedCategory || sortBy !== "name") {
      const params = { pageNumber: 1, pageSize: appliedFilters.pageSize || 10 }
      if (selectedCategory) params.categoryId = selectedCategory
      fetchFoods(false, params, 1)
    }
  }, [selectedCategory, sortBy])

  const onRefresh = () => {
    setRefreshing(true)
    setCurrentPage(1)
    fetchFoods(true, null, 1)
  }

  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery)
    setCurrentPage(1)
    const searchParams = { pageNumber: 1, pageSize: appliedFilters.pageSize || 10 }
    if (searchQuery.trim()) searchParams.searchTerm = searchQuery.trim()
    if (appliedFilters.status) searchParams.status = appliedFilters.status
    if (appliedFilters.categoryId || selectedCategory)
      searchParams.categoryId = appliedFilters.categoryId || selectedCategory
    if (appliedFilters.startDate) searchParams.startDate = appliedFilters.startDate
    if (appliedFilters.endDate) searchParams.endDate = appliedFilters.endDate
    if (appliedFilters.minCalories) searchParams.minCalories = appliedFilters.minCalories
    if (appliedFilters.maxCalories) searchParams.maxCalories = appliedFilters.maxCalories
    fetchFoods(false, searchParams, 1)
  }

  const applyFilters = () => {
    setAppliedFilters({ ...filters })
    setShowFilters(false)
    setCurrentPage(1)
    const filterParams = { pageNumber: 1, pageSize: filters.pageSize || 10 }
    if (filters.searchTerm.trim()) filterParams.searchTerm = filters.searchTerm.trim()
    if (filters.status) filterParams.status = filters.status
    if (filters.categoryId || selectedCategory) filterParams.categoryId = filters.categoryId || selectedCategory
    if (filters.startDate) filterParams.startDate = filters.startDate
    if (filters.endDate) filterParams.endDate = filters.endDate
    if (filters.minCalories) filterParams.minCalories = filters.minCalories
    if (filters.maxCalories) filterParams.maxCalories = filters.maxCalories
    if (appliedSearchQuery.trim()) filterParams.searchTerm = appliedSearchQuery.trim()
    fetchFoods(false, filterParams, 1)
  }

  const resetFilters = () => {
    const resetState = {
      pageNumber: 1,
      pageSize: 10,
      startDate: "",
      endDate: "",
      validPageSize: 10,
      searchTerm: "",
      status: "",
      categoryId: "",
      minCalories: "",
      maxCalories: "",
    }
    setFilters(resetState)
    setAppliedFilters(resetState)
    setSearchQuery("")
    setAppliedSearchQuery("")
    setSelectedCategory("")
    setSortBy("name")
    setCurrentPage(1)
    setTimeout(() => fetchFoods(false, { pageNumber: 1, pageSize: 10 }, 1), 100)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setAppliedSearchQuery("")
    setCurrentPage(1)
    const filterParams = { pageNumber: 1, pageSize: appliedFilters.pageSize || 10 }
    if (appliedFilters.status) filterParams.status = appliedFilters.status
    if (appliedFilters.categoryId || selectedCategory)
      filterParams.categoryId = appliedFilters.categoryId || selectedCategory
    if (appliedFilters.startDate) filterParams.startDate = appliedFilters.startDate
    if (appliedFilters.endDate) filterParams.endDate = appliedFilters.endDate
    if (appliedFilters.minCalories) filterParams.minCalories = appliedFilters.minCalories
    if (appliedFilters.maxCalories) filterParams.maxCalories = appliedFilters.maxCalories
    fetchFoods(false, filterParams, 1)
  }

  const handleSelectFood = (food) => {
    setSelectedFoods((prev) => {
      const exists = prev.find((f) => f.foodId === food.foodId)
      if (exists) return prev.filter((f) => f.foodId !== food.foodId)
      return [...prev, food]
    })
  }

  const handleAddFoodToMeal = async (food) => {
    const mealTypes = [
      { label: "Breakfast", value: "Breakfast" },
      { label: "Lunch", value: "Lunch" },
      { label: "Dinner", value: "Dinner" },
    ]

    const mealType = await new Promise((resolve) => {
      Alert.alert(
        "Choose a meal",
        "Which session do you want to add?",
        [
          ...mealTypes.map((m) => ({ text: m.label, onPress: () => resolve(m.value) })),
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        ],
        { cancelable: true },
      )
    })

    if (!mealType) return

    setPendingAddFood({ food, mealType })
    setInputValues({ portionSize: "1", servingSize: "1" })
    setInputModalVisible(true)
  }

  const handleInputModalOk = async () => {
    const { food, mealType } = pendingAddFood || {}
    if (!food || !mealType) {
      return
    }
    const { portionSize, servingSize } = inputValues
    const parsedServingSize = Number.parseFloat(servingSize) || 1
    const parsedPortionSize = Number.parseFloat(portionSize) || 1

    // Validate for spam/abuse and healthy adult limits
    if (
      parsedServingSize < MIN_SERVING ||
      parsedServingSize > MAX_SERVING ||
      parsedPortionSize < MIN_PORTION ||
      parsedPortionSize > MAX_PORTION
    ) {
      Alert.alert(
        "Invalid input",
        `Please enter realistic values:\n- Portion size: 1-${MAX_PORTION}\n- Serving size: 1-${MAX_SERVING} (grams/unit)`,
      )
      return
    }
    try {
      const today = dayjs().format("YYYY-MM-DD")
      const logData = {
        foodId: food.foodId,
        foodName: food.foodName || "Unknown Food",
        calories: (food.calories || 0) * parsedServingSize,
        protein: (food.protein || 0) * parsedServingSize,
        carbs: (food.carbs || 0) * parsedServingSize,
        fats: (food.fats || 0) * parsedServingSize,
        portionSize: parsedPortionSize,
        servingSize: parsedServingSize,
        satisfactionRating: 1, // Set default rating to 0
        notes: "",
        consumptionDate: today,
      }
      await addFoodToLog(today, mealType, logData)
      Alert.alert("Success", `Added ${food.foodName} to ${mealType} log with ${parsedServingSize} serving(s)!`)
      handleSelectFood(food)
      setInputModalVisible(false)
      setPendingAddFood(null)
    } catch (error) {
      Alert.alert("Error", `Failed to add to log: ${error.message}`)
    }
  }

  const handleInputModalCancel = () => {
    setInputModalVisible(false)
    setPendingAddFood(null)
  }

  const getFoodImage = (foodName) => {
    return `https://source.unsplash.com/400x250/?food,${foodName.replace(/\s/g, "")}`
  }

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setCurrentPage(page)
      fetchFoods(false, null, page)
    }
  }

  const goToNextPage = () => {
    if (hasNextPage) {
      goToPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (hasPrevPage) {
      goToPage(currentPage - 1)
    }
  }

  const renderCategoryItem = ({ item }) => {
    const isSelected = selectedCategory === item.categoryId
    return (
      <TouchableOpacity
        style={[styles.categoryCard, isSelected && styles.selectedCategoryCard]}
        onPress={() => {
          setSelectedCategory(isSelected ? "" : item.categoryId)
          setCurrentPage(1)
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? ["#4F46E5", "#6366F1"] : ["#F8FAFC", "#F1F5F9"]}
          style={styles.categoryGradient}
        >
          <View style={styles.categoryIconContainer}>
            <Ionicons name="restaurant-outline" size={24} color={isSelected ? "#FFFFFF" : "#4F46E5"} />
          </View>
          <Text style={[styles.categoryName, { color: isSelected ? "#FFFFFF" : "#1E293B" }]}>{item.categoryName}</Text>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sortModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sort Foods</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sortContent}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.sortOption, sortBy === option.value && styles.selectedSortOption]}
                onPress={() => {
                  setSortBy(option.value)
                  setShowSortModal(false)
                }}
              >
                <View style={styles.sortOptionLeft}>
                  <View
                    style={[
                      styles.sortIconContainer,
                      { backgroundColor: sortBy === option.value ? "#EEF2FF" : "#F9FAFB" },
                    ]}
                  >
                    <Ionicons name={option.icon} size={20} color={sortBy === option.value ? "#4F46E5" : "#6B7280"} />
                  </View>
                  <Text style={[styles.sortOptionText, sortBy === option.value && styles.selectedSortOptionText]}>
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.value && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null
    const pageNumbers = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }
    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Showing {(currentPage - 1) * appliedFilters.pageSize + 1}-
            {Math.min(currentPage * appliedFilters.pageSize, totalItems)} of {totalItems} foods
          </Text>
        </View>
        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.paginationButton, !hasPrevPage && styles.paginationButtonDisabled]}
            onPress={goToPrevPage}
            disabled={!hasPrevPage}
          >
            <Ionicons name="chevron-back" size={16} color={hasPrevPage ? "#4F46E5" : "#9CA3AF"} />
          </TouchableOpacity>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumbersContainer}>
            {startPage > 1 && (
              <>
                <TouchableOpacity style={styles.pageNumberButton} onPress={() => goToPage(1)}>
                  <Text style={styles.pageNumberText}>1</Text>
                </TouchableOpacity>
                {startPage > 2 && <Text style={styles.paginationEllipsis}>...</Text>}
              </>
            )}
            {pageNumbers.map((pageNum) => (
              <TouchableOpacity
                key={pageNum}
                style={[styles.pageNumberButton, currentPage === pageNum && styles.pageNumberButtonActive]}
                onPress={() => goToPage(pageNum)}
              >
                <Text style={[styles.pageNumberText, currentPage === pageNum && styles.pageNumberTextActive]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            ))}
            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <Text style={styles.paginationEllipsis}>...</Text>}
                <TouchableOpacity style={styles.pageNumberButton} onPress={() => goToPage(totalPages)}>
                  <Text style={styles.pageNumberText}>{totalPages}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
          <TouchableOpacity
            style={[styles.paginationButton, !hasNextPage && styles.paginationButtonDisabled]}
            onPress={goToNextPage}
            disabled={!hasNextPage}
          >
            <Ionicons name="chevron-forward" size={16} color={hasNextPage ? "#4F46E5" : "#9CA3AF"} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderFilterModal = () => (
    <Modal visible={showFilters} transparent={true} animationType="slide" onRequestClose={() => setShowFilters(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filters & Search</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Search Term</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Enter search term..."
                value={filters.searchTerm}
                onChangeText={(value) => setFilters((prev) => ({ ...prev, searchTerm: value }))}
              />
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Items per page</Text>
              <View style={styles.pageSizeContainer}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.pageSizeButton, filters.pageSize === size && styles.selectedPageSize]}
                    onPress={() => setFilters((prev) => ({ ...prev, pageSize: size, validPageSize: size }))}
                  >
                    <Text style={[styles.pageSizeText, filters.pageSize === size && styles.selectedPageSizeText]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Calorie Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Min Calories</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="0"
                    value={filters.minCalories}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev, minCalories: value }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Max Calories</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="1000"
                    value={filters.maxCalories}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev, maxCalories: value }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="DD-MM-YYYY"
                    value={filters.startDate}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev, startDate: value }))}
                  />
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="DD-MM-YYYY"
                    value={filters.endDate}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev, endDate: value }))}
                  />
                </View>
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              {STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[styles.filterOption, filters.status === status.value && styles.selectedOption]}
                  onPress={() => setFilters((prev) => ({ ...prev, status: status.value }))}
                >
                  <Text style={[styles.filterOptionText, filters.status === status.value && styles.selectedOptionText]}>
                    {status.label}
                  </Text>
                  {filters.status === status.value && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <TouchableOpacity
                style={[styles.filterOption, filters.categoryId === "" && styles.selectedOption]}
                onPress={() => setFilters((prev) => ({ ...prev, categoryId: "" }))}
              >
                <Text style={[styles.filterOptionText, filters.categoryId === "" && styles.selectedOptionText]}>
                  All Categories
                </Text>
                {filters.categoryId === "" && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[styles.filterOption, filters.categoryId === category.categoryId && styles.selectedOption]}
                  onPress={() => setFilters((prev) => ({ ...prev, categoryId: category.categoryId }))}
                >
                  <View style={styles.categoryOptionContent}>
                    <View style={styles.categoryIcon}>
                      <Ionicons name="restaurant-outline" size={16} color="#4F46E5" />
                    </View>
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.categoryId === category.categoryId && styles.selectedOptionText,
                      ]}
                    >
                      {category.categoryName}
                    </Text>
                  </View>
                  {filters.categoryId === category.categoryId && (
                    <Ionicons name="checkmark" size={20} color="#4F46E5" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderLayoutModal = () => (
    <Modal
      visible={showLayoutModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowLayoutModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.layoutModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Display Layout</Text>
            <TouchableOpacity onPress={() => setShowLayoutModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <View style={styles.layoutContent}>
            <Text style={styles.layoutDescription}>Select number of columns to display foods</Text>
            <View style={styles.layoutGrid}>
              {LAYOUT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.columns}
                  style={[styles.layoutOption, layoutMode === option.columns && styles.selectedLayoutOption]}
                  onPress={() => {
                    setLayoutMode(option.columns)
                    setShowLayoutModal(false)
                  }}
                >
                  <View
                    style={[
                      styles.layoutIconContainer,
                      { backgroundColor: layoutMode === option.columns ? "#4F46E5" : "#F9FAFB" },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={24}
                      color={layoutMode === option.columns ? "#FFFFFF" : "#6B7280"}
                    />
                  </View>
                  <Text
                    style={[styles.layoutOptionText, layoutMode === option.columns && styles.selectedLayoutOptionText]}
                  >
                    {option.label}
                  </Text>
                  {layoutMode === option.columns && (
                    <View style={styles.layoutCheckmark}>
                      <Ionicons name="checkmark-circle" size={20} color="#4F46E5" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderFoodItem = ({ item, index }) => {
    const itemWidth = layoutMode === 1 ? "100%" : layoutMode === 2 ? "48%" : layoutMode === 3 ? "31%" : "23%"
    const imageHeight = layoutMode === 1 ? 180 : layoutMode === 2 ? 140 : layoutMode === 3 ? 120 : 100
    const isSelected = selectedFoods.some((f) => f.foodId === item.foodId)
    return (
      <Animated.View
        style={[
          styles.foodItem,
          {
            width: itemWidth,
            marginRight: layoutMode > 1 ? "2%" : 0,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("FoodDetails", { food: item })}
          activeOpacity={0.8}
          style={[styles.foodCard, isSelected && styles.selectedFoodCard]}
        >
          <View style={styles.foodImageContainer}>
            <Image
              source={{ uri: item.image || getFoodImage(item.foodName || "food") }}
              style={[styles.foodImage, { height: imageHeight }]}
              resizeMode="cover"
            />
            <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]} style={styles.foodGradient}>
              <Text
                style={[styles.foodName, { fontSize: layoutMode > 2 ? 16 : 20 }]}
                numberOfLines={layoutMode > 2 ? 2 : 1}
              >
                {item.foodName || "Unknown Food"}
              </Text>
            </LinearGradient>
            <View style={styles.caloriesBadge}>
              <Text style={[styles.caloriesText, { fontSize: layoutMode > 2 ? 10 : 12 }]}>
                {item.calories || 0} kcal
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.selectionButton,
                { width: layoutMode > 2 ? 28 : 36, height: layoutMode > 2 ? 28 : 36 },
                isSelected && styles.selectedButton,
              ]}
              onPress={(e) => {
                e.stopPropagation()
                handleAddFoodToMeal(item)
              }}
            >
              <Ionicons
                name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                size={layoutMode > 2 ? 16 : 20}
                color={isSelected ? "#FFFFFF" : "#4F46E5"}
              />
            </TouchableOpacity>
          </View>
          <View style={[styles.foodContent, { padding: layoutMode > 2 ? 12 : 20 }]}>
            <Text style={[styles.foodCategory, { fontSize: layoutMode > 2 ? 11 : 13 }]} numberOfLines={1}>
              {categoryMap[item.categoryId] || `Category ${item.categoryId || "Unknown"}`}
            </Text>
            <View style={[styles.macrosContainer, { gap: layoutMode > 2 ? 8 : 12 }]}>
              {layoutMode <= 2 && (
                <View style={styles.macroItem}>
                  <View style={[styles.macroIconContainer, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="nutrition-outline" size={14} color="#EF4444" />
                  </View>
                  <Text style={styles.macroText}>{item.carbs || 0}g carbs</Text>
                </View>
              )}
              {layoutMode <= 2 && (
                <View style={styles.macroItem}>
                  <View style={[styles.macroIconContainer, { backgroundColor: "#FFFBEB" }]}>
                    <Ionicons name="water-outline" size={14} color="#F59E0B" />
                  </View>
                  <Text style={styles.macroText}>{item.fats || 0}g fats</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  // Enhanced Input Modal Component
  const renderEnhancedInputModal = () => {
    const { food, mealType } = pendingAddFood || {}

    return (
      <Modal visible={inputModalVisible} transparent animationType="none" onRequestClose={handleInputModalCancel}>
        <Animated.View style={[styles.enhancedModalOverlay, { opacity: modalOpacity }]}>
          <Animated.View
            style={[
              styles.enhancedModalContainer,
              {
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              },
            ]}
          >
            {/* Modal Header */}
            <LinearGradient colors={["#4F46E5", "#6366F1"]} style={styles.enhancedModalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="restaurant" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.modalHeaderText}>
                  <Text style={styles.enhancedModalTitle}>Add Food Details</Text>
                  <Text style={styles.enhancedModalSubtitle}>
                    {food?.foodName} → {mealType}
                  </Text>
                </View>
                <TouchableOpacity style={styles.modalCloseButton} onPress={handleInputModalCancel}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Modal Content - Fixed ScrollView */}
            <View style={styles.enhancedModalContentWrapper}>
              <ScrollView
                style={styles.enhancedModalContent}
                contentContainerStyle={styles.enhancedModalContentContainer}
                showsVerticalScrollIndicator={false}
                bounces={true}
              >
                {/* Food Info Card */}
                <View style={styles.foodInfoCard}>
                  <Image
                    source={{ uri: food?.image || getFoodImage(food?.foodName || "food") }}
                    style={styles.modalFoodImage}
                  />
                  <View style={styles.foodInfoContent}>
                    <Text style={styles.modalFoodName}>{food?.foodName}</Text>
                    <View style={styles.foodNutritionRow}>
                      <View style={styles.nutritionItem}>
                        <Ionicons name="flame" size={16} color="#EF4444" />
                        <Text style={styles.nutritionText}>{food?.calories || 0} kcal</Text>
                      </View>
                      <View style={styles.nutritionItem}>
                        <Ionicons name="fitness" size={16} color="#10B981" />
                        <Text style={styles.nutritionText}>{food?.protein || 0}g protein</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Input Fields */}
                <View style={styles.inputFieldsContainer}>
                  {/* Portion Size */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputLabelContainer}>
                      <Ionicons name="layers-outline" size={20} color="#4F46E5" />
                      <Text style={styles.inputLabel}>Portion Size</Text>
                    </View>
                    <Text style={styles.inputDescription}>Number of portions (1-{MAX_PORTION})</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.enhancedInput}
                        placeholder="1"
                        keyboardType="numeric"
                        value={inputValues.portionSize}
                        onChangeText={(text) => setInputValues((prev) => ({ ...prev, portionSize: text }))}
                        placeholderTextColor="#9CA3AF"
                      />
                      <View style={styles.inputUnit}>
                        <Text style={styles.inputUnitText}>portions</Text>
                      </View>
                    </View>
                  </View>

                  {/* Serving Size */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputLabelContainer}>
                      <Ionicons name="scale-outline" size={20} color="#10B981" />
                      <Text style={styles.inputLabel}>Serving Size</Text>
                    </View>
                    <Text style={styles.inputDescription}>Weight or units (1-{MAX_SERVING}g)</Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={styles.enhancedInput}
                        placeholder="1"
                        keyboardType="numeric"
                        value={inputValues.servingSize}
                        onChangeText={(text) => setInputValues((prev) => ({ ...prev, servingSize: text }))}
                        placeholderTextColor="#9CA3AF"
                      />
                      <View style={styles.inputUnit}>
                        <Text style={styles.inputUnitText}>grams</Text>
                      </View>
                    </View>
                  </View>

                  {/* Calculated Nutrition */}
                  <View style={styles.calculatedNutrition}>
                    <Text style={styles.calculatedTitle}>Calculated Nutrition</Text>
                    <View style={styles.nutritionGrid}>
                      <View style={styles.nutritionCard}>
                        <Ionicons name="flame" size={20} color="#EF4444" />
                        <Text style={styles.nutritionValue}>
                          {Math.round((food?.calories || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}
                        </Text>
                        <Text style={styles.nutritionLabel}>Calories</Text>
                      </View>
                      <View style={styles.nutritionCard}>
                        <Ionicons name="fitness" size={20} color="#10B981" />
                        <Text style={styles.nutritionValue}>
                          {Math.round((food?.protein || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Protein</Text>
                      </View>
                      <View style={styles.nutritionCard}>
                        <Ionicons name="nutrition" size={20} color="#3B82F6" />
                        <Text style={styles.nutritionValue}>
                          {Math.round((food?.carbs || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Carbs</Text>
                      </View>
                      <View style={styles.nutritionCard}>
                        <Ionicons name="water" size={20} color="#F59E0B" />
                        <Text style={styles.nutritionValue}>
                          {Math.round((food?.fats || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Fats</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Modal Actions */}
            <View style={styles.enhancedModalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleInputModalCancel}>
                <Ionicons name="close-circle-outline" size={20} color="#6B7280" />
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmButton} onPress={handleInputModalOk}>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Add to {mealType}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    )
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading food content...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>🍎 Food Explorer</Text>
            <Text style={styles.headerSubtitle}>Discover healthy foods & nutrition</Text>
          </View>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => navigation.navigate('FavoriteFoodScreen')}>
            <Ionicons name="heart-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => navigation.navigate('FoodDailyLogScreen')}>
            <Ionicons name="play-circle-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search foods..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Food Categories</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.layoutButton} onPress={() => setShowLayoutModal(true)}>
              <Ionicons
                name={LAYOUT_OPTIONS.find((opt) => opt.columns === layoutMode)?.icon || "grid-outline"}
                size={18}
                color="#4F46E5"
              />
              <Text style={styles.layoutButtonText}>{layoutMode} col</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
              <Ionicons name="swap-vertical-outline" size={20} color="#4F46E5" />
              <Text style={styles.sortButtonText}>Sort</Text>
            </TouchableOpacity>
          </View>
        </View>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.categoryId.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>
      {selectedFoods.length > 0 && (
        <View style={styles.selectedFoodsSection}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedTitle}>Selected Foods ({selectedFoods.length})</Text>
            <TouchableOpacity onPress={() => setSelectedFoods([])}>
              <Text style={styles.clearSelectedText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedScroll}>
            {selectedFoods.map((food) => (
              <View key={food.foodId} style={styles.selectedFoodChip}>
                <Image source={{ uri: food.image || getFoodImage(food.foodName) }} style={styles.selectedFoodImage} />
                <Text style={styles.selectedFoodName} numberOfLines={1}>
                  {food.foodName}
                </Text>
                <TouchableOpacity onPress={() => handleSelectFood(food)} style={styles.removeSelectedButton}>
                  <Ionicons name="close" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      {(appliedSearchQuery ||
        appliedFilters.status ||
        appliedFilters.categoryId ||
        selectedCategory ||
        appliedFilters.startDate ||
        appliedFilters.endDate ||
        appliedFilters.minCalories ||
        appliedFilters.maxCalories ||
        sortBy !== "name") && (
        <View style={styles.activeFiltersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersScroll}>
            {appliedSearchQuery && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Search: {appliedSearchQuery}</Text>
                <TouchableOpacity onPress={clearSearch}>
                  <Ionicons name="close" size={16} color="#4F46E5" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCategory && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Category: {categoryMap[selectedCategory]}</Text>
              </View>
            )}
            {sortBy !== "name" && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Sort: {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
                </Text>
              </View>
            )}
            {appliedFilters.status && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Status: {appliedFilters.status}</Text>
              </View>
            )}
            {(appliedFilters.minCalories || appliedFilters.maxCalories) && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>
                  Calories: {appliedFilters.minCalories || 0}-{appliedFilters.maxCalories || "∞"}
                </Text>
              </View>
            )}
            {appliedFilters.pageSize !== 10 && (
              <View style={styles.activeFilterChip}>
                <Text style={styles.activeFilterText}>Per page: {appliedFilters.pageSize}</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.clearAllFiltersButton} onPress={resetFilters}>
            <Text style={styles.clearAllFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.contentContainer}>
        {error && !refreshing ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchFoods()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={foods}
              renderItem={renderFoodItem}
              keyExtractor={(item, index) => (item.foodId ? `food-${item.foodId}` : `item-${index}`)}
              numColumns={layoutMode}
              key={layoutMode}
              contentContainerStyle={[styles.listContainer, { minHeight: height - 400 }]}
              style={styles.flatListStyle}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#4F46E5"]}
                  tintColor="#4F46E5"
                />
              }
              showsVerticalScrollIndicator={false}
              bounces={true}
              scrollEnabled={true}
              nestedScrollEnabled={true}
              ListEmptyComponent={
                !loading ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>No foods found</Text>
                    <Text style={styles.emptyText}>
                      {appliedSearchQuery || appliedFilters.status || appliedFilters.categoryId || selectedCategory
                        ? "No foods match your search criteria."
                        : "Try refreshing or check your connection."}
                    </Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchFoods()}>
                      <Text style={styles.retryButtonText}>Refresh</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
            {renderPaginationControls()}
          </>
        )}
      </View>
      {renderFilterModal()}
      {renderSortModal()}
      {renderLayoutModal()}
      {renderEnhancedInputModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.primaryColor },
  header: { paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0, paddingBottom: 16 },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: { padding: 8, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.2)" },
  headerTextContainer: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "700", color: "#FFFFFF", textAlign: "center" },
  headerSubtitle: { fontSize: 14, color: "rgba(255, 255, 255, 0.8)", textAlign: "center", marginTop: 2 },
  headerActionButton: { padding: 8, borderRadius: 20, backgroundColor: "rgba(255, 255, 255, 0.2)" },
  searchContainer: {
    backgroundColor: "#F8FAFC",
    marginTop: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: "#1E293B", paddingVertical: 16 },
  clearButton: { padding: 4 },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  categoriesSection: { backgroundColor: "#F8FAFC", paddingBottom: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  layoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  layoutButtonText: { fontSize: 12, color: "#4F46E5", fontWeight: "500", marginLeft: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "600", color: "#1E293B" },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sortButtonText: { fontSize: 14, color: "#4F46E5", fontWeight: "500", marginLeft: 4 },
  categoriesList: { paddingHorizontal: 16 },
  categoryCard: {
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedCategoryCard: { transform: [{ scale: 1.05 }] },
  categoryGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: "center",
    position: "relative",
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryName: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  selectedIndicator: { position: "absolute", top: 8, right: 8 },
  selectedFoodsSection: {
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  selectedTitle: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  clearSelectedText: { fontSize: 14, color: "#EF4444", fontWeight: "500" },
  selectedScroll: { paddingHorizontal: 16 },
  selectedFoodChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedFoodImage: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  selectedFoodName: { fontSize: 14, color: "#1E293B", fontWeight: "500", maxWidth: 80 },
  removeSelectedButton: { marginLeft: 8, padding: 2 },
  sortModal: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.6 },
  sortContent: { paddingHorizontal: 20, paddingVertical: 16 },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  selectedSortOption: { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#4F46E5" },
  sortOptionLeft: { flexDirection: "row", alignItems: "center" },
  sortIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sortOptionText: { fontSize: 16, color: "#6B7280", fontWeight: "500" },
  selectedSortOptionText: { color: "#4F46E5", fontWeight: "600" },
  activeFiltersContainer: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  activeFiltersScroll: { flex: 1 },
  activeFilterChip: {
    backgroundColor: "#EEF2FF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeFilterText: { fontSize: 12, color: "#4F46E5", fontWeight: "500" },
  clearAllFiltersButton: { paddingHorizontal: 12, paddingVertical: 6 },
  clearAllFiltersText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
  contentContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  flatListStyle: { flex: 1 },
  listContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: "#F9FAFB" },
  paginationContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  paginationInfo: { alignItems: "center", marginBottom: 12 },
  paginationText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  paginationControls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  paginationButtonDisabled: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },
  pageNumbersContainer: { maxWidth: width * 0.6 },
  pageNumberButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 2,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pageNumberButtonActive: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  pageNumberText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  pageNumberTextActive: { color: "#FFFFFF", fontWeight: "600" },
  paginationEllipsis: { fontSize: 14, color: "#9CA3AF", paddingHorizontal: 8, alignSelf: "center" },
  pageSizeContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pageSizeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minWidth: 40,
    alignItems: "center",
  },
  selectedPageSize: { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
  pageSizeText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  selectedPageSizeText: { color: "#FFFFFF", fontWeight: "600" },
  foodItem: { marginBottom: 20 },
  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  selectedFoodCard: { borderWidth: 2, borderColor: "#4F46E5" },
  foodImageContainer: { position: "relative" },
  foodImage: { width: "100%", height: 180 },
  foodGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  foodName: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  caloriesBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#10B981",
  },
  caloriesText: { fontSize: 12, color: "#FFFFFF", fontWeight: "600" },
  selectionButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedButton: { backgroundColor: "#4F46E5" },
  foodContent: { padding: 20 },
  foodCategory: { fontSize: 13, color: "#64748B", fontWeight: "500", marginBottom: 12 },
  macrosContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  macroItem: { flexDirection: "row", alignItems: "center" },
  macroIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  macroText: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 80, minHeight: height * 0.4 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#374151", marginTop: 16, marginBottom: 8 },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, backgroundColor: "#F9FAFB" },
  loadingText: { fontSize: 16, color: "#4F46E5", fontWeight: "500" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
    backgroundColor: "#F9FAFB",
    minHeight: height * 0.6,
  },
  errorText: { fontSize: 16, color: "#EF4444", textAlign: "center", lineHeight: 24 },
  retryButton: { backgroundColor: "#4F46E5", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  retryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  filterContent: { paddingHorizontal: 20, paddingVertical: 16 },
  filterSection: { marginBottom: 24 },
  filterLabel: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },
  filterInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  dateRow: { flexDirection: "row", gap: 12 },
  dateInputContainer: { flex: 1 },
  dateLabel: { fontSize: 14, color: "#6B7280", marginBottom: 8 },
  dateInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#1F2937",
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  selectedOption: { backgroundColor: "#EEF2FF", borderWidth: 1, borderColor: "#4F46E5" },
  filterOptionText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  selectedOptionText: { color: "#4F46E5", fontWeight: "600" },
  categoryOptionContent: { flexDirection: "row", alignItems: "center" },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  resetButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center" },
  resetButtonText: { fontSize: 16, color: "#6B7280", fontWeight: "600" },
  applyButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#4F46E5", alignItems: "center" },
  applyButtonText: { fontSize: 16, color: "#FFFFFF", fontWeight: "600" },
  layoutModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.4,
  },
  layoutContent: { paddingHorizontal: 20, paddingVertical: 16 },
  layoutDescription: { fontSize: 16, color: "#6B7280", textAlign: "center", marginBottom: 16 },
  layoutGrid: { flexDirection: "row", justifyContent: "space-around", alignItems: "center", gap: 12 },
  layoutOption: {
    flex: 1,
    maxWidth: (width - 80) / 4,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  selectedLayoutOption: { backgroundColor: "#EEF2FF", borderColor: "#4F46E5" },
  layoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  layoutOptionText: { fontSize: 12, color: "#6B7280", fontWeight: "500", textAlign: "center" },
  selectedLayoutOptionText: { color: "#4F46E5", fontWeight: "600" },
  layoutCheckmark: { position: "absolute", top: 4, right: 4 },

  // Enhanced Input Modal Styles
  enhancedModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  enhancedModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    height: height * 0.85, // Thay đổi từ maxHeight thành height cố định
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },

  enhancedModalContentWrapper: {
    flex: 1, // Thêm style mới
  },

  enhancedModalContent: {
    flex: 1, // Thay đổi để ScrollView chiếm toàn bộ không gian
  },

  enhancedModalContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20, // Thêm padding bottom
  },

  inputFieldsContainer: {
    gap: 24, // Tăng gap giữa các input groups
  },

  inputGroup: {
    marginBottom: 8, // Tăng margin bottom
  },

  calculatedNutrition: {
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16, // Tăng margin top
    marginBottom: 20, // Thêm margin bottom
  },
  enhancedModalHeader: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  modalHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalHeaderText: {
    flex: 1,
  },
  enhancedModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  enhancedModalSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  enhancedModalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  foodInfoCard: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  modalFoodImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
  },
  foodInfoContent: {
    flex: 1,
    justifyContent: "center",
  },
  modalFoodName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  foodNutritionRow: {
    flexDirection: "row",
    gap: 16,
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nutritionText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  inputFieldsContainer: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  inputDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  enhancedInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
  },
  inputUnit: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  inputUnitText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  starRatingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  calculatedNutrition: {
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  calculatedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E40AF",
    marginBottom: 16,
    textAlign: "center",
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  nutritionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 4,
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  enhancedModalActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  confirmButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
})

export default FoodListScreen
