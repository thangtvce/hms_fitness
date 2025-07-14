import React,{ useState,useEffect,useRef,useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Image,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons,MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import { RichEditor } from 'react-native-pell-rich-editor';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width } = Dimensions.get('window');

const TrainerPackageDetailScreen = () => {
  const { user,loading: authLoading } = useContext(AuthContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { packageId } = route.params || {};
  const [packageData,setPackageData] = useState(null);
  const [subscriptions,setSubscriptions] = useState([]);
  const [ratings,setRatings] = useState([]);
  const [averageRating,setAverageRating] = useState(0);
  const [totalRatings,setTotalRatings] = useState(0);
  const [loading,setLoading] = useState(true);
  const [loadingSubscriptions,setLoadingSubscriptions] = useState(false);
  const [loadingRatings,setLoadingRatings] = useState(false);
  const [pageNumber,setPageNumber] = useState(1);
  const [totalPages,setTotalPages] = useState(1);
  const [ratingsPageNumber,setRatingsPageNumber] = useState(1);
  const [ratingsTotalPages,setRatingsTotalPages] = useState(1);
  const [showConfirmModal,setShowConfirmModal] = useState(false);
  const [showRatingFilterModal,setShowRatingFilterModal] = useState(false);
  const [confirmMessage,setConfirmMessage] = useState('');
  const [confirmAction,setConfirmAction] = useState(null);
  const [selectedStars,setSelectedStars] = useState(null); // null for all

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (authLoading) return;

    if (!packageId) {
      showErrorFetchAPI(new Error('Invalid package ID'));
      navigation.goBack();
      return;
    }

    const fetchPackageDetails = async () => {
      try {
        setLoading(true);
        const response = await trainerService.getServicePackageById(packageId);
        if (response.statusCode === 200 && response.data) {
          if (response.data.trainerId === user.userId || response.data.trainerId === 0) {
            setPackageData(response.data);
            await fetchSubscriptions(1);
            await fetchRatings(1);
            startAnimations();
          } else {
            showErrorFetchAPI(new Error('You do not have permission to view this package.'));
            navigation.goBack();
          }
        } else {
          showErrorFetchAPI(new Error('Package not found.'));
          navigation.goBack();
        }
      } catch (error) {
        showErrorFetchAPI(error);
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };

    fetchPackageDetails();
  },[authLoading,user,packageId,navigation]);

  const fetchSubscriptions = async (page) => {
    try {
      setLoadingSubscriptions(true);
      const queryParams = { pageNumber: page,pageSize: 10 };
      const response = await trainerService.getSubscriptionByPackageId(packageId,queryParams);
      if (response.statusCode === 200 && response.data) {
        setSubscriptions((prev) => (page === 1 ? response.data.subscriptions : [...prev,...response.data.subscriptions]));
        setTotalPages(response.data.totalPages || 1);
        setPageNumber(page);
      } else {
        showErrorFetchAPI(new Error('No subscriptions found.'));
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const fetchRatings = async (page,stars = null) => {
    try {
      setLoadingRatings(true);
      const queryParams = { pageNumber: page,pageSize: 10 };
      if (stars !== null) {
        queryParams.rating = stars;
      }
      const response = await trainerService.getTrainerRatingsByPackageId(packageId,queryParams);
      if (response.statusCode === 200 && response.data) {
        const newRatings = response.data.ratings;
        setRatings((prev) => (page === 1 ? newRatings : [...prev,...newRatings]));
        setRatingsTotalPages(response.data.totalPages || 1);
        setRatingsPageNumber(page);
        setAverageRating(response.data.averageRating || 0);
        setTotalRatings(response.data.totalRatings || 0);
      } else {
        showErrorFetchAPI(new Error('No ratings found.'));
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setLoadingRatings(false);
    }
  };

  const handleLoadMoreSubscriptions = () => {
    if (pageNumber < totalPages && !loadingSubscriptions) {
      fetchSubscriptions(pageNumber + 1);
    }
  };

  const handleLoadMoreRatings = () => {
    if (ratingsPageNumber < ratingsTotalPages && !loadingRatings) {
      fetchRatings(ratingsPageNumber + 1,selectedStars);
    }
  };

  const applyRatingFilter = (stars) => {
    setSelectedStars(stars);
    setRatings([]);
    setRatingsPageNumber(1);
    fetchRatings(1,stars);
    setShowRatingFilterModal(false);
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleEdit = () => {
    navigation.navigate('EditServicePackage',{ packageId });
  };

  const handleDelete = () => {
    setConfirmMessage('Are you sure you want to delete this package? This action cannot be undone.');
    setConfirmAction(() => async () => {
      try {
        const response = await trainerService.deleteServicePackage(packageId);
        if (response.statusCode === 200) {
          showSuccessMessage('Service package deleted successfully.');
          navigation.navigate('TrainerServiceManagement');
        } else {
          showErrorFetchAPI(new Error(response.message || 'Failed to delete package.'));
        }
      } catch (error) {
        showErrorFetchAPI(error);
      }
    });
    setShowConfirmModal(true);
  };

  const formatMemberCount = (count) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const formatDate = (dateString) => {
    if (!dateString || dateString === '0001-01-01T00:00:00') return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US',{
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown';
    }
  };

  const getPackageIcon = (packageName) => {
    if (!packageName) return 'fitness';
    const name = packageName.toLowerCase();
    if (name.includes('yoga') || name.includes('meditation')) return 'yoga';
    if (name.includes('diet') || name.includes('nutrition')) return 'nutrition';
    if (name.includes('cardio') || name.includes('running')) return 'cardio';
    return 'fitness';
  };

  const renderPackageIcon = (type) => {
    const iconProps = { size: 32,style: styles.icon };
    switch (type) {
      case 'yoga':
        return <MaterialCommunityIcons name="yoga" color="#22C55E" {...iconProps} />;
      case 'nutrition':
        return <Ionicons name="nutrition" color="#F59E0B" {...iconProps} />;
      case 'cardio':
        return <Ionicons name="heart" color="#EF4444" {...iconProps} />;
      default:
        return <MaterialCommunityIcons name="weight-lifter" color="#0056D2" {...iconProps} />;
    }
  };

  const renderRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={16}
          color={i <= rating ? '#F59E0B' : '#CBD5E1'}
        />
      );
    }
    return <View style={styles.starContainer}>{stars}</View>;
  };

  const renderLoadingScreen = () => (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#F8FAFC" />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0056D2" />
        <Text style={styles.loadingText}>Loading package details...</Text>
      </View>
    </SafeAreaView>
  );

  const renderImageSection = () => (
    <Animated.View
      style={[
        styles.imageSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: packageData.trainerAvatar || 'https://static.ladipage.net/5cf71dc895e50d03de993a28/untitled-1-01-20240406073058-6op7o.png' }}
          style={styles.imagePreview}
        />
        <View style={styles.imageLabel}>
          <Ionicons name="image" size={14} color="#FFFFFF" />
          <Text style={styles.imageLabelText}>Package Avatar</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderPackageInfo = () => (
    <Animated.View
      style={[
        styles.infoSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.infoContainer}>
        <Text style={styles.packageName}>{packageData?.packageName || 'Unknown Package'}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>
              {packageData?.price ? `$${packageData.price.toLocaleString()}` : 'Contact'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>Created {formatDate(packageData?.createdAt)}</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="person-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>By {packageData?.trainerFullName || 'Unknown'}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="mail-outline" size={16} color="#0056D2" />
            <Text style={styles.statText}>{packageData?.trainerEmail || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge,{ backgroundColor: packageData?.status === 'active' ? '#DCFCE7' : '#FEE2E2' }]}>
            <Ionicons name="pulse" size={14} color={packageData?.status === 'active' ? '#22C55E' : '#EF4444'} />
            <Text style={[styles.statusText,{ color: packageData?.status === 'active' ? '#22C55E' : '#EF4444' }]}>
              {packageData?.status ? packageData.status.charAt(0).toUpperCase() + packageData.status.slice(1) : 'Active'}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderDescription = () => (
    <Animated.View
      style={[
        styles.descriptionSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Ionicons name="document-text-outline" size={20} color="#0056D2" />
            <Text style={styles.fieldLabel}>Description</Text>
          </View>
        </View>
        {packageData?.description ? (
          <View style={styles.descriptionContainer}>
            <RichEditor
              ref={null}
              initialContentHTML={typeof packageData.description === 'string' ? packageData.description : ''}
              disabled={true}
              style={styles.richEditor}
              editorStyle={{
                backgroundColor: '#FFFFFF',
                color: '#000000',
                fontSize: 16,
                fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
                lineHeight: 24,
                padding: 16,
              }}
            />
          </View>
        ) : (
          <View style={styles.noDescriptionContainer}>
            <Text style={styles.noDescriptionText}>No description available.</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );

  const renderStats = () => (
    <Animated.View
      style={[
        styles.statsSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Ionicons name="stats-chart-outline" size={20} color="#0056D2" />
            <Text style={styles.fieldLabel}>Package Stats</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Duration</Text>
            <Text style={styles.statCardValue}>{packageData?.durationDays || 'N/A'} Days</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Current Subscribers</Text>
            <Text style={styles.statCardValue}>{formatMemberCount(packageData?.currentSubscribers)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>Max Subscribers</Text>
            <Text style={styles.statCardValue}>{formatMemberCount(packageData?.maxSubscribers)}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderTimeline = () => (
    <Animated.View
      style={[
        styles.timelineSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Ionicons name="time-outline" size={20} color="#0056D2" />
            <Text style={styles.fieldLabel}>Timeline</Text>
          </View>
        </View>
        <View style={styles.timelineGrid}>
          <View style={styles.timelineCard}>
            <Text style={styles.timelineCardLabel}>Created</Text>
            <Text style={styles.timelineCardValue}>{formatDate(packageData?.createdAt)}</Text>
          </View>
          <View style={styles.timelineCard}>
            <Text style={styles.timelineCardLabel}>Last Updated</Text>
            <Text style={styles.timelineCardValue}>{packageData?.updatedAt ? formatDate(packageData.updatedAt) : 'Never'}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  const renderSubscriptions = () => (
    <Animated.View
      style={[
        styles.subscriptionsSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Ionicons name="people-outline" size={20} color="#0056D2" />
            <Text style={styles.fieldLabel}>Subscriptions</Text>
          </View>
        </View>
        {subscriptions.length > 0 ? (
          <View style={styles.subscriptionsGrid}>
            {subscriptions.map((sub) => (
              <View key={sub.subscriptionId} style={styles.subscriptionCard}>
                <View style={styles.subscriptionHeader}>
                  <Text style={styles.subscriptionName}>{sub.userFullName || 'Unknown'}</Text>
                  <View
                    style={[
                      styles.subscriptionStatusBadge,
                      { backgroundColor: sub.status === 'paid' ? '#DCFCE7' : '#FEE2E2' },
                    ]}
                  >
                    <Ionicons
                      name="pulse"
                      size={12}
                      color={sub.status === 'paid' ? '#22C55E' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.subscriptionStatusText,
                        { color: sub.status === 'paid' ? '#22C55E' : '#EF4444' },
                      ]}
                    >
                      {sub.status ? sub.status.charAt(0).toUpperCase() + sub.status.slice(1) : 'Unknown'}
                    </Text>
                  </View>
                </View>
                <View style={styles.subscriptionDetails}>
                  <View style={styles.subscriptionDetailItem}>
                    <Ionicons name="mail-outline" size={14} color="#0056D2" />
                    <Text style={styles.subscriptionDetailText}>{sub.userEmail || 'N/A'}</Text>
                  </View>
                  <View style={styles.subscriptionDetailItem}>
                    <Ionicons name="calendar-outline" size={14} color="#0056D2" />
                    <Text style={styles.subscriptionDetailText}>
                      Start: {formatDate(sub.startDate)}
                    </Text>
                  </View>
                  <View style={styles.subscriptionDetailItem}>
                    <Ionicons name="calendar-outline" size={14} color="#0056D2" />
                    <Text style={styles.subscriptionDetailText}>End: {formatDate(sub.endDate)}</Text>
                  </View>
                  <View style={styles.subscriptionDetailItem}>
                    <Ionicons name="time-outline" size={14} color="#0056D2" />
                    <Text style={styles.subscriptionDetailText}>
                      Created: {formatDate(sub.createdAt)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noSubscriptionsContainer}>
            <Text style={styles.noSubscriptionsText}>No subscriptions found.</Text>
          </View>
        )}
        {pageNumber < totalPages && (
          <TouchableOpacity
            style={[styles.loadMoreButton,loadingSubscriptions && styles.loadMoreButtonDisabled]}
            onPress={handleLoadMoreSubscriptions}
            disabled={loadingSubscriptions}
          >
            {loadingSubscriptions ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="reload" size={16} color="#FFFFFF" />
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const renderRatings = () => (
    <Animated.View
      style={[
        styles.ratingsSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Ionicons name="star-outline" size={20} color="#0056D2" />
            <Text style={styles.fieldLabel}>Ratings</Text>
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowRatingFilterModal(true)}>
            <Ionicons name="options-outline" size={20} color="#0056D2" />
          </TouchableOpacity>
        </View>
        <View style={styles.averageRatingContainer}>
          {renderRatingStars(averageRating)}
          <Text style={styles.averageRatingText}>
            {averageRating.toFixed(1)} ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
          </Text>
        </View>
        {ratings.length > 0 ? (
          <View style={styles.ratingsGrid}>
            {ratings.map((rating) => (
              <View key={rating.ratingId} style={styles.ratingCard}>
                <View style={styles.ratingHeader}>
                  <Text style={styles.ratingUserName}>{rating.userFullName || 'Unknown'}</Text>
                  {renderRatingStars(rating.rating)}
                </View>
                <Text style={styles.ratingFeedback}>{rating.feedbackText || 'No feedback'}</Text>
                <Text style={styles.ratingDate}>{formatDate(rating.createdAt)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noRatingsContainer}>
            <Text style={styles.noRatingsText}>No ratings found.</Text>
          </View>
        )}
        {ratingsPageNumber < ratingsTotalPages && (
          <TouchableOpacity
            style={[styles.loadMoreButton,loadingRatings && styles.loadMoreButtonDisabled]}
            onPress={handleLoadMoreRatings}
            disabled={loadingRatings}
          >
            {loadingRatings ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="reload" size={16} color="#FFFFFF" />
                <Text style={styles.loadMoreButtonText}>Load More</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );

  const renderRatingFilterModal = () => (
    <Modal
      visible={showRatingFilterModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowRatingFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.ratingFilterModalContent}>
          <Text style={styles.modalTitle}>Filter by Stars</Text>
          <TouchableOpacity style={styles.filterOption} onPress={() => applyRatingFilter(null)}>
            <Text style={styles.filterOptionText}>All Stars</Text>
          </TouchableOpacity>
          {[5,4,3,2,1].map((stars) => (
            <TouchableOpacity key={stars} style={styles.filterOption} onPress={() => applyRatingFilter(stars)}>
              <Text style={styles.filterOptionText}>{stars} Stars</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.closeModalButton} onPress={() => setShowRatingFilterModal(false)}>
            <Text style={styles.closeModalText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderActionButtons = () => (
    <Animated.View
      style={[
        styles.actionSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
        <Ionicons name="pencil" size={20} color="#FFFFFF" />
        <Text style={styles.editButtonText}>Edit Package</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Ionicons name="trash" size={20} color="#FFFFFF" />
        <Text style={styles.deleteButtonText}>Delete Package</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderConfirmModal = () => (
    <Modal
      visible={showConfirmModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowConfirmModal(false)}
    >
      <View style={styles.confirmModalOverlay}>
        <View style={styles.confirmModalContent}>
          <Text style={styles.confirmModalTitle}>Confirm Action</Text>
          <Text style={styles.confirmModalText}>{confirmMessage}</Text>
          <View style={styles.confirmModalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowConfirmModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={async () => {
                await confirmAction();
                setShowConfirmModal(false);
              }}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading || !packageData) return renderLoadingScreen();

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0056D2" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>#PACKAGE{packageData?.packageId || 'Package'}</Text>
          </View>
          <TouchableOpacity style={styles.filterButton} onPress={handleEdit}>
            <Ionicons name="pencil-outline" size={24} color="#0056D2" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderImageSection()}
        {renderPackageInfo()}
        {renderDescription()}
        {renderStats()}
        {renderTimeline()}
        {renderSubscriptions()}
        {renderRatings()}
        {renderActionButtons()}
      </ScrollView>
      {renderConfirmModal()}
      {renderRatingFilterModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  imageSection: {
    marginBottom: 24,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imageLabel: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  imageLabelText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 24,
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  packageName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  descriptionSection: {
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 0,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  fieldLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 5,
  },
  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  richEditor: {
    minHeight: 120,
    backgroundColor: '#FFFFFF',
  },
  noDescriptionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noDescriptionText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  subscriptionsSection: {
    marginBottom: 24,
  },
  subscriptionsGrid: {
    gap: 12,
  },
  subscriptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  subscriptionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subscriptionStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  subscriptionDetails: {
    gap: 8,
  },
  subscriptionDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subscriptionDetailText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  noSubscriptionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noSubscriptionsText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0056D2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadMoreButtonDisabled: {
    opacity: 0.7,
  },
  loadMoreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timelineSection: {
    marginBottom: 24,
  },
  timelineGrid: {
    gap: 12,
  },
  timelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  timelineCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  timelineCardValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E293B',
  },
  ratingsSection: {
    marginBottom: 24,
  },
  averageRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  starContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  averageRatingText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  ratingsGrid: {
    gap: 12,
  },
  ratingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  ratingFeedback: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  ratingDate: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  noRatingsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noRatingsText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingFilterModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  filterOption: {
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterOptionText: {
    fontSize: 16,
    color: '#1E293B',
  },
  closeModalButton: {
    marginTop: 20,
  },
  closeModalText: {
    fontSize: 16,
    color: '#0056D2',
    fontWeight: '600',
  },
  actionSection: {
    gap: 12,
    marginBottom: 40,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0056D2',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 350,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center',
  },
  confirmModalText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  confirmModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#0056D2',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  icon: {
    marginBottom: 8,
  },
});

export default TrainerPackageDetailScreen;