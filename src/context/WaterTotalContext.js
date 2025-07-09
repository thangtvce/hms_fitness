import React, { createContext, useContext, useState } from "react";

const WaterTotalContext = createContext({
  allTimeTotalIntake: 0,
  setAllTimeTotalIntake: () => {},
});

export const WaterTotalProvider = ({ children }) => {
  const [allTimeTotalIntake, setAllTimeTotalIntake] = useState(0);
  return (
    <WaterTotalContext.Provider value={{ allTimeTotalIntake, setAllTimeTotalIntake }}>
      {children}
    </WaterTotalContext.Provider>
  );
};

export const useWaterTotal = () => useContext(WaterTotalContext);
