Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' Ejecutar start-silent.bat en segundo plano sin ventana de consola negra
batPath = scriptDir & "\start-silent.bat"
WshShell.Run "cmd.exe /c """ & batPath & """", 0, False
