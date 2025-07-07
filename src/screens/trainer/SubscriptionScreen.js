import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trainerService } from 'services/apiTrainerService';
import { useAuth } from 'context/AuthContext';

const SubscriptionScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        setLoading(true);
        const response = await trainerService.getAllActiveSubscription({
          userId: user.userId,
        });
        if (response.statusCode === 200 && response.data) {
          setSubscriptions(response.data);
        } else {
          Alert.alert('Error', 'Failed to load subscriptions.');
        }
      } catch (error) {
        Alert.alert('Error', 'An error occurred while fetching subscriptions.');
      } finally {
        setLoading(false);
      }
    };
    if (user?.userId) {
      fetchSubscriptions();
    }
  }, [user]);

  const handleSubscribe = async (packageId) => {
    try {
      const response = await trainerService.createSubscription({
        userId: user.userId,
        packageId,
        startDate: new Date().toISOString(),
      });
      if (response.statusCode === 200) {
        Alert.alert('Success', 'Subscribed successfully.');
        // Refresh subscriptions
        const refreshed = await trainerService.getAllActiveSubscription({ userId: user.userId });
        if (refreshed.statusCode === 200) {
          setSubscriptions(refreshed.data);
        }
      } else {
        Alert.alert('Error', 'Failed to subscribe.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while subscribing.');
    }
  };

  const renderSubscription = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.packageName || 'Unknown Package'}</Text>
      <Text style={styles.subtitle}>
        From: {new Date(item.startDate).toLocaleDateString()}
      </Text>
      <Text style={styles.subtitle}>
        To: {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'Ongoing'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh" size={32} color="#2563EB" style={{ marginBottom: 10 }} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={subscriptions}
          renderItem={renderSubscription}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No active subscriptions.</Text>}
        />
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('ServicePackage')}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Subscribe to a Package</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8FB',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 12,
    margin: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default SubscriptionScreen;