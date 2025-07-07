"use client"

import { useEffect,useRef } from "react"
import { View,Text,StyleSheet,TouchableOpacity,Platform,Animated,Dimensions,ScrollView } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"

const { width,height } = Dimensions.get("window")

const PaymentErrorScreen = ({ route,navigation }) => {
    const {
        paymentCode,
        packageId,
        subscriptionId,
        amount,
        packageName,
        errorCode,
        errorMessage,
        errorType = "server",
    } = route.params

    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.5)).current
    const slideAnim = useRef(new Animated.Value(50)).current
    const pulseAnim = useRef(new Animated.Value(1)).current

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

        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim,{
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim,{
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        )
        pulseAnimation.start()

        return () => pulseAnimation.stop()
    },[])

    const handleGoHome = () => {
        navigation.reset({
            index: 0,
            routes: [{ name: "Main" }],
        })
    }

    const handleTryAgain = () => {
        navigation.navigate("Payment",{
            packageId,
            packageName,
            price: amount,
        })
    }

    const handleContactSupport = () => {
        navigation.navigate("Support",{
            issue: "payment_error",
            paymentCode,
            packageName,
            amount,
            errorCode,
            errorMessage,
            errorType,
        })
    }

    const getErrorIcon = () => {
        switch (errorType) {
            case "network":
                return "wifi-outline"
            case "timeout":
                return "time-outline"
            case "bank":
                return "card-outline"
            default:
                return "alert-circle-outline"
        }
    }

    const getErrorTitle = () => {
        switch (errorType) {
            case "network":
                return "Connection Error"
            case "timeout":
                return "Transaction Timeout"
            case "bank":
                return "Banking Error"
            default:
                return "Payment Error"
        }
    }

    const getErrorReasons = () => {
        switch (errorType) {
            case "network":
                return "• Poor internet connection\n• Network timeout occurred\n• Server temporarily unavailable\n• Firewall blocking request"
            case "timeout":
                return "• Bank server response timeout\n• Network latency issues\n• Heavy server load\n• Session expired during processing"
            case "bank":
                return "• Bank server maintenance\n• Invalid payment credentials\n• Account verification failed\n• Banking service temporarily down"
            default:
                return "• System processing error\n• Database connection failed\n• Service temporarily unavailable\n• Unknown technical issue"
        }
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

            <LinearGradient colors={["#DC2626","#B91C1C","#991B1B"]} style={styles.container}>
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
                        {/* Error Icon */}
                        <Animated.View style={[styles.errorIconContainer,{ transform: [{ scale: pulseAnim }] }]}>
                            <LinearGradient colors={["#FFFFFF","#FEF2F2"]} style={styles.errorIconBackground}>
                                <Ionicons name={getErrorIcon()} size={80} color="#DC2626" />
                            </LinearGradient>
                        </Animated.View>

                        {/* Error Message */}
                        <Text style={styles.errorTitle}>{getErrorTitle()}</Text>
                        <Text style={styles.errorSubtitle}>
                            {errorMessage || "An unexpected error occurred during payment processing"}
                        </Text>

                        {/* Payment Details Card */}
                        <View style={styles.detailsCard}>
                            <View style={styles.detailsHeader}>
                                <MaterialCommunityIcons name="receipt-outline" size={24} color="#DC2626" />
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

                                {errorCode && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Error Code</Text>
                                        <Text style={styles.detailValueError}>{errorCode}</Text>
                                    </View>
                                )}

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date & Time</Text>
                                    <Text style={styles.detailValue}>{new Date().toLocaleString("en-US")}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Status</Text>
                                    <View style={styles.statusBadge}>
                                        <Ionicons name="alert-circle" size={16} color="#DC2626" />
                                        <Text style={styles.statusText}>Failed</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Error Details Card */}
                        <View style={styles.errorCard}>
                            <View style={styles.errorHeader}>
                                <Ionicons name="information-circle" size={20} color="#DC2626" />
                                <Text style={styles.errorHeaderText}>Technical Details</Text>
                            </View>

                            {errorMessage && (
                                <View style={styles.errorMessageContainer}>
                                    <Text style={styles.errorMessageText}>{errorMessage}</Text>
                                </View>
                            )}

                            <Text style={styles.errorText}>
                                Possible causes:{"\n"}
                                {getErrorReasons()}
                            </Text>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleTryAgain}>
                                <LinearGradient colors={["#FFFFFF","#F8FAFC"]} style={styles.primaryButtonGradient}>
                                    <Ionicons name="refresh" size={20} color="#DC2626" />
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
                                    <Text style={styles.secondaryButtonText}>Get Help</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Support Info */}
                        <View style={styles.supportContainer}>
                            <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.supportText}>
                                Technical support available 24/7 at 3docorp@gmail.com or call 0865341745
                            </Text>
                        </View>

                        {/* Reference ID */}
                        <View style={styles.referenceContainer}>
                            <Text style={styles.referenceText}>
                                Ref: {paymentCode} | Error: {errorCode}
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
        backgroundColor: "#DC2626",
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
    errorIconContainer: {
        marginBottom: 32,
    },
    errorIconBackground: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    errorTitle: {
        fontSize: 28,
        fontWeight: "800",
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 8,
    },
    errorSubtitle: {
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
        color: "#DC2626",
        fontWeight: "800",
        textAlign: "right",
        flex: 1,
        marginLeft: 16,
    },
    detailValueError: {
        fontSize: 14,
        color: "#DC2626",
        fontWeight: "700",
        textAlign: "right",
        flex: 1,
        marginLeft: 16,
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
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
        color: "#DC2626",
        fontWeight: "600",
    },
    errorCard: {
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
    errorHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    errorHeaderText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#0F172A",
        marginLeft: 8,
    },
    errorMessageContainer: {
        backgroundColor: "#FEF2F2",
        borderWidth: 1,
        borderColor: "#FECACA",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    errorMessageText: {
        fontSize: 14,
        color: "#DC2626",
        fontWeight: "600",
        lineHeight: 20,
    },
    errorText: {
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
        color: "#DC2626",
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
        marginBottom: 12,
    },
    supportText: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
        flex: 1,
        lineHeight: 18,
    },
    referenceContainer: {
        paddingHorizontal: 16,
    },
    referenceText: {
        fontSize: 11,
        color: "rgba(255, 255, 255, 0.6)",
        textAlign: "center",
        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    },
})

export default PaymentErrorScreen
