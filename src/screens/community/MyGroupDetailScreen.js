import { useEffect,useState,useRef } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
  Animated,
  Platform,
} from "react-native"
import { useNavigation,useRoute } from "@react-navigation/native"
import { getMyGroupActiveById,deleteGroup } from "services/apiCommunityService"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { RichEditor } from "react-native-pell-rich-editor"
import { showErrorMessage,showSuccessMessage,showErrorFetchAPI } from "utils/toastUtil"

const { width } = Dimensions.get("window")

const MyGroupDetailScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { groupId } = route.params || {}

  const [group,setGroup] = useState(null)
  const [loading,setLoading] = useState(true)
  const [deleting,setDeleting] = useState(false)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    if (groupId) {
      fetchGroupData()
    } else {
      showErrorMessage("No group ID provided")
      navigation.goBack()
    }
  },[groupId])

  const fetchGroupData = async () => {
    try {
      setLoading(true)
      const data = await getMyGroupActiveById(groupId)
      if (data) {
        setGroup(data)
        startAnimations()
      } else {
        showErrorMessage("Group not found")
        navigation.goBack()
      }
    } catch (err) {
      showErrorFetchAPI(err)
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim,{
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim,{
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const handleEdit = () => {
    navigation.navigate("EditGroupScreen",{ groupId })
  }

  const handleViewMembers = () => {
    navigation.navigate("ActiveMembersScreen",{ groupId })
  }

  const handleViewRequests = () => {
    navigation.navigate("PendingMembersScreen",{ groupId })
  }

  const handleViewBannedUsers = () => {
    navigation.navigate("BanMembersScreen",{ groupId })
  }

  const handleDelete = async () => {
    Alert.alert("Delete Group","Are you sure you want to delete this group? This action cannot be undone.",[
      { text: "Cancel",style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true)
          try {
            await deleteGroup(groupId)
            showSuccessMessage("Group deleted successfully!")
            navigation.navigate("MyGroupsScreen")
          } catch (err) {
            showErrorFetchAPI(err)
          } finally {
            setDeleting(false)
          }
        },
      },
    ])
  }

  const formatMemberCount = (count) => {
    if (!count) return "0"
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Unknown"
    try {
      return new Date(dateString).toLocaleDateString("en-US",{
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      return "Unknown"
    }
  }

  const renderLoadingScreen = () => (
    <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0056d2" />
        <Text style={styles.loadingText}>Loading group data...</Text>
      </View>
    </View>
  )

  const renderImageSection = () => (
    <Animated.View
      style={[
        styles.imageSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {group?.thumbnail ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: group.thumbnail }} style={styles.imagePreview} />
          <View style={styles.imageLabel}>
            <Ionicons name="image" size={14} color="#FFFFFF" />
            <Text style={styles.imageLabelText}>Group Cover</Text>
          </View>
          {group?.isPrivate && (
            <View style={styles.privateBadge}>
              <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
      ) : (
        <View style={styles.noImageContainer}>
          <View style={styles.noImageIcon}>
            <Ionicons name="image-outline" size={32} color="#9CA3AF" />
          </View>
          <Text style={styles.noImageText}>No cover image</Text>
        </View>
      )}
    </Animated.View>
  )

  const renderGroupInfo = () => (
    <Animated.View
      style={[
        styles.infoSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.infoContainer}>
        <Text style={styles.groupName}>{group?.groupName || "Unknown Group"}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#0056d2" />
            <Text style={styles.statText}>{formatMemberCount(group?.memberCount)} Members</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="calendar-outline" size={16} color="#0056d2" />
            <Text style={styles.statText}>Created {formatDate(group?.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Ionicons name="pulse" size={14} color="#0056d2" />
            <Text style={styles.statusText}>{group?.status || "Active"}</Text>
          </View>
          <View style={styles.privacyBadge}>
            <Ionicons name={group?.isPrivate ? "lock-closed" : "globe"} size={14} color="#0056d2" />
            <Text style={styles.privacyText}>{group?.isPrivate ? "Private" : "Public"}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  )

  const renderDescription = () => (
    <Animated.View
      style={[
        styles.descriptionSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Ionicons name="document-text-outline" size={16} color="#0056d2" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Description</Text>
          </View>
        </View>

        {group?.description ? (
          <View style={styles.descriptionContainer}>
            <RichEditor
              ref={null}
              initialContentHTML={group.description}
              disabled={true}
              style={styles.richEditor}
              editorStyle={{
                backgroundColor: "#FFFFFF",
                color: "#000000",
                fontSize: 16,
                fontFamily: Platform.OS === "ios" ? "System" : "Roboto",
                lineHeight: 24,
                padding: 16,
              }}
            />
          </View>
        ) : (
          <View style={styles.noDescriptionContainer}>
            <Text style={styles.noDescriptionText}>No description available.</Text>
          </View>
        )}
      </View>
    </Animated.View>
  )

  const renderManagementButtons = () => (
    <Animated.View
      style={[
        styles.managementSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.fieldContainer}>
        <View style={styles.fieldHeader}>
          <View style={styles.fieldLabelContainer}>
            <Ionicons name="settings-outline" size={16} color="#0056d2" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Group Management</Text>
          </View>
        </View>

        <View style={styles.managementGrid}>
          <TouchableOpacity style={styles.managementButton} onPress={handleViewMembers}>
            <Ionicons name="people-outline" size={20} color="#0056d2" />
            <Text style={styles.managementButtonText}>View Members</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          {group?.isPrivate && (
            <TouchableOpacity style={styles.managementButton} onPress={handleViewRequests}>
              <Ionicons name="person-add-outline" size={20} color="#0056d2" />
              <Text style={styles.managementButtonText}>Join Requests</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.managementButton} onPress={handleViewBannedUsers}>
            <Ionicons name="ban-outline" size={20} color="#0056d2" />
            <Text style={styles.managementButtonText}>Banned Users</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  )

  const renderActionButtons = () => (
    <Animated.View
      style={[
        styles.actionSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
        <Ionicons name="pencil" size={20} color="#FFFFFF" />
        <Text style={styles.editButtonText}>Edit Group</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.deleteButton,deleting && styles.deleteButtonDisabled]}
        onPress={handleDelete}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
        )}
        <Text style={styles.deleteButtonText}>{deleting ? "Deleting..." : "Delete Group"}</Text>
      </TouchableOpacity>
    </Animated.View>
  )

  if (loading) return renderLoadingScreen()

  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Group Not Found</Text>
          <Text style={styles.errorText}>The group you're looking for doesn't exist or has been deleted.</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#0056d2" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>#GROUP{group?.groupId || "Your group"}</Text>
            </View>
            <View style={{ flexDirection: 'row',alignItems: 'center' }}>
              <TouchableOpacity style={styles.filterButton} onPress={handleEdit}>
                <Ionicons name="pencil-outline" size={24} color="#0056d2" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderImageSection()}
          {renderGroupInfo()}
          {renderDescription()}
          {renderManagementButtons()}
          {renderActionButtons()}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    textAlign: "center",
  },
  headerRight: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    fontWeight: "500",
  },
  imageSection: {
    marginBottom: 24,
  },
  imageContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  imageLabel: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  imageLabelText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  privateBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 86, 210, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  noImageContainer: {
    height: 200,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderStyle: "dashed",
  },
  noImageIcon: {
    marginBottom: 8,
  },
  noImageText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  infoSection: {
    marginBottom: 24,
  },
  infoContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  groupName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    color: "#0056d2",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  privacyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  privacyText: {
    fontSize: 12,
    color: "#0056d2",
    fontWeight: "600",
  },
  descriptionSection: {
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 0,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fieldLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  fieldIcon: {
    marginRight: 8,
  },
  fieldLabel: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
  },
  descriptionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  richEditor: {
    minHeight: 120,
    backgroundColor: "#FFFFFF",
  },
  noDescriptionContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    padding: 20,
    alignItems: "center",
  },
  noDescriptionText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  managementSection: {
    marginBottom: 24,
  },
  managementGrid: {
    gap: 12,
  },
  managementButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  managementButtonText: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
    marginLeft: 12,
  },
  actionSection: {
    gap: 12,
    marginBottom: 40,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0056d2",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButtonDisabled: {
    opacity: 0.7,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#000000",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  errorButton: {
    backgroundColor: "#0056d2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  errorButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
})

export default MyGroupDetailScreen
