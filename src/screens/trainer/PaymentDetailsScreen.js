import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const PaymentDetailsScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { paymentId } = route.params || {};
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
    };
  }, []);

  useEffect(() => {
    console.log('User:', user);
    console.log('Payment ID:', paymentId);
    if (authLoading) return;
 if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }
    if (!paymentId || paymentId <= 0) {
      Alert.alert('Invalid Payment ID', 'No valid payment ID provided.');
      navigation.goBack();
      return;
    }
    fetchPaymentDetails();
  }, [authLoading, user, paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      console.log('JWT Token:', token);
      setLoading(true);
      const response = await trainerService.getPaymentById(paymentId);
      console.log('API Response:', response);
      console.log('Payment Data:', response.data);

      if (response.statusCode === 200 && response.data) {
        // if (response.data.trainerId !== user.userId) {
        //   Alert.alert('Unauthorized', 'You can only view payments for your own packages.');
        //   navigation.goBack();
        //   return;
        // }
        setPayment(response.data);
      } else {
        Alert.alert('Notice', response.message || 'Unable to load payment details.');
        setPayment(null);
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      Alert.alert('Error', error.message || 'An error occurred while loading payment details.');
      setPayment(null);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Ionicons name="checkmark-circle" size={32} color="#10B981" />;
      case 'pending':
        return <Ionicons name="hourglass" size={32} color="#F59E0B" />;
      case 'canceled':
        return <Ionicons name="close-circle" size={32} color="#EF4444" />;
      default:
        return <Ionicons name="wallet" size={32} color="#4F46E5" />;
    }
  };

  const renderDetailRow = (label, value, icon, color = '#64748B') => (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconContainer, { backgroundColor: '#F1F5F9' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={styles.detailTextContainer}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || 'N/A'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Payment Details</Text>
              <Text style={styles.headerSubtitle}>Loading payment information</Text>
            </View>
            <View style={styles.headerActionButtonPlaceholder} />
          </View>
        </LinearGradient>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loaderText}>Loading payment details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!payment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={theme.primaryColor} />
        <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Payment Details</Text>
              <Text style={styles.headerSubtitle}>Payment not found</Text>
            </View>
            <View style={styles.headerActionButtonPlaceholder} />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Ionicons name="wallet-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Payment Found</Text>
          <Text style={styles.emptyText}>
            The requested payment could not be found. Please try another payment.
          </Text>
          <TouchableOpacity style={styles.backButtonPrimary} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Back to Payment History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={theme.primaryColor} />
      <LinearGradient colors={['#4F46E5', '#6366F1', '#818CF8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Payment Details</Text>
            <Text style={styles.headerSubtitle}>Payment ID: {payment.paymentId}</Text>
          </View>
          <View style={styles.headerActionButtonPlaceholder} />
        </View>
      </LinearGradient>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LinearGradient colors={['#FFFFFF', '#F8FAFC']} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>{getPaymentIcon(payment.status)}</View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>{payment.userFullName || 'Unknown User'}</Text>
                <Text style={styles.cardSubtitle}>{payment.packageName || 'Unknown Package'}</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Payment Information</Text>
                {renderDetailRow('Amount', `$${payment.amount.toLocaleString()}`, 'pricetag-outline', '#4F46E5')}
                {renderDetailRow('Payment Date', new Date(payment.paymentDate).toLocaleString(), 'calendar-outline', '#10B981')}
                {renderDetailRow('Status', payment.status, 'info-circle', payment.status?.toLowerCase() === 'paid' ? '#10B981' : payment.status?.toLowerCase() === 'pending' ? '#F59E0B' : '#EF4444')}
                {renderDetailRow('Transaction Reference', payment.transactionReference, 'receipt-outline', '#EF4444')}
                {renderDetailRow('Payment Method', payment.paymentMethod, 'card-outline')}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>User Information</Text>
                {renderDetailRow('User Name', payment.userFullName, 'person-outline')}
                {renderDetailRow('Email', payment.userEmail, 'mail-outline')}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Package & Subscription</Text>
                {renderDetailRow('Package Name', payment.packageName, 'briefcase-outline')}
                {renderDetailRow('Subscription ID', payment.subscriptionId?.toString(), 'document-text-outline')}
              </View>
            </View>
          </LinearGradient>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  headerActionButtonPlaceholder: {
    width: 40,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  cardContent: {
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loaderText: {
    fontSize: 16,
    color: '#4F46E5',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  backButtonPrimary: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default PaymentDetailsScreen;