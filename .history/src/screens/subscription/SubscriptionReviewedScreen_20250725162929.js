import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiSubscriptionService } from '../../services/apiSubscriptionService';
import { AuthContext } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { showErrorFetchAPI } from 'utils/toastUtil';

const SubscriptionReviewedScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Giả sử backend có endpoint: /Subscription/reviewed/user/{userId}
      const res = await apiSubscriptionService.getReviewedSubscriptionsForUser(user.userId);
      setData(res || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách đã đánh giá');
      showErrorFetchAPI(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('SubscriptionReviewDetailScreen', { subscription: item })}
    >
      <Text style={styles.title}>{item.packageName}</Text>
      <Text>Trainer: {item.trainerFullName}</Text>
      <Text>Thời gian: {item.startDate?.slice(0, 10)} - {item.endDate?.slice(0, 10)}</Text>
      <Text>Đánh giá: {item.rating} ⭐</Text>
      <Text>Nhận xét: {item.feedbackText || 'Không có nhận xét'}</Text>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 12 }}>Đang tải danh sách đã đánh giá...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={{ color: 'red', marginBottom: 16 }}>{error}</Text>
          <TouchableOpacity onPress={fetchData} style={styles.retryBtn}>
            <Ionicons name="refresh" size={20} color="#2563EB" />
            <Text style={{ color: '#2563EB', marginLeft: 6 }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Đã đánh giá</Text>
        <Text style={styles.headerSubtitle}>{data.length} gói đã đánh giá</Text>
      </View>
      <FlatList
        data={data}
        keyExtractor={(item) => item.subscriptionId.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#2563EB"]} tintColor="#2563EB" />
        }
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 32 }}>Bạn chưa đánh giá gói nào.</Text>}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, backgroundColor: '#E0E7FF', marginBottom: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#2563EB' },
  headerSubtitle: { fontSize: 14, color: '#2563EB', marginTop: 2 },
  listContainer: { padding: 16 },
  card: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
});

export default SubscriptionReviewedScreen;
