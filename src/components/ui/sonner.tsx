import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'rgba(6,7,20,0.92)',
          border: '1px solid var(--glass-hairline)',
          color: 'var(--obs-paper)',
          boxShadow: 'var(--glass-shadow)',
          backdropFilter: 'blur(8px)',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
