import React,{ useEffect,useState } from "react";
import { Image,Dimensions,TouchableOpacity,View } from "react-native";
import { useNavigation } from "@react-navigation/native";

const getImageSize = (uri) => {
    return new Promise((resolve,reject) => {
        Image.getSize(
            uri,
            (width,height) => resolve({ width,height }),
            (error) => reject(error)
        );
    });
};

const PostImage = ({ uri,post }) => {
    const [imageRatio,setImageRatio] = useState(1);
    const [isTallImage,setIsTallImage] = useState(false);
    const navigation = useNavigation();
    const screenWidth = Dimensions.get("window").width - 32;
    const maxHeight = Dimensions.get("window").height * 0.5;

    useEffect(() => {
        const fetchSize = async () => {
            try {
                const { width,height } = await getImageSize(uri);
                const ratio = height / width;
                setImageRatio(ratio);
                setIsTallImage(ratio > 1.5); // nếu ảnh cao hơn 1.5 lần chiều ngang, coi là ảnh đứng
            } catch (error) {
                console.warn("Không lấy được kích thước ảnh:",error);
            }
        };

        fetchSize();
    },[uri]);

    return (
        <TouchableOpacity
            style={{
                marginHorizontal: 16,
                marginBottom: 12,
                borderRadius: 12,
                overflow: "hidden",
                backgroundColor: "#eee",
            }}
            onPress={() => navigation.navigate("PostDetailScreen",{ post })}
        >
            <Image
                source={{ uri }}
                style={
                    isTallImage
                        ? {
                            width: "100%",
                            aspectRatio: 0.7, 
                            resizeMode: "cover",
                        }
                        : {
                            width: "100%",
                            height: Math.min(screenWidth * imageRatio,maxHeight),
                            resizeMode: "cover",
                        }
                }
            />
        </TouchableOpacity>
    );
};

export default PostImage;
