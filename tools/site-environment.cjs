'use strict';
function siteEnvironment(env) {
  if (env === 'staging') return {base:'https://sukimastock.github.io/yumaniwa-town-staging',robots:'noindex,nofollow'};
  if (env === 'production') return {base:'https://sukimastock.github.io/yumaniwa-town',robots:'index,follow,max-image-preview:large'};
  throw new Error('Unknown site environment: '+env);
}
module.exports={siteEnvironment};
