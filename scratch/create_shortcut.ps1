$Paths = @(
    "C:\Users\manu_\Desktop\Lumo Secaderos.lnk",
    "C:\Users\manu_\OneDrive\Escritorio\Lumo Secaderos.lnk",
    "C:\Users\manu_\OneDrive\Desktop\Lumo Secaderos.lnk"
)

foreach ($ShortcutPath in $Paths) {
    try {
        $Dir = Split-Path $ShortcutPath
        if (Test-Path $Dir) {
            $WScriptShell = New-Object -ComObject WScript.Shell
            $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
            $Shortcut.TargetPath = "wscript.exe"
            $Shortcut.Arguments = '"e:\Jorge Falcon dbd\COAMA\Desarrollo\APP SECADEROS - COPIA\coama-secaderos-2\Iniciar_Lumo_Secaderos.vbs"'
            $Shortcut.WorkingDirectory = "e:\Jorge Falcon dbd\COAMA\Desarrollo\APP SECADEROS - COPIA\coama-secaderos-2"
            $Shortcut.Description = "Sistema Lumo Secaderos COAMA"
            $Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll, 220"
            $Shortcut.Save()
            Write-Host "Shortcut created at $ShortcutPath"
        }
    } catch {
        Write-Host "Could not create at $ShortcutPath"
    }
}
