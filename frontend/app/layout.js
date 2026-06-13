import './globals.css';

export const metadata = {
  title: 'AI Tools Reseller OS',
  description: 'Dealer rates, stock, sales, profit intelligence and WhatsApp automation'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
