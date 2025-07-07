import React, { createContext, useContext, useState } from 'react';

const FoodContext = createContext();

export const FoodProvider = ({ children }) => {
  const [favoriteFoods, setFavoriteFoods] = useState(null);
  return (
    <FoodContext.Provider value={{ favoriteFoods, setFavoriteFoods }}>
      {children}
    </FoodContext.Provider>
  );
};

export const useFood = () => useContext(FoodContext);
