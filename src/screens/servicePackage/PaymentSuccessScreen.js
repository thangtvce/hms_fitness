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
import { CommonActions } from "@react-navigation/native"
import { safeNavigate } from "components/SafeNavigate"
import { safeReset } from "components/SafeReset"

const { width,height } = Dimensions.get("window")

const PaymentSuccessCelebrationScreen = ({ route,navigation }) => {
    const { paymentCode,packageId,subscriptionId,amount,packageName } = route.params

    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.5)).current
    const slideAnim = useRef(new Animated.Value(50)).current

    const topCannonAnims = useRef(
        Array.from({ length: 80 },() => ({
            translateX: new Animated.Value(0),
            translateY: new Animated.Value(0),
            opacity: new Animated.Value(0),
            scale: new Animated.Value(0),
            rotate: new Animated.Value(0),
        })),
    ).current

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
        ]).start(() => {
            setTimeout(() => startTopCannon(),600)
        })
    },[])

    const startTopCannon = () => {
        const cannonAnimations = topCannonAnims.map((anim,index) => {
            const startX = Math.random() * width - width / 2
            const endX = startX + (Math.random() - 0.5) * 300
            const fallDistance = height + 200
            const delay = Math.random() * 800

            return Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(anim.translateX,{
                        toValue: startX,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.translateY,{
                        toValue: -height / 2 - 100,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(anim.opacity,{
                        toValue: 0.9,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.scale,{
                        toValue: 0.6 + Math.random() * 0.8,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(anim.translateX,{
                        toValue: endX,
                        duration: 3000 + Math.random() * 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.translateY,{
                        toValue: fallDistance,
                        duration: 3000 + Math.random() * 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim.rotate,{
                        toValue: 360 * (4 + Math.random() * 3),
                        duration: 3000 + Math.random() * 2000,
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.delay(2000),
                        Animated.timing(anim.opacity,{
                            toValue: 0,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                ]),
            ])
        })

        Animated.parallel(cannonAnimations).start(() => {
            topCannonAnims.forEach((anim) => {
                anim.translateX.setValue(0)
                anim.translateY.setValue(0)
                anim.opacity.setValue(0)
                anim.scale.setValue(0)
                anim.rotate.setValue(0)
            })
            setTimeout(startTopCannon,500)
        })
    }

    const renderConfettiCannon = (anims,keyPrefix) => {
        const confettiColors = [
            "#FFD700", // Gold
            "#FF6B6B", // Red
            "#4ECDC4", // Teal
            "#45B7D1", // Blue
            "#96CEB4", // Green
            "#FFEAA7", // Yellow
            "#DDA0DD", // Plum
            "#98D8C8", // Mint
            "#FF9FF3", // Pink
            "#54A0FF", // Light Blue
            "#FF7675", // Coral
            "#74B9FF", // Sky Blue
        ]

        const paperShapes = ["rectangle","square","circle","triangle","diamond"]

        return anims.map((anim,index) => {
            const color = confettiColors[index % confettiColors.length]
            const shape = paperShapes[index % paperShapes.length]

            return (
                <Animated.View
                    key={`${keyPrefix}-${index}`}
                    style={[
                        styles.confettiPaper,
                        styles[`paper${shape.charAt(0).toUpperCase() + shape.slice(1)}`],
                        {
                            backgroundColor: color,
                            transform: [
                                { translateX: anim.translateX },
                                { translateY: anim.translateY },
                                { scale: anim.scale },
                                {
                                    rotate: anim.rotate.interpolate({
                                        inputRange: [0,360],
                                        outputRange: ["0deg","360deg"],
                                    }),
                                },
                            ],
                            opacity: anim.opacity,
                        },
                    ]}
                />
            )
        })
    }

    const handleGoHome = () => {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Main' }],
            })
        );
    };

    const handleViewDetails = () => {
        safeReset(navigation,'SubscriptionDetail',{
            paymentCode,
            packageId,
            subscriptionId,
            amount,
            packageName,
        });
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />

            <LinearGradient colors={["#4F46E5","#6366F1"]} style={styles.container}>
                <View style={styles.celebrationContainer}>{renderConfettiCannon(topCannonAnims,"top-cannon")}</View>

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
                        {/* Success Icon with Enhanced Pulse Effect */}
                        <Animated.View
                            style={[
                                styles.successIconContainer,
                                {
                                    transform: [
                                        {
                                            scale: scaleAnim.interpolate({
                                                inputRange: [0,1],
                                                outputRange: [0.5,1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <LinearGradient colors={["#FFFFFF","#F0FDF4"]} style={styles.successIconBackground}>
                                <Ionicons name="checkmark-circle" size={80} color="#4F46E5" />
                            </LinearGradient>
                            {/* Multiple pulse rings */}
                            <Animated.View
                                style={[
                                    styles.pulseRing,
                                    {
                                        transform: [{ scale: scaleAnim }],
                                        opacity: fadeAnim.interpolate({
                                            inputRange: [0,1],
                                            outputRange: [0,0.4],
                                        }),
                                    },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.pulseRing,
                                    styles.pulseRingMedium,
                                    {
                                        transform: [{ scale: scaleAnim }],
                                        opacity: fadeAnim.interpolate({
                                            inputRange: [0,1],
                                            outputRange: [0,0.3],
                                        }),
                                    },
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.pulseRing,
                                    styles.pulseRingLarge,
                                    {
                                        transform: [{ scale: scaleAnim }],
                                        opacity: fadeAnim.interpolate({
                                            inputRange: [0,1],
                                            outputRange: [0,0.2],
                                        }),
                                    },
                                ]}
                            />
                        </Animated.View>

                        {/* Success Message with Celebration */}
                        <Text style={styles.successTitle}>PAYMENT SUCCESSFUL!</Text>
                        <Text style={styles.successSubtitle}>Your transaction has been processed successfully</Text>

                        {/* Payment Details Card */}
                        <View style={styles.detailsCard}>
                            <View style={styles.detailsHeader}>
                                <LinearGradient colors={["#4F46E5","#6366F1"]} style={styles.detailsIcon}>
                                    <MaterialCommunityIcons name="receipt" size={24} color="#FFFFFF" />
                                </LinearGradient>
                                <Text style={styles.detailsHeaderText}>Payment Details</Text>
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

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Transaction ID</Text>
                                    <Text style={styles.detailValue}>{paymentCode}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Date & Time</Text>
                                    <Text style={styles.detailValue}>{new Date().toLocaleString("vi-VN")}</Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Status</Text>
                                    <View style={styles.statusBadge}>
                                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                                        <Text style={styles.statusText}>Success</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={styles.primaryButton} onPress={handleGoHome}>
                                <LinearGradient colors={["#FFFFFF","#F8FAFC"]} style={styles.primaryButtonGradient}>
                                    <Ionicons name="home" size={20} color="#4F46E5" />
                                    <Text style={styles.primaryButtonText}>Go to Home</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.secondaryButton} onPress={handleViewDetails}>
                                <Text style={styles.secondaryButtonText}>View Details</Text>
                                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Support Info */}
                        <View style={styles.supportContainer}>
                            <Ionicons name="information-circle-outline" size={16} color="rgba(255, 255, 255, 0.8)" />
                            <Text style={styles.supportText}>
                                If you have any questions, please contact hotline: 1900-xxxx or email: support@3docorp.com
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
        backgroundColor: "#4F46E5",
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
        zIndex: 2,
    },
    successIconContainer: {
        marginBottom: 32,
        position: "relative",
    },
    successIconBackground: {
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
        zIndex: 2,
    },
    pulseRing: {
        position: "absolute",
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        borderColor: "#FFFFFF",
        top: -10,
        left: -10,
    },
    pulseRingMedium: {
        width: 160,
        height: 160,
        borderRadius: 80,
        top: -20,
        left: -20,
        borderWidth: 2,
    },
    pulseRingLarge: {
        width: 180,
        height: 180,
        borderRadius: 90,
        top: -30,
        left: -30,
        borderWidth: 1,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#FFFFFF",
        textAlign: "center",
        marginBottom: 8,
        textShadowColor: "rgba(0, 0, 0, 0.3)",
        textShadowOffset: { width: 0,height: 2 },
        textShadowRadius: 4,
    },
    successSubtitle: {
        fontSize: 16,
        color: "rgba(255, 255, 255, 0.9)",
        textAlign: "center",
        marginBottom: 40,
        lineHeight: 24,
    },
    detailsCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        padding: 24,
        width: "100%",
        marginBottom: 32,
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
    detailsIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    detailsHeaderText: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0F172A",
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
        color: "#4F46E5",
        fontWeight: "800",
        textAlign: "right",
        flex: 1,
        marginLeft: 16,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0FDF4",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
    },
    statusText: {
        fontSize: 12,
        color: "#10B981",
        fontWeight: "600",
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
        color: "#4F46E5",
    },
    secondaryButton: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.3)",
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    supportContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    supportText: {
        fontSize: 12,
        color: "rgba(255, 255, 255, 0.8)",
        textAlign: "center",
        flex: 1,
        lineHeight: 18,
    },
    celebrationContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1,
        pointerEvents: "none",
    },
    // Confetti paper shapes
    confettiPaper: {
        position: "absolute",
        top: "50%",
        left: "50%",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    paperRectangle: {
        width: 16,
        height: 10,
        borderRadius: 2,
    },
    paperSquare: {
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    paperCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    paperTriangle: {
        width: 0,
        height: 0,
        backgroundColor: "transparent",
        borderStyle: "solid",
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 10,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
    },
    paperDiamond: {
        width: 12,
        height: 12,
        borderRadius: 2,
        transform: [{ rotate: "45deg" }],
    },
})

export default PaymentSuccessCelebrationScreen
