import { useState,useRef } from "react";
import Loading from "components/Loading";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil";
import Header from "components/Header";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation,useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import dayjs from "dayjs";

// Icon imports
import Icon from "react-native-vector-icons/MaterialIcons";
import IconCommunity from "react-native-vector-icons/MaterialCommunityIcons";
import IconFeather from "react-native-vector-icons/Feather";
import IconAntDesign from "react-native-vector-icons/AntDesign";

import { foodService } from "services/apiFoodService";
import SafeImage from "./SafeImage";
import { TextInput } from "react-native-gesture-handler";

const { width,height } = Dimensions.get("window");
const MEAL_TYPES = ["Breakfast","Lunch","Dinner","Other"];

const DayDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { date,dayStats: initialDayStats } = route.params;

  // Process grouped data to aggregate by foodId and foodName
  const processGroupedData = (grouped) => {
    const newGrouped = {};
    MEAL_TYPES.forEach((mealType) => {
      const mealFoods = grouped[mealType] || [];
      const groupedByFood = {};

      mealFoods.forEach((food) => {
        const key = `${food.foodId}-${food.foodName}`;
        if (!groupedByFood[key]) {
          groupedByFood[key] = {
            ...food,
            logIds: [food.logId || food.id],
            quantity: food.quantity || 1,
            calories: food.calories || 0,
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fats: food.fats || 0,
            count: 1,
            originalQuantity: food.quantity || 1,
            originalCalories: food.calories || 0,
            originalProtein: food.protein || 0,
            originalCarbs: food.carbs || 0,
            originalFats: food.fats || 0,
          };
        } else {
          groupedByFood[key].logIds.push(food.logId || food.id);
          groupedByFood[key].quantity = (groupedByFood[key].quantity || 1) + (food.quantity || 1);
          groupedByFood[key].calories += food.calories || 0;
          groupedByFood[key].protein += food.protein || 0;
          groupedByFood[key].carbs += food.carbs || 0;
          groupedByFood[key].fats += food.fats || 0;
          groupedByFood[key].count += 1;
          if (food.satisfactionRating) {
            groupedByFood[key].satisfactionRating = food.satisfactionRating;
            groupedByFood[key].notes = food.notes || "";
          }
        }
      });

      newGrouped[mealType] = Object.values(groupedByFood);
    });
    return newGrouped;
  };

  const [grouped,setGrouped] = useState(processGroupedData(route.params.grouped));
  const [dayStats,setDayStats] = useState(initialDayStats);
  const [ratingModalVisible,setRatingModalVisible] = useState(false);
  const [ratingTarget,setRatingTarget] = useState(null);
  const [ratingLoading,setRatingLoading] = useState(false);
  const [ratingValue,setRatingValue] = useState(0);
  const [ratingNote,setRatingNote] = useState("");

  // Animation refs
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const starAnimations = useRef([...Array(5)].map(() => new Animated.Value(1))).current;

  const handleDeleteDayLog = async () => {
    const allLogs = [];
    MEAL_TYPES.forEach((mealType) => {
      const mealFoods = grouped[mealType] || [];
      mealFoods.forEach((food) => {
        allLogs.push(...food.logIds);
      });
    });

    Alert.alert(
      "Delete Day",
      `Delete all ${allLogs.length} food entries for ${dayjs(date).format("MMM DD, YYYY")}?`,
      [
        { text: "Cancel",style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const deletePromises = allLogs.map((logId) => foodService.deleteNutritionLog(logId));
              await Promise.all(deletePromises);
              showSuccessMessage("All food logs deleted!");
              navigation.goBack();
            } catch (error) {
              showErrorFetchAPI(error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteFoodLog = async (food,mealType) => {
    if (food.logIds.length === 0) return;

    Alert.alert(
      "Delete Food Log",
      `Delete one entry of "${food.foodName}" from ${mealType}?`,
      [
        { text: "Cancel",style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the first logId in the list
              const logIdToDelete = food.logIds[0];
              await foodService.deleteNutritionLog(logIdToDelete);

              // Update dayStats
              setDayStats((prevStats) => ({
                ...prevStats,
                calories: prevStats.calories - food.originalCalories,
                protein: prevStats.protein - food.originalProtein,
                carbs: prevStats.carbs - food.originalCarbs,
                fats: prevStats.fats - food.originalFats,
              }));

              // Update grouped state
              setGrouped((prevGrouped) => {
                const newGrouped = { ...prevGrouped };
                const mealFoods = newGrouped[mealType] || [];
                const updatedMealFoods = mealFoods
                  .map((f) => {
                    if (f.foodId === food.foodId && f.foodName === food.foodName) {
                      if (f.logIds.length === 1) {
                        // Remove the food item if it's the last log
                        return null;
                      }
                      // Update the food item
                      return {
                        ...f,
                        logIds: f.logIds.filter((id) => id !== logIdToDelete),
                        quantity: f.quantity - f.originalQuantity,
                        calories: f.calories - f.originalCalories,
                        protein: f.protein - f.originalProtein,
                        carbs: f.carbs - f.originalCarbs,
                        fats: f.fats - f.originalFats,
                        count: f.count - 1,
                      };
                    }
                    return f;
                  })
                  .filter((f) => f !== null); // Remove null entries

                newGrouped[mealType] = updatedMealFoods;
                return newGrouped;
              });

              showSuccessMessage("Food log deleted!");
              if (typeof route.params.onRefresh === "function") route.params.onRefresh();
            } catch (error) {
              showErrorFetchAPI(error);
            }
          },
        },
      ]
    );
  };

  const handleOpenRating = (food) => {
    setRatingTarget({ logIds: food.logIds,foodId: food.foodId });
    setRatingValue(food.satisfactionRating || 0);
    setRatingNote(food.notes || "");
    setRatingModalVisible(true);

    Animated.parallel([
      Animated.spring(modalScale,{
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity,{
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateStar = (index) => {
    Animated.sequence([
      Animated.timing(starAnimations[index],{
        toValue: 1.3,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(starAnimations[index],{
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmitRating = async () => {
    if (!ratingTarget) return;
    setRatingLoading(true);
    try {
      let foundLog = null;
      for (const mealType of MEAL_TYPES) {
        const mealFoods = grouped[mealType] || [];
        foundLog = mealFoods.find((f) => f.foodId === ratingTarget.foodId);
        if (foundLog) break;
      }
      if (!foundLog) throw new Error("Log not found");

      const payload = {
        userId: foundLog.userId,
        foodId: foundLog.foodId,
        mealType: foundLog.mealType,
        portionSize: foundLog.portionSize,
        servingSize: foundLog.servingSize,
        calories: foundLog.calories / (foundLog.quantity || 1),
        protein: foundLog.protein / (foundLog.quantity || 1),
        carbs: foundLog.carbs / (foundLog.quantity || 1),
        fats: foundLog.fats / (foundLog.quantity || 1),
        consumptionDate: foundLog.consumptionDate,
        satisfactionRating: ratingValue,
        notes: ratingNote,
        quantity: foundLog.quantity || 1,
      };

      const updatePromises = ratingTarget.logIds.map((logId) =>
        foodService.updateNutritionLog(logId,payload)
      );
      await Promise.all(updatePromises);

      setGrouped((prevGrouped) => {
        const newGrouped = { ...prevGrouped };
        for (const mealType of MEAL_TYPES) {
          newGrouped[mealType] = (newGrouped[mealType] || []).map((food) => {
            if (food.foodId === ratingTarget.foodId) {
              return {
                ...food,
                satisfactionRating: ratingValue,
                notes: ratingNote,
              };
            }
            return food;
          });
        }
        return newGrouped;
      });

      Animated.parallel([
        Animated.timing(modalScale,{
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity,{
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRatingModalVisible(false);
        setRatingTarget(null);
      });

      showSuccessMessage("Rating updated!");
      if (typeof route.params.onRefresh === "function") route.params.onRefresh();
    } catch (e) {
      showErrorFetchAPI(e);
    } finally {
      setRatingLoading(false);
    }
  };

  const getMealIcon = (meal) => {
    switch (meal) {
      case "Breakfast":
        return "wb-sunny";
      case "Lunch":
        return "restaurant";
      case "Dinner":
        return "brightness-3";
      default:
        return "fastfood";
    }
  };

  const getMealColor = (meal) => {
    switch (meal) {
      case "Breakfast":
        return "#2563EB";
      case "Lunch":
        return "#059669";
      case "Dinner":
        return "#7C3AED";
      default:
        return "#6B7280";
    }
  };

  const renderRatingModal = () => (
    <Modal
      visible={ratingModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setRatingModalVisible(false)}
    >
      {ratingLoading ? (
        <Loading backgroundColor="rgba(0,0,0,0.7)" logoSize={120} />
      ) : (
        <Animated.View style={[styles.ratingOverlay,{ opacity: modalOpacity }]}>
          <Animated.View style={[styles.ratingModal,{ transform: [{ scale: modalScale }] }]}>
            {/* Enhanced Header */}
            <LinearGradient colors={["#0056d2","#0056d2","#0056d2"]} style={styles.ratingHeader}>
              <View style={styles.ratingHeaderContent}>
                <View style={styles.ratingIconContainer}>
                  <IconAntDesign name="star" size={26} color="#FFFFFF" />
                </View>
                <View style={styles.ratingHeaderText}>
                  <Text style={styles.ratingTitle}>Rate Your Meal</Text>
                  <Text style={styles.ratingSubtitle}>Share your experience</Text>
                </View>
                <TouchableOpacity style={styles.ratingCloseButton} onPress={() => setRatingModalVisible(false)}>
                  <IconFeather name="x" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={styles.ratingBody} showsVerticalScrollIndicator={false}>
              {/* Enhanced Star Rating */}
              <View style={styles.starSection}>
                <Text style={styles.starLabel}>How would you rate this meal?</Text>
                <View style={styles.starContainer}>
                  {[1,2,3,4,5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => {
                        setRatingValue(star);
                        animateStar(star - 1);
                      }}
                      disabled={ratingLoading}
                      style={styles.starButton}
                    >
                      <Animated.View style={{ transform: [{ scale: starAnimations[star - 1] }] }}>
                        <View style={[styles.starWrapper,ratingValue >= star && styles.starWrapperActive]}>
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

                {/* Enhanced Rating Description */}
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
                      <Text style={[styles.descText,{ color: "#EF4444" }]}>Poor - Not satisfied</Text>
                    </View>
                  )}
                  {ratingValue === 2 && (
                    <View style={styles.descriptionContent}>
                      <IconCommunity name="emoticon-neutral-outline" size={18} color="#F59E0B" />
                      <Text style={[styles.descText,{ color: "#F59E0B" }]}>Fair - Could be better</Text>
                    </View>
                  )}
                  {ratingValue === 3 && (
                    <View style={styles.descriptionContent}>
                      <IconCommunity name="emoticon-outline" size={18} color="#FBBF24" />
                      <Text style={[styles.descText,{ color: "#FBBF24" }]}>Good - Satisfied</Text>
                    </View>
                  )}
                  {ratingValue === 4 && (
                    <View style={styles.descriptionContent}>
                      <IconCommunity name="emoticon-happy-outline" size={18} color="#10B981" />
                      <Text style={[styles.descText,{ color: "#10B981" }]}>Very Good - Really enjoyed</Text>
                    </View>
                  )}
                  {ratingValue === 5 && (
                    <View style={styles.descriptionContent}>
                      <IconCommunity name="emoticon-excited-outline" size={18} color="#8B5CF6" />
                      <Text style={[styles.descText,{ color: "#8B5CF6" }]}>Excellent - Amazing!</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Enhanced Notes */}
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
                    placeholder="Share your thoughts about this meal..."
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

              {/* Enhanced Quick Notes */}
              <View style={styles.quickNotesSection}>
                <View style={styles.quickNotesHeader}>
                  <IconCommunity name="lightning-bolt" size={16} color="#667eea" />
                  <Text style={styles.quickNotesLabel}>Quick suggestions</Text>
                </View>
                <View style={styles.quickNotesGrid}>
                  {[
                    { text: "Delicious!",icon: "emoticon-excited" },
                    { text: "Too salty",icon: "water-off" },
                    { text: "Perfect portion",icon: "check-circle" },
                    { text: "Too spicy",icon: "fire" },
                    { text: "Will order again",icon: "repeat" },
                    { text: "Could be better",icon: "arrow-up-circle" },
                  ].map((note,index) => (
                    <TouchableOpacity
                      key={index}
                      style={[styles.quickNote,ratingNote === note.text && styles.quickNoteActive]}
                      onPress={() => setRatingNote(note.text)}
                      disabled={ratingLoading}
                    >
                      <IconCommunity
                        name={note.icon}
                        size={12}
                        color={ratingNote === note.text ? "#FFFFFF" : "#667eea"}
                      />
                      <Text style={[styles.quickNoteText,ratingNote === note.text && styles.quickNoteTextActive]}>
                        {note.text}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Enhanced Submit Button */}
            <View style={styles.ratingFooter}>
              <TouchableOpacity
                style={[styles.submitButton,{ opacity: ratingLoading || ratingValue === 0 ? 0.6 : 1 }]}
                onPress={handleSubmitRating}
                disabled={ratingLoading || ratingValue === 0}
              >
                <LinearGradient colors={["#0056d2","#0056d2","#0056d2"]} style={styles.submitGradient}>
                  <IconFeather name="check-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.submitText}>Submit Rating</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header
        title={dayjs(date).format("dddd")}
        subtitle={dayjs(date).format("MMMM DD, YYYY")}
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: <IconFeather name="trash-2" size={18} color="#EF4444" />,
            onPress: handleDeleteDayLog,
          },
        ]}
      />
      {/* Clean Nutrition Overview */}
      <View style={styles.overview}>
        <View style={styles.overviewHeader}>
          <Text style={styles.overviewTitle}>Daily Summary</Text>
          <Text style={styles.overviewSubtitle}>Nutrition breakdown for today</Text>
        </View>
        <View style={[styles.overviewCards,{ justifyContent: "space-between" }]}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>KCAL</Text>
            <Text style={[styles.overviewValue,{ fontSize: 14 }]}>{Math.round(dayStats.calories)}</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Protein</Text>
            <Text style={[styles.overviewValue,{ fontSize: 14 }]}>{Math.round(dayStats.protein)}g</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Carbs</Text>
            <Text style={[styles.overviewValue,{ fontSize: 14 }]}>{Math.round(dayStats.carbs)}g</Text>
          </View>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Fats</Text>
            <Text style={[styles.overviewValue,{ fontSize: 14 }]}>{Math.round(dayStats.fats)}g</Text>
          </View>
        </View>
      </View>
      {/* Clean Meals */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {MEAL_TYPES.map((mealType) => {
          const mealFoods = grouped[mealType] || [];
          if (mealFoods.length === 0) return null;

          return (
            <View key={mealType} style={styles.mealCard}>
              <View style={[styles.mealHeader,{ borderLeftColor: getMealColor(mealType) }]}>
                <View style={styles.mealHeaderContent}>
                  <View style={styles.mealHeaderText}>
                    <Text style={styles.mealTitle}>{mealType}</Text>
                    <Text style={styles.mealItemCount}>{mealFoods.length} items</Text>
                  </View>
                  <View style={styles.mealCalories}>
                    <IconCommunity name="fire" size={12} color="#EF4444" />
                    <Text style={styles.mealCaloriesText}>
                      {Math.round(mealFoods.reduce((sum,food) => sum + (food.calories || 0),0))} kcal
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.mealContent}>
                {mealFoods.map((food,idx) => (
                  <View key={idx} style={styles.foodCard}>
                    <SafeImage
                      imageUrl={{ uri: food.foodImage || "https://via.placeholder.com/50x50" }}
                      style={styles.foodImage}
                    />
                    <View style={styles.foodInfo}>
                      <View style={styles.foodNameContainer}>
                        <Text style={styles.foodName}>{food.foodName}</Text>
                        {food.count > 1 && (
                          <View style={styles.countTag}>
                            <Text style={styles.countTagText}>+{food.count}</Text>
                          </View>
                        )}
                      </View>
                      {food.quantity && food.quantity > 0 && (
                        <Text style={styles.foodQuantity}>Quantity: {food.quantity.toFixed(1)}</Text>
                      )}

                      {/* Current Rating */}
                      {(food.satisfactionRating || food.notes) && (
                        <View style={styles.currentRating}>
                          {food.satisfactionRating && (
                            <View style={styles.ratingDisplay}>
                              <View style={styles.ratingStars}>
                                {[...Array(5)].map((_,i) => (
                                  <IconAntDesign
                                    key={i}
                                    name="star"
                                    size={8}
                                    color={i < food.satisfactionRating ? "#F59E0B" : "#E5E7EB"}
                                  />
                                ))}
                              </View>
                              <Text style={styles.ratingText}>{food.satisfactionRating}/5</Text>
                            </View>
                          )}
                          {food.notes && (
                            <Text style={styles.noteText} numberOfLines={1}>
                              "{food.notes}"
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Nutrition Badges */}
                      <View style={styles.nutritionBadges}>
                        <View style={styles.badge}>
                          <IconCommunity name="fire" size={8} color="#EF4444" />
                          <Text style={styles.badgeText}>{Math.round(food.calories || 0)}</Text>
                        </View>
                        <View style={styles.badge}>
                          <IconCommunity name="dumbbell" size={8} color="#059669" />
                          <Text style={styles.badgeText}>{Math.round(food.protein || 0)}g</Text>
                        </View>
                        <View style={styles.badge}>
                          <IconCommunity name="grain" size={8} color="#2563EB" />
                          <Text style={styles.badgeText}>{Math.round(food.carbs || 0)}g</Text>
                        </View>
                        <View style={styles.badge}>
                          <IconCommunity name="oil" size={8} color="#D97706" />
                          <Text style={styles.badgeText}>{Math.round(food.fats || 0)}g</Text>
                        </View>
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.rateButton,{ backgroundColor: "#FEF3C7" }]}
                        onPress={() => handleOpenRating(food)}
                      >
                        <View style={styles.rateButtonContent}>
                          <IconAntDesign name="star" size={12} color="#F59E0B" />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.rateButton,{ backgroundColor: "#FEF2F2" }]}
                        onPress={() => handleDeleteFoodLog(food,mealType)}
                      >
                        <View style={styles.rateButtonContent}>
                          <IconFeather name="trash-2" size={12} color="#EF4444" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {renderRatingModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? 20 : 0,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  overview: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginTop: 70,
  },
  overviewHeader: {
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  overviewCards: {
    flexDirection: "row",
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  overviewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  mealHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    borderLeftWidth: 4,
  },
  mealHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mealHeaderText: {
    flex: 1,
  },
  mealTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  mealItemCount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  mealCalories: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  mealCaloriesText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#EF4444",
  },
  mealContent: {
    padding: 20,
  },
  foodCard: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  foodImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 16,
  },
  foodInfo: {
    flex: 1,
  },
  foodNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  foodName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  countTag: {
    backgroundColor: "#E0E7FF",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countTagText: {
    fontSize: 10,
    color: "#2563EB",
    fontWeight: "600",
  },
  foodQuantity: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "500",
  },
  currentRating: {
    marginBottom: 8,
  },
  ratingDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  ratingStars: {
    flexDirection: "row",
    gap: 1,
  },
  ratingText: {
    fontSize: 10,
    color: "#F59E0B",
    fontWeight: "600",
  },
  noteText: {
    fontSize: 10,
    color: "#6B7280",
    fontStyle: "italic",
    fontWeight: "500",
  },
  nutritionBadges: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  badgeText: {
    fontSize: 9,
    color: "#374151",
    fontWeight: "600",
  },
  rateButton: {
    borderRadius: 10,
    marginLeft: 8,
  },
  rateButtonContent: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
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
    shadowOffset: { width: 0,height: 8 },
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
    shadowOffset: { width: 0,height: 2 },
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
    shadowOffset: { width: 0,height: 2 },
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
    shadowOffset: { width: 0,height: 2 },
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
    shadowOffset: { width: 0,height: 4 },
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
});

export default DayDetailsScreen;