import React, { useState, useEffect, useContext, useCallback } from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Image,
    ActivityIndicator,
    RefreshControl,
    Alert,
    TextInput,
    Modal,
    Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import apiNotificationService from "services/apiNotificationService";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthContext } from "context/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ScrollView } from "react-native-gesture-handler";
import FloatingMenuButton from "components/FloatingMenuButton";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { theme } from "theme/color";

const { width, height } = Dimensions.get("window");
const ITEM_HEIGHT = 120;

const SORT_OPTIONS = [
    { label: "Date Created", value: "createdAt" },
    { label: "Status", value: "status" },
    { label: "Type", value: "notificationType" },
    { label: "Expiry Date", value: "expiryAt" },
];

const NOTIFICATION_TYPES = [
    { label: "All Types", value: "" },
    { label: "Health Reminder", value: "health_reminder" },
    { label: "Workout Alert", value: "workout_alert" },
    { label: "Nutrition Tip", value: "nutrition_tip" },
    { label: "Achievement", value: "achievement" },
    { label: "System", value: "system" },
];

export default function NotificationScreen({ navigation }) {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        sortBy: "createdAt",
        sortDescending: true,
        pageNumber: 1,
        pageSize: 10,
        includeRead: true,
        notificationType: "",
    });

    const [stats, setStats] = useState({
        total: 0,
        unread: 0,
        expired: 0,
    });

    const fetchNotifications = async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        setError(null);

        try {
            const params = {
                Search: searchQuery.trim(),
                SortBy: filters.sortBy,
                SortDescending: filters.sortDescending,
                PageNumber: filters.pageNumber,
                PageSize: filters.pageSize,
                ValidPageSize: 20,
                includeRead: filters.includeRead,
                ...(filters.notificationType && { notificationType: filters.notificationType }),
            };

            const response = await apiNotificationService.getNotificationsByUserId(user.userId, params);

            if (response.statusCode === 200) {
                setNotifications(response.data.notifications || []);

                const total = response.data.notifications?.length || 0;
                const unread = response.data.notifications?.filter(n => !n.isRead).length || 0;
                const expired = response.data.notifications?.filter(n => new Date(n.expiryAt) < new Date()).length || 0;

                setStats({ total, unread, expired });
            } else {
                setError("Failed to load notifications.");
            }
        } catch (err) {
            setError(err.message || "Failed to load notifications.");
        } finally {
            setLoading(false);
            if (isRefresh) setRefreshing(false);
        }
    };

    const markNotificationRead = async (notificationId, isRead) => {
        try {
            const updateDto = { notificationIds: [notificationId], isRead };
            await apiNotificationService.updateNotificationReadStatus(updateDto);

            setNotifications(prev =>
                prev.map((notif) =>
                    notif.notificationId === notificationId ? { ...notif, isRead } : notif
                )
            );

            setStats(prev => ({
                ...prev,
                unread: isRead ? prev.unread - 1 : prev.unread + 1
            }));

        } catch (err) {
            Alert.alert("Error", err.message || "Failed to update notification status.");
        }
    };

    const markAllNotificationsRead = async (isRead) => {
        try {
            await apiNotificationService[isRead ? "markAllNotificationsRead" : "markAllNotificationsUnread"](user.userId);

            setNotifications(prev =>
                prev.map((notif) => ({ ...notif, isRead }))
            );

            setStats(prev => ({
                ...prev,
                unread: isRead ? 0 : prev.total
            }));

            Alert.alert("Success", `All notifications marked as ${isRead ? "read" : "unread"}.`);
        } catch (err) {
            Alert.alert("Error", err.message || "Failed to update all notifications.");
        }
    };

    const deleteExpiredNotifications = async () => {
        Alert.alert(
            "Delete Expired Notifications",
            "Are you sure you want to delete all expired notifications?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await apiNotificationService.deleteExpiredNotifications(user.userId);
                            fetchNotifications();
                            Alert.alert("Success", "Expired notifications deleted.");
                        } catch (err) {
                            Alert.alert("Error", err.message || "Failed to delete expired notifications.");
                        }
                    }
                }
            ]
        );
    };

    const applyFilters = () => {
        setShowFilters(false);
        fetchNotifications();
    };

    const resetFilters = () => {
        setFilters({
            sortBy: "createdAt",
            sortDescending: true,
            pageNumber: 1,
            pageSize: 10,
            includeRead: true,
            notificationType: "",
        });
        setSearchQuery("");
    };

    useEffect(() => {
        fetchNotifications();
    }, [user.userId]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchNotifications(true);
    }, [searchQuery, filters]);

    const getNotificationIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'health_reminder':
                return { name: 'medical-outline', color: '#10B981' };
            case 'workout_alert':
                return { name: 'fitness-outline', color: '#F59E0B' };
            case 'nutrition_tip':
                return { name: 'nutrition-outline', color: '#0056d2' };
            case 'achievement':
                return { name: 'trophy-outline', color: '#EF4444' };
            default:
                return { name: 'notifications-outline', color: '#6B7280' };
        }
    };

    const formatTimeAgo = (dateString) => {
        const now = new Date();
        const date = new Date(dateString);
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 1) return "Just now";
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return date.toLocaleDateString();
    };

    const renderNotificationItem = ({ item, index }) => {
        const icon = getNotificationIcon(item.notificationType);
        const isExpired = new Date(item.expiryAt) < new Date();

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard,
                    !item.isRead && styles.unreadCard,
                    isExpired && styles.expiredCard
                ]}
                onPress={() => markNotificationRead(item.notificationId, !item.isRead)}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={[icon.color + '20', icon.color + '10']}
                            style={styles.iconGradient}
                        >
                            <Ionicons name={icon.name} size={24} color={icon.color} />
                        </LinearGradient>
                    </View>

                    <View style={styles.notificationContent}>
                        <View style={styles.titleRow}>
                            <Text style={styles.notificationTitle} numberOfLines={1}>
                                {item.notificationType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Notification'}
                            </Text>
                            {!item.isRead && <View style={styles.unreadDot} />}
                        </View>

                        <Text style={styles.notificationMessage} numberOfLines={2}>
                            {item.message.replace(/<\/?p>/g, "")}
                        </Text>

                        <View style={styles.metaRow}>
                            <Text style={styles.timeText}>
                                {formatTimeAgo(item.createdAt)}
                            </Text>
                            {isExpired && (
                                <View style={styles.expiredBadge}>
                                    <Text style={styles.expiredText}>Expired</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => markNotificationRead(item.notificationId, !item.isRead)}
                    >
                        <Ionicons
                            name={item.isRead ? "mail-outline" : "mail-open-outline"}
                            size={20}
                            color="#6B7280"
                        />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderStatsCard = () => (
        <View style={styles.statsCard}>
            <LinearGradient
                colors={["#0056d2", "#0056d2"]}
                style={styles.statsGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.total}</Text>
                    <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.unread}</Text>
                    <Text style={styles.statLabel}>Unread</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.expired}</Text>
                    <Text style={styles.statLabel}>Expired</Text>
                </View>
            </LinearGradient>
        </View>
    );

    const renderFilterModal = () => (
        <Modal
            visible={showFilters}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowFilters(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.filterModal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Filter & Sort</Text>
                        <TouchableOpacity onPress={() => setShowFilters(false)}>
                            <Ionicons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.filterContent}>
                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Sort By</Text>
                            {SORT_OPTIONS.map((option) => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.filterOption,
                                        filters.sortBy === option.value && styles.selectedOption
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, sortBy: option.value }))}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        filters.sortBy === option.value && styles.selectedOptionText
                                    ]}>
                                        {option.label}
                                    </Text>
                                    {filters.sortBy === option.value && (
                                        <Ionicons name="checkmark" size={20} color="#0056d2" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.filterSection}>
                            <View style={styles.switchRow}>
                                <Text style={styles.filterLabel}>Descending Order</Text>
                                <Switch
                                    value={filters.sortDescending}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, sortDescending: value }))}
                                    trackColor={{ false: "#E5E7EB", true: "#0056d2" }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <View style={styles.switchRow}>
                                <Text style={styles.filterLabel}>Include Read Notifications</Text>
                                <Switch
                                    value={filters.includeRead}
                                    onValueChange={(value) => setFilters(prev => ({ ...prev, includeRead: value }))}
                                    trackColor={{ false: "#E5E7EB", true: "#0056d2" }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Notification Type</Text>
                            {NOTIFICATION_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.value}
                                    style={[
                                        styles.filterOption,
                                        filters.notificationType === type.value && styles.selectedOption
                                    ]}
                                    onPress={() => setFilters(prev => ({ ...prev, notificationType: type.value }))}
                                >
                                    <Text style={[
                                        styles.filterOptionText,
                                        filters.notificationType === type.value && styles.selectedOptionText
                                    ]}>
                                        {type.label}
                                    </Text>
                                    {filters.notificationType === type.value && (
                                        <Ionicons name="checkmark" size={20} color="#0056d2" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterLabel}>Items per page: {filters.pageSize}</Text>
                            <View style={styles.pageSizeContainer}>
                                {[5, 10, 20, 50].map((size) => (
                                    <TouchableOpacity
                                        key={size}
                                        style={[
                                            styles.pageSizeButton,
                                            filters.pageSize === size && styles.selectedPageSize
                                        ]}
                                        onPress={() => setFilters(prev => ({ ...prev, pageSize: size }))}
                                    >
                                        <Text style={[
                                            styles.pageSizeText,
                                            filters.pageSize === size && styles.selectedPageSizeText
                                        ]}>
                                            {size}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.modalActions}>
                        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                            <Text style={styles.resetButtonText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0056d2" />
                    <Text style={styles.loadingText}>Loading notifications...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error && !refreshing) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={() => fetchNotifications()}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={theme.primaryColor} />

            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <View style={styles.headerSide}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color="#1F2937" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>Notifications</Text>
                    </View>
                    <View style={[styles.headerSide, styles.headerSideRight]}>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.headerButton} onPress={() => setShowFilters(true)}>
                                <Ionicons name="options-outline" size={20} color="#0056d2" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerButton} onPress={() => markAllNotificationsRead(true)}>
                                <Ionicons name="checkmark-done-outline" size={20} color="#0056d2" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search-outline" size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => fetchNotifications()}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <Ionicons name="close-circle" size={20} color="#0056d2" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.searchButton} onPress={() => fetchNotifications()}>
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#0056d2"]}
                        tintColor="#0056d2"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {renderStatsCard()}

                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => markAllNotificationsRead(true)}
                    >
                        <Ionicons name="checkmark-done" size={20} color="#10B981" />
                        <Text style={styles.quickActionText}>Mark All Read</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => markAllNotificationsRead(false)}
                    >
                        <Ionicons name="mail-unread" size={20} color="#F59E0B" />
                        <Text style={styles.quickActionText}>Mark All Unread</Text>
                    </TouchableOpacity>

                    {stats.expired > 0 && (
                        <TouchableOpacity
                            style={styles.quickActionButton}
                            onPress={deleteExpiredNotifications}
                        >
                            <Ionicons name="trash" size={20} color="#EF4444" />
                            <Text style={styles.quickActionText}>Delete Expired</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.listContainer}>
                    {notifications.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>No Notifications</Text>
                            <Text style={styles.emptyText}>
                                {searchQuery ? "No notifications match your search." : "You're all caught up!"}
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={notifications}
                            renderItem={renderNotificationItem}
                            keyExtractor={(item) => item.notificationId.toString()}
                            scrollEnabled={false}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </ScrollView>

            {renderFilterModal()}
            <FloatingMenuButton
                initialPosition={{ x: width - 70, y: height - 150 }}
                autoHide={true}
                navigation={navigation}
                autoHideDelay={4000}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    container: {
        flex: 1,
    },
    headerContainer: {
        backgroundColor: "#FFFFFF",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
        paddingTop: 50,
    },
    headerSide: {
        width: 100,
        alignItems: "flex-start",
    },
    headerSideRight: {
        alignItems: "flex-end",
    },
    headerTitleContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#1F2937",
    },
    backButton: {
        padding: 4,
    },
    headerActions: {
        flexDirection: "row",
        gap: 8,
        padding: 4,
    },
    headerButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    searchContainer: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#FFFFFF",
        gap: 8,
        marginTop: 80,
    },
    searchBar: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F9FAFB",
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: "#1F2937",
    },
    searchButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: "#0056d2",
        alignItems: "center",
        justifyContent: "center",
    },
    statsCard: {
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 16,
        overflow: "hidden",
        elevation: 4,
        shadowColor: "#0056d2",
        shadowOffset: { width: 0, height: 4 },
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
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
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
    quickActions: {
        flexDirection: "row",
        paddingHorizontal: 16,
        paddingVertical: 16,
        gap: 8,
    },
    quickActionButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FFFFFF",
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        gap: 6,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: "600",
        color: "#374151",
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    notificationCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    unreadCard: {
        borderLeftWidth: 4,
        borderLeftColor: "#0056d2",
    },
    expiredCard: {
        opacity: 0.7,
        borderLeftWidth: 4,
        borderLeftColor: "#EF4444",
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    iconContainer: {
        marginRight: 12,
    },
    iconGradient: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    notificationContent: {
        flex: 1,
    },
    titleRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        flex: 1,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#0056d2",
        marginLeft: 8,
    },
    notificationMessage: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    timeText: {
        fontSize: 12,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    expiredBadge: {
        backgroundColor: "#FEF2F2",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    expiredText: {
        fontSize: 10,
        color: "#EF4444",
        fontWeight: "600",
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    emptyContainer: {
        alignItems: "center",
        paddingVertical: 48,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#374151",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#6B7280",
        textAlign: "center",
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: "#6B7280",
        fontWeight: "500",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        color: "#EF4444",
        textAlign: "center",
        lineHeight: 24,
    },
    retryButton: {
        backgroundColor: "#0056d2",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    retryButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    filterModal: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: height * 0.8,
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1F2937",
    },
    filterContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    filterSection: {
        marginBottom: 24,
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 12,
    },
    filterOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: "#F9FAFB",
    },
    selectedOption: {
        backgroundColor: "#e6f0fa",
        borderWidth: 1,
        borderColor: "#0056d2",
    },
    filterOptionText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    selectedOptionText: {
        color: "#0056d2",
        fontWeight: "600",
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
    },
    pageSizeContainer: {
        flexDirection: "row",
        gap: 8,
    },
    pageSizeButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: "#F9FAFB",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    selectedPageSize: {
        backgroundColor: "#0056d2",
        borderColor: "#0056d2",
    },
    pageSizeText: {
        fontSize: 14,
        color: "#6B7280",
        fontWeight: "500",
    },
    selectedPageSizeText: {
        color: "#FFFFFF",
        fontWeight: "600",
    },
    modalActions: {
        flexDirection: "row",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
        gap: 12,
    },
    resetButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
    },
    resetButtonText: {
        fontSize: 16,
        color: "#6B7280",
        fontWeight: "600",
    },
    applyButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: "#0056d2",
        alignItems: "center",
    },
    applyButtonText: {
        fontSize: 16,
        color: "#FFFFFF",
        fontWeight: "600",
    },
});