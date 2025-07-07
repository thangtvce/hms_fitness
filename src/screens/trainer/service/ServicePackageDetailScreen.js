import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from 'context/AuthContext';
import { theme } from 'theme/color';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import HTML from 'react-native-render-html';

const { width, height } = Dimensions.get('window');

// Modern color palette
const COLORS = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4F46E5',
  secondary: '#F1F5F9',
  accent: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  success: '#22C55E',
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    white: '#FFFFFF',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
  },
  border: '#E2E8F0',
  shadow: 'rgba(15, 23, 42, 0.08)',
};

// Enhanced icon mapping with modern icons
const PACKAGE_ICONS = {
  yoga: { 
    component: MaterialCommunityIcons, 
    name: 'yoga', 
    color: COLORS.accent,
    background: 'rgba(16, 185, 129, 0.1)'
  },
  nutrition: { 
    component: Ionicons, 
    name: 'nutrition', 
    color: COLORS.warning,
    background: 'rgba(245, 158, 11, 0.1)'
  },
  cardio: { 
    component: Ionicons, 
    name: 'heart', 
    color: COLORS.danger,
    background: 'rgba(239, 68, 68, 0.1)'
  },
  fitness: { 
    component: MaterialCommunityIcons, 
    name: 'weight-lifter', 
    color: COLORS.primary,
    background: 'rgba(99, 102, 241, 0.1)'
  },
};

// Enhanced HTML styles
const HTML_STYLES = {
  p: { margin: 0, padding: 0, color: COLORS.text.secondary },
  strong: { fontWeight: '700', color: COLORS.text.primary },
  em: { fontStyle: 'italic' },
  ul: { marginVertical: 8, paddingLeft: 20 },
  ol: { marginVertical: 8, paddingLeft: 20 },
  li: { marginBottom: 6, color: COLORS.text.secondary },
  div: { margin: 0, padding: 0 },
  span: { margin: 0, padding: 0 },
  a: { color: COLORS.primary, textDecorationLine: 'underline' },
};

// Modern Package Icon Component
const PackageIcon = React.memo(({ type, size = 28 }) => {
  const iconConfig = PACKAGE_ICONS[type] || PACKAGE_ICONS.fitness;
  const IconComponent = iconConfig.component;
  
  return (
    <View style={[styles.modernIconContainer, { backgroundColor: iconConfig.background }]}>
      <IconComponent name={iconConfig.name} size={size} color={iconConfig.color} />
    </View>
  );
});

// Modern Detail Item Component
const DetailItem = React.memo(({ icon, label, children, iconColor = COLORS.text.tertiary }) => (
  <View style={styles.modernDetailItem}>
    <View style={styles.detailIconWrapper}>
      <Ionicons name={icon} size={22} color={iconColor} />
    </View>
    <View style={styles.detailContent}>
      <Text style={styles.modernDetailLabel}>{label}</Text>
      <View style={styles.detailValueContainer}>
        {children}
      </View>
    </View>
  </View>
));

// Modern Action Button Component
const ActionButton = React.memo(({ onPress, icon, text, variant = 'primary', style }) => {
  const buttonStyle = variant === 'danger' ? styles.dangerButton : styles.primaryButton;
  const iconColor = variant === 'danger' ? COLORS.danger : COLORS.primary;
  const textColor = variant === 'danger' ? COLORS.danger : COLORS.primary;
  
  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.buttonIconContainer}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.modernButtonText, { color: textColor }]}>{text}</Text>
    </TouchableOpacity>
  );
});

// Modern Status Badge Component
const StatusBadge = React.memo(({ status }) => {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { color: COLORS.success, bg: 'rgba(34, 197, 94, 0.1)', text: 'Active' };
      case 'inactive':
        return { color: COLORS.danger, bg: 'rgba(239, 68, 68, 0.1)', text: 'Inactive' };
      case 'pending':
        return { color: COLORS.warning, bg: 'rgba(245, 158, 11, 0.1)', text: 'Pending' };
      default:
        return { color: COLORS.text.tertiary, bg: 'rgba(148, 163, 184, 0.1)', text: status || 'Unknown' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: config.color }]} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
    </View>
  );
});

// Modern Loading Screen
const LoadingScreen = React.memo(() => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, []);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={COLORS.primary} />
      <View style={styles.modernLoaderContainer}>
        <Animated.View style={[styles.loaderIcon, { transform: [{ rotate }] }]}>
          <MaterialCommunityIcons name="dumbbell" size={40} color={COLORS.primary} />
        </Animated.View>
        <Text style={styles.modernLoaderText}>Loading package details...</Text>
        <Text style={styles.loaderSubtext}>Please wait a moment</Text>
      </View>
    </SafeAreaView>
  );
});

