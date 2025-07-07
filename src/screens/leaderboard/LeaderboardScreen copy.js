import { useState,useCallback,useEffect,useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    RefreshControl,
    ActivityIndicator,
    Platform,
    Modal,
    Dimensions,
    Image,
    ScrollView,
    Alert,
    Animated,
} from "react-native"
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import DateTimePicker from "@react-native-community/datetimepicker"
import { apiUserService } from "services/apiUserService"
import { theme } from "theme/color"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { SafeAreaView,useSafeAreaInsets } from "react-native-safe-area-context"
import FloatingMenuButton from "components/FloatingMenuButton"

const { width,height } = Dimensions.get("window")

const LeaderboardScreenModern = ({ navigation }) => {
    const insets = useSafeAreaInsets()
    const [leaderboardData,setLeaderboardData] = useState([])
    const [totalPages,setTotalPages] = useState(1)
    const [currentPage,setCurrentPage] = useState(1)
    const [totalUsers,setTotalUsers] = useState(0)
    const [loading,setLoading] = useState(false)
    const [refreshing,setRefreshing] = useState(false)
    const [searchTerm,setSearchTerm] = useState("")

    const [showFilterModal,setShowFilterModal] = useState(false)
    const [showStartDatePicker,setShowStartDatePicker] = useState(false)
    const [showEndDatePicker,setShowEndDatePicker] = useState(false)

    const [filters,setFilters] = useState({
        sortBy: "level",
        sortOrder: "desc",
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        pageSize: 10,
    })

    const [tempFilters,setTempFilters] = useState(filters)

    const pageSize = filters.pageSize
    const flatListRef = useRef(null)
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim,{
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start()
    },[])

    const formatDate = (date) => {
        return date.toLocaleDateString("en-US",{
            month: "short",
            day: "numeric",
            year: "numeric",
        })
    }

    const formatDisplayDate = (date) => {
        if (!date) return "Select Date"
        return `${(date.getMonth() + 1).toString().padStart(2,"0")}-${date
            .getDate()
            .toString()
            .padStart(2,"0")}-${date.getFullYear()}`
    }

    const fetchLeaderboard = useCallback(
        async (page = 1,isRefresh = false) => {
            try {
                if (!isRefresh && page === 1) setLoading(true)

                const queryParams = {
                    PageNumber: page,
                    PageSize: pageSize,
                    SearchTerm: searchTerm,
                    SortBy: filters.sortBy,
                    SortOrder: filters.sortOrder === "desc" ? "Descending" : "Ascending",
                    StartDate: filters.startDate.toISOString(),
                    EndDate: filters.endDate.toISOString(),
                }

                const response = await apiUserService.getLeaderboard(queryParams)
                if (response.statusCode === 200) {
                    const { users,totalPages,totalCount } = response.data
                    setLeaderboardData((prev) => (isRefresh || page === 1 ? users : [...prev,...users]))
                    setTotalPages(totalPages)
                    setTotalUsers(totalCount)
                    setCurrentPage(page)
                }
            } catch (error) {
                Alert.alert("Error","Failed to load leaderboard. Please try again.")
            } finally {
                setLoading(false)
                setRefreshing(false)
            }
        },
        [searchTerm,filters,pageSize],
    )

    const onRefresh = useCallback(() => {
        setRefreshing(true)
        setCurrentPage(1)
        fetchLeaderboard(1,true)
    },[fetchLeaderboard])

    const loadMore = () => {
        if (!loading && currentPage < totalPages) {
            fetchLeaderboard(currentPage + 1)
        }
    }

    useEffect(() => {
        fetchLeaderboard(1,true)
    },[searchTerm,filters])

    const applyTempFilters = () => {
        setFilters(tempFilters)
        setCurrentPage(1)
        setShowFilterModal(false)
        fetchLeaderboard(1,true)
    }

    const resetTempFilters = () => {
        const defaultFilters = {
            sortBy: "level",
            sortOrder: "desc",
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            pageSize: 10,
        }
        setTempFilters(defaultFilters)
    }

    const clearFilters = () => {
        const defaultFilters = {
            sortBy: "level",
            sortOrder: "desc",
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(),
            pageSize: 10,
        }
        setFilters(defaultFilters)
        setTempFilters(defaultFilters)
        setSearchTerm("")
        setCurrentPage(1)
    }

    const getRankIcon = (rank) => {
        switch (rank) {
            case 1:
                return { name: "trophy",color: "#FFD700",size: 24 }
            case 2:
                return { name: "medal",color: "#C0C0C0",size: 22 }
            case 3:
                return { name: "medal",color: "#CD7F32",size: 20 }
            default:
                return null
        }
    }

    const getHealthLevelColor = (level) => {
        if (level >= 50) return "#10B981"
        if (level >= 25) return "#F59E0B"
        if (level >= 10) return "#3B82F6"
        return "#6B7280"
    }

    const renderStatsCard = () => (
        <Animated.View
            style={[
                styles.statsCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <LinearGradient
                colors={["#4F46E5","#6366F1","#818CF8"]}
                style={styles.statsGradient}
                start={{ x: 0,y: 0 }}
                end={{ x: 1,y: 1 }}
            >
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="account-group" size={24} color="#FFFFFF" />
                    <Text style={styles.statNumber}>{totalUsers}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Ionicons name="trophy" size={24} color="#FFD700" />
                    <Text style={styles.statNumber}>{currentPage}</Text>
                    <Text style={styles.statLabel}>Current Page</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <MaterialCommunityIcons name="chart-line" size={24} color="#FFFFFF" />
                    <Text style={styles.statNumber}>{totalPages}</Text>
                    <Text style={styles.statLabel}>Total Pages</Text>
                </View>
            </LinearGradient>
        </Animated.View>
    )

    const renderLeaderboardItem = ({ item,index }) => {
        const rankIcon = getRankIcon(item.rank)
        const levelColor = getHealthLevelColor(item.levelAccount)

        return (
            <Animated.View
                style={[
                    styles.leaderboardItemHorizontal,
                    {
                        opacity: fadeAnim,
                        transform: [
                            {
                                translateY: slideAnim.interpolate({
                                    inputRange: [0,30],
                                    outputRange: [0,30],
                                }),
                            },
                        ],
                    },
                ]}
            >
                <View style={styles.horizontalContent}>
                    {/* Rank Section */}
                    <View style={styles.rankSectionHorizontal}>
                        <Text style={[styles.rankNumberHorizontal,item.rank <= 3 && { color: levelColor }]}>{item.rank}</Text>
                        {rankIcon && (
                            <Ionicons
                                name={rankIcon.name}
                                size={rankIcon.size}
                                color={rankIcon.color}
                                style={styles.rankIconHorizontal}
                            />
                        )}
                    </View>

                    {/* Avatar */}
                    <View style={styles.avatarSectionHorizontal}>
                        {item.avatar ? (
                            <Image
                                source={{ uri: item.avatar }}
                                style={styles.avatarHorizontal}
                            />
                        ) : (
                            <View style={[styles.avatarFallbackHorizontal,{ backgroundColor: levelColor + "20" }]}>
                                <Text style={[styles.avatarFallbackTextHorizontal,{ color: levelColor }]}>
                                    {item.fullName ? item.fullName.charAt(0).toUpperCase() : "U"}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* User Info Section */}
                    <View style={styles.userInfoHorizontal}>
                        <Text style={styles.userNameHorizontal} numberOfLines={1}>
                            {item.fullName}
                        </Text>
                        <Text style={styles.userEmailHorizontal} numberOfLines={1}>
                            {item.email}
                        </Text>

                        {/* Level and Streak Row */}
                        <View style={styles.metricsRowHorizontal}>
                            <View style={styles.metricItemHorizontal}>
                                <Ionicons name="star" size={14} color={levelColor} />
                                <Text style={[styles.metricTextHorizontal,{ color: levelColor }]}>Level {item.levelAccount}</Text>
                            </View>
                            <View style={styles.metricItemHorizontal}>
                                <Ionicons name="flame" size={14} color="#EF4444" />
                                <Text style={styles.metricTextHorizontal}>{item.currentStreak} Day Streak</Text>
                            </View>
                        </View>
                    </View>

                    {/* Stats Section */}
                    <View style={styles.statsSectionHorizontal}>
                        <Text style={[styles.xpTextHorizontal,{ color: levelColor }]}>{item.experience} XP</Text>
                        <Text style={styles.activitiesTextHorizontal}>{item.totalActivities} Activities</Text>
                    </View>
                </View>
            </Animated.View>
        )
    }

    const sortOptions = [
        { key: "level",label: "Level",icon: "star-outline" },
        { key: "experience",label: "Experience",icon: "trophy-outline" },
        { key: "streak",label: "Streak",icon: "flame-outline" },
        { key: "activities",label: "Activities",icon: "fitness-outline" },
        { key: "nutritionlogs",label: "Nutrition Logs",icon: "nutrition-outline" },
        { key: "posts",label: "Posts",icon: "chatbubble-outline" },
    ]

    const pageSizeOptions = [
        { label: "5",value: 5 },
        { label: "10",value: 10 },
        { label: "20",value: 20 },
        { label: "50",value: 50 },
    ]

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
                <View style={styles.filterModalContent}>
                    <View style={styles.dragHandle} />

                    <View style={styles.filterHeader}>
                        <Text style={styles.filterTitle}>Filter & Sort Leaderboard</Text>
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
                        {/* Date Range */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Date Range</Text>
                            <View style={styles.rangeInputContainer}>
                                <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartDatePicker(true)}>
                                    <Ionicons name="calendar-outline" size={16} color="#4F46E5" />
                                    <Text style={styles.dateInputText}>{formatDisplayDate(tempFilters.startDate)}</Text>
                                </TouchableOpacity>
                                <Text style={styles.rangeSeparator}>to</Text>
                                <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndDatePicker(true)}>
                                    <Ionicons name="calendar-outline" size={16} color="#4F46E5" />
                                    <Text style={styles.dateInputText}>{formatDisplayDate(tempFilters.endDate)}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Sort Options */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Sort By</Text>
                            <View style={styles.sortOptionsGrid}>
                                {sortOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.key}
                                        style={[styles.sortOptionCard,tempFilters.sortBy === option.key && styles.selectedSortCard]}
                                        onPress={() => setTempFilters({ ...tempFilters,sortBy: option.key })}
                                    >
                                        <Ionicons
                                            name={option.icon}
                                            size={24}
                                            color={tempFilters.sortBy === option.key ? "#4F46E5" : "#64748B"}
                                        />
                                        <Text style={[styles.sortOptionText,tempFilters.sortBy === option.key && styles.selectedSortText]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Sort Direction */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Sort Order</Text>
                            <View style={styles.sortDirectionContainer}>
                                <TouchableOpacity
                                    style={[styles.sortDirectionButton,tempFilters.sortOrder === "asc" && styles.selectedSortDirection]}
                                    onPress={() => setTempFilters({ ...tempFilters,sortOrder: "asc" })}
                                >
                                    <Ionicons name="arrow-up" size={20} color={tempFilters.sortOrder === "asc" ? "#FFFFFF" : "#64748B"} />
                                    <Text
                                        style={[
                                            styles.sortDirectionText,
                                            tempFilters.sortOrder === "asc" && styles.selectedSortDirectionText,
                                        ]}
                                    >
                                        Ascending
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.sortDirectionButton,tempFilters.sortOrder === "desc" && styles.selectedSortDirection]}
                                    onPress={() => setTempFilters({ ...tempFilters,sortOrder: "desc" })}
                                >
                                    <Ionicons
                                        name="arrow-down"
                                        size={20}
                                        color={tempFilters.sortOrder === "desc" ? "#FFFFFF" : "#64748B"}
                                    />
                                    <Text
                                        style={[
                                            styles.sortDirectionText,
                                            tempFilters.sortOrder === "desc" && styles.selectedSortDirectionText,
                                        ]}
                                    >
                                        Descending
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Items per Page */}
                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionTitle}>Items per Page</Text>
                            <View style={styles.pageSizeGrid}>
                                {pageSizeOptions.map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[styles.pageSizeCard,tempFilters.pageSize === option.value && styles.selectedPageSizeCard]}
                                        onPress={() => setTempFilters({ ...tempFilters,pageSize: option.value })}
                                    >
                                        <Text
                                            style={[
                                                styles.pageSizeCardText,
                                                tempFilters.pageSize === option.value && styles.selectedPageSizeCardText,
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.pageSizeCardLabel,
                                                tempFilters.pageSize === option.value && styles.selectedPageSizeCardLabel,
                                            ]}
                                        >
                                            users
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.filterActions}>
                        <TouchableOpacity style={styles.clearFiltersButton} onPress={resetTempFilters}>
                            <Text style={styles.clearFiltersText}>Clear All</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyFiltersButton} onPress={applyTempFilters}>
                            <Text style={styles.applyFiltersText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Date Pickers */}
            {showStartDatePicker && (
                <DateTimePicker
                    value={tempFilters.startDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event,selectedDate) => {
                        setShowStartDatePicker(Platform.OS === "ios")
                        if (selectedDate) {
                            setTempFilters({ ...tempFilters,startDate: selectedDate })
                            if (selectedDate > tempFilters.endDate) {
                                setTempFilters((prev) => ({ ...prev,endDate: selectedDate }))
                            }
                        }
                    }}
                    maximumDate={new Date()}
                />
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
                    minimumDate={tempFilters.startDate}
                    maximumDate={new Date()}
                />
            )}
        </Modal>
    )

    const renderFooter = () => {
        if (!loading || currentPage === 1) return null
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#4F46E5" />
                <Text style={styles.footerLoaderText}>Loading more users...</Text>
            </View>
        )
    }

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptyText}>
                {searchTerm ? "No users match your search criteria." : "No users available in the leaderboard."}
            </Text>
            <TouchableOpacity style={styles.clearFiltersButton} onPress={clearFilters}>
                <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
        </View>
    )

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={theme.primaryColor} />

            {/* Header */}
            <LinearGradient colors={["#4F46E5","#6366F1","#818CF8"]} style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Health Leaderboard</Text>
                        <Text style={styles.headerSubtitle}>Compete with the community</Text>
                    </View>
                    <TouchableOpacity style={styles.headerActionButton} onPress={() => setShowFilterModal(true)}>
                        <Ionicons name="options-outline" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Search Section */}
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
                    <Ionicons name="search-outline" size={20} color="#64748B" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        autoCapitalize="none"
                        placeholderTextColor="#94A3B8"
                    />
                    {searchTerm ? (
                        <TouchableOpacity onPress={() => setSearchTerm("")} style={styles.clearSearchButton}>
                            <Ionicons name="close-circle" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.resultsInfo}>
                    <Text style={styles.resultsText}>
                        {totalUsers} users found • Page {currentPage} of {totalPages}
                    </Text>
                </View>
            </Animated.View>

            {/* Content */}
            {loading && currentPage === 1 ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color="#4F46E5" />
                    <Text style={styles.loaderText}>Loading leaderboard...</Text>
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={leaderboardData}
                    renderItem={renderLeaderboardItem}
                    keyExtractor={(item) => item.userId.toString()}
                    contentContainerStyle={styles.listContent}
                    ListHeaderComponent={renderStatsCard}
                    ListEmptyComponent={renderEmpty}
                    ListFooterComponent={renderFooter}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4F46E5"]} tintColor="#4F46E5" />
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {renderFilterModal()}

            <FloatingMenuButton
                initialPosition={{ x: width - 70,y: height - 150 }}
                autoHide={true}
                navigation={navigation}
                autoHideDelay={4000}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.primaryColor,
    },
    header: {
        paddingTop: Platform.OS === "android" ? 20 : 0,
        paddingBottom: 16,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    headerTextContainer: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
        textAlign: "center",
        textShadowColor: "rgba(0, 0, 0, 0.1)",
        textShadowOffset: { width: 0,height: 1 },
        textShadowRadius: 2,
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.9)",
        textAlign: "center",
        marginTop: 2,
        textShadowColor: "rgba(0, 0, 0, 0.1)",
        textShadowOffset: { width: 0,height: 1 },
        textShadowRadius: 1,
    },
    headerActionButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    searchContainer: {
        backgroundColor: "#F8FAFC",
        marginTop: 15,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
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
    statsCard: {
        marginHorizontal: 16,
        marginBottom: 20,
        borderRadius: 16,
        overflow: "hidden",
        elevation: 4,
        shadowColor: "#4F46E5",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    statsGradient: {
        flexDirection: "row",
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    statItem: {
        flex: 1,
        alignItems: "center",
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "700",
        color: "#FFFFFF",
        marginTop: 8,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: "rgba(255,255,255,0.8)",
        fontWeight: "500",
    },
    statDivider: {
        width: 1,
        backgroundColor: "rgba(255,255,255,0.2)",
        marginHorizontal: 16,
    },
    listContent: {
        padding: 5,
        paddingBottom: 100,
        backgroundColor: "#F8FAFC",
    },
    leaderboardItemHorizontal: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    horizontalContent: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
    },
    rankSectionHorizontal: {
        width: 50,
        alignItems: "center",
        marginRight: 16,
    },
    rankNumberHorizontal: {
        fontSize: 20,
        fontWeight: "700",
        color: "#64748B",
        marginBottom: 4,
    },
    rankIconHorizontal: {
        marginTop: 2,
    },
    avatarSectionHorizontal: {
        marginRight: 16,
    },
    avatarHorizontal: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: "#E2E8F0",
    },
    avatarFallbackHorizontal: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderColor: "#E2E8F0",
    },
    avatarFallbackTextHorizontal: {
        fontSize: 18,
        fontWeight: "700",
    },
    userInfoHorizontal: {
        flex: 1,
        marginRight: 16,
    },
    userNameHorizontal: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 2,
    },
    userEmailHorizontal: {
        fontSize: 13,
        color: "#64748B",
        marginBottom: 8,
    },
    metricsRowHorizontal: {
        flexDirection: "row",
        gap: 16,
    },
    metricItemHorizontal: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    metricTextHorizontal: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "500",
    },
    statsSectionHorizontal: {
        alignItems: "flex-end",
        minWidth: 80,
    },
    xpTextHorizontal: {
        fontSize: 16,
        fontWeight: "700",
        marginBottom: 2,
    },
    activitiesTextHorizontal: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "500",
    },
    leaderboardItem: {
        marginBottom: 16,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    topRankItem: {
        shadowColor: "#4F46E5",
        shadowOpacity: 0.15,
        elevation: 6,
    },
    itemGradient: {
        padding: 20,
    },
    rankContainer: {
        position: "absolute",
        top: 16,
        right: 16,
        alignItems: "center",
        zIndex: 1,
    },
    rankBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 4,
    },
    topRankBadge: {
        borderWidth: 2,
        borderColor: "rgba(79, 70, 229, 0.3)",
    },
    rankText: {
        fontSize: 14,
        fontWeight: "700",
    },
    topRankText: {
        fontSize: 16,
    },
    rankIcon: {
        marginTop: 2,
    },
    avatarSection: {
        alignItems: "center",
        marginBottom: 16,
        position: "relative",
    },
    avatarContainer: {
        borderWidth: 3,
        borderRadius: 40,
        padding: 2,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    avatarFallback: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarFallbackText: {
        fontSize: 24,
        fontWeight: "700",
    },
    levelBadge: {
        position: "absolute",
        bottom: -8,
        right: -8,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 3,
        borderColor: "#FFFFFF",
    },
    levelText: {
        fontSize: 12,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    userInfo: {
        alignItems: "center",
        marginBottom: 16,
    },
    userName: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
        marginBottom: 4,
        textAlign: "center",
    },
    userEmail: {
        fontSize: 14,
        color: "#64748B",
        marginBottom: 12,
        textAlign: "center",
    },
    healthMetrics: {
        flexDirection: "row",
        gap: 16,
    },
    healthMetric: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    metricIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 6,
    },
    metricText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#64748B",
    },
    statsSection: {
        alignItems: "center",
    },
    xpContainer: {
        alignItems: "center",
        marginBottom: 12,
    },
    xpText: {
        fontSize: 24,
        fontWeight: "700",
    },
    xpLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "500",
    },
    progressContainer: {
        width: "100%",
        alignItems: "center",
    },
    progressBar: {
        width: "100%",
        height: 6,
        backgroundColor: "#F1F5F9",
        borderRadius: 3,
        overflow: "hidden",
        marginBottom: 6,
    },
    progressFill: {
        height: "100%",
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "500",
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
        color: "#4F46E5",
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
        color: "#4F46E5",
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
        marginBottom: 24,
        lineHeight: 24,
    },
    // Filter Modal Styles (same as ServicePackageScreen)
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
        alignItems: "stretch",
    },
    filterModalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: "85%",
        minHeight: "50%",
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
        paddingTop: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    filterTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1E293B",
    },
    closeButton: {
        padding: 4,
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
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "500",
    },
    rangeSeparator: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    sortOptionsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    sortOptionCard: {
        flex: 1,
        minWidth: "30%",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    selectedSortCard: {
        backgroundColor: "#EEF2FF",
        borderColor: "#4F46E5",
    },
    sortOptionText: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "500",
        marginTop: 8,
        textAlign: "center",
    },
    selectedSortText: {
        color: "#4F46E5",
        fontWeight: "600",
    },
    sortDirectionContainer: {
        flexDirection: "row",
        gap: 12,
    },
    sortDirectionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        gap: 8,
    },
    selectedSortDirection: {
        backgroundColor: "#4F46E5",
        borderColor: "#4F46E5",
    },
    sortDirectionText: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    selectedSortDirectionText: {
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
        padding: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    selectedPageSizeCard: {
        backgroundColor: "#4F46E5",
        borderColor: "#4F46E5",
    },
    pageSizeCardText: {
        fontSize: 18,
        color: "#1E293B",
        fontWeight: "700",
    },
    selectedPageSizeCardText: {
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
        backgroundColor: "#F1F5F9",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    clearFiltersText: {
        fontSize: 16,
        color: "#4F46E5",
        fontWeight: "600",
    },
    applyFiltersButton: {
        flex: 1,
        backgroundColor: "#4F46E5",
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: "center",
    },
    applyFiltersText: {
        fontSize: 16,
        color: "#FFFFFF",
        fontWeight: "600",
    },
})

export default LeaderboardScreenModern
