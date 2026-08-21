# Détourage d'une gravure d'ornement : le fond crème devient un vrai canal alpha,
# si bien que le trait se pose sur le papier du site sans rectangle clair. On n'emploie
# surtout pas mix-blend-mode, que l'opacité de l'image annulerait.
# La recette et le pourquoi sont dans AGENTS.md, section « Les ornements se DÉTOURENT ».
#
# La stratégie d'exécution du poste refuse les scripts : passer -ExecutionPolicy Bypass.
# Usage :
#   .\scripts\detourer-ornement.ps1 -Source "…\gravure.png" -Dest "public\ornements\nom.png" -Largeur 1024

param([string]$Source, [string]$Dest, [int]$Largeur = 1024)

Add-Type -AssemblyName System.Drawing

$code = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class Detourage {
  // Une gravure au trait posee sur un fond creme. On veut l'encre seule, avec
  // son anti-crenelage : le fond devient VRAIMENT transparent, plutot que d'etre
  // efface par un mix-blend-mode que la moindre opacite annulerait.
  public static void Traiter(Bitmap bmp) {
    int L = bmp.Width, H = bmp.Height;
    Rectangle r = new Rectangle(0, 0, L, H);
    BitmapData d = bmp.LockBits(r, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
    int n = L * H * 4;
    byte[] px = new byte[n];
    Marshal.Copy(d.Scan0, px, 0, n);

    // Le fond se mesure, il ne se suppose pas : moyenne des quatre coins.
    double fb = 0, fv = 0, fr = 0;
    int[] coins = { 0, (L - 1) * 4, (H - 1) * L * 4, ((H - 1) * L + L - 1) * 4 };
    foreach (int c in coins) { fb += px[c]; fv += px[c + 1]; fr += px[c + 2]; }
    fb /= 4; fv /= 4; fr /= 4;
    double lumFond = 0.299 * fr + 0.587 * fv + 0.114 * fb;

    for (int i = 0; i < n; i += 4) {
      double b = px[i], v = px[i + 1], rg = px[i + 2];
      double lum = 0.299 * rg + 0.587 * v + 0.114 * b;
      // Alpha : 0 sur le fond mesure, 255 sur l'encre la plus sombre.
      double a = (lumFond - lum) / lumFond * 255.0;
      if (a <= 0) { px[i] = 0; px[i+1] = 0; px[i+2] = 0; px[i+3] = 0; continue; }
      if (a > 255) a = 255;
      // Decomposition : la couleur vue est l'encre composee SUR le fond creme.
      // Sans cette etape, les bords anti-crenels gardent le creme et paraissent laves.
      double k = a / 255.0;
      double cb = (b - fb * (1 - k)) / k;
      double cv = (v - fv * (1 - k)) / k;
      double cr = (rg - fr * (1 - k)) / k;
      px[i]     = (byte)(cb < 0 ? 0 : cb > 255 ? 255 : cb);
      px[i + 1] = (byte)(cv < 0 ? 0 : cv > 255 ? 255 : cv);
      px[i + 2] = (byte)(cr < 0 ? 0 : cr > 255 ? 255 : cr);
      px[i + 3] = (byte)a;
    }
    Marshal.Copy(px, 0, d.Scan0, n);
    bmp.UnlockBits(d);
  }
}
"@
Add-Type -TypeDefinition $code -ReferencedAssemblies System.Drawing

$src = [System.Drawing.Image]::FromFile($Source)
$h = [int][Math]::Round($src.Height * $Largeur / $src.Width)
$bmp = New-Object System.Drawing.Bitmap($Largeur, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, 0, 0, $Largeur, $h)
$g.Dispose(); $src.Dispose()

[Detourage]::Traiter($bmp)
$bmp.Save($Dest, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
"{0} -> {1}x{2}, {3} Ko" -f (Split-Path $Dest -Leaf), $Largeur, $h, [int]((Get-Item $Dest).Length / 1KB)
