import React,{ useState,useEffect,useContext,useCallback,useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  TextInput,
  Modal,
  Switch,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from 'utils/toastUtil';
import { Ionicons } from '@expo/vector-icons';
import apiNotificationService from 'services/apiNotificationService';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from 'context/AuthContext';
import { ThemeContext } from 'components/theme/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from 'components/Header';
import FloatingMenuButton from 'components/FloatingMenuButton';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';

const { width,height } = Dimensions.get('window');
const ITEM_HEIGHT = 120;

const SORT_OPTIONS = [
  { label: 'Date Created',value: 'createdAt' },
  { label: 'Status',value: 'status' },
  { label: 'Type',value: 'notificationType' },
  { label: 'Expiry Date',value: 'expiryAt' },
];

const NOTIFICATION_TYPES = [
  { label: 'All Types',value: '' },
  { label: 'Health Reminder',value: 'health_reminder' },
  { label: 'Workout Alert',value: 'workout_alert' },
  { label: 'Nutrition Tip',value: 'nutrition_tip' },
  { label: 'Achievement',value: 'achievement' },
  { label: 'System',value: 'system' },
];

// Custom debounce hook
const useDebounce = (value,delay) => {
  const [debouncedValue,setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    },delay);

    return () => {
      clearTimeout(handler);
    };
  },[value,delay]);

  return debouncedValue;
};

const NotificationScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const { colors } = useContext(ThemeContext);
  const [notifications,setNotifications] = useState([]);
  const [loading,setLoading] = useState(false);
  const [loadingMore,setLoadingMore] = useState(false);
  const [refreshing,setRefreshing] = useState(false);
  const [hasMore,setHasMore] = useState(true);
  const [error,setError] = useState(null);
  const [searchQuery,setSearchQuery] = useState('');
  const [tempSearchQuery,setTempSearchQuery] = useState('');
  const [showFilters,setShowFilters] = useState(false);
  const [filters,setFilters] = useState({
    sortBy: 'createdAt',
    sortDescending: true,
    pageSize: 10,
    includeRead: true,
    notificationType: '',
  });
  const [tempFilters,setTempFilters] = useState(filters);
  const [pageNumber,setPageNumber] = useState(1);
  const [stats,setStats] = useState({
    total: 0,
    unread: 0,
    expired: 0,
  });
  const [showDetailModal,setShowDetailModal] = useState(false);
  const [selectedNotification,setSelectedNotification] = useState(null);
  const debouncedSearchQuery = useDebounce(tempSearchQuery,500);
  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const loaderFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  },[]);

  useEffect(() => {
    Animated.timing(loaderFadeAnim,{
      toValue: loadingMore ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  },[loadingMore]);

  const fetchNotifications = useCallback(
    async (page = 1,isRefresh = false) => {
      if (!user?.userId) {
        showErrorMessage('User is not authenticated. Please log in.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        if (!isRefresh && page === 1) setLoading(true);
        if (isRefresh) setRefreshing(true);
        if (page > 1) setLoadingMore(true);

        const params = {
          Search: debouncedSearchQuery.trim(),
          SortBy: filters.sortBy,
          SortDescending: filters.sortDescending,
          PageNumber: page,
          PageSize: filters.pageSize,
          IncludeRead: filters.includeRead,
          ...(filters.notificationType && { NotificationType: filters.notificationType }),
        };

        const response = await apiNotificationService.getNotificationsByUserId(user.userId,params);

        if (response.statusCode === 200) {
          const newNotifications = response.data.notifications || [];
          setNotifications((prev) => {
            if (isRefresh || page === 1) return newNotifications;
            const existingIds = new Set(prev.map((n) => n.notificationId));
            const uniqueNewNotifications = newNotifications.filter(
              (n) => !existingIds.has(n.notificationId)
            );
            const updatedNotifications = [...prev,...uniqueNewNotifications];
            // Update stats based on the full dataset
            setStats({
              total: response.data.totalCount || updatedNotifications.length,
              unread: updatedNotifications.filter((n) => !n.isRead).length,
              expired: updatedNotifications.filter((n) => new Date(n.expiryAt) < new Date()).length,
            });
            return updatedNotifications;
          });

          setHasMore(newNotifications.length === filters.pageSize && response.data.totalCount > page * filters.pageSize);
          setPageNumber(page);
        } else {
          showErrorFetchAPI(new Error('Failed to load notifications.'));
          setHasMore(false);
        }
      } catch (err) {
        showErrorFetchAPI(err);
        setError(err.message || 'An error occurred while fetching notifications.');
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [user?.userId,debouncedSearchQuery,filters]
  );

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading && !refreshing) {
      fetchNotifications(pageNumber + 1);
    }
  },[loadingMore,hasMore,loading,refreshing,fetchNotifications,pageNumber]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPageNumber(1);
    fetchNotifications(1,true);
  },[fetchNotifications]);

  const handleViewDetails = useCallback((notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  },[]);

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US',{
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const markNotificationRead = async (notificationId,isRead) => {
    try {
      const updateDto = { notificationIds: [notificationId],isRead };
      await apiNotificationService.updateNotificationReadStatus(updateDto);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.notificationId === notificationId ? { ...notif,isRead } : notif
        )
      );
      setStats((prev) => ({
        ...prev,
        unread: isRead ? prev.unread - 1 : prev.unread + 1,
      }));
      showSuccessMessage(`Notification marked as ${isRead ? 'read' : 'unread'}.`);
    } catch (err) {
      showErrorFetchAPI(err);
    }
  };

  const markAllNotificationsRead = async (isRead) => {
    try {
      await apiNotificationService[
        isRead ? 'markAllNotificationsRead' : 'markAllNotificationsUnread'
      ](user.userId);
      setNotifications((prev) => prev.map((notif) => ({ ...notif,isRead })));
      setStats((prev) => ({
        ...prev,
        unread: isRead ? 0 : prev.total,
      }));
      showSuccessMessage(`All notifications marked as ${isRead ? 'read' : 'unread'}.`);
    } catch (err) {
      showErrorFetchAPI(err);
    }
  };

  const deleteExpiredNotifications = async () => {
    try {
      await apiNotificationService.deleteExpiredNotifications(user.userId);
      setPageNumber(1);
      setNotifications([]);
      setHasMore(true);
      fetchNotifications(1,true);
      showSuccessMessage('Expired notifications deleted.');
    } catch (err) {
      showErrorFetchAPI(err);
    }
  };

  const applyFilters = () => {
    setFilters(tempFilters);
    setSearchQuery(tempSearchQuery);
    setPageNumber(1);
    setNotifications([]);
    setHasMore(true);
    setShowFilters(false);
    fetchNotifications(1,true);
  };

  const resetFilters = () => {
    const defaultFilters = {
      sortBy: 'createdAt',
      sortDescending: true,
      pageSize: 10,
      includeRead: true,
      notificationType: '',
    };
    setTempFilters(defaultFilters);
    setTempSearchQuery('');
    setSearchQuery('');
    setPageNumber(1);
    setNotifications([]);
    setHasMore(true);
    setShowFilters(false);
    fetchNotifications(1,true);
  };

  const handleSearch = () => {
    setSearchQuery(tempSearchQuery);
    setPageNumber(1);
    fetchNotifications(1,true);
  };

  const handleClearSearch = () => {
    setTempSearchQuery('');
    setSearchQuery('');
    setPageNumber(1);
    fetchNotifications(1,true);
  };

  useEffect(() => {
    if (user?.userId) {
      fetchNotifications(1,true);
    }
  },[user?.userId,fetchNotifications]);

  const getNotificationIcon = useCallback(
    (type) => {
      switch (type?.toLowerCase()) {
        case 'health_reminder':
          return { name: 'medical-outline',color: colors.success || '#10B981' };
        case 'workout_alert':
          return { name: 'fitness-outline',color: colors.warning || '#F59E0B' };
        case 'nutrition_tip':
          return { name: 'nutrition-outline',color: colors.primary || '#0056d2' };
        case 'achievement':
          return { name: 'trophy-outline',color: colors.error || '#EF4444' };
        default:
          return { name: 'notifications-outline',color: colors.textSecondary || '#6B7280' };
      }
    },
    [colors]
  );

  const formatTimeAgo = useCallback((dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  },[]);

  const renderNotificationItem = ({ item,index }) => {
    const icon = getNotificationIcon(item.notificationType);
    const isExpired = new Date(item.expiryAt) < new Date();

    return (
      <Animated.View
        style={[
          styles.notificationCard,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0,30],
                  outputRange: [0,30],
                }),
              },
            ],
            backgroundColor: item.isRead ? '#FFFFFF' : colors.accent + '10',
            borderLeftWidth: isExpired ? 4 : item.isRead ? 0 : 4,
            borderLeftColor: isExpired ? colors.error || '#EF4444' : colors.primary || '#0056d2',
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => markNotificationRead(item.notificationId,!item.isRead)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[icon.color + '20',icon.color + '10']}
                style={styles.iconGradient}
              >
                <Ionicons name={icon.name} size={24} color={icon.color} />
              </LinearGradient>
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.titleRow}>
                <Text style={[styles.notificationTitle,{ color: colors.text }]} numberOfLines={1}>
                  {item.notificationType?.replace(/_/g,' ').replace(/\b\w/g,(l) => l.toUpperCase()) ||
                    'Notification'}
                </Text>
                {!item.isRead && <View style={[styles.unreadDot,{ backgroundColor: colors.primary }]} />}
              </View>
              <Text style={[styles.notificationMessage,{ color: colors.textSecondary }]} numberOfLines={2}>
                {item.message.replace(/<\/?p>/g,'')}
              </Text>
              <View style={styles.metaRow}>
                <Text style={[styles.timeText,{ color: colors.textSecondary }]}>{formatTimeAgo(item.createdAt)}</Text>
                {isExpired && (
                  <View style={[styles.expiredBadge,{ backgroundColor: colors.error + '20' }]}>
                    <Text style={[styles.expiredText,{ color: colors.error }]}>Expired</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleViewDetails(item)}
              >
                <Ionicons
                  name="eye-outline"
                  size={20}
                  color={colors.textSecondary || '#6B7280'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => markNotificationRead(item.notificationId,!item.isRead)}
              >
                <Ionicons
                  name={item.isRead ? 'mail-outline' : 'mail-open-outline'}
                  size={20}
                  color={colors.textSecondary || '#6B7280'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderStatsCard = () => (
    <Animated.View
      style={[
        styles.statsCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={[colors.primary || '#0056d2',colors.primary || '#0056d2']}
        style={styles.statsGradient}
        start={{ x: 0,y: 0 }}
        end={{ x: 1,y: 1 }}
      >
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.unread}</Text>
          <Text style={styles.statLabel}>Unread</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowFilters(false);
        setTempFilters(filters);
        setTempSearchQuery(searchQuery);
      }}
    >
      <View style={[styles.modalOverlay,{ backgroundColor: colors.overlay || 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.filterModal,{ backgroundColor: colors.cardBackground || '#FFFFFF' }]}>
          <View style={styles.dragHandle} />
          <View style={[styles.modalHeader,{ borderBottomColor: colors.border || '#F3F4F6' }]}>
            <Text style={[styles.modalTitle,{ color: colors.text || '#1F2937' }]}>Filter & Sort</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={colors.textSecondary || '#6B7280'} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterContent}>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel,{ color: colors.text || '#374151' }]}>Sort By</Text>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.filterOption,
                    tempFilters.sortBy === option.value && [
                      styles.selectedOption,
                      { backgroundColor: colors.accent + '20',borderColor: colors.accent },
                    ],
                  ]}
                  onPress={() => setTempFilters((prev) => ({ ...prev,sortBy: option.value }))}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      tempFilters.sortBy === option.value && [
                        styles.selectedOptionText,
                        { color: colors.accent || '#0056d2' },
                      ],
                    ]}
                  >
                    {option.label}
                  </Text>
                  {tempFilters.sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color={colors.accent || '#0056d2'} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterSection}>
              <View style={styles.switchRow}>
                <Text style={[styles.filterLabel,{ color: colors.text || '#374151' }]}>Descending Order</Text>
                <Switch
                  value={tempFilters.sortDescending}
                  onValueChange={(value) => setTempFilters((prev) => ({ ...prev,sortDescending: value }))}
                  trackColor={{ false: colors.border || '#E5E7EB',true: colors.accent || '#0056d2' }}
                  thumbColor={colors.cardBackground || '#FFFFFF'}
                />
              </View>
            </View>
            <View style={styles.filterSection}>
              <View style={styles.switchRow}>
                <Text style={[styles.filterLabel,{ color: colors.text || '#374151' }]}>
                  Include Read Notifications
                </Text>
                <Switch
                  value={tempFilters.includeRead}
                  onValueChange={(value) => setTempFilters((prev) => ({ ...prev,includeRead: value }))}
                  trackColor={{ false: colors.border || '#E5E7EB',true: colors.accent || '#0056d2' }}
                  thumbColor={colors.cardBackground || '#FFFFFF'}
                />
              </View>
            </View>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel,{ color: colors.text || '#374151' }]}>Notification Type</Text>
              {NOTIFICATION_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.filterOption,
                    tempFilters.notificationType === type.value && [
                      styles.selectedOption,
                      { backgroundColor: colors.accent + '20',borderColor: colors.accent },
                    ],
                  ]}
                  onPress={() => setTempFilters((prev) => ({ ...prev,notificationType: type.value }))}
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      tempFilters.notificationType === type.value && [
                        styles.selectedOptionText,
                        { color: colors.accent || '#0056d2' },
                      ],
                    ]}
                  >
                    {type.label}
                  </Text>
                  {
                    tempFilters.notificationType === type.value && (
                      <Ionicons name="checkmark" size={20} color={colors.accent || '#0056d2'} />
                    )
                  }
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel,{ color: colors.text || '#374151' }]}>
                Items per page: {tempFilters.pageSize}
              </Text>
              <View style={styles.pageSizeContainer}>
                {[5,10,20,50].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.pageSizeButton,
                      tempFilters.pageSize === size && [
                        styles.selectedPageSize,
                        { backgroundColor: colors.accent,borderColor: colors.accent },
                      ],
                    ]}
                    onPress={() => setTempFilters((prev) => ({ ...prev,pageSize: size }))}
                  >
                    <Text
                      style={[
                        styles.pageSizeText,
                        tempFilters.pageSize === size && [
                          styles.selectedPageSizeText,
                          { color: colors.headerText || '#FFFFFF' },
                        ],
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={[styles.modalActions,{ borderBottomColor: colors.border || '#F3F4F6' }]}>
            <TouchableOpacity
              style={[styles.resetButton,{ backgroundColor: colors.border || '#F3F4F6' }]}
              onPress={resetFilters}
            >
              <Text style={[styles.resetButtonText,{ color: colors.textSecondary || '#6B7280' }]}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton,{ backgroundColor: colors.accent || '#0056d2' }]}
              onPress={applyFilters}
            >
              <Text style={[styles.applyButtonText,{ color: colors.textFilter || '#FFFFFF' }]}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View >
    </Modal >
  );

  const renderDetailModal = () => {
    if (!selectedNotification) return null;
    const icon = getNotificationIcon(selectedNotification.notificationType);
    const isExpired = new Date(selectedNotification.expiryAt) < new Date();
    return (
      <Modal
        visible={showDetailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={[styles.detailModalOverlay,{ backgroundColor: colors.overlay || 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.detailModal,{ backgroundColor: colors.cardBackground || '#FFFFFF' }]}>
            <LinearGradient
              colors={[colors.primary || '#0056d2',colors.primary + 'CC' || '#0056d2CC']}
              style={styles.detailModalHeader}
            >
              <View style={styles.detailIconContainer}>
                <Ionicons name={icon.name} size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.detailModalTitle}>
                {selectedNotification.notificationType
                  ?.replace(/_/g,' ')
                  .replace(/\b\w/g,(l) => l.toUpperCase()) || 'Notification'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView
              style={styles.detailModalContent}
              contentContainerStyle={styles.detailModalContentContainer}
            >
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary }]}>Message</Text>
                <Text style={[styles.detailText,{ color: colors.text }]}>
                  {selectedNotification.message.replace(/<\/?p>/g,'')}
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary }]}>Created</Text>
                <Text style={[styles.detailText,{ color: colors.text }]}>
                  {formatDateTime(selectedNotification.createdAt)}
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary }]}>Expires</Text>
                <Text style={[styles.detailText,{ color: colors.text }]}>
                  {formatDateTime(selectedNotification.expiryAt)}
                  {isExpired && (
                    <View style={[styles.expiredBadge,{ backgroundColor: colors.error + '20' }]}>
                      <Text style={[styles.expiredText,{ color: colors.error }]}>Expired</Text>
                    </View>
                  )}
                </Text>
              </View>
              <View style={styles.detailSection}>
                <Text style={[styles.detailLabel,{ color: colors.textSecondary }]}>Status</Text>
                <Text style={[styles.detailText,{ color: colors.text }]}>
                  {selectedNotification.isRead ? 'Read' : 'Unread'}
                </Text>
              </View>
            </ScrollView>
            <View style={styles.detailModalActions}>
              <TouchableOpacity
                style={[styles.detailActionButton,{ backgroundColor: colors.primary || '#0056d2' }]}
                onPress={() => {
                  markNotificationRead(selectedNotification.notificationId,!selectedNotification.isRead);
                  setSelectedNotification((prev) => ({ ...prev,isRead: !prev.isRead }));
                }}
              >
                <Text style={styles.detailActionButtonText}>
                  Mark as {selectedNotification.isRead ? 'Unread' : 'Read'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.detailActionButton,{ backgroundColor: colors.border || '#F3F4F6' }]}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={[styles.detailActionButtonText,{ color: colors.textSecondary || '#6B7280' }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderFooterSkeleton = () => (
    <Animated.View style={[styles.footerLoading,{ opacity: loaderFadeAnim }]}>
      {[...Array(2)].map((_,index) => (
        <View key={index} style={styles.notificationCardSkeleton}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconGradient,styles.skeletonIcon]} />
            </View>
            <View style={styles.notificationContent}>
              <View style={styles.titleRow}>
                <View style={[styles.skeletonText,{ width: '60%',height: 16,marginBottom: 4 }]} />
                <View style={[styles.unreadDot,styles.skeletonDot]} />
              </View>
              <View style={[styles.skeletonText,{ width: '90%',height: 14,marginBottom: 8 }]} />
              <View style={[styles.skeletonText,{ width: '40%',height: 12 }]} />
            </View>
            <View style={styles.actionButtons}>
              <View style={[styles.actionButton,styles.skeletonAction]} />
              <View style={[styles.actionButton,styles.skeletonAction]} />
            </View>
          </View>
        </View>
      ))}
    </Animated.View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return renderFooterSkeleton();
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={colors.textSecondary || '#D1D5DB'} />
      <Text style={[styles.emptyTitle,{ color: colors.text || '#374151' }]}>
        No Notifications
      </Text>
      <Text style={[styles.emptyText,{ color: colors.textSecondary || '#6B7280' }]}>
        {searchQuery ? 'No notifications match your search.' : "You're all caught up!"}
      </Text>
      <TouchableOpacity style={styles.clearFiltersButton} onPress={resetFilters}>
        <Text style={styles.clearFiltersText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea,{ backgroundColor: colors.background }]}>
      <DynamicStatusBar backgroundColor={colors.headerBackground} />
      <Header
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightActions={[
          { icon: 'options-outline',onPress: () => setShowFilters(true),color: colors.primary },
          { icon: 'checkmark-done-outline',onPress: () => markAllNotificationsRead(true),color: colors.primary },
        ]}
      />
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.searchBar,{ backgroundColor: colors.background }]}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary || '#9CA3AF'} />
          <TextInput
            style={[styles.searchInput,{ color: colors.text || '#1F2937' }]}
            placeholder="Search notifications..."
            placeholderTextColor={colors.textSecondary || '#9CA3AF'}
            value={tempSearchQuery}
            onChangeText={setTempSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {tempSearchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={20} color={colors.primary || '#0056d2'} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.searchButton,{ backgroundColor: colors.primary || '#0056d2' }]}
          onPress={handleSearch}
        >
          <Ionicons name="search" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
      {loading && pageNumber === 1 ? (
        <View style={styles.loaderContainer}>
          <CommonSkeleton />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.notificationId.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary || '#0056d2']}
              tintColor={colors.primary || '#0056d2'}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            <>
              {renderStatsCard()}
              <View style={styles.quickActions}>
                <TouchableOpacity
                  style={[styles.quickActionButton,{ backgroundColor: colors.cardBackground || '#FFFFFF' }]}
                  onPress={() => markAllNotificationsRead(true)}
                >
                  <Ionicons name="checkmark-done" size={20} color={colors.success || '#10B981'} />
                  <Text style={[styles.quickActionText,{ color: colors.text || '#374151' }]}>Mark All Read</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickActionButton,{ backgroundColor: colors.cardBackground || '#FFFFFF' }]}
                  onPress={() => markAllNotificationsRead(false)}
                >
                  <Ionicons name="mail-unread" size={20} color={colors.warning || '#F59E0B'} />
                  <Text style={[styles.quickActionText,{ color: colors.text || '#374151' }]}>Mark All Unread</Text>
                </TouchableOpacity>
                {stats.expired > 0 && (
                  <TouchableOpacity
                    style={[styles.quickActionButton,{ backgroundColor: colors.cardBackground || '#FFFFFF' }]}
                    onPress={deleteExpiredNotifications}
                  >
                    <Ionicons name="trash" size={20} color={colors.error || '#EF4444'} />
                    <Text style={[styles.quickActionText,{ color: colors.text || '#374151' }]}>Delete Expired</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          contentContainerStyle={[styles.listContainer,{ minHeight: height }]}
          showsVerticalScrollIndicator={false}
          getItemLayout={(data,index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
        />
      )}
      {renderFilterModal()}
      {renderDetailModal()}
      <FloatingMenuButton
        initialPosition={{ x: width - 70,y: height - 150 }}
        autoHide={true}
        navigation={navigation}
        autoHideDelay={4000}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
    marginTop: 70,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0056d2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsGradient: {
    flexDirection: 'row',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  notificationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  notificationCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skeletonIcon: {
    backgroundColor: '#E5E7EB',
  },
  notificationContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0056d2',
    marginLeft: 8,
  },
  skeletonDot: {
    backgroundColor: '#E5E7EB',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  expiredBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  expiredText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
  },
  skeletonAction: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    width: 20,
    height: 20,
  },
  skeletonText: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#0056d2',
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#0056d2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  selectedOption: {
    backgroundColor: '#e6f0fa',
    borderWidth: 1,
    borderColor: '#0056d2',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#0056d2',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  pageSizeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  pageSizeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedPageSize: {
    backgroundColor: '#0056d2',
    borderColor: '#0056d2',
  },
  pageSizeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  selectedPageSizeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0056d2',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailModal: {
    width: width * 0.9,
    maxHeight: 800,
    minHeight: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  detailIconContainer: {
    marginRight: 12,
  },
  detailModalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  detailModalContent: {
    flex: 1,
  },
  detailModalContentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 24,
  },
  detailModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
});

export default NotificationScreen;