import React,{ useState,useRef,useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Platform,
    Animated,
    KeyboardAvoidingView,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from 'components/Header';

const AddWorkoutPlanScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { subscriptionId,userId,trainerId } = route.params || {};
    const [newPlan,setNewPlan] = useState({
        planName: '',
        description: '',
        startDate: new Date(),
        endDate: new Date(),
        frequencyPerWeek: '',
        durationMinutes: '',
        status: 'active',
        userId,
        trainerId,
        subscriptionId,
    });
    const [errors,setErrors] = useState({});
    const [loading,setLoading] = useState(false);
    const [showStartDatePicker,setShowStartDatePicker] = useState(false);
    const [showEndDatePicker,setShowEndDatePicker] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
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
    },[]);

    const validateForm = () => {
        const newErrors = {};
        if (!newPlan.subscriptionId || newPlan.subscriptionId < 1) {
            newErrors.subscriptionId = 'Subscription ID is required and must be a positive integer.';
        }
        if (!newPlan.userId || newPlan.userId < 1) {
            newErrors.userId = 'User ID is required and must be a positive integer.';
        }
        if (!newPlan.trainerId || newPlan.trainerId < 1) {
            newErrors.trainerId = 'Trainer ID is required and must be a positive integer.';
        }
        if (!newPlan.planName.trim()) {
            newErrors.planName = 'Plan name is required.';
        } else if (newPlan.planName.length < 3 || newPlan.planName.length > 255) {
            newErrors.planName = 'Plan name must be between 3 and 255 characters.';
        }
        if (newPlan.description && newPlan.description.length > 1000) {
            newErrors.description = 'Description cannot exceed 1000 characters.';
        }
        if (!newPlan.startDate) {
            newErrors.startDate = 'Start date is required.';
        }
        if (!newPlan.endDate) {
            newErrors.endDate = 'End date is required.';
        }
        if (newPlan.startDate && newPlan.endDate && newPlan.startDate > newPlan.endDate) {
            newErrors.dateRange = 'Start date must be earlier than or equal to end date.';
        }
        if (
            !newPlan.frequencyPerWeek ||
            isNaN(parseInt(newPlan.frequencyPerWeek)) ||
            parseInt(newPlan.frequencyPerWeek) < 1 ||
            parseInt(newPlan.frequencyPerWeek) > 7
        ) {
            newErrors.frequencyPerWeek = 'Frequency must be a number between 1 and 7.';
        }
        if (
            !newPlan.durationMinutes ||
            isNaN(parseInt(newPlan.durationMinutes)) ||
            parseInt(newPlan.durationMinutes) < 1
        ) {
            newErrors.durationMinutes = 'Duration must be a positive integer.';
        }
        if (!['active','inactive'].includes(newPlan.status)) {
            newErrors.status = "Status must be 'active' or 'inactive'.";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field,value) => {
        setNewPlan((prev) => ({ ...prev,[field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev,[field]: undefined }));
        }
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            showErrorFetchAPI(new Error('Please correct the errors in the form.'));
            return;
        }

        try {
            setLoading(true);
            const workoutData = {
                userId: newPlan.userId,
                trainerId: newPlan.trainerId,
                subscriptionId: newPlan.subscriptionId,
                planName: newPlan.planName,
                description: newPlan.description,
                startDate: newPlan.startDate.toISOString().split('T')[0],
                endDate: newPlan.endDate.toISOString().split('T')[0],
                frequencyPerWeek: parseInt(newPlan.frequencyPerWeek),
                durationMinutes: parseInt(newPlan.durationMinutes),
                status: newPlan.status,
            };

            const response = await trainerService.addWorkoutPlan(workoutData);

            if (response.statusCode === 201) {
                showSuccessMessage('Workout plan added successfully.');
                navigation.navigate('TrainerSubscriptionDetailScreen',{
                    subscriptionId: newPlan.subscriptionId,
                });
            } else {
                throw new Error(response.message || 'Failed to add workout plan.');
            }
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setLoading(false);
        }
    };

    const formatDisplayDate = (date) => {
        if (!date) return 'Select Date';
        return date.toLocaleDateString('en-US',{
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const handleStartDateConfirm = () => {
        // Ensure the current picker value is set, even if unchanged
        setNewPlan((prev) => ({
            ...prev,
            startDate: newPlan.startDate || new Date(),
        }));
        setShowStartDatePicker(false);
    };

    const handleEndDateConfirm = () => {
        // Ensure the current picker value is set, even if unchanged
        setNewPlan((prev) => ({
            ...prev,
            endDate: newPlan.endDate || new Date(),
        }));
        setShowEndDatePicker(false);
    };

    const renderStatusSelector = () => (
        <Animated.View
            style={[
                styles.inputContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <Text style={styles.inputLabel}>Status</Text>
            <View style={styles.statusOptions}>
                <TouchableOpacity
                    style={[styles.statusOption,newPlan.status === 'active' && styles.statusOptionActive]}
                    onPress={() => handleInputChange('status','active')}
                >
                    <View style={styles.statusOptionHeader}>
                        <Ionicons
                            name="pulse"
                            size={20}
                            color={newPlan.status === 'active' ? '#FFFFFF' : '#0056D2'}
                        />
                        <Text
                            style={[styles.statusOptionTitle,newPlan.status === 'active' && styles.statusOptionTitleActive]}
                        >
                            Active
                        </Text>
                    </View>
                    <Text
                        style={[styles.statusOptionDesc,newPlan.status === 'active' && styles.statusOptionDescActive]}
                    >
                        Plan is active and available
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.statusOption,newPlan.status === 'inactive' && styles.statusOptionActive]}
                    onPress={() => handleInputChange('status','inactive')}
                >
                    <View style={styles.statusOptionHeader}>
                        <Ionicons
                            name="close-circle-outline"
                            size={20}
                            color={newPlan.status === 'inactive' ? '#FFFFFF' : '#0056D2'}
                        />
                        <Text
                            style={[styles.statusOptionTitle,newPlan.status === 'inactive' && styles.statusOptionTitleActive]}
                        >
                            Inactive
                        </Text>
                    </View>
                    <Text
                        style={[styles.statusOptionDesc,newPlan.status === 'inactive' && styles.statusOptionDescActive]}
                    >
                        Plan is not active
                    </Text>
                </TouchableOpacity>
            </View>
            {errors.status && <Text style={styles.errorText}>{errors.status}</Text>}
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <Header
                title="Add Workout Plan"
                onBack={() => navigation.goBack()}
                backIconColor="#0056D2"
            />

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
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Plan Name</Text>
                            <View style={[styles.inputWrapper,errors.planName && styles.inputError]}>
                                <Ionicons name="fitness-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={newPlan.planName}
                                    onChangeText={(text) => handleInputChange('planName',text)}
                                    placeholder="Enter plan name"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                            {errors.planName && <Text style={styles.errorText}>{errors.planName}</Text>}
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Description</Text>
                            <View style={[styles.notesWrapper,errors.description && styles.inputError]}>
                                <TextInput
                                    style={styles.notesInput}
                                    value={newPlan.description}
                                    onChangeText={(text) => handleInputChange('description',text)}
                                    placeholder="Enter description"
                                    multiline
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Start Date</Text>
                            <TouchableOpacity
                                style={[styles.dateButton,errors.startDate && styles.inputError]}
                                onPress={() => setShowStartDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                <Text style={styles.dateButtonText}>{formatDisplayDate(newPlan.startDate)}</Text>
                            </TouchableOpacity>
                            {errors.startDate && <Text style={styles.errorText}>{errors.startDate}</Text>}
                            {errors.dateRange && <Text style={styles.errorText}>{errors.dateRange}</Text>}
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>End Date</Text>
                            <TouchableOpacity
                                style={[styles.dateButton,errors.endDate && styles.inputError]}
                                onPress={() => setShowEndDatePicker(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                <Text style={styles.dateButtonText}>{formatDisplayDate(newPlan.endDate)}</Text>
                            </TouchableOpacity>
                            {errors.endDate && <Text style={styles.errorText}>{errors.endDate}</Text>}
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Frequency (days/week)</Text>
                            <View style={[styles.inputWrapper,errors.frequencyPerWeek && styles.inputError]}>
                                <Ionicons name="repeat-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={newPlan.frequencyPerWeek}
                                    onChangeText={(text) => handleInputChange('frequencyPerWeek',text)}
                                    placeholder="Enter frequency (1-7)"
                                    keyboardType="numeric"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                            {errors.frequencyPerWeek && <Text style={styles.errorText}>{errors.frequencyPerWeek}</Text>}
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Duration (minutes)</Text>
                            <View style={[styles.inputWrapper,errors.durationMinutes && styles.inputError]}>
                                <Ionicons name="time-outline" size={20} color="#64748B" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    value={newPlan.durationMinutes}
                                    onChangeText={(text) => handleInputChange('durationMinutes',text)}
                                    placeholder="Enter duration"
                                    keyboardType="numeric"
                                    placeholderTextColor="#94A3B8"
                                />
                            </View>
                            {errors.durationMinutes && <Text style={styles.errorText}>{errors.durationMinutes}</Text>}
                        </View>
                        {renderStatusSelector()}
                        <TouchableOpacity
                            style={[styles.button,loading && styles.buttonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                                    <Text style={styles.buttonText}>Add Workout Plan</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
            {showStartDatePicker && (
                <Modal visible={showStartDatePicker} transparent={true} animationType="fade">
                    <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>Select Start Date</Text>
                                <TouchableOpacity onPress={handleStartDateConfirm}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={newPlan.startDate}
                                mode="date"
                                display="spinner"
                                onChange={(event,selectedDate) => {
                                    if (event.type === 'set' && selectedDate) {
                                        setNewPlan((prev) => ({ ...prev,startDate: selectedDate }));
                                    }
                                }}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerConfirm}
                                    onPress={handleStartDateConfirm}
                                >
                                    <Text style={styles.datePickerConfirmText}>Confirm</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
            )}
            {showEndDatePicker && (
                <Modal visible={showEndDatePicker} transparent={true} animationType="fade">
                    <View style={styles.datePickerOverlay}>
                        <View style={styles.datePickerContainer}>
                            <View style={styles.datePickerHeader}>
                                <Text style={styles.datePickerTitle}>Select End Date</Text>
                                <TouchableOpacity onPress={handleEndDateConfirm}>
                                    <Ionicons name="close" size={24} color="#64748B" />
                                </TouchableOpacity>
                            </View>
                            <DateTimePicker
                                value={newPlan.endDate}
                                mode="date"
                                display="spinner"
                                onChange={(event,selectedDate) => {
                                    if (event.type === 'set' && selectedDate) {
                                        setNewPlan((prev) => ({ ...prev,endDate: selectedDate }));
                                    }
                                }}
                            />
                            {Platform.OS === 'ios' && (
                                <TouchableOpacity
                                    style={styles.datePickerConfirm}
                                    onPress={handleEndDateConfirm}
                                >
                                    <Text style={styles.datePickerConfirmText}>Confirm</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Modal>
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
    headerRight: {
        width: 40,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1E293B',
    },
    keyboardAvoidingContainer: {
        flex: 1,
        marginTop: 80
    },
    content: {
        flexGrow: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 50,
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
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    dateButtonText: {
        fontSize: 16,
        color: '#1E293B',
        flex: 1,
    },
    statusOptions: {
        flexDirection: 'row',
        gap: 12,
    },
    statusOption: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    statusOptionActive: {
        borderColor: '#0056D2',
        backgroundColor: '#0056D2',
    },
    statusOptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statusOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
        marginLeft: 8,
    },
    statusOptionTitleActive: {
        color: '#FFFFFF',
    },
    statusOptionDesc: {
        fontSize: 14,
        color: '#6B7280',
    },
    statusOptionDescActive: {
        color: 'rgba(255, 255, 255, 0.9)',
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
    datePickerOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    datePickerContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 350,
    },
    datePickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    datePickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    datePickerConfirm: {
        backgroundColor: '#0056D2',
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: 20,
    },
    datePickerConfirmText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});

export default AddWorkoutPlanScreen;