import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ShimmerPlaceholder from 'components/shimmer/ShimmerPlaceholder';
import { theme } from 'theme/color';
import DynamicStatusBar from 'screens/statusBar/DynamicStatusBar';

const { width: screenWidth } = Dimensions.get('window');

const SettingsScreenSkeleton = () => {
    return (
        <SafeAreaView style={styles.safeArea}>
            <DynamicStatusBar backgroundColor={theme.primaryColor} />
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Card Skeleton */}
                <View style={styles.profileCardWrapper}>
                    <View style={styles.profileCardAccent} />
                    <View style={styles.profileCard}>
                        <View style={styles.avatarContainer}>
                            <ShimmerPlaceholder style={styles.profileAvatar} />
                            <ShimmerPlaceholder style={styles.changeAvatarButton} />
                        </View>
                        <View style={[styles.profileInfoBox,{ flexDirection: 'row',alignItems: 'center' }]}>
                            <View style={{ flex: 1 }}>
                                <ShimmerPlaceholder style={styles.profileName} />
                                <ShimmerPlaceholder style={styles.profileEmail} />
                                <ShimmerPlaceholder style={styles.profileBadge} />
                            </View>
                            <ShimmerPlaceholder style={styles.editButton} />
                        </View>
                    </View>
                </View>

                {/* Menu Section Skeleton */}
                <View style={styles.menuSection}>
                    <ShimmerPlaceholder style={styles.menuSectionTitle} />
                    {[...Array(6)].map((_,index) => (
                        <View key={index} style={styles.menuItem}>
                            <ShimmerPlaceholder style={styles.menuIconCircle} />
                            <View style={styles.menuTextContainer}>
                                <ShimmerPlaceholder style={styles.menuText} />
                                <ShimmerPlaceholder style={styles.menuDescription} />
                            </View>
                            <ShimmerPlaceholder style={styles.menuChevron} />
                        </View>
                    ))}
                    {/* Logout Item Skeleton */}
                    <View style={[styles.menuItem,styles.logoutMenuItem]}>
                        <ShimmerPlaceholder style={styles.menuIconCircleLogout} />
                        <View style={styles.menuTextContainer}>
                            <ShimmerPlaceholder style={styles.menuText} />
                            <ShimmerPlaceholder style={styles.menuDescription} />
                        </View>
                        <ShimmerPlaceholder style={styles.menuChevron} />
                    </View>
                </View>

                {/* App Version Skeleton */}
                <View style={styles.versionContainer}>
                    <ShimmerPlaceholder style={styles.versionText} />
                </View>

                <View style={styles.bottomPadding} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.primaryColor,
    },
    container: {
        flex: 1,
        backgroundColor: '#F6F8FB',
    },
    scrollContent: {
        paddingBottom: 32,
    },
    profileCardWrapper: {
        marginHorizontal: 0,
        marginBottom: 20,
        position: 'relative',
        alignItems: 'center',
        width: '100%',
    },
    profileCardAccent: {
        position: 'absolute',
        top: 18,
        left: 0,
        right: 0,
        height: 60,
        borderRadius: 0,
        backgroundColor: '#E0E7FF',
        opacity: 0.5,
        zIndex: 0,
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 0,
        padding: 18,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0,height: 4 },
        elevation: 4,
        zIndex: 1,
        width: '100%',
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 18,
    },
    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E5E7EB',
    },
    changeAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#E5E7EB',
    },
    profileInfoBox: {
        flex: 1,
    },
    profileName: {
        width: screenWidth * 0.4,
        height: 24,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
        marginBottom: 6,
    },
    profileEmail: {
        width: screenWidth * 0.5,
        height: 16,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
        marginBottom: 8,
    },
    profileBadge: {
        width: 120,
        height: 20,
        borderRadius: 12,
        backgroundColor: '#E5E7EB',
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E5E7EB',
    },
    menuSection: {
        backgroundColor: '#fff',
        borderRadius: 18,
        marginHorizontal: 16,
        marginBottom: 24,
        paddingVertical: 8,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0,height: 2 },
        elevation: 1,
    },
    menuSectionTitle: {
        width: "100%",
        height: 20,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 18,
        marginTop: 10,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F6FA',
        backgroundColor: 'transparent',
    },
    logoutMenuItem: {
        borderTopWidth: 1,
        borderTopColor: '#F3F6FA',
        marginTop: 8,
    },
    menuIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E5E7EB',
        marginRight: 16,
    },
    menuIconCircleLogout: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E5E7EB',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuText: {
        width: screenWidth * 0.4,
        height: 18,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
        marginBottom: 4,
    },
    menuDescription: {
        width: screenWidth * 0.6,
        height: 14,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    menuChevron: {
        width: 18,
        height: 18,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    versionContainer: {
        alignItems: 'center',
    },
    versionText: {
        width: 80,
        height: 14,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    bottomPadding: {
        height: 80,
    },
});

export default SettingsScreenSkeleton;