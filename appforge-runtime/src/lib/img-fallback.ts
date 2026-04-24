import React from 'react';

const PLACEHOLDER =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23e5e7eb" width="100" height="100"/%3E%3Ctext x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="14"%3E%F0%9F%93%B7%3C/text%3E%3C/svg%3E';

/** onError handler for <img> tags — replaces broken image with a grey placeholder SVG */
export const imgFallback = (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.currentTarget;
  img.src = PLACEHOLDER;
  img.onerror = null;
};
