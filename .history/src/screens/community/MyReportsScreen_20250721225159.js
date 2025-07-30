import React,{ useEffect,useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getMyReports } from 'services/apiCommunityService';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import Header from 'components/Header';

const { width } = Dimensions.get('window');

const MyReportsScreen = ({ navigation }) => {
  const [reports,setReports] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [showFilters,setShowFilters] = useState(false);
  const [searchTerm,setSearchTerm] = useState('');
  const [filters,setFilters] = useState({
    PageNumber: 1,
    PageSize: 50,
    StartDate: '',
    EndDate: '',
    ValidPageSize: 50,
    SearchTerm: '',
    Status: '',
  });
  const [pendingFilters,setPendingFilters] = useState(filters);
  const [showStartDatePicker,setShowStartDatePicker] = useState(false);
  const [showEndDatePicker,setShowEndDatePicker] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      try {
        const data = await getMyReports(filters);
        setReports(data);
      } catch (e) {
        setError(e.message || 'Error fetching reports');
      }
      setLoading(false);
    };

    fetchReports();
  },[filters]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== filters.SearchTerm) {
        setFilters((prev) => ({ ...prev,SearchTerm: searchTerm,PageNumber: 1 }));
      }
    },500);

    return () => clearTimeout(delayedSearch);
  },[searchTerm]);

  const handleFilterChange = (key,value) => {
    setPendingFilters((prev) => ({ ...prev,[key]: value }));
  };

  const handleApplyFilters = () => {
    setFilters({ ...pendingFilters,PageNumber: 1 });
    setShowFilters(false);
  };

  const clearFilters = () => {
    const clearedFilters = {
      PageNumber: 1,
      PageSize: 50,
      StartDate: '',
      EndDate: '',
      ValidPageSize: 50,
      SearchTerm: '',
      Status: '',
    };
    setFilters(clearedFilters);
    setPendingFilters(clearedFilters);
    setSearchTerm('');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US',{
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { bg: '#FEF3C7',text: '#92400E',border: '#F59E0B' };
      case 'approved':
        return { bg: '#D1FAE5',text: '#065F46',border: '#10B981' };
      case 'rejected':
        return { bg: '#FEE2E2',text: '#991B1B',border: '#EF4444' };
      case 'resolved':
        return { bg: '#DBEAFE',text: '#1E40AF',border: '#0056d2' };
      default:
        return { bg: '#F3F4F6',text: '#6B7280',border: '#9CA3AF' };
    }
  };

  const renderReportItem = ({ item,index }) => {
    const statusColors = getStatusColor(item.status);

    return (
      <View style={[styles.reportCard,{ marginTop: index === 0 ? 0 : 20 }]}>
        <View style={styles.reportCardContainer}>
          <View style={styles.reportHeader}>
            <View style={styles.reportIdContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={20} color="#0056d2" />
              </View>
              <Text style={styles.reportId}>#{item.reportId}</Text>
            </View>
            <View style={[styles.statusBadge,{ backgroundColor: statusColors.bg,borderColor: statusColors.border }]}>
              <Text style={[styles.statusText,{ color: statusColors.text }]}>{item.status}</Text>
            </View>
          </View>

          <View style={styles.reportContent}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="layers" size={14} color="#6B7280" />
                </View>
                <Text style={styles.infoLabel}>Post ID</Text>
                <Text style={styles.infoValue}>{item.postId}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="flag" size={14} color="#6B7280" />
                </View>
                <Text style={styles.infoLabel}>Reason</Text>
                <Text style={styles.infoValue}>{item.reasonText}</Text>
              </View>
            </View>

            {item.details && (
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="information-circle" size={14} color="#6B7280" />
                  </View>
                  <Text style={styles.infoLabel}>Details</Text>
                  <Text style={styles.infoValue}>{item.details}</Text>
                </View>
              </View>
            )}

            {item.note && (
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="chatbox" size={14} color="#6B7280" />
                  </View>
                  <Text style={styles.infoLabel}>Note</Text>
                  <Text style={styles.infoValue}>{item.note}</Text>
                </View>
              </View>
            )}

            <View style={styles.dateRow}>
              <View style={styles.dateIconContainer}>
                <Ionicons name="time" size={14} color="#6B7280" />
              </View>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Header
          title="My Reports"
          onBack={() => navigation.goBack()}
          rightActions={[]}
          style={{ backgroundColor: '#FFFFFF' }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0056d2" />
          <Text style={styles.loadingText}>Loading your reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Header
          title="My Reports"
          onBack={() => navigation.goBack()}
          rightActions={[]}
          style={{ backgroundColor: '#FFFFFF' }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setFilters({ ...filters,PageNumber: 1 })}
            accessibilityLabel="Retry"
            accessibilityRole="button"
          >
            <LinearGradient colors={["#0056d2","#0041a3"]} style={styles.retryButtonGradient}>
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Header
        title="My Reports"
        onBack={() => navigation.goBack()}
        rightActions={[
          {
            icon: 'filter',
            onPress: () => setShowFilters(true),
            color: '#0056d2',
            backgroundColor: '#F1F5F9',
          },
        ]}
        style={{ backgroundColor: '#FFFFFF' }}
      />

      <View style={[styles.searchSection, { marginTop: 50 }]}> 
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your reports..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
              accessibilityLabel="Search Reports"
              accessibilityRole="search"
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchTerm('')}
                style={styles.clearSearchButton}
                accessibilityLabel="Clear Search"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {reports.length > 0 ? `${reports.length} report${reports.length !== 1 ? 's' : ''} found` : 'No reports found'}
          </Text>
          {searchTerm && <Text style={styles.searchTermText}>for "{searchTerm}"</Text>}
        </View>
      </View>

      <View style={styles.mainContainer}>
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.reportId.toString()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#6B7280" />
              <Text style={styles.emptyTitle}>No Reports Found</Text>
              <Text style={styles.emptyText}>
                {searchTerm ? 'Try adjusting your search terms or filters' : "You haven't submitted any reports yet"}
              </Text>
              {searchTerm && (
                <TouchableOpacity
                  style={styles.clearSearchEmptyButton}
                  onPress={() => setSearchTerm('')}
                  accessibilityLabel="Clear Search"
                  accessibilityRole="button"
                >
                  <LinearGradient colors={["#0056d2","#0041a3"]} style={styles.clearSearchEmptyButtonGradient}>
                    <Text style={styles.clearSearchEmptyText}>Clear Search</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
          contentContainerStyle={styles.reportsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <Modal visible={showFilters} animationType="slide" transparent={true} onRequestClose={() => setShowFilters(false)}>
        <TouchableWithoutFeedback onPress={() => setShowFilters(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => { }}>
              <View style={styles.filterModal}>
                <View style={styles.modalHandle} />
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>Filter Options</Text>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setShowFilters(false)}
                    accessibilityLabel="Close Filters"
                    accessibilityRole="button"
                  >
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>
                      <Ionicons name="flag-outline" size={16} color="#0056d2" style={styles.filterIcon} /> Status
                    </Text>
                    <View style={styles.filterPicker}>
                      <Picker
                        selectedValue={pendingFilters.Status}
                        onValueChange={(value) => handleFilterChange('Status',value)}
                      >
                        <Picker.Item label="All Statuses" value="" />
                        <Picker.Item label="Pending" value="pending" />
                        <Picker.Item label="Approved" value="approved" />
                        <Picker.Item label="Rejected" value="rejected" />
                        <Picker.Item label="Resolved" value="resolved" />
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>
                      <Ionicons name="calendar-outline" size={16} color="#0056d2" style={styles.filterIcon} /> Start Date
                    </Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowStartDatePicker(true)}
                      accessibilityLabel="Select Start Date"
                      accessibilityRole="button"
                    >
                      <Ionicons name="calendar" size={16} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {pendingFilters.StartDate ? formatDate(pendingFilters.StartDate) : 'Select start date'}
                      </Text>
                    </TouchableOpacity>
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={pendingFilters.StartDate ? new Date(pendingFilters.StartDate) : new Date()}
                        mode="datetime"
                        display="default"
                        onChange={(event,date) => {
                          setShowStartDatePicker(false);
                          if (date) handleFilterChange('StartDate',date.toISOString());
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.filterGroup}>
                    <Text style={styles.filterLabel}>
                      <Ionicons name="calendar-outline" size={16} color="#0056d2" style={styles.filterIcon} /> End Date
                    </Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowEndDatePicker(true)}
                      accessibilityLabel="Select End Date"
                      accessibilityRole="button"
                    >
                      <Ionicons name="calendar" size={16} color="#6B7280" />
                      <Text style={styles.dateText}>
                        {pendingFilters.EndDate ? formatDate(pendingFilters.EndDate) : 'Select end date'}
                      </Text>
                    </TouchableOpacity>
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={pendingFilters.EndDate ? new Date(pendingFilters.EndDate) : new Date()}
                        mode="datetime"
                        display="default"
                        onChange={(event,date) => {
                          setShowEndDatePicker(false);
                          if (date) handleFilterChange('EndDate',date.toISOString());
                        }}
                      />
                    )}
                  </View>
                </ScrollView>
                <View style={styles.filterActions}>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearFilters}
                    accessibilityLabel="Clear Filters"
                    accessibilityRole="button"
                  >
                    <Text style={styles.clearButtonText}>Clear All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.applyFilterButton}
                    onPress={handleApplyFilters}
                    accessibilityLabel="Apply Filters"
                    accessibilityRole="button"
                  >
                    <LinearGradient colors={["#0056d2","#0041a3"]} style={styles.applyFilterButtonGradient}>
                      <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  filterMenuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  headerRight: {
    width: 40,
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '400',
  },
  clearSearchButton: {
    padding: 4,
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  searchTermText: {
    fontSize: 14,
    color: '#0056d2',
    fontWeight: '600',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  reportsList: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  reportCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  reportIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#F0F9FF',
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  reportId: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  reportContent: {
    gap: 12,
  },
  infoRow: {
    marginBottom: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoIconContainer: {
    backgroundColor: '#F9FAFB',
    padding: 6,
    borderRadius: 8,
    marginTop: 2,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    minWidth: 80,
    marginTop: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#000000',
    flex: 1,
    lineHeight: 20,
    fontWeight: '400',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dateIconContainer: {
    backgroundColor: '#F9FAFB',
    padding: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
  },
  clearSearchEmptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  clearSearchEmptyButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  clearSearchEmptyText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F8FAFC',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '400',
    marginBottom: 16,
  },
  retryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0,height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
  },
  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterIcon: {
    marginRight: 4,
  },
  filterPicker: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '400',
    flex: 1,
  },
  filterActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  clearButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyFilterButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  applyFilterButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyFilterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MyReportsScreen;