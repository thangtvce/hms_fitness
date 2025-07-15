// Utility for getting/setting water target in AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const WATER_TARGET_KEY = 'user_water_target';

export async function getTargetWaterLog(userId) {
  try {
    const raw = await AsyncStorage.getItem(`${WATER_TARGET_KEY}_${userId}`);
    if (raw) {
      return JSON.parse(raw);
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function setTargetWaterLog(userId, targetMl, type) {
  try {
    const data = { targetMl, type };
    await AsyncStorage.setItem(`${WATER_TARGET_KEY}_${userId}`, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function getTargetWaterUnits(type) {
  if (type === 'cup') return 'ml';
  if (type === 'bottle') return 'ml';
  return 'ml';
}
