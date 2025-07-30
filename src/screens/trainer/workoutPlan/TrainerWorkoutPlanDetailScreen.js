import React,{ useState,useEffect,useRef,useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Animated,
    Platform,
    Dimensions,
    Modal,
} from 'react-native';
import { Ionicons,MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import HTML from 'react-native-render-html';
import UserProfileContent from '../components/UserProfileContent';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';

const { width } = Dimensions.get('window');

// Color palette aligned with TrainerPackageDetailScreen
const COLORS = {
    primary: '#0056D2',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    background: '#F8FAFC',
    cardBackground: '#FFFFFF',
    textPrimary: '#1E293B',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    border: '#E5E7EB',
    shadow: '#000',
    white: '#FFFFFF',
};

// Icon mapping for workout plans
const PLAN_ICONS = {
    strength: {
        component: MaterialCommunityIcons,
        name: 'weight-lifter',
        color: COLORS.primary,
    },
    cardio: {
        component: Ionicons,
        name: 'heart',
        color: COLORS.danger,
    },
    flexibility: {
        component: MaterialCommunityIcons,
        name: 'yoga',
        color: COLORS.success,
    },
};

// HTML styles for description
const HTML_STYLES = {
    p: { margin: 0,padding: 0,color: COLORS.textSecondary,fontSize: 16 },
    strong: { fontWeight: '700',color: COLORS.textPrimary },
    em: { fontStyle: 'italic' },
    ul: { marginVertical: 8,paddingLeft: 20 },
    ol: { marginVertical: 8,paddingLeft: 20 },
    li: { marginBottom: 6,color: COLORS.textSecondary },
    div: { margin: 0,padding: 0 },
    span: { margin: 0,padding: 0 },
    a: { color: COLORS.primary,textDecorationLine: 'underline' },
};

// Plan Icon Component
const PlanIcon = React.memo(({ type,size = 32 }) => {
    const iconConfig = PLAN_ICONS[type] || PLAN_ICONS.strength;
    const IconComponent = iconConfig.component;

    return (
        <View style={styles.iconContainer}>
            <IconComponent name={iconConfig.name} size={size} color={iconConfig.color} />
        </View>
    );
});

// Detail Item Component
const DetailItem = React.memo(({ icon,label,children,iconColor = COLORS.textSecondary }) => (
    <View style={styles.detailItem}>
        <View style={styles.detailIconWrapper}>
            <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>{label}</Text>
            <View style={styles.detailValueContainer}>{children}</View>
        </View>
    </View>
));

// Action Button Component
const ActionButton = React.memo(({ onPress,icon,text,variant = 'primary',style }) => {
    const buttonStyle = variant === 'danger' ? styles.deleteButton : styles.editButton;
    const textStyle = variant === 'danger' ? styles.deleteButtonText : styles.editButtonText;

    return (
        <TouchableOpacity style={[buttonStyle,style]} onPress={onPress} activeOpacity={0.7}>
            <Ionicons name={icon} size={20} color={COLORS.white} />
            <Text style={textStyle}>{text}</Text>
        </TouchableOpacity>
    );
});

// Status Badge Component
const StatusBadge = React.memo(({ status }) => {
    const config = status?.toLowerCase() === 'active'
        ? { color: COLORS.success,bg: '#DCFCE7',text: 'Active' }
        : { color: COLORS.danger,bg: '#FEE2E2',text: 'Inactive' };

    return (
        <View style={[styles.statusBadge,{ backgroundColor: config.bg }]}>
            <Ionicons name="pulse" size={14} color={config.color} />
            <Text style={[styles.statusText,{ color: config.color }]}>{config.text}</Text>
        </View>
    );
});

const LoadingScreen = React.memo(() => (
    <SafeAreaView style={styles.container}>
        <DynamicStatusBar backgroundColor={COLORS.background} />
        <CommonSkeleton />
    </SafeAreaView>
));

// Exercise Card Component
const ExerciseCard = React.memo(({ exercise,onEdit }) => (
    <View style={styles.exerciseCard}>
        <View style={styles.exerciseHeader}>
            <Text style={styles.exerciseName}>{exercise.exerciseName || 'Unknown'}</Text>
            <TouchableOpacity onPress={() => onEdit(exercise.planExerciseId)} activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
        <View style={styles.exerciseDetails}>
            <Text style={styles.exerciseDetailText}>Sets: {exercise.sets || 'N/A'}</Text>
            <Text style={styles.exerciseDetailText}>Reps: {exercise.reps || 'N/A'}</Text>
            <Text style={styles.exerciseDetailText}>Duration: {exercise.durationMinutes || 0} min</Text>
            <Text style={styles.exerciseDetailText}>Rest: {exercise.restTimeSeconds || 0} sec</Text>
            <Text style={styles.exerciseDetailText}>Notes: {exercise.notes || 'N/A'}</Text>
        </View>
    </View>
));

const TrainerWorkoutPlanDetailScreen = () => {
    const { user,loading: authLoading } = React.useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute();
    const { planId } = route.params || {};

    const [planData,setPlanData] = useState(null);
    const [exercises,setExercises] = useState([]);
    const [userProfile,setUserProfile] = useState(null);
    const [showUserModal,setShowUserModal] = useState(false);
    const [loading,setLoading] = useState(true);
    const [loadingExercises,setLoadingExercises] = useState(false);
    const [loadingUser,setLoadingUser] = useState(false);
    const [pageNumber,setPageNumber] = useState(1);
    const [totalPages,setTotalPages] = useState(1);
    const [showConfirmModal,setShowConfirmModal] = useState(false);
    const [confirmMessage,setConfirmMessage] = useState('');
    const [confirmAction,setConfirmAction] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Memoized plan type calculation
    const planType = React.useMemo(() => {
        if (!planData?.planName) return 'strength';
        const name = planData.planName.toLowerCase();
        if (name.includes('cardio') || name.includes('running')) return 'cardio';
        if (name.includes('yoga') || name.includes('flexibility')) return 'flexibility';
        return 'strength';
    },[planData?.planName]);

    // Format date utility
    const formatDate = useCallback((dateString) => {
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
    },[]);

    // Handlers
    const handleAddExercise = useCallback(() => {
        navigation.navigate('AddExerciseToPlanScreen',{ planId });
    },[navigation,planId]);

    const handleEditExercise = useCallback(
        (exerciseId) => {
            navigation.navigate('EditExerciseToPlanScreen',{ planExerciseId: exerciseId });
        },
        [navigation]
    );

    const handleDeletePlan = useCallback(() => {
        setConfirmMessage('Are you sure you want to delete this workout plan? This action cannot be undone.');
        setConfirmAction(() => async () => {
            try {
                const response = await trainerService.deleteWorkoutPlan(planId);
                if (response.statusCode === 200) {
                    showSuccessMessage('Workout plan deleted successfully.');
                    navigation.navigate('TrainerWorkoutPlanManagement');
                } else {
                    showErrorFetchAPI(new Error(response.message || 'Failed to delete workout plan.'));
                }
            } catch (error) {
                showErrorFetchAPI(error);
            }
        });
        setShowConfirmModal(true);
    },[navigation,planId]);

    const fetchUserProfile = useCallback(async () => {
        try {
            setLoadingUser(true);
            setShowUserModal(true);
            const response = await trainerService.viewUserForTrainer(planData.userId);
            if (response.statusCode === 200 && response.data) {
                setUserProfile(response.data.user);
            } else {
                showErrorFetchAPI(new Error('Failed to fetch user profile.'));
            }
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setLoadingUser(false);
        }
    },[planData?.userId]);

    const fetchExercises = useCallback(
        async (page) => {
            try {
                setLoadingExercises(true);
                const response = await trainerService.getPlanExerciseByPlanId(planId);
                if (response.statusCode === 200 && response.data) {
                    setExercises((prev) =>
                        page === 1 ? response.data.exercises : [...prev,...response.data.exercises]
                    );
                    setTotalPages(response.data.totalPages || 1);
                    setPageNumber(page);
                } else {
                    showErrorFetchAPI(new Error('No exercises found.'));
                }
            } catch (error) {
                showErrorFetchAPI(error);
            } finally {
                setLoadingExercises(false);
            }
        },
        [planId]
    );

    const handleLoadMore = useCallback(() => {
        if (pageNumber < totalPages && !loadingExercises) {
            fetchExercises(pageNumber + 1);
        }
    },[pageNumber,totalPages,loadingExercises,fetchExercises]);

    // Animation effect
    useEffect(() => {
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
    },[fadeAnim,slideAnim]);

    // Data fetching effect
    useEffect(() => {
        if (authLoading) return;

        if (!planId) {
            showErrorFetchAPI(new Error('Invalid plan ID'));
            navigation.goBack();
            return;
        }

        const fetchPlanDetails = async () => {
            try {
                setLoading(true);
                const response = await trainerService.getWorkoutPlansById(planId);
                if (response.statusCode === 200 && response.data) {
                    if (response.data.trainerId === user.userId) {
                        setPlanData(response.data);
                        await fetchExercises(1);
                    } else {
                        showErrorFetchAPI(new Error('You do not have permission to view this plan.'));
                        navigation.goBack();
                    }
                } else {
                    showErrorFetchAPI(new Error('Plan not found.'));
                    navigation.goBack();
                }
            } catch (error) {
                showErrorFetchAPI(error);
                navigation.goBack();
            } finally {
                setLoading(false);
            }
        };

        fetchPlanDetails();
    },[authLoading,user,planId,navigation,fetchExercises]);

    // Render methods
    const renderPlanHeader = () => (
        <Animated.View
            style={[
                styles.section,
                { opacity: fadeAnim,transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={styles.card}>
                <View style={styles.planHeaderContent}>
                    <PlanIcon type={planType} size={32} />
                    <View style={styles.planTitleSection}>
                        <Text style={styles.planName}>{planData.planName || 'Workout Plan'}</Text>
                        <Text style={styles.trainerText}>Trainer: You</Text>
                    </View>
                    <StatusBadge status={planData.status} />
                </View>
            </View>
        </Animated.View>
    );

    const renderPlanDetails = () => (
        <Animated.View
            style={[
                styles.section,
                { opacity: fadeAnim,transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Plan Information</Text>
                <DetailItem icon="person-outline" label="Client" iconColor={COLORS.primary}>
                    <View style={styles.clientContainer}>
                        <Text style={styles.detailText}>{planData.userFullName || 'Unknown'}</Text>
                        <TouchableOpacity style={styles.viewUserButton} onPress={fetchUserProfile}>
                            <Text style={styles.viewUserText}>View Profile</Text>
                        </TouchableOpacity>
                    </View>
                </DetailItem>
                <DetailItem icon="calendar-outline" label="Dates" iconColor={COLORS.warning}>
                    <Text style={styles.detailText}>
                        {formatDate(planData.startDate)} - {formatDate(planData.endDate)}
                    </Text>
                </DetailItem>
                <DetailItem icon="repeat-outline" label="Frequency" iconColor={COLORS.success}>
                    <Text style={styles.detailText}>{planData.frequencyPerWeek} days/week</Text>
                </DetailItem>
                <DetailItem icon="time-outline" label="Duration" iconColor={COLORS.danger}>
                    <Text style={styles.detailText}>{planData.durationMinutes} minutes</Text>
                </DetailItem>
                <DetailItem icon="document-text-outline" label="Description" iconColor={COLORS.primary}>
                    {planData.description ? (
                        <HTML
                            source={{ html: planData.description }}
                            contentWidth={width - 80}
                            baseStyle={styles.detailText}
                            tagsStyles={HTML_STYLES}
                        />
                    ) : (
                        <Text style={styles.detailText}>No description available</Text>
                    )}
                </DetailItem>
            </View>
        </Animated.View>
    );

    const renderExercises = () => (
        <Animated.View
            style={[
                styles.section,
                { opacity: fadeAnim,transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={styles.card}>
                <View style={styles.exercisesHeader}>
                    <Text style={styles.sectionTitle}>Exercises</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleAddExercise}>
                        <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.addButtonText}>Add Exercise</Text>
                    </TouchableOpacity>
                </View>
                {exercises.length > 0 ? (
                    <View style={styles.exercisesGrid}>
                        {exercises.map((exercise) => (
                            <ExerciseCard
                                key={exercise.planExerciseId}
                                exercise={exercise}
                                onEdit={handleEditExercise}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={styles.noExercisesContainer}>
                        <Text style={styles.noExercisesText}>No exercises found.</Text>
                    </View>
                )}
                {pageNumber < totalPages && (
                    <TouchableOpacity
                        style={[styles.loadMoreButton,loadingExercises && styles.loadMoreButtonDisabled]}
                        onPress={handleLoadMore}
                        disabled={loadingExercises}
                    >
                        {loadingExercises ? (
                            <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                            <>
                                <Ionicons name="reload" size={16} color={COLORS.white} />
                                <Text style={styles.loadMoreButtonText}>Load More</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );

    const renderActionButtons = () => (
        <Animated.View
            style={[
                styles.section,
                { opacity: fadeAnim,transform: [{ translateY: slideAnim }] },
            ]}
        >
            <View style={styles.actionContainer}>
                <ActionButton
                    onPress={() => navigation.navigate('EditWorkoutPlanScreen',{ planId })}
                    icon="pencil"
                    text="Edit Plan"
                    variant="primary"
                />
                <ActionButton
                    onPress={handleDeletePlan}
                    icon="trash"
                    text="Delete Plan"
                    variant="danger"
                />
            </View>
        </Animated.View>
    );

    const renderUserModal = () => (
        <Modal
            visible={showUserModal}
            animationType="slide"
            onRequestClose={() => setShowUserModal(false)}
        >
            <SafeAreaView style={styles.modalContainer}>
                <DynamicStatusBar backgroundColor={COLORS.background} />
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={() => setShowUserModal(false)}>
                        <Ionicons name="close" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>User Profile</Text>
                    <View style={{ width: 24 }} />
                </View>
                {loadingUser ? (
                    <View style={styles.loadingUser}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <UserProfileContent
                        userProfile={userProfile}
                        formatDate={formatDate}
                        onClose={() => setShowUserModal(false)}
                    />
                )}
            </SafeAreaView>
        </Modal>
    );

    const renderConfirmModal = () => (
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
    );

    if (loading || !planData) return <LoadingScreen />;

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor={COLORS.background} />
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>#PLAN{planData.planId}</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.editButtonSmall}
                        onPress={() => navigation.navigate('EditWorkoutPlanScreen',{ planId })}
                    >
                        <Ionicons name="pencil-outline" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            </View>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {renderPlanHeader()}
                {renderPlanDetails()}
                {renderExercises()}
                {renderActionButtons()}
            </ScrollView>
            {renderUserModal()}
            {renderConfirmModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    editButtonSmall: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
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
        color: COLORS.textSecondary,
        marginTop: 16,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    card: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 20,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    planHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        marginRight: 16,
    },
    planTitleSection: {
        flex: 1,
    },
    planName: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    trainerText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '500',
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
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 16,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    detailIconWrapper: {
        marginRight: 12,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    detailValueContainer: {
        marginTop: 2,
    },
    detailText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    clientContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    viewUserButton: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    viewUserText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    exercisesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    addButtonText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    exercisesGrid: {
        gap: 12,
    },
    exerciseCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    exerciseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    exerciseDetails: {
        gap: 4,
    },
    exerciseDetailText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    noExercisesContainer: {
        alignItems: 'center',
        padding: 20,
    },
    noExercisesText: {
        fontSize: 16,
        color: COLORS.textTertiary,
        fontStyle: 'italic',
    },
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 16,
        gap: 8,
        marginTop: 12,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    loadMoreButtonDisabled: {
        opacity: 0.7,
    },
    loadMoreButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    actionContainer: {
        gap: 12,
        marginBottom: 40,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        padding: 16,
        gap: 8,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    editButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.danger,
        borderRadius: 12,
        padding: 16,
        gap: 8,
        shadowColor: COLORS.shadow,
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.white,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
        marginTop: 30
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    loadingUser: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmModalContent: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 350,
    },
    confirmModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 10,
        textAlign: 'center',
    },
    confirmModalText: {
        fontSize: 16,
        color: COLORS.textSecondary,
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
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: COLORS.danger,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmButtonText: {
        fontSize: 16,
        color: COLORS.white,
        fontWeight: '600',
    },
});

export default TrainerWorkoutPlanDetailScreen;