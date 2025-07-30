import React,{ useEffect,useRef } from "react";
import { View,StyleSheet,Animated,Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const SkeletonCard = ({ cardHeight = 280,cardWidth = width - 32 }) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnim,{
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            })
        ).start();

        return () => {
            shimmerAnim.setValue(0);
        };
    },[shimmerAnim]);

    const translateX = shimmerAnim.interpolate({
        inputRange: [0,1],
        outputRange: [-cardWidth,cardWidth],
    });

    return (
        <View style={[styles.skeletonCard,{ height: cardHeight,width: cardWidth }]}>
            <LinearGradient
                colors={["#F1F5F9","#F1F5F9"]}
                style={styles.cardGradient}
            >
                <View style={styles.shimmerOverlay}>
                    <Animated.View
                        style={[
                            styles.shimmer,
                            {
                                transform: [{ translateX }],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={["#E2E8F0","#F8FAFC","#E2E8F0"]}
                            style={styles.shimmerGradient}
                        />
                    </Animated.View>

                    {/* Card Header Skeleton */}
                    <View style={styles.cardHeader}>
                        <View style={styles.cardHeaderLeft}>
                            <View style={styles.packageIconSkeleton} />
                            <View style={styles.packageInfoSkeleton}>
                                <View style={styles.packageNameSkeleton} />
                                <View style={styles.trainerNameSkeleton} />
                            </View>
                        </View>
                        <View style={styles.statusBadgeSkeleton} />
                    </View>

                    {/* Info Section Skeleton */}
                    <View style={styles.infoContainerSkeleton}>
                        <View style={styles.infoRowSkeleton}>
                            <View style={styles.infoItemSkeleton}>
                                <View style={styles.infoLabelSkeleton} />
                                <View style={styles.infoValueSkeleton} />
                                <View style={styles.infoSubValueSkeleton} />
                            </View>
                        </View>
                        <View style={styles.infoRowSkeleton}>
                            <View style={styles.infoItemSkeleton}>
                                <View style={styles.infoLabelSkeleton} />
                                <View style={styles.infoValueSkeleton} />
                                <View style={styles.infoSubValueSkeleton} />
                            </View>
                        </View>
                    </View>

                    {/* Details Section Skeleton */}
                    <View style={styles.detailsContainerSkeleton}>
                        <View style={styles.detailsRowSkeleton}>
                            <View style={styles.detailItemSkeleton}>
                                <View style={styles.detailLabelSkeleton} />
                                <View style={styles.detailValueSkeleton} />
                            </View>
                            <View style={styles.detailItemSkeleton}>
                                <View style={styles.detailLabelSkeleton} />
                                <View style={styles.detailValueSkeleton} />
                            </View>
                        </View>
                    </View>

                    {/* Button Skeleton */}
                    <View style={styles.reviewButtonSkeleton} />
                </View>
            </LinearGradient>
        </View>
    );
};

const styles = StyleSheet.create({
    skeletonCard: {
        marginTop: 50,
        marginBottom: 16,
        borderRadius: 20,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardGradient: {
        padding: 20,
    },
    shimmerOverlay: {
        position: "relative",
        overflow: "hidden",
    },
    shimmer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.5,
    },
    shimmerGradient: {
        flex: 1,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    cardHeaderLeft: {
        flexDirection: "row",
        alignItems: "center",
        flex: 1,
    },
    packageIconSkeleton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: "#E2E8F0",
        marginRight: 12,
    },
    packageInfoSkeleton: {
        flex: 1,
    },
    packageNameSkeleton: {
        width: "80%",
        height: 20,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
        marginBottom: 8,
    },
    trainerNameSkeleton: {
        width: "60%",
        height: 16,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
    },
    statusBadgeSkeleton: {
        width: 80,
        height: 24,
        borderRadius: 16,
        backgroundColor: "#E2E8F0",
    },
    infoContainerSkeleton: {
        backgroundColor: "#F8FAFC",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    infoRowSkeleton: {
        marginBottom: 12,
    },
    infoItemSkeleton: {
        flex: 1,
    },
    infoLabelSkeleton: {
        width: "40%",
        height: 12,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
        marginBottom: 8,
    },
    infoValueSkeleton: {
        width: "80%",
        height: 16,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
        marginBottom: 4,
    },
    infoSubValueSkeleton: {
        width: "60%",
        height: 14,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
    },
    detailsContainerSkeleton: {
        marginBottom: 16,
    },
    detailsRowSkeleton: {
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 16,
    },
    detailItemSkeleton: {
        flex: 1,
    },
    detailLabelSkeleton: {
        width: "40%",
        height: 12,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
        marginBottom: 8,
    },
    detailValueSkeleton: {
        width: "80%",
        height: 14,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
    },
    reviewButtonSkeleton: {
        height: 48,
        borderRadius: 12,
        backgroundColor: "#E2E8F0",
    },
});

export default SkeletonCard;