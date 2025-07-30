import { useState,useEffect,useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Dimensions,
    RefreshControl,
    Platform,
    Modal,
    ScrollView,
    Linking,
    Animated,
} from "react-native";
import Loading from "components/Loading";
import { showErrorFetchAPI } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import Header from "components/Header";
import { useContext } from "react";
import { ThemeContext } from "components/theme/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

const screenWidth = Dimensions.get("window").width;

const SupportScreen = ({ navigation }) => {
    const { colors } = useContext(ThemeContext);
    const [supportOptions,setSupportOptions] = useState([]);
    const [loading,setLoading] = useState(true);
    const [refreshing,setRefreshing] = useState(false);
    const [contactModalVisible,setContactModalVisible] = useState(false);
    const [selectedSupport,setSelectedSupport] = useState(null);
    const [expandedItem,setExpandedItem] = useState(null);
    const [animation] = useState(new Animated.Value(0));

    // Mock support options with detailed content
    const fetchSupportOptions = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const mockSupportOptions = [
                {
                    id: "payment",
                    title: "Payment Support",
                    description: "Get help with payment issues, subscriptions, or transaction errors.",
                    icon: "card-outline",
                    action: "expand",
                    content: [
                        "Check your transaction ID in the payment confirmation email.",
                        "Ensure your payment method is valid and has sufficient funds.",
                        "For subscription issues, verify your plan status in the app settings.",
                        "Contact payOS support at +84 865341745 for payment gateway issues.",
                        "If the issue persists, reach out to our support team via the Contact Us option.",
                    ],
                },
                {
                    id: "account",
                    title: "Account Management",
                    description: "Manage your account, update details, or reset your password.",
                    icon: "person-outline",
                    action: "expand",
                    content: [
                        "Update your profile details in the Account Settings section.",
                        "To reset your password, go to Account Settings > Profile > Change password.",
                        "Ensure your email is verified to receive account-related notifications.",
                        "If you cannot log in, check your credentials or use the Forgot Password option.",
                        "For account deletion, contact our support team with your user ID.",
                    ],
                },
                {
                    id: "app",
                    title: "App Assistance",
                    description: "Learn how to use app features or troubleshoot issues.",
                    icon: "help-circle-outline",
                    action: "expand",
                    content: [
                        "To track weight, go to Weight History and tap the Add Weight button.",
                        "Ensure your device has a stable internet connection for data syncing.",
                        "Update the app to the latest version for optimal performance.",
                        "Clear app cache in device settings if you experience slow performance.",
                        "For feature-specific issues, check our FAQ or contact support.",
                    ],
                },
                {
                    id: "contact",
                    title: "Contact Us",
                    description: "Reach out to our support team via phone or email.",
                    icon: "call-outline",
                    action: "modal",
                    content: [],
                },
            ];
            setSupportOptions(mockSupportOptions);
        } catch (error) {
            showErrorFetchAPI(error);
            setSupportOptions([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSupportOptions();
    },[]);

    useFocusEffect(
        useCallback(() => {
            fetchSupportOptions();
        },[]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchSupportOptions(false);
    };

    const handleSupportToggle = (itemId) => {
        if (expandedItem === itemId) {
            Animated.timing(animation,{
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start(() => setExpandedItem(null));
        } else {
            setExpandedItem(itemId);
            Animated.timing(animation,{
                toValue: 1,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    };

    const handleSupportAction = async (item) => {
        console.log('Handling support action for:',item.title);
        try {
            if (item.action === "modal") {
                setSelectedSupport(item);
                setContactModalVisible(true);
            }
        } catch (error) {
            console.error('Error handling support action:',error);
            showErrorFetchAPI("Failed to perform action.");
        }
    };

    const renderContactModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={contactModalVisible}
            onRequestClose={() => setContactModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Ionicons name="call-outline" size={24} color="#F59E0B" />
                        <Text style={styles.modalTitle}>Contact Support</Text>
                        <TouchableOpacity
                            onPress={() => setContactModalVisible(false)}
                            style={styles.modalCloseButton}
                        >
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalBody}>
                        <View style={styles.contactCard}>
                            <View style={styles.contactHeader}>
                                <Text style={styles.contactTitle}>Get in Touch</Text>
                            </View>
                            <View style={styles.contactDetails}>
                                <View style={styles.contactItem}>
                                    <Ionicons name="call" size={20} color="#0056d2" />
                                    <Text style={styles.contactLabel}>Hotline</Text>
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL("tel:+84865341745")}
                                        style={styles.contactAction}
                                    >
                                        <Text style={styles.contactValue}>+84 865341745</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.contactItem}>
                                    <Ionicons name="mail" size={20} color="#0056d2" />
                                    <Text style={styles.contactLabel}>Email</Text>
                                    <TouchableOpacity
                                        onPress={() => Linking.openURL("mailto:support@healthapp.com")}
                                        style={styles.contactAction}
                                    >
                                        <Text style={styles.contactValue}>support@healthapp.com</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            <View style={styles.contactAdvice}>
                                <Text style={styles.adviceTitle}>Support Tips</Text>
                                <Text style={styles.adviceText}>
                                    • For payment issues, have your transaction ID ready.
                                    {"\n"}• For account issues, include your user ID in emails.
                                    {"\n"}• Check our FAQ for quick solutions before contacting.
                                    {"\n"}• Our team is available 9 AM - 5 PM (GMT+7).
                                </Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderSupportItem = ({ item }) => {
        const isExpanded = expandedItem === item.id;
        const contentLength = Array.isArray(item.content) ? item.content.length : 0;
        const heightAnimation = animation.interpolate({
            inputRange: [0,1],
            outputRange: [0,contentLength > 0 ? contentLength * 40 + 40 : 100], // Default height for modal action
        });
        const opacityAnimation = animation.interpolate({
            inputRange: [0,1],
            outputRange: [0,1],
        });

        console.log('Rendering support item:',{ id: item.id,title: item.title,content: item.content });

        // Guard against invalid item
        if (!item || !item.id || !item.title) {
            return null;
        }

        return (
            <View style={styles.supportCard}>
                <TouchableOpacity
                    style={styles.supportHeader}
                    onPress={() => handleSupportToggle(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.supportContent}>
                        <View style={styles.supportIconContainer}>
                            <Ionicons
                                name={item.icon || "help-circle-outline"}
                                size={24}
                                color={colors.primary || "#0056d2"}
                            />
                        </View>
                        <View style={styles.supportTextContainer}>
                            <Text style={styles.supportTitle}>{item.title}</Text>
                            <Text style={styles.supportDescription}>{item.description || "No description available."}</Text>
                        </View>
                        <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#64748B"
                            style={styles.supportArrow}
                        />
                    </View>
                </TouchableOpacity>
                {isExpanded && item.action === "expand" && (
                    <Animated.View
                        style={[
                            styles.expandedContent,
                            {
                                height: heightAnimation,
                                opacity: opacityAnimation,
                            },
                        ]}
                    >
                        <View style={styles.expandedInner}>
                            {Array.isArray(item.content) && item.content.length > 0 ? (
                                item.content.map((step,index) => (
                                    <View key={index} style={styles.contentItem}>
                                        <Ionicons name="checkmark-circle-outline" size={16} color="#6B7280" />
                                        <Text style={styles.contentText}>{step}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.contentText}>No additional information available.</Text>
                            )}
                        </View>
                    </Animated.View>
                )}
                {isExpanded && item.action === "modal" && (
                    <Animated.View
                        style={[
                            styles.expandedContent,
                            {
                                height: heightAnimation,
                                opacity: opacityAnimation,
                            },
                        ]}
                    >
                        <View style={styles.expandedInner}>
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => handleSupportAction(item)}
                            >
                                <Text style={styles.actionButtonText}>Contact Support Team</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                )
                }
            </View >
        );
    };

    if (loading && !refreshing) {
        return <Loading />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={colors.headerBackground || "#FFFFFF"} />
            <Header
                title="Support"
                onBack={() => navigation.navigate("Main")}
                backgroundColor={colors.headerBackground || "#FFFFFF"}
                textColor={colors.headerText || colors.primary || "#0056d2"}
            />
            <View style={[styles.container,{ paddingTop: 80 }]}>
                <FlatList
                    data={supportOptions}
                    renderItem={renderSupportItem}
                    keyExtractor={(item) => item.id || Math.random().toString()} 
                    contentContainerStyle={styles.flatListContent}
                    ListHeaderComponent={
                        <View style={styles.headerContainer}>
                            <Text style={styles.headerTitle}>How Can We Help You?</Text>
                            <Text style={styles.headerSubtitle}>
                                Find support for payments, account management, or app usage.
                            </Text>
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="help-circle-outline" size={64} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Support Options</Text>
                            <Text style={styles.emptyText}>
                                Unable to load support options. Please try refreshing.
                            </Text>
                            <TouchableOpacity onPress={onRefresh} style={styles.emptyButton}>
                                <Text style={styles.emptyButtonText}>Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[colors.primary || "#0056d2"]}
                            tintColor={colors.primary || "#0056d2"}
                        />
                    }
                />
                {renderContactModal()}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    container: {
        flex: 1,
        backgroundColor: "#F9FAFB",
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: "#6B7280",
        marginBottom: 16,
    },
    flatListContent: {
        paddingBottom: 24,
    },
    supportCard: {
        backgroundColor: "#FFFFFF",
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    supportHeader: {
        padding: 16,
    },
    supportContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    supportIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    supportTextContainer: {
        flex: 1,
    },
    supportTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 4,
    },
    supportDescription: {
        fontSize: 14,
        color: "#6B7280",
    },
    supportArrow: {
        marginLeft: 12,
    },
    expandedContent: {
        backgroundColor: "#F8FAFC",
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        overflow: "hidden",
    },
    expandedInner: {
        padding: 16,
        paddingTop: 8,
    },
    contentItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 8,
    },
    contentText: {
        fontSize: 14,
        color: "#374151",
        marginLeft: 8,
        flex: 1,
    },
    actionButton: {
        backgroundColor: "#0056d2",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: "center",
    },
    actionButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        marginTop: 40,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: "600",
        color: "#1F2937",
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: "#6B7280",
        textAlign: "center",
        marginBottom: 24,
    },
    emptyButton: {
        backgroundColor: "#0056d2",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    emptyButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        width: "100%",
        maxHeight: "80%",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1E293B",
        marginLeft: 12,
        flex: 1,
    },
    modalCloseButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
    },
    contactCard: {
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        backgroundColor: "#F8FAFC",
    },
    contactHeader: {
        marginBottom: 16,
    },
    contactTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
    },
    contactDetails: {
        marginBottom: 16,
    },
    contactItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    contactLabel: {
        fontSize: 14,
        color: "#64748B",
        marginLeft: 8,
        flex: 1,
    },
    contactAction: {
        padding: 8,
    },
    contactValue: {
        fontSize: 14,
        fontWeight: "600",
        color: "#0056d2",
    },
    contactAdvice: {
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 16,
    },
    adviceTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 8,
    },
    adviceText: {
        fontSize: 14,
        color: "#64748B",
        lineHeight: 20,
    },
});

export default SupportScreen;