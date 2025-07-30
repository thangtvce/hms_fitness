import React, { useEffect, useState, useContext } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, TextInput } from 'react-native';
import { showErrorFetchAPI, showSuccessMessage } from 'utils/toastUtil';
import { apiSubscriptionService } from '../../services/apiSubscriptionService';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SubscriptionReviewDetailScreen = ({ route, navigation }) => {
  const { subscription } = route.params;
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(null);
  const [error, setError] = useState(null);
  // State cho form đánh giá
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formFeedback, setFormFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    setShowForm(true);
    setFormRating(5);
    setFormFeedback('');
  };

  const handleEditReview = () => {
    setShowForm(true);
    setFormRating(rating.rating);
    setFormFeedback(rating.feedbackText || '');
  };

  const handleSubmit = async () => {
    if (!formRating || formRating < 1 || formRating > 5) {
      showErrorFetchAPI('Vui lòng chọn số sao từ 1 đến 5.');
      return;
    }
    setSubmitting(true);
    try {
      const ratingDto = {
        subscriptionId: subscription.subscriptionId,
        userId: user.userId,
        trainerId: subscription.trainerId,
        rating: formRating,
        feedbackText: formFeedback,
      };
      let res;
      if (rating) {
        // Đã có đánh giá, gọi PUT
        res = await apiSubscriptionService.putRating(rating.ratingId, ratingDto);
        showSuccessMessage('Cập nhật đánh giá thành công!');
      } else {
        // Chưa có đánh giá, gọi POST
        res = await apiSubscriptionService.postRating(ratingDto);
        showSuccessMessage('Gửi đánh giá thành công!');
      }
      setRating(res);
      setShowForm(false);
    } catch (err) {
      // Ưu tiên lỗi từ response trả về (409, 400, ...)
  
        showErrorFetchAPI(err.message || 'Không gửi được đánh giá');
    
    } finally {
      setSubmitting(false);
    }
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
      {showForm ? (
        <View style={styles.ratingBox}>
          <Text style={styles.ratingTitle}>{rating ? 'Sửa đánh giá' : 'Đánh giá gói này'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ marginRight: 8 }}>Số sao:</Text>
            {[1,2,3,4,5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setFormRating(star)}
                style={{ marginHorizontal: 2 }}
                disabled={submitting}
              >
                <Ionicons
                  name={formRating >= star ? 'star' : 'star-outline'}
                  size={28}
                  color={formRating >= star ? '#FFD600' : '#B0B0B0'}
                />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Nhận xét (không bắt buộc)"
            value={formFeedback}
            onChangeText={setFormFeedback}
            editable={!submitting}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[styles.reviewBtn, submitting && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.reviewBtnText}>{submitting ? 'Đang gửi...' : (rating ? 'Cập nhật' : 'Gửi đánh giá')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowForm(false)} style={{ marginTop: 10 }} disabled={submitting}>
            <Text style={{ color: '#2563EB' }}>Huỷ</Text>
          </TouchableOpacity>
        </View>
      ) : rating ? (
        <View style={styles.ratingBox}>
          <Text style={styles.ratingTitle}>Bạn đã đánh giá gói này</Text>
          <Text>Điểm: {rating.rating} ⭐</Text>
          <Text>Nhận xét: {rating.feedbackText || 'Không có nhận xét'}</Text>
          <Text>Ngày đánh giá: {rating.createdAt?.slice(0, 10)}</Text>
          <TouchableOpacity style={[styles.reviewBtn, { marginTop: 10 }]} onPress={handleEditReview}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.reviewBtnText}>Sửa đánh giá</Text>
          </TouchableOpacity>
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
  input: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B0B0B0',
    padding: 10,
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default SubscriptionReviewDetailScreen;
