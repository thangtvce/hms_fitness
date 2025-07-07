export function safeReset(navigation,screenName,params = {}) {
    const currentRoute = navigation.getState()?.routes?.at(-1)?.name;

    if (currentRoute !== screenName) {
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: screenName,params }],
            })
        );
    }
}
