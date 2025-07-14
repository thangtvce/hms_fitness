import { useState, useContext } from "react"
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Platform,
    ScrollView,
    Modal,
    Animated,
} from "react-native"
import Loading from "components/Loading";
import { showErrorFetchAPI, showSuccessMessage } from "utils/toastUtil";
import { Ionicons } from "@expo/vector-icons"
import { weightHistoryService } from "services/apiWeightHistoryService"
import DateTimePicker from "@react-native-community/datetimepicker"
import DynamicStatusBar from "screens/statusBar/DynamicStatusBar"
import { ThemeContext } from "components/theme/ThemeContext"
import Header from "components/Header"

import { SafeAreaView } from "react-native-safe-area-context"

export default function EditWeightScreen({ navigation,route }) {
    const { historyId,weight,recordedAt,userId } = route.params
    const { colors } = useContext(ThemeContext)
    const [formData,setFormData] = useState({
        weight: weight.toString(),
        recordedAt: new Date(recordedAt),
    })
    const [isLoading,setIsLoading] = useState(false)
    const [showDatePicker,setShowDatePicker] = useState(false)
    const [activeField,setActiveField] = useState(null)
    const [modalVisible,setModalVisible] = useState(false)
    const [fadeAnim] = useState(new Animated.Value(0))
    const [slideAnim] = useState(new Animated.Value(300))

    const handleDateChange = (event,selectedDate) => {
        if (Platform.OS === "android") {
            setShowDatePicker(false)
            if (selectedDate && event.type === "set") {
                setFormData({ ...formData,recordedAt: selectedDate })
            }
        } else if (selectedDate) {
            setFormData({ ...formData,recordedAt: selectedDate })
        }
    }

    const showDatePickerModal = () => {
        setModalVisible(true)
        setShowDatePicker(true)
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim,{
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const hideDatePickerModal = () => {
        Animated.parallel([
            Animated.timing(fadeAnim,{
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim,{
                toValue: 300,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setModalVisible(false)
            setShowDatePicker(false)
        })
    }

    const handleSave = async () => {
        // UserId validation
        if (!userId || isNaN(Number.parseInt(userId)) || Number.parseInt(userId) <= 0) {
            showErrorFetchAPI("UserId must be a positive integer.");
            return;
        }

        // Weight validation: required, 0.1-500
        if (!formData.weight || isNaN(Number.parseFloat(formData.weight))) {
            showErrorFetchAPI("Weight is required and must be a valid number.");
            return;
        }
        const weightValue = Number.parseFloat(formData.weight);
        if (weightValue < 0.1 || weightValue > 500) {
            showErrorFetchAPI("Weight must be between 0.1 and 500 kg.");
            return;
        }

        // RecordedAt validation: not in the future
        const now = new Date();
        if (formData.recordedAt && formData.recordedAt > now) {
            showErrorFetchAPI("Recorded date cannot be in the future.");
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                historyId,
                userId,
                weight: weightValue,
                recordedAt: formData.recordedAt.toISOString(),
            };

            const response = await weightHistoryService.updateWeightHistory(historyId, payload);
            if (response.statusCode === 200) {
                showSuccessMessage("Weight updated successfully.");
                navigation.goBack();
            } else {
                showErrorFetchAPI(response.message || "Failed to update weight entry.");
            }
        } catch (error) {
            showErrorFetchAPI("Unable to update weight entry. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }


    const formatDate = (date) => {
        return date.toLocaleDateString("en-US",{
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    }

    if (isLoading) {
        return <Loading />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={colors.headerBackground || "#FFFFFF"} />
            <Header
                title="Edit Weight"
                onBack={() => navigation.goBack()}
                backgroundColor={colors.headerBackground || "#FFFFFF"}
                textColor={colors.headerText || colors.primary || "#0056d2"}
            />
            <View style={[styles.container, { paddingTop: 80 }]}> 
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formCard}>
                        <View style={styles.inputContainer}>
                            <View style={styles.labelContainer}>
                                <Ionicons name="scale-outline" size={20} color="#64748B" style={styles.labelIcon} />
                                <Text style={styles.label}>Weight (kg)</Text>
                            </View>
                            <View style={[styles.inputWrapper,activeField === "weight" && styles.activeInput]}>
                                <TextInput
                                    style={styles.input}
                                    value={formData.weight}
                                    onChangeText={(text) => setFormData({ ...formData,weight: text })}
                                    keyboardType="numeric"
                                    placeholder="Enter weight"
                                    placeholderTextColor="#94A3B8"
                                    onFocus={() => setActiveField("weight")}
                                    onBlur={() => setActiveField(null)}
                                />
                                <Text style={styles.unitText}>kg</Text>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.labelContainer}>
                                <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.labelIcon} />
                                <Text style={styles.label}>Record Date</Text>
                            </View>
                            <TouchableOpacity style={styles.datePickerButton} onPress={showDatePickerModal}>
                                <Text style={styles.dateText}>{formatDate(formData.recordedAt)}</Text>
                                <Ionicons name="calendar" size={20} color="#64748B" />
                            </TouchableOpacity>

                            <Modal
                                visible={modalVisible}
                                transparent={true}
                                animationType="none"
                                onRequestClose={hideDatePickerModal}
                            >
                                <View style={styles.modalOverlay}>
                                    <Animated.View
                                        style={[
                                            styles.modalContent,
                                            {
                                                opacity: fadeAnim,
                                                transform: [{ translateY: slideAnim }],
                                            },
                                        ]}
                                    >
                                        <View style={styles.modalHeader}>
                                            <Text style={styles.modalTitle}>Select Date</Text>
                                            <TouchableOpacity onPress={hideDatePickerModal} style={styles.closeButton}>
                                                <Ionicons name="close" size={24} color="#64748B" />
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.datePickerContainer}>
                                            <DateTimePicker
                                                value={formData.recordedAt}
                                                mode="date"
                                                display={Platform.OS === "ios" ? "spinner" : "default"}
                                                onChange={handleDateChange}
                                                maximumDate={new Date()}
                                                style={styles.datePickerModal}
                                            />
                                        </View>

                                        {Platform.OS === "ios" && (
                                            <View style={styles.modalButtons}>
                                                <TouchableOpacity style={styles.modalCancelButton} onPress={hideDatePickerModal}>
                                                    <Text style={styles.modalCancelText}>Cancel</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={styles.modalConfirmButton} onPress={hideDatePickerModal}>
                                                    <Text style={styles.modalConfirmText}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </Animated.View>
                                </View>
                            </Modal>
                        </View>

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity style={[styles.cancelButton]} onPress={() => navigation.goBack()}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.primary || '#0056d2' }, isLoading && styles.saveButtonDisabled]}
                                onPress={handleSave}
                                disabled={isLoading}
                            >
                                <>
                                    <Ionicons name="save-outline" size={18} color="#FFFFFF" style={styles.saveIcon} />
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.infoCard}>
                        <View style={styles.infoHeader}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.primary || "#0056d2"} />
                            <Text style={styles.infoTitle}>Weight Tracking Tips</Text>
                        </View>
                        <Text style={styles.infoText}>
                            • Weigh yourself at the same time each day for consistency{"\n"}• Use the same scale for all measurements
                            {"\n"}• Track your weight regularly to identify trends{"\n"}• Remember that weight can fluctuate due to
                            water retention, food intake, and other factors
                        </Text>
                    </View>

                    {/* Add extra padding at the bottom to ensure the form is scrollable past the bottom tab bar */}
                    <View style={styles.bottomPadding} />
                </ScrollView>
            </View>
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
        backgroundColor: "#F8FAFC",
    },
    header: {
        paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
        paddingBottom: 16,
    },
    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        color: "#fff"
    },
    headerTitle: {
        fontFamily: "Inter_600SemiBold",
        fontSize: 18,
        color: "#FFFFFF",
        textAlign: "center",
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    formCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    inputContainer: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    labelIcon: {
        marginRight: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: "#334155",
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
    },
    activeInput: {
        borderColor: "#2563EB",
        borderWidth: 2,
    },
    input: {
        flex: 1,
        height: 44,
        fontSize: 16,
        color: "#0F172A",
    },
    unitText: {
        fontSize: 14,
        color: "#64748B",
        marginLeft: 4,
    },
    datePickerButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 8,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    dateText: {
        fontSize: 16,
        color: "#0F172A",
    },
    datePicker: {
        marginTop: 8,
        backgroundColor: "#FFFFFF",
        ...Platform.select({
            ios: {
                borderRadius: 8,
                overflow: "hidden",
            },
        }),
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#CBD5E1",
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#64748B",
    },
    saveButton: {
        flex: 2,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        borderRadius: 8,
        ...Platform.select({
            ios: {
                shadowColor: "#0056d2",
                shadowOffset: { width: 0,height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 3,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    saveButtonDisabled: {
        backgroundColor: "#93C5FD",
    },
    saveIcon: {
        marginRight: 6,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
    infoCard: {
        backgroundColor: "#EFF6FF",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: "#0056d2",
    },
    infoHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: "#1E40AF",
        marginLeft: 6,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 20,
        color: "#334155",
    },
    bottomPadding: {
        height: 80,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        width: "100%",
        maxWidth: 400,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 10 },
                shadowOpacity: 0.25,
                shadowRadius: 20,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    modalHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1E293B",
    },
    closeButton: {
        padding: 4,
    },
    datePickerContainer: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    datePickerModal: {
        width: "100%",
        backgroundColor: "transparent",
    },
    modalButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: "#E2E8F0",
    },
    modalCancelButton: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        marginRight: 8,
    },
    modalConfirmButton: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: "#2563EB",
        borderRadius: 8,
        marginLeft: 8,
    },
    modalCancelText: {
        fontSize: 16,
        fontWeight: "500",
        color: "#64748B",
    },
    modalConfirmText: {
        fontSize: 16,
        fontWeight: "600",
        color: "#FFFFFF",
    },
})
