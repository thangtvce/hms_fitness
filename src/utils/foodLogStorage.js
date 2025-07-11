import AsyncStorage from '@react-native-async-storage/async-storage';

const FOOD_LOG_KEY = 'FOOD_LOGS';

// Lưu 1 món ăn vào log theo ngày, buổi
export const addFoodToLog = async (date, mealType, food) => {
  try {
    const existingLog = await getFoodLogByDate(date);
    // Đảm bảo satisfactionRating luôn có, mặc định 0 nếu thiếu
    let foodArray = Array.isArray(food) ? food : [food];
    foodArray = foodArray.map(f => ({
      ...f,
      satisfactionRating: f.satisfactionRating !== undefined ? f.satisfactionRating : 0,
      // Tự động map hình ảnh nếu có foodImage hoặc imageUrl mà chưa có image
      image: f.image || f.foodImage || f.imageUrl || '',
    }));
    const updatedLog = {
      ...existingLog,
      [mealType]: [...(existingLog[mealType] || []), ...foodArray],
    };
    await AsyncStorage.setItem(`foodLog_${date}`, JSON.stringify(updatedLog));
  } catch (error) {
    throw new Error('Failed to add food to log: ' + error.message);
  }
};

export const getFoodLogByDate = async (date) => {
  try {
    const log = await AsyncStorage.getItem(`foodLog_${date}`);
    return log ? JSON.parse(log) : { Breakfast: [], Lunch: [], Dinner: [] };
  } catch (error) {
    return { Breakfast: [], Lunch: [], Dinner: [] };
  }
};

export const clearFoodLogByDate = async (date) => {
  try {
    await AsyncStorage.removeItem(`foodLog_${date}`);
  } catch (error) {
  }
};
// Lấy toàn bộ log
export const getAllFoodLogs = async () => {
  try {
    const logsRaw = await AsyncStorage.getItem(FOOD_LOG_KEY);
    return logsRaw ? JSON.parse(logsRaw) : {};
  } catch (e) {
    return {};
  }
};

// Xóa toàn bộ log
export const clearAllFoodLogs = async () => {
  await AsyncStorage.removeItem(FOOD_LOG_KEY);
};
