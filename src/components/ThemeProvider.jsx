import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * ThemeProvider — wraps next-themes.
 * - storageKey: persists in localStorage under "crownridge-theme"
 * - disableTransitionOnChange is REMOVED so dark/light transitions are smooth
 */
export function ThemeProvider({ children, ...props }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="crownridge-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
