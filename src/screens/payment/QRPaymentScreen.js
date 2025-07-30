import { useState,useEffect,useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    Image,
    Modal,
    Dimensions,
    ScrollView,
    Linking,
    Animated,
    Alert,
} from "react-native";
import Loading from "components/Loading";
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from "utils/toastUtil";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons,MaterialCommunityIcons } from "@expo/vector-icons";
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchBankAppsByPlatform } from "services/apiBankAppService";
import { apiUserPaymentService } from "services/apiUserPaymentService";
import { safeNavigate } from "components/SafeNavigate";
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton";

const { width } = Dimensions.get("window");

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
    } = route.params;

    const [loading,setLoading] = useState(true);
    const [webViewError,setWebViewError] = useState(false);
    const [errorMessage,setErrorMessage] = useState("");
    const [currentUrl,setCurrentUrl] = useState("");
    const [paymentStatus,setPaymentStatus] = useState("pending");
    const [bankApps,setBankApps] = useState([]);
    const [loadingApps,setLoadingApps] = useState(false);
    const [bin,setBin] = useState("");
    const [showBankModal,setShowBankModal] = useState(false);
    const [copiedField,setCopiedField] = useState("");
    const [fadeAnim] = useState(new Animated.Value(0));
    const [scaleAnim] = useState(new Animated.Value(0.95));
    const webViewRef = useRef(null);
    const hasNavigatedRef = useRef(false);
    const lastUrlRef = useRef('');
    const timeoutRef = useRef(null)

    const injectedJavaScript = `
    (function() {
      console.log('Injected JavaScript running for URL: ${paymentUrl}');
      // Scroll to QR code area
      setTimeout(() => {
        const qrElements = document.querySelectorAll('[class*="qr"], [id*="qr"], [class*="QR"], [id*="QR"], canvas, img[src*="qr"]');
        console.log('QR elements found:', qrElements.length);
        if (qrElements.length > 0) {
          qrElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          console.log('No QR elements found, scrolling down');
          window.scrollBy(0, 100);
        }
      }, 1000);

      // Hide unnecessary elements
      const elementsToHide = document.querySelectorAll('header, .header, nav, .nav, .navbar, footer, .footer, .breadcrumb, .menu, .sidebar, .advertisement');
      console.log('Elements to hide:', elementsToHide.length);
      elementsToHide.forEach(element => {
        element.style.display = 'none';
      });

      // Optimize display
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
        ::-webkit-scrollbar {
          display: none;
        }
        * {
          -webkit-tap-highlight-color: transparent;
        }
      \`;
      document.head.appendChild(style);
      
      // Notify React Native of load completion
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'loadComplete', url: window.location.href }));
      
      // Log all URL changes
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      history.pushState = function(state, title, url) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'urlChange', url: url, source: 'pushState' }));
        return originalPushState.apply(this, arguments);
      };
      history.replaceState = function(state, title, url) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'urlChange', url: url, source: 'replaceState' }));
        return originalReplaceState.apply(this, arguments);
      };
      window.addEventListener('popstate', () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'urlChange', url: window.location.href, source: 'popstate' }));
      });

      true;
    })();
    `;

    useEffect(() => {
        console.log('QRPaymentScreen mounted with paymentUrl:',paymentUrl);
        if (!paymentUrl || !isValidUrl(paymentUrl)) {
            console.error('Invalid payment URL:',paymentUrl);
            setWebViewError(true);
            setErrorMessage("Invalid payment URL. Please try again.");
            setLoading(false);
            showErrorFetchAPI("Invalid payment URL. Please try again.");
            return;
        }

        fetchBankAppList();

        timeoutRef.current = setTimeout(() => {
            if (loading && !webViewError) {
                console.error('WebView timeout after 15 seconds for URL:',paymentUrl);
                setWebViewError(true);
                setErrorMessage("Payment page took too long to load. Please check your internet connection or try refreshing.");
                setLoading(false);
                showErrorFetchAPI("Payment page took too long to load. Please check your internet connection or try refreshing.");
            }
        },15000);

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
        ]).start();

        return () => {
            console.log('QRPaymentScreen unmounting');
            hasNavigatedRef.current = false;
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    },[navigation,paymentUrl]);

    const backAction = () => {
        console.log('Back button pressed on QRPaymentScreen');
        Alert.alert(
            "Confirm Navigation",
            "To cancel the payment, please press the 'Cancel' button on the payment screen. Going back will keep the payment in a pending state.",
            [
                {
                    text: "Stay",
                    style: "cancel",
                    onPress: () => {
                        console.log('User chose to stay on QRPaymentScreen');
                    },
                },
                {
                    text: "Go Back",
                    style: "default",
                    onPress: () => {
                        console.log('User confirmed going back, keeping payment pending');
                        navigation.goBack();
                    },
                },
            ],
            { cancelable: false }
        );
        return true;
    };

    const isValidUrl = (url) => {
        try {
            new URL(url);
            return true;
        } catch (error) {
            console.error('URL validation failed:',error.message);
            return false;
        }
    };

    const fetchBankAppList = async () => {
        setLoadingApps(true);
        try {
            console.log('Fetching bank apps for platform:',Platform.OS);
            const platform = Platform.OS;
            const data = await fetchBankAppsByPlatform(platform);
            const sortedApps = data.apps.sort((a,b) => b.autofill - a.autofill);
            console.log('Bank apps fetched:',sortedApps);
            setBankApps(sortedApps);
        } catch (e) {
            console.error('Error fetching bank apps:',e);
            showErrorFetchAPI(e);
        } finally {
            setLoadingApps(false);
        }
    };

    const openBankApp = async (app) => {
        console.log('Opening bank app:',app.appName);
        setShowBankModal(false);
        const { deeplink,appId,autofill,iosAppStoreId,androidPackageName } = app;
        let url = deeplink;

        if (!autofill) {
            const params = new URLSearchParams({
                ba: `${accountNumber}@${bin}`,
                am: amount.toString(),
                tn: description,
                app: appId,
            });
            url = `https://dl.vietqr.io/pay?${params.toString()}`;
            console.log('Generated non-autofill URL:',url);
        }

        try {
            const canOpen = await Linking.canOpenURL(url);
            console.log('Can open URL:',canOpen,'URL:',url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                const storeUrl =
                    Platform.OS === "ios"
                        ? `https://apps.apple.com/app/id${iosAppStoreId}`
                        : `https://play.google.com/store/apps/details?id=${androidPackageName}`;
                console.log('Opening store URL:',storeUrl);
                await Linking.openURL(storeUrl);
            }
        } catch (error) {
            console.error('Error opening bank app:',error.message);
            showErrorFetchAPI(`Unable to open ${app.appName}.`);
        }
    };

    const handleNavigationStateChange = async (navState) => {
        const { url,loading: webViewLoading,canGoBack,canGoForward } = navState;
        setCurrentUrl(url);

        if (hasNavigatedRef.current) {
            return;
        }

        const urlParams = new URLSearchParams(url.split("?")[1] || "");
        const returnedPaymentCode = urlParams.get("paymentCode") || paymentCode;
        const returnedPackageId = urlParams.get("packageId") || packageId;
        const returnedSubscription = urlParams.get("subscription") || subscriptionId;
        if (url.includes("/payment/success")) {
            setPaymentStatus("success");
            setLoading(false);
            hasNavigatedRef.current = true;
            try {
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
                });
            } catch (error) {
                safeNavigate(navigation,"PaymentErrorScreen",{
                    paymentCode: returnedPaymentCode,
                    packageId: returnedPackageId,
                    subscriptionId: returnedSubscription,
                    amount,
                    packageName,
                });
            }
        } else if (url.includes("/payment/cancel")) {
            setPaymentStatus("failed");
            setLoading(false);
            hasNavigatedRef.current = true;
            try {
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
                });
            } catch (error) {
                safeNavigate(navigation,"PaymentErrorScreen",{
                    paymentCode: returnedPaymentCode,
                    packageId: returnedPackageId,
                    subscriptionId: returnedSubscription,
                    amount,
                    packageName,
                });
            }
        } else {

        }
    };

    const handleShouldStartLoadWithRequest = (request) => {
        const { url } = request;
        console.log('WebView shouldStartLoadWithRequest:',{ url });
        return true;
    };

    const handleWebViewLoad = () => {
        console.log('WebView loaded successfully for URL:',currentUrl || paymentUrl);
        setLoading(false);
        setWebViewError(false);
        setErrorMessage("");
        if (timeoutRef.current) {
            console.log('Clearing timeout on successful load');
            clearTimeout(timeoutRef.current);
        }
        setTimeout(() => {
            if (webViewRef.current) {
                console.log('Injecting JavaScript into WebView');
                webViewRef.current.injectJavaScript(injectedJavaScript);
            } else {
                console.error('WebView ref not available for JavaScript injection');
            }
        },1500);
    };

    const handleWebViewError = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        console.error('WebView error occurred:',nativeEvent);
        setLoading(false);
        setWebViewError(true);
        setErrorMessage(`WebView error: ${nativeEvent.description || 'Unknown error'}`);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        showErrorMessage(`WebView error: ${nativeEvent.description || 'Unknown error'}`);
    };

    const handleWebViewMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'loadComplete') {
            } else if (data.type === 'urlChange') {
                setCurrentUrl(data.url);
            }
        } catch (error) {
            console.error('Error parsing WebView message:',error);
        }
    };

    const handleRenderProcessGone = (syntheticEvent) => {
        const { nativeEvent } = syntheticEvent;
        setLoading(false);
        setWebViewError(true);
        setErrorMessage("WebView crashed. Please try refreshing.");
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        showErrorMessage("WebView crashed. Please try refreshing.");
    };

    const refreshPayment = () => {
        setLoading(true);
        setWebViewError(false);
        setErrorMessage("");
        setPaymentStatus("pending");
        setCurrentUrl("");
        lastUrlRef.current = '';
        hasNavigatedRef.current = false;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            if (loading && !webViewError) {
                setWebViewError(true);
                setErrorMessage("Payment page took too long to load. Please check your internet connection or try refreshing.");
                setLoading(false);
                showErrorMessage("Payment page took too long to load. Please check your internet connection or try refreshing.");
            }
        },15000);
        if (webViewRef.current) {
            webViewRef.current.reload();
        } else {
            setLoading(true);
        }
    };

    const renderHeader = () => (
        <View style={[styles.header,{ backgroundColor: '#FFFFFF',borderBottomWidth: 1,borderBottomColor: '#E2E8F0' }]}>
            <TouchableOpacity
                style={[styles.backBtn,{ backgroundColor: '#F1F5F9' }]}
                onPress={() => backAction()}
            >
                <Ionicons name="arrow-back" size={24} color="#1E293B" />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
                <Text style={[styles.headerTitle,{ color: '#1E293B' }]}>QR Payment</Text>
                <Text style={[styles.headerSubtitle,{ color: '#64748B' }]}>Secure Payment Gateway</Text>
            </View>
            <TouchableOpacity style={[styles.refreshBtn,{ backgroundColor: '#F1F5F9' }]} onPress={refreshPayment}>
                <Ionicons name="refresh" size={24} color="#3B82F6" />
            </TouchableOpacity>
        </View>
    );

    const renderPaymentHeader = () => (
        <Animated.View
            style={[
                styles.paymentHeaderCard,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                    backgroundColor: '#FFFFFF',
                    shadowColor: '#000',
                    shadowOffset: { width: 0,height: 4 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 4,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                },
            ]}
        >
            <View style={[styles.paymentHeaderGradient,{ backgroundColor: '#FFFFFF' }]}>
                <View style={styles.paymentHeaderContent}>
                    <View style={styles.qrIconContainer}>
                        <View style={{
                            width: 56,
                            height: 56,
                            borderRadius: 28,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: '#F1F5F9',
                        }}>
                            <MaterialCommunityIcons name="qrcode-scan" size={28} color="#3B82F6" />
                        </View>
                    </View>
                    <View style={styles.paymentInfo}>
                        <Text style={styles.packageNameText}>{packageName}</Text>
                        <Text style={[styles.amountText,{ color: '#1E3A8A' }]}>{amount?.toLocaleString()} VND</Text>
                    </View>
                    <View style={styles.badgesContainer}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F1F5F9',
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 16,
                            gap: 3,
                        }}>
                            <MaterialCommunityIcons name="test-tube" size={12} color="#3B82F6" />
                            <Text style={[styles.demoText,{ color: '#1E293B' }]}>
                                Verified
                            </Text>
                        </View>
                        <View style={[styles.statusBadge,getStatusBadgeStyle()]}>
                            <View style={[styles.statusDot,{ backgroundColor: getStatusDotColor() }]} />
                            <Text style={[styles.statusText,getStatusTextStyle()]}>{getStatusText()}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Animated.View>
    );

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
            <View style={[styles.qrContainer,{ shadowColor: '#000',borderColor: '#E2E8F0' }]}>
                {loading && <CommonSkeleton />}
                {webViewError && (
                    <View style={styles.errorContainer}>
                        <View style={styles.errorContent}>
                            <Ionicons name="warning" size={48} color="#EF4444" />
                            <Text style={styles.errorTitle}>Payment Error</Text>
                            <Text style={styles.errorText}>
                                {errorMessage || "Unable to load the payment page. Please check your internet connection or try again later."}
                            </Text>
                            <TouchableOpacity style={styles.retryButton} onPress={refreshPayment}>
                                <LinearGradient
                                    colors={["#3B82F6","#1E3A8A"]}
                                    style={styles.retryButtonGradient}
                                >
                                    <Text style={styles.retryButtonText}>Try Again</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                            {qrCode && (
                                <>
                                    <Text style={[styles.errorText,{ marginTop: 16 }]}>
                                        Alternatively, scan this QR code to complete the payment:
                                    </Text>
                                    <Image
                                        source={{ uri: qrCode }}
                                        style={styles.qrCodeImage}
                                    />
                                </>
                            )}
                        </View>
                    </View>
                )}
                <WebView
                    ref={webViewRef}
                    source={{ uri: paymentUrl }}
                    style={[styles.webView,(loading || webViewError) && { height: 0 }]}
                    onLoad={handleWebViewLoad}
                    onError={handleWebViewError}
                    onHttpError={handleWebViewError}
                    onRenderProcessGone={handleRenderProcessGone}
                    onNavigationStateChange={handleNavigationStateChange}
                    onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
                    onMessage={handleWebViewMessage}
                    injectedJavaScript={injectedJavaScript}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    allowsBackForwardNavigationGestures={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    mixedContentMode="compatibility"
                    cacheEnabled={false}
                    cacheMode="LOAD_NO_CACHE"
                    userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
                />
            </View>
        </Animated.View>
    );

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
                            <MaterialCommunityIcons name="bank" size={24} color="#3B82F6" />
                            <Text style={styles.modalTitle}>Select Banking App</Text>
                        </View>
                        <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowBankModal(false)}>
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    {loadingApps ? (
                        <CommonSkeleton />
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
                                        );
                                    }
                                    return null;
                                })}
                            </View>
                        </ScrollView>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );

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
            <TouchableOpacity style={[styles.bankAppButton,{ backgroundColor: '#3B82F6',shadowColor: '#000' }]} onPress={() => setShowBankModal(true)}>
                <LinearGradient
                    colors={["#3B82F6","#1E3A8A"]}
                    style={styles.bankAppButtonGradient}
                >
                    <MaterialCommunityIcons name="cellphone" size={20} color="#FFFFFF" />
                    <Text style={[styles.bankAppButtonText,{ color: '#FFFFFF' }]}>Open Banking App</Text>
                    <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.helpButton,{ borderColor: '#E2E8F0',backgroundColor: '#FFFFFF',shadowColor: '#000' }]}
                onPress={() =>
                    Alert.alert(
                        "Payment Support",
                        "• Ensure stable internet connection\n• Check account balance\n• Contact your bank if issues occur\n\nHotline: +84 865341745",
                    )
                }
            >
                <Ionicons name="help-circle-outline" size={20} color="#3B82F6" />
                <Text style={[styles.helpButtonText,{ color: '#1E293B' }]}>Need Help?</Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>
        </Animated.View>
    );

    const getStatusBadgeStyle = () => {
        switch (paymentStatus) {
            case "success":
                return { backgroundColor: "#F0FDF4",borderColor: "#10B981" };
            case "failed":
                return { backgroundColor: "#FEF2F2",borderColor: "#EF4444" };
            default:
                return { backgroundColor: "#FEF3C7",borderColor: "#F59E0B" };
        }
    };

    const getStatusTextStyle = () => {
        switch (paymentStatus) {
            case "success":
                return { color: "#10B981" };
            case "failed":
                return { color: "#EF4444" };
            default:
                return { color: "#92400E" };
        }
    };

    const getStatusDotColor = () => {
        switch (paymentStatus) {
            case "success":
                return "#10B981";
            case "failed":
                return "#EF4444";
            default:
                return "#F59E0B";
        }
    };

    const getStatusText = () => {
        switch (paymentStatus) {
            case "success":
                return "Success";
            case "failed":
                return "Failed";
            default:
                return "Processing";
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            {renderHeader()}
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {renderPaymentHeader()}
                {renderQRSection()}
                {renderActionButtons()}
            </ScrollView>
            {renderBankModal()}
        </SafeAreaView>
    );
};

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
        paddingHorizontal: 16,
        paddingBottom: 12,
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 16 : 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F1F5F9",
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
        color: "#1E293B",
    },
    headerSubtitle: {
        fontSize: 14,
        color: "#64748B",
        marginTop: 2,
    },
    refreshBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#F1F5F9",
        justifyContent: "center",
        alignItems: "center",
    },
    paymentHeaderCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        marginTop: 10,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#E2E8F0",
    },
    paymentHeaderGradient: {
        padding: 20,
        backgroundColor: "#FFFFFF",
    },
    paymentHeaderContent: {
        flexDirection: "row",
        alignItems: "center",
    },
    qrIconContainer: {
        marginRight: 14,
    },
    paymentInfo: {
        flex: 1,
    },
    packageNameText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
        marginBottom: 4,
    },
    amountText: {
        fontSize: 22,
        fontWeight: "700",
        color: "#1E3A8A",
    },
    badgesContainer: {
        alignItems: "flex-end",
        gap: 8,
    },
    demoText: {
        fontSize: 10,
        fontWeight: "700",
        color: "#1E293B",
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
        color: "#1E293B",
    },
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
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "#F8FAFC",
    },
    errorContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 24,
        padding: 40,
        alignItems: "center",
        width: "100%",
        maxWidth: 320,
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
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
    qrCodeImage: {
        width: 200,
        height: 200,
        marginTop: 16,
        borderRadius: 8,
    },
    actionButtonsContainer: {
        padding: 16,
        gap: 12,
    },
    bankAppButton: {
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
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
        borderWidth: 1,
        borderColor: "#E2E8F0",
        backgroundColor: "#FFFFFF",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    helpButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E293B",
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
        color: "#1E293B",
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
        color: "#1E293B",
        textAlign: "center",
    },
});

export default QRPaymentScreen;