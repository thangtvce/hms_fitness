
import React,{ useState } from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
} from "react-native"
import Ionicons from "react-native-vector-icons/Ionicons"
import Header from 'components/Header';
import { apiProgressComparisonService } from "services/apiProgressComparisonService"
import { showErrorFetchAPI,showInfoMessage,showSuccessMessage } from "utils/toastUtil";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProgressComparisonDetailScreen({ route,navigation }) {

  const handleDelete = async (comparisonId) => {
    try {
      if (comparison.progressPhotos && comparison.progressPhotos.length > 0) {
        const deletePhotoPromises = comparison.progressPhotos
          .filter(p => p.progressPhotoId)
          .map(p => apiProgressComparisonService.deleteProgressPhoto(p.progressPhotoId)
            .catch(err => ({ error: err,id: p.progressPhotoId }))
          );
        const results = await Promise.all(deletePhotoPromises);
        const failed = results.filter(r => r && r.error);
        if (failed.length > 0) {
          showInfoMessage(`Failed to delete ${failed.length} linked photo(s). Cannot delete comparison.`)
          return;
        }
      }
      await apiProgressComparisonService.deleteComparison(comparisonId);
      showSuccessMessage('Deleted successfully!')
      navigation.goBack();
    } catch (error) {
      showErrorFetchAPI(error);
    }
  };

  const { comparison } = route.params
  const photo = comparison.progressPhotos && comparison.progressPhotos[0]
  const beforePhoto = photo?.beforePhotoUrl
  const afterPhoto = photo?.afterPhotoUrl
  const notes = photo?.notes || "No notes provided"

  const comparisonDate = comparison.comparisonDate
    ? new Date(comparison.comparisonDate).toLocaleDateString("en-US",{
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "Date not available"

  const [modalVisible,setModalVisible] = useState(false)
  const [modalImage,setModalImage] = useState(null)
  const [modalTitle,setModalTitle] = useState("")

  const openImage = (uri,title) => {
    setModalImage(uri)
    setModalTitle(title)
    setModalVisible(true)
  }

  const closeModal = () => {
    setModalVisible(false)
    setModalImage(null)
    setModalTitle("")
  }

  const getChangeColor = (value) => {
    if (value > 0) return "#22C55E"
    if (value < 0) return "#EF4444"
    return "#6B7280"
  }

  const getChangeIcon = (value) => {
    if (value > 0) return "trending-up"
    if (value < 0) return "trending-down"
    return "remove"
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Header
        title="Progress Details"
        onBack={() => navigation.goBack()}
        backgroundColor="#fff"
        textColor="#1F2937"
        rightActions={[
          {
            icon: <Ionicons name="create-outline" size={22} color="#1F2937" />, // Edit icon
            onPress: () => {
              navigation.navigate('EditProgressComparisonScreen',{ comparison });
            },
          },
          {
            icon: <Ionicons name="trash-outline" size={22} color="#EF4444" />, // Delete icon
            onPress: () => {
              handleDelete(comparison.comparisonId || comparison.id);
            },
          },
        ]}
      />
      <ScrollView style={[styles.scrollView,{ marginTop: 55 }]} showsVerticalScrollIndicator={false}>
        {/* Date Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Date</Text>
          </View>
          <Text style={styles.dateText}>{comparisonDate}</Text>
        </View>

        {/* Changes Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Changes</Text>
          </View>

          <View style={styles.changesContainer}>
            {/* Weight Change */}
            <View style={styles.changeItem}>
              <View style={styles.changeHeader}>
                <Ionicons name="fitness-outline" size={18} color="#6B7280" />
                <Text style={styles.changeLabel}>Weight</Text>
              </View>
              <View style={styles.changeValueContainer}>
                <Ionicons
                  name={getChangeIcon(comparison.weightChange)}
                  size={16}
                  color={getChangeColor(comparison.weightChange)}
                />
                <Text style={[styles.changeValue,{ color: getChangeColor(comparison.weightChange) }]}>
                  {comparison.weightChange > 0 ? "+" : ""}
                  {comparison.weightChange} kg
                </Text>
              </View>
            </View>

            {/* Body Fat Change */}
            {comparison.bodyFatChange !== null && (
              <View style={styles.changeItem}>
                <View style={styles.changeHeader}>
                  <Ionicons name="body-outline" size={18} color="#6B7280" />
                  <Text style={styles.changeLabel}>Body Fat</Text>
                </View>
                <View style={styles.changeValueContainer}>
                  <Ionicons
                    name={getChangeIcon(comparison.bodyFatChange)}
                    size={16}
                    color={getChangeColor(comparison.bodyFatChange)}
                  />
                  <Text style={[styles.changeValue,{ color: getChangeColor(comparison.bodyFatChange) }]}>
                    {comparison.bodyFatChange > 0 ? "+" : ""}
                    {comparison.bodyFatChange}%
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.descriptionText}>{comparison.description || "No description provided"}</Text>
        </View>

        {/* Photos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="images-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Progress Photos</Text>
          </View>

          <View style={styles.photosContainer}>
            {/* Before Photo */}
            <View style={styles.photoSection}>
              <Text style={styles.photoLabel}>Before</Text>
              {beforePhoto ? (
                <TouchableOpacity
                  style={styles.photoContainer}
                  onPress={() => openImage(beforePhoto,"Before Photo")}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: beforePhoto }} style={styles.photo} />
                  <View style={styles.photoOverlay}>
                    <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.photoPlaceholderText}>No photo</Text>
                </View>
              )}
            </View>

            {/* After Photo */}
            <View style={styles.photoSection}>
              <Text style={styles.photoLabel}>After</Text>
              {afterPhoto ? (
                <TouchableOpacity
                  style={styles.photoContainer}
                  onPress={() => openImage(afterPhoto,"After Photo")}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: afterPhoto }} style={styles.photo} />
                  <View style={styles.photoOverlay}>
                    <Ionicons name="expand-outline" size={20} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.photoPlaceholderText}>No photo</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Notes Section */}
        <View style={[styles.section,styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-outline" size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Photo Notes</Text>
          </View>
          <Text style={styles.notesText}>{notes}</Text>
        </View>
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
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  // header, backButton, headerTitle, headerSpacer đã được thay thế bằng Header.js
  scrollView: {
    flex: 1,
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
  lastSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
  },
  dateText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  changesContainer: {
    gap: 16,
  },
  changeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  changeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeLabel: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
    marginLeft: 8,
  },
  changeValueContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  changeValue: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 6,
  },
  descriptionText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
  },
  photosContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  photoSection: {
    flex: 1,
    alignItems: "center",
  },
  photoLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  photoContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  photo: {
    width: 140,
    height: 180,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  photoOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
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
  },
  photoPlaceholderText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    textAlign: "center",
  },
  notesText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
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
})
