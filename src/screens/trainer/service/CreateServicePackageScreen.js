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
import { useNavigation } from '@react-navigation/native';
import { trainerService } from 'services/apiTrainerService';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import { RichEditor,RichToolbar,actions } from 'react-native-pell-rich-editor';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const CreateServicePackageScreen = () => {
  const { user,loading: authLoading } = useContext(AuthContext);
  const navigation = useNavigation();
  const richText = useRef();
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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (authLoading) return;
    if (!user?.roles?.includes('Trainer') && user?.roles?.includes('User')) {
      showErrorFetchAPI(new Error('This page is only accessible to trainers.'));
      navigation.goBack();
      return;
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
  },[authLoading,user,fadeAnim,slideAnim]);

  const validatePackageForm = () => {
    const errors = {};

    if (!newPackage.packageName.trim()) {
      errors.packageName = 'Package name is required.';
    } else if (newPackage.packageName.length < 3 || newPackage.packageName.length > 255) {
      errors.packageName = 'Package name must be between 3 and 255 characters.';
    }
    if (newPackage.description.length > 1000) {
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
    if (!newPackage.maxSubscribers || isNaN(parseInt(newPackage.maxSubscribers)) || parseInt(newPackage.maxSubscribers) <= 0) {
      errors.maxSubscribers = 'Maximum subscribers must be a positive number.';
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

  const handleCreatePackage = async () => {
    if (!validatePackageForm()) {
      showErrorFetchAPI(new Error('Please correct the errors in the form.'));
      return;
    }
    try {
      setActionLoading(true);
      const packageData = {
        ...newPackage,
        price: parseFloat(newPackage.price),
        durationDays: parseInt(newPackage.durationDays),
        maxSubscribers: parseInt(newPackage.maxSubscribers),
        trainerId: user.userId,
      };
      console.log('Creating package with data:',packageData);
      const response = await trainerService.createServicePackage(packageData);
      if (response.statusCode === 201) {
        showSuccessMessage('Service package created successfully.');
        navigation.navigate('TrainerServiceManagement');
      } else {
        throw new Error(`Error ${response.statusCode}: ${response.message || 'Failed to create package.'}`);
      }
    } catch (error) {
      showErrorFetchAPI(error);
    } finally {
      setActionLoading(false);
    }
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

  return (
    <SafeAreaView style={styles.container}>
      <DynamicStatusBar backgroundColor="#F8FAFC" />
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0056D2" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Create Service Package</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </View>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <Animated.View style={[styles.content,{ opacity: fadeAnim,transform: [{ translateY: slideAnim }] }]}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Package Name</Text>
              <View style={[styles.inputWrapper,formErrors.packageName && styles.inputError]}>
                <Ionicons name="pricetag-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPackage.packageName}
                  onChangeText={(text) => handleInputChange('packageName',text)}
                  placeholder="Enter package name"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {formErrors.packageName && <Text style={styles.errorText}>{formErrors.packageName}</Text>}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description</Text>
              <View style={[styles.richEditorWrapper,formErrors.description && styles.inputError]}>
                <RichEditor
                  ref={richText}
                  initialContentHTML={newPackage.description}
                  onChange={(text) => handleInputChange('description',text)}
                  placeholder="Enter description"
                  style={styles.richEditor}
                  editorStyle={{
                    backgroundColor: '#F8FAFC',
                    color: '#1E293B',
                    placeholderColor: '#94A3B8',
                    contentCSSText: `font-size: 16px; padding: 12px; font-family: ${Platform.OS === 'ios' ? 'System' : 'Roboto'};`,
                  }}
                />
              </View>
              <RichToolbar
                editor={richText}
                actions={[
                  actions.setBold,
                  actions.setItalic,
                  actions.insertBulletsList,
                  actions.insertOrderedList,
                  actions.insertLink,
                  actions.undo,
                  actions.redo,
                ]}
                iconTint="#64748B"
                selectedIconTint="#0056D2"
                style={styles.richToolbar}
              />
              {formErrors.description && <Text style={styles.errorText}>{formErrors.description}</Text>}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Price ($)</Text>
              <View style={[styles.inputWrapper,formErrors.price && styles.inputError]}>
                <Ionicons name="cash-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPackage.price}
                  onChangeText={(text) => handleInputChange('price',text)}
                  placeholder="Enter price"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {formErrors.price && <Text style={styles.errorText}>{formErrors.price}</Text>}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Duration (Days)</Text>
              <View style={[styles.inputWrapper,formErrors.durationDays && styles.inputError]}>
                <Ionicons name="calendar-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPackage.durationDays}
                  onChangeText={(text) => handleInputChange('durationDays',text)}
                  placeholder="Enter duration"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {formErrors.durationDays && <Text style={styles.errorText}>{formErrors.durationDays}</Text>}
            </View>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Maximum Subscribers</Text>
              <View style={[styles.inputWrapper,formErrors.maxSubscribers && styles.inputError]}>
                <Ionicons name="people-outline" size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={newPackage.maxSubscribers}
                  onChangeText={(text) => handleInputChange('maxSubscribers',text)}
                  placeholder="Enter max subscribers"
                  keyboardType="numeric"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              {formErrors.maxSubscribers && <Text style={styles.errorText}>{formErrors.maxSubscribers}</Text>}
            </View>
            {renderStatusSelector()}
            <TouchableOpacity
              style={[styles.button,actionLoading && styles.buttonDisabled]}
              onPress={handleCreatePackage}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Create Package</Text>
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
    width: 40, // Placeholder for alignment
  },
  content: {
    flex: 1,
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
    padding: 12,
  },
  richToolbar: {
    backgroundColor: '#F1F5F9',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderTopWidth: 0,
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
});

export default CreateServicePackageScreen;