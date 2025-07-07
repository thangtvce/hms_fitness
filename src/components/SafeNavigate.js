export function safeNavigate(navigation,screenName,params = {}) {
    try {
        const currentRoute = navigation.getState()?.routes?.at(-1)?.name;

        if (!screenName || !navigation || typeof navigation.navigate !== 'function') return;

        if (currentRoute !== screenName) {
            navigation.navigate(screenName,params);
        }
    } catch (error) {
 }
}
