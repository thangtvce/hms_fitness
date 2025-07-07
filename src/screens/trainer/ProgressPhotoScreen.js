import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { trainerService } from 'services/apiTrainerService';
import { useAuth } from 'context/AuthContext';

const ProgressPhotoScreen = ({ route }) => {
  const { packageId } = route.params || {};
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [beforeMeasurementId, setBeforeMeasurementId] = useState('');
  const [comparisonId, setComparisonId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const queryParams = {
          pageNumber: 1,
          pageSize: 10,
          ...(user?.userId && { userId: user.userId }),
          ...(packageId && { packageId }),
        };
        const photoResponse = await trainerService.getProgressPhotos(queryParams);
        if (photoResponse.statusCode === 200 && photoResponse.data) {
          setPhotos(photoResponse.data.photos || []);
        } else {
          const errorMessage = photoResponse.message || 'Unknown error';
          Alert.alert('Error', `Error ${photoResponse.statusCode}: ${errorMessage}`);
        }

        const comparisonQuery = { pageNumber: 1, pageSize: 10, userId: user?.userId };
        const comparisonResponse = await trainerService.getProgressComparisons(comparisonQuery); // Assume this method
        if (comparisonResponse.statusCode === 200 && comparisonResponse.data) {
          setComparisons(comparisonResponse.data.comparisons || []);
          const activeComparison = comparisonResponse.data.comparisons.find(c => c.Status === 'active');
          if (activeComparison) setComparisonId(activeComparison.ComparisonId);
        } else {
          const errorMessage = comparisonResponse.message || 'Unknown error';
          Alert.alert('Error', `Error ${comparisonResponse.statusCode}: ${errorMessage}`);
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'An error occurred while fetching data';
        Alert.alert('Error', `Error: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [packageId, user?.userId]);

  const createComparison = async () => {
    if (!beforeMeasurementId) {
      Alert.alert('Error', 'Please enter a Before Measurement ID.');
      return;
    }
    try {
      const comparisonData = {
        userId: user?.userId,
        beforeMeasurementId: parseInt(beforeMeasurementId),
        afterMeasurementId: null,
        comparisonDate: new Date().toISOString(),
        weightChange: 0,
        bodyFatChange: 0,
        description: null,
        status: 'active',
      };
      const response = await trainerService.createComparison(comparisonData);
      if (response.statusCode === 201) {
        setComparisonId(response.data.ComparisonId);
        Alert.alert('Success', 'Comparison created successfully.');
      } else {
        Alert.alert('Error', response.message || 'Failed to create comparison.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while creating the comparison.');
    }
  };

  const handleUploadPhoto = async () => {
    if (!user?.userId) {
      Alert.alert('Error', 'Please log in to upload photos.');
      return;
    }

    if (!comparisonId) {
      Alert.alert(
        'Create Comparison',
        'You need to create a comparison before uploading a photo. Enter Before Measurement ID:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Create',
            onPress: () => createComparison(),
          },
        ],
        { cancelable: true }
      );
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Error', 'Permission to access camera roll is required!');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!pickerResult.cancelled) {
      setUploadLoading(true);
      try {
        const formData = new FormData();
        formData.append('photo', {
          uri: pickerResult.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
        });
        formData.append('comparisonId', comparisonId);
        formData.append('photoDate', new Date().toISOString());
        formData.append('notes', 'Progress photo');
        formData.append('createdBy', user.userId);

        const response = await trainerService.uploadProgressPhoto(formData);
        if (response.statusCode === 201) {
          const newPhoto = response.data; // Expecting { PhotoId, BeforePhotoUrl, ... }
          Alert.alert('Success', 'Photo uploaded successfully.');
          setPhotos([...photos, newPhoto]);

          Alert.alert(
            'Update Comparison',
            'Do you want to enter an After Measurement ID to update the comparison?',
            [
              { text: 'Skip', style: 'cancel' },
              {
                text: 'Update',
                onPress: () => {
                  Alert.prompt(
                    'Enter After Measurement ID',
                    'Please enter the After Measurement ID:',
                    [
                      {
                        text: 'Cancel',
                        style: 'cancel',
                      },
                      {
                        text: 'Submit',
                        onPress: async (afterId) => {
                          if (afterId) {
                            const updateData = {
                              afterMeasurementId: parseInt(afterId),
                              comparisonDate: new Date().toISOString(),
                              weightChange: 1, // Placeholder, assume backend calculates
                              bodyFatChange: 1, // Placeholder
                              description: 'Updated comparison', // Placeholder
                            };
                            const updateResponse = await trainerService.updateComparison(comparisonId, updateData);
                            if (updateResponse.statusCode === 200) {
                              Alert.alert('Success', 'Comparison updated successfully.');
                            } else {
                              Alert.alert('Error', updateResponse.message || 'Failed to update comparison.');
                            }
                          }
                        },
                      },
                    ],
                    'plain-text'
                  );
                },
              },
            ],
            { cancelable: true }
          );
        } else {
          const errorMessage = response.message || 'Unknown error';
          Alert.alert('Error', `Error ${response.statusCode}: ${errorMessage}`);
        }
      } catch (error) {
        const errorMessage = error.response?.data?.message || error.message || 'An error occurred while uploading the photo';
        Alert.alert('Error', `Error: ${errorMessage}`);
      } finally {
        setUploadLoading(false);
      }
    }
  };

  const renderPhoto = ({ item }) => (
    <Image
      source={{ uri: item.BeforePhotoUrl || item.AfterPhotoUrl }} // Use either URL
      style={styles.photo}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Progress Photos</Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadPhoto}
          disabled={uploadLoading}
        >
          <Feather name="upload" size={24} color={uploadLoading ? '#ccc' : '#fff'} />
          <Text style={styles.uploadButtonText}>
            {uploadLoading ? 'Uploading...' : 'Upload Photo'}
          </Text>
        </TouchableOpacity>
      </View>
      {!comparisonId && (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Before Measurement ID"
            value={beforeMeasurementId}
            onChangeText={setBeforeMeasurementId}
            keyboardType="numeric"
          />
          <TouchableOpacity style={styles.createButton} onPress={createComparison} disabled={!beforeMeasurementId}>
            <Text style={styles.createButtonText}>Create Comparison</Text>
          </TouchableOpacity>
        </View>
      )}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item, index) => item.PhotoId?.toString() || index.toString()}
          numColumns={2}
          contentContainerStyle={styles.photoGrid}
          ListEmptyComponent={<Text style={styles.emptyText}>No photos available.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },
  photoGrid: {
    paddingBottom: 16,
  },
  photo: {
    width: 150,
    height: 150,
    margin: 8,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export default ProgressPhotoScreen;