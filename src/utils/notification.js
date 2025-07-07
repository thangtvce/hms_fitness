import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert,Platform } from 'react-native';
import { API_BASE_URL,EXPO_PROJECT_ID } from '@env';

export async function registerForPushNotificationsAsync(setTokenCallback,userId) {
    try {
        let token = '';

        if (!Device.isDevice) {
            Alert.alert('⚠️ Notification only works on a physical device');
            return;
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            Alert.alert('🚫 Notification permission not granted');
            return;
        }

        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
            projectId: EXPO_PROJECT_ID,
        });

        token = expoPushToken;
        setTokenCallback?.(token);

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default',{
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0,250,250,250],
                lightColor: '#FF231F7C',
            });
        }

        if (token && userId) {
            const accessToken = await AsyncStorage.getItem('accessToken');

            if (accessToken) {
                const response = await fetch(`${API_BASE_URL}/Notification/user/device-token`,{
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        userId: userId,
                        token: token,
                        platform: Platform.OS,
                    }),
                });

                if (response.ok) {
                    console.log('📦 Token sent to server successfully!');
                } else {
                    const errorText = await response.text();
                    console.error('❌ Failed to send token:',response.status,errorText);
                }
            } else {
                console.log('⛔ No accessToken — skipping token submission');
            }
        } else {
            console.log('⚠️ No userId or token, skipping server submission');
        }

        return token;
    } catch (error) {
        console.error('❌ Error registering for push notifications:',error);
        Alert.alert('Push Notification Error',error.message || 'An unexpected error occurred');
    }
}
