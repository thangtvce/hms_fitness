import { useEffect,useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  TextInput,
  Modal,
  Platform,
} from "react-native"
import { useNavigation,useRoute } from "@react-navigation/native"
import { getGroupJoinRequests,updateMemberStatus } from "services/apiCommunityService"
import { Ionicons } from "@expo/vector-icons"
import { SafeAreaView } from "react-native-safe-area-context"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"
import CommonSkeleton from "components/CommonSkeleton/CommonSkeleton"
import Header from "components/Header"

const PendingMembersScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { groupId } = route.params || {}

  const [loading,setLoading] = useState(true)
  const [members,setMembers] = useState([])
  const [filteredMembers,setFilteredMembers] = useState([])
  const [refreshing,setRefreshing] = useState(false)
  const [sortOrder,setSortOrder] = useState("newest")
  const [searchTerm,setSearchTerm] = useState("")
  const [showSortModal,setShowSortModal] = useState(false)
  const [showActionModal,setShowActionModal] = useState(false)
  const [selectedMember,setSelectedMember] = useState(null)

  const statusOptions = [
    {
      id: "approved",
      title: "Approve Member",
      description: "Accept this member into the group",
      icon: "checkmark-circle",
      color: "#22C55E",
      bgColor: "#F0FDF4",
      borderColor: "#BBF7D0",
    },
    {
      id: "rejected",
      title: "Reject Request",
      description: "Decline this join request",
      icon: "close-circle",
      color: "#EF4444",
      bgColor: "#FEF2F2",
      borderColor: "#FECACA",
    },
    {
      id: "banned",
      title: "Ban Member",
      description: "Ban this user from the group",
      icon: "ban",
      color: "#DC2626",
      bgColor: "#FEF2F2",
      borderColor: "#FCA5A5",
    },
    {
      id: "pending",
      title: "Keep Pending",
      description: "Leave request as pending for later",
      icon: "time",
      color: "#F59E0B",
      bgColor: "#FFFBEB",
      borderColor: "#FDE68A",
    },
  ]

  const fetchPendingMembers = async () => {
    setLoading(true)
    try {
      const data = await getGroupJoinRequests(groupId,"pending");
      const sortedMembers = [...(data.requests || [])].sort((a,b) =>
        sortOrder === "newest"
          ? new Date(b.joinedAt) - new Date(a.joinedAt)
          : new Date(a.joinedAt) - new Date(b.joinedAt),
      )
      setMembers(sortedMembers)
      setFilteredMembers(sortedMembers)
    } catch (e) {
      showErrorFetchAPI(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPendingMembers()
  },[groupId])

  useEffect(() => {
    const sortedMembers = [...members].sort((a,b) =>
      sortOrder === "newest"
        ? new Date(b.joinedAt) - new Date(a.joinedAt)
        : new Date(a.joinedAt) - new Date(b.joinedAt),
    )
    const filtered = sortedMembers.filter((member) =>
      member.userFullName?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredMembers(filtered)
  },[sortOrder,members,searchTerm])

  const handleMemberAction = (member) => {
    setSelectedMember(member)
    setShowActionModal(true)
  }

  const handleStatusChange = async (status) => {
    if (!selectedMember) return

    const statusOption = statusOptions.find((opt) => opt.id === status)
    const actionText = statusOption?.title || "update"

    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${actionText.toLowerCase()} ${selectedMember.userFullName}?`,
      [
        { text: "Cancel",style: "cancel" },
        {
          text: "Confirm",
          style: status === "banned" ? "destructive" : "default",
          onPress: async () => {
            try {
              await updateMemberStatus(selectedMember?.memberId,status)

              let successMessage = ""
              switch (status) {
                case "approved":
                  successMessage = "Member approved successfully!"
                  break
                case "rejected":
                  successMessage = "Request rejected successfully!"
                  break
                case "banned":
                  successMessage = "Member banned successfully!"
                  break
                case "pending":
                  successMessage = "Member status updated!"
                  break
                default:
                  successMessage = "Status updated successfully!"
              }

              showSuccessMessage(successMessage)
              setShowActionModal(false)
              setSelectedMember(null)
              fetchPendingMembers()
            } catch (e) {
              showErrorFetchAPI(e)
            }
          },
        },
      ],
    )
  }

  const handleSearch = (text) => {
    setSearchTerm(text)
  }

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.sortModalContainer}>
          <View style={styles.sortModalHeader}>
            <Text style={styles.sortModalTitle}>Sort Members</Text>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowSortModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.sortOptionsContainer}>
            <TouchableOpacity
              style={[styles.sortOption,sortOrder === "newest" && styles.selectedSortOption]}
              onPress={() => {
                setSortOrder("newest")
                setShowSortModal(false)
              }}
            >
              <Ionicons name="arrow-down" size={20} color={sortOrder === "newest" ? "#0056d2" : "#64748B"} />
              <Text style={[styles.sortOptionText,sortOrder === "newest" && styles.selectedSortOptionText]}>
                Newest First
              </Text>
              {sortOrder === "newest" && <Ionicons name="checkmark" size={20} color="#0056d2" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sortOption,sortOrder === "oldest" && styles.selectedSortOption]}
              onPress={() => {
                setSortOrder("oldest")
                setShowSortModal(false)
              }}
            >
              <Ionicons name="arrow-up" size={20} color={sortOrder === "oldest" ? "#0056d2" : "#64748B"} />
              <Text style={[styles.sortOptionText,sortOrder === "oldest" && styles.selectedSortOptionText]}>
                Oldest First
              </Text>
              {sortOrder === "oldest" && <Ionicons name="checkmark" size={20} color="#0056d2" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderActionModal = () => (
    <Modal
      visible={showActionModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowActionModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.actionModalContainer}>
          <View style={styles.modalHandle} />

          <View style={styles.actionModalHeader}>
            <View style={styles.memberPreview}>
              {selectedMember?.avatar ? (
                <Image source={{ uri: selectedMember.avatar }} style={styles.memberPreviewAvatar} />
              ) : (
                <View style={styles.memberPreviewAvatarPlaceholder}>
                  <Text style={styles.memberPreviewAvatarText}>
                    {selectedMember?.userFullName?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                </View>
              )}
              <View style={styles.memberPreviewInfo}>
                <Text style={styles.memberPreviewName}>{selectedMember?.userFullName || "Unknown"}</Text>
                <Text style={styles.memberPreviewMeta}>Choose an action for this member</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowActionModal(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.actionOptionsContainer}>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.actionOption,{ backgroundColor: option.bgColor,borderColor: option.borderColor }]}
                onPress={() => handleStatusChange(option.id)}
              >
                <View style={[styles.actionOptionIcon,{ backgroundColor: option.color }]}>
                  <Ionicons name={option.icon} size={24} color="#FFFFFF" />
                </View>
                <View style={styles.actionOptionContent}>
                  <Text style={[styles.actionOptionTitle,{ color: option.color }]}>{option.title}</Text>
                  <Text style={styles.actionOptionDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={option.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )

  const renderItem = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberCardContent}>
        <View style={styles.memberAvatarContainer}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
          ) : (
            <View style={styles.memberAvatarPlaceholder}>
              <Text style={styles.memberAvatarText}>{item.userFullName?.charAt(0)?.toUpperCase() || "U"}</Text>
            </View>
          )}
          <View style={styles.pendingBadge}>
            <Ionicons name="time" size={12} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.memberInfo}>
          <Text style={styles.memberName} numberOfLines={1}>
            {item.userFullName || "Unknown"}
          </Text>
          <View style={styles.memberMeta}>
            <Ionicons name="calendar-outline" size={12} color="#64748B" />
            <Text style={styles.memberMetaText}>
              Requested{" "}
              {new Date(item.joinedAt).toLocaleDateString("en-US",{
                month: "short",
                day: "numeric",
              })}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={() => handleMemberAction(item)}>
          <Ionicons name="ellipsis-horizontal" size={18} color="#0056d2" />
        </TouchableOpacity>
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <CommonSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header
        title="Join Requests"
        subtitle={`${filteredMembers.length} pending`}
        onBack={() => navigation.goBack()}
        showAvatar={false}
        rightActions={[
          {
            icon: <Ionicons name="options-outline" size={24} color="#0056d2" />,
            onPress: () => setShowSortModal(true),
            backgroundColor: 'transparent',
          },
        ]}
      />


      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pending requests..."
            value={searchTerm}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => handleSearch("")} style={styles.clearSearchButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.memberId?.toString()}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true)
          fetchPendingMembers()
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>{searchTerm ? "No matching requests" : "No pending requests"}</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? "Try adjusting your search terms" : "Join requests will appear here"}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Modals */}
      {renderSortModal()}
      {renderActionModal()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingTop: Platform.OS === "android" ? 10 : 0,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  sortButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 70
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  clearSearchButton: {
    padding: 4,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  memberCard: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  memberCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  memberAvatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  memberAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pendingBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F59E0B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  memberMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberMetaText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  actionButtonText: {
    color: "#0056d2",
    fontSize: 14,
    fontWeight: "600",
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
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sortModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
  },
  sortModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sortModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#000000",
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  sortOptionsContainer: {
    padding: 24,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
  },
  selectedSortOption: {
    backgroundColor: "#EBF4FF",
    borderWidth: 2,
    borderColor: "#0056d2",
  },
  sortOptionText: {
    fontSize: 16,
    color: "#64748B",
    marginLeft: 12,
    fontWeight: "500",
    flex: 1,
  },
  selectedSortOptionText: {
    color: "#0056d2",
    fontWeight: "600",
  },
  actionModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    width: "100%",
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  actionModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  memberPreview: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberPreviewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  memberPreviewAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberPreviewAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  memberPreviewInfo: {
    flex: 1,
  },
  memberPreviewName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 2,
  },
  memberPreviewMeta: {
    fontSize: 14,
    color: "#6B7280",
  },
  actionOptionsContainer: {
    padding: 24,
    gap: 16,
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionOptionContent: {
    flex: 1,
  },
  actionOptionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  actionOptionDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
})

export default PendingMembersScreen