const ServicePackageDetailScreen = () => {
  const { user, loading: authLoading } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { packageId } = route.params;
  
  const [detailPackage, setDetailPackage] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Memoized package type calculation
  const packageType = React.useMemo(() => {
    if (!detailPackage?.packageName) return 'fitness';
    const name = detailPackage.packageName.toLowerCase();
    if (name.includes('yoga') || name.includes('meditation')) return 'yoga';
    if (name.includes('diet') || name.includes('nutrition')) return 'nutrition';
    if (name.includes('cardio') || name.includes('running')) return 'cardio';
    return 'fitness';
  }, [detailPackage?.packageName]);

  // Memoized navigation handlers
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleEditPackage = useCallback(() => {
    navigation.navigate('EditServicePackage', { packageId: detailPackage.packageId });
  }, [navigation, detailPackage?.packageId]);

  const handleActivatePackage = useCallback(async () => {
    try {
      const response = await trainerService.toggleServicePackageStatus(detailPackage.packageId, 'active');
      if (response.statusCode === 200) {
        Alert.alert('Success', 'Package activated successfully.', [
          { text: 'OK', onPress: () => navigation.navigate('TrainerServiceManagement') },
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to activate package.');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'An error occurred while activating the package.');
    }
  }, [navigation, detailPackage?.packageId]);

  // Memoized HTML error handler
  const handleHTMLError = useCallback(() => (
    <Text style={styles.modernDetailText}>
      {detailPackage.description.replace(/<[^>]+>/g, '')}
    </Text>
  ), [detailPackage?.description]);

  // Enhanced animation effect
  useEffect(() => {
    const animateIn = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    };

    animateIn();

    return () => {
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      scaleAnim.setValue(0.95);
    };
  }, [fadeAnim, slideAnim, scaleAnim]);

  // Data fetching effect
  useEffect(() => {
    if (authLoading) return;

    if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      Alert.alert('Access Denied', 'This page is only accessible to trainers.');
      navigation.goBack();
      return;
    }

    const fetchPackage = async () => {
      try {
        setFetchLoading(true);
        const response = await trainerService.getServicePackage({ PackageId: packageId, TrainerId: user.userId });
        
        if (response.statusCode === 200 && response.data?.packages?.length > 0) {
          const packageData = response.data.packages.find(pkg => pkg.packageId === packageId);
          if (packageData && packageData.trainerId === user.userId) {
            setDetailPackage(packageData);
          } else {
            setDetailPackage({ status: 'inactive' }); // Set minimal data for inactive message
          }
        } else {
          setDetailPackage({ status: 'inactive' }); // Handle case where package is not found
        }
      } catch (error) {
        console.error('Fetch Error:', error);
        setDetailPackage({ status: 'inactive' }); // Handle error by showing inactive message
      } finally {
        setFetchLoading(false);
      }
    };

    fetchPackage();
  }, [authLoading, user, packageId, navigation]);

  // Early returns for loading state
  if (fetchLoading) {
    return <LoadingScreen />;
  }

  // Early return for inactive package
  if (detailPackage?.status === 'inactive') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor={COLORS.primary} />
        <View style={styles.modernHeader}>
          <LinearGradient 
            colors={[COLORS.primary, COLORS.primaryLight]} 
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                style={styles.modernBackButton} 
                onPress={handleGoBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color={COLORS.text.white} />
              </TouchableOpacity>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.modernHeaderTitle}>Package Details</Text>
                <Text style={styles.modernHeaderSubtitle}>Manage your service offering</Text>
              </View>
              <View style={{ width: 44 }} /> {/* Placeholder for alignment */}
            </View>
          </LinearGradient>
        </View>
        <View style={styles.inactiveContainer}>
          <Ionicons name="lock-closed-outline" size={64} color={COLORS.text.tertiary} />
          <Text style={styles.inactiveTitle}>Inactive Package</Text>
          <Text style={styles.inactiveMessage}>
            Please activate this package to view its details.
          </Text>
          <TouchableOpacity
            style={styles.activateButton}
            onPress={handleActivatePackage}
            activeOpacity={0.7}
          >
            <Text style={styles.activateButtonText}>Activate Package</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>Back to Management</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!detailPackage) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor={COLORS.primary} />
      
      {/* Modern Header */}
      <View style={styles.modernHeader}>
        <LinearGradient 
          colors={[COLORS.primary, COLORS.primaryLight]} 
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              style={styles.modernBackButton} 
              onPress={handleGoBack}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text.white} />
            </TouchableOpacity>
            
            <View style={styles.headerTitleContainer}>
              <Text style={styles.modernHeaderTitle}>Package Details</Text>
              <Text style={styles.modernHeaderSubtitle}>Manage your service offering</Text>
            </View>
            
            <TouchableOpacity style={styles.headerMenuButton} activeOpacity={0.7}>
              <Feather name="more-vertical" size={24} color={COLORS.text.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Modern Content */}
      <ScrollView 
        style={styles.modernContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
      >
        <Animated.View
          style={[
            styles.modernCardContainer,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
            },
          ]}
        >
          {/* Package Header Card */}
          <View style={styles.packageHeaderCard}>
            <View style={styles.packageHeaderContent}>
              <PackageIcon type={packageType} size={32} />
              <View style={styles.packageTitleSection}>
                <Text style={styles.modernPackageName}>
                  {detailPackage.packageName || 'Service Package'}
                </Text>
                <View style={styles.trainerBadge}>
                  <Ionicons name="person" size={14} color={COLORS.primary} />
                  <Text style={styles.trainerBadgeText}>Created by You</Text>
                </View>
              </View>
              <StatusBadge status={detailPackage.status} />
            </View>
          </View>

          {/* Package Details Card */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Package Information</Text>
            
            <DetailItem icon="document-text-outline" label="Description" iconColor={COLORS.primary}>
              {detailPackage.description ? (
                <HTML
                  source={{ html: detailPackage.description }}
                  contentWidth={width - 100}
                  baseStyle={styles.modernDetailText}
                  tagsStyles={HTML_STYLES}
                  onHTMLParsingError={handleHTMLError}
                />
              ) : (
                <Text style={styles.modernDetailText}>No description available</Text>
              )}
            </DetailItem>

            <DetailItem icon="cash-outline" label="Price" iconColor={COLORS.accent}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>
                  {detailPackage.price ? `$${detailPackage.price.toLocaleString()}` : 'Contact for pricing'}
                </Text>
                {detailPackage.price && (
                  <Text style={styles.priceSubtext}>One-time payment</Text>
                )}
              </View>
            </DetailItem>

            <DetailItem icon="calendar-outline" label="Duration" iconColor={COLORS.warning}>
              <View style={styles.durationContainer}>
                <Text style={styles.durationText}>
                  {detailPackage.durationDays || 'Flexible'} 
                  {detailPackage.durationDays ? ' days' : ''}
                </Text>
                {detailPackage.durationDays && (
                  <Text style={styles.durationSubtext}>
                    Approximately {Math.ceil(detailPackage.durationDays / 7)} weeks
                  </Text>
                )}
              </View>
            </DetailItem>
          </View>

          {/* Action Buttons Card */}
          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.modernActionButtons}>
              <ActionButton
                onPress={handleEditPackage}
                icon="create-outline"
                text="Edit Package"
                variant="primary"
                style={styles.actionButtonFlex}
              />
              <ActionButton
                onPress={() => {
                  Alert.alert(
                    'Deactivate Package',
                    'Are you sure you want to deactivate this package?',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Deactivate', 
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            const response = await trainerService.toggleServicePackageStatus(detailPackage.packageId, 'inactive');
                            if (response.statusCode === 200) {
                              Alert.alert('Success', 'Package deactivated successfully.', [
                                { text: 'OK', onPress: () => navigation.navigate('TrainerServiceManagement') },
                              ]);
                            } else {
                              Alert.alert('Error', response.message || 'Failed to deactivate package.');
                            }
                          } catch (error) {
                            Alert.alert('Error', error.message || 'An error occurred while deactivating the package.');
                          }
                        }
                      }
                    ]
                  );
                }}
                icon="power-outline"
                text="Deactivate"
                variant="danger"
                style={styles.actionButtonFlex}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  modernHeader: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modernBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modernHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.white,
    textAlign: 'center',
  },
  modernHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  headerMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernContent: {
    flex: 1,
    backgroundColor: COLORS.background.secondary,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  modernCardContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  packageHeaderCard: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  packageHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  packageTitleSection: {
    flex: 1,
  },
  modernPackageName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 6,
    lineHeight: 28,
  },
  trainerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  trainerBadgeText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 20,
  },
  modernDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  detailIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  modernDetailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  detailValueContainer: {
    marginTop: 2,
  },
  modernDetailText: {
    fontSize: 15,
    color: COLORS.text.secondary,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: 'column',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent,
  },
  priceSubtext: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  durationContainer: {
    flexDirection: 'column',
  },
  durationText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  durationSubtext: {
    fontSize: 13,
    color: COLORS.text.tertiary,
    marginTop: 2,
  },
  actionsCard: {
    backgroundColor: COLORS.background.primary,
    borderRadius: 20,
    padding: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  modernActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButtonFlex: {
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  buttonIconContainer: {
    marginRight: 8,
  },
  modernButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modernLoaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background.secondary,
    paddingHorizontal: 40,
  },
  loaderIcon: {
    marginBottom: 24,
  },
  modernLoaderText: {
    fontSize: 18,
    color: COLORS.text.primary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  loaderSubtext: {
    fontSize: 14,
    color: COLORS.text.tertiary,
    textAlign: 'center',
  },
  inactiveContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.background.secondary,
  },
  inactiveTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  inactiveMessage: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  activateButton: {
    backgroundColor: COLORS.success,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  activateButtonText: {
    fontSize: 16,
    color: COLORS.text.white,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: COLORS.background.tertiary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: COLORS.text.primary,
    fontWeight: '600',
  },
});

export default ServicePackageDetailScreen;