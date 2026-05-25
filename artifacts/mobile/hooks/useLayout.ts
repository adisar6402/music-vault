import { useWindowDimensions } from "react-native";

export interface Layout {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarWidth: number;
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768;
  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    sidebarWidth: isDesktop ? 240 : 0,
  };
}
