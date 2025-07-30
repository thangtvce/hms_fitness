import React,{ useEffect,useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Modal,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { showErrorFetchAPI,showSuccessMessage } from 'utils/toastUtil';
import { theme } from 'theme/color';
import apiChatSupportService from 'services/apiChatSupport';

const { width } = Dimensions.get('window');

const CallWaitingPopup = ({ visible,setVisible,roomId,userId,setRoomId }) => {
    const notificationListener = useRef(null);

    const handleCancelCall = async () => {
        try {
            if (!roomId || !userId) {
                throw new Error('Missing roomId or userId');
            }

            await apiChatSupportService.rejectCall({
                roomId: roomId,
                rejectorId: userId,
            });
            setTimeout(() => {
                setVisible(false);
                setRoomId(null);
                showSuccessMessage('Call request cancelled');
            },0);
        } catch (error) {
            console.error('Error cancelling call:',error);
            showErrorFetchAPI('Failed to cancel call request');
        }
    };

    useEffect(() => {
        if (!visible || !roomId) return;

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            const data = notification.request?.content?.data;
            if (data?.type === 'call-rejected' && data.roomId === roomId) {
                setTimeout(() => {
                    setVisible(false);
                    setRoomId(null);
                    showSuccessMessage('The call has been canceled');
                },0);
            }
        });

        // Clean up listener
        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
                notificationListener.current = null;
            }
        };
    },[visible,roomId]);

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleCancelCall}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.popupContainer}>
                    <Ionicons
                        name="call-outline"
                        size={40}
                        color={theme.secondaryColor}
                        style={styles.popupIcon}
                    />
                    <Text style={styles.popupText}>
                        Waiting for trainer response...
                    </Text>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancelCall}
                    >
                        <Text style={styles.cancelButtonText}>Cancel Call</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    popupContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: width * 0.8,
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    popupIcon: {
        marginBottom: 16,
    },
    popupText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.textPrimary,
        textAlign: 'center',
        marginBottom: 24,
    },
    cancelButton: {
        backgroundColor: theme.dangerColor,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
});

export default CallWaitingPopup;
