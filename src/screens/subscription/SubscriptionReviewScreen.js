import { useEffect,useState,useRef } from "react"
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Animated,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
} from "react-native"
import { apiSubscriptionService } from "services/apiSubscriptionService"
import { useNavigation } from "@react-navigation/native"
import { LinearGradient } from "expo-linear-gradient"
import Header from "components/Header"
import { Ionicons,MaterialCommunityIcons,Feather } from "@expo/vector-icons"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import SkeletonCard from "components/SkeletonCard/SkeletonCard"

const { width } = Dimensions.get("window")

const SubscriptionReviewScreen = () => {
  const navigation = useNavigation()
  const [data,setData] = useState(null)
  const [loading,setLoading] = useState(true)
  const [refreshing,setRefreshing] = useState(false)
  const [error,setError] = useState(null)
  const [page,setPage] = useState(1)
  const [showFilterModal,setShowFilterModal] = useState(false)
  const [searchTerm,setSearchTerm] = useState("")
  const [filters,setFilters] = useState({
    status: "",
    pageSize: 10,
  })
  const [tempFilters,setTempFilters] = useState(filters)
  const pageSize = 10

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim,{
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    return () => {
      fadeAnim.setValue(0)
      slideAnim.setValue(30)
      scaleAnim.setValue(0.95)
    }
  },[])

  const fetchData = async (pageNumber = 1,isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const res = await apiSubscriptionService.getSubscriptionsNeedToReviewForUser({
        pageNumber,
        pageSize: filters.pageSize || pageSize,
      })
      setData(res)
    } catch (err) {
      setError(err.message || "Error fetching data")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData(page)
  },[page,filters])

  const onRefresh = () => {
    setPage(1)
    fetchData(1,true)
  }

  const handleSearch = (text) => {
    setSearchTerm(text)
  }

  const goToPage = (pageNum) => {
    if (pageNum >= 1 && pageNum <= (data?.totalPages || 1) && !loading) {
      setPage(pageNum)
    }
  }

  const applyTempFilters = () => {
    setFilters(tempFilters)
    setPage(1)
    setShowFilterModal(false)
  }

  const resetTempFilters = () => {
    const resetFilters = {
      status: "",
      pageSize: 10,
    }
    setTempFilters(resetFilters)
    setFilters(resetFilters)
    setPage(1)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US",{
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatPrice = (price) => {
    if (!price) return "0"
    return price.toLocaleString("vi-VN")
  }

  const getStatusInfo = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return { color: "#10B981",bgColor: "#D1FAE5",icon: "checkmark-circle" }
      case "active":
        return { color: "#0056d2",bgColor: "#E3F2FD",icon: "checkmark-circle" }
      case "pending":
        return { color: "#F59E0B",bgColor: "#FEF3C7",icon: "time" }
      default:
        return { color: "#6B7280",bgColor: "#F1F5F9",icon: "help-circle" }
    }
  }

  const filteredData =
    data?.subscriptions?.filter((item) => {
      const matchesSearch =
        !searchTerm ||
        item.packageName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.trainerFullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userFullName?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = !filters.status || item.status?.toLowerCase() === filters.status.toLowerCase()

      return matchesSearch && matchesStatus
    }) || []

  const renderItem = ({ item,index }) => {
    const statusInfo = getStatusInfo(item.status)

    return (
      <Animated.View
        style={[
          styles.subscriptionCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => navigation.navigate("SubscriptionReviewDetailScreen",{ subscription: item })}
        >
          <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.cardGradient}>
            {/* Card Header */}
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={styles.packageIconContainer}>
                  <MaterialCommunityIcons name="package-variant" size={24} color="#0056d2" />
                </View>
                <View style={styles.packageInfo}>
                  <Text style={styles.packageName} numberOfLines={2}>
                    {item.packageName}
                  </Text>
                  <Text style={styles.trainerName} numberOfLines={1}>
                    Review needed
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge,{ backgroundColor: statusInfo.bgColor }]}>
                <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
                <Text style={[styles.statusText,{ color: statusInfo.color }]}>{item.status}</Text>
              </View>
            </View>

            {/* Trainer and User Info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>
                    <Feather name="user" size={14} color="#64748B" /> Trainer
                  </Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {item.trainerFullName}
                  </Text>
                  <Text style={styles.infoSubValue} numberOfLines={1}>
                    {item.trainerEmail}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>
                    <Feather name="users" size={14} color="#64748B" /> User
                  </Text>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {item.userFullName}
                  </Text>
                  <Text style={styles.infoSubValue} numberOfLines={1}>
                    {item.userEmail}
                  </Text>
                </View>
              </View>
            </View>

            {/* Duration and Price */}
            <View style={styles.detailsContainer}>
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    <Feather name="calendar" size={14} color="#64748B" /> Duration
                  </Text>
                  <Text style={styles.detailValue}>
                    {formatDate(item.startDate)} - {formatDate(item.endDate)}
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>
                    <Feather name="dollar-sign" size={14} color="#64748B" /> Price
                  </Text>
                  <Text style={styles.priceValue}>{formatPrice(item.packagePrice)} VND</Text>
                </View>
              </View>
            </View>

            {/* Review Button */}
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => navigation.navigate("SubscriptionReviewDetailScreen",{ subscription: item })}
              activeOpacity={0.8}
            >
              <Text style={styles.reviewButtonText}>Review Package</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  const renderSkeletonLoader = () => (
    <View style={styles.listContent}>
      {[...Array(3)].map((_,index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  )

  const renderPaginationDots = () => {
    const dots = []
    const maxDots = 5
    const totalPages = data?.totalPages || 1
    let startPage = Math.max(1,page - Math.floor(maxDots / 2))
    const endPage = Math.min(totalPages,startPage + maxDots - 1)

    if (endPage - startPage + 1 < maxDots) {
      startPage = Math.max(1,endPage - maxDots + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      dots.push(
        <TouchableOpacity
          key={i}
          style={[styles.paginationDot,i === page && styles.activePaginationDot]}
          onPress={() => goToPage(i)}
          disabled={loading}
        >
          <Text style={[styles.paginationDotText,i === page && styles.activePaginationDotText]}>{i}</Text>
        </TouchableOpacity>
      )
    }
    return dots
  }

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => {
        setShowFilterModal(false)
        setTempFilters(filters)
      }}
    >
      <View style={styles.modalOverlay}>
        <Animated.View
          style={[
            styles.filterModalContent,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.dragHandle} />

          {/* Modal Header */}
          <View style={styles.filterHeader}>
            <View style={styles.filterHeaderLeft}>
              <View style={styles.filterIconContainer}>
                <Ionicons name="options" size={24} color="#0056d2" />
              </View>
              <View>
                <Text style={styles.filterTitle}>Filter Reviews</Text>
                <Text style={styles.filterSubtitle}>Customize your view</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setShowFilterModal(false)
                setTempFilters(filters)
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterScrollView} showsVerticalScrollIndicator={false}>
            {/* Status Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <Feather name="activity" size={16} color="#0056d2" /> Status
              </Text>
              <View style={styles.statusGrid}>
                {[
                  { key: "",label: "All",icon: "list",color: "#64748B" },
                  { key: "active",label: "Active",icon: "checkmark-circle",color: "#10B981" },
                  { key: "pending",label: "Pending",icon: "time",color: "#F59E0B" },
                  { key: "completed",label: "Completed",icon: "checkmark-done",color: "#059669" },
                ].map((status) => (
                  <TouchableOpacity
                    key={status.key}
                    style={[styles.statusCard,tempFilters.status === status.key && styles.selectedStatusCard]}
                    onPress={() => setTempFilters({ ...tempFilters,status: status.key })}
                  >
                    <Ionicons
                      name={status.icon}
                      size={20}
                      color={tempFilters.status === status.key ? "#FFFFFF" : status.color}
                    />
                    <Text
                      style={[
                        styles.statusCardText,
                        tempFilters.status === status.key && styles.selectedStatusCardText,
                      ]}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Items per Page Section */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>
                <Feather name="grid" size={16} color="#0056d2" /> Items per Page
              </Text>
              <View style={styles.pageSizeGrid}>
                {[5,10,20,50].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.pageSizeCard,tempFilters.pageSize === size && styles.selectedPageSizeCard]}
                    onPress={() => setTempFilters({ ...tempFilters,pageSize: size })}
                  >
                    <Text
                      style={[
                        styles.pageSizeCardNumber,
                        tempFilters.pageSize === size && styles.selectedPageSizeCardNumber,
                      ]}
                    >
                      {size}
                    </Text>
                    <Text
                      style={[
                        styles.pageSizeCardLabel,
                        tempFilters.pageSize === size && styles.selectedPageSizeCardLabel,
                      ]}
                    >
                      items
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Filter Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={resetTempFilters}>
              <Feather name="refresh-cw" size={16} color="#0056d2" />
              <Text style={styles.clearFiltersText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyFiltersButton} onPress={applyTempFilters}>
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons name="clipboard-check-outline" size={80} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Reviews Needed</Text>
      <Text style={styles.emptyText}>
        {searchTerm || filters.status
          ? "No subscription packages match your current filters. Try adjusting your search criteria."
          : "There are no subscription packages that need to be reviewed at the moment."}
      </Text>
      {(searchTerm || filters.status) && (
        <TouchableOpacity style={styles.emptyActionButton} onPress={resetTempFilters}>
          <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          <Text style={styles.emptyActionText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )

  const renderError = () => (
    <Animated.View
      style={[
        styles.errorContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <View style={styles.errorIconContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={80} color="#EF4444" />
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(page)}>
        <Feather name="refresh-cw" size={16} color="#FFFFFF" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </Animated.View>
  )

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor="#0056d2" />
        <Header
          title="Reviews"
          onBack={() => navigation.goBack()}
          subtitle="Loading reviews..."
          style={{ backgroundColor: "#0056d2",paddingTop: Platform.OS === "android" ? 40 : 20,paddingBottom: 10 }}
        />
        {renderSkeletonLoader()}
      </SafeAreaView>
    )
  }

  if (error && !data) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <DynamicStatusBar backgroundColor="#0056d2" />
        <Header
          title="Reviews"
          onBack={() => navigation.goBack()}
          subtitle="Error loading reviews"
          style={{ backgroundColor: "#0056d2",paddingTop: Platform.OS === "android" ? 40 : 20,paddingBottom: 10 }}
        />
        {renderError()}
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <DynamicStatusBar backgroundColor="#0056d2" />
      <Header
        title="Reviews"
        onBack={() => navigation.goBack()}
        subtitle={
          data?.totalCount > 0
            ? `${data.totalCount} package${data.totalCount > 1 ? "s" : ""} need review`
            : "No reviews needed"
        }
        style={{ backgroundColor: "#0056d2",paddingTop: Platform.OS === "android" ? 40 : 20,paddingBottom: 10 }}
      />

      {/* Filter button below header */}
      <View style={{ alignItems: "flex-end",paddingHorizontal: 16,marginTop: 8 }}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="options" size={24} color="#FFFFFF" />
          {(searchTerm || filters.status) && <View style={styles.filterIndicator} />}
        </TouchableOpacity>
      </View>
      {/* Content */}
      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.subscriptionId.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0056d2"]} tintColor="#0056d2" />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Modern Pagination */}
      {data && data.totalPages > 1 && (
        <Animated.View
          style={[
            styles.paginationContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <LinearGradient colors={["#FFFFFF","#F8FAFC"]} style={styles.paginationGradient}>
            <View style={styles.paginationContent}>
              {/* Previous Button */}
              <TouchableOpacity
                style={[styles.paginationNavButton,page <= 1 && styles.disabledNavButton]}
                onPress={() => goToPage(page - 1)}
                disabled={page <= 1 || loading}
              >
                <Ionicons name="chevron-back" size={20} color={page <= 1 ? "#CBD5E1" : "#0056d2"} />
              </TouchableOpacity>

              {/* Page Dots */}
              <View style={styles.paginationDots}>{renderPaginationDots()}</View>

              {/* Next Button */}
              <TouchableOpacity
                style={[styles.paginationNavButton,page >= data.totalPages && styles.disabledNavButton]}
                onPress={() => goToPage(page + 1)}
                disabled={page >= data.totalPages || loading}
              >
                <Ionicons name="chevron-forward" size={20} color={page >= data.totalPages ? "#CBD5E1" : "#0056d2"} />
              </TouchableOpacity>
            </View>

            {/* Page Info */}
            <View style={styles.pageInfoContainer}>
              <Text style={styles.pageInfo}>
                Page {data.pageNumber} of {data.totalPages}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {renderFilterModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.primaryColor,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: "#0056d2",
    marginTop: 16,
    fontWeight: "500",
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  searchContainer: {
    backgroundColor: "#F8FAFC",
    marginTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 16,
  },
  clearSearchButton: {
    padding: 4,
  },
  resultsInfo: {
    alignItems: "center",
  },
  resultsText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
    backgroundColor: "#FFFFFF",
  },
  subscriptionCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  packageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  trainerName: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  infoContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  infoSubValue: {
    fontSize: 14,
    color: "#64748B",
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  detailValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#059669",
  },
  reviewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0056d2",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F8FAFC",
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F8FAFC",
  },
  errorIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  paginationContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  paginationGradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  paginationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paginationNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledNavButton: {
    backgroundColor: "#F1F5F9",
  },
  paginationDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paginationDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  activePaginationDot: {
    backgroundColor: "#0056d2",
  },
  paginationDotText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  activePaginationDotText: {
    color: "#FFFFFF",
  },
  pageInfoContainer: {
    alignItems: "center",
  },
  pageInfo: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    minHeight: "60%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#CBD5E1",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  filterIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E3F2FD",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  filterSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  filterScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginVertical: 16,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statusCard: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  selectedStatusCard: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  statusCardText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  selectedStatusCardText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  pageSizeGrid: {
    flexDirection: "row",
    gap: 12,
  },
  pageSizeCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  selectedPageSizeCard: {
    backgroundColor: "#0056d2",
    borderColor: "#0056d2",
  },
  pageSizeCardNumber: {
    fontSize: 20,
    color: "#1E293B",
    fontWeight: "700",
  },
  selectedPageSizeCardNumber: {
    color: "#FFFFFF",
  },
  pageSizeCardLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  selectedPageSizeCardLabel: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  clearFiltersText: {
    fontSize: 16,
    color: "#0056d2",
    fontWeight: "600",
  },
  applyFiltersButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0056d2",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  applyFiltersText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default SubscriptionReviewScreen