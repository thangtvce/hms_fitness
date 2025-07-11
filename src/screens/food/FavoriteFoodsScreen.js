import { useState,useEffect,useRef } from "react"
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
import AsyncStorage from "@react-native-async-storage/async-storage"
import { LinearGradient } from "expo-linear-gradient"
import Header from "components/Header"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width,height } = Dimensions.get("window")

const PAGE_SIZE_OPTIONS = [5,10,15,20,25,50]

// Sort options for favorite foods
const SORT_OPTIONS = [
  { label: "Name A-Z",value: "name",icon: "text-outline" },
  { label: "Date Added (Newest)",value: "date-newest",icon: "time-outline" },
  { label: "Date Added (Oldest)",value: "date-oldest",icon: "time-outline" },
  { label: "Category",value: "category",icon: "grid-outline" },
  { label: "Calories (High → Low)",value: "calories-high",icon: "flame-outline" },
  { label: "Calories (Low → High)",value: "calories-low",icon: "flame-outline" },
  { label: "Protein (High → Low)",value: "protein-high",icon: "fitness-outline" },
  { label: "Carbs (High → Low)",value: "carbs-high",icon: "nutrition-outline" },
]

const LAYOUT_OPTIONS = [
  { columns: 1,icon: "list-outline",label: "1 column" },
  { columns: 2,icon: "grid-outline",label: "2 columns" },
  { columns: 3,icon: "apps-outline",label: "3 columns" },
  { columns: 4,icon: "keypad-outline",label: "4 columns" },
]

