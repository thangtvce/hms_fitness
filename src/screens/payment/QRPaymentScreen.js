import { useState,useEffect,useRef } from "react"
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    BackHandler,
    Image,
    Modal,
    Dimensions,
    ScrollView,
    Linking,
    Animated,
} from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { WebView } from "react-native-webview"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { theme } from "theme/color"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { fetchBankAppsByPlatform } from "services/apiBankAppService"
import { apiUserPaymentService } from "services/apiUserPaymentService"
import { safeNavigate } from "components/SafeNavigate"

const { width } = Dimensions.get("window")

const QRPaymentScreen = ({ route,navigation }) => {
    const {
        paymentUrl,
        packageName,
        amount,
        accountNumber,
        description,
        qrCode,
        paymentCode,
        packageId,
        subscriptionId,
    } = route.params

    const [loading,setLoading] = useState(true)
    const [webViewError,setWebViewError] = useState(false)
    const [currentUrl,setCurrentUrl] = useState("")
    const [paymentStatus,setPaymentStatus] = useState("pending")
    const [bankApps,setBankApps] = useState([])
    const [loadingApps,setLoadingApps] = useState(false)
    const [bin,setBin] = useState("")
    const [showBankModal,setShowBankModal] = useState(false)
    const [copiedField,setCopiedField] = useState("")
    const [fadeAnim] = useState(new Animated.Value(0))
    const [scaleAnim] = useState(new Animated.Value(0.95))
    const webViewRef = useRef(null)
    const hasNavigatedRef = useRef(false);
    const lastUrlRef = useRef('');
    const injectedJavaScript = `
    (function() {
      // Scroll XUỐNG 300px để hiển thị QR code (thay vì lên)
      window.scrollTo(0, 300);
      
      // Ẩn header nếu có
      const headers = document.querySelectorAll('header, .header, nav, .nav, .navbar');
      headers.forEach(header => {
        header.style.display = 'none';
      });
      
      // Ẩn footer nếu có
      const footers = document.querySelectorAll('footer, .footer');
      footers.forEach(footer => {
        footer.style.display = 'none';
      });
      
      // Ẩn các element không cần thiết
      const unnecessaryElements = document.querySelectorAll('.breadcrumb, .menu, .sidebar, .advertisement');
      unnecessaryElements.forEach(element => {
        element.style.display = 'none';
      });
      
      // Focus vào QR code area và scroll smooth
      setTimeout(() => {
        const qrElements = document.querySelectorAll('[class*="qr"], [id*="qr"], [class*="QR"], [id*="QR"], canvas, img[src*="qr"]');
        if (qrElements.length > 0) {
          qrElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Nếu không tìm thấy QR element, scroll xuống một chút nữa
          window.scrollBy(0, 100);
        }
      }, 500);
      
      // Thêm CSS để tối ưu hiển thị
      const style = document.createElement('style');
      style.textContent = \`
        body { 
          padding-top: 0 !important; 
          margin-top: 0 !important;
          background: #ffffff !important;
          overflow-x: hidden !important;
        }
        .container, .main-content { 
          padding-top: 0 !important; 
          margin-top: 0 !important;
        }
        /* Ẩn scroll bar */
        ::-webkit-scrollbar {
          display: none;
        }
        /* Tối ưu cho mobile */
        * {
          -webkit-tap-highlight-color: transparent;
        }
      \`;
      document.head.appendChild(style);
      
      true;
    })();
  `

    useEffect(() => {

        fetchBankAppList()

        const backAction = () => {
            // No Alert, just go back
            navigation.goBack();
            return true;
        }

        const backHandler = BackHandler.addEventListener("hardwareBackPress",backAction)
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim,{
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start()

        return () => {
            backHandler.remove();
            hasNavigatedRef.current = false;
        };
    },[navigation,qrCode])

    const fetchBankAppList = async () => {
        setLoadingApps(true)
        try {
            const platform = Platform.OS
            const data = await fetchBankAppsByPlatform(platform)
            const sortedApps = data.apps.sort((a,b) => b.autofill - a.autofill)
            setBankApps(sortedApps)
        } catch (e) {
            showErrorFetchAPI(e)
        } finally {
            setLoadingApps(false)
        }
    }

    const openBankApp = async (app) => {
        setShowBankModal(false)
        const { deeplink,appId,autofill,iosAppStoreId,androidPackageName } = app
        let url = deeplink

        if (!autofill) {
            const params = new URLSearchParams({
                ba: `${accountNumber}@${bin}`,
                am: amount.toString(),
                tn: description,
                app: appId,
            })
            url = `https://dl.vietqr.io/pay?${params.toString()}`
        }

        try {
            const canOpen = await Linking.canOpenURL(url)
            if (canOpen) {
                await Linking.openURL(url)
            } else {
                const storeUrl =
                    Platform.OS === "ios"
                        ? `https://apps.apple.com/app/id${iosAppStoreId}`
                        : `https://play.google.com/store/apps/details?id=${androidPackageName}`
                await Linking.openURL(storeUrl)
            }
        } catch (error) {
            showErrorFetchAPI(`Unable to open ${app.appName}.`)
        }
    }

    const handleNavigationStateChange = async (navState) => {
        const { url } = navState
        const urlParams = new URLSearchParams(url.split("?")[1])
        const returnedPaymentCode = urlParams.get("paymentCode") || paymentCode
        const returnedPackageId = urlParams.get("packageId") || packageId
        const returnedSubscription = urlParams.get("subscription") || subscriptionId

        if (url.includes("/payment/success")) {
            setPaymentStatus("success")
            setLoading(false)
            const checkPayment = await apiUserPaymentService.checkPaymentStatus(returnedPaymentCode,returnedSubscription,"PAID");
            let screenName = "PaymentSuccessScreen";
            if (checkPayment.statusCode === 200 && checkPayment.data && checkPayment.data.status === "PAID") {
            } else {
                screenName = "PaymentErrorScreen";
            }
            safeNavigate(navigation,screenName,{
                paymentCode: returnedPaymentCode,
                packageId: returnedPackageId,
                subscriptionId: returnedSubscription,
                amount,
                packageName,
            })
        } else if (url.includes("/payment/cancel")) {
            setPaymentStatus("failed")
            setLoading(false)
            const checkPayment = await apiUserPaymentService.checkPaymentStatus(returnedPaymentCode,returnedSubscription,"CANCELLED");
            let screenName = "PaymentCancelled";
            if (checkPayment.statusCode === 200 && checkPayment.data && checkPayment.data.status === "CANCELLED") {
            } else {
                screenName = "PaymentErrorScreen";
            }
            safeNavigate(navigation,screenName,{
                paymentCode: returnedPaymentCode,
                packageId: returnedPackageId,
                subscriptionId: returnedSubscription,
                amount,
                packageName,
            })
        }
    }

    const handleWebViewLoad = () => {
        setLoading(false)
        setWebViewError(false)
        setTimeout(() => {
            if (webViewRef.current) {
                webViewRef.current.injectJavaScript(injectedJavaScript)
            }
        },1000)
    }

    const handleWebViewError = () => {
        setLoading(false)
        setWebViewError(true)
    }

    const refreshPayment = () => {
        setLoading(true)
        setWebViewError(false)
        setPaymentStatus("pending")
        lastUrlRef.current = ''; // Reset URL tracking
        hasNavigatedRef.current = false; // Allow new navigation
        webViewRef.current?.reload()
    }

    const renderHeader = () => (
        <View style={[styles.header, { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }]}> 
            <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: '#F1F5F9' }]}
                onPress={() => navigation.goBack()}
            >
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle, { color: '#000' }]}>QR Payment</Text>
                <Text style={[styles.headerSubtitle, { color: '#64748B' }]}>Secure Payment Gateway</Text>
            </View>
            <TouchableOpacity style={[styles.refreshBtn, { backgroundColor: '#F1F5F9' }]} onPress={refreshPayment}>
                <Ionicons name="refresh" size={24} color="#000" />
            </TouchableOpacity>
        </View>
    )

    const renderPaymentHeader = () => (
        <Animated.View
            style={[
                styles.paymentHeaderCard,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: '#fff',
                    shadowColor: 'transparent',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                },
            ]}
        >
            <View style={[styles.paymentHeaderGradient, { backgroundColor: '#fff' }]}> 
                <View style={styles.paymentHeaderContent}>
                    <View style={styles.qrIconContainer}>
                        <View style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: '#000',
                        }}>
                            <MaterialCommunityIcons name="qrcode-scan" size={28} color="#fff" />
                        </View>
                    </View>

                    <View style={styles.paymentInfo}>
                        <Text style={styles.packageNameText}>{packageName}</Text>
                        <Text style={[styles.amountText, { color: '#000' }]}>{amount?.toLocaleString()} VND</Text>
                    </View>

                    <View style={styles.badgesContainer}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#000',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 16,
                            gap: 3,
                        }}>
                            <MaterialCommunityIcons name="test-tube" size={12} color="#fff" />
                            <Text style={[styles.demoText, { color: '#fff' }]}>DEMO</Text>
                        </View>
                        <View style={[styles.statusBadge,getStatusBadgeStyle()]}> 
                            <View style={[styles.statusDot,{ backgroundColor: getStatusDotColor() }]} />
                            <Text style={[styles.statusText,getStatusTextStyle()]}>{getStatusText()}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Animated.View>
    )

    const renderQRSection = () => (
        <Animated.View
            style={[
                styles.qrSection,
                {
                    opacity: fadeAnim,
                    transform: [
                        {
                            translateY: fadeAnim.interpolate({
                                inputRange: [0,1],
                                outputRange: [50,0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <View style={styles.qrTitleContainer}>
                <MaterialCommunityIcons name="qrcode" size={24} color="#000" />
                <Text style={styles.qrTitle}>QR Payment Link</Text>
                <View style={{ backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={[styles.qrBadgeText, { color: '#fff' }]}>LIVE</Text>
                </View>
            </View>

            <View style={[styles.qrContainer, { shadowColor: 'transparent', borderColor: '#E2E8F0' }]}> 
                {loading && <Loading />}
                {!loading && (
                    <WebView
                        ref={webViewRef}
                        source={{ uri: paymentUrl }}
                        style={styles.webView}
                        onLoad={handleWebViewLoad}
                        onError={handleWebViewError}
                        onNavigationStateChange={handleNavigationStateChange}
                        injectedJavaScript={injectedJavaScript}
                        startInLoadingState={true}
                        scalesPageToFit={true}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        allowsBackForwardNavigationGestures={false}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        mixedContentMode="compatibility"
                        onMessage={(event) => {
                        }}
                    />
                )}
            </View>
        </Animated.View>
    )

    const renderBankModal = () => (
        <Modal
            visible={showBankModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowBankModal(false)}
        >
            <View style={styles.modalOverlay}>
                <Animated.View style={[styles.modalContent,{ opacity: fadeAnim }]}> 
                    <View style={styles.modalHeader}>
                        <View style={styles.modalTitleContainer}>
                            <MaterialCommunityIcons name="bank" size={24} color="#4F46E5" />
                            <Text style={styles.modalTitle}>Select Banking App</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowBankModal(false)}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {loadingApps ? (
                        <Loading />
                    ) : (
                        <ScrollView style={styles.bankGrid} showsVerticalScrollIndicator={false}>
                            <View style={styles.bankRow}>
                                {bankApps.map((bank,index) => {
                                    if (index % 3 === 0) {
                                        return (
                                            <View key={`row-${Math.floor(index / 3)}`} style={styles.bankRowContainer}>
                                                {bankApps.slice(index,index + 3).map((bankItem) => (
                                                    <TouchableOpacity
                                                        key={bankItem.appId}
                                                        style={styles.bankItem}
                                                        onPress={() => openBankApp(bankItem)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Image source={{ uri: bankItem.appLogo }} style={styles.bankLogo} />
                                                        <Text style={styles.bankName}>{bankItem.appName}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )
                                    }
                                    return null
                                })}
                            </View>
                        </ScrollView>
                    )}
                </Animated.View>
            </View>
        </Modal>
    )

    const renderActionButtons = () => (
        <Animated.View
            style={[
                styles.actionButtonsContainer,
                {
                    opacity: fadeAnim,
                    transform: [
                        {
                            translateY: fadeAnim.interpolate({
                                inputRange: [0,1],
                                outputRange: [30,0],
                            }),
                        },
                    ],
                },
            ]}
        >
            <TouchableOpacity style={[styles.bankAppButton, { backgroundColor: '#000', shadowColor: 'transparent' }]} onPress={() => setShowBankModal(true)}>
                <View style={[styles.bankAppButtonGradient, { backgroundColor: '#000' }]}> 
                    <MaterialCommunityIcons name="cellphone" size={20} color="#fff" />
                    <Text style={[styles.bankAppButtonText, { color: '#fff' }]}>Open Banking App</Text>
                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.helpButton, { borderColor: '#E2E8F0', backgroundColor: '#fff', shadowColor: 'transparent' }]}
                onPress={() =>
                    Alert.alert(
                        "Payment Support",
                        "• Ensure stable internet connection\n• Check account balance\n• Contact your bank if issues occur\n\nHotline: +84 865341745",
                    )
                }
            >
                <Ionicons name="help-circle-outline" size={20} color="#000" />
                <Text style={[styles.helpButtonText, { color: '#000' }]}>Need Help?</Text>
                <Ionicons name="chevron-forward" size={16} color="#000" />
            </TouchableOpacity>
        </Animated.View>
    )

    const getStatusBadgeStyle = () => {
        switch (paymentStatus) {
            case "success":
                return { backgroundColor: "#F0FDF4",borderColor: "#10B981" }
            case "failed":
                return { backgroundColor: "#FEF2F2",borderColor: "#EF4444" }
            default:
                return { backgroundColor: "#FEF3C7",borderColor: "#F59E0B" }
        }
    }

    const getStatusTextStyle = () => {
        switch (paymentStatus) {
            case "success":
                return { color: "#10B981" }
            case "failed":
                return { color: "#EF4444" }
            default:
                return { color: "#F59E0B" }
        }
    }

    const getStatusDotColor = () => {
        switch (paymentStatus) {
            case "success":
                return "#10B981"
            case "failed":
                return "#EF4444"
            default:
                return "#F59E0B"
        }
    }

    const getStatusText = () => {
        switch (paymentStatus) {
            case "success":
                return "Success"
            case "failed":
                return "Failed"
            default:
                return "Processing"
        }
    }

    if (webViewError) {
        // Only show loading overlay and logo, no other content
        return <Loading />;
    }

    if (loading) {
        // Only show loading overlay and logo, no other content
        return <Loading />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={theme.primaryColor} />
            {renderHeader()}

            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {renderPaymentHeader()}
                {renderQRSection()}
                {renderActionButtons()}
            </ScrollView>

            {renderBankModal()}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    scrollContainer: {
        flex: 1,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 16,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "rgba(255, 255, 255, 0.8)",
        marginTop: 2,
    },
    refreshBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    paymentHeaderCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 20,
        overflow: "hidden",
    },
    paymentHeaderGradient: {
        padding: 20,
    },
    paymentHeaderContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    qrIconContainer: {
        marginRight: 14,
    },
    // qrIconGradient removed, replaced with inline style
    paymentInfo: {
        flex: 1,
    },
    packageNameText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#0F172A",
        marginBottom: 4,
    },
    amountText: {
        fontSize: 22,
        fontWeight: "700",
    },
    badgesContainer: {
        alignItems: "flex-end",
        gap: 8,
    },
    // demoTag removed, replaced with inline style
    demoText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.8,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        gap: 5,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: "600",
    },
    qrSection: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    qrTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        gap: 8,
    },
    qrTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
    },
    // qrBadge replaced with inline style
    qrBadgeText: {
        fontSize: 9,
        fontWeight: "700",
        color: "#FFFFFF",
        letterSpacing: 0.5,
    },
    qrContainer: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        overflow: "hidden",
        height: 500,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    webView: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#FFFFFF",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
    },
    loadingContent: {
        alignItems: "center",
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: "600",
    },
    loadingDots: {
        flexDirection: "row",
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    dot1: {
        opacity: 0.4,
    },
    dot2: {
        opacity: 0.7,
    },
    dot3: {
        opacity: 1,
    },
    actionButtonsContainer: {
        padding: 16,
        gap: 12,
    },
    bankAppButton: {
        borderRadius: 20,
        overflow: "hidden",
    },
    bankAppButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 18,
        paddingHorizontal: 24,
        gap: 8,
    },
    bankAppButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
        flex: 1,
        textAlign: "center",
    },
    helpButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 24,
        gap: 8,
        borderWidth: 2,
    },
    helpButtonText: {
        fontSize: 16,
        fontWeight: "600",
        flex: 1,
        textAlign: "center",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: "70%",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    modalTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#0F172A",
    },
    modalCloseButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    bankGrid: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    bankRowContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    bankItem: {
        width: (width - 80) / 3,
        alignItems: "center",
        padding: 12,
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#E2E8F0",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    bankLogo: {
        width: 48,
        height: 48,
        borderRadius: 12,
        marginBottom: 8,
    },
    bankName: {
        fontSize: 12,
        fontWeight: "600",
        color: "#0F172A",
        textAlign: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#F8FAFC",
    },
    errorContent: {
        borderRadius: 24,
        padding: 40,
        alignItems: "center",
        width: "100%",
        maxWidth: 320,
    },
    errorTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#EF4444",
        marginTop: 16,
        marginBottom: 12,
    },
    errorText: {
        fontSize: 16,
        color: "#64748B",
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 24,
    },
    retryButton: {
        borderRadius: 16,
        overflow: "hidden",
    },
    retryButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 8,
    },
    retryButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    loadingContainer: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
    },
})

export default QRPaymentScreen
