import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { apiSubscriptionService } from '../../services/apiSubscriptionService';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SubscriptionReviewDetailScreen = ({ route, navigation }) => {
  const { subscription } = route.params;
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRating = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiSubscriptionService.hasUserRatedSubscription(user.userId, subscription.subscriptionId);
        setRating(res); // null nếu chưa đánh giá, object nếu đã đánh giá
      } catch (err) {
        setError(err.message || 'Lỗi khi kiểm tra đánh giá');
      } finally {
        setLoading(false);
      }
    };
    fetchRating();
  }, [subscription.subscriptionId, user.userId]);

  const handleGoBack = () => navigation.goBack();

  const handleReview = () => {
    // TODO: chuyển sang màn hình tạo đánh giá mới
    Alert.alert('Chức năng đánh giá', 'Chức năng tạo đánh giá sẽ được bổ sung.');
  };

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563EB" />;
  }
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: 'red', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#2563EB" />
          <Text style={{ color: '#2563EB', marginLeft: 6 }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleGoBack} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={20} color="#2563EB" />
        <Text style={{ color: '#2563EB', marginLeft: 6 }}>Quay lại</Text>
      </TouchableOpacity>
      <View style={styles.card}>
        <Text style={styles.title}>{subscription.packageName}</Text>
        <Text>Trainer: {subscription.trainerFullName} ({subscription.trainerEmail})</Text>
        <Text>Thời gian: {subscription.startDate?.slice(0,10)} - {subscription.endDate?.slice(0,10)}</Text>
        <Text>Giá: {subscription.packagePrice?.toLocaleString()} VND</Text>
        <Text>Trạng thái: {subscription.status}</Text>
      </View>
      {rating ? (
        <View style={styles.ratingBox}>
          <Text style={styles.ratingTitle}>Bạn đã đánh giá gói này</Text>
          <Text>Điểm: {rating.rating} ⭐</Text>
          <Text>Nhận xét: {rating.feedbackText || 'Không có nhận xét'}</Text>
          <Text>Ngày đánh giá: {rating.createdAt?.slice(0, 10)}</Text>
        </View>
      ) : (
        <View style={styles.ratingBox}>
          <Text style={styles.ratingTitle}>Bạn chưa đánh giá gói này</Text>
          <TouchableOpacity style={styles.reviewBtn} onPress={handleReview}>
            <Ionicons name="star-outline" size={20} color="#fff" />
            <Text style={styles.reviewBtnText}>Đánh giá ngay</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  card: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  ratingBox: {
    backgroundColor: '#E0E7FF',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  ratingTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#2563EB' },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    marginTop: 10,
  },
  reviewBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default SubscriptionReviewDetailScreen;
