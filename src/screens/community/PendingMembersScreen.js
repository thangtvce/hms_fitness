import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getGroupJoinRequests, addOrUpdateGroupMember } from 'services/apiCommunityService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const PendingMembersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSortModal, setShowSortModal] = useState(false);

  const fetchPendingMembers = async () => {
    setLoading(true);
    try {
      const data = await getGroupJoinRequests(groupId, 'pending');
      const sortedMembers = [...(data.requests || [])].sort((a, b) =>
        sortOrder === 'newest'
          ? new Date(b.joinedAt) - new Date(a.joinedAt)
          : new Date(a.joinedAt) - new Date(b.joinedAt)
      );
      setMembers(sortedMembers);
      setFilteredMembers(sortedMembers);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to fetch pending members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingMembers();
  }, [groupId]);

  useEffect(() => {
    const sortedMembers = [...members].sort((a, b) =>
      sortOrder === 'newest'
        ? new Date(b.joinedAt) - new Date(a.joinedAt)
        : new Date(a.joinedAt) - new Date(b.joinedAt)
    );
    const filtered = sortedMembers.filter((member) =>
      member.userFullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMembers(filtered);
  }, [sortOrder, members, searchTerm]);

  const handleAction = async (member, status) => {
    try {
      await addOrUpdateGroupMember({ ...member, status });
      Alert.alert('Success', `Member ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
      fetchPendingMembers();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update member');
    }
  };


  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
    setShowSortModal(false);
  };

  const handleSearch = (text) => {
    setSearchTerm(text);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <LinearGradient
        colors={['#FFFFFF', '#F8FAFC']}
        style={styles.cardGradient}
      >
        <View style={styles.infoRow}>
          <View style={styles.avatarContainer}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {item.userFullName?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.name} numberOfLines={2}>
              {item.userFullName || 'Unknown'}
            </Text>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={14} color="#64748B" style={styles.dateIcon} />
              <Text style={styles.desc}>
                Joined {new Date(item.joinedAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}, {new Date(item.joinedAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.approveBtn]}
              onPress={() => handleAction(item, 'approved')}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.rejectBtn]}
              onPress={() => handleAction(item, 'rejected')}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={styles.actionBtnText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading pending members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4F46E5', '#7C3AED']}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pending Members</Text>
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowSortModal(true)}>
          <Ionicons name="menu" size={28} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Sort Modal */}
      {showSortModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.sortModalContainer}>
            <Text style={styles.sortModalTitle}>Sort Members</Text>
            <TouchableOpacity
              style={[styles.sortOption, sortOrder === 'newest' && styles.selectedSortOption]}
              onPress={() => { setSortOrder('newest'); setShowSortModal(false); }}
            >
              <Ionicons name="arrow-down" size={20} color={sortOrder === 'newest' ? '#4F46E5' : '#64748B'} />
              <Text style={[styles.sortOptionText, sortOrder === 'newest' && styles.selectedSortOptionText]}>Newest First</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortOption, sortOrder === 'oldest' && styles.selectedSortOption]}
              onPress={() => { setSortOrder('oldest'); setShowSortModal(false); }}
            >
              <Ionicons name="arrow-up" size={20} color={sortOrder === 'oldest' ? '#4F46E5' : '#64748B'} />
              <Text style={[styles.sortOptionText, sortOrder === 'oldest' && styles.selectedSortOptionText]}>Oldest First</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          value={searchTerm}
          onChangeText={handleSearch}
          placeholderTextColor="#94A3B8"
        />
        {searchTerm ? (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.memberId?.toString()}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          fetchPendingMembers();
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#64748B" />
            <Text style={styles.emptyText}>
              {searchTerm ? 'No members match your search.' : 'No pending members.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 12,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: 8,
  },
  // Modal styles for sort
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  sortModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: 280,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 18,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
  },
  selectedSortOption: {
    backgroundColor: '#E0E7FF',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#64748B',
    marginLeft: 10,
    fontWeight: '600',
  },
  selectedSortOptionText: {
    color: '#4F46E5',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
    marginBottom: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateIcon: {
    marginRight: 2,
  },
  desc: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  approveBtn: {
    backgroundColor: '#22C55E',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
  },
  actionBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default PendingMembersScreen;
