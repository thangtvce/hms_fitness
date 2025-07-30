import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
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
const MIN_PORTION = 1
const MAX_PORTION = 10

// New component for Food AI Recommend Banner
const FoodAIRecommendBanner = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      style={styles.aiRecommendBanner}
      onPress={() => navigation.navigate("AIRecommendedFoodScreen")}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={["#0056d2", "#38BDF8"]} // Blue gradient for food
        style={styles.aiRecommendBannerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.aiRecommendBannerContent}>
          <View style={styles.aiRecommendBannerLeft}>
            <View style={styles.aiRecommendBannerIcon}>
              <Feather name="book-open" size={20} color="#FFFFFF" /> 
            </View>
            <View style={styles.aiRecommendBannerText}>
              <Text style={styles.aiRecommendBannerTitle}>Food AI Recommend</Text>
              <Text style={styles.aiRecommendBannerSubtitle}>Discover personalized meal ideas</Text>
            </View>
          </View>
          <View style={styles.aiRecommendBannerRight}>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
}

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
  const [layoutMode, setLayoutMode] = useState(1) // Can be number or "quick"
  const [showLayoutModal, setShowLayoutModal] = useState(false)
  const [selectedFoods, setSelectedFoods] = useState([])
  // Pagination states removed for full list
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
      showErrorFetchAPI(err);
      return []
    }
  }

  const fetchFoods = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null)
    try {
      let params = {}
      if (appliedSearchQuery.trim()) params.searchTerm = appliedSearchQuery.trim()
      if (appliedFilters.searchTerm.trim()) params.searchTerm = appliedFilters.searchTerm.trim()
      if (appliedFilters.status) params.status = appliedFilters.status
      if (appliedFilters.categoryId || selectedCategory)
        params.categoryId = appliedFilters.categoryId || selectedCategory
      if (appliedFilters.startDate) params.startDate = appliedFilters.startDate
      if (appliedFilters.endDate) params.endDate = appliedFilters.endDate
      if (appliedFilters.minCalories) params.minCalories = appliedFilters.minCalories
      if (appliedFilters.maxCalories) params.maxCalories = appliedFilters.maxCalories
      // Always fetch all (no pagination)
      params.pageSize = 10000
      params.pageNumber = 1

      const response = await foodService.getAllActiveFoods(params)
      if (categories.length === 0) await fetchCategories()

      if (response && response.statusCode === 200) {
        let foodsData = Array.isArray(response.data.foods)
          ? response.data.foods
          : Array.isArray(response.data)
            ? response.data
            : []
        foodsData = sortFoods(foodsData, sortBy)
        setFoods([...foodsData])
      } else {
        setFoods([])
        // setCurrentPage(1) // Removed pagination states
        // setTotalPages(1)
        // setTotalItems(0)
        // setHasNextPage(false)
        // setHasPrevPage(false)
      }
    } catch (err) {
      setError(err.message || "Failed to load foods")
      setFoods([])
      showErrorFetchAPI(err);
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
      fetchFoods()
    }
  }, [selectedCategory, sortBy])

  const onRefresh = () => {
    setRefreshing(true)
    fetchFoods(true) // Pass true to indicate refresh
  }

  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery)
    fetchFoods()
  }

  const applyFilters = () => {
    setAppliedFilters({ ...filters })
    setShowFilters(false)
    fetchFoods()
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
    setTimeout(() => fetchFoods(), 100)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setAppliedSearchQuery("")
    fetchFoods()
  }

  // Modified handleSelectFood to only add if not exists, and remove if exists
  const handleSelectFood = (food) => {
    setSelectedFoods((prev) => {
      const exists = prev.find((f) => f.foodId === food.foodId)
      if (exists) {
        return prev.filter((f) => f.foodId !== food.foodId)
      } else {
        return [...prev, food]
      }
    })
  }

  const handleAddFoodToMeal = async (food, skipModal = false) => {
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

    if (skipModal) {
      const parsedServingSize = 1
      const parsedPortionSize = 1
      const today = dayjs().format("YYYY-MM-DD")

      let image = ""
      if (food.image) image = food.image
      else if (food.foodImage) image = food.foodImage
      else if (food.imageUrl) image = food.imageUrl
      if (!image && food.foodName) image = getFoodImage(food.foodName)

      const logData = {
        foodId: food.foodId,
        foodName: food.foodName || "Unknown Food",
        calories: (food.calories || 0) * parsedServingSize,
        protein: (food.protein || 0) * parsedServingSize,
        carbs: (food.carbs || 0) * parsedServingSize,
        fats: (food.fats || 0) * parsedServingSize,
        portionSize: parsedPortionSize,
        servingSize: parsedServingSize,
        satisfactionRating: 1,
        notes: "",
        consumptionDate: today,
        image,
      }

      try {
        await addFoodToLog(today, mealType, logData)
        showSuccessMessage(`Added ${food.foodName} to ${mealType} log!`);
        // Remove the food from selectedFoods after successful log
        setSelectedFoods((prev) => prev.filter((f) => f.foodId !== food.foodId))
      } catch (error) {
        showErrorFetchAPI(error);
      }
    } else {
      setPendingAddFood({ food, mealType })
      setInputValues({ portionSize: "1", servingSize: "1" })
      setInputModalVisible(true)
    }
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
      // Ensure today is defined
      const today = dayjs().format("YYYY-MM-DD")

      // Map image field robustly
      let image = ""
      if (food.image) image = food.image
      else if (food.foodImage) image = food.foodImage
      else if (food.imageUrl) image = food.imageUrl
      // Fallback: try to get image from getFoodImage if still empty
      if (!image && food.foodName) image = getFoodImage(food.foodName)

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
        image,
      }

      if (typeof food === "object") {
        // This block is empty, consider removing or adding relevant logic
      } else {
        // This block is empty, consider removing or adding relevant logic
      }

      await addFoodToLog(today, mealType, logData)
      showSuccessMessage(`Added ${food.foodName} to ${mealType} log with ${parsedServingSize} serving(s)!`);
      // Remove the food from selectedFoods after successful log
      setSelectedFoods((prev) => prev.filter((f) => f.foodId !== food.foodId))
      setInputModalVisible(false)
      setPendingAddFood(null)
    } catch (error) {
      showErrorFetchAPI(error);
    }
  }

  const handleInputModalCancel = () => {
    setInputModalVisible(false)
    setPendingAddFood(null)
  }

  const getFoodImage = (foodName) => {
    return `https://source.unsplash.com/400x250/?food,${foodName.replace(/\s/g, "")}`
  }

  // Pagination functions removed as per previous changes (full list fetch)
  // const goToPage = (page) => { ... }
  // const goToNextPage = () => { ... }
  // const goToPrevPage = () => { ... }

  const renderCategoryItem = ({ item }) => {
    const isSelected = selectedCategory === item.categoryId;
    return (
      <TouchableOpacity
        style={[
          styles.categoryCard,
          {
            paddingVertical: 0,
            paddingHorizontal: 0,
            minHeight: undefined,
            minWidth: undefined,
            marginVertical: 0,
          },
          isSelected && {
            borderColor: "#0056d2",
            borderWidth: 2,
            backgroundColor: "#fff",
          },
        ]}
        onPress={() => {
          setSelectedCategory(isSelected ? "" : item.categoryId);
          // setCurrentPage(1); // Removed pagination
        }}
        activeOpacity={0.8}
      >
        {isSelected ? (
          <View
            style={[
              styles.categoryGradient,
              {
                borderRadius: 6,
                paddingVertical: 0,
                paddingHorizontal: 4,
                minHeight: 0,
                minWidth: 0,
                alignSelf: 'flex-start',
                marginVertical: 0,
                backgroundColor: '#fff',
              },
            ]}
          >
            <Text
              style={[
                styles.categoryName,
                {
                  color: "#0056d2",
                  fontSize: 14,
                  lineHeight: 14,
                  paddingVertical: 0,
                  paddingHorizontal: 0,
                  fontWeight: "bold",
                  marginVertical: 0,
                },
              ]}
            >
              {item.categoryName}
            </Text>
            {/* Removed checkmark icon */}
          </View>
        ) : (
          <LinearGradient
            colors={["#F8FAFC", "#F1F5F9"]}
            style={[
              styles.categoryGradient,
              {
                borderRadius: 6,
                paddingVertical: 0,
                paddingHorizontal: 4,
                minHeight: 0,
                minWidth: 0,
                alignSelf: 'flex-start',
                marginVertical: 0,
              },
            ]}
          >
            <Text
              style={[
                styles.categoryName,
                {
                  color: "#1E293B",
                  fontSize: 14,
                  lineHeight: 14,
                  paddingVertical: 0,
                  paddingHorizontal: 0,
                  fontWeight: "500",
                  marginVertical: 0,
                },
              ]}
            >
              {item.categoryName}
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    );
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
                      { backgroundColor: sortBy === option.value ? "#0056d2" : "#F9FAFB" },
                    ]}
                  >
                    <Ionicons name={option.icon} size={20} color={sortBy === option.value ? "#fff" : "#6B7280"} />
                  </View>
                  <Text
                    style={[styles.sortOptionText, sortBy === option.value && { color: "#0056d2", fontWeight: "bold" }]}
                  >
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.value && <Ionicons name="checkmark" size={20} color="#0056d2" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

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
                    style={[
                      styles.pageSizeButton,
                      filters.pageSize === size && {
                        borderColor: "#0056d2",
                        borderWidth: 2,
                        backgroundColor: "#eaf1fb",
                      },
                    ]}
                    onPress={() => setFilters((prev) => ({ ...prev, pageSize: size, validPageSize: size }))}
                  >
                    <Text
                      style={[
                        styles.pageSizeText,
                        filters.pageSize === size && { color: "#0056d2", fontWeight: "bold" },
                      ]}
                    >
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
                  style={[
                    styles.filterOption,
                    filters.status === status.value && {
                      borderColor: "#0056d2",
                      borderWidth: 2,
                      backgroundColor: "#eaf1fb",
                    },
                  ]}
                  onPress={() => setFilters((prev) => ({ ...prev, status: status.value }))}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      filters.status === status.value && { color: "#0056d2", fontWeight: "bold" },
                    ]}
                  >
                    {status.label}
                  </Text>
                  {filters.status === status.value && <Ionicons name="checkmark" size={20} color="#0056d2" />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filters.categoryId === "" && {
                    borderColor: "#0056d2",
                    borderWidth: 2,
                    backgroundColor: "#eaf1fb",
                  },
                ]}
                onPress={() => setFilters((prev) => ({ ...prev, categoryId: "" }))}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filters.categoryId === "" && { color: "#0056d2", fontWeight: "bold" },
                  ]}
                >
                  All Categories
                </Text>
                {filters.categoryId === "" && <Ionicons name="checkmark" size={20} color="#0056d2" />}
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[
                    styles.filterOption,
                    filters.categoryId === category.categoryId && {
                      borderColor: "#0056d2",
                      borderWidth: 2,
                      backgroundColor: "#eaf1fb",
                    },
                  ]}
                  onPress={() => setFilters((prev) => ({ ...prev, categoryId: category.categoryId }))}
                >
                  <View style={styles.categoryOptionContent}>
                    {/* Removed categoryIcon */}
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.categoryId === category.categoryId && { color: "#0056d2", fontWeight: "bold" },
                      ]}
                    >
                      {category.categoryName}
                    </Text>
                  </View>
                  {filters.categoryId === category.categoryId && (
                    <Ionicons name="checkmark" size={20} color="#0056d2" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: "#0056d2", borderRadius: 8 }]}
              onPress={applyFilters}
            >
              <Text style={[styles.applyButtonText, { color: "#fff", fontWeight: "bold" }]}>Apply Filters</Text>
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
              {LAYOUT_OPTIONS.map((option) => {
                const isActive = layoutMode === option.columns
                return (
                  <TouchableOpacity
                    key={option.columns}
                    style={[
                      styles.layoutOption,
                      isActive && styles.selectedLayoutOption,
                      isActive && { borderColor: "#0056d2", borderWidth: 2, backgroundColor: "#eaf1fb" },
                    ]}
                    onPress={() => {
                      setLayoutMode(option.columns)
                      setShowLayoutModal(false)
                    }}
                  >
                    <View style={[styles.layoutIconContainer, { backgroundColor: isActive ? "#0056d2" : "#F9FAFB" }]}>
                      <Ionicons name={option.icon} size={24} color={isActive ? "#fff" : "#6B7280"} />
                    </View>
                    <Text style={[styles.layoutOptionText, isActive && { color: "#0056d2", fontWeight: "bold" }]}>
                      {option.label}
                    </Text>
                    {isActive && (
                      <View style={styles.layoutCheckmark}>
                        <Ionicons name="checkmark-circle" size={20} color="#0056d2" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderFoodItem = ({ item, index }) => {
    const isSelected = selectedFoods.some((f) => f.foodId === item.foodId)

    if (layoutMode === "quick") {
      return (
        <TouchableOpacity
          key={index}
          style={styles.quickFoodCard}
          onPress={() => navigation.navigate("FoodDetails", { food: item })}
          activeOpacity={0.8}
        >
          <View style={styles.quickFoodInfo}>
            <View style={styles.quickFoodNameRow}>
              <Text style={styles.quickFoodName}>{item.foodName || "Unknown Food"}</Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={16} color="#22C55E" style={styles.quickCheckmark} />
              )}
            </View>
            <Text style={styles.quickFoodDetails}>
              {item.calories || 0} cal, {item.servingSize || 1} {item.servingUnit || "unit"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.quickAddButton}
            onPress={(e) => {
              e.stopPropagation()
              handleAddFoodToMeal(item, true) 
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </TouchableOpacity>
      )
    }

    // Existing grid/list layouts
    const itemWidth =
      layoutMode === 1 ? "100%" : layoutMode === 2 ? "48%" : layoutMode === 3 ? "31%" : layoutMode === 4 ? "23%" : "23%" 
    const imageHeight =
      layoutMode === 1 ? 180 : layoutMode === 2 ? 140 : layoutMode === 3 ? 120 : layoutMode === 4 ? 100 : 100 

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
                e.stopPropagation();
                navigation.navigate("AddFoodScreen", { food: item });
              }}
            >
              <Ionicons
                name={isSelected ? "checkmark-circle" : "add-circle-outline"}
                size={layoutMode > 2 ? 16 : 20}
                color={isSelected ? "#FFFFFF" : "#0056d2"}
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
                  <View style={[styles.macroIconContainer, { backgroundColor: "#DBF4FF" }]}> 
                    <Ionicons name="fitness-outline" size={14} color="#0EA5E9" />
                  </View>
                  <Text style={styles.macroText}>{item.protein || 0}g protein</Text>
                </View>
              )}
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
            <View
              style={[
                styles.enhancedModalHeader,
                {
                  backgroundColor: "#0056d2",
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  paddingVertical: 18,
                  paddingHorizontal: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View
                  style={[
                    styles.modalIconContainer,
                    { backgroundColor: "#fff", borderRadius: 20, marginRight: 12, padding: 6 },
                  ]}
                >
                  <Ionicons name="restaurant" size={22} color="#0056d2" />
                </View>
                <View style={styles.modalHeaderText}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff", letterSpacing: 0.2 }}>
                    Add Food Details
                  </Text>
                  <Text style={{ fontSize: 13, color: "#eaf1fb", marginTop: 2, fontWeight: "500" }}>
                    {food?.foodName} → {mealType}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.modalCloseButton} onPress={handleInputModalCancel}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {/* Input Fields - chỉ giữ lại từ đây */}
            <View style={styles.enhancedModalContentWrapper}>
              <ScrollView
                style={styles.enhancedModalContent}
                contentContainerStyle={styles.enhancedModalContentContainer}
                showsVerticalScrollIndicator={false}
                bounces={true}
              >
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
                        <Text style={styles.nutritionValue}>
                          {Math.round((food?.calories || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}
                        </Text>
                        <Text style={styles.nutritionLabel}>Calories</Text>
                      </View>
                      <View style={styles.nutritionCard}>
                        <Text style={styles.nutritionValue}>
                          {Math.round((food?.protein || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Protein</Text>
                      </View>
                      <View style={styles.nutritionCard}>
                        <Text style={styles.nutritionValue}>
                          {Math.round((food?.carbs || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}g
                        </Text>
                        <Text style={styles.nutritionLabel}>Carbs</Text>
                      </View>
                      <View style={styles.nutritionCard}>
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
                <Ionicons name="checkmark-circle" size={20} color="#6B7280" />
                <Text style={[styles.confirmButtonText, { color: "#fff" }]}>Add to {mealType}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    )
  }


// ...existing code...

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Food "
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: "options-outline",
            onPress: () => setShowFilters(true),
            color: "#0056d2",
          },
          {
            icon: "heart-outline",
            onPress: () => navigation.navigate("FavoriteFoodScreen"),
            color: "#EF4444",
          },
          {
            icon: "play-circle-outline",
            onPress: () => navigation.navigate("FoodDailyLogScreen"),
            color: "#10B981",
          },
        ]}
        backgroundColor="#fff"
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: "#E5E7EB",
          elevation: 2,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        }}
        titleStyle={{
          fontSize: 22,
          fontWeight: "bold",
          color: "#0056d2",
          textAlign: "center",
          letterSpacing: 0.5,
        }}
      />
      <Text
        style={{
          fontSize: 13,
          color: "#6B7280",
          textAlign: "center",
          marginTop: 2,
          fontWeight: "500",
          letterSpacing: 0.1,
          marginBottom: 8,
        }}
      >
        Discover healthy foods & nutrition
      </Text>
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
          <View style={{ marginRight: 8, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          </View>
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
        <TouchableOpacity style={[styles.searchButton, { backgroundColor: "#0056d2" }]} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* New: Food AI Recommend Banner */}
      <Animated.View
        style={[
          styles.sectionContainer, // Use a consistent section container style
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <FoodAIRecommendBanner />
      </Animated.View>

      <View style={styles.categoriesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Food Categories</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.layoutButton} onPress={() => setShowLayoutModal(true)}>
              <Ionicons
                name={LAYOUT_OPTIONS.find((opt) => opt.columns === layoutMode)?.icon || "grid-outline"}
                size={18}
                color="#0056d2"
              />
              <Text style={[styles.layoutButtonText, { color: "#0056d2", fontSize: 15, fontWeight: "bold" }]}>
                {LAYOUT_OPTIONS.find((opt) => opt.columns === layoutMode)?.label || `${layoutMode} col`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
              <Ionicons name="swap-vertical-outline" size={20} color="#0056d2" />
              <Text style={[styles.sortButtonText, { color: "#0056d2", fontSize: 15, fontWeight: "bold" }]}>Sort</Text>
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
      <View style={styles.contentContainer}>
        {loading && !refreshing ? (
          <Animated.View style={{ width: '100%', opacity: 1, transform: [{ translateY: 0 }] }}>
            {/* Only shimmer in food list area, keep header, intro, search, banner, categories visible */}
            <ShimmerCard height={280} style={{ borderRadius: 16, width: '100%' }} />
          </Animated.View>
        ) : error && !refreshing ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchFoods()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={foods}
            renderItem={renderFoodItem}
            keyExtractor={(item, index) => (item.foodId ? `food-${item.foodId}` : `item-${index}`)}
            numColumns={layoutMode === "quick" ? 1 : layoutMode}
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
        )}
      </View>
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
            {/* Pagination removed: all foods shown in one scroll */}
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
  // New style for consistent section padding
  sectionContainer: {
    paddingHorizontal: 16,
    marginBottom: 16, // Added margin for spacing between AI banners
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
    paddingRight: 12,
    paddingLeft: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedCategoryCard: { transform: [{ scale: 1.05 }] },
  categoryGradient: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 4,
    paddingHorizontal: 10,
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
  categoryName: { fontSize: 16, fontWeight: "600", textAlign: "center" }, // Increased font size for better visibility
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
  activeFilterText: { fontSize: 12, color: "#0056d2", fontWeight: "500" },
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
  retryButton: { backgroundColor: "#0056d2", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937" },
  filterContent: { paddingHorizontal: 20, paddingVertical: 16 },
  filterSection: { marginBottom: 24 },
  filterLabel: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 12 },
  filterInput: {
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
    paddingHorizontal: 24,
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
    backgroundColor: "#0056d2",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  // New styles for Quick layout
  quickFoodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickFoodInfo: {
    flex: 1,
    marginRight: 16,
  },
  quickFoodNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  quickFoodName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginRight: 8,
  },
  quickCheckmark: {
    // Styles for the green checkmark
  },
  quickFoodDetails: {
    fontSize: 14,
    color: "#6B7280",
  },
  quickAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
  },
  // Styles for AI Recommend Banner (copied from HomeScreen for consistency)
  aiRecommendBanner: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiRecommendBannerGradient: {
    padding: 20, // Using SPACING constant from HomeScreen
  },
  aiRecommendBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aiRecommendBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiRecommendBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10, // Using SPACING / 2
  },
  aiRecommendBannerText: {},
  aiRecommendBannerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  aiRecommendBannerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  aiRecommendBannerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
})

export default FoodListScreen