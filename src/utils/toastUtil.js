import Toast from "react-native-toast-message";

export function extractErrors(error) {
    if (typeof error === "string") return [error];

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

const taskMap = {
    meal_log: "Log a Meal",
    water_log: "Log Water",
    weight_log: "Log Weight",
    body_measurement_log: "Log Body Measurement",
    comment_post_and_post_article: "Comment and up a post",
    workout: "Complete Workout",
    checkin: "Check In completed",
};

export const showCelebrate = (taskKey) => {
    const taskName = taskMap[taskKey] || "a task";
    Toast.show({
        type: "celebrate",
        text1: `You've completed ${taskName}!`,
        text2: `Great job on ${taskName}. Keep up the momentum!`,
    });
};