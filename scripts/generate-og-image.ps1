Add-Type -AssemblyName System.Drawing

$width = 1200
$height = 630
$out = "D:\Projet_application1\ProjetNORA_claude\bons-plans-app\public\og-image.png"

$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

$teal = [System.Drawing.Color]::FromArgb(255, 47, 110, 100)
$marigold = [System.Drawing.Color]::FromArgb(255, 227, 162, 60)
$white = [System.Drawing.Color]::White

$g.Clear($teal)

# subtle paper-colored decorative circle, bottom-right, bleeding off-canvas
$bigR = 420
$bigX = $width - 260
$bigY = $height - 300
$bigBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 239, 240, 228))
$g.FillEllipse($bigBrush, $bigX, $bigY, $bigR, $bigR)
$bigBrush.Dispose()

# badge circle with "B" monogram, left side
$badgeSize = 220
$badgeX = 110
$badgeY = [int](($height - $badgeSize) / 2)
$badgeBrush = New-Object System.Drawing.SolidBrush($white)
$g.FillEllipse($badgeBrush, $badgeX, $badgeY, $badgeSize, $badgeSize)
$badgeBrush.Dispose()

$letterFont = New-Object System.Drawing.Font("Segoe UI", 130, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$letterBrush = New-Object System.Drawing.SolidBrush($teal)
$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center
$badgeRectY = $badgeY - 6
$badgeRect = New-Object System.Drawing.RectangleF($badgeX, $badgeRectY, $badgeSize, $badgeSize)
$g.DrawString("B", $letterFont, $letterBrush, $badgeRect, $format)
$letterFont.Dispose()
$letterBrush.Dispose()

# marigold accent dot on the badge
$dotR = 34
$dotX = $badgeX + $badgeSize - 26
$dotY = $badgeY + 14
$dotBrush = New-Object System.Drawing.SolidBrush($marigold)
$g.FillEllipse($dotBrush, $dotX, $dotY, $dotR, $dotR)
$dotBrush.Dispose()

# wordmark + tagline, right of badge
$textX = $badgeX + $badgeSize + 60
$textW = $width - $textX - 60
$titleY = [int]($height / 2) - 130
$tagY = [int]($height / 2) + 6

$titleFont = New-Object System.Drawing.Font("Segoe UI", 74, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$titleBrush = New-Object System.Drawing.SolidBrush($white)
$titleFormat = New-Object System.Drawing.StringFormat
$titleFormat.Alignment = [System.Drawing.StringAlignment]::Near
$titleFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$titleRect = New-Object System.Drawing.RectangleF($textX, $titleY, $textW, 110)
$g.DrawString("Bons Plans", $titleFont, $titleBrush, $titleRect, $titleFormat)
$titleFont.Dispose()
$titleBrush.Dispose()

$tagFont = New-Object System.Drawing.Font("Segoe UI", 32, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
$tagBrush = New-Object System.Drawing.SolidBrush($marigold)
$tagRect = New-Object System.Drawing.RectangleF($textX, $tagY, $textW, 70)
$tagline = "Les bons plans des commer" + [char]0x00E7 + "ants de ta ville"
$g.DrawString($tagline, $tagFont, $tagBrush, $tagRect, $titleFormat)
$tagFont.Dispose()
$tagBrush.Dispose()

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output "OG image generated at $out"
