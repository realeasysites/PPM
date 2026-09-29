/*
 * PHOTO SETUP — drop image files into /public/images/ and list them here.
 *
 * GALLERY: project photos in /public/images/gallery/. The first photo shows large;
 *   6 or 9 photos fill the grid evenly on desktop.
 *
 * SLOTS: product cards and the cold-formed line each have a data-photo="..." slot.
 *   Map a slot name to an image path to fill it.
 *   >> Confirm with Sara which photo matches which size, and swap if needed. <<
 */
window.PPM_PHOTOS = {
  gallery: [
    { src: '/images/gallery/blue-steel-shop.jpg',       caption: 'Two-bay steel shop' },
    { src: '/images/gallery/interior-roll-up.jpg',      caption: 'Clear-span interior' },
    { src: '/images/gallery/long-steel-building.jpg',   caption: 'Long-span storage building' },
    { src: '/images/gallery/two-door-garage.jpg',       caption: 'Two-door steel garage' },
    { src: '/images/gallery/aerial-steel-building.jpg', caption: 'Steel building from above' },
    { src: '/images/gallery/interior-clear-span.jpg',   caption: 'Ladder trusses, no center posts' },
  ],
  slots: {
    'garage-30x40':   '/images/gallery/two-door-garage.jpg',
    'shop-30x50':     '/images/gallery/blue-steel-shop.jpg',
    'garage-40x60':   '/media/hero-poster.jpg',
    'shop-40x60x16':  '/images/gallery/interior-roll-up.jpg',
    'building-40x90': '/images/gallery/long-steel-building.jpg',
    'cold-formed':    '/images/gallery/aerial-steel-building.jpg',
  },
};
