
import { useState, useEffect } from "react"
import { View, Text, Modal, TouchableOpacity, Image, Alert, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuth } from "context/AuthContext"
import foodService from "services/apiFoodService"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import dayjs from "dayjs"

const MIN_SERVING = 1
const MAX_SERVING = 2000
const MIN_PORTION = 1
const MAX_PORTION = 10
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"]

const AddFoodScreen = ({ visible, food, mealType = "Breakfast", onClose }) => {
  const { user } = useAuth()
  const [inputValues, setInputValues] = useState({ portionSize: "1", servingSize: "1" })
  const [modalMealType, setModalMealType] = useState(mealType)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      setModalMealType(mealType)
      setInputValues({ portionSize: "1", servingSize: "1" })
    }
  }, [visible, mealType, food])

  const servingSize = Number(inputValues.servingSize) || 1
  const portionSize = Number(inputValues.portionSize) || 1
  const calc = (val) => (Number(val) || 0) * servingSize * portionSize

  const calories = calc(food?.calories)
  const protein = calc(food?.protein)
  const carbs = calc(food?.carbs)
  const fats = calc(food?.fats)

  const handleMealTypeTab = (meal) => {
    setModalMealType(meal)
  }

  const getFoodImage = (foodName) => {
    return `https://source.unsplash.com/400x250/?food,${foodName.replace(/\s/g, "")}`
  }

  const handleAddFood = async () => {
    const { portionSize, servingSize } = inputValues
    const parsedServingSize = Number.parseFloat(servingSize) || 1
    const parsedPortionSize = Number.parseFloat(portionSize) || 1
    const quantity = parsedServingSize * parsedPortionSize

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
      setLoading(true)
      const userId = user?.userId
      if (!userId) throw new Error("User not logged in.")

      const today = dayjs().format("YYYY-MM-DD")
      let image = ""
      if (food.image) image = food.image
      else if (food.foodImage) image = food.foodImage
      else if (food.imageUrl) image = food.imageUrl
      if (!image && food.foodName) image = getFoodImage(food.foodName)

      const foodToSave = {
        ...food,
        userId,
        mealType: modalMealType,
        consumptionDate: today,
        image,
        calories: Number(food.calories) * quantity || 0,
        protein: Number(food.protein) * quantity || 0,
        carbs: Number(food.carbs) * quantity || 0,
        fats: Number(food.fats) * quantity || 0,
        quantity,
        portionSize: parsedPortionSize,
        servingSize: parsedServingSize,
      }

      Object.keys(foodToSave).forEach((key) => {
        if (foodToSave[key] === undefined || foodToSave[key] === null) {
          delete foodToSave[key]
        }
      })

      const res = await foodService.createNutritionLogsBulk([foodToSave], userId)
      if (res.statusCode === 201) {
        showSuccessMessage("Food log saved to server!")
        if (onClose) onClose()
      } else {
        showErrorFetchAPI(res || "Unable to save food log.")
      }
    } catch (error) {
      showErrorFetchAPI(error || error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add Food</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Food Info */}
          <View style={styles.foodInfo}>
            {food?.foodImage || food?.image ? (
              <Image source={{ uri: food.foodImage || food.image }} style={styles.foodImage} />
            ) : null}
            <Text style={styles.foodName}>{food?.foodName}</Text>
          </View>

          {/* Portion Controls */}
          <View style={styles.controlSection}>
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Portion Size:</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() =>
                    setInputValues((prev) => ({
                      ...prev,
                      portionSize: String(Math.max(1, portionSize - 1)),
                    }))
                  }
                >
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{portionSize}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() =>
                    setInputValues((prev) => ({
                      ...prev,
                      portionSize: String(portionSize + 1),
                    }))
                  }
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.controlSection}>
            <View style={styles.controlRow}>
              <Text style={styles.controlLabel}>Serving Size:</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() =>
                    setInputValues((prev) => ({
                      ...prev,
                      servingSize: String(Math.max(1, servingSize - 1)),
                    }))
                  }
                >
                  <Text style={styles.stepperText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{servingSize}</Text>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() =>
                    setInputValues((prev) => ({
                      ...prev,
                      servingSize: String(servingSize + 1),
                    }))
                  }
                >
                  <Text style={styles.stepperText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Nutrition Info */}
          <View style={styles.nutritionContainer}>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Kcal</Text>
              <Text style={styles.nutritionValue}>{calories}</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Carb</Text>
              <Text style={styles.nutritionValue}>{carbs}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Protein</Text>
              <Text style={styles.nutritionValue}>{protein}g</Text>
            </View>
            <View style={styles.nutritionItem}>
              <Text style={styles.nutritionLabel}>Fat</Text>
              <Text style={styles.nutritionValue}>{fats}g</Text>
            </View>
          </View>

          {/* Meal Type Selection */}
          <View style={styles.mealTypeContainer}>
            {MEAL_TYPES.map((meal) => (
              <TouchableOpacity
                key={meal}
                style={[styles.mealTypeButton, modalMealType === meal && styles.mealTypeButtonActive]}
                onPress={() => handleMealTypeTab(meal)}
              >
                <Text style={[styles.mealTypeText, modalMealType === meal && styles.mealTypeTextActive]}>{meal}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add Button */}
          <TouchableOpacity style={styles.addButton} onPress={handleAddFood} disabled={loading}>
            <Text style={styles.addButtonText}>{loading ? "Adding..." : "Add Food"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: "70%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 5,
  },
  foodInfo: {
    alignItems: "center",
    marginBottom: 30,
  },
  foodImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  foodName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  controlSection: {
    marginBottom: 15,
  },
  controlRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  stepperText: {
    fontSize: 18,
    fontWeight: "400",
    color: "#666",
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginHorizontal: 15,
    minWidth: 20,
    textAlign: "center",
  },
  nutritionContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#f8f8f8",
    borderRadius: 10,
    padding: 15,
    marginBottom: 25,
  },
  nutritionItem: {
    alignItems: "center",
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 5,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  mealTypeContainer: {
    flexDirection: "row",
    marginBottom: 25,
  },
  mealTypeButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 2,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  mealTypeButtonActive: {
    backgroundColor: "#007AFF",
  },
  mealTypeText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  mealTypeTextActive: {
    color: "#fff",
  },
  addButton: {
    backgroundColor: "#007AFF",
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
})

export default AddFoodScreen
