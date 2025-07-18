import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import Header from "components/Header";
import { apiProgressComparisonService } from "services/apiProgressComparisonService";
import { apiProgressPhotoService } from "services/apiProgressPhotoService";
import { apiUploadImageCloudService } from "services/apiUploadImageCloudService";
import * as ImagePicker from "expo-image-picker";

export default function EditProgressComparisonScreen({ route, navigation }) {
  const { comparison } = route.params;
  const [description, setDescription] = useState(comparison.description || "");
  const [beforePhoto, setBeforePhoto] = useState(comparison.progressPhotos?.[0]?.beforePhotoUrl || "");
  const [afterPhoto, setAfterPhoto] = useState(comparison.progressPhotos?.[0]?.afterPhotoUrl || "");
  const [notes, setNotes] = useState(comparison.progressPhotos?.[0]?.notes || "");
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [modalTitle, setModalTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const openImage = (uri, title) => {
    setModalImage(uri);
    setModalTitle(title);
    setModalVisible(true);
  };
  const closeModal = () => {
    setModalVisible(false);
    setModalImage(null);
    setModalTitle("");
  };

  const pickImage = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow access to your photo library to continue.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        if (type === "before") setBeforePhoto(result.assets[0].uri);
        else setAfterPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const takePhoto = async (type) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow camera access to take photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled) {
        if (type === "before") setBeforePhoto(result.assets[0].uri);
        else setAfterPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to capture image. Please try again.");
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);
      let beforePhotoUrl = beforePhoto;
      let afterPhotoUrl = afterPhoto;
      // Nếu là ảnh mới (local uri), upload lên cloud
      if (beforePhoto && beforePhoto.startsWith("file:")) {
        const formData = new FormData();
        formData.append("file", {
          uri: beforePhoto,
          type: "image/jpeg",
          name: `before_${Date.now()}.jpg`,
        });
        const upload = await apiUploadImageCloudService.uploadImage(formData);
        if (upload.isError) throw new Error(upload.message);
        beforePhotoUrl = upload.imageUrl;
      }
      if (afterPhoto && afterPhoto.startsWith("file:")) {
        const formData = new FormData();
        formData.append("file", {
          uri: afterPhoto,
          type: "image/jpeg",
          name: `after_${Date.now()}.jpg`,
        });
        const upload = await apiUploadImageCloudService.uploadImage(formData);
        if (upload.isError) throw new Error(upload.message);
        afterPhotoUrl = upload.imageUrl;
      }
      // Cập nhật comparison
      await apiProgressComparisonService.updateComparison(comparison.comparisonId || comparison.id, {
        description,
      });
      // Cập nhật progress photo (giả sử chỉ có 1 photo)
      if (comparison.progressPhotos?.[0]?.progressPhotoId) {
        await apiProgressPhotoService.updateProgressPhoto(comparison.progressPhotos[0].progressPhotoId, {
          beforePhotoUrl,
          afterPhotoUrl,
          notes,
        });
      }
      Alert.alert("Thành công", "Cập nhật thành công!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Lỗi", error?.response?.data?.message || error.message || "Cập nhật thất bại!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header
        title="Edit Progress Comparison"
        onBack={() => navigation.goBack()}
        backgroundColor="#fff"
        textColor="#1F2937"
        rightActions={[]}
      />
      <ScrollView style={{ marginTop: 55 }}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your progress..."
            multiline
          />
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Before Photo</Text>
          {beforePhoto ? (
            <TouchableOpacity onPress={() => openImage(beforePhoto, "Before Photo")}> 
              <Image source={{ uri: beforePhoto }} style={styles.photo} />
            </TouchableOpacity>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Text style={styles.photoPlaceholderText}>No photo</Text>
            </View>
          )}
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={() => takePhoto("before")}> 
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={() => pickImage("before")}> 
              <Ionicons name="images" size={18} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>After Photo</Text>
          {afterPhoto ? (
            <TouchableOpacity onPress={() => openImage(afterPhoto, "After Photo")}> 
              <Image source={{ uri: afterPhoto }} style={styles.photo} />
            </TouchableOpacity>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Text style={styles.photoPlaceholderText}>No photo</Text>
            </View>
          )}
          <View style={styles.photoButtons}>
            <TouchableOpacity style={styles.photoButton} onPress={() => takePhoto("after")}> 
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={() => pickImage("after")}> 
              <Ionicons name="images" size={18} color="#FFFFFF" />
              <Text style={styles.photoButtonText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photo Notes</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about your photos..."
            multiline
          />
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={uploading}>
          <Text style={styles.saveButtonText}>{uploading ? "Saving..." : "Save Changes"}</Text>
        </TouchableOpacity>
      </ScrollView>
      {/* Image Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal} statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Pressable style={styles.modalContent} onPress={closeModal}>
            {modalImage && <Image source={{ uri: modalImage }} style={styles.fullImage} resizeMode="contain" />}
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    fontSize: 15,
    color: "#4B5563",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    minHeight: 40,
  },
  photo: {
    width: 140,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginTop: 8,
  },
  photoPlaceholder: {
    width: 140,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  photoButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056d2",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  photoButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
  },
  saveButton: {
    backgroundColor: "#0056d2",
    borderRadius: 8,
    paddingVertical: 14,
    margin: 24,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  fullImage: {
    width: "100%",
    height: "80%",
    borderRadius: 12,
  },
});
