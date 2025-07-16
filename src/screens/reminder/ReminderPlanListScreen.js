import React, { useEffect, useState, useContext } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  Switch,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiReminderService } from 'services/apiReminderService';
import { AuthContext } from 'context/AuthContext';
import Loading from 'components/Loading';
import { showErrorFetchAPI, showSuccessMessage } from 'utils/toastUtil';
import Header from 'components/Header';

const { width } = Dimensions.get('window');

const TYPE_OPTIONS = [
  { 
    label: 'All', 
    value: '', 
    icon: 'apps',
    color: '#6B7280',
    gradient: ['#6B7280', '#9CA3AF']
  },
  { 
    label: 'Water', 
    value: 'drink', 
    icon: 'water',
    color: '#06B6D4',
    gradient: ['#06B6D4', '#0EA5E9']
  },
  { 
    label: 'Meal', 
    value: 'meal', 
    icon: 'restaurant',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#EAB308']
  },
  { 
    label: 'Exercise', 
    value: 'exercise', 
    icon: 'fitness',
    color: '#10B981',
    gradient: ['#10B981', '#059669']
  },
  { 
    label: 'Sleep', 
    value: 'sleep', 
    icon: 'moon',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#7C3AED']
  },
];

export default function ReminderPlanListScreen() {
  const { user } = useContext(AuthContext);
  const userId = user?.userId;
  const navigation = useNavigation();
  
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [error, setError] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  
  const [filters, setFilters] = useState({
    pageNumber: 1,
    pageSize: 50,
    validPageSize: 50,
    searchTerm: '',
    status: '',
    startDate: null,
    endDate: null,
  });

  useEffect(() => {
    fetchPlans();
  }, [userId, filters, selectedType]);

  // Lọc theo categories (type) ở client, chỉ hiển thị đúng loại đã chọn
  const filteredPlans = selectedType
    ? plans.filter((plan) => plan.type === selectedType)
    : plans;

  const handleToggleActive = async (plan) => {
    try {
      const updatedPlan = { ...plan, isActive: !plan.isActive };
      await apiReminderService.updateReminderPlan(plan.planId, updatedPlan);
      setPlans((prev) => 
        prev.map((p) => 
          p.planId === plan.planId ? { ...p, isActive: updatedPlan.isActive } : p
        )
      );
      showSuccessMessage(`Reminder ${updatedPlan.isActive ? 'enabled' : 'disabled'} successfully!`);
    } catch (err) {
      showErrorFetchAPI(err.message || 'Failed to update reminder status.');
    }
  };

  const fetchPlans = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    try {
      const params = {
        PageNumber: filters.pageNumber,
        PageSize: filters.pageSize,
        ValidPageSize: filters.validPageSize,
        SearchTerm: searchQuery || filters.searchTerm,
        Status: filters.status,
        StartDate: filters.startDate,
        EndDate: filters.endDate,
        Type: selectedType,
      };
      const res = await apiReminderService.getReminderPlansByUserId(userId, params);
      setPlans(res?.data?.plans || []);
    } catch (err) {
      setError(err.message || 'Failed to load reminder plans');
      showErrorFetchAPI(err.message || 'Failed to load reminder plans.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchPlans(true);
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    // Debounce search
    setTimeout(() => {
      fetchPlans();
    }, 500);
  };

  const getTypeIcon = (type) => {
    const typeOption = TYPE_OPTIONS.find(option => option.value === type);
    return typeOption ? typeOption.icon : 'notifications';
  };

  const getTypeColor = (type) => {
    const typeOption = TYPE_OPTIONS.find(option => option.value === type);
    return typeOption ? typeOption.color : '#6B7280';
  };

  const getActiveRemindersCount = () => {
    return plans.filter(plan => plan.isActive).length;
  };

  const getTotalRemindersCount = () => {
    return plans.length;
  };

  const renderHeader = () => (
    <Header
      title={
        <View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1F2937', textAlign: 'center' }}>My Reminders</Text>
          <Text style={{ fontSize: 14, color: '#64748B', marginTop: 2, textAlign: 'center' }}>
            {getActiveRemindersCount()} of {getTotalRemindersCount()} active
          </Text>
        </View>
      }
      onBack={() => navigation.goBack()}
      rightActions={[
        {
          icon: showSearch ? 'close' : 'search',
          onPress: () => setShowSearch(!showSearch),
          color: '#222',
        },
        {
          icon: 'filter',
          onPress: () => setFilterModalVisible(true),
          color: '#222',
        },
      ]}
      backgroundColor="#fff"
      containerStyle={{ position: 'relative', zIndex: 10 }}
    />
  );

  const renderTypeFilters = () => (
    <View style={styles.typeFiltersContainer}>
      <Text style={styles.typeFiltersTitle}>Categories</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.typeFiltersScroll}
      >
        {TYPE_OPTIONS.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeFilterCard,
              selectedType === type.value && styles.typeFilterCardSelected
            ]}
            onPress={() => setSelectedType(type.value)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={selectedType === type.value ? type.gradient : ['#FFFFFF', '#F8FAFC']}
              style={styles.typeFilterGradient}
            >
              <View style={[
                styles.typeFilterIconContainer,
                { 
                  backgroundColor: selectedType === type.value 
                    ? 'rgba(255,255,255,0.2)' 
                    : `${type.color}15` 
                }
              ]}>
                <Ionicons 
                  name={type.icon} 
                  size={20} 
                  color={selectedType === type.value ? '#FFFFFF' : type.color} 
                />
              </View>
              <Text style={[
                styles.typeFilterText,
                { color: selectedType === type.value ? '#FFFFFF' : '#1F2937' }
              ]}>
                {type.label}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderReminderCard = ({ item }) => (
    <View style={styles.reminderCard}>
      <TouchableOpacity
        style={styles.reminderCardContent}
        onPress={() => navigation.navigate('ReminderPlanDetailScreen', { planId: item.planId })}
        activeOpacity={0.8}
      >
        <View style={styles.reminderCardLeft}>
          <View style={[
            styles.reminderIconContainer,
            { backgroundColor: `${getTypeColor(item.type)}15` }
          ]}>
            <Ionicons 
              name={getTypeIcon(item.type)} 
              size={24} 
              color={getTypeColor(item.type)} 
            />
          </View>
          
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTitle}>{item.title}</Text>
            <View style={styles.reminderMeta}>
              <View style={styles.reminderMetaItem}>
                <Ionicons name="time" size={14} color="#6B7280" />
                <Text style={styles.reminderMetaText}>{item.time}</Text>
              </View>
              <View style={styles.reminderMetaItem}>
                <Ionicons name="repeat" size={14} color="#6B7280" />
                <Text style={styles.reminderMetaText}>{item.frequency || 'Daily'}</Text>
              </View>
            </View>
            {item.amount && (
              <View style={styles.reminderAmount}>
                <Text style={styles.reminderAmountText}>{item.amount}</Text>
              </View>
            )}
          </View>
        </View>
        
        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
      </TouchableOpacity>
      
      <View style={styles.reminderCardActions}>
        <View style={styles.reminderToggleContainer}>
          <Text style={[
            styles.reminderToggleLabel,
            { color: item.isActive ? '#10B981' : '#6B7280' }
          ]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
          <Switch
            value={item.isActive}
            onValueChange={() => handleToggleActive(item)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={item.isActive ? '#FFFFFF' : '#F3F4F6'}
            ios_backgroundColor="#E5E7EB"
            style={styles.reminderToggle}
          />
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="notifications-outline" size={64} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Reminders Found</Text>
      <Text style={styles.emptyText}>
        {selectedType 
          ? `No ${TYPE_OPTIONS.find(t => t.value === selectedType)?.label.toLowerCase()} reminders found.`
          : 'Create your first reminder to get started!'
        }
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.navigate('AddReminderPlanScreen')}
      >
        <LinearGradient
          colors={['#0056d2', '#0056d2']}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.emptyButtonText}>Create Reminder</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filter Reminders</Text>
            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              style={styles.filterModalClose}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterModalContent}>
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptions}>
                {[
                  { label: 'All', value: '' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' }
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.filterOption,
                      filters.status === option.value && styles.filterOptionSelected
                    ]}
                    onPress={() => setFilters(prev => ({ ...prev, status: option.value }))}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.status === option.value && styles.filterOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.filterModalActions}>
            <TouchableOpacity
              style={styles.filterResetButton}
              onPress={() => {
                setFilters({
                  pageNumber: 1,
                  pageSize: 50,
                  validPageSize: 50,
                  searchTerm: '',
                  status: '',
                  startDate: null,
                  endDate: null,
                });
                setSelectedType('');
                setSearchQuery('');
              }}
            >
              <Text style={styles.filterResetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterApplyButton}
              onPress={() => {
                setFilterModalVisible(false);
                fetchPlans();
              }}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.filterApplyButtonGradient}
              >
                <Text style={styles.filterApplyButtonText}>Apply Filters</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <Loading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor="#4F46E5"
          />
        }
      >
        {renderTypeFilters()}
        
        <View style={styles.remindersSection}>
          <View style={styles.remindersSectionHeader}>
            <Text style={styles.remindersSectionTitle}>
              {selectedType 
                ? `${TYPE_OPTIONS.find(t => t.value === selectedType)?.label} Reminders`
                : 'All Reminders'
              }
            </Text>
            <Text style={styles.remindersCount}>
              {plans.length} {plans.length === 1 ? 'reminder' : 'reminders'}
            </Text>
          </View>
          
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => fetchPlans()}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : plans.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={filteredPlans}
              keyExtractor={(item) => item.planId?.toString() || Math.random().toString()}
              renderItem={renderReminderCard}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.remindersList}
            />
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddReminderPlanScreen')}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#0056d2', '#0056d2']}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {renderFilterModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerGradient: {
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    paddingHorizontal: 20,
    alignItems: 'center', // Center content horizontally
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    width: '100%',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center', // Center title horizontally
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchContainer: {
    marginTop: 16,
    width: '100%',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFFFFF',
    placeholderTextColor: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    flex: 1,
  },
  typeFiltersContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  typeFiltersTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  typeFiltersScroll: {
    paddingRight: 20,
  },
  typeFilterCard: {
    borderRadius: 16,
    marginRight: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  typeFilterCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  typeFilterGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  typeFilterIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeFilterText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  remindersSection: {
    padding: 20,
    paddingTop: 10,
  },
  remindersSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  remindersSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  remindersCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  remindersList: {
    gap: 12,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  reminderCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reminderCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reminderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  reminderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  reminderMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderMetaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  reminderAmount: {
    marginTop: 4,
  },
  reminderAmountText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '600',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  reminderCardActions: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  reminderToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  reminderToggle: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
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
  errorContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  filterModalClose: {
    padding: 4,
  },
  filterModalContent: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  filterOptionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterOptionTextSelected: {
    color: '#FFFFFF',
  },
  filterModalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  filterResetButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterResetButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterApplyButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterApplyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  filterApplyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});