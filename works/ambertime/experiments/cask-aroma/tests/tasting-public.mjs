// Public browser transport uses the environment proxy and an ephemeral context.
// Independent HTTPS/file-hash verification is recorded by the deployment owner.
process.env.TASTING_URL??='https://sukimastock.github.io/yumaniwa-town-staging/works/ambertime/experiments/cask-aroma/';
process.env.TASTING_OUTPUT??='/tmp/ambertime-tasting-public';
await import('./tasting-browser.mjs');
