import React,{ useEffect,useState,useRef } from 'react';
import { View,Text,TouchableOpacity,StyleSheet,Animated } from 'react-native';
import { FontAwesome,Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { showErrorFetchAPI,showInfoMessage } from 'utils/toastUtil';
import * as Notifications from 'expo-notifications';
import { useContext } from 'react';
import { AuthContext } from 'context/AuthContext';
import apiChatSupportService from 'services/apiChatSupport';

const IncomingCallNotification = ({ incomingCall,setIncomingCall,setAcceptedCallRoomId }) => {
    const navigation = useNavigation();
    const { user } = useContext(AuthContext);
    const [countdown,setCountdown] = useState(30);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const soundRef = useRef(null);
    const timerRef = useRef(null);
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const notificationListener = useRef(null);

    const startShaking = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shakeAnim,{
                    toValue: -5,
                    duration: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(shakeAnim,{
                    toValue: 5,
                    duration: 50,
                    useNativeDriver: true,
                }),
                Animated.timing(shakeAnim,{
                    toValue: 0,
                    duration: 50,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const rejectCall = async () => {
        try {
            if (!incomingCall?.roomId || !user?.userId) {
                throw new Error('Missing roomId or userId');
            }
            await apiChatSupportService.rejectCall({
                roomId: incomingCall.roomId,
                rejectorId: user.userId,
            });
            showInfoMessage("The call has been canceled");
            if (typeof setAcceptedCallRoomId === 'function') {
                navigation.navigate('Main');
            }
        } catch (error) {
            showErrorFetchAPI(error);
            if (typeof setAcceptedCallRoomId === 'function') {
                navigation.navigate('Main');
            }
        } finally {
            if (timerRef.current) clearInterval(timerRef.current);
            if (soundRef.current) {
                soundRef.current.stopAsync();
                soundRef.current.unloadAsync();
            }
            setIncomingCall(null);
        }
    };

    const acceptCall = async () => {
        try {
            if (!incomingCall?.roomId || !user?.userId) {
                throw new Error('Missing roomId or userId');
            }
            const response = await apiChatSupportService.acceptCall({
                roomId: incomingCall.roomId,
                acceptorId: user.userId,
            });
            if (timerRef.current) clearInterval(timerRef.current);
            if (soundRef.current) {
                soundRef.current.stopAsync();
                soundRef.current.unloadAsync();
            }
            setIncomingCall(null);
            navigation.navigate('VideoCallSupport',{
                roomId: incomingCall.roomId,
            });
        } catch (error) {
            console.log(error);
        }
    };

    useEffect(() => {
        const playSound = async () => {
            try {
                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: false,
                    staysActiveInBackground: false,
                    playsInSilentModeIOS: true,
                    shouldDuckAndroid: true,
                    playThroughEarpieceAndroid: false,
                });

                const { sound } = await Audio.Sound.createAsync(
                    require('../../../assets/sounds/ringtones.mp3'),
                    {
                        shouldPlay: true,
                        isLooping: true,
                    }
                );

                soundRef.current = sound;
            } catch (error) {
                console.error('Error playing ringtone:',error);
            }
        };


        if (incomingCall) {
            setCountdown(30);
            playSound();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

            timerRef.current = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        rejectCall();
                        return 0;
                    }
                    return prev - 1;
                });
            },1000);

            Animated.timing(fadeAnim,{
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }).start(() => {
                startShaking();
            });

            notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
                const data = notification.request.content.data;
                if (data.type === 'call-rejected' && data.roomId === incomingCall.roomId) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    if (soundRef.current) {
                        soundRef.current.stopAsync();
                        soundRef.current.unloadAsync();
                    }
                    setIncomingCall(null);
                    showInfoMessage("The call has been canceled by the caller");
                }
            });
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (soundRef.current) {
                soundRef.current.stopAsync();
                soundRef.current.unloadAsync();
            }
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
        };
    },[incomingCall]);

    if (!incomingCall) return null;

    return (
        <Animated.View style={[styles.overlay,{ opacity: fadeAnim }]}>
            <View style={styles.popup}>
                <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                    <Ionicons name="call-outline" size={60} color="#2563EB" style={styles.icon} />
                </Animated.View>
                <Text style={styles.title}>{incomingCall.callerName}</Text>
                <Text style={styles.subtitle}>Incoming Call • {countdown}s</Text>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.button,styles.declineButton]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            rejectCall();
                        }}
                    >
                        <FontAwesome name="close" size={24} color="#fff" />
                        <Text style={styles.buttonText}>Decline</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button,styles.acceptButton]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                            acceptCall();
                        }}
                    >
                        <Ionicons name="call" size={24} color="#fff" />
                        <Text style={styles.buttonText}>Accept</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    popup: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 24,
        width: 340,
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0,height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
    },
    icon: {
        marginBottom: 16,
        transform: [{ scale: 1.1 }],
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 16,
        marginHorizontal: 8,
    },
    declineButton: {
        backgroundColor: '#FF3B30',
    },
    acceptButton: {
        backgroundColor: '#00C4B4',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default IncomingCallNotification;