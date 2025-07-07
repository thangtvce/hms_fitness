import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
  Dimensions
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient"
import Icon from 'react-native-vector-icons/Ionicons';
import ticketService from 'services/apiTicketService';
import { AuthContext } from 'context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const TicketListScreen = () => {
  const navigation = useNavigation();
  const { token } = useContext(AuthContext);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [tempStatusFilter, setTempStatusFilter] = useState('All');

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter && statusFilter !== 'All') params.Status = statusFilter;
      if (searchTerm && searchTerm.trim() !== '') params.SearchTerm = searchTerm.trim();
      
      const data = await ticketService.getMyTickets(params);
      const ticketsArr = Array.isArray(data.tickets) ? data.tickets : [];
      
      const validTickets = ticketsArr.filter(
        (item) => item && (item.id || item.ticketId) && item.title && item.status && item.createdAt
      ).map(t => ({ ...t, id: t.id || t.ticketId }));
      
      setTickets(validTickets);
      if (validTickets.length !== ticketsArr.length) {
        setError('Some tickets are missing required fields');
      }
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
      setTickets([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTickets();
    }, [statusFilter, searchTerm])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets(false);
    setRefreshing(false);
  };

  const openFilterModal = () => {
    setTempSearchTerm(searchTerm);
    setTempStatusFilter(statusFilter);
    setShowFilterModal(true);
  };

  const applyFilters = () => {
    setSearchTerm(tempSearchTerm);
    setStatusFilter(tempStatusFilter);
    setShowFilterModal(false);
  };

  const clearFilters = () => {
    setTempSearchTerm('');
    setTempStatusFilter('All');
  };

  const closeModal = () => {
    setShowFilterModal(false);
  };

  const statusConfig = {
    Open: { color: '#10B981', icon: 'radio-button-on', bgColor: '#ECFDF5' },
    Pending: { color: '#F59E0B', icon: 'time', bgColor: '#FFFBEB' },
    Closed: { color: '#EF4444', icon: 'close-circle', bgColor: '#FEF2F2' },
    Resolved: { color: '#8B5CF6', icon: 'checkmark-circle', bgColor: '#F3E8FF' },
    InProgress: { color: '#3B82F6', icon: 'play-circle', bgColor: '#EFF6FF' },
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const renderItem = ({ item }) => {
    const statusInfo = statusConfig[item.status] || statusConfig.Open;
    
    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.ticketTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.ticketId}>#{item.id}</Text>
          </View>
          <View style={[styles.statusContainer, { backgroundColor: statusInfo.bgColor }]}>
            <Icon name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.metaContainer}>
            <View style={styles.metaRow}>
              <Icon name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            </View>
            
            {item.priority && (
              <View style={styles.metaRow}>
                <Icon name="flag-outline" size={14} color={getPriorityColor(item.priority)} />
                <Text style={[styles.metaText, { color: getPriorityColor(item.priority) }]}>
                  {item.priority}
                </Text>
              </View>
            )}
            
            {item.category && (
              <View style={styles.metaRow}>
                <Icon name="folder-outline" size={14} color="#6B7280" />
                <Text style={styles.metaText}>{item.category}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const statusOptions = ['All', 'Open', 'Pending', 'InProgress', 'Resolved', 'Closed'];

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm.trim() !== '') count++;
    if (statusFilter !== 'All') count++;
    return count;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#fff', paddingTop: 10, paddingBottom: 20, paddingHorizontal: 16 }]}> 
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#222" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerTitle, { color: '#1F2937' }]}>My Tickets</Text>
            <Text style={[styles.headerSubtitle, { color: '#64748B' }]}> 
              {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'}
              {getActiveFiltersCount() > 0 && ` • ${getActiveFiltersCount()} filter${getActiveFiltersCount() > 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.menuButton, getActiveFiltersCount() > 0 && styles.menuButtonActive]}
            onPress={openFilterModal}
          >
            <Icon name="options" size={24} color="#222" />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Create Button */}
      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: 'transparent', elevation: 0 }]}
        onPress={() => navigation.navigate('CreateTicket')}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12 }}>
          <Icon name="add" size={20} color="#222" />
          <Text style={[styles.createButtonText, { color: '#1F2937', marginLeft: 8 }]}>Create New Ticket</Text>
        </View>
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Loading tickets...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchTickets()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={["#4F46E5"]}
                tintColor="#4F46E5"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="document-text-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Tickets Found</Text>
                <Text style={styles.emptySubtitle}>
                  {searchTerm || statusFilter !== 'All' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first ticket to get started'
                  }
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search & Filter</Text>
              <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                <Icon name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search Section */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Search Tickets</Text>
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter keywords..."
                  value={tempSearchTerm}
                  onChangeText={setTempSearchTerm}
                  returnKeyType="search"
                />
                {tempSearchTerm.length > 0 && (
                  <TouchableOpacity onPress={() => setTempSearchTerm('')}>
                    <Icon name="close-circle" size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Status Filter Section */}
            <View style={styles.modalSection}>
              <Text style={styles.sectionTitle}>Filter by Status</Text>
              <View style={styles.statusGrid}>
                {statusOptions.map((status) => {
                  const isActive = tempStatusFilter === status;
                  const statusInfo = statusConfig[status];
                  
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        isActive && styles.statusOptionActive,
                        isActive && statusInfo && { backgroundColor: statusInfo.color, borderColor: statusInfo.color }
                      ]}
                      onPress={() => setTempStatusFilter(status)}
                    >
                      {statusInfo && isActive && (
                        <Icon name={statusInfo.icon} size={16} color="#FFFFFF" style={styles.statusIcon} />
                      )}
                      <Text style={[
                        styles.statusOptionText,
                        isActive && styles.statusOptionTextActive
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={closeModal}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                  <LinearGradient
                    colors={["#4F46E5", "#6366F1"]}
                    style={styles.applyButtonGradient}
                  >
                    <Text style={styles.applyButtonText}>Apply Filters</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
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
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  menuButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  createButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 0,
    shadowColor: 'transparent',
  },
  // Removed createButtonGradient, replaced with View inline style
  createButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 22,
  },
  ticketId: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  cardContent: {
    gap: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  metaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginVertical: 16,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: width - 40,
    maxHeight: height * 0.8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: '#1F2937',
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  statusOptionActive: {
    borderColor: 'transparent',
  },
  statusIcon: {
    marginRight: 6,
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  statusOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalActions: {
    padding: 20,
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 1,
    borderRadius: 12,
  },
  applyButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default TicketListScreen;