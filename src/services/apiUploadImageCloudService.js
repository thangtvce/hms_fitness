import { API_BASE_URL_CLOUD_IMAGE } from '@env';

const ALLOWED_TYPES = ['image/jpeg','image/png','image/gif','image/bmp'];

export const apiUploadImageCloudService = {
    async uploadImage(formData) {
        try {
            if (!formData) {
                return {
                    message: 'Please provide image data',
                    isError: true,
                    imageUrl: '',
                };
            }
            const file = formData._parts?.[0]?.[1];
            if (!file || !file.uri || !file.type || !file.name) {
                return {
                    message: 'Invalid FormData: missing file, uri, type, or name',
                    isError: true,
                    imageUrl: '',
                };
            }

            if (!ALLOWED_TYPES.includes(file.type)) {
                return {
                    message: `Invalid image type. Only ${ALLOWED_TYPES.join(', ')} are allowed.`,
                    isError: true,
                    imageUrl: '',
                };
            }

            const response = await fetch(`${API_BASE_URL_CLOUD_IMAGE}/index.php`,{
                method: 'POST',
                body: formData,
                headers: {
                    'X-API-Key': '3docorp_fixed_key_2025',
                },
            });

            const data = await response.json();

            if (response.ok && data.imageUrl) {
                return {
                    message: 'Image uploaded successfully!',
                    isError: false,
                    imageUrl: data.imageUrl,
                };
            } else {
                return {
                    message: `Error: ${data.error || 'Unknown error'}`,
                    isError: true,
                    imageUrl: '',
                };
            }
        } catch (error) {
            return {
                message: `Error: ${error.message || 'Unknown error'}`,
                isError: true,
                imageUrl: '',
            };
        }
    },
};