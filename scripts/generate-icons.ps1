Add-Type -AssemblyName System.Drawing

function New-BrandIcon {
  param(
    [int]$Size,
    [string]$OutPath,
    [double]$LetterScale = 0.56
  )

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  $teal = [System.Drawing.Color]::FromArgb(255, 47, 110, 100)
  $marigold = [System.Drawing.Color]::FromArgb(255, 227, 162, 60)
  $white = [System.Drawing.Color]::White

  $g.Clear($teal)

  # small marigold accent dot, top-right, echoing the tag-icon accent used in-app
  $dotR = $Size * 0.09
  $dotX = $Size * 0.68
  $dotY = $Size * 0.22
  $dotBrush = New-Object System.Drawing.SolidBrush($marigold)
  $g.FillEllipse($dotBrush, $dotX - $dotR, $dotY - $dotR, $dotR * 2, $dotR * 2)

  # centered bold "B" monogram
  $fontSize = [float]($Size * $LetterScale)
  $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brush = New-Object System.Drawing.SolidBrush($white)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
  $g.DrawString("B", $font, $brush, $rect, $format)

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose()
  $bmp.Dispose()
  $font.Dispose()
  $brush.Dispose()
  $dotBrush.Dispose()
}

$root = "D:\Projet_application1\ProjetNORA_claude\bons-plans-app\public"

New-BrandIcon -Size 192 -OutPath "$root\icons\icon-192.png" -LetterScale 0.56
New-BrandIcon -Size 512 -OutPath "$root\icons\icon-512.png" -LetterScale 0.56
New-BrandIcon -Size 512 -OutPath "$root\icons\icon-maskable-512.png" -LetterScale 0.42
New-BrandIcon -Size 180 -OutPath "$root\apple-touch-icon.png" -LetterScale 0.56

Write-Output "Icons generated."
