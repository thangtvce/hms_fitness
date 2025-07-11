import React,{ useEffect,useState,useRef } from "react"
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
  Animated,
  Platform,
  Dimensions,
} from "react-native"
import { useNavigation,useRoute } from "@react-navigation/native"
import { getGroupActiveMembers,updateMemberStatus,getGroupActiveById,getGroupJoinRequests } from "services/apiCommunityService"
import { Ionicons } from "@expo/vector-icons"
import { AuthContext } from "context/AuthContext"
import { LinearGradient } from "expo-linear-gradient"
import { SafeAreaView } from "react-native-safe-area-context"
import { showErrorFetchAPI,showSuccessMessage } from "utils/toastUtil"

const { width } = Dimensions.get("window")

const ActiveMembersScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const { groupId } = route.params || {}
  const { user } = React.useContext(AuthContext)

  const [loading,setLoading] = useState(true)
  const [members,setMembers] = useState([])
  const [filteredMembers,setFilteredMembers] = useState([])
  const [refreshing,setRefreshing] = useState(false)
  const [isOwner,setIsOwner] = useState(false)
  const [group,setGroup] = useState(null)
  const [sortOrder,setSortOrder] = useState("newest")
  const [searchTerm,setSearchTerm] = useState("")
  const [showSortModal,setShowSortModal] = useState(false)
  const [showMemberDetails,setShowMemberDetails] = useState(null)
  const [showActionModal,setShowActionModal] = useState(false)
  const [selectedMember,setSelectedMember] = useState(null)
  const [tab,setTab] = useState("members");
  const [requests,setRequests] = useState([]);

  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current
  const scaleAnim = useRef(new Animated.Value(0.95)).current
  const memberStatusOptions = [
    {
      id: "remove",
      title: "Remove Member",
      description: "Remove this member from the group",
      icon: "person-remove",
      color: "#EF4444",
      bgColor: "#FEF2F2",
      borderColor: "#FECACA",
    },
    {
      id: "ban",
      title: "Ban Member",
      description: "Ban this user from the group permanently",
      icon: "ban",
      color: "#DC2626",
      bgColor: "#FEF2F2",
      borderColor: "#FCA5A5",
    },
    {
      id: "active",
      title: "Keep Active",
      description: "Keep this member in the group",
      icon: "checkmark-circle",
      color: "#22C55E",
      bgColor: "#F0FDF4",
      borderColor: "#BBF7D0",
    },
  ];

  const requestStatusOptions = [
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
  ];

  useEffect(() => {
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
      Animated.spring(scaleAnim,{
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()
  },[])

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const groupData = await getGroupActiveById(groupId);
      setGroup(groupData);
      const ownerId = groupData?.createdBy;
      const data = await getGroupActiveMembers(groupId);
      const allMembers = data.requests?.filter(m => m.status === "approved") || [];
      const sortedMembers = [...allMembers].sort((a,b) =>
        sortOrder === "newest"
          ? new Date(b.joinedAt) - new Date(a.joinedAt)
          : new Date(a.joinedAt) - new Date(b.joinedAt)
      );
      const owner = sortedMembers.find((m) => m.userId === ownerId);
      const others = sortedMembers.filter((m) => m.userId !== ownerId);
      const finalList = owner ? [owner,...others] : others;
      setMembers(finalList);
      setFilteredMembers(finalList);
    } catch (e) {
      showErrorFetchAPI(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await getGroupJoinRequests(groupId,"pending");
      const sortedRequests = [...(data.requests || [])].sort((a,b) =>
        sortOrder === "newest"
          ? new Date(b.joinedAt) - new Date(a.joinedAt)
          : new Date(a.joinedAt) - new Date(b.joinedAt)
      );
      setFilteredMembers(sortedRequests);
    } catch (e) {
      showErrorFetchAPI(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (tab === "members") fetchMembers();
    else fetchRequests();
  },[tab,groupId,sortOrder]);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const groupData = await getGroupActiveById(groupId)
        setGroup(groupData)

        if (user && groupData && groupData.createdBy && user.userId === groupData.createdBy) {
          setIsOwner(true)
        } else {
          setIsOwner(false)
        }
      } catch {
        setIsOwner(false)
      }
    }
    fetchGroup()
  },[groupId,user])

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
          style: status === "ban" || status === "remove" ? "destructive" : "default",
          onPress: async () => {
            try {
              let newStatus = "inactive"
              if (status === "ban") newStatus = "banned"
              if (status === "active") newStatus = "approved"
              if (status === "approved") newStatus = "approved"
              if (status === "remove") newStatus = "removed"
              await updateMemberStatus(selectedMember.memberId,newStatus)

              let successMessage = ""
              switch (status) {
                case "remove":
                  successMessage = "Member removed successfully!"
                  break
                case "ban":
                  successMessage = "Member banned successfully!"
                  break
                case "active":
                  successMessage = "Member status updated!"
                  break
                default:
                  successMessage = "Status updated successfully!"
              }

              showSuccessMessage(successMessage)
              setShowActionModal(false)
              setSelectedMember(null)
              fetchMembers()
            } catch (e) {
              showErrorFetchAPI(e);
            }
          },
        },
      ],
    )
  }

  const handleSearch = (text) => {
    setSearchTerm(text)
  }

  const handleMemberPress = (member) => {
    setShowMemberDetails(member)
  }

  const statusOptions = tab === "members" ? memberStatusOptions : requestStatusOptions;

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

  const renderMemberDetailsModal = () => {
    if (!showMemberDetails) return null

    const ownerUserId = group?.createdBy
    const isGroupOwner = ownerUserId && showMemberDetails.userId === ownerUserId

    return (
      <Modal
        visible={!!showMemberDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowMemberDetails(null)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.memberDetailsModal,{ transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.modalHandle} />

            <View style={styles.memberDetailsHeader}>
              <View style={styles.memberDetailsAvatarContainer}>
                {showMemberDetails.avatar ? (
                  <Image source={{ uri: showMemberDetails.avatar }} style={styles.memberDetailsAvatar} />
                ) : (
                  <View style={styles.memberDetailsAvatarPlaceholder}>
                    <Text style={styles.memberDetailsAvatarText}>
                      {showMemberDetails.userFullName?.charAt(0)?.toUpperCase() || "U"}
                    </Text>
                  </View>
                )}
                {isGroupOwner && (
                  <View style={styles.crownIcon}>
                    <Ionicons name="home" size={16} color="#F59E0B" />
                  </View>
                )}
              </View>

              <Text style={styles.memberDetailsName}>{showMemberDetails.userFullName || "Unknown Member"}</Text>

              {isGroupOwner && (
                <View style={styles.ownerBadgeModal}>
                  <Ionicons name="star" size={14} color="#FFFFFF" />
                  <Text style={styles.ownerBadgeModalText}>Group Owner</Text>
                </View>
              )}
            </View>

            <View style={styles.memberDetailsContent}>
              <View style={styles.memberDetailItem}>
                <Ionicons name="calendar-outline" size={20} color="#0056d2" />
                <View style={styles.memberDetailText}>
                  <Text style={styles.memberDetailLabel}>Joined Date</Text>
                  <Text style={styles.memberDetailValue}>
                    {new Date(showMemberDetails.joinedAt).toLocaleDateString("en-US",{
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.memberDetailItem}>
                <Ionicons name="time-outline" size={20} color="#0056d2" />
                <View style={styles.memberDetailText}>
                  <Text style={styles.memberDetailLabel}>Join Time</Text>
                  <Text style={styles.memberDetailValue}>
                    {new Date(showMemberDetails.joinedAt).toLocaleTimeString("en-US",{
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.memberDetailItem}>
                <Ionicons name="person-outline" size={20} color="#0056d2" />
                <View style={styles.memberDetailText}>
                  <Text style={styles.memberDetailLabel}>Member ID</Text>
                  <Text style={styles.memberDetailValue}>#MEMBER{showMemberDetails.memberId}</Text>
                </View>
              </View>
            </View>

            <View style={styles.memberDetailsActions}>
              {!isGroupOwner && isOwner && (
                <TouchableOpacity
                  style={styles.memberActionButton}
                  onPress={() => {
                    setShowMemberDetails(null)
                    handleMemberAction(showMemberDetails)
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={20} color="#FFFFFF" />
                  <Text style={styles.memberActionText}>Member Actions</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.closeDetailsButton} onPress={() => setShowMemberDetails(null)}>
                <Text style={styles.closeDetailsButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    )
  }

  const renderSortModal = () => (
    <Modal
      visible={showSortModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowSortModal(false)}
    >
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.sortModalContainer,{ transform: [{ scale: scaleAnim }] }]}>
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
        </Animated.View>
      </View>
    </Modal>
  )

  const renderItem = ({ item,index }) => {
    const ownerUserId = group && group.creator && group.creator.userId
    const isGroupOwner = ownerUserId && item.userId === ownerUserId

    return (
      <Animated.View
        style={[
          styles.memberCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim },{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.memberCardTouchable}
          onPress={() => handleMemberPress(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={isGroupOwner ? ["#FEF3C7","#FDE68A"] : ["#FFFFFF","#F8FAFC"]}
            style={styles.memberCardGradient}
          >
            <View style={styles.memberCardContent}>
              <View style={styles.memberAvatarContainer}>
                {isGroupOwner && group.creator && group.creator.avatar ? (
                  <Image source={{ uri: group.creator.avatar }} style={styles.memberAvatar} />
                ) : item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.memberAvatar} />
                ) : (
                  <View style={[styles.memberAvatarPlaceholder,isGroupOwner && styles.ownerAvatarPlaceholder]}>
                    <Text style={[styles.memberAvatarText,isGroupOwner && styles.ownerAvatarText]}>
                      {(isGroupOwner ? group.creator?.fullName || group.creator?.userFullName : item.userFullName)
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                    </Text>
                  </View>
                )}
                {isGroupOwner && (
                  <View style={styles.crownBadge}>
                    <Ionicons name="home" size={12} color="#F59E0B" />
                  </View>
                )}
              </View>

              <View style={styles.memberInfo}>
                <Text style={[styles.memberName,isGroupOwner && styles.ownerName]} numberOfLines={1}>
                  {isGroupOwner
                    ? group.creator?.fullName || group.creator?.userFullName || "Group Owner"
                    : item.userFullName || "Unknown"}
                </Text>

                <View style={styles.memberMeta}>
                  {isGroupOwner ? (
                    <>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.ownerLabel}>Group Owner</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="calendar-outline" size={12} color="#64748B" />
                      <Text style={styles.joinDate}>
                        Joined{" "}
                        {new Date(item.joinedAt).toLocaleDateString("en-US",{
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </>
                  )}
                </View>
              </View>

              <View style={styles.memberActions}>
                {isGroupOwner ? (
                  <View style={styles.ownerBadgeSmall}>
                    <Text style={styles.ownerBadgeSmallText}>Owner</Text>
                  </View>
                ) : isOwner ? (
                  <TouchableOpacity style={styles.actionMenuButton} onPress={() => handleMemberAction(item)}>
                    <Ionicons name="ellipsis-horizontal" size={18} color="#0056d2" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.moreButton}>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0056d2" />
          <Text style={styles.loadingText}>Loading group members...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0056d2" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Group Members</Text>
            <Text style={styles.headerSubtitle}>{filteredMembers.length} members</Text>
          </View>
          <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
            <Ionicons name="options-outline" size={24} color="#0056d2" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      {isOwner && (
        <View style={styles.tabBarContainer}>
          <TouchableOpacity
            style={[styles.tabBarButton,tab === "members" && styles.tabBarButtonActive]}
            onPress={() => setTab("members")}
          >
            <Text style={[styles.tabBarText,tab === "members" && styles.tabBarTextActive]}>Members</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBarButton,tab === "requests" && styles.tabBarButtonActive]}
            onPress={() => setTab("requests")}
          >
            <Text style={[styles.tabBarText,tab === "requests" && styles.tabBarTextActive]}>Requests</Text>
          </TouchableOpacity>
        </View>
      )}
      <Animated.View
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search members by name..."
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
      </Animated.View>

      {/* Members List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.memberId?.toString()}
        renderItem={renderItem}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true)
          fetchMembers()
        }}
        ListEmptyComponent={
          <Animated.View
            style={[
              styles.emptyContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>{searchTerm ? "No matching members" : "No members yet"}</Text>
            <Text style={styles.emptySubtitle}>
              {searchTerm ? "Try adjusting your search terms" : "Members will appear here once they join the group"}
            </Text>
          </Animated.View>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Modals */}
      {renderSortModal()}
      {renderMemberDetailsModal()}
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
  },
  memberCardTouchable: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  memberCardGradient: {
    padding: 16,
  },
  memberCardContent: {
    flexDirection: "row",
    alignItems: "center",
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
  ownerAvatarPlaceholder: {
    backgroundColor: "#F59E0B",
  },
  memberAvatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ownerAvatarText: {
    color: "#FFFFFF",
  },
  crownBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
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
  ownerName: {
    color: "#F59E0B",
  },
  memberMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ownerLabel: {
    fontSize: 13,
    color: "#F59E0B",
    fontWeight: "500",
  },
  joinDate: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
  },
  memberActions: {
    alignItems: "center",
  },
  ownerBadgeSmall: {
    backgroundColor: "#F59E0B",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ownerBadgeSmallText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  removeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  moreButton: {
    padding: 8,
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
  memberDetailsModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0,height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 25,
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
  memberDetailsHeader: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  memberDetailsAvatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  memberDetailsAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  memberDetailsAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0056d2",
    justifyContent: "center",
    alignItems: "center",
  },
  memberDetailsAvatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  crownIcon: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  memberDetailsName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  ownerBadgeModal: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  ownerBadgeModalText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  memberDetailsContent: {
    padding: 24,
  },
  memberDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  memberDetailText: {
    marginLeft: 16,
    flex: 1,
  },
  memberDetailLabel: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  memberDetailValue: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "600",
  },
  memberDetailsActions: {
    padding: 24,
    gap: 12,
  },
  memberActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#050643",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  memberActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  closeDetailsButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 16,
  },
  closeDetailsButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  actionMenuButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#EBF4FF"
  },
  actionModalContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    width: "100%",
    maxHeight: "80%",
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
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
    padding: 10,
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
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabBarButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBarButtonActive: {
    borderBottomColor: '#0056d2',
    backgroundColor: '#FFFFFF',
  },
  tabBarText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  tabBarTextActive: {
    color: '#0056d2',
    fontWeight: '700',
  },
})

export default ActiveMembersScreen
