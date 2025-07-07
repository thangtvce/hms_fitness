export const fetchBankAppsByPlatform = async (platform = 'android') => {
    const response = await fetch(`https://api.vietqr.io/v2/${platform}-app-deeplinks`);
    if (!response.ok) {
        throw new Error('Error to fetch bank');
    }
    return await response.json();
};
