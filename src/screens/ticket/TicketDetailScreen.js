import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from "expo-linear-gradient"
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../../components/Header';
import ticketService from 'services/apiTicketService';
import apiUserService from 'services/apiUserService';
import { AuthContext } from 'context/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const TicketDetailScreen = ({ route }) => {
  const { ticketId } = route.params;
  const navigation = useNavigation();
  const { token, user } = useContext(AuthContext);
  const [ticket, setTicket] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);
  const [userMap, setUserMap] = useState({});

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const myTicketsRes = await ticketService.getMyTickets();
      const ticketsArr = myTicketsRes && Array.isArray(myTicketsRes.tickets) ? myTicketsRes.tickets : [];
      const t = ticketsArr.find(tk => String(tk.ticketId) === String(ticketId));
      setTicket(t);

      const r = await ticketService.getTicketResponsesForUser(ticketId);
      let arr = [];
      if (Array.isArray(r)) {
        arr = r;
      } else if (r && Array.isArray(r.responses)) {
        arr = r.responses;
      } else if (r && r.data && Array.isArray(r.data.responses)) {
        arr = r.data.responses;
      }
      
      // Sort responses by date
      arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      setResponses(arr);

      const uniqueUserIds = Array.from(new Set(arr.map(resp => resp.userId).filter(Boolean)));
      const userMapTemp = {};
      await Promise.all(uniqueUserIds.map(async (uid) => {
        try {
          const userRes = await apiUserService.getUserById(uid);
          if (userRes && userRes.data) {
            userMapTemp[uid] = userRes.data;
          }
        } catch {}
      }));
      setUserMap(userMapTemp);
    } catch (err) {
      setError(err.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleSendResponse = async () => {
    if (!responseText.trim()) return;
    setPosting(true);
    setError(null);
    try {
      await ticketService.addTicketResponse(ticketId, { responseText: responseText });
      setResponseText('');
      await fetchTicket();
    } catch (err) {
      setError(err.message || 'Failed to send response');
      Alert.alert('Error', err.message || 'Failed to send response');
    } finally {
      setPosting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const fixed = dateStr.replace(/\.(\d{1,2})(?!\d)/, (m, g1) => `.${g1.padEnd(3, '0')}`);
    const d = new Date(fixed);
    if (isNaN(d.getTime())) return '';
    
    const now = new Date();
    const diffTime = Math.abs(now - d);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      Open: { color: '#10B981', bgColor: '#ECFDF5', icon: 'radio-button-on' },
      Pending: { color: '#F59E0B', bgColor: '#FFFBEB', icon: 'time' },
      Closed: { color: '#EF4444', bgColor: '#FEF2F2', icon: 'close-circle' },
      Resolved: { color: '#E5E7EB', bgColor: '#E5E7EB', icon: 'checkmark-circle' },
      InProgress: { color: '#3B82F6', bgColor: '#EFF6FF', icon: 'play-circle' },
    };
    return configs[status] || configs.Open;
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      High: { color: '#EF4444', bgColor: '#FEF2F2', icon: 'alert-circle' },
      Medium: { color: '#F59E0B', bgColor: '#FFFBEB', icon: 'warning' },
      Low: { color: '#10B981', bgColor: '#ECFDF5', icon: 'checkmark-circle' },
    };
    return configs[priority] || { color: '#6B7280', bgColor: '#F9FAFB', icon: 'help-circle' };
  };

  const renderResponse = ({ item, index }) => {
    const userInfo = item.userId ? userMap[item.userId] : null;
    const displayName = userInfo?.fullName || userInfo?.username || userInfo?.email || 'User';
    const isAdmin = userInfo?.roles && userInfo.roles.includes('Admin');
    const dateStr = formatDate(item.createdAt);

    // Check if there is any admin response after this user's message
    const hasAdminAfter = responses.some(r => {
      const u = r.userId ? userMap[r.userId] : null;
      const rIsAdmin = u?.roles && u.roles.includes('Admin');
      return rIsAdmin && new Date(r.createdAt) > new Date(item.createdAt);
    });

    let statusLabel = '';
    if (isAdmin) {
      statusLabel = dateStr || '';
    } else {
      const base = hasAdminAfter ? 'Processed' : 'Processing';
      statusLabel = dateStr ? `${base} - ${dateStr}` : base;
    }

    return (
      <View style={styles.messageContainer}>
        {/* Date and Status Row */}
        <View style={styles.dateStatusRow}>
          <View style={styles.statusIndicator}>
            <Icon 
              name={isAdmin ? 'shield-checkmark' : 'person'} 
              size={14} 
              color={isAdmin ? '#4F46E5' : '#10B981'} 
            />
            <Text style={[
              styles.statusText,
              { color: isAdmin ? '#4F46E5' : '#10B981' }
            ]}>
              {statusLabel}
            </Text>
          </View>
          {isAdmin && (
            <View style={styles.adminTag}>
              <Text style={styles.adminTagText}>ADMIN</Text>
            </View>
          )}
        </View>

        {/* Arrow Pointer */}
        <View style={styles.arrowContainer}>
          <View style={[
            styles.arrowDown,
            { borderBottomColor: isAdmin ? '#EEF2FF' : '#F0FDF4' }
          ]} />
        </View>

        {/* Message Card */}
        <View style={[
          styles.messageCard,
          { backgroundColor: isAdmin ? '#EEF2FF' : '#F0FDF4' },
          { borderColor: isAdmin ? '#E0E7FF' : '#DCFCE7' }
        ]}>
          <View style={styles.messageHeader}>
            <View style={styles.senderInfo}>
              <View style={[
                styles.avatarCircle,
                { backgroundColor: isAdmin ? '#E5E7EB' : '#10B981' }
              ]}>
                <Icon 
                  name={isAdmin ? 'shield-checkmark' : 'person'} 
                  size={16} 
                  color="#FFFFFF" 
                />
              </View>
              <Text style={[
                styles.senderName,
                { color: isAdmin ? '#111' : '#10B981' }
              ]}>
                {isAdmin ? 'Support Team' : displayName}
              </Text>
            </View>
            <Text style={styles.messageTime}>{dateStr}</Text>
          </View>
          <Text style={styles.messageText}>{item.responseText}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Ticket Details"
          subtitle={`#${ticketId}`}
          onBack={() => navigation.goBack()}
          absolute
        />
        <View style={{ height: 90 }} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Loading ticket details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !ticket) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="Ticket Details"
          subtitle={`#${ticketId}`}
          onBack={() => navigation.goBack()}
          absolute
        />
        <View style={{ height: 90 }} />
        <View style={styles.centered}>
          <Icon name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Ticket not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchTicket}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(ticket.status);
  const priorityConfig = getPriorityConfig(ticket.priority);
  const isResolved = ticket.status && ticket.status.toLowerCase() === 'resolved';

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Ticket Details"
        subtitle={`#${ticketId}`}
        onBack={() => navigation.goBack()}
        absolute
      />
      <View style={{ height: 90 }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Ticket Information Card */}
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={styles.ticketTitle} numberOfLines={2}>{ticket.title}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                  <Icon name={statusConfig.icon} size={14} color={statusConfig.color} />
                  <Text style={[styles.statusText, { color: statusConfig.color }]}>
                    {ticket.status}
                  </Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bgColor }]}>
                  <Icon name={priorityConfig.icon} size={14} color={priorityConfig.color} />
                  <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                    {ticket.priority || 'Normal'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.ticketDetails}>
              <View style={styles.detailRow}>
                <Icon name="person-outline" size={16} color="#6B7280" />
                <Text style={styles.detailLabel}>Created by:</Text>
                <Text style={styles.detailValue}>{ticket.userFullName || 'Unknown'}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Icon name="calendar-outline" size={16} color="#6B7280" />
                <Text style={styles.detailLabel}>Created:</Text>
                <Text style={styles.detailValue}>{formatDate(ticket.createdAt)}</Text>
              </View>
              
              {ticket.category && (
                <View style={styles.detailRow}>
                  <Icon name="folder-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailLabel}>Category:</Text>
                  <Text style={styles.detailValue}>{ticket.category}</Text>
                </View>
              )}
            </View>

            {ticket.description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>Description:</Text>
                <Text style={styles.descriptionText}>{ticket.description}</Text>
              </View>
            )}
          </View>

          {/* Conversation Section */}
          <View style={styles.conversationSection}>
            <View style={styles.conversationHeader}>
            <Icon name="chatbubbles-outline" size={20} color="#E5E7EB" />
              <Text style={styles.conversationTitle}>Conversation</Text>
              <Text style={styles.messageCount}>({responses.length})</Text>
            </View>

            {responses.length === 0 ? (
              <View style={styles.emptyConversation}>
                <Icon name="chatbubble-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptySubtitle}>Start the conversation by sending a message</Text>
              </View>
            ) : (
              <FlatList
                data={responses}
                keyExtractor={(item, index) =>
                  item && item.responseId !== undefined && item.responseId !== null
                    ? item.responseId.toString()
                    : index.toString()
                }
                renderItem={renderResponse}
                scrollEnabled={false}
                contentContainerStyle={styles.messagesList}
              />
            )}
          </View>
        </ScrollView>

        {/* Input Section */}
        {isResolved ? (
          <View style={styles.resolvedContainer}>
            <View style={[styles.resolvedBanner, { backgroundColor: '#E5E7EB' }]}> 
              <Icon name="checkmark-circle" size={24} color="#E5E7EB" />
              <Text style={[styles.resolvedText, { color: '#111' }]}>This ticket has been resolved. No further responses can be added.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                value={responseText}
                onChangeText={setResponseText}
                placeholder="Type your message..."
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!responseText.trim() || posting) && styles.sendButtonDisabled
                ]}
                onPress={handleSendResponse}
                disabled={posting || !responseText.trim()}
              >
                {posting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.characterCount}>
              {responseText.length}/1000 characters
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centered: {
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
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ticketHeader: {
    marginBottom: 16,
  },
  ticketTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    lineHeight: 28,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ticketDetails: {
    gap: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  descriptionSection: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  conversationSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  messageCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyConversation: {
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  messagesList: {
    gap: 8,
  },
  // Horizontal Message Layout (like your original)
  messageContainer: {
    marginBottom: 24,
  },
  dateStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  adminTag: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111',
  },
  arrowContainer: {
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: -1,
  },
  arrowDown: {
    width: 0,
    height: 0,
    marginLeft: 20,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    backgroundColor: 'transparent',
  },
  messageCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  messageTime: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageText: {
    fontSize: 15,
    color: '#1F2937',
    lineHeight: 22,
  },
  resolvedContainer: {
    padding: 16,
  },
  resolvedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  resolvedText: {
    flex: 1,
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  inputSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  messageInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    fontSize: 16,
    color: '#1F2937',
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default TicketDetailScreen;