import React,{ useEffect,useState,useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useNavigation,useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Header from 'components/Header';
import ticketService from 'services/apiTicketService';
import { AuthContext } from 'context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from 'utils/toastUtil';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const TicketListScreen = () => {
  const navigation = useNavigation();
  const { token } = useContext(AuthContext);
  const [tickets,setTickets] = useState([]);
  const [loading,setLoading] = useState(false);
  const [refreshing,setRefreshing] = useState(false);
  const [error,setError] = useState(null);
  const [statusFilter,setStatusFilter] = useState('All');
  const [searchTerm,setSearchTerm] = useState('');

  const validStatuses = ['open','inprogress','resolved'];
  const statusOptions = ['All',...validStatuses.map(status => status.charAt(0).toUpperCase() + status.slice(1))];

  const fetchTickets = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const params = {};
      if (statusFilter !== 'All') params.Status = statusFilter.toLowerCase();
      if (searchTerm.trim() !== '') params.SearchTerm = searchTerm.trim();
      const data = await ticketService.getMyTickets(params);
      const ticketsArr = Array.isArray(data.tickets) ? data.tickets : [];
      const validTickets = ticketsArr
        .filter(
          (item) =>
            item &&
            (item.id || item.ticketId) &&
            item.title &&
            item.status &&
            item.createdAt &&
            validStatuses.includes(item.status.toLowerCase())
        )
        .map((t) => ({ ...t,id: t.id || t.ticketId }));
      setTickets(validTickets);
      if (validTickets.length !== ticketsArr.length) {
        setError('Some tickets are missing required fields or have invalid statuses');
        showErrorMessage('Some tickets are missing required fields or have invalid statuses');
      }
    } catch (err) {
      setError(err.message || 'Failed to load tickets');
      setTickets([]);
      showErrorFetchAPI(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchTickets();
    },[statusFilter,searchTerm])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets(false);
    setRefreshing(false);
  };

  const statusConfig = {
    All: {
      color: '#6B7280',
      icon: 'list-circle',
      bgColor: '#F3F4F6',
    },
    Open: {
      color: '#10B981',
      icon: 'radio-button-on',
      bgColor: '#ECFDF5',
    },
    Inprogress: {
      color: '#3B82F6',
      icon: 'play-circle',
      bgColor: '#EFF6FF',
    },
    Resolved: {
      color: '#8B5CF6',
      icon: 'checkmark-circle',
      bgColor: '#F3E8FF',
    },
  };


  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US',{
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderItem = ({ item }) => {
    const statusInfo = statusConfig[item.status.charAt(0).toUpperCase() + item.status.slice(1)] || statusConfig.Open;

    return (
      <TouchableOpacity
        style={styles.ticketCard}
        onPress={() => navigation.navigate('TicketDetail',{ ticketId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.ticketTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.ticketId}>#{item.id}</Text>
          </View>
          <View style={[styles.statusContainer,{ backgroundColor: statusInfo.bgColor }]}>
            <Icon name={statusInfo.icon} size={14} color={statusInfo.color} />
            <Text style={[styles.statusText,{ color: statusInfo.color }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
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
                <Text style={[styles.metaText,{ color: getPriorityColor(item.priority) }]}>
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

  const getActiveFiltersCount = () => {
    let count = 0;
    if (searchTerm.trim() !== '') count++;
    if (statusFilter !== 'All') count++;
    return count;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="My Tickets"
        subtitle={`${tickets.length} ${tickets.length === 1 ? 'ticket' : 'tickets'}${getActiveFiltersCount() > 0 ? ` • ${getActiveFiltersCount()} filter${getActiveFiltersCount() > 1 ? 's' : ''}` : ''
          }`}
        onBack={() => navigation.goBack()}
        absolute
      />
      <View style={{ height: 65 }} />

      <View style={styles.filterContainer}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
            onSubmitEditing={() => fetchTickets()}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Icon name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.statusFilterContainer}>
          {statusOptions.map((status) => {
            const isActive = statusFilter === status;
            const statusInfo = statusConfig[status] || { color: '#6B7280',bgColor: '#F9FAFB' };

            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusOption,
                  isActive && styles.statusOptionActive,
                  isActive && statusInfo && { backgroundColor: statusInfo.color,borderColor: statusInfo.color },
                ]}
                onPress={() => setStatusFilter(status)}
              >
                {statusInfo && isActive && (
                  <Icon name={statusInfo.icon} size={16} color="#FFFFFF" style={styles.statusIcon} />
                )}
                <Text style={[styles.statusOptionText,isActive && styles.statusOptionTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={styles.createButton}
        onPress={() => navigation.navigate('CreateTicket')}
        activeOpacity={0.85}
      >
        <LinearGradient colors={["#4A90E2","#0056D2"]} style={styles.createButtonGradient}>
          <Icon name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>Create New Ticket</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={styles.content}>
        {loading ? (
          <CommonSkeleton />
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
                colors={['#4F46E5']}
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
                    : 'Create your first ticket to get started'}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
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
  statusFilterContainer: {
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
  createButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
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
    shadowOffset: { width: 0,height: 1 },
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
});

export default TicketListScreen;