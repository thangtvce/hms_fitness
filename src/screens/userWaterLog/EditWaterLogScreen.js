import { useState,useEffect } from "react"
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Animated,
    Modal,
} from "react-native"
import Loading from "components/Loading"
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { apiUserWaterLogService } from "services/apiUserWaterLogService"
import { useAuth } from "context/AuthContext"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { SafeAreaView } from "react-native-safe-area-context"
import Header from "components/Header"

const { width,height } = Dimensions.get("window")

const QUICK_AMOUNTS = [
    { label: "250",value: 250 },
    { label: "500",value: 500 },
    { label: "750",value: 750 },
    { label: "1000",value: 1000 },
    { label: "1500",value: 1500 },
    { label: "2000",value: 2000 },
    { label: "2500",value: 2500 },
    { label: "3000",value: 3000 },
]

export default function EditWaterLogScreen({ navigation = { goBack: () => { } },route = { params: {} } }) {
    const { user } = useAuth()
    const waterLog = route.params?.waterLog || {
        logId: 0,
        userId: 0,
        amountMl: 0,
        consumptionDate: new Date().toISOString(),
        recordedAt: new Date().toISOString(),
        notes: "",
        status: "active",
    }

    const [formData,setFormData] = useState({
        logId: waterLog.logId,
        userId: waterLog.userId,
        amountMl: waterLog.amountMl ? waterLog.amountMl.toString() : "",
        consumptionDate: waterLog.consumptionDate
            ? new Date(
                new Date(waterLog.consumptionDate).getFullYear(),
                new Date(waterLog.consumptionDate).getMonth(),
                new Date(waterLog.consumptionDate).getDate(),
            )
            : new Date(),
        notes: waterLog.notes || "",
        status: "active",
    })
    const [activeField,setActiveField] = useState(null)
    const [loading,setLoading] = useState(false)
    const [showDatePicker,setShowDatePicker] = useState(false)
    const [selectedQuickAmount,setSelectedQuickAmount] = useState(waterLog.amountMl || null)
    const [fadeAnim] = useState(new Animated.Value(0))
    const [showDatePickerModal,setShowDatePickerModal] = useState(false)
    const [showOverIntakeWarning,setShowOverIntakeWarning] = useState(false)

    useEffect(() => {
        Animated.timing(fadeAnim,{
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start()
    },[])

    const handleQuickAmountSelect = (amount) => {
        setFormData({ ...formData,amountMl: amount.toString() })
        setSelectedQuickAmount(amount)

        if (amount > 2000) {
            setShowOverIntakeWarning(true)
        }
    }

    const handleAmountChange = (text) => {
        setFormData({ ...formData,amountMl: text })
        setSelectedQuickAmount(null)

        const amount = Number.parseFloat(text) || 0
        if (amount > 2000) {
            setShowOverIntakeWarning(true)
        }
    }

    const handleDateSelect = (event,selectedDate) => {
        if (selectedDate) {
            const adjustedDate = new Date(selectedDate.getFullYear(),selectedDate.getMonth(),selectedDate.getDate())
            setFormData({ ...formData,consumptionDate: adjustedDate })
        }
    }

                    function formatDateLocal(date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2,"0");
                        const day = String(date.getDate()).padStart(2,"0");
                        return `${year}-${month}-${day}`;
                    }

    const handleSave = async () => {
        try {
            setLoading(true);

            // UserId validation
            if (!user || !user.userId) {
                showErrorFetchAPI("Please log in to continue.");
                return;
            }
            const userId = Number.parseInt(user.userId, 10);
            if (isNaN(userId) || userId <= 0) {
                showErrorFetchAPI("UserId must be a positive integer.");
                return;
            }
            if (userId !== formData.userId) {
                showErrorFetchAPI("You can only edit your own water logs.");
                return;
            }

            // AmountMl validation
            let amountMl = null;
            if (formData.amountMl === undefined || formData.amountMl === null || formData.amountMl === "") {
                showErrorFetchAPI("AmountMl is required.");
                return;
            }
            amountMl = Number.parseFloat(formData.amountMl);
            if (isNaN(amountMl)) {
                showErrorFetchAPI("AmountMl is required.");
                return;
            }
            if (amountMl < 1 || amountMl > 999999.99) {
                showErrorFetchAPI("Amount must be between 1 and 999,999.99 ml.");
                return;
            }

            // ConsumptionDate validation
            const consumptionDate = formData.consumptionDate;
            if (!(consumptionDate instanceof Date) || isNaN(consumptionDate.getTime())) {
                showErrorFetchAPI("ConsumptionDate is required.");
                return;
            }
            // Only compare date part (not time)
            const today = new Date();
            const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const logDate = new Date(consumptionDate.getFullYear(), consumptionDate.getMonth(), consumptionDate.getDate());
            if (logDate > localToday) {
                showErrorFetchAPI("ConsumptionDate cannot be in the future.");
                return;
            }

            // Notes validation
            const notes = formData.notes?.trim() || null;
            if (notes && notes.length > 500) {
                showErrorFetchAPI("Notes cannot exceed 500 characters.");
                return;
            }

            // Status validation
            let status = formData.status || "active";
            if (status && status.length > 20) {
                showErrorFetchAPI("Status cannot exceed 20 characters.");
                return;
            }

            const payload = {
                LogId: formData.logId,
                UserId: formData.userId,
                AmountMl: amountMl,
                ConsumptionDate: formatDateLocal(consumptionDate),
                RecordedAt: formatDateLocal(new Date()),
                Notes: notes,
                Status: status,
            };

            const response = await apiUserWaterLogService.updateWaterLog(formData.logId, payload);

            if (response.statusCode === 200) {
                showSuccessMessage("Water log updated successfully!");
                navigation.goBack();
            } else {
                showErrorFetchAPI(response.message || "Failed to update water log.");
            }
        } catch (error) {
            showErrorFetchAPI(error.message || "Failed to update water log.");
        } finally {
            setLoading(false);
        }
    } 

    const getProgressColor = () => {
        const amount = Number.parseFloat(formData.amountMl) || 0
        if (amount >= 1000) return "#10B981"
        if (amount >= 500) return "#F59E0B"
        return "#6B7280"
    }

    const getProgressWidth = () => {
        const amount = Number.parseFloat(formData.amountMl) || 0
        return Math.min((amount / 2000) * 100,100)
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />


            {/* Use shared Header component */}
            <Header
                title="Edit Water Log"
                onBack={() => navigation.goBack()}
                backgroundColor="#FFFFFF"
                titleColor="#1F2937"
            />

            <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <Animated.View style={[styles.content,{ opacity: fadeAnim }]}>
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        {/* Amount Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Amount</Text>

                            {/* Quick Selection Pills */}
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.quickAmountsScrollContainer}
                                style={styles.quickAmountsContainer}
                            >
                                {QUICK_AMOUNTS.map((amount) => (
                                    <TouchableOpacity
                                        key={amount.value}
                                        style={[
                                            styles.quickAmountPill,
                                            selectedQuickAmount === amount.value && { backgroundColor: '#0056d2', borderColor: '#0056d2' },
                                        ]}
                                        onPress={() => handleQuickAmountSelect(amount.value)}
                                        activeOpacity={0.7}
                                    >
                                        <Text
                                        style={[
                                            styles.quickAmountText,
                                            selectedQuickAmount === amount.value && { color: '#fff' },
                                        ]}
                                        >
                                            {amount.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Amount Input */}
                            <View style={[
                                styles.amountInputContainer,
                                activeField === "amountMl" && { borderColor: '#0056d2' }
                            ]}>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="Enter custom amount"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={formData.amountMl}
                                    onChangeText={handleAmountChange}
                                    onFocus={() => setActiveField("amountMl")}
                                    onBlur={() => setActiveField(null)}
                                />
                                <Text style={styles.unitLabel}>ml</Text>
                            </View>

                            {/* Progress Indicator */}
                            {formData.amountMl && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                {
                                                    width: `${getProgressWidth()}%`,
                                                    backgroundColor: getProgressColor(),
                                                },
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.progressText}>
                                        {Math.round((Number.parseFloat(formData.amountMl) / 2000) * 100)}% of daily goal
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Date Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Date & Time</Text>
                            <TouchableOpacity
                                style={[styles.dateButton,activeField === "consumptionDate" && styles.inputFocused]}
                                onPress={() => setShowDatePickerModal(true)}
                            >
                                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                                <Text style={styles.dateText}>
                                    {formData.consumptionDate.toLocaleDateString("en-US",{
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </Text>
                                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Notes Section */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
                            <TextInput
                                style={[
                                    styles.notesInput,
                                    activeField === "notes" && { borderColor: '#0056d2' }
                                ]}
                                placeholder="Add a note about this intake..."
                                placeholderTextColor="#9CA3AF"
                                multiline={true}
                                numberOfLines={3}
                                value={formData.notes}
                                onChangeText={(text) => setFormData({ ...formData,notes: text })}
                                onFocus={() => setActiveField("notes")}
                                onBlur={() => setActiveField(null)}
                                textAlignVertical="top"
                            />
                            <Text style={styles.characterCount}>{formData.notes.length}/500</Text>
                        </View>

                        {/* Save Button */}
                        <TouchableOpacity
                            onPress={handleSave}
                            style={[styles.saveButton, { backgroundColor: '#0056d2' }, loading && styles.saveButtonDisabled]}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="save" size={20} color="#FFFFFF" />
                            <Text style={styles.saveButtonText}>Update Entry</Text>
                        </TouchableOpacity>

                        {/* Info Card */}
                        <View style={[styles.infoCard, { borderLeftColor: '#0056d2' }] }>
                            <Ionicons name="information-circle" size={20} color="#0056d2" />
                            <Text style={styles.infoText}>Keep your hydration records accurate for better health tracking.</Text>
                        </View>

                        <View style={styles.bottomSpacer} />
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>

            {/* Date Picker Modal */}
            <Modal
                visible={showDatePickerModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDatePickerModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.datePickerModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                                <Ionicons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <DateTimePicker
                            value={formData.consumptionDate}
                            mode="date"
                            display="spinner"
                            onChange={handleDateSelect}
                            maximumDate={new Date()}
                            style={styles.datePicker}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowDatePickerModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalConfirmButton, { backgroundColor: '#0056d2' }]} onPress={() => setShowDatePickerModal(false)}>
                                <Text style={styles.modalConfirmText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Over Intake Warning Modal */}
            <Modal
                visible={showOverIntakeWarning}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowOverIntakeWarning(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.warningModal}>
                        <View style={styles.warningHeader}>
                            <Ionicons name="warning" size={32} color="#F59E0B" />
                            <Text style={styles.warningTitle}>High Water Intake</Text>
                        </View>

                        <Text style={styles.warningMessage}>
                            You've exceeded 100% of your daily water goal (2000ml). While staying hydrated is important, excessive
                            water intake can lead to water intoxication. Please consult with a healthcare professional if you
                            regularly consume large amounts of water.
                        </Text>

                        <View style={styles.warningButtons}>
                            <TouchableOpacity style={styles.warningButton} onPress={() => setShowOverIntakeWarning(false)}>
                                <Text style={styles.warningButtonText}>I Understand</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        {loading && <Loading />}
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    container: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F9FAFB",
        justifyContent: "center",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    headerRight: {
        width: 40,
        alignItems: "center",
    },
    statusIndicator: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#F0FDF4",
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: 55,
    },
    section: {
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#374151",
        marginBottom: 16,
    },
    quickAmountsContainer: {
        marginBottom: 20,
    },
    quickAmountsScrollContainer: {
        paddingRight: 20,
        gap: 12,
    },
    quickAmountPill: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 24,
        backgroundColor: "#F1F5F9",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E2E8F0",
        minWidth: 80,
    },
    quickAmountPillSelected: {
        backgroundColor: "#4F46E5",
        borderColor: "#4F46E5",
    },
    quickAmountText: {
        fontSize: 14,
        fontWeight: "600",
        color: "#64748B",
    },
    quickAmountTextSelected: {
        color: "#FFFFFF",
    },
    amountInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        backgroundColor: "#FAFAFA",
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    amountInput: {
        flex: 1,
        height: 52,
        fontSize: 16,
        color: "#1F2937",
    },
    unitLabel: {
        fontSize: 16,
        fontWeight: "500",
        color: "#6B7280",
    },
    inputFocused: {
        borderColor: "#4F46E5",
        backgroundColor: "#FFFFFF",
    },
    progressContainer: {
        marginTop: 8,
    },
    progressBar: {
        height: 4,
        backgroundColor: "#E5E7EB",
        borderRadius: 2,
        overflow: "hidden",
        marginBottom: 8,
    },
    progressFill: {
        height: "100%",
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        color: "#6B7280",
        textAlign: "center",
    },
    dateButton: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        backgroundColor: "#FAFAFA",
    },
    dateText: {
        flex: 1,
        fontSize: 16,
        color: "#1F2937",
        marginLeft: 12,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 12,
        backgroundColor: "#FAFAFA",
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: "#1F2937",
        minHeight: 80,
        marginBottom: 8,
    },
    characterCount: {
        fontSize: 12,
        color: "#9CA3AF",
        textAlign: "right",
    },
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#4F46E5",
        paddingVertical: 16,
        borderRadius: 12,
        marginTop: 32,
        ...Platform.select({
            ios: {
                shadowColor: "#4F46E5",
                shadowOffset: { width: 0,height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    saveButtonDisabled: {
        backgroundColor: "#9CA3AF",
        ...Platform.select({
            ios: {
                shadowOpacity: 0.1,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        marginLeft: 8,
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderLeftWidth: 4,
        borderLeftColor: "#4F46E5",
    },
    infoText: {
        fontSize: 14,
        color: "#64748B",
        marginLeft: 12,
        flex: 1,
        lineHeight: 20,
    },
    bottomSpacer: {
        height: 40,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    datePickerModal: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        width: "90%",
        maxWidth: 400,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#F3F4F6",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1F2937",
    },
    datePicker: {
        width: "100%",
        height: 200,
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: "#F3F4F6",
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 12,
        marginRight: 8,
        borderRadius: 8,
        backgroundColor: "#F9FAFB",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
    },
    modalConfirmButton: {
        flex: 1,
        paddingVertical: 12,
        marginLeft: 8,
        borderRadius: 8,
        backgroundColor: "#4F46E5",
        alignItems: "center",
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#6B7280",
    },
    modalConfirmText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    warningModal: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 24,
        width: "90%",
        maxWidth: 400,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    warningHeader: {
        alignItems: "center",
        marginBottom: 20,
    },
    warningTitle: {
        fontSize: 20,
        fontWeight: "700",
        color: "#F59E0B",
        marginTop: 12,
        textAlign: "center",
    },
    warningMessage: {
        fontSize: 16,
        color: "#374151",
        lineHeight: 24,
        textAlign: "center",
        marginBottom: 24,
    },
    warningButtons: {
        alignItems: "center",
    },
    warningButton: {
        backgroundColor: "#F59E0B",
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        minWidth: 120,
    },
    warningButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
        textAlign: "center",
    },
})
