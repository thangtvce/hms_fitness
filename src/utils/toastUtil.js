import Toast from "react-native-toast-message";

export function extractErrors(error) {
    if (error?.errors) return Object.values(error.errors).flat();
    if (error?.response?.data?.errors)
        return Object.values(error.response.data.errors).flat();

    return [
        error?.response?.data?.message || error?.message || "Unexpected error",
    ];
}

/**
 * Show API error messages one by one.
 */
export const showErrorFetchAPI = (error) => {
    const messages = extractErrors(error);

    messages.forEach((msg,index) => {
        setTimeout(() => {
            Toast.show({
                type: "error",
                text1: "Error",
                text2: msg,
            });
        },index * 1000);
    });
};

/**
 * Show a single error message.
 */
export const showErrorMessage = (message) => {
    Toast.show({
        type: "error",
        text1: "Error",
        text2: message,
    });
};

/**
 * Show a success message.
 */
export const showSuccessMessage = (message) => {
    Toast.show({
        type: "success",
        text1: "Success",
        text2: message,
    });
};

/**
 * Show a warning message.
 */
export const showWarningMessage = (message) => {
    Toast.show({
        type: "info", // "warning" not supported by default
        text1: "Warning",
        text2: message,
    });
};

/**
 * Show an info message.
 */
export const showInfoMessage = (message) => {
    Toast.show({
        type: "info",
        text1: "Info",
        text2: message,
    });
};
