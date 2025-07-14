import React,{ useState,useEffect,useRef,useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Platform,
    Image,
    Dimensions,
    ScrollView,
} from 'react-native';
import { Ionicons,MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width } = Dimensions.get('window');

const TrainerPayoutDetailScreen = () => {
    const { user,loading: authLoading } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute();
    const { payoutId } = route.params || {};
    const [payoutData,setPayoutData] = useState(null);
    const [loading,setLoading] = useState(true);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        if (authLoading) return;

        if (!payoutId) {
            showErrorFetchAPI(new Error('Invalid payout ID'));
            navigation.goBack();
            return;
        }

        const fetchPayoutDetails = async () => {
            try {
                setLoading(true);
                const response = await trainerService.getMyPayoutsById(payoutId);
                if (response.statusCode === 200 && response.data) {
                    if (response.data.trainerId === user.userId) {
                        setPayoutData(response.data);
                        startAnimations();
                    } else {
                        showErrorFetchAPI(new Error('You do not have permission to view this payout.'));
                        navigation.goBack();
                    }
                } else {
                    showErrorFetchAPI(new Error('Payout not found.'));
                    navigation.goBack();
                }
            } catch (error) {
                showErrorFetchAPI(error);
                navigation.goBack();
            } finally {
                setLoading(false);
            }
        };

        fetchPayoutDetails();
    },[authLoading,user,payoutId,navigation]);

    const startAnimations = () => {
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
    };

    const formatDate = (dateString) => {
        if (!dateString || dateString === '0001-01-01T00:00:00') return 'Unknown';
        try {
            return new Date(dateString).toLocaleDateString('en-US',{
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'Unknown';
        }
    };

    const renderLoadingScreen = () => (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0056D2" />
                <Text style={styles.loadingText}>Loading payout details...</Text>
            </View>
        </SafeAreaView>
    );

    const renderImageSection = () => (
        <Animated.View
            style={[
                styles.imageSection,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.imageContainer}>
                <Image
                    source={{
                        uri:
                            payoutData?.trainerAvatar ||
                            'https://static.ladipage.net/5cf71dc895e50d03de993a28/untitled-1-01-20240406073058-6op7o.png',
                    }}
                    style={styles.imagePreview}
                />
                <View style={styles.imageLabel}>
                    <Ionicons name="image" size={14} color="#FFFFFF" />
                    <Text style={styles.imageLabelText}>Trainer Avatar</Text>
                </View>
            </View>
        </Animated.View>
    );

    const renderPayoutInfo = () => (
        <Animated.View
            style={[
                styles.infoSection,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.infoContainer}>
                <Text style={styles.packageName}>Payout #{payoutData?.payoutId || 'Unknown'}</Text>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="cash-outline" size={16} color="#0056D2" />
                        <Text style={styles.statText}>
                            {payoutData?.amount ? `$${payoutData.amount.toLocaleString()}` : 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="calendar-outline" size={16} color="#0056D2" />
                        <Text style={styles.statText}>Payout {formatDate(payoutData?.payoutDate)}</Text>
                    </View>
                </View>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="person-outline" size={16} color="#0056D2" />
                        <Text style={styles.statText}>{payoutData?.trainerFullName || 'Unknown'}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="mail-outline" size={16} color="#0056D2" />
                        <Text style={styles.statText}>{payoutData?.trainerEmail || 'N/A'}</Text>
                    </View>
                </View>
                <View style={styles.statusRow}>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: payoutData?.status === 'completed' ? '#DCFCE7' : '#FEE2E2' },
                        ]}
                    >
                        <Ionicons
                            name="pulse"
                            size={14}
                            color={payoutData?.status === 'completed' ? '#22C55E' : '#F59E0B'}
                        />
                        <Text
                            style={[
                                styles.statusText,
                                { color: payoutData?.status === 'completed' ? '#22C55E' : '#F59E0B' },
                            ]}
                        >
                            {payoutData?.status
                                ? payoutData.status.charAt(0).toUpperCase() + payoutData.status.slice(1)
                                : 'Unknown'}
                        </Text>
                    </View>
                    <View style={styles.trustBadge}>
                        <Ionicons name="checkmark-circle-outline" size={14} color="#0056D2" />
                        <Text style={styles.trustBadgeText}>Verified by HMS</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );

    const renderNotes = () => (
        <Animated.View
            style={[
                styles.descriptionSection,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.fieldContainer}>
                <View style={styles.fieldHeader}>
                    <View style={styles.fieldLabelContainer}>
                        <Ionicons name="document-text-outline" size={20} color="#0056D2" />
                        <Text style={styles.fieldLabel}>Notes</Text>
                    </View>
                </View>
                {payoutData?.notes ? (
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.descriptionText}>{payoutData.notes}</Text>
                    </View>
                ) : (
                    <View style={styles.noDescriptionContainer}>
                        <Text style={styles.noDescriptionText}>No notes available.</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );

    const renderDetails = () => (
        <Animated.View
            style={[
                styles.statsSection,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.fieldContainer}>
                <View style={styles.fieldHeader}>
                    <View style={styles.fieldLabelContainer}>
                        <Ionicons name="information-circle-outline" size={20} color="#0056D2" />
                        <Text style={styles.fieldLabel}>Payout Details</Text>
                    </View>
                </View>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statCardLabel}>Payment Method</Text>
                        <Text style={styles.statCardValue}>
                            {payoutData?.paymentMethod === 'bank_transfer'
                                ? 'Bank Transfer'
                                : payoutData?.paymentMethod === 'card'
                                    ? 'Card'
                                    : 'Other'}
                        </Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statCardLabel}>Transaction Reference</Text>
                        <Text style={styles.statCardValue}>{payoutData?.transactionReference || 'N/A'}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );

    const renderTimeline = () => (
        <Animated.View
            style={[
                styles.timelineSection,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.fieldContainer}>
                <View style={styles.fieldHeader}>
                    <View style={styles.fieldLabelContainer}>
                        <Ionicons name="time-outline" size={20} color="#0056D2" />
                        <Text style={styles.fieldLabel}>Timeline</Text>
                    </View>
                </View>
                <View style={styles.timelineGrid}>
                    <View style={styles.timelineCard}>
                        <Text style={styles.timelineCardLabel}>Created</Text>
                        <Text style={styles.timelineCardValue}>{formatDate(payoutData?.createdAt)}</Text>
                    </View>
                    <View style={styles.timelineCard}>
                        <Text style={styles.timelineCardLabel}>Last Updated</Text>
                        <Text style={styles.timelineCardValue}>
                            {payoutData?.updatedAt ? formatDate(payoutData.updatedAt) : 'Never'}
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );

    if (loading || !payoutData) return renderLoadingScreen();

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#0056D2" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Payout #{payoutData?.payoutId || 'Unknown'}</Text>
                    </View>
                    <View style={{ width: 44 }} />
                </View>
            </View>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderImageSection()}
                {renderPayoutInfo()}
                {renderNotes()}
                {renderDetails()}
                {renderTimeline()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 10 : 10,
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        marginHorizontal: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        padding: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
        fontWeight: '500',
    },
    imageSection: {
        marginBottom: 24,
    },
    imageContainer: {
        position: 'relative',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    imagePreview: {
        width: '100%',
        height: 200,
        resizeMode: 'cover',
    },
    imageLabel: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    imageLabelText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    infoSection: {
        marginBottom: 24,
    },
    infoContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    packageName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    statusRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    trustBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#E0F2FE',
    },
    trustBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0056D2',
    },
    descriptionSection: {
        marginBottom: 24,
    },
    fieldContainer: {
        marginBottom: 0,
    },
    fieldHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    fieldLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    fieldLabel: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E293B',
        marginLeft: 5,
    },
    descriptionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    descriptionText: {
        fontSize: 16,
        color: '#6B7280',
        lineHeight: 24,
    },
    noDescriptionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    noDescriptionText: {
        fontSize: 16,
        color: '#9CA3AF',
        fontStyle: 'italic',
    },
    statsSection: {
        marginBottom: 24,
    },
    statsGrid: {
        gap: 12,
    },
    statCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    statCardLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    statCardValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1E293B',
    },
    timelineSection: {
        marginBottom: 24,
    },
    timelineGrid: {
        gap: 12,
    },
    timelineCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    timelineCardLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    timelineCardValue: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1E293B',
    },
});

export default TrainerPayoutDetailScreen;