const FavoriteFoodsScreen = () => {
  const navigation = useNavigation()
  const [favoriteFoods,setFavoriteFoods] = useState([])
  const [filteredFoods,setFilteredFoods] = useState([])
  const [categories,setCategories] = useState([])
  const [categoryMap,setCategoryMap] = useState({})
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [showFilters,setShowFilters] = useState(false)
  const [showSortModal,setShowSortModal] = useState(false)
  const [selectedCategory,setSelectedCategory] = useState("")
  const [sortBy,setSortBy] = useState("date-newest")
  const [layoutMode,setLayoutMode] = useState(1) // 1, 2, 3, 4 columns
  const [showLayoutModal,setShowLayoutModal] = useState(false)
  const [selectedFoods,setSelectedFoods] = useState([])

  const [currentPage,setCurrentPage] = useState(1)
  const [pageSize,setPageSize] = useState(10)
  const [searchQuery,setSearchQuery] = useState("")

  const [filters,setFilters] = useState({
    searchTerm: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    minCalories: "",
    maxCalories: "",
    pageSize: 10,
  })

  // Applied filters - only these are used for filtering
  const [appliedFilters,setAppliedFilters] = useState({
    searchTerm: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    minCalories: "",
    maxCalories: "",
    pageSize: 10,
  })

  // Applied search query - only this is used for filtering
  const [appliedSearchQuery,setAppliedSearchQuery] = useState("")

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start()
  },[])

  const loadFavorites = async () => {
    try {
      setLoading(true)
      const storedFavorites = await AsyncStorage.getItem("favoriteFoods")
      const favoriteList = storedFavorites ? JSON.parse(storedFavorites) : []

      // Add dateAdded if not present (for existing favorites)
      const favoritesWithDate = favoriteList.map((food) => ({
        ...food,
        dateAdded: food.dateAdded || new Date().toISOString(),
      }))

      setFavoriteFoods(favoritesWithDate)

      // Extract unique categories
      const uniqueCategories = [...new Set(favoritesWithDate.map((food) => food.categoryId).filter(Boolean))]
      const categoryData = uniqueCategories.map((categoryId) => ({
        categoryId,
        categoryName:
          favoritesWithDate.find((food) => food.categoryId === categoryId)?.categoryName || `Category ${categoryId}`,
      }))

      setCategories(categoryData)

      const map = categoryData.reduce((acc,category) => {
        acc[category.categoryId] = category.categoryName
        return acc
      },{})
      setCategoryMap(map)
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()
  },[])

  // Filter and sort foods
  useEffect(() => {
    let filtered = [...favoriteFoods]

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((food) => food.categoryId?.toString() === selectedCategory)
    }

    // Filter by search query
    if (appliedSearchQuery) {
      filtered = filtered.filter(
        (food) =>
          food.foodName?.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
          food.description?.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
          food.categoryName?.toLowerCase().includes(appliedSearchQuery.toLowerCase()),
      )
    }

    // Apply additional filters
    if (appliedFilters.searchTerm) {
      filtered = filtered.filter(
        (food) =>
          food.foodName?.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase()) ||
          food.description?.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase()),
      )
    }

    if (appliedFilters.categoryId) {
      filtered = filtered.filter((food) => food.categoryId?.toString() === appliedFilters.categoryId)
    }

    // Filter by calorie range
    if (appliedFilters.minCalories) {
      filtered = filtered.filter((food) => (food.calories || 0) >= Number.parseInt(appliedFilters.minCalories))
    }

    if (appliedFilters.maxCalories) {
      filtered = filtered.filter((food) => (food.calories || 0) <= Number.parseInt(appliedFilters.maxCalories))
    }

    // Filter by date range
    if (appliedFilters.startDate) {
      const startDate = new Date(appliedFilters.startDate)
      filtered = filtered.filter((food) => {
        const foodDate = new Date(food.dateAdded || new Date())
        return foodDate >= startDate
      })
    }

    if (appliedFilters.endDate) {
      const endDate = new Date(appliedFilters.endDate)
      endDate.setHours(23,59,59,999) // Include the entire end date
      filtered = filtered.filter((food) => {
        const foodDate = new Date(food.dateAdded || new Date())
        return foodDate <= endDate
      })
    }

    // Sort foods
    filtered.sort((a,b) => {
      switch (sortBy) {
        case "name":
          return (a.foodName || "").localeCompare(b.foodName || "")
        case "date-newest":
          return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
        case "date-oldest":
          return new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0)
        case "category":
          return (a.categoryName || "").localeCompare(b.categoryName || "")
        case "calories-high":
          return (b.calories || 0) - (a.calories || 0)
        case "calories-low":
          return (a.calories || 0) - (b.calories || 0)
        case "protein-high":
          return (b.protein || 0) - (a.protein || 0)
        case "carbs-high":
          return (b.carbs || 0) - (a.carbs || 0)
        default:
          return 0
      }
    })

    setFilteredFoods(filtered)
  },[favoriteFoods,selectedCategory,appliedSearchQuery,sortBy,appliedFilters])

  const onRefresh = () => {
    setRefreshing(true)
    loadFavorites().finally(() => setRefreshing(false))
  }

  const handleSearch = () => {
    setAppliedSearchQuery(searchQuery)
    setCurrentPage(1)
  }

  const applyFilters = () => {
    setAppliedFilters({ ...filters })
    setShowFilters(false)
    setCurrentPage(1)
  }

  const resetFilters = () => {
    const resetState = {
      searchTerm: "",
      categoryId: "",
      startDate: "",
      endDate: "",
      minCalories: "",
      maxCalories: "",
      pageSize: 10,
    }

    setFilters(resetState)
    setAppliedFilters(resetState)
    setSearchQuery("")
    setAppliedSearchQuery("")
    setSelectedCategory("")
    setSortBy("date-newest")
    setCurrentPage(1)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setAppliedSearchQuery("")
    setCurrentPage(1)
  }

  // Handle food selection
  const handleSelectFood = (food) => {
    setSelectedFoods((prev) => {
      const exists = prev.find((f) => f.foodId === food.foodId)
      if (exists) {
        return prev.filter((f) => f.foodId !== food.foodId)
      }
      return [...prev,food]
    })
  }

  // Remove from favorites
  const handleRemoveFavorite = async (foodId) => {
    try {
      const updatedFavorites = favoriteFoods.filter((f) => f.foodId !== foodId)
      setFavoriteFoods(updatedFavorites)
      await AsyncStorage.setItem("favoriteFoods", JSON.stringify(updatedFavorites))
      Alert.alert("Success", "Removed from favorites.")
    } catch (error) {
    }
  }

  const getFoodImage = (foodName) => {
    return `https://source.unsplash.com/400x250/?food,${foodName?.replace(/\s/g,"") || "healthy"}`
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown"
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US",{
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  // Pagination
  const totalPages = Math.ceil(filteredFoods.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedFoods = filteredFoods.slice(startIndex,endIndex)

  // Render category item
  const renderCategoryItem = ({ item }) => {
    const isSelected = selectedCategory === item.categoryId?.toString()
    return (
      <TouchableOpacity
        style={[styles.categoryCard,isSelected && styles.selectedCategoryCard]}
        onPress={() => {
          setSelectedCategory(isSelected ? "" : item.categoryId?.toString())
          setCurrentPage(1)
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isSelected ? ["#4F46E5","#6366F1"] : ["#F8FAFC","#F1F5F9"]}
          style={styles.categoryGradient}
        >
          <View style={styles.categoryIconContainer}>
            <Ionicons name="restaurant-outline" size={24} color={isSelected ? "#FFFFFF" : "#4F46E5"} />
          </View>
          <Text style={[styles.categoryName,{ color: isSelected ? "#FFFFFF" : "#1E293B" }]}>{item.categoryName}</Text>
          {isSelected && (
            <View style={styles.selectedIndicator}>
              <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    )
  }

  // Render sort modal
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
            <Text style={styles.modalTitle}>Sort Favorite Foods</Text>
            <TouchableOpacity onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sortContent}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.sortOption,sortBy === option.value && styles.selectedSortOption]}
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
                  <Text style={[styles.sortOptionText,sortBy === option.value && styles.selectedSortOptionText]}>
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
            {/* Search Term */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Search Term</Text>
              <TextInput
                style={styles.filterInput}
                placeholder="Enter search term..."
                value={filters.searchTerm}
                onChangeText={(value) => setFilters((prev) => ({ ...prev,searchTerm: value }))}
              />
            </View>

            {/* Page Size */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Items per page</Text>
              <View style={styles.pageSizeContainer}>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.pageSizeButton,
                      filters.pageSize === size && {
                        backgroundColor: '#eaf1fb',
                        borderColor: '#0056d2',
                        borderWidth: 2,
                      },
                    ]}
                    onPress={() => setFilters((prev) => ({ ...prev,pageSize: size }))}
                  >
                    <Text style={[
                      styles.pageSizeText,
                      filters.pageSize === size && { color: '#0056d2', fontWeight: 'bold' },
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Calorie Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Calorie Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Min Calories</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="0"
                    value={filters.minCalories}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev,minCalories: value }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Max Calories</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="1000"
                    value={filters.maxCalories}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev,maxCalories: value }))}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Date Added Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={filters.startDate}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev,startDate: value }))}
                  />
                </View>
                <View style={styles.dateInputContainer}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={filters.endDate}
                    onChangeText={(value) => setFilters((prev) => ({ ...prev,endDate: value }))}
                  />
                </View>
              </View>
            </View>

            {/* Categories */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  filters.categoryId === "" && {
                    backgroundColor: '#eaf1fb',
                    borderColor: '#0056d2',
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setFilters((prev) => ({ ...prev,categoryId: "" }))}
              >
                <Text style={[
                  styles.filterOptionText,
                  filters.categoryId === "" && { color: '#0056d2', fontWeight: 'bold' },
                ]}>
                  All Categories
                </Text>
                {filters.categoryId === "" && <Ionicons name="checkmark" size={20} color="#0056d2" />}
              </TouchableOpacity>

              {categories.map((category) => (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[
                    styles.filterOption,
                    filters.categoryId === category.categoryId?.toString() && {
                      backgroundColor: '#eaf1fb',
                      borderColor: '#0056d2',
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => setFilters((prev) => ({ ...prev,categoryId: category.categoryId?.toString() }))}
                >
                  <View style={styles.categoryOptionContent}>
                    <View style={styles.categoryIcon}>
                      <Ionicons name="restaurant-outline" size={16} color="#0056d2" />
                    </View>
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.categoryId === category.categoryId?.toString() && { color: '#0056d2', fontWeight: 'bold' },
                      ]}
                    >
                      {category.categoryName}
                    </Text>
                  </View>
                  {filters.categoryId === category.categoryId?.toString() && (
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
            <TouchableOpacity style={[styles.applyButton, { backgroundColor: '#0056d2' }]} onPress={applyFilters}>
              <Text style={[styles.applyButtonText, { color: '#fff', fontWeight: 'bold' }]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  // Render layout modal
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
            <Text style={styles.layoutDescription}>Select number of columns to display favorite foods</Text>
            <View style={styles.layoutGrid}>
              {LAYOUT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.columns}
                  style={[styles.layoutOption,layoutMode === option.columns && styles.selectedLayoutOption]}
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
                    style={[styles.layoutOptionText,layoutMode === option.columns && styles.selectedLayoutOptionText]}
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

  const renderPaginationControls = () => {
    if (totalPages <= 1) return null

    const pageNumbers = []
    const maxVisiblePages = 5
    let startPage = Math.max(1,currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages,startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1,endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i)
    }

    return (
      <View style={styles.paginationContainer}>
        <View style={styles.paginationInfo}>
          <Text style={styles.paginationText}>
            Showing {startIndex + 1}-{Math.min(endIndex,filteredFoods.length)} of {filteredFoods.length} favorite foods
          </Text>
        </View>

        <View style={styles.paginationControls}>
          <TouchableOpacity
            style={[styles.paginationButton,currentPage === 1 && styles.paginationButtonDisabled]}
            onPress={() => setCurrentPage(Math.max(1,currentPage - 1))}
            disabled={currentPage === 1}
          >
            <Ionicons name="chevron-back" size={16} color={currentPage === 1 ? "#9CA3AF" : "#4F46E5"} />
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pageNumbersContainer}>
            {startPage > 1 && (
              <>
                <TouchableOpacity style={styles.pageNumberButton} onPress={() => setCurrentPage(1)}>
                  <Text style={styles.pageNumberText}>1</Text>
                </TouchableOpacity>
                {startPage > 2 && <Text style={styles.paginationEllipsis}>...</Text>}
              </>
            )}

            {pageNumbers.map((pageNum) => (
              <TouchableOpacity
                key={pageNum}
                style={[styles.pageNumberButton,currentPage === pageNum && styles.pageNumberButtonActive]}
                onPress={() => setCurrentPage(pageNum)}
              >
                <Text style={[styles.pageNumberText,currentPage === pageNum && styles.pageNumberTextActive]}>
                  {pageNum}
                </Text>
              </TouchableOpacity>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <Text style={styles.paginationEllipsis}>...</Text>}
                <TouchableOpacity style={styles.pageNumberButton} onPress={() => setCurrentPage(totalPages)}>
                  <Text style={styles.pageNumberText}>{totalPages}</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.paginationButton,currentPage === totalPages && styles.paginationButtonDisabled]}
            onPress={() => setCurrentPage(Math.min(totalPages,currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <Ionicons name="chevron-forward" size={16} color={currentPage === totalPages ? "#9CA3AF" : "#4F46E5"} />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderFoodItem = ({ item,index }) => {
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
          onPress={() => navigation.navigate("FoodDetails",{ food: item })}
          activeOpacity={0.8}
          style={[styles.foodCard,isSelected && styles.selectedFoodCard]}
        >
          <View style={styles.foodImageContainer}>
            <Image
              source={{ uri: item.image || getFoodImage(item.foodName || "food") }}
              style={[styles.foodImage,{ height: imageHeight }]}
              resizeMode="cover"
            />
            <LinearGradient colors={["rgba(0,0,0,0)","rgba(0,0,0,0.7)"]} style={styles.foodGradient}>
              <Text
                style={[styles.foodName,{ fontSize: layoutMode > 2 ? 16 : 20 }]}
                numberOfLines={layoutMode > 2 ? 2 : 1}
              >
                {item.foodName || "Unknown Food"}
              </Text>
            </LinearGradient>

            {/* Date Added Badge */}
            <View style={styles.dateAddedBadge}>
              <Text style={[styles.dateAddedText,{ fontSize: layoutMode > 2 ? 10 : 12 }]}>
                {formatDate(item.dateAdded)}
              </Text>
            </View>

            {/* Calories Badge */}
            <View style={styles.caloriesBadge}>
              <Text style={[styles.caloriesText,{ fontSize: layoutMode > 2 ? 10 : 12 }]}>
                {item.calories || 0} kcal
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.selectionButton,
                { width: layoutMode > 2 ? 28 : 36,height: layoutMode > 2 ? 28 : 36 },
                isSelected && styles.selectedButton,
              ]}
              onPress={(e) => {
                e.stopPropagation()
                handleRemoveFavorite(item.foodId)
              }}
            >
              <Ionicons name="heart" size={layoutMode > 2 ? 16 : 20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={[styles.foodContent,{ padding: layoutMode > 2 ? 12 : 20 }]}>
            <Text style={[styles.foodCategory,{ fontSize: layoutMode > 2 ? 11 : 13 }]} numberOfLines={1}>
              {categoryMap[item.categoryId] || `Category ${item.categoryId || "Unknown"}`}
            </Text>

            <View style={[styles.macrosContainer,{ gap: layoutMode > 2 ? 8 : 12 }]}>
              <View style={styles.macroItem}>
                <View
                  style={[
                    styles.macroIconContainer,
                    { backgroundColor: "#EEF2FF",width: layoutMode > 2 ? 20 : 24,height: layoutMode > 2 ? 20 : 24 },
                  ]}
                >
                  <Ionicons name="fitness-outline" size={layoutMode > 2 ? 12 : 14} color="#4F46E5" />
                </View>
                <Text style={[styles.macroText,{ fontSize: layoutMode > 2 ? 10 : 12 }]}>
                  {item.protein || 0}g protein
                </Text>
              </View>

              {layoutMode <= 2 && (
                <View style={styles.macroItem}>
                  <View style={[styles.macroIconContainer,{ backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="nutrition-outline" size={14} color="#EF4444" />
                  </View>
                  <Text style={styles.macroText}>{item.carbs || 0}g carbs</Text>
                </View>
              )}

              {layoutMode <= 2 && (
                <View style={styles.macroItem}>
                  <View style={[styles.macroIconContainer,{ backgroundColor: "#FFFBEB" }]}>
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading favorite foods...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      {/* Header */}
      <Header
        title="🍎 Favorite Foods"
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: 'options-outline',
            onPress: () => setShowFilters(true),
            color: '#0056d2',
          },
        ]}
        backgroundColor="#fff"
        containerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: '#E5E7EB',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
        }}
        titleStyle={{
          fontSize: 22,
          fontWeight: 'bold',
          color: '#0056d2',
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      />
      <Text style={{
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 2,
        fontWeight: '500',
        letterSpacing: 0.1,
        marginBottom: 8,
      }}>
        Your saved food favorites
      </Text>

      {/* Search Section */}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            marginTop: 50, // Cách header 50px
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search favorite foods..."
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

        <TouchableOpacity style={[styles.searchButton, { backgroundColor: '#0056d2' }]} onPress={handleSearch}>
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>

      {/* Categories Section */}
      {categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.layoutButton} onPress={() => setShowLayoutModal(true)}>
                <Ionicons
                  name={LAYOUT_OPTIONS.find((opt) => opt.columns === layoutMode)?.icon || "grid-outline"}
                  size={20}
                  color="#0056d2"
                />
                <Text style={[styles.layoutButtonText, { color: '#0056d2', fontSize: 15, fontWeight: 'bold' }]}>{layoutMode} col</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
                <Ionicons name="swap-vertical-outline" size={20} color="#0056d2" />
                <Text style={[styles.sortButtonText, { color: '#0056d2', fontSize: 15, fontWeight: 'bold' }]}>Sort</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.categoryId?.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

      {/* Selected Foods Section */}
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

      {/* Active Filters Indicator */}
      {(appliedSearchQuery ||
        appliedFilters.searchTerm ||
        appliedFilters.categoryId ||
        selectedCategory ||
        appliedFilters.startDate ||
        appliedFilters.endDate ||
        appliedFilters.minCalories ||
        appliedFilters.maxCalories ||
        sortBy !== "date-newest") && (
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
              {sortBy !== "date-newest" && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    Sort: {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
                  </Text>
                </View>
              )}
              {(appliedFilters.minCalories || appliedFilters.maxCalories) && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    Calories: {appliedFilters.minCalories || 0}-{appliedFilters.maxCalories || "∞"}
                  </Text>
                </View>
              )}
              {(appliedFilters.startDate || appliedFilters.endDate) && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterText}>
                    Date: {appliedFilters.startDate || "Start"} - {appliedFilters.endDate || "End"}
                  </Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.clearAllFiltersButton} onPress={resetFilters}>
              <Text style={styles.clearAllFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}

      {/* Content Container */}
      <View style={styles.contentContainer}>
        <FlatList
          data={paginatedFoods}
          renderItem={renderFoodItem}
          keyExtractor={(item,index) => {
            return item.foodId ? `favorite-${item.foodId}` : `item-${index}`
          }}
          numColumns={layoutMode}
          key={layoutMode} // Force re-render when columns change
          contentContainerStyle={[styles.listContainer,{ minHeight: height - 400 }]}
          style={styles.flatListStyle}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} tintColor="#4F46E5" />
          }
          showsVerticalScrollIndicator={false}
          bounces={true}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No favorite foods</Text>
                <Text style={styles.emptyText}>
                  {appliedSearchQuery || appliedFilters.searchTerm || appliedFilters.categoryId || selectedCategory
                    ? "No favorites match your search criteria."
                    : "Add foods to your favorites by tapping the heart icon."}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadFavorites()}>
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        {/* Pagination Controls */}
        {renderPaginationControls()}
      </View>

      {renderFilterModal()}
      {renderSortModal()}
      {renderLayoutModal()}
    </SafeAreaView>
  )
}

// Styles (same as WorkoutFavoriteScreen with food-specific modifications)
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 2,
  },
  headerActionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  searchContainer: {
    backgroundColor: "#F8FAFC",
    marginTop: -10,
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
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 16,
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  // Categories Section
  categoriesSection: {
    backgroundColor: "#F8FAFC",
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  layoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  layoutButtonText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sortButtonText: {
    fontSize: 14,
    color: "#4F46E5",
    fontWeight: "500",
    marginLeft: 4,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryCard: {
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedCategoryCard: {
    transform: [{ scale: 1.05 }],
  },
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
  categoryName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  // Selected Foods Section
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
  selectedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  clearSelectedText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
  },
  selectedScroll: {
    paddingHorizontal: 16,
  },
  selectedFoodChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedFoodImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  selectedFoodName: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
    maxWidth: 80,
  },
  removeSelectedButton: {
    marginLeft: 8,
    padding: 2,
  },
  // Sort Modal
  sortModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.6,
  },
  sortContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
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
  selectedSortOption: {
    backgroundColor: "#eaf1fb",
    borderWidth: 2,
    borderColor: "#0056d2",
  },
  sortOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sortOptionText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedSortOptionText: {
    color: "#0056d2",
    fontWeight: "bold",
    fontSize: 16,
  },
  activeFiltersContainer: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  activeFiltersScroll: {
    flex: 1,
  },
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
  activeFilterText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  clearAllFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllFiltersText: {
    fontSize: 12,
    color: "#EF4444",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  flatListStyle: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  // Pagination Styles
  paginationContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  paginationInfo: {
    alignItems: "center",
    marginBottom: 12,
  },
  paginationText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  paginationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
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
  paginationButtonDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
  },
  pageNumbersContainer: {
    maxWidth: width * 0.6,
  },
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
  pageNumberButtonActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  pageNumberText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  pageNumberTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  paginationEllipsis: {
    fontSize: 14,
    color: "#9CA3AF",
    paddingHorizontal: 8,
    alignSelf: "center",
  },
  // Page Size Styles
  pageSizeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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
  selectedPageSize: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  pageSizeText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedPageSizeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  foodItem: {
    marginBottom: 20,
  },
  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  selectedFoodCard: {
    borderWidth: 2,
    borderColor: "#4F46E5",
  },
  foodImageContainer: {
    position: "relative",
  },
  foodImage: {
    width: "100%",
    height: 180,
  },
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
  foodName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  dateAddedBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#10B981",
  },
  dateAddedText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  caloriesBadge: {
    position: "absolute",
    top: 16,
    right: 60,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F59E0B",
  },
  caloriesText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  selectionButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedButton: {
    backgroundColor: "#EF4444",
  },
  foodContent: {
    padding: 20,
  },
  foodCategory: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 12,
  },
  macrosContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  macroIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  macroText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    minHeight: height * 0.4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    fontSize: 16,
    color: "#4F46E5",
    fontWeight: "500",
  },
  retryButton: {
    backgroundColor: "#4F46E5",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
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
  selectedOption: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#4F46E5",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  selectedOptionText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  categoryOptionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
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
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  // Layout Modal
  layoutModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.4,
  },
  layoutContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  layoutDescription: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  layoutGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    gap: 12,
  },
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
  selectedLayoutOption: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  layoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  layoutOptionText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    textAlign: "center",
  },
  selectedLayoutOptionText: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  layoutCheckmark: {
    position: "absolute",
    top: 4,
    right: 4,
  },
})

export default FavoriteFoodsScreen
