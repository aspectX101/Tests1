'use strict';
const definitions = require('./debloat-catalog');
function getInstallUrl(id) {
  if (id === 'startup-settings') return 'ms-settings:startupapps';
  if (id === 'installed-apps') return 'ms-settings:appsfeatures';
  if (id === 'onedrive') return 'https://www.microsoft.com/microsoft-365/onedrive/download';
  if (id === 'gameassist') return 'https://support.microsoft.com/edge/microsoft-edge-game-assist-faq';
  const item=definitions.find(a => a.id === id);
  return item ? 'ms-windows-store://search/?query='+encodeURIComponent(item.name) : null;
}
module.exports={getInstallUrl};
