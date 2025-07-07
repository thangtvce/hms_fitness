import { useEffect,useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Animated,
    Dimensions,
    ScrollView,
    BackHandler,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { safeReset } from "components/SafeReset"

const { width,height } = Dimensions.get("window")

const PaymentCancelledScreen = ({ route,navigation }) => {
    const { paymentCode,packageId,subscriptionId,amount,packageName,reason } = route.params

    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.5)).current
    const slideAnim = useRef(new Animated.Value(50)).current

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim,{
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim,{
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start()
    },[])

    const handleGoHome = () => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            })
        );
    }

    const handleTryAgain = () => {
        safeReset(navigation,"Payment",{
            packageId,
            packageName,
            price: amount,
        });
    };

    const handleContactSupport = () => {
        safeReset(navigation,"Support",{
            issue: "payment_cancelled",
            paymentCode,
            packageName,
            amount,
        });
    };


    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#EF4444" />

            <LinearGradient colors={["#EF4444","#DC2626"]} style={styles.container}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim },{ translateY: slideAnim }],
                            },
                        ]}
                    >
                        {/* Cancelled Icon */}
                        <View style={styles.cancelledIconContainer}>
                            <LinearGradient colors={["#FFFFFF","#FEF2F2"]} style={styles.cancelledIconBackground}>
                                <Ionicons name="close-circle" size={80} color="#EF4444" />
                            </LinearGradient>
                        </View>

                        {/* Cancelled Message */}
                        <Text style={styles.cancelledTitle}>Payment Cancelled</Text>
                        <Text style={styles.cancelledSubtitle}>
                            {reason || "Your payment transaction was cancelled or interrupted"}
                        </Text>

                        {/* Payment Details Card */}
                        <View style={styles.detailsCard}>
                            <View style={styles.detailsHeader}>
                                <MaterialCommunityIcons name="receipt-outline" size={24} color="#EF4444" />
                                <Text style={styles.detailsHeaderText}>Transaction Details</Text>
                            </View>

                            <View style={styles.detailsContent}>
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Service Package</Text>
                                    <Text style={styles.detailValue}>{packageName}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Amount</Text>
                                    <Text style={styles.detailValueAmount}>{amount?.toLocaleString()} VND</Text>
                                </View>

                                {paymentCode && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Transaction ID</Text>
                                        <Text style={styles.detailValue}>{paymentCode}</Text>
                                    </View>
                                )}

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date & Time</Text>
                                    <Text style={styles.detailValue}>{new Date().toLocaleString("en-US")}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Status</Text>
                                    <View style={styles.statusBadge}>
                                        <Ionicons name="close-circle" size={16} color="#EF4444" />
                                        <Text style={styles.statusText}>Cancelled</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Reason Card */}
                        <View style={styles.reasonCard}>
                            <View style={styles.reasonHeader}>
                                <Ionicons name="information-circle" size={20} color="#F59E0B" />
                                <Text style={styles.reasonHeaderText}>What happened?</Text>
                            </View>
                            <Text style={styles.reasonText}>
                                • Payment was cancelled by user{"\n"}• Session timeout or connection issue{"\n"}• Banking app
                                interruption
                                {"\n"}• Insufficient funds or technical error
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleTryAgain}>
                                <LinearGradient colors={["#FFFFFF","#F8FAFC"]} style={styles.primaryButtonGradient}>
                                    <Ionicons name="refresh" size={20} color="#EF4444" />
                                    <Text style={styles.primaryButtonText}>Try Again</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.secondaryButtonsRow}>
                                <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
                                    <Ionicons name="home-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.secondaryButtonText}>Go Home</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.secondaryButton} onPress={handleContactSupport}>
                                    <Ionicons name="headset-outline" size={16} color="#FFFFFF" />
                                    <Text style={styles.secondaryButtonText}>Support</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Support Info */}
                        <View style={styles.supportContainer}>
                            <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.supportText}>
                                Need help? Contact our support team at 3docorp@gmail.com or call 0865341745
                            </Text>
                        </View>
                    </Animated.View>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#EF4444",
    },
    container: {
        flex: 1,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        minHeight: height - (Platform.OS === "android" ? StatusBar.currentHeight : 0),
        justifyContent: "center",
        paddingVertical: 40,
    },
    content: {
        alignItems: "center",
        paddingHorizontal: 24,
    },
    cancelledIconContainer: {
        marginBottom: 32,
    },
    cancelledIconBackground: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    cancelledTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 8,
    },
    cancelledSubtitle: {
        fontSize: 16,
        color: "rgba(255, 255, 255, 0.9)",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    detailsCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    detailsHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F1F5F9",
    },
    detailsHeaderText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
        marginLeft: 12,
    },
    detailsContent: {
        gap: 16,
    },
    detailRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    detailLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "500",
    },
    detailValue: {
        fontSize: 14,
        color: "#0F172A",
        fontWeight: "600",
        textAlign: "right",
        flex: 1,
        marginLeft: 16,
    },
    detailValueAmount: {
        fontSize: 16,
        color: "#EF4444",
        fontWeight: "800",
        textAlign: "right",
        flex: 1,
        marginLeft: 16,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF2F2",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        color: "#EF4444",
        fontWeight: "600",
    },
    reasonCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        width: "100%",
        marginBottom: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    reasonHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    reasonHeaderText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginLeft: 8,
    },
    reasonText: {
        fontSize: 14,
        color: "#64748B",
        lineHeight: 22,
    },
    buttonContainer: {
        width: "100%",
        gap: 12,
        marginBottom: 20,
    },
    primaryButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonGradient: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 12,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#EF4444",
    },
    secondaryButtonsRow: {
        flexDirection: "row",
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 8,
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    supportContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
        paddingHorizontal: 16,
    },
    supportText: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
        flex: 1,
        lineHeight: 18,
    },
})

export default PaymentCancelledScreen
