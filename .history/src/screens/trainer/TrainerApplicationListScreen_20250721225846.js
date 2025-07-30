import React, { useEffect, useState } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import Header from 'components/Header';
import { Alert } from "react-native";
import { useAuth } from "context/AuthContext";
import trainerService from "services/apiTrainerService";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get('window');

const ApplicationStatusConfig = {
  pending: {
    color: "#F59E0B",
    backgroundColor: "#FEF3C7",
    icon: "time-outline",
    text: "Pending Review"
  },
  approved: {
    color: "#10B981",
    backgroundColor: "#D1FAE5",
    icon: "checkmark-circle-outline",
    text: "Approved"
  },
  rejected: {
    color: "#EF4444",
    backgroundColor: "#FEE2E2",
    icon: "close-circle-outline",
    text: "Rejected"
  },
};

const StatusBadge = ({ status }) => {
  const config = ApplicationStatusConfig[status] || {
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    icon: "help-circle-outline",
    text: status
  };

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
      <Ionicons name={config.icon} size={16} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>
        {config.text}
      </Text>
    </View>
  );
};

const InfoRow = ({ icon, label, value, isLast = false }) => (
  <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
    <View style={styles.infoLeft}>
      <Ionicons name={icon} size={18} color="#6B7280" style={styles.infoIcon} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={styles.infoValue}>{value || "Not specified"}</Text>
  </View>
);

const ApplicationCard = ({ item, index }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={[styles.card, { marginTop: index === 0 ? 0 : 16 }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.fullName?.charAt(0)?.toUpperCase() || "T"}
            </Text>
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.cardTitle}>{item.fullName}</Text>
            <Text style={styles.cardSubtitle}>
              {item.experienceYears} years experience
            </Text>
          </View>
        </View>
        <StatusBadge status={item.status} />
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <InfoRow 
          icon="mail-outline" 
          label="Email" 
          value={item.email} 
        />
        <InfoRow 
          icon="call-outline" 
          label="Phone" 
          value={item.phoneNumber} 
        />
        <InfoRow 
          icon="calendar-outline" 
          label="Date of Birth" 
          value={item.dateOfBirth} 
        />
        <InfoRow 
          icon="person-outline" 
          label="Gender" 
          value={item.gender} 
        />
        <InfoRow 
          icon="barbell-outline" 
          label="Specialties" 
          value={item.specialties} 
        />
        <InfoRow 
          icon="ribbon-outline" 
          label="Certifications" 
          value={item.certifications} 
        />
        <InfoRow 
          icon="time-outline" 
          label="Submitted" 
          value={formatDate(item.submittedAt)} 
          isLast={!item.notes}
        />
        {item.notes && (
          <InfoRow 
            icon="document-text-outline" 
            label="Notes" 
            value={item.notes} 
            isLast={true}
          />
        )}
      </View>
    </View>
  );
};

const EmptyState = ({ onPress }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
    </View>
    <Text style={styles.emptyTitle}>No Applications Yet</Text>
    <Text style={styles.emptySubtitle}>
      You haven't submitted any trainer applications. Start your journey by creating your first application.
    </Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onPress}>
      <LinearGradient
        colors={["#1F2937", "#374151"]}
        style={styles.emptyButtonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Create Application</Text>
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const TrainerApplicationListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchApplications = async (pageNumber = 1) => {
    setError(null);
    if (pageNumber === 1) setLoading(true);
    try {
      const res = await trainerService.getMyTrainerApplications({ 
        pageNumber, 
        pageSize: 10 
      });
      if (res.statusCode === 200 && res.data) {
        setApplications(res.data.applications || []);
        setTotalPages(res.data.totalPages || 1);
        setPage(res.data.pageNumber || 1);
      } else {
        setError(res.message || "Could not fetch applications.");
      }
    } catch (err) {
      setError(err?.message || "Failed to load applications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchApplications(1);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchApplications(1);
  };

  const canSubmitNew = () => {
    if (!applications || applications.length === 0) return true;
    const sorted = [...applications].sort((a, b) => 
      new Date(b.submittedAt) - new Date(a.submittedAt)
    );
    const latest = sorted[0];
    return latest.status === 'rejected';
  };

  const handleAddPress = () => {
    if (canSubmitNew()) {
      navigation.navigate('TrainerApplicationScreen');
    } else {
      const sorted = [...applications].sort((a, b) => 
        new Date(b.submittedAt) - new Date(a.submittedAt)
      );
      const latest = sorted[0];
      let title = 'Application Status';
      let message = 'You have already submitted an application. Please wait for review.';
      
      if (latest.status === 'approved') {
        title = 'Application Approved';
        message = 'Congratulations! Your trainer application has been approved.';
      } else if (latest.status === 'pending') {
        title = 'Application Under Review';
        message = 'Your application is currently being reviewed. We\'ll notify you once a decision is made.';
      }
      
      Alert.alert(title, message);
    }
  };

  // Remove custom renderHeader, use Header.js below

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="My Applications"
          onBack={() => navigation.goBack()}
          rightActions={applications.length > 0 ? [
            {
              icon: 'add-circle-outline',
              onPress: handleAddPress,
              color: '#1F2937',
              backgroundColor: '#FFFFFF',
            },
          ] : []}
          style={{ backgroundColor: '#FFFFFF' }}
        />
        <View style={[styles.loadingContainer, { marginTop: 50 }]}> 
          <ActivityIndicator size="large" color="#1F2937" />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Header
          title="My Applications"
          onBack={() => navigation.goBack()}
          rightActions={applications.length > 0 ? [
            {
              icon: 'add-circle-outline',
              onPress: handleAddPress,
              color: '#1F2937',
              backgroundColor: '#FFFFFF',
            },
          ] : []}
          style={{ backgroundColor: '#FFFFFF' }}
        />
        <View style={[styles.errorContainer, { marginTop: 50 }]}> 
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="My Applications"
        onBack={() => navigation.goBack()}
        rightActions={applications.length > 0 ? [
          {
            icon: 'add-circle-outline',
            onPress: handleAddPress,
            color: '#1F2937',
            backgroundColor: '#FFFFFF',
          },
        ] : []}
        style={{ backgroundColor: '#FFFFFF' }}
      />
      <View style={{ marginTop: 50 }}>
        {applications.length === 0 ? (
          <View style={{ marginTop: 0 }}>
            <EmptyState onPress={handleAddPress} />
          </View>
        ) : (
          <FlatList
            data={applications}
            keyExtractor={(item) => item.trainerApplicationId?.toString()}
            renderItem={({ item, index }) => <ApplicationCard item={item} index={index} />}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={["#1F2937"]}
                tintColor="#1F2937"
              />
            }
            contentContainerStyle={[styles.listContainer, { marginTop: 0 }]}
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
    backgroundColor: "#F8FAFC",
  },
  headerContainer: {
    marginBottom: 20,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: "#FFFFFF", // Changed to white
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937", // Changed to black
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280", // Changed to dark gray for contrast
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  newApplicationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1F2937", // Changed to black border
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newApplicationText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937", // Changed to black
    marginLeft: 8,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: "#FAFBFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1F2937", // Changed to black for consistency
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardHeaderInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  cardContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
    width: 120,
    marginRight: 16,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "400",
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#1F2937", // Changed to black
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#1F2937", // Changed to black
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 8,
  },
});

export default TrainerApplicationListScreen;