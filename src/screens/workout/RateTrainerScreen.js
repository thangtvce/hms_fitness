import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import { addTrainerRating } from 'services/apiWorkoutPlanService';

export default function RateTrainerScreen({ route, navigation }) {
  const subscription = route?.params?.subscription;
  const [rating, setRating] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(false);

  if (!subscription) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 16 }}>Không có dữ liệu subscription!</Text>
      </View>
    );
  }

  const handleSubmit = async () => {
    if (!rating || isNaN(rating) || rating < 1 || rating > 5) {
      Alert.alert('Lỗi', 'Vui lòng nhập số sao từ 1 đến 5!');
      return;
    }
    setLoading(true);
    try {
      const ratingDto = {
        subscriptionId: subscription.subscriptionId,
        userId: subscription.userId,
        trainerId: subscription.trainerId,
        rating: Number(rating),
        feedbackText,
      };
      const res = await addTrainerRating(ratingDto);
      Alert.alert('Thành công', 'Đánh giá đã được gửi!');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Lỗi', e.message || 'Không thể gửi đánh giá');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Đánh giá huấn luyện viên</Text>
      <Text>Huấn luyện viên: {subscription.trainerFullName}</Text>
      <Text>Email: {subscription.trainerEmail}</Text>
      <TextInput
        style={styles.input}
        placeholder="Số sao (1-5)"
        keyboardType="numeric"
        value={rating}
        onChangeText={setRating}
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder="Nhận xét"
        value={feedbackText}
        onChangeText={setFeedbackText}
        multiline
        editable={!loading}
      />
      <Button title={loading ? 'Đang gửi...' : 'Gửi đánh giá'} onPress={handleSubmit} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
});
