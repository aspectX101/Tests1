# Screen color for the Extra > Color page: brightness, contrast, vibrance and hue (each 0-100, 0 = unchanged).
# Uses the Windows full-screen color matrix (Magnification API, same mechanism as Windows color filters),
# so it works on every GPU. The effect belongs to this process: when Tweaker quits or this process ends,
# Windows removes it automatically. No files, registry or driver settings are changed.
# Input: one line per change, "brightness contrast vibrance hue". Output: one JSON line per line read.
param([switch]$SelfTest)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
function Emit($value) { [Console]::Out.WriteLine(($value | ConvertTo-Json -Compress)); [Console]::Out.Flush() }

if (-not ('Tweaker.Native.ScreenColor' -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
namespace Tweaker.Native {
    public static class ScreenColor {
        [DllImport("Magnification.dll", SetLastError=true)] static extern bool MagInitialize();
        [DllImport("Magnification.dll", SetLastError=true)] static extern bool MagUninitialize();
        [DllImport("Magnification.dll", SetLastError=true)] static extern bool MagSetFullscreenColorEffect([In] float[] effect);

        public static bool Start() { return MagInitialize(); }
        public static void Stop() { MagUninitialize(); }

        // 5x5 row-vector matrix for MAGCOLOREFFECT: [r g b a 1] x M.
        // Order: hue rotation, then vibrance (saturation), then contrast around mid grey, then brightness offset.
        public static float[] Matrix(int brightness, int contrast, int vibrance, int hue) {
            double angle = hue / 100.0 * Math.PI;          // 0..180 degrees
            double c = Math.Cos(angle), s = Math.Sin(angle);
            double[,] h = {
                { 0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928 },
                { 0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283 },
                { 0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072 } };
            double sat = 1.0 + vibrance / 100.0;           // up to double saturation
            double[] w = { 0.2126, 0.7152, 0.0722 };
            double k = 1.0 + contrast / 100.0;             // up to double contrast
            double offset = 0.5 * (1.0 - k) + 0.25 * brightness / 100.0;
            float[] m = new float[25];
            for (int row = 0; row < 3; row++) {             // output channel
                for (int col = 0; col < 3; col++) {         // input channel
                    double v = 0;
                    for (int j = 0; j < 3; j++) v += ((1 - sat) * w[j] + (row == j ? sat : 0)) * h[j, col];
                    m[col * 5 + row] = (float)(k * v);
                }
                m[20 + row] = (float)offset;
            }
            m[18] = 1; m[24] = 1;
            return m;
        }

        public static bool Apply(int brightness, int contrast, int vibrance, int hue) {
            return MagSetFullscreenColorEffect(Matrix(brightness, contrast, vibrance, hue));
        }
    }
}
'@ -ErrorAction Stop
}

if ($SelfTest) { return }
if (-not [Tweaker.Native.ScreenColor]::Start()) { Emit @{ok=$false;error='color_unavailable'}; exit 1 }
try {
    Emit @{ok=$true;ready=$true}
    while ($null -ne ($line=[Console]::In.ReadLine())) {
        if ($line -cnotmatch '^(\d{1,3}) (\d{1,3}) (\d{1,3}) (\d{1,3})$') { Emit @{ok=$false;error='invalid_color_value'}; continue }
        $v=@([int]$Matches[1],[int]$Matches[2],[int]$Matches[3],[int]$Matches[4])
        if (@($v | Where-Object { $_ -gt 100 }).Count) { Emit @{ok=$false;error='invalid_color_value'}; continue }
        if ([Tweaker.Native.ScreenColor]::Apply($v[0],$v[1],$v[2],$v[3])) { Emit @{ok=$true} } else { Emit @{ok=$false;error='color_apply_failed'} }
    }
} finally {
    $null=[Tweaker.Native.ScreenColor]::Apply(0,0,0,0)
    [Tweaker.Native.ScreenColor]::Stop()
}
