Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' Ejecutar el script para detener servicios en segundo plano sin ventana negra
WshShell.Run "cmd /c """ & scriptDir & "\Detener_Servicios.bat""", 0, False
