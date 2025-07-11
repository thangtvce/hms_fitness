// utils/toastConfig.js
import React from "react";
import { View,Text,TouchableOpacity,StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

const BaseCustomToast = ({ icon,backgroundColor,text1,text2 }) => (
    <View style={[styles.toastContainer,{ backgroundColor }]}>
        <View style={styles.iconContainer}>
            <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <View style={styles.textContainer}>
            <Text style={styles.text1}>{text1}</Text>
            {text2 ? <Text style={styles.text2}>{text2}</Text> : null}
        </View>
        <TouchableOpacity onPress={() => Toast.hide()} style={styles.closeButton}>
            <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
    </View>
);

export const toastConfig = {
    success: ({ text1,text2 }) => (
        <BaseCustomToast
            icon="checkmark-circle-outline"
            backgroundColor="#2ecc71"
            text1={text1}
            text2={text2}
        />
    ),
    error: ({ text1,text2 }) => (
        <BaseCustomToast
            icon="close-circle-outline"
            backgroundColor="#e74c3c"
            text1={text1}
            text2={text2}
        />
    ),
    info: ({ text1,text2 }) => (
        <BaseCustomToast
            icon="information-circle-outline"
            backgroundColor="#3498db"
            text1={text1}
            text2={text2}
        />
    ),
    warning: ({ text1,text2 }) => (
        <BaseCustomToast
            icon="alert-circle-outline"
            backgroundColor="#f39c12"
            text1={text1}
            text2={text2}
        />
    ),
    confirm: ({ text1,text2,onPress }) => (
        <View style={[styles.toastContainer,styles.confirmToast]}>
            <View style={styles.textContainer}>
                <Text style={styles.text1}>{text1}</Text>
                {text2 ? <Text style={styles.text2}>{text2}</Text> : null}
            </View>
            <TouchableOpacity onPress={onPress} style={styles.confirmButton}>
                <Text style={styles.confirmButtonText}>Go</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => Toast.hide()} style={styles.closeButton}>
                <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
        </View>
    ),
};

const styles = StyleSheet.create({
    toastContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginHorizontal: 10,
        marginVertical: 5,
        padding: 12,
        borderRadius: 10,
        shadowColor: "#000",
        elevation: 3,
    },
    iconContainer: {
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
    },
    text1: {
        color: "#fff",
        fontWeight: "bold",
        fontSize: 15,
    },
    text2: {
        color: "#fff",
        fontSize: 13,
        marginTop: 2,
    },
    closeButton: {
        marginLeft: 10,
    },

});
