Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' Ejecutar el lanzador completo run-system.bat en segundo plano sin ventana negra
WshShell.Run "cmd /c """ & scriptDir & "\run-system.bat""", 0, False
