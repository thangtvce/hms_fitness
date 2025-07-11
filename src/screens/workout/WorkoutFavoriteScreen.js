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
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { SafeAreaView } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"

const { width,height } = Dimensions.get("window")

const PAGE_SIZE_OPTIONS = [5,10,15,20,25,50]

const SORT_OPTIONS = [
  { label: "Name A-Z",value: "name",icon: "text-outline" },
  { label: "Date Added (Newest)",value: "date-newest",icon: "time-outline" },
  { label: "Date Added (Oldest)",value: "date-oldest",icon: "time-outline" },
  { label: "Category",value: "category",icon: "grid-outline" },
  { label: "Calories (High → Low)",value: "calories-high",icon: "flame-outline" },
  { label: "Calories (Low → High)",value: "calories-low",icon: "flame-outline" },
]

const LAYOUT_OPTIONS = [
  { columns: 1,icon: "list-outline",label: "1 column" },
  { columns: 2,icon: "grid-outline",label: "2 columns" },
  { columns: 3,icon: "apps-outline",label: "3 columns" },
  { columns: 4,icon: "keypad-outline",label: "4 columns" },
]

const WorkoutFavoriteScreen = () => {
  const navigation = useNavigation()
  const [favoriteExercises,setFavoriteExercises] = useState([])
  const [filteredExercises,setFilteredExercises] = useState([])
  const [categories,setCategories] = useState([])
  const [categoryMap,setCategoryMap] = useState({})
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [showFilters,setShowFilters] = useState(false)
  const [showSortModal,setShowSortModal] = useState(false)
  const [selectedCategory,setSelectedCategory] = useState("")
  const [sortBy,setSortBy] = useState("date-newest")
  const [layoutMode,setLayoutMode] = useState(1) 
  const [showLayoutModal,setShowLayoutModal] = useState(false)

  const [currentPage,setCurrentPage] = useState(1)
  const [pageSize,setPageSize] = useState(10)
  const [searchQuery,setSearchQuery] = useState("")

  const [filters,setFilters] = useState({
    searchTerm: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    pageSize: 10,
  })

  const [appliedFilters,setAppliedFilters] = useState({
    searchTerm: "",
    categoryId: "",
    startDate: "",
    endDate: "",
    pageSize: 10,
  })

  const [appliedSearchQuery,setAppliedSearchQuery] = useState("")

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
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
      const storedFavorites = await AsyncStorage.getItem("favoriteExercises")
      const favoriteList = storedFavorites ? JSON.parse(storedFavorites) : []

      const favoritesWithDate = favoriteList.map((exercise) => ({
        ...exercise,
        dateAdded: exercise.dateAdded || new Date().toISOString(),
      }))

      setFavoriteExercises(favoritesWithDate)

      // Extract unique categories
      const uniqueCategories = [...new Set(favoritesWithDate.map((ex) => ex.categoryId).filter(Boolean))]
      const categoryData = uniqueCategories.map((categoryId) => ({
        categoryId,
        categoryName:
          favoritesWithDate.find((ex) => ex.categoryId === categoryId)?.categoryName || `Category ${categoryId}`,
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

  useEffect(() => {
    let filtered = [...favoriteExercises]

    if (selectedCategory) {
      filtered = filtered.filter((exercise) => exercise.categoryId?.toString() === selectedCategory)
    }

    if (appliedSearchQuery) {
      filtered = filtered.filter(
        (exercise) =>
          exercise.exerciseName?.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
          exercise.description?.toLowerCase().includes(appliedSearchQuery.toLowerCase()) ||
          exercise.categoryName?.toLowerCase().includes(appliedSearchQuery.toLowerCase()),
      )
    }

    if (appliedFilters.searchTerm) {
      filtered = filtered.filter(
        (exercise) =>
          exercise.exerciseName?.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase()) ||
          exercise.description?.toLowerCase().includes(appliedFilters.searchTerm.toLowerCase()),
      )
    }

    if (appliedFilters.categoryId) {
      filtered = filtered.filter((exercise) => exercise.categoryId?.toString() === appliedFilters.categoryId)
    }

    if (appliedFilters.startDate) {
      const startDate = new Date(appliedFilters.startDate)
      filtered = filtered.filter((exercise) => {
        const exerciseDate = new Date(exercise.dateAdded || new Date())
        return exerciseDate >= startDate
      })
    }

    if (appliedFilters.endDate) {
      const endDate = new Date(appliedFilters.endDate)
      endDate.setHours(23,59,59,999) 
      filtered = filtered.filter((exercise) => {
        const exerciseDate = new Date(exercise.dateAdded || new Date())
        return exerciseDate <= endDate
      })
    }

    filtered.sort((a,b) => {
      switch (sortBy) {
        case "name":
          return (a.exerciseName || "").localeCompare(b.exerciseName || "")
        case "date-newest":
          return new Date(b.dateAdded || 0) - new Date(a.dateAdded || 0)
        case "date-oldest":
          return new Date(a.dateAdded || 0) - new Date(b.dateAdded || 0)
        case "category":
          return (a.categoryName || "").localeCompare(b.categoryName || "")
        case "calories-high":
          return (b.caloriesBurnedPerMin || 0) - (a.caloriesBurnedPerMin || 0)
        case "calories-low":
          return (a.caloriesBurnedPerMin || 0) - (b.caloriesBurnedPerMin || 0)
        default:
          return 0
      }
    })

    setFilteredExercises(filtered)
  },[favoriteExercises,selectedCategory,appliedSearchQuery,sortBy,appliedFilters])

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

  const getExerciseImage = (exerciseName) => {
    return `https://source.unsplash.com/400x250/?fitness,${exerciseName?.replace(/\s/g,"") || "workout"}`
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

  const handleRemoveFavorite = async (exerciseId) => {
    try {
      const updatedFavorites = favoriteExercises.filter((ex) => ex.exerciseId !== exerciseId)
      setFavoriteExercises(updatedFavorites)
      await AsyncStorage.setItem("favoriteExercises", JSON.stringify(updatedFavorites))
      Alert.alert("Success", "Removed from favorites.")
    } catch (error) {
    }
  }

  const totalPages = Math.ceil(filteredExercises.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedExercises = filteredExercises.slice(startIndex,endIndex)

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
            <Ionicons name="fitness-outline" size={24} color={isSelected ? "#FFFFFF" : "#4F46E5"} />
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
            <Text style={styles.modalTitle}>Sort Favorites</Text>
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
                    style={[styles.pageSizeButton,filters.pageSize === size && styles.selectedPageSize]}
                    onPress={() => setFilters((prev) => ({ ...prev,pageSize: size }))}
                  >
                    <Text style={[styles.pageSizeText,filters.pageSize === size && styles.selectedPageSizeText]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

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
                style={[styles.filterOption,filters.categoryId === "" && styles.selectedOption]}
                onPress={() => setFilters((prev) => ({ ...prev,categoryId: "" }))}
              >
                <Text style={[styles.filterOptionText,filters.categoryId === "" && styles.selectedOptionText]}>
                  All Categories
                </Text>
                {filters.categoryId === "" && <Ionicons name="checkmark" size={20} color="#4F46E5" />}
              </TouchableOpacity>

              {categories.map((category) => (
                <TouchableOpacity
                  key={category.categoryId}
                  style={[
                    styles.filterOption,
                    filters.categoryId === category.categoryId?.toString() && styles.selectedOption,
                  ]}
                  onPress={() => setFilters((prev) => ({ ...prev,categoryId: category.categoryId?.toString() }))}
                >
                  <View style={styles.categoryOptionContent}>
                    <View style={styles.categoryIcon}>
                      <Ionicons name="fitness-outline" size={16} color="#4F46E5" />
                    </View>
                    <Text
                      style={[
                        styles.filterOptionText,
                        filters.categoryId === category.categoryId?.toString() && styles.selectedOptionText,
                      ]}
                    >
                      {category.categoryName}
                    </Text>
                  </View>
                  {filters.categoryId === category.categoryId?.toString() && (
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
            <Text style={styles.layoutDescription}>Select number of columns to display favorites</Text>
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
            Showing {startIndex + 1}-{Math.min(endIndex,filteredExercises.length)} of {filteredExercises.length}{" "}
            favorites
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

  const renderExerciseItem = ({ item,index }) => {
    const itemWidth = layoutMode === 1 ? "100%" : layoutMode === 2 ? "48%" : layoutMode === 3 ? "31%" : "23%"
    const imageHeight = layoutMode === 1 ? 180 : layoutMode === 2 ? 140 : layoutMode === 3 ? 120 : 100

    return (
      <Animated.View
        style={[
          styles.exerciseItem,
          {
            width: itemWidth,
            marginRight: layoutMode > 1 ? "2%" : 0,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("ExerciseDetails",{ exercise: item })}
          activeOpacity={0.8}
          style={styles.exerciseCard}
        >
          <View style={styles.exerciseImageContainer}>
            <Image
              source={{ uri: item.mediaUrl || getExerciseImage(item.exerciseName || "fitness") }}
              style={[styles.exerciseImage,{ height: imageHeight }]}
              resizeMode="cover"
            />
            <LinearGradient colors={["rgba(0,0,0,0)","rgba(0,0,0,0.7)"]} style={styles.exerciseGradient}>
              <Text
                style={[styles.exerciseName,{ fontSize: layoutMode > 2 ? 16 : 20 }]}
                numberOfLines={layoutMode > 2 ? 2 : 1}
              >
                {item.exerciseName || "Unknown Exercise"}
              </Text>
            </LinearGradient>

            {/* Date Added Badge */}
            <View style={styles.dateAddedBadge}>
              <Text style={[styles.dateAddedText,{ fontSize: layoutMode > 2 ? 10 : 12 }]}>
                {formatDate(item.dateAdded)}
              </Text>
            </View>

            <TouchableOpacity style={styles.favoriteButton} onPress={() => handleRemoveFavorite(item.exerciseId)}>
              <Ionicons name="heart" size={layoutMode > 2 ? 16 : 20} color="#EF4444" />
            </TouchableOpacity>
          </View>

          <View style={[styles.exerciseContent,{ padding: layoutMode > 2 ? 12 : 20 }]}>
            <Text
              style={[styles.exerciseDescription,{ fontSize: layoutMode > 2 ? 12 : 14 }]}
              numberOfLines={layoutMode > 2 ? 1 : 2}
            >
              {item.description || "No description available"}
            </Text>

            <View style={[styles.exerciseDetailsContainer,{ gap: layoutMode > 2 ? 8 : 12 }]}>
              <View style={styles.exerciseDetailItem}>
                <View
                  style={[
                    styles.detailIconContainer,
                    { backgroundColor: "#EEF2FF",width: layoutMode > 2 ? 20 : 24,height: layoutMode > 2 ? 20 : 24 },
                  ]}
                >
                  <Ionicons name="grid-outline" size={layoutMode > 2 ? 12 : 14} color="#4F46E5" />
                </View>
                <Text style={[styles.exerciseDetailText,{ fontSize: layoutMode > 2 ? 11 : 13 }]} numberOfLines={1}>
                  {categoryMap[item.categoryId] || `Category ${item.categoryId || "Unknown"}`}
                </Text>
              </View>

              {item.caloriesBurnedPerMin && (
                <View style={styles.exerciseDetailItem}>
                  <View
                    style={[
                      styles.detailIconContainer,
                      { backgroundColor: "#FEF2F2",width: layoutMode > 2 ? 20 : 24,height: layoutMode > 2 ? 20 : 24 },
                    ]}
                  >
                    <Ionicons name="flame-outline" size={layoutMode > 2 ? 12 : 14} color="#EF4444" />
                  </View>
                  <Text style={[styles.exerciseDetailText,{ fontSize: layoutMode > 2 ? 11 : 13 }]}>
                    {item.caloriesBurnedPerMin} kcal/min
                  </Text>
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
          <Text style={styles.loadingText}>Loading favorite exercises...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />

      {/* Header */}
      <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>❤️ Favorite Exercises</Text>
            <Text style={styles.headerSubtitle}>Your saved workout favorites</Text>
          </View>
          <TouchableOpacity style={styles.headerActionButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Search Section */}
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
            placeholder="Search favorite exercises..."
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

      {/* Categories Section */}
      {categories.length > 0 && (
        <View style={styles.categoriesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
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
            keyExtractor={(item) => item.categoryId?.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>
      )}

      {(appliedSearchQuery ||
        appliedFilters.searchTerm ||
        appliedFilters.categoryId ||
        selectedCategory ||
        appliedFilters.startDate ||
        appliedFilters.endDate ||
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

      <View style={styles.contentContainer}>
        <FlatList
          data={paginatedExercises}
          renderItem={renderExerciseItem}
          keyExtractor={(item,index) => {
            return item.exerciseId ? `favorite-${item.exerciseId}` : `item-${index}`
          }}
          numColumns={layoutMode}
          key={layoutMode} 
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
                <Text style={styles.emptyTitle}>No favorite exercises</Text>
                <Text style={styles.emptyText}>
                  {appliedSearchQuery || appliedFilters.searchTerm || appliedFilters.categoryId || selectedCategory
                    ? "No favorites match your search criteria."
                    : "Add exercises to your favorites by tapping the heart icon."}
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => loadFavorites()}>
                  <Text style={styles.retryButtonText}>Refresh</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        {renderPaginationControls()}
      </View>

      {renderFilterModal()}
      {renderSortModal()}
      {renderLayoutModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#4F46E5",
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
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#4F46E5",
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
    color: "#4F46E5",
    fontWeight: "600",
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
  exerciseItem: {
    marginBottom: 20,
  },
  exerciseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  exerciseImageContainer: {
    position: "relative",
  },
  exerciseImage: {
    width: "100%",
    height: 180,
  },
  exerciseGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  exerciseName: {
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
  favoriteButton: {
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
  exerciseContent: {
    padding: 20,
  },
  exerciseDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 16,
  },
  exerciseDetailsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  exerciseDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  exerciseDetailText: {
    fontSize: 13,
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

export default WorkoutFavoriteScreen
