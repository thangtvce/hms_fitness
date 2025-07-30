import React,{ useState } from 'react';
import { Image } from 'react-native';

const FoodImage = ({ imageUrl,style }) => {
    const [hasError,setHasError] = useState(false);

    return (
        <Image
            source={
                hasError || !imageUrl
                    ? require('../../../assets/images/default-food.png')
                    : { uri: imageUrl }
            }
            style={style}
            resizeMode="cover"
            onLoad={() => {
                console.log("✅ Image loaded successfully:",imageUrl);
            }}
            onError={(e) => {
                console.log("❌ Image load error:",imageUrl,e.nativeEvent.error);
                setHasError(true);
            }}
        />
    );
};

export default FoodImage;
