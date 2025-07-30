import React,{ useState,useEffect,useRef,useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from 'context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { useNavigation,useRoute } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showErrorMessage,showSuccessMessage } from 'utils/toastUtil';
import { WebView } from 'react-native-webview';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';
import Header from 'components/Header';
import CommonSkeleton from 'components/CommonSkeleton/CommonSkeleton';

const EditServicePackageScreen = () => {
    const { user,loading: authLoading } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute();
    const { packageId } = route.params || {};
    const [newPackage,setNewPackage] = useState({
        packageName: '',
        description: '',
        price: '',
        durationDays: '',
        status: 'active',
        maxSubscribers: '',
        trainerId: user?.userId || 0,
    });
    const [formErrors,setFormErrors] = useState({});
    const [actionLoading,setActionLoading] = useState(false);
    const [loadingPackage,setLoadingPackage] = useState(true);
    const [editorHtml,setEditorHtml] = useState('');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const webViewRef = useRef(null);

    const generateCkEditorHtml = (initialData = '') => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://cdn.ckeditor.com/ckeditor5/39.0.0/classic/ckeditor.js"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          background: #F8FAFC;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
        }
        #editor-container {
          width: 100%;
          box-sizing: border-box;
        }
        .ck-editor__top {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #F1F5F9;
          border-bottom: 1px solid #E2E8F0;
        }
        .ck-editor__editable {
          min-height: 150px;
          padding: 12px;
          background: #F8FAFC;
        }
        .ck-content {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          font-size: 16px;
          color: #1E293B;
        }
      </style>
    </head>
    <body>
      <div id="editor-container">
        <div id="editor"></div>
      </div>
      <script>
        ClassicEditor
          .create( document.querySelector( '#editor' ), {
            toolbar: {
              items: [
                'undo', 'redo',
                '|',
                'bold', 'italic',
                '|',
                'bulletedList', 'numberedList',
                '|',
                'link',
                '|',
                'sourceEditing'
              ]
            },
            language: 'en',
            initialData: '${(initialData || "").replace(/'/g,"\\'")}'
          } )
          .then( editor => {
            editor.model.document.on( 'change:data', () => {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'content', data: editor.getData() }));
            } );
          } )
          .catch( error => {
            console.error( error );
          } );
      </script>
    </body>
    </html>
  `;

    useEffect(() => {
        if (authLoading) return;
        if (!packageId) {
            showErrorMessage('Invalid package ID');
            navigation.goBack();
            return;
        }

        const fetchPackageDetails = async () => {
            try {
                setLoadingPackage(true);
                const response = await trainerService.getServicePackageById(packageId);
                if (response.statusCode === 200 && response.data) {
                    if (response.data.trainerId === user.userId || response.data.trainerId === 0) {
                        setNewPackage({
                            packageName: response.data.packageName || '',
                            description: response.data.description || '',
                            price: response.data.price ? response.data.price.toString() : '',
                            durationDays: response.data.durationDays ? response.data.durationDays.toString() : '',
                            status: response.data.status || 'active',
                            maxSubscribers: response.data.maxSubscribers ? response.data.maxSubscribers.toString() : '',
                            trainerId: user.userId,
                        });
                        setEditorHtml(generateCkEditorHtml(response.data.description));
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
                    } else {
                        showErrorFetchAPI(new Error('You do not have permission to edit this package.'));
                        navigation.goBack();
                    }
                } else {
                    showErrorFetchAPI(new Error('Package not found.'));
                    navigation.goBack();
                }
            } catch (error) {
                showErrorFetchAPI(error);
                navigation.goBack();
            } finally {
                setLoadingPackage(false);
            }
        };

        fetchPackageDetails();
    },[authLoading,user,packageId,navigation,fadeAnim,slideAnim]);

    const validatePackageForm = () => {
        const errors = {};

        if (!newPackage.packageName.trim()) {
            errors.packageName = 'Package name is required.';
        } else if (newPackage.packageName.length < 3 || newPackage.packageName.length > 255) {
            errors.packageName = 'Package name must be between 3 and 255 characters.';
        }
        if (newPackage.description.replace(/<[^>]*>/g,'').length > 1000) {
            errors.description = 'Description cannot exceed 1000 characters.';
        }
        if (!newPackage.price || isNaN(parseFloat(newPackage.price)) || parseFloat(newPackage.price) < 0) {
            errors.price = 'Price must be a non-negative number.';
        }
        if (!newPackage.durationDays || isNaN(parseInt(newPackage.durationDays)) || parseInt(newPackage.durationDays) <= 0) {
            errors.durationDays = 'Duration must be a positive number of days.';
        }
        if (!['active','inactive'].includes(newPackage.status)) {
            errors.status = "Status must be 'active' or 'inactive'.";
        }
        if (newPackage.maxSubscribers && (isNaN(parseInt(newPackage.maxSubscribers)) || parseInt(newPackage.maxSubscribers) < 0)) {
            errors.maxSubscribers = 'Maximum subscribers must be a non-negative number.';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleInputChange = (field,value) => {
        setNewPackage((prev) => ({ ...prev,[field]: value }));
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev,[field]: undefined }));
        }
    };

    const handleUpdatePackage = async () => {
        if (!validatePackageForm()) {
            showErrorFetchAPI(new Error('Please correct the errors in the form.'));
            return;
        }
        try {
            setActionLoading(true);
            const packageData = {
                ...newPackage,
                packageId,
                price: parseFloat(newPackage.price),
                durationDays: parseInt(newPackage.durationDays),
                maxSubscribers: newPackage.maxSubscribers ? parseInt(newPackage.maxSubscribers) : null,
                trainerId: user.userId,
            };
            const response = await trainerService.updateServicePackage(packageId,packageData);
            if (response.statusCode === 200) {
                showSuccessMessage('Service package updated successfully.');
                navigation.navigate('TrainerServiceManagement');
            } else {
                throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to update package.'}`);
            }
        } catch (error) {
            showErrorFetchAPI(error);
        } finally {
            setActionLoading(false);
        }
    };

    const renderLoadingScreen = () => (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <CommonSkeleton />
        </SafeAreaView>
    );

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
                    style={[styles.statusOption,newPackage.status === 'active' && styles.statusOptionActive]}
                    onPress={() => handleInputChange('status','active')}
                >
                    <View style={styles.statusOptionHeader}>
                        <Ionicons name="pulse" size={20} color={newPackage.status === 'active' ? '#FFFFFF' : '#0056D2'} />
                        <Text style={[styles.statusOptionTitle,newPackage.status === 'active' && styles.statusOptionTitleActive]}>
                            Active
                        </Text>
                    </View>
                    <Text style={[styles.statusOptionDesc,newPackage.status === 'active' && styles.statusOptionDescActive]}>
                        Package is available for subscription
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.statusOption,newPackage.status === 'inactive' && styles.statusOptionActive]}
                    onPress={() => handleInputChange('status','inactive')}
                >
                    <View style={styles.statusOptionHeader}>
                        <Ionicons name="close-circle-outline" size={20} color={newPackage.status === 'inactive' ? '#FFFFFF' : '#0056D2'} />
                        <Text style={[styles.statusOptionTitle,newPackage.status === 'inactive' && styles.statusOptionTitleActive]}>
                            Inactive
                        </Text>
                    </View>
                    <Text style={[styles.statusOptionDesc,newPackage.status === 'inactive' && styles.statusOptionDescActive]}>
                        Package is not available for subscription
                    </Text>
                </TouchableOpacity>
            </View>
            {formErrors.status && <Text style={styles.errorText}>{formErrors.status}</Text>}
        </Animated.View>
    );

    const renderFormField = (label,value,onChangeText,placeholder,keyboardType = 'default') => (
        <Animated.View
            style={[
                styles.inputContainer,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <Text style={styles.inputLabel}>{label}</Text>
            <View style={[styles.inputWrapper,formErrors[label.toLowerCase().replace(' ($)','').replace(/\s+/g,'')] && styles.inputError]}>
                <Ionicons
                    name={
                        label === 'Package Name' ? 'pricetag-outline' :
                            label === 'Price ($)' ? 'cash-outline' :
                                label === 'Duration (Days)' ? 'calendar-outline' :
                                    'people-outline'
                    }
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType={keyboardType}
                />
            </View>
            {formErrors[label.toLowerCase().replace(' ($)','').replace(/\s+/g,'')] && (
                <Text style={styles.errorText}>{formErrors[label.toLowerCase().replace(' ($)','').replace(/\s+/g,'')]}</Text>
            )}
        </Animated.View>
    );

    if (loadingPackage) return renderLoadingScreen();

    return (
        <SafeAreaView style={styles.container}>
            <DynamicStatusBar backgroundColor="#F8FAFC" />
            <Header
                title="Edit Service"
                onBack={() => navigation.goBack()}
                backIconColor="#0056D2"
            />

            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Animated.View style={[styles.content,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {renderFormField(
                            'Package Name',
                            newPackage.packageName,
                            (text) => handleInputChange('packageName',text),
                            'Enter package name'
                        )}
                        <Animated.View
                            style={[
                                styles.inputContainer,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }],
                                },
                            ]}
                        >
                            <Text style={styles.inputLabel}>Description</Text>
                            <View style={[styles.richEditorWrapper,formErrors.description && styles.inputError]}>
                                <WebView
                                    ref={webViewRef}
                                    originWhitelist={['*']}
                                    source={{ html: editorHtml }}
                                    style={styles.richEditor}
                                    onMessage={(event) => {
                                        const message = JSON.parse(event.nativeEvent.data);
                                        if (message.type === 'content') {
                                            handleInputChange('description',message.data);
                                        }
                                    }}
                                    javaScriptEnabled={true}
                                    domStorageEnabled={true}
                                    startInLoadingState={true}
                                    showsVerticalScrollIndicator={false}
                                    showsHorizontalScrollIndicator={false}
                                    scrollEnabled={false}
                                    scalesPageToFit={false}
                                    automaticallyAdjustContentInsets={false}
                                    contentInset={{ top: 0,left: 0,bottom: 0,right: 0 }}
                                />
                            </View>
                            {formErrors.description && <Text style={styles.errorText}>{formErrors.description}</Text>}
                        </Animated.View>
                        {renderFormField(
                            'Price ($)',
                            newPackage.price,
                            (text) => handleInputChange('price',text),
                            'Enter price',
                            'numeric'
                        )}
                        {renderFormField(
                            'Duration (Days)',
                            newPackage.durationDays,
                            (text) => handleInputChange('durationDays',text),
                            'Enter duration',
                            'numeric'
                        )}
                        {renderFormField(
                            'Maximum Subscribers (Optional)',
                            newPackage.maxSubscribers,
                            (text) => handleInputChange('maxSubscribers',text),
                            'Enter max subscribers',
                            'numeric'
                        )}
                        {renderStatusSelector()}
                        <TouchableOpacity
                            style={[styles.button,actionLoading && styles.buttonDisabled]}
                            onPress={handleUpdatePackage}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="save" size={20} color="#FFFFFF" />
                                    <Text style={styles.buttonText}>Update Package</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </TouchableWithoutFeedback>
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
    content: {
        flex: 1,
        marginTop: 80
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
    },
    inputError: {
        borderColor: '#EF4444',
    },
    inputIcon: {
        marginLeft: 12,
        marginRight: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        paddingRight: 12,
        fontSize: 16,
        color: '#1E293B',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    richEditorWrapper: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minHeight: 150,
    },
    richEditor: {
        minHeight: 150,
        backgroundColor: '#F8FAFC',
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
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
});

export default EditServicePackageScreen;