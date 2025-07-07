const ALLOWED_VIDEO_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export const apiUploadVideoCloudService = {
    async uploadVideo(formData) {
        try {
            if (!(formData instanceof FormData)) {
                return {
                    message: 'Invalid FormData',
                    isError: true,
                    videoUrl: '',
                };
            }

            const file = formData.get('file');

            // Validate file object for React Native compatibility
            if (!file || !file.uri || !file.name || !file.type) {
                console.log('Invalid file object:', file);
                return {
                    message: 'Invalid file: must have uri, name, and type properties',
                    isError: true,
                    videoUrl: '',
                };
            }

            if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
                return {
                    message: `Invalid video type. Allowed: ${ALLOWED_VIDEO_TYPES.join(', ')}`,
                    isError: true,
                    videoUrl: '',
                };
            }

            // Note: File size check may not be reliable in React Native; consider server-side validation
            if (file.size && file.size > MAX_VIDEO_SIZE) {
                return {
                    message: `Video file is too large. Max size allowed: 100MB`,
                    isError: true,
                    videoUrl: '',
                };
            }

            const response = await fetch(`https://3docorp.id.vn/video.php`, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-API-Key': '3docorp_fixed_key_2025',
                },
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (response.ok && data.videoUrl) {
                return {
                    message: 'Video uploaded successfully!',
                    isError: false,
                    videoUrl: data.videoUrl,
                };
            } else {
                return {
                    message: `Error: ${data.error || 'Unknown error'}`,
                    isError: true,
                    videoUrl: '',
                };
            }
        } catch (error) {
            console.error('Upload error:', error);
            return {
                message: `Error: ${error.message || 'Unknown error'}`,
                isError: true,
                videoUrl: '',
            };
        }
    }
};