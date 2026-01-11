import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const sonnerTheme: ToasterProps["theme"] = "dark";

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      position="top-right"
      expand={true}
      richColors={false}
      closeButton={true}
      gap={8}
      toastOptions={{
        classNames: {
          // Terminal-style base toast
          toast: "group toast group-[.toaster]:bg-slate-950/95 group-[.toaster]:text-green-400 group-[.toaster]:border-green-500/30 group-[.toaster]:shadow-2xl group-[.toaster]:backdrop-blur-md group-[.toaster]:font-mono group-[.toaster]:text-sm",
          description: "group-[.toast]:text-green-300/70 group-[.toast]:font-mono group-[.toast]:text-xs",
          actionButton: "group-[.toast]:bg-green-600 group-[.toast]:text-white group-[.toast]:font-mono",
          cancelButton: "group-[.toast]:bg-slate-800 group-[.toast]:text-green-400 group-[.toast]:font-mono",
          closeButton: "group-[.toast]:bg-slate-800/50 group-[.toast]:border-green-500/20 group-[.toast]:text-green-400",
          // Error: red terminal
          error: "group-[.toaster]:bg-slate-950/95 group-[.toaster]:text-red-400 group-[.toaster]:border-red-500/30",
          // Success: cyan/green terminal
          success: "group-[.toaster]:bg-slate-950/95 group-[.toaster]:text-cyan-400 group-[.toaster]:border-cyan-500/30",
          // Warning: yellow terminal
          warning: "group-[.toaster]:bg-slate-950/95 group-[.toaster]:text-yellow-400 group-[.toaster]:border-yellow-500/30",
          // Info: blue terminal
          info: "group-[.toaster]:bg-slate-950/95 group-[.toaster]:text-blue-400 group-[.toaster]:border-blue-500/30",
          // Loading: pulsing green
          loading: "group-[.toaster]:bg-slate-950/95 group-[.toaster]:text-green-400 group-[.toaster]:border-green-500/30 group-[.toaster]:animate-pulse"
        }
      }}
      style={
        {
          "--normal-bg": "rgb(2 6 23 / 0.95)",
          "--normal-text": "rgb(74 222 128)",
          "--normal-border": "rgb(34 197 94 / 0.3)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
