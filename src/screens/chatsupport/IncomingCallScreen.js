import React,{ useState,useEffect,useContext } from 'react';
import { SafeAreaView,StyleSheet,View } from 'react-native';
import { useNavigation,useRoute } from '@react-navigation/native';
import IncomingCallNotification from 'components/calling/IncomingCallNotification';
import { AuthContext } from 'context/AuthContext';
import apiChatSupportService from 'services/apiChatSupport';
import { showErrorFetchAPI } from 'utils/toastUtil';

const IncomingCallScreen = () => {
    const { user } = useContext(AuthContext);
    const navigation = useNavigation();
    const route = useRoute();
    const { roomId,callerName } = route.params || {};

    const [incomingCall,setIncomingCall] = useState(
        roomId && callerName ? { roomId,callerName } : null
    );
    const [acceptedCallRoomId,setAcceptedCallRoomId] = useState(null);

    useEffect(() => {
        const checkRoomValidity = async () => {
            if (roomId && callerName) {
                try {
                    const currentUserId = user?.userId;
                    const response = await apiChatSupportService.validateRoom({ roomId,currentUserId });
                    if (response?.statusCode !== 200) {
                        setIncomingCall(null);
                        return;
                    }
                } catch (error) {
                    showErrorFetchAPI(error);
                    setIncomingCall(null);
                }
            }
        };
        checkRoomValidity();
    },[roomId,callerName]);

    if (!incomingCall) {
        return null;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <IncomingCallNotification
                    incomingCall={incomingCall}
                    setIncomingCall={setIncomingCall}
                    setAcceptedCallRoomId={setAcceptedCallRoomId}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    blurView: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default IncomingCallScreen;