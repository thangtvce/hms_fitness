import { useState,useEffect,useRef,useContext } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    TextInput,
    ActivityIndicator,
    Alert,
    Animated,
    Modal,
    ScrollView,
    Platform,
    Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
// import { LinearGradient } from "expo-linear-gradient"
import Header from "components/Header"
import { Ionicons,MaterialCommunityIcons,Feather } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { AuthContext } from "context/AuthContext"
import { apiSubscriptionService } from "services/apiSubscriptionService"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { theme } from "theme/color"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width } = Dimensions.get("window")

const MySubscriptionScreen = ({ navigation }) => {
    const { user } = useContext(AuthContext)
    const [subscriptions,setSubscriptions] = useState([])
    const [loading,setLoading] = useState(true)
    const [refreshing,setRefreshing] = useState(false)
    const [showFilterModal,setShowFilterModal] = useState(false)
    const [pageNumber,setPageNumber] = useState(1)
    const [pageSize,setPageSize] = useState(10)
    const [totalPages,setTotalPages] = useState(1)
    const [totalCount,setTotalCount] = useState(0)
    const [hasMore,setHasMore] = useState(true)
    const [searchTerm,setSearchTerm] = useState("")
    const [filters,setFilters] = useState({
        startDate: null,
        endDate: null,
        status: "active",
        validPageSize: 10,
    })
    const [tempFilters,setTempFilters] = useState(filters)
    const [showStartDatePicker,setShowStartDatePicker] = useState(false)
    const [showEndDatePicker,setShowEndDatePicker] = useState(false)
    const [showCustomStartDatePicker,setShowCustomStartDatePicker] = useState(false)
    const [showCustomEndDatePicker,setShowCustomEndDatePicker] = useState(false)

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

    const fetchSubscriptions = async (page = 1,refresh = false) => {
        try {
            if (refresh) {
                setRefreshing(true)
            } else if (page === 1) {
                setLoading(true)
            }

            if (!user?.userId) {
                Alert.alert("Authentication Error","Please log in to view your subscriptions.")
                setLoading(false)
                setRefreshing(false)
                return
            }

            const formatDate = (date) => {
                if (!date) return undefined
                return `${(date.getMonth() + 1).toString().padStart(2,"0")}-${date
                    .getDate()
                    .toString()
                    .padStart(2,"0")}-${date.getFullYear()}`
            }

            const queryParams = {
                PageNumber: page,
                PageSize: pageSize,
                SearchTerm: searchTerm || undefined,
                StartDate: formatDate(filters.startDate),
                EndDate: formatDate(filters.endDate),
                Status: filters.status || undefined,
                ValidPageSize: filters.validPageSize,
            }

            const response = await apiSubscriptionService.getMySubscription(queryParams,user.userId)

            if (response.statusCode === 200 && response.data?.subscriptions) {
                const newSubscriptions =
                    page === 1 ? response.data.subscriptions : [...subscriptions,...response.data.subscriptions]
                setSubscriptions(newSubscriptions)
                setTotalPages(response.data.totalPages || 1)
                setTotalCount(response.data.totalCount || 0)
                setHasMore(page < response.data.totalPages)
            } else {
                Alert.alert("Notice",response.message || "Unable to load subscriptions.")
                setSubscriptions([])
                setTotalPages(1)
                setTotalCount(0)
                setHasMore(false)
            }
        } catch (error) {
            Alert.alert("Error",error.message || "An error occurred while loading subscriptions.")
            setSubscriptions([])
            setTotalPages(1)
            setTotalCount(0)
            setHasMore(false)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        fetchSubscriptions(pageNumber)
    },[pageNumber,pageSize,searchTerm,filters,user?.userId])

    const onRefresh = () => {
        setPageNumber(1)
        fetchSubscriptions(1,true)
    }

    const handleSearch = (text) => {
        setSearchTerm(text)
        setPageNumber(1)
    }

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages && !loading) {
            setPageNumber(page)
        }
    }

    const applyTempFilters = () => {
        setFilters(tempFilters)
        setPageNumber(1)
        setShowFilterModal(false)
        fetchSubscriptions(1)
    }

    const resetTempFilters = () => {
        const resetFilters = {
            startDate: null,
            endDate: null,
            status: "active",
            validPageSize: 10,
        }
        setTempFilters(resetFilters)
        setFilters(resetFilters)
        setPageNumber(1)
    }

    const formatDisplayDate = (date) => {
        if (!date) return "Select Date"
        return date.toLocaleDateString("en-US",{
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }

    const getStatusInfo = (status) => {
        switch (status?.toLowerCase()) {
            case "active":
                return { color: "#10B981",bgColor: "#D1FAE5",icon: "checkmark-circle" }
            case "pending":
                return { color: "#F59E0B",bgColor: "#FEF3C7",icon: "time" }
            case "paid":
                return { color: "#059669",bgColor: "#A7F3D0",icon: "card" }
            case "canceled":
                return { color: "#EF4444",bgColor: "#FEE2E2",icon: "close-circle" }
            case "expired":
                return { color: "#6B7280",bgColor: "#F3F4F6",icon: "calendar" }
            default:
                return { color: "#6B7280",bgColor: "#F1F5F9",icon: "help-circle" }
        }
    }

    const renderSubscription = ({ item,index }) => {
        const statusInfo = getStatusInfo(item.status)
        const isExpired = new Date(item.endDate) < new Date()

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
                    onPress={() => navigation.navigate("SubscriptionDetail",{ subscription: item })}
                >
                    <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.cardGradient}>
                        {/* Card Header */}
                        <View style={styles.cardHeader}>
                            <View style={styles.cardHeaderLeft}>
                                <View style={styles.packageIconContainer}>
                                    <MaterialCommunityIcons name="package-variant" size={24} color="#0056d2" />
                                </View>
                                <View style={styles.packageInfo}>
                                    <Text style={styles.packageName} numberOfLines={1}>
                                        {item.packageName || "Fitness Package"}
                                    </Text>
                                    <Text style={styles.trainerName} numberOfLines={1}>
                                        by {item.trainerFullName || "Professional Trainer"}
                                    </Text>
                                </View>
                            </View>
                            <View style={[styles.statusBadge,{ backgroundColor: statusInfo.bgColor }]}>
                                <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
                                <Text style={[styles.statusText,{ color: statusInfo.color }]}>
                                    {item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || "Unknown"}
                                </Text>
                            </View>
                        </View>

                        {/* Price and Duration */}
                        <View style={styles.priceContainer}>
                            <View style={styles.priceInfo}>
                                <Text style={styles.priceLabel}>Package Price</Text>
                                <Text style={styles.priceValue}>${item.packagePrice?.toLocaleString() || "0"}</Text>
                            </View>
                            <View style={styles.durationInfo}>
                                <Text style={styles.durationLabel}>Duration</Text>
                                <Text style={styles.durationValue}>{item.packageDurationDays || "0"} days</Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        {item.status?.toLowerCase() === "active" && (
                            <View style={styles.progressContainer}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressLabel}>Progress</Text>
                                    <Text style={styles.progressPercentage}>
                                        {Math.round(
                                            ((new Date() - new Date(item.startDate)) / (new Date(item.endDate) - new Date(item.startDate))) *
                                            100,
                                        )}
                                        %
                                    </Text>
                                </View>
                                <View style={styles.progressBar}>
                                    <View
                                        style={[
                                            styles.progressFill,
                                            {
                                                width: `${Math.min(100,Math.max(0,((new Date() - new Date(item.startDate)) / (new Date(item.endDate) - new Date(item.startDate))) * 100))}%`,
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        )}

                        {/* Date Information */}
                        <View style={styles.dateContainer}>
                            <View style={styles.dateItem}>
                                <Feather name="play-circle" size={16} color="#10B981" />
                                <View style={styles.dateInfo}>
                                    <Text style={styles.dateLabel}>Start Date</Text>
                                    <Text style={styles.dateValue}>
                                        {new Date(item.startDate).toLocaleDateString("en-US",{
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.dateItem}>
                                <Feather name="stop-circle" size={16} color={isExpired ? "#EF4444" : "#F59E0B"} />
                                <View style={styles.dateInfo}>
                                    <Text style={styles.dateLabel}>End Date</Text>
                                    <Text style={[styles.dateValue,isExpired && styles.expiredDate]}>
                                        {new Date(item.endDate).toLocaleDateString("en-US",{
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                            style={styles.viewDetailsButton}
                            onPress={() => navigation.navigate("SubscriptionDetail",{ subscription: item })}
                        >
                            <Text style={styles.viewDetailsText}>View Details</Text>
                            <Feather name="arrow-right" size={16} color="#0056d2" />
                        </TouchableOpacity>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        )
    }

    const renderPaginationDots = () => {
        const dots = []
        const maxDots = 5
        let startPage = Math.max(1,pageNumber - Math.floor(maxDots / 2))
        const endPage = Math.min(totalPages,startPage + maxDots - 1)

        if (endPage - startPage + 1 < maxDots) {
            startPage = Math.max(1,endPage - maxDots + 1)
        }

        for (let i = startPage; i <= endPage; i++) {
            dots.push(
                <TouchableOpacity
                    key={i}
                    style={[styles.paginationDot,i === pageNumber && styles.activePaginationDot]}
                    onPress={() => goToPage(i)}
                    disabled={loading}
                >
                    <Text style={[styles.paginationDotText,i === pageNumber && styles.activePaginationDotText]}>{i}</Text>
                </TouchableOpacity>,
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
                                <Text style={styles.filterTitle}>Filter Subscriptions</Text>
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
                        {/* Date Range Section */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>
                                <Feather name="calendar" size={16} color="#0056d2" /> Date Range
                            </Text>
                            <View style={styles.rangeInputContainer}>
                                <TouchableOpacity style={styles.dateInput} onPress={() => setShowCustomStartDatePicker(true)}>
                                    <Feather name="calendar" size={16} color="#64748B" />
                                    <Text style={styles.dateInputText}>{formatDisplayDate(tempFilters.startDate)}</Text>
                                </TouchableOpacity>
                                <View style={styles.rangeSeparator}>
                                    <Text style={styles.rangeSeparatorText}>to</Text>
                                </View>
                                <TouchableOpacity style={styles.dateInput} onPress={() => setShowCustomEndDatePicker(true)}>
                                    <Feather name="calendar" size={16} color="#64748B" />
                                    <Text style={styles.dateInputText}>{formatDisplayDate(tempFilters.endDate)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Status Section */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>
                                <Feather name="activity" size={16} color="#0056d2" /> Status
                            </Text>
                            <View style={styles.statusGrid}>
                                {[
                                    { key: "active",label: "Active",icon: "checkmark-circle",color: "#10B981" },
                                    { key: "pending",label: "Pending",icon: "time",color: "#F59E0B" },
                                    { key: "paid",label: "Paid",icon: "card",color: "#059669" },
                                    { key: "canceled",label: "Canceled",icon: "close-circle",color: "#EF4444" },
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
                                        style={[styles.pageSizeCard,tempFilters.validPageSize === size && styles.selectedPageSizeCard]}
                                        onPress={() => setTempFilters({ ...tempFilters,validPageSize: size })}
                                    >
                                        <Text
                                            style={[
                                                styles.pageSizeCardNumber,
                                                tempFilters.validPageSize === size && styles.selectedPageSizeCardNumber,
                                            ]}
                                        >
                                            {size}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.pageSizeCardLabel,
                                                tempFilters.validPageSize === size && styles.selectedPageSizeCardLabel,
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

            {/* Date Pickers */}
            {showCustomStartDatePicker && (
                <Modal
                    visible={showCustomStartDatePicker}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowCustomStartDatePicker(false)}
                >
                    <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerModal}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                                <TouchableOpacity onPress={() => setShowCustomStartDatePicker(false)}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={tempFilters.startDate || new Date()}
                                mode="date"
                                display="spinner"
                                onChange={(event,selectedDate) => {
                                    if (selectedDate) {
                                        setTempFilters({ ...tempFilters,startDate: selectedDate })
                                    }
                                }}
                                style={styles.datePickerSpinner}
                            />
                            <TouchableOpacity style={styles.datePickerConfirm} onPress={() => setShowCustomStartDatePicker(false)}>
                                <Text style={styles.datePickerConfirmText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
            {showEndDatePicker && (
                <DateTimePicker
                    value={tempFilters.endDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event,selectedDate) => {
                        setShowEndDatePicker(Platform.OS === "ios")
                        if (selectedDate) {
                            setTempFilters({ ...tempFilters,endDate: selectedDate })
                        }
                    }}
                />
            )}
        </Modal>
    )

    const renderEmpty = () => (
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
                <MaterialCommunityIcons name="package-variant-closed" size={80} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>No Subscriptions Found</Text>
            <Text style={styles.emptyText}>
                {searchTerm || filters.status !== "active" || filters.startDate || filters.endDate
                    ? "No subscriptions match your current filters. Try adjusting your search criteria."
                    : "You haven't subscribed to any packages yet. Explore our fitness packages to get started!"}
            </Text>
            <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => {
                    if (searchTerm || filters.status !== "active" || filters.startDate || filters.endDate) {
                        resetTempFilters()
                    } else {
                        navigation.navigate("ServicePackages")
                    }
                }}
            >
                <Feather
                    name={
                        searchTerm || filters.status !== "active" || filters.startDate || filters.endDate ? "refresh-cw" : "plus"
                    }
                    size={16}
                    color="#FFFFFF"
                />
                <Text style={styles.emptyActionText}>
                    {searchTerm || filters.status !== "active" || filters.startDate || filters.endDate
                        ? "Clear Filters"
                        : "Browse Packages"}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    )

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor="#0056d2" />
            <Header
                title="My Subscriptions"
                onBack={() => navigation.goBack()}
                subtitle={
                    totalCount > 0
                        ? `${totalCount} subscription${totalCount > 1 ? "s" : ""}`
                        : "Manage your packages"
                }
                style={{ backgroundColor: '#0056d2', paddingTop: Platform.OS === "android" ? 40 : 20, paddingBottom: 10 }}
            />
            {/* Filter button below header for visibility */}
            <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, marginTop: 8 }}>
                <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)}>
                    <Ionicons name="options" size={24} color="#FFFFFF" />
                    {(searchTerm || filters.status !== "active" || filters.startDate || filters.endDate) && (
                        <View style={styles.filterIndicator} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Search Container */}
            <Animated.View
                style={[
                    styles.searchContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <View style={styles.searchInputContainer}>
                    <Feather name="search" size={20} color="#64748B" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by package name or trainer..."
                        value={searchTerm}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                        placeholderTextColor="#94A3B8"
                    />
                    {searchTerm ? (
                        <TouchableOpacity onPress={() => handleSearch("")} style={styles.clearSearchButton}>
                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    ) : null}
                </View>

                {totalCount > 0 && (
                    <View style={styles.resultsInfo}>
                        <Text style={styles.resultsText}>
                            Showing {(pageNumber - 1) * pageSize + 1}-{Math.min(pageNumber * pageSize,totalCount)} of {totalCount}{" "}
                            results
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Content */}
            {loading && pageNumber === 1 ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#0056d2" />
                    <Text style={styles.loaderText}>Loading your subscriptions...</Text>
                </View>
            ) : (
                <FlatList
                    data={subscriptions}
                    keyExtractor={(item) => item.subscriptionId.toString()}
                    renderItem={renderSubscription}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        loading && pageNumber > 1 ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color="#0056d2" />
                                <Text style={styles.footerLoaderText}>Loading more...</Text>
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Modern Pagination */}
            {totalCount > 0 && totalPages > 1 && (
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
                                style={[styles.paginationNavButton,pageNumber <= 1 && styles.disabledNavButton]}
                                onPress={() => goToPage(pageNumber - 1)}
                                disabled={pageNumber <= 1 || loading}
                            >
                                <Ionicons name="chevron-back" size={20} color={pageNumber <= 1 ? "#CBD5E1" : "#0056d2"} />
                            </TouchableOpacity>

                            {/* Page Dots */}
                            <View style={styles.paginationDots}>{renderPaginationDots()}</View>

                            {/* Next Button */}
                            <TouchableOpacity
                                style={[styles.paginationNavButton,pageNumber >= totalPages && styles.disabledNavButton]}
                                onPress={() => goToPage(pageNumber + 1)}
                                disabled={pageNumber >= totalPages || loading}
                            >
                                <Ionicons name="chevron-forward" size={20} color={pageNumber >= totalPages ? "#CBD5E1" : "#0056d2"} />
                            </TouchableOpacity>
                        </View>

                        {/* Page Info */}
                        <View style={styles.pageInfoContainer}>
                            <Text style={styles.pageInfo}>
                                Page {pageNumber} of {totalPages}
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
    header: {
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
        paddingBottom: 10,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerCenter: {
        flex: 1,
        alignItems: "center",
        marginHorizontal: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
        marginTop: 2,
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
        backgroundColor: "#EEF2FF",
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
        fontSize: 14,
        fontWeight: "600",
    },
    priceContainer: {
        flexDirection: "row",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        gap: 16,
    },
    priceInfo: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 4,
    },
    priceValue: {
        fontSize: 12,
        fontWeight: "700",
        color: "#1E293B",
    },
    durationInfo: {
        flex: 1,
        alignItems: "flex-end",
    },
    durationLabel: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 4,
    },
    durationValue: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0056d2",
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    progressPercentage: {
        fontSize: 12,
        color: "#0056d2",
        fontWeight: "600",
    },
    progressBar: {
        height: 6,
        backgroundColor: "#E2E8F0",
        borderRadius: 3,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#0056d2",
        borderRadius: 3,
    },
    dateContainer: {
        flexDirection: "row",
        gap: 16,
        marginBottom: 16,
    },
    dateItem: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateInfo: {
        flex: 1,
    },
    dateLabel: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 2,
    },
    dateValue: {
        fontSize: 12,
        color: "#1E293B",
        fontWeight: "600",
    },
    expiredDate: {
        color: "#EF4444",
    },
    viewDetailsButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#EEF2FF",
        borderRadius: 12,
        paddingVertical: 12,
        gap: 8,
    },
    viewDetailsText: {
        fontSize: 14,
        color: "#0056d2",
        fontWeight: "600",
    },
    loaderContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
        backgroundColor: "#F8FAFC",
    },
    loaderText: {
        fontSize: 16,
        color: "#0056d2",
        marginTop: 16,
        fontWeight: "500",
    },
    footerLoader: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 20,
    },
    footerLoaderText: {
        fontSize: 14,
        color: "#0056d2",
        marginLeft: 8,
        fontWeight: "500",
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
        backgroundColor: "#EEF2FF",
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
        backgroundColor: "#EEF2FF",
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
    rangeInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    dateInput: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 8,
    },
    dateInputText: {
        fontSize: 16,
        color: "#1E293B",
        flex: 1,
    },
    rangeSeparator: {
        alignItems: "center",
        justifyContent: "center",
    },
    rangeSeparatorText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
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
    datePickerOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    datePickerModal: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 20,
        width: "100%",
        maxWidth: 350,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    datePickerHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
    },
    datePickerSpinner: {
        height: 200,
    },
    datePickerConfirm: {
        backgroundColor: "#0056d2",
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: "center",
        marginTop: 20,
    },
    datePickerConfirmText: {
        fontSize: 16,
        color: "#FFFFFF",
        fontWeight: "600",
    },
})

export default MySubscriptionScreen
