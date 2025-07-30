import React,{ useState,useEffect,useContext,useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Image,
    Dimensions,
    Modal,
    Animated,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import UserProfileContent from '../components/UserProfileContent';
import * as Notifications from 'expo-notifications';
import CallWaitingPopup from 'components/calling/CallWaitingPopup';
import apiChatSupportService from 'services/apiChatSupport';

const { width,height } = Dimensions.get('window');

const TraineeDetailScreen = () => {
    const { user,loading: authLoading } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute();
    const { userId } = route.params || {};

    const [userProfile,setUserProfile] = useState(null);
    const [progressComparisons,setProgressComparisons] = useState([]);
    const [loading,setLoading] = useState(true);
    const [showProgressModal,setShowProgressModal] = useState(false);
    const [showImagePreview,setShowImagePreview] = useState(false);
    const [selectedImage,setSelectedImage] = useState(null);
    const [imageLoading,setImageLoading] = useState(false);
    const [imageLoadError,setImageLoadError] = useState(false);
    const [showCallWaitingPopup,setShowCallWaitingPopup] = useState(false);
    const [currentRoomId,setCurrentRoomId] = useState(null);
    const imageTimeoutRef = useRef(null);
    const notificationListener = useRef();
    const responseListener = useRef();

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        if (authLoading) return;
        if (!userId) {
            showErrorFetchAPI(new Error('Invalid user ID'));
            navigation.goBack();
            return;
        }

        const fetchUserDetails = async () => {
            try {
                setLoading(true);
                const [userResponse,progressResponse] = await Promise.all([
                    trainerService.viewUserForTrainer(userId),
                    trainerService.viewProgressUserForTrainer(userId),
                ]);

                if (userResponse.statusCode === 200 && userResponse.data) {
                    setUserProfile(userResponse.data.user);
                } else {
                    showErrorFetchAPI(new Error('User details not found.'));
                    navigation.goBack();
                }

                if (progressResponse.statusCode === 200 && progressResponse.data) {
                    setProgressComparisons(progressResponse.data.progressComparisons || []);
                } else {
                    console.log('No progress comparisons found');
                }

                Animated.parallel([
                    Animated.timing(fadeAnim,{
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(slideAnim,{
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ]).start();
            } catch (error) {
                showErrorFetchAPI(error);
                navigation.goBack();
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    },[authLoading,userId,navigation]);

    useEffect(() => {
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request.content.data;
            if (data.type === 'call-accepted' && data.roomId && data.roomId === currentRoomId) {
                setShowCallWaitingPopup(false);
                setCurrentRoomId(null);
                navigation.navigate('VideoCallSupport',{ roomId: data.roomId });
            } else if (data.type === 'call-rejected' && data.roomId && data.roomId === currentRoomId) {
                setShowCallWaitingPopup(false);
                setCurrentRoomId(null);
                showErrorFetchAPI(`Call was rejected by ${data.rejectorId}`);
            }
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            if (data.type === 'call-incoming' && data.roomId) {
                navigation.navigate('VideoCallSupport',{ roomId: data.roomId });
            }
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    },[navigation,currentRoomId]);

    const formatDate = (dateString) => {
        if (!dateString || dateString === '0001-01-01T00:00:00') return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US',{
                month: 'short',
                day: 'numeric',
                year: 'numeric',
            });
        } catch {
            return 'Unknown';
        }
    };

    const handleImagePress = (imageUrl) => {
        console.log('Image pressed:',imageUrl);
        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim() !== '') {
            setSelectedImage(imageUrl);
            setImageLoading(true);
            setImageLoadError(false);
            setShowImagePreview(true);

            const timeoutId = setTimeout(() => {
                setImageLoading(false);
                setImageLoadError(true);
                showErrorFetchAPI(new Error('Image loading timed out.'));
                setShowImagePreview(false);
            },10000);

            imageTimeoutRef.current = timeoutId;
        } else {
            showErrorFetchAPI(new Error('Invalid or empty image URL'));
        }
    };

    const handleContactTrainee = async () => {
        try {
            setLoading(true);
            if (!user?.userId || !userId) {
                throw new Error('User data not found');
            }

            const response = await apiChatSupportService.createCallRoom({
                userId: user.userId,
                trainerId: userId
            });

            if (response.statusCode === 200 && response.data) {
                setCurrentRoomId(response.data.roomId);
                setShowCallWaitingPopup(true);
                showSuccessMessage("Call request sent to trainee. Waiting for response...");
            } else {
                throw new Error(response.message || 'Failed to create call room');
            }
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseImagePreview = () => {
        setShowImagePreview(false);
        setSelectedImage(null);
        setImageLoading(false);
        setImageLoadError(false);
        if (imageTimeoutRef.current) {
            clearTimeout(imageTimeoutRef.current);
        }
    };

    const getProgressChangeColor = (value) => {
        if (value > 0) return '#10B981';
        if (value < 0) return '#EF4444';
        return '#64748B';
    };

    const getProgressChangeIcon = (value) => {
        if (value > 0) return 'trending-up';
        if (value < 0) return 'trending-down';
        return 'remove';
    };

    const renderLoadingScreen = () => (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <View style={styles.loadingContainer}>
                <View style={styles.loadingCard}>
                    <View style={styles.loadingIconContainer}>
                        <ActivityIndicator size="large" color="#0056D2" />
                    </View>
                    <Text style={styles.loadingTitle}>Loading Trainee Details</Text>
                    <Text style={styles.loadingSubtext}>Fetching profile and progress data...</Text>
                </View>
            </View>
        </SafeAreaView>
    );

    const renderProgressModal = () => (
        <Modal
            visible={showProgressModal}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowProgressModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.progressModalContent}>
                    <View style={styles.modalHandle} />
                    <View style={styles.modalHeader}>
                        <View style={styles.modalTitleContainer}>
                            <View style={styles.modalIconContainer}>
                                <Ionicons name="analytics" size={24} color="#0056D2" />
                            </View>
                            <View>
                                <Text style={styles.modalTitle}>Progress Comparisons</Text>
                                <Text style={styles.modalSubtitle}>Track transformation journey</Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowProgressModal(false)}
                        >
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.progressContainer}
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                        scrollEventThrottle={16}
                    >
                        {progressComparisons.length > 0 ? (
                            progressComparisons.map((comparison) => (
                                <View key={comparison.comparisonId} style={styles.progressCard}>
                                    <View style={styles.progressCardHeader}>
                                        <View style={styles.progressTitleContainer}>
                                            <Text style={styles.progressTitle}>{comparison.description}</Text>
                                            <Text style={styles.progressDate}>{formatDate(comparison.comparisonDate)}</Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.statusBadge,
                                                {
                                                    backgroundColor: comparison.status === 'active' ? '#10B98115' : '#EF444415',
                                                },
                                            ]}
                                        >
                                            <Ionicons
                                                name={comparison.status === 'active' ? 'checkmark-circle' : 'pause-circle'}
                                                size={12}
                                                color={comparison.status === 'active' ? '#10B981' : '#EF4444'}
                                            />
                                            <Text
                                                style={[
                                                    styles.statusText,
                                                    {
                                                        color: comparison.status === 'active' ? '#10B981' : '#EF4444',
                                                    },
                                                ]}
                                            >
                                                {comparison.status.charAt(0).toUpperCase() + comparison.status.slice(1)}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.progressMetrics}>
                                        <View style={styles.metricCard}>
                                            <View style={styles.metricHeader}>
                                                <View
                                                    style={[
                                                        styles.metricIcon,
                                                        { backgroundColor: `${getProgressChangeColor(comparison.weightChange)}15` },
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={getProgressChangeIcon(comparison.weightChange)}
                                                        size={16}
                                                        color={getProgressChangeColor(comparison.weightChange)}
                                                    />
                                                </View>
                                                <Text style={styles.metricLabel}>Weight Change</Text>
                                            </View>
                                            <Text
                                                style={[
                                                    styles.metricValue,
                                                    { color: getProgressChangeColor(comparison.weightChange) },
                                                ]}
                                            >
                                                {comparison.weightChange > 0 ? '+' : ''}{comparison.weightChange} kg
                                            </Text>
                                        </View>
                                        <View style={styles.metricCard}>
                                            <View style={styles.metricHeader}>
                                                <View
                                                    style={[
                                                        styles.metricIcon,
                                                        { backgroundColor: `${getProgressChangeColor(comparison.bodyFatChange)}15` },
                                                    ]}
                                                >
                                                    <Ionicons
                                                        name={getProgressChangeIcon(comparison.bodyFatChange)}
                                                        size={16}
                                                        color={getProgressChangeColor(comparison.bodyFatChange)}
                                                    />
                                                </View>
                                                <Text style={styles.metricLabel}>Body Fat Change</Text>
                                            </View>
                                            <Text
                                                style={[
                                                    styles.metricValue,
                                                    { color: getProgressChangeColor(comparison.bodyFatChange) },
                                                ]}
                                            >
                                                {comparison.bodyFatChange > 0 ? '+' : ''}{comparison.bodyFatChange}%
                                            </Text>
                                        </View>
                                    </View>
                                    {comparison.progressPhotos && comparison.progressPhotos.length > 0 && (
                                        <View style={styles.photosSection}>
                                            <View style={styles.photosSectionHeader}>
                                                <Ionicons name="images" size={16} color="#0056D2" />
                                                <Text style={styles.photosSectionTitle}>Progress Photos</Text>
                                            </View>
                                            <View style={styles.photosContainer}>
                                                <TouchableOpacity
                                                    style={styles.photoCard}
                                                    activeOpacity={0.8}
                                                    onPress={() => handleImagePress(comparison.progressPhotos[0]?.beforePhotoUrl)}
                                                >
                                                    <View style={styles.photoHeader}>
                                                        <Text style={styles.photoLabel}>Before</Text>
                                                    </View>
                                                    <Image
                                                        source={{
                                                            uri:
                                                                comparison.progressPhotos[0]?.beforePhotoUrl ||
                                                                'https://via.placeholder.com/120x120/E2E8F0/64748B?text=Before',
                                                            cache: 'force-cache',
                                                        }}
                                                        style={styles.progressImage}
                                                        onError={(e) => console.log('Before image load error:',e.nativeEvent)}
                                                    />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.photoCard}
                                                    activeOpacity={0.8}
                                                    onPress={() => handleImagePress(comparison.progressPhotos[0]?.afterPhotoUrl)}
                                                >
                                                    <View style={styles.photoHeader}>
                                                        <Text style={styles.photoLabel}>After</Text>
                                                    </View>
                                                    <Image
                                                        source={{
                                                            uri:
                                                                comparison.progressPhotos[0]?.afterPhotoUrl ||
                                                                'https://via.placeholder.com/120x120/E2E8F0/64748B?text=After',
                                                            cache: 'force-cache',
                                                        }}
                                                        style={styles.progressImage}
                                                        onError={(e) => console.log('After image load error:',e.nativeEvent)}
                                                    />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                    {comparison.progressPhotos?.[0]?.notes && (
                                        <View style={styles.notesContainer}>
                                            <View style={styles.notesHeader}>
                                                <Ionicons name="document-text" size={14} color="#0056D2" />
                                                <Text style={styles.notesTitle}>Notes</Text>
                                            </View>
                                            <Text style={styles.notesText}>{comparison.progressPhotos[0].notes}</Text>
                                        </View>
                                    )}
                                </View>
                            ))
                        ) : (
                            <View style={styles.noProgressContainer}>
                                <View style={styles.noProgressIcon}>
                                    <Ionicons name="analytics-outline" size={64} color="#94A3B8" />
                                </View>
                                <Text style={styles.noProgressTitle}>No Progress Data</Text>
                                <Text style={styles.noProgressText}>
                                    Progress comparisons will appear here once the trainee starts tracking their journey.
                                </Text>
                            </View>
                        )}
                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );

    const renderImagePreview = () => (
        <Modal
            visible={showImagePreview}
            transparent={true}
            animationType="fade"
            onRequestClose={handleCloseImagePreview}
        >
            <View style={styles.imagePreviewOverlay}>
                <TouchableOpacity
                    style={styles.imagePreviewCloseButton}
                    onPress={handleCloseImagePreview}
                >
                    <View style={styles.closeButtonContainer}>
                        <Ionicons name="close" size={24} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>
                <View style={styles.imageContainer}>
                    {imageLoading && (
                        <View style={styles.imageLoadingContainer}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                            <Text style={styles.imageLoadingText}>Loading image...</Text>
                        </View>
                    )}
                    {imageLoadError ? (
                        <View style={styles.imageErrorContainer}>
                            <Ionicons name="alert-circle-outline" size={64} color="#FFFFFF" />
                            <Text style={styles.imageErrorText}>Failed to load image</Text>
                        </View>
                    ) : (
                        <Image
                            source={{ uri: selectedImage,cache: 'force-cache' }}
                            style={styles.fullScreenImage}
                            resizeMode="contain"
                            onLoad={() => {
                                setImageLoading(false);
                                if (imageTimeoutRef.current) {
                                    clearTimeout(imageTimeoutRef.current);
                                }
                            }}
                            onError={() => {
                                setImageLoading(false);
                                setImageLoadError(true);
                                if (imageTimeoutRef.current) {
                                    clearTimeout(imageTimeoutRef.current);
                                }
                            }}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );

    if (loading || !userProfile) return renderLoadingScreen();

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#0056D2" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>{userProfile.fullName || 'Trainee Profile'}</Text>
                        <Text style={styles.headerSubtitle}>Client Details & Progress</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.progressButton}
                        onPress={() => setShowProgressModal(true)}
                    >
                        <View style={styles.progressButtonContent}>
                            <Ionicons name="analytics" size={20} color="#FFFFFF" />
                            {progressComparisons.length > 0 && (
                                <View style={styles.progressBadge}>
                                    <Text style={styles.progressBadgeText}>{progressComparisons.length}</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>
            </Animated.View>
            <Animated.View
                style={[
                    styles.contentContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <UserProfileContent
                    userProfile={userProfile}
                    formatDate={formatDate}
                    onClose={() => navigation.goBack()}
                />
                <View style={styles.actionsSection}>
                    <TouchableOpacity
                        style={styles.contactButton}
                        onPress={handleContactTrainee}
                        disabled={showCallWaitingPopup || loading}
                    >
                        <Ionicons name="chatbubble-outline" size={20} color="#0056D2" />
                        <Text style={styles.contactButtonText}>Contact Trainee</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
            {renderProgressModal()}
            {renderImagePreview()}
            <CallWaitingPopup
                visible={showCallWaitingPopup}
                setVisible={setShowCallWaitingPopup}
                roomId={currentRoomId}
                userId={user?.userId}
                setRoomId={setCurrentRoomId}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 10,
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0056D215',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },
    progressButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#0056D2',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    progressButtonContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressBadge: {
        position: 'absolute',
        top: -18,
        right: -15,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    progressBadgeText: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '700',
    },
    contentContainer: {
        flex: 1,
    },
    actionsSection: {
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 24,
    },
    contactButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingVertical: 16,
        borderWidth: 2,
        borderColor: '#0056D2',
        gap: 8,
    },
    contactButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0056D2',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 8,
        width: '100%',
        maxWidth: 320,
    },
    loadingIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#0056D215',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    loadingTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    loadingSubtext: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    progressModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingHorizontal: 20,
        paddingBottom: 20,
        height: '85%',
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CBD5E1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#0056D215',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        marginTop: 2,
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressContainer: {
        flex: 1,
    },
    progressCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    progressCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    progressTitleContainer: {
        flex: 1,
        marginRight: 12,
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    progressDate: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    progressMetrics: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    metricHeader: {
        alignItems: 'center',
        marginBottom: 8,
    },
    metricIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    metricLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '800',
        textAlign: 'center',
    },
    photosSection: {
        marginBottom: 16,
    },
    photosSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    photosSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    photosContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    photoCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    photoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    photoLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    progressImage: {
        width: '100%',
        height: 120,
        borderRadius: 8,
        resizeMode: 'cover',
        backgroundColor: '#F1F5F9',
    },
    notesContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#0056D2',
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    notesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    notesText: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
    },
    noProgressContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginVertical: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    noProgressIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    noProgressTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 8,
        textAlign: 'center',
    },
    noProgressText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 280,
    },
    imagePreviewOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imagePreviewCloseButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 20,
        zIndex: 10,
    },
    closeButtonContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    imageLoadingContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    imageLoadingText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
    },
    fullScreenImage: {
        width: width - 40,
        height: height * 0.7,
        borderRadius: 12,
    },
    imageErrorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageErrorText: {
        fontSize: 18,
        color: '#FFFFFF',
        textAlign: 'center',
        fontWeight: '500',
        marginTop: 16,
    },
});

export default TraineeDetailScreen;