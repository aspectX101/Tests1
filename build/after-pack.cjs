// electron-builder afterPack: setzt Icon und Versionsinfos der eigentlichen App-Exe (in der portablen Exe).
// Ohne Windows/Wine bearbeitet electron-builder die Exe nicht (signAndEditExecutable) – dann hieße sie im
// Task-Manager "Electron" und hätte das Electron-Icon. resedit ist reines JavaScript und läuft auch auf macOS.
const fs = require('fs');
const path = require('path');

const LANG = 1033;
const CODEPAGE = 1200;

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const PE = await import('pe-library');
  const info = context.packager.appInfo;
  const exe = path.join(context.appOutDir, `${info.productFilename}.exe`);
  const icoFile = path.join(context.packager.projectDir, 'build', 'icon.ico');

  const nt = PE.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
  const res = PE.NtExecutableResource.from(nt);

  // Icon: vorhandene Gruppe (ID aus der Electron-Exe) durch unser Icon in allen Größen ersetzen
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(icoFile));
  const group = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)[0];
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, group ? group.id : 1, group ? group.lang : LANG,
    ico.icons.map((i) => i.data));

  // Versionsinfos (Explorer → Eigenschaften → Details, Task-Manager)
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
  const [a, b, c] = info.version.split('.').map(Number);
  vi.setFileVersion(a, b, c, 0, LANG);
  vi.setProductVersion(a, b, c, 0, LANG);
  vi.setStringValues({ lang: LANG, codepage: CODEPAGE }, {
    ProductName: 'H1T.CC Tweak Utility',
    FileDescription: 'H1T.CC Tweak Utility',
    CompanyName: 'H1T.CC',
    LegalCopyright: `© ${new Date().getFullYear()} H1T.CC`,
    OriginalFilename: `${info.productFilename}.exe`,
    InternalName: 'H1T.CC Tweak Utility',
    FileVersion: info.version,
    ProductVersion: info.version,
  });
  vi.outputToResourceEntries(res.entries);

  res.outputResource(nt);
  fs.writeFileSync(exe, Buffer.from(nt.generate()));
  console.log(`  • after-pack       icon + version info → ${path.basename(exe)}`);
};
