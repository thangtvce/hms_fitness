import { useState,useRef,useCallback,useContext } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Platform,
    Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "context/AuthContext";
import { StatusBar } from "expo-status-bar";

const { width,height } = Dimensions.get("window");

const PRIMARY_COLOR = "#0056d2";
const ACCENT_COLOR = "#0EA5E9";
const TEXT_COLOR_DARK = "#1E293B";
const TEXT_COLOR_LIGHT = "#64748B";
const BACKGROUND_COLOR = "#F0F2F5";

export default function VideoCallSupport({ route,navigation }) {
    const { user } = useContext(AuthContext);
    const roomIdFromParams = route?.params?.roomId;
    const [webViewLoading,setWebViewLoading] = useState(true);
    const webViewRef = useRef(null);

    const handleBack = useCallback(() => {
        Alert.alert("End Call","Are you sure you want to end the call?",[
            { text: "Cancel",style: "cancel" },
            {
                text: "End Call",
                style: "destructive",
                onPress: () => {
                    if (navigation) {
                        navigation.navigate("Main");
                    }
                },
            },
        ]);
    },[navigation]);

    const handleEndCall = useCallback(() => {
        Alert.alert("End Call","Are you sure you want to end the call?",[
            { text: "Cancel",style: "cancel" },
            {
                text: "End Call",
                style: "destructive",
                onPress: () => {
                    if (navigation) {
                        navigation.navigate("Main");
                    }
                },
            },
        ]);
    },[navigation]);

    const onWebViewLoadStart = useCallback(() => {
        setWebViewLoading(true);
    },[]);

    const onWebViewLoadEnd = useCallback(() => {
        setWebViewLoading(false);
    },[]);

    const onWebViewError = useCallback(() => {
        setWebViewLoading(false);
        Alert.alert("Error","Unable to load the video call");
    },[]);

    const webViewProps = {
        ref: webViewRef,
        style: styles.webview,
        onLoadStart: onWebViewLoadStart,
        onLoadEnd: onWebViewLoadEnd,
        onError: onWebViewError,
        javaScriptEnabled: true,
        domStorageEnabled: true,
        startInLoadingState: true,
        scalesPageToFit: true,
        allowsInlineMediaPlayback: true,
        mediaPlaybackRequiresUserAction: false,
        allowsFullscreenVideo: true,
        mixedContentMode: "compatibility",
        thirdPartyCookiesEnabled: true,
        sharedCookiesEnabled: true,
        ...(Platform.OS === "ios" && {
            allowsLinkPreview: false,
            dataDetectorTypes: "none",
            scrollEnabled: false,
            bounces: false,
            automaticallyAdjustContentInsets: false,
            allowsBackForwardNavigationGestures: false,
        }),
        ...(Platform.OS === "android" && {
            mixedContentMode: "always",
            hardwareAccelerationDisabled: false,
        }),
    };

    if (!roomIdFromParams) {
        return (
            <View style={[styles.container,{ backgroundColor: BACKGROUND_COLOR }]}>
                <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND_COLOR} />
                <View style={styles.fixedHeader}>
                    <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={TEXT_COLOR_DARK} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Video Call</Text>
                    <View style={styles.placeholder} />
                </View>
                <View style={styles.errorContent}>
                    <View style={styles.errorIconContainer}>
                        <Ionicons name="videocam-off" size={80} color="#ff4444" />
                    </View>
                    <Text style={styles.errorTitle}>No Room Available</Text>
                    <Text style={styles.errorMessage}>
                        Unable to join the video call. Room ID is required to start the session.
                    </Text>
                    <TouchableOpacity style={styles.errorButton} onPress={() => navigation?.goBack()} activeOpacity={0.8}>
                        <LinearGradient colors={[PRIMARY_COLOR,ACCENT_COLOR]} style={styles.errorButtonGradient}>
                            <Ionicons name="arrow-back" size={20} color="#fff" />
                            <Text style={styles.errorButtonText}>Go Back</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const callURL = `https://3do-support.vercel.app/?roomID=${roomIdFromParams}&userID=${user?.userId}&userName=User${user?.userId}&autoJoin=true`;

    return (
        <View style={styles.containerInCall}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <View style={styles.callHeader}>
                <TouchableOpacity style={styles.callHeaderButton} onPress={handleBack} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.callHeaderCenter}>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>Live</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.callHeaderButton} onPress={handleEndCall} activeOpacity={0.7}>
                    <Ionicons name="call" size={24} color="#ff4444" />
                </TouchableOpacity>
            </View>
            <View style={styles.webviewContainer}>
                <WebView source={{ uri: callURL }} {...webViewProps} />
                {webViewLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Connecting to call...</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
    },
    containerInCall: {
        flex: 1,
        backgroundColor: "#000",
    },
    fixedHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        ...Platform.select({
            ios: {
                paddingTop: 60,
                height: 100,
            },
            android: {
                paddingTop: 16,
                height: 70,
            },
        }),
    },
    callHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "#000",
        borderBottomWidth: 1,
        borderBottomColor: "#333",
        ...Platform.select({
            ios: {
                paddingTop: 60,
                height: 100,
            },
            android: {
                paddingTop: 16,
                height: 70,
            },
        }),
    },
    callHeaderButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    callHeaderCenter: {
        flex: 1,
        alignItems: "center",
    },
    liveIndicator: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#ff4444",
        paddingHorizontal: 12,
        paddingVertical: 3,
        borderRadius: 16,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#fff",
        marginRight: 6,
    },
    liveText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F8FAFC",
        alignItems: "center",
        justifyContent: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: TEXT_COLOR_DARK,
        flex: 1,
        textAlign: "center",
    },
    placeholder: {
        width: 40,
    },
    webviewContainer: {
        flex: 1,
        backgroundColor: "#000",
        position: "relative",
    },
    webview: {
        flex: 1,
    },
    loadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        color: "#fff",
        fontSize: 18,
        marginTop: 16,
        fontWeight: "600",
    },
    errorContent: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    errorIconContainer: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "#FEF2F2",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    errorTitle: {
        fontSize: 28,
        fontWeight: "700",
        color: TEXT_COLOR_DARK,
        marginBottom: 12,
        textAlign: "center",
    },
    errorMessage: {
        fontSize: 16,
        color: TEXT_COLOR_LIGHT,
        textAlign: "center",
        marginBottom: 40,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    errorButton: {
        borderRadius: 12,
        overflow: "hidden",
    },
    errorButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 32,
        paddingVertical: 16,
    },
    errorButtonText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },
});