import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import Loading from 'components/Loading';
import { showErrorFetchAPI, showSuccessMessage } from 'utils/toastUtil';
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
      showErrorFetchAPI('Please enter a star rating from 1 to 5!');
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
      await addTrainerRating(ratingDto);
      showSuccessMessage('Your rating has been submitted!');
      navigation.goBack();
    } catch (e) {
      showErrorFetchAPI(e.message || 'Could not submit rating');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', position: 'absolute', width: '100%', height: '100%', zIndex: 999 }}>
          <Loading />
        </View>
      ) : (
        <>
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
          <Button title={'Gửi đánh giá'} onPress={handleSubmit} disabled={loading} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  header: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12 },
});
