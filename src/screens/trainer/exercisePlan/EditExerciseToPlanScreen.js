import React,{ useState,useEffect,useRef,useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Modal,
    FlatList,
    Platform,
    Animated,
    KeyboardAvoidingView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import UserProfileContent from '../components/UserProfileContent';

const EditExerciseToPlanScreen = () => {
    const { user } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute();
    const { planExerciseId } = route.params || {};
    const [exerciseId,setExerciseId] = useState(null);
    const [selectedExercise,setSelectedExercise] = useState(null);
    const [sets,setSets] = useState('');
    const [reps,setReps] = useState('');
    const [durationMinutes,setDurationMinutes] = useState('');
    const [restTimeSeconds,setRestTimeSeconds] = useState('');
    const [notes,setNotes] = useState('');
    const [errors,setErrors] = useState({});
    const [loading,setLoading] = useState(true);
    const [showExerciseModal,setShowExerciseModal] = useState(false);
    const [myExercises,setMyExercises] = useState([]);
    const [bankExercises,setBankExercises] = useState([]);
    const [activeTab,setActiveTab] = useState('my');
    const [searchTerm,setSearchTerm] = useState('');
    const [showUserModal,setShowUserModal] = useState(false);
    const [userProfile,setUserProfile] = useState(null);
    const [loadingUser,setLoadingUser] = useState(false);
    const [planData,setPlanData] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch exercise details
                const exerciseResponse = await trainerService.getPlanExerciseById(planExerciseId);
                if (exerciseResponse.statusCode === 200 && exerciseResponse.data) {
                    const exerciseData = exerciseResponse.data;
                    setExerciseId(exerciseData.exerciseId || null);
                    setSelectedExercise({
                        exerciseId: exerciseData.exerciseId || null,
                        exerciseName: exerciseData.exerciseName || '',
                        description: exerciseData.description || '',
                        caloriesBurnedPerMin: exerciseData.caloriesBurnedPerMin || 0,
                        genderSpecific: exerciseData.genderSpecific || 'N/A',
                        imageUrl: exerciseData.imageUrl || null,
                    });
                    setSets(exerciseData.sets ? exerciseData.sets.toString() : '');
                    setReps(exerciseData.reps ? exerciseData.reps.toString() : '');
                    setDurationMinutes(exerciseData.durationMinutes ? exerciseData.durationMinutes.toString() : '');
                    setRestTimeSeconds(exerciseData.restTimeSeconds ? exerciseData.restTimeSeconds.toString() : '');
                    setNotes(exerciseData.notes || '');
                    // Fetch plan details
                    const planResponse = await trainerService.getWorkoutPlansById(exerciseData.planId);
                    if (planResponse.statusCode === 200 && planResponse.data) {
                        setPlanData(planResponse.data);
                    } else {
                        showErrorFetchAPI(new Error('Failed to fetch plan details.'));
                    }
                } else {
                    showErrorFetchAPI(new Error('Failed to fetch exercise details.'));
                    navigation.goBack();
                    return;
                }
                // Fetch exercises for selection
                const myParams = { PageNumber: 1,PageSize: 100 };
                const bankParams = { PageNumber: 1,PageSize: 100 };
                const [myResponse,bankResponse] = await Promise.all([
                    trainerService.getExerciseByTrainerId(myParams),
                    trainerService.getExerciseByBank(bankParams),
                ]);
                if (myResponse.statusCode === 200) {
                    setMyExercises(myResponse.data.exercises || []);
                }
                if (bankResponse.statusCode === 200) {
                    setBankExercises(bankResponse.data.exercises || []);
                }
            } catch (error) {
                showErrorFetchAPI(error);
                navigation.goBack();
            } finally {
                setLoading(false);
            }
        };
        if (planExerciseId) {
            fetchData();
        } else {
            showErrorFetchAPI(new Error('Invalid Plan Exercise ID.'));
            navigation.goBack();
        }
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim,{
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    },[planExerciseId]);

    const fetchUserProfile = async () => {
        try {
            setLoadingUser(true);
            setShowUserModal(true);
            const response = await trainerService.viewUserForTrainer(planData?.userId);
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
    };

    const validateForm = () => {
        const newErrors = {};
        if (!planExerciseId || planExerciseId < 1) {
            newErrors.planExerciseId = 'Plan Exercise ID is required and must be a positive integer.';
        }
        if (!exerciseId || exerciseId < 1) {
            newErrors.exerciseId = 'Exercise is required.';
        }
        if (sets === '' || isNaN(sets) || parseInt(sets) < 1) {
            newErrors.sets = 'Sets is required and must be a positive integer.';
        }
        if (reps === '' || isNaN(reps) || parseInt(reps) < 1) {
            newErrors.reps = 'Reps is required and must be a positive integer.';
        }
        if (durationMinutes === '' || isNaN(durationMinutes) || parseInt(durationMinutes) < 1) {
            newErrors.durationMinutes = 'Duration is required and must be a positive integer.';
        }
        if (restTimeSeconds === '' || isNaN(restTimeSeconds) || parseInt(restTimeSeconds) < 0) {
            newErrors.restTimeSeconds = 'Rest time is required and must be a non-negative integer.';
        }
        if (notes && notes.length > 1000) {
            newErrors.notes = 'Notes cannot exceed 1000 characters.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            showErrorFetchAPI(new Error('Please correct the errors in the form.'));
            return;
        }
        try {
            setLoading(true);
            const exerciseData = {
                planExerciseId: planExerciseId,
                planId: planData?.planId,
                exerciseId: exerciseId,
                sets: parseInt(sets),
                reps: parseInt(reps),
                durationMinutes: parseInt(durationMinutes),
                restTimeSeconds: parseInt(restTimeSeconds),
                notes: notes,
            };
            const response = await trainerService.updatePlanExercise(planExerciseId,exerciseData);
            if (response.statusCode === 200) {
                showSuccessMessage('Exercise updated successfully.');
                navigation.goBack();
            } else {
                throw new Error(response.message || 'Failed to update exercise.');
            }
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setLoading(false);
        }
    };

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

    const filteredExercises = (exercises) =>
        exercises.filter((ex) => ex.exerciseName.toLowerCase().includes(searchTerm.toLowerCase()));

    const selectExercise = (item) => {
        setExerciseId(item.exerciseId);
        setSelectedExercise(item);
        setShowExerciseModal(false);
    };

    const renderExerciseItem = ({ item }) => (
        <TouchableOpacity style={styles.exerciseItem} onPress={() => selectExercise(item)}>
            {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.exerciseImage} />}
            <View style={styles.exerciseInfo}>
                <Text style={styles.exerciseName}>{item.exerciseName}</Text>
                <Text style={styles.exerciseDesc} numberOfLines={2}>
                    {item.description.replace(/<\/?[^>]+(>|$)/g,'')}
                </Text>
                <Text style={styles.exerciseDetail}>Calories/min: {item.caloriesBurnedPerMin}</Text>
                <Text style={styles.exerciseDetail}>Gender: {item.genderSpecific}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderExercisePreview = () => (
        <Animated.View
            style={[styles.section,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}
        >
            <View style={styles.card}>
                <Text style={styles.inputLabel}>Selected Exercise</Text>
                {selectedExercise ? (
                    <View style={styles.exerciseItem}>
                        {selectedExercise.imageUrl && (
                            <Image source={{ uri: selectedExercise.imageUrl }} style={styles.exerciseImage} />
                        )}
                        <View style={styles.exerciseInfo}>
                            <Text style={styles.exerciseName}>{selectedExercise.exerciseName}</Text>
                            <Text style={styles.exerciseDesc} numberOfLines={2}>
                                {selectedExercise.description.replace(/<\/?[^>]+(>|$)/g,'')}
                            </Text>
                            <Text style={styles.exerciseDetail}>
                                Calories/min: {selectedExercise.caloriesBurnedPerMin}
                            </Text>
                            <Text style={styles.exerciseDetail}>Gender: {selectedExercise.genderSpecific}</Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.noSelectionText}>No exercise selected</Text>
                )}
            </View>
        </Animated.View>
    );

    const renderUserSection = () => (
        <Animated.View
            style={[styles.section,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}
        >
            <View style={styles.card}>
                <Text style={styles.inputLabel}>Client</Text>
                <View style={styles.clientContainer}>
                    <Text style={styles.detailText}>{planData?.userFullName || 'Unknown'}</Text>
                    <TouchableOpacity style={styles.viewUserButton} onPress={fetchUserProfile}>
                        <Text style={styles.viewUserText}>View Profile</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#0056D2" />
                    <Text style={styles.loadingText}>Loading exercise details...</Text>
                </View>
            ) : (
                <>
                    <View style={styles.header}>
                        <View style={styles.headerContent}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <Ionicons name="arrow-back" size={24} color="#0056D2" />
                            </TouchableOpacity>
                            <View style={styles.headerCenter}>
                                <Text style={styles.headerTitle}>Edit Exercise</Text>
                            </View>
                            <View style={styles.headerRight} />
                        </View>
                    </View>
                    <KeyboardAvoidingView
                        style={styles.keyboardAvoidingContainer}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                    >
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            <Animated.View style={[styles.content,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}>
                                {planData && renderUserSection()}
                                {renderExercisePreview()}
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Exercise</Text>
                                    <TouchableOpacity
                                        style={[styles.inputWrapper,errors.exerciseId && styles.inputError]}
                                        onPress={() => setShowExerciseModal(true)}
                                    >
                                        <Ionicons name="barbell-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                        <Text style={[styles.input,{ color: exerciseId ? '#1E293B' : '#94A3B8' }]}>
                                            {selectedExercise?.exerciseName || 'Select exercise'}
                                        </Text>
                                    </TouchableOpacity>
                                    {errors.exerciseId && <Text style={styles.errorText}>{errors.exerciseId}</Text>}
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Sets</Text>
                                    <View style={[styles.inputWrapper,errors.sets && styles.inputError]}>
                                        <Ionicons name="repeat-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={sets}
                                            onChangeText={setSets}
                                            placeholder="Enter sets"
                                            keyboardType="numeric"
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                    {errors.sets && <Text style={styles.errorText}>{errors.sets}</Text>}
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Reps</Text>
                                    <View style={[styles.inputWrapper,errors.reps && styles.inputError]}>
                                        <Ionicons name="refresh-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={reps}
                                            onChangeText={setReps}
                                            placeholder="Enter reps"
                                            keyboardType="numeric"
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                    {errors.reps && <Text style={styles.errorText}>{errors.reps}</Text>}
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Duration (minutes)</Text>
                                    <View style={[styles.inputWrapper,errors.durationMinutes && styles.inputError]}>
                                        <Ionicons name="time-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={durationMinutes}
                                            onChangeText={setDurationMinutes}
                                            placeholder="Enter duration"
                                            keyboardType="numeric"
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                    {errors.durationMinutes && <Text style={styles.errorText}>{errors.durationMinutes}</Text>}
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Rest Time (seconds)</Text>
                                    <View style={[styles.inputWrapper,errors.restTimeSeconds && styles.inputError]}>
                                        <Ionicons name="pause-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                        <TextInput
                                            style={styles.input}
                                            value={restTimeSeconds}
                                            onChangeText={setRestTimeSeconds}
                                            placeholder="Enter rest time"
                                            keyboardType="numeric"
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                    {errors.restTimeSeconds && <Text style={styles.errorText}>{errors.restTimeSeconds}</Text>}
                                </View>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>Notes</Text>
                                    <View style={[styles.notesWrapper,errors.notes && styles.inputError]}>
                                        <TextInput
                                            style={styles.notesInput}
                                            value={notes}
                                            onChangeText={setNotes}
                                            placeholder="Enter notes"
                                            multiline
                                            placeholderTextColor="#94A3B8"
                                        />
                                    </View>
                                    {errors.notes && <Text style={styles.errorText}>{errors.notes}</Text>}
                                </View>
                                <TouchableOpacity
                                    style={[styles.button,loading && styles.buttonDisabled]}
                                    onPress={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                                            <Text style={styles.buttonText}>Update Exercise</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        </ScrollView>
                    </KeyboardAvoidingView>

                    <Modal visible={showExerciseModal} animationType="slide" transparent={false}>
                        <SafeAreaView style={styles.modalContainer}>
                            <DynamicStatusBar backgroundColor="#F8FAFC" />
                            <View style={styles.modalHeader}>
                                <View style={styles.headerContent}>
                                    <TouchableOpacity style={styles.backButton} onPress={() => setShowExerciseModal(false)}>
                                        <Ionicons name="arrow-back" size={24} color="#0056D2" />
                                    </TouchableOpacity>
                                    <View style={styles.headerCenter}>
                                        <Text style={styles.headerTitle}>Select Exercise</Text>
                                    </View>
                                    <View style={styles.headerRight} />
                                </View>
                            </View>
                            <View style={styles.tabContainer}>
                                <TouchableOpacity
                                    style={[styles.tabButton,activeTab === 'my' && styles.activeTabButton]}
                                    onPress={() => setActiveTab('my')}
                                >
                                    <Text style={[styles.tabText,activeTab === 'my' && styles.activeTabText]}>My Exercises</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.tabButton,activeTab === 'bank' && styles.activeTabButton]}
                                    onPress={() => setActiveTab('bank')}
                                >
                                    <Text style={[styles.tabText,activeTab === 'bank' && styles.activeTabText]}>Exercise Bank</Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.searchContainer}>
                                <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search exercises..."
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                    placeholderTextColor="#94A3B8"
                                />
                                {searchTerm ? (
                                    <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearSearch}>
                                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                            <FlatList
                                data={activeTab === 'my' ? filteredExercises(myExercises) : filteredExercises(bankExercises)}
                                keyExtractor={(item) => item.exerciseId.toString()}
                                renderItem={renderExerciseItem}
                                contentContainerStyle={styles.exerciseList}
                                showsVerticalScrollIndicator={false}
                            />
                        </SafeAreaView>
                    </Modal>

                    <Modal visible={showUserModal} animationType="slide" onRequestClose={() => setShowUserModal(false)}>
                        <SafeAreaView style={styles.modalContainer}>
                            <DynamicStatusBar backgroundColor="#F8FAFC" />
                            <View style={styles.modalHeader}>
                                <TouchableOpacity onPress={() => setShowUserModal(false)}>
                                    <Ionicons name="close" size={24} color="#0056D2" />
                                </TouchableOpacity>
                                <Text style={styles.modalTitle}>User Profile</Text>
                                <View style={styles.headerRight} />
                            </View>
                            {loadingUser ? (
                                <View style={styles.loadingUser}>
                                    <ActivityIndicator size="large" color="#0056D2" />
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
                </>
            )}
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
        fontSize: 22,
        fontWeight: '700',
        color: '#1E293B',
    },
    headerRight: {
        width: 40,
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#F8FAFC',
    },
    loadingText: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 16,
        fontWeight: '500',
    },
    section: {
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    inputError: {
        borderColor: '#EF4444',
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    notesWrapper: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minHeight: 100,
    },
    notesInput: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        padding: 12,
        textAlignVertical: 'top',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0056D2',
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 25,
        justifyContent: 'center',
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        backgroundColor: '#CBD5E1',
    },
    buttonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    modalHeader: {
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    modalTitle: {
        flex: 1,
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        marginHorizontal: 20,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
    },
    activeTabButton: {
        borderBottomWidth: 2,
        borderBottomColor: '#0056D2',
    },
    tabText: {
        fontSize: 16,
        color: '#64748B',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#0056D2',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        margin: 20,
        paddingHorizontal: 15,
        height: 48,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#1E293B',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    clearSearch: {
        padding: 5,
    },
    exerciseList: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    exerciseItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    exerciseImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 16,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    exerciseDesc: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 4,
    },
    exerciseDetail: {
        fontSize: 12,
        color: '#94A3B8',
    },
    noSelectionText: {
        fontSize: 16,
        color: '#9CA3AF',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    },
    clientContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    detailText: {
        fontSize: 16,
        color: '#1E293B',
    },
    viewUserButton: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    viewUserText: {
        fontSize: 14,
        color: '#0056D2',
        fontWeight: '600',
    },
    loadingUser: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default EditExerciseToPlanScreen;