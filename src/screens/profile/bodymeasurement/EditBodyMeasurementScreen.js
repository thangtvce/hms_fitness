import React,{ useState,useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bodyMeasurementService } from 'services/apiBodyMeasurementService';
import { useAuth } from 'context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import Loading from 'components/Loading';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import { theme } from 'theme/color';
import FloatingMenuButton from 'components/FloatingMenuButton';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from 'components/Header';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';

const { width,height } = Dimensions.get("window")

export default function EditBodyMeasurementScreen({ navigation,route }) {
    const { user } = useAuth();
    const { measurement } = route.params;
    const [formData,setFormData] = useState({
        weight: measurement.weight?.toString() || '',
        height: measurement.height?.toString() || '',
        bodyFatPercentage: measurement.bodyFatPercentage?.toString() || '',
        chestCm: measurement.chestCm?.toString() || '',
        waistCm: measurement.waistCm?.toString() || '',
        hipCm: measurement.hipCm?.toString() || '',
        bicepCm: measurement.bicepCm?.toString() || '',
        thighCm: measurement.thighCm?.toString() || '',
        neckCm: measurement.neckCm?.toString() || '',
        notes: measurement.notes || '',
    });

    const [activeField,setActiveField] = useState(null);
    const [isSubmitting,setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!measurement) {
            showErrorFetchAPI('Không có dữ liệu đo chỉ số.');
            navigation.goBack();
        }
    },[measurement,navigation]);

    const handleSubmit = async () => {
        try {
            // UserId validation
            if (!user || !user.userId) {
                showErrorFetchAPI('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.');
                navigation.replace('Login');
                return;
            }
            const userId = parseInt(user.userId,10);
            if (isNaN(userId) || userId <= 0) {
                showErrorFetchAPI('UserId không hợp lệ.');
                return;
            }

            // MeasurementDate validation (required, not in future, not before 1900)
            let measurementDate = measurement.measurementDate || new Date().toISOString().split('T')[0];
            if (!measurementDate) {
                showErrorFetchAPI('Ngày đo là bắt buộc.');
                return;
            }
            const now = new Date();
            const dateObj = new Date(measurementDate);
            if (dateObj > now) {
                showErrorFetchAPI('Ngày đo không được ở tương lai.');
                return;
            }
            if (dateObj.getFullYear() < 1900) {
                showErrorFetchAPI('Ngày đo không hợp lệ.');
                return;
            }

            // Weight: [Range(0.1, 200)]
            const weight = formData.weight ? parseFloat(formData.weight) : null;
            if (weight === null || isNaN(weight) || weight < 0.1 || weight > 200) {
                showErrorFetchAPI('Cân nặng phải từ 0.1 đến 200 kg.');
                return;
            }

            // Height: [Range(50, 250)]
            const height = formData.height ? parseFloat(formData.height) : null;
            if (height !== null && (isNaN(height) || height < 50 || height > 250)) {
                showErrorFetchAPI('Chiều cao phải từ 50 đến 250 cm.');
                return;
            }

            // Body Fat: [Range(0, 100)]
            const bodyFat = formData.bodyFatPercentage ? parseFloat(formData.bodyFatPercentage) : null;
            if (bodyFat !== null && (isNaN(bodyFat) || bodyFat < 0 || bodyFat > 100)) {
                showErrorFetchAPI('Tỷ lệ mỡ cơ thể phải từ 0 đến 100%.');
                return;
            }

            // Chest: [Range(10, 300)]
            const chest = formData.chestCm ? parseFloat(formData.chestCm) : null;
            if (chest !== null && (isNaN(chest) || chest < 10 || chest > 300)) {
                showErrorFetchAPI('Số đo ngực phải từ 10 đến 300 cm.');
                return;
            }

            // Waist: [Range(10, 300)]
            const waist = formData.waistCm ? parseFloat(formData.waistCm) : null;
            if (waist !== null && (isNaN(waist) || waist < 10 || waist > 300)) {
                showErrorFetchAPI('Số đo eo phải từ 10 đến 300 cm.');
                return;
            }

            // Hip: [Range(10, 300)]
            const hip = formData.hipCm ? parseFloat(formData.hipCm) : null;
            if (hip !== null && (isNaN(hip) || hip < 10 || hip > 300)) {
                showErrorFetchAPI('Số đo hông phải từ 10 đến 300 cm.');
                return;
            }

            // Bicep: [Range(10, 300)]
            const bicep = formData.bicepCm ? parseFloat(formData.bicepCm) : null;
            if (bicep !== null && (isNaN(bicep) || bicep < 10 || bicep > 300)) {
                showErrorFetchAPI('Số đo bắp tay phải từ 10 đến 300 cm.');
                return;
            }

            // Thigh: [Range(10, 300)]
            const thigh = formData.thighCm ? parseFloat(formData.thighCm) : null;
            if (thigh !== null && (isNaN(thigh) || thigh < 10 || thigh > 300)) {
                showErrorFetchAPI('Số đo đùi phải từ 10 đến 300 cm.');
                return;
            }

            // Neck: [Range(10, 300)]
            const neck = formData.neckCm ? parseFloat(formData.neckCm) : null;
            if (neck !== null && (isNaN(neck) || neck < 10 || neck > 300)) {
                showErrorFetchAPI('Số đo cổ phải từ 10 đến 300 cm.');
                return;
            }

            // Notes: [StringLength(500)]
            const notes = formData.notes || null;
            if (notes && notes.length > 500) {
                showErrorFetchAPI('Ghi chú không vượt quá 500 ký tự.');
                return;
            }

            const payload = {
                MeasurementId: measurement.measurementId,
                UserId: userId,
                MeasurementDate: measurementDate,
                Weight: weight,
                Height: height,
                BodyFatPercentage: bodyFat,
                ChestCm: chest,
                WaistCm: waist,
                HipCm: hip,
                BicepCm: bicep,
                ThighCm: thigh,
                NeckCm: neck,
                Notes: notes,
            };

            setIsSubmitting(true);
            const response = await bodyMeasurementService.updateMeasurement(measurement.measurementId,payload);

            if (response.statusCode === 200) {
                showSuccessMessage('Cập nhật đo chỉ số thành công.');
                navigation.goBack();
            } else {
                showErrorFetchAPI(response.message || 'Cập nhật đo chỉ số thất bại.');
            }
        } catch (error) {
            showErrorFetchAPI(error.message || 'Cập nhật đo chỉ số thất bại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderInputField = (label,placeholder,field,icon,required = false) => {
        return (
            <View style={styles.inputContainer}>
                <View style={styles.labelContainer}>
                    <Ionicons name={icon} size={18} color="#64748B" style={styles.labelIcon} />
                    <Text style={styles.label}>
                        {label} {required && <Text style={styles.requiredStar}>*</Text>}
                    </Text>
                </View>
                <View style={[
                    styles.inputWrapper,
                    activeField === field && styles.activeInput,
                ]}>
                    <TextInput
                        style={styles.input}
                        placeholder={placeholder}
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        value={formData[field]}
                        onChangeText={(text) => setFormData({ ...formData,[field]: text })}
                        onFocus={() => setActiveField(field)}
                        onBlur={() => setActiveField(null)}
                    />
                    {field === 'weight' && <Text style={styles.unitText}>kg</Text>}
                    {field === 'height' && <Text style={styles.unitText}>cm</Text>}
                    {field === 'bodyFatPercentage' &&
                        <Text style={styles.unitText}>%</Text>}
                    {(field !== 'weight' && field !== 'height' && field !== 'bodyFatPercentage' && field !== 'notes') &&
                        <Text style={styles.unitText}>cm</Text>}
                </View>
            </View>
        );
    };

    if (isSubmitting) {
        return <CommonSkeleton />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={theme.primaryColor} />
            <Header
                title="Edit Body Measurement"
                canGoBack
                onBack={() => navigation.goBack()}
            />
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : null}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    style={styles.form}
                    contentContainerStyle={[styles.formContent,{ marginTop: 50 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Primary Measurements</Text>
                        {renderInputField('Weight','Enter weight','weight','scale-outline',true)}
                        {renderInputField('Height','Enter height','height','resize-outline')}
                        {renderInputField('Body Fat','Enter body fat percentage','bodyFatPercentage','analytics-outline')}
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Body Measurements</Text>
                        <View style={styles.measurementsGrid}>
                            <View style={styles.measurementColumn}>
                                {renderInputField('Chest','Enter chest','chestCm','body-outline')}
                                {renderInputField('Waist','Enter waist','waistCm','ellipse-outline')}
                                {renderInputField('Hip','Enter hip','hipCm','ellipse-outline')}
                            </View>
                            <View style={styles.measurementColumn}>
                                {renderInputField('Bicep','Enter bicep','bicepCm','fitness-outline')}
                                {renderInputField('Thigh','Enter thigh','thighCm','barbell-outline')}
                                {renderInputField('Neck','Enter neck','neckCm','shirt-outline')}
                            </View>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>Additional Information</Text>
                        <View style={styles.inputContainer}>
                            <View style={styles.labelContainer}>
                                <Ionicons name="document-text-outline" size={18} color="#64748B" style={styles.labelIcon} />
                                <Text style={styles.label}>Notes</Text>
                            </View>
                            <View style={[
                                styles.inputWrapper,
                                styles.notesWrapper,
                                activeField === 'notes' && styles.activeInput
                            ]}>
                                <TextInput
                                    style={[styles.input,styles.notesInput]}
                                    placeholder="Enter any additional notes"
                                    placeholderTextColor="#94A3B8"
                                    multiline={true}
                                    numberOfLines={4}
                                    value={formData.notes}
                                    onChangeText={(text) => setFormData({ ...formData,notes: text })}
                                    onFocus={() => setActiveField('notes')}
                                    onBlur={() => setActiveField(null)}
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleSubmit}
                        style={styles.submitButton}
                        disabled={isSubmitting}
                    >
                        <>
                            <Ionicons name="save-outline" size={20} color="#FFFFFF" style={styles.submitIcon} />
                            <Text style={styles.submitButtonText}>Save Measurement</Text>
                        </>
                    </TouchableOpacity>

                    <View style={styles.bottomPadding} />
                </ScrollView>
            </KeyboardAvoidingView>
            <FloatingMenuButton
                initialPosition={{ x: width - 70,y: height - 100 }}
                autoHide={true}
                navigation={navigation}
                autoHideDelay={4000}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.primaryColor
    },
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        marginTop: 15
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
    headerRight: {
        width: 40,
    },
    form: {
        flex: 1,
    },
    formContent: {
        padding: 16,
    },
    formSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0,height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 16,
    },
    measurementsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    measurementColumn: {
        width: '48%',
    },
    inputContainer: {
        marginBottom: 16,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    labelIcon: {
        marginRight: 6,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
    },
    requiredStar: {
        color: '#EF4444',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
    },
    activeInput: {
        borderColor: '#2563EB',
        borderWidth: 2,
    },
    input: {
        flex: 1,
        height: 44,
        fontSize: 16,
        color: '#0F172A',
    },
    unitText: {
        fontSize: 14,
        color: '#64748B',
        marginLeft: 4,
    },
    notesWrapper: {
        alignItems: 'flex-start',
    },
    notesInput: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    submitButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0056d2",
        paddingVertical: 16,
        borderRadius: 12,
        marginHorizontal: 16,
        marginTop: 8,
        ...Platform.select({
            ios: {
                shadowColor: "#0056d2",
                shadowOffset: { width: 0,height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 6,
            },
        }),
    },
    submitIcon: {
        marginRight: 8,
    },
    submitButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    bottomPadding: {
        height: 80,
    },
});