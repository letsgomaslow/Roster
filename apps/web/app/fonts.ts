import localFont from 'next/font/local';

export const manrope = localFont({
  variable: '--font-manrope',
  display: 'swap',
  src: '../../../vendor/maslow-brand-os/assets/fonts/Manrope-Variable.ttf',
});

export const dmSans = localFont({
  variable: '--font-dm-sans',
  display: 'swap',
  src: '../../../vendor/maslow-brand-os/assets/fonts/DMSans-Variable.ttf',
});

export const ibmPlexMono = localFont({
  variable: '--font-ibm-plex-mono',
  display: 'swap',
  src: [
    {
      path: '../../../vendor/maslow-brand-os/assets/fonts/IBMPlexMono-Regular.ttf',
      weight: '400',
    },
    {
      path: '../../../vendor/maslow-brand-os/assets/fonts/IBMPlexMono-Medium.ttf',
      weight: '500',
    },
  ],
});
