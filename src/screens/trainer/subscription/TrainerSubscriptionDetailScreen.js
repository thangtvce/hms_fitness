import React,{ useState,useEffect,useRef,useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
    Platform,
    Dimensions,
    FlatList,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';
import Header from 'components/Header';

const { width } = Dimensions.get('window');

const TrainerSubscriptionDetailScreen = () => {
    const { user,loading: authLoading } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute();
    const { subscriptionId } = route.params || {};
    const [subscriptionData,setSubscriptionData] = useState(null);
    const [ratingData,setRatingData] = useState(null);
    const [workoutPlans,setWorkoutPlans] = useState([]);
    const [loading,setLoading] = useState(true);
    const [showConfirmModal,setShowConfirmModal] = useState(false);
    const [confirmMessage,setConfirmMessage] = useState('');
    const [confirmAction,setConfirmAction] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        if (authLoading) return;

        if (!subscriptionId || subscriptionId < 1) {
            showErrorFetchAPI(new Error('Invalid subscription ID'));
            navigation.goBack();
            return;
        }

        const fetchSubscriptionDetails = async () => {
            try {
                setLoading(true);
                const [subResponse,ratingResponse,plansResponse] = await Promise.all([
                    trainerService.getMySubscriptionById(subscriptionId),
                    trainerService.getTrainerRatingsBySubscriptionId(subscriptionId),
                    trainerService.getWorkoutPlansBySubscriptionId(subscriptionId,{
                        PageNumber: 1,
                        PageSize: 100,
                    }),
                ]);

                if (subResponse.statusCode === 200 && subResponse.data) {
                    setSubscriptionData(subResponse.data);
                } else {
                    throw new Error('Subscription not found.');
                }

                if (ratingResponse.statusCode === 200 && ratingResponse.data) {
                    setRatingData(ratingResponse.data);
                } else {
                    setRatingData(null);
                }

                if (plansResponse.statusCode === 200 && Array.isArray(plansResponse.data?.plans)) {
                    setWorkoutPlans(
                        plansResponse.data.plans.map((item,index) => ({
                            ...item,
                            _key: item.planId ? `plan-${item.planId}` : `plan-unknown-${Date.now()}-${index}`,
                        }))
                    );
                } else {
                    setWorkoutPlans([]);
                }

                startAnimations();
            } catch (error) {
                showErrorFetchAPI(error);
                navigation.goBack();
            } finally {
                setLoading(false);
            }
        };

        fetchSubscriptionDetails();
    },[authLoading,subscriptionId,navigation]);

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
        if (!dateString || dateString === '0001-01-01T00:00:00') return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('en-US',{
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return 'N/A';
        }
    };

    const renderRatingStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= rating ? 'star' : 'star-outline'}
                    size={16}
                    color={i <= rating ? '#F59E0B' : '#CBD5E1'}
                />
            );
        }
        return <View style={styles.starContainer}>{stars}</View>;
    };

    const handleDeletePlan = async (planId) => {
        try {
            const response = await trainerService.deleteWorkoutPlan(planId);
            if (response.statusCode === 200) {
                showSuccessMessage('Workout plan deleted successfully.');
                setWorkoutPlans((prev) => prev.filter((plan) => plan.planId !== planId));
            } else {
                throw new Error(response.message || 'Failed to delete workout plan.');
            }
        } catch (error) {
            showErrorFetchAPI(error);
        }
    };

    const confirmDeletePlan = (planId,planName) => {
        setConfirmMessage(`Are you sure you want to delete the workout plan "${planName}"?`);
        setConfirmAction(() => () => handleDeletePlan(planId));
        setShowConfirmModal(true);
    };

    const renderLoadingScreen = () => (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <CommonSkeleton />
        </SafeAreaView>
    );

    const renderSubscriptionInfo = () => {
        const statusInfo = {
            paid: { color: '#22C55E',bgColor: '#DCFCE7',text: 'Paid' },
            systempaid: { color: '#22C55E',bgColor: '#DCFCE7',text: 'System Paid' },
            pending: { color: '#F59E0B',bgColor: '#FEF3C7',text: 'Pending' },
            canceled: { color: '#EF4444',bgColor: '#FEE2E2',text: 'Canceled' },
            active: { color: '#22C55E',bgColor: '#DCFCE7',text: 'Active' },
        }[subscriptionData?.status?.toLowerCase()] || { color: '#6B7280',bgColor: '#E5E7EB',text: subscriptionData?.status || 'Unknown' };

        return (
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
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Subscription #{subscriptionData?.subscriptionId || 'Unknown'}</Text>
                        <View style={styles.statItem}>
                            <Ionicons name="person-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText} numberOfLines={2}>
                                User: {subscriptionData?.userFullName || 'Unknown'}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="mail-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText} numberOfLines={2}>
                                Email: {subscriptionData?.userEmail || 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="pricetag-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText} numberOfLines={2}>
                                Package: {subscriptionData?.packageName || 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="cash-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText}>
                                Price: {subscriptionData?.packagePrice ? `$${subscriptionData.packagePrice.toLocaleString()}` : 'N/A'}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="calendar-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText}>Start: {formatDate(subscriptionData?.startDate)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="calendar-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText}>End: {formatDate(subscriptionData?.endDate)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="checkmark-circle-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText}>Status: {statusInfo.text}</Text>
                        </View>
                        <View style={[styles.statusIndicator,{ backgroundColor: statusInfo.bgColor }]}>
                            <View style={[styles.statusDot,{ backgroundColor: statusInfo.color }]} />
                            <Text style={[styles.statusText,{ color: statusInfo.color }]}>{statusInfo.text}</Text>
                        </View>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="shield-checkmark" size={16} color="#22C55E" />
                            <Text style={styles.verifiedText}>Verified by HMS</Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    };

    const renderRatingInfo = () => {
        if (!ratingData) {
            return (
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
                        <Text style={styles.sectionTitle}>Rating Details</Text>
                        <View style={styles.infoCard}>
                            <Text style={styles.noRatingText}>No rating available for this subscription.</Text>
                        </View>
                    </View>
                </Animated.View>
            );
        }

        const ratingStatusInfo = {
            active: { color: '#22C55E',bgColor: '#DCFCE7',text: 'Active' },
            inactive: { color: '#EF4444',bgColor: '#FEE2E2',text: 'Inactive' },
        }[ratingData?.status?.toLowerCase()] || { color: '#6B7280',bgColor: '#E5E7EB',text: ratingData?.status || 'Unknown' };

        return (
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
                    <Text style={styles.sectionTitle}>Rating Details</Text>
                    <View style={styles.infoCard}>
                        <View style={styles.statItem}>
                            <Ionicons name="star-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText}>Rating: {renderRatingStars(ratingData.rating)}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="person-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText} numberOfLines={2}>
                                User: {ratingData.userFullName || 'Unknown'}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="chatbubble-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText} numberOfLines={3}>
                                Feedback: {ratingData.feedbackText || 'No feedback provided'}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="calendar-outline" size={16} color="#0056D2" />
                            <Text style={styles.statText}>Rated on: {formatDate(ratingData.createdAt)}</Text>
                        </View>
                        <View style={[styles.statusIndicator,{ backgroundColor: ratingStatusInfo.bgColor }]}>
                            <View style={[styles.statusDot,{ backgroundColor: ratingStatusInfo.color }]} />
                            <Text style={[styles.statusText,{ color: ratingStatusInfo.color }]}>{ratingStatusInfo.text}</Text>
                        </View>
                    </View>
                </View>
            </Animated.View>
        );
    };

    const renderCreatePlanHeader = () => (
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

                {
                    (subscriptionData?.status === "paid" || subscriptionData?.status === "systempaid") && (
                        <View style={styles.createGroupCard}>
                            <View style={styles.createGroupContent}>
                                <View style={styles.createGroupLeft}>
                                    <View style={styles.createGroupIcon}>
                                        <Ionicons name="add-circle" size={32} color="#0056D2" />
                                    </View>
                                    <View style={styles.createGroupText}>
                                        <Text style={styles.createGroupTitle}>Create Workout Plan</Text>
                                        <Text style={styles.createGroupSubtitle}>Design a new workout plan for this subscription</Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.createGroupButton}
                                    onPress={() =>
                                        navigation.navigate('AddWorkoutPlanScreen',{
                                            subscriptionId,
                                            userId: subscriptionData?.userId,
                                            trainerId: subscriptionData?.trainerId,
                                        })
                                    }
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.createGroupButtonText}>Create</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#0056D2" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )
                }
            </View>
        </Animated.View>
    );

    const renderPlanItem = ({ item }) => {
        const statusInfo = {
            active: { color: '#22C55E',bgColor: '#DCFCE7',text: 'Active' },
            inactive: { color: '#EF4444',bgColor: '#FEE2E2',text: 'Inactive' },
        }[item?.status?.toLowerCase()] || { color: '#6B7280',bgColor: '#E5E7EB',text: item.status || 'Unknown' };

        return (
            <Animated.View
                style={[
                    styles.planCard,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() =>
                        navigation.navigate('TrainerWorkoutPlanDetailScreen',{ planId: item.planId })
                    }
                    style={styles.planCardContent}
                >
                    <View style={styles.planCardHeader}>
                        <View style={styles.headerLeft}>
                            <View style={styles.avatarContainer}>
                                <Ionicons name="fitness" size={24} color="#0056D2" />
                            </View>
                            <View style={styles.planDetails}>
                                <Text style={styles.planName} numberOfLines={1}>
                                    {item.planName || 'Workout Plan'}
                                </Text>
                                <View style={styles.statsRow}>
                                    <View style={styles.memberStat}>
                                        <Ionicons name="person-outline" size={14} color="#6B7280" />
                                        <Text style={styles.memberCount} numberOfLines={1}>
                                            User: {item.userFullName || 'Unknown'}
                                        </Text>
                                    </View>
                                    <View style={styles.statusIndicator}>
                                        <View style={[styles.statusDot,{ backgroundColor: statusInfo.color }]} />
                                        <Text style={[styles.statusText,{ color: statusInfo.color }]}>{statusInfo.text}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                    <View style={styles.descriptionSection}>
                        <Text style={styles.descriptionText} numberOfLines={1}>
                            {item?.description ? item?.description.replace(/<[^>]+>/g,'') : 'No description available'}
                        </Text>
                        <Text style={styles.dateText}>Start: {formatDate(item.startDate)}</Text>
                        <Text style={styles.dateText}>End: {formatDate(item.endDate)}</Text>
                        <Text style={styles.dateText}>Frequency: {item.frequencyPerWeek || 'N/A'} days/week</Text>
                        <Text style={styles.dateText}>Duration: {item.durationMinutes || 'N/A'} minutes</Text>
                    </View>
                </TouchableOpacity>
                <View style={styles.planActions}>
                    <TouchableOpacity
                        style={styles.editBtn}
                        onPress={() =>
                            navigation.navigate('EditWorkoutPlanScreen',{
                                planId: item.planId,
                                subscriptionId: item.subscriptionId,
                                userId: item.userId,
                                trainerId: item.trainerId,
                            })
                        }
                    >
                        <Ionicons name="pencil" size={16} color="#0056D2" />
                        <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => confirmDeletePlan(item.planId,item.planName)}
                    >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        );
    };

    const renderWorkoutPlans = () => (
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
                <Text style={styles.sectionTitle}>Workout Plans</Text>
                {workoutPlans.length === 0 ? (
                    <View style={styles.infoCard}>
                        <Text style={styles.noRatingText}>No workout plans available for this subscription.</Text>
                    </View>
                ) : null}
            </View>
        </Animated.View>
    );

    if (loading) return renderLoadingScreen();

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <Header
                title="Subscription Details"
                onBack={() => navigation.goBack()}
                backIconColor="#0056D2"
            />

            <FlatList
                data={workoutPlans}
                keyExtractor={(item) => item._key}
                renderItem={renderPlanItem}
                ListHeaderComponent={() => (
                    <>
                        {renderCreatePlanHeader()}
                        {renderSubscriptionInfo()}
                        {renderRatingInfo()}
                        {renderWorkoutPlans()}
                    </>
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
            />
            <Modal
                visible={showConfirmModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowConfirmModal(false)}
            >
                <View style={styles.confirmModalOverlay}>
                    <View style={styles.confirmModalContent}>
                        <Text style={styles.confirmModalTitle}>Confirm Action</Text>
                        <Text style={styles.confirmModalText}>{confirmMessage}</Text>
                        <View style={styles.confirmModalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.confirmButton}
                                onPress={async () => {
                                    await confirmAction();
                                    setShowConfirmModal(false);
                                }}
                            >
                                <Text style={styles.confirmButtonText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 10 : 0,
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
    headerRight: {
        width: 40,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1E293B',
    },
    listContainer: {
        padding: 20,
        paddingBottom: 50,
        marginTop: 70
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#0056D2',
        marginTop: 15,
        fontWeight: '500',
    },
    infoSection: {
        marginBottom: 24,
    },
    infoContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 12,
    },
    infoCard: {
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
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        flexWrap: 'wrap',
    },
    statText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
        flex: 1,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 5,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 4,
    },
    verifiedText: {
        fontSize: 12,
        color: '#22C55E',
        fontWeight: '600',
    },
    starContainer: {
        flexDirection: 'row',
        gap: 2,
    },
    noRatingText: {
        fontSize: 16,
        color: '#64748B',
        fontStyle: 'italic',
        textAlign: 'center',
        marginVertical: 12,
    },
    createGroupCard: {
        borderRadius: 16,
        padding: 20,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    createGroupContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    createGroupLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    createGroupIcon: {
        marginRight: 15,
    },
    createGroupText: {
        flex: 1,
    },
    createGroupTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    createGroupSubtitle: {
        fontSize: 14,
        color: '#64748B',
    },
    createGroupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    createGroupButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0056D2',
    },
    planCard: {
        marginBottom: 15,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    planCardContent: {
        padding: 20,
    },
    planCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    planDetails: {
        flex: 1,
    },
    planName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 6,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    memberStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        flex: 1,
    },
    memberCount: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    descriptionSection: {
        marginBottom: 15,
    },
    descriptionText: {
        fontSize: 14,
        color: '#64748B',
        lineHeight: 20,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        marginBottom: 5,
    },
    dateText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    planActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DBEAFE',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    editBtnText: {
        fontSize: 12,
        color: '#0056D2',
        fontWeight: '600',
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    deleteBtnText: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '600',
    },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmModalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 350,
    },
    confirmModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 10,
        textAlign: 'center',
    },
    confirmModalText: {
        fontSize: 16,
        color: '#64748B',
        marginBottom: 20,
        textAlign: 'center',
    },
    confirmModalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: '#0056D2',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

export default TrainerSubscriptionDetailScreen;