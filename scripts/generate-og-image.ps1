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
$marigold = [System.Drawing.Color]::FromArgb(255, 232, 185, 78)
$white = [System.Drawing.Color]::White

$g.Clear($teal)

# subtle paper-colored decorative circle, bottom-right, bleeding off-canvas
$bigR = 420
$bigX = $width - 260
$bigY = $height - 300
$bigBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 245, 239, 221))
$g.FillEllipse($bigBrush, $bigX, $bigY, $bigR, $bigR)
$bigBrush.Dispose()

# badge circle portant le mark de Chiner (le panier et sa trouvaille)
$badgeSize = 220
$badgeX = 110
$badgeY = [int](($height - $badgeSize) / 2)
$badgeBrush = New-Object System.Drawing.SolidBrush($white)
$g.FillEllipse($badgeBrush, $badgeX, $badgeY, $badgeSize, $badgeSize)
$badgeBrush.Dispose()

# Mark dessiné dans le repère 56x56 du SVG source, remis à l'échelle du badge.
$u = ($badgeSize / 56.0) * 0.78
$ox = $badgeX + ($badgeSize - (56.0 * $u)) / 2.0
$oy = $badgeY + ($badgeSize - (56.0 * $u)) / 2.0
function Pt { param($v, $axis) if ($axis -eq "x") { return $ox + ($v * $u) } else { return $oy + ($v * $u) } }

$markPen = New-Object System.Drawing.Pen($teal, [float](3.2 * $u))
$markPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$markPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

$x0 = Pt 12 "x"; $y0 = Pt 28 "y"
$cx = Pt 28 "x"; $cy = Pt 48 "y"
$x1 = Pt 44 "x"; $y1 = Pt 28 "y"
$c1x = $x0 + (2.0 / 3.0) * ($cx - $x0); $c1y = $y0 + (2.0 / 3.0) * ($cy - $y0)
$c2x = $x1 + (2.0 / 3.0) * ($cx - $x1); $c2y = $y1 + (2.0 / 3.0) * ($cy - $y1)
$g.DrawBezier($markPen, [float]$x0, [float]$y0, [float]$c1x, [float]$c1y, [float]$c2x, [float]$c2y, [float]$x1, [float]$y1)

$g.DrawEllipse($markPen, [float](Pt 11 "x"), [float](Pt 22.5 "y"), [float](34 * $u), [float](11 * $u))
$markPen.Dispose()

$dotR = 5.5 * $u
$dotBrush = New-Object System.Drawing.SolidBrush($marigold)
$g.FillEllipse($dotBrush, [float]((Pt 28 "x") - $dotR), [float]((Pt 25 "y") - $dotR), [float]($dotR * 2), [float]($dotR * 2))
$dotBrush.Dispose()

$format = New-Object System.Drawing.StringFormat
$format.Alignment = [System.Drawing.StringAlignment]::Center
$format.LineAlignment = [System.Drawing.StringAlignment]::Center

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
$marque = "Chiner"
$g.DrawString($marque, $titleFont, $titleBrush, $titleRect, $titleFormat)
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
