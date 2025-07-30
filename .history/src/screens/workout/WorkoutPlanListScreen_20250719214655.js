import { useEffect, useState, useContext } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  ScrollView,
  Dimensions,
  Image,
} from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { Ionicons } from "@expo/vector-icons"
import Header from "components/Header"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useNavigation } from "@react-navigation/native"
import { getPlansByUserId } from "services/apiWorkoutPlanService"
import { AuthContext } from "context/AuthContext"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")

const STATUS_OPTIONS = [
  { label: "All Status", value: "", color: "#6B7280" },
  { label: "Active", value: "Active", color: "#10B981" },
  { label: "Completed", value: "Completed", color: "#3B82F6" },
  { label: "Pending", value: "Pending", color: "#F59E0B" },
  { label: "Cancelled", value: "Cancelled", color: "#EF4444" },
]

export default function WorkoutPlanListScreen({ route }) {
  const navigation = useNavigation()
  const { user } = useContext(AuthContext)
  const userId = route?.params?.userId || user?.userId

  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  // Pagination states
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("")
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [showFilters, setShowFilters] = useState(false)

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchPlans()
    }
  }, [userId, page, pageSize, searchTerm, selectedStatus, startDate, endDate])

  const fetchPlans = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
      setPage(1)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const params = {
        pageNumber: isRefresh ? 1 : page,
        pageSize: pageSize,
      }

      // Add filters if they exist
      if (searchTerm.trim()) params.searchTerm = searchTerm.trim()
      if (selectedStatus) params.status = selectedStatus
      if (startDate) params.startDate = startDate.toISOString()
      if (endDate) params.endDate = endDate.toISOString()

      const res = await getPlansByUserId(userId, params)
      setPlans(res?.data?.plans || [])
      setTotalPages(res?.data?.totalPages || 1)
    } catch (e) {
      setError(e?.message || "Failed to load workout plans")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchPlans(true)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setSelectedStatus("")
    setStartDate(null)
    setEndDate(null)
    setPage(1)
  }

  const handleStartDateChange = (event, date) => {
    setShowStartDatePicker(false)
    if (date) {
      setStartDate(date)
      setPage(1)
    }
  }

  const handleEndDateChange = (event, date) => {
    setShowEndDatePicker(false)
    if (date) {
      setEndDate(date)
      setPage(1)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusColor = (status) => {
    const statusOption = STATUS_OPTIONS.find((opt) => opt.value.toLowerCase() === status?.toLowerCase())
    return statusOption ? statusOption.color : "#6B7280"
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (selectedStatus) count++
    if (startDate) count++
    if (endDate) count++
    return count
  }

  const renderFilterModal = () => (
    <Modal visible={showFilters} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.filterModal}>
          {/* Modal Header */}
          <View style={styles.filterHeader}>
            <View style={styles.filterHeaderLeft}>
              <View style={styles.filterIconContainer}>
                <Ionicons name="options" size={24} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.filterTitle}>Filter Options</Text>
                <Text style={styles.filterSubtitle}>Customize your workout plan view</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            {/* Status Filter */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="flag" size={20} color="#4F46E5" />
                <Text style={styles.filterLabel}>Plan Status</Text>
              </View>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.statusOption,
                      selectedStatus === option.value && styles.statusOptionSelected,
                      { borderColor: option.color },
                    ]}
                    onPress={() => setSelectedStatus(option.value)}
                  >
                    <View style={[styles.statusDot, { backgroundColor: option.color }]} />
                    <Text
                      style={[
                        styles.statusOptionText,
                        selectedStatus === option.value && styles.statusOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selectedStatus === option.value && <Ionicons name="checkmark" size={16} color="#4F46E5" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color="#4F46E5" />
                <Text style={styles.filterLabel}>Date Range</Text>
              </View>
              <View style={styles.dateContainer}>
                <TouchableOpacity
                  style={[styles.dateButton, startDate && styles.dateButtonActive]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <View style={styles.dateButtonContent}>
                    <Ionicons name="calendar-outline" size={20} color={startDate ? "#4F46E5" : "#6B7280"} />
                    <View style={styles.dateTextContainer}>
                      <Text style={styles.dateLabel}>Start Date</Text>
                      <Text style={[styles.dateText, startDate && styles.dateTextActive]}>
                        {startDate ? formatDate(startDate) : "Select date"}
                      </Text>
                    </View>
                  </View>
                  {startDate && (
                    <TouchableOpacity style={styles.clearDateButton} onPress={() => setStartDate(null)}>
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateButton, endDate && styles.dateButtonActive]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <View style={styles.dateButtonContent}>
                    <Ionicons name="calendar-outline" size={20} color={endDate ? "#4F46E5" : "#6B7280"} />
                    <View style={styles.dateTextContainer}>
                      <Text style={styles.dateLabel}>End Date</Text>
                      <Text style={[styles.dateText, endDate && styles.dateTextActive]}>
                        {endDate ? formatDate(endDate) : "Select date"}
                      </Text>
                    </View>
                  </View>
                  {endDate && (
                    <TouchableOpacity style={styles.clearDateButton} onPress={() => setEndDate(null)}>
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Page Size */}
            <View style={styles.filterSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={20} color="#4F46E5" />
                <Text style={styles.filterLabel}>Items per page</Text>
              </View>
              <View style={styles.pageSizeContainer}>
                {[5, 10, 20, 50].map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[styles.pageSizeOption, pageSize === size && styles.pageSizeOptionSelected]}
                    onPress={() => {
                      setPageSize(size)
                      setPage(1)
                    }}
                  >
                    <Text style={[styles.pageSizeText, pageSize === size && styles.pageSizeTextSelected]}>{size}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Filter Actions */}
          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Ionicons name="refresh" size={20} color="#6B7280" />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={() => setShowFilters(false)}>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderPlanItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.planCard, { marginTop: index === 0 ? 0 : 16 }]}
      onPress={() =>
        navigation.navigate("WorkoutPlanExercisesScreen", {
          planId: item.planId,
          planName: item.planName,
        })
      }
    >
      {/* Card Image */}
      <View style={styles.cardImageContainer}>
        <Image
          source={{ uri: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-q4ZzPoxjKiZdphX3wp9qBcFkB8Ghdj.png" }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay} />
        
        {/* Status Badge on Image */}
        <View style={[styles.statusBadgeOnImage, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusTextOnImage}>{item.status || "ACTIVE"}</Text>
        </View>
      </View>

      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Plan Name */}
        <Text style={styles.planName} numberOfLines={2}>
          {item.planName}
        </Text>

        {/* Description */}
        {item.description && (
          <Text style={styles.planDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Info Row: Date left (normal), Trainer right (by ...) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ fontSize: 13, color: '#64748B', fontWeight: '400' }}>
            {formatDate(item.startDate)} - {formatDate(item.endDate)}
          </Text>
          {item.trainerFullName && (
            <Text style={{ fontSize: 13, color: '#64748B', fontStyle: 'italic', fontWeight: '400' }}>by {item.trainerFullName}</Text>
          )}
        </View>

        {/* Action Arrow removed: click card to navigate */}
      </View>
    </TouchableOpacity>
  )

  const renderPagination = () => {
    if (totalPages <= 1) return null

    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          disabled={page === 1}
          onPress={() => setPage(page - 1)}
          style={[styles.paginationBtn, page === 1 && styles.paginationBtnDisabled]}
        >
          <Ionicons name="chevron-back" size={18} color={page === 1 ? "#C7D2FE" : "#4F46E5"} />
          <Text style={[styles.paginationText, page === 1 && styles.paginationTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageText}>
            Page {page} of {totalPages}
          </Text>
          <Text style={styles.pageSubtext}>{plans.length} plans</Text>
        </View>

        <TouchableOpacity
          disabled={page === totalPages}
          onPress={() => setPage(page + 1)}
          style={[styles.paginationBtn, page === totalPages && styles.paginationBtnDisabled]}
        >
          <Text style={[styles.paginationText, page === totalPages && styles.paginationTextDisabled]}>Next</Text>
          <Ionicons name="chevron-forward" size={18} color={page === totalPages ? "#C7D2FE" : "#4F46E5"} />
        </TouchableOpacity>
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="fitness-outline" size={64} color="#C7D2FE" />
      </View>
      <Text style={styles.emptyTitle}>No Workout Plans Found</Text>
      <Text style={styles.emptySubtitle}>
        {searchTerm || selectedStatus || startDate || endDate
          ? "Try adjusting your search or filters to find more plans"
          : "Your trainer hasn't assigned any workout plans yet"}
      </Text>
      {(searchTerm || selectedStatus || startDate || endDate) && (
        <TouchableOpacity style={styles.emptyActionButton} onPress={clearFilters}>
          <Ionicons name="refresh" size={20} color="#4F46E5" />
          <Text style={styles.emptyActionText}>Clear Filters</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  const renderErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FCA5A5" />
      </View>
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorSubtitle}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={() => fetchPlans()}>
        <Ionicons name="refresh" size={20} color="#4F46E5" />
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <Header
        title="Workout Plans"
        onBack={() => navigation.goBack()}
        backgroundColor="#fff"
        rightActions={[]}
      />

      {/* Search and Filter Bar */}
      <View style={[styles.searchContainer, { marginTop: 55 }]}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search workout plans..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={(text) => {
              setSearchTerm(text)
              setPage(1)
            }}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, getActiveFiltersCount() > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options" size={20} color={getActiveFiltersCount() > 0 ? "#fff" : "#4F46E5"} />
          {getActiveFiltersCount() > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active Filters */}
      {(selectedStatus || startDate || endDate) && (
        <View style={styles.activeFilters}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterChipsContainer}
          >
            {selectedStatus && (
              <View style={[styles.filterChip, { borderColor: getStatusColor(selectedStatus) }]}>
                <View style={[styles.chipDot, { backgroundColor: getStatusColor(selectedStatus) }]} />
                <Text style={styles.filterChipText}>{selectedStatus}</Text>
                <TouchableOpacity onPress={() => setSelectedStatus("")}>
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {startDate && (
              <View style={styles.filterChip}>
                <Ionicons name="calendar" size={14} color="#4F46E5" />
                <Text style={styles.filterChipText}>From: {formatDate(startDate)}</Text>
                <TouchableOpacity onPress={() => setStartDate(null)}>
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
            {endDate && (
              <View style={styles.filterChip}>
                <Ionicons name="calendar" size={14} color="#4F46E5" />
                <Text style={styles.filterChipText}>To: {formatDate(endDate)}</Text>
                <TouchableOpacity onPress={() => setEndDate(null)}>
                  <Ionicons name="close" size={16} color="#6B7280" />
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <Loading />
        ) : error ? (
          renderErrorState()
        ) : plans.length === 0 ? (
          renderEmptyState()
        ) : (
          <>
            <FlatList
              data={plans}
              keyExtractor={(item) => item.planId.toString()}
              renderItem={renderPlanItem}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
            {renderPagination()}
          </>
        )}
      </View>

      {/* Filter Modal */}
      {renderFilterModal()}

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
          maximumDate={endDate || new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
          minimumDate={startDate || new Date()}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#0F172A",
    fontWeight: "500",
  },
  filterButton: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#4F46E5",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  activeFilters: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterChipsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  listContainer: {
    paddingBottom: 20,
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  cardImageContainer: {
    height: 180,
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
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  statusBadgeOnImage: {
    position: "absolute",
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusTextOnImage: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardContent: {
    padding: 20,
  },
  planName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    lineHeight: 28,
  },
  planDescription: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
    marginBottom: 20,
    fontWeight: "500",
  },
  infoRow: {
    marginBottom: 20,
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
  },
  actionContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  actionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    paddingHorizontal: 4,
  },
  paginationBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  paginationBtnDisabled: {
    backgroundColor: "#F8FAFC",
    shadowOpacity: 0,
    elevation: 0,
  },
  paginationText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4F46E5",
  },
  paginationTextDisabled: {
    color: "#CBD5E1",
  },
  pageIndicator: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  pageText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    backgroundColor: "#EEF2FF",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: "500",
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    fontWeight: "500",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#4F46E5",
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4F46E5",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  filterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  filterIconContainer: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 8,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  filterSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  closeButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 8,
  },
  filterContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  statusGrid: {
    gap: 12,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  statusOptionSelected: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusOptionText: {
    flex: 1,
    fontSize: 16,
    color: "#475569",
    fontWeight: "500",
  },
  statusOptionTextSelected: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  dateContainer: {
    gap: 16,
  },
  dateButton: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButtonActive: {
    backgroundColor: "#EEF2FF",
    borderColor: "#4F46E5",
  },
  dateButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  dateTextActive: {
    color: "#4F46E5",
    fontWeight: "600",
  },
  clearDateButton: {
    padding: 4,
  },
  pageSizeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  pageSizeOption: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    minWidth: 60,
    alignItems: "center",
  },
  pageSizeOptionSelected: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  pageSizeText: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "600",
  },
  pageSizeTextSelected: {
    color: "#fff",
  },
  filterActions: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  clearButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748B",
  },
  applyButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
})