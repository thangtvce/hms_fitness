import React,{ useState } from 'react';
import { Image } from 'react-native';

const SafeImage = ({ imageUrl,fallbackSource,style,resizeMode = 'cover' }) => {
    const [hasError,setHasError] = useState(false);

    return (
        <Image
            source={
                hasError || !imageUrl
                    ? fallbackSource || require('../../../assets/images/default-food.png')
                    : { uri: imageUrl }
            }
            style={[style]}
            resizeMode={resizeMode}
            onError={(e) => {
                console.log(e);
                setHasError(true);
            }}
            onLoad={() => {
            }}
        />
    );
};

export default SafeImage;
