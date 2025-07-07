import { createContext,useContext,useState } from "react";
import FloatingMenuButton from "./FloatingMenuButton";

const FloatingMenuContext = createContext();

const FloatingMenuProvider = ({ children }) => {
    const [isVisible,setIsVisible] = useState(false);
    const [menuItems,setMenuItems] = useState([]);

    const showFloatingMenu = (items) => {
        setMenuItems(items);
        setIsVisible(true);
    };

    const hideFloatingMenu = () => {
        setIsVisible(false);
        setMenuItems([]);
    };

    return (
        <FloatingMenuContext.Provider value={{ showFloatingMenu,hideFloatingMenu,isVisible }}>
            {children}
            {isVisible && <FloatingMenuButton menuItems={menuItems} />}
        </FloatingMenuContext.Provider>
    );
};

export const useFloatingMenu = () => {
    const context = useContext(FloatingMenuContext);
    if (context === undefined) {
        throw new Error("useFloatingMenu must be used within a FloatingMenuProvider");
    }
    return context;
};

export default FloatingMenuProvider;