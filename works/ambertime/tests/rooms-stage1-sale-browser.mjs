// Reuse the existing native sales/flight/no-overlap assertions without changing them.
process.env.AMBER_ALL_SHOP_OUTPUT=new URL('../design/rooms-stage1/sales-regression/',import.meta.url).pathname;
await import('./all-shop-flights-browser.mjs');
