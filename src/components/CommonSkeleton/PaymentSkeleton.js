import { useEffect,useRef,useState } from "react"
import { View,StyleSheet,Platform,Animated,Image,Text } from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { MaterialCommunityIcons } from "@expo/vector-icons"

const PaymentSkeleton = ({ animationSize = 120,containerStyle,showLogo = true }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.9)).current
    const pulseAnim = useRef(new Animated.Value(1)).current
    const shimmerAnim = useRef(new Animated.Value(0)).current
    const [loadingText,setLoadingText] = useState("Preparing payment...")

    const loadingMessages = [
        "Preparing payment...",
        "Securing transaction...",
        "Processing request...",
        "Almost ready...",
    ]

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim,{
                toValue: 1,
                tension: 120,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start()

        // Gentle pulse animation
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim,{
                    toValue: 1.05,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim,{
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ]),
        )

        // Shimmer animation
        const shimmerAnimation = Animated.loop(
            Animated.timing(shimmerAnim,{
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            }),
        )

        pulseAnimation.start()
        shimmerAnimation.start()

        // Loading text rotation
        const textInterval = setInterval(() => {
            setLoadingText((prev) => {
                const currentIndex = loadingMessages.indexOf(prev)
                const nextIndex = (currentIndex + 1) % loadingMessages.length
                return loadingMessages[nextIndex]
            })
        },2000)

        return () => {
            pulseAnimation.stop()
            shimmerAnimation.stop()
            clearInterval(textInterval)
        }
    },[])

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0,1],
        outputRange: [-300,300],
    })

    const PaymentSkeletonCard = ({ height,delay = 0,children }) => {
        const cardFadeAnim = useRef(new Animated.Value(0)).current
        const cardSlideAnim = useRef(new Animated.Value(20)).current

        useEffect(() => {
            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(cardFadeAnim,{
                        toValue: 1,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cardSlideAnim,{
                        toValue: 0,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ]).start()
            },delay)

            return () => clearTimeout(timer)
        },[delay])

        return (
            <Animated.View
                style={[
                    styles.skeletonCard,
                    { height },
                    {
                        opacity: cardFadeAnim,
                        transform: [{ translateY: cardSlideAnim }],
                    },
                ]}
            >
                <LinearGradient colors={["#FFFFFF","#FAFBFF"]} style={styles.cardGradient}>
                    <View style={styles.shimmerContainer}>
                        <Animated.View
                            style={[
                                styles.shimmerOverlay,
                                {
                                    transform: [{ translateX: shimmerTranslate }],
                                },
                            ]}
                        />
                    </View>
                    {children}
                </LinearGradient>
            </Animated.View>
        )
    }

    return (
        <View style={[styles.fullScreenContainer,containerStyle]}>
            {/* Logo and Loading Section */}
            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Logo with gentle pulse */}
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        {
                            transform: [{ scale: pulseAnim }],
                        },
                    ]}
                >
                    <LinearGradient colors={["#fff","#fff"]} style={styles.logoBackground}>
                        {showLogo ? (
                            <View style={styles.logoContent}>
                                <Image
                                    source={require("../../../assets/images/logo_loading.png")}
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                            </View>
                        ) : (
                            <View style={styles.logoContent}>
                                <MaterialCommunityIcons name="credit-card-outline" size={40} color="#FFFFFF" />
                            </View>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* Loading Text */}
                <Animated.View style={[styles.loadingTextContainer,{ opacity: fadeAnim }]}>
                    <Text style={styles.loadingText}>{loadingText}</Text>
                    <View style={styles.loadingDots}>
                        <Animated.View style={[styles.dot,{ opacity: pulseAnim }]} />
                        <Animated.View style={[styles.dot,{ opacity: pulseAnim }]} />
                        <Animated.View style={[styles.dot,{ opacity: pulseAnim }]} />
                    </View>
                </Animated.View>

                {/* Security Badge */}
                <View style={styles.securityBadge}>
                    <MaterialCommunityIcons name="shield-check" size={16} color="#10B981" />
                    <Text style={styles.securityText}>Secure Payment</Text>
                </View>
            </Animated.View>

            {/* Payment Skeleton Cards */}
            <View style={styles.skeletonContainer}>
                {/* Payment Summary Card */}
                <PaymentSkeletonCard height={100} delay={200}>
                    <View style={styles.paymentSummaryContent}>
                        <View style={[styles.skeletonLine,{ width: "50%" }]} />
                        <View style={[styles.skeletonLine,{ width: "30%",marginTop: 8 }]} />
                        <View style={styles.priceContainer}>
                            <View style={[styles.skeletonLine,{ width: "40%",height: 20 }]} />
                        </View>
                    </View>
                </PaymentSkeletonCard>

                {/* Payment Method Card */}
                <PaymentSkeletonCard height={140} delay={400}>
                    <View style={styles.paymentMethodContent}>
                        <View style={[styles.skeletonLine,{ width: "40%" }]} />
                        <View style={styles.methodOptions}>
                            <View style={styles.methodOption}>
                                <View style={styles.skeletonCircle} />
                                <View style={[styles.skeletonLine,{ width: "60%",marginLeft: 12 }]} />
                            </View>
                            <View style={styles.methodOption}>
                                <View style={styles.skeletonCircle} />
                                <View style={[styles.skeletonLine,{ width: "55%",marginLeft: 12 }]} />
                            </View>
                        </View>
                    </View>
                </PaymentSkeletonCard>

                {/* Payment Button Card */}
                <PaymentSkeletonCard height={70} delay={600}>
                    <View style={styles.paymentButtonContent}>
                        <View style={styles.skeletonButton} />
                    </View>
                </PaymentSkeletonCard>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
        width: "100%",
        backgroundColor: "#F8FAFC",
        paddingTop: Platform.OS === "android" ? 100 : 80,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 50,
        paddingHorizontal: 20,
    },
    logoWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 20,
    },
    logoBackground: {
        width: "100%",
        height: "100%",
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#0056d2",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    logoContent: {
        justifyContent: "center",
        alignItems: "center",
    },
    logoImage: {
        width: 120,
        height: 120,
    },
    loadingTextContainer: {
        alignItems: "center",
        marginBottom: 16,
    },
    loadingText: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 8,
        textAlign: "center",
    },
    loadingDots: {
        flexDirection: "row",
        gap: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: "#0056d2",
    },
    securityBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F0FDF4",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#BBF7D0",
        gap: 6,
    },
    securityText: {
        fontSize: 12,
        color: "#059669",
        fontWeight: "600",
    },
    skeletonContainer: {
        width: "100%",
        paddingHorizontal: 20,
        gap: 16,
        paddingBottom: 32,
    },
    skeletonCard: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    cardGradient: {
        flex: 1,
        padding: 20,
        position: "relative",
    },
    shimmerContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
    },
    shimmerOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(255, 255, 255, 0.4)",
        width: 100,
        transform: [{ skewX: "-20deg" }],
    },
    skeletonLine: {
        height: 14,
        backgroundColor: "#E2E8F0",
        borderRadius: 7,
        marginBottom: 8,
    },
    skeletonCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: "#E2E8F0",
    },
    skeletonButton: {
        height: 44,
        backgroundColor: "#E2E8F0",
        borderRadius: 12,
        width: "100%",
    },
    paymentSummaryContent: {
        flex: 1,
        justifyContent: "space-between",
    },
    priceContainer: {
        alignItems: "flex-end",
        marginTop: 12,
    },
    paymentMethodContent: {
        flex: 1,
    },
    methodOptions: {
        marginTop: 16,
        gap: 12,
    },
    methodOption: {
        flexDirection: "row",
        alignItems: "center",
    },
    paymentButtonContent: {
        flex: 1,
        justifyContent: "center",
    },
})

export default PaymentSkeleton
