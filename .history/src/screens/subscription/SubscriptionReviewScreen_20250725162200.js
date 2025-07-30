
import { useEffect, useState } from "react"
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
} from "react-native"
import { apiSubscriptionService } from "../../services/apiSubscriptionService"
import { useNavigation } from "@react-navigation/native"

const SubscriptionReviewScreen = () => {
  const navigation = useNavigation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const fetchData = async (pageNumber = 1, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const res = await apiSubscriptionService.getSubscriptionsNeedToReviewForUser({
        pageNumber,
        pageSize,
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
  }, [page])

  const onRefresh = () => {
    setPage(1)
    fetchData(1, true)
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return dateString.slice(0, 10)
  }

  const formatPrice = (price) => {
    if (!price) return "0"
    return price.toLocaleString("vi-VN")
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "#10B981"
      case "active":
        return "#3B82F6"
      case "pending":
        return "#F59E0B"
      default:
        return "#6B7280"
    }
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.packageName} numberOfLines={2}>
          {item.packageName}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Trainer</Text>
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
            <Text style={styles.infoLabel}>User</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.userFullName}
            </Text>
            <Text style={styles.infoSubValue} numberOfLines={1}>
              {item.userEmail}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>
              {formatDate(item.startDate)} - {formatDate(item.endDate)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.priceValue}>{formatPrice(item.packagePrice)} VND</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.reviewButton}
        onPress={() => navigation.navigate("SubscriptionReviewDetailScreen", { subscription: item })}
        activeOpacity={0.8}
      >
        <Text style={styles.reviewButtonText}>Review Package</Text>
        <Text style={styles.reviewButtonIcon}>→</Text>
      </TouchableOpacity>
    </View>
  )

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Text style={styles.emptyIconText}>📋</Text>
      </View>
      <Text style={styles.emptyTitle}>No Reviews Needed</Text>
      <Text style={styles.emptyDescription}>
        There are no subscription packages that need to be reviewed at the moment.
      </Text>
    </View>
  )

  const renderError = () => (
    <View style={styles.errorState}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorIconText}>⚠️</Text>
      </View>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorDescription}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchData(page)}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )

  const renderPagination = () => {
    if (!data || data.totalPages <= 1) return null

    return (
      <View style={styles.pagination}>
        <TouchableOpacity
          disabled={page <= 1}
          onPress={() => setPage(page - 1)}
          style={[styles.pageButton, page <= 1 && styles.pageButtonDisabled]}
          activeOpacity={0.7}
        >
          <Text style={[styles.pageButtonText, page <= 1 && styles.pageButtonTextDisabled]}>← Previous</Text>
        </TouchableOpacity>

        <View style={styles.pageInfo}>
          <Text style={styles.pageText}>
            Page {data.pageNumber} of {data.totalPages}
          </Text>
        </View>

        <TouchableOpacity
          disabled={page >= data.totalPages}
          onPress={() => setPage(page + 1)}
          style={[styles.pageButton, page >= data.totalPages && styles.pageButtonDisabled]}
          activeOpacity={0.7}
        >
          <Text style={[styles.pageButtonText, page >= data.totalPages && styles.pageButtonTextDisabled]}>Next →</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading subscriptions...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error && !data) {
    return <SafeAreaView style={styles.container}>{renderError()}</SafeAreaView>
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Subscription Reviews</Text>
        <Text style={styles.headerSubtitle}>{data?.totalCount || 0} packages need review</Text>
      </View>

      <FlatList
        data={data?.subscriptions || []}
        keyExtractor={(item) => item.subscriptionId.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#3B82F6"]} tintColor="#3B82F6" />
        }
        ListEmptyComponent={renderEmptyState}
      />

      {renderPagination()}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    paddingBottom: 16,
  },
  packageName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
    marginRight: 12,
    lineHeight: 24,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
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
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
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
    backgroundColor: "#3B82F6",
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  reviewButtonIcon: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  pageButtonDisabled: {
    backgroundColor: "#F8FAFC",
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  pageButtonTextDisabled: {
    color: "#CBD5E1",
  },
  pageInfo: {
    flex: 1,
    alignItems: "center",
  },
  pageText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 16,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyIconText: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  errorIconText: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  errorDescription: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default SubscriptionReviewScreen
