import { createContext, useContext, useState, type ReactNode } from "react";

const KEY = "pawsome_handedness";

type HandednessContextType = {
  isLeftHanded: boolean;
  setIsLeftHanded: (v: boolean) => void;
};

const HandednessContext = createContext<HandednessContextType>({
  isLeftHanded: false,
  setIsLeftHanded: () => {},
});

export function HandednessProvider({ children }: { children: ReactNode }) {
  const [isLeftHanded, setRaw] = useState(() => localStorage.getItem(KEY) === "left");

  const setIsLeftHanded = (v: boolean) => {
    localStorage.setItem(KEY, v ? "left" : "right");
    setRaw(v);
  };

  return (
    <HandednessContext.Provider value={{ isLeftHanded, setIsLeftHanded }}>
      {children}
    </HandednessContext.Provider>
  );
}

export function useHandedness() {
  return useContext(HandednessContext);
}
