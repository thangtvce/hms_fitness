import React,{ useState,useEffect,useRef,useCallback,useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Animated,
  Platform,
  Dimensions,
  ScrollView,
  Image,
} from "react-native";
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil";
import Loading from "components/Loading";
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "context/AuthContext";
import { ThemeContext } from "components/theme/ThemeContext";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import Header from "components/Header";
import trainerService from "services/apiTrainerService";
import { SafeAreaView } from "react-native-safe-area-context";

const { width,height } = Dimensions.get("window");

export default function ServicePackageScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useContext(ThemeContext);

  const [packages,setPackages] = useState([]);
  const [loading,setLoading] = useState(true);
  const [refreshing,setRefreshing] = useState(false);
  const [showFilterModal,setShowFilterModal] = useState(false);
  const [pageNumber,setPageNumber] = useState(1);
  const [pageSize,setPageSize] = useState(10);
  const [totalPages,setTotalPages] = useState(1);
  const [totalItems,setTotalItems] = useState(0);
  const [searchTerm,setSearchTerm] = useState("");
  const [tempSearchTerm,setTempSearchTerm] = useState("");
  const [hasMore,setHasMore] = useState(true);
  const [isLoadingMore,setIsLoadingMore] = useState(false);

  const [filters,setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    sortBy: "packageId",
    sortDescending: true,
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const [tempFilters,setTempFilters] = useState(filters);
  const [trainerRatings,setTrainerRatings] = useState({});
  const [trainerClients,setTrainerClients] = useState({});
  const [trainerExperience,setTrainerExperience] = useState({});

  // Fetch packages from API
  const fetchPackages = useCallback(
    async (search = "",page = 1,append = false) => {
      if (!user?.userId) {
        setPackages([]);
        setTotalPages(1);
        setTotalItems(0);
        setHasMore(false);
        setLoading(false);
        return;
      }
      setLoading(page === 1);
      setIsLoadingMore(page > 1);
      try {
        const params = {
          Search: search,
          PageNumber: page,
          PageSize: pageSize,
          MinPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
          MaxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
          SortBy: filters.sortBy,
          SortDescending: filters.sortDescending,
        };
        const res = await trainerService.getAllActivePackages(params);
        const data = res.data?.packages || [];
        setPackages((prev) => (append ? [...prev,...data] : data));
        setTotalPages(res.data?.totalPages || 1);
        setTotalItems(res.data?.totalCount || data.length);
        setHasMore(page < res.data?.totalPages);
        const trainerClientsMap = calculateTrainerClients(data);
        setTrainerClients(trainerClientsMap);
        await fetchTrainerRatings(data);
        await fetchTrainerExperience(data);
      } catch (e) {
        setPackages([]);
        setTotalPages(1);
        setTotalItems(0);
        setHasMore(false);
        showErrorFetchAPI("Unable to load packages: " + (e?.message || "Unknown error"));
      }
      setLoading(false);
      setIsLoadingMore(false);
    },
    [user?.userId,filters,pageSize],
  );

  // Load more packages when reaching the end of the list
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || loading) return;
    const nextPage = pageNumber + 1;
    setPageNumber(nextPage);
    fetchPackages(searchTerm,nextPage,true);
  },[hasMore,isLoadingMore,loading,pageNumber,fetchPackages,searchTerm]);

  useEffect(() => {
    Animated.timing(fadeAnim,{
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerAnim,{
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bannerAnim,{
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  },[]);

  useEffect(() => {
    fetchPackages(searchTerm,1);
  },[fetchPackages,searchTerm]);

  const calculateTrainerClients = (packages) => {
    const trainerClients = {};
    packages.forEach((pkg) => {
      if (!trainerClients[pkg.trainerId]) {
        trainerClients[pkg.trainerId] = 0;
      }
      trainerClients[pkg.trainerId] += pkg.currentSubscribers;
    });
    return trainerClients;
  };

  const fetchTrainerRatings = async (packages) => {
    const ratingsMap = {};
    const trainerIds = [...new Set(packages.map((pkg) => pkg.trainerId))];

    await Promise.all(
      trainerIds.map(async (trainerId) => {
        try {
          const res = await trainerService.getTrainerAverageRating(trainerId);
          let avg = res.data;
          if (typeof avg === "object" && avg !== null && avg.averageRating !== undefined) {
            avg = avg.averageRating;
          }
          ratingsMap[trainerId] = avg || 0;
        } catch (e) {
          ratingsMap[trainerId] = 0;
        }
      }),
    );
    setTrainerRatings(ratingsMap);
  };

  const fetchTrainerExperience = async (packages) => {
    const experienceMap = {};
    const trainerIds = [...new Set(packages.map((pkg) => pkg.trainerId))];

    await Promise.all(
      trainerIds.map(async (trainerId) => {
        try {
          const res = await trainerService.getApprovedTrainerApplication(trainerId);
          const years = res.data?.yearsOfExperience ?? res.data?.experienceYears ?? 0;
          experienceMap[trainerId] = years;
        } catch (e) {
          experienceMap[trainerId] = 0;
        }
      }),
    );
    setTrainerExperience(experienceMap);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPageNumber(1);
    fetchPackages(searchTerm,1).finally(() => setRefreshing(false));
  },[fetchPackages,searchTerm]);

  const handleSearch = useCallback(() => {
    setSearchTerm(tempSearchTerm);
    setPageNumber(1);
    fetchPackages(tempSearchTerm,1);
  },[fetchPackages,tempSearchTerm]);

  const getPackageIcon = (packageName) => {
    if (!packageName) return "fitness";
    const name = packageName.toLowerCase();
    if (name.includes("yoga")) return "yoga";
    if (name.includes("diet") || name.includes("nutrition")) return "nutrition";
    if (name.includes("cardio")) return "cardio";
    return "fitness";
  };

  const renderPackageIcon = (type) => {
    const iconProps = { size: 20 };
    switch (type) {
      case "yoga":
        return <MaterialCommunityIcons name="yoga" color="#8B5CF6" {...iconProps} />;
      case "nutrition":
        return <Material CommunityIcons name="nutrition" color="#F59E0B" {...iconProps} />;
      case "cardio":
        return <Ionicons name="heart" color="#EF4444" {...iconProps} />;
      default:
        return <MaterialCommunityIcons name="dumbbell" color="#3B82F6" {...iconProps} />;
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={12} color="#FFD700" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={12} color="#FFD700" />);
    }
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={12} color="#D1D5DB" />);
    }
    return stars;
  };

  const renderPromoBanner = () => {
    const scaleAnim = bannerAnim.interpolate({
      inputRange: [0,1],
      outputRange: [1,1.02],
    });

    return (
      <Animated.View style={[styles.promoBanner,{ transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={['#667eea','#764ba2']}
          start={{ x: 0,y: 0 }}
          end={{ x: 1,y: 1 }}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerLeft}>
              <View style={styles.saleIcon}>
                <Ionicons name="flash" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Special Offer 30% OFF</Text>
                <Text style={styles.bannerSubtitle}>Premium training packages</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderPackage = ({ item }) => {
    const packageType = getPackageIcon(item.packageName);
    const isFull = item.currentSubscribers >= item.maxSubscribers;
    const averageRating = trainerRatings[item.trainerId] || 0;
    const totalClients = trainerClients[item.trainerId] || 0;
    const yearsExperience = trainerExperience[item.trainerId] || 0;
    const progressPercentage = (item.currentSubscribers / item.maxSubscribers) * 100;

    return (
      <Animated.View style={[styles.packageItem,{ opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.packageCard,isFull && styles.packageCardDisabled]}
          onPress={() => {
            if (!isFull) navigation.navigate("PackageDetail",{ package: item,totalClients });
          }}
          activeOpacity={0.8}
          disabled={isFull}
        >
          {/* Header Section */}
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.packageTypeContainer}>
                {renderPackageIcon(packageType)}
                <Text style={styles.packageTypeText}>{packageType.toUpperCase()}</Text>
              </View>
              {item.currentSubscribers > item.maxSubscribers * 0.8 && !isFull && (
                <View style={styles.hotBadge}>
                  <Ionicons name="flame" size={10} color="#FFFFFF" />
                  <Text style={styles.hotBadgeText}>HOT</Text>
                </View>
              )}
            </View>
            {isFull && (
              <View style={styles.fullBadge}>
                <Ionicons name="lock-closed" size={10} color="#DC2626" />
                <Text style={styles.fullBadgeText}>FULL</Text>
              </View>
            )}
          </View>

          {/* Main Content */}
          <View style={styles.cardContent}>
            <Text style={styles.packageTitle} numberOfLines={2}>
              {item.packageName || "Premium Training Package"}
            </Text>

            {/* Price Section */}
            <View style={styles.priceContainer}>
              <Text style={styles.price}>${item.price || "0"}</Text>
              <Text style={styles.duration}>/{item.durationDays} days</Text>
            </View>

            {/* Description */}
            {item.description && (
              <Text style={styles.description} numberOfLines={2}>
                {item.description.replace(/<[^>]+>/g,"")}
              </Text>
            )}

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={14} color="#10B981" />
                <Text style={styles.statText}>{item.durationDays}d</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={14} color="#3B82F6" />
                <Text style={styles.statText}>{item.currentSubscribers}/{item.maxSubscribers}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.statText}>Certified</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(progressPercentage,100)}%`,
                      backgroundColor: isFull ? '#EF4444' : progressPercentage > 80 ? '#F59E0B' : '#10B981',
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progressPercentage)}% filled
              </Text>
            </View>
          </View>

          {/* Trainer Section */}
          <View style={styles.trainerSection}>
            <View style={styles.trainerInfo}>
              <View style={styles.trainerAvatarContainer}>
                <Image
                  source={{ uri: item.trainerAvatar || "/placeholder.svg?height=32&width=32" }}
                  style={styles.trainerAvatar}
                />
                <View style={styles.onlineIndicator} />
              </View>
              <View style={styles.trainerDetails}>
                <Text style={styles.trainerName} numberOfLines={1}>
                  {item.trainerFullName || "Professional Trainer"}
                </Text>
                <View style={styles.trainerMeta}>
                  <View style={styles.ratingContainer}>
                    <View style={styles.starsContainer}>{renderStars(averageRating)}</View>
                    <Text style={styles.ratingText}>({averageRating.toFixed(1)})</Text>
                  </View>
                  <Text style={styles.experienceText}>{yearsExperience}y exp</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Button */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.actionButton,isFull && styles.actionButtonDisabled]}
              onPress={() => {
                if (!isFull) navigation.navigate("PackageDetail",{ package: item,totalClients });
              }}
              disabled={isFull}
            >
              <Text style={[styles.actionButtonText,isFull && styles.actionButtonTextDisabled]}>
                {isFull ? "Package Full" : "Start Training"}
              </Text>
              {!isFull && <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>

          {isFull && <View style={styles.disabledOverlay} />}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderFilterModal = () => {
    return (
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Price Range</Text>
                <View style={styles.priceInputs}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min Price"
                    placeholderTextColor="#94A3B8"
                    value={tempFilters.minPrice}
                    onChangeText={(text) => setTempFilters({ ...tempFilters,minPrice: text })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceSeparator}>-</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max Price"
                    placeholderTextColor="#94A3B8"
                    value={tempFilters.maxPrice}
                    onChangeText={(text) => setTempFilters({ ...tempFilters,maxPrice: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Sort By</Text>
                <View style={styles.sortOptions}>
                  {[
                    { label: "Price",value: "price" },
                    { label: "Rating",value: "rating" },
                    { label: "Duration",value: "days" },
                    { label: "Latest",value: "created" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sortOption,
                        tempFilters.sortBy === option.value && styles.sortOptionActive,
                      ]}
                      onPress={() => setTempFilters({ ...tempFilters,sortBy: option.value })}
                    >
                      <Text
                        style={[
                          styles.sortOptionText,
                          tempFilters.sortBy === option.value && styles.sortOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setTempFilters({ minPrice: "",maxPrice: "",sortBy: "packageId",sortDescending: true });
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setFilters(tempFilters);
                  setShowFilterModal(false);
                  setPageNumber(1);
                  fetchPackages(searchTerm,1);
                }}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="fitness-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Packages Found</Text>
      <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingContainer}>
        <Loading />
      </View>
    );
  };

  if (loading && pageNumber === 1) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#FFFFFF" />
      <Header
        title="Training Packages"
        onBack={() => navigation.goBack()}
        rightActions={[
          { icon: "options-outline",onPress: () => setShowFilterModal(true),color: "#3B82F6" },
        ]}
      />

      {/* Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search training packages..."
            placeholderTextColor="#94A3B8"
            value={tempSearchTerm}
            onChangeText={setTempSearchTerm}
            onSubmitEditing={handleSearch}
          />
          {tempSearchTerm ? (
            <TouchableOpacity
              onPress={() => {
                setTempSearchTerm("");
                setSearchTerm("");
                fetchPackages("",1);
              }}
            >
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSearch}>
              <Ionicons name="arrow-forward" size={18} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>{totalItems} packages available</Text>
          <View style={styles.featuredBadge}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        </View>
      </View>

      {/* Promo Banner */}
      {renderPromoBanner()}

      <FlatList
        data={packages}
        keyExtractor={(item) => item.packageId.toString()}
        renderItem={renderPackage}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
      />

      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Search Section
  searchContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 12,
  },
  resultsInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  // Promo Banner
  promoBanner: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bannerGradient: {
    padding: 16,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  saleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },

  // Package Cards
  flatList: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  packageItem: {
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  packageCardDisabled: {
    opacity: 0.7,
  },

  // Card Header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  packageTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  packageTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    letterSpacing: 0.5,
  },
  hotBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  hotBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  fullBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  fullBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#DC2626",
  },

  // Card Content
  cardContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    backgroundColor: "#EFF6FF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E3A8A",
    marginRight: 6,
  },
  duration: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 18,
    marginBottom: 12,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    flex: 1,
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },

  // Progress Bar
  progressContainer: {
    marginBottom: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },

  // Trainer Section
  trainerSection: {
    backgroundColor: "#FAFBFC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  trainerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  trainerAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  trainerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  trainerDetails: {
    flex: 1,
  },
  trainerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 4,
  },
  trainerMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  experienceText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  // Action Section
  actionSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  actionButtonDisabled: {
    backgroundColor: "#E2E8F0",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  actionButtonTextDisabled: {
    color: "#94A3B8",
  },
  disabledOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 20,
  },

  // Loading & Empty States
  loadingContainer: {
    paddingVertical: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  modalContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
  },
  priceInputs: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    borderWidth: 2,
    borderColor: "#3B82F6",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  priceSeparator: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  sortOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sortOption: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sortOptionActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  sortOptionText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  sortOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  clearButton: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  clearButtonText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  applyButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});