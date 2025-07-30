import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { apiSubscriptionService } from '../../services/apiSubscriptionService';

const SubscriptionReviewScreen = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchData = async (pageNumber = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiSubscriptionService.getSubscriptionsNeedToReviewForUser({ pageNumber, pageSize });
      setData(res);
    } catch (err) {
      setError(err.message || 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.packageName}</Text>
      <Text>Trainer: {item.trainerFullName} ({item.trainerEmail})</Text>
      <Text>Thời gian: {item.startDate?.slice(0,10)} - {item.endDate?.slice(0,10)}</Text>
      <Text>Giá: {item.packagePrice?.toLocaleString()} VND</Text>
      <Text>Trạng thái: {item.status}</Text>
      <Text>Người dùng: {item.userFullName} ({item.userEmail})</Text>
      <TouchableOpacity style={styles.reviewButton} onPress={() => {/* TODO: chuyển sang màn review */}}>
        <Text style={styles.reviewButtonText}>Đánh giá</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#2563EB" />;
  }
  if (error) {
    return <Text style={{ color: 'red', textAlign: 'center', marginTop: 40 }}>{error}</Text>;
  }
  if (!data || !data.subscriptions || data.subscriptions.length === 0) {
    return <Text style={{ textAlign: 'center', marginTop: 40 }}>Không có gói nào cần review.</Text>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data.subscriptions}
        keyExtractor={item => item.subscriptionId.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16 }}
      />
      <View style={styles.pagination}>
        <TouchableOpacity disabled={page <= 1} onPress={() => setPage(page - 1)} style={styles.pageBtn}>
          <Text style={{ color: page <= 1 ? '#ccc' : '#2563EB' }}>{'← Trước'}</Text>
        </TouchableOpacity>
        <Text style={styles.pageText}>Trang {data.pageNumber} / {data.totalPages}</Text>
        <TouchableOpacity disabled={page >= data.totalPages} onPress={() => setPage(page + 1)} style={styles.pageBtn}>
          <Text style={{ color: page >= data.totalPages ? '#ccc' : '#2563EB' }}>{'Sau →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
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
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  reviewButton: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reviewButtonText: { color: '#fff', fontWeight: 'bold' },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  pageBtn: { paddingHorizontal: 16, paddingVertical: 4 },
  pageText: { fontSize: 16, fontWeight: '500', color: '#2563EB' },
});

export default SubscriptionReviewScreen;
