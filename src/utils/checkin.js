import AsyncStorage from "@react-native-async-storage/async-storage";
import apiUserService from "services/apiUserService";
import { showCelebrate } from "./toastUtil";

// Valid task keys, including sub-actions for comment_post_and_post_article
const validTasks = [
    "meal_log",
    "water_log",
    "weight_log",
    "body_measurement_log",
    "comment_post",
    "post_article",
    "comment_post_and_post_article",
    "workout",
    "checkin",
];

export const handleDailyCheckin = async (userId,task = "checkin") => {
    try {
        if (!validTasks.includes(task)) {
            console.log(`Invalid task key: "${task}". Valid tasks are: ${validTasks.join(", ")}`);
            return;
        }

        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2,'0');
        const day = String(today.getDate()).padStart(2,'0');
        const todayKey = `@Checkin_${userId}_${task}_${year}-${month}-${day}`;

        if (task === "comment_post" || task === "post_article") {
            const alreadyCheckedIn = await AsyncStorage.getItem(todayKey);
            if (alreadyCheckedIn) {
                console.log(`User already checked in for sub-task "${task}" today.`);
                return;
            }

            await AsyncStorage.setItem(todayKey,'1');

            const commentKey = `@Checkin_${userId}_comment_post_${year}-${month}-${day}`;
            const articleKey = `@Checkin_${userId}_post_article_${year}-${month}-${day}`;
            const combinedKey = `@Checkin_${userId}_comment_post_and_post_article_${year}-${month}-${day}`;
            const commentDone = await AsyncStorage.getItem(commentKey);
            const articleDone = await AsyncStorage.getItem(articleKey);
            const combinedDone = await AsyncStorage.getItem(combinedKey);

            if (commentDone && articleDone && !combinedDone) {
                await apiUserService.checkInUser("comment_post_and_post_article");
                await AsyncStorage.setItem(combinedKey,'1');
                showCelebrate("comment_post_and_post_article");
                console.log("Completed combined task: comment_post_and_post_article");
            } else {
                console.log(`Sub-task "${task}" completed. Waiting for other sub-task to complete comment_post_and_post_article.`);
            }
            return;
        }

        const alreadyCheckedIn = await AsyncStorage.getItem(todayKey);
        if (!alreadyCheckedIn) {
            if (task === "checkin") {
                await apiUserService.checkInUser("checkin");
            } else {
                await apiUserService.checkInUser(task);
            }
            await AsyncStorage.setItem(todayKey,'1');
            showCelebrate(task);
        } else {
            console.log(`User already checked in for task "${task}" today.`);
        }
    } catch (error) {
        console.log(`Check-in failed for task "${task}":`,error?.response?.data?.message || error.message);
    }
};