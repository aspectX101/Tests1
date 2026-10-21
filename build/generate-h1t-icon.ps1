# Generates the release icons from the local H1T.CC globe artwork.
# A small top crop emphasizes the globe and H1T wordmark at taskbar size.
# Pure Windows/.NET, no online assets, preserves the updater's legacy EXE name.
param(
  [string]$SourceSvg = "app/renderer/assets/h1t-emblem.svg",
  [string]$OutputIcon = "build/icon.ico",
  [string]$RuntimeIcon = "app/assets/icon.ico"
)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$svg = Get-Content -LiteralPath $SourceSvg -Raw -Encoding UTF8
$encoded = [regex]::Match($svg, 'data:image/jpeg;base64,([^"''<>]+)')
if (-not $encoded.Success) { throw "Local H1T.CC artwork is missing or invalid." }
$sourceBytes = [Convert]::FromBase64String($encoded.Groups[1].Value)
$sourceStream = [System.IO.MemoryStream]::new($sourceBytes, 0, $sourceBytes.Length, $false, $true)
$source = [System.Drawing.Image]::FromStream($sourceStream)
$frames = @()
try {
  foreach ($n in @(16, 24, 32, 48, 64, 128, 256)) {
    $bitmap = [System.Drawing.Bitmap]::new($n, $n, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $clipping = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $memory = [System.IO.MemoryStream]::new()
    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $clipping.AddEllipse([System.Drawing.RectangleF]::new([single]0, [single]0, [single]$n, [single]$n))
      $graphics.SetClip($clipping)
      $background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(8, 18, 12))
      try { $graphics.FillRectangle($background, 0, 0, $n, $n) } finally { $background.Dispose() }
      $destination = [System.Drawing.Rectangle]::new(0, 0, $n, $n)
      $sourceCrop = [System.Drawing.Rectangle]::new(
        0, 0, $source.Width, [int][Math]::Floor($source.Height * 0.63)
      )
      $graphics.DrawImage($source, $destination, $sourceCrop, [System.Drawing.GraphicsUnit]::Pixel)
      $graphics.ResetClip()
      $border = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(80, 94, 230, 140), [single][Math]::Max(1, $n / 95))
      try { $graphics.DrawEllipse($border, 1, 1, $n-2, $n-2) } finally { $border.Dispose() }
      $bitmap.Save($memory, [System.Drawing.Imaging.ImageFormat]::Png)
      $frames += [PSCustomObject]@{ Size = $n; Data = $memory.ToArray() }
    } finally {
      $clipping.Dispose()
      $graphics.Dispose()
      $bitmap.Dispose()
      $memory.Dispose()
    }
  }
} finally {
  $source.Dispose()
  $sourceStream.Dispose()
}
$stream = [System.IO.MemoryStream]::new()
$writer = [System.IO.BinaryWriter]::new($stream)
try {
  $writer.Write([uint16]0)
  $writer.Write([uint16]1)
  $writer.Write([uint16]$frames.Count)
  $offset = 6 + $frames.Count * 16
  foreach ($frame in $frames) {
    $sizeByte = if ($frame.Size -eq 256) { 0 } else { $frame.Size }
    $writer.Write([byte]$sizeByte)
    $writer.Write([byte]$sizeByte)
    $writer.Write([byte]0)
    $writer.Write([byte]0)
    $writer.Write([uint16]1)
    $writer.Write([uint16]32)
    $writer.Write([uint32]$frame.Data.Length)
    $writer.Write([uint32]$offset)
    $offset += $frame.Data.Length
  }
  foreach ($frame in $frames) { $writer.Write([byte[]]$frame.Data) }
  $writer.Flush()
  $iconBytes = $stream.ToArray()
} finally {
  $writer.Dispose()
  $stream.Dispose()
}
foreach ($output in @($OutputIcon, $RuntimeIcon)) {
  $dir = Split-Path -Path $output -Parent
  if ($dir -and -not (Test-Path -LiteralPath $dir)) { [void](New-Item -ItemType Directory -Path $dir -Force) }
  [System.IO.File]::WriteAllBytes([System.IO.Path]::GetFullPath($output), $iconBytes)
  Write-Host "H1T.CC icon: $output ($($iconBytes.Length) bytes, $($frames.Count) sizes)"
}
