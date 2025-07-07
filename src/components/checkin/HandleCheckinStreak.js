import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveLastCheckInDate = async (date) => {
    const isoDate = date.toISOString().split('T')[0];
    await AsyncStorage.setItem('lastCheckIn',isoDate);
};

export const getLastCheckInDate = async () => {
    return await AsyncStorage.getItem('lastCheckIn');
};

export const isCheckedInToday = async () => {
    const last = await getLastCheckInDate();
    const today = new Date().toISOString().split('T')[0];
    return last === today;
};
