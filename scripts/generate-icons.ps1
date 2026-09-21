Add-Type -AssemblyName System.Drawing

# Le mark de Chiner : un nid (trois brins) avec la trouvaille dorée au centre.
# Les coordonnées sont celles du SVG source (repère 56x56), remises à l'échelle.

function Add-QuadCurve {
  param($Path, $x0, $y0, $cx, $cy, $x1, $y1)
  # System.Drawing ne connaît que les Bézier cubiques : on convertit la
  # quadratique du SVG (un seul point de contrôle) en cubique.
  $c1x = $x0 + (2.0 / 3.0) * ($cx - $x0)
  $c1y = $y0 + (2.0 / 3.0) * ($cy - $y0)
  $c2x = $x1 + (2.0 / 3.0) * ($cx - $x1)
  $c2y = $y1 + (2.0 / 3.0) * ($cy - $y1)
  $Path.AddBezier($x0, $y0, $c1x, $c1y, $c2x, $c2y, $x1, $y1)
}

function New-BrandIcon {
  param(
    [int]$Size,
    [string]$OutPath,
    [double]$MarkScale = 1.0
  )

  $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $teal = [System.Drawing.Color]::FromArgb(255, 47, 110, 100)
  $paper = [System.Drawing.Color]::FromArgb(255, 245, 239, 221)
  $marigold = [System.Drawing.Color]::FromArgb(255, 232, 185, 78)

  $g.Clear($teal)

  # Repère du SVG source, centré puis mis à l'échelle demandée.
  $u = ($Size / 56.0) * $MarkScale
  $offset = ($Size - (56.0 * $u)) / 2.0
  function P { param($v) return $offset + ($v * $u) }

  $pen = New-Object System.Drawing.Pen($paper, [float](3.2 * $u))
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  # Corps du panier : deux flancs qui descendent du bord vers un fond arrondi.
  $panier = New-Object System.Drawing.Drawing2D.GraphicsPath
  Add-QuadCurve $panier (P 12) (P 28) (P 28) (P 48) (P 44) (P 28)
  $g.DrawPath($pen, $panier)

  # Ouverture vue en perspective : c'est l'ellipse qui fait lire « panier »
  # plutôt qu'« horizon » — une ligne droite donnait un soleil couchant.
  $g.DrawEllipse($pen, [float](P 11), [float](P 22.5), [float](34 * $u), [float](11 * $u))

  # La trouvaille, dessinée en dernier : elle masque le bord arrière de
  # l'ouverture, donc elle apparaît posée à l'intérieur.
  $r = 5.5 * $u
  $dot = New-Object System.Drawing.SolidBrush($marigold)
  $g.FillEllipse($dot, [float]((P 28) - $r), [float]((P 25) - $r), [float]($r * 2), [float]($r * 2))

  $bmp.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose(); $bmp.Dispose(); $pen.Dispose(); $dot.Dispose()
  $panier.Dispose()
}

$root = "D:\Projet_application1\ProjetNORA_claude\bons-plans-app\public"

New-BrandIcon -Size 192 -OutPath "$root\icons\icon-192.png"
New-BrandIcon -Size 512 -OutPath "$root\icons\icon-512.png"
# Version maskable : le contenu doit tenir dans la zone sûre centrale, sinon
# le masque rond appliqué par le système rogne le nid.
New-BrandIcon -Size 512 -OutPath "$root\icons\icon-maskable-512.png" -MarkScale 0.72
New-BrandIcon -Size 180 -OutPath "$root\apple-touch-icon.png"

Write-Output "Icones Chiner generees."
