Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' Detener puertos 8080, 5173, 5174 y procesos node de forma silenciosa
WshShell.Run "powershell -NoProfile -Command ""Get-NetTCPConnection -LocalPort 8080, 5173, 5174 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Stop-Process -Name node -Force -ErrorAction SilentlyContinue""", 0, True

WshShell.Popup "Todos los servicios de LUMO Secaderos han sido detenidos.", 2, "LUMO Secaderos", 64
