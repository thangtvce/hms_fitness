"use client"

import { useState, useEffect, useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  TextInput,
} from "react-native"
import MaterialIcons from "react-native-vector-icons/MaterialIcons"
import IconCommunity from "react-native-vector-icons/MaterialCommunityIcons"
import IconFeather from "react-native-vector-icons/Feather"
import IconAntDesign from "react-native-vector-icons/AntDesign"
import { LinearGradient } from "expo-linear-gradient"
import { useNavigation, useRoute } from "@react-navigation/native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { foodService } from "services/apiFoodService"
import { apiUserService } from "services/apiUserService"
import RenderHtml from "react-native-render-html"
import { StatusBar } from "expo-status-bar"
import { addFoodToLog } from "utils/foodLogStorage"
import dayjs from "dayjs"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"

const { width, height } = Dimensions.get("window")
const SPACING = 16
const MIN_SERVING = 1
const MAX_SERVING = 2000
const MIN_PORTION = 1
const MAX_PORTION = 10

const FoodDetailsScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { food } = route.params
  const [isFavorite, setIsFavorite] = useState(false)
  const [relatedFoods, setRelatedFoods] = useState([])
  const [isLoadingRelated, setIsLoadingRelated] = useState(true)
  const [inputModalVisible, setInputModalVisible] = useState(false)
  const [inputValues, setInputValues] = useState({ portionSize: "1", servingSize: "1" })
  const [pendingAddFood, setPendingAddFood] = useState(null)
  const [foodReviews, setFoodReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [userNamesMap, setUserNamesMap] = useState({})

  // Rating modal states
  const [ratingModalVisible, setRatingModalVisible] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingNote, setRatingNote] = useState("")
  const [ratingLoading, setRatingLoading] = useState(false)
  const [existingReview, setExistingReview] = useState(null)

  // Animation refs
  const modalScale = useRef(new Animated.Value(0)).current
  const modalOpacity = useRef(new Animated.Value(0)).current
  const starAnimations = useRef([...Array(5)].map(() => new Animated.Value(1))).current

  // Filter states
  const [starFilter, setStarFilter] = useState(0) // 0: all, 1-5: filter by star

  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const favorites = await AsyncStorage.getItem("favoriteFoods")
        const favoriteList = favorites ? JSON.parse(favorites) : []
        const isFav = favoriteList.some((item) => item.foodName === food.foodName)
        setIsFavorite(isFav)
      } catch (error) {}
    }
    checkFavorite()

    const fetchFoods = async () => {
      try {
        setIsLoadingRelated(true)
        const response = await foodService.getRelatedFoods({ foodId: food?.foodId })
        if (response && response.statusCode === 200) {
          const foodsData = Array.isArray(response.data.foods)
            ? response.data.foods
            : Array.isArray(response.data)
              ? response.data
              : []
          setRelatedFoods([...foodsData])
        }
      } catch (err) {
        setRelatedFoods([])
      } finally {
        setIsLoadingRelated(false)
      }
    }
    fetchFoods()
  }, [food.foodName])

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

  // Rating modal animation
  useEffect(() => {
    if (ratingModalVisible) {
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
  }, [ratingModalVisible])

  const toggleFavorite = async () => {
    try {
      const favorites = await AsyncStorage.getItem("favoriteFoods")
      let favoriteList = favorites ? JSON.parse(favorites) : []
      if (isFavorite) {
        favoriteList = favoriteList.filter((item) => item.foodName !== food.foodName)
        await AsyncStorage.setItem("favoriteFoods", JSON.stringify(favoriteList))
        setIsFavorite(false)
        showSuccessMessage("Removed from favorites successfully")
      } else {
        favoriteList.push(food)
        await AsyncStorage.setItem("favoriteFoods", JSON.stringify(favoriteList))
        setIsFavorite(true)
        showSuccessMessage("Added to favorites successfully")
      }
    } catch (error) {
      showErrorFetchAPI(error)
    }
  }

  const handleAddFoodToMeal = () => {
    navigation.navigate("AddFoodScreen", { food })
  }

  const handleInputModalOk = async () => {
    const { food, mealType } = pendingAddFood || {}
    if (!food || !mealType) {
      return
    }
    const { portionSize, servingSize } = inputValues
    const parsedServingSize = Number.parseFloat(servingSize) || 1
    const parsedPortionSize = Number.parseFloat(portionSize) || 1
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
        satisfactionRating: 1,
        notes: "",
        consumptionDate: today,
        image: food.image || food.foodImage || food.imageUrl || "",
      }
      await addFoodToLog(today, mealType, logData)
      showSuccessMessage(`Added ${food.foodName} to ${mealType} log with ${parsedServingSize} serving(s)!`)
      setInputModalVisible(false)
      setPendingAddFood(null)
    } catch (error) {
      showErrorFetchAPI(error)
    }
  }

  const handleInputModalCancel = () => {
    setInputModalVisible(false)
    setPendingAddFood(null)
  }

  // Rating functions
  const handleOpenRating = () => {
    // Check if user already has a review for this food
    const userReview = foodReviews.find((review) => review.userId === "current_user_id") // Replace with actual user ID
    if (userReview) {
      setExistingReview(userReview)
      setRatingValue(userReview.satisfactionRating || 0)
      setRatingNote(userReview.notes || "")
    } else {
      setExistingReview(null)
      setRatingValue(0)
      setRatingNote("")
    }
    setRatingModalVisible(true)
  }

  const animateStar = (index) => {
    Animated.sequence([
      Animated.timing(starAnimations[index], {
        toValue: 1.3,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(starAnimations[index], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleSubmitRating = async () => {
    if (ratingValue === 0) {
      Alert.alert("Error", "Please select a rating")
      return
    }
    setRatingLoading(true)
    try {
      // Here you would typically save to your backend
      // For now, we'll simulate the API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const newReview = {
        userId: "current_user_id", // Replace with actual user ID
        foodId: food.foodId,
        satisfactionRating: ratingValue,
        notes: ratingNote,
        createdAt: new Date().toISOString(),
        userName: "Current User", // Replace with actual user name
      }
      if (existingReview) {
        // Update existing review
        const updatedReviews = foodReviews.map((review) => (review.userId === "current_user_id" ? newReview : review))
        setFoodReviews(updatedReviews)
        showSuccessMessage("Review updated successfully!")
      } else {
        // Add new review
        setFoodReviews([newReview, ...foodReviews])
        showSuccessMessage("Review submitted successfully!")
      }
      setRatingModalVisible(false)
      setRatingValue(0)
      setRatingNote("")
      setExistingReview(null)
    } catch (error) {
      showErrorFetchAPI(error)
    } finally {
      setRatingLoading(false)
    }
  }

  // Updated nutrition items for the new layout
  const nutritionItems = [
    { name: "Calories", value: `${food.calories} kcal`, key: "calories" },
    { name: "Carbs", value: `${food.carbs || 0} g`, key: "carbs" },
    { name: "Protein", value: `${food.protein || 0} g`, key: "protein" },
    { name: "Fat", value: `${food.fats || 0} g`, key: "fats" },
  ]

  const certifications = [
    { name: "USDA Organic", icon: "eco", color: "#4CAF50" },
    { name: "Non-GMO", icon: "verified", color: "#2196F3" },
    { name: "Heart Healthy", icon: "favorite", color: "#E91E63" },
    { name: "Gluten Free", icon: "no-meals", color: "#FF9800" },
  ]

  // HTML rendering configuration
  const htmlStyles = {
    body: {
      fontSize: 15,
      lineHeight: 24,
      color: "#4A5568",
      fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
    },
    p: {
      marginBottom: 12,
      fontSize: 15,
      lineHeight: 24,
      color: "#4A5568",
    },
    strong: {
      fontWeight: "700",
      color: "#1A1F36",
    },
    b: {
      fontWeight: "700",
      color: "#1A1F36",
    },
    em: {
      fontStyle: "italic",
    },
    i: {
      fontStyle: "italic",
    },
    ul: {
      marginBottom: 12,
    },
    ol: {
      marginBottom: 12,
    },
    li: {
      fontSize: 15,
      lineHeight: 22,
      color: "#4A5568",
      marginBottom: 6,
    },
    h1: {
      fontSize: 20,
      fontWeight: "700",
      color: "#1A1F36",
      marginBottom: 12,
    },
    h2: {
      fontSize: 18,
      fontWeight: "700",
      color: "#1A1F36",
      marginBottom: 10,
    },
    h3: {
      fontSize: 16,
      fontWeight: "600",
      color: "#1A1F36",
      marginBottom: 8,
    },
    a: {
      color: "#5E72E4",
      textDecorationLine: "underline",
    },
  }
  const htmlTagsStyles = {
    body: htmlStyles.body,
    p: htmlStyles.p,
    strong: htmlStyles.strong,
    b: htmlStyles.b,
    em: htmlStyles.em,
    i: htmlStyles.i,
    ul: htmlStyles.ul,
    ol: htmlStyles.ol,
    li: htmlStyles.li,
    h1: htmlStyles.h1,
    h2: htmlStyles.h2,
    h3: htmlStyles.h3,
    a: htmlStyles.a,
  }

  const renderCertificationBadge = ({ item }) => (
    <View style={[styles.certificationBadge, { borderColor: item.color }]}>
      <MaterialIcons name={item.icon} size={16} color={item.color} />
      <Text style={[styles.certificationText, { color: item.color }]}>{item.name}</Text>
    </View>
  )

  const renderRelatedFood = ({ item }) => (
    <TouchableOpacity style={styles.relatedFoodItem} onPress={() => navigation.push("FoodDetails", { food: item })}>
      <Image source={{ uri: item.image }} style={styles.relatedFoodImage} resizeMode="cover" />
      <View style={styles.relatedFoodContent}>
        <Text style={styles.relatedFoodCategory}>{item.categoryName}</Text>
        <Text style={styles.relatedFoodName}>{item.foodName}</Text>
        <View style={styles.relatedFoodNutrition}>
          <View style={styles.relatedNutritionItem}>
            <MaterialIcons name="local-fire-department" size={14} color="#FF6B35" />
            <Text style={styles.relatedNutritionText}>{item.calories} kcal</Text>
          </View>
          <View style={styles.relatedNutritionItem}>
            <MaterialIcons name="fitness-center" size={14} color="#5E72E4" />
            <Text style={styles.relatedNutritionText}>{item.protein}g</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )

  const renderLoadingItem = () => (
    <View style={styles.loadingItem}>
      <View style={styles.loadingImagePlaceholder}>
        <ActivityIndicator size="small" color="#5E72E4" />
      </View>
      <View style={styles.loadingContent}>
        <View style={styles.loadingTextLine} />
        <View style={[styles.loadingTextLine, { width: "60%", marginTop: 8 }]} />
        <View style={[styles.loadingTextLine, { width: "40%", marginTop: 8 }]} />
      </View>
    </View>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <MaterialIcons name="restaurant" size={48} color="#8898AA" />
      <Text style={styles.emptyStateTitle}>No Related Foods</Text>
      <Text style={styles.emptyStateSubtitle}>We couldn't find any related foods at the moment.</Text>
    </View>
  )

  const renderRelatedFoodsContent = () => {
    if (isLoadingRelated) {
      return (
        <FlatList
          data={[1, 2]}
          renderItem={renderLoadingItem}
          keyExtractor={(item, index) => `loading-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.relatedFoodsContainer}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      )
    }
    if (relatedFoods.length === 0) {
      return renderEmptyState()
    }
    return (
      <FlatList
        data={relatedFoods}
        renderItem={renderRelatedFood}
        keyExtractor={(item) => item.foodId.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.relatedFoodsContainer}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    )
  }

  // Function to check if content contains HTML tags
  const containsHTML = (str) => {
    return /<[a-z][\s\S]*>/i.test(str)
  }

  // Function to render description content
  const renderDescription = () => {
    const description =
      food.description ||
      `${food.foodName} is a delicious and nutritious option with ${food.calories} calories. This food is rich in antioxidants that support immune system, contains high fiber content that promotes digestive health, and provides essential vitamins and minerals. It supports heart health and circulation, and may help reduce inflammation in the body.`
    if (containsHTML(description)) {
      return (
        <RenderHtml
          contentWidth={width - SPACING * 4}
          source={{ html: description }}
          tagsStyles={htmlTagsStyles}
          systemFonts={Platform.OS === "ios" ? ["System"] : ["Roboto"]}
          defaultTextProps={{
            selectable: true,
          }}
          renderersProps={{
            ul: {
              markerBoxStyle: {
                paddingRight: 10,
              },
            },
            ol: {
              markerBoxStyle: {
                paddingRight: 10,
              },
            },
          }}
        />
      )
    } else {
      return <Text style={styles.descriptionText}>{description}</Text>
    }
  }

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true)
        const res = await foodService.getMyNutritionLogs({ pageNumber: 1, pageSize: 100 })
        const reviews = (res?.nutritionLogs || res?.data?.nutritionLogs || []).filter(
          (log) => log.foodId === food.foodId && (log.satisfactionRating > 0 || (log.notes && log.notes.length > 0)),
        )
        setFoodReviews(reviews)
      } catch (e) {
        setFoodReviews([])
      } finally {
        setLoadingReviews(false)
      }
    }
    fetchReviews()
  }, [food.foodId])

  const fetchUserInfo = async (userId) => {
    if (!userId) return { name: "", avatar: "" }
    if (userNamesMap[userId] && userNamesMap[userId + "_avatar"]) {
      return { name: userNamesMap[userId], avatar: userNamesMap[userId + "_avatar"] }
    }
    try {
      if (!userId) return
      // Đảm bảo không gọi API nếu userId không hợp lệ
      if (typeof userId !== "number" || userId <= 0) return
      const res = await apiUserService.getUserById(userId)
      const name = res?.data?.fullName || res?.data?.username || `User #${userId}`
      const avatar = res?.data?.avatar || ""
      setUserNamesMap((prev) => ({ ...prev, [userId]: name, [userId + "_avatar"]: avatar }))
      return { name, avatar }
    } catch {
      setUserNamesMap((prev) => ({ ...prev, [userId]: `User #${userId}`, [userId + "_avatar"]: "" }))
      return { name: `User #${userId}`, avatar: "" }
    }
  }

  useEffect(() => {
    const missingUserIds = foodReviews
      .map((r) => r.userId)
      .filter((id) => id && (!userNamesMap[id] || !userNamesMap[id + "_avatar"]))
    if (missingUserIds.length > 0) {
      missingUserIds.forEach((id) => fetchUserInfo(id))
    }
  }, [foodReviews])

  // Calculate average rating
  const averageRating =
    foodReviews.length > 0
      ? (foodReviews.reduce((sum, r) => sum + (r.satisfactionRating || 0), 0) / foodReviews.length).toFixed(1)
      : 0
  // Filter reviews by star rating
  const filteredReviews = starFilter > 0 ? foodReviews.filter((r) => r.satisfactionRating === starFilter) : foodReviews

  // Enhanced Input Modal Component
  const renderEnhancedInputModal = () => {
    const { food, mealType } = pendingAddFood || {}
    return (
      <Modal visible={inputModalVisible} transparent animationType="none" onRequestClose={handleInputModalCancel}>
        <Animated.View style={[styles.enhancedModalOverlay, { opacity: modalOpacity }]}>
          <Animated.View
            style={[styles.enhancedModalContainer, { transform: [{ scale: modalScale }], opacity: modalOpacity }]}
          >
            {/* Modal Header */}
            <View
              style={{
                backgroundColor: "#0056d2",
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <View style={{ backgroundColor: "#fff", borderRadius: 20, marginRight: 12, padding: 6 }}>
                  <Ionicons name="restaurant" size={22} color="#0056d2" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "#fff", letterSpacing: 0.2 }}>
                    Add Food Details
                  </Text>
                  <Text style={{ fontSize: 13, color: "#eaf1fb", marginTop: 2, fontWeight: "500" }}>
                    {food?.foodName} → {mealType}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={{ padding: 6 }} onPress={handleInputModalCancel}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            {/* Food Image Preview + Input Fields */}
            <View style={{ alignItems: "center", marginTop: 18, marginBottom: 0 }}>
              <Image
                source={{
                  uri: food?.image || food?.foodImage || food?.imageUrl || "https://via.placeholder.com/80x80",
                }}
                style={{ width: 80, height: 80, borderRadius: 16, marginBottom: 8, backgroundColor: "#eaf1fb" }}
              />
              <Text style={{ fontSize: 16, fontWeight: "bold", color: "#0056d2", marginBottom: 2 }}>
                {food?.foodName}
              </Text>
              {/* Input Fields */}
              <View style={{ width: "100%", paddingHorizontal: 20, marginTop: 10 }}>
                {/* Portion Size */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: "#1F2937", fontWeight: "600", marginBottom: 6 }}>
                    Portion Size
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 0,
                      borderColor: "transparent",
                      borderRadius: 12,
                      backgroundColor: "#F8FAFC",
                      padding: 6,
                    }}
                  >
                    <TextInput
                      style={{
                        flex: 1,
                        height: 44,
                        borderWidth: 0,
                        borderColor: "transparent",
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#1F2937",
                        backgroundColor: "#fff",
                        paddingHorizontal: 12,
                      }}
                      placeholder="1"
                      keyboardType="numeric"
                      value={inputValues.portionSize}
                      onChangeText={(text) => setInputValues((prev) => ({ ...prev, portionSize: text }))}
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 8 }}>portions</Text>
                  </View>
                </View>
                {/* Serving Size */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, color: "#1F2937", fontWeight: "600", marginBottom: 6 }}>
                    Serving Size
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      borderWidth: 0,
                      borderColor: "transparent",
                      borderRadius: 12,
                      backgroundColor: "#F8FAFC",
                      padding: 6,
                    }}
                  >
                    <TextInput
                      style={{
                        flex: 1,
                        height: 44,
                        borderWidth: 0,
                        borderColor: "transparent",
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: "600",
                        color: "#1F2937",
                        backgroundColor: "#fff",
                        paddingHorizontal: 12,
                      }}
                      placeholder="1"
                      keyboardType="numeric"
                      value={inputValues.servingSize}
                      onChangeText={(text) => setInputValues((prev) => ({ ...prev, servingSize: text }))}
                      placeholderTextColor="#9CA3AF"
                    />
                    <Text style={{ fontSize: 13, color: "#64748B", marginLeft: 8 }}>grams</Text>
                  </View>
                </View>
                {/* Calculated Nutrition */}
                <View style={{ marginBottom: 0 }}>
                  <Text style={{ fontSize: 14, color: "#64748B", fontWeight: "600", marginBottom: 8 }}>
                    Calculated Nutrition
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                    <View
                      style={{
                        alignItems: "center",
                        flex: 1,
                        backgroundColor: "#fff",
                        borderRadius: 8,
                        padding: 8,
                        marginHorizontal: 2,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#0056d2", fontWeight: "bold" }}>
                        {Math.round((food?.calories || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}
                      </Text>
                      <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "500" }}>Calories</Text>
                    </View>
                    <View
                      style={{
                        alignItems: "center",
                        flex: 1,
                        backgroundColor: "#fff",
                        borderRadius: 8,
                        padding: 8,
                        marginHorizontal: 2,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#0056d2", fontWeight: "bold" }}>
                        {Math.round((food?.protein || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}g
                      </Text>
                      <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "500" }}>Protein</Text>
                    </View>
                    <View
                      style={{
                        alignItems: "center",
                        flex: 1,
                        backgroundColor: "#fff",
                        borderRadius: 8,
                        padding: 8,
                        marginHorizontal: 2,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#0056d2", fontWeight: "bold" }}>
                        {Math.round((food?.carbs || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}g
                      </Text>
                      <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "500" }}>Carbs</Text>
                    </View>
                    <View
                      style={{
                        alignItems: "center",
                        flex: 1,
                        backgroundColor: "#fff",
                        borderRadius: 8,
                        padding: 8,
                        marginHorizontal: 2,
                      }}
                    >
                      <Text style={{ fontSize: 14, color: "#0056d2", fontWeight: "bold" }}>
                        {Math.round((food?.fats || 0) * (Number.parseFloat(inputValues.servingSize) || 1))}g
                      </Text>
                      <Text style={{ fontSize: 12, color: "#64748B", fontWeight: "500" }}>Fats</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
            {/* Modal Actions */}
            <View style={{ flexDirection: "row", gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: "#F3F4F6" }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  padding: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  alignItems: "center",
                  backgroundColor: "#F9FAFB",
                }}
                onPress={handleInputModalCancel}
              >
                <Text style={{ fontSize: 16, color: "#64748B", fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: "#0056d2",
                }}
                onPress={handleInputModalOk}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={{ fontSize: 16, color: "#fff", fontWeight: "600", marginLeft: 6 }}>Add to {mealType}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    )
  }

  // Rating Modal Component (similar to DayDetailsScreen)
  const renderRatingModal = () => (
    <Modal
      visible={ratingModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setRatingModalVisible(false)}
    >
      <Animated.View style={[styles.ratingOverlay, { opacity: modalOpacity }]}>
        <Animated.View style={[styles.ratingModal, { transform: [{ scale: modalScale }] }]}>
          <LinearGradient colors={["#FF9A56", "#FFAD56"]} style={styles.ratingHeader}>
            <View style={styles.ratingHeaderContent}>
              <View style={styles.ratingIconContainer}>
                <IconAntDesign name="star" size={26} color="#FFFFFF" />
              </View>
              <View style={styles.ratingHeaderText}>
                <Text style={styles.ratingTitle}>{existingReview ? "Edit Your Review" : "Rate This Food"}</Text>
                <Text style={styles.ratingSubtitle}>Share your experience</Text>
              </View>
              <TouchableOpacity style={styles.ratingCloseButton} onPress={() => setRatingModalVisible(false)}>
                <IconFeather name="x" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <ScrollView style={styles.ratingBody} showsVerticalScrollIndicator={false}>
            <View style={styles.starSection}>
              <Text style={styles.starLabel}>How would you rate this food?</Text>
              <View style={styles.starContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => {
                      setRatingValue(star)
                      animateStar(star - 1)
                    }}
                    disabled={ratingLoading}
                    style={styles.starButton}
                  >
                    <Animated.View style={{ transform: [{ scale: starAnimations[star - 1] }] }}>
                      <View style={[styles.starWrapper, ratingValue >= star && styles.starWrapperActive]}>
                        <IconAntDesign
                          name={ratingValue >= star ? "star" : "staro"}
                          size={28}
                          color={ratingValue >= star ? "#FFD700" : "#E5E7EB"}
                        />
                      </View>
                    </Animated.View>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.ratingDescription}>
                {ratingValue === 0 && (
                  <View style={styles.descriptionContent}>
                    <IconCommunity name="help-circle-outline" size={18} color="#64748B" />
                    <Text style={styles.descText}>Select a rating above</Text>
                  </View>
                )}
                {ratingValue === 1 && (
                  <View style={styles.descriptionContent}>
                    <IconCommunity name="emoticon-sad-outline" size={18} color="#EF4444" />
                    <Text style={[styles.descText, { color: "#EF4444" }]}>Poor - Not satisfied</Text>
                  </View>
                )}
                {ratingValue === 2 && (
                  <View style={styles.descriptionContent}>
                    <IconCommunity name="emoticon-neutral-outline" size={18} color="#F59E0B" />
                    <Text style={[styles.descText, { color: "#F59E0B" }]}>Fair - Could be better</Text>
                  </View>
                )}
                {ratingValue === 3 && (
                  <View style={styles.descriptionContent}>
                    <IconCommunity name="emoticon-outline" size={18} color="#FBBF24" />
                    <Text style={[styles.descText, { color: "#FBBF24" }]}>Good - Satisfied</Text>
                  </View>
                )}
                {ratingValue === 4 && (
                  <View style={styles.descriptionContent}>
                    <IconCommunity name="emoticon-happy-outline" size={18} color="#10B981" />
                    <Text style={[styles.descText, { color: "#10B981" }]}>Very Good - Really enjoyed</Text>
                  </View>
                )}
                {ratingValue === 5 && (
                  <View style={styles.descriptionContent}>
                    <IconCommunity name="emoticon-excited-outline" size={18} color="#8B5CF6" />
                    <Text style={[styles.descText, { color: "#8B5CF6" }]}>Excellent - Amazing!</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.notesSection}>
              <View style={styles.notesHeader}>
                <IconFeather name="message-circle" size={18} color="#667eea" />
                <Text style={styles.notesLabel}>Add Notes</Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalText}>Optional</Text>
                </View>
              </View>
              <View style={styles.notesInputContainer}>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Share your thoughts about this food..."
                  value={ratingNote}
                  onChangeText={setRatingNote}
                  editable={!ratingLoading}
                  multiline
                  maxLength={200}
                  placeholderTextColor="#9CA3AF"
                />
                <View style={styles.inputFooter}>
                  <IconFeather name="edit-3" size={12} color="#9CA3AF" />
                  <Text style={styles.charCount}>{ratingNote.length}/200</Text>
                </View>
              </View>
            </View>
            <View style={styles.quickNotesSection}>
              <View style={styles.quickNotesHeader}>
                <IconCommunity name="lightning-bolt" size={16} color="#667eea" />
                <Text style={styles.quickNotesLabel}>Quick suggestions</Text>
              </View>
              <View style={styles.quickNotesGrid}>
                {[
                  { text: "Delicious!", icon: "emoticon-excited" },
                  { text: "Too salty", icon: "water-off" },
                  { text: "Perfect portion", icon: "check-circle" },
                  { text: "Too spicy", icon: "fire" },
                  { text: "Will order again", icon: "repeat" },
                  { text: "Could be better", icon: "arrow-up-circle" },
                ].map((note, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.quickNote, ratingNote === note.text && styles.quickNoteActive]}
                    onPress={() => setRatingNote(note.text)}
                    disabled={ratingLoading}
                  >
                    <IconCommunity
                      name={note.icon}
                      size={12}
                      color={ratingNote === note.text ? "#FFFFFF" : "#667eea"}
                    />
                    <Text style={[styles.quickNoteText, ratingNote === note.text && styles.quickNoteTextActive]}>
                      {note.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.ratingFooter}>
            <TouchableOpacity
              style={[styles.submitButton, { opacity: ratingLoading || ratingValue === 0 ? 0.6 : 1 }]}
              onPress={handleSubmitRating}
              disabled={ratingLoading || ratingValue === 0}
            >
              <LinearGradient colors={["#FF9A56", "#FFAD56"]} style={styles.submitGradient}>
                {ratingLoading ? (
                  <>
                    <IconCommunity name="loading" size={18} color="#FFFFFF" />
                    <Text style={styles.submitText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <IconFeather name="check-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.submitText}>{existingReview ? "Update Review" : "Submit Review"}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  )

return (
  <View style={{flex: 1, backgroundColor: '#fff'}}>
    {/* Image Container absolutely positioned at top, outside SafeAreaView */}
    <View style={[styles.imageContainerNew, {position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2}]}> 
      <Image source={{ uri: food.image }} style={[styles.heroImageNew, {width: '100%', height: 320}]} resizeMode="cover" />
      <View style={styles.imageOverlayButtons}>
        <TouchableOpacity style={styles.overlayButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.rightOverlayButtons}>
          <TouchableOpacity style={styles.overlayButton}>
            <MaterialIcons name="star-border" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.overlayButton}>
            <MaterialIcons name="share" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.overlayButton}>
            <MaterialIcons name="print" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </View>

    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView style={[styles.contentContainerNew, {marginTop: 320}]} showsVerticalScrollIndicator={false}>
        <View style={styles.titleContainer}>
          <View style={styles.titleLeft}>
            <Text style={styles.categoryLabel}>{food.categoryName}</Text>
            <Text style={styles.foodTitle}>{food.foodName}</Text>
          </View>
          <View style={styles.caloriesBadge}>
            <Text style={styles.caloriesText}>{food.calories} kcal</Text>
          </View>
        </View>

                                                                                                                                                                                        <View style={[styles.sectionContainer, {marginHorizontal: 0, paddingHorizontal: 0}]}> 
                                                                                                                                                                                          <View style={styles.sectionHeader}>
                                                                                                                                                                                            <Text style={styles.sectionTitle}>Nutrition Facts</Text>
                                                                                                                                                                                          </View>
                                                                                                                                                                                          {/* Updated Nutrition Grid */}
                                                                                                                                                                                          <View style={{backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', paddingVertical: 10, width: '100%'}}> 
                                                                                                                                                                                            {nutritionItems.map((item) => (
                                                                                                                                                                                              <View style={[styles.nutritionItemNew]} key={item.key}>
                                                                                                                                                                                                <Text style={styles.nutritionValueNew}>{item.value}</Text>
                                                                                                                                                                                                <Text style={styles.nutritionNameNew}>{item.name}</Text>
                                                                                                                                                                                              </View>
                                                                                                                                                                                            ))}
                                                                                                                                                                                          </View>
                                                                                                                                                                                        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descriptionContainer}>{renderDescription()}</View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Related Foods</Text>
          {renderRelatedFoodsContent()}
        </View>

        {/* Enhanced User Reviews Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>User Reviews</Text>
          </View>
          {/* Rating Statistics */}
          <View style={styles.ratingStats}>
            <View style={styles.averageRatingContainer}>
              <Text style={styles.averageRatingNumber}>{averageRating}</Text>
              <View style={styles.averageStars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <IconAntDesign
                    key={star}
                    name={averageRating >= star ? "star" : averageRating >= star - 0.5 ? "star" : "staro"}
                    size={16}
                    color={averageRating >= star - 0.5 ? "#F59E0B" : "#E5E7EB"}
                  />
                ))}
              </View>
              <Text style={styles.totalReviews}>({foodReviews.length} reviews)</Text>
            </View>
            {/* Star Filter */}
            <View style={styles.starFilter}>
              <Text style={styles.filterLabel}>Filter:</Text>
              <View style={styles.starFilterButtons}>
                <TouchableOpacity
                  style={[styles.filterButton, starFilter === 0 && styles.activeFilterButton]}
                  onPress={() => setStarFilter(0)}
                >
                  <Text style={[styles.filterButtonText, starFilter === 0 && styles.activeFilterText]}>All</Text>
                </TouchableOpacity>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={[styles.filterButton, starFilter === star && styles.activeFilterButton]}
                    onPress={() => setStarFilter(star)}
                  >
                    <IconAntDesign name="star" size={12} color={starFilter === star ? "#FFFFFF" : "#6B7280"} />
                    <Text style={[styles.filterButtonText, starFilter === star && styles.activeFilterText]}>
                      {star}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          {/* Reviews List */}
          <View style={styles.reviewsList}>
            {filteredReviews.length > 0 ? (
              filteredReviews.map((review, idx) => (
                <View key={idx} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUserInfo}>
                      {userNamesMap[review.userId + "_avatar"] ? (
                        <Image source={{ uri: userNamesMap[review.userId + "_avatar"] }} style={styles.userAvatar} />
                      ) : (
                        <View style={styles.defaultAvatar}>
                          <MaterialIcons name="person" size={16} color="#6B7280" />
                        </View>
                      )}
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>
                          {userNamesMap[review.userId] || review.userName || `User #${review.userId || "N/A"}`}
                        </Text>
                        <View style={styles.reviewRating}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <IconAntDesign
                              key={star}
                              name={review.satisfactionRating >= star ? "star" : "staro"}
                              size={12}
                              color={review.satisfactionRating >= star ? "#F59E0B" : "#E5E7EB"}
                            />
                          ))}
                        </View>
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {dayjs(review.createdAt || review.consumptionDate).format("MMM DD")}
                    </Text>
                  </View>
                  {review.notes && <Text style={styles.reviewNote}>{review.notes}</Text>}
                </View>
              ))
            ) : (
              <View style={styles.emptyReviews}>
                <IconFeather name="message-circle" size={32} color="#E5E7EB" />
                <Text style={styles.emptyReviewsText}>
                  {starFilter > 0 ? `No ${starFilter}-star reviews yet` : "No reviews yet for this food"}
                </Text>
                <Text style={styles.emptyReviewsSubtext}>Be the first to share your experience!</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Recommended by</Text>
            <Text style={styles.priceValue}>HMS Team</Text>
          </View>
          <TouchableOpacity style={styles.addToCartButton} onPress={handleAddFoodToMeal}>
            <View style={[styles.gradientButton, { backgroundColor: "#0056d2" }]}>
              <MaterialIcons name="add-shopping-cart" size={22} color="#FFFFFF" style={styles.buttonIcon} />
              <Text style={[styles.buttonText, { color: "#fff" }]}>Add to Meal Plan</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      {renderEnhancedInputModal()}
      {renderRatingModal()}
    </SafeAreaView>
  </View>
)
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  // NEW Image Container and Overlay Buttons
  imageContainerNew: {
    width: "100%",
    height: 300, // Increased height for the image
    position: "relative",
  },
  heroImageNew: {
    width: "100%",
    height: "100%",
  },
  imageOverlayButtons: {
    position: "absolute",
    top: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 50, // Adjust top based on platform status bar
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING,
  },
  overlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)", // Semi-transparent white background
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rightOverlayButtons: {
    flexDirection: "row",
    gap: 10,
  },
  // NEW Content Container
  contentContainerNew: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    // Removed borderTopLeftRadius and borderTopRightRadius
    marginTop: -20, // Overlap the image slightly
    paddingHorizontal: SPACING,
    paddingTop: SPACING * 2,
    paddingBottom: 120,
  },
  // Updated Nutrition Grid Styles
  nutritionGridNew: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderWidth: 0,
    borderColor: "transparent",
    borderRadius: 0,
    backgroundColor: "#fff",
    marginHorizontal: 0,
    width: '100%',
  },
  nutritionItemNew: {
    
    alignItems: "center", // Center text horizontally
    flex: 1, // Distribute space evenly
    paddingHorizontal: 5, // Small horizontal padding
  },
  nutritionValueNew: {
    fontSize: 16,
    fontWeight: "700", // Bold for the value
    color: "#111827",
    marginBottom: 4, // Space between value and name
  },
  nutritionNameNew: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500", // Medium weight for the name
  },

  // Existing styles (unchanged)
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 2,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    height: 250,
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  trustBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trustBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 4,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: SPACING,
    paddingTop: SPACING * 2,
    paddingBottom: 120,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING * 2,
  },
  titleLeft: {
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  foodTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    maxWidth: width * 0.7,
    marginBottom: 8,
  },
  caloriesBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  caloriesText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#EF4444",
  },
  sectionContainer: {
    marginBottom: SPACING * 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: SPACING,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    marginLeft: 4,
  },
  certificationsContainer: {
    paddingRight: SPACING,
  },
  certificationBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  certificationText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  nutritionItem: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: SPACING,
    marginBottom: SPACING,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  nutritionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  nutritionName: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  descriptionContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: SPACING,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  descriptionText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 24,
  },
  ingredientsList: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: SPACING,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  ingredientText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 10,
    fontWeight: "500",
  },
  relatedFoodsContainer: {
    paddingRight: SPACING,
  },
  relatedFoodItem: {
    width: (width - SPACING * 3) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  relatedFoodImage: {
    width: "100%",
    height: 100,
  },
  relatedFoodContent: {
    padding: 12,
  },
  relatedFoodCategory: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  relatedFoodName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  relatedFoodNutrition: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  relatedNutritionItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  relatedNutritionText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 4,
    fontWeight: "600",
  },
  loadingItem: {
    width: (width - SPACING * 3) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  loadingImagePlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    padding: 12,
  },
  loadingTextLine: {
    height: 10,
    backgroundColor: "#E5E7EB",
    borderRadius: 5,
    width: "80%",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: SPACING,
    paddingVertical: SPACING,
    paddingBottom: Platform.OS === "ios" ? SPACING * 2 : SPACING,
  },
  bottomBarContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  priceValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  addToCartButton: {
    height: 48,
    borderRadius: 12,
    flex: 2,
    marginLeft: 16,
    backgroundColor: "#374151",
  },
  gradientButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // Enhanced Modal Styles
  enhancedModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  enhancedModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    height: height * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  enhancedModalContentWrapper: {
    flex: 1,
  },
  enhancedModalContent: {
    flex: 1,
  },
  enhancedModalContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
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
  nutritionText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  inputFieldsContainer: {
    gap: 24,
  },
  inputGroup: {
    marginBottom: 8,
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
  calculatedNutrition: {
    backgroundColor: "#F0F9FF",
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
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
    justifyContent: "space-between",
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
  // Rating Modal Styles
  ratingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  ratingModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 380,
    maxHeight: height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  ratingHeader: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  ratingHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  ratingHeaderText: {
    flex: 1,
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  ratingSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "500",
  },
  ratingCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  starSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  starLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#667eea",
    marginBottom: 20,
  },
  starContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  starButton: {
    padding: 6,
  },
  starWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 2,
    borderColor: "#E5E7EB",
  },
  starWrapperActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  ratingDescription: {
    minHeight: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  descriptionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  descText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  notesSection: {
    marginBottom: 24,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  notesLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  optionalBadge: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  optionalText: {
    fontSize: 10,
    color: "#667eea",
    fontWeight: "600",
  },
  notesInputContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notesInput: {
    padding: 16,
    fontSize: 15,
    color: "#1F2937",
    minHeight: 90,
    textAlignVertical: "top",
  },
  inputFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  quickNotesSection: {
    marginBottom: 20,
  },
  quickNotesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  quickNotesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  quickNotesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickNote: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  quickNoteActive: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  quickNoteText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },
  quickNoteTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  ratingFooter: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FF9A56",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Enhanced Reviews Section Styles
  reviewsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addReviewButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#374151",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addReviewText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  ratingStats: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  averageRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  averageRatingNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginRight: 8,
  },
  averageStars: {
    flexDirection: "row",
    marginRight: 8,
    gap: 2,
  },
  totalReviews: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  starFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  starFilterButtons: {
    flexDirection: "row",
    gap: 6,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 4,
  },
  activeFilterButton: {
    backgroundColor: "#374151",
    borderColor: "#374151",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeFilterText: {
    color: "#FFFFFF",
  },
  reviewsList: {
    gap: 12,
  },
  reviewItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  reviewUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  reviewRating: {
    flexDirection: "row",
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  reviewNote: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  emptyReviews: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyReviewsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 12,
    marginBottom: 4,
  },
  emptyReviewsSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
})

export default FoodDetailsScreen
