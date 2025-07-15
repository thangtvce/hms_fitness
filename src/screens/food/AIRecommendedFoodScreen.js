import React, { useEffect, useState, useContext } from "react";
import { View, Text, FlatList, ActivityIndicator, Image, StyleSheet, TouchableOpacity } from "react-native";
import { aiRecommentService } from "services/apiAIRecommentService";
import { AuthContext } from "context/AuthContext";
import { ThemeContext } from "components/theme/ThemeContext";
import Header from "components/Header";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
const AIRecommendedFoodScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [foodList, setFoodList] = useState([]);
  const [favoriteFoods, setFavoriteFoods] = useState([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await aiRecommentService.getAIRecommendations(user.userId);
        setFoodList(Array.isArray(data?.recommendedFoodItems) ? data.recommendedFoodItems : []);
      } catch (err) {
        setError("Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };
    if (user?.userId) fetchRecommendations();
  }, [user?.userId]);

  // Load favorite foods from AsyncStorage
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const raw = await AsyncStorage.getItem("favoriteFoods");
        if (raw) {
          setFavoriteFoods(JSON.parse(raw));
        } else {
          setFavoriteFoods([]);
        }
      } catch (e) {
        setFavoriteFoods([]);
      }
    };
    loadFavorites();
  }, []);

  // Thêm vào hoặc xóa khỏi favorite, lưu vào AsyncStorage key 'favoriteFoods', show toast
  const handleToggleFavorite = async (food) => {
    try {
      const foodId = food.foodDetails?.foodId || food.foodId;
      let newFavorites = [...favoriteFoods];
      const exists = newFavorites.some(f => (f.foodDetails?.foodId || f.foodId) === foodId);
      if (exists) {
        newFavorites = newFavorites.filter(f => (f.foodDetails?.foodId || f.foodId) !== foodId);
        setFavoriteFoods(newFavorites);
        await AsyncStorage.setItem("favoriteFoods", JSON.stringify(newFavorites));
        showSuccessMessage("Removed from favorites successfully");
      } else {
        newFavorites.push(food);
        setFavoriteFoods(newFavorites);
        await AsyncStorage.setItem("favoriteFoods", JSON.stringify(newFavorites));
        showSuccessMessage("Added to favorites successfully");
      }
    } catch (error) {
      showErrorFetchAPI(error);
    }
  };

  const renderItem = ({ item }) => {
    // Ưu tiên lấy thông tin từ foodDetails nếu có
    const details = item.foodDetails || {};
    const imageUrl = details.image || item.imageUrl;
    const foodName = details.foodName || item.foodName;
    const description = details.description || item.description || "No description";
    const calories = details.calories ?? item.calories ?? "-";
    const foodId = details.foodId || item.foodId;
    const isFavorite = favoriteFoods.some(f => (f.foodDetails?.foodId || f.foodId) === foodId);

    return (
      <View style={[styles.card, { backgroundColor: colors.cardBackground || "#fff" }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
        <View style={styles.infoContainer}>
          <Text style={[styles.foodName, { color: colors.textPrimary || "#1E293B" }]}>{foodName}</Text>
          <Text style={[styles.foodDesc, { color: colors.textSecondary || "#64748B" }]} numberOfLines={2}>
            {description}
          </Text>
          <Text style={[styles.calories, { color: colors.warning || "#F59E0B" }]}>Calories: {calories}</Text>
        </View>
        <TouchableOpacity
          style={styles.favoriteBtn}
          onPress={() => handleToggleFavorite(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={24}
            color={isFavorite ? "#EF4444" : "#CBD5E1"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary || "#0056d2"} /></View>
    );
  }
  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: colors.error || "#EF4444" }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background || "#F8FAFC" }]}> 
      <Header
        title="AI Recommended Foods"
        onBack={() => navigation.goBack()}
        backgroundColor={colors.headerBackground || "#FFFFFF"}
        textColor={colors.headerText || colors.primary || "#0056d2"}
      />
      <FlatList
        data={foodList}
        keyExtractor={(item, idx) => item.id?.toString() || idx.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ color: colors.textSecondary || "#64748B", textAlign: "center" }}>No recommendations found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    flexDirection: "row",
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    alignItems: "center",
  },
  image: { width: 64, height: 64, borderRadius: 8, marginRight: 12, backgroundColor: "#e5e7eb" },
  imagePlaceholder: { width: 64, height: 64, borderRadius: 8, marginRight: 12, backgroundColor: "#e5e7eb" },
  infoContainer: { flex: 1 },
  foodName: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  foodDesc: { fontSize: 13, marginBottom: 4 },
  calories: { fontSize: 13, fontWeight: "600" },
});

export default AIRecommendedFoodScreen;
