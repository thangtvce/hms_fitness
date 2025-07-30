import { useEffect,useState,useContext,useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Dimensions,
  Image,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import ShimmerPlaceholder from "components/shimmer/ShimmerPlaceholder";
import { showErrorFetchAPI } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons";
import Header from "components/Header";
import { useNavigation } from "@react-navigation/native";
import { getPlansByUserId } from "services/apiWorkoutPlanService";
import { AuthContext } from "context/AuthContext";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import debounce from "lodash/debounce";

const { width,height } = Dimensions.get("window");

export default function WorkoutPlanListScreen({ route }) {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);
  const userId = route?.params?.userId || user?.userId;

  const [plans,setPlans] = useState([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState(null);
  const [refreshing,setRefreshing] = useState(false);
  const [page,setPage] = useState(1);
  const [hasMore,setHasMore] = useState(true);
  const [isFetchingMore,setIsFetchingMore] = useState(false);
  const [pageSize] = useState(10);
  const [searchTerm,setSearchTerm] = useState("");
  const [debouncedTerm,setDebouncedTerm] = useState("");

  useEffect(() => {
    if (userId) {
      fetchPlans(false);
    }
  },[userId,debouncedTerm]);

  const fetchPlans = async (loadMore = false) => {
    if (loadMore && (!hasMore || isFetchingMore)) return;

    if (loadMore) {
      setIsFetchingMore(true);
    } else {
      setLoading(true);
      setPlans([]);
      setPage(1);
      setHasMore(true);
    }
    setError(null);

    try {
      const params = {
        PageNumber: loadMore ? page + 1 : 1,
        PageSize: pageSize
      };
      if (searchTerm.trim()) params.searchTerm = searchTerm.trim();
      console.log(params)
      const res = await getPlansByUserId(user?.userId,params);
      const newPlans = Array.isArray(res?.data?.plans) ? res.data.plans : [];
      setPlans((prev) => (loadMore ? [...prev,...newPlans] : newPlans));
      setPage(loadMore ? page + 1 : 1);
      setHasMore(newPlans.length === pageSize);
    } catch (e) {
      setError(e?.message || "Failed to load workout plans");
      showErrorFetchAPI(e);
      if (!loadMore) setPlans([]);
    } finally {
      setLoading(false);
      setIsFetchingMore(false);
      setRefreshing(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce((text) => {
      setDebouncedTerm(text);
    },500),
    []
  );

  const handleSearchChange = (text) => {
    setSearchTerm(text);
    debouncedSearch(text);
  };


  const handleRefresh = () => {
    setRefreshing(true);
    fetchPlans(false);
  };

  const clearFilters = () => {
    setSearchTerm("");
    Keyboard.dismiss();
    fetchPlans(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US",{
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getActiveFiltersCount = () => {
    return searchTerm ? 1 : 0;
  };

  const renderPlanItem = ({ item,index }) => (
    <TouchableOpacity
      style={[styles.planCard,{ marginTop: index === 0 ? 0 : 12 }]}
      onPress={() =>
        navigation.navigate("WorkoutPlanExercisesScreen",{
          planId: item.planId,
          planName: item.planName,
        })
      }
      accessibilityLabel={`View ${item.planName} details`}
      accessibilityRole="button"
    >
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-q4ZzPoxjKiZdphX3wp9qBcFkB8Ghdj.png" }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.planName} numberOfLines={2}>
          {item.planName}
        </Text>
        {item.description && (
          <Text style={styles.planDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>
          {item.trainerFullName && (
            <Text style={styles.trainerText}>by {item.trainerFullName}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (isFetchingMore) {
      return (
        <View style={styles.footer}>
          <ActivityIndicator size="large" color="#0056D2" accessibilityLabel="Loading more plans" />
        </View>
      );
    }
    if (!hasMore && plans.length > 0) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerText}>No more plans to load</Text>
        </View>
      );
    }
    return null;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="fitness-outline" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Active Plans</Text>
      <Text style={styles.emptySubtitle}>
        {searchTerm
          ? "No active plans match your search. Try adjusting it."
          : "You have no active workout plans assigned."}
      </Text>
      {searchTerm && (
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={clearFilters}
          accessibilityLabel="Clear filters"
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={20} color="#FFFFFF" />
          <Text style={styles.emptyActionText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
      <Text style={styles.errorTitle}>Failed to Load Plans</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => fetchPlans(false)}
        accessibilityLabel="Retry loading plans"
        accessibilityRole="button"
      >
        <Ionicons name="refresh" size={20} color="#0056D2" />
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" backgroundColor="#FFFFFF" />
        <Header
          title="Workout Plans"
          subtitle="Your active plans"
          onBack={() => navigation.goBack()}
          backgroundColor="#FFFFFF"
          textColor="#1E293B"
          rightActions={[]}
          style={styles.header}
        />
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plans..."
              placeholderTextColor="#9CA3AF"
              value={searchTerm}
              onChangeText={handleSearchChange}
              accessibilityLabel="Search workout plans"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity
                onPress={clearFilters}
                accessibilityLabel="Clear search"
                accessibilityRole="button"
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {searchTerm && (
          <View style={styles.activeFilters}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipsContainer}>
              <View style={styles.filterChip}>
                <Ionicons name="search" size={14} color="#0056D2" />
                <Text style={styles.filterChipText}>{searchTerm}</Text>
                <TouchableOpacity
                  onPress={clearFilters}
                  accessibilityLabel="Clear search filter"
                  accessibilityRole="button"
                >
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ShimmerPlaceholder style={styles.shimmer} />
            </View>
          ) : error ? (
            renderErrorState()
          ) : plans.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={plans}
              keyExtractor={(item) => item.planId.toString()}
              renderItem={renderPlanItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              onEndReached={() => fetchPlans(true)}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
            />
          )}
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    zIndex: 10,
    elevation: 4,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 12,
    marginTop: 65,
    zIndex: 5,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 15,
    color: "#1E293B",
    fontWeight: "500",
  },
  activeFilters: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  filterChipText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listContainer: {
    paddingBottom: 80,
  },
  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardImageContainer: {
    height: 160,
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  cardContent: {
    padding: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 24,
  },
  planDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  trainerText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
    fontWeight: "500",
  },
  footer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    minHeight: height - 200,
  },
  shimmer: {
    flex: 1,
    height: 300,
    width: "100%",
    borderRadius: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    minHeight: height - 200,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056D2",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    minHeight: height - 200,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EF4444",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#0056D2",
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0056D2",
  },
});