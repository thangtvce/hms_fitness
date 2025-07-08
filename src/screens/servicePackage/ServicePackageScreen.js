import React, { useState, useEffect, useRef, useCallback, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TextInput,
  Animated,
  Platform,
  Dimensions,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "context/AuthContext";
import { ThemeContext } from "components/theme/ThemeContext";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import Header from "components/Header";
import trainerService from "services/apiTrainerService";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function ServicePackageScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useContext(ThemeContext);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSearchTerm, setTempSearchTerm] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    sortBy: "packageId",
    sortDescending: true,
  });
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current;
  const [tempFilters, setTempFilters] = useState(filters);
  const [trainerRatings, setTrainerRatings] = useState({});
  const [trainerClients, setTrainerClients] = useState({});
  const [trainerExperience, setTrainerExperience] = useState({});

  // Fetch packages from API
  const fetchPackages = useCallback(
    async (search = "", page = 1) => {
      if (!user?.userId) {
        setPackages([]);
        setTotalPages(1);
        setTotalItems(0);
        setHasMore(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const params = {
          search,
          pageNumber: page,
          pageSize,
          minPrice: filters.minPrice ? parseFloat(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? parseFloat(filters.maxPrice) : undefined,
          sortBy: filters.sortBy,
          sortDescending: filters.sortDescending,
        };
        const res = await trainerService.getAllActiveServicePackage(params);
        const data = res.data?.packages || [];
        setPackages((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalPages(res.data?.totalPages || 1);
        setTotalItems(res.data?.totalCount || data.length);
        setHasMore(res.data?.pageNumber < res.data?.totalPages);
        const trainerClientsMap = calculateTrainerClients(data);
        setTrainerClients(trainerClientsMap);
        await fetchTrainerRatings(data);
        await fetchTrainerExperience(data);
      } catch (e) {
        setPackages([]);
        setTotalPages(1);
        setTotalItems(0);
        setHasMore(false);
      }
      setLoading(false);
    },
    [user?.userId, filters, pageSize],
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    // Banner animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bannerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bannerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

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
    fetchPackages(searchTerm, 1).finally(() => setRefreshing(false));
  }, [fetchPackages, searchTerm]);

  const handleSearch = useCallback(() => {
    setSearchTerm(tempSearchTerm);
    setPageNumber(1);
    fetchPackages(tempSearchTerm, 1);
  }, [fetchPackages, tempSearchTerm]);

  const getPackageIcon = (packageName) => {
    if (!packageName) return "fitness";
    const name = packageName.toLowerCase();
    if (name.includes("yoga")) return "yoga";
    if (name.includes("diet") || name.includes("nutrition")) return "nutrition";
    if (name.includes("cardio")) return "cardio";
    return "fitness";
  };

  const renderPackageIcon = (type) => {
    const iconProps = { size: 22 };
    switch (type) {
      case "yoga":
        return <MaterialCommunityIcons name="yoga" color="#8B5CF6" {...iconProps} />;
      case "nutrition":
        return <Ionicons name="nutrition" color="#F59E0B" {...iconProps} />;
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
      stars.push(<Ionicons key={i} name="star" size={14} color="#FFD700" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={14} color="#FFD700" />);
    }
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#D1D5DB" />);
    }
    return stars;
  };

  const renderPromoBanner = () => {
    const scaleAnim = bannerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.02],
    });

    return (
      <Animated.View style={[styles.promoBanner, { transform: [{ scale: scaleAnim }] }]}>
        <LinearGradient
          colors={['#FF6B6B', '#FF8E53']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.bannerGradient}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerLeft}>
              <View style={styles.saleIcon}>
                <Ionicons name="flash" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>MEGA SALE 50% OFF</Text>
                <Text style={styles.bannerSubtitle}>Limited time offer • Ends in 2 days</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>Claim Now</Text>
              <Ionicons name="arrow-forward" size={14} color="#FF6B6B" />
            </TouchableOpacity>
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

    return (
      <Animated.View style={[styles.packageItem, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.packageCard, isFull && styles.packageCardDisabled]}
          onPress={() => {
            if (!isFull) navigation.navigate("PackageDetail", { package: item, totalClients });
          }}
          activeOpacity={0.8}
          disabled={isFull}
        >
          <LinearGradient
            colors={isFull ? ["#F8FAFC", "#F1F5F9"] : ["#FFFFFF", "#FAFBFC"]}
            style={styles.cardGradient}
          >
            {/* Popular Badge */}
            {item.currentSubscribers > item.maxSubscribers * 0.7 && !isFull && (
              <View style={styles.popularBadge}>
                <Ionicons name="flame" size={12} color="#FFFFFF" />
                <Text style={styles.popularBadgeText}>POPULAR</Text>
              </View>
            )}

            <View style={styles.cardHeader}>
              <View style={styles.packageTypeContainer}>
                {renderPackageIcon(packageType)}
                <Text style={styles.packageTypeText}>{packageType.toUpperCase()}</Text>
              </View>
              {isFull && (
                <View style={styles.fullBadge}>
                  <Ionicons name="lock-closed" size={12} color="#DC2626" />
                  <Text style={styles.fullBadgeText}>FULL</Text>
                </View>
              )}
            </View>

            <View style={styles.packageContent}>
              <Text style={styles.packageTitle} numberOfLines={2}>
                {item.packageName || "Premium Training Package"}
              </Text>
              
              {item.description && (
                <Text style={styles.packageDescription} numberOfLines={3}>
                  {item.description.replace(/<[^>]+>/g, "")}
                </Text>
              )}

              {/* Simple Price Section */}
              <View style={styles.priceSection}>
                <Text style={styles.currentPrice}>${item.price || "0"}</Text>
                <Text style={styles.priceLabel}>/ {item.durationDays} days</Text>
              </View>

              <View style={styles.packageStats}>
                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={16} color="#10B981" />
                  <Text style={styles.statText}>{item.durationDays || "N/A"} days</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="people-outline" size={16} color={isFull ? "#EF4444" : "#3B82F6"} />
                  <Text style={[styles.statText, { color: isFull ? "#EF4444" : "#374151" }]}>
                    {item.currentSubscribers}/{item.maxSubscribers} spots
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#8B5CF6" />
                  <Text style={styles.statText}>Guaranteed</Text>
                </View>
              </View>
            </View>

            {/* Enhanced Trainer Section */}
            <View style={styles.trainerSection}>
              <View style={styles.trainerInfo}>
                <View style={styles.trainerLeft}>
                  <View style={styles.trainerAvatarContainer}>
                    <Image
                      source={{ uri: item.trainerAvatar || "/placeholder.svg?height=48&width=48" }}
                      style={styles.trainerAvatar}
                    />
                    <View style={styles.onlineIndicator} />
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.trainerDetails}>
                    <Text style={styles.trainerName} numberOfLines={1}>
                      {item.trainerFullName || "Professional Trainer"}
                    </Text>
                    <View style={styles.trainerRating}>
                      <View style={styles.starsContainer}>{renderStars(averageRating)}</View>
                      <Text style={styles.ratingText}>({averageRating.toFixed(1)})</Text>
                    </View>
                    <Text style={styles.trainerTitle}>Certified Trainer</Text>
                  </View>
                </View>
                <View style={styles.trainerStats}>
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatNumber}>{yearsExperience}+</Text>
                    <Text style={styles.miniStatLabel}>Years</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatNumber}>{totalClients}</Text>
                    <Text style={styles.miniStatLabel}>Clients</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Call to Action */}
            <View style={styles.ctaSection}>
              <TouchableOpacity
                style={[styles.ctaButton, isFull && styles.ctaButtonDisabled]}
                onPress={() => {
                  if (!isFull) navigation.navigate("PackageDetail", { package: item, totalClients });
                }}
                disabled={isFull}
              >
                <Text style={[styles.ctaButtonText, isFull && styles.ctaButtonTextDisabled]}>
                  {isFull ? "Package Full" : "Start Training"}
                </Text>
                {!isFull && <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>

            {isFull && <View style={styles.disabledOverlay} />}
          </LinearGradient>
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
                    placeholder="Min"
                    placeholderTextColor="#94A3B8"
                    value={tempFilters.minPrice}
                    onChangeText={(text) => setTempFilters({ ...tempFilters, minPrice: text })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceSeparator}>-</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max"
                    placeholderTextColor="#94A3B8"
                    value={tempFilters.maxPrice}
                    onChangeText={(text) => setTempFilters({ ...tempFilters, maxPrice: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Sort By</Text>
                <View style={styles.sortOptions}>
                  {[
                    { label: "Price", value: "price" },
                    { label: "Rating", value: "rating" },
                    { label: "Duration", value: "days" },
                    { label: "Latest", value: "created" },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sortOption,
                        tempFilters.sortBy === option.value && styles.sortOptionActive,
                      ]}
                      onPress={() => setTempFilters({ ...tempFilters, sortBy: option.value })}
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
                  setTempFilters({ minPrice: "", maxPrice: "", sortBy: "packageId", sortDescending: true });
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
                  fetchPackages(searchTerm, 1);
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

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#FFFFFF" />
      <Header
        title="Training Packages"
        onBack={() => navigation.goBack()}
        rightActions={[
          { icon: "options-outline", onPress: () => setShowFilterModal(true), color: "#3B82F6" },
        ]}
      />

      {/* Enhanced Search Section */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search training packages..."
              placeholderTextColor="#94A3B8"
              value={tempSearchTerm}
              onChangeText={setTempSearchTerm}
              onSubmitEditing={handleSearch}
            />
            {tempSearchTerm ? (
              <TouchableOpacity onPress={() => {
                setTempSearchTerm("");
                setSearchTerm("");
                fetchPackages("", 1);
              }}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>{totalItems} packages available</Text>
          <View style={styles.featuredIndicator}>
            <Ionicons name="star" size={12} color="#FFD700" />
            <Text style={styles.featuredText}>Featured packages</Text>
          </View>
        </View>
      </View>

      {/* Promo Banner - Now positioned after search */}
      {renderPromoBanner()}

      {loading && pageNumber === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Finding perfect packages...</Text>
        </View>
      ) : (
        <FlatList
          data={packages}
          keyExtractor={(item) => item.packageId.toString()}
          renderItem={renderPackage}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={renderEmpty}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
          style={styles.flatList}
        />
      )}

      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  promoBanner: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 15,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "500",
  },
  bannerButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bannerButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF6B6B",
  },
  searchContainer: {
    padding: 20,
    marginTop: 55,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 12,
  },
  searchButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultsText: {
    fontSize: 14,
    color: "#64748B",
  },
  featuredIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  featuredText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  flatList: {
    // Removed marginTop since banner is now above the list
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  packageItem: {
    marginBottom: 20,
  },
  packageCard: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  packageCardDisabled: {
    opacity: 0.7,
  },
  cardGradient: {
    position: "relative",
  },
  popularBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
  },
  packageTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  packageTypeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  fullBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fullBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
    marginLeft: 4,
  },
  packageContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  packageTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 28,
  },
  packageDescription: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 16,
  },
  priceSection: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 16,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1E293B",
    marginRight: 6,
  },
  priceLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  packageStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
    marginLeft: 6,
  },
  trainerSection: {
    backgroundColor: "#FAFBFC",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  trainerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trainerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  trainerAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  trainerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  verifiedBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  trainerDetails: {
    flex: 1,
  },
  trainerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  trainerRating: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  trainerTitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  trainerStats: {
    flexDirection: "row",
    gap: 12,
  },
  miniStat: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 50,
  },
  miniStatNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  miniStatLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  ctaSection: {
    padding: 20,
    paddingTop: 16,
  },
  ctaButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonDisabled: {
    backgroundColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    marginRight: 8,
  },
  ctaButtonTextDisabled: {
    color: "#94A3B8",
    marginRight: 0,
  },
  disabledOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#3B82F6",
    marginTop: 12,
    fontWeight: "500",
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
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
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