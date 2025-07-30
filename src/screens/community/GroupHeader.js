import { useState,useContext } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    ActivityIndicator,
    Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ThemeContext } from "components/theme/ThemeContext";
import { showErrorFetchAPI } from "utils/toastUtil";
import SafeImage from "screens/food/SafeImage";

const GroupHeader = ({ navigation,group,isOwner,joining,handleJoinOrDelete }) => {
    const { colors } = useContext(ThemeContext);
    const [actionSheetVisible,setActionSheetVisible] = useState(false);

    const handleBanMember = async () => {
        try {
            navigation.navigate("BanMembersScreen",{ groupId: group.id });
            setActionSheetVisible(false);
        } catch (error) {
            showErrorFetchAPI("Failed to ban member.");
        }
    };

    const renderActionSheet = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={actionSheetVisible}
            onRequestClose={() => setActionSheetVisible(false)}
        >
            <View style={styles.actionSheetOverlay}>
                <View style={styles.actionSheetContent}>
                    <View style={styles.actionSheetHeader}>
                        <Text style={styles.actionSheetTitle}>Group Actions</Text>
                        <TouchableOpacity
                            onPress={() => setActionSheetVisible(false)}
                            style={styles.actionSheetCloseButton}
                        >
                            <Ionicons name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.actionButtonsContainer}>
                        <TouchableOpacity
                            style={[
                                styles.primaryActionButton,
                                isOwner
                                    ? styles.deleteButton
                                    : group.isJoin
                                        ? styles.leaveButton
                                        : group.isRequested
                                            ? styles.pendingButton
                                            : styles.joinButton,
                            ]}
                            onPress={() => {
                                handleJoinOrDelete();
                                setActionSheetVisible(false);
                            }}
                            disabled={group.isRequested || joining}
                            activeOpacity={0.8}
                            accessibilityLabel={
                                isOwner
                                    ? "Delete this group"
                                    : group.isJoin
                                        ? "Leave this group"
                                        : group.isRequested
                                            ? "Request pending"
                                            : "Join this group"
                            }
                            accessibilityHint={isOwner ? "Deletes the group permanently. This action cannot be undone." : undefined}
                        >
                            {joining ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons
                                        name={
                                            isOwner
                                                ? "trash-outline"
                                                : group.isJoin
                                                    ? "exit-outline"
                                                    : group.isRequested
                                                        ? "time-outline"
                                                        : "add-outline"
                                        }
                                        size={18}
                                        color="#FFFFFF"
                                    />
                                    <Text style={styles.primaryActionText}>
                                        {isOwner
                                            ? "Delete Group"
                                            : group.isJoin
                                                ? "Leave Group"
                                                : group.isRequested
                                                    ? "Request Pending"
                                                    : "Join Group"}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {isOwner && (
                            <TouchableOpacity
                                style={[styles.primaryActionButton,styles.banButton]}
                                onPress={handleBanMember}
                                activeOpacity={0.8}
                                accessibilityLabel="Ban a member from this group"
                                accessibilityHint="Removes a member from the group. This action may be reversible by the admin."
                            >
                                <Ionicons name="person-remove-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.primaryActionText}>Ban Member</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.headerSection}>
            <SafeImage imageUrl={group.thumbnail}
                fallbackSource={require('../../../assets/images/group-default.png')}
                style={styles.headerImage} />
            <LinearGradient
                colors={["rgba(15, 125, 228, 0.3)","rgba(11, 135, 236, 0.7)"]}
                style={styles.headerOverlay}
            />
            <View style={styles.headerActions}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={colors.primary || "#0056d2"} />
                </TouchableOpacity>
                <View style={styles.headerRightActions}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setActionSheetVisible(true)}
                        accessibilityLabel="Open group actions menu"
                    >
                        <Ionicons name="ellipsis-vertical" size={24} color={colors.primary || "#0056d2"} />
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.groupAvatarContainer}>
                <View style={styles.groupAvatarWrapper}>
                    <SafeImage imageUrl={group.thumbnail}
                        fallbackSource={require('../../../assets/images/group-default.png')}
                        style={styles.groupAvatar} />
                    {group.isPrivate && (
                        <View style={styles.privateBadge}>
                            <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                        </View>
                    )}
                </View>
            </View>
            {renderActionSheet()}
        </View>
    );
};

const styles = StyleSheet.create({
    headerSection: {
        position: "relative",
        height: 200,
        width: "100%",
    },
    headerImage: {
        width: "100%",
        height: "100%",
        resizeMode: "cover",
    },
    headerOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
    },
    headerActions: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
    },
    backButton: {
        padding: 8,
        backgroundColor: "#FFFFFF",
        opacity: 0.5,
        borderRadius: 20,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    headerRightActions: {
        flexDirection: "row",
        alignItems: "center",
    },
    menuButton: {
        padding: 8,
        backgroundColor: "#FFFFFF",
        opacity: 0.5,
        borderRadius: 20,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    groupAvatarContainer: {
        position: "absolute",
        bottom: -40,
        left: 16,
        alignItems: "center",
    },
    groupAvatarWrapper: {
        position: "relative",
    },
    groupAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: "#FFFFFF",
    },
    privateBadge: {
        position: "absolute",
        bottom: 0,
        right: 0,
        backgroundColor: "#EF4444",
        borderRadius: 12,
        padding: 4,
    },
    actionSheetOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "flex-end",
        alignItems: "center",
    },
    actionSheetContent: {
        backgroundColor: "#FFFFFF",
        width: "100%",
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingBottom: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0,height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    actionSheetHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#E5E7EB",
    },
    actionSheetTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#1E293B",
        flex: 1,
        textAlign: "center",
    },
    actionSheetCloseButton: {
        padding: 4,
    },
    actionButtonsContainer: {
        padding: 16,
    },
    primaryActionButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginBottom: 8,
    },
    joinButton: {
        backgroundColor: "#0056d2",
    },
    leaveButton: {
        backgroundColor: "#EF4444",
    },
    deleteButton: {
        backgroundColor: "#EF4444",
    },
    banButton: {
        backgroundColor: "#F59E0B",
    },
    pendingButton: {
        backgroundColor: "#6B7280",
        opacity: 0.6,
    },
    primaryActionText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "600",
        marginLeft: 8,
    },
});

export default GroupHeader;