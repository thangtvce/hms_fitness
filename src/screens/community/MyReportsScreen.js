import React, { useEffect, useState } from 'react';
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
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getMyReports, createReportByUser } from 'services/apiCommunityService';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MyReportsScreen = ({ navigation }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter states
  const [filters, setFilters] = useState({
    PageNumber: 1,
    PageSize: 50, // Increased to show more items without pagination
    StartDate: '',
    EndDate: '',
    ValidPageSize: 50,
    SearchTerm: '',
    Status: '',
  });

  const [pendingFilters, setPendingFilters] = useState(filters);

  // State for date picker visibility
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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
  }, [filters]);

  // Handle search with debounce effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== filters.SearchTerm) {
        setFilters(prev => ({ ...prev, SearchTerm: searchTerm, PageNumber: 1 }));
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const handleFilterChange = (key, value) => {
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setFilters({ ...pendingFilters, PageNumber: 1 });
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
    return new Date(dateString).toLocaleDateString('en-US', {
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
        return { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' };
      case 'approved':
        return { bg: '#D1FAE5', text: '#065F46', border: '#10B981' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' };
      case 'resolved':
        return { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF' };
    }
  };

  const renderReportItem = ({ item, index }) => {
    const statusColors = getStatusColor(item.status);
    
    return (
      <View style={[styles.reportCard, { marginTop: index === 0 ? 0 : 16 }]}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.reportCardGradient}
        >
          <View style={styles.reportHeader}>
            <View style={styles.reportIdContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.reportId}>#{item.reportId}</Text>
            </View>
            <View style={[
              styles.statusBadge,
              { 
                backgroundColor: statusColors.bg,
                borderColor: statusColors.border
              }
            ]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {item.status}
              </Text>
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
        </LinearGradient>
      </View>
    );
  };

  // Hàm gửi report đúng chuẩn API, trả về lỗi chi tiết và thông báo thành công
  const handleSubmitReport = async (form) => {
    setError(null);
    try {
      // Validate and coerce types for required fields
      const postId = parseInt(form.postId, 10);
      const userId = parseInt(form.userId, 10);
      const reasonId = parseInt(form.reasonId, 10);
      if (!postId || !userId || !reasonId) {
        throw new Error('PostId, UserId, and ReasonId are required and must be positive integers.');
      }
      const payload = {
        reportDto: {
          reportId: 0,
          postId,
          userId,
          reasonId,
          reasonText: form.reasonText ? String(form.reasonText).slice(0, 100) : '',
          details: form.details ? String(form.details).slice(0, 500) : '',
          note: form.note ? String(form.note).slice(0, 1000) : '',
          status: 'pending',
          createdBy: form.createdBy !== undefined ? parseInt(form.createdBy, 10) : null,
          handledBy: form.handledBy !== undefined ? parseInt(form.handledBy, 10) : null,
          createdAt: form.createdAt ? new Date(form.createdAt).toISOString() : null,
          updatedAt: form.updatedAt ? new Date(form.updatedAt).toISOString() : null,
        }
      };
      const res = await createReportByUser(payload);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Report submitted successfully!');
      } else if (global && global.alert) {
        global.alert('Report submitted successfully!');
      }
    } catch (e) {
      let msg = e?.message || 'Error submitting report';
      if (e?.response?.data?.message) {
        msg = e.response.data.message;
      } else if (e?.data?.message) {
        msg = e.data.message;
      }
      setError(msg);
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      } else if (global && global.alert) {
        global.alert(msg);
      }
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Reports</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading your reports...</Text>
            <Text style={styles.loadingSubText}>Please wait a moment</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Reports</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="alert-circle" size={64} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => window.location.reload()}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Gradient */}
      <LinearGradient colors={["#4F46E5", "#6366F1", "#818CF8"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Reports</Text>
          <TouchableOpacity style={styles.filterMenuButton} onPress={() => setShowFilters(true)}>
            <Ionicons name="menu" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Separate Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your reports..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={setSearchTerm}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearchButton}>
                <Ionicons name="close-circle" size={20} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Results Count */}
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {reports.length > 0 ? `${reports.length} report${reports.length !== 1 ? 's' : ''} found` : 'No reports found'}
          </Text>
          {searchTerm && (
            <Text style={styles.searchTermText}>for "{searchTerm}"</Text>
          )}
        </View>
      </View>

      <View style={styles.container}>
        {/* Reports List */}
        <FlatList
          data={reports}
          renderItem={renderReportItem}
          keyExtractor={(item) => item.reportId.toString()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="document-outline" size={80} color="#D1D5DB" />
              </View>
              <Text style={styles.emptyTitle}>No Reports Found</Text>
              <Text style={styles.emptyText}>
                {searchTerm 
                  ? 'Try adjusting your search terms or filters' 
                  : 'You haven\'t submitted any reports yet'
                }
              </Text>
              {searchTerm && (
                <TouchableOpacity 
                  style={styles.clearSearchEmptyButton}
                  onPress={() => setSearchTerm('')}
                >
                  <Text style={styles.clearSearchEmptyText}>Clear Search</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          contentContainerStyle={styles.reportsList}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Enhanced Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <LinearGradient
              colors={["#4F46E5", "#6366F1"]}
              style={styles.filterHeader}
            >
              <Text style={styles.filterTitle}>Filter Options</Text>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setShowFilters(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
              {/* Status Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>
                  <Ionicons name="flag-outline" size={16} color="#4F46E5" /> Status
                </Text>
                <View style={styles.filterPicker}>
                  <Picker
                    selectedValue={pendingFilters.Status}
                    onValueChange={(value) => handleFilterChange('Status', value)}
                  >
                    <Picker.Item label="All Statuses" value="" />
                    <Picker.Item label="Pending" value="pending" />
                    <Picker.Item label="Approved" value="approved" />
                    <Picker.Item label="Rejected" value="rejected" />
                    <Picker.Item label="Resolved" value="resolved" />
                  </Picker>
                </View>
              </View>

              {/* Date Range */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>
                  <Ionicons name="calendar-outline" size={16} color="#4F46E5" /> Start Date
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowStartDatePicker(true)}
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
                    onChange={(event, date) => {
                      setShowStartDatePicker(false);
                      if (date) handleFilterChange('StartDate', date.toISOString());
                    }}
                  />
                )}
              </View>

              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>
                  <Ionicons name="calendar-outline" size={16} color="#4F46E5" /> End Date
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowEndDatePicker(true)}
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
                    onChange={(event, date) => {
                      setShowEndDatePicker(false);
                      if (date) handleFilterChange('EndDate', date.toISOString());
                    }}
                  />
                )}
              </View>
            </ScrollView>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFilterButton} onPress={handleApplyFilters}>
                <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
                <Text style={styles.applyFilterButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingBottom: 20,
    elevation: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  filterMenuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerRight: {
    width: 40,
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    color: '#1F2937',
    fontWeight: '400',
  },
  clearSearchButton: {
    padding: 4,
  },
  resultsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  searchTermText: {
    fontSize: 14,
    color: '#4F46E5',
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  reportsList: {
    paddingTop: 20,
    paddingBottom: 20,
  },
  reportCard: {
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  reportCardGradient: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  reportIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: '#EEF2FF',
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  reportId: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reportContent: {
    gap: 16,
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
    color: '#1F2937',
    flex: 1,
    lineHeight: 20,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
  emptyIconContainer: {
    backgroundColor: '#F9FAFB',
    padding: 24,
    borderRadius: 50,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  clearSearchEmptyButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
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
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    color: '#4F46E5',
    fontWeight: '600',
  },
  loadingSubText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorContent: {
    alignItems: 'center',
    gap: 16,
  },
  errorIconContainer: {
    backgroundColor: '#FEE2E2',
    padding: 20,
    borderRadius: 50,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    marginTop: 8,
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
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    maxHeight: '85%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  closeModalButton: {
    padding: 4,
  },
  filterContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPicker: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  filterActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6B7280',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  applyFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  applyFilterButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MyReportsScreen;