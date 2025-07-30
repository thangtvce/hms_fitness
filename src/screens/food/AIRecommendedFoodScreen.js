import React,{ useEffect,useState,useContext,useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { aiRecommentService } from "services/apiAIRecommentService";
import { AuthContext } from "context/AuthContext";
import { ThemeContext } from "components/theme/ThemeContext";
import Header from "components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons,Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil";
import FoodImage from "./FoodImage";
import { addFoodToLog } from "utils/foodLogStorage";
import dayjs from "dayjs";
import Alert from "react-native";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";

const SORT_OPTIONS = [
  { label: "Name A-Z",value: "name",icon: "text-outline" },
  { label: "Calories (High → Low)",value: "calories-high",icon: "flame-outline" },
  { label: "Calories (Low → High)",value: "calories-low",icon: "flame-outline" },
  { label: "Protein (High → Low)",value: "protein-high",icon: "fitness-outline" },
];

const LAYOUT_OPTIONS = [
  { columns: 1,icon: "list-outline",label: "1 col" },
  { columns: 2,icon: "grid-outline",label: "2 cols" }];

const AIRecommendedFoodScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [foodList,setFoodList] = useState([]);
  const [favoriteFoods,setFavoriteFoods] = useState([]);
  const [sortBy,setSortBy] = useState("name");
  const [layoutMode,setLayoutMode] = useState(1);
  const [showSortModal,setShowSortModal] = useState(false);
  const [showLayoutModal,setShowLayoutModal] = useState(false);
  const [searchQuery,setSearchQuery] = useState("");
  const [filteredFoods,setFilteredFoods] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    ]).start();
  },[]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user?.userId) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await aiRecommentService.getAIRecommendations(user.userId);
        const foods = Array.isArray(data?.recommendedFoodItems) ? data.recommendedFoodItems : [];
        setFoodList(sortFoods(foods,sortBy));
      } catch (err) {
        showErrorFetchAPI(err);
        setError(err?.message || "Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };
    fetchRecommendations();
  },[user?.userId,sortBy]);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const raw = await AsyncStorage.getItem("favoriteFoods");
        setFavoriteFoods(raw ? JSON.parse(raw) : []);
      } catch (e) {
        setFavoriteFoods([]);
      }
    };
    loadFavorites();
  },[]);

  useEffect(() => {
    const filtered = foodList.filter((food) =>
      (food.foodDetails?.foodName || food.foodName || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
    setFilteredFoods(filtered);
  },[searchQuery,foodList]);

  const sortFoods = (foods,sortType) => {
    const sorted = [...foods];
    switch (sortType) {
      case "name":
        return sorted.sort((a,b) =>
          (a.foodDetails?.foodName || a.foodName || "").localeCompare(
            b.foodDetails?.foodName || b.foodName || ""
          )
        );
      case "calories-high":
        return sorted.sort(
          (a,b) =>
            (b.foodDetails?.calories || b.calories || 0) -
            (a.foodDetails?.calories || a.calories || 0)
        );
      case "calories-low":
        return sorted.sort(
          (a,b) =>
            (a.foodDetails?.calories || a.calories || 0) -
            (b.foodDetails?.calories || b.calories || 0)
        );
      case "protein-high":
        return sorted.sort(
          (a,b) =>
            (b.foodDetails?.protein || b.protein || 0) -
            (a.foodDetails?.protein || a.protein || 0)
        );
      default:
        return sorted;
    }
  };

  const handleToggleFavorite = async (food) => {
    try {
      const foodId = food.foodDetails?.foodId || food.foodId;
      let newFavorites = [...favoriteFoods];
      const exists = newFavorites.some(
        (f) => (f.foodDetails?.foodId || f.foodId) === foodId
      );
      if (exists) {
        newFavorites = newFavorites.filter(
          (f) => (f.foodDetails?.foodId || f.foodId) !== foodId
        );
        showSuccessMessage("Removed from favorites successfully");
      } else {
        newFavorites.push(food);
        showSuccessMessage("Added to favorites successfully");
      }
      setFavoriteFoods(newFavorites);
      await AsyncStorage.setItem("favoriteFoods",JSON.stringify(newFavorites));
    } catch (error) {
      showErrorFetchAPI(error);
    }
  };

  const handleQuickAdd = async (food) => {
    const mealTypes = [
      { label: "Breakfast",value: "Breakfast" },
      { label: "Lunch",value: "Lunch" },
      { label: "Dinner",value: "Dinner" },
    ];

    const mealType = await new Promise((resolve) => {
      Alert.alert(
        "Choose a meal",
        "Which session do you want to add?",
        [
          ...mealTypes.map((m) => ({ text: m.label,onPress: () => resolve(m.value) })),
          { text: "Cancel",style: "cancel",onPress: () => resolve(null) },
        ],
        { cancelable: true }
      );
    });

    if (!mealType) return;

    try {
      const today = dayjs().format("YYYY-MM-DD");
      const foodDetails = food.foodDetails || food;
      const logData = {
        foodId: foodDetails.foodId || food.foodId,
        foodName: foodDetails.foodName || food.foodName || "Unknown Food",
        calories: (foodDetails.calories || 0) * 1,
        protein: (foodDetails.protein || 0) * 1,
        carbs: (foodDetails.carbs || 0) * 1,
        fats: (foodDetails.fats || 0) * 1,
        portionSize: 1,
        servingSize: 1,
        satisfactionRating: 1,
        notes: "",
        consumptionDate: today,
        image: foodDetails.image || food.imageUrl || getFoodImage(foodDetails.foodName || food.foodName),
      };

      await addFoodToLog(today,mealType,logData);
      showSuccessMessage(`Added ${logData.foodName} to ${mealType} log!`);
    } catch (error) {
      showErrorFetchAPI(error);
    }
  };

  const getFoodImage = (foodName) => {
    return `https://placehold.co/400x250?text=${foodName?.replace(/\s/g,"") || "food"}`;
  };

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
                style={[styles.sortOption,sortBy === option.value && styles.selectedSortOption]}
                onPress={() => {
                  setSortBy(option.value);
                  setShowSortModal(false);
                }}
              >
                <View style={styles.sortOptionLeft}>
                  <View
                    style={[
                      styles.sortIconContainer,
                      { backgroundColor: sortBy === option.value ? "#0056D2" : "#F9FAFB" },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={sortBy === option.value ? "#fff" : "#6B7280"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.value && { color: "#0056D2",fontWeight: "bold" },
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
                {sortBy === option.value && <Ionicons name="checkmark" size={20} color="#0056D2" />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

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
                const isActive = layoutMode === option.columns;
                return (
                  <TouchableOpacity
                    key={option.columns}
                    style={[
                      styles.layoutOption,
                      isActive && styles.selectedLayoutOption,
                    ]}
                    onPress={() => {
                      setLayoutMode(option.columns);
                      setShowLayoutModal(false);
                    }}
                  >
                    <View style={[styles.layoutIconContainer,{ backgroundColor: isActive ? "#0056D2" : "#F9FAFB" }]}>
                      <Ionicons name={option.icon} size={24} color={isActive ? "#fff" : "#6B7280"} />
                    </View>
                    <Text style={[styles.layoutOptionText,isActive && { color: "#0056D2",fontWeight: "bold" }]}>
                      {option.label}
                    </Text>
                    {isActive && (
                      <View style={styles.layoutCheckmark}>
                        <Ionicons name="checkmark-circle" size={20} color="#0056D2" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  const FoodAIRecommendBanner = () => (
    <TouchableOpacity
      style={styles.aiRecommendBanner}
      onPress={() => navigation.navigate("AIRecommendedFoodScreen")}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={["#0056D2","#38BDF8"]}
        style={styles.aiRecommendBannerGradient}
        start={{ x: 0,y: 0 }}
        end={{ x: 1,y: 0 }}
      >
        <View style={styles.aiRecommendBannerContent}>
          <View style={styles.aiRecommendBannerLeft}>
            <View style={styles.aiRecommendBannerIcon}>
              <Feather name="book-open" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.aiRecommendBannerText}>
              <Text style={styles.aiRecommendBannerTitle}>AI Personalized Foods</Text>
              <Text style={styles.aiRecommendBannerSubtitle}>Tailored meal recommendations for you</Text>
            </View>
          </View>
          <View style={styles.aiRecommendBannerRight}>
            <Feather name="arrow-right" size={18} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderFoodItem = ({ item }) => {
    const details = item.foodDetails || item;
    const imageUrl = details.image || item.imageUrl || getFoodImage(details.foodName || item.foodName);
    const foodName = details.foodName || item.foodName || "Unknown Food";
    const calories = details.calories ?? item.calories ?? 0;
    const protein = details.protein ?? item.protein ?? 0;
    const carbs = details.carbs ?? item.carbs ?? 0;
    const fats = details.fats ?? item.fats ?? 0;
    const foodId = details.foodId || item.foodId;
    const isFavorite = favoriteFoods.some((f) => (f.foodDetails?.foodId || f.foodId) === foodId);

    const itemWidth = layoutMode === 1 ? "100%" : layoutMode === 2 ? "48%" : "31%";
    const imageHeight = layoutMode === 1 ? 180 : layoutMode === 2 ? 140 : 120;

    return (
      <Animated.View
        style={[
          styles.foodItem,
          { width: itemWidth,opacity: fadeAnim,transform: [{ translateY: slideAnim }] },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.navigate("FoodDetails",{ food: item })}
          activeOpacity={0.8}
          style={[styles.foodCard,isFavorite && styles.selectedFoodCard]}
          accessibilityLabel={`View details for ${foodName}`}
          accessibilityHint="Navigates to the food details screen"
        >
          <View style={styles.foodImageContainer}>
            <FoodImage
              imageUrl={imageUrl}
              style={[styles.foodImage,{ height: imageHeight }]}
              accessibilityLabel={`Image of ${foodName}`}
            />
            <LinearGradient
              colors={["rgba(0,0,0,0)","rgba(0,0,0,0.7)"]}
              style={styles.foodGradient}
            >
              <Text
                style={[styles.foodName,{ fontSize: layoutMode > 2 ? 16 : 20 }]}
                numberOfLines={layoutMode > 2 ? 2 : 1}
              >
                {foodName}
              </Text>
            </LinearGradient>
            <View style={styles.caloriesBadge}>
              <Text style={[styles.caloriesText,{ fontSize: layoutMode > 2 ? 10 : 12 }]}>
                {calories} kcal
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.favoriteButton,{ width: layoutMode > 2 ? 28 : 36,height: layoutMode > 2 ? 28 : 36 }]}
              onPress={() => handleToggleFavorite(item)}
              accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
              accessibilityHint={isFavorite ? "Removes this food from your favorites" : "Adds this food to your favorites"}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={layoutMode > 2 ? 16 : 20}
                color={isFavorite ? "#EF4444" : "#0056D2"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickAddButton,{ width: layoutMode > 2 ? 28 : 36,height: layoutMode > 2 ? 28 : 36 }]}
              onPress={() => handleQuickAdd(item)}
              accessibilityLabel="Quick add to meal"
              accessibilityHint="Adds this food to your meal log"
            >
              <Ionicons name="add" size={layoutMode > 2 ? 16 : 20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={[styles.foodContent,{ padding: layoutMode > 2 ? 12 : 20 }]}>
            <Text style={[styles.foodCategory,{ fontSize: layoutMode > 2 ? 11 : 13 }]} numberOfLines={1}>
              AI Recommended
            </Text>
            {layoutMode <= 2 && (
              <View style={[styles.macrosContainer,{ gap: layoutMode > 2 ? 8 : 12 }]}>
                <View style={styles.macroItem}>
                  <View style={[styles.macroIconContainer,{ backgroundColor: "#DBF4FF" }]}>
                    <Ionicons name="fitness-outline" size={14} color="#0EA5E9" />
                  </View>
                  <Text style={styles.macroText}>{protein}g protein</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroIconContainer,{ backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="nutrition-outline" size={14} color="#EF4444" />
                  </View>
                  <Text style={styles.macroText}>{carbs}g carbs</Text>
                </View>
                <View style={styles.macroItem}>
                  <View style={[styles.macroIconContainer,{ backgroundColor: "#FFFBEB" }]}>
                    <Ionicons name="water-outline" size={14} color="#F59E0B" />
                  </View>
                  <Text style={styles.macroText}>{fats}g fats</Text>
                </View>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container,{ backgroundColor: colors.background || "#F8FAFC" }]}>
        <Header
          title="AI Foods"
          onBack={() => navigation.goBack()}
          backgroundColor={colors.headerBackground || "#FFFFFF"}
          titleStyle={{ color: colors.primary || "#0056D2",fontWeight: "700" }}
        />
        <View style={styles.contentContainer}>
          <CommonSkeleton />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container,{ backgroundColor: colors.background || "#F8FAFC" }]}>
        <Header
          title="AI Foods"
          onBack={() => navigation.goBack()}
          backgroundColor={colors.headerBackground || "#FFFFFF"}
          titleStyle={{ color: colors.primary || "#0056D2",fontWeight: "700" }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error || "#EF4444"} />
          <Text style={[styles.errorText,{ color: colors.error || "#EF4444" }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchRecommendations()}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container,{ backgroundColor: colors.background || "#F8FAFC" }]}>
      <Header
        title="AI Foods"
        onBack={() => navigation.goBack()}
        backgroundColor={colors.headerBackground || "#FFFFFF"}
        titleStyle={{ color: colors.primary || "#0056D2",fontWeight: "700" }}
        rightActions={[
          {
            icon: "swap-vertical-outline",
            onPress: () => setShowSortModal(true),
            color: "#0056D2",
            accessibilityLabel: "Sort foods",
            accessibilityHint: "Opens sorting options",
          },
          {
            icon: LAYOUT_OPTIONS.find((opt) => opt.columns === layoutMode)?.icon || "grid-outline",
            onPress: () => setShowLayoutModal(true),
            color: "#0056D2",
            accessibilityLabel: "Change layout",
            accessibilityHint: "Opens layout options",
          },
        ]}
      />
      <View style={styles.sectionContainer}>
        <FoodAIRecommendBanner />
      </View>
      <Animated.View
        style={[
          styles.searchContainer,
          { opacity: fadeAnim,transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recommended foods..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Search recommended foods"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>
      <View style={styles.contentContainer}>
        <FlatList
          data={filteredFoods}
          renderItem={renderFoodItem}
          keyExtractor={(item,idx) => (item.foodId ? `food-${item.foodId}` : `item-${idx}`)}
          numColumns={layoutMode}
          key={layoutMode}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="fast-food-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No recommended foods found</Text>
              <Text style={styles.emptyText}>
                {searchQuery
                  ? "No foods match your search."
                  : "Please log your meals or update your profile to get personalized recommendations."}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchRecommendations()}>
                <Text style={styles.retryButtonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
      {renderSortModal()}
      {renderLayoutModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1,backgroundColor: "#F8FAFC" },
  contentContainer: { flex: 1,backgroundColor: "#F9FAFB" },
  sectionContainer: { paddingHorizontal: 16,marginBottom: 16 },
  searchContainer: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    gap: 8,
  },
  searchInputContainer: {
    marginTop: 20,
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
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1,fontSize: 16,color: "#1E293B",paddingVertical: 16 },
  clearButton: { padding: 4 },
  listContainer: { paddingHorizontal: 16,paddingTop: 16,paddingBottom: 16 },
  foodItem: { marginBottom: 20,marginRight: "2%" },
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
  selectedFoodCard: { borderWidth: 2,borderColor: "#0056D2" },
  foodImageContainer: { position: "relative" },
  foodImage: { width: "100%",height: 180 },
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
  foodName: { fontSize: 20,fontWeight: "700",color: "#FFFFFF" },
  caloriesBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#10B981",
  },
  caloriesText: { fontSize: 12,color: "#FFFFFF",fontWeight: "600" },
  favoriteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  quickAddButton: {
    position: "absolute",
    top: 60,
    right: 16,
    borderRadius: 18,
    backgroundColor: "#0056D2",
    justifyContent: "center",
    alignItems: "center",
  },
  foodContent: { padding: 20 },
  foodCategory: { fontSize: 13,color: "#64748B",fontWeight: "500",marginBottom: 12 },
  macrosContainer: { flexDirection: "row",flexWrap: "wrap",gap: 12 },
  macroItem: { flexDirection: "row",alignItems: "center" },
  macroIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  macroText: { fontSize: 12,color: "#64748B",fontWeight: "500" },
  emptyContainer: { alignItems: "center",justifyContent: "center",paddingVertical: 80 },
  emptyTitle: { fontSize: 18,fontWeight: "600",color: "#374151",marginTop: 16,marginBottom: 8 },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: { fontSize: 16,color: "#EF4444",textAlign: "center",lineHeight: 24 },
  retryButton: {
    backgroundColor: "#0056D2",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: { color: "#FFFFFF",fontSize: 16,fontWeight: "600" },
  modalOverlay: { flex: 1,backgroundColor: "rgba(0, 0, 0, 0.5)",justifyContent: "flex-end" },
  sortModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "60%",
  },
  sortContent: { paddingHorizontal: 20,paddingVertical: 16 },
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
  selectedSortOption: { backgroundColor: "#EEF2FF",borderWidth: 1,borderColor: "#0056D2" },
  sortOptionLeft: { flexDirection: "row",alignItems: "center" },
  sortIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sortOptionText: { fontSize: 16,color: "#6B7280",fontWeight: "500" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 18,fontWeight: "700",color: "#1F2937" },
  layoutModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "40%",
  },
  layoutContent: { paddingHorizontal: 20,paddingVertical: 16 },
  layoutDescription: { fontSize: 16,color: "#6B7280",textAlign: "center",marginBottom: 16 },
  layoutGrid: { flexDirection: "row",justifyContent: "space-around",alignItems: "center",gap: 12 },
  layoutOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedLayoutOption: { backgroundColor: "#EEF2FF",borderColor: "#0056D2" },
  layoutIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  layoutOptionText: { fontSize: 12,color: "#6B7280",fontWeight: "500",textAlign: "center" },
  layoutCheckmark: { position: "absolute",top: 4,right: 4 },
  aiRecommendBanner: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiRecommendBannerGradient: { padding: 20 },
  aiRecommendBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  aiRecommendBannerLeft: { flexDirection: "row",alignItems: "center" },
  aiRecommendBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  aiRecommendBannerText: {},
  aiRecommendBannerTitle: { fontSize: 16,fontWeight: "bold",color: "#FFFFFF" },
  aiRecommendBannerSubtitle: { fontSize: 12,color: "rgba(255,255,255,0.8)" },
  aiRecommendBannerRight: { flexDirection: "row",alignItems: "center" },
});

export default AIRecommendedFoodScreen;