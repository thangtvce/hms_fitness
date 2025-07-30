import React from 'react';
import { View,StyleSheet,Platform } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import SkeletonCard from 'components/SkeletonCard/SkeletonCard';

const CommonSkeleton = ({
    animationSize = 120,
    variant = 'generic',
    cardConfigs = [],
    containerStyle,
}) => {
    const getDefaultCardConfigs = () => {
        switch (variant) {
            case 'subscriptionDetail':
                return [
                    { height: 200,style: {} },
                    { height: 150,style: {} },
                    { height: 100,style: {} },
                    { height: 200,style: {} },
                    { height: 300,style: {} },
                ];
            case 'subscriptionReview':
                return [
                    { height: 200,style: {} },
                    { height: 300,style: {} },
                ];
            case 'generic':
                return [
                    { height: 150,style: {} },
                    { height: 150,style: {} },
                    { height: 150,style: {} },
                ];
            case 'custom':
                return cardConfigs.length > 0 ? cardConfigs : [{ height: 150,style: {} }];
            default:
                return [{ height: 150,style: {} }];
        }
    };

    const skeletonCardConfigs = getDefaultCardConfigs();

    return (
        <View style={[styles.fullScreenContainer,containerStyle]}>
            <View style={styles.skeletonContainer}>
                {skeletonCardConfigs.map((config,index) => (
                    <LinearGradient
                        key={`skeleton-${index}`}
                        colors={['#FFFFFF','#FAFBFF']}
                        style={[styles.skeletonCard,config.style]}
                    >
                        <SkeletonCard cardHeight={config.height} />
                    </LinearGradient>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullScreenContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
        backgroundColor: '#F8FAFC',
        paddingTop: Platform.OS === 'android' ? 100 : 80, // Adjust for header height
    },
    lottie: {
        marginBottom: 16,
    },
    skeletonContainer: {
        width: '100%',
        paddingHorizontal: 16,
        gap: 16,
        paddingBottom: 32,
    },
    skeletonCard: {
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
});

export default CommonSkeleton;