import { CommonActions } from "@react-navigation/native";

export function safeReset(navigation,screenName,params = {}) {
    const currentRoute = navigation.getState()?.routes?.at(-1)?.name;
    console.log("safeReset - Current Route:",currentRoute,"Target Screen:",screenName);
    if (currentRoute !== screenName) {
        try {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: screenName,params }],
                })
            );
        } catch (error) {
            console.error("safeReset error:",error);
        }
    } else {
        console.log("No reset needed, already on target screen");
    }
}