import localFont from 'next/font/local';

export const manrope = localFont({
  variable: '--font-ui',
  display: 'swap',
  src: [
    {
      path: './fonts/Manrope-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Manrope-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './fonts/Manrope-SemiBold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './fonts/Manrope-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
});
