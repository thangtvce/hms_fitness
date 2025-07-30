import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@env';
import * as FileSystem from 'expo-file-system';

const apiClient = axios.create({
    baseURL: "https://hms-gateway-proxy.vercel.app/api/proxy",
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    async (config) => {
        const accessToken = await AsyncStorage.getItem('accessToken');
        if (accessToken && config.headers) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const refreshToken = await AsyncStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }
                const response = await apiClient.post('/Auth/refresh-token',{ refreshToken });
                if (response.data.statusCode === 200 && response.data.data) {
                    const { accessToken: newAccessToken,refreshToken: newRefreshToken } = response.data.data;
                    await AsyncStorage.setItem('accessToken',newAccessToken);
                    await AsyncStorage.setItem('refreshToken',newRefreshToken);
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                await AsyncStorage.multiRemove(['accessToken','refreshToken','user']);
                throw refreshError;
            }
        }
        return Promise.reject(error);
    }
);

const GEMINI_KEYS = [
    { key: "AIzaSyDZmpBf9FfciLA70iXKb5xCmRv4_C1gQdg",weight: 100,remaining: 1000 },
    { key: "AIzaSyBvFZ95fFihWvsU1y_MyUPog9wAc6MGwgM",weight: 100,remaining: 1000 },
    { key: "AIzaSyD_nNj69ny_xpn_zw9xq-Jn2SqeKVIdNbk",weight: 100,remaining: 1000 },
    { key: "AIzaSyA0W9OssAPQE39iHlVoBGNxpTeXTh1p_4U",weight: 100,remaining: 1000 },
    { key: "AIzaSyD76fm4WIyiG-0dAA9NM_QniJWHhpmgvXs",weight: 100,remaining: 1000 },
    { key: "AIzaSyCINGgaYkMy1L2vSavql9a7vVKuz9hE2os",weight: 100,remaining: 1000 },
    { key: "AIzaSyApv6sMjv_S6x8AjifvXxKWw4az5EV-B2A",weight: 100,remaining: 1000 },
    { key: "AIzaSyDGEyV7HsZa1x2sPxL2WlaocbJZ3MQASQM",weight: 100,remaining: 1000 },
    { key: "AIzaSyA_pONzlCOacJIPSR5IzyuyUpJ6hjfBZQs",weight: 100,remaining: 1000 }
];

function getRandomKey() {
    const availableKeys = GEMINI_KEYS.filter(k => k.remaining > 0);
    const totalWeight = availableKeys.reduce((sum,k) => sum + k.weight,0);
    const rand = Math.random() * totalWeight;
    let cumulative = 0;

    for (const k of availableKeys) {
        cumulative += k.weight;
        if (rand <= cumulative) return k;
    }
    return availableKeys[0];
}

export const apiFoodScannerService = {
    async scannerFood({ imageFile,imageUrl }) {
        try {
            const formData = new FormData();
            if (imageFile) {
                formData.append('file',imageFile);
            } else if (imageUrl) {
                formData.append('image_url',imageUrl);
            } else {
                throw new Error('Please provide an image file or URL');
            }

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            };

            const response = await apiClient.post('/predict',formData,config);
            return response.data;
        } catch (error) {
            throw error?.response?.data || error;
        }
    },

    async analyzeFoodByGeminiBase64(imageFile,retry = 3) {
        if (!imageFile?.uri) throw new Error("Invalid imageFile");

        let imageUri = imageFile.uri;
        if (!imageUri.startsWith("file://")) {
            imageUri = FileSystem.cacheDirectory + imageUri.split('/').pop();
        }

        const base64Image = await FileSystem.readAsStringAsync(imageUri,{
            encoding: FileSystem.EncodingType.Base64,
        });

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `This is a photo of food. Please return the result in pure JSON format with the following structure:
{
  "food_name": "<name of the dish>",
  "quantity": 1,
  "predictions": [
    {
      "total_weight": <weight in grams>,
      "calories": <calorie value>,
      "fat": <grams of fat>,
      "carbs": <grams of carbs>,
      "protein": <grams of protein>
    }
  ],
  "metrics": {},
  "is_food_image": true,
  "food_confidence": <confidence score from 0 to 1>
}
Only return pure JSON, no explanation or description.`,
                        },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: base64Image,
                            },
                        },
                    ],
                },
            ],
        };

        for (let attempt = 0; attempt < retry; attempt++) {
            const keyInfo = getRandomKey();
            const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${keyInfo.key}`;

            try {
                const response = await axios.post(GEMINI_URL,requestBody,{
                    headers: { 'Content-Type': 'application/json' },
                });

                const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                const jsonMatch = rawText.match(/\{[\s\S]*\}/);

                if (jsonMatch) {
                    keyInfo.remaining--; // giảm quota
                    return JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error("Cannot parse Gemini JSON result");
                }

            } catch (error) {
                const status = error?.response?.status || 0;
                const isQuotaError = status === 403 || status === 429;
                const isRetryable = isQuotaError || status >= 500;

                if (isQuotaError) keyInfo.remaining = 0; // đánh dấu hết quota

                if (attempt < retry - 1 && isRetryable) {
                    console.warn(`Retry with another key... [${attempt + 1}/${retry}]`);
                    continue;
                } else {
                    throw error?.response?.data || error;
                }
            }
        }

        throw new Error("All keys exhausted or failed after retries");
    }

};

export default apiFoodScannerService;