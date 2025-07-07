"use client"
import { useState, useEffect, useRef } from "react"
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
} from "react-native"
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useAuth } from "context/AuthContext"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import trainerService from "services/apiTrainerService"

const { width, height } = Dimensions.get("window")

const ServicePackageScreen = ({ navigation }) => {
  const { user } = useAuth()
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    sortBy: "packageId",
    sortDescending: true,
  })
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [tempFilters, setTempFilters] = useState(filters)
  const [trainerRatings, setTrainerRatings] = useState({})
  const [trainerClients, setTrainerClients] = useState({})
  const [trainerExperience, setTrainerExperience] = useState({})

  // Fetch packages from API
  const fetchPackages = async () => {
    setLoading(true)
    try {
      const res = await trainerService.getAllActiveServicePackage()
      const data = res.data?.packages || []
      setPackages(data)
      setTotalPages(res.data?.totalPages || 1)
      setTotalItems(res.data?.totalCount || data.length)
      setHasMore(res.data?.pageNumber < res.data?.totalPages)
      
      const trainerClientsMap = calculateTrainerClients(data)
      setTrainerClients(trainerClientsMap)
      fetchTrainerRatings(data)
      fetchTrainerExperience(data)
    } catch (e) {
      setPackages([])
      setTotalPages(1)
      setTotalItems(0)
      setHasMore(false)
    }
    setLoading(false)
  }

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [])

  useEffect(() => {
    fetchPackages()
  }, [])

  const calculateTrainerClients = (packages) => {
    const trainerClients = {}
    packages.forEach((pkg) => {
      if (!trainerClients[pkg.trainerId]) {
        trainerClients[pkg.trainerId] = 0
      }
      trainerClients[pkg.trainerId] += pkg.currentSubscribers
    })
    return trainerClients
  }

  const fetchTrainerRatings = async (packages) => {
    const ratingsMap = {}
    const trainerIds = [...new Set(packages.map((pkg) => pkg.trainerId))]
    await Promise.all(
      trainerIds.map(async (trainerId) => {
        try {
          const res = await trainerService.getTrainerAverageRating(trainerId)
          let avg = res.data
          if (typeof avg === "object" && avg !== null && avg.averageRating !== undefined) {
            avg = avg.averageRating
          }
          ratingsMap[trainerId] = avg || 0
        } catch (e) {
          ratingsMap[trainerId] = 0
        }
      }),
    )
    setTrainerRatings(ratingsMap)
  }

  const fetchTrainerExperience = async (packages) => {
    const experienceMap = {}
    const trainerIds = [...new Set(packages.map((pkg) => pkg.trainerId))]
    await Promise.all(
      trainerIds.map(async (trainerId) => {
        try {
          const res = await trainerService.getApprovedTrainerApplication(trainerId)
          const years = res.data?.yearsOfExperience ?? res.data?.experienceYears ?? 0
          experienceMap[trainerId] = years
        } catch (e) {
          experienceMap[trainerId] = 0
        }
      }),
    )
    setTrainerExperience(experienceMap)
  }

  const onRefresh = () => {
    setRefreshing(true)
    fetchPackages().finally(() => setRefreshing(false))
  }

  const handleSearch = async (text) => {
    setSearchTerm(text)
    setPageNumber(1)
    setLoading(true)
    try {
      const res = await trainerService.getAllActiveServicePackage({ search: text })
      const data = res.data?.packages || []
      setPackages(data)
      setTotalItems(res.data?.totalCount || data.length)
      setTotalPages(Math.ceil((res.data?.totalCount || data.length) / pageSize))
      setHasMore(res.data?.pageNumber < res.data?.totalPages)
      const trainerClientsMap = calculateTrainerClients(data)
      setTrainerClients(trainerClientsMap)
      fetchTrainerRatings(data)
      fetchTrainerExperience(data)
    } catch (e) {
      setPackages([])
      setTotalItems(0)
      setTotalPages(1)
      setHasMore(false)
    }
    setLoading(false)
  }

  const getPackageIcon = (packageName) => {
    if (!packageName) return "fitness"
    const name = packageName.toLowerCase()
    if (name.includes("yoga")) return "yoga"
    if (name.includes("diet") || name.includes("nutrition")) return "nutrition"
    if (name.includes("cardio")) return "cardio"
    return "fitness"
  }

  const renderPackageIcon = (type) => {
    const iconProps = { size: 20 }
    switch (type) {
      case "yoga":
        return <MaterialCommunityIcons name="yoga" color="#10B981" {...iconProps} />
      case "nutrition":
        return <Ionicons name="nutrition" color="#F59E0B" {...iconProps} />
      case "cardio":
        return <Ionicons name="heart" color="#EF4444" {...iconProps} />
      default:
        return <MaterialCommunityIcons name="dumbbell" color="#6366F1" {...iconProps} />
    }
  }

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#FFD700" />)
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={14} color="#FFD700" />)
    }
    const remainingStars = 5 - Math.ceil(rating)
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#D1D5DB" />)
    }
    return stars
  }

  const renderPackage = ({ item }) => {
    const packageType = getPackageIcon(item.packageName)
    const isFull = item.currentSubscribers >= item.maxSubscribers
    const averageRating = trainerRatings[item.trainerId] || 0
    const totalClients = trainerClients[item.trainerId] || 0
    const yearsExperience = trainerExperience[item.trainerId] || 0

    return (
      <Animated.View style={[styles.packageItem, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[styles.packageCard, isFull && styles.packageCardDisabled]}
          onPress={() => {
            if (!isFull) navigation.navigate("PackageDetail", { package: item, totalClients })
          }}
          activeOpacity={0.7}
          disabled={isFull}
        >
          <LinearGradient
            colors={isFull ? ["#F8FAFC", "#F1F5F9"] : ["#FFFFFF", "#FAFBFC"]}
            style={styles.cardGradient}
          >
            {/* Header Section */}
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

            {/* Package Info */}
            <View style={styles.packageContent}>
              <Text style={styles.packageTitle} numberOfLines={2}>
                {item.packageName || "Premium Training Package"}
              </Text>
              
              {item.description && (
                <Text style={styles.packageDescription} numberOfLines={2}>
                  {item.description.replace(/<[^>]+>/g, "")}
                </Text>
              )}

              {/* Package Stats */}
              <View style={styles.packageStats}>
                <View style={styles.statItem}>
                  <Ionicons name="pricetag" size={16} color="#6366F1" />
                  <Text style={styles.statText}>${item.price || "0"}</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="calendar" size={16} color="#10B981" />
                  <Text style={styles.statText}>{item.durationDays || "N/A"} days</Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={16} color={isFull ? "#EF4444" : "#0EA5E9"} />
                  <Text style={[styles.statText, isFull && { color: "#EF4444" }]}>
                    {item.currentSubscribers}/{item.maxSubscribers}
                  </Text>
                </View>
              </View>
            </View>

            {/* Trainer Section - Integrated */}
            <View style={styles.trainerSection}>
              <View style={styles.trainerInfo}>
                <View style={styles.trainerLeft}>
                  <View style={styles.trainerAvatarContainer}>
                    <Image
                      source={{ uri: item.trainerAvatar || "/placeholder.svg?height=44&width=44" }}
                      style={styles.trainerAvatar}
                    />
                    <View style={styles.onlineIndicator} />
                  </View>
                  <View style={styles.trainerDetails}>
                    <Text style={styles.trainerName} numberOfLines={1}>
                      {item.trainerFullName || "Professional Trainer"}
                    </Text>
                    <View style={styles.trainerRating}>
                      <View style={styles.starsContainer}>{renderStars(averageRating)}</View>
                      <Text style={styles.ratingText}>({averageRating.toFixed(1)})</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.trainerStats}>
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatNumber}>{yearsExperience}+</Text>
                    <Text style={styles.miniStatLabel}>Exp</Text>
                  </View>
                  <View style={styles.miniStat}>
                    <Text style={styles.miniStatNumber}>{totalClients}</Text>
                    <Text style={styles.miniStatLabel}>Clients</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Indicator */}
            <View style={styles.actionIndicator}>
              <Ionicons 
                name={isFull ? "lock-closed" : "chevron-forward"} 
                size={20} 
                color={isFull ? "#DC2626" : "#94A3B8"} 
              />
            </View>

            {isFull && <View style={styles.disabledOverlay} />}
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    )
  }

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
              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.sectionTitle}>Price Range</Text>
                <View style={styles.priceInputs}>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Min"
                    value={tempFilters.minPrice}
                    onChangeText={(text) => setTempFilters({ ...tempFilters, minPrice: text })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.priceSeparator}>-</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="Max"
                    value={tempFilters.maxPrice}
                    onChangeText={(text) => setTempFilters({ ...tempFilters, maxPrice: text })}
                    keyboardType="numeric"
                  />
                </View>
              </View>
              {/* Sort Options */}
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
                      style={[styles.sortOption, tempFilters.sortBy === option.value && styles.sortOptionActive]}
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
            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setTempFilters({ minPrice: "", maxPrice: "", sortBy: "packageId", sortDescending: true })
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setFilters(tempFilters)
                  setShowFilterModal(false)
                  fetchPackages()
                }}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="fitness-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No Packages Found</Text>
      <Text style={styles.emptyText}>Try adjusting your search or filters</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Training Packages</Text>
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
            <Ionicons name="options-outline" size={24} color="#1E293B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search packages..."
            value={searchTerm}
            onChangeText={handleSearch}
            placeholderTextColor="#94A3B8"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => handleSearch("")}>
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.resultsText}>{totalItems} packages available</Text>
      </View>

      {/* Content */}
      {loading && pageNumber === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading packages...</Text>
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
        />
      )}

      {renderFilterModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
    textAlign: "center",
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  searchContainer: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    marginLeft: 12,
  },
  resultsText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  packageItem: {
    marginBottom: 16,
  },
  packageCard: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  packageCardDisabled: {
    opacity: 0.8,
  },
  cardGradient: {
    padding: 20,
    position: "relative",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  packageTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  packageTypeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
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
    marginBottom: 16,
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 26,
  },
  packageDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 12,
  },
  packageStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 2,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
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
  trainerStats: {
    flexDirection: "row",
    gap: 12,
  },
  miniStat: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    minWidth: 40,
  },
  miniStatNumber: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  miniStatLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  actionIndicator: {
    position: "absolute",
    top: 20,
    right: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6366F1",
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
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
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
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  applyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default ServicePackageScreen